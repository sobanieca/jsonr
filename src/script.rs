//! Runs JavaScript files (`jsonr run script.js`) in an embedded QuickJS
//! engine with a global `jsonr()` function.

use crate::colors;
use crate::config;
use crate::inspect::{self, Node, Options};
use crate::json::{self, Object, Value};
use crate::logger;
use crate::request;
use rquickjs::loader::{Loader, Resolver};
use rquickjs::{CatchResultExt, CaughtError, Context, Ctx, Function, Module, Promise, Runtime};
use std::io::{IsTerminal, Write};
use std::path::{Path, PathBuf};

const PRELUDE: &str = include_str!("script_prelude.js");

/// Runs a script. `args` have config applied, `cli_args` are the command line
/// arguments used to resolve an `environment` passed to `jsonr()`.
pub fn run_script(path: &Path, args: &Object, cli_args: &Object) -> Result<(), String> {
    let absolute = config::resolve(path);
    let source = std::fs::read(&absolute).map_err(|err| err.to_string())?;

    let runtime = Runtime::new().map_err(|err| err.to_string())?;
    runtime.set_loader(RelativeResolver, FileLoader);
    let context = Context::full(&runtime).map_err(|err| err.to_string())?;

    context.with(|ctx| -> Result<(), String> {
        install_natives(&ctx, args.clone(), cli_args.clone()).map_err(|err| err.to_string())?;
        ctx.eval::<(), _>(PRELUDE)
            .catch(&ctx)
            .map_err(|err| caught_message(&err))?;

        let name = absolute.to_string_lossy().to_string();
        let evaluated = Module::evaluate(ctx.clone(), name, source)
            .catch(&ctx)
            .map_err(|err| caught_message(&err))?;
        finish(&ctx, evaluated)?;

        let settle: Function = ctx
            .globals()
            .get("__jsonrSettle")
            .map_err(|err| err.to_string())?;
        let pending: Promise = settle
            .call(())
            .catch(&ctx)
            .map_err(|err| caught_message(&err))?;
        finish(&ctx, pending)
    })
}

/// Drives the job queue until the promise settles.
fn finish<'js>(ctx: &Ctx<'js>, promise: Promise<'js>) -> Result<(), String> {
    match promise.finish::<rquickjs::Value>().catch(ctx) {
        Ok(_) => Ok(()),
        Err(CaughtError::Error(rquickjs::Error::WouldBlock)) => {
            Err("Top-level await promise never resolved".to_string())
        }
        Err(err) => Err(caught_message(&err)),
    }
}

fn caught_message(err: &CaughtError<'_>) -> String {
    match err {
        CaughtError::Exception(exception) => exception.message().unwrap_or_default(),
        CaughtError::Value(value) => value
            .get::<rquickjs::convert::Coerced<String>>()
            .map(|s| s.0)
            .unwrap_or_default(),
        CaughtError::Error(error) => error.to_string(),
    }
}

fn install_natives<'js>(ctx: &Ctx<'js>, args: Object, cli_args: Object) -> rquickjs::Result<()> {
    let send = Function::new(
        ctx.clone(),
        move |ctx: Ctx<'js>, url_or_file: String, options: String| -> rquickjs::Result<String> {
            match send(&args, &cli_args, url_or_file, &options) {
                Ok(response) => Ok(response),
                Err(message) => Err(rquickjs::Exception::throw_message(&ctx, &message)),
            }
        },
    )?;
    ctx.globals().set("__jsonrSend", send)?;

    let print = Function::new(ctx.clone(), |stream: i32, payload: String| {
        print_segments(stream, &payload);
    })?;
    ctx.globals().set("__jsonrPrint", print)?;
    Ok(())
}

/// Implements `jsonr(urlOrFile, options)` on top of the CLI request logic.
fn send(
    args: &Object,
    cli_args: &Object,
    url_or_file: String,
    options: &str,
) -> Result<String, String> {
    let options = match json::parse(options) {
        Ok(Value::Object(options)) => options,
        _ => Object::new(),
    };

    // Resolve the environment named in the script options through the same
    // config hierarchy the CLI -e flag uses.
    let mut base = args.clone();
    if let Some(Value::String(environment)) = options.get("environment")
        && args.get_str("environment") != Some(environment)
        && !environment.ends_with(".json")
    {
        let mut with_environment = cli_args.clone();
        with_environment.insert("environment", Value::String(environment.clone()));
        base = config::load_and_apply_config(with_environment);
    }

    let mut merged = base.clone();
    merged.insert("_", Value::Array(vec![Value::String(url_or_file)]));
    merged.assign(&options);
    for key in ["inputVariables", "headers"] {
        if base.is_truthy(key) || options.is_truthy(key) {
            let mut combined = base.get_object(key).cloned().unwrap_or_default();
            if let Some(values) = options.get_object(key) {
                combined.assign(values);
            }
            merged.insert(key, Value::Object(combined));
        }
    }

    let response = request::send_request(&mut merged)?;
    Ok(response.map_or_else(|| "null".to_string(), |r| json::stringify(&r.to_json())))
}

fn print_segments(stream: i32, payload: &str) {
    let to_stderr = stream == 2;
    let use_colors = colors::enabled()
        && if to_stderr {
            std::io::stderr().is_terminal()
        } else {
            std::io::stdout().is_terminal()
        };
    let options = Options::console(use_colors);
    let mut line = String::new();
    if let Ok(Value::Array(segments)) = json::parse(payload) {
        for segment in &segments {
            match segment {
                Value::String(text) => line.push_str(text),
                description => line.push_str(&inspect::inspect(&to_node(description), options)),
            }
        }
    }
    if to_stderr {
        let _ = writeln!(std::io::stderr(), "{line}");
    } else {
        logger::print_line(&line);
    }
}

/// Converts a value description produced by the prelude's `describe()`.
fn to_node(description: &Value) -> Node {
    let Value::Array(parts) = description else {
        return Node::Undefined;
    };
    let tag = parts.first().and_then(Value::as_str).unwrap_or("u");
    let text = || parts.get(1).map(Value::to_js_string).unwrap_or_default();
    match tag {
        "s" => Node::String(text()),
        "b" => Node::Bool(matches!(parts.get(1), Some(Value::Bool(true)))),
        "g" => Node::BigInt(text()),
        "y" => Node::Symbol(text()),
        "n" => Node::Number(match text().as_str() {
            "-0" => -0.0,
            "NaN" => f64::NAN,
            "Infinity" => f64::INFINITY,
            "-Infinity" => f64::NEG_INFINITY,
            other => other.parse().unwrap_or(f64::NAN),
        }),
        "l" => Node::Null,
        "x" => Node::Special(text()),
        "d" => Node::Date(text()),
        "r" => Node::Raw(text()),
        "a" => match parts.get(1) {
            Some(Value::Array(items)) => Node::Array(items.iter().map(to_node).collect()),
            _ => Node::Array(Vec::new()),
        },
        "o" => Node::Object {
            class: parts.get(1).and_then(Value::as_str).map(str::to_string),
            entries: match parts.get(2) {
                Some(Value::Array(entries)) => entries
                    .iter()
                    .filter_map(|entry| match entry {
                        Value::Array(pair) if pair.len() == 2 => {
                            Some((pair[0].to_js_string(), to_node(&pair[1])))
                        }
                        _ => None,
                    })
                    .collect(),
                _ => Vec::new(),
            },
        },
        _ => Node::Undefined,
    }
}

/// Resolves relative imports (`./x.js`, `../x.js`) against the importing file.
struct RelativeResolver;

impl Resolver for RelativeResolver {
    fn resolve<'js>(
        &mut self,
        _ctx: &Ctx<'js>,
        base: &str,
        name: &str,
        _attributes: Option<rquickjs::loader::ImportAttributes<'js>>,
    ) -> rquickjs::Result<String> {
        let path = Path::new(name);
        if !(name.starts_with("./") || name.starts_with("../") || path.is_absolute()) {
            return Err(rquickjs::Error::new_resolving_message(
                base,
                name,
                "only relative imports of local files are supported",
            ));
        }
        let dir = Path::new(base)
            .parent()
            .map(PathBuf::from)
            .unwrap_or_default();
        Ok(config::resolve(&dir.join(path))
            .to_string_lossy()
            .to_string())
    }
}

struct FileLoader;

impl Loader for FileLoader {
    fn load<'js>(
        &mut self,
        ctx: &Ctx<'js>,
        name: &str,
        _attributes: Option<rquickjs::loader::ImportAttributes<'js>>,
    ) -> rquickjs::Result<Module<'js, rquickjs::module::Declared>> {
        let source = std::fs::read(name)?;
        Module::declare(ctx.clone(), name, source)
    }
}
