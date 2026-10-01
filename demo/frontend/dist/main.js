"use strict";
(() => {
  var __create = Object.create;
  var __defProp = Object.defineProperty;
  var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
  var __knownSymbol = (name, symbol) => (symbol = Symbol[name]) ? symbol : /* @__PURE__ */ Symbol.for("Symbol." + name);
  var __typeError = (msg) => {
    throw TypeError(msg);
  };
  var __defNormalProp = (obj, key, value) => key in obj ? __defProp(obj, key, { enumerable: true, configurable: true, writable: true, value }) : obj[key] = value;
  var __name = (target, value) => __defProp(target, "name", { value, configurable: true });
  var __decoratorStart = (base) => [, , , __create(base?.[__knownSymbol("metadata")] ?? null)];
  var __decoratorStrings = ["class", "method", "getter", "setter", "accessor", "field", "value", "get", "set"];
  var __expectFn = (fn) => fn !== void 0 && typeof fn !== "function" ? __typeError("Function expected") : fn;
  var __decoratorContext = (kind, name, done, metadata, fns) => ({ kind: __decoratorStrings[kind], name, metadata, addInitializer: (fn) => done._ ? __typeError("Already initialized") : fns.push(__expectFn(fn || null)) });
  var __decoratorMetadata = (array, target) => __defNormalProp(target, __knownSymbol("metadata"), array[3]);
  var __runInitializers = (array, flags, self, value) => {
    for (var i = 0, fns = array[flags >> 1], n = fns && fns.length; i < n; i++) flags & 1 ? fns[i].call(self) : value = fns[i].call(self, value);
    return value;
  };
  var __decorateElement = (array, flags, name, decorators, target, extra) => {
    var fn, it, done, ctx, access, k = flags & 7, s = !!(flags & 8), p = !!(flags & 16);
    var j = k > 3 ? array.length + 1 : k ? s ? 1 : 2 : 0, key = __decoratorStrings[k + 5];
    var initializers = k > 3 && (array[j - 1] = []), extraInitializers = array[j] || (array[j] = []);
    var desc = k && (!p && !s && (target = target.prototype), k < 5 && (k > 3 || !p) && __getOwnPropDesc(k < 4 ? target : { get [name]() {
      return __privateGet(this, extra);
    }, set [name](x) {
      return __privateSet(this, extra, x);
    } }, name));
    k ? p && k < 4 && __name(extra, (k > 2 ? "set " : k > 1 ? "get " : "") + name) : __name(target, name);
    for (var i = decorators.length - 1; i >= 0; i--) {
      ctx = __decoratorContext(k, name, done = {}, array[3], extraInitializers);
      if (k) {
        ctx.static = s, ctx.private = p, access = ctx.access = { has: p ? (x) => __privateIn(target, x) : (x) => name in x };
        if (k ^ 3) access.get = p ? (x) => (k ^ 1 ? __privateGet : __privateMethod)(x, target, k ^ 4 ? extra : desc.get) : (x) => x[name];
        if (k > 2) access.set = p ? (x, y) => __privateSet(x, target, y, k ^ 4 ? extra : desc.set) : (x, y) => x[name] = y;
      }
      it = (0, decorators[i])(k ? k < 4 ? p ? extra : desc[key] : k > 4 ? void 0 : { get: desc.get, set: desc.set } : target, ctx), done._ = 1;
      if (k ^ 4 || it === void 0) __expectFn(it) && (k > 4 ? initializers.unshift(it) : k ? p ? extra = it : desc[key] = it : target = it);
      else if (typeof it !== "object" || it === null) __typeError("Object expected");
      else __expectFn(fn = it.get) && (desc.get = fn), __expectFn(fn = it.set) && (desc.set = fn), __expectFn(fn = it.init) && initializers.unshift(fn);
    }
    return k || __decoratorMetadata(array, target), desc && __defProp(target, name, desc), p ? k ^ 4 ? extra : desc : target;
  };
  var __publicField = (obj, key, value) => __defNormalProp(obj, typeof key !== "symbol" ? key + "" : key, value);
  var __accessCheck = (obj, member, msg) => member.has(obj) || __typeError("Cannot " + msg);
  var __privateIn = (member, obj) => Object(obj) !== obj ? __typeError('Cannot use the "in" operator on this value') : member.has(obj);
  var __privateGet = (obj, member, getter) => (__accessCheck(obj, member, "read from private field"), getter ? getter.call(obj) : member.get(obj));
  var __privateAdd = (obj, member, value) => member.has(obj) ? __typeError("Cannot add the same private member more than once") : member instanceof WeakSet ? member.add(obj) : member.set(obj, value);
  var __privateSet = (obj, member, value, setter) => (__accessCheck(obj, member, "write to private field"), setter ? setter.call(obj, value) : member.set(obj, value), value);
  var __privateMethod = (obj, member, method) => (__accessCheck(obj, member, "access private method"), method);
  var __privateWrapper = (obj, member, setter, getter) => ({
    set _(value) {
      __privateSet(obj, member, value, setter);
    },
    get _() {
      return __privateGet(obj, member, getter);
    }
  });

  // node_modules/x4js/src/core/core_i18n.ts
  var languages = {};
  function createLanguage(name, base) {
    languages[name] = {
      name,
      base,
      src_translations: {},
      translations: {}
    };
  }
  __name(createLanguage, "createLanguage");
  function isLanguage(name) {
    return languages[name] !== void 0;
  }
  __name(isLanguage, "isLanguage");
  function addTranslation(name, ...parts) {
    if (!isLanguage(name)) {
      return;
    }
    const lang = languages[name];
    parts.forEach((p) => {
      _patch(lang.src_translations, p);
    });
    lang.translations = _proxyfy(lang.src_translations, lang.base, true);
  }
  __name(addTranslation, "addTranslation");
  function _patch(obj, by) {
    for (const n in by) {
      const src = by[n];
      if (typeof src === "string") {
        obj[n] = src;
      } else {
        if (Array.isArray(src) && (!obj[n] || !Array.isArray(obj[n]))) {
          obj[n] = [...src];
        } else if (!obj[n] || typeof obj[n] !== "object") {
          obj[n] = { ...src };
        } else {
          _patch(obj[n], by[n]);
        }
      }
    }
  }
  __name(_patch, "_patch");
  function _proxyfy(obj, base, root) {
    const result = {};
    for (const n in obj) {
      if (typeof obj[n] !== "string" && !Array.isArray(obj[n])) {
        result[n] = _proxyfy(obj[n], base, false);
      } else {
        result[n] = obj[n];
      }
    }
    return _mk_proxy(result, base, root);
  }
  __name(_proxyfy, "_proxyfy");
  function _mk_proxy(obj, base, root) {
    return new Proxy(obj, {
      get: /* @__PURE__ */ __name((target, prop) => {
        if (root) {
          req_path = [prop];
        } else {
          req_path.push(prop);
        }
        let value = target[prop];
        if (value === void 0) {
          if (base) {
            value = _findBaseTrans(base);
          }
          if (value === void 0) {
            console.error("I18N error: unable to find", "_tr." + req_path.join("."));
          }
        }
        return value;
      }, "get")
    });
  }
  __name(_mk_proxy, "_mk_proxy");
  var req_path;
  function _findBaseTrans(base) {
    while (base) {
      const lang = languages[base];
      let trans = lang.translations;
      let value;
      for (const p of req_path) {
        value = trans[p];
        if (value === void 0) {
          break;
        }
        trans = value;
      }
      if (value !== void 0) {
        return trans;
      }
      base = lang.base;
    }
    return void 0;
  }
  __name(_findBaseTrans, "_findBaseTrans");
  var current = {
    name: "",
    translations: {}
  };
  var tr_handler = {
    get(_target, prop) {
      return current.translations[prop];
    },
    has(_target, prop) {
      return prop in current.translations;
    },
    ownKeys() {
      return Reflect.ownKeys(current.translations);
    },
    getOwnPropertyDescriptor(_target, prop) {
      const value = current.translations[prop];
      if (value === void 0) {
        return void 0;
      }
      return { value, enumerable: true, configurable: true };
    }
  };
  var _tr = new Proxy({}, tr_handler);
  function selectLanguage(name) {
    if (!isLanguage(name)) {
      return;
    }
    current.name = name;
    current.translations = languages[name].translations;
    return _tr;
  }
  __name(selectLanguage, "selectLanguage");
  var fr = {
    global: {
      ok: "OK",
      cancel: "Annuler",
      ignore: "Ignorer",
      yes: "Oui",
      no: "Non",
      abort: "Abandonner",
      retry: "Réessayer",
      error: "Erreur",
      today: "Aujourd'hui",
      open: "Ouvrir",
      new: "Nouveau",
      delete: "Supprimer",
      close: "Fermer",
      save: "Enregistrer",
      search: "Rechercher",
      search_tip: "Saisissez le texte à rechercher. <b>Enter</b> pour lancer la recherche. <b>Esc</b> pour annuler.",
      required_field: "information requise",
      invalid_format: "format invalide",
      invalid_email: "adresse mail invalide",
      invalid_number: "valeur numérique invalide",
      diff_date_seconds: "{0} secondes",
      diff_date_minutes: "{0} minutes",
      diff_date_hours: "{0} heures",
      invalid_date: "Date non reconnue ({0})",
      empty_list: "Liste vide",
      date_input_formats: "d/m/y|d.m.y|d m y|d-m-y|dmy",
      date_format: "D/M/Y",
      date_time_format: "D/M/Y H:I:S",
      day_short: ["dim", "lun", "mar", "mer", "jeu", "ven", "sam"],
      day_long: ["dimanche", "lundi", "mardi", "mercredi", "jeudi", "vendredi", "samedi"],
      month_short: ["jan", "fév", "mar", "avr", "mai", "jun", "jui", "aoû", "sep", "oct", "nov", "déc"],
      month_long: ["janvier", "février", "mars", "avril", "mai", "juin", "juillet", "août", "septembre", "octobre", "novembre", "décembre"],
      property: "Propriété",
      value: "Valeur",
      err_403: `Vous n'avez pas les droits suffisants pour effectuer cette action`,
      copy: "Copier",
      cut: "Couper",
      paste: "Coller",
      filedrop: "Déposez un fichier",
      keyboard: {
        next: "Suivant",
        numeric: "123",
        alpha: "Abc"
      }
    }
  };
  var en = {
    global: {
      ok: "OK",
      cancel: "Cancel",
      ignore: "Ignore",
      yes: "Yes",
      no: "No",
      abort: "Abort",
      retry: "Retry",
      error: "Error",
      today: "Today",
      open: "Open",
      new: "New",
      delete: "Delete",
      close: "Close",
      save: "Save",
      search: "Search",
      search_tip: "Type in the text to search. <b>Enter</b> to start the search. <b>Esc</b> to cancel.",
      required_field: "missing information",
      invalid_format: "invalid format",
      invalid_email: "invalid email address",
      invalid_number: "bad numeric value",
      diff_date_seconds: "{0} seconds",
      diff_date_minutes: "{0} minutes",
      diff_date_hours: "{0} hours",
      invalid_date: "Unrecognized date({0})",
      empty_list: "Empty list",
      date_input_formats: "m/d/y|m.d.y|m d y|m-d-y|mdy",
      date_format: "M/D/Y",
      date_time_format: "M/D/Y H:I:S",
      day_short: ["sun", "mon", "tue", "wed", "thu", "fri", "sat"],
      day_long: ["sunday", "monday", "tuesday", "wednesday", "thursday", "friday", "saturday"],
      month_short: ["jan", "feb", "mar", "apr", "may", "jun", "jul", "aug", "sep", "oct", "nov", "dec"],
      month_long: ["january", "february", "march", "april", "may", "june", "july", "august", "september", "october", "november", "december"],
      property: "Property",
      value: "Value",
      err_403: `You do not have sufficient rights to do that action`,
      copy: "Copy",
      cut: "Cut",
      paste: "Paste",
      filedrop: "Drop a file",
      keyboard: {
        next: "Next",
        numeric: "123",
        alpha: "Abc"
      }
    }
  };
  createLanguage("fr", null);
  addTranslation("fr", fr);
  createLanguage("en", "fr");
  addTranslation("en", en);
  selectLanguage("fr");

  // node_modules/x4js/src/core/core_tools.ts
  function isString(val) {
    return typeof val === "string";
  }
  __name(isString, "isString");
  function isNumber(v) {
    return typeof v === "number" && isFinite(v);
  }
  __name(isNumber, "isNumber");
  function isArray(val) {
    return val instanceof Array;
  }
  __name(isArray, "isArray");
  function isFunction(val) {
    return val instanceof Function;
  }
  __name(isFunction, "isFunction");
  function isPlainObject(value) {
    if (typeof value !== "object" || value === null) {
      return false;
    }
    return Object.getPrototypeOf(value) === Object.prototype || Object.getPrototypeOf(value) === null;
  }
  __name(isPlainObject, "isPlainObject");
  var _UnsafeHtml = class _UnsafeHtml extends String {
    constructor(value) {
      super(value);
    }
  };
  __name(_UnsafeHtml, "UnsafeHtml");
  var UnsafeHtml = _UnsafeHtml;
  function unsafeHtml(x) {
    return new UnsafeHtml(x);
  }
  __name(unsafeHtml, "unsafeHtml");
  function clamp(v, min, max) {
    if (v < min) {
      return min;
    }
    if (v > max) {
      return max;
    }
    return v;
  }
  __name(clamp, "clamp");
  var _Rect = class _Rect {
    constructor(l, t, w, h) {
      __publicField(this, "left");
      __publicField(this, "top");
      __publicField(this, "height");
      __publicField(this, "width");
      if (l !== void 0) {
        if (isNumber(l)) {
          this.left = l;
          this.top = t;
          this.width = w;
          this.height = h;
        } else {
          Object.assign(this, l);
        }
      }
    }
    get right() {
      return this.left + this.width;
    }
    get bottom() {
      return this.top + this.height;
    }
    contains(arg) {
      if (arg instanceof _Rect) {
        return arg.left >= this.left && arg.right <= this.right && arg.top >= this.top && arg.bottom <= this.bottom;
      } else {
        return arg.x >= this.left && arg.x < this.right && arg.y >= this.top && arg.y < this.bottom;
      }
    }
    touches(rc) {
      if (this.left > rc.right || this.right < rc.left || this.top > rc.bottom || this.bottom < rc.top) {
        return false;
      }
      return true;
    }
    normalize() {
      let w = this.width, h = this.height;
      if (w < 0) {
        this.left += w;
        this.width = -w;
      }
      if (h < 0) {
        this.top += h;
        this.height = -h;
      }
      return this;
    }
    inflate(dx, dy) {
      if (dy === void 0) {
        dy = dx;
      }
      this.left -= dx;
      this.width += dx + dx;
      this.top -= dy;
      this.height += dy + dy;
      return this;
    }
    scale(scale) {
      this.left *= scale;
      this.top *= scale;
      this.width *= scale;
      this.height *= scale;
      return this;
    }
    moveTo(x, y) {
      this.left = x;
      this.top = x;
      return this;
    }
  };
  __name(_Rect, "Rect");
  var Rect = _Rect;
  function centerRect(innerRect, outerRect, margin = 0) {
    const owidth = outerRect.width - 2 * margin;
    const oheight = outerRect.height - 2 * margin;
    const ratio = innerRect.width / innerRect.height;
    let nwidth = owidth;
    let nheight = owidth / ratio;
    if (nheight > oheight) {
      nheight = oheight;
      nwidth = oheight * ratio;
    }
    const newLeft = outerRect.left + (outerRect.width - nwidth) / 2;
    const newTop = outerRect.top + (outerRect.height - nheight) / 2;
    return { left: newLeft, top: newTop, width: nwidth, height: nheight };
  }
  __name(centerRect, "centerRect");
  function isFeatureAvailable(name) {
    switch (name) {
      case "eyedropper":
        return "EyeDropper" in window;
    }
    return false;
  }
  __name(isFeatureAvailable, "isFeatureAvailable");
  var _Timer = class _Timer {
    constructor() {
      __publicField(this, "_timers");
    }
    /**
     * 
     */
    setTimeout(name, time, callback) {
      if (!this._timers) {
        this._timers = /* @__PURE__ */ new Map();
      } else {
        this.clearTimeout(name);
      }
      const tm = setTimeout(() => {
        this._timers?.delete(name);
        callback();
      }, time);
      this._timers.set(name, tm);
      return tm;
    }
    clearTimeout(name) {
      if (this._timers && this._timers.has(name)) {
        clearTimeout(this._timers.get(name));
        this._timers.delete(name);
      }
    }
    /**
     * 
     */
    setInterval(name, time, callback) {
      if (!this._timers) {
        this._timers = /* @__PURE__ */ new Map();
      } else {
        this.clearInterval(name);
      }
      const tm = setInterval(callback, time);
      this._timers.set(name, tm);
      return tm;
    }
    clearInterval(name) {
      if (this._timers && this._timers.has(name)) {
        clearInterval(this._timers.get(name));
        this._timers.delete(name);
      }
    }
    clearAllTimeouts() {
      this._timers?.forEach((t) => {
        clearTimeout(t);
      });
      this._timers = null;
    }
    debounce(name, time, callback) {
      this.setTimeout(name, time, callback);
    }
  };
  __name(_Timer, "Timer");
  var Timer = _Timer;
  function asap(callback) {
    return requestAnimationFrame(callback);
  }
  __name(asap, "asap");
  function pad(what, size, ch = "0") {
    let value;
    if (!isString(what)) {
      value = "" + what;
    } else {
      value = what;
    }
    if (size > 0) {
      return value.padEnd(size, ch);
    } else {
      return value.padStart(-size, ch);
    }
  }
  __name(pad, "pad");
  function date_hash(date) {
    return date.getFullYear() << 16 | date.getMonth() << 8 | date.getDate();
  }
  __name(date_hash, "date_hash");
  function date_clone(date) {
    return new Date(date.getTime());
  }
  __name(date_clone, "date_clone");
  function date_calc_weeknum(date) {
    const firstDayOfYear = new Date(date.getFullYear(), 0, 1);
    const pastDaysOfYear = (date.valueOf() - firstDayOfYear.valueOf()) / 864e5;
    return Math.floor((pastDaysOfYear + firstDayOfYear.getDay() + 1) / 7);
  }
  __name(date_calc_weeknum, "date_calc_weeknum");
  function formatIntlDate(date, fmt = _tr.global.date_format, utc = false) {
    if (!date) {
      return "";
    }
    let now = {
      year: utc ? date.getUTCFullYear() : date.getFullYear(),
      month: utc ? date.getUTCMonth() + 1 : date.getMonth() + 1,
      day: utc ? date.getUTCDate() : date.getDate(),
      wday: utc ? date.getUTCDay() : date.getDay(),
      hours: utc ? date.getUTCHours() : date.getHours(),
      minutes: utc ? date.getUTCMinutes() : date.getMinutes(),
      seconds: utc ? date.getUTCSeconds() : date.getSeconds(),
      milli: utc ? date.getUTCMilliseconds() : date.getMilliseconds()
    };
    let result = "";
    let esc = 0;
    for (let c of fmt) {
      if (c == "{") {
        if (++esc == 1) {
          continue;
        }
      } else if (c == "}") {
        if (--esc == 0) {
          continue;
        }
      }
      if (esc) {
        result += c;
        continue;
      }
      if (c == "d") {
        result += now.day;
      } else if (c == "D") {
        result += pad(now.day, -2);
      } else if (c == "j") {
        result += _tr.global.day_short[now.wday];
      } else if (c == "J") {
        result += _tr.global.day_long[now.wday];
      } else if (c == "w") {
        result += date_calc_weeknum(date);
      } else if (c == "W") {
        result += pad(date_calc_weeknum(date), -2);
      } else if (c == "m") {
        result += now.month;
      } else if (c == "M") {
        result += pad(now.month, -2);
      } else if (c == "o") {
        result += _tr.global.month_short[now.month - 1];
      } else if (c == "O") {
        result += _tr.global.month_long[now.month - 1];
      } else if (c == "y" || c == "Y") {
        result += pad(now.year, -4);
      } else if (c == "a" || c == "A") {
        result += now.hours < 12 ? "am" : "pm";
      } else if (c == "h") {
        result += now.hours;
      } else if (c == "H") {
        result += pad(now.hours, -2);
      } else if (c == "i") {
        result += now.minutes;
      } else if (c == "I") {
        result += pad(now.minutes, -2);
      } else if (c == "s") {
        result += now.seconds;
      } else if (c == "S") {
        result += pad(now.seconds, -2);
      } else if (c == "l") {
        result += now.milli;
      } else if (c == "L") {
        result += pad(now.milli, -3);
      } else {
        result += c;
      }
    }
    return result;
  }
  __name(formatIntlDate, "formatIntlDate");
  var sb_width_cache = -1;
  var window_zoom = -1;
  function getScrollbarSize() {
    if (sb_width_cache < 0) {
      let outerDiv = document.createElement("div");
      outerDiv.style.cssText = "overflow:auto;position:absolute;top:0;width:100px;height:100px";
      let innerDiv = document.createElement("div");
      innerDiv.style.width = "200px";
      innerDiv.style.height = "200px";
      outerDiv.appendChild(innerDiv);
      document.body.appendChild(outerDiv);
      sb_width_cache = outerDiv.offsetWidth - outerDiv.clientWidth;
      document.body.removeChild(outerDiv);
    }
    return sb_width_cache;
  }
  __name(getScrollbarSize, "getScrollbarSize");
  function getGlobalZoom() {
    if (window_zoom < 0) {
      const style = window.getComputedStyle(document.body);
      const matrix = style.transform;
      if (matrix !== "none") {
        const values = matrix.split("(")[1].split(")")[0].split(",");
        window_zoom = parseFloat(values[0]);
      } else {
        window_zoom = parseFloat(style.zoom) || 1;
      }
    }
    return window_zoom;
  }
  __name(getGlobalZoom, "getGlobalZoom");
  var x4_class_ns_sym = /* @__PURE__ */ Symbol("class-ns");
  function class_ns(ns) {
    return function(constructor) {
      constructor[x4_class_ns_sym] = ns;
    };
  }
  __name(class_ns, "class_ns");
  function setWaitCursor(wait) {
    document.body.style.cursor = wait ? "wait" : "default";
  }
  __name(setWaitCursor, "setWaitCursor");
  var FOCUSABLE = [
    'button:not([tabindex="-1"])',
    "[href]",
    "input",
    "select",
    "textarea",
    '[tabindex]:not([tabindex="-1"])'
  ].map((x) => x + ":not(:disabled):not([inert])").join(",");
  function getFocusableElements(root) {
    const focusable = Array.from(root.querySelectorAll(FOCUSABLE));
    return focusable.filter((x) => {
      if (x.offsetParent == null) {
        return false;
      }
      if (x.closest("[inert]") || x.closest(":disabled")) {
        return false;
      }
      return true;
    });
  }
  __name(getFocusableElements, "getFocusableElements");
  var _escapes = {
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;"
  };
  var _rx_escape = /[&<>"']/g;
  function sanitizeHtml(input) {
    if (input === void 0 || input === null || input === "") {
      return "";
    }
    if (!_rx_escape.test(input)) {
      return input;
    }
    _rx_escape.lastIndex = 0;
    return input.replace(_rx_escape, (ch) => _escapes[ch]);
  }
  __name(sanitizeHtml, "sanitizeHtml");
  function _parse_path(path) {
    const segments = [];
    for (const part of path.split(".")) {
      let rest = part;
      const bracket = rest.indexOf("[");
      if (bracket < 0) {
        segments.push(rest);
        continue;
      }
      if (bracket > 0) {
        segments.push(rest.substring(0, bracket));
      }
      const re = /\[(\d+)\]/g;
      let m;
      while ((m = re.exec(rest)) !== null) {
        segments.push(m[1]);
      }
    }
    return segments;
  }
  __name(_parse_path, "_parse_path");
  function _walk_to_parent(obj, segments) {
    let current2 = obj;
    for (let i = 0; i < segments.length - 1; i++) {
      if (current2 === null || current2 === void 0) {
        return void 0;
      }
      current2 = current2[segments[i]];
    }
    return current2;
  }
  __name(_walk_to_parent, "_walk_to_parent");
  function getMemberValue(obj, path) {
    const segments = _parse_path(path);
    const parent = _walk_to_parent(obj, segments);
    if (parent === void 0 || parent === null) {
      return void 0;
    }
    return parent[segments[segments.length - 1]];
  }
  __name(getMemberValue, "getMemberValue");

  // node_modules/x4js/src/core/core_events.ts
  var stopPropagation = /* @__PURE__ */ __name(function() {
    this.propagationStopped = true;
  }, "stopPropagation");
  var preventDefault = /* @__PURE__ */ __name(function() {
    this.defaultPrevented = true;
  }, "preventDefault");
  var _EventSource = class _EventSource {
    /**
     * Creates an instance of EventSource.
     * @param source - The object that will be reported as the `source` of events fired by this instance.
     *                 If `null` or `undefined`, the `EventSource` instance itself will be the source.
     */
    constructor(source = null) {
      __publicField(this, "_source");
      __publicField(this, "_registry");
      this._source = source ?? this;
    }
    /**
     * Registers an event listener for a specific event name.
     * @param name - The name of the event to listen for (must be a key in `E`).
     * @param callback - The function to be called when the event is fired.
     * @param capturing - If `true`, the listener will be added to the beginning of the listener list (capturing phase).
     */
    addListener(name, callback, capturing = false) {
      if (!this._registry) {
        this._registry = /* @__PURE__ */ new Map();
      }
      let listeners = this._registry.get(name);
      if (!listeners) {
        listeners = [];
        this._registry.set(name, listeners);
      }
      const cb = callback;
      if (listeners.indexOf(cb) == -1) {
        if (capturing) {
          listeners.unshift(cb);
        } else {
          listeners.push(cb);
        }
      }
      return () => {
        this.removeListener(name, callback);
      };
    }
    /**
     * Removes a previously registered event listener.
     * @param name - The name of the event from which to remove the listener.
     * @param callback - The specific callback function to remove. It must be the same function instance that was originally registered.
     */
    removeListener(name, callback) {
      if (!this._registry) {
        return;
      }
      let listeners = this._registry.get(name);
      if (!listeners) {
        return;
      }
      const cb = callback;
      const idx = listeners.indexOf(cb);
      if (idx !== -1) {
        listeners.splice(idx, 1);
      }
    }
    /**
     * Dispatches an event with a given name and payload to all registered listeners.
     * @param name - The name of the event to fire (must be a key in `E`).
     * @param evx - The event payload (event object) to pass to the listeners.
     */
    fire(name, evx) {
      let listeners = this._registry?.get(name);
      if (listeners && listeners.length) {
        let ev = evx;
        if (!ev) {
          ev = {};
        }
        if (!ev.source) {
          ev.source = this._source;
        }
        if (!ev.type) {
          ev.type = name;
        }
        if (!ev.preventDefault) {
          ev.preventDefault = preventDefault;
        }
        if (!ev.stopPropagation) {
          ev.stopPropagation = stopPropagation;
        }
        if (listeners.length == 1) {
          listeners[0](ev);
        } else {
          const temp = listeners.slice();
          for (let i = 0, n = temp.length; i < n; i++) {
            temp[i](ev);
            if (ev.propagationStopped) {
              break;
            }
          }
        }
      }
    }
  };
  __name(_EventSource, "EventSource");
  var EventSource = _EventSource;

  // node_modules/x4js/src/core/core_element.ts
  var _events, _timers, _cleanup;
  var _CoreElement = class _CoreElement {
    constructor() {
      __privateAdd(this, _events);
      __privateAdd(this, _timers);
      __privateAdd(this, _cleanup);
    }
    /** changed to stop timers when object is down
    
    	private __startTimer( name: string, ms: number, repeat: boolean, callback: ( ) => void ) {
    		if (!this.#timers) {
    			this.#timers = new Map();
    		}
    		else {
    			this.__stopTimer(name);
    		}
    
    		const id = (repeat ? setInterval : setTimeout)( callback, ms );
    
    		this.#timers.set(name, () => { 
    			(repeat ? clearInterval : clearTimeout)(id); 
    			this.#timers.delete(name) 
    		});
    	}
    
    	private __stopTimer( name: string ) {
    		const clear = this.#timers?.get(name);
    		if (clear) { clear(); }
    	}
    	*/
    __startTimer(name, ms, repeat, callback) {
      if (!__privateGet(this, _timers)) {
        __privateSet(this, _timers, /* @__PURE__ */ new Map());
      } else {
        this.__stopTimer(name);
      }
      const ref = new WeakRef(this);
      let tick;
      if (repeat) {
        tick = /* @__PURE__ */ __name(() => {
          const self = ref.deref();
          if (!self) {
            clearInterval(id);
            return;
          }
          __privateGet(self, _timers).get(name).cb();
        }, "tick");
        const id = setInterval(tick, ms);
        __privateGet(this, _timers).set(name, {
          cb: callback,
          id,
          clear() {
            clearInterval(id);
          }
        });
      } else {
        tick = /* @__PURE__ */ __name(() => {
          const self = ref.deref();
          if (!self) {
            return;
          }
          __privateGet(self, _timers).delete(name);
          callback();
        }, "tick");
        __privateGet(this, _timers).set(name, {
          cb: callback,
          id: setTimeout(tick, ms),
          clear() {
            clearTimeout(this.id);
          }
        });
      }
    }
    __stopTimer(name) {
      const entry = __privateGet(this, _timers)?.get(name);
      if (entry) {
        entry.clear();
        __privateGet(this, _timers).delete(name);
      }
    }
    /**
     * Sets a timeout that executes a callback function after a specified delay.
     * If a timeout with the same name already exists, it will be cleared before the new one is set.
     * @param name - A unique string identifier for this timeout.
     * @param ms - The delay in milliseconds before the callback is executed.
     * @param callback - The function to execute after the delay.
     */
    setTimeout(name, ms, callback) {
      this.__startTimer(name, ms, false, callback);
    }
    /**
     * Clears a previously set timeout.
     * @param name - The name of the timeout to clear.
     * @see setTimeout
     */
    clearTimeout(name) {
      this.__stopTimer(name);
    }
    /**
     * Sets an interval that repeatedly executes a callback function after a specified delay.
     * If a timeout with the same name already exists, it will be cleared before the new one is set.
     * @param name - A unique string identifier for this timeout.
     * @param ms - The delay in milliseconds before the callback is executed.
     * @param callback - The function to execute after the delay.
     */
    setInterval(name, ms, callback) {
      this.__startTimer(name, ms, true, callback);
    }
    /**
     * Clears a previously set interval.
     * @param name - The name of the interval to clear.
     * @see setInterval
     */
    clearInterval(name) {
      this.__stopTimer(name);
    }
    /**
     * Clears all timeouts and intervals currently managed by this instance.
     * This stops all scheduled callbacks and removes their references.
     * @see setTimeout
     */
    clearTimeouts() {
      if (!__privateGet(this, _timers)) {
        return;
      }
      for (const entry of __privateGet(this, _timers).values()) {
        entry.clear();
      }
      __privateGet(this, _timers).clear();
    }
    /**
     * add a cleanup function to the cleanup list
     * @see cleanUp
     */
    addCleanup(fn) {
      if (!__privateGet(this, _cleanup)) {
        __privateSet(this, _cleanup, []);
      }
      __privateGet(this, _cleanup).push(fn);
    }
    /**
     * called when element is removed from dom
     */
    cleanUp() {
      this.clearTimeouts();
      if (__privateGet(this, _cleanup)) {
        __privateGet(this, _cleanup).forEach((x) => x());
        __privateGet(this, _cleanup).length = 0;
      }
    }
    // :: EVENTS ::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::
    /**
     * Registers an event listener for a specific event name.
     * The listener will be invoked when an event with the given name is fired.
     * Returns an object with an `off()` method, which can be used to conveniently remove this specific listener.
     * @param name - The name of the event to listen for.
     * @param listener - The callback function to execute when the event is fired.
     * @returns An object containing an `off()` method to unsubscribe the listener.
     * @see fire
     * attach to an event
     */
    on(name, listener) {
      console.assert(listener !== void 0 && listener !== null);
      if (!__privateGet(this, _events)) {
        __privateSet(this, _events, new EventSource(this));
      }
      __privateGet(this, _events).addListener(name, listener);
      return {
        off: /* @__PURE__ */ __name(() => {
          __privateGet(this, _events).removeListener(name, listener);
        }, "off")
      };
    }
    /**
     * Removes a previously registered event listener.
     * If the listener was not found or no events were registered, this method does nothing.
     * @param name - The name of the event from which to remove the listener.
     * @param listener - The specific listener function to remove.
     * @see on
     * @see fire
     */
    off(name, listener) {
      console.assert(listener !== void 0 && listener !== null);
      if (__privateGet(this, _events)) {
        __privateGet(this, _events).removeListener(name, listener);
      }
    }
    /**
     * Dispatches an event with a given name and payload to all registered listeners.
     * If no listeners are registered for the event name, or if no EventSource has been initialized, this method does nothing.
     * @param name - The name of the event to fire.
     * @param ev - The payload (event object) to pass to the listeners.
     * @see on
     * @see off
     */
    fire(name, ev) {
      if (__privateGet(this, _events)) {
        __privateGet(this, _events).fire(name, ev);
      }
    }
  };
  _events = new WeakMap();
  _timers = new WeakMap();
  _cleanup = new WeakMap();
  __name(_CoreElement, "CoreElement");
  var CoreElement = _CoreElement;

  // node_modules/x4js/src/core/core_styles.ts
  var unitless = {
    animationIterationCount: 1,
    aspectRatio: 1,
    borderImageOutset: 1,
    borderImageSlice: 1,
    borderImageWidth: 1,
    boxFlex: 1,
    boxFlexGroup: 1,
    boxOrdinalGroup: 1,
    columnCount: 1,
    columns: 1,
    flex: 1,
    flexGrow: 1,
    flexPositive: 1,
    flexShrink: 1,
    flexNegative: 1,
    flexOrder: 1,
    gridRow: 1,
    gridRowEnd: 1,
    gridRowSpan: 1,
    gridRowStart: 1,
    gridColumn: 1,
    gridColumnEnd: 1,
    gridColumnSpan: 1,
    gridColumnStart: 1,
    msGridRow: 1,
    msGridRowSpan: 1,
    msGridColumn: 1,
    msGridColumnSpan: 1,
    fontWeight: 1,
    lineHeight: 1,
    opacity: 1,
    order: 1,
    orphans: 1,
    tabSize: 1,
    widows: 1,
    zIndex: 1,
    zoom: 1,
    WebkitLineClamp: 1,
    // SVG-related properties
    fillOpacity: 1,
    floodOpacity: 1,
    stopOpacity: 1,
    strokeDasharray: 1,
    strokeDashoffset: 1,
    strokeMiterlimit: 1,
    strokeOpacity: 1,
    strokeWidth: 1
  };
  function isUnitLess(name) {
    return unitless[name] ? true : false;
  }
  __name(isUnitLess, "isUnitLess");

  // node_modules/x4js/src/core/core_dom.ts
  var COMPONENT = /* @__PURE__ */ Symbol("component");
  var unbubbleEvents = {
    mouseleave: 1,
    mouseenter: 1,
    load: 1,
    unload: 1,
    scroll: 1,
    focus: 1,
    blur: 1,
    rowexit: 1,
    beforeunload: 1,
    stop: 1,
    dragdrop: 1,
    dragenter: 1,
    dragexit: 1,
    draggesture: 1,
    dragover: 1,
    contextmenu: 1,
    created: 2,
    removed: 2,
    sizechange: 2
  };
  var event_handlers = /* @__PURE__ */ new WeakMap();
  var mutObserver = null;
  var observeMutation = /* @__PURE__ */ __name((mutations, observer) => {
    const added = /* @__PURE__ */ new Set();
    const removed = /* @__PURE__ */ new Set();
    for (const mutation of mutations) {
      if (mutation.type == "childList") {
        mutation.addedNodes.forEach((n) => {
          if (removed.has(n)) {
            removed.delete(n);
          } else {
            added.add(n);
          }
        });
        mutation.removedNodes.forEach((n) => {
          if (added.has(n)) {
            added.delete(n);
          } else {
            removed.add(n);
          }
        });
      }
    }
    const sendEvent = /* @__PURE__ */ __name((node, code) => {
      const store = event_handlers.get(node);
      if (store && store[code]) {
        node.dispatchEvent(new Event(code, {}));
      }
    }, "sendEvent");
    const notify = /* @__PURE__ */ __name((node, create) => {
      if (create) {
        sendEvent(node, "created");
      }
      for (let c = node.firstChild; c; c = c.nextSibling) {
        notify(c, create);
      }
      if (!create) {
        const core = node[COMPONENT];
        if (core && core.cleanUp) {
          core.cleanUp();
        }
        sendEvent(node, "removed");
      }
    }, "notify");
    added.forEach((n) => {
      if (n.isConnected) notify(n, true);
    });
    removed.forEach((n) => {
      if (!n.isConnected) notify(n, false);
    });
  }, "observeMutation");
  var sizeObserver = null;
  function observeSize(entries) {
    entries.forEach((entry) => {
      let dom = entry.target;
      if (dom.offsetParent !== null) {
        dom.dispatchEvent(new Event("resized"));
      }
    });
  }
  __name(observeSize, "observeSize");
  function dispatchEvent(ev) {
    let target = ev.target, noup = unbubbleEvents[ev.type] === 2;
    while (target) {
      const store = event_handlers.get(target);
      if (store) {
        const callback = store[ev.type];
        if (callback) {
          if (Array.isArray(callback)) {
            callback.some((c) => c(ev));
          } else {
            callback(ev);
          }
          if (ev.defaultPrevented || noup) {
            break;
          }
        }
      }
      target = target.parentNode;
      if (target == document) {
        break;
      }
    }
  }
  __name(dispatchEvent, "dispatchEvent");
  function addEvent(node, name, handler, prepend = false) {
    if (!mutObserver) {
      mutObserver = new MutationObserver(observeMutation);
      mutObserver.observe(document.body, { childList: true, subtree: true });
    }
    if (name == "removed" || name == "created") {
      const core = node[COMPONENT];
      if (core && core.addClass) {
        core.addClass("x4:mut");
      }
    } else if (name == "resized") {
      if (!sizeObserver) {
        sizeObserver = new ResizeObserver(observeSize);
      }
      const core = node[COMPONENT];
      if (core && core.addClass) {
        core.addClass("x4:sze");
      }
      sizeObserver.observe(node);
    }
    let store = event_handlers.get(node);
    if (!store) {
      store = {};
      event_handlers.set(node, store);
    }
    if (!store[name]) {
      store[name] = handler;
      node.addEventListener(name, dispatchEvent);
    } else {
      const entry = store[name];
      if (Array.isArray(entry)) {
        entry.push(handler);
      } else {
        store[name] = [entry, handler];
      }
    }
  }
  __name(addEvent, "addEvent");

  // node_modules/x4js/src/core/core_application.ts
  var socket_sent = /* @__PURE__ */ Symbol("socket");
  var main_app = null;
  var _Process = class _Process {
    /**
     * can be use to see if we have some tactile input
     * @returns max touch point count
     */
    getMaxTouchPoints() {
      return navigator.maxTouchPoints;
    }
  };
  __name(_Process, "Process");
  var Process = _Process;
  var _Application = class _Application extends CoreElement {
    /**
        * Creates an instance of the Application.
        * This class is a singleton; an assertion will fail if multiple instances are created.
        * @param props - Configuration properties for the application.
        */
    constructor(props = {}) {
      super();
      __publicField(this, "env", /* @__PURE__ */ new Map());
      __publicField(this, "mainview");
      __publicField(this, "props");
      __publicField(this, "mounted", false);
      console.assert(main_app == null, "Application must be a singleton.");
      main_app = this;
      const loaded = /* @__PURE__ */ __name(() => {
        this.mount(props.mountPoint ?? "body");
      }, "loaded");
      if (document.readyState == "complete") {
        asap(loaded);
      } else {
        window.addEventListener("load", loaded, { once: true });
      }
      const resize = /* @__PURE__ */ __name(() => {
        this.fire("resize", {
          width: window.innerWidth,
          height: window.innerHeight
        });
      }, "resize");
      window.addEventListener("resize", resize, { passive: true });
    }
    /**
     * 
     */
    mount(mountPoint = "body") {
      if (!this.mounted && this.mainview) {
        const ev = document.querySelector(mountPoint);
        if (ev) {
          ev.appendChild(this.mainview.dom);
        }
      }
    }
    /**
        * Sets the main view component for the application.
        * This component will be mounted to the DOM.
        * @param view - The component to set as the main view.
        */
    setMainView(view) {
      this.mainview = view;
      this.mount();
      this._setupKeyboard();
    }
    /**
        * Returns the singleton instance of the Application.
        * @returns The application instance.
        */
    static instance() {
      return main_app;
    }
    /**
       * Retrieves the main view component of the application.
       * @returns The application's main view component.
       */
    getMainView() {
      return this.mainview;
    }
    /**
        * Sets an environment variable in the application's environment map.
        * @param name - The name of the environment variable.
        * @param value - The value to store for the environment variable.
        */
    setEnv(name, value) {
      this.env.set(name, value);
    }
    /**
        * Retrieves an environment variable from the application's environment map.
        * @param name - The name of the environment variable.
        * @param def_value - An optional default value to return if the variable is not found.
        * @returns The value of the environment variable, or `def_value` if not found.
        */
    getEnv(name, def_value) {
      return this.env.get(name) ?? def_value;
    }
    /**
        * 
        */
    static fireGlobal(msg, params) {
      _Application.instance().fire("global", { msg, params });
    }
    /**
     * 
     */
    _setupKeyboard() {
      document.addEventListener("keydown", (ev) => {
        if (ev.key == "Tab" || ev.key == "Enter") {
          if (this.focusNext(!ev.shiftKey)) {
            ev.preventDefault();
          }
        }
      });
    }
    /**
        * Moves focus to the next or previous focusable element within the application.
        * Handles Tab and Shift+Tab key presses.
        * @param next - If `true`, focus moves to the next element; if `false`, to the previous.
        * @returns `true` if focus was successfully moved, `false` otherwise.
        */
    focusNext(next) {
      let act = document.activeElement;
      let topmost;
      while (act != document.body) {
        const comp = componentFromDOM(act);
        if (comp) {
          const ifx = comp.queryInterface("tab-handler");
          if (ifx) {
            return ifx.focusNext(next);
          }
          if (act.classList.contains("x4box")) {
            topmost = act;
          }
        }
        act = act.parentElement;
      }
      if (topmost) {
        const focusable = getFocusableElements(topmost);
        if (!focusable.length) {
          return true;
        } else {
          const first = focusable[0];
          const last = focusable[focusable.length - 1];
          let newf;
          if (!next && document.activeElement === first) {
            newf = last;
          } else if (next && document.activeElement === last) {
            newf = first;
          }
          if (newf) {
            newf.focus();
            return true;
          }
        }
      }
      return false;
    }
    /**
        * Sets up WebSocket messaging for the application.
        * All 'global' messages fired via the application will be sent over the WebSocket,
        * and messages received from the WebSocket will be re-fired as 'global' messages.
        * @param path - Optional WebSocket path. If not provided, it defaults to `ws://hostname:port/ws`.
        * @param looseCallback - A callback function to be executed when the WebSocket connection is closed unexpectedly.
        */
    setupSocketMessaging(path, looseCallback) {
      const protocol = window.location.protocol === "https:" ? "wss://" : "ws://";
      const address = path ? protocol + path : `${protocol}${window.location.hostname}:${window.location.port}/ws`;
      let opened = 0;
      let msg_socket = null;
      this.on("global", (e) => {
        if (Object.prototype.hasOwnProperty.call(e, socket_sent)) {
          return;
        }
        if (msg_socket) {
          msg_socket.send(JSON.stringify({
            msg: e.msg,
            params: e.params
          }));
        }
      });
      msg_socket = new WebSocket(address, "messaging");
      msg_socket.onopen = () => {
        console.log("websocket opened");
        opened = 1;
      };
      msg_socket.onmessage = (e) => {
        if (e.data != "ping") {
          const message = JSON.parse(e.data);
          message[socket_sent] = true;
          this.fire("global", message);
        }
      };
      msg_socket.onclose = (ev) => {
        console.log("websocket closed:", ev);
        msg_socket = null;
        if (opened) {
          looseCallback?.();
          opened = 0;
        }
      };
    }
    /**
        * Retrieves a value from the browser's local storage.
        * @param name - The key of the value to retrieve.
        * @returns The stored value as a string, or `null` if not found.
        */
    getStorage(name) {
      return localStorage.getItem(name);
    }
    /**
        * Retrieves and parses a JSON value from the browser's local storage.
        * @param name - The key of the JSON value to retrieve.
        * @returns The parsed JSON object, or `undefined` if not found or parsing fails.
        */
    getStorageJSON(name) {
      try {
        return JSON.parse(localStorage.getItem(name));
      } catch (e) {
        return void 0;
      }
    }
    /**
        * Stores a string or number value in the browser's local storage.
        * The value will be converted to a string before storage.
        * @param name - The key under which to store the value.
        * @param value - The value to store.
        */
    setStorage(name, value) {
      localStorage.setItem(name, value + "");
    }
    /**
        * Stores an object as a JSON string in the browser's local storage.
        * @param name - The key under which to store the JSON value.
        * @param value - The object to serialize and store.
        */
    setStorageJSON(name, value) {
      localStorage.setItem(name, JSON.stringify(value));
    }
  };
  __name(_Application, "Application");
  /**
     * Provides access to process-related information, such as touch capabilities.
     */
  __publicField(_Application, "process", new Process());
  var Application = _Application;

  // node_modules/x4js/src/core/core_state.ts
  function _is_proxyable(value) {
    return value !== null && typeof value === "object" && (Array.isArray(value) || isPlainObject(value));
  }
  __name(_is_proxyable, "_is_proxyable");
  function _child_path(path, prop, target) {
    if (Array.isArray(target) && /^\d+$/.test(prop)) {
      return `${path}[${prop}]`;
    }
    return path ? `${path}.${prop}` : prop;
  }
  __name(_child_path, "_child_path");
  function _path_matches(path, watched) {
    if (!path.startsWith(watched)) return false;
    if (path.length === watched.length) return true;
    const c = path[watched.length];
    return c === "." || c === "[";
  }
  __name(_path_matches, "_path_matches");
  var _StateManager = class _StateManager extends EventSource {
    constructor(initialState) {
      super();
      __publicField(this, "_state");
      __publicField(this, "_proxy");
      /**
       * raw object → proxy cache, scoped to THIS manager
       * - avoids re-creating a proxy on every get
       * - guarantees referential identity: state.user === state.user
       * - WeakMap: entries are collected with their objects, and the whole cache is collected with the manager
       * - instance-scoped (not module-level) so the same raw object referenced by two different managers never gets a proxy bound to the wrong manager/path
       */
      __publicField(this, "_cache", /* @__PURE__ */ new WeakMap());
      this._state = { ...initialState };
    }
    proxify() {
      if (!this._proxy) {
        Object.defineProperties(this._state, {
          on: { value: this.on.bind(this), enumerable: false },
          off: { value: this.off.bind(this), enumerable: false },
          once: { value: this.once.bind(this), enumerable: false },
          watch: { value: this.watch.bind(this), enumerable: false }
        });
        this._proxy = this._mk_proxy(this._state, "");
      }
      return this._proxy;
    }
    /**
     * create a lazy proxy: sub-objects and arrays are only wrapped
     * when actually accessed, and are never copied — the original
     * object remains the single source of truth.
     */
    _mk_proxy(obj, path) {
      const cached = this._cache.get(obj);
      if (cached) return cached;
      const proxy = new Proxy(obj, {
        get: /* @__PURE__ */ __name((target, prop, receiver) => {
          if (typeof prop === "symbol") {
            return Reflect.get(target, prop, receiver);
          }
          if (!(prop in target)) {
            console.error(`state error, unable to find ${_child_path(path, prop, target)}`);
            return void 0;
          }
          const value = Reflect.get(target, prop, receiver);
          if (_is_proxyable(value)) {
            return this._mk_proxy(value, _child_path(path, prop, target));
          }
          return value;
        }, "get"),
        set: /* @__PURE__ */ __name((target, prop, value, receiver) => {
          if (Reflect.get(target, prop, receiver) === value) {
            return true;
          }
          Reflect.set(target, prop, value, receiver);
          if (typeof prop === "string") {
            this.fire("change", { path: _child_path(path, prop, target), value });
          }
          return true;
        }, "set"),
        deleteProperty: /* @__PURE__ */ __name((target, prop) => {
          if (!(prop in target)) return true;
          delete target[prop];
          if (typeof prop === "string") {
            this.fire("change", { path: _child_path(path, prop, target), value: void 0 });
          }
          return true;
        }, "deleteProperty")
      });
      this._cache.set(obj, proxy);
      return proxy;
    }
    on(name, listener) {
      this.addListener(name, listener);
      return {
        off: /* @__PURE__ */ __name(() => this.removeListener(name, listener), "off")
      };
    }
    off(name, listener) {
      this.removeListener(name, listener);
    }
    once(name, listener) {
      const handle = this.on(name, (e) => {
        handle.off();
        listener(e);
      });
      return handle;
    }
    /**
     * observe changes on a specific path and everything below it.
     * fires for the path itself and for any descendant:
     *   watch( "user", cb )  →  fires on user, user.name, user.tags[0], ...
     * returns a handle with off() to unsubscribe.
     */
    watch(path, cb) {
      return this.on("change", (e) => {
        if (_path_matches(e.path, path)) {
          cb(e);
        } else if (_path_matches(path, e.path)) {
          const ee = { ...e };
          ee.value = getMemberValue(this._proxy, path);
          cb(ee);
        }
      });
    }
  };
  __name(_StateManager, "StateManager");
  var StateManager = _StateManager;
  function makeState(initialState) {
    return new StateManager(initialState).proxify();
  }
  __name(makeState, "makeState");

  // node_modules/x4js/src/core/component.ts
  var FRAGMENT = /* @__PURE__ */ Symbol("fragment");
  var RE_NUMBER = /^-?\d+(\.\d*)?$/;
  function genClassNames(x) {
    let self = Object.getPrototypeOf(x);
    if (self.constructor == Component2) {
      return ["x4-comp", "x4"];
    }
    const classes = [];
    while (self && self.constructor !== Component2) {
      const clsname = self.constructor.name;
      const clsns = Object.prototype.hasOwnProperty.call(self.constructor, x4_class_ns_sym) ? self.constructor[x4_class_ns_sym] : "";
      classes.push(clsns + clsname.toLowerCase());
      self = Object.getPrototypeOf(self);
    }
    classes.push("x4");
    return classes;
  }
  __name(genClassNames, "genClassNames");
  var gen_id = 1e3;
  var makeUniqueComponentId = /* @__PURE__ */ __name(() => {
    return `x4-${gen_id++}`;
  }, "makeUniqueComponentId");
  var _Component_decorators, _store, _pstate, _init, _a;
  _Component_decorators = [class_ns("x4")];
  var _Component = class _Component extends (_a = CoreElement) {
    constructor(props) {
      super();
      /** The underlying DOM element of the component. */
      __publicField(this, "dom");
      /** The properties passed to the component's constructor. */
      __publicField(this, "props");
      __publicField(this, "clsprefix");
      // internal class name prefix (x4 internal)
      __privateAdd(this, _store);
      __privateAdd(this, _pstate);
      this.props = props;
      if (props.existingDOM) {
        this.dom = props.existingDOM;
      } else {
        if (props.ns) {
          this.dom = document.createElementNS(props.ns, props.tag ?? "div");
        } else {
          this.dom = document.createElement(props.tag ?? "div");
        }
        if (props.attrs) {
          this.setAttributes(props.attrs);
        }
        if (props.cls) {
          this.addClass(props.cls);
        }
        if (props.hidden) {
          this.show(false);
        }
        if (props.flex) {
          this.addClass("x4flex");
          if (props.flex !== true && props.flex !== 1) {
            this.setStyle({
              "flexGrow": props.flex + ""
            });
          }
        }
        if (props.stretch) {
          this.addClass("x4stretch");
        }
        if (props.id !== void 0) {
          this.setAttribute("id", props.id);
        }
        if (props.width !== void 0) {
          this.setStyleValue("width", props.width);
        }
        if (props.height !== void 0) {
          this.setStyleValue("height", props.height);
        }
        if (props.tooltip) {
          this.setAttribute("tooltip", props.tooltip);
        }
        if (props.style) {
          this.setStyle(props.style);
        }
        if (props.content) {
          this.setContent(props.content);
        }
        if (props.dom_events) {
          this.setDOMEvents(props.dom_events);
        }
        const classes = genClassNames(this);
        this.dom.classList.add(...classes);
        if (props.disabled) {
          this.addDOMEvent("created", () => {
            this.enable(false);
          });
        }
      }
      this.dom[COMPONENT] = this;
    }
    /**
        * Attaches a listener for global messages dispatched by the application.
        * The listener is automatically removed when the component's DOM element is removed.
        * @param cb - The callback function to execute when a global message is received.
        */
    onGlobalEvent(cb) {
      const off = Application.instance().on("global", (ev) => {
        cb(ev);
      });
      this.addDOMEvent("removed", () => off.off());
    }
    // :: CLASSES ::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::
    /**
        * Checks if the component's DOM element has a specific CSS class.
        * @param cls - The CSS class name to check.
        * @returns `true` if the class is present, `false` otherwise.
        */
    hasClass(cls) {
      return this.dom.classList.contains(cls);
    }
    /**
        * Adds one or more CSS classes to the component's DOM element.
        * Multiple classes can be provided as a space-separated string.
        * @param cls - The CSS class(es) to add.
        */
    addClass(cls) {
      if (!cls) return;
      cls = cls.trim();
      if (cls.includes(" ")) {
        const ccs = cls.split(" ");
        this.dom.classList.add(...ccs.filter((x) => x));
      } else {
        this.dom.classList.add(cls);
      }
    }
    /**
        * Removes one or more CSS classes from the component's DOM element.
        * If `*` is passed as the class name, all classes will be removed.
        * Multiple classes can be provided as a space-separated string.
        * @param cls - The CSS class(es) to remove, or `*` to clear all.
        */
    removeClass(cls) {
      if (!cls) return;
      if (cls == "*") {
        this.dom.classList.value = "";
        return;
      }
      if (cls.indexOf(" ") >= 0) {
        const ccs = cls.split(" ");
        this.dom.classList.remove(...ccs);
      } else {
        this.dom.classList.remove(cls);
      }
    }
    /**
        * Removes all CSS classes from the component's DOM element that match a given regular expression.
        * @param re - The regular expression to match against class names.
        */
    removeClassEx(re) {
      const all = Array.from(this.dom.classList);
      all.forEach((x) => {
        if (x.match(re)) {
          this.dom.classList.remove(x);
        }
      });
    }
    /**
        * Toggles the presence of one or more CSS classes on the component's DOM element.
        * If a class is present, it's removed; otherwise, it's added.
        * Multiple classes can be provided as a space-separated string.
        * @param cls - The CSS class(es) to toggle.
        */
    toggleClass(cls) {
      if (!cls) return;
      const toggle = /* @__PURE__ */ __name((x) => {
        this.dom.classList.toggle(x);
      }, "toggle");
      if (cls.indexOf(" ") >= 0) {
        const ccs = cls.split(" ");
        ccs.forEach(toggle);
      } else {
        toggle(cls);
      }
    }
    /**
        * Sets or removes a CSS class based on a boolean condition.
        * @param cls - The CSS class to manage.
        * @param set - If `true`, the class is added; if `false`, it's removed. Defaults to `true`.
        * @returns The component instance for chaining.
        */
    setClass(cls, set = true) {
      if (set) this.addClass(cls);
      else this.removeClass(cls);
      return this;
    }
    // :: ATTRIBUTES ::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::
    /**
        * Sets multiple HTML attributes on the component's DOM element.
        * @param attrs - An object where keys are attribute names and values are their corresponding values.
        * @returns The component instance for chaining.
        */
    setAttributes(attrs) {
      for (const name in attrs) {
        this.setAttribute(name, attrs[name]);
      }
      return this;
    }
    /**
        * Sets a single HTML attribute on the component's DOM element.
        * If `value` is `null`, `undefined`, or `false`, the attribute will be removed.
        * @param name - The name of the attribute.
        * @param value - The value of the attribute.
        */
    setAttribute(name, value) {
      if (value === null || value === void 0 || value === false) {
        this.dom.removeAttribute(name);
      } else {
        this.dom.setAttribute(name, "" + value);
      }
    }
    /**
        * Retrieves the value of an HTML attribute from the component's DOM element.
        * @param name - The name of the attribute.
        * @returns The string value of the attribute, or `null` if not present.
        */
    getAttribute(name) {
      return this.dom.getAttribute(name);
    }
    /**
        * Retrieves the value of a `data-*` attribute from the component's DOM element.
        * @param name - The suffix of the `data-` attribute (e.g., for `data-foo`, use `"foo"`).
        * @returns The string value of the `data-*` attribute, or `null` if not present.
     * 
     * @see Component.setIntData
     * @see Component.getIntData
     * @see Component.setInternalData
     * @see Component.getInternalData
     */
    getData(name) {
      return this.getAttribute("data-" + name);
    }
    /**
        * Retrieves the integer value of a `data-*` attribute from the component's DOM element.
        * Returns `undefined` if the attribute is not present or cannot be parsed as a number.
        * @param name - The suffix of the `data-` attribute.
        * @returns The integer value of the `data-*` attribute, or `undefined`.
        */
    getIntData(name) {
      const v = parseInt(this.getAttribute("data-" + name));
      if (Number.isFinite(v)) {
        return v;
      }
      return void 0;
    }
    /**
        * Sets the value of a `data-*` attribute on the component's DOM element.
        * @param name - The suffix of the `data-` attribute.
        * @param value - The string value to set.
        */
    setData(name, value) {
      return this.setAttribute("data-" + name, value);
    }
    /**
     * idem as setData but onot on dom, you can store anything 
     */
    setInternalData(name, value) {
      if (!__privateGet(this, _store)) {
        __privateSet(this, _store, /* @__PURE__ */ new Map());
      }
      __privateGet(this, _store).set(name, value);
      return this;
    }
    getInternalData(name) {
      return __privateGet(this, _store)?.get(name);
    }
    // :: DOM EVENTS ::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::
    /**
        * Adds a DOM event listener to the component's DOM element.
        * @param name - The name of the DOM event (e.g., `'click'`, `'mouseover'`).
        * @param listener - The event handler function.
        * @param prepend - If `true`, the listener is added to the beginning of the event listener list. Defaults to `false`.
        */
    addDOMEvent(name, listener, prepend = false) {
      addEvent(this.dom, name, listener, prepend);
    }
    /**
        * Sets multiple DOM event listeners on the component's DOM element.
        * @param events - An object where keys are event names and values are their corresponding handler functions.
        */
    setDOMEvents(events) {
      for (const name in events) {
        this.addDOMEvent(name, events[name]);
      }
    }
    // :: HILEVEL EVENTS ::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::
    /**
     * tool to move named events to internal event map
     * @internal
     */
    mapPropEvents(props, ...elements) {
      const p = props;
      elements.forEach((n) => {
        if (Object.prototype.hasOwnProperty.call(p, n) && p[n]) {
          this.on(n, p[n]);
        }
      });
    }
    // :: CONTENT ::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::
    /**
        * Removes all child nodes from the component's DOM element.
        */
    clearContent() {
      const d = this.dom;
      while (d.firstChild) {
        d.removeChild(d.firstChild);
      }
    }
    /**
        * Replaces the entire content of the component's DOM element with new content.
        * Any existing content will be cleared before the new content is added.
        * @param content - The new content to set. Can be a single item or an array of items.
        */
    setContent(content) {
      this.clearContent();
      this.appendContent(content);
    }
    /**
        * Appends content to the end of the component's DOM element.
        * Content can be a single Component, an array of Components, a string, an array of strings,
        * raw HTML, an array of raw HTML, a number, or a boolean.
     * @remarks
     * for simplicity, null is also allowed:
     * setContent( [
     * 	optional ? myControl : null,
     * ])
        * @param content - The content to append.
        */
    appendContent(content) {
      const set = /* @__PURE__ */ __name((d, c) => {
        if (c instanceof _Component) {
          d.appendChild(c.dom);
        } else if (c instanceof UnsafeHtml) {
          d.insertAdjacentHTML("beforeend", c.toString());
        } else if (typeof c === "string" || typeof c === "number") {
          const tnode = document.createTextNode(c.toString());
          d.appendChild(tnode);
        } else if (c) {
          console.warn("Unknown type to append: ", c);
        }
      }, "set");
      if (!isArray(content)) {
        set(this.dom, content);
      } else if (content.length <= 8) {
        for (const c of content) {
          set(this.dom, c);
        }
      } else {
        const fragment = document.createDocumentFragment();
        fragment.insertAdjacentHTML = (position, html) => {
          const temp = document.createElement("div");
          temp.innerHTML = html;
          const nodes = Array.from(temp.childNodes);
          fragment.append(...nodes);
        };
        for (const child of content) {
          set(fragment, child);
        }
        this.dom.appendChild(fragment);
      }
    }
    /**
        * Prepends content to the beginning of the component's DOM element.
        * Content can be a single Component, an array of Components, a string, an array of strings,
        * raw HTML, an array of raw HTML, a number, or a boolean.
        * @param content - The content to prepend.
        */
    prependContent(content) {
      const d = this.dom;
      const set = /* @__PURE__ */ __name((c) => {
        if (c instanceof _Component) {
          d.insertAdjacentElement("afterbegin", c.dom);
        } else if (c instanceof UnsafeHtml) {
          d.insertAdjacentHTML("afterbegin", c.toString());
        } else if (typeof c === "string" || typeof c === "number") {
          d.insertAdjacentText("afterbegin", c.toString());
        } else {
          console.warn("Unknown type to append: ", c);
        }
      }, "set");
      if (!isArray(content)) {
        set(content);
      } else {
        const fragment = document.createDocumentFragment();
        for (const child of content) {
          set(child);
        }
        d.insertBefore(fragment, d.firstChild);
      }
    }
    /**
        * Removes a specific child component from this component's DOM element.
        * @param child - The child component instance to remove.
     * @see clearContent
        */
    removeChild(child) {
      this.dom.removeChild(child.dom);
    }
    /**
        * Queries all descendant DOM elements matching a CSS selector and wraps them as Component instances.
        * @param selector - The CSS selector string.
        * @returns An array of Component instances.
        */
    queryAll(selector) {
      const all = this.dom.querySelectorAll(selector);
      const rc = new Array(all.length);
      all.forEach((x, i) => rc[i] = wrapDOM(x));
      return rc;
    }
    /**
        * Queries the first descendant DOM element matching a CSS selector and wraps it as a Component instance.
        * @param selector - The CSS selector string.
        * @returns The first matching Component instance, or `null` if no match is found.
        */
    query(selector) {
      const r = this.dom.querySelector(selector);
      return componentFromDOM(r);
    }
    // :: STYLES ::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::
    /**
        * Sets an ARIA attribute on the component's DOM element.
        * @param name - The name of the ARIA attribute (e.g., `'aria-label'`).
        * @param value - The value of the ARIA attribute.
        * @returns The component instance for chaining.
        */
    setAria(name, value) {
      this.setAttribute(name, value);
      return this;
    }
    /**
        * Sets multiple inline CSS styles on the component's DOM element.
        * Numeric values for properties like `width` or `height` will automatically append `"px"` unless they are unitless.
        * @param style - An object where keys are CSS property names and values are their corresponding styles.
        * @returns The component instance for chaining.
        */
    setStyle(style) {
      const _style = this.dom.style;
      for (const name in style) {
        let value = style[name];
        if (!unitless[name] && (isNumber(value) || RE_NUMBER.test(value))) {
          value += "px";
        }
        _style[name] = value;
      }
      return this;
    }
    /**
        * Sets a single inline CSS style property on the component's DOM element.
        * Numeric values for properties like `width` or `height` will automatically append `"px"` unless they are unitless.
        * @param name - The name of the CSS property.
        * @param value - The value of the CSS property.
        * @returns The component instance for chaining.
        */
    setStyleValue(name, value) {
      const _style = this.dom.style;
      if (isNumber(value)) {
        let v = value + "";
        if (!unitless[name]) {
          v += "px";
        }
        _style[name] = v;
      } else {
        _style[name] = value;
      }
      return this;
    }
    /**
        * Retrieves the computed inline CSS style value for a specific property.
        * This only returns styles explicitly set via `setStyle` or `setStyleValue`, not inherited or stylesheet-defined styles.
        * @param name - The name of the CSS property.
        * @returns The value of the inline CSS property.
        */
    getStyleValue(name) {
      const _style = this.dom.style;
      return _style[name];
    }
    /**
        * Sets the width of the component.
        * @param w - The width value. Can be a number (interpreted as pixels) or a string (e.g., `"100px"`, `"50%"`).
        */
    setWidth(w) {
      this.setStyleValue("width", isNumber(w) ? w + "px" : w);
    }
    /**
        * Sets the height of the component.
        * @param h - The height value. Can be a number (interpreted as pixels) or a string (e.g., `"100px"`, `"50%"`).
        */
    setHeight(h) {
      this.setStyleValue("height", isNumber(h) ? h + "px" : h);
    }
    /**
        * Sets a CSS custom property (CSS variable) on the component's DOM element.
        * @param name - The name of the CSS variable (e.g., `'--my-color'`).
        * @param value - The value to set for the CSS variable.
        */
    setStyleVariable(name, value) {
      this.dom.style.setProperty(name, value);
    }
    /**
        * Retrieves the value of a CSS custom property (CSS variable) for the component.
        * The computed style of the element is used.
        * @param name - The name of the CSS variable.
        * @returns The string value of the CSS variable.
        */
    getStyleVariable(name) {
      const style = this.getComputedStyle();
      return style.getPropertyValue(name);
    }
    /**
        * Retrieves the computed style for the component's DOM element.
        * @returns A `CSSStyleDeclaration` object representing the computed styles.
        */
    getComputedStyle() {
      return getComputedStyle(this.dom);
    }
    /**
        * Sets pointer capture on the component's DOM element for a specific pointer.
        * @param pointerId - The unique ID of the pointer.
     * 
     * @example
     * control.on("pointerdown", (ev) => {
     * 	ev.preventDefault(); // Prevent default browser actions
     * 	control.setCapture(ev.pointerId);
     * }
        */
    setCapture(pointerId) {
      this.dom.setPointerCapture(pointerId);
    }
    /**
        * Releases pointer capture on the component's DOM element for a specific pointer.
        * @param pointerId - The unique ID of the pointer.
        */
    releaseCapture(pointerId) {
      this.dom.releasePointerCapture(pointerId);
    }
    /**
        * Returns the size and position of the component's DOM element relative to the viewport.
        * @returns A `Rect` object containing the bounding rectangle.
        */
    getBoundingRect() {
      const rc = this.dom.getBoundingClientRect();
      return new Rect(rc.x, rc.y, rc.width, rc.height);
    }
    // :: MISC ::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::
    /**
        * Gives focus to the component's DOM element.
        * @returns The component instance for chaining.
        */
    focus() {
      this.dom.focus();
      return this;
    }
    /**
        * Checks if the component's DOM element currently has focus.
        * @returns `true` if the component is focused, `false` otherwise.
        */
    hasFocus() {
      return document.activeElement == this.dom;
    }
    /**
        * Scrolls the component's DOM element into the visible area of the browser window.
        * @param arg - Optional. A boolean (`true` for smooth scroll) or an object specifying scroll options.
        */
    scrollIntoView(arg) {
      this.dom.scrollIntoView(arg);
    }
    /**
        * Checks if the component's DOM element is currently visible (i.e., not hidden by `display: none`).
        * @returns `true` if the component is visible, `false` otherwise.
     */
    isVisible() {
      return this.dom.isConnected && this.dom.checkVisibility({ checkVisibilityCSS: true });
    }
    /**
        * Shows or hides the component.
        * It toggles the `x4hidden` CSS class.
        * @param vis - If `true`, the component is shown; if `false`, it's hidden. Defaults to `true`.
        * @returns The component instance for chaining.
        */
    show(vis = true) {
      this.setClass("x4hidden", !vis);
      return this;
    }
    /**
        * Hides the component by applying the `x4hidden` CSS class.
        * @returns The component instance for chaining.
        */
    hide() {
      this.show(false);
      return this;
    }
    /**
        * Enables or disables the component.
        * This sets the `disabled` attribute and also propagates the disabled state to child input elements.
        * @param ena - If `true`, the component is enabled; if `false`, it's disabled. Defaults to `true`.
        * @returns The component instance for chaining.
        */
    enable(ena = true) {
      this.setAttribute("disabled", !ena ? "true" : null);
      this.setAttribute("inert", !ena ? "true" : null);
      return this;
    }
    /**
        * Disables the component.
        * @returns The component instance for chaining.
        */
    disable() {
      this.enable(false);
      return this;
    }
    /**
        * Checks if the component is marked as disabled.
        * This checks for the presence of the `disabled` attribute.
        * @returns The string value of the `disabled` attribute, or `null` if not present.
        */
    isDisabled() {
      return this.getAttribute("disabled");
    }
    /**
        * Returns the next sibling element as a Component instance.
        * @returns The next sibling component, or `null` if none exists.
        */
    nextElement() {
      const nxt = this.dom.nextElementSibling;
      return componentFromDOM(nxt);
    }
    /**
        * Returns the previous sibling element as a Component instance.
        * @returns The previous sibling component, or `null` if none exists.
     */
    prevElement() {
      const nxt = this.dom.previousElementSibling;
      return componentFromDOM(nxt);
    }
    /**
        * Searches up the DOM tree for a parent element that is a Component and optionally matches a specific constructor.
        * @param cls - Optional. The constructor of the Component type to match.
        * @returns The matching parent Component instance, or `null` if not found.
        */
    parentElement(cls) {
      return _Component.parentElement(this.dom, cls);
    }
    /**
     * 
     */
    childCount() {
      return this.dom.childElementCount;
    }
    /**
     * Static method to search up the DOM tree for a parent element that is a Component and optionally matches a specific constructor.
        * @param dom - The starting DOM node from which to search upwards.
        * @param cls - Optional. The constructor of the Component type to match.
        * @returns The matching parent Component instance, or `null` if not found.
     */
    static parentElement(dom, cls) {
      while (dom.parentElement) {
        const cp = componentFromDOM(dom.parentElement);
        if (!cls) {
          return cp;
        }
        if (cp && cp instanceof cls) {
          return cp;
        }
        dom = dom.parentElement;
      }
      return null;
    }
    /**
        * Returns the first child element as a Component instance.
        * @returns The first child component, or `null` if none exists.
     */
    firstChild() {
      const nxt = this.dom.firstElementChild;
      return componentFromDOM(nxt);
    }
    /**
        * Returns the last child element as a Component instance.
        * @returns The last child component, or `null` if none exists.
     */
    lastChild() {
      const nxt = this.dom.lastElementChild;
      return componentFromDOM(nxt);
    }
    /**
        * Enumerates all child components of this component.
        * @param recursive - If `true`, searches all descendants; otherwise, only direct children.
        * @returns An array of child Component instances.
     */
    enumChildComponents(recursive) {
      const children = [];
      const nodes = this.enumChildNodes(recursive);
      nodes.forEach((c) => {
        const cc = componentFromDOM(c);
        if (cc) {
          children.push(cc);
        }
      });
      return children;
    }
    /**
        * Enumerates all child DOM nodes of this component.
        * Not all nodes may be components.
        * @param recursive - If `true`, searches all descendant nodes; otherwise, only direct children.
        * @returns An array of child DOM nodes.
        */
    enumChildNodes(recursive) {
      const children = Array.from(recursive ? this.dom.querySelectorAll("*") : this.dom.children);
      return children;
    }
    /**
        * Visits all descendant components of this component, executing a callback function for each.
        * The traversal stops if the callback returns `true`.
        * @param cb - The callback function to execute for each component.
        */
    visitChildren(cb) {
      const visit = /* @__PURE__ */ __name((p) => {
        for (let d = p.firstElementChild; d; d = d.nextElementSibling) {
          const comp = componentFromDOM(d);
          if (comp) {
            if (cb(comp)) {
              return true;
            }
          }
          if (d.firstElementChild && d.tagName != "svg" && d.tagName != "SVG") {
            if (visit(d)) {
              return true;
            }
          }
        }
      }, "visit");
      visit(this.dom);
    }
    /**
        * Animates the component's DOM element using the Web Animations API.
        * @param keyframes - An array of keyframe objects or a `Keyframe` object.
        * @param duration - The duration of the animation in milliseconds, or a `KeyframeAnimationOptions` object.
        */
    animate(keyframes, duration) {
      this.dom.animate(keyframes, duration);
    }
    // :: TSX/REACT ::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::
    /**
        * Creates a new Component or an array of Components from JSX elements.
        * This method is typically called by the TypeScript/JavaScript compiler when JSX is transpiled.
        * @param clsOrTag - The class constructor of the component, an HTML tag name string, a symbol for fragments, or a callback.
        * @param attrs - An object containing attributes and properties for the component.
        * @param children - Any child components or content passed within the JSX.
        * @returns A Component instance or an array of Components.
        */
    static createElement(clsOrTag, attrs, ...children) {
      let comp;
      if (clsOrTag == this.createFragment || clsOrTag === FRAGMENT) {
        return children;
      }
      if (clsOrTag instanceof Function) {
        attrs = attrs ?? {};
        if (!attrs.children && children && children.length) {
          attrs.content = children;
        }
        comp = new clsOrTag(attrs ?? {});
      } else {
        comp = new _Component({
          tag: clsOrTag,
          content: children,
          ...attrs
        });
      }
      if (children && children.length) {
      }
      return comp;
    }
    /**
        * Creates a fragment, which is an array of components without a parent DOM element.
        * Used for grouping multiple children in JSX without introducing an extra DOM node.
        * @returns An array of components.
        */
    static createFragment() {
      return this.createElement(FRAGMENT, null);
    }
    // :: SPECIALS ::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::
    /**
        * Queries for a specific system or application-defined interface on the component.
        * Common system interfaces include "form-element" and "tab-handler".
        * @param name - The name of the interface to query.
        * @returns An object conforming to the requested interface, or `null` if not supported.
     * 
     * 	system interfaces:
     * 		"form-element"
     * 		"tab-handler"
     */
    queryInterface(name) {
      return null;
    }
    // :: PERSISTENCE ::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::
    loadPState(name, defaults) {
      if (!__privateGet(this, _pstate)) {
        __privateSet(this, _pstate, {});
      }
      if (__privateGet(this, _pstate)[name]) {
        return __privateGet(this, _pstate)[name];
      }
      const key = `x4@persist:${name}`;
      let raw;
      try {
        const stored = Application.instance().getStorage(key);
        raw = stored ? { ...defaults, ...JSON.parse(stored) } : { ...defaults };
      } catch {
        raw = { ...defaults };
      }
      const state = makeState(raw);
      state.on("change", () => {
        this.setTimeout(key, 500, () => {
          Application.instance().setStorage(key, JSON.stringify(raw));
        });
      });
      __privateGet(this, _pstate)[name] = state;
      return state;
    }
  };
  _init = __decoratorStart(_a);
  _store = new WeakMap();
  _pstate = new WeakMap();
  _Component = __decorateElement(_init, 0, "Component", _Component_decorators, _Component);
  __name(_Component, "Component");
  __runInitializers(_init, 1, _Component);
  var Component2 = _Component;
  function componentFromDOM(node) {
    return node ? node[COMPONENT] : null;
  }
  __name(componentFromDOM, "componentFromDOM");
  function wrapDOM(el) {
    const com = componentFromDOM(el);
    if (com) {
      return com;
    }
    return new Component2({ existingDOM: el });
  }
  __name(wrapDOM, "wrapDOM");
  var _Flex_decorators, _init2, _a2;
  _Flex_decorators = [class_ns("x4")];
  var _Flex = class _Flex extends (_a2 = Component2) {
    constructor() {
      super({});
    }
  };
  _init2 = __decoratorStart(_a2);
  _Flex = __decorateElement(_init2, 0, "Flex", _Flex_decorators, _Flex);
  __name(_Flex, "Flex");
  __runInitializers(_init2, 1, _Flex);
  var Flex = _Flex;
  var _Space_decorators, _init3, _a3;
  _Space_decorators = [class_ns("x4")];
  var _Space = class _Space extends (_a3 = Component2) {
    constructor(width, cls) {
      super({ width, cls });
    }
  };
  _init3 = __decoratorStart(_a3);
  _Space = __decorateElement(_init3, 0, "Space", _Space_decorators, _Space);
  __name(_Space, "Space");
  __runInitializers(_init3, 1, _Space);
  var Space = _Space;

  // node_modules/x4js/src/core/core_colors.ts
  function hx(v) {
    const hex = v.toString(16);
    return hex.padStart(2, "0");
  }
  __name(hx, "hx");
  function round(v) {
    return Math.round(v);
  }
  __name(round, "round");
  var _Color = class _Color {
    constructor(...args) {
      __publicField(this, "rgb", [0, 0, 0, 1]);
      __publicField(this, "invalid", false);
      if (isString(args[0])) {
        this.setValue(args[0]);
      } else {
        this.setRgb(args[0], args[1], args[2], args[3]);
      }
    }
    /**
     * accepts:
     * 	#aaa
     *  #ababab
     *  #ababab55
     *  rgb(a,b,c)
     *  rgba(a,b,c,d)
     *  var( --color-5 )
     *  cyan
     *  transparent
     */
    setValue(value) {
      this.invalid = false;
      if (value.startsWith("#")) {
        if (value.length == 7 && /#[0-9a-fA-F]{6}/.test(value)) {
          const hex = parseInt(value.slice(1), 16);
          return this.setRgb(hex >> 16 & 255, hex >> 8 & 255, hex & 255, 1);
        }
        if (value.length == 4 && /#[0-9a-fA-F]{3}/.test(value)) {
          const hex = parseInt(value.slice(1), 16);
          return this.setRgb((hex >> 8 & 15) * 17, (hex >> 4 & 15) * 17, (hex & 15) * 17, 1);
        }
        if (value.length == 9 && /#[0-9a-fA-F]{8}/.test(value)) {
          const hex = parseInt(value.slice(1), 16) >>> 0;
          return this.setRgb(hex >> 24 & 255, hex >> 16 & 255, hex >> 8 & 255, (hex & 255) / 255);
        }
      } else {
        value = value.toLowerCase();
        if (value.startsWith("rgba")) {
          const re = /rgba\s*\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)\s*,\s*((\d+)|(\d*\.\d+)|(\.\d+))\s*\)/;
          const m = re.exec(value);
          if (m) {
            return this.setRgb(+m[1], +m[2], +m[3], +m[4]);
          }
        } else if (value.startsWith("rgb")) {
          const re = /rgb\s*\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)\s*\)/;
          const m = re.exec(value);
          if (m) {
            return this.setRgb(+m[1], +m[2], +m[3], 1);
          }
        } else if (value.startsWith("var")) {
          const re = /var\s*\(([^)]*)\)/;
          const m = re.exec(value);
          if (m) {
            const expr = m[1].trim();
            const style = getComputedStyle(document.documentElement);
            const value2 = style.getPropertyValue(expr);
            return this.setValue(value2);
          }
        } else {
          const xx = CSS_COLORS[value];
          if (xx !== void 0) {
            return this.setRgb(xx >> 16 & 255, xx >> 8 & 255, xx & 255, 1);
          } else if (value == "transparent") {
            return this.setRgb(0, 0, 0, 0);
          }
        }
      }
      this.invalid = true;
      return this.setRgb(255, 0, 0, 1);
    }
    /**
     * Sets the color using HSV (Hue, Saturation, Value) components.
     * 
     * @param h - Hue (0-1).
     * @param s - Saturation (0-1).
     * @param v - Value (0-1).
     * @param a - Alpha (0-1, default 1.0).
     * @returns The current Color instance.
     */
    setHsv(h, s, v, a = 1) {
      let i = Math.min(5, Math.floor(h * 6)), f = h * 6 - i, p = v * (1 - s), q = v * (1 - f * s), t = v * (1 - (1 - f) * s);
      let R, G, B;
      switch (i) {
        case 0:
          R = v;
          G = t;
          B = p;
          break;
        case 1:
          R = q;
          G = v;
          B = p;
          break;
        case 2:
          R = p;
          G = v;
          B = t;
          break;
        case 3:
          R = p;
          G = q;
          B = v;
          break;
        case 4:
          R = t;
          G = p;
          B = v;
          break;
        case 5:
          R = v;
          G = p;
          B = q;
          break;
      }
      return this.setRgb(R * 255, G * 255, B * 255, a);
    }
    /**
     * Sets the color using RGB (Red, Green, Blue) components.
     * 
     * @param r - Red component (0-255).
     * @param g - Green component (0-255).
     * @param b - Blue component (0-255).
     * @param a - Alpha component (0-1).
     * @returns The current Color instance.
     */
    setRgb(r, g, b, a) {
      this.rgb = [clamp(r | 0, 0, 255), clamp(g | 0, 0, 255), clamp(b | 0, 0, 255), clamp(a, 0, 1)];
      return this;
    }
    /**
     * Returns the CSS string representation of the color.
     * 
     * @param withAlpha - Whether to include the alpha channel (default: true if alpha < 1).
     * @returns The CSS color string (e.g. "rgb(255,0,0)" or "rgba(255,0,0,0.5)").
     */
    toRgbString(withAlpha) {
      const _ = this.rgb;
      return withAlpha === false || _[3] == 1 ? `rgb(${round(_[0])},${round(_[1])},${round(_[2])})` : `rgba(${round(_[0])},${round(_[1])},${round(_[2])},${_[3].toFixed(3)})`;
    }
    /**
     * Returns the Hex string representation of the color.
     * 
     * @returns The hex color string (e.g. "#ff0000" or "#ff000080").
     */
    toHexString() {
      const _ = this.rgb;
      return _[3] == 1 ? `#${hx(_[0])}${hx(_[1])}${hx(_[2])}` : `#${hx(_[0])}${hx(_[1])}${hx(_[2])}${hx(_[3] * 255 | 0)}`;
    }
    /**
     * Returns the color as an RGB object.
     * 
     * @returns An object containing red, green, blue, and alpha properties.
     */
    toRgb() {
      const _ = this.rgb;
      return { red: _[0], green: _[1], blue: _[2], alpha: _[3] };
    }
    /**
     * Converts the color to HSV representation.
     * 
     * @returns An object containing hue, saturation, value, and alpha properties.
     */
    toHsv() {
      let el = this.toRgb();
      el.red /= 255;
      el.green /= 255;
      el.blue /= 255;
      const max = Math.max(el.red, el.green, el.blue);
      const min = Math.min(el.red, el.green, el.blue);
      const delta = max - min;
      const saturation = max === 0 ? 0 : delta / max;
      const value = max;
      let hue;
      if (delta === 0) {
        hue = 0;
      } else {
        switch (max) {
          case el.red:
            hue = (el.green - el.blue) / delta / 6 + (el.green < el.blue ? 1 : 0);
            break;
          case el.green:
            hue = (el.blue - el.red) / delta / 6 + 1 / 3;
            break;
          case el.blue:
            hue = (el.red - el.green) / delta / 6 + 2 / 3;
            break;
        }
      }
      return { hue, saturation, value, alpha: el.alpha };
    }
    /**
     * return the number value of the color (no transparency)
     */
    toNumber() {
      const _ = this.rgb;
      return (_[0] << 16 | _[1] << 8 | _[2]) >>> 0;
    }
    /**
     * Gets the alpha (transparency) value of the color.
     * 
     * @returns The alpha value (0-1).
     */
    getAlpha() {
      return this.rgb[3];
    }
    /**
     * Sets the alpha (transparency) value of the color.
     * 
     * @param a - The new alpha value (0-1).
     * @returns The current Color instance.
     */
    setAlpha(a) {
      this.rgb[3] = clamp(a, 0, 1);
      return this;
    }
    /**
     * Checks if the color is invalid (e.g. failed parsing).
     * 
     * @returns True if the color is invalid, false otherwise.
     */
    isInvalid() {
      return this.invalid;
    }
    /**
     * Lightens the color by a given percentage.
     * 
     * @param percent - The percentage to lighten (0-100).
     * @returns The current Color instance.
     */
    lighten(percent) {
      if (percent < 0) {
        percent = 0;
      } else if (percent > 100) {
        percent = 100;
      }
      const factor = percent / 100;
      const adj = /* @__PURE__ */ __name((value) => {
        value = value + (255 - value) * factor | 0;
        if (value > 255) {
          value = 255;
        }
        return value;
      }, "adj");
      const _ = this.rgb;
      this.rgb = [adj(_[0]), adj(_[1]), adj(_[2]), _[3]];
      return this;
    }
  };
  __name(_Color, "Color");
  var Color = _Color;
  var CSS_COLORS = {
    aliceblue: 15792383,
    antiquewhite: 16444375,
    aqua: 65535,
    aquamarine: 8388564,
    azure: 15794175,
    beige: 16119260,
    bisque: 16770244,
    black: 0,
    blanchedalmond: 16772045,
    blue: 255,
    blueviolet: 9055202,
    brown: 10824234,
    burlywood: 14596231,
    cadetblue: 6266528,
    chartreuse: 8388352,
    chocolate: 13789470,
    coral: 16744272,
    cornflowerblue: 6591981,
    cornsilk: 16775388,
    crimson: 14423100,
    cyan: 65535,
    darkblue: 139,
    darkcyan: 35723,
    darkgoldenrod: 12092939,
    darkgray: 11119017,
    darkgreen: 25600,
    darkgrey: 11119017,
    darkkhaki: 12433259,
    darkmagenta: 9109643,
    darkolivegreen: 5597999,
    darkorange: 16747520,
    darkorchid: 10040012,
    darkred: 9109504,
    darksalmon: 15308410,
    darkseagreen: 9419919,
    darkslateblue: 4734347,
    darkslategray: 3100495,
    darkslategrey: 3100495,
    darkturquoise: 52945,
    darkviolet: 9699539,
    deeppink: 16716947,
    deepskyblue: 49151,
    dimgray: 6908265,
    dimgrey: 6908265,
    dodgerblue: 2003199,
    firebrick: 11674146,
    floralwhite: 16775920,
    forestgreen: 2263842,
    fuchsia: 16711935,
    gainsboro: 14474460,
    ghostwhite: 16316671,
    gold: 16766720,
    goldenrod: 14329120,
    gray: 8421504,
    green: 32768,
    greenyellow: 11403055,
    grey: 8421504,
    honeydew: 15794160,
    hotpink: 16738740,
    indianred: 13458524,
    indigo: 4915330,
    ivory: 16777200,
    khaki: 15787660,
    lavender: 15132410,
    lavenderblush: 16773365,
    lawngreen: 8190976,
    lemonchiffon: 16775885,
    lightblue: 11393254,
    lightcoral: 15761536,
    lightcyan: 14745599,
    lightgoldenrodyellow: 16448210,
    lightgray: 13882323,
    lightgreen: 9498256,
    lightgrey: 13882323,
    lightpink: 16758465,
    lightsalmon: 16752762,
    lightseagreen: 2142890,
    lightskyblue: 8900346,
    lightslategray: 7833753,
    lightslategrey: 7833753,
    lightsteelblue: 11584734,
    lightyellow: 16777184,
    lime: 65280,
    limegreen: 3329330,
    linen: 16445670,
    magenta: 16711935,
    maroon: 8388608,
    mediumaquamarine: 6737322,
    mediumblue: 205,
    mediumorchid: 12211667,
    mediumpurple: 9662683,
    mediumseagreen: 3978097,
    mediumslateblue: 8087790,
    mediumspringgreen: 64154,
    mediumturquoise: 4772300,
    mediumvioletred: 13047173,
    midnightblue: 1644912,
    mintcream: 16121850,
    mistyrose: 16770273,
    moccasin: 16770229,
    navajowhite: 16768685,
    navy: 128,
    oldlace: 16643558,
    olive: 8421376,
    olivedrab: 7048739,
    orange: 16753920,
    orangered: 16729344,
    orchid: 14315734,
    palegoldenrod: 15657130,
    palegreen: 10025880,
    paleturquoise: 11529966,
    palevioletred: 14381203,
    papayawhip: 16773077,
    peachpuff: 16767673,
    peru: 13468991,
    pink: 16761035,
    plum: 14524637,
    powderblue: 11591910,
    purple: 8388736,
    rebeccapurple: 6697881,
    red: 16711680,
    rosybrown: 12357519,
    royalblue: 4286945,
    saddlebrown: 9127187,
    salmon: 16416882,
    sandybrown: 16032864,
    seagreen: 3050327,
    seashell: 16774638,
    sienna: 10506797,
    silver: 12632256,
    skyblue: 8900331,
    slateblue: 6970061,
    slategray: 7372944,
    slategrey: 7372944,
    snow: 16775930,
    springgreen: 65407,
    steelblue: 4620980,
    tan: 13808780,
    teal: 32896,
    thistle: 14204888,
    tomato: 16737095,
    turquoise: 4251856,
    violet: 15631086,
    wheat: 16113331,
    white: 16777215,
    whitesmoke: 16119285,
    yellow: 16776960,
    yellowgreen: 10145074
  };

  // node_modules/x4js/src/core/core_data.ts
  var _MetaInfos = class _MetaInfos {
    // field list
    constructor(name) {
      __publicField(this, "name");
      __publicField(this, "id");
      // field name holding 'id' record info
      __publicField(this, "fields");
      this.name = name;
      this.id = void 0;
      this.fields = [];
    }
  };
  __name(_MetaInfos, "MetaInfos");
  var MetaInfos = _MetaInfos;
  var metaFields = /* @__PURE__ */ Symbol("metaField");
  function _getMetas(obj, create = true) {
    let ctor = obj.constructor;
    let mfld = null;
    let direct = false;
    if (ctor.name == "DataModel") {
      direct = true;
      mfld = obj[metaFields];
    } else {
      mfld = Object.prototype.hasOwnProperty.call(ctor, metaFields) ? ctor[metaFields] : void 0;
    }
    if (mfld === void 0) {
      if (!create && ctor != DataModel) {
        console.assert(mfld !== void 0);
      }
      mfld = new MetaInfos(ctor.name);
      if (ctor != DataModel) {
        let pctor = Object.getPrototypeOf(ctor);
        if (pctor != DataModel) {
          let pmetas = pctor[metaFields];
          mfld.fields = [...pmetas.fields, ...mfld.fields];
          console.assert(mfld.id === void 0, "cannot define mutiple record id");
          if (!mfld.id) {
            mfld.id = pmetas.id;
          }
        }
      }
      if (!direct) {
        obj.constructor[metaFields] = mfld;
      } else {
        obj[metaFields] = mfld;
      }
    }
    return mfld;
  }
  __name(_getMetas, "_getMetas");
  var data;
  ((data2) => {
    function id() {
      return (ownerCls, fldName) => {
        let metas = _getMetas(ownerCls);
        metas.fields.push({
          name: fldName,
          type: "any",
          required: true
        });
        metas.id = fldName;
      };
    }
    data2.id = id;
    __name(id, "id");
    function field(data3) {
      return (ownerCls, fldName) => {
        let metas = _getMetas(ownerCls);
        metas.fields.push({
          name: fldName,
          ...data3
        });
      };
    }
    data2.field = field;
    __name(field, "field");
    function string(props) {
      return field({ ...props, type: "string" });
    }
    data2.string = string;
    __name(string, "string");
    function int(props) {
      return field({ ...props, type: "int" });
    }
    data2.int = int;
    __name(int, "int");
    function float(props) {
      return field({ ...props, type: "float" });
    }
    data2.float = float;
    __name(float, "float");
    function bool(props) {
      return field({ ...props, type: "bool" });
    }
    data2.bool = bool;
    __name(bool, "bool");
    function date(props) {
      return field({ ...props, type: "date" });
    }
    data2.date = date;
    __name(date, "date");
    function calc(props) {
      return field({ ...props, type: "calc" });
    }
    data2.calc = calc;
    __name(calc, "calc");
    function array(ctor, props) {
      return data2.field({ ...props, type: "array", model: ctor ? new ctor() : null });
    }
    data2.array = array;
    __name(array, "array");
    function any(props) {
      return field({ ...props, type: "any" });
    }
    data2.any = any;
    __name(any, "any");
  })(data || (data = {}));
  var _DataModel = class _DataModel {
    constructor(fields) {
      if (fields) {
        this.addField(...fields);
      }
    }
    /**
     * dynamic DataModel
     */
    addField(...fields) {
      if (fields.length == 0) {
        return;
      }
      let metas = _getMetas(this, false);
      metas.fields.push(...fields);
      if (!metas.id) {
        metas.id = fields[0].name;
      }
    }
    /**
     * MUST IMPLEMENT
     * @returns fields descriptors
     */
    getFields() {
      let metas = _getMetas(this, false);
      return metas.fields;
    }
    /**
     * 
     */
    validate(record) {
      let errs = null;
      let fields = this.getFields();
      fields.forEach((fi) => {
        if (fi.required && !this.getField(fi.name, record)) {
          if (!errs) {
            errs = [];
          }
          errs.push(new Error(`field ${fi.name} is required.`));
        }
      });
      return errs;
    }
    /**
     * return the field index by name
     */
    getFieldIndex(name) {
      let fields = this.getFields();
      return fields.findIndex((fd) => fd.name == name);
    }
    /**
     * default serializer
     * @returns an object with known record values
     */
    serialize(input) {
      let rec = {};
      this.getFields().forEach((f) => {
        if (f.calc === void 0) {
          rec[f.name] = input[f.name];
        }
      });
      return rec;
    }
    /**
     * default unserializer
     * @param data - input data 
     * @returns a new Record
     */
    unSerialize(data2, id) {
      const fields = this.getFields();
      const rec = {};
      fields.forEach((sf) => {
        let value = data2[sf.name];
        if (value !== void 0) {
          rec[sf.name] = this._convertField(sf, value);
        }
      });
      if (id !== void 0) {
        rec[fields[0].name] = id;
      } else {
        console.assert(this.getID(rec) !== void 0);
      }
      return rec;
    }
    /**
     * field conversion
     * @param field - field descriptor
     * @param input - value to convert
     * @returns the field value in it's original form
     */
    _convertField(field, input) {
      switch (field.type) {
        case "float": {
          let ffv = typeof input === "number" ? input : parseFloat(input);
          if (field.prec !== void 0) {
            let mul = Math.pow(10, field.prec);
            ffv = Math.round(ffv * mul) / mul;
          }
          return ffv;
        }
        case "int": {
          return typeof input === "number" ? input : parseInt(input);
        }
        case "date": {
          return isString(input) ? new Date(input) : input;
        }
        case "array": {
          debugger;
          break;
        }
      }
      return input;
    }
    /**
     * get the record unique identifier
     * by default the return value is the first field
     * @return unique identifier
     */
    getID(rec) {
      if (!rec) return null;
      let metas = _getMetas(this, false);
      return rec[metas.id];
    }
    /**
     * get raw value of a field
     * @param name - field name or field index
     */
    getRaw(name, rec) {
      let idx;
      let fields = this.getFields();
      if (typeof name === "string") {
        idx = fields.findIndex((fi) => fi.name == name);
        if (idx < 0) {
          console.assert(false, "unknown field: " + name);
          return void 0;
        }
      } else if (name < fields.length) {
        if (name < 0) {
          return void 0;
        }
        idx = name;
      } else {
        console.assert(false, "bad field name: " + name);
        return void 0;
      }
      let fld = fields[idx];
      if (fld.calc !== void 0) {
        return fld.calc(rec);
      }
      return rec[fld.name];
    }
    /**
     * get field value (as string)
     * @param name - field name
     * @example
     * let value = record.get('field1');
     */
    getField(name, rec) {
      let v = this.getRaw(name, rec);
      return v === void 0 || v === null ? "" : "" + v;
    }
  };
  __name(_DataModel, "DataModel");
  var DataModel = _DataModel;
  var _DataView = class _DataView extends CoreElement {
    constructor(props) {
      super();
      __publicField(this, "m_index");
      __publicField(this, "m_store");
      __publicField(this, "m_model");
      __publicField(this, "m_sort");
      __publicField(this, "m_filter");
      __publicField(this, "m_props");
      this.m_props = props;
      this.m_store = props.store;
      this.m_index = null;
      this.m_filter = null;
      this.m_sort = null;
      this.m_model = this.m_store.getModel();
      this.filter(props.filter);
      if (props.order) {
        if (isString(props.order)) {
          this.sort([{ field: props.order, ascending: true }]);
        } else if (isArray(props.order)) {
          this.sort(props.order);
        } else {
          this.sort([props.order]);
        }
      } else {
        this.sort(null);
      }
      this.m_store.addListener("data_change", (e) => this._storeChange(e));
    }
    _storeChange(ev) {
      this._filter(this.m_filter, ev.type != "change");
      this._sort(this.m_sort, ev.type != "change");
      this.fire("view_change", { change_type: "change" });
    }
    /**
     * 
     * @param filter 
     */
    filter(filter) {
      this.m_index = null;
      return this._filter(filter, true);
    }
    _filter(filter, notify) {
      this.m_index = this.m_store.createIndex(filter);
      this.m_filter = filter;
      if (this.m_sort) {
        this.sort(this.m_sort);
      }
      if (notify) {
        this.fire("view_change", { change_type: "filter" });
      }
      return this.m_index.length;
    }
    /**
     * 
     * @param columns 
     * @param ascending 
     */
    sort(props) {
      this._sort(props, true);
    }
    _sort(props, notify) {
      this.m_index = this.m_store.sortIndex(this.m_index, props);
      this.m_sort = props;
      if (notify) {
        this.fire("view_change", { change_type: "sort" });
      }
    }
    /**
     * 
     */
    getStore() {
      return this.m_store;
    }
    /**
     * 
     */
    getCount() {
      return this.m_index.length;
    }
    /**
     * 
     * @param id 
     */
    indexOfId(id) {
      let ridx = this.m_store.indexOfId(id);
      return this.m_index.findIndex((rid) => rid === ridx);
    }
    /**
     * 
     * @param index 
     */
    getByIndex(index) {
      if (index >= 0 && index < this.m_index.length) {
        let rid = this.m_index[index];
        return this.m_store.getByIndex(rid);
      }
      return null;
    }
    getIdByIndex(index) {
      const rec = this.getByIndex(index);
      return this.m_model.getID(rec);
    }
    getRecId(rec) {
      return this.m_model.getID(rec);
    }
    /**
     * 
     * @param id 
     */
    getById(id) {
      return this.m_store.getById(id);
    }
    /**
     * 
     */
    getModel() {
      return this.m_model;
    }
    /**
     * 
     */
    changed() {
      this.fire("view_change", { change_type: "change" });
    }
    /**
     * 
     */
    forEach(cb) {
      this.m_index.some((index) => {
        let rec = this.m_store.getByIndex(index);
        if (rec) {
          if (cb(rec, index)) {
            return index;
          }
        }
      });
    }
  };
  __name(_DataView, "DataView");
  var DataView = _DataView;

  // node_modules/x4js/src/core/core_dragdrop.ts
  var x_drag_cb = /* @__PURE__ */ Symbol("x-drag-cb");
  var _DragManager = class _DragManager {
    constructor() {
      __publicField(this, "dragSource");
      __publicField(this, "dragGhost");
      __publicField(this, "dropTarget");
      __publicField(this, "notified");
      __publicField(this, "timer");
    }
    // pb with name of settimeout return
    /**
     * Registers a component as a draggable element.
     * This sets up DOM event listeners for `dragstart`, `drag`, and `dragend`
     * to manage the drag operation, including creating a drag ghost and applying CSS classes.
     *
     * @param el - The component to make draggable.
     */
    // TODO: Add support for custom drag data beyond 'text/string'.
    registerDraggableElement(el) {
      el.addDOMEvent("dragstart", (ev) => {
        this.dragSource = el;
        this.dragGhost = el.dom.cloneNode(true);
        this.dragGhost.classList.add("dragged");
        document.body.appendChild(this.dragGhost);
        el.addClass("dragging");
        ev.dataTransfer.setData("text/string", "1");
        ev.dataTransfer.setDragImage(new Image(), 0, 0);
        ev.stopPropagation();
      });
      el.addDOMEvent("drag", (ev) => {
        this.dragGhost.style.left = ev.pageX + "px";
        this.dragGhost.style.top = ev.pageY + "px";
      });
      el.addDOMEvent("dragend", (ev) => {
        el.removeClass("dragging");
        this.dragGhost.remove();
      });
      el.setAttribute("draggable", "true");
    }
    /**
     * Registers a component as a drop target.
     * This sets up DOM event listeners for `dragenter`, `dragover`, `dragleave`, and `drop`.
     * It uses a `DropCallback` to notify the component about drag events and an optional `FilterCallback`
     * to determine if the target should accept the dragged item.
     *
     * @param el - The component to make a drop target.
     * @param cb - The callback function to execute on drag events.
     * @param filterCB - An optional callback to filter which draggable items can be dropped.
     */
    registerDropTarget(el, cb, filterCB) {
      const dragEnter = /* @__PURE__ */ __name((ev) => {
        if (filterCB && !filterCB(this.dragSource, ev.dataTransfer)) {
          ev.dataTransfer.dropEffect = "none";
          return;
        }
        ev.preventDefault();
        ev.dataTransfer.dropEffect = "copy";
      }, "dragEnter");
      const dragOver = /* @__PURE__ */ __name((ev) => {
        if (filterCB && !filterCB(this.dragSource, ev.dataTransfer)) {
          ev.dataTransfer.dropEffect = "none";
          return;
        }
        ev.preventDefault();
        if (this.dropTarget != el) {
          this.dropTarget = el;
          this._startCheck();
        }
        if (this.dropTarget) {
          const infos = {
            pt: { x: ev.pageX, y: ev.pageY },
            data: ev.dataTransfer
          };
          cb("drag", this.dragSource, infos);
        }
        ev.dataTransfer.dropEffect = "copy";
      }, "dragOver");
      const dragLeave = /* @__PURE__ */ __name((ev) => {
        this.dropTarget = null;
        ev.preventDefault();
      }, "dragLeave");
      const drop = /* @__PURE__ */ __name((ev) => {
        const infos = {
          pt: { x: ev.pageX, y: ev.pageY },
          data: ev.dataTransfer
        };
        cb("drop", this.dragSource, infos);
        this.dropTarget = null;
        el.removeClass("drop-over");
        ev.preventDefault();
      }, "drop");
      el.addDOMEvent("dragenter", dragEnter);
      el.addDOMEvent("dragover", dragOver);
      el.addDOMEvent("dragleave", dragLeave);
      el.addDOMEvent("drop", drop);
      el.setInternalData(x_drag_cb, cb);
    }
    /**
     * @internal
     */
    _startCheck() {
      if (this.timer) {
        clearInterval(this.timer);
        this._check();
      }
      this.timer = setInterval(() => this._check(), 300);
    }
    /**
     * @internal
     */
    _check() {
      const leaving = /* @__PURE__ */ __name((x) => {
        x.removeClass("drop-over");
        const cb = x.getInternalData(x_drag_cb);
        cb("leave", this.dragSource);
      }, "leaving");
      const entering = /* @__PURE__ */ __name((x) => {
        x.addClass("drop-over");
        const cb = x.getInternalData(x_drag_cb);
        cb("enter", this.dragSource);
      }, "entering");
      if (this.dropTarget) {
        if (!this.notified || this.notified != this.dropTarget) {
          if (this.notified) {
            leaving(this.notified);
          }
          this.notified = this.dropTarget;
          entering(this.notified);
        }
      } else {
        if (this.notified) {
          leaving(this.notified);
          this.notified = null;
          clearInterval(this.timer);
        }
      }
    }
  };
  __name(_DragManager, "DragManager");
  var DragManager = _DragManager;
  var dragManager = new DragManager();

  // node_modules/x4js/src/core/core_svg.ts
  var SVG_NS = "http://www.w3.org/2000/svg";
  function d2r(d) {
    return d * Math.PI / 180;
  }
  __name(d2r, "d2r");
  function p2c(x, y, r, deg) {
    const rad = d2r(deg);
    return {
      x: x + r * Math.cos(rad),
      y: y + r * Math.sin(rad)
    };
  }
  __name(p2c, "p2c");
  function num(x) {
    return Math.round(x * 1e3) / 1e3;
  }
  __name(num, "num");
  function clean(a, ...b) {
    b = b.map((v) => {
      if (typeof v === "number" && isFinite(v)) {
        return num(v);
      }
      return v;
    });
    return String.raw(a, ...b);
  }
  __name(clean, "clean");
  var _SvgItem = class _SvgItem {
    constructor(tag) {
      __publicField(this, "_dom");
      this._dom = document.createElementNS("http://www.w3.org/2000/svg", tag);
    }
    /**
     * @returns the svh element dom
     */
    getDom() {
      return this._dom;
    }
    /**
     * 
     */
    /**
     * Remove all attributes from the underlying DOM element.
     * @returns The current instance (this) to allow method chaining.
     */
    reset() {
      const attrs = this._dom.attributes;
      for (let i = attrs.length - 1; i >= 0; i--) {
        this._dom.removeAttribute(attrs[i].name);
      }
      return this;
    }
    /**
     * change the stroke color
     * @param color 
     */
    stroke(color, width) {
      this.setAttr("stroke", color);
      if (width !== void 0) {
        this.setAttr("stroke-width", width + "px");
      }
      return this;
    }
    /**
     * change the stroke width
     * @param width 
     */
    strokeWidth(width) {
      this.setAttr("stroke-width", width + "px");
      return this;
    }
    /**
     * change the stroke cap
     * @param cap 
     */
    strokeCap(cap) {
      return this.setAttr("stroke-linecap", cap);
    }
    /**
     * change the stroke opacity attribute on the element.
     * @param opacity - Opacity value where 0 is fully transparent and 1 is fully opaque.
     * @returns The current instance to allow method chaining.
     */
    strokeOpacity(opacity) {
      return this.setAttr("stroke-opacity", opacity + "");
    }
    /**
     * Set the shape rendering attribute to control anti-aliasing for shapes.
     *
     * When enabled, the attribute is set to "auto" to allow smoothing/anti-aliasing.
     * When disabled, the attribute is set to "crispEdges" to favor pixel-aligned,
     * non-anti-aliased rendering.
     *
     * @param set - True to enable anti-aliasing ("auto"), false to disable ("crispEdges").
     * @returns the current instance to allow chaining).
     */
    antiAlias(set) {
      return this.setAttr("shape-rendering", set ? "auto" : "crispEdges");
    }
    /**
     * change the fill color
     * @param color 
     */
    fill(color) {
      this.setAttr("fill", color);
      return this;
    }
    /**
     * the element is not filled
     */
    no_fill() {
      this.setAttr("fill", "transparent");
      return this;
    }
    /**
     * return the given attribute if any 
     */
    getAttr(name) {
      const a = this._dom.getAttribute(name) || "";
      return a;
    }
    /**
     * return the attribute as number
     */
    getNumAttr(name) {
      const a = this._dom.getAttribute(name);
      if (a == "") {
        return 0;
      }
      return parseInt(a);
    }
    /**
     * define a new attribute
     * @param name attibute name
     * @param value attribute value
     * @returns this
     */
    setAttr(name, value) {
      if (value === null || value === void 0) {
        this._dom.removeAttribute(name);
      } else {
        this._dom.setAttribute(name, value);
      }
      return this;
    }
    /**
     * change one style value
     */
    setStyle(name, value) {
      const _style = this._dom.style;
      if (isNumber(value)) {
        let v = value + "";
        if (!isUnitLess(name)) {
          v += "px";
        }
        _style[name] = v;
      } else {
        _style[name] = value;
      }
      return this;
    }
    /**
     * add a class
     * @param cls class name to add 
     */
    addClass(cls) {
      if (!cls) return;
      cls = cls.trim();
      if (cls.indexOf(" ") >= 0) {
        const ccs = cls.split(" ");
        this._dom.classList.add(...ccs);
      } else {
        this._dom.classList.add(cls);
      }
      return this;
    }
    /**
     * remove a class
     * @param cls class name to remove
     */
    removeClass(cls) {
      if (!cls) return;
      if (cls.indexOf(" ") >= 0) {
        const ccs = cls.split(" ");
        this._dom.classList.remove(...ccs);
      } else {
        this._dom.classList.remove(cls);
      }
      return this;
    }
    /**
     * 
     */
    clip(id) {
      this.setAttr("clip-path", `url(#${id})`);
      return this;
    }
    /**
     * define the whole transformation
     */
    transform(tr) {
      this.setAttr("transform", tr);
      return this;
    }
    /**
     * add a transformation to the current transformation
     */
    add_transformation(tr) {
      const t = this.getAttr("transform");
      this.setAttr("transform", t + " " + tr);
      return this;
    }
    /**
     * remove all transformations
     */
    clear_transform() {
      this.setAttr("transform", null);
      return this;
    }
    /**
     * rotation
     */
    rotate(deg, cx, cy) {
      this.transform(`rotate( ${deg} ${cx} ${cy} )`);
      return this;
    }
    add_rotation(deg, cx, cy) {
      this.add_transformation(`rotate( ${deg} ${cx} ${cy} )`);
      return this;
    }
    /**
     * translation
     */
    translate(dx, dy) {
      this.transform(`translate( ${dx} ${dy} )`);
      return this;
    }
    add_translation(dx, dy) {
      this.add_transformation(`translate( ${dx} ${dy} )`);
      return this;
    }
    /**
     * scaling
     */
    scale(x) {
      this.transform(`scale( ${x} )`);
      return this;
    }
    add_scale(x) {
      this.add_transformation(`scale( ${x} )`);
      return this;
    }
    /**
     * handle SVG DOM event
     */
    addDOMEvent(name, listener, prepend = false) {
      addEvent(this._dom, name, listener, prepend);
      return this;
    }
  };
  __name(_SvgItem, "SvgItem");
  var SvgItem = _SvgItem;
  var _SvgPath = class _SvgPath extends SvgItem {
    constructor() {
      super("path");
      __publicField(this, "_path");
      this._path = "";
    }
    _update() {
      this.setAttr("d", this._path);
      return this;
    }
    /**
     * Resets the path data and all attributes of the SVG path element.
     * @returns The current `SvgPath` instance for chaining.
     */
    reset() {
      this._path = "";
      super.reset();
      return this;
    }
    /**
     * Moves the current drawing position to the specified coordinates without drawing a line.
     * This is typically the first command in a path.
     *
     * @param x - The x-coordinate to move to.
     * @param y - The y-coordinate to move to.
     * @returns this
     */
    moveTo(x, y) {
      this._path += clean`M${x},${y}`;
      return this._update();
    }
    /**
     * Draws a straight line from the current position to the specified coordinates.
     *
     * @param x - The x-coordinate of the end point.
     * @param y - The y-coordinate of the end point.
     * @returns this
     */
    lineTo(x, y) {
      this._path += clean`L${x},${y}`;
      return this._update();
    }
    /**
     * Draws a cubic Bézier curve from the current point to `(x3, y3)` using `(x1, y1)`
     * as the control point at the beginning of the curve and `(x2, y2)` as the
     * control point at the end of the curve.
     *
     * @param x1 - The x-coordinate of the first control point.
     * @param y1 - The y-coordinate of the first control point.
     * @param x2 - The x-coordinate of the second control point.
     * @param y2 - The y-coordinate of the second control point.
     * @param x3 - The x-coordinate of the end point of the curve.
     * @param y3 - The y-coordinate of the end point of the curve.
     *
     * @returns The current `SvgPath` instance for chaining.
     */
    curveTo(x1, y1, x2, y2, x3, y3) {
      this._path += clean`C${x1},${y1} ${x2},${y2} ${x3},${y3}`;
      return this._update();
    }
    /**
     * Closes the current subpath by drawing a straight line from the current position
     * to the initial point of the current subpath.
     * @returns The current `SvgPath` instance for chaining.
     */
    closePath() {
      this._path += "Z";
      return this._update();
    }
    /**
     * draw an arc
     * Draws an elliptical arc from the current point to a new point.
     *
     * @param x - The x-coordinate of the center of the ellipse.
     * @param y - The y-coordinate of the center of the ellipse.
     * @param r - The radius of the arc.
     * @param start - The start angle of the arc in degrees (0 is right, 90 is down).
     * @param end - The end angle of the arc in degrees.
     * @param clockwise - If `true`, the arc is drawn clockwise; otherwise, counter-clockwise. Defaults to `true`.
     *
     * @returns this
     */
    arc(x, y, r, start, end, clockwise = true) {
      const st = p2c(x, y, r, start - 90);
      const en2 = p2c(x, y, r, end - 90);
      const flag = end - start <= 180 ? "0" : "1";
      this._path += clean`M${st.x},${st.y}A${r},${r} 0 ${flag} ${clockwise ? "1" : "0"} ${en2.x},${en2.y}`;
      return this._update();
    }
  };
  __name(_SvgPath, "SvgPath");
  var SvgPath = _SvgPath;
  var _SvgText = class _SvgText extends SvgItem {
    /**
     * Creates an instance of `SvgText`.
     * @param x - The x-coordinate for the text's starting position.
     * @param y - The y-coordinate for the text's starting position.
     * @param txt - The text content.
     */
    constructor(x, y, txt) {
      super("text");
      this.setAttr("x", num(x) + "");
      this.setAttr("y", num(y) + "");
      this._dom.innerHTML = sanitizeHtml(txt);
    }
    /**
     * Sets the font family for the text.
     * @param font - The font family name (e.g., "Arial", "sans-serif").
     * @returns The current `SvgText` instance for chaining.
     */
    font(font) {
      return this.setAttr("font-family", font);
    }
    /**
     * Sets the font size for the text.
     * @param size - The font size, either as a number (e.g., 12) or a string (e.g., "1.2em").
     * @returns The current `SvgText` instance for chaining.
     */
    fontSize(size) {
      return this.setAttr("font-size", size + "");
    }
    /**
     * Sets the font weight for the text.
     * @param weight - The font weight ("light", "normal", or "bold").
     * @returns The current `SvgText` instance for chaining.
     */
    fontWeight(weight) {
      return this.setAttr("font-weight", weight);
    }
    /**
     * Sets the horizontal text alignment.
     * @param align - The horizontal alignment ("left", "center", or "right").
     * @returns The current `SvgText` instance for chaining.
     */
    textAlign(align) {
      let al;
      switch (align) {
        case "left":
          al = "start";
          break;
        case "center":
          al = "middle";
          break;
        case "right":
          al = "end";
          break;
        default:
          console.warn(`Invalid textAlign value: ${align}. Must be 'left', 'center', or 'right'.`);
          return this;
      }
      return this.setAttr("text-anchor", al);
    }
    /**
     * change the vertical alignment
     */
    verticalAlign(align) {
      let al;
      switch (align) {
        case "top":
          al = "hanging";
          break;
        case "center":
          al = "middle";
          break;
        case "bottom":
          al = "baseline";
          break;
        case "baseline":
          al = "mathematical";
          break;
        default:
          console.warn(`Invalid verticalAlign value: ${align}. Must be 'top', 'center', 'bottom', or 'baseline'.`);
          return this;
      }
      return this.setAttr("alignment-baseline", al);
    }
  };
  __name(_SvgText, "SvgText");
  var SvgText = _SvgText;
  var _SvgIcon = class _SvgIcon extends SvgItem {
    /**
     * Creates an instance of `SvgIcon` from an SVG string.
     * @param svg - The SVG string, optionally prefixed with "data:image/svg+xml,".
     */
    constructor(svg) {
      super("svg");
      if (svg.startsWith("data:image/svg+xml,")) {
        svg = svg.substring(19);
      }
      const parser = new DOMParser();
      const doc = parser.parseFromString(decodeURIComponent(svg), "image/svg+xml");
      const parserErrorElement = doc.querySelector("parsererror");
      if (parserErrorElement) {
        console.error("error while parsing svg:\n" + parserErrorElement.textContent);
      }
      const svgRoot = doc.documentElement;
      for (let i = 0; i < svgRoot.attributes.length; i++) {
        this._dom.setAttribute(svgRoot.attributes[i].name, svgRoot.attributes[i].value);
      }
      for (let i = 0; i < svgRoot.childNodes.length; i++) {
        const child = svgRoot.childNodes[i];
        if (child.nodeType === 1) {
          this._dom.appendChild(child);
        }
      }
    }
  };
  __name(_SvgIcon, "SvgIcon");
  var SvgIcon = _SvgIcon;
  var _SvgShape = class _SvgShape extends SvgItem {
    constructor(tag) {
      super(tag);
    }
  };
  __name(_SvgShape, "SvgShape");
  var SvgShape = _SvgShape;
  var _SvgGradient = class _SvgGradient extends SvgItem {
    /**
     * Creates an instance of `SvgGradient`.
     * @param x1 - The x-coordinate of the starting point of the gradient vector.
     * @param y1 - The y-coordinate of the starting point of the gradient vector.
     * @param x2 - The x-coordinate of the ending point of the gradient vector.
     * @param y2 - The y-coordinate of the ending point of the gradient vector.
     * @returns The current `SvgGradient` instance for chaining.
     */
    constructor(x1, y1, x2, y2) {
      super("linearGradient");
      __publicField(this, "_id");
      __publicField(this, "_stops");
      this._id = "gx-" + _SvgGradient.g_id;
      _SvgGradient.g_id++;
      this.setAttr("id", this._id);
      this.setAttr("x1", isString(x1) ? x1 : num(x1) + "");
      this.setAttr("x2", isString(x2) ? x2 : num(x2) + "");
      this.setAttr("y1", isString(y1) ? y1 : num(y1) + "");
      this.setAttr("y2", isString(y2) ? y2 : num(y2) + "");
      this._stops = [];
    }
    /**
     * Gets the URL reference to this gradient, suitable for use in `fill` or `stroke` attributes.
     * @returns A string in the format `url(#<gradient_id>)`.
     */
    get id() {
      return "url(#" + this._id + ")";
    }
    /**
     * Adds a color stop to the gradient.
     * @param offset - The offset of the color stop, either as a number (0-100) or a percentage string.
     * @param color - The color at this stop.
     * @returns The current `SvgGradient` instance for chaining.
     */
    addStop(offset, color) {
      this._dom.insertAdjacentHTML("beforeend", `<stop offset="${offset}%" stop-color="${color}"></stop>`);
      return this;
    }
  };
  __name(_SvgGradient, "SvgGradient");
  __publicField(_SvgGradient, "g_id", 1);
  var SvgGradient = _SvgGradient;
  var _SvgGroup = class _SvgGroup extends SvgItem {
    /**
     * Creates an instance of `SvgGroup`.
     * @param tag - The SVG tag name for the group element (defaults to "g").
     */
    constructor(tag = "g") {
      super(tag);
    }
    /**
     * Appends an `SvgItem` to this group.
     *
     * @template K - The type of the `SvgItem` being appended.
     * @param item - The `SvgItem` instance to append.
     *
     * @returns The appended `SvgItem` instance.
     */
    append(item) {
      this._dom.appendChild(item.getDom());
      return item;
    }
    appendItems(items) {
      items.forEach((item) => {
        this._dom.appendChild(item.getDom());
      });
    }
    /**
     * Creates and appends an `SvgPath` element to this group.
     * @returns The newly created `SvgPath` instance.
     */
    path() {
      const path = new SvgPath();
      return this.append(path);
    }
    /**
     * Creates and appends an `SvgText` element to this group.
     * @param x - The x-coordinate for the text.
     * @param y - The y-coordinate for the text.
     * @param txt - The text content.
     * @returns The newly created `SvgText` instance.
     */
    text(x, y, txt) {
      const text = new SvgText(x, y, txt);
      return this.append(text);
    }
    /**
     * Creates and appends an SVG ellipse element to this group.
     *
     * @param x - The x-coordinate of the center of the ellipse.
     * @param y - The y-coordinate of the center of the ellipse.
     * @param r1 - The x-radius of the ellipse.
     * @param r2 - The y-radius of the ellipse.
     *
     * @returns The newly created `SvgShape` instance representing the ellipse.
     */
    ellipse(x, y, r1, r2) {
      const shape = new SvgShape("ellipse");
      shape.setAttr("cx", num(x) + "");
      shape.setAttr("cy", num(y) + "");
      shape.setAttr("rx", num(r1) + "");
      shape.setAttr("ry", num(r2 ?? r1) + "");
      return this.append(shape);
    }
    /**
     * Creates and appends an SVG circle element to this group.
     * (Internally uses an ellipse with equal x and y radii).
     *
     * @param x - The x-coordinate of the center of the circle.
     * @param y - The y-coordinate of the center of the circle.
     * @param r1 - The radius of the circle.
     * @returns The newly created `SvgShape` instance representing the circle.
     */
    circle(x, y, r1) {
      const shape = new SvgShape("ellipse");
      shape.setAttr("cx", num(x) + "");
      shape.setAttr("cy", num(y) + "");
      shape.setAttr("rx", num(r1) + "");
      shape.setAttr("ry", num(r1) + "");
      return this.append(shape);
    }
    /**
     * Creates and appends an `SvgIcon` element to this group.
     *
     * @param svg - The SVG string content for the icon.
     * @param x - The x-coordinate for the icon's position.
     * @param y - The y-coordinate for the icon's position.
     * @param w - The width of the icon.
     * @param h - The height of the icon.
     * @returns The newly created `SvgIcon` instance.
     */
    icon(svg, x, y, w, h) {
      const icon = new SvgIcon(svg);
      icon.setAttr("x", num(x) + "");
      icon.setAttr("y", num(y) + "");
      icon.setAttr("width", num(w) + "");
      icon.setAttr("height", num(h) + "");
      icon.setStyle("width", num(w) + "px");
      icon.setStyle("height", num(h) + "px");
      return this.append(icon);
    }
    /**
     * Creates and appends an SVG rectangle element to this group.
     * Handles negative height by adjusting `y` and `h` accordingly.
     *
     * @param x - The x-coordinate of the top-left corner of the rectangle.
     * @param y - The y-coordinate of the top-left corner of the rectangle.
     * @param w - The width of the rectangle.
     * @param h - The height of the rectangle.
     * @returns The newly created `SvgShape` instance representing the rectangle.
     */
    rect(x, y, w, h) {
      if (h < 0) {
        y = y + h;
        h = -h;
      }
      console.assert(w >= 0);
      console.assert(h >= 0);
      const shape = new SvgShape("rect");
      shape.setAttr("x", num(x) + "");
      shape.setAttr("y", num(y) + "");
      shape.setAttr("width", num(w) + "");
      shape.setAttr("height", num(h) + "");
      return this.append(shape);
    }
    /**
     * Creates and appends an SVG group element (`<g>`) to this group.
     * @param id - Optional. An ID for the new group.
     * @returns The newly created `SvgGroup` instance.
     */
    group(id) {
      const group = new _SvgGroup();
      if (id) {
        group.setAttr("id", id);
      }
      return this.append(group);
    }
    /**
     * 
     * Creates and appends an SVG linear gradient definition to this group.
     *
     * @example
     * ```typescript
     * const gradient = svgGroup.linear_gradient('0%', '0%', '0%', '100%')
     *                          .addStop(0, 'red')
     *                          .addStop(100, 'green');
     * svgGroup.rect(0, 0, 100, 100).fill(gradient.id);
     * ```
     * @param x1 - The x-coordinate of the starting point of the gradient vector.
     * @param y1 - The y-coordinate of the starting point of the gradient vector.
     * @param x2 - The x-coordinate of the ending point of the gradient vector.
     * @param y2 - The y-coordinate of the ending point of the gradient vector.
     * @returns The newly created `SvgGradient` instance.
     */
    linear_gradient(x1, y1, x2, y2) {
      const grad = new SvgGradient(x1, y1, x2, y2);
      return this.append(grad);
    }
    /**
     * Clears all child elements from this SVG group.
     *
     * @returns void
     */
    clear() {
      const dom = this._dom;
      while (dom.firstChild) {
        dom.removeChild(dom.firstChild);
      }
    }
  };
  __name(_SvgGroup, "SvgGroup");
  var SvgGroup = _SvgGroup;
  var _SvgBuilder = class _SvgBuilder extends SvgGroup {
    /**
     * Creates an instance of `SvgBuilder`.
     */
    constructor() {
      super();
    }
    /**
     * Adds an SVG clip path definition to the builder.
     *
     * @param x - The x-coordinate of the top-left corner of the clipping rectangle.
     * @param y - The y-coordinate of the top-left corner of the clipping rectangle.
     * @param w - The width of the clipping rectangle.
     * @param h - The height of the clipping rectangle.
     * @returns An object containing the generated `id` for the clip path and the `SvgGroup` instance representing the clip path.
     */
    addClip(x, y, w, h) {
      const id = "clip-" + _SvgBuilder.g_clip_id++;
      const clip = new SvgGroup("clipPath");
      clip.setAttr("id", id);
      clip.rect(x, y, w, h);
      this.append(clip);
      return { id, clip };
    }
    /**
     * Adds an SVG pattern definition to the builder.
     *
     * @param x - The x-coordinate of the pattern tile's top-left corner.
     * @param y - The y-coordinate of the pattern tile's top-left corner.
     * @param w - The width of the pattern tile.
     * @param h - The height of the pattern tile.
     * @returns An object containing the generated `id` for the pattern and the `SvgGroup` instance representing the pattern.
     */
    addPattern(x, y, w, h) {
      const id = "pat-" + _SvgBuilder.g_pat_id++;
      const pat = new SvgGroup("pattern");
      pat.setAttr("id", id);
      pat.setAttr("x", num(x) + "");
      pat.setAttr("y", num(y) + "");
      pat.setAttr("width", num(w) + "");
      pat.setAttr("height", num(h) + "");
      pat.setAttr("patternUnits", "userSpaceOnUse");
      this.append(pat);
      return { id, pat };
    }
  };
  __name(_SvgBuilder, "SvgBuilder");
  __publicField(_SvgBuilder, "g_clip_id", 1);
  __publicField(_SvgBuilder, "g_pat_id", 1);
  var SvgBuilder = _SvgBuilder;
  var _SvgComponent = class _SvgComponent extends Component2 {
    /**
     * Creates an instance of `SvgComponent`.
     * @param props - The properties for the SVG component.
     */
    constructor(props) {
      super({ ...props, tag: "svg", ns: SVG_NS });
      this.setAttribute("xmlns", SVG_NS);
      if (props.viewbox) {
        this.setAttribute("viewBox", props.viewbox);
      }
      if (props.svg) {
        this.dom.appendChild(props.svg.getDom());
      }
    }
    /**
     * Sets the entire SVG content of the component using an `SvgBuilder`.
     * Any existing content will be cleared.
     * @param bld - The `SvgBuilder` instance containing the SVG elements to render.
     */
    setSvg(bld) {
      this.clearContent();
      this.dom.appendChild(bld.getDom());
    }
    /**
     * Appends one or more `SvgItem` instances directly to the SVG component's DOM.
     *
     * @param items - A spread array of `SvgItem` instances to append.
     */
    addItems(...items) {
      items.forEach((item) => this.dom.appendChild(item.getDom()));
    }
  };
  __name(_SvgComponent, "SvgComponent");
  var SvgComponent = _SvgComponent;

  // node_modules/x4js/src/components/boxes/boxes.ts
  var _Box_decorators, _init4, _a4;
  _Box_decorators = [class_ns("x4")];
  var _Box = class _Box extends (_a4 = Component2) {
    constructor(props) {
      super({ tag: "fieldset", ...props });
      __publicField(this, "refs", {});
    }
  };
  _init4 = __decoratorStart(_a4);
  _Box = __decorateElement(_init4, 0, "Box", _Box_decorators, _Box);
  __name(_Box, "Box");
  __runInitializers(_init4, 1, _Box);
  var Box = _Box;
  var _HBox_decorators, _init5, _a5;
  _HBox_decorators = [class_ns("x4")];
  var _HBox = class _HBox extends (_a5 = Box) {
  };
  _init5 = __decoratorStart(_a5);
  _HBox = __decorateElement(_init5, 0, "HBox", _HBox_decorators, _HBox);
  __name(_HBox, "HBox");
  __runInitializers(_init5, 1, _HBox);
  var HBox = _HBox;
  var _VBox_decorators, _init6, _a6;
  _VBox_decorators = [class_ns("x4")];
  var _VBox = class _VBox extends (_a6 = Box) {
    constructor(p) {
      super(p);
    }
  };
  _init6 = __decoratorStart(_a6);
  _VBox = __decorateElement(_init6, 0, "VBox", _VBox_decorators, _VBox);
  __name(_VBox, "VBox");
  __runInitializers(_init6, 1, _VBox);
  var VBox = _VBox;
  var _StackBox_decorators, _init7, _a7;
  _StackBox_decorators = [class_ns("x4")];
  var _StackBox = class _StackBox extends (_a7 = Box) {
    constructor(props) {
      super(props);
      __publicField(this, "_items");
      __publicField(this, "_cur");
      this.mapPropEvents(props, "pageChange");
      this._items = props.items?.map((itm) => {
        return { ...itm, page: null };
      });
      if (props.default) {
        this.select(props.default);
      } else if (this._items.length) {
        this.select(this._items[0].name);
      }
    }
    /**
        * Adds a new item to the stack.
        * @param item - The item to add.
        */
    addItem(item) {
      this._items.push({
        name: item.name,
        content: item.content,
        page: null
      });
    }
    /**
        * Removes an item from the stack by its name.
        * @param name - The name of the item to remove.
        */
    removeItem(name) {
      const index = this._items.findIndex((x) => x.name == name);
      if (index >= 0) {
        const pg = this._items[index];
        if (pg?.page) {
          this.removeChild(pg.page);
        }
        this._items.splice(index, 1);
      }
    }
    /**
        * Selects a page by its name.
        * @param name - The name of the page to select.
        * @returns The selected page component, if any.
        */
    select(name) {
      let sel = this.query(`:scope > .selected`);
      if (sel) {
        sel.setClass("selected", false);
        sel.deactivate?.();
      }
      this._cur = this._items.findIndex((x) => x.name == name);
      const pg = this._items[this._cur];
      if (pg) {
        if (!pg.page) {
          pg.page = this._createPage(pg);
          this.appendContent(pg.page);
        }
        sel = pg.page;
        if (sel) {
          sel.activate?.();
          sel.setClass("selected", true);
        }
        asap(() => this.fire("pageChange", { selection: [pg.name], empty: !sel }));
      }
      return pg?.page;
    }
    /**
     * 
     */
    _createPage(page) {
      let content;
      if (page.content instanceof Function) {
        content = page.content();
        page.content = content;
      } else {
        content = page.content;
      }
      content?.setData("stackname", page.name);
      return content;
    }
    /**
        * Retrieves a page by its name.
        * @param name - The name of the page to retrieve.
        * @returns The page content, if found.
        */
    getPage(name) {
      const pg = this._items.find((x) => x.name == name);
      return pg ? pg.content : null;
    }
    /**
        * Gets the total number of pages in the stack.
        * @returns The number of pages.
        */
    getPageCount() {
      return this._items.length;
    }
    /**
        * Enumerates the names of all pages in the stack.
        * @returns An array of page names.
        */
    enumPageNames() {
      return this._items.map((x) => x.name);
    }
    /**
        * Retrieves a stack item by its name.
        * @param name - The name of the item to retrieve.
        * @returns The stack item, if found.
        */
    getItem(name) {
      const pg = this._items.find((x) => x.name == name);
      return pg;
    }
    /**
        * Gets the name of the currently selected page.
        * @returns The name of the current page, if any.
        */
    getCurPage() {
      const c = this._items[this._cur];
      return c?.name;
    }
  };
  _init7 = __decoratorStart(_a7);
  _StackBox = __decorateElement(_init7, 0, "StackBox", _StackBox_decorators, _StackBox);
  __name(_StackBox, "StackBox");
  __runInitializers(_init7, 1, _StackBox);
  var StackBox = _StackBox;
  var _AssistBox_decorators, _init8, _a8;
  _AssistBox_decorators = [class_ns("x4")];
  var _AssistBox = class _AssistBox extends (_a8 = StackBox) {
    /**
        * Selects the next or previous page in the stack.
        * @param nxt - If `true`, selects the next page; otherwise, selects the previous page.
        */
    selectNextPage(nxt = true) {
      let p;
      if (nxt && this._cur < this._items.length - 1) {
        p = this._items[this._cur + 1];
      } else if (!nxt && this._cur > 0) {
        p = this._items[this._cur - 1];
      }
      if (p) {
        this.select(p.name);
      }
    }
    /**
        * Checks if the current page is the first page.
        * @returns `true` if the current page is the first page.
        */
    isFirstPage() {
      return this._cur == 0;
    }
    /**
        * Checks if the current page is the last page.
        * @returns `true` if the current page is the last page.
        */
    isLastPage() {
      return this._cur == this._items.length - 1;
    }
  };
  _init8 = __decoratorStart(_a8);
  _AssistBox = __decorateElement(_init8, 0, "AssistBox", _AssistBox_decorators, _AssistBox);
  __name(_AssistBox, "AssistBox");
  __runInitializers(_init8, 1, _AssistBox);
  var AssistBox = _AssistBox;
  var _GridBox_decorators, _init9, _a9;
  _GridBox_decorators = [class_ns("x4")];
  var _GridBox = class _GridBox extends (_a9 = Box) {
    constructor(props) {
      super(props);
      if (props.rows !== void 0) {
        this.setRows(props.rows);
      }
      if (props.columns !== void 0) {
        this.setCols(props.columns);
      }
      if (props.items) {
        this.setItems(props.items);
      }
    }
    /**
        * Sets grid rows (e.g., `2`, `"1fr 2fr"`, `["1fr", "2fr"]`).
        * @param r - Rows definition.
        */
    setRows(r) {
      if (isArray(r)) {
        r = r.join(" ");
      } else if (isNumber(r)) {
        r = `repeat( ${r}, 1fr )`;
      }
      this.setStyleValue("gridTemplateRows", r);
    }
    /**
        * Sets grid columns (e.g., `3`, `"1fr 1fr"`, `["auto", "1fr"]`).
        * @param r - Columns definition.
        */
    setCols(r) {
      if (isArray(r)) {
        r = r.join(" ");
      } else if (isNumber(r)) {
        r = `repeat( ${r}, 1fr )`;
      }
      this.setStyleValue("gridTemplateColumns", r);
    }
    /**
        * Sets the number of rows.
        * @param n - Row count.
        */
    setRowCount(n) {
      this.setStyleValue("gridTemplateRows", `repeat(${n},1fr)`);
    }
    /**
        * Sets the number of columns.
        * @param n - Column count.
        */
    setColCount(n) {
      this.setStyleValue("gridTemplateColumns", `repeat(${n},1fr)`);
    }
    /**
        * Sets grid template areas (e.g., `["a a", "b c"]`).
        * @param t - Template strings.
        */
    setTemplate(t) {
      this.setAttribute("grid-template-areas", t.map((x) => '"' + x + '"').join(" "));
    }
    /**
        * Places items at specific grid positions.
        * @param items - Array of `{row, col, item}`.
        */
    setItems(items) {
      items.forEach((x) => {
        x.item.setStyle({
          gridColumn: x.col + 1 + "",
          gridRow: x.row + 1 + ""
        });
      });
      this.setContent(items.map((x) => x.item));
    }
  };
  _init9 = __decoratorStart(_a9);
  _GridBox = __decorateElement(_init9, 0, "GridBox", _GridBox_decorators, _GridBox);
  __name(_GridBox, "GridBox");
  __runInitializers(_init9, 1, _GridBox);
  var GridBox = _GridBox;
  var _MasonryBox_decorators, _init10, _a10;
  _MasonryBox_decorators = [class_ns("x4")];
  var _MasonryBox = class _MasonryBox extends (_a10 = Box) {
    constructor(props) {
      super(props);
      this.addDOMEvent("resized", () => {
        this.resizeAllItems();
      });
      if (props.items) {
        this.setItems(props.items);
      }
    }
    /**
        * Resizes a single masonry item.
        * @param item - Item to resize.
        */
    resizeItem(item) {
      const style = this.getComputedStyle();
      const rowHeight = parseInt(style["gridAutoRows"]);
      const rowGap = parseInt(style["rowGap"]);
      let content = item.query(".content");
      if (!content) {
        content = item;
      }
      if (content && rowHeight + rowGap) {
        const rc = content.getBoundingRect();
        const rowSpan = Math.ceil((rc.height + rowGap) / (rowHeight + rowGap));
        item.setStyleValue("gridRowEnd", "span " + rowSpan);
      }
    }
    /**
        * Resizes all items to fit the grid.
        */
    resizeAllItems() {
      const els = this.queryAll(".item");
      els.forEach((itm) => {
        this.resizeItem(itm);
      });
    }
    /**
        * Sets masonry items.
        * @param items - Array of components.
        */
    setItems(items) {
      const els = items.map((x) => {
        return new Box({
          cls: "item",
          content: x
        });
      });
      this.setContent(els);
    }
  };
  _init10 = __decoratorStart(_a10);
  _MasonryBox = __decorateElement(_init10, 0, "MasonryBox", _MasonryBox_decorators, _MasonryBox);
  __name(_MasonryBox, "MasonryBox");
  __runInitializers(_init10, 1, _MasonryBox);
  var MasonryBox = _MasonryBox;

  // node_modules/x4js/src/components/breadcrumb/breadcrumb.ts
  var _Breadcrumbs_decorators, _init11, _a11;
  _Breadcrumbs_decorators = [class_ns("x4")];
  var _Breadcrumbs = class _Breadcrumbs extends (_a11 = HBox) {
    constructor(props) {
      super(props);
      this.mapPropEvents(props, "click");
      if (props.items) {
        this.setItems(props.items);
      }
    }
    setItems(elements) {
      const items = elements.map((itm) => {
        return new Button({
          label: itm.label,
          icon: itm.icon,
          click: /* @__PURE__ */ __name(() => {
            if (itm.click) {
              itm.click(itm.name);
            } else {
              this.fire("click", { context: itm.name });
            }
          }, "click")
        });
      });
      this.setContent(items);
    }
  };
  _init11 = __decoratorStart(_a11);
  _Breadcrumbs = __decorateElement(_init11, 0, "Breadcrumbs", _Breadcrumbs_decorators, _Breadcrumbs);
  __name(_Breadcrumbs, "Breadcrumbs");
  __runInitializers(_init11, 1, _Breadcrumbs);
  var Breadcrumbs = _Breadcrumbs;

  // node_modules/x4js/src/components/icon/icon.ts
  var _SvgLoader = class _SvgLoader {
    constructor() {
      __publicField(this, "cache");
      __publicField(this, "waiters");
      this.cache = /* @__PURE__ */ new Map();
      this.waiters = /* @__PURE__ */ new Map();
    }
    async load(file) {
      if (this.cache.has(file)) {
        return Promise.resolve(this.cache.get(file));
      }
      return new Promise((resolve, reject) => {
        if (this.waiters.has(file)) {
          this.waiters.get(file).push(resolve);
        } else {
          this.waiters.set(file, [resolve]);
          this._load(file).then((data2) => {
            this.cache.set(file, data2);
            const ww = this.waiters.get(file);
            ww.forEach((cb) => cb(data2));
          }).catch((e) => {
            this.cache.set(file, null);
            reject(e);
          });
        }
      });
    }
    async _load(file) {
      const res = await fetch(file);
      if (res.ok) {
        return res.text();
      }
      throw new Error(`file not found: ${file}`);
    }
  };
  __name(_SvgLoader, "SvgLoader");
  var SvgLoader = _SvgLoader;
  var svgLoader = new SvgLoader();
  var _Icon_decorators, _init12, _a12;
  _Icon_decorators = [class_ns("x4")];
  var _Icon = class _Icon extends (_a12 = Component2) {
    /**
     * Create a new Icon.
     *
     * @param {IconProps} props - Optional initial icon identifier.
     *
     * @example
     * const icon = new Icon({ iconId: "check" });
     */
    constructor(props) {
      super(props);
      this.setIcon(props.iconId);
    }
    /**
        * Sets or updates the icon content.
        * @param iconId - Identifier for the icon.
        *                 If it starts with `var:`, the value is treated as a CSS variable name.
        *                 If it is a data URL (e.g., `data:image/svg+xml,<svg...`), the SVG is rendered directly.
        *                 If it ends with `.svg`, the file is loaded asynchronously.
        *                 Otherwise, it is treated as an image URL.
        * @example
        * // Using a CSS variable
        * setIcon("var:home");
        * @example
        * // Using an imported SVG
        * import myicon from "./myicon.svg";
        * setIcon(myicon);
        */
    setIcon(iconId) {
      this.clearContent();
      if (iconId) {
        if (iconId.startsWith("var:")) {
          do {
            const path = iconId.substring(4);
            iconId = document.documentElement.style.getPropertyValue(path);
          } while (iconId.startsWith("var:"));
        }
        if (iconId.startsWith("data:image/svg+xml,<svg")) {
          this.dom.insertAdjacentHTML("beforeend", iconId.substring(19));
        } else if (iconId.startsWith("data:image/svg+xml;base64,")) {
          this.dom.insertAdjacentHTML("beforeend", atob(iconId.substring(26)));
        } else if (iconId.startsWith("<svg")) {
          this.dom.insertAdjacentHTML("beforeend", iconId);
        } else if (iconId.endsWith(".svg")) {
          svgLoader.load(iconId).then((svg) => {
            this.clearContent();
            this.dom.insertAdjacentHTML("beforeend", svg);
          }).catch((_) => {
          });
        } else {
          this.setContent(new Component2({ tag: "img", attrs: { src: iconId } }));
        }
        this.removeClass("empty");
      } else {
        this.addClass("empty");
      }
    }
  };
  _init12 = __decoratorStart(_a12);
  _Icon = __decorateElement(_init12, 0, "Icon", _Icon_decorators, _Icon);
  __name(_Icon, "Icon");
  __runInitializers(_init12, 1, _Icon);
  var Icon2 = _Icon;

  // node_modules/x4js/src/components/button/button.ts
  var _Button_decorators, _text, _init13, _a13;
  _Button_decorators = [class_ns("x4")];
  var _Button = class _Button extends (_a13 = Component2) {
    /**
     * Create a new Button.
     *
     * @param {ButtonProps} props - Configuration options such as `label`, `icon`, `tabindex`, `autorepeat`, and `click`.
     *
     * @example
     * const btn = new Button({
     *   label: "Save",
     *   icon: "check",
     *   click: () => console.log("clicked"),
     * });
     */
    constructor(props) {
      super({ ...props, tag: "button", content: null });
      __privateAdd(this, _text);
      this.mapPropEvents(props, "click");
      if (props.autorepeat) {
        this.addDOMEvent("pointerdown", (e) => this._on_mouse(e));
        this.addDOMEvent("pointerup", (e) => this._on_mouse(e));
      } else {
        this.addDOMEvent("click", (e) => this._on_click(e));
      }
      this.addDOMEvent("keydown", (e) => this._on_keydown(e));
      this.setContent([
        new Icon2({ id: "icon", iconId: this.props.icon }),
        __privateSet(this, _text, new Component2({ id: "label" }))
      ]);
      this.setText(props.label);
      if (props.tabindex !== false) {
        this.setAttribute("tabindex", props.tabindex);
      }
      if (props.menu) {
        this.addClass("with-menu");
      }
    }
    /**
     * @internal 
     */
    _on_click(ev) {
      if (this.props.menu) {
        let menu = new Menu({
          items: isFunction(this.props.menu) ? this.props.menu() : this.props.menu
        });
        let rc = this.getBoundingRect();
        menu.displayNear(rc, "top-left", "bottom-left");
      } else {
        this.fire("click", {});
      }
      ev.preventDefault();
      ev.stopPropagation();
    }
    /**
     * @internal
     */
    _on_mouse(e) {
      let count = 0;
      if (e.type == "pointerdown") {
        this.dom.setPointerCapture(e.pointerId);
        const rt = this.props.autorepeat === true ? 200 : this.props.autorepeat;
        this.setTimeout("repeat", 500, () => {
          this.fire("click", {});
          this.setInterval("repeat", rt, () => {
            count++;
            this.fire("click", { repeat: count });
          });
        });
      } else {
        this.clearTimeout("repeat");
        if (!count) {
          this.fire("click", {});
        }
      }
    }
    /**
     * Activate the button as if it was clicked by a user.
     *
     * @example
     * button.click();
     */
    click() {
      this.dom.click();
    }
    /**
     * @internal
     */
    _on_keydown(e) {
      if (e.key == "Enter") {
        this.click();
        e.preventDefault();
      }
    }
    /**
     * Set or change the button label.
     *
     * @param {string | UnsafeHtml} text - Text content or unsafe HTML.
     *
     * @example
     * button.setText("Confirm");
     * button.setText(new UnsafeHtml("<strong>OK</strong>"));
     * button.setText( unsafe`<strong>OK</strong>` );
     */
    setText(text) {
      __privateGet(this, _text).setContent(text);
      __privateGet(this, _text).setClass("empty", !text);
    }
    /**
     * Set or change the icon displayed by the button.
     *
     * @param {string} icon - Icon identifier to associate with the button.
     *
     * @example
     * button.setIcon("arrow-right");
     */
    setIcon(icon) {
      this.query("#icon").setIcon(icon);
    }
  };
  _init13 = __decoratorStart(_a13);
  _text = new WeakMap();
  _Button = __decorateElement(_init13, 0, "Button", _Button_decorators, _Button);
  __name(_Button, "Button");
  __runInitializers(_init13, 1, _Button);
  var Button = _Button;

  // node_modules/x4js/src/components/btngroup/btngroup.ts
  var _BtnGroup_decorators, _init14, _a14;
  _BtnGroup_decorators = [class_ns("x4")];
  var _BtnGroup = class _BtnGroup extends (_a14 = Box) {
    constructor(props) {
      super(props);
      if (props.align) {
        this.addClass("align-" + props.align);
      }
      this.addClass(props.vertical ? "x4vbox" : "x4hbox");
      if (props.items) {
        this.setButtons(props.items);
      }
      this.mapPropEvents(props, "btnclick");
    }
    /**
     * 
     * @param btns 
     */
    setButtons(btns) {
      this.clearContent();
      const childs = [];
      const hasOption = /* @__PURE__ */ __name((options, value) => {
        const idx = options.indexOf(value);
        if (idx >= 0) {
          options.splice(idx, 1);
          return true;
        }
      }, "hasOption");
      btns?.forEach((b) => {
        if (b === "-" || b === ">>") {
          b = new Flex();
        } else if (b == "~") {
          b = new Space("1em");
        } else if (isString(b)) {
          let title;
          const nm = b;
          let [txt, ...def] = nm.split(".");
          let cls = "";
          switch (txt) {
            case "ok":
              title = _tr.global.ok;
              break;
            case "cancel":
              title = _tr.global.cancel;
              break;
            case "abort":
              title = _tr.global.abort;
              break;
            case "no":
              title = _tr.global.no;
              break;
            case "yes":
              title = _tr.global.yes;
              break;
            case "retry":
              title = _tr.global.retry;
              break;
            case "save":
              title = _tr.global.save;
              break;
          }
          b = new Button({ cls, id: txt, label: title, click: /* @__PURE__ */ __name(() => {
            this.fire("btnclick", { button: txt });
          }, "click") });
          if (hasOption(def, "default")) {
            b.addClass("default");
          }
          if (hasOption(def, "autofocus")) {
            b.setAttribute("autofocus", true);
          }
          if (hasOption(def, "disabled")) {
            b.enable(false);
          }
          b.addClass(def.join(" "));
        } else if (b instanceof Button) {
          const btn = b;
          if (!btn.props.click && btn.props.id) {
            btn.on("click", () => {
              this.fire("btnclick", { button: btn.props.id });
            });
          }
        }
        childs.push(b);
      });
      super.setContent(childs);
    }
    getButton(id) {
      return this.query("#" + id);
    }
  };
  _init14 = __decoratorStart(_a14);
  _BtnGroup = __decorateElement(_init14, 0, "BtnGroup", _BtnGroup_decorators, _BtnGroup);
  __name(_BtnGroup, "BtnGroup");
  __runInitializers(_init14, 1, _BtnGroup);
  var BtnGroup = _BtnGroup;

  // node_modules/x4js/src/components/label/label.ts
  var _Label_decorators, _init15, _a15;
  _Label_decorators = [class_ns("x4")];
  var _Label = class _Label extends (_a15 = Component2) {
    constructor(p) {
      super({ ...p, content: null });
      this.setContent([
        new Icon2({ id: "icon", iconId: this.props.icon }),
        new Component2({ tag: "span", id: "text" })
      ]);
      this.setText(this.props.text);
      if (p.labelFor) {
        this.setAttribute("for", p.labelFor);
      }
      if (p.align) {
        this.addClass("al-" + p.align);
      }
    }
    setText(text) {
      const lab = this.query("#text");
      lab.setContent(text);
      lab.setClass("empty", !text);
    }
    setIcon(icon) {
      this.query("#icon").setIcon(icon);
    }
  };
  _init15 = __decoratorStart(_a15);
  _Label = __decorateElement(_init15, 0, "Label", _Label_decorators, _Label);
  __name(_Label, "Label");
  __runInitializers(_init15, 1, _Label);
  var Label = _Label;
  var _SimpleText_decorators, _init16, _a16;
  _SimpleText_decorators = [class_ns("x4")];
  var _SimpleText = class _SimpleText extends (_a16 = Component2) {
    /**
     * 
     */
    constructor(p) {
      super({ ...p });
      this.setContent(p.text);
      if (p.align) {
        this.addClass("al-" + p.align);
      }
    }
    /**
     * 
     */
    setText(text) {
      this.setContent(text);
      this.setClass("empty", !text);
    }
  };
  _init16 = __decoratorStart(_a16);
  _SimpleText = __decorateElement(_init16, 0, "SimpleText", _SimpleText_decorators, _SimpleText);
  __name(_SimpleText, "SimpleText");
  __runInitializers(_init16, 1, _SimpleText);
  var SimpleText = _SimpleText;

  // node_modules/x4js/src/components/sizers/sizer.ts
  var _CSizer_decorators, _init17, _a17;
  _CSizer_decorators = [class_ns("x4")];
  var _CSizer = class _CSizer extends (_a17 = Component2) {
    constructor(type, target) {
      super({});
      __publicField(this, "_type");
      __publicField(this, "_ref");
      __publicField(this, "_delta");
      this._type = type;
      this.addClass(type);
      this.addDOMEvent("pointerdown", (e) => {
        this.setCapture(e.pointerId);
        let targ = target;
        if (!targ) {
          if (type == "hsize-next" || type == "vsize-next") {
            targ = this.nextElement();
          } else if (type == "hsize-prev" || type == "vsize-prev") {
            targ = this.prevElement();
          }
        }
        this._ref = targ ?? componentFromDOM(this.dom.parentElement);
        this._delta = { x: 0, y: 0 };
        const rc = this._ref.getBoundingRect();
        if (this._type == "hsize-next" || this._type.includes("left")) {
          this._delta.x = e.pageX - rc.left;
        } else {
          this._delta.x = e.pageX - (rc.left + rc.width);
        }
        if (this._type == "vsize-next" || this._type.includes("top")) {
          this._delta.y = e.pageY - rc.top;
        } else {
          this._delta.y = e.pageY - (rc.top + rc.height);
        }
        this.fire("start", {});
        e.preventDefault();
      });
      this.addDOMEvent("pointerup", (e) => {
        this.fire("stop", {});
        this.releaseCapture(e.pointerId);
        this._ref = null;
      });
      this.addDOMEvent("pointermove", (e) => {
        this._onMouseMove(e);
      });
    }
    _onMouseMove(e) {
      if (!this._ref) {
        return;
      }
      const pt = { x: e.pageX - this._delta.x, y: e.pageY - this._delta.y };
      const rc = this._ref.getBoundingRect();
      let nr = {};
      let horz = true;
      let size = 0;
      if (this._type.includes("top")) {
        nr.top = pt.y, size = nr.height = rc.top + rc.height - pt.y;
        horz = false;
      }
      if (this._type == "vsize-next") {
        size = nr.height = rc.top + rc.height - pt.y;
        horz = false;
      }
      if (this._type.includes("bottom") || this._type == "vsize-prev") {
        size = nr.height = pt.y - rc.top;
        horz = false;
      }
      if (this._type.includes("left")) {
        nr.left = pt.x;
        size = nr.width = rc.left + rc.width - pt.x;
      }
      if (this._type == "hsize-next") {
        size = nr.width = rc.left + rc.width - pt.x;
      }
      if (this._type.includes("right") || this._type == "hsize-prev") {
        size = nr.width = pt.x - rc.left;
      }
      const isFlex = /* @__PURE__ */ __name((c) => {
        if (!c) {
          return false;
        }
        if (c.hasClass("x4flex")) {
          return true;
        }
        return c.getStyleValue("flexGrow") !== void 0;
      }, "isFlex");
      if (this._type.includes("-prev")) {
        if (isFlex(this.prevElement())) {
          this._ref.setStyleValue("flex", `0 0 ${size}px`);
        } else {
          this._ref.setStyle(nr);
        }
      } else if (this._type.includes("-next")) {
        if (isFlex(this.nextElement())) {
          this._ref.setStyleValue("flex", `0 0 ${size}px`);
        } else {
          this._ref.setStyle(nr);
        }
        return;
      } else {
        this._ref.setStyle(nr);
      }
      const nrc = this._ref.getBoundingRect();
      this.fire("resize", { size, width: nrc.width, height: nrc.height });
      e.preventDefault();
      e.stopPropagation();
    }
  };
  _init17 = __decoratorStart(_a17);
  _CSizer = __decorateElement(_init17, 0, "CSizer", _CSizer_decorators, _CSizer);
  __name(_CSizer, "CSizer");
  __runInitializers(_init17, 1, _CSizer);
  var CSizer = _CSizer;
  var _HSizer_decorators, _init18, _a18;
  _HSizer_decorators = [class_ns("x4")];
  var _HSizer = class _HSizer extends (_a18 = CSizer) {
    constructor(next = true) {
      super(next ? "hsize-next" : "hsize-prev");
    }
  };
  _init18 = __decoratorStart(_a18);
  _HSizer = __decorateElement(_init18, 0, "HSizer", _HSizer_decorators, _HSizer);
  __name(_HSizer, "HSizer");
  __runInitializers(_init18, 1, _HSizer);
  var HSizer = _HSizer;
  var _VSizer_decorators, _init19, _a19;
  _VSizer_decorators = [class_ns("x4")];
  var _VSizer = class _VSizer extends (_a19 = CSizer) {
    constructor(next = true) {
      super(next ? "vsize-next" : "vsize-prev");
    }
  };
  _init19 = __decoratorStart(_a19);
  _VSizer = __decorateElement(_init19, 0, "VSizer", _VSizer_decorators, _VSizer);
  __name(_VSizer, "VSizer");
  __runInitializers(_init19, 1, _VSizer);
  var VSizer = _VSizer;

  // node_modules/x4js/src/components/popup/popup.ts
  var autoclose_list = [];
  var popup_list = [];
  var modal_stack = [];
  var modal_mask;
  function getRoot() {
    return document.body;
  }
  __name(getRoot, "getRoot");
  var _Popup_decorators, _init20, _a20;
  _Popup_decorators = [class_ns("x4")];
  var _Popup = class _Popup extends (_a20 = Box) {
    constructor(props) {
      super(props);
      __publicField(this, "_isshown", false);
      __publicField(this, "_ismodal", false);
      /**
       * binded
       */
      __publicField(this, "_dismiss", /* @__PURE__ */ __name((e) => {
        const onac = autoclose_list.some((x) => x.dom.contains(e.target));
        if (onac) {
          return;
        }
        e.preventDefault();
        e.stopPropagation();
        this.dismiss();
      }, "_dismiss"));
      if (this.props.sizable) {
        this._createSizers();
      }
      asap(() => {
        if (this.props.movable === true || this.props.sizable && this.props.movable === void 0) {
          const movers = this.queryAll(".caption-element");
          movers.forEach((m) => new CMover(m, this));
          if (this.hasClass("popup-caption")) {
            new CMover(this, this);
          }
        }
      });
    }
    /**
     * 
     */
    displayNear(rc, dst = "top left", src = "top left", offset = { x: 0, y: 0 }, keep_pos = false) {
      if (!keep_pos) {
        this.setStyle({ left: "0px", top: "0px" });
      }
      this._do_show();
      let rm = this.getBoundingRect();
      let xref = rc.left;
      let yref = rc.top;
      if (src.indexOf("right") >= 0) {
        xref = rc.left + rc.width;
      } else if (src.indexOf("center") >= 0) {
        xref = rc.left + rc.width / 2;
      }
      if (src.indexOf("bottom") >= 0) {
        yref = rc.bottom;
      } else if (src.indexOf("middle") >= 0) {
        yref = rc.top + rc.height / 2;
      }
      if (dst.indexOf("right") >= 0) {
        xref -= rm.width;
      } else if (dst.indexOf("center") >= 0) {
        xref -= rm.width / 2;
      }
      if (dst.indexOf("bottom") >= 0) {
        yref -= rm.height;
      } else if (dst.indexOf("middle") >= 0) {
        yref -= rm.height / 2;
      }
      if (offset) {
        xref += offset.x;
        yref += offset.y;
      }
      xref += document.scrollingElement.scrollLeft;
      yref += document.scrollingElement.scrollTop;
      this.displayAt(xref, yref);
    }
    /**
     * stupid parameter
     */
    displayCenter() {
      this._do_show();
      const fixpos = /* @__PURE__ */ __name(() => {
        const self = this.dom;
        this.setStyle({
          left: (document.body.offsetWidth - self.offsetWidth) / 2 + "px",
          top: (document.body.offsetHeight - self.offsetHeight) / 2 + "px"
        });
      }, "fixpos");
      asap(fixpos);
      const tkn = Application.instance().on("resize", () => {
        asap(fixpos);
      });
      this.addCleanup(tkn.off);
    }
    /**
     * 
     */
    displayAt(x, y) {
      const zm = getGlobalZoom();
      x /= zm;
      y /= zm;
      this.setStyleValue("left", x);
      this.setStyleValue("top", y);
      this._do_show();
      const rc = this.getBoundingRect().scale(1 / zm);
      const sbw = getScrollbarSize();
      const screen_width = window.innerWidth - sbw;
      if (rc.right > screen_width) {
        this.setStyleValue("left", screen_width - rc.width);
      }
      const screen_height = window.innerHeight - sbw;
      if (rc.bottom > screen_height) {
        this.setStyleValue("top", screen_height - rc.height);
      }
    }
    isOpen() {
      return this._isshown;
    }
    _do_hide() {
      if (!this._isshown) {
        return;
      }
      this.__hide();
      this.__remove();
      if (this._ismodal) {
        if (modal_stack[modal_stack.length - 1] != this) {
          const idx2 = modal_stack.findIndex((x) => x === this);
          if (idx2 >= 0) {
            modal_stack.splice(idx2, 1);
          }
        } else {
          modal_stack.pop();
          this._hideModalMask();
        }
      }
      const idx = popup_list.indexOf(this);
      console.assert(idx >= 0);
      popup_list.splice(idx, 1);
      if (this.props.autoClose) {
        const idx2 = autoclose_list.indexOf(this);
        if (idx2 >= 0) {
          autoclose_list.splice(idx2, 1);
          if (autoclose_list.length == 0) {
            document.removeEventListener("pointerdown", this._dismiss);
          }
        }
      }
      this._isshown = false;
      this.fire("closed", {});
    }
    /**
     * 
     */
    _do_show() {
      if (this._isshown) {
        return;
      }
      this._isshown = true;
      this.__append();
      if (this._ismodal) {
        modal_stack.push(this);
        this._showModalMask();
      }
      this.__show();
      if (this.props.autoClose) {
        if (autoclose_list.length == 0) {
          document.addEventListener("pointerdown", this._dismiss);
        }
        autoclose_list.push(this);
        this.setData("close", this.props.autoClose === true ? makeUniqueComponentId() : this.props.autoClose);
      }
      popup_list.push(this);
      this.fire("opened", {});
    }
    /**
     * 
     */
    __show() {
      super.show(true);
    }
    __hide() {
      super.show(false);
    }
    __append() {
      const root = getRoot();
      root.appendChild(this.dom);
    }
    __remove() {
      const root = getRoot();
      root.removeChild(this.dom);
    }
    /**
     * 
     */
    show(show = true) {
      if (show) {
        this.displayCenter();
      } else {
        this._do_hide();
      }
      return this;
    }
    /**
     * 
     */
    close() {
      this._do_hide();
    }
    /**
     * dismiss all popup belonging to the same group as 'this'
     */
    dismiss(after = false) {
      if (autoclose_list.length == 0) {
        return;
      }
      const cgroup = this.getData("close");
      const inc_group = [];
      const excl_group = [];
      let aidx = -1;
      if (after) {
        aidx = autoclose_list.indexOf(this);
      }
      autoclose_list.forEach((x, idx) => {
        const group = x.getData("close");
        if (group == cgroup && idx > aidx) {
          inc_group.push(x);
        } else {
          excl_group.push(x);
        }
      });
      const list = inc_group.reverse();
      autoclose_list = excl_group;
      if (autoclose_list.length == 0) {
        document.removeEventListener("pointerdown", this._dismiss);
      }
      list.forEach((x) => x.close());
    }
    /**
     * 
     */
    _createSizers() {
      this.appendContent([
        new CSizer("top"),
        new CSizer("bottom"),
        new CSizer("left"),
        new CSizer("right"),
        new CSizer("top-left"),
        new CSizer("bottom-left"),
        new CSizer("top-right"),
        new CSizer("bottom-right")
      ]);
    }
    _showModalMask() {
      if (!modal_mask) {
        modal_mask = new Component2({ cls: "x4modal-mask" });
      }
      const root = getRoot();
      root.insertBefore(modal_mask.dom, this.dom);
    }
    _hideModalMask() {
      if (modal_mask) {
        const root = getRoot();
        if (modal_stack.length) {
          const top = modal_stack[modal_stack.length - 1];
          root.insertBefore(modal_mask.dom, top.dom);
        } else {
          root.removeChild(modal_mask.dom);
        }
      }
    }
  };
  _init20 = __decoratorStart(_a20);
  _Popup = __decorateElement(_init20, 0, "Popup", _Popup_decorators, _Popup);
  __name(_Popup, "Popup");
  __runInitializers(_init20, 1, _Popup);
  var Popup = _Popup;
  var _CMover = class _CMover {
    constructor(x, ref) {
      __publicField(this, "ref");
      __publicField(this, "delta");
      __publicField(this, "self");
      this.self = ref ? true : false;
      const mouseDown = /* @__PURE__ */ __name((e) => {
        if (this.self && e.target) {
          const clickable = e.target.closest('button, input, a, [role="button"]');
          if (clickable) {
            return;
          }
        }
        x.setCapture(e.pointerId);
        if (!ref) {
          ref = componentFromDOM(x.dom.parentElement);
        }
        this.ref = ref;
        this.delta = { x: 0, y: 0 };
        const rc = ref.getBoundingRect();
        this.delta.x = e.pageX - rc.left;
        this.delta.y = e.pageY - rc.top;
      }, "mouseDown");
      const mouseMove = /* @__PURE__ */ __name((e) => {
        if (!this.delta) {
          return;
        }
        const ref2 = this.ref;
        const pt = { x: e.pageX - this.delta.x, y: e.pageY - this.delta.y };
        const rc = ref2.getBoundingRect();
        ref2.setStyle({
          top: pt.y + "",
          left: pt.x + ""
        });
        e.preventDefault();
        e.stopPropagation();
      }, "mouseMove");
      const mouseUp = /* @__PURE__ */ __name((e) => {
        x.releaseCapture(e.pointerId);
        this.delta = null;
      }, "mouseUp");
      x.addDOMEvent("pointerdown", mouseDown);
      x.addDOMEvent("pointerup", mouseUp);
      x.addDOMEvent("pointermove", mouseMove);
    }
  };
  __name(_CMover, "CMover");
  var CMover = _CMover;

  // node_modules/x4js/src/components/assets/icons.ts
  var x4icons = {
    check: `<svg viewBox="0 0 10 7" fill="none" aria-hidden="true"><path d="M4 4.586L1.707 2.293A1 1 0 1 0 .293 3.707l3 3a.997.997 0 0 0 1.414 0l5-5A1 1 0 1 0 8.293.293L4 4.586z" fill="currentColor" fill-rule="evenodd" clip-rule="evenodd"></path></svg>`,
    empty: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 576 512"><path opacity=".4" d="M32 96l0 200.6 21.7-54.3C65.9 211.9 95.3 192 128 192l320 0 0-32c0-17.7-14.3-32-32-32l-117.5 0c-25.5 0-49.9-10.1-67.9-28.1L204.1 73.4c-6-6-14.1-9.4-22.6-9.4L64 64C46.3 64 32 78.3 32 96zM49.1 426.1c-2 4.9-1.4 10.5 1.6 14.9s7.9 7 13.2 7l320 0 80 0c6.5 0 12.4-4 14.9-10.1l64-160c2-4.9 1.4-10.5-1.6-14.9s-7.9-7-13.2-7l-400 0c-6.5 0-12.4 4-14.9 10.1l-64 160z"/><path d="M448 160l0 32 32 0 0-32c0-35.3-28.7-64-64-64L298.5 96c-17 0-33.3-6.7-45.3-18.7L226.7 50.7c-12-12-28.3-18.7-45.3-18.7L64 32C28.7 32 0 60.7 0 96L0 416c0 35.3 28.7 64 64 64l320 0 80 0c19.6 0 37.3-11.9 44.6-30.2l64-160c5.9-14.8 4.1-31.5-4.8-44.7S543.9 224 528 224l-400 0c-19.6 0-37.3 11.9-44.6 30.2L32 382.8 32 96c0-17.7 14.3-32 32-32l117.5 0c8.5 0 16.6 3.4 22.6 9.4l22.6-22.6L204.1 73.4l26.5 26.5c18 18 42.4 28.1 67.9 28.1L416 128c17.7 0 32 14.3 32 32zM384 448L64 448c-5.3 0-10.3-2.6-13.2-7s-3.6-10-1.6-14.9l64-160c2.4-6.1 8.3-10.1 14.9-10.1l400 0c5.3 0 10.3 2.6 13.2 7s3.6 10 1.6 14.9l-64 160C476.4 444 470.5 448 464 448l-80 0z"/></svg>`,
    radio: `<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 5 5" aria-hidden="true"><circle class="fa-primary" cx="2.5" cy="2.5" r="2.5" ></circle><circle class="fa-secondary" cx="2.5" cy="2.5" r="1.25"></circle></svg>`,
    chevron: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" fill="currentColor"><!--!Font Awesome Pro 6.5.1 by @fontawesome - https://fontawesome.com License - https://fontawesome.com/license (Commercial License) Copyright 2024 Fonticons, Inc.--><path d="M267.3 395.3c-6.2 6.2-16.4 6.2-22.6 0l-192-192c-6.2-6.2-6.2-16.4 0-22.6s16.4-6.2 22.6 0L256 361.4 436.7 180.7c6.2-6.2 16.4-6.2 22.6 0s6.2 16.4 0 22.6l-192 192z"/></svg>`,
    folder: {
      open: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 576 512"><!--!Font Awesome Pro 6.7.2 by @fontawesome - https://fontawesome.com License - https://fontawesome.com/license (Commercial License) Copyright 2025 Fonticons, Inc.--><path class="fa-secondary" opacity=".4" d="M32 64l0 280.4L108.2 192 448 192l0-64-176 0-13.3 0-9.4-9.4L194.7 64 32 64zM51.8 448L384 448l44.2 0 96-192-376.4 0-96 192z"/><path class="fa-primary" d="M272 96L208 32 32 32 0 32 0 64 0 448l0 32 32 0 3.8 0L384 480l64 0L560 256l16-32-35.8 0L128 224 32 416 32 64l162.7 0 54.6 54.6 9.4 9.4 13.3 0 176 0 0 64 32 0 0-64 0-32-32 0L272 96zM51.8 448l96-192 376.4 0-96 192L384 448 51.8 448z"/></svg>`,
      closed: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512"><!--!Font Awesome Pro 6.7.2 by @fontawesome - https://fontawesome.com License - https://fontawesome.com/license (Commercial License) Copyright 2025 Fonticons, Inc.--><path class="fa-secondary" opacity=".4" d="M32 224l448 0 0 224L32 448l0-224z"/><path class="fa-primary" d="M32 32l192 0 48 64 208 0 32 0 0 32 0 320 0 32-32 0L32 480 0 480l0-32L0 64 0 32l32 0zm240 96l-16 0-9.6-12.8L208 64 32 64l0 128 448 0 0-64-208 0zM32 224l0 224 448 0 0-224L32 224z"/></svg>`
    },
    updown: `<svg viewBox="0 0 15 15" fill="none" xmlns="http://www.w3.org/2000/svg"><path class="fa-primary" d="M4.93179 5.43179C4.75605 5.60753 4.75605 5.89245 4.93179 6.06819C5.10753 6.24392 5.39245 6.24392 5.56819 6.06819L7.49999 4.13638L9.43179 6.06819C9.60753 6.24392 9.89245 6.24392 10.0682 6.06819C10.2439 5.89245 10.2439 5.60753 10.0682 5.43179L7.81819 3.18179C7.73379 3.0974 7.61933 3.04999 7.49999 3.04999C7.38064 3.04999 7.26618 3.0974 7.18179 3.18179L4.93179 5.43179ZM10.0682 9.56819C10.2439 9.39245 10.2439 9.10753 10.0682 8.93179C9.89245 8.75606 9.60753 8.75606 9.43179 8.93179L7.49999 10.8636L5.56819 8.93179C5.39245 8.75606 5.10753 8.75606 4.93179 8.93179C4.75605 9.10753 4.75605 9.39245 4.93179 9.56819L7.18179 11.8182C7.35753 11.9939 7.64245 11.9939 7.81819 11.8182L10.0682 9.56819Z" fill="currentColor" fill-rule="evenodd" clip-rule="evenodd"></path></svg>`,
    star: {
      solid: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 576 512" fill="currentColor"><!--!Font Awesome Pro 6.6.0 by @fontawesome - https://fontawesome.com License - https://fontawesome.com/license (Commercial License) Copyright 2024 Fonticons, Inc.--><path d="M288.1 0l86.5 164 182.7 31.6L428 328.5 454.4 512 288.1 430.2 121.7 512l26.4-183.5L18.9 195.6 201.5 164 288.1 0z"/></svg>`,
      light: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 576 512" fill="currentColor"><!--!Font Awesome Pro 6.6.0 by @fontawesome - https://fontawesome.com License - https://fontawesome.com/license (Commercial License) Copyright 2024 Fonticons, Inc.--><path d="M374.6 164L306.1 34.3 288.1 0 270 34.3 201.5 164 57.1 189l-38.2 6.6 27 27.8L148.1 328.5 127.2 473.6 121.7 512l34.8-17.1 131.6-64.7 131.6 64.7L454.4 512l-5.5-38.4L428 328.5 530.2 223.4l27-27.8L519 189 374.6 164zM492 216.8l-86.9 89.4-11 11.3 2.2 15.6 17.8 123.5-111.9-55-14.1-6.9-14.1 6.9L162 456.5l17.8-123.5 2.2-15.6-11-11.3L84.1 216.8 207 195.5l15.5-2.7 7.3-13.9L288.1 68.6l58.2 110.3 7.3 13.9 15.5 2.7L492 216.8z"/></svg>`
    },
    question: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 640 512"><!--!Font Awesome Pro 6.6.0 by @fontawesome - https://fontawesome.com License - https://fontawesome.com/license (Commercial License) Copyright 2024 Fonticons, Inc.--><path class="fa-secondary" opacity=".4" d="M0 176c0 37.5 13.9 72.3 37.6 100.9L0 352l108.1-21.6C137.7 344.2 171.8 352 208 352c114.9 0 208-78.8 208-176S322.9 0 208 0S0 78.8 0 176zm134.7-52c0-25.8 20.9-46.7 46.7-46.7l47.4 0c29.1 0 52.6 23.6 52.6 52.6c0 18.8-10.1 36.3-26.4 45.6L228 191l0 6.3 0 20-40 0 0-20 0-17.9 0-11.6 10-5.8L235 140.9c3.9-2.3 6.3-6.4 6.3-10.9c0-7-5.7-12.6-12.6-12.6l-47.4 0c-3.7 0-6.7 3-6.7 6.7l0 5.5-40 0 0-5.5zM188 250.7l40 0 0 40-40 0 0-40z"/><path class="fa-primary" d="M134.7 124c0-25.8 20.9-46.7 46.7-46.7l47.4 0c29.1 0 52.6 23.6 52.6 52.6c0 18.8-10.1 36.3-26.4 45.6L228 191l0 6.3 0 20-40 0 0-20 0-17.9 0-11.6 10-5.8L235 140.9c3.9-2.3 6.3-6.4 6.3-10.9c0-7-5.7-12.6-12.6-12.6l-47.4 0c-3.7 0-6.7 3-6.7 6.7l0 5.5-40 0 0-5.5zM188 250.7l40 0 0 40-40 0 0-40zM432 512c-95.6 0-176.2-54.6-200.5-129C348.9 372.9 448 288.3 448 176c0-5.2-.2-10.4-.6-15.5C555.1 167.1 640 243.2 640 336c0 37.5-13.9 72.3-37.6 100.9L640 512 531.9 490.4C502.3 504.2 468.2 512 432 512z"/></svg>`,
    icon: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512"  fill="currentColor"> <!--!Font Awesome Pro 6.5.1 by @fontawesome - https://fontawesome.com License - https://fontawesome.com/license (Commercial License) Copyright 2024 Fonticons, Inc.--><path d="M256 32a224 224 0 1 1 0 448 224 224 0 1 1 0-448zm0 480A256 256 0 1 0 256 0a256 256 0 1 0 0 512zM192 352v32h16 96 16V352H304 272V240 224H256 216 200v32h16 24v96H208 192zm88-168V136H232v48h48z"/></svg>`,
    checked: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" fill="currentColor"><!--!Font Awesome Free 6.5.1 by @fontawesome - https://fontawesome.com License - https://fontawesome.com/license/free Copyright 2024 Fonticons, Inc.--><path d="M256 512A256 256 0 1 0 256 0a256 256 0 1 0 0 512zM369 209L241 337c-9.4 9.4-24.6 9.4-33.9 0l-64-64c-9.4-9.4-9.4-24.6 0-33.9s24.6-9.4 33.9 0l47 47L335 175c9.4-9.4 24.6-9.4 33.9 0s9.4 24.6 0 33.9z"/></svg>`,
    danger: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" fill="currentColor"><!--!Font Awesome Free 6.5.1 by @fontawesome - https://fontawesome.com License - https://fontawesome.com/license/free Copyright 2024 Fonticons, Inc.--><path d="M256 512A256 256 0 1 0 256 0a256 256 0 1 0 0 512zm0-384c13.3 0 24 10.7 24 24V264c0 13.3-10.7 24-24 24s-24-10.7-24-24V152c0-13.3 10.7-24 24-24zM224 352a32 32 0 1 1 64 0 32 32 0 1 1 -64 0z"/></svg>`,
    loading: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" fill="currentColor"><!--!Font Awesome Pro 6.5.1 by @fontawesome - https://fontawesome.com License - https://fontawesome.com/license (Commercial License) Copyright 2024 Fonticons, Inc.--><path d="M207.4 20.4c2.4 8.5-2.6 17.3-11.2 19.7C101.5 66.2 32 153 32 256c0 123.7 100.3 224 224 224s224-100.3 224-224c0-103-69.5-189.8-164.3-215.9c-8.5-2.4-13.5-11.2-11.2-19.7s11.2-13.5 19.7-11.2C432.5 39.1 512 138.2 512 256c0 141.4-114.6 256-256 256S0 397.4 0 256C0 138.2 79.5 39.1 187.7 9.2c8.5-2.4 17.3 2.6 19.7 11.2z"/></svg>`,
    close_box: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 384 512" fill="currentColor"><!--!Font Awesome Pro 6.6.0 by @fontawesome - https://fontawesome.com License - https://fontawesome.com/license (Commercial License) Copyright 2024 Fonticons, Inc.--><path d="M192 233.4L59.5 100.9 36.9 123.5 169.4 256 36.9 388.5l22.6 22.6L192 278.6 324.5 411.1l22.6-22.6L214.6 256 347.1 123.5l-22.6-22.6L192 233.4z"/></svg>`
  };
  var icons_default = x4icons;

  // node_modules/x4js/src/components/menu/menu.ts
  var OPEN_DELAY = 400;
  var _CMenuSep_decorators, _init21, _a21;
  _CMenuSep_decorators = [class_ns("x4")];
  var _CMenuSep = class _CMenuSep extends (_a21 = Component2) {
    constructor() {
      super({});
    }
  };
  _init21 = __decoratorStart(_a21);
  _CMenuSep = __decorateElement(_init21, 0, "CMenuSep", _CMenuSep_decorators, _CMenuSep);
  __name(_CMenuSep, "CMenuSep");
  __runInitializers(_init21, 1, _CMenuSep);
  var CMenuSep = _CMenuSep;
  var openTimer = new Timer();
  var _CMenuItem_decorators, _init22, _a22;
  _CMenuItem_decorators = [class_ns("x4")];
  var _CMenuItem = class _CMenuItem extends (_a22 = Component2) {
    constructor(itm) {
      super({ disabled: itm.disabled, cls: itm.cls });
      __publicField(this, "menu");
      if (itm.menu) {
        this.addClass("popup");
      }
      let iconId = itm.icon;
      if (!iconId && itm.checked) {
        const chk = isFunction(itm.checked) ? itm.checked() : itm.checked;
        if (chk) {
          iconId = icons_default.check;
        }
      }
      this.setContent([
        new Icon2({ id: "icon", iconId }),
        new Component2({ id: "text", content: itm.text })
      ]);
      if (itm.menu) {
        this.menu = itm.menu;
        this.addDOMEvent("mouseenter", () => this.openSub(true));
        this.addDOMEvent("click", () => this.openSub(false));
        this.addDOMEvent("mouseleave", () => this.closeSub());
        this.menu.on("opened", () => this.addClass("opened"));
        this.menu.on("closed", () => this.removeClass("opened"));
      } else {
        this.addDOMEvent("mouseenter", () => {
          openTimer.setTimeout("open", OPEN_DELAY, () => {
            this.dismiss(true);
          });
        });
        this.addDOMEvent("click", () => {
          this.dismiss(false);
          if (itm.click) {
            itm.click(new Event("click"));
          }
        });
      }
    }
    /**
     * 
     */
    dismiss(after) {
      const menu = this.parentElement(Menu);
      if (menu) {
        menu.dismiss(after);
      }
    }
    /**
     * 
     */
    openSub(delayed) {
      const open = /* @__PURE__ */ __name(() => {
        this.dismiss(true);
        const rc = this.getBoundingRect();
        this.menu.displayAt(rc.right - 4, rc.top);
      }, "open");
      if (delayed) {
        openTimer.setTimeout("open", OPEN_DELAY, open);
      } else {
        openTimer.clearTimeout("open");
        open();
      }
    }
    closeSub() {
      openTimer.clearTimeout("open");
    }
  };
  _init22 = __decoratorStart(_a22);
  _CMenuItem = __decorateElement(_init22, 0, "CMenuItem", _CMenuItem_decorators, _CMenuItem);
  __name(_CMenuItem, "CMenuItem");
  __runInitializers(_init22, 1, _CMenuItem);
  var CMenuItem = _CMenuItem;
  var _Menu_decorators, _init23, _a23;
  _Menu_decorators = [class_ns("x4")];
  var _Menu = class _Menu extends (_a23 = Popup) {
    constructor(props) {
      super({ ...props, autoClose: "menu" });
      this.addClass("x4vbox");
      if (props.items) {
        let children = props.items.filter((x) => !!x);
        while (children.at(0) == "-") {
          children.shift();
        }
        while (children.at(-1) == "-") {
          children.pop();
        }
        const items = children.map((itm) => {
          if (itm === "-") {
            return new CMenuSep();
          } else if (isString(itm)) {
            return new CMenuItem({ text: itm, click: null, cls: "title" });
          } else if (itm instanceof Component2) {
            return itm;
          } else {
            return new CMenuItem(itm);
          }
        });
        this.setContent(items);
      }
    }
  };
  _init23 = __decoratorStart(_a23);
  _Menu = __decorateElement(_init23, 0, "Menu", _Menu_decorators, _Menu);
  __name(_Menu, "Menu");
  __runInitializers(_init23, 1, _Menu);
  var Menu = _Menu;

  // x4-raw-file:C:\dev\rlibre\y4-2026\demo\frontend\node_modules\x4js\src\components\calendar\chevron-left-sharp-light.svg
  var chevron_left_sharp_light_default = "data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCAzMjAgNTEyIiBmaWxsPSJjdXJyZW50Q29sb3IiPjwhLS0hRm9udCBBd2Vzb21lIFBybyA2LjYuMCBieSBAZm9udGF3ZXNvbWUgLSBodHRwczovL2ZvbnRhd2Vzb21lLmNvbSBMaWNlbnNlIC0gaHR0cHM6Ly9mb250YXdlc29tZS5jb20vbGljZW5zZSAoQ29tbWVyY2lhbCBMaWNlbnNlKSBDb3B5cmlnaHQgMjAyNCBGb250aWNvbnMsIEluYy4tLT48cGF0aCBkPSJNOS40IDI1NmwxMS4zLTExLjMgMTkyLTE5MkwyMjQgNDEuNCAyNDYuNiA2NCAyMzUuMyA3NS4zIDU0LjYgMjU2IDIzNS4zIDQzNi43IDI0Ni42IDQ0OCAyMjQgNDcwLjZsLTExLjMtMTEuMy0xOTItMTkyTDkuNCAyNTZ6Ii8+PC9zdmc+";

  // x4-raw-file:C:\dev\rlibre\y4-2026\demo\frontend\node_modules\x4js\src\components\calendar\calendar-check-sharp-light.svg
  var calendar_check_sharp_light_default = "data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCA0NDggNTEyIiBmaWxsPSJjdXJyZW50Q29sb3IiPjwhLS0hRm9udCBBd2Vzb21lIFBybyA2LjYuMCBieSBAZm9udGF3ZXNvbWUgLSBodHRwczovL2ZvbnRhd2Vzb21lLmNvbSBMaWNlbnNlIC0gaHR0cHM6Ly9mb250YXdlc29tZS5jb20vbGljZW5zZSAoQ29tbWVyY2lhbCBMaWNlbnNlKSBDb3B5cmlnaHQgMjAyNCBGb250aWNvbnMsIEluYy4tLT48cGF0aCBkPSJNMTI4IDE2bDAtMTZMOTYgMGwwIDE2IDAgNDhMMzIgNjQgMCA2NCAwIDk2bDAgNjQgMCAzMkwwIDQ4MGwwIDMyIDMyIDAgMzg0IDAgMzIgMCAwLTMyIDAtMjg4IDAtMzIgMC02NCAwLTMyLTMyIDAtNjQgMCAwLTQ4IDAtMTZMMzIwIDBsMCAxNiAwIDQ4TDEyOCA2NGwwLTQ4ek0zMiAxOTJsMzg0IDAgMCAyODhMMzIgNDgwbDAtMjg4em0wLTk2bDM4NCAwIDAgNjRMMzIgMTYwbDAtNjR6TTMzMS4zIDI4My4zTDM0Mi42IDI3MiAzMjAgMjQ5LjRsLTExLjMgMTEuM0wyMDggMzYxLjRsLTUyLjctNTIuN0wxNDQgMjk3LjQgMTIxLjQgMzIwbDExLjMgMTEuMyA2NCA2NEwyMDggNDA2LjZsMTEuMy0xMS4zIDExMi0xMTJ6Ii8+PC9zdmc+";

  // x4-raw-file:C:\dev\rlibre\y4-2026\demo\frontend\node_modules\x4js\src\components\calendar\chevron-right-sharp-light.svg
  var chevron_right_sharp_light_default = "data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCAzMjAgNTEyIiBmaWxsPSJjdXJyZW50Q29sb3IiPjwhLS0hRm9udCBBd2Vzb21lIFBybyA2LjYuMCBieSBAZm9udGF3ZXNvbWUgLSBodHRwczovL2ZvbnRhd2Vzb21lLmNvbSBMaWNlbnNlIC0gaHR0cHM6Ly9mb250YXdlc29tZS5jb20vbGljZW5zZSAoQ29tbWVyY2lhbCBMaWNlbnNlKSBDb3B5cmlnaHQgMjAyNCBGb250aWNvbnMsIEluYy4tLT48cGF0aCBkPSJNMzEwLjYgMjU2bC0xMS4zIDExLjMtMTkyIDE5Mkw5NiA0NzAuNiA3My40IDQ0OGwxMS4zLTExLjNMMjY1LjQgMjU2IDg0LjcgNzUuMyA3My40IDY0IDk2IDQxLjRsMTEuMyAxMS4zIDE5MiAxOTJMMzEwLjYgMjU2eiIvPjwvc3ZnPg==";

  // node_modules/x4js/src/components/calendar/calendar.ts
  var _Calendar_decorators, _init24, _a24;
  _Calendar_decorators = [class_ns("x4")];
  var _Calendar = class _Calendar extends (_a24 = VBox) {
    constructor(props) {
      super(props);
      __publicField(this, "m_date");
      this.mapPropEvents(props, "change");
      this.m_date = props.date ? date_clone(props.date) : /* @__PURE__ */ new Date();
      this._update();
    }
    /** @ignore */
    _update() {
      let month_start = date_clone(this.m_date);
      month_start.setDate(1);
      let day = month_start.getDay();
      if (day == 0) {
        day = 7;
      }
      month_start.setDate(-day + 1 + 1);
      let dte = date_clone(month_start);
      let selection = date_hash(this.m_date);
      let today = date_hash(/* @__PURE__ */ new Date());
      let month_end = date_clone(this.m_date);
      month_end.setDate(1);
      month_end.setMonth(month_end.getMonth() + 1);
      month_end.setDate(0);
      let end_of_month = date_hash(month_end);
      let rows = [];
      let header = new HBox({
        cls: "month-sel",
        content: [
          new Label({
            cls: "month",
            text: formatIntlDate(this.m_date, "O"),
            dom_events: {
              click: /* @__PURE__ */ __name(() => this._choose("month"), "click")
            }
          }),
          new Label({
            cls: "year",
            text: formatIntlDate(this.m_date, "Y"),
            dom_events: {
              click: /* @__PURE__ */ __name(() => this._choose("year"), "click")
            }
          }),
          new Flex(),
          new Button({ icon: chevron_left_sharp_light_default, click: /* @__PURE__ */ __name(() => this._next(false), "click") }),
          new Button({ icon: calendar_check_sharp_light_default, click: /* @__PURE__ */ __name(() => this.setDate(/* @__PURE__ */ new Date()), "click"), tooltip: _tr.global.today }),
          new Button({ icon: chevron_right_sharp_light_default, click: /* @__PURE__ */ __name(() => this._next(true), "click") })
        ]
      });
      rows.push(header);
      let day_names = [];
      day_names.push(new HBox({
        cls: "weeknum cell"
      }));
      for (let d = 0; d < 7; d++) {
        day_names.push(new Label({
          cls: "cell",
          text: _tr.global.day_short[(d + 1) % 7]
        }));
      }
      rows.push(new HBox({
        cls: "week header",
        content: day_names
      }));
      let cmonth = this.m_date.getMonth();
      let first = true;
      while (date_hash(dte) <= end_of_month) {
        let days = [
          new HBox({ cls: "weeknum cell", content: new Component2({ tag: "span", content: formatIntlDate(dte, "w") }) })
        ];
        for (let d = 0; d < 7; d++) {
          let cls = "cell day";
          if (date_hash(dte) == selection) {
            cls += " selection";
          }
          if (date_hash(dte) == today) {
            cls += " today";
          }
          if (dte.getMonth() != cmonth) {
            cls += " out";
          }
          const mkItem = /* @__PURE__ */ __name((dte2) => {
            return new HBox({
              cls,
              flex: 1,
              content: new Component2({
                cls: "text",
                content: unsafeHtml(`<span>${formatIntlDate(dte2, "d")}</span>`)
              }),
              dom_events: {
                click: /* @__PURE__ */ __name(() => this.select(dte2), "click")
              }
            });
          }, "mkItem");
          days.push(mkItem(date_clone(dte)));
          dte.setDate(dte.getDate() + 1);
          first = false;
        }
        rows.push(new HBox({
          cls: "week",
          flex: 1,
          content: days
        }));
      }
      this.setContent(rows);
    }
    /**
     * select the given date
     * @param date 
     */
    select(date) {
      this.m_date = date;
      this.fire("change", { value: date });
      this._update();
    }
    /**
     * 
     */
    _next(n) {
      this.m_date.setMonth(this.m_date.getMonth() + (n ? 1 : -1));
      this._update();
    }
    /**
     * 
     */
    _choose(type) {
      let items = [];
      if (type == "month") {
        for (let m = 0; m < 12; m++) {
          items.push({
            text: _tr.global.month_long[m],
            click: /* @__PURE__ */ __name(() => {
              this.m_date.setMonth(m);
              this._update();
            }, "click")
          });
        }
      } else if (type == "year") {
        let min = this.props.minDate?.getFullYear() ?? 1900;
        let max = this.props.maxDate?.getFullYear() ?? 2037;
        for (let m = max; m >= min; m--) {
          items.push({
            text: "" + m,
            click: /* @__PURE__ */ __name(() => {
              this.m_date.setFullYear(m);
              this._update();
            }, "click")
          });
        }
      }
      let menu = new Menu({
        items
      });
      let rc = this.getBoundingRect();
      menu.displayAt(rc.left, rc.top);
    }
    getDate() {
      return this.m_date;
    }
    setDate(date) {
      this.m_date = date;
      this._update();
    }
  };
  _init24 = __decoratorStart(_a24);
  _Calendar = __decorateElement(_init24, 0, "Calendar", _Calendar_decorators, _Calendar);
  __name(_Calendar, "Calendar");
  __runInitializers(_init24, 1, _Calendar);
  var Calendar = _Calendar;

  // node_modules/x4js/src/components/canvas/canvas_ex.ts
  function createPainter(c2d, w, h) {
    let cp = c2d;
    cp.width = w;
    cp.height = h;
    cp.smoothLine = smoothLine;
    cp.smoothLineEx = smoothLineEx;
    cp.line = line;
    cp.roundRect = roundRect;
    cp.calcTextSize = calcTextSize;
    cp.setFontSize = setFontSize;
    cp.circle = circle;
    return cp;
  }
  __name(createPainter, "createPainter");
  function smoothLine(points, path = null, move = true) {
    if (points.length < 2) {
      return;
    }
    if (!path) {
      path = this;
    }
    if (points.length == 2) {
      if (move !== false) {
        path.moveTo(points[0].x, points[0].y);
      } else {
        path.lineTo(points[0].x, points[0].y);
      }
      path.lineTo(points[1].x, points[1].y);
      return;
    }
    function midPointBtw(p12, p22) {
      return {
        x: p12.x + (p22.x - p12.x) / 2,
        y: p12.y + (p22.y - p12.y) / 2
      };
    }
    __name(midPointBtw, "midPointBtw");
    function getQuadraticXY(t, sx, sy, cp1x, cp1y, ex, ey) {
      return {
        x: (1 - t) * (1 - t) * sx + 2 * (1 - t) * t * cp1x + t * t * ex,
        y: (1 - t) * (1 - t) * sy + 2 * (1 - t) * t * cp1y + t * t * ey
      };
    }
    __name(getQuadraticXY, "getQuadraticXY");
    let p1 = points[0], p2 = points[1], p3 = p1;
    path.moveTo(p1.x, p1.y);
    for (let i = 1, len = points.length; i < len; i++) {
      let midPoint = midPointBtw(p1, p2);
      for (let i2 = 0; i2 < 8; i2++) {
        let { x, y } = getQuadraticXY(i2 / 8, p3.x, p3.y, p1.x, p1.y, midPoint.x, midPoint.y);
        path.lineTo(x, y);
      }
      p1 = points[i];
      p2 = points[i + 1];
      p3 = midPoint;
    }
    path.lineTo(p1.x, p1.y);
  }
  __name(smoothLine, "smoothLine");
  function smoothLineEx(_points, tension = 0.5, numOfSeg = 10, path = null, move = true, close = false) {
    let points = [];
    for (let p = 0, pc = _points.length; p < pc; p++) {
      points.push(_points[p].x);
      points.push(_points[p].y);
    }
    let pts, i = 1, l = points.length, rPos = 0, rLen = (l - 2) * numOfSeg + 2 + (close ? 2 * numOfSeg : 0), res = new Float32Array(rLen), cache = new Float32Array((numOfSeg + 2) * 4), cachePtr = 4;
    pts = points.slice(0);
    if (close) {
      pts.unshift(points[l - 1]);
      pts.unshift(points[l - 2]);
      pts.push(points[0], points[1]);
    } else {
      pts.unshift(points[1]);
      pts.unshift(points[0]);
      pts.push(points[l - 2], points[l - 1]);
    }
    cache[0] = 1;
    for (; i < numOfSeg; i++) {
      const st = i / numOfSeg, st2 = st * st, st3 = st2 * st, st23 = st3 * 2, st32 = st2 * 3;
      cache[cachePtr++] = st23 - st32 + 1;
      cache[cachePtr++] = st32 - st23;
      cache[cachePtr++] = st3 - 2 * st2 + st;
      cache[cachePtr++] = st3 - st2;
    }
    cache[cachePtr] = 1;
    parse(pts, cache, l);
    if (close) {
      pts = [];
      pts.push(points[l - 4], points[l - 3], points[l - 2], points[l - 1]);
      pts.push(points[0], points[1], points[2], points[3]);
      parse(pts, cache, 4);
    }
    function parse(pts2, cache2, l2) {
      for (let i2 = 2, t; i2 < l2; i2 += 2) {
        let pt1 = pts2[i2], pt2 = pts2[i2 + 1], pt3 = pts2[i2 + 2], pt4 = pts2[i2 + 3], t1x = (pt3 - pts2[i2 - 2]) * tension, t1y = (pt4 - pts2[i2 - 1]) * tension, t2x = (pts2[i2 + 4] - pt1) * tension, t2y = (pts2[i2 + 5] - pt2) * tension;
        for (t = 0; t < numOfSeg; t++) {
          let c = t << 2, c1 = cache2[c], c2 = cache2[c + 1], c3 = cache2[c + 2], c4 = cache2[c + 3];
          res[rPos++] = c1 * pt1 + c2 * pt3 + c3 * t1x + c4 * t2x;
          res[rPos++] = c1 * pt2 + c2 * pt4 + c3 * t1y + c4 * t2y;
        }
      }
    }
    __name(parse, "parse");
    l = close ? 0 : points.length - 2;
    res[rPos++] = points[l];
    res[rPos] = points[l + 1];
    if (!path) {
      path = this;
    }
    for (let i2 = 0, l2 = res.length; i2 < l2; i2 += 2) {
      if (i2 == 0 && move !== false) {
        path.moveTo(res[i2], res[i2 + 1]);
      } else {
        path.lineTo(res[i2], res[i2 + 1]);
      }
    }
  }
  __name(smoothLineEx, "smoothLineEx");
  function line(x1, y1, x2, y2, color, lineWidth = 1) {
    this.save();
    this.beginPath();
    this.moveTo(x1, y1);
    this.lineTo(x2, y2);
    this.lineWidth = lineWidth;
    this.strokeStyle = color;
    this.stroke();
    this.restore();
  }
  __name(line, "line");
  function roundRect(x, y, width, height, radius) {
    this.moveTo(x + radius, y);
    this.lineTo(x + width - radius, y);
    this.quadraticCurveTo(x + width, y, x + width, y + radius);
    this.lineTo(x + width, y + height - radius);
    this.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
    this.lineTo(x + radius, y + height);
    this.quadraticCurveTo(x, y + height, x, y + height - radius);
    this.lineTo(x, y + radius);
    this.quadraticCurveTo(x, y, x + radius, y);
    this.closePath();
  }
  __name(roundRect, "roundRect");
  function calcTextSize(text, rounded = false) {
    let fh = this.measureText(text);
    let lh = fh.fontBoundingBoxAscent + fh.fontBoundingBoxDescent;
    if (rounded) {
      return { width: Math.round(fh.width), height: Math.round(lh) };
    } else {
      return { width: fh.width, height: lh };
    }
  }
  __name(calcTextSize, "calcTextSize");
  function setFontSize(fs) {
    let fsize = Math.round(fs) + "px";
    this.font = this.font.replace(/\d+px/, fsize);
  }
  __name(setFontSize, "setFontSize");
  function circle(x, y, radius) {
    this.moveTo(x + radius, y);
    this.arc(x, y, radius, 0, Math.PI * 2);
  }
  __name(circle, "circle");

  // node_modules/x4js/src/components/canvas/canvas.ts
  var _Canvas_decorators, _update_rep, _pixel_ratio, _init25, _a25;
  _Canvas_decorators = [class_ns("x4")];
  var _Canvas = class _Canvas extends (_a25 = Component2) {
    constructor(props) {
      super(props);
      __publicField(this, "m_iwidth", -1);
      __publicField(this, "m_iheight", -1);
      __publicField(this, "m_scale", 1);
      __publicField(this, "m_canvas");
      /**
       * redraw the canvas (force a paint)
       */
      __privateAdd(this, _update_rep, 0);
      /**
       * 
       */
      __privateAdd(this, _pixel_ratio, -1);
      this.mapPropEvents(props, "paint");
      this.addDOMEvent("resized", () => {
        this._paint();
      });
      this.m_iwidth = -1;
      this.m_iheight = -1;
      this.m_canvas = new Component2({
        tag: "canvas"
      });
      this.setContent(this.m_canvas);
    }
    /**
     * scale the whole canvas
     */
    scale(scale) {
      this.m_scale = scale;
      this.m_iwidth = -1;
      this.redraw();
    }
    /**
     * return the internal canvas
     */
    get canvas() {
      return this.m_canvas;
    }
    getContext() {
      return this.m_canvas.dom.getContext("2d");
    }
    redraw(wait) {
      if (wait !== void 0) {
        if (++__privateWrapper(this, _update_rep)._ >= 20) {
          this.clearTimeout("update");
          this._paint();
        } else {
          this.setTimeout("update", wait, () => this._paint());
        }
      } else {
        this.clearTimeout("update");
        this._paint();
      }
    }
    // can change when moving to another screen
    _paint() {
      __privateSet(this, _update_rep, 0);
      if (!this.isVisible()) {
        return;
      }
      const dom = this.dom;
      const w = dom.clientWidth;
      const h = dom.clientHeight;
      if (!w || !h) {
        return;
      }
      const ctx = this.getContext();
      const ratio = window.devicePixelRatio || 1;
      if (w !== this.m_iwidth || h !== this.m_iheight || ratio !== __privateGet(this, _pixel_ratio)) {
        const canvas = this.canvas;
        canvas.setAttribute("width", "" + Math.round(w * ratio));
        canvas.setAttribute("height", "" + Math.round(h * ratio));
        canvas.setStyleValue("width", w);
        canvas.setStyleValue("height", h);
        this.m_iwidth = w;
        this.m_iheight = h;
        __privateSet(this, _pixel_ratio, ratio);
      }
      const scale = ratio * this.m_scale;
      ctx.setTransform(scale, 0, 0, scale, 0, 0);
      const cc = createPainter(ctx, w, h);
      if (this.props.clear) {
        cc.clearRect(
          0,
          0,
          w / this.m_scale,
          h / this.m_scale
        );
      }
      cc.save();
      cc.translate(-0.5, -0.5);
      this.paint(cc);
      cc.restore();
    }
    paint(ctx) {
      try {
        if (this.props.paint_cb) {
          this.props.paint_cb(ctx);
        } else {
          this.fire("paint", { ctx });
        }
      } catch (x) {
        console.assert(false, x);
      }
    }
  };
  _init25 = __decoratorStart(_a25);
  _update_rep = new WeakMap();
  _pixel_ratio = new WeakMap();
  _Canvas = __decorateElement(_init25, 0, "Canvas", _Canvas_decorators, _Canvas);
  __name(_Canvas, "Canvas");
  __runInitializers(_init25, 1, _Canvas);
  var Canvas = _Canvas;

  // node_modules/x4js/src/components/input/input.ts
  function getRadioOwner(el) {
    while (el != document.body) {
      const comp = componentFromDOM(el);
      const ifx = comp.queryInterface("tab-handler");
      if (ifx) {
        return el;
      }
      el = el.parentElement;
    }
    return document;
  }
  __name(getRadioOwner, "getRadioOwner");
  var _Input_decorators, _init26, _a26;
  _Input_decorators = [class_ns("x4")];
  var _Input = class _Input extends (_a26 = Component2) {
    constructor(props) {
      super({ tag: "input", ...props });
      this.mapPropEvents(props, "focus", "change");
      this.setAttribute("type", props.type ?? "text");
      this.setAttribute("name", props.name);
      if (props.autofocus === true) {
        this.setAttribute("autofocus", true);
      }
      switch (props.type) {
        case "checkbox":
        case "radio": {
          const ck = this.dom;
          ck.checked = props.checked;
          ck.value = props.value === void 0 ? "" : props.value + "";
          break;
        }
        case "range": {
          this.setAttribute("min", props.min);
          this.setAttribute("max", props.max);
          this.setAttribute("step", props.step);
          this.setAttribute("value", props.value);
          break;
        }
        case "number": {
          const p = this.props;
          this.setAttribute("required", p.required);
          this.setAttribute("readonly", p.readonly);
          this.setAttribute("min", p.min);
          this.setAttribute("max", p.max);
          this.setAttribute("step", p.step);
          this.setNumValue(isString(p.value) ? parseFloat(p.value) : p.value, -2);
          this.addDOMEvent("wheel", (e) => {
            if (this.hasFocus()) {
              e.preventDefault();
              let v = this.getNumValue();
              const delta = e.deltaY < 0 ? 1 : -1;
              v += (p.step ? p.step : 1) * delta;
              this.setNumValue(v, -2);
              this.dom.dispatchEvent(new Event("input"));
            }
          });
          break;
        }
        case "date": {
          this.setAttribute("required", props.required);
          let v = props.value;
          if (v instanceof Date) {
            this.setAttribute("value", formatIntlDate(v, "Y-M-D"));
          } else if (props.value !== null && props.value !== void 0) {
            this.setAttribute("value", v);
          }
          break;
        }
        case "file": {
          let v;
          if (Array.isArray(props.accept)) {
            v = props.accept.join(",");
          } else {
            v = props.accept;
          }
          this.setAttribute("accept", v);
          break;
        }
        case "time": {
          this.setAttribute("required", props.required);
          if (props.value !== null && props.value !== void 0) {
            this.setAttribute("value", props.value);
          }
          break;
        }
        default: {
          this.setAttribute("required", props.required);
          this.setAttribute("readonly", props.readonly);
          if (props.value !== null && props.value !== void 0) {
            this.setAttribute("value", props.value);
          }
          if (props.pattern !== null && props.pattern !== void 0) {
            this.setAttribute("pattern", props.pattern);
          }
          if (props.placeholder !== null && props.placeholder !== void 0) {
            this.setAttribute("placeholder", props.placeholder);
          }
          if (props.spellcheck === false) {
            this.setAttribute("spellcheck", false);
          }
          if (props.minlength !== void 0) {
            this.setAttribute("minlength", props.minlength);
          }
          if (props.maxlength !== void 0) {
            this.setAttribute("maxlength", props.maxlength);
          }
          break;
        }
      }
      this.addDOMEvent("blur", (e) => {
        this.on_focus(e, true);
      });
      this.addDOMEvent("focus", (e) => {
        this.on_focus(e, false);
      });
      this.addDOMEvent("input", (e) => {
        this.on_change(e);
      });
    }
    /**
     * 
     */
    on_focus(ev, focus_out) {
      const event = { focus_out };
      this.fire("focus", event);
      if (event.defaultPrevented) {
        ev.preventDefault();
      }
    }
    /**
     * 
     */
    on_change(ev) {
      const event = { value: this.getValue() };
      this.fire("change", event);
      if (event.defaultPrevented) {
        ev.preventDefault();
      }
    }
    /** Gets the current input value as a string. */
    getValue() {
      let v = this.dom.value;
      if (this.props.trim !== false) {
        v = v.trim();
      }
      return v;
    }
    /**
        * Sets the input value.
        * @param value - New value (converted to string).
        */
    setValue(value) {
      this.dom.value = value + "";
    }
    /**
        * Gets the numeric value (for `type="number"` or `type="range"`).
        * @param defNan - Default value if parsing fails (default: `NaN`).
        * @returns Parsed number or `defNan`.
        */
    getNumValue(defNan) {
      const v = parseFloat(this.getValue());
      if (isNaN(v) && defNan !== void 0) {
        return defNan;
      }
      return v;
    }
    /**
        * Sets a numeric value with optional decimal precision.
        * @param value - Numeric value to set.
        * @param ndec - Decimal places:
        *               `-1` = auto,
        *               `-2` = use `step` prop,
        *               `≥0` = fixed decimals.
        */
    setNumValue(value, ndec = -1) {
      if (ndec == -2 && this.props.type == "number") {
        const p = this.props;
        if (p.step < 1) {
          let ndec2 = -Math.floor(Math.log10(p.step ?? 1));
          return this.setValue(value.toFixed(ndec2));
        } else if (p.step > 1) {
          return this.setValue(value.toFixed());
        }
      } else if (ndec >= 0) {
        return this.setValue(value.toFixed(ndec));
      }
      this.setValue(value + "");
    }
    /** Gets the checked state (for checkboxes/radio buttons). */
    getCheck() {
      const d = this.dom;
      return d.checked;
    }
    /** Sets the checked state (for checkboxes/radio buttons). */
    setCheck(ck) {
      const d = this.dom;
      d.checked = ck;
    }
    /** Toggles read-only mode. */
    setReadOnly(ro) {
      const d = this.dom;
      d.readOnly = ro;
    }
    /** Selects all text in the input. */
    selectAll() {
      const d = this.dom;
      d.select();
    }
    /**
        * Selects a text range.
        * @param start - Start position 
        * @param length - Length of selection
        */
    select(start, length = 9999) {
      const d = this.dom;
      d.setSelectionRange(start, start + length);
    }
    /**
        * Gets the current text selection.
        * @returns Object with `start` and `length` properties.
        */
    getSelection() {
      const d = this.dom;
      return {
        start: d.selectionStart,
        length: d.selectionEnd - d.selectionStart
      };
    }
    /** Validates the input (checks `required` constraint). */
    isValid() {
      if (this.props.required) {
        const v = this.getValue();
        if (v === "") {
          return false;
        }
      }
      return true;
    }
    /**
     * 
     */
    queryInterface(name) {
      if (name == "form-element") {
        const i = {
          getRawValue: /* @__PURE__ */ __name(() => {
            if (this.props.type == "checkbox") {
              return this.getCheck();
            } else if (this.props.type == "radio") {
              const owner = getRadioOwner(this.dom);
              const checked = owner.querySelector(`input[name="${this.props.name}"]:checked`);
              return checked ? checked.value : void 0;
            } else if (this.props.type == "number") {
              return this.getNumValue(0);
            } else {
              return this.getValue();
            }
          }, "getRawValue"),
          setRawValue: /* @__PURE__ */ __name((v) => {
            if (this.props.type == "checkbox") {
              this.setCheck(!!v);
            } else if (this.props.type == "radio") {
              if (this.props.value == v) {
                this.setCheck(true);
              }
            } else if (this.props.type == "number") {
              return this.setNumValue(v, -2);
            } else {
              this.setValue(v);
            }
          }, "setRawValue"),
          isValid: /* @__PURE__ */ __name(() => {
            return this.isValid();
          }, "isValid")
        };
        return i;
      }
      return super.queryInterface(name);
    }
  };
  _init26 = __decoratorStart(_a26);
  _Input = __decorateElement(_init26, 0, "Input", _Input_decorators, _Input);
  __name(_Input, "Input");
  __runInitializers(_init26, 1, _Input);
  var Input = _Input;

  // node_modules/x4js/src/components/checkbox/checkbox.ts
  var _Checkbox_decorators, _init27, _a27;
  _Checkbox_decorators = [class_ns("x4")];
  var _Checkbox = class _Checkbox extends (_a27 = Component2) {
    /**
        * Creates an instance of the Checkbox component.
        * 
        * @param {CheckboxProps} props - The properties for the checkbox component, including label, checked state, and value.
        * @example
        * const checkbox = new Checkbox({ label: 'Accept Terms', checked: true });
        */
    constructor(props) {
      super(props);
      __publicField(this, "_input");
      const inputId = makeUniqueComponentId();
      this.mapPropEvents(props, "change");
      this.setContent([
        new Component2({
          cls: "inner",
          content: [
            this._input = new Input({
              type: "checkbox",
              id: inputId,
              name: props.name,
              checked: props.checked,
              dom_events: {
                change: /* @__PURE__ */ __name(() => this._on_change(), "change")
              }
            })
          ]
        }),
        new Label({
          tag: "label",
          text: props.label,
          labelFor: inputId,
          id: void 0
        })
      ]);
      this.query(".inner").dom.insertAdjacentHTML("beforeend", icons_default.check);
      this.addDOMEvent("click", (e) => this._on_click(e));
    }
    /**
     * handle click outside label & input
     */
    _on_click(ev) {
      if (ev.target == this.dom) {
        this._input.dom.click();
        ev.preventDefault();
        ev.stopPropagation();
      }
    }
    /**
     * check state changed
     */
    _on_change() {
      this.fire("change", { value: this.getCheck() });
    }
    /**
     * @return the checked value
     */
    getCheck() {
      return this._input.getCheck();
    }
    /**
     * change the checked value
     * @param {boolean} ck new checked value	
     */
    setCheck(ck) {
      this._input.setCheck(ck);
    }
    /**
     * change the checkbox label
     * @param text 
     */
    setLabel(text) {
      this.query("label").setText(text);
    }
    /**
     * toggle the checkbox
     */
    toggle() {
      this.setCheck(!this.getCheck());
    }
  };
  _init27 = __decoratorStart(_a27);
  _Checkbox = __decorateElement(_init27, 0, "Checkbox", _Checkbox_decorators, _Checkbox);
  __name(_Checkbox, "Checkbox");
  __runInitializers(_init27, 1, _Checkbox);
  var Checkbox = _Checkbox;

  // x4-raw-file:C:\dev\rlibre\y4-2026\demo\frontend\node_modules\x4js\src\components\colorinput\crosshairs-simple-sharp-light.svg
  var crosshairs_simple_sharp_light_default = "data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCA1MTIgNTEyIiBmaWxsPSJjdXJyZW50Q29sb3IiPjwhLS0hRm9udCBBd2Vzb21lIFBybyA2LjYuMCBieSBAZm9udGF3ZXNvbWUgLSBodHRwczovL2ZvbnRhd2Vzb21lLmNvbSBMaWNlbnNlIC0gaHR0cHM6Ly9mb250YXdlc29tZS5jb20vbGljZW5zZSAoQ29tbWVyY2lhbCBMaWNlbnNlKSBDb3B5cmlnaHQgMjAyNCBGb250aWNvbnMsIEluYy4tLT48cGF0aCBkPSJNNDc5LjQgMjQwTDM4NCAyNDBsLTE2IDAgMCAzMiAxNiAwIDk1LjQgMEM0NzEuNiAzODMgMzgzIDQ3MS42IDI3MiA0NzkuNGwwLTk1LjQgMC0xNi0zMiAwIDAgMTYgMCA5NS40QzEyOSA0NzEuNiA0MC40IDM4MyAzMi42IDI3Mmw5NS40IDAgMTYgMCAwLTMyLTE2IDAtOTUuNCAwQzQwLjQgMTI5IDEyOSA0MC40IDI0MCAzMi42bDAgOTUuNCAwIDE2IDMyIDAgMC0xNiAwLTk1LjRDMzgzIDQwLjQgNDcxLjYgMTI5IDQ3OS40IDI0MHpNMjU2IDUxMkEyNTYgMjU2IDAgMSAwIDI1NiAwYTI1NiAyNTYgMCAxIDAgMCA1MTJ6Ii8+PC9zdmc+";

  // node_modules/x4js/src/components/colorinput/colorinput.ts
  var _ColorInput_decorators, _init28, _a28;
  _ColorInput_decorators = [class_ns("x4")];
  var _ColorInput = class _ColorInput extends (_a28 = HBox) {
    constructor(props) {
      super(props);
      let swatch;
      let edit;
      this.setContent([
        swatch = new Component2({ cls: "swatch" }),
        edit = new Input({ type: "text", value: "", spellcheck: false }),
        isFeatureAvailable("eyedropper") ? new Button({ icon: crosshairs_simple_sharp_light_default, click: /* @__PURE__ */ __name(() => {
          const eyeDropper = new window.EyeDropper();
          eyeDropper.open().then((result) => {
            color = new Color(result.sRGBHex);
            updateColor(color);
          }).catch((_) => {
          });
        }, "click") }) : null
      ]);
      edit.addDOMEvent("input", () => {
        const txt = edit.getValue();
        const clr = new Color(txt);
        if (!clr.isInvalid()) {
          color = clr;
          updateColor(color);
        }
      });
      const updateColor = /* @__PURE__ */ __name((clr) => {
        swatch.setStyleValue("backgroundColor", clr.toRgbString(false));
        edit.setValue(clr.toRgbString(false));
      }, "updateColor");
      let color;
      if (props.color instanceof Color) {
        color = props.color;
      } else {
        color = new Color(props.color);
      }
      updateColor(color);
    }
  };
  _init28 = __decoratorStart(_a28);
  _ColorInput = __decorateElement(_init28, 0, "ColorInput", _ColorInput_decorators, _ColorInput);
  __name(_ColorInput, "ColorInput");
  __publicField(_ColorInput, "$cls-ns", "x4");
  __runInitializers(_init28, 1, _ColorInput);
  var ColorInput = _ColorInput;

  // node_modules/x4js/src/components/colorpicker/colorpicker.ts
  var _Saturation_decorators, _init29, _a29;
  _Saturation_decorators = [class_ns("x4")];
  var _Saturation = class _Saturation extends (_a29 = Box) {
    constructor(props, init) {
      super(props);
      __publicField(this, "mdown", false);
      __publicField(this, "irect");
      __publicField(this, "hsv", { hue: 1, saturation: 1, value: 1, alpha: 1 });
      __publicField(this, "color");
      __publicField(this, "thumb");
      this.setContent([
        this.color = new Component2({ cls: "overlay" }),
        new Component2({ cls: "overlay", style: { backgroundImage: "linear-gradient(90deg, rgb(255, 255, 255), transparent)" } }),
        new Component2({ cls: "overlay", style: { backgroundImage: "linear-gradient(0deg, rgb(0, 0, 0), transparent)" } }),
        this.thumb = new Component2({ cls: "thumb" })
      ]);
      this.setDOMEvents({
        pointerdown: /* @__PURE__ */ __name((e) => this.mousedown(e), "pointerdown"),
        pointermove: /* @__PURE__ */ __name((e) => this.mousemove(e), "pointermove"),
        pointerup: /* @__PURE__ */ __name((e) => this.mouseup(e), "pointerup"),
        created: /* @__PURE__ */ __name(() => this.updateThumbMarker(), "created")
      });
      this.updateBaseColor(init);
    }
    mousedown(ev) {
      this.mdown = true;
      this.irect = this.getBoundingRect();
      this.setCapture(ev.pointerId);
    }
    mousemove(ev) {
      if (this.mdown) {
        const ir = this.irect;
        let hpos = clamp(ev.clientX - ir.left, 0, ir.width);
        let hperc = hpos / ir.width;
        let vpos = clamp(ev.clientY - ir.top, 0, ir.height);
        let vperc = vpos / ir.height;
        this.hsv.saturation = hperc;
        this.hsv.value = 1 - vperc;
        this.updateThumbMarker();
        this.fire("sat_change", { saturation: this.hsv.saturation, value: this.hsv.value });
      }
    }
    mouseup(ev) {
      if (this.mdown) {
        this.releaseCapture(ev.pointerId);
        this.mdown = false;
      }
    }
    updateThumbMarker() {
      const rc = this.color.getBoundingRect();
      this.thumb.setStyle({
        left: this.hsv.saturation * rc.width + "px",
        bottom: this.hsv.value * rc.height + "px"
      });
    }
    updateBaseColor(hsv) {
      const base = new Color(0, 0, 0);
      base.setHsv(hsv.hue, 1, 1, 1);
      this.color.setStyleValue("backgroundColor", base.toRgbString(false));
    }
    move(sens, delta) {
      switch (sens) {
        case "saturation": {
          this.hsv.saturation += delta;
          if (this.hsv.saturation < 0) {
            this.hsv.saturation = 0;
          } else if (this.hsv.saturation > 1) {
            this.hsv.saturation = 1;
          }
          this.fire("sat_change", { saturation: this.hsv.saturation, value: this.hsv.value });
          this.updateThumbMarker();
          break;
        }
        case "value": {
          this.hsv.value += delta;
          if (this.hsv.value < 0) {
            this.hsv.value = 0;
          } else if (this.hsv.value > 1) {
            this.hsv.value = 1;
          }
          this.fire("sat_change", { saturation: this.hsv.saturation, value: this.hsv.value });
          this.updateThumbMarker();
          break;
        }
      }
    }
  };
  _init29 = __decoratorStart(_a29);
  _Saturation = __decorateElement(_init29, 0, "Saturation", _Saturation_decorators, _Saturation);
  __name(_Saturation, "Saturation");
  __runInitializers(_init29, 1, _Saturation);
  var Saturation = _Saturation;
  var _HueSlider_decorators, _init30, _a30;
  _HueSlider_decorators = [class_ns("x4")];
  var _HueSlider = class _HueSlider extends (_a30 = Box) {
    constructor(props, init) {
      super(props);
      __publicField(this, "thumb");
      __publicField(this, "hsv", { hue: 1, saturation: 1, value: 1, alpha: 1 });
      __publicField(this, "mdown", false);
      __publicField(this, "irect");
      this.setContent([
        this.thumb = new Component2({ cls: "thumb", left: "50%" })
      ]);
      this.setDOMEvents({
        pointerdown: /* @__PURE__ */ __name((e) => this.mousedown(e), "pointerdown"),
        pointermove: /* @__PURE__ */ __name((e) => this.mousemove(e), "pointermove"),
        pointerup: /* @__PURE__ */ __name((e) => this.mouseup(e), "pointerup")
      });
      this.updateHue(init);
    }
    mousedown(ev) {
      this.mdown = true;
      this.irect = this.getBoundingRect();
      this.setCapture(ev.pointerId);
    }
    mousemove(ev) {
      if (this.mdown) {
        const ir = this.irect;
        let hpos = clamp(ev.clientX - ir.left, 0, ir.width);
        let hperc = hpos / ir.width;
        this.hsv.hue = hperc;
        this.updateHue(this.hsv);
        this.fire("hue_change", { hue: this.hsv.hue });
      }
    }
    mouseup(ev) {
      if (this.mdown) {
        this.releaseCapture(ev.pointerId);
        this.mdown = false;
      }
    }
    updateHue(hsv) {
      this.hsv.hue = hsv.hue;
      this.thumb.setStyleValue("left", hsv.hue * 100 + "%");
    }
    move(delta) {
      this.hsv.hue += delta;
      if (this.hsv.hue < 0) {
        this.hsv.hue = 0;
      } else if (this.hsv.hue > 1) {
        this.hsv.hue = 1;
      }
      this.fire("hue_change", { hue: this.hsv.hue });
      this.updateHue(this.hsv);
    }
  };
  _init30 = __decoratorStart(_a30);
  _HueSlider = __decorateElement(_init30, 0, "HueSlider", _HueSlider_decorators, _HueSlider);
  __name(_HueSlider, "HueSlider");
  __runInitializers(_init30, 1, _HueSlider);
  var HueSlider = _HueSlider;
  var _AlphaSlider_decorators, _init31, _a31;
  _AlphaSlider_decorators = [class_ns("x4")];
  var _AlphaSlider = class _AlphaSlider extends (_a31 = Box) {
    constructor(props, init) {
      super(props);
      __publicField(this, "thumb");
      __publicField(this, "color");
      __publicField(this, "hsv", { hue: 1, saturation: 1, value: 1, alpha: 1 });
      __publicField(this, "mdown", false);
      __publicField(this, "irect");
      this.setContent([
        new Component2({ cls: "overlay checkers" }),
        this.color = new Component2({ cls: "overlay color" }),
        this.thumb = new Component2({ cls: "thumb", left: "50%" })
      ]);
      this.setDOMEvents({
        pointerdown: /* @__PURE__ */ __name((e) => this._on_mousedown(e), "pointerdown"),
        pointermove: /* @__PURE__ */ __name((e) => this._on_mousemove(e), "pointermove"),
        pointerup: /* @__PURE__ */ __name((e) => this._on_mouseup(e), "pointerup")
      });
      this.updateAlpha();
      this.updateBaseColor(init);
    }
    _on_mousedown(ev) {
      this.mdown = true;
      this.irect = this.getBoundingRect();
      this.setCapture(ev.pointerId);
    }
    _on_mousemove(ev) {
      if (this.mdown) {
        const ir = this.irect;
        let hpos = clamp(ev.clientX - ir.left, 0, ir.width);
        let hperc = hpos / ir.width;
        this.hsv.alpha = hperc;
        this.updateAlpha();
        this.fire("alpha_change", { alpha: this.hsv.alpha });
      }
    }
    _on_mouseup(ev) {
      if (this.mdown) {
        this.releaseCapture(ev.pointerId);
        this.mdown = false;
      }
    }
    updateAlpha() {
      this.thumb.setStyleValue("left", this.hsv.alpha * 100 + "%");
    }
    updateBaseColor(hsv) {
      const base = new Color(0, 0, 0);
      base.setHsv(hsv.hue, hsv.saturation, hsv.value, 1);
      this.color.setStyleValue("backgroundImage", `linear-gradient(90deg, transparent, ${base.toRgbString(false)})`);
    }
    setColor(hsv) {
      this.hsv = hsv;
      this.updateBaseColor(hsv);
      this.updateAlpha();
    }
    move(delta) {
      this.hsv.alpha += delta;
      if (this.hsv.alpha < 0) {
        this.hsv.alpha = 0;
      } else if (this.hsv.alpha > 1) {
        this.hsv.alpha = 1;
      }
      this.fire("alpha_change", { alpha: this.hsv.alpha });
      this.updateAlpha();
    }
  };
  _init31 = __decoratorStart(_a31);
  _AlphaSlider = __decorateElement(_init31, 0, "AlphaSlider", _AlphaSlider_decorators, _AlphaSlider);
  __name(_AlphaSlider, "AlphaSlider");
  __runInitializers(_init31, 1, _AlphaSlider);
  var AlphaSlider = _AlphaSlider;
  var _ColorPicker_decorators, _init32, _a32;
  _ColorPicker_decorators = [class_ns("x4")];
  var _ColorPicker = class _ColorPicker extends (_a32 = VBox) {
    constructor(props) {
      super(props);
      __publicField(this, "_base");
      __publicField(this, "_sat");
      __publicField(this, "_swatch");
      __publicField(this, "_hue");
      __publicField(this, "_alpha");
      if (props.color instanceof Color) {
        this._base = props.color;
      } else {
        this._base = new Color(props.color);
      }
      let hsv = this._base.toHsv();
      this.setAttribute("tabindex", 0);
      this.setContent([
        this._sat = new Saturation({}, hsv),
        new HBox({
          cls: "body",
          content: [
            new VBox({ cls: "x4flex", content: [
              this._hue = new HueSlider({}, hsv),
              this._alpha = new AlphaSlider({}, hsv)
            ] }),
            new Box({ cls: "swatch", content: [
              new Component2({ cls: "overlay checkers" }),
              this._swatch = new Component2({ cls: "overlay" })
            ] })
          ]
        })
      ]);
      this._sat.on("sat_change", (ev) => {
        hsv.saturation = ev.saturation;
        hsv.value = ev.value;
        updateColor();
        this._alpha.updateBaseColor(hsv);
      });
      this._hue.on("hue_change", (ev) => {
        hsv.hue = ev.hue;
        this._sat.updateBaseColor(hsv);
        this._alpha.updateBaseColor(hsv);
        updateColor();
      });
      this._alpha.on("alpha_change", (ev) => {
        hsv.alpha = ev.alpha;
        updateColor();
      });
      const updateColor = /* @__PURE__ */ __name(() => {
        this._base.setHsv(hsv.hue, hsv.saturation, hsv.value, hsv.alpha);
        this._swatch.setStyleValue("backgroundColor", this._base.toRgbString());
        this._swatch.setAttribute("tooltip", this._base.toRgbString());
        this.fire("change", { color: this._base });
      }, "updateColor");
      if (isFeatureAvailable("eyedropper")) {
        this._swatch.addDOMEvent("click", (e) => {
          const eyeDropper = new window.EyeDropper();
          eyeDropper.open().then((result) => {
            const color = new Color(result.sRGBHex);
            hsv = color.toHsv();
            this._alpha.setColor(hsv);
            this._sat.updateBaseColor(hsv);
            this._hue.updateHue(hsv);
            updateColor();
          }).catch((_) => {
          });
        });
      }
      this.addDOMEvent("keydown", (ev) => this._onkey(ev));
      updateColor();
    }
    _onkey(ev) {
      switch (ev.key) {
        case "ArrowLeft": {
          if (ev.ctrlKey) {
            this._hue.move(-0.01);
          } else {
            this._sat.move("saturation", -0.01);
          }
          break;
        }
        case "ArrowRight": {
          if (ev.ctrlKey) {
            this._hue.move(0.01);
          } else {
            this._sat.move("saturation", 0.01);
          }
          break;
        }
        case "ArrowUp": {
          if (ev.ctrlKey) {
            this._alpha.move(0.01);
          } else {
            this._sat.move("value", 0.01);
          }
          break;
        }
        case "ArrowDown": {
          if (ev.ctrlKey) {
            this._alpha.move(-0.01);
          } else {
            this._sat.move("value", -0.01);
          }
          break;
        }
      }
    }
  };
  _init32 = __decoratorStart(_a32);
  _ColorPicker = __decorateElement(_init32, 0, "ColorPicker", _ColorPicker_decorators, _ColorPicker);
  __name(_ColorPicker, "ColorPicker");
  __runInitializers(_init32, 1, _ColorPicker);
  var ColorPicker = _ColorPicker;

  // node_modules/x4js/src/components/viewport/viewport.ts
  var _Viewport_decorators, _init33, _a33;
  _Viewport_decorators = [class_ns("x4")];
  var _Viewport = class _Viewport extends (_a33 = Component2) {
    constructor(props) {
      super(props);
    }
  };
  _init33 = __decoratorStart(_a33);
  _Viewport = __decorateElement(_init33, 0, "Viewport", _Viewport_decorators, _Viewport);
  __name(_Viewport, "Viewport");
  __runInitializers(_init33, 1, _Viewport);
  var Viewport = _Viewport;
  var _ScrollView_decorators, _init34, _a34;
  _ScrollView_decorators = [class_ns("x4")];
  var _ScrollView = class _ScrollView extends (_a34 = Box) {
    constructor(props) {
      super(props);
      this.setContent(new Viewport({}));
    }
    getViewport() {
      return this.firstChild();
    }
  };
  _init34 = __decoratorStart(_a34);
  _ScrollView = __decorateElement(_init34, 0, "ScrollView", _ScrollView_decorators, _ScrollView);
  __name(_ScrollView, "ScrollView");
  __runInitializers(_init34, 1, _ScrollView);
  var ScrollView = _ScrollView;

  // node_modules/x4js/src/components/listbox/listbox.ts
  var _Listbox_decorators, _init35, _a35;
  _Listbox_decorators = [class_ns("x4")];
  var _Listbox = class _Listbox extends (_a35 = Component2) {
    //<?? preventFocus = false;
    constructor(props) {
      super({ ...props });
      __publicField(this, "_view");
      __publicField(this, "_lastsel");
      __publicField(this, "_multisel");
      __publicField(this, "_items");
      this.setAttribute("tabindex", 0);
      this.mapPropEvents(props, "dblClick", "selectionChange", "contextMenu");
      const scroller = new ScrollView({ cls: "body" });
      this._view = scroller.getViewport();
      this._multisel = /* @__PURE__ */ new Set();
      this._items = [];
      if (props.footer) {
        props.footer.setAttribute("id", "footer");
        props.footer.addClass("packed");
      }
      if (props.header) {
        props.header.setAttribute("id", "header");
      }
      this.setContent([
        props.title || props.icon ? new Label({ cls: "title", text: props.title, icon: props.icon }) : null,
        props.header ? props.header : null,
        scroller,
        props.footer
      ]);
      this.setDOMEvents({
        click: /* @__PURE__ */ __name((ev) => this._on_click(ev), "click"),
        keydown: /* @__PURE__ */ __name((ev) => this._on_key(ev), "keydown"),
        dblclick: /* @__PURE__ */ __name((e) => this._on_click(e), "dblclick"),
        contextmenu: /* @__PURE__ */ __name((e) => this._on_ctx_menu(e), "contextmenu")
      });
      this.setItems(props.items, false);
    }
    /**
     * 
     */
    _on_key(ev) {
      if (this.isDisabled()) {
        return;
      }
      switch (ev.key) {
        case "ArrowDown": {
          this.navigate(4 /* next */);
          break;
        }
        case "ArrowUp": {
          this.navigate(1 /* prev */);
          break;
        }
        case "Home": {
          this.navigate(0 /* first */);
          break;
        }
        case "End": {
          this.navigate(5 /* last */);
          break;
        }
        default:
          return;
      }
      ev.preventDefault();
      ev.stopPropagation();
    }
    /**
     * 
     */
    navigate(sens) {
      if (!this._lastsel) {
        if (sens == 4 /* next */) sens = 0 /* first */;
        else sens = 5 /* last */;
      }
      const next_visible = /* @__PURE__ */ __name((el, down) => {
        while (el && !el.isVisible()) {
          el = down ? el.nextElement() : el.prevElement();
        }
        return el;
      }, "next_visible");
      if (sens == 0 /* first */ || sens == 5 /* last */) {
        let fel = sens == 0 /* first */ ? this._view.firstChild() : this._view.lastChild();
        fel = next_visible(fel, sens == 0 /* first */);
        if (fel) {
          const id = fel.getInternalData("id");
          this._selectItem(id, fel, "single");
          return true;
        }
      } else {
        const selitem = this._itemWithID(this._lastsel);
        let nel;
        if (selitem) {
          nel = sens == 4 /* next */ ? selitem.nextElement() : selitem.prevElement();
          nel = next_visible(nel, sens == 4 /* next */);
        } else {
          nel = sens == 4 /* next */ ? this._view.firstChild() : this._view.lastChild();
        }
        if (nel) {
          const id = nel.getInternalData("id");
          this._selectItem(id, nel, "single");
          return true;
        }
      }
      return false;
    }
    /**
     * 
     */
    _itemWithID(id) {
      const all = this._view.enumChildComponents(false);
      return all.find((x) => x.getInternalData("id") === id);
    }
    /**
     * 
     */
    _on_click(ev) {
      let target = ev.target;
      while (target && target != this.dom) {
        const c = componentFromDOM(target);
        if (c && c.dom.tagName === "INPUT") {
          return;
        }
        if (c && c.hasClass("x4item")) {
          const id = c.getInternalData("id");
          const fev = { context: id };
          if (ev.type == "click") {
            this.fire("click", fev);
          } else {
            this.fire("dblClick", fev);
          }
          if (!fev.defaultPrevented) {
            this._selectItem(id, c, ev.ctrlKey ? "toggle" : "single");
          }
          return;
        }
        target = target.parentElement;
      }
      if (ev.type == "click") {
        this.fire("click", {});
      }
      this.clearSelection();
      ev.stopImmediatePropagation();
      ev.preventDefault();
    }
    /**
     * 
     */
    _on_ctx_menu(ev) {
      ev.preventDefault();
      let target = ev.target;
      while (target && target != this.dom) {
        const c = componentFromDOM(target);
        if (c && c.hasClass("x4item")) {
          const id = c.getInternalData("id");
          this._selectItem(id, c, "single");
          this.fire("contextMenu", { uievent: ev, context: id });
          return;
        }
        target = target.parentElement;
      }
      this.fire("contextMenu", { uievent: ev, context: null });
    }
    /**
     * 
     */
    _selectItem(id, item, mode) {
      if (!this.props.multisel) {
        mode = "single";
      }
      this._lastsel = id;
      if (mode == "single") {
        if (this._multisel.has(id)) {
          return;
        }
        this._clearSelection();
        if (item) {
          this._multisel.add(id);
          item.addClass("selected");
        }
      } else {
        if (item) {
          if (this._multisel.has(id)) {
            item.removeClass("selected");
            this._multisel.delete(id);
          } else {
            this._multisel.add(id);
            item.addClass("selected");
          }
        }
      }
      if (item) {
        item.scrollIntoView({
          behavior: "smooth",
          block: "nearest"
        });
      }
      this.fire("selectionChange", { selection: this.getSelection(), empty: this._multisel.size == 0 });
    }
    /**
     * 
     */
    getItem(id) {
      return this._items.find((x) => x.id === id);
    }
    /**
     * select an item by it's id
     */
    select(ids, notify = true) {
      if (!isArray(ids)) {
        ids = [ids];
      }
      if (!ids.length) {
        if (this._multisel.size) {
          if (notify) {
            this.clearSelection();
          } else {
            this._clearSelection();
          }
        }
        return;
      }
      if (ids.some((x) => !this._multisel.has(x))) {
        this._clearSelection();
        const all = this._view.enumChildComponents(false);
        ids.forEach((id) => {
          const itm = all.find((x) => x.getInternalData("id") === id);
          if (itm) {
            this._multisel.add(id);
            itm.addClass("selected");
          }
        });
        if (notify) {
          this.fire("selectionChange", { selection: this.getSelection(), empty: this._multisel.size == 0 });
        }
      }
    }
    /**
     * 
     */
    _findItemIndex(id) {
      return this._items.findIndex((x) => x.id == id);
    }
    /**
     * 
     */
    _clearSelection() {
      const all = this._view.enumChildComponents(false);
      if (this._multisel.size) {
        const ids = Array.from(this._multisel);
        ids.forEach((id) => {
          const itm = all.find((x) => x.getInternalData("id") === id);
          if (itm) {
            itm.removeClass("selected");
          }
        });
      }
      this._multisel.clear();
    }
    clearSelection(fireEvent = true) {
      if (this._multisel.size) {
        this._clearSelection();
        if (fireEvent) {
          this.fire("selectionChange", { selection: [], empty: true });
        }
      }
    }
    /**
     * 
     */
    setItems(items, keepSel = false) {
      const oldSel = this.getSelection();
      this.clearSelection();
      this._view.clearContent();
      this._items = items ?? [];
      let update_sel = false;
      if (this._items.length) {
        this.removeClass("empty");
        const content = items.map((x) => this.renderItem(x));
        this._view.setContent(content);
        if (keepSel && oldSel.length > 0) {
          this.select(oldSel);
        }
      } else {
        this.addClass("empty");
        update_sel = oldSel.length > 0;
        this._view.setContent(new Label({ cls: "empty vertical", icon: icons_default.empty, text: this.props.emptyMsg ?? _tr.global.empty_list }));
      }
      if (update_sel) {
        this.setTimeout("sel", 100, () => {
          this.fire("selectionChange", { selection: [], empty: true });
        });
      }
    }
    /**
     * 
     */
    renderItem(item) {
      const renderer = this.props.renderer ?? this.defaultRenderer;
      const line2 = renderer(item);
      line2.addClass("x4item");
      line2.setInternalData("id", item.id);
      return line2;
    }
    /**
     * 
     */
    defaultRenderer(item) {
      const mk_col = /* @__PURE__ */ __name((c, index) => {
        if (c === void 0 || c === null) {
          return null;
        }
        if (c instanceof Component2) {
          c.addClass(`column ref-c${index + 2}`);
          return c;
        }
        return new SimpleText({ cls: `column ref-c${index + 2}`, text: c });
      }, "mk_col");
      const content = [
        new Label({ cls: `column ref-c1`, icon: item.iconId, text: item.text })
      ];
      if (item.sub_cols) {
        content.push(...item.sub_cols.map(mk_col));
      }
      return new HBox({
        cls: item.cls,
        content
      });
    }
    /**
     * 
     */
    filter(filter) {
      const childs = this._view.enumChildComponents(false);
      if (!filter) {
        childs.forEach((x) => x.show(true));
      } else {
        let filtred;
        if (filter instanceof RegExp) {
          const f = filter;
          filtred = new Set(this._items.filter((x) => f.test(x.text)).map((x) => x.id));
        } else {
          const f = filter.toUpperCase();
          filtred = new Set(this._items.filter((x) => x.text.toUpperCase().includes(f)).map((x) => x.id));
        }
        childs.forEach((x) => {
          x.show(filtred.has(x.getInternalData("id")));
        });
      }
    }
    /**
     * append or prepend a new item
     * @param item 
     * @param prepend 
     * @param select 
     */
    appendItem(item, prepend = false, select = true) {
      if (select) {
        this._clearSelection();
      }
      let el = this.renderItem(item);
      if (prepend) {
        this._items.unshift(item);
        this._view.prependContent(el);
      } else {
        this._items.push(item);
        this._view.appendContent(el);
      }
      if (select) {
        this._selectItem(item.id, el, "single");
      }
    }
    /**
     * update an item
     */
    updateItem(id, item) {
      const idx = this._findItemIndex(id);
      if (idx < 0) {
        return;
      }
      let was_sel = false;
      if (this._multisel.has(id)) {
        was_sel = true;
      }
      this._items[idx] = item;
      const old = this._itemWithID(item.id);
      if (old?.dom) {
        const _new = this.renderItem(item);
        if (was_sel) {
          _new.addClass("selected");
        }
        this._view.dom.replaceChild(_new.dom, old.dom);
      }
    }
    getSelection() {
      return Array.from(this._multisel);
    }
    getFirstSel() {
      const [first] = this.getSelection();
      return first ? this.getItem(first) : null;
    }
    ensureSelectionVisible() {
      const sels = Array.from(this._multisel.values());
      if (sels.length) {
        const item = this._itemWithID(sels[0]);
        item?.scrollIntoView({
          behavior: "instant",
          block: "nearest"
        });
      }
    }
  };
  _init35 = __decoratorStart(_a35);
  _Listbox = __decorateElement(_init35, 0, "Listbox", _Listbox_decorators, _Listbox);
  __name(_Listbox, "Listbox");
  __runInitializers(_init35, 1, _Listbox);
  var Listbox = _Listbox;

  // x4-raw-file:C:\dev\rlibre\y4-2026\demo\frontend\node_modules\x4js\src\components\combobox\updown.svg
  var updown_default = "data:image/svg+xml;base64,PHN2ZyB2aWV3Qm94PSIwIDAgMTUgMTUiIGZpbGw9Im5vbmUiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+Cgk8cGF0aCBkPSJNNC45MzE3OSA1LjQzMTc5QzQuNzU2MDUgNS42MDc1MyA0Ljc1NjA1IDUuODkyNDUgNC45MzE3OSA2LjA2ODE5QzUuMTA3NTMgNi4yNDM5MiA1LjM5MjQ1IDYuMjQzOTIgNS41NjgxOSA2LjA2ODE5TDcuNDk5OTkgNC4xMzYzOEw5LjQzMTc5IDYuMDY4MTlDOS42MDc1MyA2LjI0MzkyIDkuODkyNDUgNi4yNDM5MiAxMC4wNjgyIDYuMDY4MTlDMTAuMjQzOSA1Ljg5MjQ1IDEwLjI0MzkgNS42MDc1MyAxMC4wNjgyIDUuNDMxNzlMNy44MTgxOSAzLjE4MTc5QzcuNzMzNzkgMy4wOTc0IDcuNjE5MzMgMy4wNDk5OSA3LjQ5OTk5IDMuMDQ5OTlDNy4zODA2NCAzLjA0OTk5IDcuMjY2MTggMy4wOTc0IDcuMTgxNzkgMy4xODE3OUw0LjkzMTc5IDUuNDMxNzlaTTEwLjA2ODIgOS41NjgxOUMxMC4yNDM5IDkuMzkyNDUgMTAuMjQzOSA5LjEwNzUzIDEwLjA2ODIgOC45MzE3OUM5Ljg5MjQ1IDguNzU2MDYgOS42MDc1MyA4Ljc1NjA2IDkuNDMxNzkgOC45MzE3OUw3LjQ5OTk5IDEwLjg2MzZMNS41NjgxOSA4LjkzMTc5QzUuMzkyNDUgOC43NTYwNiA1LjEwNzUzIDguNzU2MDYgNC45MzE3OSA4LjkzMTc5QzQuNzU2MDUgOS4xMDc1MyA0Ljc1NjA1IDkuMzkyNDUgNC45MzE3OSA5LjU2ODE5TDcuMTgxNzkgMTEuODE4MkM3LjM1NzUzIDExLjk5MzkgNy42NDI0NSAxMS45OTM5IDcuODE4MTkgMTEuODE4MkwxMC4wNjgyIDkuNTY4MTlaIiBmaWxsPSJjdXJyZW50Q29sb3IiIGZpbGwtcnVsZT0iZXZlbm9kZCIgY2xpcC1ydWxlPSJldmVub2RkIj4KCTwvcGF0aD4KPC9zdmc+";

  // node_modules/x4js/src/components/combobox/combobox.ts
  var _DropdownList_decorators, _init36, _a36;
  _DropdownList_decorators = [class_ns("x4")];
  var _DropdownList = class _DropdownList extends (_a36 = Popup) {
    constructor(props) {
      super(props);
      __publicField(this, "_list");
      this._list = new Listbox({ items: props.items });
      this.setContent(this._list);
      this.addDOMEvent("mousedown", (ev) => {
        ev.stopImmediatePropagation();
        ev.stopPropagation();
        ev.preventDefault();
      }, true);
      this._list.on("click", (ev) => {
        this.fire("click", ev);
      });
    }
    getList() {
      return this._list;
    }
  };
  _init36 = __decoratorStart(_a36);
  _DropdownList = __decorateElement(_init36, 0, "DropdownList", _DropdownList_decorators, _DropdownList);
  __name(_DropdownList, "DropdownList");
  __runInitializers(_init36, 1, _DropdownList);
  var DropdownList = _DropdownList;
  var _Combobox_decorators, _init37, _a37;
  _Combobox_decorators = [class_ns("x4")];
  var _Combobox = class _Combobox extends (_a37 = Component2) {
    constructor(props) {
      super(props);
      __publicField(this, "_popup");
      //private _label: Label;
      __publicField(this, "_input");
      __publicField(this, "_button");
      __publicField(this, "_prevent_close", false);
      __publicField(this, "_edit");
      const id = makeUniqueComponentId();
      this.mapPropEvents(props, "selectionChange");
      const readonly = props.readonly === false ? false : true;
      this.setContent([
        new HBox({ id: "label", content: new Label({ tag: "label", text: props.label, labelFor: id, width: props.labelWidth }) }),
        this._edit = new HBox({ id: "edit", content: [
          this._input = new Input({ id, type: "text", value: "", readonly, required: props.required }),
          this._button = new Button({ icon: updown_default, tabindex: -1 })
        ] })
      ]);
      if (props.name) {
        this.setAttribute("name", props.name);
      }
      if (props.required) {
        this.setAttribute("required", true);
      }
      this._popup = new DropdownList({ items: props.items });
      const list = this._popup.getList();
      const _select = /* @__PURE__ */ __name((sel) => {
        const itm = list.getItem(sel);
        if (itm) {
          list.select(sel, false);
        }
        this._input.setValue(itm.text);
        if (!this._prevent_close) {
          this._popup.show(false);
        }
      }, "_select");
      this._popup.on("click", (ev) => {
        const sel = ev.context;
        if (sel !== void 0) {
          _select(sel);
          this.fire("selectionChange", { selection: [sel], empty: false });
        }
      });
      if (props.value) {
        _select(props.value);
      }
      this._button.addDOMEvent("click", () => this._on_click());
      this._input.addDOMEvent("input", () => this._on_input());
      this._input.addDOMEvent("keydown", (ev) => this._on_key(ev));
      this.setDOMEvents({
        focusout: /* @__PURE__ */ __name(() => this._on_focusout(), "focusout"),
        click: /* @__PURE__ */ __name(() => this._on_click(), "click")
      });
    }
    _on_key(ev) {
      switch (ev.key) {
        case "Enter":
        case "Escape": {
          if (this._popup.isOpen()) {
            this._popup.show(false);
            break;
          }
          return;
        }
        case "ArrowUp":
          this._prevent_close = true;
          if (!this._popup.isOpen()) {
            this.showDropDown();
          } else {
            this._popup.getList().navigate(1 /* prev */);
          }
          this._prevent_close = false;
          break;
        case "ArrowDown":
          this._prevent_close = true;
          if (!this._popup.isOpen()) {
            this.showDropDown();
          } else {
            this._popup.getList().navigate(4 /* next */);
          }
          this._prevent_close = false;
          break;
        default: {
          return;
        }
      }
      ev.preventDefault();
      ev.stopPropagation();
    }
    _on_input() {
      if (!this._popup.isOpen()) {
        this.showDropDown();
      }
      this._popup.getList().filter(this._input.getValue());
    }
    _on_focusout() {
      this._popup.show(false);
    }
    _on_click() {
      this.showDropDown();
    }
    showDropDown() {
      if (this.isDisabled()) {
        return;
      }
      const rc = this._edit.getBoundingRect();
      this._popup.setStyleValue("minWidth", rc.width + "px");
      this._popup.displayNear(rc, "top left", "bottom left", { x: 0, y: 6 });
      this._popup.getList().ensureSelectionVisible();
    }
    setItems(items) {
      const list = this._getList();
      list.setItems(items);
      this.setValue("");
    }
    getValue() {
      return this._input.getValue();
    }
    setValue(value) {
      this._input.setValue(value);
    }
    selectItem(index) {
      const list = this._getList();
      list.select(index);
      const el = list.getItem(index);
      if (el) {
        this.setValue(el.text);
      }
    }
    getSelection() {
      const [sel] = this._getList().getSelection();
      return sel;
    }
    _getList() {
      return this._popup.getList();
    }
    /**
     * 
     */
    queryInterface(name) {
      if (name == "form-element") {
        const i = {
          getRawValue: /* @__PURE__ */ __name(() => {
            return this.getSelection();
          }, "getRawValue"),
          setRawValue: /* @__PURE__ */ __name((v) => {
            this.selectItem(v);
          }, "setRawValue"),
          isValid: /* @__PURE__ */ __name(() => {
            return this._input.isValid();
          }, "isValid")
        };
        return i;
      }
      return super.queryInterface(name);
    }
    getInput() {
      return this._input;
    }
  };
  _init37 = __decoratorStart(_a37);
  _Combobox = __decorateElement(_init37, 0, "Combobox", _Combobox_decorators, _Combobox);
  __name(_Combobox, "Combobox");
  __runInitializers(_init37, 1, _Combobox);
  var Combobox = _Combobox;

  // node_modules/x4js/src/components/form/form.ts
  var _Form_decorators, _init38, _a38;
  _Form_decorators = [class_ns("x4")];
  var _Form = class _Form extends (_a38 = Box) {
    constructor(props) {
      super({ tag: "form", ...props });
      __publicField(this, "validator");
      if (props.flex === false) {
        this.addClass("no-flex");
      }
      if (props.autoComplete !== void 0) {
        this.setAutoComplete(props.autoComplete);
      }
    }
    /**
     * 
     */
    _get_inputs() {
      return this.queryAll("[name]");
    }
    /**
     * 
     */
    setValues(values) {
      const items = this._get_inputs();
      items.forEach((x) => {
        const ifx = x.queryInterface("form-element");
        if (ifx) {
          const nme = x.getAttribute("name");
          if (Object.prototype.hasOwnProperty.call(values, nme)) {
            ifx.setRawValue(values[nme]);
          }
        }
      });
    }
    /**
     * 
     */
    getValues() {
      const result = {};
      const items = this._get_inputs();
      items.forEach((x) => {
        const ifx = x.queryInterface("form-element");
        if (ifx) {
          const nme = x.getAttribute("name");
          result[nme] = ifx.getRawValue();
        }
      });
      return result;
    }
    /**
     * 
     */
    setAutoComplete(on = true) {
      const items = this._get_inputs();
      items.forEach((x) => {
        x.setAttribute("autocomplete", on ? "on" : "off");
      });
    }
    /**
     * 
     */
    setValidator(validator) {
      if (!this.validator) {
        this.validator = validator;
        this.addDOMEvent("focusout", () => this.validate());
      }
    }
    /**
     * 
     */
    validate() {
      const items = this._get_inputs();
      let result = {};
      let is_valid = true;
      for (let x of items) {
        const ifx = x.queryInterface("form-element");
        if (ifx) {
          const nme = x.getAttribute("name");
          result[nme] = ifx.getRawValue();
          if (!ifx.isValid()) {
            is_valid = false;
          }
        }
      }
      if (this.validator) {
        let new_values = { ...result };
        if (!this.validator(new_values, is_valid)) {
          return null;
        }
        for (let name in result) {
          if (new_values[name] != result[name]) {
            const x = this.query(`input[name="${name}"]`);
            const ifx = x.queryInterface("form-element");
            ifx.setRawValue(new_values[name]);
          }
        }
        result = new_values;
      } else if (!is_valid) {
        result = null;
      }
      return result;
    }
  };
  _init38 = __decoratorStart(_a38);
  _Form = __decorateElement(_init38, 0, "Form", _Form_decorators, _Form);
  __name(_Form, "Form");
  __runInitializers(_init38, 1, _Form);
  var Form = _Form;

  // node_modules/x4js/src/components/dialog/dialog.ts
  var _Dialog_decorators, _init39, _a39;
  _Dialog_decorators = [class_ns("x4")];
  var _Dialog = class _Dialog extends (_a39 = Popup) {
    constructor(props) {
      super({ tag: "dialog", modal: true, ...props });
      __publicField(this, "form");
      __publicField(this, "_title");
      this._ismodal = this.props.modal;
      this.mapPropEvents(props, "btnclick");
      this.appendContent([
        new HBox({
          cls: "caption caption-element",
          content: [
            this._title = new Label({
              id: "title",
              icon: props.icon,
              text: props.title
            }),
            props.closable ? new Button({
              id: "closebox",
              icon: icons_default.close_box,
              tabindex: -1,
              click: /* @__PURE__ */ __name(() => {
                if (isString(props.closable)) {
                  this.fire("btnclick", { button: props.closable });
                } else {
                  this.close();
                }
              }, "click")
            }) : null
          ]
        }),
        this.form = props.form ? props.form : new Form({}),
        new BtnGroup({
          id: "btnbar",
          reverse: true,
          items: props.buttons,
          btnclick: /* @__PURE__ */ __name((ev) => {
            this.fire("btnclick", ev);
          }, "btnclick")
        })
      ]);
      this.setAria("role", "dialog");
      this.setAria("aria-describedby", props.title);
      this.addDOMEvent("keydown", (ev) => {
        if (ev.key == "Escape") {
          ev.preventDefault();
          ev.stopPropagation();
          if (isString(props.closable)) {
            this.fire("btnclick", { button: props.closable });
          } else {
            this.close();
          }
        } else if (ev.key == "Enter") {
          const def = this.query("button.default");
          if (def) {
            ev.preventDefault();
            ev.stopPropagation();
            def.click();
          }
        }
      });
      asap(() => {
        this.focusNext(true);
      });
    }
    focusNext(next) {
      const focusable = getFocusableElements(this.dom);
      if (!focusable.length) {
        return false;
      } else {
        const first = focusable[0];
        const last = focusable[focusable.length - 1];
        const active = document.activeElement;
        let newf;
        if (!next && active === first) {
          newf = last;
        } else if (next && active === last) {
          newf = first;
        } else {
          const idx = focusable.indexOf(active);
          if (!next) {
            newf = focusable[idx - 1];
          } else {
            newf = focusable[idx + 1];
          }
        }
        if (newf) {
          newf.focus();
          return true;
        }
        return false;
      }
    }
    /**
     * 
     */
    setContent(form) {
      this.dom.replaceChild(form.dom, this.form.dom);
      this.form = form;
    }
    /**
     * 
     */
    getForm() {
      return this.form;
    }
    /**
     * 
     */
    getValues() {
      return this.form.getValues();
    }
    validate() {
      return this.form.validate();
    }
    /**
     * 
     */
    getButton(name) {
      const btns = this.getBtnBar();
      return btns.getButton(name);
    }
    /**
     * 
     */
    queryInterface(name) {
      if (name == "tab-handler") {
        const i = {
          focusNext: /* @__PURE__ */ __name((n) => {
            return this.focusNext(n);
          }, "focusNext")
        };
        return i;
      }
      return super.queryInterface(name);
    }
    /**
     * 
     */
    setTitle(title) {
      this._title.setText(title);
      this.setAria("aria-describedby", title);
    }
    /**
     * 
     */
    getBtnBar() {
      return this.query("#btnbar");
    }
    /**
     * ! cannot stop close action
     */
    async showAsync() {
      return new Promise((resolve) => {
        this.on("btnclick", (ev) => {
          asap(() => {
            this.close();
            resolve(ev.button);
          });
        });
        this.show();
      });
    }
  };
  _init39 = __decoratorStart(_a39);
  _Dialog = __decorateElement(_init39, 0, "Dialog", _Dialog_decorators, _Dialog);
  __name(_Dialog, "Dialog");
  __runInitializers(_init39, 1, _Dialog);
  var Dialog = _Dialog;

  // x4-raw-file:C:\dev\rlibre\y4-2026\demo\frontend\node_modules\x4js\src\components\filedrop\cloud-arrow-up.svg
  var cloud_arrow_up_default = "data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCA2NDAgNTEyIj48IS0tIUZvbnQgQXdlc29tZSBGcmVlIDYuNi4wIGJ5IEBmb250YXdlc29tZSAtIGh0dHBzOi8vZm9udGF3ZXNvbWUuY29tIExpY2Vuc2UgLSBodHRwczovL2ZvbnRhd2Vzb21lLmNvbS9saWNlbnNlL2ZyZWUgQ29weXJpZ2h0IDIwMjQgRm9udGljb25zLCBJbmMuLS0+PHBhdGggZD0iTTE0NCA0ODBDNjQuNSA0ODAgMCA0MTUuNSAwIDMzNmMwLTYyLjggNDAuMi0xMTYuMiA5Ni4yLTEzNS45Yy0uMS0yLjctLjItNS40LS4yLTguMWMwLTg4LjQgNzEuNi0xNjAgMTYwLTE2MGM1OS4zIDAgMTExIDMyLjIgMTM4LjcgODAuMkM0MDkuOSAxMDIgNDI4LjMgOTYgNDQ4IDk2YzUzIDAgOTYgNDMgOTYgOTZjMCAxMi4yLTIuMyAyMy44LTYuNCAzNC42QzU5NiAyMzguNCA2NDAgMjkwLjEgNjQwIDM1MmMwIDcwLjctNTcuMyAxMjgtMTI4IDEyOGwtMzY4IDB6bTc5LTIxN2MtOS40IDkuNC05LjQgMjQuNiAwIDMzLjlzMjQuNiA5LjQgMzMuOSAwbDM5LTM5TDI5NiAzOTJjMCAxMy4zIDEwLjcgMjQgMjQgMjRzMjQtMTAuNyAyNC0yNGwwLTEzNC4xIDM5IDM5YzkuNCA5LjQgMjQuNiA5LjQgMzMuOSAwczkuNC0yNC42IDAtMzMuOWwtODAtODBjLTkuNC05LjQtMjQuNi05LjQtMzMuOSAwbC04MCA4MHoiLz48L3N2Zz4=";

  // node_modules/x4js/src/components/filedrop/filedrop.ts
  var _FileDialog = class _FileDialog extends Component2 {
    constructor(props) {
      super({
        tag: "input",
        style: {
          display: "none"
        },
        attrs: {
          type: "file",
          multiple: props.multiple ?? false,
          accept: props.accept
        },
        dom_events: {
          change: /* @__PURE__ */ __name(() => {
            const files = this.dom.files;
            props.callback(files);
          }, "change")
        }
      });
    }
    showDialog() {
      this.dom.click();
    }
  };
  __name(_FileDialog, "FileDialog");
  var FileDialog = _FileDialog;
  var _FileDrop_decorators, _init40, _a40;
  _FileDrop_decorators = [class_ns("x4")];
  var _FileDrop = class _FileDrop extends (_a40 = VBox) {
    constructor(props) {
      super(props);
      this.mapPropEvents(props, "change");
      let fileDialog = new FileDialog({
        accept: props.accept,
        multiple: props.multiple,
        callback: /* @__PURE__ */ __name((files) => {
          this.fire("change", { files });
        }, "callback")
      });
      this.setContent([
        fileDialog,
        new Icon2({ iconId: props.icon ?? cloud_arrow_up_default }),
        new SimpleText({ text: props.label ?? _tr.global.filedrop })
      ]);
      this.setAttribute("tabIndex", 0);
      this.addDOMEvent("click", () => fileDialog.showDialog());
      this.addDOMEvent("keydown", (e) => {
        if (e.key == " ") {
          fileDialog.showDialog();
        }
      });
      dragManager.registerDropTarget(this, async (cmd, el, infos) => {
        if (cmd == "enter") {
          this.addClass("hit");
        } else if (cmd == "leave") {
          this.removeClass("hit");
        } else if (cmd == "drop") {
          if (infos.data.files && infos.data.files.length > 0) {
            const files = infos.data.files;
            this.fire("change", { files });
          }
        }
      });
    }
  };
  _init40 = __decoratorStart(_a40);
  _FileDrop = __decorateElement(_init40, 0, "FileDrop", _FileDrop_decorators, _FileDrop);
  __name(_FileDrop, "FileDrop");
  __runInitializers(_init40, 1, _FileDrop);
  var FileDrop = _FileDrop;

  // node_modules/x4js/src/components/gauge/gauge.ts
  var linearColorStops = [
    "#01d266",
    "#7cd901",
    "#ffc701",
    "#ff9e01",
    "#ff2e49"
  ];
  var _Gauge_decorators, _init41, _a41;
  _Gauge_decorators = [class_ns("x4")];
  var _Gauge = class _Gauge extends (_a41 = Component2) {
    constructor(props) {
      super(props);
      __publicField(this, "pos");
      __publicField(this, "stops");
      __publicField(this, "uppos");
      this.pos = 70;
      this.stops = [];
      this.setColorStops(props.colors ?? linearColorStops);
      this.addDOMEvent("resized", () => this.update(10));
      this.update();
    }
    setRange(min, max) {
      this.props.min = min;
      this.props.max = max;
      this.update();
    }
    setPos(pos) {
      if (pos != this.pos) {
        this.pos = pos;
        if (this.uppos) {
          this.uppos();
        }
      }
    }
    setColorStops(colors) {
      if (!colors || !colors.length) {
        return;
      }
      this.stops = colors;
      this.update();
    }
    update(delay = 1) {
      const render = /* @__PURE__ */ __name(() => {
        const svg = new SvgBuilder();
        const rc = this.getBoundingRect();
        let width = rc.width;
        let height = Math.min(width, rc.height);
        const step = 180 / this.stops.length;
        let start = -90;
        const grect = centerRect({ left: 0, top: 0, width, height: height / 2 }, { left: 0, top: 0, width, height }, 15);
        const radius = grect.height;
        for (const stop of this.stops) {
          svg.path().arc(grect.left + grect.width / 2, grect.top + grect.height, radius, start, start + step, true).fill("none").stroke(stop, 20);
          start += step;
        }
        if (this.pos < this.props.min) {
          this.pos = this.props.min;
        }
        if (this.pos > this.props.max) {
          this.pos = this.props.max;
        }
        const cx = grect.left + grect.width / 2;
        const needle = svg.path().moveTo(cx, grect.top + grect.height - 4).lineTo(cx - radius + 4, grect.top + grect.height - 2).lineTo(cx - radius + 4, grect.top + grect.height + 2).lineTo(cx, grect.top + grect.height + 4).closePath().addClass("needle");
        svg.circle(grect.left + grect.width / 2, grect.top + grect.height, Math.min(width / 20, height / 20)).addClass("needle-dot");
        this.setContent(new SvgComponent({ id: "", svg, viewbox: `0 0 ${rc.width} ${rc.height}` }));
        const render_needle = /* @__PURE__ */ __name(() => {
          if (this.pos < this.props.min) {
            this.pos = this.props.min;
          }
          if (this.pos > this.props.max) {
            this.pos = this.props.max;
          }
          const pos = (this.pos - this.props.min) / (this.props.max - this.props.min);
          needle.clear_transform();
          needle.rotate(pos * 180, grect.left + grect.width / 2, grect.top + grect.height);
        }, "render_needle");
        render_needle();
        this.uppos = render_needle;
      }, "render");
      this.setTimeout("render", delay, render);
    }
  };
  _init41 = __decoratorStart(_a41);
  _Gauge = __decorateElement(_init41, 0, "Gauge", _Gauge_decorators, _Gauge);
  __name(_Gauge, "Gauge");
  __runInitializers(_init41, 1, _Gauge);
  var Gauge = _Gauge;

  // node_modules/x4js/src/components/image/image.ts
  var _Image_decorators, _init42, _a42;
  _Image_decorators = [class_ns("x4")];
  var _Image = class _Image extends (_a42 = Component2) {
    constructor(props) {
      super(props);
      __publicField(this, "_img");
      this._img = new Component2({
        tag: "img",
        attrs: {
          loading: props.lazy,
          alt: props.alt,
          draggable: props.draggable ?? false
        },
        style: {
          width: "100%",
          height: "100%",
          objectFit: props.fit,
          objectPosition: props.position
        }
      });
      this.setContent(this._img);
      this.setImage(props.src);
      if (props.candrop) {
        this.mapPropEvents(props, "change", "clear");
        let fileDialog = new FileDialog({
          accept: props.accept,
          multiple: false,
          callback: /* @__PURE__ */ __name((files) => {
            this.fire("change", { files });
          }, "callback")
        });
        this.appendContent(fileDialog);
        this.addDOMEvent("click", () => fileDialog.showDialog());
        const filterInput = /* @__PURE__ */ __name((_, data2) => {
          if (data2.items?.length) {
            const type = data2.items[0].type;
            if (/image\/.*/.test(type)) {
              return true;
            }
          }
          return false;
        }, "filterInput");
        dragManager.registerDropTarget(this, async (cmd, el, infos) => {
          if (cmd == "enter") {
            this.addClass("hit");
          } else if (cmd == "leave") {
            this.removeClass("hit");
          } else if (cmd == "drop") {
            if (infos.data.files && infos.data.files.length > 0) {
              const files = infos.data.files;
              this.fire("change", { files });
            }
          }
        }, filterInput);
        this.addDOMEvent("contextmenu", (ev) => {
          const menu = new Menu({
            items: [
              { text: _tr.global.cut, click: /* @__PURE__ */ __name(() => {
                this.fire("clear", {});
              }, "click") }
            ]
          });
          menu.displayAt(ev.pageX, ev.pageY);
          ev.stopPropagation();
          ev.preventDefault();
        });
      }
    }
    /**
     * 
     */
    setImage(src) {
      if (src) {
        this._img.setAttribute("src", src);
      } else {
        this.clear();
      }
    }
    /**
     * 
     */
    setBase64(mime, base64) {
      this.setImage("data:" + mime + ";base64," + base64);
    }
    /**
     * 
     */
    clear() {
      this._img.setAttribute("src", "data:image/gif;base64,R0lGODlhAQABAAAAACH5BAEKAAEALAAAAAABAAEAAAICTAEAOw==");
    }
  };
  _init42 = __decoratorStart(_a42);
  _Image = __decorateElement(_init42, 0, "Image", _Image_decorators, _Image);
  __name(_Image, "Image");
  __runInitializers(_init42, 1, _Image);
  var Image2 = _Image;

  // node_modules/x4js/src/components/gridview/gridview.ts
  var SCROLL_LIMIT = 200;
  var _Gridview_decorators, _init43, _a43;
  _Gridview_decorators = [class_ns("x4")];
  var _Gridview = class _Gridview extends (_a43 = Component2) {
    constructor(props) {
      super(props);
      __publicField(this, "_dataview");
      __publicField(this, "_datamodel");
      __publicField(this, "_columns");
      __publicField(this, "_lock");
      __publicField(this, "_dirty");
      __publicField(this, "_row_height");
      __publicField(this, "_left");
      __publicField(this, "_top");
      __publicField(this, "_body");
      __publicField(this, "_viewport");
      __publicField(this, "_fheader");
      // fixed col header
      __publicField(this, "_hheader");
      // col header
      __publicField(this, "_vheader");
      // vertical row header
      __publicField(this, "_ffooter");
      // fixed footer
      __publicField(this, "_footer");
      // footer
      __publicField(this, "_vis_rows");
      __publicField(this, "_start");
      __publicField(this, "_end");
      __publicField(this, "_selection");
      // TODO: that
      __publicField(this, "_num_fmt", new Intl.NumberFormat("fr-FR"));
      __publicField(this, "_mny_fmt", new Intl.NumberFormat("fr-FR", { style: "currency", currency: "EUR" }));
      __publicField(this, "_dte_fmt", new Intl.DateTimeFormat("fr-FR", {}));
      __publicField(this, "_dtetme_fmt", new Intl.DateTimeFormat("fr-FR", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" }));
      __publicField(this, "_has_fixed");
      __publicField(this, "_has_footer");
      this._lock = 0;
      this._dirty = 0;
      this._row_height = 32;
      this._left = 0;
      this._top = 0;
      this._vis_rows = /* @__PURE__ */ new Map();
      this._selection = /* @__PURE__ */ new Set();
      this._has_fixed = false;
      this._has_footer = props.footer === true;
      if (props.footer instanceof Component2) {
        props.footer.addClass("gadget-footer packed");
      }
      this._columns = props.columns.map((x) => x);
      this.mapPropEvents(props, "click", "dblClick", "contextMenu", "selectionChange");
      this.lock(true);
      this.setAttribute("tabindex", 0);
      this.addDOMEvent("created", () => {
        this._init();
        this._dirty = 1;
        this.lock(false);
      });
      this.addDOMEvent("resized", () => {
        this._updateFlexs();
        this._computeFullSize();
        this._update(true);
      });
      this.addDOMEvent("keydown", (e) => {
        this._on_key(e);
      });
      if (props.store) {
        this.setStore(props.store);
        if (props.sort) {
          this.sortCol(props.sort.field_id, props.sort.asc === true);
        }
      }
    }
    /**
     * 
     */
    _on_key(ev) {
      if (this.isDisabled()) {
        return;
      }
      switch (ev.key) {
        case "ArrowDown": {
          this.navigate(4 /* next */);
          break;
        }
        case "ArrowUp": {
          this.navigate(1 /* prev */);
          break;
        }
        case "Home": {
          this.navigate(0 /* first */);
          break;
        }
        case "End": {
          this.navigate(5 /* last */);
          break;
        }
        case "PageDown": {
          this.navigate(2 /* pgdn */);
          break;
        }
        case "PageUp": {
          this.navigate(3 /* pgup */);
          break;
        }
        default:
          return;
      }
      ev.preventDefault();
      ev.stopPropagation();
    }
    /**
     * 
     */
    navigate(sens) {
      if (!this._selection.size) {
        if (sens == 4 /* next */ || sens == 2 /* pgdn */) {
          sens = 0 /* first */;
        } else {
          sens = 5 /* last */;
        }
      }
      if (sens == 0 /* first */ || sens == 5 /* last */) {
        let nel = sens == 0 /* first */ ? 0 : this._dataview.getCount() - 1;
        this._clearSelection(false);
        this._addSelection(nel);
        this._scrollToIndex(nel);
        return true;
      } else if (sens == 1 /* prev */ || sens == 4 /* next */) {
        const fsel = this._selection.values().next().value;
        let nel = sens == 4 /* next */ ? fsel + 1 : fsel - 1;
        if (nel >= 0 && nel < this._dataview.getCount()) {
          this._clearSelection(false);
          this._addSelection(nel);
          this._scrollToIndex(nel);
          return true;
        }
      } else if (sens == 2 /* pgdn */ || sens == 3 /* pgup */) {
        const pgh = this._vis_rows.size;
        const fsel = this._selection.values().next().value;
        let sby = sens == 2 /* pgdn */ ? pgh : -pgh;
        let nel = fsel + sby;
        if (nel < 0) {
          nel = 0;
        } else if (nel >= this._dataview.getCount()) {
          nel = this._dataview.getCount() - 1;
        }
        if (nel != fsel) {
          this._clearSelection(false);
          this._addSelection(nel);
          if (this._dataview.getCount() < SCROLL_LIMIT) {
            sby *= this._row_height;
          }
          this._viewport.dom.scrollBy(0, sby);
          return true;
        }
      }
      return false;
    }
    /**
     * 
     */
    _scrollToIndex(index, block = "nearest") {
      let rows = this.queryAll(`.row[data-row="${index}"]`);
      if (rows.length) {
        rows.forEach((row) => {
          row.scrollIntoView({ block });
        });
      } else {
        let top = index;
        if (this._dataview.getCount() < SCROLL_LIMIT) {
          top *= this._row_height;
        }
        this._viewport.dom.scrollTo(0, top);
      }
    }
    /**
     * 
     */
    setStore(store) {
      const on_change = /* @__PURE__ */ __name((ev) => {
        if (!this._viewport) {
          return;
        }
        if (ev.change_type == "change") {
          this._selection.clear();
        }
        this._updateFlexs();
        this._computeFullSize();
        this._update(true);
      }, "on_change");
      if (this._dataview) {
        this._dataview.off("view_change", on_change);
      }
      if (store) {
        this._dataview = new DataView({ store });
        this._datamodel = store.getModel();
        this._dataview.on("view_change", on_change);
      } else {
        this._dataview = null;
        this._datamodel = null;
      }
    }
    /*
    	setColumns( columns: GridColumn[] ) {
    		this._columns = columns.map(x => x);
    
    		if( this.dom ) {
    			this._updateFlexs( );
    			
    			// Rebuild headers
    			if (this._fheader) {
    				const newFixedHeader = this._buildColHeader(true);
    				this._fheader.setContent(newFixedHeader.getChildren());
    				// On doit remplacer _fheader dans le DOM ou mettre à jour son contenu
    				// La méthode _buildColHeader retourne une Box.
    				// Ici, je vais simplifier en vidant et remplissant si possible, 
    				// mais Box n'a pas forcément de méthode simple pour remplacer tout le DOM interne sans casser les events.
    				// Le plus simple est de remplacer les composants header dans le DOM global du gridview.
    				
    				// Approche : on recrée les headers et on remplace les anciens
    				this._fheader.destroy();
    				this._hheader.destroy();
    				
    				this._fheader = this._buildColHeader(true);
    				this._hheader = this._buildColHeader(false);
    				
    				// Il faut réinsérer ces headers au bon endroit dans le DOM du Gridview.
    				// _init fait: 
    				// 		this.setContent([
    				//			this._fheader,
    				//			this._hheader,
    				//			this._vheader,
    				//			this._viewport,
    				//			this._ffooter,
    				//			this._footer,
    				//		]);
    				
    				// Donc on peut reconstruire le content complet
    				const content = [
    					this._fheader,
    					this._hheader,
    					this._vheader,
    					this._viewport
    				];
    				
    				if (this._has_footer) {
    					this._ffooter.destroy();
    					this._footer.destroy();
    					this._ffooter = this._buildColFooter(true);
    					this._footer = this._buildColFooter(false);
    					content.push(this._ffooter);
    					content.push(this._footer);
    				}
    				
    				this.setContent(content);
    			}
    
    			this._computeFullSize( );
    			this._update( true );
    		}
    	}
    	*/
    getView() {
      return this._dataview;
    }
    /**
     * 
     */
    lock(lock) {
      if (lock) {
        this._lock++;
      } else {
        if (--this._lock == 0 && this._dirty) {
          this._update(true);
        }
      }
    }
    _getColCount() {
      return this._columns.length;
    }
    _getCol(index) {
      return this._columns[index];
    }
    /**
     * 
     */
    _buildColHeader(fixed) {
      const els = [];
      const count = this._getColCount();
      for (let col = 0; col < count; col++) {
        const cdata = this._getCol(col);
        if (!!cdata.fixed != fixed) {
          continue;
        }
        const sizer = new CSizer("right");
        sizer.on("stop", () => {
          this._updateFlexs();
        });
        sizer.on("resize", (ev) => {
          cdata.width = ev.size;
          cdata.flex = 0;
          const cols = this.queryAll(`[data-col="${col}"]`);
          cols.forEach((c) => {
            c.setStyleValue("width", ev.size + "px");
          });
          const rh = header.getBoundingRect();
          if (!fixed) {
            this._body.setStyleValue("width", rh.width + "px");
          } else {
            this.setStyleVariable("--fixed-width", rh.width + "px");
          }
        });
        const cell = new Component2({
          cls: `cell`,
          attrs: { "data-col": col },
          style: { width: cdata.width ? cdata.width + "px" : void 0 },
          content: [
            new SimpleText({ cls: "title", text: cdata.title, align: cdata.header_align ?? "left" }),
            new Component2({ cls: "sorter" }),
            sizer
          ]
        });
        cell.addDOMEvent("touchend", () => {
          const last = cell.getInternalData("touchend");
          const now = Date.now();
          const delta = last ? now - last : 0;
          if (delta > 30 && delta < 300) {
            this._sortCol(col);
          } else {
            cell.setInternalData("touchend", now);
          }
        });
        cell.addDOMEvent("dblclick", () => {
          this._sortCol(col);
        });
        els.push(cell);
      }
      if (fixed && els.length == 0) {
        return null;
      }
      const header = new Box({ cls: "col-header", content: els });
      header.setClass("fixed", fixed);
      return header;
    }
    /**
     * 
     */
    _buildColFooter(fixed) {
      if (!this.props.footer) {
        return null;
      }
      const els = [];
      const count = this._getColCount();
      for (let col = 0; col < count; col++) {
        const cdata = this._getCol(col);
        if (!!cdata.fixed != fixed) {
          continue;
        }
        const cell = new Component2({
          cls: `cell`,
          attrs: { "data-col": col },
          style: { width: cdata.width ? cdata.width + "px" : void 0 },
          content: [
            new SimpleText({ text: cdata.footer_val })
          ]
        });
        cell.addDOMEvent("dblclick", () => {
          this._sortCol(col);
        });
        els.push(cell);
      }
      if (fixed && els.length == 0) {
        return null;
      }
      const footer = new Box({ cls: "col-footer", content: els });
      footer.setClass("fixed", fixed);
      return footer;
    }
    /**
     * 
     */
    _sortCol(col, ascending) {
      this.setTimeout("sort", 50, () => {
        let asc = true;
        const scol = this.query(`.col-header .cell[data-col="${col}"]`);
        if (!scol) {
          return;
        }
        if (ascending === void 0) {
          if (scol.hasClass("sorted")) {
            if (scol.hasClass("desc")) {
              asc = true;
            } else {
              asc = false;
            }
          } else {
            const sorted = this.queryAll(".sorted");
            sorted.forEach((x) => x.removeClass("sorted asc desc"));
          }
        } else {
          asc = ascending;
        }
        scol.setClass("sorted");
        scol.setClass("desc", !asc);
        const cdata = this._getCol(col);
        let num2 = false;
        switch (cdata.type) {
          case "checkbox":
          case "money":
          case "number":
          case "percent": {
            num2 = true;
          }
        }
        setWaitCursor(true);
        this._dataview.sort([{
          field: cdata.id,
          ascending: asc,
          numeric: num2,
          callback: cdata.sortable instanceof Function ? cdata.sortable : void 0
        }]);
        this._update(true);
        setWaitCursor(false);
      });
    }
    /**
     * 
     */
    sortCol(colIdx, ascending) {
      const idx = this._columns.findIndex((x) => x.id === colIdx);
      if (idx >= 0) {
        this._sortCol(idx, ascending);
      }
    }
    /**
     * 
     */
    _renderCell(rec, column, extra_cls) {
      const col = column.id;
      const type = column.type;
      let data2 = this._datamodel.getRaw(col, rec);
      if (data2 === void 0 || data2 === null) {
        return null;
      }
      if (column.renderer) {
        const cell = column.renderer(rec, col);
        return cell;
      }
      let cls = "";
      if (column.classifier) {
        extra_cls.push(column.classifier(data2, rec, col));
      }
      if (data2 instanceof Function) {
        return data2(rec, col);
      }
      if (column.formatter) {
        return column.formatter(data2);
      }
      switch (type) {
        case "checkbox": {
          if (data2) {
            return new Icon2({ cls: "cell-check" + cls, iconId: icons_default.check });
          }
          return void 0;
        }
        case "image": {
          if (isString(data2)) {
            return new Image2({ cls, src: data2, fit: "scale-down" });
          }
          return void 0;
        }
        case "number": {
          if (!isNumber(data2)) {
            return "NaN";
          }
          data2 = this._num_fmt.format(data2);
          break;
        }
        case "money": {
          if (!isNumber(data2)) {
            return "NaN";
          }
          data2 = this._mny_fmt.format(data2);
          break;
        }
        case "percent": {
          return new Box({
            cls: "percent" + cls,
            content: new Component2({ cls: "bar", width: data2 + "%" })
          });
        }
        case "icon": {
          return new Icon2({ cls, iconId: data2 + "" });
        }
        case "date": {
          if (isString(data2)) {
            data2 = new Date(data2);
          }
          data2 = this._dte_fmt.format(data2);
          break;
        }
        case "date-time": {
          if (isString(data2)) {
            data2 = new Date(data2);
          }
          data2 = this._dtetme_fmt.format(data2);
          break;
        }
        default: {
          data2 = data2 + "";
          break;
        }
      }
      return new Component2({
        tag: "span",
        cls,
        content: data2,
        tooltip: column.tooltip ? data2 : void 0
      });
    }
    /**
     * 
     */
    _buildRow(rowid, rec, top) {
      const els = [];
      const count = this._getColCount();
      for (let col = 0; col < count; col++) {
        const cdata = this._getCol(col);
        if (cdata.fixed) {
          continue;
        }
        const extra = [];
        const content = this._renderCell(rec, cdata, extra);
        let align;
        switch (cdata.align) {
          case "center":
            align = "center";
            break;
          case "right":
            align = "end";
            break;
        }
        const el = new Component2({
          cls: "cell",
          style: { width: cdata?.width ? cdata.width + "px" : void 0, justifyContent: align },
          content
        });
        if (extra.length) {
          el.addClass(extra.join(" "));
        }
        if (cdata.type) {
          el.addClass(cdata.type);
        }
        el.setData("col", col + "");
        el.setData("row", rowid + "");
        els.push(el);
      }
      const rowel = new Box({ cls: "row", style: { top: top.toFixed(2) + "px" }, content: els });
      rowel.setData("row", rowid + "");
      if (this._selection.has(rowid)) {
        rowel.addClass("selected");
      }
      if (rowid & 1) {
        rowel.addClass("even");
      } else {
        rowel.addClass("odd");
      }
      return rowel;
    }
    /**
     * 
     */
    _buildRowHeader(rowid, rec, top) {
      const cols = [];
      const count = this._getColCount();
      for (let col = 0; col < count; col++) {
        const cdata = this._getCol(col);
        if (!cdata?.fixed) {
          continue;
        }
        const content = this._renderCell(rec, cdata, [cdata.type]);
        let align = "start";
        switch (cdata.align) {
          default:
            align = "start";
            break;
          case "center":
            align = "center";
            break;
          case "right":
            align = "end";
            break;
        }
        const el = new Component2({
          cls: "cell",
          style: { width: cdata?.width ? cdata.width + "px" : void 0, justifyContent: align },
          content
        });
        if (cdata.type) {
          el.addClass(cdata.type);
        }
        el.setData("col", col + "");
        el.setData("row", rowid + "");
        cols.push(el);
      }
      const rowel = new Box({ cls: "row", style: { top: top + "px" }, content: cols });
      rowel.setData("row", rowid + "");
      if (this._selection.has(rowid)) {
        rowel.addClass("selected");
      }
      return rowel;
    }
    /**
     * 
     */
    _updateFlexs() {
      let maxw = 0;
      let flexc = 0;
      const ccount = this._getColCount();
      for (let x = 0; x < ccount; x++) {
        const cdata = this._getCol(x);
        if (!cdata.fixed && cdata.flex) {
          flexc += cdata.flex;
        } else {
          maxw += cdata.width;
        }
      }
      if (flexc) {
        const width = this._viewport.dom.clientWidth;
        const delta = width - maxw;
        const fw = delta / flexc;
        for (let col = 0; col < ccount; col++) {
          const cdata = this._getCol(col);
          if (!cdata.fixed && cdata.flex) {
            cdata.width = Math.max(cdata.flex * fw, 32);
            const cols = this.queryAll(`[data-col="${col}"]`);
            cols.forEach((c) => {
              c.setStyleValue("width", cdata.width + "px");
            });
          }
        }
      }
    }
    /**
     * 
     */
    _computeFullSize() {
      let maxw = 0;
      let maxfw = 0;
      const ccount = this._getColCount();
      for (let x = 0; x < ccount; x++) {
        const cdata = this._getCol(x);
        let w = 0;
        if (cdata.fixed) {
          this._has_fixed = true;
        }
        if (cdata.width) {
          w += cdata.width;
        }
        if (cdata.fixed) {
          maxfw += w;
        } else {
          maxw += w;
        }
      }
      const maxr = this._dataview ? this._dataview.getCount() : 0;
      let maxh = maxr;
      if (maxr < SCROLL_LIMIT) {
        maxh *= this._row_height;
      } else {
        const height = this._body.dom.parentElement.clientHeight;
        const npage = height / this._row_height;
        maxh = maxr - Math.floor(npage) + npage * this._row_height;
      }
      this.setStyleVariable("--fixed-width", maxfw + "px");
      this._body.setStyleValue("height", maxh == 0 ? "100%" : maxh + "px");
      this._body.setStyleValue("width", maxw + "px");
      this._vheader.setStyleValue("height", maxh + "px");
    }
    /**
     * 
     */
    _init() {
      this._body = new Component2({ cls: "body" });
      this._viewport = new Viewport({ content: this._body });
      if (!this.props.footer) {
        this.setStyleVariable("--footer-height", "0");
      }
      this._viewport.addDOMEvent("scroll", (ev) => {
        this._left = this._viewport.dom.scrollLeft;
        this.setStyleVariable("--left", -this._left + "px");
        this._top = this._viewport.dom.scrollTop;
        this.setStyleVariable("--top", -this._top + "px");
        this._update();
      });
      this.addDOMEvent("wheel", (ev) => {
        if (ev.deltaY && this._dataview && this._dataview.getCount() >= SCROLL_LIMIT) {
          this._viewport.dom.scrollBy(0, ev.deltaY < 0 ? -1 : 1);
          ev.stopPropagation();
          ev.preventDefault();
        }
        if (this._has_fixed && ev.deltaY) {
          let t = ev.target;
          while (t != this.dom) {
            if (t == this._vheader.dom) {
              this._viewport.dom.scrollBy(0, ev.deltaY < 0 ? -this._row_height : this._row_height);
              ev.stopPropagation();
              ev.preventDefault();
              break;
            }
            t = t.parentNode;
          }
        }
      });
      const targetRow = /* @__PURE__ */ __name((e) => {
        let el = Component2.parentElement(e.target, Component2);
        while (el && !el.hasClass("row")) {
          el = el.parentElement();
        }
        if (el) {
          return el.getIntData("row");
        }
        return void 0;
      }, "targetRow");
      this.addDOMEvent("click", (e) => {
        const row = targetRow(e);
        if (row !== void 0) {
          if (!this._selection.has(row)) {
            this._clearSelection(false);
            this._addSelection(row);
          }
        } else {
          this._clearSelection(true);
        }
      });
      this.addDOMEvent("dblclick", (e) => {
        const row = targetRow(e);
        if (row !== void 0) {
          if (!this._selection.has(row)) {
            this._clearSelection(false);
            this._addSelection(row);
          }
          this._on_dblclk(e, row);
          const rec = this._dataview.getByIndex(row);
          this.fire("dblClick", { context: rec });
        }
      });
      this.addDOMEvent("contextmenu", (e) => {
        const row = targetRow(e);
        if (row !== void 0) {
          if (!this._selection.has(row)) {
            this._clearSelection(false);
            this._addSelection(row);
          }
          const rec = this._dataview.getByIndex(row);
          this.fire("contextMenu", { uievent: e, context: rec });
        }
        e.preventDefault();
        e.stopPropagation();
      });
      this.addDOMEvent("mouseover", (e) => {
        if (!this._has_fixed) {
          return;
        }
        let el = Component2.parentElement(e.target, Component2);
        while (el && !el.hasClass("row")) {
          el = el.parentElement();
        }
        if (el) {
          const data2 = el.getData("row");
          this.queryAll(".hover").forEach((x) => x.removeClass("hover"));
          if (data2) {
            const rows = this.queryAll(`.row[data-row="${data2}"]`);
            rows.forEach((x) => x.addClass("hover"));
          }
        }
      });
      this.addDOMEvent("mouseleave", (e) => {
        if (!this._has_fixed) {
          return;
        }
        this.queryAll(".hover").forEach((x) => x.removeClass("hover"));
      });
      this._updateFlexs();
      this._fheader = this._buildColHeader(true);
      this._hheader = this._buildColHeader(false);
      this._vheader = new Box({ cls: "row-header" });
      let rfooter = null;
      if (this._has_footer === true) {
        this._ffooter = this._buildColFooter(true);
        this._footer = this._buildColFooter(false);
      } else if (this.props.footer) {
        rfooter = this.props.footer;
      }
      this.setContent([this._viewport, this._fheader, this._hheader, this._ffooter, this._footer, rfooter, this._vheader]);
      {
        const rh = this.getStyleVariable("--row-height");
        this._row_height = parseInt(rh);
      }
      this._computeFullSize();
    }
    /**
     * 
     */
    _on_dblclk(e, row) {
    }
    /**
     * 
     */
    _update(force = false) {
      if (!this._lock) {
        const rc = this.getBoundingRect();
        const rowc = this._dataview ? this._dataview.getCount() : 0;
        if (rowc == 0) {
          this._body.setContent(new Label({ cls: "empty vertical", icon: icons_default.empty, text: this.props.emptyMsg ?? _tr.global.empty_list }));
          return;
        }
        const mul = rowc < SCROLL_LIMIT ? this._row_height : 1;
        const start = Math.floor(this._top / mul);
        const end = start + Math.ceil(rc.height / this._row_height);
        const hasFixed = this._has_fixed;
        if (this._start != start || this._end != end || force) {
          const rows = [];
          const headers = [];
          if (force) {
            this._vis_rows.clear();
          }
          let newvis = /* @__PURE__ */ new Map();
          let y = start * mul;
          for (let row = start; row < end && row < rowc; row++, y += this._row_height) {
            let el = this._vis_rows.get(row);
            const rec = this._dataview.getByIndex(row);
            if (hasFixed) {
              if (!el) {
                el = {
                  h: this._buildRowHeader(row, rec, y),
                  r: this._buildRow(row, rec, y)
                };
              } else {
                el.h.setStyleValue("top", y + "px");
                el.r.setStyleValue("top", y + "px");
              }
              headers.push(el.h);
            } else {
              if (!el) {
                el = { h: null, r: this._buildRow(row, rec, y) };
              } else {
                el.r.setStyleValue("top", y + "px");
              }
            }
            rows.push(el.r);
            newvis.set(row, el);
          }
          if (hasFixed) {
            headers.push(new Component2({ cls: "cell-out", style: { top: y + "px" } }));
          }
          this._vis_rows = newvis;
          this._start = start;
          this._end = end;
          this._body.setContent(rows);
          if (hasFixed) {
            this._vheader.removeClass("@hidden");
            this._vheader.setContent(headers);
          } else {
            this._vheader.addClass("@hidden");
          }
        }
      }
    }
    /**
     * 
     */
    clearSelection() {
      this._clearSelection(false);
    }
    _clearSelection(notify) {
      if (!this._selection.size) {
        return;
      }
      for (const ref of this._selection.keys()) {
        const els = this.queryAll(`.row[data-row="${ref}"]`);
        els.forEach((el) => {
          el.removeClass("selected");
        });
      }
      this._selection.clear();
      if (notify) {
        this.fire("selectionChange", { selection: [], empty: true });
      }
    }
    /**
     * 
     */
    _addSelection(rowid) {
      this._selection.add(rowid);
      const els = this.queryAll(`.row[data-row="${rowid}"]`);
      els.forEach((el) => {
        el.addClass("selected");
      });
      const rec = this._dataview.getByIndex(rowid);
      this.fire("selectionChange", { selection: [rec], empty: false });
    }
    /**
     * 
     */
    getSelection() {
      if (this._selection.size == 0) {
        return null;
      }
      const ids = [...this._selection.values()];
      return ids.map((id) => this._dataview.getByIndex(id));
    }
    /**
     * 
     */
    getFirstSel() {
      if (this._selection.size == 0) {
        return null;
      }
      const id = this._selection.values().next().value;
      return this._dataview.getByIndex(id);
    }
    /**
     * 
     */
    selectItem(id, ensureVisible = true) {
      const index = this._dataview.indexOfId(id);
      if (index >= 0) {
        this._addSelection(index);
        if (ensureVisible) {
          this._scrollToIndex(index);
        }
      }
    }
    /**
     * 
     */
    setColTitle(col_name, title) {
      const col = this._columns.findIndex((x) => x.id == col_name);
      if (col >= 0) {
        this._columns[col].title = title;
        const el = this._hheader.query(`[data-col="${col}"] .title`);
        el.setText(title);
      }
    }
  };
  _init43 = __decoratorStart(_a43);
  _Gridview = __decorateElement(_init43, 0, "Gridview", _Gridview_decorators, _Gridview);
  __name(_Gridview, "Gridview");
  __runInitializers(_init43, 1, _Gridview);
  var Gridview = _Gridview;

  // node_modules/x4js/src/components/header/header.ts
  var CELL_MW = 8;
  var _Header_decorators, _init44, _a44;
  _Header_decorators = [class_ns("x4")];
  var _Header = class _Header extends (_a44 = HBox) {
    constructor(props) {
      super(props);
      __publicField(this, "_els");
      __publicField(this, "_vwp");
      this._els = props.items?.map((x, index) => {
        if (!x.name) {
          x.name = `ref-c${index + 1}`;
        }
        const cell = new Label({ cls: "cell", text: x.title, icon: x.iconId });
        const sizer = new CSizer("right");
        if (x.width > 0) {
          cell.setStyleValue("width", x.width + "px");
          cell.setInternalData("width", x.width);
        } else if (x.width < 0) {
          cell.setInternalData("flex", -x.width);
        } else {
          cell.setInternalData("width", 0);
        }
        sizer.addDOMEvent("dblclick", (e) => {
          cell.setInternalData("flex", 1);
          this._calc_sizes();
        });
        sizer.on("start", () => {
        });
        sizer.on("stop", () => {
        });
        sizer.on("resize", (ev) => {
          const sze = ev.size < CELL_MW ? CELL_MW : ev.size;
          cell.setInternalData("flex", 0);
          cell.setInternalData("width", sze);
          this._calc_sizes();
        });
        cell.appendContent(sizer);
        cell.setInternalData("data", x);
        return cell;
      });
      this.addDOMEvent("resized", () => this._on_resize());
      this.addDOMEvent("created", () => this._calc_sizes());
      this._vwp = new HBox({ content: this._els });
      this.setContent(this._vwp);
    }
    _calc_sizes() {
      let count = 0;
      let filled = 0;
      this._els.forEach((c) => {
        const flex = c.getInternalData("flex");
        if (flex) {
          count += flex;
        } else {
          let width = c.getInternalData("width");
          if (width == 0) {
            const rc2 = c.getBoundingRect();
            width = Math.ceil(rc2.width) + 2;
            c.setInternalData("width", width);
          }
          filled += width;
        }
      });
      const rc = this.getBoundingRect();
      const cs = this.getComputedStyle();
      let rest = rc.width - filled - getScrollbarSize() - parseFloat(cs.paddingLeft) - parseFloat(cs.paddingRight);
      const unit = Math.ceil(rest / count);
      let fullw = 0;
      this._els.forEach((c) => {
        let width = 0;
        const flex = c.getInternalData("flex");
        if (flex) {
          width = Math.floor(Math.min(unit * flex, rest));
          rest -= width;
        } else {
          width = c.getInternalData("width");
        }
        if (width < CELL_MW) {
          width = CELL_MW;
        }
        c.setWidth(width);
        const item = c.getInternalData("data");
        if (!this.props.target) {
          this.parentElement().setStyleVariable(`--${item.name}-width`, width + "px");
        } else {
          this.props.target?.setStyleVariable(`--${item.name}-width`, width + "px");
        }
        fullw += width;
      });
      this._vwp.setWidth(fullw);
    }
    _on_resize() {
      this._calc_sizes();
    }
  };
  _init44 = __decoratorStart(_a44);
  _Header = __decorateElement(_init44, 0, "Header", _Header_decorators, _Header);
  __name(_Header, "Header");
  __runInitializers(_init44, 1, _Header);
  var Header = _Header;

  // x4-raw-file:C:\dev\rlibre\y4-2026\demo\frontend\node_modules\x4js\src\components\keyboard\delete-left.svg
  var delete_left_default = "data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCA1NzYgNTEyIiBmaWxsPSJjdXJyZW50Q29sb3IiPjwhLS0hRm9udCBBd2Vzb21lIEZyZWUgNi43LjAgYnkgQGZvbnRhd2Vzb21lIC0gaHR0cHM6Ly9mb250YXdlc29tZS5jb20gTGljZW5zZSAtIGh0dHBzOi8vZm9udGF3ZXNvbWUuY29tL2xpY2Vuc2UvZnJlZSBDb3B5cmlnaHQgMjAyNCBGb250aWNvbnMsIEluYy4tLT48cGF0aCBkPSJNNTc2IDEyOGMwLTM1LjMtMjguNy02NC02NC02NEwyMDUuMyA2NGMtMTcgMC0zMy4zIDYuNy00NS4zIDE4LjdMOS40IDIzMy40Yy02IDYtOS40IDE0LjEtOS40IDIyLjZzMy40IDE2LjYgOS40IDIyLjZMMTYwIDQyOS4zYzEyIDEyIDI4LjMgMTguNyA0NS4zIDE4LjdMNTEyIDQ0OGMzNS4zIDAgNjQtMjguNyA2NC02NGwwLTI1NnpNMjcxIDE3NWM5LjQtOS40IDI0LjYtOS40IDMzLjkgMGw0NyA0NyA0Ny00N2M5LjQtOS40IDI0LjYtOS40IDMzLjkgMHM5LjQgMjQuNiAwIDMzLjlsLTQ3IDQ3IDQ3IDQ3YzkuNCA5LjQgOS40IDI0LjYgMCAzMy45cy0yNC42IDkuNC0zMy45IDBsLTQ3LTQ3LTQ3IDQ3Yy05LjQgOS40LTI0LjYgOS40LTMzLjkgMHMtOS40LTI0LjYgMC0zMy45bDQ3LTQ3LTQ3LTQ3Yy05LjQtOS40LTkuNC0yNC42IDAtMzMuOXoiLz48L3N2Zz4=";

  // x4-raw-file:C:\dev\rlibre\y4-2026\demo\frontend\node_modules\x4js\src\components\keyboard\arrow-up.svg
  var arrow_up_default = "data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCAzODQgNTEyIiBmaWxsPSJjdXJyZW50Q29sb3IiPjwhLS0hRm9udCBBd2Vzb21lIEZyZWUgNi43LjAgYnkgQGZvbnRhd2Vzb21lIC0gaHR0cHM6Ly9mb250YXdlc29tZS5jb20gTGljZW5zZSAtIGh0dHBzOi8vZm9udGF3ZXNvbWUuY29tL2xpY2Vuc2UvZnJlZSBDb3B5cmlnaHQgMjAyNCBGb250aWNvbnMsIEluYy4tLT48cGF0aCBkPSJNMjE0LjYgNDEuNGMtMTIuNS0xMi41LTMyLjgtMTIuNS00NS4zIDBsLTE2MCAxNjBjLTEyLjUgMTIuNS0xMi41IDMyLjggMCA0NS4zczMyLjggMTIuNSA0NS4zIDBMMTYwIDE0MS4yIDE2MCA0NDhjMCAxNy43IDE0LjMgMzIgMzIgMzJzMzItMTQuMyAzMi0zMmwwLTMwNi43TDMyOS40IDI0Ni42YzEyLjUgMTIuNSAzMi44IDEyLjUgNDUuMyAwczEyLjUtMzIuOCAwLTQ1LjNsLTE2MC0xNjB6Ii8+PC9zdmc+";

  // x4-raw-file:C:\dev\rlibre\y4-2026\demo\frontend\node_modules\x4js\src\components\keyboard\eye-slash.svg
  var eye_slash_default = "data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCA2NDAgNTEyIiBmaWxsPSJjdXJyZW50Q29sb3IiPjwhLS0hRm9udCBBd2Vzb21lIEZyZWUgNi43LjAgYnkgQGZvbnRhd2Vzb21lIC0gaHR0cHM6Ly9mb250YXdlc29tZS5jb20gTGljZW5zZSAtIGh0dHBzOi8vZm9udGF3ZXNvbWUuY29tL2xpY2Vuc2UvZnJlZSBDb3B5cmlnaHQgMjAyNCBGb250aWNvbnMsIEluYy4tLT48cGF0aCBkPSJNMzguOCA1LjFDMjguNC0zLjEgMTMuMy0xLjIgNS4xIDkuMlMtMS4yIDM0LjcgOS4yIDQyLjlsNTkyIDQ2NGMxMC40IDguMiAyNS41IDYuMyAzMy43LTQuMXM2LjMtMjUuNS00LjEtMzMuN0w1MjUuNiAzODYuN2MzOS42LTQwLjYgNjYuNC04Ni4xIDc5LjktMTE4LjRjMy4zLTcuOSAzLjMtMTYuNyAwLTI0LjZjLTE0LjktMzUuNy00Ni4yLTg3LjctOTMtMTMxLjFDNDY1LjUgNjguOCA0MDAuOCAzMiAzMjAgMzJjLTY4LjIgMC0xMjUgMjYuMy0xNjkuMyA2MC44TDM4LjggNS4xem0xNTEgMTE4LjNDMjI2IDk3LjcgMjY5LjUgODAgMzIwIDgwYzY1LjIgMCAxMTguOCAyOS42IDE1OS45IDY3LjdDNTE4LjQgMTgzLjUgNTQ1IDIyNiA1NTguNiAyNTZjLTEyLjYgMjgtMzYuNiA2Ni44LTcwLjkgMTAwLjlsLTUzLjgtNDIuMmM5LjEtMTcuNiAxNC4yLTM3LjUgMTQuMi01OC43YzAtNzAuNy01Ny4zLTEyOC0xMjgtMTI4Yy0zMi4yIDAtNjEuNyAxMS45LTg0LjIgMzEuNWwtNDYuMS0zNi4xek0zOTQuOSAyODQuMmwtODEuNS02My45YzQuMi04LjUgNi42LTE4LjIgNi42LTI4LjNjMC01LjUtLjctMTAuOS0yLTE2Yy43IDAgMS4zIDAgMiAwYzQ0LjIgMCA4MCAzNS44IDgwIDgwYzAgOS45LTEuOCAxOS40LTUuMSAyOC4yem05LjQgMTMwLjNDMzc4LjggNDI1LjQgMzUwLjcgNDMyIDMyMCA0MzJjLTY1LjIgMC0xMTguOC0yOS42LTE1OS45LTY3LjdDMTIxLjYgMzI4LjUgOTUgMjg2IDgxLjQgMjU2YzguMy0xOC40IDIxLjUtNDEuNSAzOS40LTY0LjhMODMuMSAxNjEuNUM2MC4zIDE5MS4yIDQ0IDIyMC44IDM0LjUgMjQzLjdjLTMuMyA3LjktMy4zIDE2LjcgMCAyNC42YzE0LjkgMzUuNyA0Ni4yIDg3LjcgOTMgMTMxLjFDMTc0LjUgNDQzLjIgMjM5LjIgNDgwIDMyMCA0ODBjNDcuOCAwIDg5LjktMTIuOSAxMjYuMi0zMi41bC00MS45LTMzek0xOTIgMjU2YzAgNzAuNyA1Ny4zIDEyOCAxMjggMTI4YzEzLjMgMCAyNi4xLTIgMzguMi01LjhMMzAyIDMzNGMtMjMuNS01LjQtNDMuMS0yMS4yLTUzLjctNDIuM2wtNTYuMS00NC4yYy0uMiAyLjgtLjMgNS42LS4zIDguNXoiLz48L3N2Zz4=";

  // node_modules/x4js/src/components/keyboard/keyboard.ts
  var kb_def = {
    "fr-FR": {
      lines: {
        lower: [
          "1 2 3 4 5 6 7 8 9 0",
          "a z e r t y u i o p {2}",
          "q s d f g h j k l m {3}",
          "{4} w x c v b n , . {4}",
          "{5} {6} ' {7}"
        ],
        upper: [
          "! @ # $ % ^ & * ( ) _ +",
          "A Z E R T Y U I O P {2}",
          "Q S D F G H J K L M {3}",
          "{4} W X C V B N ? : {4}",
          "{5} {6} ' {7}"
        ],
        number: [
          "1 2 3 {2}",
          "4 5 6 {8}",
          "7 8 9 {9}",
          "0 . {3} {9}"
        ],
        date: [
          "1 2 3 {2}",
          "4 5 6 {8}",
          "7 8 9 {9}",
          "0 / {3} {9}"
        ]
      }
    },
    "en-GB": {
      lines: {
        lower: [
          "1 2 3 4 5 6 7 8 9 0",
          "a z e r t y u i o p {2}",
          "q s d f g h j k l m {3}",
          "{4} w x c v b n , . {4}",
          "{5} {6} ' {7}"
        ],
        upper: [
          "! @ # $ % ^ & * ( ) _ +",
          "A Z E R T Y U I O P {2}",
          "Q S D F G H J K L M {3}",
          "{4} W X C V B N ? : {4}",
          "{5} {6} ' {7}"
        ],
        number: [
          "1 2 3 {2}",
          "4 5 6 {8}",
          "7 8 9 {9}",
          "0 . {3} {9}"
        ],
        date: [
          "1 2 3 {2}",
          "4 5 6 {8}",
          "7 8 9 {9}",
          "0 / {3} {9}"
        ]
      }
    },
    "en-US": "en-GB"
  };
  var RE_sel = /text|password|search|tel|url/i;
  var _Keyboard_decorators, _init45, _a45;
  _Keyboard_decorators = [class_ns("x4")];
  var _Keyboard = class _Keyboard extends (_a45 = HBox) {
    constructor(props) {
      super({ ...props, id: "v-keyboard" });
      __publicField(this, "mode");
      __publicField(this, "locale");
      __publicField(this, "keyboard");
      __publicField(this, "visible");
      __publicField(this, "input");
      __publicField(this, "_updateVis", /* @__PURE__ */ __name(() => {
        if (this.visible) {
          if (this.input) {
            const type = this.input.type;
            if (type == "check" || type == "radio") {
              this.hide();
              this.input = null;
            } else {
              this.show();
              this._scrollIntoView(this.input);
              const dtype = this.input.getAttribute("data-type");
              if (type === "number" || dtype === "number") {
                this._switchMode("number");
              } else if (type === "date" || dtype === "date") {
                this._switchMode("date");
              } else {
                this._switchMode("lower");
              }
            }
          }
        } else {
          this.hide();
          this.input = null;
        }
      }, "_updateVis"));
      this.mode = "lower";
      this.locale = "fr-FR";
      this.visible = false;
      document.addEventListener("focusin", (e) => this.handleFocus(e.target, true), false);
      document.addEventListener("focusout", (e) => this.handleFocus(e.target, false), false);
      this.hide();
      this.addDOMEvent("mousedown", (e) => {
        this.handleKeyEvent(e);
        e.preventDefault();
        e.stopPropagation();
      });
      this.addDOMEvent("dblclick", (e) => {
        this.handleKeyEvent(e);
        e.preventDefault();
        e.stopPropagation();
      });
      this.addDOMEvent("contextmenu", (e) => {
        e.preventDefault();
        e.stopPropagation();
      });
    }
    setZoom(perc) {
      this.setStyleVariable("--keyboard-zoom", perc + "%");
    }
    /**
     * 
     */
    handleKeyEvent(e) {
      let target = e.target;
      let key;
      while (target !== this.dom) {
        if (target.hasAttribute("data-key")) {
          key = parseInt(target.getAttribute("data-key"), 10);
          break;
        }
        target = target.parentNode;
      }
      if (!key) {
        return;
      }
      this._handleKey(key);
    }
    _handleKey(key) {
      switch (key) {
        // bk space
        case 2: {
          this.fireKey(0, this._backspace);
          break;
        }
        // return
        case 3: {
          this._focusNext();
          break;
        }
        // shift
        case 4: {
          if (this.mode == "lower") {
            this.mode = "upper";
          } else {
            this.mode = "lower";
          }
          this._redraw();
          break;
        }
        // num + sym
        case 5: {
          this._switchMode("number");
          break;
        }
        // space
        case 6: {
          this.fireKey(32, this._insertChar);
          break;
        }
        // hide
        case 7: {
          this.hide();
          break;
        }
        case 8: {
          this._switchMode("lower");
          break;
        }
        default: {
          this.fireKey(key, this._insertChar);
          break;
        }
      }
    }
    /**
     * 
     */
    _focusNext() {
      Application.instance().focusNext(true);
    }
    /**
     * 
     */
    _switchMode(m) {
      this.mode = m;
      this._redraw();
    }
    /**
     * 
     */
    _redraw() {
      this.setContent([
        this.keyboard = new VBox({
          id: "kb",
          cls: this.mode,
          content: this._createContent()
        })
      ]);
    }
    _scrollIntoView(el) {
      let parent = el.parentElement;
      while (parent != document.body) {
        if (parent.style.overflowY !== "") {
          let targ = el.getBoundingClientRect();
          let bound = parent.getBoundingClientRect();
          if (targ.top < bound.top) {
            el.scrollIntoView(true);
          } else if (targ.bottom > bound.bottom) {
            el.scrollIntoView(false);
          }
          break;
        }
        parent = parent.parentElement;
      }
    }
    /**
     * 
     */
    showOn(el) {
      this.handleFocus(el.dom, true);
    }
    /**
     * 
     */
    handleFocus(target, enter) {
      if (enter) {
        if (target.tagName == "INPUT") {
          const input = target;
          if (!input.readOnly && input.type != "checkbox" && input.type != "radio" && input.type != "range" && input.type != "file") {
            this.input = input;
            this.visible = true;
            this.setTimeout("vis", 200, this._updateVis);
            return;
          }
        }
      }
      this.visible = false;
      this.setTimeout("vis", 200, this._updateVis);
    }
    /**
     * 
     */
    _insertChar(caret, text, ch) {
      text = text.substring(0, caret.start) + ch.toString() + text.substring(caret.end);
      caret.start += ch.length;
      caret.end = caret.start;
      return text;
    }
    /**
    * 
    */
    _backspace(caret, text) {
      text = text.substring(0, caret.start - 1) + text.substring(caret.start);
      caret.start -= 1;
      caret.end = caret.start;
      return text;
    }
    /**
    * 
    */
    _getCaret() {
      if (this.input && RE_sel.test(this.input.type)) {
        let pos = {
          start: this.input.selectionStart || 0,
          end: this.input.selectionEnd || 0
        };
        if (pos.end < pos.start) {
          pos.end = pos.start;
        }
        return pos;
      } else {
        let length = this.input.value.length;
        return {
          start: length,
          end: length
        };
      }
    }
    /**
    * 
    */
    _restoreCaretPos(caret) {
      if (RE_sel.test(this.input.type)) {
        this.input.selectionStart = caret.start;
        this.input.selectionEnd = caret.end;
      }
    }
    /**
    * 
    */
    fireKey(key, cb) {
      let caret = this._getCaret();
      let text = this.input.value;
      text = cb.call(this, caret, text, String.fromCharCode(key));
      this.input.value = text;
      this._restoreCaretPos(caret);
      this.input.dispatchEvent(new Event("input", { bubbles: true }));
      this.input.dispatchEvent(new Event("change", { bubbles: true }));
    }
    /**
    * 
    */
    _createContent() {
      let lines = kb_def[this.locale].lines[this.mode];
      let result = [];
      for (let j = 0; j < lines.length; j++) {
        const line2 = lines[j].split(" ");
        let tl = [];
        for (let i = 0; i < line2.length; i++) {
          let cls = "tch c" + i;
          let content = line2[i];
          let key;
          let icon = null;
          let repeat = false;
          if (content.length > 2 && content[0] == "{" && content[content.length - 1] == "}") {
            let c = parseInt(content.substring(1, content.length - 1), 10);
            switch (c) {
              default:
              case 0: {
                content = "";
                cls += " x4hidden";
                break;
              }
              case 1: {
                content = "";
                break;
              }
              case 2: {
                repeat = true;
                content = void 0;
                icon = delete_left_default;
                cls += " cdel";
                break;
              }
              case 3: {
                content = _tr.global.keyboard.next;
                cls += " cret";
                break;
              }
              case 4: {
                content = void 0;
                icon = arrow_up_default;
                cls += " cshift";
                break;
              }
              case 5: {
                content = _tr.global.keyboard.numeric;
                cls += " cnum";
                break;
              }
              case 6: {
                content = " ";
                cls += " cspace";
                break;
              }
              case 7: {
                content = void 0;
                icon = eye_slash_default;
                cls += " chide";
                break;
              }
              case 8: {
                content = _tr.global.keyboard.alpha;
                cls += " calpha";
                break;
              }
              case 9: {
                content = "";
                cls += " cplace";
                break;
              }
            }
            key = c;
          } else {
            key = line2[i].charCodeAt(0);
          }
          let el = new Button({
            cls,
            label: content,
            attrs: { "data-key": key },
            icon,
            autorepeat: repeat,
            click: /* @__PURE__ */ __name((e) => {
              if (e.repeat) {
                this._handleKey(key);
              }
            }, "click")
          });
          tl.push(el);
        }
        result.push(new HBox({ cls: "line", content: tl }));
      }
      return result;
    }
  };
  _init45 = __decoratorStart(_a45);
  _Keyboard = __decorateElement(_init45, 0, "Keyboard", _Keyboard_decorators, _Keyboard);
  __name(_Keyboard, "Keyboard");
  __runInitializers(_init45, 1, _Keyboard);
  var Keyboard = _Keyboard;

  // node_modules/x4js/src/components/link/link.ts
  var _Link_decorators, _init46, _a46;
  _Link_decorators = [class_ns("x4")];
  var _Link = class _Link extends (_a46 = Component2) {
    constructor(props) {
      super({ tag: "a", ...props });
      if (props.href) {
        this.setAttribute("href", props.href);
      }
      this.mapPropEvents(props, "click");
      this.setContent(new Label({
        text: props.text,
        icon: props.icon,
        align: props.align
      }));
      this.addDOMEvent("click", (e) => this._on_click(e));
    }
    /**
     * 
     * @param text 
     */
    setText(text) {
      this.setContent(text);
    }
    /**
     * 
     */
    _on_click(ev) {
      const xev = { context: this.props.href };
      this.fire("click", xev);
      if (xev.preventDefault) {
        ev.preventDefault();
        ev.stopPropagation();
      }
    }
  };
  _init46 = __decoratorStart(_a46);
  _Link = __decorateElement(_init46, 0, "Link", _Link_decorators, _Link);
  __name(_Link, "Link");
  __runInitializers(_init46, 1, _Link);
  var Link = _Link;

  // x4-raw-file:C:\dev\rlibre\y4-2026\demo\frontend\node_modules\x4js\src\components\messages\circle-exclamation.svg
  var circle_exclamation_default = "data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCA1MTIgNTEyIiBmaWxsPSJjdXJyZW50Q29sb3IiPjwhLS0hRm9udCBBd2Vzb21lIEZyZWUgNi42LjAgYnkgQGZvbnRhd2Vzb21lIC0gaHR0cHM6Ly9mb250YXdlc29tZS5jb20gTGljZW5zZSAtIGh0dHBzOi8vZm9udGF3ZXNvbWUuY29tL2xpY2Vuc2UvZnJlZSBDb3B5cmlnaHQgMjAyNCBGb250aWNvbnMsIEluYy4tLT48cGF0aCBkPSJNMjU2IDUxMkEyNTYgMjU2IDAgMSAwIDI1NiAwYTI1NiAyNTYgMCAxIDAgMCA1MTJ6bTAtMzg0YzEzLjMgMCAyNCAxMC43IDI0IDI0bDAgMTEyYzAgMTMuMy0xMC43IDI0LTI0IDI0cy0yNC0xMC43LTI0LTI0bDAtMTEyYzAtMTMuMyAxMC43LTI0IDI0LTI0ek0yMjQgMzUyYTMyIDMyIDAgMSAxIDY0IDAgMzIgMzIgMCAxIDEgLTY0IDB6Ii8+PC9zdmc+";

  // x4-raw-file:C:\dev\rlibre\y4-2026\demo\frontend\node_modules\x4js\src\components\messages\circle-question.svg
  var circle_question_default = "data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCA2NDAgNjQwIiBmaWxsPSJjdXJyZW50Q29sb3IiPjwhLS0hRm9udCBBd2Vzb21lIEZyZWUgNy4yLjAgYnkgQGZvbnRhd2Vzb21lIC0gaHR0cHM6Ly9mb250YXdlc29tZS5jb20gTGljZW5zZSAtIGh0dHBzOi8vZm9udGF3ZXNvbWUuY29tL2xpY2Vuc2UvZnJlZSBDb3B5cmlnaHQgMjAyNiBGb250aWNvbnMsIEluYy4tLT48cGF0aCBkPSJNMzIwIDU3NkM0NjEuNCA1NzYgNTc2IDQ2MS40IDU3NiAzMjBDNTc2IDE3OC42IDQ2MS40IDY0IDMyMCA2NEMxNzguNiA2NCA2NCAxNzguNiA2NCAzMjBDNjQgNDYxLjQgMTc4LjYgNTc2IDMyMCA1NzZ6TTMyMCAyNDBDMzAyLjMgMjQwIDI4OCAyNTQuMyAyODggMjcyQzI4OCAyODUuMyAyNzcuMyAyOTYgMjY0IDI5NkMyNTAuNyAyOTYgMjQwIDI4NS4zIDI0MCAyNzJDMjQwIDIyNy44IDI3NS44IDE5MiAzMjAgMTkyQzM2NC4yIDE5MiA0MDAgMjI3LjggNDAwIDI3MkM0MDAgMzE5LjIgMzY0IDMzOS4yIDM0NCAzNDYuNUwzNDQgMzUwLjNDMzQ0IDM2My42IDMzMy4zIDM3NC4zIDMyMCAzNzQuM0MzMDYuNyAzNzQuMyAyOTYgMzYzLjYgMjk2IDM1MC4zTDI5NiAzNDIuMkMyOTYgMzIxLjcgMzEwLjggMzA3IDMyNi4xIDMwMkMzMzIuNSAyOTkuOSAzMzkuMyAyOTYuNSAzNDQuMyAyOTEuN0MzNDguNiAyODcuNSAzNTIgMjgxLjcgMzUyIDI3Mi4xQzM1MiAyNTQuNCAzMzcuNyAyNDAuMSAzMjAgMjQwLjF6TTI4OCA0MzJDMjg4IDQxNC4zIDMwMi4zIDQwMCAzMjAgNDAwQzMzNy43IDQwMCAzNTIgNDE0LjMgMzUyIDQzMkMzNTIgNDQ5LjcgMzM3LjcgNDY0IDMyMCA0NjRDMzAyLjMgNDY0IDI4OCA0NDkuNyAyODggNDMyeiIvPjwvc3ZnPg==";

  // x4-raw-file:C:\dev\rlibre\y4-2026\demo\frontend\node_modules\x4js\src\components\messages\pen-field.svg
  var pen_field_default = "data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCA2NDAgNTEyIj48IS0tIUZvbnQgQXdlc29tZSBQcm8gNi42LjAgYnkgQGZvbnRhd2Vzb21lIC0gaHR0cHM6Ly9mb250YXdlc29tZS5jb20gTGljZW5zZSAtIGh0dHBzOi8vZm9udGF3ZXNvbWUuY29tL2xpY2Vuc2UgKENvbW1lcmNpYWwgTGljZW5zZSkgQ29weXJpZ2h0IDIwMjQgRm9udGljb25zLCBJbmMuLS0+PHBhdGggY2xhc3M9ImZhLXNlY29uZGFyeSIgb3BhY2l0eT0iLjQiIGQ9Ik0wIDEyOGwzMiAwIDIyNCAwIDMyIDAgMCA2NC0zMiAwTDY0IDE5MmwwIDI1NiA0NDggMCAwLTEyOCAwLTMyIDY0IDAgMCAzMiAwIDE2MCAwIDMyLTMyIDBMMzIgNTEyIDAgNTEybDAtMzJMMCAxNjBsMC0zMnoiLz48cGF0aCBjbGFzcz0iZmEtcHJpbWFyeSIgZD0iTTI4OCAzNTJsMTYtMTEyTDQ2OC43IDc1LjNsOTYgOTZMNDAwIDMzNiAyODggMzUyek01ODcuMyAxNDguN2wtOTYtOTZMNTQ0IDBsOTYgOTYtNTIuNyA1Mi43ek05NiAyODhsNjQgMCAwIDY0LTY0IDAgMC02NHptMTYwIDBsMCA2NC02NCAwIDAtNjQgNjQgMHoiLz48L3N2Zz4=";

  // x4-raw-file:C:\dev\rlibre\y4-2026\demo\frontend\node_modules\x4js\src\components\messages\spinner.svg
  var spinner_default = "data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCA2NDAgNjQwIj48IS0tIUZvbnQgQXdlc29tZSBQcm8gNy4yLjAgYnkgQGZvbnRhd2Vzb21lIC0gaHR0cHM6Ly9mb250YXdlc29tZS5jb20gTGljZW5zZSAtIGh0dHBzOi8vZm9udGF3ZXNvbWUuY29tL2xpY2Vuc2UgKENvbW1lcmNpYWwgTGljZW5zZSkgQ29weXJpZ2h0IDIwMjYgRm9udGljb25zLCBJbmMuLS0+PHBhdGggZD0iTTM1MiA5NkMzNTIgNzguMyAzMzcuNyA2NCAzMjAgNjRDMzAyLjMgNjQgMjg4IDc4LjMgMjg4IDk2QzI4OCAxMTMuNyAzMDIuMyAxMjggMzIwIDEyOEMzMzcuNyAxMjggMzUyIDExMy43IDM1MiA5NnpNMzUyIDU0NEMzNTIgNTI2LjMgMzM3LjcgNTEyIDMyMCA1MTJDMzAyLjMgNTEyIDI4OCA1MjYuMyAyODggNTQ0QzI4OCA1NjEuNyAzMDIuMyA1NzYgMzIwIDU3NkMzMzcuNyA1NzYgMzUyIDU2MS43IDM1MiA1NDR6TTUxMiAzMjBDNTEyIDMzNy43IDUyNi4zIDM1MiA1NDQgMzUyQzU2MS43IDM1MiA1NzYgMzM3LjcgNTc2IDMyMEM1NzYgMzAyLjMgNTYxLjcgMjg4IDU0NCAyODhDNTI2LjMgMjg4IDUxMiAzMDIuMyA1MTIgMzIwek05NiAzNTJDMTEzLjcgMzUyIDEyOCAzMzcuNyAxMjggMzIwQzEyOCAzMDIuMyAxMTMuNyAyODggOTYgMjg4Qzc4LjMgMjg4IDY0IDMwMi4zIDY0IDMyMEM2NCAzMzcuNyA3OC4zIDM1MiA5NiAzNTJ6TTEzOSA1MDFDMTQ2LjkgNTA5LjggMTU5IDUxMy40IDE3MC41IDUxMC42QzE4MS45IDUwNy43IDE5MC45IDQ5OC43IDE5My44IDQ4Ny4zQzE5Ni42IDQ3NS44IDE5MyA0NjMuNyAxODQuMiA0NTUuOEMxNzYuMyA0NDcgMTY0LjIgNDQzLjQgMTUyLjcgNDQ2LjJDMTQxLjMgNDQ5LjEgMTMyLjMgNDU4LjEgMTI5LjQgNDY5LjVDMTI2LjYgNDgxIDEzMC4yIDQ5My4xIDEzOSA1MDF6TTQ1NS44IDUwMUM0NjMuNyA1MDkuOCA0NzUuOCA1MTMuNCA0ODcuMyA1MTAuNkM0OTguNyA1MDcuNyA1MDcuNyA0OTguNyA1MTAuNiA0ODcuM0M1MTMuNCA0NzUuOCA1MDkuOCA0NjMuNyA1MDEgNDU1LjhDNDkzLjEgNDQ3IDQ4MSA0NDMuNCA0NjkuNSA0NDYuMkM0NTguMSA0NDkuMSA0NDkuMSA0NTguMSA0NDYuMiA0NjkuNUM0NDMuNCA0ODEgNDQ3IDQ5My4xIDQ1NS44IDUwMXpNMTM5IDEzOUMxMzAuMiAxNDYuOSAxMjYuNiAxNTkgMTI5LjQgMTcwLjVDMTMyLjMgMTgxLjkgMTQxLjMgMTkwLjkgMTUyLjcgMTkzLjhDMTY0LjIgMTk2LjYgMTc2LjMgMTkzIDE4NC4yIDE4NC4yQzE5MyAxNzYuMyAxOTYuNiAxNjQuMiAxOTMuOCAxNTIuN0MxOTAuOSAxNDEuMyAxODEuOSAxMzIuMyAxNzAuNSAxMjkuNEMxNTkgMTI2LjYgMTQ2LjkgMTMwLjIgMTM5IDEzOXoiLz48L3N2Zz4=";

  // node_modules/x4js/src/components/messages/messages.ts
  var _MessageBox_decorators, _init47, _a47;
  _MessageBox_decorators = [class_ns("x4")];
  var _MessageBox = class _MessageBox extends (_a47 = Dialog) {
    constructor(props) {
      super(props);
    }
    /**
     * 
     */
    static _create(msg, buttons, title, icon_type) {
      let icon = circle_exclamation_default;
      switch (icon_type) {
        case "question": {
          icon = circle_question_default;
          break;
        }
      }
      const box = new _MessageBox({
        modal: true,
        title: title ?? _tr.global.error,
        movable: true,
        form: new Form({
          content: [
            new HBox({
              content: [
                new Icon2({ iconId: circle_exclamation_default }),
                new Label({ text: msg })
              ]
            })
          ]
        }),
        buttons: buttons ?? ["ok.outline", "cancel.outline"]
      });
      return box;
    }
    /**
     * display a messagebox
     */
    static show(msg, buttons, title, icon_type) {
      const box = this._create(msg, buttons, title, icon_type);
      box.on("btnclick", (ev) => {
        asap(() => {
          box.close();
        });
      });
      box.show();
      return box;
    }
    /**
     * idem with promise
     */
    static async showAsync(msg, buttons, title, icon_type) {
      return new Promise((resolve, reject) => {
        const box = this._create(msg, buttons, title, icon_type);
        box.on("btnclick", (ev) => {
          asap(() => {
            resolve(ev.button);
            box.close();
          });
        });
        box.show();
      });
    }
  };
  _init47 = __decoratorStart(_a47);
  _MessageBox = __decorateElement(_init47, 0, "MessageBox", _MessageBox_decorators, _MessageBox);
  __name(_MessageBox, "MessageBox");
  __runInitializers(_init47, 1, _MessageBox);
  var MessageBox = _MessageBox;
  var _InputBox_decorators, _init48, _a48;
  _InputBox_decorators = [class_ns("x4")];
  var _InputBox = class _InputBox extends (_a48 = Dialog) {
    constructor(props) {
      super(props);
    }
    getValue() {
      const input = this.query("input");
      return input.getValue();
    }
    static _create(msg, value, title, options) {
      options = { trim: true, password: false, ...options };
      const box = new _InputBox({
        modal: true,
        title,
        movable: true,
        form: new Form({
          content: [
            new HBox({
              content: [
                new Icon2({ iconId: pen_field_default }),
                new VBox({ flex: 1, content: [
                  new Label({ text: msg }),
                  new Input({ value, type: options.password ? "password" : "text", trim: options.trim })
                ] })
              ]
            })
          ]
        }),
        buttons: ["ok.outline.default", "cancel.outline"]
      });
      return box;
    }
    /**
     * idem with promise
     */
    static async showAsync(msg, value, title, options) {
      return new Promise((resolve, _reject) => {
        const box = this._create(msg, value, title, options);
        box.on("btnclick", (ev) => {
          asap(() => {
            resolve(ev.button == "ok" ? box.getValue() : null);
            box.close();
          });
        });
        box.show();
      });
    }
  };
  _init48 = __decoratorStart(_a48);
  _InputBox = __decorateElement(_init48, 0, "InputBox", _InputBox_decorators, _InputBox);
  __name(_InputBox, "InputBox");
  __runInitializers(_init48, 1, _InputBox);
  var InputBox = _InputBox;
  var _PromptBox_decorators, _init49, _a49;
  _PromptBox_decorators = [class_ns("x4")];
  var _PromptBox = class _PromptBox extends (_a49 = Dialog) {
    constructor(props) {
      super(props);
    }
    static _create(msg, editor, title) {
      const box = new _PromptBox({
        modal: true,
        title,
        movable: true,
        form: new Form({
          content: [
            new HBox({
              content: [
                new Icon2({ iconId: pen_field_default }),
                new VBox({ flex: 1, cls: "right", content: [
                  new Label({ text: msg }),
                  editor
                ] })
              ]
            })
          ]
        }),
        buttons: ["ok.outline.default", "cancel.outline"]
      });
      return box;
    }
    /**
     * idem with promise
     */
    static async showAsync(msg, editor, title) {
      return new Promise((resolve) => {
        const box = this._create(msg, editor, title);
        box.on("btnclick", (ev) => {
          asap(() => {
            resolve(ev.button);
            box.close();
          });
        });
        box.show();
      });
    }
    static show(msg, editor, title, callback) {
      const box = this._create(msg, editor, title);
      box.on("btnclick", (ev) => {
        asap(async () => {
          if (await callback(ev.button) !== false) {
            box.close();
          }
        });
      });
      box.show();
    }
  };
  _init49 = __decoratorStart(_a49);
  _PromptBox = __decorateElement(_init49, 0, "PromptBox", _PromptBox_decorators, _PromptBox);
  __name(_PromptBox, "PromptBox");
  __runInitializers(_init49, 1, _PromptBox);
  var PromptBox = _PromptBox;
  var _ProgressionBox_decorators, _has_errors, _init50, _a50;
  _ProgressionBox_decorators = [class_ns("x4")];
  var _ProgressionBox = class _ProgressionBox extends (_a50 = Dialog) {
    constructor(title) {
      super({
        modal: true,
        title: null,
        sizable: true,
        movable: true,
        form: new Form({
          content: [
            new HBox({
              content: [
                new Icon2({ iconId: spinner_default }),
                new VBox({ flex: 1, cls: "right", content: [
                  new SimpleText({ id: "title", text: title }),
                  new Progress({ id: "prog", min: 0, max: 100, value: 0 }),
                  new VBox({ id: "sub-text" })
                ] })
              ]
            })
          ]
        }),
        buttons: ["ok.outline.default"]
      });
      __privateAdd(this, _has_errors, false);
      this.query("#btnbar").show(false);
      this.on("btnclick", () => this.show(false));
    }
    addText(text, perc) {
      this.query("#sub-text").appendContent(new SimpleText({ text }));
      this.query("#prog").setValue(perc);
    }
    addError(text, perc) {
      this.query("#sub-text").appendContent(new SimpleText({ cls: "error", text }));
      this.query("#prog").setValue(perc);
      __privateSet(this, _has_errors, true);
    }
    setText(text, perc) {
      this.query("#sub-text").setContent(new SimpleText({ text }));
      this.query("#prog").setValue(perc);
    }
    clear() {
      __privateSet(this, _has_errors, true);
      this.query("#sub-text").clearContent();
    }
    done() {
      if (__privateGet(this, _has_errors)) {
        this.query("#btnbar").show(true);
      } else {
        this.setTimeout("close", 5e3, () => {
          this.show(false);
        });
      }
    }
  };
  _init50 = __decoratorStart(_a50);
  _has_errors = new WeakMap();
  _ProgressionBox = __decorateElement(_init50, 0, "ProgressionBox", _ProgressionBox_decorators, _ProgressionBox);
  __name(_ProgressionBox, "ProgressionBox");
  __runInitializers(_init50, 1, _ProgressionBox);
  var ProgressionBox = _ProgressionBox;

  // node_modules/x4js/src/components/notification/notification.ts
  var _Notification_decorators, _init51, _a51;
  _Notification_decorators = [class_ns("x4")];
  var _Notification = class _Notification extends (_a51 = Popup) {
    constructor(props) {
      super({});
      let icon = props.iconId;
      if (!icon) {
        if (props.loading) {
          icon = icons_default.loading;
          this.addClass("");
        } else if (props.mode == "danger") {
          icon = icons_default.danger;
        } else {
          icon = icons_default.checked;
        }
      }
      this.addClass(props.mode);
      const _icon = new Icon2({ iconId: icon });
      if (props.loading) {
        _icon.addClass("rotate");
      }
      this.setContent(new HBox({
        content: [
          _icon,
          new VBox({ cls: "body", content: [
            props.title ? new Label({ cls: "title", text: props.title }) : null,
            new Label({ cls: "text", text: props.text })
          ] }),
          props.closable ? new Button({ cls: "outline", icon: icons_default.close_box, click: /* @__PURE__ */ __name(() => {
            this.close();
          }, "click") }) : null
        ]
      }));
    }
    close() {
      _Notification.list.delete(this);
      asap(() => _Notification.updatePositions());
      this.clearTimeout("close");
      super.close();
    }
    display(time_in_s = 0) {
      _Notification.list.add(this);
      if (time_in_s) {
        this.setTimeout("close", time_in_s * 1e3, () => {
          this.close();
        });
      }
      asap(() => _Notification.updatePositions());
    }
    static updatePositions() {
      const r = new Rect(0, 0, window.innerWidth, window.innerHeight);
      for (const n of this.list) {
        n.addClass("smooth");
        n.displayNear(r, "bottom right", "bottom right", { x: -20, y: -10 }, true);
        const nr = n.getBoundingRect();
        r.height -= nr.height + 10;
        if (r.height < 10) {
          r.height = 10;
        }
      }
    }
  };
  _init51 = __decoratorStart(_a51);
  _Notification = __decorateElement(_init51, 0, "Notification", _Notification_decorators, _Notification);
  __name(_Notification, "Notification");
  __publicField(_Notification, "list", /* @__PURE__ */ new Set());
  __runInitializers(_init51, 1, _Notification);
  var Notification = _Notification;

  // node_modules/x4js/src/components/panel/panel.ts
  var _Panel_decorators, _init52, _a52;
  _Panel_decorators = [class_ns("x4")];
  var _Panel = class _Panel extends (_a52 = VBox) {
    constructor(props) {
      super({ ...props, content: void 0 });
      __publicField(this, "_title");
      __publicField(this, "_body");
      const model = props.bodyModel ?? VBox;
      super.setContent([
        this._title = new Label({ tag: "legend", text: props.title, icon: props.icon }),
        this._body = new model({ cls: "body", content: props.content })
      ]);
    }
    setContent(content) {
      this._body.setContent(content);
    }
    setTitle(title) {
      this._title.setContent(title);
    }
  };
  _init52 = __decoratorStart(_a52);
  _Panel = __decorateElement(_init52, 0, "Panel", _Panel_decorators, _Panel);
  __name(_Panel, "Panel");
  __runInitializers(_init52, 1, _Panel);
  var Panel = _Panel;

  // node_modules/x4js/src/components/progress/progress.ts
  var _Progress_decorators, _init53, _a53;
  _Progress_decorators = [class_ns("x4")];
  var _Progress = class _Progress extends (_a53 = Component2) {
    constructor(props) {
      super(props);
      __publicField(this, "_bar");
      this.setContent(this._bar = new Component2({ cls: "bar" }));
      this.setValue(props.value);
    }
    setValue(value) {
      const perc = value / (this.props.max - this.props.min) * 100;
      this._bar.setStyleValue("width", perc + "%");
    }
  };
  _init53 = __decoratorStart(_a53);
  _Progress = __decorateElement(_init53, 0, "Progress", _Progress_decorators, _Progress);
  __name(_Progress, "Progress");
  __runInitializers(_init53, 1, _Progress);
  var Progress = _Progress;

  // node_modules/x4js/src/components/select/select.ts
  var _Select_decorators, _init54, _a54;
  _Select_decorators = [class_ns("x4")];
  var _Select = class _Select extends (_a54 = Component2) {
    constructor(props) {
      super({ tag: "select", ...props });
      __publicField(this, "_items");
      this.mapPropEvents(props, "focus", "change");
      if (props.name) {
        this.setAttribute("name", props.name);
      }
      this.setItems(props.items);
      this.addDOMEvent("blur", (e) => {
        this.on_focus(e, true);
      });
      this.addDOMEvent("focus", (e) => {
        this.on_focus(e, false);
      });
      this.addDOMEvent("input", (e) => {
        this.on_change(e);
      });
      if (props.multiple) {
        this.setAttribute("multiple", true);
      }
      if (props.value) {
        this.setValue(props.value);
      }
    }
    /**
     * 
     */
    on_focus(ev, focus_out) {
      const event = { focus_out };
      this.fire("focus", event);
      if (event.defaultPrevented) {
        ev.preventDefault();
      }
    }
    /**
     * 
     */
    on_change(ev) {
      const event = { value: this.getValue() };
      this.fire("change", event);
      if (event.defaultPrevented) {
        ev.preventDefault();
      }
    }
    /**
     * 
    	 */
    setItems(items) {
      this._items = [...items];
      this.setContent(items.map((x) => {
        return new Component2({
          tag: "option",
          attrs: { value: x.id },
          content: x.text
        });
      }));
    }
    /**
     * @returns 
     */
    getValue() {
      const el = this.dom;
      const sel = this._items[el.selectedIndex];
      return sel?.id;
    }
    /**
     * @param value 
     */
    setValue(value) {
      const el = this.dom;
      el.selectedIndex = this._items.findIndex((x) => x.id === value);
    }
  };
  _init54 = __decoratorStart(_a54);
  _Select = __decorateElement(_init54, 0, "Select", _Select_decorators, _Select);
  __name(_Select, "Select");
  __runInitializers(_init54, 1, _Select);
  var Select = _Select;

  // node_modules/x4js/src/components/propgrid/propgrid.ts
  var _PropertyGrid_decorators, _init55, _a55;
  _PropertyGrid_decorators = [class_ns("x4")];
  var _PropertyGrid = class _PropertyGrid extends (_a55 = VBox) {
    constructor(props) {
      super(props);
      __publicField(this, "root");
      __publicField(this, "groups");
      if (props.footer) {
        props.footer.setAttribute("id", "footer");
        props.footer.addClass("packed");
      }
      const scroller = new ScrollView({ cls: "body" });
      this.root = scroller.getViewport();
      this.root.addClass("root");
      this.setContent([
        scroller,
        props.footer
      ]);
      if (props.groups) {
        this.setItems(props.groups);
      }
    }
    /**
     * 
     */
    setItems(_grps) {
      if (!_grps || _grps.length == 0) {
        this.root.clearContent();
        return;
      }
      this.groups = _grps.filter((x) => !!x);
      let items = [];
      for (const g of this.groups) {
        items.push(this.makeGroupHeader(g));
        g.items.forEach((i, idx) => {
          if (i) {
            const row = this.makePropertyRow(i);
            row.addClass(idx & 1 ? "even" : "odd");
            if (g.name) {
              row.setData("group", g.name);
            }
            items.push(row);
          }
        });
      }
      this.root.setContent(items);
    }
    /**
     * Gets the html of a group header row
     */
    makeGroupHeader(g) {
      if (g.title === null) {
        return null;
      }
      const toggle = /* @__PURE__ */ __name((e) => {
        let visible;
        if (!e.hasClass("collapsed")) {
          e.addClass("collapsed");
          visible = false;
        } else {
          e.removeClass("collapsed");
          visible = true;
        }
        let p = e.nextElement();
        while (p && p.hasClass("row")) {
          p.show(visible);
          p = p.nextElement();
        }
      }, "toggle");
      let cls = "group";
      if (g.cls) {
        cls += " " + g.cls;
      }
      const tr = new HBox({
        cls,
        flex: 1,
        content: [
          new VBox({ flex: 1, content: [
            new HBox({ cls: "hdr", content: [
              new Label({ flex: 1, cls: "title", text: g.title, icon: g.icon }),
              g.gadgets ? new HBox({ cls: "gadgets", content: g.gadgets }) : null,
              g.collapsible ? new Button({ icon: icons_default.updown, click: /* @__PURE__ */ __name((e) => toggle(tr), "click") }) : null
            ] }),
            g.desc ? new SimpleText({ cls: "desc", text: g.desc }) : null
          ] })
        ]
      });
      tr.setClass("collapsible", !!g.collapsible);
      if (isNumber(g.collapsible) && g.collapsible < 0) {
        asap(() => toggle(tr));
      }
      return tr;
    }
    /**
     * 
     */
    makePropertyRow(item) {
      let use_hdr = true;
      let editor;
      let value = isFunction(item.value) ? item.value(item.name) : item.value;
      item.value = value;
      if (item.type === "boolean") {
        editor = new Input({
          type: "checkbox",
          id: item.name,
          //name: item.name, 
          checked: value,
          dom_events: {
            change: /* @__PURE__ */ __name((e) => {
              item.callback?.(item.name, editor.dom.checked);
            }, "change")
          }
        });
      } else if (item.type === "options") {
        editor = new Select({
          value,
          id: item.name,
          items: item.options,
          //name: item.name,
          change: /* @__PURE__ */ __name((e) => {
            item.callback?.(item.name, e.value);
          }, "change")
        });
      } else if (item.type === "password") {
        editor = new Input({
          type: "password",
          id: item.name,
          //name: item.name, 
          value: String(value),
          focus: /* @__PURE__ */ __name((e) => {
            if (e.focus_out) {
              item.callback?.(item.name, editor.getValue());
            }
          }, "focus")
        });
      } else if (item.type === "number") {
        editor = new Input({
          type: "number",
          id: item.name,
          //name: item.name, 
          value: String(value),
          step: item.step,
          min: item.min,
          max: item.max,
          focus: /* @__PURE__ */ __name((e) => {
            if (e.focus_out) {
              item.callback?.(item.name, editor.getNumValue());
            }
          }, "focus"),
          change: /* @__PURE__ */ __name(() => {
            if (item.live) {
              item.callback?.(item.name, editor.getNumValue());
            }
          }, "change")
        });
      } else if (item.type === "label") {
        editor = new Label({
          id: item.name,
          text: value
        });
      } else if (item.type === "button") {
        use_hdr = false;
        editor = new Button({
          id: item.name,
          cls: "button",
          label: value,
          click: /* @__PURE__ */ __name(() => {
            item.callback?.(item.name, "");
          }, "click")
        });
      } else {
        editor = new Input({
          type: "text",
          id: item.name,
          //name: item.name, 
          value,
          focus: /* @__PURE__ */ __name((e) => {
            if (e.focus_out) {
              item.callback?.(item.name, editor.getValue());
            }
          }, "focus")
        });
      }
      let cls = "row";
      if (item.cls) {
        cls += " " + item.cls;
      }
      editor.addClass("x4flex");
      const content = [
        editor
      ];
      if (item.gadgets) {
        item.gadgets.forEach((g) => {
          g.addClass("gadget");
          content.push(g);
        });
      }
      return new HBox({
        cls,
        content: [
          use_hdr ? new Component2({ cls: "cell hdr", content: item.title ?? item.name, tooltip: item.desc }) : null,
          new HBox({ cls: "cell", tag: "label", attrs: { "labelFor": item.name }, content })
        ]
      });
    }
    /**
     * 
     */
    setPropValue(name, value) {
      const all = this.groups.flatMap((x) => [...x.items]);
      const item = all.find((x) => x.name == name);
      if (!item) {
        return;
      }
      if (item.type === "boolean") {
        const editor = this.root.query("#" + item.name);
        if (editor) {
          editor.setCheck(value);
        }
      } else if (item.type === "options") {
        const editor = this.root.query("#" + item.name);
        if (editor) {
          editor.setValue(value);
        }
      } else if (item.type === "number") {
        const editor = this.root.query("#" + item.name);
        if (editor) {
          editor.setNumValue(value, -2);
        }
      } else if (item.type === "label") {
        const label = this.root.query("#" + item.name);
        if (label) {
          label.setText(value);
        }
      } else {
        const editor = this.root.query("#" + item.name);
        if (editor) {
          editor.setValue(value);
        }
      }
    }
    loadProperties(props) {
      for (const p in props) {
        this.setPropValue(p, props[p]);
      }
    }
    enableGroup(group_name, ena = true) {
      const els = this.queryAll(`.row[data-group="${group_name}"]`);
      els.forEach((x) => x.enable(ena));
    }
  };
  _init55 = __decoratorStart(_a55);
  _PropertyGrid = __decorateElement(_init55, 0, "PropertyGrid", _PropertyGrid_decorators, _PropertyGrid);
  __name(_PropertyGrid, "PropertyGrid");
  __runInitializers(_init55, 1, _PropertyGrid);
  var PropertyGrid = _PropertyGrid;

  // node_modules/x4js/src/components/radio/radio.ts
  var _Radio_decorators, _init56, _a56;
  _Radio_decorators = [class_ns("x4")];
  var _Radio = class _Radio extends (_a56 = Component2) {
    constructor(props) {
      super(props);
      __publicField(this, "_check");
      __publicField(this, "_input");
      __publicField(this, "_label");
      this.mapPropEvents(props, "change");
      const inputId = makeUniqueComponentId();
      this.setContent([
        this._check = new HBox({ cls: "inner", content: [
          this._input = new Input({
            type: "radio",
            id: inputId,
            name: props.name,
            value: props.value,
            checked: props.checked,
            dom_events: {
              change: /* @__PURE__ */ __name(() => this._on_change(), "change")
            }
          })
        ] }),
        this._label = new Label({
          tag: "label",
          text: props.label,
          id: void 0,
          labelFor: inputId,
          icon: props.icon
        })
      ]);
      this._check.dom.insertAdjacentHTML("beforeend", icons_default.radio);
      this.addDOMEvent("click", (e) => this._on_click(e));
    }
    /**
     * handle click outside label & input
     */
    _on_click(ev) {
      if (ev.target == this.dom) {
        this._input.dom.click();
        ev.preventDefault();
        ev.stopPropagation();
      }
    }
    /**
     * check state changed
     */
    _on_change() {
      this.fire("change", { value: this.getValue() });
    }
    /**
     * check the radio
     * @param {boolean} ck new checked value	
     */
    setCheck(ck) {
      const d = this._input.dom;
      d.checked = ck;
    }
    /**
     * change the checkbox label
     * @param text 
     */
    setLabel(text) {
      this._label.setText(text);
    }
    /**
     * returns the radio value
     */
    getValue() {
      return this._input.getValue();
    }
    /**
     * check the corresponding value in the item group
     * you can call this method on any element of the group
     * 
     * ie: A, B, C, D, E
     * A.checkValue( "E" ) is ok, as E.CheckValue("E" )
     */
    checkValue(vname) {
      const grp = this.props.name;
      const el = this.parentElement().query(`input[name="${grp}"][value="${vname}"]`);
      if (el) {
        el.setCheck(true);
      }
    }
  };
  _init56 = __decoratorStart(_a56);
  _Radio = __decorateElement(_init56, 0, "Radio", _Radio_decorators, _Radio);
  __name(_Radio, "Radio");
  __runInitializers(_init56, 1, _Radio);
  var Radio = _Radio;

  // node_modules/x4js/src/components/rating/rating.ts
  var _Rating_decorators, _init57, _a57;
  _Rating_decorators = [class_ns("x4")];
  var _Rating = class _Rating extends (_a57 = HBox) {
    constructor(props) {
      super(props);
      __publicField(this, "m_els");
      __publicField(this, "m_input");
      props.steps = props.steps ?? 5;
      this._update();
    }
    _update() {
      const props = this.props;
      let shape = props.icon ?? icons_default.star.solid;
      let value = props.value ?? 0;
      this.m_input = new Input({
        type: "text",
        hidden: true,
        name: props.name,
        value: "" + value
      });
      this.addDOMEvent("click", (e) => this._on_click(e));
      this.m_els = [];
      for (let i = 0; i < props.steps; i++) {
        let cls = "item";
        if (i + 1 <= value) {
          cls += " checked";
        }
        let c = new Icon2({
          cls,
          iconId: shape
        });
        c.setInternalData("value", i);
        this.m_els.push(c);
      }
      this.m_els.push(this.m_input);
      this.setContent(this.m_els);
    }
    getValue() {
      return this.props.value ?? 0;
    }
    setValue(v) {
      this.props.value = v;
      for (let c = 0; c < this.props.steps; c++) {
        this.m_els[c].setClass("checked", this.m_els[c].getInternalData("value") <= v);
      }
      this.m_input.setValue("" + this.props.value);
    }
    setSteps(n) {
      this.props.steps = n;
      this._update();
    }
    setShape(icon) {
      this.removeClass(this.props.icon);
      this.props.icon = icon;
    }
    _on_click(ev) {
      let item = componentFromDOM(ev.target);
      item = item.parentElement(Icon2);
      if (item) {
        this.setValue(item.getInternalData("value"));
      }
      this.fire("change", { value: this.props.value });
    }
  };
  _init57 = __decoratorStart(_a57);
  _Rating = __decorateElement(_init57, 0, "Rating", _Rating_decorators, _Rating);
  __name(_Rating, "Rating");
  __runInitializers(_init57, 1, _Rating);
  var Rating = _Rating;

  // node_modules/x4js/src/components/slider/slider.ts
  var _Slider_decorators, _init58, _a58;
  _Slider_decorators = [class_ns("x4")];
  var _Slider = class _Slider extends (_a58 = Component2) {
    constructor(props) {
      super(props);
      __publicField(this, "_mdown", false);
      __publicField(this, "_irect", null);
      __publicField(this, "_thumb", null);
      __publicField(this, "_bar", null);
      __publicField(this, "_range", null);
      this.mapPropEvents(props, "change");
      if (props.vertical) {
        this.addClass("vertical");
      }
      this.setContent([
        new HBox({ cls: "track", content: [
          this._bar = new Component2({ cls: "bar" }),
          this._thumb = new Component2({ cls: "thumb" })
        ] }),
        this._range = new Input({
          type: "range",
          hidden: true,
          value: props.value,
          min: props.min,
          max: props.max,
          step: props.step
        })
      ]);
      this.setAttribute("tabindex", 0);
      this.setDOMEvents({
        pointerdown: /* @__PURE__ */ __name((ev) => this._on_mousedown(ev), "pointerdown"),
        pointermove: /* @__PURE__ */ __name((ev) => this._on_mousemove(ev), "pointermove"),
        pointerup: /* @__PURE__ */ __name((ev) => this._on_mouseup(ev), "pointerup"),
        keydown: /* @__PURE__ */ __name((ev) => this._on_key(ev), "keydown")
      });
      this._update();
    }
    _on_mousedown(ev) {
      ev.stopPropagation();
      ev.preventDefault();
      this.focus();
      this._mdown = true;
      this._irect = this.getBoundingRect();
      this.setCapture(ev.pointerId);
    }
    _getMinMax() {
      const min = parseInt(this._range.getAttribute("min"));
      const max = parseInt(this._range.getAttribute("max"));
      return [min, max];
    }
    _on_mousemove(ev) {
      if (this._mdown) {
        let pos;
        let size;
        if (!this.props.vertical) {
          pos = ev.offsetX;
          size = this._irect.width;
        } else {
          pos = ev.offsetY;
          size = this._irect.height;
        }
        let perc = pos / size;
        if (this.props.vertical) {
          perc = 1 - perc;
        }
        const [min, max] = this._getMinMax();
        this._range.setNumValue(min + perc * (max - min));
        this._update();
      }
    }
    _update() {
      const value = this._range.getNumValue();
      const [min, max] = this._getMinMax();
      let perc = max > min ? value / Math.abs(max - min) * 100 : 0;
      if (!this.props.vertical) {
        this._thumb.setStyleValue("left", perc + "%");
        this._bar.setStyleValue("width", perc + "%");
      } else {
        perc = 100 - perc;
        this._thumb.setStyleValue("top", perc + "%");
        this._bar.setStyleValue("height", perc + "%");
      }
      this.fire("change", { value });
    }
    _on_mouseup(ev) {
      if (this._mdown) {
        this.releaseCapture(ev.pointerId);
        this._mdown = false;
      }
    }
    _on_key(ev) {
      let stp = this.props.step ?? 1;
      let inc = 0;
      switch (ev.key) {
        case "ArrowRight":
        case "ArrowUp":
          inc = stp;
          break;
        case "ArrowLeft":
        case "ArrowDown":
          inc = -stp;
          break;
      }
      if (inc) {
        if (ev.ctrlKey) {
          inc *= 10;
        }
        this._range.setNumValue(this._range.getNumValue() + inc);
        this._update();
      }
    }
    setMin(min) {
      this._range.setAttribute("min", min + "");
      this._update();
    }
    setMax(max) {
      this._range.setAttribute("max", max + "");
      this._update();
    }
    setValue(v) {
      this._range.setNumValue(v);
      this._update();
    }
  };
  _init58 = __decoratorStart(_a58);
  _Slider = __decorateElement(_init58, 0, "Slider", _Slider_decorators, _Slider);
  __name(_Slider, "Slider");
  __runInitializers(_init58, 1, _Slider);
  var Slider = _Slider;

  // node_modules/x4js/src/components/spreadsheet/spreadsheet.ts
  function mkid(row, col) {
    return (row & 1048575) << 12 | col & 4095;
  }
  __name(mkid, "mkid");
  var SCROLL_LIMIT2 = 200;
  var _Spreadsheet_decorators, _init59, _a59;
  _Spreadsheet_decorators = [class_ns("x4")];
  var _Spreadsheet = class _Spreadsheet extends (_a59 = Component2) {
    constructor(props) {
      super(props);
      __publicField(this, "_columns");
      __publicField(this, "_store");
      __publicField(this, "_lock");
      __publicField(this, "_dirty");
      __publicField(this, "_row_height");
      __publicField(this, "_left");
      __publicField(this, "_top");
      __publicField(this, "_body");
      __publicField(this, "_viewport");
      __publicField(this, "_fheader");
      // fixed col header
      __publicField(this, "_hheader");
      // col header
      __publicField(this, "_vheader");
      // vertical row header
      __publicField(this, "_ffooter");
      // fixed footer
      __publicField(this, "_footer");
      // footer
      __publicField(this, "_vis_rows");
      __publicField(this, "_start");
      __publicField(this, "_end");
      __publicField(this, "_selection");
      __publicField(this, "_num_fmt", new Intl.NumberFormat("fr-FR"));
      __publicField(this, "_mny_fmt", new Intl.NumberFormat("fr-FR", { style: "currency", currency: "EUR" }));
      __publicField(this, "_dte_fmt", new Intl.DateTimeFormat("fr-FR", {}));
      __publicField(this, "_has_fixed");
      __publicField(this, "_has_footer");
      this._lock = 0;
      this._dirty = 0;
      this._row_height = 32;
      this._left = 0;
      this._top = 0;
      this._vis_rows = /* @__PURE__ */ new Map();
      this._selection = /* @__PURE__ */ new Set();
      this._has_fixed = false;
      this._has_footer = props.footer;
      this._columns = props.columns.map((x) => x);
      this.mapPropEvents(props, "click", "dblClick", "contextMenu", "selectionChange");
      this.lock(true);
      this.setAttribute("tabindex", 0);
      this.addDOMEvent("created", () => {
        this._init();
        this._dirty = 1;
        this.lock(false);
      });
      this.addDOMEvent("resized", () => {
        this._updateFlexs();
        this._computeFullSize();
        this._update(true);
      });
      this.addDOMEvent("keydown", (e) => {
        this._on_key(e);
      });
      if (props.store) {
        this.setStore(props.store);
      }
    }
    /**
     * 
     */
    _on_key(ev) {
      if (this.isDisabled()) {
        return;
      }
      switch (ev.key) {
        case "ArrowDown": {
          this.navigate(4 /* next */);
          break;
        }
        case "ArrowUp": {
          this.navigate(1 /* prev */);
          break;
        }
        case "ArrowLeft": {
          this.navigate(6 /* left */);
          break;
        }
        case "ArrowRight": {
          this.navigate(7 /* right */);
          break;
        }
        case "Home": {
          this.navigate(0 /* first */);
          break;
        }
        case "End": {
          this.navigate(5 /* last */);
          break;
        }
        case "PageDown": {
          this.navigate(2 /* pgdn */);
          break;
        }
        case "PageUp": {
          this.navigate(3 /* pgup */);
          break;
        }
        default:
          return;
      }
      ev.preventDefault();
      ev.stopPropagation();
    }
    /**
     * 
     */
    navigate(sens) {
      if (!this._selection.size) {
        if (sens == 4 /* next */ || sens == 2 /* pgdn */) {
          sens = 0 /* first */;
        } else {
          sens = 5 /* last */;
        }
      }
      const getLineSel = /* @__PURE__ */ __name((top) => {
        let m, M;
        let col;
        this._selection.forEach((x) => {
          const row = x >> 12;
          if (m === void 0 || m > row) {
            m = row;
            col = x & 255;
          }
          if (M === void 0 || M < row) {
            M = row;
            col = x & 255;
          }
        });
        return [top ? m : M, col];
      }, "getLineSel");
      if (sens == 0 /* first */ || sens == 5 /* last */) {
        let nline = sens == 0 /* first */ ? 0 : this._store.getRowCount() - 1;
        this._clearSelection(false);
        this._addSelection(mkid(nline, 0), true);
        this._scrollToIndex(nline);
        return true;
      } else if (sens == 1 /* prev */ || sens == 4 /* next */) {
        const [fline, col] = getLineSel(sens == 1 /* prev */);
        let nline = sens == 4 /* next */ ? fline + 1 : fline - 1;
        if (nline >= 0 && nline < this._store.getRowCount()) {
          this._clearSelection(false);
          this._addSelection(mkid(nline, col), true);
          this._scrollToIndex(nline);
          return true;
        }
      } else if (sens == 2 /* pgdn */ || sens == 3 /* pgup */) {
        const pgh = this._vis_rows.size;
        const [fline, col] = getLineSel(sens == 3 /* pgup */);
        let sby = sens == 2 /* pgdn */ ? pgh : -pgh;
        let nline = fline + sby;
        if (nline < 0) {
          nline = 0;
        } else if (nline >= this._store.getRowCount()) {
          nline = this._store.getRowCount() - 1;
        }
        if (nline != fline) {
          this._clearSelection(false);
          this._addSelection(mkid(nline, col), true);
          if (this._store.getRowCount() < SCROLL_LIMIT2) {
            sby *= this._row_height;
          }
          this._viewport.dom.scrollBy(0, sby);
          return true;
        }
      } else if (sens == 6 /* left */ || sens == 7 /* right */) {
        const [fline, col] = getLineSel(sens == 6 /* left */);
        let ncol = sens == 7 /* right */ ? col + 1 : col - 1;
        if (ncol >= 0 && ncol < this._columns.length) {
          this._clearSelection(false);
          this._addSelection(mkid(fline, ncol), true);
          return true;
        }
      }
      return false;
    }
    /**
     * 
     */
    _scrollToIndex(index, block = "nearest") {
      let ref = mkid(index, 0);
      let rows = this.queryAll(`.cell[data-ref="${ref}"]`);
      if (rows.length) {
        rows[0].scrollIntoView({ block });
      } else {
        let top = index;
        if (this._store.getRowCount() < SCROLL_LIMIT2) {
          top *= this._row_height;
        }
        this._viewport.dom.scrollTo(0, top);
      }
    }
    /**
     * 
     */
    setStore(store) {
      const on_change = /* @__PURE__ */ __name((ev) => {
        if (!this._viewport) {
          return;
        }
        if (ev.type == "changed" && this._selection.size) {
          const nsel = /* @__PURE__ */ new Set();
          this._selection.forEach((x) => {
            if (this._store.hasData(x)) {
              nsel.add(x);
            }
          });
          this._selection = nsel;
        }
        this._updateFlexs();
        this._computeFullSize();
        this._update(true);
      }, "on_change");
      if (this._store) {
        this._store.off("changed", on_change);
      }
      if (store) {
        this._store = store;
        this._store.on("changed", on_change);
      } else {
        this._store = null;
      }
    }
    /**
     * 
     */
    lock(lock) {
      if (lock) {
        this._lock++;
      } else {
        if (--this._lock == 0 && this._dirty) {
          this._update(true);
        }
      }
    }
    _getColCount() {
      return this._columns.length;
    }
    _getCol(index) {
      return this._columns[index];
    }
    /**
     * 
     */
    _buildColHeader(fixed) {
      const els = [];
      const count = this._getColCount();
      for (let col = 0; col < count; col++) {
        const cdata = this._getCol(col);
        if (!!cdata.fixed != fixed) {
          continue;
        }
        const sizer = new CSizer("right");
        sizer.on("stop", () => {
          this._updateFlexs();
        });
        sizer.on("resize", (ev) => {
          cdata.width = ev.size;
          cdata.flex = 0;
          const cols = this.queryAll(`[data-col="${col}"]`);
          cols.forEach((c) => {
            c.setStyleValue("width", ev.size + "px");
          });
          const rh = header.getBoundingRect();
          if (!fixed) {
            this._body.setStyleValue("width", rh.width + "px");
          } else {
            this.setStyleVariable("--fixed-width", rh.width + "px");
          }
        });
        const cell = new Component2({
          cls: `cell`,
          attrs: { "data-col": col },
          style: { width: cdata.width ? cdata.width + "px" : void 0 },
          content: [
            new SimpleText({ text: cdata.title, align: cdata.header_align ?? "left" }),
            new Component2({ cls: "sorter" }),
            sizer
          ]
        });
        els.push(cell);
      }
      if (fixed && els.length == 0) {
        return null;
      }
      const header = new Box({ cls: "col-header", content: els });
      header.setClass("fixed", fixed);
      return header;
    }
    /**
     * 
     */
    _buildColFooter(fixed) {
      const els = [];
      const count = this._getColCount();
      for (let col = 0; col < count; col++) {
        const cdata = this._getCol(col);
        if (!!cdata.fixed != fixed) {
          continue;
        }
        const cell = new Component2({
          cls: `cell`,
          attrs: { "data-col": col },
          style: { width: cdata.width ? cdata.width + "px" : void 0 },
          content: [
            new SimpleText({ text: cdata.footer_val })
          ]
        });
        els.push(cell);
      }
      if (fixed && els.length == 0) {
        return null;
      }
      const header = new Box({ cls: "col-footer", content: els });
      header.setClass("fixed", fixed);
      return header;
    }
    /**
     * extra_cls est input/output
     */
    _renderCell(row, column, extra_cls) {
      const col = column.id;
      const type = column.type;
      let data2 = this._store.getData(row, col);
      if (data2 === void 0 || data2 === null) {
        return null;
      }
      let cls = "";
      if (column.cellClassifier) {
        extra_cls.push(column.cellClassifier(row, col));
      }
      if (data2 instanceof UnsafeHtml) {
        return data2;
      }
      if (column.formatter) {
        return column.formatter(data2);
      }
      switch (type) {
        case "checkbox": {
          if (data2) {
            return new Icon2({ cls: "cell-check" + cls, iconId: icons_default.check });
          }
          return void 0;
        }
        case "image": {
          if (isString(data2)) {
            return new Image2({ cls, src: data2, fit: "scale-down" });
          }
          return void 0;
        }
        case "number": {
          if (!isNumber(data2)) {
            return "NaN";
          }
          data2 = this._num_fmt.format(data2);
          break;
        }
        case "money": {
          if (!isNumber(data2)) {
            return "NaN";
          }
          data2 = this._mny_fmt.format(data2);
          break;
        }
        case "percent": {
          return new Box({
            cls: "percent " + cls,
            content: new Component2({ cls: "bar", width: data2 + "%" })
          });
        }
        case "icon": {
          return new Icon2({ cls, iconId: data2 + "" });
        }
        case "date": {
          data2 = this._dte_fmt.format(data2);
          break;
        }
        default: {
          data2 = data2 + "";
          break;
        }
      }
      return new Component2({ tag: "span", cls, content: data2 });
    }
    /**
     * 
     */
    _buildRow(rowid, top) {
      const els = [];
      const count = this._getColCount();
      for (let col = 0; col < count; col++) {
        const cdata = this._getCol(col);
        if (cdata.fixed) {
          continue;
        }
        const extra = [];
        const content = this._renderCell(rowid, cdata, extra);
        const el = new Component2({
          cls: "cell",
          attrs: { "data-col": col },
          style: { width: cdata?.width ? cdata.width + "px" : void 0 },
          content
        });
        switch (cdata.align) {
          case "center":
            el.addClass("align-center");
            break;
          case "right":
            el.addClass("align-right");
            break;
        }
        if (extra.length) {
          el.addClass(extra.join(" "));
        }
        if (cdata.type) {
          el.addClass(cdata.type);
        }
        const ref = mkid(rowid, col);
        if (this._selection.has(ref)) {
          el.addClass("selected");
        }
        el.setInternalData("col", col);
        el.setInternalData("row", rowid);
        el.setData("ref", ref + "");
        els.push(el);
      }
      let row_cls = "row";
      if (this.props.rowClassifier) {
        const xtra = this.props.rowClassifier(rowid);
        if (xtra) {
          row_cls += " " + xtra.trim();
        }
      }
      return new Box({ cls: row_cls, style: { top: top.toFixed(2) + "px" }, content: els });
    }
    /**
     * 
     */
    _buildRowHeader(rowid, top) {
      const cols = [];
      const count = this._getColCount();
      for (let col = 0; col < count; col++) {
        const cdata = this._getCol(col);
        if (!cdata?.fixed) {
          continue;
        }
        const content = this._renderCell(rowid, cdata, [cdata.type]);
        let align = "start";
        switch (cdata.align) {
          default:
            align = "start";
            break;
          case "center":
            align = "center";
            break;
          case "right":
            align = "end";
            break;
        }
        const el = new Component2({
          cls: "cell",
          style: { width: cdata?.width ? cdata.width + "px" : void 0, justifyContent: align },
          content
        });
        if (cdata.type) {
          el.addClass(cdata.type);
        }
        el.setInternalData("col", col);
        el.setInternalData("row", rowid);
        el.setData("ref", mkid(rowid, col) + "");
        if (this._selection.has(mkid(col, rowid))) {
          el.addClass("selected");
        }
        cols.push(el);
      }
      return new Box({ cls: "row", style: { top: top + "px" }, content: cols });
    }
    /**
     * 
     */
    _updateFlexs() {
      let maxw = 0;
      let flexc = 0;
      const ccount = this._getColCount();
      for (let x = 0; x < ccount; x++) {
        const cdata = this._getCol(x);
        if (!cdata.fixed && cdata.flex) {
          flexc += cdata.flex;
        } else {
          maxw += cdata.width;
        }
      }
      if (flexc) {
        const width = this._viewport.dom.clientWidth;
        const delta = width - maxw;
        const fw = delta / flexc;
        for (let col = 0; col < ccount; col++) {
          const cdata = this._getCol(col);
          if (!cdata.fixed && cdata.flex) {
            cdata.width = Math.max(cdata.flex * fw, 32);
            const cols = this.queryAll(`[data-col="${col}"]`);
            cols.forEach((c) => {
              c.setStyleValue("width", cdata.width + "px");
            });
          }
        }
      }
    }
    /**
     * 
     */
    _computeFullSize() {
      let maxw = 0;
      let maxfw = 0;
      const ccount = this._getColCount();
      for (let x = 0; x < ccount; x++) {
        const cdata = this._getCol(x);
        let w = 0;
        if (cdata.fixed) {
          this._has_fixed = true;
        }
        if (cdata.width) {
          w += cdata.width;
        }
        if (cdata.fixed) {
          maxfw += w;
        } else {
          maxw += w;
        }
      }
      const maxr = this._store ? this._store.getRowCount() : 0;
      let maxh = maxr;
      if (maxr < SCROLL_LIMIT2) {
        maxh *= this._row_height;
      } else {
        const height = this._body.dom.parentElement.clientHeight;
        const npage = height / this._row_height;
        maxh = maxr - Math.floor(npage) + npage * this._row_height;
      }
      this.setStyleVariable("--fixed-width", maxfw + "px");
      this._body.setStyleValue("height", maxh + "px");
      this._body.setStyleValue("width", maxw + "px");
      this._vheader.setStyleValue("height", maxh + "px");
    }
    /**
     * 
     */
    _init() {
      this._body = new Component2({ cls: "body" });
      this._viewport = new Viewport({ content: this._body });
      if (!this._has_footer) {
        this.setStyleVariable("--footer-height", "0");
      }
      this._viewport.addDOMEvent("scroll", (ev) => {
        this._left = this._viewport.dom.scrollLeft;
        this.setStyleVariable("--left", -this._left + "px");
        this._top = this._viewport.dom.scrollTop;
        this.setStyleVariable("--top", -this._top + "px");
        this._update();
      });
      this.addDOMEvent("wheel", (ev) => {
        if (ev.deltaY && this._store && this._store.getRowCount() >= SCROLL_LIMIT2) {
          this._viewport.dom.scrollBy(0, ev.deltaY < 0 ? -1 : 1);
          ev.stopPropagation();
          ev.preventDefault();
        }
        if (this._has_fixed && ev.deltaY) {
          let t = ev.target;
          while (t != this.dom) {
            if (t == this._vheader.dom) {
              this._viewport.dom.scrollBy(0, ev.deltaY < 0 ? -this._row_height : this._row_height);
              ev.stopPropagation();
              ev.preventDefault();
              break;
            }
            t = t.parentNode;
          }
        }
      });
      const targetCell = /* @__PURE__ */ __name((e) => {
        let el = e.target;
        while (el && !el.classList.contains("cell")) {
          el = el.parentElement;
        }
        if (el) {
          const cel = componentFromDOM(el);
          return {
            ref: cel.getIntData("ref"),
            row: cel.getInternalData("row"),
            col: cel.getInternalData("col")
          };
        }
        return void 0;
      }, "targetCell");
      this.addDOMEvent("click", (e) => {
        const ref = targetCell(e);
        if (ref) {
          if (!this._selection.has(ref.ref)) {
            this._clearSelection(false);
            this._addSelection(ref.ref, true);
          }
        }
      });
      this.addDOMEvent("dblclick", (e) => {
        const ref = targetCell(e);
        if (ref) {
          if (!this._selection.has(ref.ref)) {
            this._clearSelection(false);
            this._addSelection(ref.ref, true);
          }
          this.fire("dblClick", { context: { row: ref.row, col: ref.col } });
        }
      });
      this.addDOMEvent("contextmenu", (e) => {
        const ref = targetCell(e);
        if (ref) {
          if (!this._selection.has(ref.ref)) {
            this._clearSelection(false);
            this._addSelection(ref.ref, true);
          }
          this.fire("contextMenu", { uievent: e, context: { row: ref.row, col: ref.col } });
        } else {
          this.fire("contextMenu", { uievent: e, context: null });
        }
        e.preventDefault();
        e.stopPropagation();
      });
      this._updateFlexs();
      this._fheader = this._buildColHeader(true);
      this._hheader = this._buildColHeader(false);
      this._vheader = new Box({ cls: "row-header" });
      if (this._has_footer) {
        this._ffooter = this._buildColFooter(true);
        this._footer = this._buildColFooter(false);
      }
      this.setContent([this._viewport, this._fheader, this._hheader, this._ffooter, this._footer, this._vheader]);
      {
        const rh = this.getStyleVariable("--row-height");
        this._row_height = parseInt(rh);
      }
      this._computeFullSize();
    }
    /**
     * 
     */
    _update(force = false) {
      if (!this._lock) {
        const rc = this.getBoundingRect();
        const rowc = this._store ? this._store.getRowCount() : 0;
        const mul = rowc < SCROLL_LIMIT2 ? this._row_height : 1;
        const start = Math.floor(this._top / mul);
        const end = start + Math.ceil(rc.height / this._row_height);
        const hasFixed = this._has_fixed;
        if (this._start != start || this._end != end || force) {
          const rows = [];
          const headers = [];
          if (force) {
            this._vis_rows.clear();
          }
          let newvis = /* @__PURE__ */ new Map();
          let y = start * mul;
          for (let row = start; row < end && row < rowc; row++, y += this._row_height) {
            let el = this._vis_rows.get(row);
            if (hasFixed) {
              if (!el) {
                el = {
                  h: this._buildRowHeader(row, y),
                  r: this._buildRow(row, y)
                };
              } else {
                el.h.setStyleValue("top", y + "px");
                el.r.setStyleValue("top", y + "px");
              }
              headers.push(el.h);
            } else {
              if (!el) {
                el = { h: null, r: this._buildRow(row, y) };
              } else {
                el.r.setStyleValue("top", y + "px");
              }
            }
            rows.push(el.r);
            newvis.set(row, el);
          }
          if (hasFixed) {
            headers.push(new Component2({ cls: "cell-out", style: { top: y + "px" } }));
          }
          this._vis_rows = newvis;
          this._start = start;
          this._end = end;
          this._body.setContent(rows);
          if (hasFixed) {
            this._vheader.removeClass("@hidden");
            this._vheader.setContent(headers);
          } else {
            this._vheader.addClass("@hidden");
          }
        }
      }
    }
    /**
     * 
     */
    _clearSelection(notify = true) {
      for (const ref of this._selection.keys()) {
        const els = this.queryAll(`.cell[data-ref="${ref}"]`);
        els.forEach((el) => {
          el.removeClass("selected");
        });
      }
      this._selection.clear();
      if (notify) {
        this.fire("selectionChange", { selection: [], empty: true });
      }
    }
    /**
     * 
     */
    _addSelection(ref, notify = true) {
      this._selection.add(ref);
      const els = this.queryAll(`.cell[data-ref="${ref}"]`);
      els.forEach((el) => {
        el.addClass("selected");
      });
      if (notify) {
        const selection = this.getSelection();
        this.fire("selectionChange", { selection, empty: selection.length != 0 });
      }
    }
    /**
     * 
     */
    getSelection() {
      const selection = [];
      this._selection.forEach((x) => {
        selection.push({
          row: x >> 12,
          col: x & 4095
        });
      });
      return selection;
    }
    /**
     * 
     */
    selectItem(row, col, append = false) {
      if (!append) {
        this._clearSelection(false);
      }
      this._addSelection(mkid(row, col), true);
    }
  };
  _init59 = __decoratorStart(_a59);
  _Spreadsheet = __decorateElement(_init59, 0, "Spreadsheet", _Spreadsheet_decorators, _Spreadsheet);
  __name(_Spreadsheet, "Spreadsheet");
  __runInitializers(_init59, 1, _Spreadsheet);
  var Spreadsheet = _Spreadsheet;

  // node_modules/x4js/src/components/switch/switch.ts
  var _Switch_decorators, _init60, _a60;
  _Switch_decorators = [class_ns("x4")];
  var _Switch = class _Switch extends (_a60 = HBox) {
    constructor(props) {
      super(props);
      const inputId = makeUniqueComponentId();
      this.setContent([
        new Component2({
          cls: "switch",
          content: [
            new Input({ type: "checkbox", id: inputId, checked: props.checked }),
            new Component2({ cls: "track" }),
            new Component2({ cls: "thumb" })
          ]
        }),
        new Label({
          tag: "label",
          text: props.label,
          labelFor: inputId
        })
      ]);
    }
  };
  _init60 = __decoratorStart(_a60);
  _Switch = __decorateElement(_init60, 0, "Switch", _Switch_decorators, _Switch);
  __name(_Switch, "Switch");
  __runInitializers(_init60, 1, _Switch);
  var Switch = _Switch;

  // node_modules/x4js/src/components/tabs/tabs.ts
  var _CTab_decorators, _init61, _a61;
  _CTab_decorators = [class_ns("x4")];
  var _CTab = class _CTab extends (_a61 = Button) {
    constructor(props, item) {
      super(props);
      this.addClass("outline");
      if (item.cls) {
        this.addClass(item.cls);
      }
      this.setIcon(item.icon);
      this.setText(item.title);
      this.setData("tabname", item.name);
    }
  };
  _init61 = __decoratorStart(_a61);
  _CTab = __decorateElement(_init61, 0, "CTab", _CTab_decorators, _CTab);
  __name(_CTab, "CTab");
  __runInitializers(_init61, 1, _CTab);
  var CTab = _CTab;
  var _CTabList_decorators, _init62, _a62;
  _CTabList_decorators = [class_ns("x4")];
  var _CTabList = class _CTabList extends (_a62 = HBox) {
    constructor(props, items) {
      super(props);
      __publicField(this, "_selitem");
      this.setItems(items);
      this.mapPropEvents(props, "click");
    }
    _on_click(ev) {
      const name = ev.source.getData("tabname");
      this.fire("click", { name });
    }
    select(name) {
      const tab = this.query(`[data-tabname="${name}"]`);
      if (this._selitem) {
        this._selitem.setClass("selected", false);
      }
      this._selitem = tab;
      if (this._selitem) {
        this._selitem.setClass("selected", true);
      }
    }
    setItems(items) {
      this.clearContent();
      items.forEach((tab) => {
        this.addItem(tab);
      });
    }
    addItem(tab) {
      this.appendContent(new CTab({
        click: /* @__PURE__ */ __name((ev) => this._on_click(ev), "click")
      }, tab));
    }
    removeItem(name) {
      const tab = this.query(`[data-tabname="${name}"]`);
      if (tab) {
        this.removeChild(tab);
      }
    }
  };
  _init62 = __decoratorStart(_a62);
  _CTabList = __decorateElement(_init62, 0, "CTabList", _CTabList_decorators, _CTabList);
  __name(_CTabList, "CTabList");
  __runInitializers(_init62, 1, _CTabList);
  var CTabList = _CTabList;
  var _Tabs_decorators, _init63, _a63;
  _Tabs_decorators = [class_ns("x4")];
  var _Tabs = class _Tabs extends (_a63 = Box) {
    constructor(props) {
      super(props);
      __publicField(this, "_list");
      __publicField(this, "_stack");
      __publicField(this, "_current");
      this.setClass("vertical", props.vertical ?? false);
      const pages = props.items?.map((x) => {
        return {
          name: x.name,
          content: x.content
        };
      });
      this.setContent([
        this._list = new CTabList(
          {
            click: /* @__PURE__ */ __name((ev) => this._onclick(ev), "click")
          },
          props.items
        ),
        this._stack = new StackBox({
          cls: "body x4flex",
          default: props.default,
          items: pages
        })
      ]);
      if (props.default) {
        this.selectTab(props.default);
      }
    }
    selectTab(name) {
      this._list.select(name);
      this._stack.select(name);
      this._current = name;
    }
    _onclick(ev) {
      this.selectTab(ev.name);
    }
    /**
     * 
     */
    getTab(name) {
      return this._stack.getPage(name);
    }
    getCurTab() {
      return this._current;
    }
    /**
     * 
     */
    addTab(item) {
      this._list.addItem(item);
      this._stack.addItem({ name: item.name, content: item.content });
      if (this._stack.getPageCount() == 1) {
        this.selectTab(item.name);
      }
    }
    /**
     * 
     */
    removeTab(name) {
      this._list.removeItem(name);
      this._stack.removeItem(name);
    }
    /**
     * 
     */
    enumTabs() {
      return this._stack.enumPageNames();
    }
  };
  _init63 = __decoratorStart(_a63);
  _Tabs = __decorateElement(_init63, 0, "Tabs", _Tabs_decorators, _Tabs);
  __name(_Tabs, "Tabs");
  __runInitializers(_init63, 1, _Tabs);
  var Tabs = _Tabs;

  // node_modules/x4js/src/components/tag/tag.ts
  var _Tag_decorators, _init64, _a64;
  _Tag_decorators = [class_ns("x4")];
  var _Tag = class _Tag extends (_a64 = HBox) {
    constructor(props) {
      super(props);
      this.setContent([
        new Icon2({ iconId: props.icon }),
        new SimpleText({ text: props.label })
      ]);
    }
  };
  _init64 = __decoratorStart(_a64);
  _Tag = __decorateElement(_init64, 0, "Tag", _Tag_decorators, _Tag);
  __name(_Tag, "Tag");
  __runInitializers(_init64, 1, _Tag);
  var Tag = _Tag;

  // node_modules/x4js/src/components/textarea/textarea.ts
  var _SimpleTextArea_decorators, _init65, _a65;
  _SimpleTextArea_decorators = [class_ns("x4")];
  var _SimpleTextArea = class _SimpleTextArea extends (_a65 = Component2) {
    constructor(props) {
      super({ ...props, tag: "textarea" });
      this.setAttribute("name", props.name);
      if (props.value) {
        this.setAttribute("value", props.value + "");
      }
      if (props.resize !== void 0) {
        this.setStyleValue("resize", props.resize === false ? "none" : props.resize);
      }
      if (props.readonly) {
        this.setAttribute("readonly", true);
      }
    }
    setText(text) {
      this.dom.value = text;
    }
    getText() {
      let text = this.dom.value;
      if (this.props.trim !== false) {
        text = text.trim();
      }
      return text;
    }
    scrollToBottom() {
      this.dom.scrollTop = this.dom.scrollHeight;
    }
    queryInterface(name) {
      if (name == "form-element") {
        const i = {
          getRawValue: /* @__PURE__ */ __name(() => {
            return this.getText();
          }, "getRawValue"),
          setRawValue: /* @__PURE__ */ __name((v) => {
            this.setText(v);
          }, "setRawValue"),
          isValid: /* @__PURE__ */ __name(() => {
            return true;
          }, "isValid")
        };
        return i;
      }
      return super.queryInterface(name);
    }
  };
  _init65 = __decoratorStart(_a65);
  _SimpleTextArea = __decorateElement(_init65, 0, "SimpleTextArea", _SimpleTextArea_decorators, _SimpleTextArea);
  __name(_SimpleTextArea, "SimpleTextArea");
  __runInitializers(_init65, 1, _SimpleTextArea);
  var SimpleTextArea = _SimpleTextArea;
  var _TextArea_decorators, _init66, _a66;
  _TextArea_decorators = [class_ns("x4")];
  var _TextArea = class _TextArea extends (_a66 = VBox) {
    constructor(props) {
      super(props);
      __publicField(this, "_input");
      const { label, value, resize, readonly, trim, name } = props;
      this.setContent([
        new Label({ text: props.label }),
        this._input = new SimpleTextArea({ label, value, resize, readonly, trim })
      ]);
    }
    setText(text) {
      this._input.setText(text);
    }
    getText() {
      return this._input.getText();
    }
    scrollToBottom() {
      this._input.scrollToBottom();
    }
    queryInterface(name) {
      if (name == "form-element") {
        const i = {
          getRawValue: /* @__PURE__ */ __name(() => {
            return this.getText();
          }, "getRawValue"),
          setRawValue: /* @__PURE__ */ __name((v) => {
            this.setText(v);
          }, "setRawValue"),
          isValid: /* @__PURE__ */ __name(() => {
            return true;
          }, "isValid")
        };
        return i;
      }
      return super.queryInterface(name);
    }
  };
  _init66 = __decoratorStart(_a66);
  _TextArea = __decorateElement(_init66, 0, "TextArea", _TextArea_decorators, _TextArea);
  __name(_TextArea, "TextArea");
  __runInitializers(_init66, 1, _TextArea);
  var TextArea = _TextArea;

  // node_modules/x4js/src/components/textedit/textedit.ts
  var _TextEdit_decorators, _init67, _a67;
  _TextEdit_decorators = [class_ns("x4")];
  var _TextEdit = class _TextEdit extends (_a67 = HBox) {
    constructor(props) {
      super(props);
      __publicField(this, "input");
      if (!props.inputId) {
        props.inputId = makeUniqueComponentId();
      }
      if (props.required) {
        this.setAttribute("required", true);
      }
      const gadgets = props.inputGadgets ?? [];
      gadgets.forEach((g) => {
        g.addClass("gadget");
      });
      const iprops = { ...props, id: props.inputId, attrs: props.inputAttrs, width: props.inputWidth };
      delete iprops.cls;
      this.setContent([
        props.label ? new HBox({ id: "label", width: props.labelWidth, content: [
          new Label({ tag: "label", text: props.label, labelFor: props.inputId })
        ] }) : null,
        new HBox({ id: "edit", content: [
          this.input = new Input(iprops),
          ...gadgets
        ] })
      ]);
    }
    getValue() {
      return this.input.getValue();
    }
    setValue(value) {
      this.input.setValue(value);
    }
    getInput() {
      return this.input;
    }
  };
  _init67 = __decoratorStart(_a67);
  _TextEdit = __decorateElement(_init67, 0, "TextEdit", _TextEdit_decorators, _TextEdit);
  __name(_TextEdit, "TextEdit");
  __runInitializers(_init67, 1, _TextEdit);
  var TextEdit = _TextEdit;

  // node_modules/x4js/src/components/tickline/tickline.ts
  var _TickLine_decorators, _init68, _a68;
  _TickLine_decorators = [class_ns("x4")];
  var _TickLine = class _TickLine extends (_a68 = Component2) {
    constructor(props) {
      super(props);
      this.addDOMEvent("resized", () => this.update());
    }
    update() {
      const props = this.props;
      const vals = props.values;
      const padding = 4;
      if (props.type == "bars" && vals.length == 0 || props.type == "line" && vals.length < 2) {
        this.clearContent();
        return;
      }
      const rc = this.getBoundingRect().moveTo(0, 0).inflate(-padding);
      const min = props.min ?? 0;
      const max = props.max ?? 100;
      if (max <= min || rc.width <= 0 || rc.height <= 0) {
        this.clearContent();
        return;
      }
      const xmul = props.type == "line" ? rc.width / (vals.length - 1) : rc.width / vals.length;
      const ymul = rc.height / (max - min);
      const b = rc.bottom;
      const bld = new SvgBuilder();
      if (props.background) {
        bld.rect(0, 0, rc.width + padding * 2, rc.height + padding * 2).fill(props.background.toHexString());
      }
      if (min != 0 || props.display?.axis) {
        bld.path().moveTo(rc.left, b - (0 - min) * ymul).lineTo(rc.right, b - (0 - min) * ymul).stroke("var(--tickline-axis-color)", 1).antiAlias(false);
      }
      if (props.type == "line") {
        const pth = bld.path();
        for (let x = 0; x < vals.length; x++) {
          if (x == 0) {
            pth.moveTo(rc.left + x * xmul, b - (vals[x] - min) * ymul);
          } else {
            pth.lineTo(rc.left + x * xmul, b - (vals[x] - min) * ymul);
          }
        }
        pth.stroke(props.color ? props.color.toHexString() : "var(--tickline-color)", 1).no_fill();
      } else {
        for (let x = 0; x < vals.length; x++) {
          const r = bld.rect(rc.left + x * xmul, b - (vals[x] - min) * ymul, xmul - 1, (vals[x] - min) * ymul).fill(props.color ? props.color.toHexString() : "var(--tickline-color)").antiAlias(false);
          if (props.display?.tooltips) {
            r.setAttr("tooltip", vals[x].toFixed(1));
          }
        }
      }
      this.setContent(new SvgComponent({ width: "100%", height: "100%", svg: bld, attrs: { viewport: `0 ${props.min ?? 0} ${vals.length} ${props.max ?? 100}` } }));
    }
    setValues(values, options) {
      options = { min: 0, max: 100, ...options };
      this.props.values = values;
      this.props.min = options.min;
      this.props.max = options.max;
      this.update();
    }
  };
  _init68 = __decoratorStart(_a68);
  _TickLine = __decorateElement(_init68, 0, "TickLine", _TickLine_decorators, _TickLine);
  __name(_TickLine, "TickLine");
  __runInitializers(_init68, 1, _TickLine);
  var TickLine = _TickLine;

  // node_modules/x4js/src/components/tooltips/tooltips.ts
  var timer = new Timer();
  var _Tooltip_decorators, _init69, _a69;
  _Tooltip_decorators = [class_ns("x4")];
  var _Tooltip = class _Tooltip extends (_a69 = Popup) {
    constructor(props) {
      super(props);
      this.setContent(
        new HBox({ content: [
          new Icon2({ iconId: icons_default.question }),
          new Component2({ id: "text" })
        ] })
      );
    }
    /**
     * 
     */
    setText(text) {
      this.query("#text").setContent(text);
    }
  };
  _init69 = __decoratorStart(_a69);
  _Tooltip = __decorateElement(_init69, 0, "Tooltip", _Tooltip_decorators, _Tooltip);
  __name(_Tooltip, "Tooltip");
  __runInitializers(_init69, 1, _Tooltip);
  var Tooltip = _Tooltip;

  // node_modules/x4js/src/components/treeview/treeview.ts
  var _CTreeViewItem_decorators, _init70, _a70;
  _CTreeViewItem_decorators = [class_ns("x4")];
  var _CTreeViewItem = class _CTreeViewItem extends (_a70 = Box) {
    constructor(props, item) {
      super({ ...props });
      __publicField(this, "_item");
      __publicField(this, "_label");
      __publicField(this, "_icon");
      __publicField(this, "_childs");
      this._item = item;
      if (item) {
        this._label = new HBox({ cls: "label item", content: [
          this._icon = new Icon2({ cls: "arrow", iconId: item.children ? icons_default.chevron : void 0 }),
          new Label({ tag: "span", cls: "", text: item.text, icon: item.iconId })
        ] });
        if (item.cls) {
          this._label.addClass(item.cls);
        }
        if (item.sub_cols) {
          const mk_col = /* @__PURE__ */ __name((_, index) => {
            const c = item.sub_cols[index];
            if (c === void 0 || c === null) {
              return null;
            }
            if (c instanceof Component2) {
              return c;
            }
            return new SimpleText({ cls: `column ref-c${index + 2}`, text: c });
          }, "mk_col");
          this._label.appendContent(item.sub_cols.map(mk_col));
        }
        this._label.setInternalData("id", item.id);
        if (item.children) {
          this._childs = new VBox({ cls: "body" });
          if (item.open === void 0) {
            item.open = false;
          }
          this.addClass("folder");
          this.setClass("open", item.open);
          this.setItems(item.children);
          this._icon.addDOMEvent("click", (ev) => this.toggle(ev));
        }
      } else {
        this._childs = new VBox({ cls: "body" });
      }
      this.setContent([
        this._label,
        this._childs
      ]);
    }
    toggle(ev) {
      const isOpen = this.hasClass("open");
      this.open(!isOpen);
      if (ev) {
        ev.stopPropagation();
      }
    }
    open(open = true) {
      this.setClass("open", open);
      this._item.open = open;
    }
    setItems(items) {
      if (items && items.length) {
        const childs = items.map((itm) => {
          return new _CTreeViewItem({}, itm);
        });
        this._childs.setContent(childs);
      } else {
        this._childs.clearContent();
      }
    }
  };
  _init70 = __decoratorStart(_a70);
  _CTreeViewItem = __decorateElement(_init70, 0, "CTreeViewItem", _CTreeViewItem_decorators, _CTreeViewItem);
  __name(_CTreeViewItem, "CTreeViewItem");
  __runInitializers(_init70, 1, _CTreeViewItem);
  var CTreeViewItem = _CTreeViewItem;
  var _Treeview_decorators, _init71, _a71;
  _Treeview_decorators = [class_ns("x4")];
  var _Treeview = class _Treeview extends (_a71 = Component2) {
    constructor(props) {
      super(props);
      __publicField(this, "_view");
      __publicField(this, "_selection");
      __publicField(this, "_selitem");
      __publicField(this, "_items");
      this.mapPropEvents(props, "selectionChange", "dblClick", "click");
      const scroller = new ScrollView({ cls: "body" });
      this._view = scroller.getViewport();
      this.setContent([
        scroller,
        props.footer
      ]);
      if (props.footer) {
        props.footer.setAttribute("id", "footer");
        props.footer.addClass("packed");
      }
      this.setAttribute("tabindex", 0);
      this.setDOMEvents({
        click: /* @__PURE__ */ __name((ev) => this._on_click(ev), "click"),
        dblclick: /* @__PURE__ */ __name((e) => this._on_click(e), "dblclick"),
        keydown: /* @__PURE__ */ __name((ev) => this._onkey(ev), "keydown")
      });
      this.setItems(props.items);
    }
    /**
     * 
     */
    setItems(items) {
      this.clearSelection();
      this._view.clearContent();
      this._items = items;
      const root = new CTreeViewItem({ cls: "root" }, null);
      if (items && items.length) {
        root.setItems(items);
        this._view.setContent(root);
      } else {
        this._view.setContent(new Label({ cls: "empty vertical", icon: icons_default.empty, text: this.props.emptyMsg ?? _tr.global.empty_list }));
      }
    }
    _on_click(ev) {
      let target = ev.target;
      while (target && target != this.dom) {
        const c = componentFromDOM(target);
        if (c && c.hasClass("item")) {
          const id = c.getInternalData("id");
          const fev = { context: id };
          if (ev.type == "click") {
            this.fire("click", fev);
          } else {
            this.fire("dblClick", fev);
          }
          if (!fev.defaultPrevented) {
            this._selectItem(id, c);
          }
          return;
        }
        target = target.parentElement;
      }
      this.clearSelection();
    }
    _onkey(ev) {
      switch (ev.key) {
        case "ArrowDown": {
          this.navigate(2 /* next */);
          break;
        }
        case "ArrowUp": {
          this.navigate(1 /* prev */);
          break;
        }
        case "Home": {
          this.navigate(0 /* first */);
          break;
        }
        case "End": {
          this.navigate(3 /* last */);
          break;
        }
        case "ArrowRight": {
          this.navigate(5 /* child */);
          break;
        }
        case "+": {
          this.navigate(6 /* expand */);
          break;
        }
        case "ArrowLeft": {
          this.navigate(4 /* parent */);
          break;
        }
        case "-": {
          this.navigate(7 /* collapse */);
          break;
        }
        case " ": {
          this.navigate(8 /* toggle */);
          break;
        }
        default:
          return;
      }
      ev.preventDefault();
      ev.stopPropagation();
    }
    /**
     * 
     */
    navigate(sens) {
      if (!this._items || this._items.length == 0) {
        return;
      }
      if (!this._selitem) {
        if (sens == 2 /* next */ || sens == 4 /* parent */) sens = 0 /* first */;
        else if (sens == 1 /* prev */) sens = 3 /* last */;
        else return;
      }
      const p = this._selitem?.parentElement();
      const isFolder = p?.hasClass("folder");
      if (p && sens == 4 /* parent */ && isFolder && p.hasClass("open")) {
        sens = 7 /* collapse */;
      } else if (sens == 5 /* child */) {
        if (isFolder) {
          if (!p.hasClass("open")) {
            sens = 6 /* expand */;
          } else {
            sens = 2 /* next */;
          }
        } else {
          sens = 2 /* next */;
        }
      }
      if (sens == 6 /* expand */ || sens == 7 /* collapse */ || sens == 8 /* toggle */) {
        if (isFolder) {
          if (sens == 8 /* toggle */) {
            p.toggle();
            return true;
          } else {
            p.open(sens == 6 /* expand */);
            return true;
          }
        }
      } else {
        const all = this._flattenOpenItems();
        let cur = all.findIndex((x) => this._selection == x.id);
        let newSel;
        if (sens == 0 /* first */) {
          newSel = all[0].id;
        } else if (sens == 3 /* last */) {
          newSel = all[all.length - 1].id;
        } else if (cur >= 0) {
          if (sens == 1 /* prev */) {
            if (cur > 0) {
              newSel = all[cur - 1].id;
            }
          } else if (sens == 2 /* next */) {
            if (cur < all.length - 1) {
              newSel = all[cur + 1].id;
            }
          } else if (sens == 4 /* parent */) {
            const clevel = all[cur].level;
            while (cur > 0) {
              cur--;
              if (all[cur].level < clevel) {
                newSel = all[cur].id;
                break;
              }
            }
          }
        }
        if (newSel) {
          const all2 = this._view.enumChildComponents(true);
          const nsel = all2.find((x) => x.getInternalData("id") === newSel);
          this._selectItem(newSel, nsel);
          return true;
        }
      }
      return false;
    }
    _flattenOpenItems() {
      let all = [];
      const build = /* @__PURE__ */ __name((x, level) => {
        all.push({ id: x.id, level });
        if (x.children && x.open) {
          x.children.forEach((y) => build(y, level + 1));
        }
      }, "build");
      this._items.forEach((y) => build(y, 0));
      return all;
    }
    _flattenItems() {
      let all = [];
      const build = /* @__PURE__ */ __name((x) => {
        all.push(x);
        if (x.children) {
          x.children.forEach((y) => build(y));
        }
      }, "build");
      this._items.forEach((y) => build(y));
      return all;
    }
    _selectItem(id, item) {
      if (this._selitem) {
        this._selitem.removeClass("selected");
        this._selitem = void 0;
      }
      this._selitem = item;
      this._selection = id;
      if (item) {
        item.addClass("selected");
        item.scrollIntoView({
          behavior: "smooth",
          block: "nearest"
        });
      }
      const itm = this._findItem(id);
      this.fire("selectionChange", { selection: [itm], empty: false });
    }
    _findItem(id) {
      const all = this._flattenItems();
      return all.find((x) => x.id == id);
    }
    /**
     * 
     */
    clearSelection() {
      if (this._selitem) {
        this._selitem.removeClass("selected");
        this._selitem = void 0;
      }
      if (this._selection) {
        this._selection = void 0;
        this.fire("selectionChange", { selection: [], empty: true });
      }
    }
    /**
     * 
     */
    getSelection() {
      return this._selection;
    }
    /**
     * 
     */
    selectItem(id) {
      const itm = this._findItem(id);
      if (itm) {
        this.visitChildren((c) => {
          const cid = c.getInternalData("id");
          if (cid == id) {
            this._selectItem(id, c);
            return true;
          }
        });
      }
    }
  };
  _init71 = __decoratorStart(_a71);
  _Treeview = __decorateElement(_init71, 0, "Treeview", _Treeview_decorators, _Treeview);
  __name(_Treeview, "Treeview");
  __runInitializers(_init71, 1, _Treeview);
  var Treeview = _Treeview;

  // src/server.ts
  var _Server = class _Server {
    constructor() {
      __publicField(this, "tokens", null);
    }
    async login(login, password) {
      this.tokens = await this.send("POST", "/auth/login", { login, password });
    }
    async logout() {
      if (this.tokens) {
        await this.send("POST", "/auth/logout", { refresh: this.tokens.refresh }).catch(() => {
        });
        this.tokens = null;
      }
    }
    // a call to the API: refresh on 401, step-up on 403 "step-up required", then once again
    async call(method, path, body) {
      try {
        return await this.send(method, path, body);
      } catch (e) {
        const { status, message } = e;
        const again = status === 401 && await this.refresh() || message === "step-up required" && await this.stepUp();
        if (!again) {
          throw e;
        }
        return this.send(method, path, body);
      }
    }
    // live events: a one-time ticket (POST on the endpoint path), then the socket within 1 s
    async openLive() {
      const { ticket } = await this.call("POST", "/api/live/notes");
      const ws = new WebSocket(`${"http://127.0.0.1:4400".replace(/^http/, "ws")}/api/live/notes?ticket=${encodeURIComponent(ticket)}`);
      ws.onmessage = (e) => {
        const event = JSON.parse(e.data);
        Application.fireGlobal(`note.${event.event}`, event);
      };
    }
    async send(method, path, body) {
      const headers = { "content-type": "application/json" };
      if (this.tokens) {
        headers.authorization = "Bearer " + this.tokens.access;
      }
      const res = await fetch("http://127.0.0.1:4400" + path, { method, headers, body: body ? JSON.stringify(body) : void 0 });
      const json = await res.json().catch(() => null);
      if (!res.ok) {
        const error = Object.assign(new Error(json?.error ?? res.statusText), { status: res.status });
        throw error;
      }
      return json;
    }
    async refresh() {
      if (!this.tokens) {
        return false;
      }
      try {
        this.tokens = await this.send("POST", "/auth/refresh", { refresh: this.tokens.refresh });
        return true;
      } catch {
        this.tokens = null;
        return false;
      }
    }
    async stepUp() {
      const password = await InputBox.showAsync("Cette action demande de confirmer votre mot de passe", "", "Confirmation", { password: true });
      if (!password) {
        return false;
      }
      await this.send("POST", "/auth/stepup", { password });
      return true;
    }
  };
  __name(_Server, "Server");
  var Server = _Server;
  var server = new Server();

  // src/main.ts
  function showError(e) {
    MessageBox.show(e instanceof Error ? e.message : String(e));
  }
  __name(showError, "showError");
  var _NotesView = class _NotesView extends VBox {
    constructor(props) {
      super(props);
      this.mapPropEvents(props, "logout");
      this.setContent([
        new HBox({ cls: "toolbar", content: [
          new Label({ text: `Connecté en tant que ${props.login}` }),
          new Flex(),
          this.refs.stats = new Label({ cls: "stats" }),
          new Button({ label: "Compter les mots", click: /* @__PURE__ */ __name(() => this.count(), "click") }),
          new Button({ label: "Déconnexion", click: /* @__PURE__ */ __name(() => this.logout(), "click") })
        ] }),
        this.refs.form = new Form({ cls: "create", content: [
          this.refs.title = new TextEdit({ label: "Titre", name: "title", type: "text", value: "" }),
          this.refs.text = new TextArea({ label: "Texte" }),
          new Button({ label: "Ajouter la note", click: /* @__PURE__ */ __name(() => this.add(), "click") })
        ] }),
        this.refs.list = new VBox({ cls: "list" })
      ]);
      this.onGlobalEvent((ev) => {
        if (ev.msg.startsWith("note.")) {
          this.refresh().catch(showError);
        }
      });
      this.refresh().catch(showError);
    }
    async refresh() {
      const notes = await server.call("GET", "/api/notes/all");
      this.refs.list.setContent(notes.map((note) => new HBox({ cls: "note", content: [
        new Label({ cls: "title", text: note.title }),
        new Label({ cls: "author", text: `par ${note.author}` }),
        new Flex(),
        new Button({ label: "Supprimer", click: /* @__PURE__ */ __name(() => this.remove(note), "click") })
      ] })));
    }
    // the text is read from the TextArea itself: in x4js 2.3.8, TextArea does not pass
    // its name to its textarea, so Form.getValues( ) does not see it
    async add() {
      const { title } = this.refs.form.getValues();
      const text = this.refs.text.getText();
      try {
        await server.call("POST", "/api/notes/create", { title, text });
        this.refs.title.setValue("");
        this.refs.text.setText("");
      } catch (e) {
        showError(e);
      }
    }
    // the backend asks for a step-up: server.call asks the password again
    async remove(note) {
      try {
        await server.call("DELETE", `/api/notes/item/${note.id}`);
      } catch (e) {
        showError(e);
      }
    }
    async count() {
      try {
        const r = await server.call("GET", "/api/notes/stats");
        this.refs.stats.setText(`${r.notes} notes, ${r.words} mots (worker ${r.by})`);
      } catch (e) {
        showError(e);
      }
    }
    async logout() {
      await server.logout();
      this.fire("logout", {});
    }
  };
  __name(_NotesView, "NotesView");
  var NotesView = _NotesView;
  var _App = class _App extends Application {
    constructor() {
      super({});
      __publicField(this, "main", new VBox({ cls: "mainview" }));
      this.setMainView(this.main);
      this.showLogin();
    }
    // the login dialog, over an empty page. Escape closes any dialog: it opens again
    showLogin() {
      this.main.clearContent();
      let logged = false;
      const form = new Form({ content: [
        new Label({ cls: "hint", text: "admin / admin-demo (tous les droits), reader / reader-demo (lecture seule)" }),
        new TextEdit({ label: "Identifiant", name: "login", type: "text", value: "admin" }),
        new TextEdit({ label: "Mot de passe", name: "password", type: "password", value: "admin-demo" })
      ] });
      const dialog = new Dialog({
        title: "Connexion",
        form,
        buttons: ["ok.default"],
        btnclick: /* @__PURE__ */ __name(async () => {
          const { login, password } = form.getValues();
          try {
            await server.login(login, password);
            logged = true;
            dialog.close();
            this.showNotes(login);
          } catch (e) {
            showError(e);
          }
        }, "btnclick")
      });
      dialog.on("close", () => {
        if (!logged) {
          asap(() => this.showLogin());
        }
      });
      dialog.show();
    }
    showNotes(login) {
      this.main.setContent(new NotesView({
        flex: true,
        login,
        logout: /* @__PURE__ */ __name(() => this.showLogin(), "logout")
      }));
      server.openLive().catch(showError);
    }
  };
  __name(_App, "App");
  var App = _App;
  new App();
})();
//# sourceMappingURL=main.js.map
