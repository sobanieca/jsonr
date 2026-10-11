// Globals available to scripts run with `jsonr run`: jsonr(), console and
// Headers. Native helpers are provided by src/script.rs.
(() => {
  const send = globalThis.__jsonrSend;
  const print = globalThis.__jsonrPrint;
  delete globalThis.__jsonrSend;
  delete globalThis.__jsonrPrint;

  class Headers {
    #entries;

    constructor(entries = []) {
      this.#entries = entries.map(([key, value]) => [
        String(key).toLowerCase(),
        String(value),
      ]);
    }

    get(name) {
      const key = String(name).toLowerCase();
      const values = this.#entries.filter(([k]) => k === key).map(([, v]) => v);
      return values.length > 0 ? values.join(", ") : null;
    }

    has(name) {
      return this.get(name) !== null;
    }

    entries() {
      return this.#entries.map(([k, v]) => [k, v])[Symbol.iterator]();
    }

    keys() {
      return this.#entries.map(([k]) => k)[Symbol.iterator]();
    }

    values() {
      return this.#entries.map(([, v]) => v)[Symbol.iterator]();
    }

    forEach(callback, thisArg) {
      for (const [key, value] of this.#entries) {
        callback.call(thisArg, value, key, this);
      }
    }

    [Symbol.iterator]() {
      return this.entries();
    }
  }

  // Converts any value into a JSON description that src/script.rs formats
  // like Deno's console.
  const describe = (value, depth = 0, seen = []) => {
    switch (typeof value) {
      case "undefined":
        return ["u"];
      case "string":
        return ["s", value];
      case "boolean":
        return ["b", value];
      case "bigint":
        return ["g", String(value)];
      case "symbol":
        return ["y", value.toString()];
      case "number":
        return ["n", Object.is(value, -0) ? "-0" : String(value)];
      case "function": {
        const source = Function.prototype.toString.call(value);
        if (source.startsWith("class")) {
          return ["x", `[class ${value.name || "(anonymous)"}]`];
        }
        return ["x", value.name ? `[Function: ${value.name}]` : "[Function (anonymous)]"];
      }
    }
    if (value === null) return ["l"];
    if (seen.includes(value)) return ["x", "[Circular *1]"];
    if (depth > 6) return ["x", Array.isArray(value) ? "[Array]" : "[Object]"];
    if (value instanceof Error) {
      const head = `${value.name}: ${value.message}`;
      return ["r", value.stack ? `${head}\n${value.stack}`.trimEnd() : head];
    }
    if (value instanceof Date) {
      return ["d", isNaN(value.getTime()) ? "Invalid Date" : value.toISOString()];
    }
    if (value instanceof Promise) return ["x", "Promise { <unknown> }"];
    const inner = [...seen, value];
    if (Array.isArray(value)) {
      return ["a", value.map((item) => describe(item, depth + 1, inner))];
    }
    if (value instanceof Headers) {
      return ["o", "Headers", [...value.entries()].map(([k, v]) => [k, ["s", v]])];
    }
    const proto = Object.getPrototypeOf(value);
    let name = null;
    if (proto === null) {
      name = "[Object: null prototype]";
    } else if (proto !== Object.prototype) {
      const ctor = proto.constructor;
      name = typeof ctor === "function" && ctor.name ? ctor.name : null;
    }
    const entries = Object.keys(value).map((key) => {
      let item;
      try {
        item = describe(value[key], depth + 1, inner);
      } catch (err) {
        item = ["x", `[Getter: <Inspection threw (${err?.message})>]`];
      }
      return [key, item];
    });
    return ["o", name, entries];
  };

  // Segments are raw strings or described values.
  const format = (args) => {
    const segments = [];
    let rest = args;
    if (typeof args[0] === "string" && args.length > 1 && args[0].includes("%")) {
      const [template, ...values] = args;
      let text = "";
      let index = 0;
      for (let i = 0; i < template.length; i++) {
        const c = template[i];
        const next = template[i + 1];
        if (c !== "%" || next === undefined) {
          text += c;
          continue;
        }
        if (next === "%") {
          text += "%";
          i++;
          continue;
        }
        if (!"sdifoOc".includes(next) || index >= values.length) {
          text += c;
          continue;
        }
        const value = values[index++];
        i++;
        if (next === "s") {
          text += typeof value === "symbol" ? value.toString() : String(value);
        } else if (next === "d" || next === "i") {
          text += typeof value === "bigint"
            ? `${value}n`
            : typeof value === "symbol"
            ? "NaN"
            : String(parseInt(value));
        } else if (next === "f") {
          text += typeof value === "symbol" ? "NaN" : String(parseFloat(value));
        } else if (next === "o" || next === "O") {
          segments.push(text, describe(value));
          text = "";
        }
      }
      segments.push(text);
      rest = values.slice(index);
      for (const value of rest) {
        segments.push(" ", typeof value === "string" ? value : describe(value));
      }
      return segments;
    }
    rest.forEach((value, i) => {
      if (i > 0) segments.push(" ");
      segments.push(typeof value === "string" ? value : describe(value));
    });
    return segments;
  };

  const out = (...args) => print(1, JSON.stringify(format(args)));
  const err = (...args) => print(2, JSON.stringify(format(args)));
  globalThis.console = {
    log: out,
    info: out,
    debug: out,
    error: err,
    warn: err,
  };

  globalThis.Headers = Headers;

  const pending = [];
  globalThis.jsonr = (urlOrFile, options = {}) => {
    const promise = new Promise((resolve, reject) => {
      try {
        const response = JSON.parse(
          send(String(urlOrFile), JSON.stringify(options ?? {})),
        );
        if (response) {
          response.headers = new Headers(response.headers);
        }
        resolve(response);
      } catch (error) {
        reject(error);
      }
    });
    pending.push(promise);
    return promise;
  };

  globalThis.__jsonrSettle = () => Promise.all(pending);
})();
