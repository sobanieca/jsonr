// deno-fmt-ignore-file
// deno-lint-ignore-file
// This code was bundled using `deno bundle` and it's not recommended to edit it manually

class DenoStdInternalError extends Error {
    constructor(message){
        super(message);
        this.name = "DenoStdInternalError";
    }
}
function assert(expr, msg = "") {
    if (!expr) {
        throw new DenoStdInternalError(msg);
    }
}
const { hasOwn  } = Object;
function get(obj, key) {
    if (hasOwn(obj, key)) {
        return obj[key];
    }
}
function getForce(obj, key) {
    const v = get(obj, key);
    assert(v != null);
    return v;
}
function isNumber(x) {
    if (typeof x === "number") return true;
    if (/^0x[0-9a-f]+$/i.test(String(x))) return true;
    return /^[-+]?(?:\d+(?:\.\d*)?|\.\d+)(e[-+]?\d+)?$/.test(String(x));
}
function hasKey(obj, keys) {
    let o = obj;
    keys.slice(0, -1).forEach((key)=>{
        o = get(o, key) ?? {};
    });
    const key = keys[keys.length - 1];
    return hasOwn(o, key);
}
function parse(args, { "--": doubleDash = false , alias ={} , boolean: __boolean = false , default: defaults = {} , stopEarly =false , string =[] , collect =[] , negatable =[] , unknown =(i)=>i  } = {}) {
    const aliases = {};
    const flags = {
        bools: {},
        strings: {},
        unknownFn: unknown,
        allBools: false,
        collect: {},
        negatable: {}
    };
    if (alias !== undefined) {
        for(const key in alias){
            const val = getForce(alias, key);
            if (typeof val === "string") {
                aliases[key] = [
                    val
                ];
            } else {
                aliases[key] = val;
            }
            for (const alias1 of getForce(aliases, key)){
                aliases[alias1] = [
                    key
                ].concat(aliases[key].filter((y)=>alias1 !== y));
            }
        }
    }
    if (__boolean !== undefined) {
        if (typeof __boolean === "boolean") {
            flags.allBools = !!__boolean;
        } else {
            const booleanArgs = typeof __boolean === "string" ? [
                __boolean
            ] : __boolean;
            for (const key1 of booleanArgs.filter(Boolean)){
                flags.bools[key1] = true;
                const alias2 = get(aliases, key1);
                if (alias2) {
                    for (const al of alias2){
                        flags.bools[al] = true;
                    }
                }
            }
        }
    }
    if (string !== undefined) {
        const stringArgs = typeof string === "string" ? [
            string
        ] : string;
        for (const key2 of stringArgs.filter(Boolean)){
            flags.strings[key2] = true;
            const alias3 = get(aliases, key2);
            if (alias3) {
                for (const al1 of alias3){
                    flags.strings[al1] = true;
                }
            }
        }
    }
    if (collect !== undefined) {
        const collectArgs = typeof collect === "string" ? [
            collect
        ] : collect;
        for (const key3 of collectArgs.filter(Boolean)){
            flags.collect[key3] = true;
            const alias4 = get(aliases, key3);
            if (alias4) {
                for (const al2 of alias4){
                    flags.collect[al2] = true;
                }
            }
        }
    }
    if (negatable !== undefined) {
        const negatableArgs = typeof negatable === "string" ? [
            negatable
        ] : negatable;
        for (const key4 of negatableArgs.filter(Boolean)){
            flags.negatable[key4] = true;
            const alias5 = get(aliases, key4);
            if (alias5) {
                for (const al3 of alias5){
                    flags.negatable[al3] = true;
                }
            }
        }
    }
    const argv = {
        _: []
    };
    function argDefined(key, arg) {
        return flags.allBools && /^--[^=]+$/.test(arg) || get(flags.bools, key) || !!get(flags.strings, key) || !!get(aliases, key);
    }
    function setKey(obj, name, value, collect = true) {
        let o = obj;
        const keys = name.split(".");
        keys.slice(0, -1).forEach(function(key) {
            if (get(o, key) === undefined) {
                o[key] = {};
            }
            o = get(o, key);
        });
        const key = keys[keys.length - 1];
        const collectable = collect && !!get(flags.collect, name);
        if (!collectable) {
            o[key] = value;
        } else if (get(o, key) === undefined) {
            o[key] = [
                value
            ];
        } else if (Array.isArray(get(o, key))) {
            o[key].push(value);
        } else {
            o[key] = [
                get(o, key),
                value
            ];
        }
    }
    function setArg(key, val, arg = undefined, collect) {
        if (arg && flags.unknownFn && !argDefined(key, arg)) {
            if (flags.unknownFn(arg, key, val) === false) return;
        }
        const value = !get(flags.strings, key) && isNumber(val) ? Number(val) : val;
        setKey(argv, key, value, collect);
        const alias = get(aliases, key);
        if (alias) {
            for (const x of alias){
                setKey(argv, x, value, collect);
            }
        }
    }
    function aliasIsBoolean(key) {
        return getForce(aliases, key).some((x)=>typeof get(flags.bools, x) === "boolean");
    }
    let notFlags = [];
    if (args.includes("--")) {
        notFlags = args.slice(args.indexOf("--") + 1);
        args = args.slice(0, args.indexOf("--"));
    }
    for(let i = 0; i < args.length; i++){
        const arg = args[i];
        if (/^--.+=/.test(arg)) {
            const m = arg.match(/^--([^=]+)=(.*)$/s);
            assert(m != null);
            const [, key5, value] = m;
            if (flags.bools[key5]) {
                const booleanValue = value !== "false";
                setArg(key5, booleanValue, arg);
            } else {
                setArg(key5, value, arg);
            }
        } else if (/^--no-.+/.test(arg) && get(flags.negatable, arg.replace(/^--no-/, ""))) {
            const m1 = arg.match(/^--no-(.+)/);
            assert(m1 != null);
            setArg(m1[1], false, arg, false);
        } else if (/^--.+/.test(arg)) {
            const m2 = arg.match(/^--(.+)/);
            assert(m2 != null);
            const [, key6] = m2;
            const next = args[i + 1];
            if (next !== undefined && !/^-/.test(next) && !get(flags.bools, key6) && !flags.allBools && (get(aliases, key6) ? !aliasIsBoolean(key6) : true)) {
                setArg(key6, next, arg);
                i++;
            } else if (/^(true|false)$/.test(next)) {
                setArg(key6, next === "true", arg);
                i++;
            } else {
                setArg(key6, get(flags.strings, key6) ? "" : true, arg);
            }
        } else if (/^-[^-]+/.test(arg)) {
            const letters = arg.slice(1, -1).split("");
            let broken = false;
            for(let j = 0; j < letters.length; j++){
                const next1 = arg.slice(j + 2);
                if (next1 === "-") {
                    setArg(letters[j], next1, arg);
                    continue;
                }
                if (/[A-Za-z]/.test(letters[j]) && /=/.test(next1)) {
                    setArg(letters[j], next1.split(/=(.+)/)[1], arg);
                    broken = true;
                    break;
                }
                if (/[A-Za-z]/.test(letters[j]) && /-?\d+(\.\d*)?(e-?\d+)?$/.test(next1)) {
                    setArg(letters[j], next1, arg);
                    broken = true;
                    break;
                }
                if (letters[j + 1] && letters[j + 1].match(/\W/)) {
                    setArg(letters[j], arg.slice(j + 2), arg);
                    broken = true;
                    break;
                } else {
                    setArg(letters[j], get(flags.strings, letters[j]) ? "" : true, arg);
                }
            }
            const [key7] = arg.slice(-1);
            if (!broken && key7 !== "-") {
                if (args[i + 1] && !/^(-|--)[^-]/.test(args[i + 1]) && !get(flags.bools, key7) && (get(aliases, key7) ? !aliasIsBoolean(key7) : true)) {
                    setArg(key7, args[i + 1], arg);
                    i++;
                } else if (args[i + 1] && /^(true|false)$/.test(args[i + 1])) {
                    setArg(key7, args[i + 1] === "true", arg);
                    i++;
                } else {
                    setArg(key7, get(flags.strings, key7) ? "" : true, arg);
                }
            }
        } else {
            if (!flags.unknownFn || flags.unknownFn(arg) !== false) {
                argv._.push(flags.strings["_"] ?? !isNumber(arg) ? arg : Number(arg));
            }
            if (stopEarly) {
                argv._.push(...args.slice(i + 1));
                break;
            }
        }
    }
    for (const [key8, value1] of Object.entries(defaults)){
        if (!hasKey(argv, key8.split("."))) {
            setKey(argv, key8, value1);
            if (aliases[key8]) {
                for (const x of aliases[key8]){
                    setKey(argv, x, value1);
                }
            }
        }
    }
    for (const key9 of Object.keys(flags.bools)){
        if (!hasKey(argv, key9.split("."))) {
            const value2 = get(flags.collect, key9) ? [] : false;
            setKey(argv, key9, value2, false);
        }
    }
    for (const key10 of Object.keys(flags.strings)){
        if (!hasKey(argv, key10.split(".")) && get(flags.collect, key10)) {
            setKey(argv, key10, [], false);
        }
    }
    if (doubleDash) {
        argv["--"] = [];
        for (const key11 of notFlags){
            argv["--"].push(key11);
        }
    } else {
        for (const key12 of notFlags){
            argv._.push(key12);
        }
    }
    return argv;
}
const args = parse(Deno.args, {
    boolean: [
        "help",
        "debug",
        "omit-default-content-type-header",
        "v",
        "r"
    ],
    string: [
        "i",
        "b",
        "h"
    ],
    "--": true
});
var LogLevels;
(function(LogLevels) {
    LogLevels[LogLevels["NOTSET"] = 0] = "NOTSET";
    LogLevels[LogLevels["DEBUG"] = 10] = "DEBUG";
    LogLevels[LogLevels["INFO"] = 20] = "INFO";
    LogLevels[LogLevels["WARNING"] = 30] = "WARNING";
    LogLevels[LogLevels["ERROR"] = 40] = "ERROR";
    LogLevels[LogLevels["CRITICAL"] = 50] = "CRITICAL";
})(LogLevels || (LogLevels = {}));
Object.keys(LogLevels).filter((key)=>isNaN(Number(key)));
const byLevel = {
    [String(LogLevels.NOTSET)]: "NOTSET",
    [String(LogLevels.DEBUG)]: "DEBUG",
    [String(LogLevels.INFO)]: "INFO",
    [String(LogLevels.WARNING)]: "WARNING",
    [String(LogLevels.ERROR)]: "ERROR",
    [String(LogLevels.CRITICAL)]: "CRITICAL"
};
function getLevelByName(name) {
    switch(name){
        case "NOTSET":
            return LogLevels.NOTSET;
        case "DEBUG":
            return LogLevels.DEBUG;
        case "INFO":
            return LogLevels.INFO;
        case "WARNING":
            return LogLevels.WARNING;
        case "ERROR":
            return LogLevels.ERROR;
        case "CRITICAL":
            return LogLevels.CRITICAL;
        default:
            throw new Error(`no log level found for "${name}"`);
    }
}
function getLevelName(level) {
    const levelName = byLevel[level];
    if (levelName) {
        return levelName;
    }
    throw new Error(`no level name found for level: ${level}`);
}
class LogRecord {
    msg;
    #args;
    #datetime;
    level;
    levelName;
    loggerName;
    constructor(options){
        this.msg = options.msg;
        this.#args = [
            ...options.args
        ];
        this.level = options.level;
        this.loggerName = options.loggerName;
        this.#datetime = new Date();
        this.levelName = getLevelName(options.level);
    }
    get args() {
        return [
            ...this.#args
        ];
    }
    get datetime() {
        return new Date(this.#datetime.getTime());
    }
}
class Logger {
    #level;
    #handlers;
    #loggerName;
    constructor(loggerName, levelName, options = {}){
        this.#loggerName = loggerName;
        this.#level = getLevelByName(levelName);
        this.#handlers = options.handlers || [];
    }
    get level() {
        return this.#level;
    }
    set level(level) {
        this.#level = level;
    }
    get levelName() {
        return getLevelName(this.#level);
    }
    set levelName(levelName) {
        this.#level = getLevelByName(levelName);
    }
    get loggerName() {
        return this.#loggerName;
    }
    set handlers(hndls) {
        this.#handlers = hndls;
    }
    get handlers() {
        return this.#handlers;
    }
    #_log(level, msg, ...args1) {
        if (this.level > level) {
            return msg instanceof Function ? undefined : msg;
        }
        let fnResult;
        let logMessage;
        if (msg instanceof Function) {
            fnResult = msg();
            logMessage = this.asString(fnResult);
        } else {
            logMessage = this.asString(msg);
        }
        const record = new LogRecord({
            msg: logMessage,
            args: args1,
            level: level,
            loggerName: this.loggerName
        });
        this.#handlers.forEach((handler)=>{
            handler.handle(record);
        });
        return msg instanceof Function ? fnResult : msg;
    }
    asString(data) {
        if (typeof data === "string") {
            return data;
        } else if (data === null || typeof data === "number" || typeof data === "bigint" || typeof data === "boolean" || typeof data === "undefined" || typeof data === "symbol") {
            return String(data);
        } else if (data instanceof Error) {
            return data.stack;
        } else if (typeof data === "object") {
            return JSON.stringify(data);
        }
        return "undefined";
    }
    debug(msg, ...args) {
        return this.#_log(LogLevels.DEBUG, msg, ...args);
    }
    info(msg, ...args) {
        return this.#_log(LogLevels.INFO, msg, ...args);
    }
    warning(msg, ...args) {
        return this.#_log(LogLevels.WARNING, msg, ...args);
    }
    error(msg, ...args) {
        return this.#_log(LogLevels.ERROR, msg, ...args);
    }
    critical(msg, ...args) {
        return this.#_log(LogLevels.CRITICAL, msg, ...args);
    }
}
const { Deno: Deno1  } = globalThis;
const noColor = typeof Deno1?.noColor === "boolean" ? Deno1.noColor : true;
let enabled = !noColor;
function code(open, close) {
    return {
        open: `\x1b[${open.join(";")}m`,
        close: `\x1b[${close}m`,
        regexp: new RegExp(`\\x1b\\[${close}m`, "g")
    };
}
function run(str, code) {
    return enabled ? `${code.open}${str.replace(code.regexp, code.open)}${code.close}` : str;
}
function bold(str) {
    return run(str, code([
        1
    ], 22));
}
function red(str) {
    return run(str, code([
        31
    ], 39));
}
function yellow(str) {
    return run(str, code([
        33
    ], 39));
}
function blue(str) {
    return run(str, code([
        34
    ], 39));
}
function brightRed(str) {
    return run(str, code([
        91
    ], 39));
}
function brightYellow(str) {
    return run(str, code([
        93
    ], 39));
}
function brightBlue(str) {
    return run(str, code([
        94
    ], 39));
}
new RegExp([
    "[\\u001B\\u009B][[\\]()#;?]*(?:(?:(?:(?:;[-a-zA-Z\\d\\/#&.:=?%@~_]+)*|[a-zA-Z\\d]+(?:;[-a-zA-Z\\d\\/#&.:=?%@~_]*)*)?\\u0007)",
    "(?:(?:\\d{1,4}(?:;\\d{0,4})*)?[\\dA-PR-TZcf-nq-uy=><~]))"
].join("|"), "g");
function copy(src, dst, off = 0) {
    off = Math.max(0, Math.min(off, dst.byteLength));
    const dstBytesAvailable = dst.byteLength - off;
    if (src.byteLength > dstBytesAvailable) {
        src = src.subarray(0, dstBytesAvailable);
    }
    dst.set(src, off);
    return src.byteLength;
}
class AbstractBufBase {
    buf;
    usedBufferBytes = 0;
    err = null;
    constructor(buf){
        this.buf = buf;
    }
    size() {
        return this.buf.byteLength;
    }
    available() {
        return this.buf.byteLength - this.usedBufferBytes;
    }
    buffered() {
        return this.usedBufferBytes;
    }
}
class BufWriterSync extends AbstractBufBase {
    #writer;
    static create(writer, size = 4096) {
        return writer instanceof BufWriterSync ? writer : new BufWriterSync(writer, size);
    }
    constructor(writer, size = 4096){
        super(new Uint8Array(size <= 0 ? 4096 : size));
        this.#writer = writer;
    }
    reset(w) {
        this.err = null;
        this.usedBufferBytes = 0;
        this.#writer = w;
    }
    flush() {
        if (this.err !== null) throw this.err;
        if (this.usedBufferBytes === 0) return;
        try {
            const p = this.buf.subarray(0, this.usedBufferBytes);
            let nwritten = 0;
            while(nwritten < p.length){
                nwritten += this.#writer.writeSync(p.subarray(nwritten));
            }
        } catch (e) {
            if (e instanceof Error) {
                this.err = e;
            }
            throw e;
        }
        this.buf = new Uint8Array(this.buf.length);
        this.usedBufferBytes = 0;
    }
    writeSync(data) {
        if (this.err !== null) throw this.err;
        if (data.length === 0) return 0;
        let totalBytesWritten = 0;
        let numBytesWritten = 0;
        while(data.byteLength > this.available()){
            if (this.buffered() === 0) {
                try {
                    numBytesWritten = this.#writer.writeSync(data);
                } catch (e) {
                    if (e instanceof Error) {
                        this.err = e;
                    }
                    throw e;
                }
            } else {
                numBytesWritten = copy(data, this.buf, this.usedBufferBytes);
                this.usedBufferBytes += numBytesWritten;
                this.flush();
            }
            totalBytesWritten += numBytesWritten;
            data = data.subarray(numBytesWritten);
        }
        numBytesWritten = copy(data, this.buf, this.usedBufferBytes);
        this.usedBufferBytes += numBytesWritten;
        totalBytesWritten += numBytesWritten;
        return totalBytesWritten;
    }
}
const DEFAULT_FORMATTER = "{levelName} {msg}";
class BaseHandler {
    level;
    levelName;
    formatter;
    constructor(levelName, options = {}){
        this.level = getLevelByName(levelName);
        this.levelName = levelName;
        this.formatter = options.formatter || DEFAULT_FORMATTER;
    }
    handle(logRecord) {
        if (this.level > logRecord.level) return;
        const msg = this.format(logRecord);
        return this.log(msg);
    }
    format(logRecord) {
        if (this.formatter instanceof Function) {
            return this.formatter(logRecord);
        }
        return this.formatter.replace(/{([^\s}]+)}/g, (match, p1)=>{
            const value = logRecord[p1];
            if (value == null) {
                return match;
            }
            return String(value);
        });
    }
    log(_msg) {}
    setup() {}
    destroy() {}
}
class ConsoleHandler extends BaseHandler {
    format(logRecord) {
        let msg = super.format(logRecord);
        switch(logRecord.level){
            case LogLevels.INFO:
                msg = blue(msg);
                break;
            case LogLevels.WARNING:
                msg = yellow(msg);
                break;
            case LogLevels.ERROR:
                msg = red(msg);
                break;
            case LogLevels.CRITICAL:
                msg = bold(red(msg));
                break;
            default:
                break;
        }
        return msg;
    }
    log(msg) {
        console.log(msg);
    }
}
class WriterHandler extends BaseHandler {
    _writer;
    #encoder = new TextEncoder();
}
class FileHandler extends WriterHandler {
    _file;
    _buf;
    _filename;
    _mode;
    _openOptions;
    _encoder = new TextEncoder();
    #unloadCallback = (()=>{
        this.destroy();
    }).bind(this);
    constructor(levelName, options){
        super(levelName, options);
        this._filename = options.filename;
        this._mode = options.mode ? options.mode : "a";
        this._openOptions = {
            createNew: this._mode === "x",
            create: this._mode !== "x",
            append: this._mode === "a",
            truncate: this._mode !== "a",
            write: true
        };
    }
    setup() {
        this._file = Deno.openSync(this._filename, this._openOptions);
        this._writer = this._file;
        this._buf = new BufWriterSync(this._file);
        addEventListener("unload", this.#unloadCallback);
    }
    handle(logRecord) {
        super.handle(logRecord);
        if (logRecord.level > LogLevels.ERROR) {
            this.flush();
        }
    }
    log(msg) {
        if (this._encoder.encode(msg).byteLength + 1 > this._buf.available()) {
            this.flush();
        }
        this._buf.writeSync(this._encoder.encode(msg + "\n"));
    }
    flush() {
        if (this._buf?.buffered() > 0) {
            this._buf.flush();
        }
    }
    destroy() {
        this.flush();
        this._file?.close();
        this._file = undefined;
        removeEventListener("unload", this.#unloadCallback);
    }
}
const DEFAULT_LEVEL = "INFO";
const DEFAULT_CONFIG = {
    handlers: {
        default: new ConsoleHandler(DEFAULT_LEVEL)
    },
    loggers: {
        default: {
            level: DEFAULT_LEVEL,
            handlers: [
                "default"
            ]
        }
    }
};
const state = {
    handlers: new Map(),
    loggers: new Map(),
    config: DEFAULT_CONFIG
};
function getLogger(name) {
    if (!name) {
        const d = state.loggers.get("default");
        assert(d != null, `"default" logger must be set for getting logger without name`);
        return d;
    }
    const result = state.loggers.get(name);
    if (!result) {
        const logger = new Logger(name, "NOTSET", {
            handlers: []
        });
        state.loggers.set(name, logger);
        return logger;
    }
    return result;
}
function setup(config) {
    state.config = {
        handlers: {
            ...DEFAULT_CONFIG.handlers,
            ...config.handlers
        },
        loggers: {
            ...DEFAULT_CONFIG.loggers,
            ...config.loggers
        }
    };
    state.handlers.forEach((handler)=>{
        handler.destroy();
    });
    state.handlers.clear();
    const handlers = state.config.handlers || {};
    for(const handlerName in handlers){
        const handler = handlers[handlerName];
        handler.setup();
        state.handlers.set(handlerName, handler);
    }
    state.loggers.clear();
    const loggers = state.config.loggers || {};
    for(const loggerName in loggers){
        const loggerConfig = loggers[loggerName];
        const handlerNames = loggerConfig.handlers || [];
        const handlers1 = [];
        handlerNames.forEach((handlerName)=>{
            const handler = state.handlers.get(handlerName);
            if (handler) {
                handlers1.push(handler);
            }
        });
        const levelName = loggerConfig.level || DEFAULT_LEVEL;
        const logger = new Logger(loggerName, levelName, {
            handlers: handlers1
        });
        state.loggers.set(loggerName, logger);
    }
}
setup(DEFAULT_CONFIG);
const DEFAULT_FORMATTER1 = "{levelName} {msg}";
class BaseHandler1 {
    level;
    levelName;
    formatter;
    constructor(levelName, options = {}){
        this.level = getLevelByName(levelName);
        this.levelName = levelName;
        this.formatter = options.formatter || DEFAULT_FORMATTER1;
    }
    handle(logRecord) {
        if (this.level > logRecord.level) return;
        const msg = this.format(logRecord);
        return this.log(msg);
    }
    format(logRecord) {
        if (this.formatter instanceof Function) {
            return this.formatter(logRecord);
        }
        return this.formatter.replace(/{([^\s}]+)}/g, (match, p1)=>{
            const value = logRecord[p1];
            if (value == null) {
                return match;
            }
            return String(value);
        });
    }
    log(_msg) {}
    setup() {}
    destroy() {}
}
class WriterHandler1 extends BaseHandler1 {
    _writer;
    #encoder = new TextEncoder();
}
class FileHandler1 extends WriterHandler1 {
    _file;
    _buf;
    _filename;
    _mode;
    _openOptions;
    _encoder = new TextEncoder();
    #unloadCallback = (()=>{
        this.destroy();
    }).bind(this);
    constructor(levelName, options){
        super(levelName, options);
        this._filename = options.filename;
        this._mode = options.mode ? options.mode : "a";
        this._openOptions = {
            createNew: this._mode === "x",
            create: this._mode !== "x",
            append: this._mode === "a",
            truncate: this._mode !== "a",
            write: true
        };
    }
    setup() {
        this._file = Deno.openSync(this._filename, this._openOptions);
        this._writer = this._file;
        this._buf = new BufWriterSync(this._file);
        addEventListener("unload", this.#unloadCallback);
    }
    handle(logRecord) {
        super.handle(logRecord);
        if (logRecord.level > LogLevels.ERROR) {
            this.flush();
        }
    }
    log(msg) {
        if (this._encoder.encode(msg).byteLength + 1 > this._buf.available()) {
            this.flush();
        }
        this._buf.writeSync(this._encoder.encode(msg + "\n"));
    }
    flush() {
        if (this._buf?.buffered() > 0) {
            this._buf.flush();
        }
    }
    destroy() {
        this.flush();
        this._file?.close();
        this._file = undefined;
        removeEventListener("unload", this.#unloadCallback);
    }
}
class BrightConsoleHandler extends BaseHandler1 {
    format(logRecord) {
        let msg = super.format(logRecord);
        switch(logRecord.level){
            case LogLevels.INFO:
                msg = brightBlue(msg);
                break;
            case LogLevels.WARNING:
                msg = brightYellow(msg);
                break;
            case LogLevels.ERROR:
                msg = brightRed(msg);
                break;
            case LogLevels.CRITICAL:
                msg = bold(brightRed(msg));
                break;
            default:
                break;
        }
        return msg;
    }
    log(msg) {
        console.log(msg);
    }
}
const logLevel = Deno.args.includes("--debug") ? "DEBUG" : "INFO";
await setup({
    handlers: {
        console: new BrightConsoleHandler("DEBUG", {
            formatter: "{msg}"
        })
    },
    loggers: {
        default: {
            level: logLevel,
            handlers: [
                "console"
            ]
        }
    }
});
const logger = getLogger();
const help = `
Sample command:

jsonr -h "Authorization: Bearer ..." -m POST ./sample.http

Parameters:

path to .http file name or url

  You can use .http files (utf-8 encoded, RFC 2616 standard content) to specify your requests or don't use additional files at all and provide url that should get called.

  EXAMPLE

  jsonr ./sample.http
  jsonr http://jsonapi.com/values

  .http files have following sample structure:

  POST http://www.my-api.com/values
  TrackingId: my-random-tracking-id

  {
    "username" : "sample.email@sample.com"
  }

  As you can see first line is about http method + url. Below there are http headers listed and at the bottom request body. 
  If, for any reason, you don't want to create http file you can provide valid url value and use other parameters to provide more details for the request. 
  If you use http file, keep in mind that you can still use parameters to override some of the requests properties defined in http file.

-i provide value for [i]nput variables

  Input variables allow you to specify variables for url, headers or request body parts. Simply put @@variable-name@@ inside .http file. 
  This will allow to either provide it's value via -i flag, or via environment file option (read further)

  EXAMPLE of sample.http file content with variables:

  POST http://my-api.com
  Authorization: Bearer 123

  {
    "username": "@@variable@@"
  }

  Input variables work as a simple text replacement (case sensitive).

  For such sample file, you can run:

  jsonr -i "variable: someuser@email.com" ./sample.http

  If you have many input variables, use many -i flags:

  jsonr -i "variable1: a" -i "variable2: b" ./some-other-sample.http

-h provide value for additional [h]eaders

  If there are additional headers that you want to append to the request you can use this parameter. If there are many headers you want to append, use many -h flags:

  jsonr -h "Authorization: Bearer 123" -h "TrackingId: xyz" ./sample.http

-s expected response [s]tatus code

  If you provide this parameter jsonr will perform assertion against returned response status code. This is useful if you want to create smoke tests scripts.
  You can for instance  write a script with multiple requests:
  
  jsonr -s 200 ./request1.http
  jsonr -s 204 ./request2.http

  jsonr will return non-zero exit code if assertion failed, so you can prepare a script that will report error if any of the requests fail.

-t expected [t]ext that should be contained within response body

  This parameter works in a very similar way as the -s param. With one remark - it checks response body and searches if it's response contains specified text.
  It's a simple text search, no regular expressions available. If text is not contained - jsonr will report error. It may be useful for smoke tests scripts.

-e [e]nvironment file path

  Environment file a json file with variables and their values (similar to -i parameter) it allows you to reuse existing .http files.
  For instance you can have following sample.http file:

  POST https://@@apiUrl@@/value

  {
    "username": "user@email.com"
  }

  Now, you can create environment file test.json:

  {
    "apiUrl": "my-api-on-test-environment.com"
  }

  And use it later as:

  jsonr -e ./test.json ./sample.http

-m HTTP [m]ethod

  Specify http method, like:

  jsonr -m POST ./sample.http
  jsonr -m GET http://localhost:3000/api/users

  Default (if nothing found in .http file and no parameter provided) - GET

-v [v]erbose mode

  Provide more details in output (output request and response headers). It may be useful for reporting issues with endpoints

-r request [r]aw mode

  By default jsonr replaces all new line and tab characters (whitespace characters) in http file so you can use new lines for human-friendly request body formatting. 
  If you use this flag you will disable this behaviour.

--debug Debug mode 

  Provide more detailed logs (use it only for troubleshooting)

-b Request [b]ody (if not willing to use http file)

  EXAMPLE
  jsonr -m POST -b '{ "username": "user@email.com" }' http://myapi.com/values

--omit-default-content-type-header 

  By default jsonr will append Content-Type "application/json" header to all requests so you don't need to repeat it. Use this option to disable this behavior.

--help Display this help text

--version Display version info

-o [o]utput file for response json, if this parameter is not provided default output is stdout. 

  WARNING: If file exists it will overwrite it.

  EXAMPLE: jsonr ... -o my-response 
  Saves to ./my-response.json, overwrites file if it already exists!
`;
const __default = {
    execute: ()=>console.log(help),
    match: (args)=>args.help ? true : false
};
const version = "1.3.3";
const __default1 = {
    execute: ()=>console.log(version),
    match: (args)=>args.version ? true : false
};
const parseHttpFile = async (filePath, variables, rawMode)=>{
    logger.debug(`Attempting to read request data from file: ${filePath}`);
    try {
        let fileContent = await Deno.readTextFile(filePath);
        for (const [key, value] of variables){
            logger.debug(`Replacing @@${key}@@ with ${value} for content of ${filePath}`);
            fileContent = fileContent.replaceAll(`@@${key}@@`, value);
        }
        let [mainPart, bodyPart] = fileContent.split(/\r?\n\r?\n/);
        const request = {};
        const [mainLine, ...headers] = mainPart.split(/\r?\n/);
        const [method, url] = mainLine.split(" ").map((x)=>x.trim());
        logger.debug(`Read following method: ${method} and url: ${url}`);
        request.method = method;
        request.url = url;
        request.headers = [];
        if (headers && headers.length > 0) {
            for (const header of headers){
                if (header) {
                    const [headerKey, headerValue] = header.split(":").map((x)=>x.trim());
                    request.headers.push({
                        key: headerKey,
                        value: headerValue
                    });
                }
            }
        }
        if (bodyPart) {
            logger.debug(`Read following request body: ${bodyPart}`);
            if (!rawMode) {
                bodyPart = bodyPart.replace(/\r?\n|\t/g, "");
            }
            request.body = bodyPart;
        }
        return request;
    } catch (err) {
        logger.debug(`Error when parsing file: ${err}`);
        throw new Error("Unexpected error occurred when trying to parse http file. Ensure that the file is compatible with RFC2616 standard");
    }
};
const getVariables = async (args)=>{
    const result = new Map();
    if (args.e) {
        const environmentFilePath = args.e;
        try {
            const environmentFileVariables = JSON.parse(await Deno.readTextFile(environmentFilePath));
            for (const variable of Object.keys(environmentFileVariables)){
                result.set(variable, environmentFileVariables[variable]);
            }
        } catch (err) {
            logger.debug(err);
            logger.error(`There was a problem when reading variables for environment file ${environmentFilePath}. Ensure that the file exists and contains proper JSON structure. Refer to --help for details.`);
        }
    }
    const setInputVariable = (variable)=>{
        const [key, value] = variable.split(":").map((x)=>x.trim());
        result.set(key, value);
    };
    if (args.i) {
        if (Array.isArray(args.i)) {
            for (const inputVariable of args.i){
                setInputVariable(inputVariable);
            }
        } else {
            setInputVariable(args.i);
        }
    }
    return result;
};
const sendRequest = async (args)=>{
    const request = {
        method: "GET",
        headers: [
            {
                key: "Content-Type",
                value: "application/json"
            }
        ],
        body: "",
        url: ""
    };
    if (args["omit-default-content-type-header"]) {
        logger.debug("Parameter--omit-default-content-type-header provided - removing default Content-Type header");
        request.headers = [];
    }
    if (args["_"].length != 1) {
        throw new Error("Invalid parameters provided. Provide exactly one url or .http file path.");
    }
    const urlOrFilePath = args["_"][0];
    if (urlOrFilePath.startsWith("http://") || urlOrFilePath.startsWith("https://")) {
        logger.debug("http(s):// at the beginning of the file/url parameter detected. Assuming url.");
        request.url = urlOrFilePath;
    } else {
        try {
            await Deno.lstat(urlOrFilePath);
            logger.debug(`File ${urlOrFilePath} found. Parsing http file content.`);
            const variables = await getVariables(args);
            const fileRequest = await parseHttpFile(urlOrFilePath, variables, args.r);
            request.method = fileRequest.method;
            request.url = fileRequest.url;
            request.body = fileRequest.body;
            if (fileRequest.headers.some((x)=>x.key == "Content-Type")) {
                request.headers = fileRequest.headers;
            } else {
                request.headers = [
                    ...request.headers,
                    ...fileRequest.headers
                ];
            }
        } catch (err) {
            logger.debug(`Failed to lstat file/url parameter - ${urlOrFilePath}. Assuming url. Error: ${err}`);
            request.url = urlOrFilePath;
        }
    }
    if (args.m) {
        logger.debug(`Parameter [m]ethod provided - HTTP method set to ${args.m}`);
        request.method = args.m;
    }
    if (args.b) {
        logger.debug(`Parameter [b]ody provided - HTTP body set to ${args.b}`);
        request.body = args.b;
    }
    if (args.h) {
        const appendHeader = (headerArg)=>{
            logger.debug(`Adding ${headerArg} header to request`);
            const [headerKey, headerValue] = headerArg.split(":")?.map((x)=>x.trim());
            request.headers.push({
                key: headerKey,
                value: headerValue
            });
        };
        if (Array.isArray(args.h)) {
            for (const h of args.h){
                appendHeader(h);
            }
        } else {
            appendHeader(args.h);
        }
    }
    logger.info(`${request.method} ${request.url}...`);
    let requestLog = (msg)=>logger.debug(msg);
    if (args.v) requestLog = (msg)=>logger.info(msg);
    requestLog("Request:");
    request.headers.forEach((x)=>requestLog(`${x.key}: ${x.value}`));
    requestLog("");
    if (request.body) {
        requestLog(request.body);
    }
    const timestamp = new Date();
    const options = {
        method: request.method,
        body: request.body,
        redirect: "manual",
        headers: request.headers.reduce((acc, x)=>{
            if (!acc) {
                acc = new Headers();
            }
            acc.append(x.key, x.value);
            return acc;
        }, null)
    };
    if (!request.body || !request.body.trim()) {
        logger.debug("No request body provided, removing it from request object.");
        delete options.body;
    }
    request.url = request.url.startsWith("http://") || request.url.startsWith("https://") ? request.url : `http://${request.url}`;
    const response = await fetch(request.url, options);
    const elapsed = new Date() - timestamp;
    let responseBody = await response.text();
    if (responseBody.trim()) {
        try {
            responseBody = JSON.parse(responseBody);
        } catch (err1) {
            logger.debug("Exception thrown when parsing response body as JSON");
            logger.debug(err1);
        }
    }
    logger.info("Response:");
    logger.info("");
    if (args.v) {
        for (const header of response.headers.entries()){
            logger.info(`${header[0]}: ${header[1]}`);
        }
    }
    if (responseBody) {
        if (args.o) {
            await Deno.writeTextFile(args.o, JSON.stringify(responseBody));
            logger.info(`Response body written to file ${args.o}`);
        } else {
            responseBody = Deno.inspect(responseBody, {
                colors: true,
                strAbbreviateSize: 256000,
                iterableLimit: 20000,
                depth: 100
            });
            logger.info(responseBody);
        }
    } else {
        logger.info("No response body returned from server");
    }
    logger.info(`${response.status} - ${response.statusText} obtained in ${elapsed}ms`);
    if (args.s) {
        if (args.s != response.status) {
            logger.error(`ERROR: Response status code (${response.status}) doesn't match expected value (${args.s})`);
            Deno.exit(1);
        }
    }
    if (args.t) {
        if (!responseBody.includes(args.t)) {
            logger.error(`ERROR: Response body doesn't contain expected text (${args.t})`);
            Deno.exit(1);
        }
    }
};
const __default2 = {
    execute: async (args)=>await sendRequest(args),
    match: ()=>true
};
const commands = [
    {
        name: "help",
        engine: __default
    },
    {
        name: "version",
        engine: __default1
    },
    {
        name: "send-request",
        engine: __default2
    }
];
logger.debug("Args provided:");
logger.debug(args);
for (const command of commands){
    logger.debug(`Trying to match with command ${command.name}`);
    if (command.engine.match(args)) {
        logger.debug(`Match found for command ${command.name}. Executing...`);
        try {
            await command.engine.execute(args);
        } catch (err) {
            logger.error(err.message);
            logger.debug(err);
        }
        Deno.exit(0);
    } else {
        logger.debug("No match found");
    }
}
