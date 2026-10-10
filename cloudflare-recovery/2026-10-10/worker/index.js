var __defProp = Object.defineProperty;
var __name = (target, value) => __defProp(target, "name", { value, configurable: true });
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};

// node_modules/hono/dist/compose.js
var compose = /* @__PURE__ */ __name((middleware, onError, onNotFound) => {
  return (context, next) => {
    let index = -1;
    return dispatch(0);
    async function dispatch(i) {
      if (i <= index) {
        throw new Error("next() called multiple times");
      }
      index = i;
      let res;
      let isError = false;
      let handler;
      if (middleware[i]) {
        handler = middleware[i][0][0];
        context.req.routeIndex = i;
      } else {
        handler = i === middleware.length && next || void 0;
      }
      if (handler) {
        try {
          res = await handler(context, () => dispatch(i + 1));
        } catch (err) {
          if (err instanceof Error && onError) {
            context.error = err;
            res = await onError(err, context);
            isError = true;
          } else {
            throw err;
          }
        }
      } else {
        if (context.finalized === false && onNotFound) {
          res = await onNotFound(context);
        }
      }
      if (res && (context.finalized === false || isError)) {
        context.res = res;
      }
      return context;
    }
    __name(dispatch, "dispatch");
  };
}, "compose");

// node_modules/hono/dist/http-exception.js
var HTTPException = class extends Error {
  static {
    __name(this, "HTTPException");
  }
  res;
  status;
  /**
   * Creates an instance of `HTTPException`.
   * @param status - HTTP status code for the exception. Defaults to 500.
   * @param options - Additional options for the exception.
   */
  constructor(status = 500, options) {
    super(options?.message, { cause: options?.cause });
    this.res = options?.res;
    this.status = status;
  }
  /**
   * Returns the response object associated with the exception.
   * If a response object is not provided, a new response is created with the error message and status code.
   * @returns The response object.
   */
  getResponse() {
    if (this.res) {
      const newResponse = new Response(this.res.body, {
        status: this.status,
        headers: this.res.headers
      });
      return newResponse;
    }
    return new Response(this.message, {
      status: this.status
    });
  }
};

// node_modules/hono/dist/request/constants.js
var GET_MATCH_RESULT = /* @__PURE__ */ Symbol();

// node_modules/hono/dist/utils/buffer.js
var bufferToFormData = /* @__PURE__ */ __name((arrayBuffer, contentType) => {
  const response = new Response(arrayBuffer, {
    headers: {
      // Normalize the media type (case-insensitive) while keeping parameters like the boundary
      "Content-Type": contentType.replace(/^[^;]+/, (mediaType) => mediaType.toLowerCase())
    }
  });
  return response.formData();
}, "bufferToFormData");

// node_modules/hono/dist/utils/body.js
var isRawRequest = /* @__PURE__ */ __name((request) => "headers" in request, "isRawRequest");
var parseBody = /* @__PURE__ */ __name(async (request, options = /* @__PURE__ */ Object.create(null)) => {
  const { all = false, dot = false } = options;
  const headers = isRawRequest(request) ? request.headers : request.raw.headers;
  const contentType = headers.get("Content-Type");
  const mediaType = contentType?.split(";")[0].trim().toLowerCase();
  if (mediaType === "multipart/form-data" || mediaType === "application/x-www-form-urlencoded") {
    return parseFormData(request, { all, dot });
  }
  return {};
}, "parseBody");
async function parseFormData(request, options) {
  if (!isRawRequest(request) && request.bodyCache.formData) {
    return convertFormDataToBodyData(
      await request.bodyCache.formData,
      options
    );
  }
  const headers = isRawRequest(request) ? request.headers : request.raw.headers;
  const arrayBuffer = await request.arrayBuffer();
  const formDataPromise = bufferToFormData(arrayBuffer, headers.get("Content-Type") || "");
  if (!isRawRequest(request)) {
    request.bodyCache.formData = formDataPromise;
  }
  const formData = await formDataPromise;
  if (formData) {
    return convertFormDataToBodyData(formData, options);
  }
  return {};
}
__name(parseFormData, "parseFormData");
function convertFormDataToBodyData(formData, options) {
  const form = /* @__PURE__ */ Object.create(null);
  formData.forEach((value, key) => {
    const shouldParseAllValues = options.all || key.endsWith("[]");
    if (!shouldParseAllValues) {
      form[key] = value;
    } else {
      handleParsingAllValues(form, key, value);
    }
  });
  if (options.dot) {
    Object.entries(form).forEach(([key, value]) => {
      const shouldParseDotValues = key.includes(".");
      if (shouldParseDotValues) {
        handleParsingNestedValues(form, key, value);
        delete form[key];
      }
    });
  }
  return form;
}
__name(convertFormDataToBodyData, "convertFormDataToBodyData");
var handleParsingAllValues = /* @__PURE__ */ __name((form, key, value) => {
  if (form[key] !== void 0) {
    if (Array.isArray(form[key])) {
      ;
      form[key].push(value);
    } else {
      form[key] = [form[key], value];
    }
  } else {
    if (!key.endsWith("[]")) {
      form[key] = value;
    } else {
      form[key] = [value];
    }
  }
}, "handleParsingAllValues");
var handleParsingNestedValues = /* @__PURE__ */ __name((form, key, value) => {
  if (/(?:^|\.)__proto__\./.test(key)) {
    return;
  }
  let nestedForm = form;
  const keys2 = key.split(".");
  keys2.forEach((key2, index) => {
    if (index === keys2.length - 1) {
      nestedForm[key2] = value;
    } else {
      if (!nestedForm[key2] || typeof nestedForm[key2] !== "object" || Array.isArray(nestedForm[key2]) || nestedForm[key2] instanceof File) {
        nestedForm[key2] = /* @__PURE__ */ Object.create(null);
      }
      nestedForm = nestedForm[key2];
    }
  });
}, "handleParsingNestedValues");

// node_modules/hono/dist/utils/url.js
var splitPath = /* @__PURE__ */ __name((path) => {
  const paths = path.split("/");
  if (paths[0] === "") {
    paths.shift();
  }
  return paths;
}, "splitPath");
var splitRoutingPath = /* @__PURE__ */ __name((routePath) => {
  const { groups, path } = extractGroupsFromPath(routePath);
  const paths = splitPath(path);
  return replaceGroupMarks(paths, groups);
}, "splitRoutingPath");
var extractGroupsFromPath = /* @__PURE__ */ __name((path) => {
  const groups = [];
  path = path.replace(/\{[^}]+\}/g, (match2, index) => {
    const mark = `@${index}`;
    groups.push([mark, match2]);
    return mark;
  });
  return { groups, path };
}, "extractGroupsFromPath");
var replaceGroupMarks = /* @__PURE__ */ __name((paths, groups) => {
  for (let i = groups.length - 1; i >= 0; i--) {
    const [mark] = groups[i];
    for (let j = paths.length - 1; j >= 0; j--) {
      if (paths[j].includes(mark)) {
        paths[j] = paths[j].replace(mark, groups[i][1]);
        break;
      }
    }
  }
  return paths;
}, "replaceGroupMarks");
var patternCache = {};
var getPattern = /* @__PURE__ */ __name((label, next) => {
  if (label === "*") {
    return "*";
  }
  const match2 = label.match(/^\:([^\{\}]+)(?:\{(.+)\})?$/);
  if (match2) {
    const cacheKey = `${label}#${next}`;
    if (!patternCache[cacheKey]) {
      if (match2[2]) {
        patternCache[cacheKey] = next && next[0] !== ":" && next[0] !== "*" ? [cacheKey, match2[1], new RegExp(`^${match2[2]}(?=/${next})`)] : [label, match2[1], new RegExp(`^${match2[2]}$`)];
      } else {
        patternCache[cacheKey] = [label, match2[1], true];
      }
    }
    return patternCache[cacheKey];
  }
  return null;
}, "getPattern");
var tryDecode = /* @__PURE__ */ __name((str, decoder) => {
  try {
    return decoder(str);
  } catch {
    return str.replace(/(?:%[0-9A-Fa-f]{2})+/g, (match2) => {
      try {
        return decoder(match2);
      } catch {
        return match2;
      }
    });
  }
}, "tryDecode");
var tryDecodeURI = /* @__PURE__ */ __name((str) => tryDecode(str, decodeURI), "tryDecodeURI");
var getPath = /* @__PURE__ */ __name((request) => {
  const url2 = request.url;
  const start = url2.indexOf("/", url2.indexOf(":") + 4);
  let i = start;
  for (; i < url2.length; i++) {
    const charCode = url2.charCodeAt(i);
    if (charCode === 37) {
      const queryIndex = url2.indexOf("?", i);
      const hashIndex = url2.indexOf("#", i);
      const end = queryIndex === -1 ? hashIndex === -1 ? void 0 : hashIndex : hashIndex === -1 ? queryIndex : Math.min(queryIndex, hashIndex);
      const path = url2.slice(start, end);
      return tryDecodeURI(path.includes("%25") ? path.replace(/%25/g, "%2525") : path);
    } else if (charCode === 63 || charCode === 35) {
      break;
    }
  }
  return url2.slice(start, i);
}, "getPath");
var getPathNoStrict = /* @__PURE__ */ __name((request) => {
  const result = getPath(request);
  return result.length > 1 && result.at(-1) === "/" ? result.slice(0, -1) : result;
}, "getPathNoStrict");
var mergePath = /* @__PURE__ */ __name((base, sub, ...rest) => {
  if (rest.length) {
    sub = mergePath(sub, ...rest);
  }
  return `${base?.[0] === "/" ? "" : "/"}${base}${sub === "/" ? "" : `${base?.at(-1) === "/" ? "" : "/"}${sub?.[0] === "/" ? sub.slice(1) : sub}`}`;
}, "mergePath");
var checkOptionalParameter = /* @__PURE__ */ __name((path) => {
  if (path.charCodeAt(path.length - 1) !== 63 || !path.includes(":")) {
    return null;
  }
  const segments = path.split("/");
  const results = [];
  let basePath = "";
  segments.forEach((segment) => {
    if (segment !== "" && !/\:/.test(segment)) {
      basePath += "/" + segment;
    } else if (/\:/.test(segment)) {
      if (segment.charCodeAt(segment.length - 1) === 63) {
        if (results.length === 0 && basePath === "") {
          results.push("/");
        } else {
          results.push(basePath);
        }
        const optionalSegment = segment.slice(0, -1);
        basePath += "/" + optionalSegment;
        results.push(basePath);
      } else {
        basePath += "/" + segment;
      }
    }
  });
  return results.filter((v, i, a) => a.indexOf(v) === i);
}, "checkOptionalParameter");
var tryDecodeURIComponent = /* @__PURE__ */ __name((str) => str.indexOf("%") !== -1 ? tryDecode(str, decodeURIComponent_) : str, "tryDecodeURIComponent");
var _decodeURI = /* @__PURE__ */ __name((value) => {
  if (value.indexOf("+") !== -1) {
    value = value.replace(/\+/g, " ");
  }
  return tryDecodeURIComponent(value);
}, "_decodeURI");
var _getQueryParam = /* @__PURE__ */ __name((url2, key, multiple) => {
  let encoded;
  if (!multiple && key && key.indexOf("%") === -1 && key.indexOf("+") === -1) {
    let keyIndex2 = url2.indexOf("?", 8);
    if (keyIndex2 === -1) {
      return void 0;
    }
    if (!url2.startsWith(key, keyIndex2 + 1)) {
      keyIndex2 = url2.indexOf(`&${key}`, keyIndex2 + 1);
    }
    while (keyIndex2 !== -1) {
      const trailingKeyCode = url2.charCodeAt(keyIndex2 + key.length + 1);
      if (trailingKeyCode === 61) {
        const valueIndex = keyIndex2 + key.length + 2;
        const endIndex = url2.indexOf("&", valueIndex);
        return _decodeURI(url2.slice(valueIndex, endIndex === -1 ? void 0 : endIndex));
      } else if (trailingKeyCode == 38 || isNaN(trailingKeyCode)) {
        return "";
      }
      keyIndex2 = url2.indexOf(`&${key}`, keyIndex2 + 1);
    }
    encoded = /[%+]/.test(url2);
    if (!encoded) {
      return void 0;
    }
  }
  const results = /* @__PURE__ */ Object.create(null);
  encoded ??= /[%+]/.test(url2);
  let keyIndex = url2.indexOf("?", 8);
  while (keyIndex !== -1) {
    const nextKeyIndex = url2.indexOf("&", keyIndex + 1);
    let valueIndex = url2.indexOf("=", keyIndex);
    if (valueIndex > nextKeyIndex && nextKeyIndex !== -1) {
      valueIndex = -1;
    }
    let name = url2.slice(
      keyIndex + 1,
      valueIndex === -1 ? nextKeyIndex === -1 ? void 0 : nextKeyIndex : valueIndex
    );
    if (encoded) {
      name = _decodeURI(name);
    }
    keyIndex = nextKeyIndex;
    if (name === "") {
      continue;
    }
    let value;
    if (valueIndex === -1) {
      value = "";
    } else {
      value = url2.slice(valueIndex + 1, nextKeyIndex === -1 ? void 0 : nextKeyIndex);
      if (encoded) {
        value = _decodeURI(value);
      }
    }
    if (multiple) {
      if (!(results[name] && Array.isArray(results[name]))) {
        results[name] = [];
      }
      ;
      results[name].push(value);
    } else {
      results[name] ??= value;
    }
  }
  return key ? results[key] : results;
}, "_getQueryParam");
var getQueryParam = _getQueryParam;
var getQueryParams = /* @__PURE__ */ __name((url2, key) => {
  return _getQueryParam(url2, key, true);
}, "getQueryParams");
var decodeURIComponent_ = decodeURIComponent;

// node_modules/hono/dist/request.js
var HonoRequest = class {
  static {
    __name(this, "HonoRequest");
  }
  /**
   * `.raw` can get the raw Request object.
   *
   * @see {@link https://hono.dev/docs/api/request#raw}
   *
   * @example
   * ```ts
   * // For Cloudflare Workers
   * app.post('/', async (c) => {
   *   const metadata = c.req.raw.cf?.hostMetadata?
   *   ...
   * })
   * ```
   */
  raw;
  #validatedData;
  // Short name of validatedData
  #matchResult;
  routeIndex = 0;
  /**
   * `.path` can get the pathname of the request.
   *
   * @see {@link https://hono.dev/docs/api/request#path}
   *
   * @example
   * ```ts
   * app.get('/about/me', (c) => {
   *   const pathname = c.req.path // `/about/me`
   * })
   * ```
   */
  path;
  bodyCache = {};
  constructor(request, path = "/", matchResult = [[]]) {
    this.raw = request;
    this.path = path;
    this.#matchResult = matchResult;
  }
  param(key) {
    return key ? this.#getDecodedParam(key) : this.#getAllDecodedParams();
  }
  #getDecodedParam(key) {
    const paramKey = this.#matchResult[0][this.routeIndex][1][key];
    const param = this.#getParamValue(paramKey);
    return param && tryDecodeURIComponent(param);
  }
  #getAllDecodedParams() {
    const decoded = {};
    const keys2 = Object.keys(this.#matchResult[0][this.routeIndex][1]);
    for (const key of keys2) {
      const value = this.#getParamValue(this.#matchResult[0][this.routeIndex][1][key]);
      if (value !== void 0) {
        decoded[key] = tryDecodeURIComponent(value);
      }
    }
    return decoded;
  }
  #getParamValue(paramKey) {
    return this.#matchResult[1] ? this.#matchResult[1][paramKey] : paramKey;
  }
  query(key) {
    return getQueryParam(this.url, key);
  }
  queries(key) {
    return getQueryParams(this.url, key);
  }
  header(name) {
    if (name) {
      return this.raw.headers.get(name) ?? void 0;
    }
    const headerData = /* @__PURE__ */ Object.create(null);
    this.raw.headers.forEach((value, key) => {
      headerData[key] = value;
    });
    return headerData;
  }
  async parseBody(options) {
    return parseBody(this, options);
  }
  #cachedBody = /* @__PURE__ */ __name((key) => {
    const { bodyCache, raw: raw2 } = this;
    const cachedBody = bodyCache[key];
    if (cachedBody) {
      return cachedBody;
    }
    for (const anyCachedKey in bodyCache) {
      return bodyCache[anyCachedKey].then((body) => {
        if (anyCachedKey === "json") {
          body = JSON.stringify(body);
        }
        return new Response(body)[key]();
      });
    }
    return bodyCache[key] = raw2[key]();
  }, "#cachedBody");
  /**
   * `.json()` can parse Request body of type `application/json`
   *
   * @see {@link https://hono.dev/docs/api/request#json}
   *
   * @example
   * ```ts
   * app.post('/entry', async (c) => {
   *   const body = await c.req.json()
   * })
   * ```
   */
  json() {
    return this.#cachedBody("text").then((text2) => JSON.parse(text2));
  }
  /**
   * `.text()` can parse Request body of type `text/plain`
   *
   * @see {@link https://hono.dev/docs/api/request#text}
   *
   * @example
   * ```ts
   * app.post('/entry', async (c) => {
   *   const body = await c.req.text()
   * })
   * ```
   */
  text() {
    return this.#cachedBody("text");
  }
  /**
   * `.arrayBuffer()` parse Request body as an `ArrayBuffer`
   *
   * @see {@link https://hono.dev/docs/api/request#arraybuffer}
   *
   * @example
   * ```ts
   * app.post('/entry', async (c) => {
   *   const body = await c.req.arrayBuffer()
   * })
   * ```
   */
  arrayBuffer() {
    return this.#cachedBody("arrayBuffer");
  }
  /**
   * `.bytes()` parses the request body as a `Uint8Array`.
   *
   * @see {@link https://hono.dev/docs/api/request#bytes}
   *
   * @example
   * ```ts
   * app.post('/entry', async (c) => {
   *   const body = await c.req.bytes()
   * })
   * ```
   */
  bytes() {
    return this.#cachedBody("arrayBuffer").then((buffer) => new Uint8Array(buffer));
  }
  /**
   * Parses the request body as a `Blob`.
   * @example
   * ```ts
   * app.post('/entry', async (c) => {
   *   const body = await c.req.blob();
   * });
   * ```
   * @see https://hono.dev/docs/api/request#blob
   */
  blob() {
    return this.#cachedBody("blob");
  }
  /**
   * Parses the request body as `FormData`.
   * @example
   * ```ts
   * app.post('/entry', async (c) => {
   *   const body = await c.req.formData();
   * });
   * ```
   * @see https://hono.dev/docs/api/request#formdata
   */
  formData() {
    return this.#cachedBody("formData");
  }
  /**
   * Adds validated data to the request.
   *
   * @param target - The target of the validation.
   * @param data - The validated data to add.
   */
  addValidatedData(target, data) {
    ;
    (this.#validatedData ??= {})[target] = data;
  }
  valid(target) {
    return this.#validatedData?.[target];
  }
  /**
   * `.url()` can get the request url strings.
   *
   * @see {@link https://hono.dev/docs/api/request#url}
   *
   * @example
   * ```ts
   * app.get('/about/me', (c) => {
   *   const url = c.req.url // `http://localhost:8787/about/me`
   *   ...
   * })
   * ```
   */
  get url() {
    return this.raw.url;
  }
  /**
   * `.method()` can get the method name of the request.
   *
   * @see {@link https://hono.dev/docs/api/request#method}
   *
   * @example
   * ```ts
   * app.get('/about/me', (c) => {
   *   const method = c.req.method // `GET`
   * })
   * ```
   */
  get method() {
    return this.raw.method;
  }
  get [GET_MATCH_RESULT]() {
    return this.#matchResult;
  }
  /**
   * `.matchedRoutes()` can return a matched route in the handler
   *
   * @deprecated
   *
   * Use matchedRoutes helper defined in "hono/route" instead.
   *
   * @see {@link https://hono.dev/docs/api/request#matchedroutes}
   *
   * @example
   * ```ts
   * app.use('*', async function logger(c, next) {
   *   await next()
   *   c.req.matchedRoutes.forEach(({ handler, method, path }, i) => {
   *     const name = handler.name || (handler.length < 2 ? '[handler]' : '[middleware]')
   *     console.log(
   *       method,
   *       ' ',
   *       path,
   *       ' '.repeat(Math.max(10 - path.length, 0)),
   *       name,
   *       i === c.req.routeIndex ? '<- respond from here' : ''
   *     )
   *   })
   * })
   * ```
   */
  get matchedRoutes() {
    return this.#matchResult[0].map(([[, route]]) => route);
  }
  /**
   * `routePath()` can retrieve the path registered within the handler
   *
   * @deprecated
   *
   * Use routePath helper defined in "hono/route" instead.
   *
   * @see {@link https://hono.dev/docs/api/request#routepath}
   *
   * @example
   * ```ts
   * app.get('/posts/:id', (c) => {
   *   return c.json({ path: c.req.routePath })
   * })
   * ```
   */
  get routePath() {
    return this.#matchResult[0].map(([[, route]]) => route)[this.routeIndex].path;
  }
};

// node_modules/hono/dist/utils/html.js
var HtmlEscapedCallbackPhase = {
  Stringify: 1,
  BeforeStream: 2,
  Stream: 3
};
var raw = /* @__PURE__ */ __name((value, callbacks) => {
  const escapedString = new String(value);
  escapedString.isEscaped = true;
  escapedString.callbacks = callbacks;
  return escapedString;
}, "raw");
var resolveCallback = /* @__PURE__ */ __name(async (str, phase, preserveCallbacks, context, buffer) => {
  if (typeof str === "object" && !(str instanceof String)) {
    if (!(str instanceof Promise)) {
      str = str.toString();
    }
    if (str instanceof Promise) {
      str = await str;
    }
  }
  const callbacks = str.callbacks;
  if (!callbacks?.length) {
    return Promise.resolve(str);
  }
  if (buffer) {
    buffer[0] += str;
  } else {
    buffer = [str];
  }
  const resStr = Promise.all(callbacks.map((c) => c({ phase, buffer, context }))).then(
    (res) => Promise.all(
      res.filter(Boolean).map((str2) => resolveCallback(str2, phase, false, context, buffer))
    ).then(() => buffer[0])
  );
  if (preserveCallbacks) {
    return raw(await resStr, callbacks);
  } else {
    return resStr;
  }
}, "resolveCallback");

// node_modules/hono/dist/context.js
var TEXT_PLAIN = "text/plain; charset=UTF-8";
var setDefaultContentType = /* @__PURE__ */ __name((contentType, headers) => {
  return {
    "Content-Type": contentType,
    ...headers
  };
}, "setDefaultContentType");
var createResponseInstance = /* @__PURE__ */ __name((body, init) => new Response(body, init), "createResponseInstance");
var Context = class {
  static {
    __name(this, "Context");
  }
  #rawRequest;
  #req;
  /**
   * `.env` can get bindings (environment variables, secrets, KV namespaces, D1 database, R2 bucket etc.) in Cloudflare Workers.
   *
   * @see {@link https://hono.dev/docs/api/context#env}
   *
   * @example
   * ```ts
   * // Environment object for Cloudflare Workers
   * app.get('*', async c => {
   *   const counter = c.env.COUNTER
   * })
   * ```
   */
  env = {};
  #var;
  finalized = false;
  /**
   * `.error` can get the error object from the middleware if the Handler throws an error.
   *
   * @see {@link https://hono.dev/docs/api/context#error}
   *
   * @example
   * ```ts
   * app.use('*', async (c, next) => {
   *   await next()
   *   if (c.error) {
   *     // do something...
   *   }
   * })
   * ```
   */
  error;
  #status;
  #executionCtx;
  #res;
  #layout;
  #renderer;
  #notFoundHandler;
  #preparedHeaders;
  #matchResult;
  #path;
  /**
   * Creates an instance of the Context class.
   *
   * @param req - The Request object.
   * @param options - Optional configuration options for the context.
   */
  constructor(req, options) {
    this.#rawRequest = req;
    if (options) {
      this.#executionCtx = options.executionCtx;
      this.env = options.env;
      this.#notFoundHandler = options.notFoundHandler;
      this.#path = options.path;
      this.#matchResult = options.matchResult;
    }
  }
  /**
   * `.req` is the instance of {@link HonoRequest}.
   */
  get req() {
    this.#req ??= new HonoRequest(this.#rawRequest, this.#path, this.#matchResult);
    return this.#req;
  }
  /**
   * @see {@link https://hono.dev/docs/api/context#event}
   * The FetchEvent associated with the current request.
   *
   * @throws Will throw an error if the context does not have a FetchEvent.
   */
  get event() {
    if (this.#executionCtx && "respondWith" in this.#executionCtx) {
      return this.#executionCtx;
    } else {
      throw Error("This context has no FetchEvent");
    }
  }
  /**
   * @see {@link https://hono.dev/docs/api/context#executionctx}
   * The ExecutionContext associated with the current request.
   *
   * @throws Will throw an error if the context does not have an ExecutionContext.
   */
  get executionCtx() {
    if (this.#executionCtx) {
      return this.#executionCtx;
    } else {
      throw Error("This context has no ExecutionContext");
    }
  }
  /**
   * @see {@link https://hono.dev/docs/api/context#res}
   * The Response object for the current request.
   */
  get res() {
    return this.#res ||= createResponseInstance(null, {
      headers: this.#preparedHeaders ??= new Headers()
    });
  }
  /**
   * Sets the Response object for the current request.
   *
   * @param _res - The Response object to set.
   */
  set res(_res) {
    if (this.#res && _res) {
      _res = createResponseInstance(_res.body, _res);
      for (const [k, v] of this.#res.headers.entries()) {
        if (k === "content-type") {
          continue;
        }
        if (k === "set-cookie") {
          const cookies = this.#res.headers.getSetCookie();
          _res.headers.delete("set-cookie");
          for (const cookie of cookies) {
            _res.headers.append("set-cookie", cookie);
          }
        } else {
          _res.headers.set(k, v);
        }
      }
    }
    this.#res = _res;
    this.finalized = true;
  }
  /**
   * `.render()` can create a response within a layout.
   *
   * @see {@link https://hono.dev/docs/api/context#render-setrenderer}
   *
   * @example
   * ```ts
   * app.get('/', (c) => {
   *   return c.render('Hello!')
   * })
   * ```
   */
  render = /* @__PURE__ */ __name((...args) => {
    this.#renderer ??= (content) => this.html(content);
    return this.#renderer(...args);
  }, "render");
  /**
   * Sets the layout for the response.
   *
   * @param layout - The layout to set.
   * @returns The layout function.
   */
  setLayout = /* @__PURE__ */ __name((layout) => this.#layout = layout, "setLayout");
  /**
   * Gets the current layout for the response.
   *
   * @returns The current layout function.
   */
  getLayout = /* @__PURE__ */ __name(() => this.#layout, "getLayout");
  /**
   * `.setRenderer()` can set the layout in the custom middleware.
   *
   * @see {@link https://hono.dev/docs/api/context#render-setrenderer}
   *
   * @example
   * ```tsx
   * app.use('*', async (c, next) => {
   *   c.setRenderer((content) => {
   *     return c.html(
   *       <html>
   *         <body>
   *           <p>{content}</p>
   *         </body>
   *       </html>
   *     )
   *   })
   *   await next()
   * })
   * ```
   */
  setRenderer = /* @__PURE__ */ __name((renderer) => {
    this.#renderer = renderer;
  }, "setRenderer");
  /**
   * `.header()` can set headers.
   *
   * @see {@link https://hono.dev/docs/api/context#header}
   *
   * @example
   * ```ts
   * app.get('/welcome', (c) => {
   *   // Set headers
   *   c.header('X-Message', 'Hello!')
   *   c.header('Content-Type', 'text/plain')
   *
   *   // Append multiple headers using the append option (e.g. Vary)
   *   c.header('Vary', 'Accept-Encoding', { append: true })
   *   c.header('Vary', 'User-Agent', { append: true })
   *
   *   return c.body('Thank you for coming')
   * })
   * ```
   */
  header = /* @__PURE__ */ __name((name, value, options) => {
    if (this.finalized) {
      this.#res = createResponseInstance(this.#res.body, this.#res);
    }
    const headers = this.#res ? this.#res.headers : this.#preparedHeaders ??= new Headers();
    if (value === void 0) {
      headers.delete(name);
    } else if (options?.append) {
      headers.append(name, value);
    } else {
      headers.set(name, value);
    }
  }, "header");
  status = /* @__PURE__ */ __name((status) => {
    this.#status = status;
  }, "status");
  /**
   * `.set()` can set the value specified by the key.
   *
   * @see {@link https://hono.dev/docs/api/context#set-get}
   *
   * @example
   * ```ts
   * app.use('*', async (c, next) => {
   *   c.set('message', 'Hono is hot!!')
   *   await next()
   * })
   * ```
   */
  set = /* @__PURE__ */ __name((key, value) => {
    this.#var ??= /* @__PURE__ */ new Map();
    this.#var.set(key, value);
  }, "set");
  /**
   * `.get()` can use the value specified by the key.
   *
   * @see {@link https://hono.dev/docs/api/context#set-get}
   *
   * @example
   * ```ts
   * app.get('/', (c) => {
   *   const message = c.get('message')
   *   return c.text(`The message is "${message}"`)
   * })
   * ```
   */
  get = /* @__PURE__ */ __name((key) => {
    return this.#var ? this.#var.get(key) : void 0;
  }, "get");
  /**
   * `.var` can access the value of a variable.
   *
   * @see {@link https://hono.dev/docs/api/context#var}
   *
   * @example
   * ```ts
   * const result = c.var.client.oneMethod()
   * ```
   */
  // c.var.propName is a read-only
  get var() {
    if (!this.#var) {
      return {};
    }
    return Object.fromEntries(this.#var);
  }
  #newResponse(data, arg, headers) {
    let responseHeaders = this.#res ? new Headers(this.#res.headers) : this.#preparedHeaders;
    if (typeof arg === "object" && arg.headers) {
      responseHeaders ??= new Headers();
      for (const [key, value] of new Headers(arg.headers)) {
        if (key === "set-cookie") {
          responseHeaders.append(key, value);
        } else {
          responseHeaders.set(key, value);
        }
      }
    }
    if (headers) {
      if (!responseHeaders) {
        let count = 0;
        for (const k in headers) {
          if (++count > 1 || typeof headers[k] !== "string") {
            responseHeaders = new Headers();
            break;
          }
        }
      }
      if (responseHeaders) {
        for (const k in headers) {
          const v = headers[k];
          if (typeof v === "string") {
            responseHeaders.set(k, v);
          } else {
            responseHeaders.delete(k);
            for (const v2 of v) {
              responseHeaders.append(k, v2);
            }
          }
        }
      }
    }
    const status = typeof arg === "number" ? arg : arg?.status ?? this.#status;
    return createResponseInstance(data, {
      status,
      headers: responseHeaders ?? headers
    });
  }
  newResponse = /* @__PURE__ */ __name((...args) => this.#newResponse(...args), "newResponse");
  /**
   * `.body()` can return the HTTP response.
   * You can set headers with `.header()` and set HTTP status code with `.status`.
   * This can also be set in `.text()`, `.json()` and so on.
   *
   * @see {@link https://hono.dev/docs/api/context#body}
   *
   * @example
   * ```ts
   * app.get('/welcome', (c) => {
   *   // Set headers
   *   c.header('X-Message', 'Hello!')
   *   c.header('Content-Type', 'text/plain')
   *   // Set HTTP status code
   *   c.status(201)
   *
   *   // Return the response body
   *   return c.body('Thank you for coming')
   * })
   * ```
   */
  body = /* @__PURE__ */ __name((data, arg, headers) => this.#newResponse(data, arg, headers), "body");
  /**
   * `.text()` can render text as `Content-Type:text/plain`.
   *
   * @see {@link https://hono.dev/docs/api/context#text}
   *
   * @example
   * ```ts
   * app.get('/say', (c) => {
   *   return c.text('Hello!')
   * })
   * ```
   */
  text = /* @__PURE__ */ __name((text2, arg, headers) => {
    return !this.#preparedHeaders && !this.#status && !arg && !headers && !this.finalized ? new Response(text2) : this.#newResponse(
      text2,
      arg,
      setDefaultContentType(TEXT_PLAIN, headers)
    );
  }, "text");
  /**
   * `.json()` can render JSON as `Content-Type:application/json`.
   *
   * @see {@link https://hono.dev/docs/api/context#json}
   *
   * @example
   * ```ts
   * app.get('/api', (c) => {
   *   return c.json({ message: 'Hello!' })
   * })
   * ```
   */
  json = /* @__PURE__ */ __name((object, arg, headers) => {
    return this.#newResponse(
      JSON.stringify(object),
      arg,
      setDefaultContentType("application/json", headers)
    );
  }, "json");
  html = /* @__PURE__ */ __name((html, arg, headers) => {
    const res = /* @__PURE__ */ __name((html2) => this.#newResponse(html2, arg, setDefaultContentType("text/html; charset=UTF-8", headers)), "res");
    return typeof html === "object" ? resolveCallback(html, HtmlEscapedCallbackPhase.Stringify, false, {}).then(res) : res(html);
  }, "html");
  /**
   * `.redirect()` can Redirect, default status code is 302.
   *
   * @see {@link https://hono.dev/docs/api/context#redirect}
   *
   * @example
   * ```ts
   * app.get('/redirect', (c) => {
   *   return c.redirect('/')
   * })
   * app.get('/redirect-permanently', (c) => {
   *   return c.redirect('/', 301)
   * })
   * ```
   */
  redirect = /* @__PURE__ */ __name((location, status) => {
    const locationString = String(location);
    this.header(
      "Location",
      // Multibyes should be encoded
      // eslint-disable-next-line no-control-regex
      !/[^\x00-\xFF]/.test(locationString) ? locationString : encodeURI(locationString)
    );
    return this.newResponse(null, status ?? 302);
  }, "redirect");
  /**
   * `.notFound()` can return the Not Found Response.
   *
   * @see {@link https://hono.dev/docs/api/context#notfound}
   *
   * @example
   * ```ts
   * app.get('/notfound', (c) => {
   *   return c.notFound()
   * })
   * ```
   */
  notFound = /* @__PURE__ */ __name(() => {
    this.#notFoundHandler ??= () => createResponseInstance();
    return this.#notFoundHandler(this);
  }, "notFound");
};

// node_modules/hono/dist/router.js
var METHOD_NAME_ALL = "ALL";
var METHOD_NAME_ALL_LOWERCASE = "all";
var METHODS = ["get", "post", "put", "delete", "options", "patch", "query"];
var MESSAGE_MATCHER_IS_ALREADY_BUILT = "Can not add a route since the matcher is already built.";
var UnsupportedPathError = class extends Error {
  static {
    __name(this, "UnsupportedPathError");
  }
};

// node_modules/hono/dist/utils/constants.js
var COMPOSED_HANDLER = "__COMPOSED_HANDLER";

// node_modules/hono/dist/hono-base.js
var notFoundHandler = /* @__PURE__ */ __name((c) => {
  return c.text("404 Not Found", 404);
}, "notFoundHandler");
var errorHandler = /* @__PURE__ */ __name((err, c) => {
  if ("getResponse" in err) {
    const res = err.getResponse();
    return c.newResponse(res.body, res);
  }
  console.error(err);
  return c.text("Internal Server Error", 500);
}, "errorHandler");
var Hono = class _Hono {
  static {
    __name(this, "_Hono");
  }
  get;
  post;
  put;
  delete;
  options;
  patch;
  query;
  all;
  on;
  use;
  /*
    This class is like an abstract class and does not have a router.
    To use it, inherit the class and implement router in the constructor.
  */
  router;
  getPath;
  // Cannot use `#` because it requires visibility at JavaScript runtime.
  _basePath = "/";
  #path = "/";
  routes = [];
  constructor(options = {}) {
    const allMethods = [...METHODS, METHOD_NAME_ALL_LOWERCASE];
    allMethods.forEach((method) => {
      this[method] = (args1, ...args) => {
        if (typeof args1 === "string") {
          this.#path = args1;
        } else {
          this.#addRoute(method, this.#path, args1);
        }
        args.forEach((handler) => {
          this.#addRoute(method, this.#path, handler);
        });
        return this;
      };
    });
    this.on = (method, path, ...handlers) => {
      for (const p of [path].flat()) {
        this.#path = p;
        for (const m of [method].flat()) {
          handlers.map((handler) => {
            this.#addRoute(m.toUpperCase(), this.#path, handler);
          });
        }
      }
      return this;
    };
    this.use = (arg1, ...handlers) => {
      if (typeof arg1 === "string") {
        this.#path = arg1;
      } else {
        this.#path = "*";
        handlers.unshift(arg1);
      }
      handlers.forEach((handler) => {
        this.#addRoute(METHOD_NAME_ALL, this.#path, handler);
      });
      return this;
    };
    const { strict, ...optionsWithoutStrict } = options;
    Object.assign(this, optionsWithoutStrict);
    this.getPath = strict ?? true ? options.getPath ?? getPath : getPathNoStrict;
  }
  #clone() {
    const clone = new _Hono({
      router: this.router,
      getPath: this.getPath
    });
    clone.errorHandler = this.errorHandler;
    clone.#notFoundHandler = this.#notFoundHandler;
    clone.routes = this.routes;
    return clone;
  }
  #notFoundHandler = notFoundHandler;
  // Cannot use `#` because it requires visibility at JavaScript runtime.
  errorHandler = errorHandler;
  /**
   * `.route()` allows grouping other Hono instance in routes.
   *
   * @see {@link https://hono.dev/docs/api/routing#grouping}
   *
   * @param {string} path - base Path
   * @param {Hono} app - other Hono instance
   * @returns {Hono} routed Hono instance
   *
   * @example
   * ```ts
   * const app = new Hono()
   * const app2 = new Hono()
   *
   * app2.get("/user", (c) => c.text("user"))
   * app.route("/api", app2) // GET /api/user
   * ```
   */
  route(path, app2) {
    const subApp = this.basePath(path);
    app2.routes.map((r) => {
      let handler;
      if (app2.errorHandler === errorHandler) {
        handler = r.handler;
      } else {
        handler = /* @__PURE__ */ __name(async (c, next) => (await compose([], app2.errorHandler)(c, () => r.handler(c, next))).res, "handler");
        handler[COMPOSED_HANDLER] = r.handler;
      }
      subApp.#addRoute(r.method, r.path, handler, r.basePath);
    });
    return this;
  }
  /**
   * `.basePath()` allows base paths to be specified.
   *
   * @see {@link https://hono.dev/docs/api/routing#base-path}
   *
   * @param {string} path - base Path
   * @returns {Hono} changed Hono instance
   *
   * @example
   * ```ts
   * const api = new Hono().basePath('/api')
   * ```
   */
  basePath(path) {
    const subApp = this.#clone();
    subApp._basePath = mergePath(this._basePath, path);
    return subApp;
  }
  /**
   * `.onError()` handles an error and returns a customized Response.
   *
   * @see {@link https://hono.dev/docs/api/hono#error-handling}
   *
   * @param {ErrorHandler} handler - request Handler for error
   * @returns {Hono} changed Hono instance
   *
   * @example
   * ```ts
   * app.onError((err, c) => {
   *   console.error(`${err}`)
   *   return c.text('Custom Error Message', 500)
   * })
   * ```
   */
  onError = /* @__PURE__ */ __name((handler) => {
    this.errorHandler = handler;
    return this;
  }, "onError");
  /**
   * `.notFound()` allows you to customize a Not Found Response.
   *
   * @see {@link https://hono.dev/docs/api/hono#not-found}
   *
   * @param {NotFoundHandler} handler - request handler for not-found
   * @returns {Hono} changed Hono instance
   *
   * @example
   * ```ts
   * app.notFound((c) => {
   *   return c.text('Custom 404 Message', 404)
   * })
   * ```
   */
  notFound = /* @__PURE__ */ __name((handler) => {
    this.#notFoundHandler = handler;
    return this;
  }, "notFound");
  /**
   * `.mount()` allows you to mount applications built with other frameworks into your Hono application.
   *
   * @see {@link https://hono.dev/docs/api/hono#mount}
   *
   * @param {string} path - base Path
   * @param {Function} applicationHandler - other Request Handler
   * @param {MountOptions} [options] - options of `.mount()`
   * @returns {Hono} mounted Hono instance
   *
   * @example
   * ```ts
   * import { Router as IttyRouter } from 'itty-router'
   * import { Hono } from 'hono'
   * // Create itty-router application
   * const ittyRouter = IttyRouter()
   * // GET /itty-router/hello
   * ittyRouter.get('/hello', () => new Response('Hello from itty-router'))
   *
   * const app = new Hono()
   * app.mount('/itty-router', ittyRouter.handle)
   * ```
   *
   * @example
   * ```ts
   * const app = new Hono()
   * // Send the request to another application without modification.
   * app.mount('/app', anotherApp, {
   *   replaceRequest: (req) => req,
   * })
   * ```
   */
  mount(path, applicationHandler, options) {
    let replaceRequest;
    let optionHandler;
    if (options) {
      if (typeof options === "function") {
        optionHandler = options;
      } else {
        optionHandler = options.optionHandler;
        if (options.replaceRequest === false) {
          replaceRequest = /* @__PURE__ */ __name((request) => request, "replaceRequest");
        } else {
          replaceRequest = options.replaceRequest;
        }
      }
    }
    const getOptions = optionHandler ? (c) => {
      const options2 = optionHandler(c);
      return Array.isArray(options2) ? options2 : [options2];
    } : (c) => {
      let executionContext = void 0;
      try {
        executionContext = c.executionCtx;
      } catch {
      }
      return [c.env, executionContext];
    };
    replaceRequest ||= (() => {
      const mergedPath = mergePath(this._basePath, path);
      const pathPrefixLength = mergedPath === "/" ? 0 : mergedPath.length;
      return (request) => {
        const url2 = new URL(request.url);
        url2.pathname = this.getPath(request).slice(pathPrefixLength) || "/";
        return new Request(url2, request);
      };
    })();
    const handler = /* @__PURE__ */ __name(async (c, next) => {
      const res = await applicationHandler(replaceRequest(c.req.raw), ...getOptions(c));
      if (res) {
        return res;
      }
      await next();
    }, "handler");
    this.#addRoute(METHOD_NAME_ALL, mergePath(path, "*"), handler);
    return this;
  }
  #addRoute(method, path, handler, baseRoutePath) {
    method = method.toUpperCase();
    path = mergePath(this._basePath, path);
    const r = {
      basePath: baseRoutePath !== void 0 ? mergePath(this._basePath, baseRoutePath) : this._basePath,
      path,
      method,
      handler
    };
    this.router.add(method, path, [handler, r]);
    this.routes.push(r);
  }
  #handleError(err, c) {
    if (err instanceof Error) {
      return this.errorHandler(err, c);
    }
    throw err;
  }
  #dispatch(request, executionCtx, env, method) {
    if (method === "HEAD") {
      return (async () => new Response(null, await this.#dispatch(request, executionCtx, env, "GET")))();
    }
    const path = this.getPath(request, { env });
    const matchResult = this.router.match(method, path);
    const c = new Context(request, {
      path,
      matchResult,
      env,
      executionCtx,
      notFoundHandler: this.#notFoundHandler
    });
    if (matchResult[0].length === 1) {
      let res;
      try {
        res = matchResult[0][0][0][0](c, async () => {
          c.res = await this.#notFoundHandler(c);
        });
      } catch (err) {
        return this.#handleError(err, c);
      }
      return res instanceof Promise ? res.then(
        (resolved) => resolved || (c.finalized ? c.res : this.#notFoundHandler(c))
      ).catch((err) => this.#handleError(err, c)) : res ?? this.#notFoundHandler(c);
    }
    const composed = compose(matchResult[0], this.errorHandler, this.#notFoundHandler);
    return (async () => {
      try {
        const context = await composed(c);
        if (!context.finalized) {
          throw new Error(
            "Context is not finalized. Did you forget to return a Response object or `await next()`?"
          );
        }
        return context.res;
      } catch (err) {
        return this.#handleError(err, c);
      }
    })();
  }
  /**
   * `.fetch()` will be entry point of your app.
   *
   * @see {@link https://hono.dev/docs/api/hono#fetch}
   *
   * @param {Request} request - request Object of request
   * @param {Env} env - env Object
   * @param {ExecutionContext} executionCtx - context of execution
   * @returns {Response | Promise<Response>} response of request
   *
   */
  fetch = /* @__PURE__ */ __name((request, ...rest) => {
    return this.#dispatch(request, rest[1], rest[0], request.method);
  }, "fetch");
  /**
   * `.request()` is a useful method for testing.
   * You can pass a URL or pathname to send a GET request.
   * app will return a Response object.
   * ```ts
   * test('GET /hello is ok', async () => {
   *   const res = await app.request('/hello')
   *   expect(res.status).toBe(200)
   * })
   * ```
   * @see https://hono.dev/docs/api/hono#request
   */
  request = /* @__PURE__ */ __name((input, requestInit, Env, executionCtx) => {
    if (input instanceof Request) {
      return this.fetch(requestInit ? new Request(input, requestInit) : input, Env, executionCtx);
    }
    input = input.toString();
    return this.fetch(
      new Request(
        /^https?:\/\//.test(input) ? input : `http://localhost${mergePath("/", input)}`,
        requestInit
      ),
      Env,
      executionCtx
    );
  }, "request");
  /**
   * `.fire()` automatically adds a global fetch event listener.
   * This can be useful for environments that adhere to the Service Worker API, such as non-ES module Cloudflare Workers.
   * @deprecated
   * Use `fire` from `hono/service-worker` instead.
   * ```ts
   * import { Hono } from 'hono'
   * import { fire } from 'hono/service-worker'
   *
   * const app = new Hono()
   * // ...
   * fire(app)
   * ```
   * @see https://hono.dev/docs/api/hono#fire
   * @see https://developer.mozilla.org/en-US/docs/Web/API/Service_Worker_API
   * @see https://developers.cloudflare.com/workers/reference/migrate-to-module-workers/
   */
  fire = /* @__PURE__ */ __name(() => {
    addEventListener("fetch", (event) => {
      event.respondWith(this.#dispatch(event.request, event, void 0, event.request.method));
    });
  }, "fire");
};

// node_modules/hono/dist/router/reg-exp-router/matcher.js
var emptyParam = [];
function match(method, path) {
  const matchers = this.buildAllMatchers();
  const match2 = /* @__PURE__ */ __name(((method2, path2) => {
    const matcher = matchers[method2] || matchers[METHOD_NAME_ALL];
    const staticMatch = matcher[2][path2];
    if (staticMatch) {
      return staticMatch;
    }
    const match3 = path2.match(matcher[0]);
    if (!match3) {
      return [[], emptyParam];
    }
    const index = match3.indexOf("", 1);
    return [matcher[1][index], match3];
  }), "match2");
  this.match = match2;
  return match2(method, path);
}
__name(match, "match");

// node_modules/hono/dist/router/reg-exp-router/node.js
var LABEL_REG_EXP_STR = "[^/]+";
var ONLY_WILDCARD_REG_EXP_STR = ".*";
var TAIL_WILDCARD_REG_EXP_STR = "(?:|/.*)";
var PATH_ERROR = /* @__PURE__ */ Symbol();
var regExpMetaChars = new Set(".\\+*[^]$()");
function compareKey(a, b) {
  if (a.length === 1) {
    return b.length === 1 ? a < b ? -1 : 1 : -1;
  }
  if (b.length === 1) {
    return 1;
  }
  if (a === ONLY_WILDCARD_REG_EXP_STR || a === TAIL_WILDCARD_REG_EXP_STR) {
    return b === TAIL_WILDCARD_REG_EXP_STR ? -1 : 1;
  } else if (b === ONLY_WILDCARD_REG_EXP_STR || b === TAIL_WILDCARD_REG_EXP_STR) {
    return -1;
  }
  if (a === LABEL_REG_EXP_STR) {
    return 1;
  } else if (b === LABEL_REG_EXP_STR) {
    return -1;
  }
  return a.length === b.length ? a < b ? -1 : 1 : b.length - a.length;
}
__name(compareKey, "compareKey");
var Node = class _Node {
  static {
    __name(this, "_Node");
  }
  // handler index of a dynamic path, or -1 for a static path terminal
  #index;
  #varIndex;
  #children = /* @__PURE__ */ Object.create(null);
  insert(tokens, index, paramMap, context, isStatic) {
    let node = this;
    for (let i = 0, len = tokens.length; i < len; i++) {
      const token2 = tokens[i];
      const pattern = token2.length === 1 ? token2 === "*" ? i === len - 1 ? ["", "", ONLY_WILDCARD_REG_EXP_STR] : ["", "", LABEL_REG_EXP_STR] : null : token2 === "/*" ? ["", "", TAIL_WILDCARD_REG_EXP_STR] : token2.match(/^\:([^\{\}]+)(?:\{(.+)\})?$/);
      let nextNode;
      if (pattern) {
        const name = pattern[1];
        let regexpStr = pattern[2] || LABEL_REG_EXP_STR;
        if (name && pattern[2]) {
          if (regexpStr === ".*") {
            throw PATH_ERROR;
          }
          regexpStr = regexpStr.replace(/^\((?!\?:)(?=[^)]+\)$)/, "(?:");
          if (/\((?!\?:)/.test(regexpStr)) {
            throw PATH_ERROR;
          }
          if (regexpStr.length === 1 && regExpMetaChars.has(regexpStr)) {
            throw PATH_ERROR;
          }
        }
        nextNode = node.#children[regexpStr];
        if (!nextNode) {
          if (regexpStr !== ONLY_WILDCARD_REG_EXP_STR && regexpStr !== TAIL_WILDCARD_REG_EXP_STR) {
            for (const k in node.#children) {
              if (
                // a single-char pattern coexists with single-char literals as a literal does
                (regexpStr.length > 1 || k.length > 1) && k !== ONLY_WILDCARD_REG_EXP_STR && k !== TAIL_WILDCARD_REG_EXP_STR
              ) {
                throw PATH_ERROR;
              }
            }
          }
          nextNode = node.#children[regexpStr] = new _Node();
        }
        if (name !== "") {
          nextNode.#varIndex ??= context.varIndex++;
          paramMap.push([name, nextNode.#varIndex]);
        }
      } else {
        nextNode = node.#children[token2];
        if (!nextNode) {
          for (const k in node.#children) {
            if (k.length > 1 && k !== ONLY_WILDCARD_REG_EXP_STR && k !== TAIL_WILDCARD_REG_EXP_STR) {
              throw PATH_ERROR;
            }
          }
          nextNode = node.#children[token2] = new _Node();
        }
      }
      node = nextNode;
    }
    if (node.#index !== void 0) {
      throw PATH_ERROR;
    }
    node.#index = isStatic ? -1 : index;
  }
  buildRegExpStr() {
    const childKeys = Object.keys(this.#children).sort(compareKey);
    const strList = childKeys.map((k) => {
      const c = this.#children[k];
      const childStr = c.buildRegExpStr();
      return childStr === "" ? "" : (typeof c.#varIndex === "number" ? `(${k})@${c.#varIndex}` : regExpMetaChars.has(k) ? `\\${k}` : k) + childStr;
    }).filter(Boolean);
    if (typeof this.#index === "number" && this.#index !== -1) {
      strList.unshift(`#${this.#index}`);
    }
    if (strList.length === 0) {
      return "";
    }
    if (strList.length === 1) {
      return strList[0];
    }
    return "(?:" + strList.join("|") + ")";
  }
};

// node_modules/hono/dist/router/reg-exp-router/trie.js
var Trie = class {
  static {
    __name(this, "Trie");
  }
  #context = { varIndex: 0 };
  #root = new Node();
  #index = 0;
  // dynamic path -> [handler index, param assoc]; static paths are not registered
  paths = /* @__PURE__ */ Object.create(null);
  insert(path, isStatic) {
    if (isStatic) {
      this.#root.insert(path.split(""), 0, [], this.#context, true);
      return;
    }
    const paramAssoc = [];
    const groups = [];
    let markedPath = path;
    for (let i = 0; ; ) {
      let replaced = false;
      markedPath = markedPath.replace(/\{[^}]+\}/g, (m) => {
        const mark = `@\\${i}`;
        groups[i] = [mark, m];
        i++;
        replaced = true;
        return mark;
      });
      if (!replaced) {
        break;
      }
    }
    const tokens = markedPath.match(/(?::[^\/]+)|(?:\/\*$)|./g) || [];
    for (let i = groups.length - 1; i >= 0; i--) {
      const [mark] = groups[i];
      for (let j = tokens.length - 1; j >= 0; j--) {
        if (tokens[j].indexOf(mark) !== -1) {
          tokens[j] = tokens[j].replace(mark, groups[i][1]);
          break;
        }
      }
    }
    this.#root.insert(tokens, this.#index, paramAssoc, this.#context, false);
    this.paths[path] = [this.#index++, paramAssoc];
  }
  buildRegExp() {
    let regexp = this.#root.buildRegExpStr();
    if (regexp === "") {
      return [/^$/, [], []];
    }
    let captureIndex = 0;
    const indexReplacementMap = [];
    const paramReplacementMap = [];
    regexp = regexp.replace(/#(\d+)|@(\d+)|\.\*\$/g, (_, handlerIndex, paramIndex) => {
      if (handlerIndex !== void 0) {
        indexReplacementMap[++captureIndex] = Number(handlerIndex);
        return "$()";
      }
      if (paramIndex !== void 0) {
        paramReplacementMap[Number(paramIndex)] = ++captureIndex;
        return "";
      }
      return "";
    });
    return [new RegExp(`^${regexp}`), indexReplacementMap, paramReplacementMap];
  }
};

// node_modules/hono/dist/router/reg-exp-router/router.js
var wildcardRegExpCache = /* @__PURE__ */ Object.create(null);
function buildWildcardRegExp(path) {
  return wildcardRegExpCache[path] ??= new RegExp(
    path === "*" ? "" : `^${path.replace(
      /\/\*$|([.\\+*[^\]$()])/g,
      (_, metaChar) => metaChar ? `\\${metaChar}` : "(?:|/.*)"
    )}$`
  );
}
__name(buildWildcardRegExp, "buildWildcardRegExp");
function clearWildcardRegExpCache() {
  wildcardRegExpCache = /* @__PURE__ */ Object.create(null);
}
__name(clearWildcardRegExpCache, "clearWildcardRegExpCache");
function findMiddleware(middleware, path) {
  if (!middleware) {
    return void 0;
  }
  for (const k of Object.keys(middleware).sort((a, b) => b.length - a.length)) {
    if (buildWildcardRegExp(k).test(path)) {
      return [...middleware[k]];
    }
  }
  return void 0;
}
__name(findMiddleware, "findMiddleware");
var RegExpRouter = class {
  static {
    __name(this, "RegExpRouter");
  }
  name = "RegExpRouter";
  #middleware;
  #routes;
  #tries;
  constructor() {
    this.#middleware = { [METHOD_NAME_ALL]: /* @__PURE__ */ Object.create(null) };
    this.#routes = { [METHOD_NAME_ALL]: /* @__PURE__ */ Object.create(null) };
    this.#tries = { [METHOD_NAME_ALL]: new Trie() };
  }
  #insertPath(method, path) {
    try {
      this.#tries[method].insert(path, !/\*|\/:/.test(path));
    } catch (e) {
      throw e === PATH_ERROR ? new UnsupportedPathError(path) : e;
    }
  }
  add(method, path, handler) {
    const middleware = this.#middleware;
    const routes = this.#routes;
    if (!middleware || !routes) {
      throw new Error(MESSAGE_MATCHER_IS_ALREADY_BUILT);
    }
    if (!middleware[method]) {
      this.#tries[method] = new Trie();
      [middleware, routes].forEach((handlerMap) => {
        handlerMap[method] = /* @__PURE__ */ Object.create(null);
        Object.keys(handlerMap[METHOD_NAME_ALL]).forEach((p) => {
          handlerMap[method][p] = [...handlerMap[METHOD_NAME_ALL][p]];
          this.#insertPath(method, p);
        });
      });
    }
    if (path === "/*") {
      path = "*";
    }
    const paramCount = (path.match(/\/:/g) || []).length;
    if (/\*$/.test(path)) {
      const re = buildWildcardRegExp(path);
      Object.keys(middleware).forEach((m) => {
        if ((method === METHOD_NAME_ALL || method === m) && !middleware[m][path]) {
          this.#insertPath(m, path);
          middleware[m][path] = findMiddleware(middleware[m], path) || findMiddleware(middleware[METHOD_NAME_ALL], path) || [];
        }
      });
      Object.keys(middleware).forEach((m) => {
        if (method === METHOD_NAME_ALL || method === m) {
          Object.keys(middleware[m]).forEach((p) => {
            re.test(p) && middleware[m][p].push([handler, paramCount]);
          });
        }
      });
      Object.keys(routes).forEach((m) => {
        if (method === METHOD_NAME_ALL || method === m) {
          Object.keys(routes[m]).forEach(
            (p) => re.test(p) && routes[m][p].push([handler, paramCount])
          );
        }
      });
      return;
    }
    const paths = checkOptionalParameter(path) || [path];
    for (let i = 0, len = paths.length; i < len; i++) {
      const path2 = paths[i];
      Object.keys(routes).forEach((m) => {
        if (method === METHOD_NAME_ALL || method === m) {
          if (!routes[m][path2]) {
            this.#insertPath(m, path2);
            routes[m][path2] = [
              ...findMiddleware(middleware[m], path2) || findMiddleware(middleware[METHOD_NAME_ALL], path2) || []
            ];
          }
          routes[m][path2].push([handler, paramCount - len + i + 1]);
        }
      });
    }
  }
  match = match;
  buildAllMatchers() {
    const matchers = /* @__PURE__ */ Object.create(null);
    Object.keys(this.#routes).concat(Object.keys(this.#middleware)).forEach((method) => {
      matchers[method] ||= this.#buildMatcher(method);
    });
    this.#middleware = this.#routes = this.#tries = void 0;
    clearWildcardRegExpCache();
    return matchers;
  }
  #buildMatcher(method) {
    const middleware = this.#middleware[method];
    const routes = this.#routes[method];
    const trie = this.#tries[method];
    const staticMap = /* @__PURE__ */ Object.create(null);
    const handlerData = [];
    [middleware, routes].forEach((r) => {
      for (const path in r) {
        const handlers = r[path];
        const pathData = trie.paths[path];
        if (!pathData) {
          staticMap[path] = [handlers.map(([h]) => [h, /* @__PURE__ */ Object.create(null)]), emptyParam];
          continue;
        }
        const paramAssoc = pathData[1];
        handlerData[pathData[0]] = handlers.map(([h, paramCount]) => {
          const paramIndexMap = /* @__PURE__ */ Object.create(null);
          paramCount -= 1;
          for (; paramCount >= 0; paramCount--) {
            const [key, value] = paramAssoc[paramCount];
            paramIndexMap[key] = value;
          }
          return [h, paramIndexMap];
        });
      }
    });
    const [regexp, indexReplacementMap, paramReplacementMap] = trie.buildRegExp();
    for (let i = 0, len = handlerData.length; i < len; i++) {
      for (let j = 0, len2 = handlerData[i].length; j < len2; j++) {
        const map = handlerData[i][j]?.[1];
        if (!map) {
          continue;
        }
        const keys2 = Object.keys(map);
        for (let k = 0, len3 = keys2.length; k < len3; k++) {
          map[keys2[k]] = paramReplacementMap[map[keys2[k]]];
        }
      }
    }
    const handlerMap = [];
    for (const i in indexReplacementMap) {
      handlerMap[i] = handlerData[indexReplacementMap[i]];
    }
    return [regexp, handlerMap, staticMap];
  }
};

// node_modules/hono/dist/router/smart-router/router.js
var SmartRouter = class {
  static {
    __name(this, "SmartRouter");
  }
  name = "SmartRouter";
  #routers = [];
  #routes = [];
  constructor(init) {
    this.#routers = init.routers;
  }
  add(method, path, handler) {
    if (!this.#routes) {
      throw new Error(MESSAGE_MATCHER_IS_ALREADY_BUILT);
    }
    this.#routes.push([method, path, handler]);
  }
  match(method, path) {
    if (!this.#routes) {
      throw new Error("Fatal error");
    }
    const routers = this.#routers;
    const routes = this.#routes;
    const len = routers.length;
    let i = 0;
    let res;
    for (; i < len; i++) {
      const router = routers[i];
      try {
        for (let i2 = 0, len2 = routes.length; i2 < len2; i2++) {
          router.add(...routes[i2]);
        }
        res = router.match(method, path);
      } catch (e) {
        if (e instanceof UnsupportedPathError) {
          continue;
        }
        throw e;
      }
      this.match = router.match.bind(router);
      this.#routers = [router];
      this.#routes = void 0;
      break;
    }
    if (i === len) {
      throw new Error("Fatal error");
    }
    this.name = `SmartRouter + ${this.activeRouter.name}`;
    return res;
  }
  get activeRouter() {
    if (this.#routes || this.#routers.length !== 1) {
      throw new Error("No active router has been determined yet.");
    }
    return this.#routers[0];
  }
};

// node_modules/hono/dist/router/trie-router/node.js
var emptyParams = /* @__PURE__ */ Object.create(null);
var order = 0;
var Node2 = class _Node2 {
  static {
    __name(this, "_Node");
  }
  #methods = [];
  #children = /* @__PURE__ */ Object.create(null);
  #patterns = [];
  #pattern;
  #params = emptyParams;
  insert(method, path, handler) {
    let curNode = this;
    const parts = splitRoutingPath(path);
    const possibleKeys = /* @__PURE__ */ new Set();
    let i = 0;
    for (const p of parts) {
      const nextP = parts[++i];
      const pattern = getPattern(p, nextP) || (nextP === void 0 && p && p.indexOf("*") === p.length - 1 ? p : null);
      const isParam = Array.isArray(pattern);
      const key = isParam ? pattern[0] : pattern || p;
      const child = curNode.#children[key] ||= new _Node2();
      if (pattern && !child.#pattern) {
        child.#pattern = pattern;
        curNode.#patterns.push(child);
      }
      curNode = child;
      if (isParam) {
        possibleKeys.add(pattern[1]);
      }
    }
    curNode.#methods.push({
      [method]: {
        handler,
        possibleKeys: [...possibleKeys],
        score: ++order
      }
    });
  }
  #pushHandlerSets(handlerSets, node, method, nodeParams, params) {
    for (let i = 0, len = node.#methods.length; i < len; i++) {
      const m = node.#methods[i];
      const handlerSet = m[method] || m[METHOD_NAME_ALL];
      if (handlerSet) {
        handlerSet.params = /* @__PURE__ */ Object.create(null);
        handlerSets.push(handlerSet);
        for (let i2 = 0, len2 = handlerSet.possibleKeys.length; i2 < len2; i2++) {
          const key = handlerSet.possibleKeys[i2];
          handlerSet.params[key] = params?.[key] && !i2 ? params[key] : nodeParams[key] ?? params?.[key];
        }
      }
    }
  }
  search(method, path) {
    const handlerSets = [];
    this.#params = emptyParams;
    const curNode = this;
    let curNodes = [curNode];
    const parts = splitPath(path);
    const curNodesQueue = [];
    const len = parts.length;
    let partOffsets = null;
    for (let i = 0; i < len; i++) {
      const part = parts[i];
      const isLast = i === len - 1;
      const tempNodes = [];
      for (let j = 0, len2 = curNodes.length; j < len2; j++) {
        const node = curNodes[j];
        const nextNode = node.#children[part];
        if (nextNode) {
          nextNode.#params = node.#params;
          if (isLast) {
            if (nextNode.#children["*"]) {
              this.#pushHandlerSets(handlerSets, nextNode.#children["*"], method, node.#params);
            }
            this.#pushHandlerSets(handlerSets, nextNode, method, node.#params);
          } else {
            tempNodes.push(nextNode);
          }
        }
        for (const child of node.#patterns) {
          const pattern = child.#pattern;
          const params = node.#params === emptyParams ? {} : { ...node.#params };
          if (typeof pattern === "string") {
            if (pattern === "*" || part.startsWith(pattern.slice(0, -1))) {
              this.#pushHandlerSets(handlerSets, child, method, node.#params);
              if (pattern === "*") {
                child.#params = params;
                tempNodes.push(child);
              }
            }
            continue;
          }
          const [, name, matcher] = pattern;
          if (!part && matcher === true) {
            continue;
          }
          if (matcher !== true) {
            if (!partOffsets) {
              partOffsets = [];
              let offset = path[0] === "/" ? 1 : 0;
              for (let p = 0; p < len; p++) {
                partOffsets[p] = offset;
                offset += parts[p].length + 1;
              }
            }
            const restPathString = path.slice(partOffsets[i]);
            const m = matcher.exec(restPathString);
            if (m) {
              params[name] = m[0];
              this.#pushHandlerSets(handlerSets, child, method, node.#params, params);
              if (m[0].length === restPathString.length && child.#children["*"]) {
                this.#pushHandlerSets(
                  handlerSets,
                  child.#children["*"],
                  method,
                  node.#params,
                  params
                );
              }
              for (const _ in child.#children) {
                child.#params = params;
                const componentCount = m[0].match(/\//g)?.length ?? 0;
                const targetCurNodes = curNodesQueue[componentCount] ||= [];
                targetCurNodes.push(child);
                break;
              }
              continue;
            }
          }
          if (matcher === true || matcher.test(part)) {
            params[name] = part;
            if (isLast) {
              this.#pushHandlerSets(handlerSets, child, method, params, node.#params);
              if (child.#children["*"]) {
                this.#pushHandlerSets(
                  handlerSets,
                  child.#children["*"],
                  method,
                  params,
                  node.#params
                );
              }
            } else {
              child.#params = params;
              tempNodes.push(child);
            }
          }
        }
      }
      const shifted = curNodesQueue.shift();
      curNodes = shifted ? tempNodes.concat(shifted) : tempNodes;
    }
    if (handlerSets[1]) {
      handlerSets.sort((a, b) => {
        return a.score - b.score;
      });
    }
    return [handlerSets.map(({ handler, params }) => [handler, params])];
  }
};

// node_modules/hono/dist/router/trie-router/router.js
var TrieRouter = class {
  static {
    __name(this, "TrieRouter");
  }
  name = "TrieRouter";
  #node = new Node2();
  add(method, path, handler) {
    for (const result of checkOptionalParameter(path) || [path]) {
      this.#node.insert(method, result, handler);
    }
  }
  match(method, path) {
    return this.#node.search(method, path);
  }
};

// node_modules/hono/dist/hono.js
var Hono2 = class extends Hono {
  static {
    __name(this, "Hono");
  }
  /**
   * Creates an instance of the Hono class.
   *
   * @param options - Optional configuration options for the Hono instance.
   */
  constructor(options = {}) {
    super(options);
    this.router = options.router ?? new SmartRouter({
      routers: [new RegExpRouter(), new TrieRouter()]
    });
  }
};

// node_modules/hono/dist/middleware/body-limit/index.js
var ERROR_MESSAGE = "Payload Too Large";
var bodyLimit = /* @__PURE__ */ __name((options) => {
  const onError = options.onError || (() => {
    const res = new Response(ERROR_MESSAGE, {
      status: 413
    });
    throw new HTTPException(413, { res });
  });
  const maxSize = options.maxSize;
  return /* @__PURE__ */ __name(async function bodyLimit2(c, next) {
    if (!c.req.raw.body) {
      return next();
    }
    const hasTransferEncoding = c.req.raw.headers.has("transfer-encoding");
    const hasContentLength = c.req.raw.headers.has("content-length");
    if (hasContentLength && !hasTransferEncoding) {
      const contentLength = parseInt(c.req.raw.headers.get("content-length") || "0", 10);
      return contentLength > maxSize ? onError(c) : next();
    }
    let size = 0;
    const chunks = [];
    const rawReader = c.req.raw.body.getReader();
    for (; ; ) {
      const { done, value } = await rawReader.read();
      if (done) {
        break;
      }
      size += value.length;
      if (size > maxSize) {
        return onError(c);
      }
      chunks.push(value);
    }
    const requestInit = {
      body: new ReadableStream({
        start(controller) {
          for (const chunk of chunks) {
            controller.enqueue(chunk);
          }
          controller.close();
        }
      }),
      duplex: "half"
    };
    c.req.raw = new Request(c.req.raw, requestInit);
    return next();
  }, "bodyLimit2");
}, "bodyLimit");

// node_modules/zod/v3/external.js
var external_exports = {};
__export(external_exports, {
  BRAND: () => BRAND,
  DIRTY: () => DIRTY,
  EMPTY_PATH: () => EMPTY_PATH,
  INVALID: () => INVALID,
  NEVER: () => NEVER,
  OK: () => OK,
  ParseStatus: () => ParseStatus,
  Schema: () => ZodType,
  ZodAny: () => ZodAny,
  ZodArray: () => ZodArray,
  ZodBigInt: () => ZodBigInt,
  ZodBoolean: () => ZodBoolean,
  ZodBranded: () => ZodBranded,
  ZodCatch: () => ZodCatch,
  ZodDate: () => ZodDate,
  ZodDefault: () => ZodDefault,
  ZodDiscriminatedUnion: () => ZodDiscriminatedUnion,
  ZodEffects: () => ZodEffects,
  ZodEnum: () => ZodEnum,
  ZodError: () => ZodError,
  ZodFirstPartyTypeKind: () => ZodFirstPartyTypeKind,
  ZodFunction: () => ZodFunction,
  ZodIntersection: () => ZodIntersection,
  ZodIssueCode: () => ZodIssueCode,
  ZodLazy: () => ZodLazy,
  ZodLiteral: () => ZodLiteral,
  ZodMap: () => ZodMap,
  ZodNaN: () => ZodNaN,
  ZodNativeEnum: () => ZodNativeEnum,
  ZodNever: () => ZodNever,
  ZodNull: () => ZodNull,
  ZodNullable: () => ZodNullable,
  ZodNumber: () => ZodNumber,
  ZodObject: () => ZodObject,
  ZodOptional: () => ZodOptional,
  ZodParsedType: () => ZodParsedType,
  ZodPipeline: () => ZodPipeline,
  ZodPromise: () => ZodPromise,
  ZodReadonly: () => ZodReadonly,
  ZodRecord: () => ZodRecord,
  ZodSchema: () => ZodType,
  ZodSet: () => ZodSet,
  ZodString: () => ZodString,
  ZodSymbol: () => ZodSymbol,
  ZodTransformer: () => ZodEffects,
  ZodTuple: () => ZodTuple,
  ZodType: () => ZodType,
  ZodUndefined: () => ZodUndefined,
  ZodUnion: () => ZodUnion,
  ZodUnknown: () => ZodUnknown,
  ZodVoid: () => ZodVoid,
  addIssueToContext: () => addIssueToContext,
  any: () => anyType,
  array: () => arrayType,
  bigint: () => bigIntType,
  boolean: () => booleanType,
  coerce: () => coerce,
  custom: () => custom,
  date: () => dateType,
  datetimeRegex: () => datetimeRegex,
  defaultErrorMap: () => en_default,
  discriminatedUnion: () => discriminatedUnionType,
  effect: () => effectsType,
  enum: () => enumType,
  function: () => functionType,
  getErrorMap: () => getErrorMap,
  getParsedType: () => getParsedType,
  instanceof: () => instanceOfType,
  intersection: () => intersectionType,
  isAborted: () => isAborted,
  isAsync: () => isAsync,
  isDirty: () => isDirty,
  isValid: () => isValid,
  late: () => late,
  lazy: () => lazyType,
  literal: () => literalType,
  makeIssue: () => makeIssue,
  map: () => mapType,
  nan: () => nanType,
  nativeEnum: () => nativeEnumType,
  never: () => neverType,
  null: () => nullType,
  nullable: () => nullableType,
  number: () => numberType,
  object: () => objectType,
  objectUtil: () => objectUtil,
  oboolean: () => oboolean,
  onumber: () => onumber,
  optional: () => optionalType,
  ostring: () => ostring,
  pipeline: () => pipelineType,
  preprocess: () => preprocessType,
  promise: () => promiseType,
  quotelessJson: () => quotelessJson,
  record: () => recordType,
  set: () => setType,
  setErrorMap: () => setErrorMap,
  strictObject: () => strictObjectType,
  string: () => stringType,
  symbol: () => symbolType,
  transformer: () => effectsType,
  tuple: () => tupleType,
  undefined: () => undefinedType,
  union: () => unionType,
  unknown: () => unknownType,
  util: () => util,
  void: () => voidType
});

// node_modules/zod/v3/helpers/util.js
var util;
(function(util2) {
  util2.assertEqual = (_) => {
  };
  function assertIs(_arg) {
  }
  __name(assertIs, "assertIs");
  util2.assertIs = assertIs;
  function assertNever(_x) {
    throw new Error();
  }
  __name(assertNever, "assertNever");
  util2.assertNever = assertNever;
  util2.arrayToEnum = (items) => {
    const obj = {};
    for (const item of items) {
      obj[item] = item;
    }
    return obj;
  };
  util2.getValidEnumValues = (obj) => {
    const validKeys = util2.objectKeys(obj).filter((k) => typeof obj[obj[k]] !== "number");
    const filtered = {};
    for (const k of validKeys) {
      filtered[k] = obj[k];
    }
    return util2.objectValues(filtered);
  };
  util2.objectValues = (obj) => {
    return util2.objectKeys(obj).map(function(e) {
      return obj[e];
    });
  };
  util2.objectKeys = typeof Object.keys === "function" ? (obj) => Object.keys(obj) : (object) => {
    const keys2 = [];
    for (const key in object) {
      if (Object.prototype.hasOwnProperty.call(object, key)) {
        keys2.push(key);
      }
    }
    return keys2;
  };
  util2.find = (arr, checker) => {
    for (const item of arr) {
      if (checker(item))
        return item;
    }
    return void 0;
  };
  util2.isInteger = typeof Number.isInteger === "function" ? (val) => Number.isInteger(val) : (val) => typeof val === "number" && Number.isFinite(val) && Math.floor(val) === val;
  function joinValues(array, separator = " | ") {
    return array.map((val) => typeof val === "string" ? `'${val}'` : val).join(separator);
  }
  __name(joinValues, "joinValues");
  util2.joinValues = joinValues;
  util2.jsonStringifyReplacer = (_, value) => {
    if (typeof value === "bigint") {
      return value.toString();
    }
    return value;
  };
})(util || (util = {}));
var objectUtil;
(function(objectUtil2) {
  objectUtil2.mergeShapes = (first, second) => {
    return {
      ...first,
      ...second
      // second overwrites first
    };
  };
})(objectUtil || (objectUtil = {}));
var ZodParsedType = util.arrayToEnum([
  "string",
  "nan",
  "number",
  "integer",
  "float",
  "boolean",
  "date",
  "bigint",
  "symbol",
  "function",
  "undefined",
  "null",
  "array",
  "object",
  "unknown",
  "promise",
  "void",
  "never",
  "map",
  "set"
]);
var getParsedType = /* @__PURE__ */ __name((data) => {
  const t = typeof data;
  switch (t) {
    case "undefined":
      return ZodParsedType.undefined;
    case "string":
      return ZodParsedType.string;
    case "number":
      return Number.isNaN(data) ? ZodParsedType.nan : ZodParsedType.number;
    case "boolean":
      return ZodParsedType.boolean;
    case "function":
      return ZodParsedType.function;
    case "bigint":
      return ZodParsedType.bigint;
    case "symbol":
      return ZodParsedType.symbol;
    case "object":
      if (Array.isArray(data)) {
        return ZodParsedType.array;
      }
      if (data === null) {
        return ZodParsedType.null;
      }
      if (data.then && typeof data.then === "function" && data.catch && typeof data.catch === "function") {
        return ZodParsedType.promise;
      }
      if (typeof Map !== "undefined" && data instanceof Map) {
        return ZodParsedType.map;
      }
      if (typeof Set !== "undefined" && data instanceof Set) {
        return ZodParsedType.set;
      }
      if (typeof Date !== "undefined" && data instanceof Date) {
        return ZodParsedType.date;
      }
      return ZodParsedType.object;
    default:
      return ZodParsedType.unknown;
  }
}, "getParsedType");

// node_modules/zod/v3/ZodError.js
var ZodIssueCode = util.arrayToEnum([
  "invalid_type",
  "invalid_literal",
  "custom",
  "invalid_union",
  "invalid_union_discriminator",
  "invalid_enum_value",
  "unrecognized_keys",
  "invalid_arguments",
  "invalid_return_type",
  "invalid_date",
  "invalid_string",
  "too_small",
  "too_big",
  "invalid_intersection_types",
  "not_multiple_of",
  "not_finite"
]);
var quotelessJson = /* @__PURE__ */ __name((obj) => {
  const json = JSON.stringify(obj, null, 2);
  return json.replace(/"([^"]+)":/g, "$1:");
}, "quotelessJson");
var ZodError = class _ZodError extends Error {
  static {
    __name(this, "ZodError");
  }
  get errors() {
    return this.issues;
  }
  constructor(issues) {
    super();
    this.issues = [];
    this.addIssue = (sub) => {
      this.issues = [...this.issues, sub];
    };
    this.addIssues = (subs = []) => {
      this.issues = [...this.issues, ...subs];
    };
    const actualProto = new.target.prototype;
    if (Object.setPrototypeOf) {
      Object.setPrototypeOf(this, actualProto);
    } else {
      this.__proto__ = actualProto;
    }
    this.name = "ZodError";
    this.issues = issues;
  }
  format(_mapper) {
    const mapper = _mapper || function(issue) {
      return issue.message;
    };
    const fieldErrors = { _errors: [] };
    const processError = /* @__PURE__ */ __name((error) => {
      for (const issue of error.issues) {
        if (issue.code === "invalid_union") {
          issue.unionErrors.map(processError);
        } else if (issue.code === "invalid_return_type") {
          processError(issue.returnTypeError);
        } else if (issue.code === "invalid_arguments") {
          processError(issue.argumentsError);
        } else if (issue.path.length === 0) {
          fieldErrors._errors.push(mapper(issue));
        } else {
          let curr = fieldErrors;
          let i = 0;
          while (i < issue.path.length) {
            const el = issue.path[i];
            const terminal = i === issue.path.length - 1;
            if (!terminal) {
              curr[el] = curr[el] || { _errors: [] };
            } else {
              curr[el] = curr[el] || { _errors: [] };
              curr[el]._errors.push(mapper(issue));
            }
            curr = curr[el];
            i++;
          }
        }
      }
    }, "processError");
    processError(this);
    return fieldErrors;
  }
  static assert(value) {
    if (!(value instanceof _ZodError)) {
      throw new Error(`Not a ZodError: ${value}`);
    }
  }
  toString() {
    return this.message;
  }
  get message() {
    return JSON.stringify(this.issues, util.jsonStringifyReplacer, 2);
  }
  get isEmpty() {
    return this.issues.length === 0;
  }
  flatten(mapper = (issue) => issue.message) {
    const fieldErrors = {};
    const formErrors = [];
    for (const sub of this.issues) {
      if (sub.path.length > 0) {
        const firstEl = sub.path[0];
        fieldErrors[firstEl] = fieldErrors[firstEl] || [];
        fieldErrors[firstEl].push(mapper(sub));
      } else {
        formErrors.push(mapper(sub));
      }
    }
    return { formErrors, fieldErrors };
  }
  get formErrors() {
    return this.flatten();
  }
};
ZodError.create = (issues) => {
  const error = new ZodError(issues);
  return error;
};

// node_modules/zod/v3/locales/en.js
var errorMap = /* @__PURE__ */ __name((issue, _ctx) => {
  let message;
  switch (issue.code) {
    case ZodIssueCode.invalid_type:
      if (issue.received === ZodParsedType.undefined) {
        message = "Required";
      } else {
        message = `Expected ${issue.expected}, received ${issue.received}`;
      }
      break;
    case ZodIssueCode.invalid_literal:
      message = `Invalid literal value, expected ${JSON.stringify(issue.expected, util.jsonStringifyReplacer)}`;
      break;
    case ZodIssueCode.unrecognized_keys:
      message = `Unrecognized key(s) in object: ${util.joinValues(issue.keys, ", ")}`;
      break;
    case ZodIssueCode.invalid_union:
      message = `Invalid input`;
      break;
    case ZodIssueCode.invalid_union_discriminator:
      message = `Invalid discriminator value. Expected ${util.joinValues(issue.options)}`;
      break;
    case ZodIssueCode.invalid_enum_value:
      message = `Invalid enum value. Expected ${util.joinValues(issue.options)}, received '${issue.received}'`;
      break;
    case ZodIssueCode.invalid_arguments:
      message = `Invalid function arguments`;
      break;
    case ZodIssueCode.invalid_return_type:
      message = `Invalid function return type`;
      break;
    case ZodIssueCode.invalid_date:
      message = `Invalid date`;
      break;
    case ZodIssueCode.invalid_string:
      if (typeof issue.validation === "object") {
        if ("includes" in issue.validation) {
          message = `Invalid input: must include "${issue.validation.includes}"`;
          if (typeof issue.validation.position === "number") {
            message = `${message} at one or more positions greater than or equal to ${issue.validation.position}`;
          }
        } else if ("startsWith" in issue.validation) {
          message = `Invalid input: must start with "${issue.validation.startsWith}"`;
        } else if ("endsWith" in issue.validation) {
          message = `Invalid input: must end with "${issue.validation.endsWith}"`;
        } else {
          util.assertNever(issue.validation);
        }
      } else if (issue.validation !== "regex") {
        message = `Invalid ${issue.validation}`;
      } else {
        message = "Invalid";
      }
      break;
    case ZodIssueCode.too_small:
      if (issue.type === "array")
        message = `Array must contain ${issue.exact ? "exactly" : issue.inclusive ? `at least` : `more than`} ${issue.minimum} element(s)`;
      else if (issue.type === "string")
        message = `String must contain ${issue.exact ? "exactly" : issue.inclusive ? `at least` : `over`} ${issue.minimum} character(s)`;
      else if (issue.type === "number")
        message = `Number must be ${issue.exact ? `exactly equal to ` : issue.inclusive ? `greater than or equal to ` : `greater than `}${issue.minimum}`;
      else if (issue.type === "bigint")
        message = `Number must be ${issue.exact ? `exactly equal to ` : issue.inclusive ? `greater than or equal to ` : `greater than `}${issue.minimum}`;
      else if (issue.type === "date")
        message = `Date must be ${issue.exact ? `exactly equal to ` : issue.inclusive ? `greater than or equal to ` : `greater than `}${new Date(Number(issue.minimum))}`;
      else
        message = "Invalid input";
      break;
    case ZodIssueCode.too_big:
      if (issue.type === "array")
        message = `Array must contain ${issue.exact ? `exactly` : issue.inclusive ? `at most` : `less than`} ${issue.maximum} element(s)`;
      else if (issue.type === "string")
        message = `String must contain ${issue.exact ? `exactly` : issue.inclusive ? `at most` : `under`} ${issue.maximum} character(s)`;
      else if (issue.type === "number")
        message = `Number must be ${issue.exact ? `exactly` : issue.inclusive ? `less than or equal to` : `less than`} ${issue.maximum}`;
      else if (issue.type === "bigint")
        message = `BigInt must be ${issue.exact ? `exactly` : issue.inclusive ? `less than or equal to` : `less than`} ${issue.maximum}`;
      else if (issue.type === "date")
        message = `Date must be ${issue.exact ? `exactly` : issue.inclusive ? `smaller than or equal to` : `smaller than`} ${new Date(Number(issue.maximum))}`;
      else
        message = "Invalid input";
      break;
    case ZodIssueCode.custom:
      message = `Invalid input`;
      break;
    case ZodIssueCode.invalid_intersection_types:
      message = `Intersection results could not be merged`;
      break;
    case ZodIssueCode.not_multiple_of:
      message = `Number must be a multiple of ${issue.multipleOf}`;
      break;
    case ZodIssueCode.not_finite:
      message = "Number must be finite";
      break;
    default:
      message = _ctx.defaultError;
      util.assertNever(issue);
  }
  return { message };
}, "errorMap");
var en_default = errorMap;

// node_modules/zod/v3/errors.js
var overrideErrorMap = en_default;
function setErrorMap(map) {
  overrideErrorMap = map;
}
__name(setErrorMap, "setErrorMap");
function getErrorMap() {
  return overrideErrorMap;
}
__name(getErrorMap, "getErrorMap");

// node_modules/zod/v3/helpers/parseUtil.js
var makeIssue = /* @__PURE__ */ __name((params) => {
  const { data, path, errorMaps, issueData } = params;
  const fullPath = [...path, ...issueData.path || []];
  const fullIssue = {
    ...issueData,
    path: fullPath
  };
  if (issueData.message !== void 0) {
    return {
      ...issueData,
      path: fullPath,
      message: issueData.message
    };
  }
  let errorMessage = "";
  const maps = errorMaps.filter((m) => !!m).slice().reverse();
  for (const map of maps) {
    errorMessage = map(fullIssue, { data, defaultError: errorMessage }).message;
  }
  return {
    ...issueData,
    path: fullPath,
    message: errorMessage
  };
}, "makeIssue");
var EMPTY_PATH = [];
function addIssueToContext(ctx, issueData) {
  const overrideMap = getErrorMap();
  const issue = makeIssue({
    issueData,
    data: ctx.data,
    path: ctx.path,
    errorMaps: [
      ctx.common.contextualErrorMap,
      // contextual error map is first priority
      ctx.schemaErrorMap,
      // then schema-bound map if available
      overrideMap,
      // then global override map
      overrideMap === en_default ? void 0 : en_default
      // then global default map
    ].filter((x) => !!x)
  });
  ctx.common.issues.push(issue);
}
__name(addIssueToContext, "addIssueToContext");
var ParseStatus = class _ParseStatus {
  static {
    __name(this, "ParseStatus");
  }
  constructor() {
    this.value = "valid";
  }
  dirty() {
    if (this.value === "valid")
      this.value = "dirty";
  }
  abort() {
    if (this.value !== "aborted")
      this.value = "aborted";
  }
  static mergeArray(status, results) {
    const arrayValue = [];
    for (const s of results) {
      if (s.status === "aborted")
        return INVALID;
      if (s.status === "dirty")
        status.dirty();
      arrayValue.push(s.value);
    }
    return { status: status.value, value: arrayValue };
  }
  static async mergeObjectAsync(status, pairs) {
    const syncPairs = [];
    for (const pair of pairs) {
      const key = await pair.key;
      const value = await pair.value;
      syncPairs.push({
        key,
        value
      });
    }
    return _ParseStatus.mergeObjectSync(status, syncPairs);
  }
  static mergeObjectSync(status, pairs) {
    const finalObject = {};
    for (const pair of pairs) {
      const { key, value } = pair;
      if (key.status === "aborted")
        return INVALID;
      if (value.status === "aborted")
        return INVALID;
      if (key.status === "dirty")
        status.dirty();
      if (value.status === "dirty")
        status.dirty();
      if (key.value !== "__proto__" && (typeof value.value !== "undefined" || pair.alwaysSet)) {
        finalObject[key.value] = value.value;
      }
    }
    return { status: status.value, value: finalObject };
  }
};
var INVALID = Object.freeze({
  status: "aborted"
});
var DIRTY = /* @__PURE__ */ __name((value) => ({ status: "dirty", value }), "DIRTY");
var OK = /* @__PURE__ */ __name((value) => ({ status: "valid", value }), "OK");
var isAborted = /* @__PURE__ */ __name((x) => x.status === "aborted", "isAborted");
var isDirty = /* @__PURE__ */ __name((x) => x.status === "dirty", "isDirty");
var isValid = /* @__PURE__ */ __name((x) => x.status === "valid", "isValid");
var isAsync = /* @__PURE__ */ __name((x) => typeof Promise !== "undefined" && x instanceof Promise, "isAsync");

// node_modules/zod/v3/helpers/errorUtil.js
var errorUtil;
(function(errorUtil2) {
  errorUtil2.errToObj = (message) => typeof message === "string" ? { message } : message || {};
  errorUtil2.toString = (message) => typeof message === "string" ? message : message?.message;
})(errorUtil || (errorUtil = {}));

// node_modules/zod/v3/types.js
var ParseInputLazyPath = class {
  static {
    __name(this, "ParseInputLazyPath");
  }
  constructor(parent, value, path, key) {
    this._cachedPath = [];
    this.parent = parent;
    this.data = value;
    this._path = path;
    this._key = key;
  }
  get path() {
    if (!this._cachedPath.length) {
      if (Array.isArray(this._key)) {
        this._cachedPath.push(...this._path, ...this._key);
      } else {
        this._cachedPath.push(...this._path, this._key);
      }
    }
    return this._cachedPath;
  }
};
var handleResult = /* @__PURE__ */ __name((ctx, result) => {
  if (isValid(result)) {
    return { success: true, data: result.value };
  } else {
    if (!ctx.common.issues.length) {
      throw new Error("Validation failed but no issues detected.");
    }
    return {
      success: false,
      get error() {
        if (this._error)
          return this._error;
        const error = new ZodError(ctx.common.issues);
        this._error = error;
        return this._error;
      }
    };
  }
}, "handleResult");
function processCreateParams(params) {
  if (!params)
    return {};
  const { errorMap: errorMap2, invalid_type_error, required_error, description } = params;
  if (errorMap2 && (invalid_type_error || required_error)) {
    throw new Error(`Can't use "invalid_type_error" or "required_error" in conjunction with custom error map.`);
  }
  if (errorMap2)
    return { errorMap: errorMap2, description };
  const customMap = /* @__PURE__ */ __name((iss, ctx) => {
    const { message } = params;
    if (iss.code === "invalid_enum_value") {
      return { message: message ?? ctx.defaultError };
    }
    if (typeof ctx.data === "undefined") {
      return { message: message ?? required_error ?? ctx.defaultError };
    }
    if (iss.code !== "invalid_type")
      return { message: ctx.defaultError };
    return { message: message ?? invalid_type_error ?? ctx.defaultError };
  }, "customMap");
  return { errorMap: customMap, description };
}
__name(processCreateParams, "processCreateParams");
var ZodType = class {
  static {
    __name(this, "ZodType");
  }
  get description() {
    return this._def.description;
  }
  _getType(input) {
    return getParsedType(input.data);
  }
  _getOrReturnCtx(input, ctx) {
    return ctx || {
      common: input.parent.common,
      data: input.data,
      parsedType: getParsedType(input.data),
      schemaErrorMap: this._def.errorMap,
      path: input.path,
      parent: input.parent
    };
  }
  _processInputParams(input) {
    return {
      status: new ParseStatus(),
      ctx: {
        common: input.parent.common,
        data: input.data,
        parsedType: getParsedType(input.data),
        schemaErrorMap: this._def.errorMap,
        path: input.path,
        parent: input.parent
      }
    };
  }
  _parseSync(input) {
    const result = this._parse(input);
    if (isAsync(result)) {
      throw new Error("Synchronous parse encountered promise.");
    }
    return result;
  }
  _parseAsync(input) {
    const result = this._parse(input);
    return Promise.resolve(result);
  }
  parse(data, params) {
    const result = this.safeParse(data, params);
    if (result.success)
      return result.data;
    throw result.error;
  }
  safeParse(data, params) {
    const ctx = {
      common: {
        issues: [],
        async: params?.async ?? false,
        contextualErrorMap: params?.errorMap
      },
      path: params?.path || [],
      schemaErrorMap: this._def.errorMap,
      parent: null,
      data,
      parsedType: getParsedType(data)
    };
    const result = this._parseSync({ data, path: ctx.path, parent: ctx });
    return handleResult(ctx, result);
  }
  "~validate"(data) {
    const ctx = {
      common: {
        issues: [],
        async: !!this["~standard"].async
      },
      path: [],
      schemaErrorMap: this._def.errorMap,
      parent: null,
      data,
      parsedType: getParsedType(data)
    };
    if (!this["~standard"].async) {
      try {
        const result = this._parseSync({ data, path: [], parent: ctx });
        return isValid(result) ? {
          value: result.value
        } : {
          issues: ctx.common.issues
        };
      } catch (err) {
        if (err?.message?.toLowerCase()?.includes("encountered")) {
          this["~standard"].async = true;
        }
        ctx.common = {
          issues: [],
          async: true
        };
      }
    }
    return this._parseAsync({ data, path: [], parent: ctx }).then((result) => isValid(result) ? {
      value: result.value
    } : {
      issues: ctx.common.issues
    });
  }
  async parseAsync(data, params) {
    const result = await this.safeParseAsync(data, params);
    if (result.success)
      return result.data;
    throw result.error;
  }
  async safeParseAsync(data, params) {
    const ctx = {
      common: {
        issues: [],
        contextualErrorMap: params?.errorMap,
        async: true
      },
      path: params?.path || [],
      schemaErrorMap: this._def.errorMap,
      parent: null,
      data,
      parsedType: getParsedType(data)
    };
    const maybeAsyncResult = this._parse({ data, path: ctx.path, parent: ctx });
    const result = await (isAsync(maybeAsyncResult) ? maybeAsyncResult : Promise.resolve(maybeAsyncResult));
    return handleResult(ctx, result);
  }
  refine(check, message) {
    const getIssueProperties = /* @__PURE__ */ __name((val) => {
      if (typeof message === "string" || typeof message === "undefined") {
        return { message };
      } else if (typeof message === "function") {
        return message(val);
      } else {
        return message;
      }
    }, "getIssueProperties");
    return this._refinement((val, ctx) => {
      const result = check(val);
      const setError = /* @__PURE__ */ __name(() => ctx.addIssue({
        code: ZodIssueCode.custom,
        ...getIssueProperties(val)
      }), "setError");
      if (typeof Promise !== "undefined" && result instanceof Promise) {
        return result.then((data) => {
          if (!data) {
            setError();
            return false;
          } else {
            return true;
          }
        });
      }
      if (!result) {
        setError();
        return false;
      } else {
        return true;
      }
    });
  }
  refinement(check, refinementData) {
    return this._refinement((val, ctx) => {
      if (!check(val)) {
        ctx.addIssue(typeof refinementData === "function" ? refinementData(val, ctx) : refinementData);
        return false;
      } else {
        return true;
      }
    });
  }
  _refinement(refinement) {
    return new ZodEffects({
      schema: this,
      typeName: ZodFirstPartyTypeKind.ZodEffects,
      effect: { type: "refinement", refinement }
    });
  }
  superRefine(refinement) {
    return this._refinement(refinement);
  }
  constructor(def) {
    this.spa = this.safeParseAsync;
    this._def = def;
    this.parse = this.parse.bind(this);
    this.safeParse = this.safeParse.bind(this);
    this.parseAsync = this.parseAsync.bind(this);
    this.safeParseAsync = this.safeParseAsync.bind(this);
    this.spa = this.spa.bind(this);
    this.refine = this.refine.bind(this);
    this.refinement = this.refinement.bind(this);
    this.superRefine = this.superRefine.bind(this);
    this.optional = this.optional.bind(this);
    this.nullable = this.nullable.bind(this);
    this.nullish = this.nullish.bind(this);
    this.array = this.array.bind(this);
    this.promise = this.promise.bind(this);
    this.or = this.or.bind(this);
    this.and = this.and.bind(this);
    this.transform = this.transform.bind(this);
    this.brand = this.brand.bind(this);
    this.default = this.default.bind(this);
    this.catch = this.catch.bind(this);
    this.describe = this.describe.bind(this);
    this.pipe = this.pipe.bind(this);
    this.readonly = this.readonly.bind(this);
    this.isNullable = this.isNullable.bind(this);
    this.isOptional = this.isOptional.bind(this);
    this["~standard"] = {
      version: 1,
      vendor: "zod",
      validate: /* @__PURE__ */ __name((data) => this["~validate"](data), "validate")
    };
  }
  optional() {
    return ZodOptional.create(this, this._def);
  }
  nullable() {
    return ZodNullable.create(this, this._def);
  }
  nullish() {
    return this.nullable().optional();
  }
  array() {
    return ZodArray.create(this);
  }
  promise() {
    return ZodPromise.create(this, this._def);
  }
  or(option) {
    return ZodUnion.create([this, option], this._def);
  }
  and(incoming) {
    return ZodIntersection.create(this, incoming, this._def);
  }
  transform(transform) {
    return new ZodEffects({
      ...processCreateParams(this._def),
      schema: this,
      typeName: ZodFirstPartyTypeKind.ZodEffects,
      effect: { type: "transform", transform }
    });
  }
  default(def) {
    const defaultValueFunc = typeof def === "function" ? def : () => def;
    return new ZodDefault({
      ...processCreateParams(this._def),
      innerType: this,
      defaultValue: defaultValueFunc,
      typeName: ZodFirstPartyTypeKind.ZodDefault
    });
  }
  brand() {
    return new ZodBranded({
      typeName: ZodFirstPartyTypeKind.ZodBranded,
      type: this,
      ...processCreateParams(this._def)
    });
  }
  catch(def) {
    const catchValueFunc = typeof def === "function" ? def : () => def;
    return new ZodCatch({
      ...processCreateParams(this._def),
      innerType: this,
      catchValue: catchValueFunc,
      typeName: ZodFirstPartyTypeKind.ZodCatch
    });
  }
  describe(description) {
    const This = this.constructor;
    return new This({
      ...this._def,
      description
    });
  }
  pipe(target) {
    return ZodPipeline.create(this, target);
  }
  readonly() {
    return ZodReadonly.create(this);
  }
  isOptional() {
    return this.safeParse(void 0).success;
  }
  isNullable() {
    return this.safeParse(null).success;
  }
};
var cuidRegex = /^c[^\s-]{8,}$/i;
var cuid2Regex = /^[0-9a-z]+$/;
var ulidRegex = /^[0-9A-HJKMNP-TV-Z]{26}$/i;
var uuidRegex = /^[0-9a-fA-F]{8}\b-[0-9a-fA-F]{4}\b-[0-9a-fA-F]{4}\b-[0-9a-fA-F]{4}\b-[0-9a-fA-F]{12}$/i;
var nanoidRegex = /^[a-z0-9_-]{21}$/i;
var jwtRegex = /^[A-Za-z0-9-_]+\.[A-Za-z0-9-_]+\.[A-Za-z0-9-_]*$/;
var durationRegex = /^[-+]?P(?!$)(?:(?:[-+]?\d+Y)|(?:[-+]?\d+[.,]\d+Y$))?(?:(?:[-+]?\d+M)|(?:[-+]?\d+[.,]\d+M$))?(?:(?:[-+]?\d+W)|(?:[-+]?\d+[.,]\d+W$))?(?:(?:[-+]?\d+D)|(?:[-+]?\d+[.,]\d+D$))?(?:T(?=[\d+-])(?:(?:[-+]?\d+H)|(?:[-+]?\d+[.,]\d+H$))?(?:(?:[-+]?\d+M)|(?:[-+]?\d+[.,]\d+M$))?(?:[-+]?\d+(?:[.,]\d+)?S)?)??$/;
var emailRegex = /^(?!\.)(?!.*\.\.)([A-Z0-9_'+\-\.]*)[A-Z0-9_+-]@([A-Z0-9][A-Z0-9\-]*\.)+[A-Z]{2,}$/i;
var _emojiRegex = `^(\\p{Extended_Pictographic}|\\p{Emoji_Component})+$`;
var emojiRegex;
var ipv4Regex = /^(?:(?:25[0-5]|2[0-4][0-9]|1[0-9][0-9]|[1-9][0-9]|[0-9])\.){3}(?:25[0-5]|2[0-4][0-9]|1[0-9][0-9]|[1-9][0-9]|[0-9])$/;
var ipv4CidrRegex = /^(?:(?:25[0-5]|2[0-4][0-9]|1[0-9][0-9]|[1-9][0-9]|[0-9])\.){3}(?:25[0-5]|2[0-4][0-9]|1[0-9][0-9]|[1-9][0-9]|[0-9])\/(3[0-2]|[12]?[0-9])$/;
var ipv6Regex = /^(([0-9a-fA-F]{1,4}:){7,7}[0-9a-fA-F]{1,4}|([0-9a-fA-F]{1,4}:){1,7}:|([0-9a-fA-F]{1,4}:){1,6}:[0-9a-fA-F]{1,4}|([0-9a-fA-F]{1,4}:){1,5}(:[0-9a-fA-F]{1,4}){1,2}|([0-9a-fA-F]{1,4}:){1,4}(:[0-9a-fA-F]{1,4}){1,3}|([0-9a-fA-F]{1,4}:){1,3}(:[0-9a-fA-F]{1,4}){1,4}|([0-9a-fA-F]{1,4}:){1,2}(:[0-9a-fA-F]{1,4}){1,5}|[0-9a-fA-F]{1,4}:((:[0-9a-fA-F]{1,4}){1,6})|:((:[0-9a-fA-F]{1,4}){1,7}|:)|fe80:(:[0-9a-fA-F]{0,4}){0,4}%[0-9a-zA-Z]{1,}|::(ffff(:0{1,4}){0,1}:){0,1}((25[0-5]|(2[0-4]|1{0,1}[0-9]){0,1}[0-9])\.){3,3}(25[0-5]|(2[0-4]|1{0,1}[0-9]){0,1}[0-9])|([0-9a-fA-F]{1,4}:){1,4}:((25[0-5]|(2[0-4]|1{0,1}[0-9]){0,1}[0-9])\.){3,3}(25[0-5]|(2[0-4]|1{0,1}[0-9]){0,1}[0-9]))$/;
var ipv6CidrRegex = /^(([0-9a-fA-F]{1,4}:){7,7}[0-9a-fA-F]{1,4}|([0-9a-fA-F]{1,4}:){1,7}:|([0-9a-fA-F]{1,4}:){1,6}:[0-9a-fA-F]{1,4}|([0-9a-fA-F]{1,4}:){1,5}(:[0-9a-fA-F]{1,4}){1,2}|([0-9a-fA-F]{1,4}:){1,4}(:[0-9a-fA-F]{1,4}){1,3}|([0-9a-fA-F]{1,4}:){1,3}(:[0-9a-fA-F]{1,4}){1,4}|([0-9a-fA-F]{1,4}:){1,2}(:[0-9a-fA-F]{1,4}){1,5}|[0-9a-fA-F]{1,4}:((:[0-9a-fA-F]{1,4}){1,6})|:((:[0-9a-fA-F]{1,4}){1,7}|:)|fe80:(:[0-9a-fA-F]{0,4}){0,4}%[0-9a-zA-Z]{1,}|::(ffff(:0{1,4}){0,1}:){0,1}((25[0-5]|(2[0-4]|1{0,1}[0-9]){0,1}[0-9])\.){3,3}(25[0-5]|(2[0-4]|1{0,1}[0-9]){0,1}[0-9])|([0-9a-fA-F]{1,4}:){1,4}:((25[0-5]|(2[0-4]|1{0,1}[0-9]){0,1}[0-9])\.){3,3}(25[0-5]|(2[0-4]|1{0,1}[0-9]){0,1}[0-9]))\/(12[0-8]|1[01][0-9]|[1-9]?[0-9])$/;
var base64Regex = /^([0-9a-zA-Z+/]{4})*(([0-9a-zA-Z+/]{2}==)|([0-9a-zA-Z+/]{3}=))?$/;
var base64urlRegex = /^([0-9a-zA-Z-_]{4})*(([0-9a-zA-Z-_]{2}(==)?)|([0-9a-zA-Z-_]{3}(=)?))?$/;
var dateRegexSource = `((\\d\\d[2468][048]|\\d\\d[13579][26]|\\d\\d0[48]|[02468][048]00|[13579][26]00)-02-29|\\d{4}-((0[13578]|1[02])-(0[1-9]|[12]\\d|3[01])|(0[469]|11)-(0[1-9]|[12]\\d|30)|(02)-(0[1-9]|1\\d|2[0-8])))`;
var dateRegex = new RegExp(`^${dateRegexSource}$`);
function timeRegexSource(args) {
  let secondsRegexSource = `[0-5]\\d`;
  if (args.precision) {
    secondsRegexSource = `${secondsRegexSource}\\.\\d{${args.precision}}`;
  } else if (args.precision == null) {
    secondsRegexSource = `${secondsRegexSource}(\\.\\d+)?`;
  }
  const secondsQuantifier = args.precision ? "+" : "?";
  return `([01]\\d|2[0-3]):[0-5]\\d(:${secondsRegexSource})${secondsQuantifier}`;
}
__name(timeRegexSource, "timeRegexSource");
function timeRegex(args) {
  return new RegExp(`^${timeRegexSource(args)}$`);
}
__name(timeRegex, "timeRegex");
function datetimeRegex(args) {
  let regex = `${dateRegexSource}T${timeRegexSource(args)}`;
  const opts = [];
  opts.push(args.local ? `Z?` : `Z`);
  if (args.offset)
    opts.push(`([+-]\\d{2}:?\\d{2})`);
  regex = `${regex}(${opts.join("|")})`;
  return new RegExp(`^${regex}$`);
}
__name(datetimeRegex, "datetimeRegex");
function isValidIP(ip, version) {
  if ((version === "v4" || !version) && ipv4Regex.test(ip)) {
    return true;
  }
  if ((version === "v6" || !version) && ipv6Regex.test(ip)) {
    return true;
  }
  return false;
}
__name(isValidIP, "isValidIP");
function isValidJWT(jwt, alg) {
  if (!jwtRegex.test(jwt))
    return false;
  try {
    const [header] = jwt.split(".");
    if (!header)
      return false;
    const base64 = header.replace(/-/g, "+").replace(/_/g, "/").padEnd(header.length + (4 - header.length % 4) % 4, "=");
    const decoded = JSON.parse(atob(base64));
    if (typeof decoded !== "object" || decoded === null)
      return false;
    if ("typ" in decoded && decoded?.typ !== "JWT")
      return false;
    if (!decoded.alg)
      return false;
    if (alg && decoded.alg !== alg)
      return false;
    return true;
  } catch {
    return false;
  }
}
__name(isValidJWT, "isValidJWT");
function isValidCidr(ip, version) {
  if ((version === "v4" || !version) && ipv4CidrRegex.test(ip)) {
    return true;
  }
  if ((version === "v6" || !version) && ipv6CidrRegex.test(ip)) {
    return true;
  }
  return false;
}
__name(isValidCidr, "isValidCidr");
var ZodString = class _ZodString extends ZodType {
  static {
    __name(this, "ZodString");
  }
  _parse(input) {
    if (this._def.coerce) {
      input.data = String(input.data);
    }
    const parsedType = this._getType(input);
    if (parsedType !== ZodParsedType.string) {
      const ctx2 = this._getOrReturnCtx(input);
      addIssueToContext(ctx2, {
        code: ZodIssueCode.invalid_type,
        expected: ZodParsedType.string,
        received: ctx2.parsedType
      });
      return INVALID;
    }
    const status = new ParseStatus();
    let ctx = void 0;
    for (const check of this._def.checks) {
      if (check.kind === "min") {
        if (input.data.length < check.value) {
          ctx = this._getOrReturnCtx(input, ctx);
          addIssueToContext(ctx, {
            code: ZodIssueCode.too_small,
            minimum: check.value,
            type: "string",
            inclusive: true,
            exact: false,
            message: check.message
          });
          status.dirty();
        }
      } else if (check.kind === "max") {
        if (input.data.length > check.value) {
          ctx = this._getOrReturnCtx(input, ctx);
          addIssueToContext(ctx, {
            code: ZodIssueCode.too_big,
            maximum: check.value,
            type: "string",
            inclusive: true,
            exact: false,
            message: check.message
          });
          status.dirty();
        }
      } else if (check.kind === "length") {
        const tooBig = input.data.length > check.value;
        const tooSmall = input.data.length < check.value;
        if (tooBig || tooSmall) {
          ctx = this._getOrReturnCtx(input, ctx);
          if (tooBig) {
            addIssueToContext(ctx, {
              code: ZodIssueCode.too_big,
              maximum: check.value,
              type: "string",
              inclusive: true,
              exact: true,
              message: check.message
            });
          } else if (tooSmall) {
            addIssueToContext(ctx, {
              code: ZodIssueCode.too_small,
              minimum: check.value,
              type: "string",
              inclusive: true,
              exact: true,
              message: check.message
            });
          }
          status.dirty();
        }
      } else if (check.kind === "email") {
        if (!emailRegex.test(input.data)) {
          ctx = this._getOrReturnCtx(input, ctx);
          addIssueToContext(ctx, {
            validation: "email",
            code: ZodIssueCode.invalid_string,
            message: check.message
          });
          status.dirty();
        }
      } else if (check.kind === "emoji") {
        if (!emojiRegex) {
          emojiRegex = new RegExp(_emojiRegex, "u");
        }
        if (!emojiRegex.test(input.data)) {
          ctx = this._getOrReturnCtx(input, ctx);
          addIssueToContext(ctx, {
            validation: "emoji",
            code: ZodIssueCode.invalid_string,
            message: check.message
          });
          status.dirty();
        }
      } else if (check.kind === "uuid") {
        if (!uuidRegex.test(input.data)) {
          ctx = this._getOrReturnCtx(input, ctx);
          addIssueToContext(ctx, {
            validation: "uuid",
            code: ZodIssueCode.invalid_string,
            message: check.message
          });
          status.dirty();
        }
      } else if (check.kind === "nanoid") {
        if (!nanoidRegex.test(input.data)) {
          ctx = this._getOrReturnCtx(input, ctx);
          addIssueToContext(ctx, {
            validation: "nanoid",
            code: ZodIssueCode.invalid_string,
            message: check.message
          });
          status.dirty();
        }
      } else if (check.kind === "cuid") {
        if (!cuidRegex.test(input.data)) {
          ctx = this._getOrReturnCtx(input, ctx);
          addIssueToContext(ctx, {
            validation: "cuid",
            code: ZodIssueCode.invalid_string,
            message: check.message
          });
          status.dirty();
        }
      } else if (check.kind === "cuid2") {
        if (!cuid2Regex.test(input.data)) {
          ctx = this._getOrReturnCtx(input, ctx);
          addIssueToContext(ctx, {
            validation: "cuid2",
            code: ZodIssueCode.invalid_string,
            message: check.message
          });
          status.dirty();
        }
      } else if (check.kind === "ulid") {
        if (!ulidRegex.test(input.data)) {
          ctx = this._getOrReturnCtx(input, ctx);
          addIssueToContext(ctx, {
            validation: "ulid",
            code: ZodIssueCode.invalid_string,
            message: check.message
          });
          status.dirty();
        }
      } else if (check.kind === "url") {
        try {
          new URL(input.data);
        } catch {
          ctx = this._getOrReturnCtx(input, ctx);
          addIssueToContext(ctx, {
            validation: "url",
            code: ZodIssueCode.invalid_string,
            message: check.message
          });
          status.dirty();
        }
      } else if (check.kind === "regex") {
        check.regex.lastIndex = 0;
        const testResult = check.regex.test(input.data);
        if (!testResult) {
          ctx = this._getOrReturnCtx(input, ctx);
          addIssueToContext(ctx, {
            validation: "regex",
            code: ZodIssueCode.invalid_string,
            message: check.message
          });
          status.dirty();
        }
      } else if (check.kind === "trim") {
        input.data = input.data.trim();
      } else if (check.kind === "includes") {
        if (!input.data.includes(check.value, check.position)) {
          ctx = this._getOrReturnCtx(input, ctx);
          addIssueToContext(ctx, {
            code: ZodIssueCode.invalid_string,
            validation: { includes: check.value, position: check.position },
            message: check.message
          });
          status.dirty();
        }
      } else if (check.kind === "toLowerCase") {
        input.data = input.data.toLowerCase();
      } else if (check.kind === "toUpperCase") {
        input.data = input.data.toUpperCase();
      } else if (check.kind === "startsWith") {
        if (!input.data.startsWith(check.value)) {
          ctx = this._getOrReturnCtx(input, ctx);
          addIssueToContext(ctx, {
            code: ZodIssueCode.invalid_string,
            validation: { startsWith: check.value },
            message: check.message
          });
          status.dirty();
        }
      } else if (check.kind === "endsWith") {
        if (!input.data.endsWith(check.value)) {
          ctx = this._getOrReturnCtx(input, ctx);
          addIssueToContext(ctx, {
            code: ZodIssueCode.invalid_string,
            validation: { endsWith: check.value },
            message: check.message
          });
          status.dirty();
        }
      } else if (check.kind === "datetime") {
        const regex = datetimeRegex(check);
        if (!regex.test(input.data)) {
          ctx = this._getOrReturnCtx(input, ctx);
          addIssueToContext(ctx, {
            code: ZodIssueCode.invalid_string,
            validation: "datetime",
            message: check.message
          });
          status.dirty();
        }
      } else if (check.kind === "date") {
        const regex = dateRegex;
        if (!regex.test(input.data)) {
          ctx = this._getOrReturnCtx(input, ctx);
          addIssueToContext(ctx, {
            code: ZodIssueCode.invalid_string,
            validation: "date",
            message: check.message
          });
          status.dirty();
        }
      } else if (check.kind === "time") {
        const regex = timeRegex(check);
        if (!regex.test(input.data)) {
          ctx = this._getOrReturnCtx(input, ctx);
          addIssueToContext(ctx, {
            code: ZodIssueCode.invalid_string,
            validation: "time",
            message: check.message
          });
          status.dirty();
        }
      } else if (check.kind === "duration") {
        if (!durationRegex.test(input.data)) {
          ctx = this._getOrReturnCtx(input, ctx);
          addIssueToContext(ctx, {
            validation: "duration",
            code: ZodIssueCode.invalid_string,
            message: check.message
          });
          status.dirty();
        }
      } else if (check.kind === "ip") {
        if (!isValidIP(input.data, check.version)) {
          ctx = this._getOrReturnCtx(input, ctx);
          addIssueToContext(ctx, {
            validation: "ip",
            code: ZodIssueCode.invalid_string,
            message: check.message
          });
          status.dirty();
        }
      } else if (check.kind === "jwt") {
        if (!isValidJWT(input.data, check.alg)) {
          ctx = this._getOrReturnCtx(input, ctx);
          addIssueToContext(ctx, {
            validation: "jwt",
            code: ZodIssueCode.invalid_string,
            message: check.message
          });
          status.dirty();
        }
      } else if (check.kind === "cidr") {
        if (!isValidCidr(input.data, check.version)) {
          ctx = this._getOrReturnCtx(input, ctx);
          addIssueToContext(ctx, {
            validation: "cidr",
            code: ZodIssueCode.invalid_string,
            message: check.message
          });
          status.dirty();
        }
      } else if (check.kind === "base64") {
        if (!base64Regex.test(input.data)) {
          ctx = this._getOrReturnCtx(input, ctx);
          addIssueToContext(ctx, {
            validation: "base64",
            code: ZodIssueCode.invalid_string,
            message: check.message
          });
          status.dirty();
        }
      } else if (check.kind === "base64url") {
        if (!base64urlRegex.test(input.data)) {
          ctx = this._getOrReturnCtx(input, ctx);
          addIssueToContext(ctx, {
            validation: "base64url",
            code: ZodIssueCode.invalid_string,
            message: check.message
          });
          status.dirty();
        }
      } else {
        util.assertNever(check);
      }
    }
    return { status: status.value, value: input.data };
  }
  _regex(regex, validation, message) {
    return this.refinement((data) => regex.test(data), {
      validation,
      code: ZodIssueCode.invalid_string,
      ...errorUtil.errToObj(message)
    });
  }
  _addCheck(check) {
    return new _ZodString({
      ...this._def,
      checks: [...this._def.checks, check]
    });
  }
  email(message) {
    return this._addCheck({ kind: "email", ...errorUtil.errToObj(message) });
  }
  url(message) {
    return this._addCheck({ kind: "url", ...errorUtil.errToObj(message) });
  }
  emoji(message) {
    return this._addCheck({ kind: "emoji", ...errorUtil.errToObj(message) });
  }
  uuid(message) {
    return this._addCheck({ kind: "uuid", ...errorUtil.errToObj(message) });
  }
  nanoid(message) {
    return this._addCheck({ kind: "nanoid", ...errorUtil.errToObj(message) });
  }
  cuid(message) {
    return this._addCheck({ kind: "cuid", ...errorUtil.errToObj(message) });
  }
  cuid2(message) {
    return this._addCheck({ kind: "cuid2", ...errorUtil.errToObj(message) });
  }
  ulid(message) {
    return this._addCheck({ kind: "ulid", ...errorUtil.errToObj(message) });
  }
  base64(message) {
    return this._addCheck({ kind: "base64", ...errorUtil.errToObj(message) });
  }
  base64url(message) {
    return this._addCheck({
      kind: "base64url",
      ...errorUtil.errToObj(message)
    });
  }
  jwt(options) {
    return this._addCheck({ kind: "jwt", ...errorUtil.errToObj(options) });
  }
  ip(options) {
    return this._addCheck({ kind: "ip", ...errorUtil.errToObj(options) });
  }
  cidr(options) {
    return this._addCheck({ kind: "cidr", ...errorUtil.errToObj(options) });
  }
  datetime(options) {
    if (typeof options === "string") {
      return this._addCheck({
        kind: "datetime",
        precision: null,
        offset: false,
        local: false,
        message: options
      });
    }
    return this._addCheck({
      kind: "datetime",
      precision: typeof options?.precision === "undefined" ? null : options?.precision,
      offset: options?.offset ?? false,
      local: options?.local ?? false,
      ...errorUtil.errToObj(options?.message)
    });
  }
  date(message) {
    return this._addCheck({ kind: "date", message });
  }
  time(options) {
    if (typeof options === "string") {
      return this._addCheck({
        kind: "time",
        precision: null,
        message: options
      });
    }
    return this._addCheck({
      kind: "time",
      precision: typeof options?.precision === "undefined" ? null : options?.precision,
      ...errorUtil.errToObj(options?.message)
    });
  }
  duration(message) {
    return this._addCheck({ kind: "duration", ...errorUtil.errToObj(message) });
  }
  regex(regex, message) {
    return this._addCheck({
      kind: "regex",
      regex,
      ...errorUtil.errToObj(message)
    });
  }
  includes(value, options) {
    return this._addCheck({
      kind: "includes",
      value,
      position: options?.position,
      ...errorUtil.errToObj(options?.message)
    });
  }
  startsWith(value, message) {
    return this._addCheck({
      kind: "startsWith",
      value,
      ...errorUtil.errToObj(message)
    });
  }
  endsWith(value, message) {
    return this._addCheck({
      kind: "endsWith",
      value,
      ...errorUtil.errToObj(message)
    });
  }
  min(minLength, message) {
    return this._addCheck({
      kind: "min",
      value: minLength,
      ...errorUtil.errToObj(message)
    });
  }
  max(maxLength, message) {
    return this._addCheck({
      kind: "max",
      value: maxLength,
      ...errorUtil.errToObj(message)
    });
  }
  length(len, message) {
    return this._addCheck({
      kind: "length",
      value: len,
      ...errorUtil.errToObj(message)
    });
  }
  /**
   * Equivalent to `.min(1)`
   */
  nonempty(message) {
    return this.min(1, errorUtil.errToObj(message));
  }
  trim() {
    return new _ZodString({
      ...this._def,
      checks: [...this._def.checks, { kind: "trim" }]
    });
  }
  toLowerCase() {
    return new _ZodString({
      ...this._def,
      checks: [...this._def.checks, { kind: "toLowerCase" }]
    });
  }
  toUpperCase() {
    return new _ZodString({
      ...this._def,
      checks: [...this._def.checks, { kind: "toUpperCase" }]
    });
  }
  get isDatetime() {
    return !!this._def.checks.find((ch) => ch.kind === "datetime");
  }
  get isDate() {
    return !!this._def.checks.find((ch) => ch.kind === "date");
  }
  get isTime() {
    return !!this._def.checks.find((ch) => ch.kind === "time");
  }
  get isDuration() {
    return !!this._def.checks.find((ch) => ch.kind === "duration");
  }
  get isEmail() {
    return !!this._def.checks.find((ch) => ch.kind === "email");
  }
  get isURL() {
    return !!this._def.checks.find((ch) => ch.kind === "url");
  }
  get isEmoji() {
    return !!this._def.checks.find((ch) => ch.kind === "emoji");
  }
  get isUUID() {
    return !!this._def.checks.find((ch) => ch.kind === "uuid");
  }
  get isNANOID() {
    return !!this._def.checks.find((ch) => ch.kind === "nanoid");
  }
  get isCUID() {
    return !!this._def.checks.find((ch) => ch.kind === "cuid");
  }
  get isCUID2() {
    return !!this._def.checks.find((ch) => ch.kind === "cuid2");
  }
  get isULID() {
    return !!this._def.checks.find((ch) => ch.kind === "ulid");
  }
  get isIP() {
    return !!this._def.checks.find((ch) => ch.kind === "ip");
  }
  get isCIDR() {
    return !!this._def.checks.find((ch) => ch.kind === "cidr");
  }
  get isBase64() {
    return !!this._def.checks.find((ch) => ch.kind === "base64");
  }
  get isBase64url() {
    return !!this._def.checks.find((ch) => ch.kind === "base64url");
  }
  get minLength() {
    let min = null;
    for (const ch of this._def.checks) {
      if (ch.kind === "min") {
        if (min === null || ch.value > min)
          min = ch.value;
      }
    }
    return min;
  }
  get maxLength() {
    let max = null;
    for (const ch of this._def.checks) {
      if (ch.kind === "max") {
        if (max === null || ch.value < max)
          max = ch.value;
      }
    }
    return max;
  }
};
ZodString.create = (params) => {
  return new ZodString({
    checks: [],
    typeName: ZodFirstPartyTypeKind.ZodString,
    coerce: params?.coerce ?? false,
    ...processCreateParams(params)
  });
};
function floatSafeRemainder(val, step) {
  const valDecCount = (val.toString().split(".")[1] || "").length;
  const stepDecCount = (step.toString().split(".")[1] || "").length;
  const decCount = valDecCount > stepDecCount ? valDecCount : stepDecCount;
  const valInt = Number.parseInt(val.toFixed(decCount).replace(".", ""));
  const stepInt = Number.parseInt(step.toFixed(decCount).replace(".", ""));
  return valInt % stepInt / 10 ** decCount;
}
__name(floatSafeRemainder, "floatSafeRemainder");
var ZodNumber = class _ZodNumber extends ZodType {
  static {
    __name(this, "ZodNumber");
  }
  constructor() {
    super(...arguments);
    this.min = this.gte;
    this.max = this.lte;
    this.step = this.multipleOf;
  }
  _parse(input) {
    if (this._def.coerce) {
      input.data = Number(input.data);
    }
    const parsedType = this._getType(input);
    if (parsedType !== ZodParsedType.number) {
      const ctx2 = this._getOrReturnCtx(input);
      addIssueToContext(ctx2, {
        code: ZodIssueCode.invalid_type,
        expected: ZodParsedType.number,
        received: ctx2.parsedType
      });
      return INVALID;
    }
    let ctx = void 0;
    const status = new ParseStatus();
    for (const check of this._def.checks) {
      if (check.kind === "int") {
        if (!util.isInteger(input.data)) {
          ctx = this._getOrReturnCtx(input, ctx);
          addIssueToContext(ctx, {
            code: ZodIssueCode.invalid_type,
            expected: "integer",
            received: "float",
            message: check.message
          });
          status.dirty();
        }
      } else if (check.kind === "min") {
        const tooSmall = check.inclusive ? input.data < check.value : input.data <= check.value;
        if (tooSmall) {
          ctx = this._getOrReturnCtx(input, ctx);
          addIssueToContext(ctx, {
            code: ZodIssueCode.too_small,
            minimum: check.value,
            type: "number",
            inclusive: check.inclusive,
            exact: false,
            message: check.message
          });
          status.dirty();
        }
      } else if (check.kind === "max") {
        const tooBig = check.inclusive ? input.data > check.value : input.data >= check.value;
        if (tooBig) {
          ctx = this._getOrReturnCtx(input, ctx);
          addIssueToContext(ctx, {
            code: ZodIssueCode.too_big,
            maximum: check.value,
            type: "number",
            inclusive: check.inclusive,
            exact: false,
            message: check.message
          });
          status.dirty();
        }
      } else if (check.kind === "multipleOf") {
        if (floatSafeRemainder(input.data, check.value) !== 0) {
          ctx = this._getOrReturnCtx(input, ctx);
          addIssueToContext(ctx, {
            code: ZodIssueCode.not_multiple_of,
            multipleOf: check.value,
            message: check.message
          });
          status.dirty();
        }
      } else if (check.kind === "finite") {
        if (!Number.isFinite(input.data)) {
          ctx = this._getOrReturnCtx(input, ctx);
          addIssueToContext(ctx, {
            code: ZodIssueCode.not_finite,
            message: check.message
          });
          status.dirty();
        }
      } else {
        util.assertNever(check);
      }
    }
    return { status: status.value, value: input.data };
  }
  gte(value, message) {
    return this.setLimit("min", value, true, errorUtil.toString(message));
  }
  gt(value, message) {
    return this.setLimit("min", value, false, errorUtil.toString(message));
  }
  lte(value, message) {
    return this.setLimit("max", value, true, errorUtil.toString(message));
  }
  lt(value, message) {
    return this.setLimit("max", value, false, errorUtil.toString(message));
  }
  setLimit(kind, value, inclusive, message) {
    return new _ZodNumber({
      ...this._def,
      checks: [
        ...this._def.checks,
        {
          kind,
          value,
          inclusive,
          message: errorUtil.toString(message)
        }
      ]
    });
  }
  _addCheck(check) {
    return new _ZodNumber({
      ...this._def,
      checks: [...this._def.checks, check]
    });
  }
  int(message) {
    return this._addCheck({
      kind: "int",
      message: errorUtil.toString(message)
    });
  }
  positive(message) {
    return this._addCheck({
      kind: "min",
      value: 0,
      inclusive: false,
      message: errorUtil.toString(message)
    });
  }
  negative(message) {
    return this._addCheck({
      kind: "max",
      value: 0,
      inclusive: false,
      message: errorUtil.toString(message)
    });
  }
  nonpositive(message) {
    return this._addCheck({
      kind: "max",
      value: 0,
      inclusive: true,
      message: errorUtil.toString(message)
    });
  }
  nonnegative(message) {
    return this._addCheck({
      kind: "min",
      value: 0,
      inclusive: true,
      message: errorUtil.toString(message)
    });
  }
  multipleOf(value, message) {
    return this._addCheck({
      kind: "multipleOf",
      value,
      message: errorUtil.toString(message)
    });
  }
  finite(message) {
    return this._addCheck({
      kind: "finite",
      message: errorUtil.toString(message)
    });
  }
  safe(message) {
    return this._addCheck({
      kind: "min",
      inclusive: true,
      value: Number.MIN_SAFE_INTEGER,
      message: errorUtil.toString(message)
    })._addCheck({
      kind: "max",
      inclusive: true,
      value: Number.MAX_SAFE_INTEGER,
      message: errorUtil.toString(message)
    });
  }
  get minValue() {
    let min = null;
    for (const ch of this._def.checks) {
      if (ch.kind === "min") {
        if (min === null || ch.value > min)
          min = ch.value;
      }
    }
    return min;
  }
  get maxValue() {
    let max = null;
    for (const ch of this._def.checks) {
      if (ch.kind === "max") {
        if (max === null || ch.value < max)
          max = ch.value;
      }
    }
    return max;
  }
  get isInt() {
    return !!this._def.checks.find((ch) => ch.kind === "int" || ch.kind === "multipleOf" && util.isInteger(ch.value));
  }
  get isFinite() {
    let max = null;
    let min = null;
    for (const ch of this._def.checks) {
      if (ch.kind === "finite" || ch.kind === "int" || ch.kind === "multipleOf") {
        return true;
      } else if (ch.kind === "min") {
        if (min === null || ch.value > min)
          min = ch.value;
      } else if (ch.kind === "max") {
        if (max === null || ch.value < max)
          max = ch.value;
      }
    }
    return Number.isFinite(min) && Number.isFinite(max);
  }
};
ZodNumber.create = (params) => {
  return new ZodNumber({
    checks: [],
    typeName: ZodFirstPartyTypeKind.ZodNumber,
    coerce: params?.coerce || false,
    ...processCreateParams(params)
  });
};
var ZodBigInt = class _ZodBigInt extends ZodType {
  static {
    __name(this, "ZodBigInt");
  }
  constructor() {
    super(...arguments);
    this.min = this.gte;
    this.max = this.lte;
  }
  _parse(input) {
    if (this._def.coerce) {
      try {
        input.data = BigInt(input.data);
      } catch {
        return this._getInvalidInput(input);
      }
    }
    const parsedType = this._getType(input);
    if (parsedType !== ZodParsedType.bigint) {
      return this._getInvalidInput(input);
    }
    let ctx = void 0;
    const status = new ParseStatus();
    for (const check of this._def.checks) {
      if (check.kind === "min") {
        const tooSmall = check.inclusive ? input.data < check.value : input.data <= check.value;
        if (tooSmall) {
          ctx = this._getOrReturnCtx(input, ctx);
          addIssueToContext(ctx, {
            code: ZodIssueCode.too_small,
            type: "bigint",
            minimum: check.value,
            inclusive: check.inclusive,
            message: check.message
          });
          status.dirty();
        }
      } else if (check.kind === "max") {
        const tooBig = check.inclusive ? input.data > check.value : input.data >= check.value;
        if (tooBig) {
          ctx = this._getOrReturnCtx(input, ctx);
          addIssueToContext(ctx, {
            code: ZodIssueCode.too_big,
            type: "bigint",
            maximum: check.value,
            inclusive: check.inclusive,
            message: check.message
          });
          status.dirty();
        }
      } else if (check.kind === "multipleOf") {
        if (input.data % check.value !== BigInt(0)) {
          ctx = this._getOrReturnCtx(input, ctx);
          addIssueToContext(ctx, {
            code: ZodIssueCode.not_multiple_of,
            multipleOf: check.value,
            message: check.message
          });
          status.dirty();
        }
      } else {
        util.assertNever(check);
      }
    }
    return { status: status.value, value: input.data };
  }
  _getInvalidInput(input) {
    const ctx = this._getOrReturnCtx(input);
    addIssueToContext(ctx, {
      code: ZodIssueCode.invalid_type,
      expected: ZodParsedType.bigint,
      received: ctx.parsedType
    });
    return INVALID;
  }
  gte(value, message) {
    return this.setLimit("min", value, true, errorUtil.toString(message));
  }
  gt(value, message) {
    return this.setLimit("min", value, false, errorUtil.toString(message));
  }
  lte(value, message) {
    return this.setLimit("max", value, true, errorUtil.toString(message));
  }
  lt(value, message) {
    return this.setLimit("max", value, false, errorUtil.toString(message));
  }
  setLimit(kind, value, inclusive, message) {
    return new _ZodBigInt({
      ...this._def,
      checks: [
        ...this._def.checks,
        {
          kind,
          value,
          inclusive,
          message: errorUtil.toString(message)
        }
      ]
    });
  }
  _addCheck(check) {
    return new _ZodBigInt({
      ...this._def,
      checks: [...this._def.checks, check]
    });
  }
  positive(message) {
    return this._addCheck({
      kind: "min",
      value: BigInt(0),
      inclusive: false,
      message: errorUtil.toString(message)
    });
  }
  negative(message) {
    return this._addCheck({
      kind: "max",
      value: BigInt(0),
      inclusive: false,
      message: errorUtil.toString(message)
    });
  }
  nonpositive(message) {
    return this._addCheck({
      kind: "max",
      value: BigInt(0),
      inclusive: true,
      message: errorUtil.toString(message)
    });
  }
  nonnegative(message) {
    return this._addCheck({
      kind: "min",
      value: BigInt(0),
      inclusive: true,
      message: errorUtil.toString(message)
    });
  }
  multipleOf(value, message) {
    return this._addCheck({
      kind: "multipleOf",
      value,
      message: errorUtil.toString(message)
    });
  }
  get minValue() {
    let min = null;
    for (const ch of this._def.checks) {
      if (ch.kind === "min") {
        if (min === null || ch.value > min)
          min = ch.value;
      }
    }
    return min;
  }
  get maxValue() {
    let max = null;
    for (const ch of this._def.checks) {
      if (ch.kind === "max") {
        if (max === null || ch.value < max)
          max = ch.value;
      }
    }
    return max;
  }
};
ZodBigInt.create = (params) => {
  return new ZodBigInt({
    checks: [],
    typeName: ZodFirstPartyTypeKind.ZodBigInt,
    coerce: params?.coerce ?? false,
    ...processCreateParams(params)
  });
};
var ZodBoolean = class extends ZodType {
  static {
    __name(this, "ZodBoolean");
  }
  _parse(input) {
    if (this._def.coerce) {
      input.data = Boolean(input.data);
    }
    const parsedType = this._getType(input);
    if (parsedType !== ZodParsedType.boolean) {
      const ctx = this._getOrReturnCtx(input);
      addIssueToContext(ctx, {
        code: ZodIssueCode.invalid_type,
        expected: ZodParsedType.boolean,
        received: ctx.parsedType
      });
      return INVALID;
    }
    return OK(input.data);
  }
};
ZodBoolean.create = (params) => {
  return new ZodBoolean({
    typeName: ZodFirstPartyTypeKind.ZodBoolean,
    coerce: params?.coerce || false,
    ...processCreateParams(params)
  });
};
var ZodDate = class _ZodDate extends ZodType {
  static {
    __name(this, "ZodDate");
  }
  _parse(input) {
    if (this._def.coerce) {
      input.data = new Date(input.data);
    }
    const parsedType = this._getType(input);
    if (parsedType !== ZodParsedType.date) {
      const ctx2 = this._getOrReturnCtx(input);
      addIssueToContext(ctx2, {
        code: ZodIssueCode.invalid_type,
        expected: ZodParsedType.date,
        received: ctx2.parsedType
      });
      return INVALID;
    }
    if (Number.isNaN(input.data.getTime())) {
      const ctx2 = this._getOrReturnCtx(input);
      addIssueToContext(ctx2, {
        code: ZodIssueCode.invalid_date
      });
      return INVALID;
    }
    const status = new ParseStatus();
    let ctx = void 0;
    for (const check of this._def.checks) {
      if (check.kind === "min") {
        if (input.data.getTime() < check.value) {
          ctx = this._getOrReturnCtx(input, ctx);
          addIssueToContext(ctx, {
            code: ZodIssueCode.too_small,
            message: check.message,
            inclusive: true,
            exact: false,
            minimum: check.value,
            type: "date"
          });
          status.dirty();
        }
      } else if (check.kind === "max") {
        if (input.data.getTime() > check.value) {
          ctx = this._getOrReturnCtx(input, ctx);
          addIssueToContext(ctx, {
            code: ZodIssueCode.too_big,
            message: check.message,
            inclusive: true,
            exact: false,
            maximum: check.value,
            type: "date"
          });
          status.dirty();
        }
      } else {
        util.assertNever(check);
      }
    }
    return {
      status: status.value,
      value: new Date(input.data.getTime())
    };
  }
  _addCheck(check) {
    return new _ZodDate({
      ...this._def,
      checks: [...this._def.checks, check]
    });
  }
  min(minDate, message) {
    return this._addCheck({
      kind: "min",
      value: minDate.getTime(),
      message: errorUtil.toString(message)
    });
  }
  max(maxDate, message) {
    return this._addCheck({
      kind: "max",
      value: maxDate.getTime(),
      message: errorUtil.toString(message)
    });
  }
  get minDate() {
    let min = null;
    for (const ch of this._def.checks) {
      if (ch.kind === "min") {
        if (min === null || ch.value > min)
          min = ch.value;
      }
    }
    return min != null ? new Date(min) : null;
  }
  get maxDate() {
    let max = null;
    for (const ch of this._def.checks) {
      if (ch.kind === "max") {
        if (max === null || ch.value < max)
          max = ch.value;
      }
    }
    return max != null ? new Date(max) : null;
  }
};
ZodDate.create = (params) => {
  return new ZodDate({
    checks: [],
    coerce: params?.coerce || false,
    typeName: ZodFirstPartyTypeKind.ZodDate,
    ...processCreateParams(params)
  });
};
var ZodSymbol = class extends ZodType {
  static {
    __name(this, "ZodSymbol");
  }
  _parse(input) {
    const parsedType = this._getType(input);
    if (parsedType !== ZodParsedType.symbol) {
      const ctx = this._getOrReturnCtx(input);
      addIssueToContext(ctx, {
        code: ZodIssueCode.invalid_type,
        expected: ZodParsedType.symbol,
        received: ctx.parsedType
      });
      return INVALID;
    }
    return OK(input.data);
  }
};
ZodSymbol.create = (params) => {
  return new ZodSymbol({
    typeName: ZodFirstPartyTypeKind.ZodSymbol,
    ...processCreateParams(params)
  });
};
var ZodUndefined = class extends ZodType {
  static {
    __name(this, "ZodUndefined");
  }
  _parse(input) {
    const parsedType = this._getType(input);
    if (parsedType !== ZodParsedType.undefined) {
      const ctx = this._getOrReturnCtx(input);
      addIssueToContext(ctx, {
        code: ZodIssueCode.invalid_type,
        expected: ZodParsedType.undefined,
        received: ctx.parsedType
      });
      return INVALID;
    }
    return OK(input.data);
  }
};
ZodUndefined.create = (params) => {
  return new ZodUndefined({
    typeName: ZodFirstPartyTypeKind.ZodUndefined,
    ...processCreateParams(params)
  });
};
var ZodNull = class extends ZodType {
  static {
    __name(this, "ZodNull");
  }
  _parse(input) {
    const parsedType = this._getType(input);
    if (parsedType !== ZodParsedType.null) {
      const ctx = this._getOrReturnCtx(input);
      addIssueToContext(ctx, {
        code: ZodIssueCode.invalid_type,
        expected: ZodParsedType.null,
        received: ctx.parsedType
      });
      return INVALID;
    }
    return OK(input.data);
  }
};
ZodNull.create = (params) => {
  return new ZodNull({
    typeName: ZodFirstPartyTypeKind.ZodNull,
    ...processCreateParams(params)
  });
};
var ZodAny = class extends ZodType {
  static {
    __name(this, "ZodAny");
  }
  constructor() {
    super(...arguments);
    this._any = true;
  }
  _parse(input) {
    return OK(input.data);
  }
};
ZodAny.create = (params) => {
  return new ZodAny({
    typeName: ZodFirstPartyTypeKind.ZodAny,
    ...processCreateParams(params)
  });
};
var ZodUnknown = class extends ZodType {
  static {
    __name(this, "ZodUnknown");
  }
  constructor() {
    super(...arguments);
    this._unknown = true;
  }
  _parse(input) {
    return OK(input.data);
  }
};
ZodUnknown.create = (params) => {
  return new ZodUnknown({
    typeName: ZodFirstPartyTypeKind.ZodUnknown,
    ...processCreateParams(params)
  });
};
var ZodNever = class extends ZodType {
  static {
    __name(this, "ZodNever");
  }
  _parse(input) {
    const ctx = this._getOrReturnCtx(input);
    addIssueToContext(ctx, {
      code: ZodIssueCode.invalid_type,
      expected: ZodParsedType.never,
      received: ctx.parsedType
    });
    return INVALID;
  }
};
ZodNever.create = (params) => {
  return new ZodNever({
    typeName: ZodFirstPartyTypeKind.ZodNever,
    ...processCreateParams(params)
  });
};
var ZodVoid = class extends ZodType {
  static {
    __name(this, "ZodVoid");
  }
  _parse(input) {
    const parsedType = this._getType(input);
    if (parsedType !== ZodParsedType.undefined) {
      const ctx = this._getOrReturnCtx(input);
      addIssueToContext(ctx, {
        code: ZodIssueCode.invalid_type,
        expected: ZodParsedType.void,
        received: ctx.parsedType
      });
      return INVALID;
    }
    return OK(input.data);
  }
};
ZodVoid.create = (params) => {
  return new ZodVoid({
    typeName: ZodFirstPartyTypeKind.ZodVoid,
    ...processCreateParams(params)
  });
};
var ZodArray = class _ZodArray extends ZodType {
  static {
    __name(this, "ZodArray");
  }
  _parse(input) {
    const { ctx, status } = this._processInputParams(input);
    const def = this._def;
    if (ctx.parsedType !== ZodParsedType.array) {
      addIssueToContext(ctx, {
        code: ZodIssueCode.invalid_type,
        expected: ZodParsedType.array,
        received: ctx.parsedType
      });
      return INVALID;
    }
    if (def.exactLength !== null) {
      const tooBig = ctx.data.length > def.exactLength.value;
      const tooSmall = ctx.data.length < def.exactLength.value;
      if (tooBig || tooSmall) {
        addIssueToContext(ctx, {
          code: tooBig ? ZodIssueCode.too_big : ZodIssueCode.too_small,
          minimum: tooSmall ? def.exactLength.value : void 0,
          maximum: tooBig ? def.exactLength.value : void 0,
          type: "array",
          inclusive: true,
          exact: true,
          message: def.exactLength.message
        });
        status.dirty();
      }
    }
    if (def.minLength !== null) {
      if (ctx.data.length < def.minLength.value) {
        addIssueToContext(ctx, {
          code: ZodIssueCode.too_small,
          minimum: def.minLength.value,
          type: "array",
          inclusive: true,
          exact: false,
          message: def.minLength.message
        });
        status.dirty();
      }
    }
    if (def.maxLength !== null) {
      if (ctx.data.length > def.maxLength.value) {
        addIssueToContext(ctx, {
          code: ZodIssueCode.too_big,
          maximum: def.maxLength.value,
          type: "array",
          inclusive: true,
          exact: false,
          message: def.maxLength.message
        });
        status.dirty();
      }
    }
    if (ctx.common.async) {
      return Promise.all([...ctx.data].map((item, i) => {
        return def.type._parseAsync(new ParseInputLazyPath(ctx, item, ctx.path, i));
      })).then((result2) => {
        return ParseStatus.mergeArray(status, result2);
      });
    }
    const result = [...ctx.data].map((item, i) => {
      return def.type._parseSync(new ParseInputLazyPath(ctx, item, ctx.path, i));
    });
    return ParseStatus.mergeArray(status, result);
  }
  get element() {
    return this._def.type;
  }
  min(minLength, message) {
    return new _ZodArray({
      ...this._def,
      minLength: { value: minLength, message: errorUtil.toString(message) }
    });
  }
  max(maxLength, message) {
    return new _ZodArray({
      ...this._def,
      maxLength: { value: maxLength, message: errorUtil.toString(message) }
    });
  }
  length(len, message) {
    return new _ZodArray({
      ...this._def,
      exactLength: { value: len, message: errorUtil.toString(message) }
    });
  }
  nonempty(message) {
    return this.min(1, message);
  }
};
ZodArray.create = (schema, params) => {
  return new ZodArray({
    type: schema,
    minLength: null,
    maxLength: null,
    exactLength: null,
    typeName: ZodFirstPartyTypeKind.ZodArray,
    ...processCreateParams(params)
  });
};
function deepPartialify(schema) {
  if (schema instanceof ZodObject) {
    const newShape = {};
    for (const key in schema.shape) {
      const fieldSchema = schema.shape[key];
      newShape[key] = ZodOptional.create(deepPartialify(fieldSchema));
    }
    return new ZodObject({
      ...schema._def,
      shape: /* @__PURE__ */ __name(() => newShape, "shape")
    });
  } else if (schema instanceof ZodArray) {
    return new ZodArray({
      ...schema._def,
      type: deepPartialify(schema.element)
    });
  } else if (schema instanceof ZodOptional) {
    return ZodOptional.create(deepPartialify(schema.unwrap()));
  } else if (schema instanceof ZodNullable) {
    return ZodNullable.create(deepPartialify(schema.unwrap()));
  } else if (schema instanceof ZodTuple) {
    return ZodTuple.create(schema.items.map((item) => deepPartialify(item)));
  } else {
    return schema;
  }
}
__name(deepPartialify, "deepPartialify");
var ZodObject = class _ZodObject extends ZodType {
  static {
    __name(this, "ZodObject");
  }
  constructor() {
    super(...arguments);
    this._cached = null;
    this.nonstrict = this.passthrough;
    this.augment = this.extend;
  }
  _getCached() {
    if (this._cached !== null)
      return this._cached;
    const shape = this._def.shape();
    const keys2 = util.objectKeys(shape);
    this._cached = { shape, keys: keys2 };
    return this._cached;
  }
  _parse(input) {
    const parsedType = this._getType(input);
    if (parsedType !== ZodParsedType.object) {
      const ctx2 = this._getOrReturnCtx(input);
      addIssueToContext(ctx2, {
        code: ZodIssueCode.invalid_type,
        expected: ZodParsedType.object,
        received: ctx2.parsedType
      });
      return INVALID;
    }
    const { status, ctx } = this._processInputParams(input);
    const { shape, keys: shapeKeys } = this._getCached();
    const extraKeys = [];
    if (!(this._def.catchall instanceof ZodNever && this._def.unknownKeys === "strip")) {
      for (const key in ctx.data) {
        if (!shapeKeys.includes(key)) {
          extraKeys.push(key);
        }
      }
    }
    const pairs = [];
    for (const key of shapeKeys) {
      const keyValidator = shape[key];
      const value = ctx.data[key];
      pairs.push({
        key: { status: "valid", value: key },
        value: keyValidator._parse(new ParseInputLazyPath(ctx, value, ctx.path, key)),
        alwaysSet: key in ctx.data
      });
    }
    if (this._def.catchall instanceof ZodNever) {
      const unknownKeys = this._def.unknownKeys;
      if (unknownKeys === "passthrough") {
        for (const key of extraKeys) {
          pairs.push({
            key: { status: "valid", value: key },
            value: { status: "valid", value: ctx.data[key] }
          });
        }
      } else if (unknownKeys === "strict") {
        if (extraKeys.length > 0) {
          addIssueToContext(ctx, {
            code: ZodIssueCode.unrecognized_keys,
            keys: extraKeys
          });
          status.dirty();
        }
      } else if (unknownKeys === "strip") {
      } else {
        throw new Error(`Internal ZodObject error: invalid unknownKeys value.`);
      }
    } else {
      const catchall = this._def.catchall;
      for (const key of extraKeys) {
        const value = ctx.data[key];
        pairs.push({
          key: { status: "valid", value: key },
          value: catchall._parse(
            new ParseInputLazyPath(ctx, value, ctx.path, key)
            //, ctx.child(key), value, getParsedType(value)
          ),
          alwaysSet: key in ctx.data
        });
      }
    }
    if (ctx.common.async) {
      return Promise.resolve().then(async () => {
        const syncPairs = [];
        for (const pair of pairs) {
          const key = await pair.key;
          const value = await pair.value;
          syncPairs.push({
            key,
            value,
            alwaysSet: pair.alwaysSet
          });
        }
        return syncPairs;
      }).then((syncPairs) => {
        return ParseStatus.mergeObjectSync(status, syncPairs);
      });
    } else {
      return ParseStatus.mergeObjectSync(status, pairs);
    }
  }
  get shape() {
    return this._def.shape();
  }
  strict(message) {
    errorUtil.errToObj;
    return new _ZodObject({
      ...this._def,
      unknownKeys: "strict",
      ...message !== void 0 ? {
        errorMap: /* @__PURE__ */ __name((issue, ctx) => {
          const defaultError = this._def.errorMap?.(issue, ctx).message ?? ctx.defaultError;
          if (issue.code === "unrecognized_keys")
            return {
              message: errorUtil.errToObj(message).message ?? defaultError
            };
          return {
            message: defaultError
          };
        }, "errorMap")
      } : {}
    });
  }
  strip() {
    return new _ZodObject({
      ...this._def,
      unknownKeys: "strip"
    });
  }
  passthrough() {
    return new _ZodObject({
      ...this._def,
      unknownKeys: "passthrough"
    });
  }
  // const AugmentFactory =
  //   <Def extends ZodObjectDef>(def: Def) =>
  //   <Augmentation extends ZodRawShape>(
  //     augmentation: Augmentation
  //   ): ZodObject<
  //     extendShape<ReturnType<Def["shape"]>, Augmentation>,
  //     Def["unknownKeys"],
  //     Def["catchall"]
  //   > => {
  //     return new ZodObject({
  //       ...def,
  //       shape: () => ({
  //         ...def.shape(),
  //         ...augmentation,
  //       }),
  //     }) as any;
  //   };
  extend(augmentation) {
    return new _ZodObject({
      ...this._def,
      shape: /* @__PURE__ */ __name(() => ({
        ...this._def.shape(),
        ...augmentation
      }), "shape")
    });
  }
  /**
   * Prior to zod@1.0.12 there was a bug in the
   * inferred type of merged objects. Please
   * upgrade if you are experiencing issues.
   */
  merge(merging) {
    const merged = new _ZodObject({
      unknownKeys: merging._def.unknownKeys,
      catchall: merging._def.catchall,
      shape: /* @__PURE__ */ __name(() => ({
        ...this._def.shape(),
        ...merging._def.shape()
      }), "shape"),
      typeName: ZodFirstPartyTypeKind.ZodObject
    });
    return merged;
  }
  // merge<
  //   Incoming extends AnyZodObject,
  //   Augmentation extends Incoming["shape"],
  //   NewOutput extends {
  //     [k in keyof Augmentation | keyof Output]: k extends keyof Augmentation
  //       ? Augmentation[k]["_output"]
  //       : k extends keyof Output
  //       ? Output[k]
  //       : never;
  //   },
  //   NewInput extends {
  //     [k in keyof Augmentation | keyof Input]: k extends keyof Augmentation
  //       ? Augmentation[k]["_input"]
  //       : k extends keyof Input
  //       ? Input[k]
  //       : never;
  //   }
  // >(
  //   merging: Incoming
  // ): ZodObject<
  //   extendShape<T, ReturnType<Incoming["_def"]["shape"]>>,
  //   Incoming["_def"]["unknownKeys"],
  //   Incoming["_def"]["catchall"],
  //   NewOutput,
  //   NewInput
  // > {
  //   const merged: any = new ZodObject({
  //     unknownKeys: merging._def.unknownKeys,
  //     catchall: merging._def.catchall,
  //     shape: () =>
  //       objectUtil.mergeShapes(this._def.shape(), merging._def.shape()),
  //     typeName: ZodFirstPartyTypeKind.ZodObject,
  //   }) as any;
  //   return merged;
  // }
  setKey(key, schema) {
    return this.augment({ [key]: schema });
  }
  // merge<Incoming extends AnyZodObject>(
  //   merging: Incoming
  // ): //ZodObject<T & Incoming["_shape"], UnknownKeys, Catchall> = (merging) => {
  // ZodObject<
  //   extendShape<T, ReturnType<Incoming["_def"]["shape"]>>,
  //   Incoming["_def"]["unknownKeys"],
  //   Incoming["_def"]["catchall"]
  // > {
  //   // const mergedShape = objectUtil.mergeShapes(
  //   //   this._def.shape(),
  //   //   merging._def.shape()
  //   // );
  //   const merged: any = new ZodObject({
  //     unknownKeys: merging._def.unknownKeys,
  //     catchall: merging._def.catchall,
  //     shape: () =>
  //       objectUtil.mergeShapes(this._def.shape(), merging._def.shape()),
  //     typeName: ZodFirstPartyTypeKind.ZodObject,
  //   }) as any;
  //   return merged;
  // }
  catchall(index) {
    return new _ZodObject({
      ...this._def,
      catchall: index
    });
  }
  pick(mask) {
    const shape = {};
    for (const key of util.objectKeys(mask)) {
      if (mask[key] && this.shape[key]) {
        shape[key] = this.shape[key];
      }
    }
    return new _ZodObject({
      ...this._def,
      shape: /* @__PURE__ */ __name(() => shape, "shape")
    });
  }
  omit(mask) {
    const shape = {};
    for (const key of util.objectKeys(this.shape)) {
      if (!mask[key]) {
        shape[key] = this.shape[key];
      }
    }
    return new _ZodObject({
      ...this._def,
      shape: /* @__PURE__ */ __name(() => shape, "shape")
    });
  }
  /**
   * @deprecated
   */
  deepPartial() {
    return deepPartialify(this);
  }
  partial(mask) {
    const newShape = {};
    for (const key of util.objectKeys(this.shape)) {
      const fieldSchema = this.shape[key];
      if (mask && !mask[key]) {
        newShape[key] = fieldSchema;
      } else {
        newShape[key] = fieldSchema.optional();
      }
    }
    return new _ZodObject({
      ...this._def,
      shape: /* @__PURE__ */ __name(() => newShape, "shape")
    });
  }
  required(mask) {
    const newShape = {};
    for (const key of util.objectKeys(this.shape)) {
      if (mask && !mask[key]) {
        newShape[key] = this.shape[key];
      } else {
        const fieldSchema = this.shape[key];
        let newField = fieldSchema;
        while (newField instanceof ZodOptional) {
          newField = newField._def.innerType;
        }
        newShape[key] = newField;
      }
    }
    return new _ZodObject({
      ...this._def,
      shape: /* @__PURE__ */ __name(() => newShape, "shape")
    });
  }
  keyof() {
    return createZodEnum(util.objectKeys(this.shape));
  }
};
ZodObject.create = (shape, params) => {
  return new ZodObject({
    shape: /* @__PURE__ */ __name(() => shape, "shape"),
    unknownKeys: "strip",
    catchall: ZodNever.create(),
    typeName: ZodFirstPartyTypeKind.ZodObject,
    ...processCreateParams(params)
  });
};
ZodObject.strictCreate = (shape, params) => {
  return new ZodObject({
    shape: /* @__PURE__ */ __name(() => shape, "shape"),
    unknownKeys: "strict",
    catchall: ZodNever.create(),
    typeName: ZodFirstPartyTypeKind.ZodObject,
    ...processCreateParams(params)
  });
};
ZodObject.lazycreate = (shape, params) => {
  return new ZodObject({
    shape,
    unknownKeys: "strip",
    catchall: ZodNever.create(),
    typeName: ZodFirstPartyTypeKind.ZodObject,
    ...processCreateParams(params)
  });
};
var ZodUnion = class extends ZodType {
  static {
    __name(this, "ZodUnion");
  }
  _parse(input) {
    const { ctx } = this._processInputParams(input);
    const options = this._def.options;
    function handleResults(results) {
      for (const result of results) {
        if (result.result.status === "valid") {
          return result.result;
        }
      }
      for (const result of results) {
        if (result.result.status === "dirty") {
          ctx.common.issues.push(...result.ctx.common.issues);
          return result.result;
        }
      }
      const unionErrors = results.map((result) => new ZodError(result.ctx.common.issues));
      addIssueToContext(ctx, {
        code: ZodIssueCode.invalid_union,
        unionErrors
      });
      return INVALID;
    }
    __name(handleResults, "handleResults");
    if (ctx.common.async) {
      return Promise.all(options.map(async (option) => {
        const childCtx = {
          ...ctx,
          common: {
            ...ctx.common,
            issues: []
          },
          parent: null
        };
        return {
          result: await option._parseAsync({
            data: ctx.data,
            path: ctx.path,
            parent: childCtx
          }),
          ctx: childCtx
        };
      })).then(handleResults);
    } else {
      let dirty = void 0;
      const issues = [];
      for (const option of options) {
        const childCtx = {
          ...ctx,
          common: {
            ...ctx.common,
            issues: []
          },
          parent: null
        };
        const result = option._parseSync({
          data: ctx.data,
          path: ctx.path,
          parent: childCtx
        });
        if (result.status === "valid") {
          return result;
        } else if (result.status === "dirty" && !dirty) {
          dirty = { result, ctx: childCtx };
        }
        if (childCtx.common.issues.length) {
          issues.push(childCtx.common.issues);
        }
      }
      if (dirty) {
        ctx.common.issues.push(...dirty.ctx.common.issues);
        return dirty.result;
      }
      const unionErrors = issues.map((issues2) => new ZodError(issues2));
      addIssueToContext(ctx, {
        code: ZodIssueCode.invalid_union,
        unionErrors
      });
      return INVALID;
    }
  }
  get options() {
    return this._def.options;
  }
};
ZodUnion.create = (types, params) => {
  return new ZodUnion({
    options: types,
    typeName: ZodFirstPartyTypeKind.ZodUnion,
    ...processCreateParams(params)
  });
};
var getDiscriminator = /* @__PURE__ */ __name((type) => {
  if (type instanceof ZodLazy) {
    return getDiscriminator(type.schema);
  } else if (type instanceof ZodEffects) {
    return getDiscriminator(type.innerType());
  } else if (type instanceof ZodLiteral) {
    return [type.value];
  } else if (type instanceof ZodEnum) {
    return type.options;
  } else if (type instanceof ZodNativeEnum) {
    return util.objectValues(type.enum);
  } else if (type instanceof ZodDefault) {
    return getDiscriminator(type._def.innerType);
  } else if (type instanceof ZodUndefined) {
    return [void 0];
  } else if (type instanceof ZodNull) {
    return [null];
  } else if (type instanceof ZodOptional) {
    return [void 0, ...getDiscriminator(type.unwrap())];
  } else if (type instanceof ZodNullable) {
    return [null, ...getDiscriminator(type.unwrap())];
  } else if (type instanceof ZodBranded) {
    return getDiscriminator(type.unwrap());
  } else if (type instanceof ZodReadonly) {
    return getDiscriminator(type.unwrap());
  } else if (type instanceof ZodCatch) {
    return getDiscriminator(type._def.innerType);
  } else {
    return [];
  }
}, "getDiscriminator");
var ZodDiscriminatedUnion = class _ZodDiscriminatedUnion extends ZodType {
  static {
    __name(this, "ZodDiscriminatedUnion");
  }
  _parse(input) {
    const { ctx } = this._processInputParams(input);
    if (ctx.parsedType !== ZodParsedType.object) {
      addIssueToContext(ctx, {
        code: ZodIssueCode.invalid_type,
        expected: ZodParsedType.object,
        received: ctx.parsedType
      });
      return INVALID;
    }
    const discriminator = this.discriminator;
    const discriminatorValue = ctx.data[discriminator];
    const option = this.optionsMap.get(discriminatorValue);
    if (!option) {
      addIssueToContext(ctx, {
        code: ZodIssueCode.invalid_union_discriminator,
        options: Array.from(this.optionsMap.keys()),
        path: [discriminator]
      });
      return INVALID;
    }
    if (ctx.common.async) {
      return option._parseAsync({
        data: ctx.data,
        path: ctx.path,
        parent: ctx
      });
    } else {
      return option._parseSync({
        data: ctx.data,
        path: ctx.path,
        parent: ctx
      });
    }
  }
  get discriminator() {
    return this._def.discriminator;
  }
  get options() {
    return this._def.options;
  }
  get optionsMap() {
    return this._def.optionsMap;
  }
  /**
   * The constructor of the discriminated union schema. Its behaviour is very similar to that of the normal z.union() constructor.
   * However, it only allows a union of objects, all of which need to share a discriminator property. This property must
   * have a different value for each object in the union.
   * @param discriminator the name of the discriminator property
   * @param types an array of object schemas
   * @param params
   */
  static create(discriminator, options, params) {
    const optionsMap = /* @__PURE__ */ new Map();
    for (const type of options) {
      const discriminatorValues = getDiscriminator(type.shape[discriminator]);
      if (!discriminatorValues.length) {
        throw new Error(`A discriminator value for key \`${discriminator}\` could not be extracted from all schema options`);
      }
      for (const value of discriminatorValues) {
        if (optionsMap.has(value)) {
          throw new Error(`Discriminator property ${String(discriminator)} has duplicate value ${String(value)}`);
        }
        optionsMap.set(value, type);
      }
    }
    return new _ZodDiscriminatedUnion({
      typeName: ZodFirstPartyTypeKind.ZodDiscriminatedUnion,
      discriminator,
      options,
      optionsMap,
      ...processCreateParams(params)
    });
  }
};
function mergeValues(a, b) {
  const aType = getParsedType(a);
  const bType = getParsedType(b);
  if (a === b) {
    return { valid: true, data: a };
  } else if (aType === ZodParsedType.object && bType === ZodParsedType.object) {
    const bKeys = util.objectKeys(b);
    const sharedKeys = util.objectKeys(a).filter((key) => bKeys.indexOf(key) !== -1);
    const newObj = { ...a, ...b };
    for (const key of sharedKeys) {
      const sharedValue = mergeValues(a[key], b[key]);
      if (!sharedValue.valid) {
        return { valid: false };
      }
      newObj[key] = sharedValue.data;
    }
    return { valid: true, data: newObj };
  } else if (aType === ZodParsedType.array && bType === ZodParsedType.array) {
    if (a.length !== b.length) {
      return { valid: false };
    }
    const newArray = [];
    for (let index = 0; index < a.length; index++) {
      const itemA = a[index];
      const itemB = b[index];
      const sharedValue = mergeValues(itemA, itemB);
      if (!sharedValue.valid) {
        return { valid: false };
      }
      newArray.push(sharedValue.data);
    }
    return { valid: true, data: newArray };
  } else if (aType === ZodParsedType.date && bType === ZodParsedType.date && +a === +b) {
    return { valid: true, data: a };
  } else {
    return { valid: false };
  }
}
__name(mergeValues, "mergeValues");
var ZodIntersection = class extends ZodType {
  static {
    __name(this, "ZodIntersection");
  }
  _parse(input) {
    const { status, ctx } = this._processInputParams(input);
    const handleParsed = /* @__PURE__ */ __name((parsedLeft, parsedRight) => {
      if (isAborted(parsedLeft) || isAborted(parsedRight)) {
        return INVALID;
      }
      const merged = mergeValues(parsedLeft.value, parsedRight.value);
      if (!merged.valid) {
        addIssueToContext(ctx, {
          code: ZodIssueCode.invalid_intersection_types
        });
        return INVALID;
      }
      if (isDirty(parsedLeft) || isDirty(parsedRight)) {
        status.dirty();
      }
      return { status: status.value, value: merged.data };
    }, "handleParsed");
    if (ctx.common.async) {
      return Promise.all([
        this._def.left._parseAsync({
          data: ctx.data,
          path: ctx.path,
          parent: ctx
        }),
        this._def.right._parseAsync({
          data: ctx.data,
          path: ctx.path,
          parent: ctx
        })
      ]).then(([left, right]) => handleParsed(left, right));
    } else {
      return handleParsed(this._def.left._parseSync({
        data: ctx.data,
        path: ctx.path,
        parent: ctx
      }), this._def.right._parseSync({
        data: ctx.data,
        path: ctx.path,
        parent: ctx
      }));
    }
  }
};
ZodIntersection.create = (left, right, params) => {
  return new ZodIntersection({
    left,
    right,
    typeName: ZodFirstPartyTypeKind.ZodIntersection,
    ...processCreateParams(params)
  });
};
var ZodTuple = class _ZodTuple extends ZodType {
  static {
    __name(this, "ZodTuple");
  }
  _parse(input) {
    const { status, ctx } = this._processInputParams(input);
    if (ctx.parsedType !== ZodParsedType.array) {
      addIssueToContext(ctx, {
        code: ZodIssueCode.invalid_type,
        expected: ZodParsedType.array,
        received: ctx.parsedType
      });
      return INVALID;
    }
    if (ctx.data.length < this._def.items.length) {
      addIssueToContext(ctx, {
        code: ZodIssueCode.too_small,
        minimum: this._def.items.length,
        inclusive: true,
        exact: false,
        type: "array"
      });
      return INVALID;
    }
    const rest = this._def.rest;
    if (!rest && ctx.data.length > this._def.items.length) {
      addIssueToContext(ctx, {
        code: ZodIssueCode.too_big,
        maximum: this._def.items.length,
        inclusive: true,
        exact: false,
        type: "array"
      });
      status.dirty();
    }
    const items = [...ctx.data].map((item, itemIndex) => {
      const schema = this._def.items[itemIndex] || this._def.rest;
      if (!schema)
        return null;
      return schema._parse(new ParseInputLazyPath(ctx, item, ctx.path, itemIndex));
    }).filter((x) => !!x);
    if (ctx.common.async) {
      return Promise.all(items).then((results) => {
        return ParseStatus.mergeArray(status, results);
      });
    } else {
      return ParseStatus.mergeArray(status, items);
    }
  }
  get items() {
    return this._def.items;
  }
  rest(rest) {
    return new _ZodTuple({
      ...this._def,
      rest
    });
  }
};
ZodTuple.create = (schemas, params) => {
  if (!Array.isArray(schemas)) {
    throw new Error("You must pass an array of schemas to z.tuple([ ... ])");
  }
  return new ZodTuple({
    items: schemas,
    typeName: ZodFirstPartyTypeKind.ZodTuple,
    rest: null,
    ...processCreateParams(params)
  });
};
var ZodRecord = class _ZodRecord extends ZodType {
  static {
    __name(this, "ZodRecord");
  }
  get keySchema() {
    return this._def.keyType;
  }
  get valueSchema() {
    return this._def.valueType;
  }
  _parse(input) {
    const { status, ctx } = this._processInputParams(input);
    if (ctx.parsedType !== ZodParsedType.object) {
      addIssueToContext(ctx, {
        code: ZodIssueCode.invalid_type,
        expected: ZodParsedType.object,
        received: ctx.parsedType
      });
      return INVALID;
    }
    const pairs = [];
    const keyType = this._def.keyType;
    const valueType = this._def.valueType;
    for (const key in ctx.data) {
      pairs.push({
        key: keyType._parse(new ParseInputLazyPath(ctx, key, ctx.path, key)),
        value: valueType._parse(new ParseInputLazyPath(ctx, ctx.data[key], ctx.path, key)),
        alwaysSet: key in ctx.data
      });
    }
    if (ctx.common.async) {
      return ParseStatus.mergeObjectAsync(status, pairs);
    } else {
      return ParseStatus.mergeObjectSync(status, pairs);
    }
  }
  get element() {
    return this._def.valueType;
  }
  static create(first, second, third) {
    if (second instanceof ZodType) {
      return new _ZodRecord({
        keyType: first,
        valueType: second,
        typeName: ZodFirstPartyTypeKind.ZodRecord,
        ...processCreateParams(third)
      });
    }
    return new _ZodRecord({
      keyType: ZodString.create(),
      valueType: first,
      typeName: ZodFirstPartyTypeKind.ZodRecord,
      ...processCreateParams(second)
    });
  }
};
var ZodMap = class extends ZodType {
  static {
    __name(this, "ZodMap");
  }
  get keySchema() {
    return this._def.keyType;
  }
  get valueSchema() {
    return this._def.valueType;
  }
  _parse(input) {
    const { status, ctx } = this._processInputParams(input);
    if (ctx.parsedType !== ZodParsedType.map) {
      addIssueToContext(ctx, {
        code: ZodIssueCode.invalid_type,
        expected: ZodParsedType.map,
        received: ctx.parsedType
      });
      return INVALID;
    }
    const keyType = this._def.keyType;
    const valueType = this._def.valueType;
    const pairs = [...ctx.data.entries()].map(([key, value], index) => {
      return {
        key: keyType._parse(new ParseInputLazyPath(ctx, key, ctx.path, [index, "key"])),
        value: valueType._parse(new ParseInputLazyPath(ctx, value, ctx.path, [index, "value"]))
      };
    });
    if (ctx.common.async) {
      const finalMap = /* @__PURE__ */ new Map();
      return Promise.resolve().then(async () => {
        for (const pair of pairs) {
          const key = await pair.key;
          const value = await pair.value;
          if (key.status === "aborted" || value.status === "aborted") {
            return INVALID;
          }
          if (key.status === "dirty" || value.status === "dirty") {
            status.dirty();
          }
          finalMap.set(key.value, value.value);
        }
        return { status: status.value, value: finalMap };
      });
    } else {
      const finalMap = /* @__PURE__ */ new Map();
      for (const pair of pairs) {
        const key = pair.key;
        const value = pair.value;
        if (key.status === "aborted" || value.status === "aborted") {
          return INVALID;
        }
        if (key.status === "dirty" || value.status === "dirty") {
          status.dirty();
        }
        finalMap.set(key.value, value.value);
      }
      return { status: status.value, value: finalMap };
    }
  }
};
ZodMap.create = (keyType, valueType, params) => {
  return new ZodMap({
    valueType,
    keyType,
    typeName: ZodFirstPartyTypeKind.ZodMap,
    ...processCreateParams(params)
  });
};
var ZodSet = class _ZodSet extends ZodType {
  static {
    __name(this, "ZodSet");
  }
  _parse(input) {
    const { status, ctx } = this._processInputParams(input);
    if (ctx.parsedType !== ZodParsedType.set) {
      addIssueToContext(ctx, {
        code: ZodIssueCode.invalid_type,
        expected: ZodParsedType.set,
        received: ctx.parsedType
      });
      return INVALID;
    }
    const def = this._def;
    if (def.minSize !== null) {
      if (ctx.data.size < def.minSize.value) {
        addIssueToContext(ctx, {
          code: ZodIssueCode.too_small,
          minimum: def.minSize.value,
          type: "set",
          inclusive: true,
          exact: false,
          message: def.minSize.message
        });
        status.dirty();
      }
    }
    if (def.maxSize !== null) {
      if (ctx.data.size > def.maxSize.value) {
        addIssueToContext(ctx, {
          code: ZodIssueCode.too_big,
          maximum: def.maxSize.value,
          type: "set",
          inclusive: true,
          exact: false,
          message: def.maxSize.message
        });
        status.dirty();
      }
    }
    const valueType = this._def.valueType;
    function finalizeSet(elements2) {
      const parsedSet = /* @__PURE__ */ new Set();
      for (const element of elements2) {
        if (element.status === "aborted")
          return INVALID;
        if (element.status === "dirty")
          status.dirty();
        parsedSet.add(element.value);
      }
      return { status: status.value, value: parsedSet };
    }
    __name(finalizeSet, "finalizeSet");
    const elements = [...ctx.data.values()].map((item, i) => valueType._parse(new ParseInputLazyPath(ctx, item, ctx.path, i)));
    if (ctx.common.async) {
      return Promise.all(elements).then((elements2) => finalizeSet(elements2));
    } else {
      return finalizeSet(elements);
    }
  }
  min(minSize, message) {
    return new _ZodSet({
      ...this._def,
      minSize: { value: minSize, message: errorUtil.toString(message) }
    });
  }
  max(maxSize, message) {
    return new _ZodSet({
      ...this._def,
      maxSize: { value: maxSize, message: errorUtil.toString(message) }
    });
  }
  size(size, message) {
    return this.min(size, message).max(size, message);
  }
  nonempty(message) {
    return this.min(1, message);
  }
};
ZodSet.create = (valueType, params) => {
  return new ZodSet({
    valueType,
    minSize: null,
    maxSize: null,
    typeName: ZodFirstPartyTypeKind.ZodSet,
    ...processCreateParams(params)
  });
};
var ZodFunction = class _ZodFunction extends ZodType {
  static {
    __name(this, "ZodFunction");
  }
  constructor() {
    super(...arguments);
    this.validate = this.implement;
  }
  _parse(input) {
    const { ctx } = this._processInputParams(input);
    if (ctx.parsedType !== ZodParsedType.function) {
      addIssueToContext(ctx, {
        code: ZodIssueCode.invalid_type,
        expected: ZodParsedType.function,
        received: ctx.parsedType
      });
      return INVALID;
    }
    function makeArgsIssue(args, error) {
      return makeIssue({
        data: args,
        path: ctx.path,
        errorMaps: [ctx.common.contextualErrorMap, ctx.schemaErrorMap, getErrorMap(), en_default].filter((x) => !!x),
        issueData: {
          code: ZodIssueCode.invalid_arguments,
          argumentsError: error
        }
      });
    }
    __name(makeArgsIssue, "makeArgsIssue");
    function makeReturnsIssue(returns, error) {
      return makeIssue({
        data: returns,
        path: ctx.path,
        errorMaps: [ctx.common.contextualErrorMap, ctx.schemaErrorMap, getErrorMap(), en_default].filter((x) => !!x),
        issueData: {
          code: ZodIssueCode.invalid_return_type,
          returnTypeError: error
        }
      });
    }
    __name(makeReturnsIssue, "makeReturnsIssue");
    const params = { errorMap: ctx.common.contextualErrorMap };
    const fn = ctx.data;
    if (this._def.returns instanceof ZodPromise) {
      const me = this;
      return OK(async function(...args) {
        const error = new ZodError([]);
        const parsedArgs = await me._def.args.parseAsync(args, params).catch((e) => {
          error.addIssue(makeArgsIssue(args, e));
          throw error;
        });
        const result = await Reflect.apply(fn, this, parsedArgs);
        const parsedReturns = await me._def.returns._def.type.parseAsync(result, params).catch((e) => {
          error.addIssue(makeReturnsIssue(result, e));
          throw error;
        });
        return parsedReturns;
      });
    } else {
      const me = this;
      return OK(function(...args) {
        const parsedArgs = me._def.args.safeParse(args, params);
        if (!parsedArgs.success) {
          throw new ZodError([makeArgsIssue(args, parsedArgs.error)]);
        }
        const result = Reflect.apply(fn, this, parsedArgs.data);
        const parsedReturns = me._def.returns.safeParse(result, params);
        if (!parsedReturns.success) {
          throw new ZodError([makeReturnsIssue(result, parsedReturns.error)]);
        }
        return parsedReturns.data;
      });
    }
  }
  parameters() {
    return this._def.args;
  }
  returnType() {
    return this._def.returns;
  }
  args(...items) {
    return new _ZodFunction({
      ...this._def,
      args: ZodTuple.create(items).rest(ZodUnknown.create())
    });
  }
  returns(returnType) {
    return new _ZodFunction({
      ...this._def,
      returns: returnType
    });
  }
  implement(func) {
    const validatedFunc = this.parse(func);
    return validatedFunc;
  }
  strictImplement(func) {
    const validatedFunc = this.parse(func);
    return validatedFunc;
  }
  static create(args, returns, params) {
    return new _ZodFunction({
      args: args ? args : ZodTuple.create([]).rest(ZodUnknown.create()),
      returns: returns || ZodUnknown.create(),
      typeName: ZodFirstPartyTypeKind.ZodFunction,
      ...processCreateParams(params)
    });
  }
};
var ZodLazy = class extends ZodType {
  static {
    __name(this, "ZodLazy");
  }
  get schema() {
    return this._def.getter();
  }
  _parse(input) {
    const { ctx } = this._processInputParams(input);
    const lazySchema = this._def.getter();
    return lazySchema._parse({ data: ctx.data, path: ctx.path, parent: ctx });
  }
};
ZodLazy.create = (getter, params) => {
  return new ZodLazy({
    getter,
    typeName: ZodFirstPartyTypeKind.ZodLazy,
    ...processCreateParams(params)
  });
};
var ZodLiteral = class extends ZodType {
  static {
    __name(this, "ZodLiteral");
  }
  _parse(input) {
    if (input.data !== this._def.value) {
      const ctx = this._getOrReturnCtx(input);
      addIssueToContext(ctx, {
        received: ctx.data,
        code: ZodIssueCode.invalid_literal,
        expected: this._def.value
      });
      return INVALID;
    }
    return { status: "valid", value: input.data };
  }
  get value() {
    return this._def.value;
  }
};
ZodLiteral.create = (value, params) => {
  return new ZodLiteral({
    value,
    typeName: ZodFirstPartyTypeKind.ZodLiteral,
    ...processCreateParams(params)
  });
};
function createZodEnum(values, params) {
  return new ZodEnum({
    values,
    typeName: ZodFirstPartyTypeKind.ZodEnum,
    ...processCreateParams(params)
  });
}
__name(createZodEnum, "createZodEnum");
var ZodEnum = class _ZodEnum extends ZodType {
  static {
    __name(this, "ZodEnum");
  }
  _parse(input) {
    if (typeof input.data !== "string") {
      const ctx = this._getOrReturnCtx(input);
      const expectedValues = this._def.values;
      addIssueToContext(ctx, {
        expected: util.joinValues(expectedValues),
        received: ctx.parsedType,
        code: ZodIssueCode.invalid_type
      });
      return INVALID;
    }
    if (!this._cache) {
      this._cache = new Set(this._def.values);
    }
    if (!this._cache.has(input.data)) {
      const ctx = this._getOrReturnCtx(input);
      const expectedValues = this._def.values;
      addIssueToContext(ctx, {
        received: ctx.data,
        code: ZodIssueCode.invalid_enum_value,
        options: expectedValues
      });
      return INVALID;
    }
    return OK(input.data);
  }
  get options() {
    return this._def.values;
  }
  get enum() {
    const enumValues = {};
    for (const val of this._def.values) {
      enumValues[val] = val;
    }
    return enumValues;
  }
  get Values() {
    const enumValues = {};
    for (const val of this._def.values) {
      enumValues[val] = val;
    }
    return enumValues;
  }
  get Enum() {
    const enumValues = {};
    for (const val of this._def.values) {
      enumValues[val] = val;
    }
    return enumValues;
  }
  extract(values, newDef = this._def) {
    return _ZodEnum.create(values, {
      ...this._def,
      ...newDef
    });
  }
  exclude(values, newDef = this._def) {
    return _ZodEnum.create(this.options.filter((opt) => !values.includes(opt)), {
      ...this._def,
      ...newDef
    });
  }
};
ZodEnum.create = createZodEnum;
var ZodNativeEnum = class extends ZodType {
  static {
    __name(this, "ZodNativeEnum");
  }
  _parse(input) {
    const nativeEnumValues = util.getValidEnumValues(this._def.values);
    const ctx = this._getOrReturnCtx(input);
    if (ctx.parsedType !== ZodParsedType.string && ctx.parsedType !== ZodParsedType.number) {
      const expectedValues = util.objectValues(nativeEnumValues);
      addIssueToContext(ctx, {
        expected: util.joinValues(expectedValues),
        received: ctx.parsedType,
        code: ZodIssueCode.invalid_type
      });
      return INVALID;
    }
    if (!this._cache) {
      this._cache = new Set(util.getValidEnumValues(this._def.values));
    }
    if (!this._cache.has(input.data)) {
      const expectedValues = util.objectValues(nativeEnumValues);
      addIssueToContext(ctx, {
        received: ctx.data,
        code: ZodIssueCode.invalid_enum_value,
        options: expectedValues
      });
      return INVALID;
    }
    return OK(input.data);
  }
  get enum() {
    return this._def.values;
  }
};
ZodNativeEnum.create = (values, params) => {
  return new ZodNativeEnum({
    values,
    typeName: ZodFirstPartyTypeKind.ZodNativeEnum,
    ...processCreateParams(params)
  });
};
var ZodPromise = class extends ZodType {
  static {
    __name(this, "ZodPromise");
  }
  unwrap() {
    return this._def.type;
  }
  _parse(input) {
    const { ctx } = this._processInputParams(input);
    if (ctx.parsedType !== ZodParsedType.promise && ctx.common.async === false) {
      addIssueToContext(ctx, {
        code: ZodIssueCode.invalid_type,
        expected: ZodParsedType.promise,
        received: ctx.parsedType
      });
      return INVALID;
    }
    const promisified = ctx.parsedType === ZodParsedType.promise ? ctx.data : Promise.resolve(ctx.data);
    return OK(promisified.then((data) => {
      return this._def.type.parseAsync(data, {
        path: ctx.path,
        errorMap: ctx.common.contextualErrorMap
      });
    }));
  }
};
ZodPromise.create = (schema, params) => {
  return new ZodPromise({
    type: schema,
    typeName: ZodFirstPartyTypeKind.ZodPromise,
    ...processCreateParams(params)
  });
};
var ZodEffects = class extends ZodType {
  static {
    __name(this, "ZodEffects");
  }
  innerType() {
    return this._def.schema;
  }
  sourceType() {
    return this._def.schema._def.typeName === ZodFirstPartyTypeKind.ZodEffects ? this._def.schema.sourceType() : this._def.schema;
  }
  _parse(input) {
    const { status, ctx } = this._processInputParams(input);
    const effect = this._def.effect || null;
    const checkCtx = {
      addIssue: /* @__PURE__ */ __name((arg) => {
        addIssueToContext(ctx, arg);
        if (arg.fatal) {
          status.abort();
        } else {
          status.dirty();
        }
      }, "addIssue"),
      get path() {
        return ctx.path;
      }
    };
    checkCtx.addIssue = checkCtx.addIssue.bind(checkCtx);
    if (effect.type === "preprocess") {
      const processed = effect.transform(ctx.data, checkCtx);
      if (ctx.common.async) {
        return Promise.resolve(processed).then(async (processed2) => {
          if (status.value === "aborted")
            return INVALID;
          const result = await this._def.schema._parseAsync({
            data: processed2,
            path: ctx.path,
            parent: ctx
          });
          if (result.status === "aborted")
            return INVALID;
          if (result.status === "dirty")
            return DIRTY(result.value);
          if (status.value === "dirty")
            return DIRTY(result.value);
          return result;
        });
      } else {
        if (status.value === "aborted")
          return INVALID;
        const result = this._def.schema._parseSync({
          data: processed,
          path: ctx.path,
          parent: ctx
        });
        if (result.status === "aborted")
          return INVALID;
        if (result.status === "dirty")
          return DIRTY(result.value);
        if (status.value === "dirty")
          return DIRTY(result.value);
        return result;
      }
    }
    if (effect.type === "refinement") {
      const executeRefinement = /* @__PURE__ */ __name((acc) => {
        const result = effect.refinement(acc, checkCtx);
        if (ctx.common.async) {
          return Promise.resolve(result);
        }
        if (result instanceof Promise) {
          throw new Error("Async refinement encountered during synchronous parse operation. Use .parseAsync instead.");
        }
        return acc;
      }, "executeRefinement");
      if (ctx.common.async === false) {
        const inner = this._def.schema._parseSync({
          data: ctx.data,
          path: ctx.path,
          parent: ctx
        });
        if (inner.status === "aborted")
          return INVALID;
        if (inner.status === "dirty")
          status.dirty();
        executeRefinement(inner.value);
        return { status: status.value, value: inner.value };
      } else {
        return this._def.schema._parseAsync({ data: ctx.data, path: ctx.path, parent: ctx }).then((inner) => {
          if (inner.status === "aborted")
            return INVALID;
          if (inner.status === "dirty")
            status.dirty();
          return executeRefinement(inner.value).then(() => {
            return { status: status.value, value: inner.value };
          });
        });
      }
    }
    if (effect.type === "transform") {
      if (ctx.common.async === false) {
        const base = this._def.schema._parseSync({
          data: ctx.data,
          path: ctx.path,
          parent: ctx
        });
        if (!isValid(base))
          return INVALID;
        const result = effect.transform(base.value, checkCtx);
        if (result instanceof Promise) {
          throw new Error(`Asynchronous transform encountered during synchronous parse operation. Use .parseAsync instead.`);
        }
        return { status: status.value, value: result };
      } else {
        return this._def.schema._parseAsync({ data: ctx.data, path: ctx.path, parent: ctx }).then((base) => {
          if (!isValid(base))
            return INVALID;
          return Promise.resolve(effect.transform(base.value, checkCtx)).then((result) => ({
            status: status.value,
            value: result
          }));
        });
      }
    }
    util.assertNever(effect);
  }
};
ZodEffects.create = (schema, effect, params) => {
  return new ZodEffects({
    schema,
    typeName: ZodFirstPartyTypeKind.ZodEffects,
    effect,
    ...processCreateParams(params)
  });
};
ZodEffects.createWithPreprocess = (preprocess, schema, params) => {
  return new ZodEffects({
    schema,
    effect: { type: "preprocess", transform: preprocess },
    typeName: ZodFirstPartyTypeKind.ZodEffects,
    ...processCreateParams(params)
  });
};
var ZodOptional = class extends ZodType {
  static {
    __name(this, "ZodOptional");
  }
  _parse(input) {
    const parsedType = this._getType(input);
    if (parsedType === ZodParsedType.undefined) {
      return OK(void 0);
    }
    return this._def.innerType._parse(input);
  }
  unwrap() {
    return this._def.innerType;
  }
};
ZodOptional.create = (type, params) => {
  return new ZodOptional({
    innerType: type,
    typeName: ZodFirstPartyTypeKind.ZodOptional,
    ...processCreateParams(params)
  });
};
var ZodNullable = class extends ZodType {
  static {
    __name(this, "ZodNullable");
  }
  _parse(input) {
    const parsedType = this._getType(input);
    if (parsedType === ZodParsedType.null) {
      return OK(null);
    }
    return this._def.innerType._parse(input);
  }
  unwrap() {
    return this._def.innerType;
  }
};
ZodNullable.create = (type, params) => {
  return new ZodNullable({
    innerType: type,
    typeName: ZodFirstPartyTypeKind.ZodNullable,
    ...processCreateParams(params)
  });
};
var ZodDefault = class extends ZodType {
  static {
    __name(this, "ZodDefault");
  }
  _parse(input) {
    const { ctx } = this._processInputParams(input);
    let data = ctx.data;
    if (ctx.parsedType === ZodParsedType.undefined) {
      data = this._def.defaultValue();
    }
    return this._def.innerType._parse({
      data,
      path: ctx.path,
      parent: ctx
    });
  }
  removeDefault() {
    return this._def.innerType;
  }
};
ZodDefault.create = (type, params) => {
  return new ZodDefault({
    innerType: type,
    typeName: ZodFirstPartyTypeKind.ZodDefault,
    defaultValue: typeof params.default === "function" ? params.default : () => params.default,
    ...processCreateParams(params)
  });
};
var ZodCatch = class extends ZodType {
  static {
    __name(this, "ZodCatch");
  }
  _parse(input) {
    const { ctx } = this._processInputParams(input);
    const newCtx = {
      ...ctx,
      common: {
        ...ctx.common,
        issues: []
      }
    };
    const result = this._def.innerType._parse({
      data: newCtx.data,
      path: newCtx.path,
      parent: {
        ...newCtx
      }
    });
    if (isAsync(result)) {
      return result.then((result2) => {
        return {
          status: "valid",
          value: result2.status === "valid" ? result2.value : this._def.catchValue({
            get error() {
              return new ZodError(newCtx.common.issues);
            },
            input: newCtx.data
          })
        };
      });
    } else {
      return {
        status: "valid",
        value: result.status === "valid" ? result.value : this._def.catchValue({
          get error() {
            return new ZodError(newCtx.common.issues);
          },
          input: newCtx.data
        })
      };
    }
  }
  removeCatch() {
    return this._def.innerType;
  }
};
ZodCatch.create = (type, params) => {
  return new ZodCatch({
    innerType: type,
    typeName: ZodFirstPartyTypeKind.ZodCatch,
    catchValue: typeof params.catch === "function" ? params.catch : () => params.catch,
    ...processCreateParams(params)
  });
};
var ZodNaN = class extends ZodType {
  static {
    __name(this, "ZodNaN");
  }
  _parse(input) {
    const parsedType = this._getType(input);
    if (parsedType !== ZodParsedType.nan) {
      const ctx = this._getOrReturnCtx(input);
      addIssueToContext(ctx, {
        code: ZodIssueCode.invalid_type,
        expected: ZodParsedType.nan,
        received: ctx.parsedType
      });
      return INVALID;
    }
    return { status: "valid", value: input.data };
  }
};
ZodNaN.create = (params) => {
  return new ZodNaN({
    typeName: ZodFirstPartyTypeKind.ZodNaN,
    ...processCreateParams(params)
  });
};
var BRAND = /* @__PURE__ */ Symbol("zod_brand");
var ZodBranded = class extends ZodType {
  static {
    __name(this, "ZodBranded");
  }
  _parse(input) {
    const { ctx } = this._processInputParams(input);
    const data = ctx.data;
    return this._def.type._parse({
      data,
      path: ctx.path,
      parent: ctx
    });
  }
  unwrap() {
    return this._def.type;
  }
};
var ZodPipeline = class _ZodPipeline extends ZodType {
  static {
    __name(this, "ZodPipeline");
  }
  _parse(input) {
    const { status, ctx } = this._processInputParams(input);
    if (ctx.common.async) {
      const handleAsync = /* @__PURE__ */ __name(async () => {
        const inResult = await this._def.in._parseAsync({
          data: ctx.data,
          path: ctx.path,
          parent: ctx
        });
        if (inResult.status === "aborted")
          return INVALID;
        if (inResult.status === "dirty") {
          status.dirty();
          return DIRTY(inResult.value);
        } else {
          return this._def.out._parseAsync({
            data: inResult.value,
            path: ctx.path,
            parent: ctx
          });
        }
      }, "handleAsync");
      return handleAsync();
    } else {
      const inResult = this._def.in._parseSync({
        data: ctx.data,
        path: ctx.path,
        parent: ctx
      });
      if (inResult.status === "aborted")
        return INVALID;
      if (inResult.status === "dirty") {
        status.dirty();
        return {
          status: "dirty",
          value: inResult.value
        };
      } else {
        return this._def.out._parseSync({
          data: inResult.value,
          path: ctx.path,
          parent: ctx
        });
      }
    }
  }
  static create(a, b) {
    return new _ZodPipeline({
      in: a,
      out: b,
      typeName: ZodFirstPartyTypeKind.ZodPipeline
    });
  }
};
var ZodReadonly = class extends ZodType {
  static {
    __name(this, "ZodReadonly");
  }
  _parse(input) {
    const result = this._def.innerType._parse(input);
    const freeze = /* @__PURE__ */ __name((data) => {
      if (isValid(data)) {
        data.value = Object.freeze(data.value);
      }
      return data;
    }, "freeze");
    return isAsync(result) ? result.then((data) => freeze(data)) : freeze(result);
  }
  unwrap() {
    return this._def.innerType;
  }
};
ZodReadonly.create = (type, params) => {
  return new ZodReadonly({
    innerType: type,
    typeName: ZodFirstPartyTypeKind.ZodReadonly,
    ...processCreateParams(params)
  });
};
function cleanParams(params, data) {
  const p = typeof params === "function" ? params(data) : typeof params === "string" ? { message: params } : params;
  const p2 = typeof p === "string" ? { message: p } : p;
  return p2;
}
__name(cleanParams, "cleanParams");
function custom(check, _params = {}, fatal) {
  if (check)
    return ZodAny.create().superRefine((data, ctx) => {
      const r = check(data);
      if (r instanceof Promise) {
        return r.then((r2) => {
          if (!r2) {
            const params = cleanParams(_params, data);
            const _fatal = params.fatal ?? fatal ?? true;
            ctx.addIssue({ code: "custom", ...params, fatal: _fatal });
          }
        });
      }
      if (!r) {
        const params = cleanParams(_params, data);
        const _fatal = params.fatal ?? fatal ?? true;
        ctx.addIssue({ code: "custom", ...params, fatal: _fatal });
      }
      return;
    });
  return ZodAny.create();
}
__name(custom, "custom");
var late = {
  object: ZodObject.lazycreate
};
var ZodFirstPartyTypeKind;
(function(ZodFirstPartyTypeKind2) {
  ZodFirstPartyTypeKind2["ZodString"] = "ZodString";
  ZodFirstPartyTypeKind2["ZodNumber"] = "ZodNumber";
  ZodFirstPartyTypeKind2["ZodNaN"] = "ZodNaN";
  ZodFirstPartyTypeKind2["ZodBigInt"] = "ZodBigInt";
  ZodFirstPartyTypeKind2["ZodBoolean"] = "ZodBoolean";
  ZodFirstPartyTypeKind2["ZodDate"] = "ZodDate";
  ZodFirstPartyTypeKind2["ZodSymbol"] = "ZodSymbol";
  ZodFirstPartyTypeKind2["ZodUndefined"] = "ZodUndefined";
  ZodFirstPartyTypeKind2["ZodNull"] = "ZodNull";
  ZodFirstPartyTypeKind2["ZodAny"] = "ZodAny";
  ZodFirstPartyTypeKind2["ZodUnknown"] = "ZodUnknown";
  ZodFirstPartyTypeKind2["ZodNever"] = "ZodNever";
  ZodFirstPartyTypeKind2["ZodVoid"] = "ZodVoid";
  ZodFirstPartyTypeKind2["ZodArray"] = "ZodArray";
  ZodFirstPartyTypeKind2["ZodObject"] = "ZodObject";
  ZodFirstPartyTypeKind2["ZodUnion"] = "ZodUnion";
  ZodFirstPartyTypeKind2["ZodDiscriminatedUnion"] = "ZodDiscriminatedUnion";
  ZodFirstPartyTypeKind2["ZodIntersection"] = "ZodIntersection";
  ZodFirstPartyTypeKind2["ZodTuple"] = "ZodTuple";
  ZodFirstPartyTypeKind2["ZodRecord"] = "ZodRecord";
  ZodFirstPartyTypeKind2["ZodMap"] = "ZodMap";
  ZodFirstPartyTypeKind2["ZodSet"] = "ZodSet";
  ZodFirstPartyTypeKind2["ZodFunction"] = "ZodFunction";
  ZodFirstPartyTypeKind2["ZodLazy"] = "ZodLazy";
  ZodFirstPartyTypeKind2["ZodLiteral"] = "ZodLiteral";
  ZodFirstPartyTypeKind2["ZodEnum"] = "ZodEnum";
  ZodFirstPartyTypeKind2["ZodEffects"] = "ZodEffects";
  ZodFirstPartyTypeKind2["ZodNativeEnum"] = "ZodNativeEnum";
  ZodFirstPartyTypeKind2["ZodOptional"] = "ZodOptional";
  ZodFirstPartyTypeKind2["ZodNullable"] = "ZodNullable";
  ZodFirstPartyTypeKind2["ZodDefault"] = "ZodDefault";
  ZodFirstPartyTypeKind2["ZodCatch"] = "ZodCatch";
  ZodFirstPartyTypeKind2["ZodPromise"] = "ZodPromise";
  ZodFirstPartyTypeKind2["ZodBranded"] = "ZodBranded";
  ZodFirstPartyTypeKind2["ZodPipeline"] = "ZodPipeline";
  ZodFirstPartyTypeKind2["ZodReadonly"] = "ZodReadonly";
})(ZodFirstPartyTypeKind || (ZodFirstPartyTypeKind = {}));
var instanceOfType = /* @__PURE__ */ __name((cls, params = {
  message: `Input not instance of ${cls.name}`
}) => custom((data) => data instanceof cls, params), "instanceOfType");
var stringType = ZodString.create;
var numberType = ZodNumber.create;
var nanType = ZodNaN.create;
var bigIntType = ZodBigInt.create;
var booleanType = ZodBoolean.create;
var dateType = ZodDate.create;
var symbolType = ZodSymbol.create;
var undefinedType = ZodUndefined.create;
var nullType = ZodNull.create;
var anyType = ZodAny.create;
var unknownType = ZodUnknown.create;
var neverType = ZodNever.create;
var voidType = ZodVoid.create;
var arrayType = ZodArray.create;
var objectType = ZodObject.create;
var strictObjectType = ZodObject.strictCreate;
var unionType = ZodUnion.create;
var discriminatedUnionType = ZodDiscriminatedUnion.create;
var intersectionType = ZodIntersection.create;
var tupleType = ZodTuple.create;
var recordType = ZodRecord.create;
var mapType = ZodMap.create;
var setType = ZodSet.create;
var functionType = ZodFunction.create;
var lazyType = ZodLazy.create;
var literalType = ZodLiteral.create;
var enumType = ZodEnum.create;
var nativeEnumType = ZodNativeEnum.create;
var promiseType = ZodPromise.create;
var effectsType = ZodEffects.create;
var optionalType = ZodOptional.create;
var nullableType = ZodNullable.create;
var preprocessType = ZodEffects.createWithPreprocess;
var pipelineType = ZodPipeline.create;
var ostring = /* @__PURE__ */ __name(() => stringType().optional(), "ostring");
var onumber = /* @__PURE__ */ __name(() => numberType().optional(), "onumber");
var oboolean = /* @__PURE__ */ __name(() => booleanType().optional(), "oboolean");
var coerce = {
  string: /* @__PURE__ */ __name(((arg) => ZodString.create({ ...arg, coerce: true })), "string"),
  number: /* @__PURE__ */ __name(((arg) => ZodNumber.create({ ...arg, coerce: true })), "number"),
  boolean: /* @__PURE__ */ __name(((arg) => ZodBoolean.create({
    ...arg,
    coerce: true
  })), "boolean"),
  bigint: /* @__PURE__ */ __name(((arg) => ZodBigInt.create({ ...arg, coerce: true })), "bigint"),
  date: /* @__PURE__ */ __name(((arg) => ZodDate.create({ ...arg, coerce: true })), "date")
};
var NEVER = INVALID;

// worker/lib/app-error.ts
var AppError = class extends Error {
  static {
    __name(this, "AppError");
  }
  code;
  status;
  details;
  constructor(options) {
    super(options.message);
    this.name = "AppError";
    this.code = options.code;
    this.status = options.status;
    this.details = options.details;
  }
};

// worker/lib/api-envelope.ts
function success(data, requestId) {
  return { success: true, data, meta: { requestId } };
}
__name(success, "success");
function failure(code, message, requestId, details) {
  return {
    success: false,
    code,
    message,
    meta: { requestId },
    ...details ? { details } : {}
  };
}
__name(failure, "failure");

// worker/middleware/request-context.ts
function requestContext() {
  return async (context, next) => {
    const requestId = crypto.randomUUID();
    const startedAt = Date.now();
    context.set("requestId", requestId);
    context.set("authUser", null);
    context.set("authSession", null);
    await next();
    context.res.headers.set("X-Request-ID", requestId);
    console.log(
      JSON.stringify({
        message: "request.completed",
        requestId,
        method: context.req.method,
        path: new URL(context.req.url).pathname,
        status: context.res.status,
        durationMs: Date.now() - startedAt,
        cfRay: context.req.header("CF-Ray") ?? null
      })
    );
  };
}
__name(requestContext, "requestContext");

// worker/middleware/security.ts
var CONTENT_SECURITY_POLICY = [
  "default-src 'self'",
  "base-uri 'self'",
  "connect-src 'self' https://challenges.cloudflare.com https://cloudflareinsights.com",
  "font-src 'self' data:",
  "form-action 'self'",
  "frame-src https://challenges.cloudflare.com https://www.google.com https://maps.google.com",
  "frame-ancestors 'none'",
  "img-src 'self' data: blob: https:",
  "object-src 'none'",
  "script-src 'self' https://challenges.cloudflare.com https://static.cloudflareinsights.com",
  "style-src 'self' 'unsafe-inline'"
].join("; ");
function securityHeaders() {
  return async (context, next) => {
    await next();
    const headers = new Headers(context.res.headers);
    headers.set("Content-Security-Policy", CONTENT_SECURITY_POLICY);
    headers.set("Cross-Origin-Opener-Policy", "same-origin");
    headers.set("Cross-Origin-Resource-Policy", "same-origin");
    headers.set(
      "Permissions-Policy",
      "camera=(), geolocation=(), microphone=(), payment=(), usb=()"
    );
    headers.set("Referrer-Policy", "strict-origin-when-cross-origin");
    headers.set("X-Content-Type-Options", "nosniff");
    headers.set("X-Frame-Options", "DENY");
    if (context.env.ENVIRONMENT === "production") {
      headers.set(
        "Strict-Transport-Security",
        "max-age=31536000; includeSubDomains; preload"
      );
    }
    context.res = new Response(context.res.body, {
      status: context.res.status,
      statusText: context.res.statusText,
      headers
    });
  };
}
__name(securityHeaders, "securityHeaders");
function noStoreApiResponses() {
  return async (context, next) => {
    await next();
    context.res.headers.set("Cache-Control", "no-store");
  };
}
__name(noStoreApiResponses, "noStoreApiResponses");

// worker/routes/health.ts
var healthRoutes = new Hono2();
healthRoutes.get(
  "/health",
  (context) => context.json(
    success(
      {
        service: "ruet-iot-club-platform",
        status: "ok",
        environment: context.env.ENVIRONMENT,
        timestamp: (/* @__PURE__ */ new Date()).toISOString()
      },
      context.get("requestId")
    )
  )
);
healthRoutes.get("/ready", async (context) => {
  try {
    const database = await context.env.DB.prepare("SELECT 1 AS ready").first();
    if (database?.ready !== 1) {
      throw new Error("D1 readiness query returned an unexpected result");
    }
    return context.json(
      success(
        {
          status: "ready",
          checks: { database: "ok", objectStorageBinding: "configured" },
          timestamp: (/* @__PURE__ */ new Date()).toISOString()
        },
        context.get("requestId")
      )
    );
  } catch (error) {
    console.error(
      JSON.stringify({
        message: "readiness.failed",
        requestId: context.get("requestId"),
        error: error instanceof Error ? error.message : "Unknown readiness error"
      })
    );
    return context.json(
      failure(
        "SERVICE_NOT_READY",
        "The service is temporarily unable to accept traffic.",
        context.get("requestId")
      ),
      503
    );
  }
});

// worker/auth/crypto.ts
var PASSWORD_ALGORITHM = "PBKDF2";
var PASSWORD_DIGEST = "SHA-256";
var PASSWORD_ITERATIONS = 1e5;
var PASSWORD_HASH_BYTES = 32;
var SALT_BYTES = 16;
var TOKEN_BYTES = 32;
var encoder = new TextEncoder();
function toBase64Url(bytes) {
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replaceAll("+", "-").replaceAll("/", "_").replace(/=+$/u, "");
}
__name(toBase64Url, "toBase64Url");
function fromBase64Url(value) {
  const normalized = value.replaceAll("-", "+").replaceAll("_", "/");
  const padded = normalized.padEnd(Math.ceil(normalized.length / 4) * 4, "=");
  const binary = atob(padded);
  return Uint8Array.from(binary, (character) => character.charCodeAt(0));
}
__name(fromBase64Url, "fromBase64Url");
function randomBytes(length) {
  const bytes = new Uint8Array(length);
  crypto.getRandomValues(bytes);
  return bytes;
}
__name(randomBytes, "randomBytes");
async function equalBytes(left, right) {
  const [leftHash, rightHash] = await Promise.all([
    crypto.subtle.digest("SHA-256", left),
    crypto.subtle.digest("SHA-256", right)
  ]);
  return crypto.subtle.timingSafeEqual(leftHash, rightHash);
}
__name(equalBytes, "equalBytes");
async function derivePassword(password2, salt, iterations) {
  const key = await crypto.subtle.importKey("raw", encoder.encode(password2), PASSWORD_ALGORITHM, false, [
    "deriveBits"
  ]);
  const bits = await crypto.subtle.deriveBits(
    { name: PASSWORD_ALGORITHM, hash: PASSWORD_DIGEST, salt, iterations },
    key,
    PASSWORD_HASH_BYTES * 8
  );
  return new Uint8Array(bits);
}
__name(derivePassword, "derivePassword");
async function hashPassword(password2) {
  const salt = randomBytes(SALT_BYTES);
  const hash = await derivePassword(password2, salt, PASSWORD_ITERATIONS);
  return `pbkdf2_sha256$${PASSWORD_ITERATIONS}$${toBase64Url(salt)}$${toBase64Url(hash)}`;
}
__name(hashPassword, "hashPassword");
async function verifyPassword(password2, encoded) {
  const [scheme, iterationText, saltText, hashText] = encoded.split("$");
  const iterations = Number(iterationText);
  if (scheme !== "pbkdf2_sha256" || !Number.isSafeInteger(iterations) || iterations < 1e5 || !saltText || !hashText) {
    return false;
  }
  try {
    const expected = fromBase64Url(hashText);
    const actual = await derivePassword(password2, fromBase64Url(saltText), iterations);
    return await equalBytes(actual, expected);
  } catch {
    return false;
  }
}
__name(verifyPassword, "verifyPassword");
function createOpaqueToken() {
  return toBase64Url(randomBytes(TOKEN_BYTES));
}
__name(createOpaqueToken, "createOpaqueToken");
async function sha2562(value) {
  const digest = await crypto.subtle.digest("SHA-256", encoder.encode(value));
  return toBase64Url(new Uint8Array(digest));
}
__name(sha2562, "sha256");
async function deriveCsrfToken(secret, sessionId) {
  const key = await crypto.subtle.importKey(
    "raw",
    encoder.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
  const signature = await crypto.subtle.sign(
    "HMAC",
    key,
    encoder.encode(`ruet-csrf:v1:${sessionId}`)
  );
  return toBase64Url(new Uint8Array(signature));
}
__name(deriveCsrfToken, "deriveCsrfToken");
async function timingSafeEqualStrings(left, right) {
  const [leftHash, rightHash] = await Promise.all([
    crypto.subtle.digest("SHA-256", encoder.encode(left)),
    crypto.subtle.digest("SHA-256", encoder.encode(right))
  ]);
  return crypto.subtle.timingSafeEqual(leftHash, rightHash);
}
__name(timingSafeEqualStrings, "timingSafeEqualStrings");
async function emailEncryptionKey(secret) {
  const material = await crypto.subtle.digest("SHA-256", encoder.encode(`ruet-email-outbox:v1:${secret}`));
  return crypto.subtle.importKey("raw", material, { name: "AES-GCM" }, false, ["encrypt", "decrypt"]);
}
__name(emailEncryptionKey, "emailEncryptionKey");
async function encryptJson(value, secret) {
  const iv = randomBytes(12);
  const encrypted = await crypto.subtle.encrypt(
    { name: "AES-GCM", iv, additionalData: encoder.encode("ruet-email-outbox:v1") },
    await emailEncryptionKey(secret),
    encoder.encode(JSON.stringify(value))
  );
  return { ciphertext: toBase64Url(new Uint8Array(encrypted)), iv: toBase64Url(iv) };
}
__name(encryptJson, "encryptJson");
async function decryptJson(ciphertext, iv, secret) {
  const decrypted = await crypto.subtle.decrypt(
    { name: "AES-GCM", iv: fromBase64Url(iv), additionalData: encoder.encode("ruet-email-outbox:v1") },
    await emailEncryptionKey(secret),
    fromBase64Url(ciphertext)
  );
  return JSON.parse(new TextDecoder().decode(decrypted));
}
__name(decryptJson, "decryptJson");

// worker/auth/rate-limit.ts
async function enforceRateLimit(options) {
  const now = Date.now();
  const windowMs = options.windowSeconds * 1e3;
  const windowStartedAt = Math.floor(now / windowMs) * windowMs;
  const expiresAt = windowStartedAt + windowMs * 2;
  const keyHash = await sha2562(`${options.scope}:${options.identifier}`);
  const row = await options.db.prepare(
    `INSERT INTO auth_rate_limits (scope, key_hash, window_started_at, hit_count, expires_at)
       VALUES (?, ?, ?, 1, ?)
       ON CONFLICT(scope, key_hash, window_started_at)
       DO UPDATE SET hit_count = hit_count + 1
       RETURNING hit_count`
  ).bind(options.scope, keyHash, windowStartedAt, expiresAt).first();
  if ((row?.hit_count ?? 1) > options.limit) {
    throw new AppError({
      code: "RATE_LIMITED",
      message: "Too many attempts. Please wait before trying again.",
      status: 429
    });
  }
}
__name(enforceRateLimit, "enforceRateLimit");
function clientIp(request) {
  return request.headers.get("CF-Connecting-IP")?.trim() || "unknown";
}
__name(clientIp, "clientIp");

// node_modules/hono/dist/utils/cookie.js
var validCookieNameRegEx = /^[\w!#$%&'*.^`|~+-]+$/;
var relaxedCookieNameRegEx = /^[!#-:<>-[\]-~]+$/;
var validCookieValueRegEx = /^[ !#-:<-[\]-~]*$/;
var trimCookieWhitespace = /* @__PURE__ */ __name((value) => {
  let start = 0;
  let end = value.length;
  while (start < end) {
    const charCode = value.charCodeAt(start);
    if (charCode !== 32 && charCode !== 9) {
      break;
    }
    start++;
  }
  while (end > start) {
    const charCode = value.charCodeAt(end - 1);
    if (charCode !== 32 && charCode !== 9) {
      break;
    }
    end--;
  }
  return start === 0 && end === value.length ? value : value.slice(start, end);
}, "trimCookieWhitespace");
var parse = /* @__PURE__ */ __name((cookie, name) => {
  if (name && cookie.indexOf(name) === -1) {
    return {};
  }
  const pairs = cookie.split(";");
  const parsedCookie = /* @__PURE__ */ Object.create(null);
  for (const pairStr of pairs) {
    const valueStartPos = pairStr.indexOf("=");
    if (valueStartPos === -1) {
      continue;
    }
    const cookieName2 = trimCookieWhitespace(pairStr.substring(0, valueStartPos));
    if (name && name !== cookieName2 || !relaxedCookieNameRegEx.test(cookieName2) || cookieName2 in parsedCookie) {
      continue;
    }
    let cookieValue = trimCookieWhitespace(pairStr.substring(valueStartPos + 1));
    if (cookieValue.startsWith('"') && cookieValue.endsWith('"')) {
      cookieValue = cookieValue.slice(1, -1);
    }
    if (validCookieValueRegEx.test(cookieValue)) {
      parsedCookie[cookieName2] = tryDecodeURIComponent(cookieValue);
      if (name) {
        break;
      }
    }
  }
  return parsedCookie;
}, "parse");
var _serialize = /* @__PURE__ */ __name((name, value, opt = {}) => {
  if (!validCookieNameRegEx.test(name)) {
    throw new Error("Invalid cookie name");
  }
  let cookie = `${name}=${value}`;
  if (name.startsWith("__Secure-") && !opt.secure) {
    throw new Error("__Secure- Cookie must have Secure attributes");
  }
  if (name.startsWith("__Host-")) {
    if (!opt.secure) {
      throw new Error("__Host- Cookie must have Secure attributes");
    }
    if (opt.path !== "/") {
      throw new Error('__Host- Cookie must have Path attributes with "/"');
    }
    if (opt.domain) {
      throw new Error("__Host- Cookie must not have Domain attributes");
    }
  }
  for (const key of ["domain", "path", "sameSite", "priority"]) {
    if (opt[key] && /[;\r\n]/.test(opt[key])) {
      throw new Error(`${key} must not contain ";", "\\r", or "\\n"`);
    }
  }
  if (opt && typeof opt.maxAge === "number" && opt.maxAge >= 0) {
    if (opt.maxAge > 3456e4) {
      throw new Error(
        "Cookies Max-Age SHOULD NOT be greater than 400 days (34560000 seconds) in duration."
      );
    }
    cookie += `; Max-Age=${opt.maxAge | 0}`;
  }
  if (opt.domain && opt.prefix !== "host") {
    cookie += `; Domain=${opt.domain}`;
  }
  if (opt.path) {
    cookie += `; Path=${opt.path}`;
  }
  if (opt.expires) {
    if (opt.expires.getTime() - Date.now() > 3456e7) {
      throw new Error(
        "Cookies Expires SHOULD NOT be greater than 400 days (34560000 seconds) in the future."
      );
    }
    cookie += `; Expires=${opt.expires.toUTCString()}`;
  }
  if (opt.httpOnly) {
    cookie += "; HttpOnly";
  }
  if (opt.secure) {
    cookie += "; Secure";
  }
  if (opt.sameSite) {
    cookie += `; SameSite=${opt.sameSite.charAt(0).toUpperCase() + opt.sameSite.slice(1)}`;
  }
  if (opt.priority) {
    cookie += `; Priority=${opt.priority.charAt(0).toUpperCase() + opt.priority.slice(1)}`;
  }
  if (opt.partitioned) {
    if (!opt.secure) {
      throw new Error("Partitioned Cookie must have Secure attributes");
    }
    cookie += "; Partitioned";
  }
  return cookie;
}, "_serialize");
var serialize = /* @__PURE__ */ __name((name, value, opt) => {
  value = encodeURIComponent(value);
  return _serialize(name, value, opt);
}, "serialize");

// node_modules/hono/dist/helper/cookie/index.js
var getCookie = /* @__PURE__ */ __name((c, key, prefix) => {
  const cookie = c.req.raw.headers.get("Cookie");
  if (typeof key === "string") {
    if (!cookie) {
      return void 0;
    }
    let finalKey = key;
    if (prefix === "secure") {
      finalKey = "__Secure-" + key;
    } else if (prefix === "host") {
      finalKey = "__Host-" + key;
    }
    const obj2 = parse(cookie, finalKey);
    return obj2[finalKey];
  }
  if (!cookie) {
    return {};
  }
  const obj = parse(cookie);
  return obj;
}, "getCookie");
var generateCookie = /* @__PURE__ */ __name((name, value, opt) => {
  let cookie;
  if (opt?.prefix === "secure") {
    cookie = serialize("__Secure-" + name, value, { path: "/", ...opt, secure: true });
  } else if (opt?.prefix === "host") {
    cookie = serialize("__Host-" + name, value, {
      ...opt,
      path: "/",
      secure: true,
      domain: void 0
    });
  } else {
    cookie = serialize(name, value, { path: "/", ...opt });
  }
  return cookie;
}, "generateCookie");
var setCookie = /* @__PURE__ */ __name((c, name, value, opt) => {
  const cookie = generateCookie(name, value, opt);
  c.header("Set-Cookie", cookie, { append: true });
}, "setCookie");
var deleteCookie = /* @__PURE__ */ __name((c, name, opt) => {
  const deletedCookie = getCookie(c, name, opt?.prefix);
  setCookie(c, name, "", { ...opt, maxAge: 0 });
  return deletedCookie;
}, "deleteCookie");

// worker/repositories/authorization-repository.ts
async function getAuthorizationForUser(db, userId) {
  const { results } = await db.prepare(
    `SELECT r.role_key, p.permission_key
       FROM user_roles ur
       JOIN roles r ON r.id = ur.role_id AND r.deleted_at IS NULL
       JOIN role_permissions rp ON rp.role_id = r.id
       JOIN permissions p ON p.id = rp.permission_id
       WHERE ur.user_id = ? AND ur.revoked_at IS NULL
         AND (ur.expires_at IS NULL OR ur.expires_at > strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
       ORDER BY r.role_key, p.permission_key`
  ).bind(userId).all();
  return {
    roles: [...new Set(results.map((row) => row.role_key))],
    permissions: [...new Set(results.map((row) => row.permission_key))]
  };
}
__name(getAuthorizationForUser, "getAuthorizationForUser");
async function userHasPermission(db, userId, permission) {
  const row = await db.prepare(
    `SELECT 1 AS allowed
       FROM user_roles ur
       JOIN roles r ON r.id = ur.role_id AND r.deleted_at IS NULL
       JOIN role_permissions rp ON rp.role_id = r.id
       JOIN permissions p ON p.id = rp.permission_id
       WHERE ur.user_id = ? AND p.permission_key = ? AND ur.revoked_at IS NULL
         AND (ur.expires_at IS NULL OR ur.expires_at > strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
       LIMIT 1`
  ).bind(userId, permission).first();
  return row?.allowed === 1;
}
__name(userHasPermission, "userHasPermission");

// worker/auth/session.ts
var SESSION_DAYS = 30;
function cookieName(environment) {
  return environment === "development" ? "ruet_session" : "__Host-ruet_session";
}
__name(cookieName, "cookieName");
function cookieOptions(environment) {
  return {
    path: "/",
    httpOnly: true,
    secure: environment !== "development",
    sameSite: "Lax",
    maxAge: SESSION_DAYS * 24 * 60 * 60
  };
}
__name(cookieOptions, "cookieOptions");
async function createSessionMaterial(secret) {
  const id2 = crypto.randomUUID();
  const token2 = createOpaqueToken();
  const csrfToken = secret ? await deriveCsrfToken(secret, id2) : createOpaqueToken();
  return {
    id: id2,
    token: token2,
    tokenHash: await sha2562(token2),
    csrfToken,
    csrfTokenHash: await sha2562(csrfToken),
    expiresAt: new Date(Date.now() + SESSION_DAYS * 24 * 60 * 60 * 1e3).toISOString()
  };
}
__name(createSessionMaterial, "createSessionMaterial");
function setSessionCookie(context, token2) {
  setCookie(context, cookieName(context.env.ENVIRONMENT), token2, cookieOptions(context.env.ENVIRONMENT));
}
__name(setSessionCookie, "setSessionCookie");
function clearSessionCookie(context) {
  deleteCookie(context, cookieName(context.env.ENVIRONMENT), {
    path: "/",
    secure: context.env.ENVIRONMENT !== "development"
  });
}
__name(clearSessionCookie, "clearSessionCookie");
async function resolveSession(context) {
  const token2 = getCookie(context, cookieName(context.env.ENVIRONMENT));
  if (!token2) return null;
  const tokenHash = await sha2562(token2);
  return context.env.DB.prepare(
    `SELECT s.id AS session_id, s.user_id, s.csrf_token_hash, s.expires_at,
            u.primary_email, u.display_name, u.status, u.onboarding_status,
            p.must_change_password, u.is_fixed_super_admin
     FROM sessions s
     JOIN users u ON u.id = s.user_id
     LEFT JOIN password_credentials p ON p.user_id = u.id
     WHERE s.token_hash = ? AND s.revoked_at IS NULL AND s.expires_at > ?
       AND u.status = 'EMAIL_VERIFIED'`
  ).bind(tokenHash, (/* @__PURE__ */ new Date()).toISOString()).first();
}
__name(resolveSession, "resolveSession");
function sessionMiddleware(options) {
  return async (context, next) => {
    const row = await resolveSession(context);
    if (!row) {
      context.set("authUser", null);
      context.set("authSession", null);
      if (options.required) {
        clearSessionCookie(context);
        throw new AppError({ code: "AUTHENTICATION_REQUIRED", message: "Please sign in to continue.", status: 401 });
      }
      return next();
    }
    const authorization = await getAuthorizationForUser(context.env.DB, row.user_id);
    const user = {
      id: row.user_id,
      email: row.primary_email,
      displayName: row.display_name,
      status: row.status,
      onboardingStatus: row.onboarding_status,
      mustChangePassword: row.must_change_password === 1,
      fixedSuperAdmin: row.is_fixed_super_admin === 1,
      roles: authorization.roles,
      permissions: authorization.permissions
    };
    const session = {
      id: row.session_id,
      userId: row.user_id,
      csrfTokenHash: row.csrf_token_hash,
      expiresAt: row.expires_at
    };
    context.set("authUser", user);
    context.set("authSession", session);
    context.executionCtx.waitUntil(
      context.env.DB.prepare("UPDATE sessions SET last_seen_at = ? WHERE id = ?").bind((/* @__PURE__ */ new Date()).toISOString(), row.session_id).run()
    );
    return next();
  };
}
__name(sessionMiddleware, "sessionMiddleware");
function csrfMiddleware() {
  return async (context, next) => {
    const origin = context.req.header("Origin");
    const siteUrl = new URL(context.env.SITE_URL);
    const frontendUrl = new URL(context.env.FRONTEND_ORIGIN);
    const allowedOrigins = /* @__PURE__ */ new Set([siteUrl.origin, frontendUrl.origin]);
    if (siteUrl.protocol === "https:" && !siteUrl.hostname.startsWith("www.")) {
      allowedOrigins.add(`${siteUrl.protocol}//www.${siteUrl.host}`);
    }
    if (!origin || !allowedOrigins.has(origin)) {
      throw new AppError({ code: "INVALID_ORIGIN", message: "The request origin is not allowed.", status: 403 });
    }
    const session = context.get("authSession");
    const token2 = context.req.header("X-CSRF-Token")?.trim();
    if (!session || !token2) {
      throw new AppError({ code: "CSRF_VALIDATION_FAILED", message: "The request could not be validated.", status: 403 });
    }
    const storedTokenMatches = await timingSafeEqualStrings(await sha2562(token2), session.csrfTokenHash);
    const stableTokenMatches = await timingSafeEqualStrings(
      token2,
      await deriveCsrfToken(context.env.SESSION_SECRET, session.id)
    );
    if (!storedTokenMatches && !stableTokenMatches) {
      throw new AppError({ code: "CSRF_VALIDATION_FAILED", message: "The request could not be validated.", status: 403 });
    }
    return next();
  };
}
__name(csrfMiddleware, "csrfMiddleware");
function requireAuth(context) {
  const user = context.get("authUser");
  const session = context.get("authSession");
  if (!user || !session) {
    throw new AppError({ code: "AUTHENTICATION_REQUIRED", message: "Please sign in to continue.", status: 401 });
  }
  return { user, session };
}
__name(requireAuth, "requireAuth");
async function currentCsrfToken(context) {
  const { session } = requireAuth(context);
  return deriveCsrfToken(context.env.SESSION_SECRET, session.id);
}
__name(currentCsrfToken, "currentCsrfToken");

// worker/auth/validation.ts
var email = external_exports.string().trim().email().max(254);
var password = external_exports.string().min(12).max(128);
var token = external_exports.string().trim().min(32).max(512);
var registerSchema = external_exports.object({
  email,
  password,
  displayName: external_exports.string().trim().min(2).max(100),
  phone: external_exports.string().trim().min(6).max(32).optional().nullable(),
  institution: external_exports.string().trim().min(2).max(160),
  department: external_exports.string().trim().min(2).max(160),
  professionalStatus: external_exports.enum(["STUDENT", "FACULTY", "RESEARCHER", "PROFESSIONAL", "OTHER"]),
  consent: external_exports.literal(true, { errorMap: /* @__PURE__ */ __name(() => ({ message: "Consent is required to create an account." }), "errorMap") }),
  turnstileToken: external_exports.string().trim().min(1).max(2048)
}).strict();
var loginSchema = external_exports.object({ email, password });
var emailOnlySchema = external_exports.object({ email });
var tokenOnlySchema = external_exports.object({ token });
var resetPasswordSchema = external_exports.object({ token, password });
var changePasswordSchema = external_exports.object({
  currentPassword: password,
  newPassword: password
}).refine((value) => value.currentPassword !== value.newPassword, {
  message: "The new password must be different from the current password.",
  path: ["newPassword"]
});
var emailChangeSchema = external_exports.object({ email, password });
var deletionRequestSchema = external_exports.object({ reason: external_exports.string().trim().max(1e3).optional() });
var onboardingSchema = external_exports.object({ status: external_exports.enum(["COMPLETED", "DISMISSED"]) });
var notificationPreferencesSchema = external_exports.object({
  accountEmail: external_exports.boolean().optional(),
  eventEmail: external_exports.boolean().optional(),
  announcementEmail: external_exports.boolean().optional()
}).refine((value) => value.accountEmail !== false, "Essential account email cannot be disabled.").refine((value) => Object.values(value).some((item) => item !== void 0), "At least one preference is required.");
function normalizeEmail(value) {
  return value.trim().toLowerCase();
}
__name(normalizeEmail, "normalizeEmail");
async function parseJson(context, schema) {
  let payload;
  try {
    payload = await context.req.json();
  } catch {
    throw new AppError({ code: "INVALID_JSON", message: "The request body must be valid JSON.", status: 400 });
  }
  const result = schema.safeParse(payload);
  if (!result.success) {
    const details = {};
    for (const issue of result.error.issues) {
      const key = issue.path.join(".") || "body";
      details[key] = [...details[key] ?? [], issue.message];
    }
    throw new AppError({
      code: "VALIDATION_ERROR",
      message: "Please correct the highlighted fields.",
      status: 422,
      details
    });
  }
  return result.data;
}
__name(parseJson, "parseJson");

// worker/services/email.ts
function escapeHtml(value) {
  return value.replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll('"', "&quot;").replaceAll("'", "&#039;");
}
__name(escapeHtml, "escapeHtml");
function actionEmail(options) {
  const safeTitle = escapeHtml(options.title);
  const safeGreeting = escapeHtml(options.greeting);
  const safeExplanation = escapeHtml(options.explanation);
  const safeUrl2 = escapeHtml(options.actionUrl);
  const safeAction = escapeHtml(options.action);
  return {
    subject: options.title,
    html: `<main style="font-family:system-ui,sans-serif;max-width:560px;margin:auto;color:#14213d"><h1>${safeTitle}</h1><p>${safeGreeting}</p><p>${safeExplanation}</p><p><a href="${safeUrl2}" style="display:inline-block;padding:12px 18px;background:#0f766e;color:#fff;text-decoration:none;border-radius:8px">${safeAction}</a></p><p style="font-size:13px;color:#64748b">If the button does not work, copy this link: ${safeUrl2}</p><p style="font-size:13px;color:#64748b">If you did not request this, you can ignore this message.</p></main>`,
    text: `${options.title}

${options.greeting}

${options.explanation}

${options.action}: ${options.actionUrl}

If you did not request this, you can ignore this message.`
  };
}
__name(actionEmail, "actionEmail");
function verificationEmail(siteUrl, displayName, token2) {
  return actionEmail({
    title: "Verify your RUET IoT Club account",
    greeting: `Hello ${displayName},`,
    explanation: "Confirm your email address before signing in. This link expires in 24 hours.",
    actionUrl: `${siteUrl}/verify-email?token=${encodeURIComponent(token2)}`,
    action: "Verify email"
  });
}
__name(verificationEmail, "verificationEmail");
function passwordResetEmail(siteUrl, displayName, token2) {
  return actionEmail({
    title: "Reset your RUET IoT Club password",
    greeting: `Hello ${displayName},`,
    explanation: "Use this secure link to choose a new password. This link expires in one hour.",
    actionUrl: `${siteUrl}/reset-password?token=${encodeURIComponent(token2)}`,
    action: "Reset password"
  });
}
__name(passwordResetEmail, "passwordResetEmail");
function emailChangeEmail(siteUrl, displayName, token2) {
  return actionEmail({
    title: "Confirm your new email address",
    greeting: `Hello ${displayName},`,
    explanation: "Confirm this address to finish changing the email on your account. This link expires in one hour.",
    actionUrl: `${siteUrl}/verify-email-change?token=${encodeURIComponent(token2)}`,
    action: "Confirm new email"
  });
}
__name(emailChangeEmail, "emailChangeEmail");
function accountDeletionEmail(displayName) {
  return {
    subject: "RUET IoT Club account deletion request received",
    html: `<main style="font-family:system-ui,sans-serif;max-width:560px;margin:auto;color:#14213d"><h1>Deletion request received</h1><p>Hello ${escapeHtml(displayName)},</p><p>Your account deletion request has been recorded for review. Your account has been signed out on every device.</p><p>If you did not make this request, contact the club administrators immediately.</p></main>`,
    text: `Deletion request received

Hello ${displayName},

Your account deletion request has been recorded for review. Your account has been signed out on every device.

If you did not make this request, contact the club administrators immediately.`
  };
}
__name(accountDeletionEmail, "accountDeletionEmail");
function submissionVerificationEmail(options) {
  return actionEmail({
    title: `Verify your ${options.submissionType.toLowerCase()} submission email`,
    greeting: `Hello ${options.submitterName},`,
    explanation: `Confirm your email to place submission ${options.referenceCode} into the RUET IoT Club review queue. This link expires in 24 hours.`,
    actionUrl: `${options.siteUrl}/verify-submission?token=${encodeURIComponent(options.token)}`,
    action: "Verify submission email"
  });
}
__name(submissionVerificationEmail, "submissionVerificationEmail");
function opportunityApplicationVerificationEmail(options) {
  return actionEmail({
    title: "Verify your RUET IoT Club opportunity application",
    greeting: `Hello ${options.applicantName},`,
    explanation: `Confirm your email to place application ${options.referenceCode} into the review queue. This link expires when it is used.`,
    actionUrl: `${options.siteUrl}/verify-opportunity-application?token=${encodeURIComponent(options.token)}`,
    action: "Verify application"
  });
}
__name(opportunityApplicationVerificationEmail, "opportunityApplicationVerificationEmail");
function submissionReceiptEmail(options) {
  const safeName = escapeHtml(options.submitterName);
  const safeType = escapeHtml(options.submissionType.toLowerCase());
  const safeReference = escapeHtml(options.referenceCode);
  const safeTitle = escapeHtml(options.title);
  const trackingUrl = `${options.siteUrl}/track-submission?reference=${encodeURIComponent(options.referenceCode)}&token=${encodeURIComponent(options.trackingToken)}`;
  const safeTrackingUrl = escapeHtml(trackingUrl);
  const nextStep = options.verificationRequired ? "Verify your email using the separate verification message before review begins." : "The submission is now in the review queue.";
  return {
    subject: `Your ${options.submissionType} submission has been received \u2014 RUET IoT Club`,
    html: `<main style="font-family:system-ui,sans-serif;max-width:600px;margin:auto;color:#14213d"><h1>Submission received</h1><p>Hello ${safeName},</p><p>We received your ${safeType} submission.</p><dl><dt><strong>Reference</strong></dt><dd>${safeReference}</dd><dt><strong>Title</strong></dt><dd>${safeTitle}</dd></dl><p>${escapeHtml(nextStep)}</p><p><a href="${safeTrackingUrl}" style="display:inline-block;padding:12px 18px;background:#0f766e;color:#fff;text-decoration:none;border-radius:8px">Track submission</a></p><p style="font-size:13px;color:#64748b">Keep the reference and tracking link private.</p></main>`,
    text: `Submission received

Hello ${options.submitterName},

Reference: ${options.referenceCode}
Title: ${options.title}

${nextStep}

Track submission: ${trackingUrl}

Keep the reference and tracking link private.`
  };
}
__name(submissionReceiptEmail, "submissionReceiptEmail");
function authoritySubmissionEmail(options) {
  const adminUrl = `${options.siteUrl}/admin?submission=${encodeURIComponent(options.submissionId)}`;
  return {
    subject: `New ${options.submissionType} submission \u2014 ${options.title}`,
    html: `<main style="font-family:system-ui,sans-serif;max-width:640px;margin:auto;color:#14213d"><h1>New ${escapeHtml(options.submissionType.toLowerCase())} submission</h1><dl><dt><strong>Reference</strong></dt><dd>${escapeHtml(options.referenceCode)}</dd><dt><strong>Submitter</strong></dt><dd>${escapeHtml(options.submitterName)} (${escapeHtml(options.submitterEmail)})</dd><dt><strong>Title</strong></dt><dd>${escapeHtml(options.title)}</dd><dt><strong>Summary</strong></dt><dd>${escapeHtml(options.summary)}</dd><dt><strong>Submitted</strong></dt><dd>${escapeHtml(options.submittedAt)}</dd><dt><strong>Source</strong></dt><dd>RUET IoT Club website</dd></dl><p><a href="${escapeHtml(adminUrl)}" style="display:inline-block;padding:12px 18px;background:#0f766e;color:#fff;text-decoration:none;border-radius:8px">Open in administration</a></p></main>`,
    text: `New ${options.submissionType} submission

Reference: ${options.referenceCode}
Submitter: ${options.submitterName} (${options.submitterEmail})
Title: ${options.title}
Summary: ${options.summary}
Submitted: ${options.submittedAt}
Source: RUET IoT Club website

Open: ${adminUrl}`
  };
}
__name(authoritySubmissionEmail, "authoritySubmissionEmail");
function submissionStatusEmail(options) {
  const explanation = options.publicResponse ? `Status: ${options.status}. Response: ${options.publicResponse}` : `The status is now ${options.status}.`;
  return actionEmail({
    title: `Update for submission ${options.referenceCode}`,
    greeting: `Hello ${options.submitterName},`,
    explanation,
    actionUrl: `${options.siteUrl}/track-submission?reference=${encodeURIComponent(options.referenceCode)}`,
    action: "View tracking page"
  });
}
__name(submissionStatusEmail, "submissionStatusEmail");
async function createEmailQueueRecord(options) {
  const encrypted = await encryptJson(options.payload, options.secret);
  return {
    id: crypto.randomUUID(),
    userId: options.userId,
    template: options.template,
    recipientEmail: options.recipientEmail,
    encryptedPayload: encrypted.ciphertext,
    payloadIv: encrypted.iv
  };
}
__name(createEmailQueueRecord, "createEmailQueueRecord");
function insertEmailStatement(db, record) {
  return db.prepare(
    `INSERT INTO email_outbox
        (id, user_id, template, recipient_email, encrypted_payload, payload_iv)
       VALUES (?, ?, ?, ?, ?, ?)`
  ).bind(
    record.id,
    record.userId,
    record.template,
    record.recipientEmail,
    record.encryptedPayload,
    record.payloadIv
  );
}
__name(insertEmailStatement, "insertEmailStatement");
async function dispatchPendingEmails(env) {
  await env.DB.batch([
    env.DB.prepare("DELETE FROM auth_rate_limits WHERE expires_at < ?").bind(Date.now()),
    env.DB.prepare("DELETE FROM command_idempotency WHERE expires_at < ?").bind((/* @__PURE__ */ new Date()).toISOString()),
    env.DB.prepare(
      `UPDATE email_outbox SET status = 'FAILED', last_error = 'Delivery lease expired',
         next_attempt_at = strftime('%Y-%m-%dT%H:%M:%fZ', 'now'), updated_at = strftime('%Y-%m-%dT%H:%M:%fZ', 'now')
       WHERE status = 'SENDING' AND updated_at < strftime('%Y-%m-%dT%H:%M:%fZ', 'now', '-15 minutes')`
    )
  ]);
  const { results } = await env.DB.prepare(
    `SELECT id, recipient_email, encrypted_payload, payload_iv, attempts
     FROM email_outbox
     WHERE status IN ('PENDING', 'FAILED') AND next_attempt_at <= strftime('%Y-%m-%dT%H:%M:%fZ', 'now')
     ORDER BY created_at ASC
     LIMIT 10`
  ).all();
  for (const row of results) {
    const claim = await env.DB.prepare(
      `UPDATE email_outbox SET status = 'SENDING', attempts = attempts + 1,
         updated_at = strftime('%Y-%m-%dT%H:%M:%fZ', 'now')
       WHERE id = ? AND status IN ('PENDING', 'FAILED')`
    ).bind(row.id).run();
    if (claim.meta.changes !== 1) continue;
    try {
      const payload = await decryptJson(row.encrypted_payload, row.payload_iv, env.SESSION_SECRET);
      const result = await env.EMAIL.send({
        to: row.recipient_email,
        from: { email: env.EMAIL_FROM, name: "RUET IoT Club" },
        subject: payload.subject,
        html: payload.html,
        text: payload.text
      });
      await env.DB.prepare(
        `UPDATE email_outbox
         SET status = 'SENT', provider_message_id = ?, sent_at = strftime('%Y-%m-%dT%H:%M:%fZ', 'now'),
             updated_at = strftime('%Y-%m-%dT%H:%M:%fZ', 'now'), last_error = NULL
         WHERE id = ?`
      ).bind(result.messageId, row.id).run();
    } catch (error) {
      const attempt = row.attempts + 1;
      const retryMinutes = Math.min(2 ** attempt, 24 * 60);
      const nextAttemptAt = new Date(Date.now() + retryMinutes * 6e4).toISOString();
      const message = error instanceof Error ? error.message.slice(0, 500) : "Unknown email delivery error";
      await env.DB.prepare(
        `UPDATE email_outbox SET status = 'FAILED', next_attempt_at = ?, last_error = ?,
           updated_at = strftime('%Y-%m-%dT%H:%M:%fZ', 'now') WHERE id = ?`
      ).bind(nextAttemptAt, message, row.id).run();
      console.error(JSON.stringify({ message: "email.delivery_failed", outboxId: row.id, attempt, error: message }));
    }
  }
}
__name(dispatchPendingEmails, "dispatchPendingEmails");

// worker/services/turnstile.ts
var TURNSTILE_VERIFY_URL = "https://challenges.cloudflare.com/turnstile/v0/siteverify";
var MAX_TOKEN_LENGTH = 2048;
var turnstileResponseSchema = external_exports.object({
  success: external_exports.boolean(),
  hostname: external_exports.string().optional(),
  action: external_exports.string().optional(),
  cdata: external_exports.string().optional(),
  "error-codes": external_exports.array(external_exports.string()).optional()
});
async function verifyTurnstile(options) {
  const token2 = options.token.trim();
  if (token2.length === 0 || token2.length > MAX_TOKEN_LENGTH) {
    return { success: false, errorCodes: ["invalid-input-response"] };
  }
  const body = new URLSearchParams({ secret: options.secret, response: token2 });
  if (options.remoteIp) {
    body.set("remoteip", options.remoteIp);
  }
  const response = await fetch(TURNSTILE_VERIFY_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body
  });
  if (!response.ok) {
    throw new AppError({
      code: "BOT_PROTECTION_UNAVAILABLE",
      message: "Bot protection could not be verified. Please try again.",
      status: 502
    });
  }
  const parsed = turnstileResponseSchema.safeParse(await response.json());
  if (!parsed.success) {
    throw new AppError({
      code: "BOT_PROTECTION_INVALID_RESPONSE",
      message: "Bot protection returned an invalid response.",
      status: 502
    });
  }
  const actionMatches = !options.expectedAction || parsed.data.action === options.expectedAction;
  const hostnameMatches = !options.expectedHostnames?.length || Boolean(parsed.data.hostname) && options.expectedHostnames.includes(parsed.data.hostname);
  return {
    success: parsed.data.success && actionMatches && hostnameMatches,
    ...parsed.data.hostname ? { hostname: parsed.data.hostname } : {},
    ...parsed.data.action ? { action: parsed.data.action } : {},
    errorCodes: !actionMatches ? ["action-mismatch"] : !hostnameMatches ? ["hostname-mismatch"] : parsed.data["error-codes"] ?? []
  };
}
__name(verifyTurnstile, "verifyTurnstile");
async function enforceTurnstile(options) {
  const testEnv = options.env;
  if (String(options.env.ENVIRONMENT) === "test" && testEnv.TURNSTILE_TEST_BYPASS_TOKEN === options.token)
    return;
  const expectedHostnames = Array.from(
    new Set(
      [options.env.SITE_URL, options.env.FRONTEND_ORIGIN].map((value) => new URL(value).hostname).filter(Boolean)
    )
  );
  const verification = await verifyTurnstile({
    secret: options.env.TURNSTILE_SECRET,
    token: options.token,
    remoteIp: clientIp(options.request),
    expectedAction: options.env.TURNSTILE_SITE_KEY === "1x00000000000000000000AA" ? void 0 : options.action,
    expectedHostnames: options.env.TURNSTILE_SITE_KEY === "1x00000000000000000000AA" ? void 0 : expectedHostnames
  });
  if (!verification.success) {
    throw new AppError({
      code: "BOT_CHECK_FAILED",
      message: "Please complete the security check again.",
      status: 403
    });
  }
}
__name(enforceTurnstile, "enforceTurnstile");

// worker/db/audit.ts
function createAuditStatement(db, event) {
  return db.prepare(
    `INSERT INTO audit_logs
        (id, actor_type, actor_id, action, entity_type, entity_id, reason, metadata_json, request_id)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`
  ).bind(
    crypto.randomUUID(),
    event.actorType ?? (event.actorId ? "USER" : "SYSTEM"),
    event.actorId ?? null,
    event.action,
    event.entityType,
    event.entityId ?? null,
    event.reason ?? null,
    JSON.stringify(event.metadata ?? {}),
    event.requestId
  );
}
__name(createAuditStatement, "createAuditStatement");

// worker/routes/auth.ts
var VERIFY_TOKEN_HOURS = 24;
var RESET_TOKEN_HOURS = 1;
var GENERIC_EMAIL_MESSAGE = "If the account is eligible, an email will arrive shortly.";
function expiresInHours(hours) {
  return new Date(Date.now() + hours * 60 * 60 * 1e3).toISOString();
}
__name(expiresInHours, "expiresInHours");
function publicUser(row) {
  return {
    id: row.id,
    email: row.primary_email,
    displayName: row.display_name,
    onboardingStatus: row.onboarding_status,
    mustChangePassword: row.must_change_password === 1,
    fixedSuperAdmin: row.is_fixed_super_admin === 1
  };
}
__name(publicUser, "publicUser");
function isUniqueConstraint(error) {
  return error instanceof Error && /UNIQUE constraint failed/iu.test(error.message);
}
__name(isUniqueConstraint, "isUniqueConstraint");
var authRoutes = new Hono2();
authRoutes.get(
  "/auth/config",
  (context) => context.json(
    success({ turnstileSiteKey: context.env.TURNSTILE_SITE_KEY }, context.get("requestId"))
  )
);
authRoutes.post("/auth/register", async (context) => {
  const input = await parseJson(context, registerSchema);
  const normalizedEmail = normalizeEmail(input.email);
  const ip = clientIp(context.req.raw);
  await enforceRateLimit({ db: context.env.DB, scope: "register", identifier: ip, limit: 5, windowSeconds: 3600 });
  await enforceTurnstile({ env: context.env, request: context.req.raw, token: input.turnstileToken, action: "register" });
  const userId = crypto.randomUUID();
  const token2 = createOpaqueToken();
  const passwordHash = await hashPassword(input.password);
  const tokenHash = await sha2562(token2);
  const emailRecord = await createEmailQueueRecord({
    secret: context.env.SESSION_SECRET,
    userId,
    template: "VERIFY_EMAIL",
    recipientEmail: normalizedEmail,
    payload: verificationEmail(context.env.FRONTEND_ORIGIN, input.displayName, token2)
  });
  try {
    await context.env.DB.batch([
      context.env.DB.prepare(
        `INSERT INTO users (id, primary_email, primary_email_normalized, display_name)
         VALUES (?, ?, ?, ?)`
      ).bind(userId, input.email.trim(), normalizedEmail, input.displayName),
      context.env.DB.prepare(
        "INSERT INTO password_credentials (user_id, password_hash) VALUES (?, ?)"
      ).bind(userId, passwordHash),
      context.env.DB.prepare(
        `INSERT INTO email_verification_tokens (id, user_id, email_normalized, token_hash, expires_at)
         VALUES (?, ?, ?, ?, ?)`
      ).bind(crypto.randomUUID(), userId, normalizedEmail, tokenHash, expiresInHours(VERIFY_TOKEN_HOURS)),
      context.env.DB.prepare("INSERT INTO notification_preferences (user_id) VALUES (?)").bind(userId),
      context.env.DB.prepare(
        "INSERT INTO user_profiles (user_id, data_json) VALUES (?, ?)"
      ).bind(userId, JSON.stringify({
        phone: input.phone ?? null,
        institution: input.institution,
        department: input.department,
        professional_status: input.professionalStatus,
        consent_recorded_at: (/* @__PURE__ */ new Date()).toISOString()
      })),
      insertEmailStatement(context.env.DB, emailRecord),
      createAuditStatement(context.env.DB, {
        requestId: context.get("requestId"),
        actorId: userId,
        action: "ACCOUNT_REGISTERED",
        entityType: "USER",
        entityId: userId
      })
    ]);
  } catch (error) {
    if (isUniqueConstraint(error)) {
      throw new AppError({ code: "ACCOUNT_EXISTS", message: "An account already exists for this email.", status: 409 });
    }
    throw error;
  }
  return context.json(
    success({ verificationRequired: true, message: "Account created. Verify your email before signing in." }, context.get("requestId")),
    201
  );
});
authRoutes.post("/auth/resend-verification", async (context) => {
  const input = await parseJson(context, emailOnlySchema);
  const normalizedEmail = normalizeEmail(input.email);
  await enforceRateLimit({
    db: context.env.DB,
    scope: "resend-verification",
    identifier: `${clientIp(context.req.raw)}:${normalizedEmail}`,
    limit: 5,
    windowSeconds: 3600
  });
  const account = await context.env.DB.prepare(
    `SELECT id, primary_email, display_name FROM users
     WHERE primary_email_normalized = ? AND status = 'PENDING_EMAIL_VERIFICATION'`
  ).bind(normalizedEmail).first();
  if (account) {
    const token2 = createOpaqueToken();
    const emailRecord = await createEmailQueueRecord({
      secret: context.env.SESSION_SECRET,
      userId: account.id,
      template: "VERIFY_EMAIL",
      recipientEmail: account.primary_email,
      payload: verificationEmail(context.env.FRONTEND_ORIGIN, account.display_name, token2)
    });
    await context.env.DB.batch([
      context.env.DB.prepare(
        "UPDATE email_verification_tokens SET consumed_at = ? WHERE user_id = ? AND consumed_at IS NULL"
      ).bind((/* @__PURE__ */ new Date()).toISOString(), account.id),
      context.env.DB.prepare(
        `INSERT INTO email_verification_tokens (id, user_id, email_normalized, token_hash, expires_at)
         VALUES (?, ?, ?, ?, ?)`
      ).bind(crypto.randomUUID(), account.id, normalizedEmail, await sha2562(token2), expiresInHours(VERIFY_TOKEN_HOURS)),
      insertEmailStatement(context.env.DB, emailRecord),
      createAuditStatement(context.env.DB, {
        requestId: context.get("requestId"),
        actorId: account.id,
        action: "EMAIL_VERIFICATION_RESENT",
        entityType: "USER",
        entityId: account.id
      })
    ]);
  }
  return context.json(success({ message: GENERIC_EMAIL_MESSAGE }, context.get("requestId")));
});
authRoutes.post("/auth/verify-email", async (context) => {
  const { token: token2 } = await parseJson(context, tokenOnlySchema);
  const row = await context.env.DB.prepare(
    `SELECT t.id AS token_id, t.user_id, u.primary_email, u.display_name
     FROM email_verification_tokens t JOIN users u ON u.id = t.user_id
     WHERE t.token_hash = ? AND t.consumed_at IS NULL AND t.expires_at > ?
       AND u.status = 'PENDING_EMAIL_VERIFICATION'`
  ).bind(await sha2562(token2), (/* @__PURE__ */ new Date()).toISOString()).first();
  if (!row) {
    throw new AppError({ code: "INVALID_OR_EXPIRED_TOKEN", message: "This verification link is invalid or expired.", status: 400 });
  }
  const now = (/* @__PURE__ */ new Date()).toISOString();
  await context.env.DB.batch([
    context.env.DB.prepare(
      `UPDATE users SET status = 'EMAIL_VERIFIED', email_verified_at = ?, updated_at = ?
       WHERE id = ? AND status = 'PENDING_EMAIL_VERIFICATION'`
    ).bind(now, now, row.user_id),
    context.env.DB.prepare("UPDATE email_verification_tokens SET consumed_at = ? WHERE id = ?").bind(now, row.token_id),
    createAuditStatement(context.env.DB, {
      requestId: context.get("requestId"),
      actorId: row.user_id,
      action: "EMAIL_VERIFIED",
      entityType: "USER",
      entityId: row.user_id
    })
  ]);
  return context.json(success({ verified: true }, context.get("requestId")));
});
authRoutes.post("/auth/login", async (context) => {
  const input = await parseJson(context, loginSchema);
  const normalizedEmail = normalizeEmail(input.email);
  const ip = clientIp(context.req.raw);
  await enforceRateLimit({
    db: context.env.DB,
    scope: "login",
    identifier: `${ip}:${normalizedEmail}`,
    limit: 10,
    windowSeconds: 900
  });
  const account = await context.env.DB.prepare(
    `SELECT u.id, u.primary_email, u.primary_email_normalized, u.display_name, u.status, u.onboarding_status,
            p.password_hash, p.failed_attempts, p.locked_until, p.must_change_password,
            u.is_fixed_super_admin
     FROM users u JOIN password_credentials p ON p.user_id = u.id
     WHERE u.primary_email_normalized = ?`
  ).bind(normalizedEmail).first();
  if (!account) {
    await hashPassword(input.password);
    throw new AppError({ code: "INVALID_CREDENTIALS", message: "The email or password is incorrect.", status: 401 });
  }
  const validPassword = await verifyPassword(input.password, account.password_hash);
  if (account.locked_until && account.locked_until > (/* @__PURE__ */ new Date()).toISOString()) {
    throw new AppError({ code: "ACCOUNT_TEMPORARILY_LOCKED", message: "This account is temporarily locked. Try again later.", status: 429 });
  }
  if (!validPassword) {
    const failures = account.failed_attempts + 1;
    const lockedUntil = failures >= 5 ? new Date(Date.now() + 15 * 60 * 1e3).toISOString() : null;
    await context.env.DB.prepare(
      "UPDATE password_credentials SET failed_attempts = ?, locked_until = ? WHERE user_id = ?"
    ).bind(failures >= 5 ? 0 : failures, lockedUntil, account.id).run();
    throw new AppError({ code: "INVALID_CREDENTIALS", message: "The email or password is incorrect.", status: 401 });
  }
  if (account.status === "PENDING_EMAIL_VERIFICATION") {
    throw new AppError({ code: "EMAIL_NOT_VERIFIED", message: "Verify your email before signing in.", status: 403 });
  }
  if (account.status !== "EMAIL_VERIFIED") {
    throw new AppError({ code: "ACCOUNT_UNAVAILABLE", message: "This account is not available for sign-in.", status: 403 });
  }
  const session = await createSessionMaterial(context.env.SESSION_SECRET);
  await context.env.DB.batch([
    context.env.DB.prepare(
      `INSERT INTO sessions
        (id, user_id, token_hash, csrf_token_hash, user_agent_hash, ip_hash, expires_at)
       VALUES (?, ?, ?, ?, ?, ?, ?)`
    ).bind(
      session.id,
      account.id,
      session.tokenHash,
      session.csrfTokenHash,
      await sha2562(context.req.header("User-Agent") ?? "unknown"),
      await sha2562(ip),
      session.expiresAt
    ),
    context.env.DB.prepare(
      "UPDATE password_credentials SET failed_attempts = 0, locked_until = NULL WHERE user_id = ?"
    ).bind(account.id),
    createAuditStatement(context.env.DB, {
      requestId: context.get("requestId"),
      actorId: account.id,
      action: "SESSION_CREATED",
      entityType: "SESSION",
      entityId: session.id
    })
  ]);
  setSessionCookie(context, session.token);
  const authorization = await getAuthorizationForUser(context.env.DB, account.id);
  return context.json(
    success(
      {
        user: { ...publicUser(account), roles: authorization.roles, permissions: authorization.permissions },
        csrfToken: session.csrfToken,
        expiresAt: session.expiresAt
      },
      context.get("requestId")
    )
  );
});
authRoutes.post("/auth/forgot-password", async (context) => {
  const input = await parseJson(context, emailOnlySchema);
  const normalizedEmail = normalizeEmail(input.email);
  await enforceRateLimit({
    db: context.env.DB,
    scope: "forgot-password",
    identifier: `${clientIp(context.req.raw)}:${normalizedEmail}`,
    limit: 5,
    windowSeconds: 3600
  });
  const account = await context.env.DB.prepare(
    `SELECT id, primary_email, display_name FROM users
     WHERE primary_email_normalized = ? AND status = 'EMAIL_VERIFIED'`
  ).bind(normalizedEmail).first();
  if (account) {
    const token2 = createOpaqueToken();
    const emailRecord = await createEmailQueueRecord({
      secret: context.env.SESSION_SECRET,
      userId: account.id,
      template: "RESET_PASSWORD",
      recipientEmail: account.primary_email,
      payload: passwordResetEmail(context.env.FRONTEND_ORIGIN, account.display_name, token2)
    });
    await context.env.DB.batch([
      context.env.DB.prepare(
        "UPDATE password_reset_tokens SET consumed_at = ? WHERE user_id = ? AND consumed_at IS NULL"
      ).bind((/* @__PURE__ */ new Date()).toISOString(), account.id),
      context.env.DB.prepare(
        "INSERT INTO password_reset_tokens (id, user_id, token_hash, expires_at) VALUES (?, ?, ?, ?)"
      ).bind(crypto.randomUUID(), account.id, await sha2562(token2), expiresInHours(RESET_TOKEN_HOURS)),
      insertEmailStatement(context.env.DB, emailRecord),
      createAuditStatement(context.env.DB, {
        requestId: context.get("requestId"),
        actorId: account.id,
        action: "PASSWORD_RESET_REQUESTED",
        entityType: "USER",
        entityId: account.id
      })
    ]);
  }
  return context.json(success({ message: GENERIC_EMAIL_MESSAGE }, context.get("requestId")));
});
authRoutes.post("/auth/reset-password", async (context) => {
  const input = await parseJson(context, resetPasswordSchema);
  const row = await context.env.DB.prepare(
    `SELECT t.id AS token_id, t.user_id, u.primary_email, u.display_name
     FROM password_reset_tokens t JOIN users u ON u.id = t.user_id
     WHERE t.token_hash = ? AND t.consumed_at IS NULL AND t.expires_at > ? AND u.status = 'EMAIL_VERIFIED'`
  ).bind(await sha2562(input.token), (/* @__PURE__ */ new Date()).toISOString()).first();
  if (!row) {
    throw new AppError({ code: "INVALID_OR_EXPIRED_TOKEN", message: "This reset link is invalid or expired.", status: 400 });
  }
  const now = (/* @__PURE__ */ new Date()).toISOString();
  await context.env.DB.batch([
    context.env.DB.prepare(
      "UPDATE password_credentials SET password_hash = ?, password_changed_at = ?, failed_attempts = 0, locked_until = NULL, must_change_password = 0 WHERE user_id = ?"
    ).bind(await hashPassword(input.password), now, row.user_id),
    context.env.DB.prepare("UPDATE password_reset_tokens SET consumed_at = ? WHERE id = ?").bind(now, row.token_id),
    context.env.DB.prepare(
      "UPDATE sessions SET revoked_at = ?, revocation_reason = 'PASSWORD_RESET' WHERE user_id = ? AND revoked_at IS NULL"
    ).bind(now, row.user_id),
    createAuditStatement(context.env.DB, {
      requestId: context.get("requestId"),
      actorId: row.user_id,
      action: "PASSWORD_RESET_COMPLETED",
      entityType: "USER",
      entityId: row.user_id
    })
  ]);
  return context.json(success({ reset: true, signInRequired: true }, context.get("requestId")));
});
authRoutes.post("/auth/change-password", sessionMiddleware({ required: true }), csrfMiddleware(), async (context) => {
  const { user, session } = requireAuth(context);
  const input = await parseJson(context, changePasswordSchema);
  const credential = await context.env.DB.prepare(
    "SELECT password_hash FROM password_credentials WHERE user_id = ?"
  ).bind(user.id).first();
  if (!credential || !await verifyPassword(input.currentPassword, credential.password_hash)) {
    throw new AppError({ code: "INVALID_CREDENTIALS", message: "The current password is incorrect.", status: 401 });
  }
  const now = (/* @__PURE__ */ new Date()).toISOString();
  await context.env.DB.batch([
    context.env.DB.prepare(
      `UPDATE password_credentials
       SET password_hash = ?, password_changed_at = ?, failed_attempts = 0,
           locked_until = NULL, must_change_password = 0
       WHERE user_id = ?`
    ).bind(await hashPassword(input.newPassword), now, user.id),
    context.env.DB.prepare(
      `UPDATE sessions SET revoked_at = ?, revocation_reason = 'PASSWORD_CHANGED'
       WHERE user_id = ? AND id != ? AND revoked_at IS NULL`
    ).bind(now, user.id, session.id),
    createAuditStatement(context.env.DB, {
      requestId: context.get("requestId"),
      actorId: user.id,
      action: "PASSWORD_CHANGED",
      entityType: "USER",
      entityId: user.id,
      metadata: { otherSessionsRevoked: true }
    })
  ]);
  return context.json(success({ changed: true, mustChangePassword: false }, context.get("requestId")));
});
authRoutes.get("/auth/session", sessionMiddleware({ required: false }), async (context) => {
  const user = context.get("authUser");
  if (!user) return context.json(success({ authenticated: false }, context.get("requestId")));
  const csrfToken = await currentCsrfToken(context);
  return context.json(success({ authenticated: true, user, csrfToken }, context.get("requestId")));
});
authRoutes.post("/auth/logout", sessionMiddleware({ required: true }), csrfMiddleware(), async (context) => {
  const { user, session } = requireAuth(context);
  const now = (/* @__PURE__ */ new Date()).toISOString();
  await context.env.DB.batch([
    context.env.DB.prepare(
      "UPDATE sessions SET revoked_at = ?, revocation_reason = 'USER_LOGOUT' WHERE id = ? AND revoked_at IS NULL"
    ).bind(now, session.id),
    createAuditStatement(context.env.DB, {
      requestId: context.get("requestId"),
      actorId: user.id,
      action: "SESSION_REVOKED",
      entityType: "SESSION",
      entityId: session.id
    })
  ]);
  clearSessionCookie(context);
  return context.json(success({ loggedOut: true }, context.get("requestId")));
});
authRoutes.post("/auth/logout-all", sessionMiddleware({ required: true }), csrfMiddleware(), async (context) => {
  const { user } = requireAuth(context);
  const now = (/* @__PURE__ */ new Date()).toISOString();
  await context.env.DB.batch([
    context.env.DB.prepare(
      "UPDATE sessions SET revoked_at = ?, revocation_reason = 'USER_LOGOUT_ALL' WHERE user_id = ? AND revoked_at IS NULL"
    ).bind(now, user.id),
    createAuditStatement(context.env.DB, {
      requestId: context.get("requestId"),
      actorId: user.id,
      action: "ALL_SESSIONS_REVOKED",
      entityType: "USER",
      entityId: user.id
    })
  ]);
  clearSessionCookie(context);
  return context.json(success({ loggedOut: true, allSessions: true }, context.get("requestId")));
});
authRoutes.post("/auth/change-email/request", sessionMiddleware({ required: true }), csrfMiddleware(), async (context) => {
  const { user } = requireAuth(context);
  if (user.fixedSuperAdmin) {
    throw new AppError({ code: "FIXED_ADMIN_EMAIL", message: "This fixed super administrator email cannot be changed.", status: 409 });
  }
  const input = await parseJson(context, emailChangeSchema);
  const normalizedEmail = normalizeEmail(input.email);
  const credential = await context.env.DB.prepare("SELECT password_hash FROM password_credentials WHERE user_id = ?").bind(user.id).first();
  if (!credential || !await verifyPassword(input.password, credential.password_hash)) {
    throw new AppError({ code: "INVALID_CREDENTIALS", message: "The password is incorrect.", status: 401 });
  }
  const existing = await context.env.DB.prepare("SELECT id FROM users WHERE primary_email_normalized = ?").bind(normalizedEmail).first();
  if (existing) {
    throw new AppError({ code: "EMAIL_UNAVAILABLE", message: "That email address cannot be used.", status: 409 });
  }
  const token2 = createOpaqueToken();
  const emailRecord = await createEmailQueueRecord({
    secret: context.env.SESSION_SECRET,
    userId: user.id,
    template: "VERIFY_EMAIL_CHANGE",
    recipientEmail: input.email.trim(),
    payload: emailChangeEmail(context.env.FRONTEND_ORIGIN, user.displayName, token2)
  });
  const now = (/* @__PURE__ */ new Date()).toISOString();
  await context.env.DB.batch([
    context.env.DB.prepare(
      "UPDATE email_change_requests SET consumed_at = ? WHERE user_id = ? AND consumed_at IS NULL"
    ).bind(now, user.id),
    context.env.DB.prepare(
      `INSERT INTO email_change_requests
        (id, user_id, new_email, new_email_normalized, token_hash, expires_at)
       VALUES (?, ?, ?, ?, ?, ?)`
    ).bind(crypto.randomUUID(), user.id, input.email.trim(), normalizedEmail, await sha2562(token2), expiresInHours(1)),
    insertEmailStatement(context.env.DB, emailRecord),
    createAuditStatement(context.env.DB, {
      requestId: context.get("requestId"),
      actorId: user.id,
      action: "EMAIL_CHANGE_REQUESTED",
      entityType: "USER",
      entityId: user.id
    })
  ]);
  return context.json(success({ verificationRequired: true }, context.get("requestId")));
});
authRoutes.post("/auth/change-email/verify", async (context) => {
  const { token: token2 } = await parseJson(context, tokenOnlySchema);
  const row = await context.env.DB.prepare(
    `SELECT id, user_id, new_email, new_email_normalized
     FROM email_change_requests
     WHERE token_hash = ? AND consumed_at IS NULL AND expires_at > ?`
  ).bind(await sha2562(token2), (/* @__PURE__ */ new Date()).toISOString()).first();
  if (!row) {
    throw new AppError({ code: "INVALID_OR_EXPIRED_TOKEN", message: "This email-change link is invalid or expired.", status: 400 });
  }
  const now = (/* @__PURE__ */ new Date()).toISOString();
  try {
    await context.env.DB.batch([
      context.env.DB.prepare(
        "UPDATE users SET primary_email = ?, primary_email_normalized = ?, updated_at = ? WHERE id = ?"
      ).bind(row.new_email, row.new_email_normalized, now, row.user_id),
      context.env.DB.prepare("UPDATE email_change_requests SET consumed_at = ? WHERE id = ?").bind(now, row.id),
      context.env.DB.prepare(
        "UPDATE sessions SET revoked_at = ?, revocation_reason = 'EMAIL_CHANGED' WHERE user_id = ? AND revoked_at IS NULL"
      ).bind(now, row.user_id),
      createAuditStatement(context.env.DB, {
        requestId: context.get("requestId"),
        actorId: row.user_id,
        action: "EMAIL_CHANGED",
        entityType: "USER",
        entityId: row.user_id
      })
    ]);
  } catch (error) {
    if (isUniqueConstraint(error)) {
      throw new AppError({ code: "EMAIL_UNAVAILABLE", message: "That email address cannot be used.", status: 409 });
    }
    throw error;
  }
  clearSessionCookie(context);
  return context.json(success({ changed: true, signInRequired: true }, context.get("requestId")));
});
authRoutes.post("/auth/onboarding", sessionMiddleware({ required: true }), csrfMiddleware(), async (context) => {
  const { user } = requireAuth(context);
  const input = await parseJson(context, onboardingSchema);
  await context.env.DB.batch([
    context.env.DB.prepare("UPDATE users SET onboarding_status = ?, updated_at = ? WHERE id = ?").bind(input.status, (/* @__PURE__ */ new Date()).toISOString(), user.id),
    createAuditStatement(context.env.DB, {
      requestId: context.get("requestId"),
      actorId: user.id,
      action: input.status === "COMPLETED" ? "ONBOARDING_COMPLETED" : "ONBOARDING_DISMISSED",
      entityType: "USER",
      entityId: user.id
    })
  ]);
  return context.json(success({ onboardingStatus: input.status }, context.get("requestId")));
});
authRoutes.get("/account/notification-preferences", sessionMiddleware({ required: true }), async (context) => {
  const { user } = requireAuth(context);
  const row = await context.env.DB.prepare(
    "SELECT account_email, event_email, announcement_email FROM notification_preferences WHERE user_id = ?"
  ).bind(user.id).first();
  return context.json(
    success(
      {
        accountEmail: row?.account_email === 1,
        eventEmail: row?.event_email === 1,
        announcementEmail: row?.announcement_email === 1
      },
      context.get("requestId")
    )
  );
});
authRoutes.patch(
  "/account/notification-preferences",
  sessionMiddleware({ required: true }),
  csrfMiddleware(),
  async (context) => {
    const { user } = requireAuth(context);
    const input = await parseJson(context, notificationPreferencesSchema);
    await context.env.DB.prepare(
      `UPDATE notification_preferences
       SET account_email = COALESCE(?, account_email), event_email = COALESCE(?, event_email),
           announcement_email = COALESCE(?, announcement_email), updated_at = ?
       WHERE user_id = ?`
    ).bind(
      input.accountEmail === void 0 ? null : Number(input.accountEmail),
      input.eventEmail === void 0 ? null : Number(input.eventEmail),
      input.announcementEmail === void 0 ? null : Number(input.announcementEmail),
      (/* @__PURE__ */ new Date()).toISOString(),
      user.id
    ).run();
    return context.json(success({ updated: true }, context.get("requestId")));
  }
);
authRoutes.post(
  "/account/deletion-request",
  sessionMiddleware({ required: true }),
  csrfMiddleware(),
  async (context) => {
    const { user } = requireAuth(context);
    if (user.fixedSuperAdmin) {
      throw new AppError({ code: "FIXED_ADMIN_ACCOUNT", message: "A fixed super administrator account cannot be deleted.", status: 409 });
    }
    const input = await parseJson(context, deletionRequestSchema);
    const requestId = crypto.randomUUID();
    const now = (/* @__PURE__ */ new Date()).toISOString();
    const emailRecord = await createEmailQueueRecord({
      secret: context.env.SESSION_SECRET,
      userId: user.id,
      template: "ACCOUNT_DELETION_REQUESTED",
      recipientEmail: user.email,
      payload: accountDeletionEmail(user.displayName)
    });
    try {
      await context.env.DB.batch([
        context.env.DB.prepare(
          "INSERT INTO account_deletion_requests (id, user_id, reason) VALUES (?, ?, ?)"
        ).bind(requestId, user.id, input.reason ?? null),
        context.env.DB.prepare(
          "UPDATE users SET status = 'DELETION_REQUESTED', updated_at = ? WHERE id = ?"
        ).bind(now, user.id),
        context.env.DB.prepare(
          "UPDATE sessions SET revoked_at = ?, revocation_reason = 'DELETION_REQUESTED' WHERE user_id = ? AND revoked_at IS NULL"
        ).bind(now, user.id),
        insertEmailStatement(context.env.DB, emailRecord),
        createAuditStatement(context.env.DB, {
          requestId: context.get("requestId"),
          actorId: user.id,
          action: "ACCOUNT_DELETION_REQUESTED",
          entityType: "ACCOUNT_DELETION_REQUEST",
          entityId: requestId
        })
      ]);
    } catch (error) {
      if (!isUniqueConstraint(error)) throw error;
    }
    clearSessionCookie(context);
    return context.json(success({ requested: true, signedOut: true }, context.get("requestId")), 202);
  }
);

// worker/db/idempotency.ts
var IDEMPOTENCY_KEY_PATTERN = /^[A-Za-z0-9._:-]{8,128}$/u;
var IDEMPOTENCY_HOURS = 24;
function isJsonValue(value) {
  if (value === null || typeof value === "string" || typeof value === "boolean") return true;
  if (typeof value === "number") return Number.isFinite(value);
  if (Array.isArray(value)) return value.every(isJsonValue);
  if (typeof value === "object") return Object.values(value).every(isJsonValue);
  return false;
}
__name(isJsonValue, "isJsonValue");
function parseStoredData(value) {
  const parsed = JSON.parse(value);
  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
    throw new Error("Stored idempotent response is invalid.");
  }
  const result = {};
  for (const [key, item] of Object.entries(parsed)) {
    if (!isJsonValue(item)) {
      throw new Error("Stored idempotent response contains an unsupported value.");
    }
    result[key] = item;
  }
  return result;
}
__name(parseStoredData, "parseStoredData");
function requireIdempotencyKey(context) {
  const key = context.req.header("Idempotency-Key")?.trim() ?? "";
  if (!IDEMPOTENCY_KEY_PATTERN.test(key)) {
    throw new AppError({
      code: "IDEMPOTENCY_KEY_REQUIRED",
      message: "Provide an Idempotency-Key containing 8 to 128 safe characters.",
      status: 400
    });
  }
  return key;
}
__name(requireIdempotencyKey, "requireIdempotencyKey");
async function commandHashes(options) {
  const [keyHash, requestHash] = await Promise.all([
    sha2562(options.idempotencyKey),
    sha2562(`${options.operation}:${JSON.stringify(options.requestData)}`)
  ]);
  return { keyHash, requestHash };
}
__name(commandHashes, "commandHashes");
async function findStoredCommand(options) {
  return options.db.prepare(
    `SELECT request_hash, state, response_status, response_body_json
       FROM command_idempotency
       WHERE operation = ? AND actor_key = ? AND key_hash = ? AND expires_at > ?`
  ).bind(options.operation, options.actorKey, options.keyHash, (/* @__PURE__ */ new Date()).toISOString()).first();
}
__name(findStoredCommand, "findStoredCommand");
function resolveStoredCommand(row, requestHash) {
  if (row.request_hash !== requestHash) {
    throw new AppError({
      code: "IDEMPOTENCY_CONFLICT",
      message: "This idempotency key was already used for a different request.",
      status: 409
    });
  }
  if (row.state !== "COMPLETED" || row.response_status === null || row.response_body_json === null) {
    throw new AppError({
      code: "COMMAND_IN_PROGRESS",
      message: "A command with this idempotency key is still in progress.",
      status: 409
    });
  }
  return { data: parseStoredData(row.response_body_json), status: row.response_status, replayed: true };
}
__name(resolveStoredCommand, "resolveStoredCommand");
async function getIdempotentReplay(options) {
  const { keyHash, requestHash } = await commandHashes(options);
  const existing = await findStoredCommand({
    db: options.db,
    operation: options.operation,
    actorKey: options.actorKey,
    keyHash
  });
  return existing ? resolveStoredCommand(existing, requestHash) : null;
}
__name(getIdempotentReplay, "getIdempotentReplay");
async function executeIdempotentCommand(options) {
  const { keyHash, requestHash } = await commandHashes(options);
  const existing = await findStoredCommand({
    db: options.db,
    operation: options.operation,
    actorKey: options.actorKey,
    keyHash
  });
  if (existing) return resolveStoredCommand(existing, requestHash);
  const commandId = crypto.randomUUID();
  const now = (/* @__PURE__ */ new Date()).toISOString();
  const expiresAt = new Date(Date.now() + IDEMPOTENCY_HOURS * 60 * 60 * 1e3).toISOString();
  const reservation = options.db.prepare(
    `INSERT INTO command_idempotency
        (id, operation, actor_key, key_hash, request_hash, expires_at)
       VALUES (?, ?, ?, ?, ?, ?)`
  ).bind(commandId, options.operation, options.actorKey, keyHash, requestHash, expiresAt);
  const completion = options.db.prepare(
    `UPDATE command_idempotency
       SET state = 'COMPLETED', response_status = ?, response_body_json = ?, completed_at = ?
       WHERE id = ? AND state = 'IN_PROGRESS'`
  ).bind(options.responseStatus, JSON.stringify(options.responseData), now, commandId);
  try {
    await options.db.batch([reservation, ...options.statements, completion]);
  } catch (error) {
    const raced = await findStoredCommand({
      db: options.db,
      operation: options.operation,
      actorKey: options.actorKey,
      keyHash
    });
    if (raced) return resolveStoredCommand(raced, requestHash);
    throw error;
  }
  return { data: options.responseData, status: options.responseStatus, replayed: false };
}
__name(executeIdempotentCommand, "executeIdempotentCommand");

// worker/middleware/authorization.ts
function requirePermission(permission) {
  return async (context, next) => {
    const { user } = requireAuth(context);
    if (user.mustChangePassword) {
      throw new AppError({
        code: "PASSWORD_CHANGE_REQUIRED",
        message: "Change the temporary password before using administration features.",
        status: 403
      });
    }
    if (!await userHasPermission(context.env.DB, user.id, permission)) {
      throw new AppError({
        code: "PERMISSION_DENIED",
        message: "You do not have permission to perform this action.",
        status: 403
      });
    }
    return next();
  };
}
__name(requirePermission, "requirePermission");
function requireAnyPermission(permissions) {
  return async (context, next) => {
    const { user } = requireAuth(context);
    if (user.mustChangePassword) {
      throw new AppError({
        code: "PASSWORD_CHANGE_REQUIRED",
        message: "Change the temporary password before using administration features.",
        status: 403
      });
    }
    const decisions = await Promise.all(permissions.map((permission) => userHasPermission(context.env.DB, user.id, permission)));
    if (!decisions.some(Boolean)) {
      throw new AppError({
        code: "PERMISSION_DENIED",
        message: "You do not have permission to perform this action.",
        status: 403
      });
    }
    return next();
  };
}
__name(requireAnyPermission, "requireAnyPermission");

// worker/validators/admin.ts
var reason = external_exports.string().trim().min(3).max(1e3);
var permissionKey = external_exports.string().trim().regex(/^[a-z][a-z0-9_]*(?:\.[a-z][a-z0-9_]*)+$/u).max(100);
var roleKey = external_exports.string().trim().regex(/^[A-Z][A-Z0-9_]{2,63}$/u);
var bootstrapAdminSchema = external_exports.object({
  email: external_exports.string().trim().email().max(254),
  reason
});
var fixedAdminEmail = external_exports.enum(["ruetiotclub@gmail.com", "abusufyan.cse20@gmail.com"]);
var provisionFixedSuperAdminsSchema = external_exports.object({
  accounts: external_exports.array(external_exports.object({
    email: fixedAdminEmail,
    displayName: external_exports.string().trim().min(2).max(100),
    password: external_exports.string().min(12).max(128)
  })).length(2).superRefine((accounts, context) => {
    const emails = new Set(accounts.map((account) => account.email));
    if (emails.size !== 2) {
      context.addIssue({ code: external_exports.ZodIssueCode.custom, message: "Both fixed administrator emails are required." });
    }
  }),
  reason
});
var createRoleSchema = external_exports.object({
  key: roleKey,
  name: external_exports.string().trim().min(2).max(100),
  description: external_exports.string().trim().min(3).max(500),
  permissionKeys: external_exports.array(permissionKey).min(1).max(100).transform((values) => [...new Set(values)]),
  reason
});
var updateRolePermissionsSchema = external_exports.object({
  permissionKeys: external_exports.array(permissionKey).min(1).max(100).transform((values) => [...new Set(values)]),
  reason
});
var archiveRoleSchema = external_exports.object({ reason });
var grantRoleSchema = external_exports.object({
  userEmail: external_exports.string().trim().email().max(254),
  roleKey,
  reason,
  expiresAt: external_exports.string().datetime({ offset: true }).optional()
});
var revokeRoleSchema = external_exports.object({ reason });
var updateUserStatusSchema = external_exports.object({
  status: external_exports.enum(["EMAIL_VERIFIED", "SUSPENDED"]),
  reason
});
var archiveUserSchema = external_exports.object({
  confirmationEmail: external_exports.string().trim().email().max(254),
  reason
});

// worker/routes/admin.ts
function idempotentJson(context, result) {
  context.header("Idempotency-Replayed", result.replayed ? "true" : "false");
  if (result.status === 201)
    return context.json(success(result.data, context.get("requestId")), 201);
  if (result.status === 202)
    return context.json(success(result.data, context.get("requestId")), 202);
  return context.json(success(result.data, context.get("requestId")), 200);
}
__name(idempotentJson, "idempotentJson");
function rejectFixedSuperAdminMutation(target) {
  if (target.is_fixed_super_admin !== 1) return;
  throw new AppError({
    code: "FIXED_SUPER_ADMIN_PROTECTED",
    message: "Fixed super administrator accounts cannot be suspended, archived, or stripped of their protected role.",
    status: 409
  });
}
__name(rejectFixedSuperAdminMutation, "rejectFixedSuperAdminMutation");
function mapAuthorizationDatabaseError(error) {
  const message = error instanceof Error ? error.message : "";
  if (/last active super administrator/iu.test(message)) {
    throw new AppError({
      code: "LAST_SUPER_ADMIN_REQUIRED",
      message: "At least one active verified super administrator must remain.",
      status: 409
    });
  }
  if (/bootstrap has already completed/iu.test(message)) {
    throw new AppError({
      code: "BOOTSTRAP_ALREADY_COMPLETED",
      message: "Authorization bootstrap is already complete.",
      status: 409
    });
  }
  if (/UNIQUE constraint failed: user_roles/iu.test(message)) {
    throw new AppError({
      code: "ROLE_ALREADY_ASSIGNED",
      message: "That user already has an active assignment for this role.",
      status: 409
    });
  }
  if (/system roles are immutable|super administrator permissions cannot be removed/iu.test(
    message
  )) {
    throw new AppError({
      code: "SYSTEM_ROLE_IMMUTABLE",
      message: "System roles cannot be changed or archived.",
      status: 409
    });
  }
  if (/super administrator authority cannot be delegated/iu.test(message)) {
    throw new AppError({
      code: "SUPER_ADMIN_PERMISSION_NON_DELEGABLE",
      message: "Super administrator authority can only belong to the system SUPER_ADMIN role.",
      status: 422
    });
  }
  throw error;
}
__name(mapAuthorizationDatabaseError, "mapAuthorizationDatabaseError");
async function permissionRows(db, keys2) {
  const placeholders = keys2.map(() => "?").join(", ");
  const { results } = await db.prepare(
    `SELECT id, permission_key, category, description FROM permissions
       WHERE permission_key IN (${placeholders}) ORDER BY permission_key`
  ).bind(...keys2).all();
  if (results.length !== keys2.length) {
    throw new AppError({
      code: "UNKNOWN_PERMISSION",
      message: "One or more permission keys do not exist.",
      status: 422
    });
  }
  return results;
}
__name(permissionRows, "permissionRows");
async function activeRole(db, roleKey2) {
  const role = await db.prepare(
    "SELECT id, role_key, is_system, deleted_at FROM roles WHERE role_key = ? AND deleted_at IS NULL"
  ).bind(roleKey2).first();
  if (!role)
    throw new AppError({
      code: "ROLE_NOT_FOUND",
      message: "The requested active role does not exist.",
      status: 404
    });
  return role;
}
__name(activeRole, "activeRole");
async function verifiedUserByEmail(db, email4) {
  const user = await db.prepare(
    `SELECT id, primary_email, display_name, status, created_at, deleted_at
       FROM users WHERE primary_email_normalized = ? AND status = 'EMAIL_VERIFIED' AND deleted_at IS NULL`
  ).bind(normalizeEmail(email4)).first();
  if (!user)
    throw new AppError({
      code: "USER_NOT_FOUND",
      message: "No active verified user matches that email.",
      status: 404
    });
  return user;
}
__name(verifiedUserByEmail, "verifiedUserByEmail");
async function requireSuperAdminAuthority(db, actorId) {
  if (!await userHasPermission(db, actorId, "rbac.super_admin.manage")) {
    throw new AppError({
      code: "SUPER_ADMIN_PERMISSION_REQUIRED",
      message: "Managing super administrator authority requires an additional permission.",
      status: 403
    });
  }
}
__name(requireSuperAdminAuthority, "requireSuperAdminAuthority");
var adminRoutes = new Hono2();
adminRoutes.use("/admin/*", sessionMiddleware({ required: true }));
adminRoutes.get(
  "/admin/overview",
  requirePermission("admin.access"),
  async (context) => {
    const { user } = requireAuth(context);
    const has = /* @__PURE__ */ __name((...permissions) => permissions.some((permission) => user.permissions.includes(permission)), "has");
    const count = /* @__PURE__ */ __name(async (sql, bindings = []) => await context.env.DB.prepare(sql).bind(...bindings).first("count") ?? 0, "count");
    const metrics = {};
    const attention = [];
    const analytics = {};
    if (has("membership.read")) {
      const [totalMembers, pendingMemberships, paymentPending] = await Promise.all([
        count(
          "SELECT COUNT(*) AS count FROM memberships WHERE status != 'CLOSED'"
        ),
        count(
          "SELECT COUNT(*) AS count FROM membership_applications WHERE status IN ('SUBMITTED','UNDER_REVIEW','PAYMENT_PENDING','PAYMENT_VERIFICATION')"
        ),
        count(
          "SELECT COUNT(*) AS count FROM membership_applications WHERE status IN ('PAYMENT_PENDING','PAYMENT_VERIFICATION')"
        )
      ]);
      Object.assign(metrics, {
        totalMembers,
        pendingMemberships,
        paymentPending
      });
      attention.push({
        key: "membership",
        label: "Membership applications",
        count: pendingMemberships,
        section: "membership"
      });
      const rows = await context.env.DB.prepare(
        `SELECT strftime('%Y-%m', created_at) AS month, status, COUNT(*) AS count
       FROM membership_applications WHERE created_at >= date('now','-5 months','start of month')
       GROUP BY month, status ORDER BY month`
      ).all();
      analytics.membership = rows.results;
    }
    if (has("volunteer.read")) {
      const pendingVolunteers = await count(
        "SELECT COUNT(*) AS count FROM volunteer_applications WHERE status IN ('SUBMITTED','UNDER_REVIEW')"
      );
      metrics.pendingVolunteers = pendingVolunteers;
      attention.push({
        key: "volunteers",
        label: "Volunteer applications",
        count: pendingVolunteers,
        section: "volunteers"
      });
    }
    if (has("project.read", "project.review", "submissions.read")) {
      const [pendingProjects, activeProjects] = await Promise.all([
        count(
          "SELECT COUNT(*) AS count FROM platform_submissions WHERE submission_type = 'PROJECT' AND status IN ('SUBMITTED','UNDER_REVIEW','NEEDS_INFORMATION','REVISION_REQUESTED')"
        ),
        count(
          "SELECT COUNT(*) AS count FROM website_content_items WHERE collection_key = 'projects' AND status = 'PUBLISHED'"
        )
      ]);
      Object.assign(metrics, { pendingProjects, activeProjects });
      attention.push({
        key: "projects",
        label: "Project proposals",
        count: pendingProjects,
        section: "applications"
      });
    }
    if (has("research.read", "research.review", "submissions.read")) {
      const [pendingResearch, publishedResearch] = await Promise.all([
        count(
          "SELECT COUNT(*) AS count FROM platform_submissions WHERE submission_type = 'RESEARCH' AND status IN ('SUBMITTED','UNDER_REVIEW','NEEDS_INFORMATION','REVISION_REQUESTED')"
        ),
        count(
          "SELECT COUNT(*) AS count FROM website_content_items WHERE collection_key = 'research_papers' AND status = 'PUBLISHED'"
        )
      ]);
      Object.assign(metrics, { pendingResearch, publishedResearch });
      attention.push({
        key: "research",
        label: "Research proposals",
        count: pendingResearch,
        section: "research"
      });
    }
    if (has("people.read", "submissions.read")) {
      const pendingAlumni = await count(
        "SELECT COUNT(*) AS count FROM platform_submissions WHERE submission_type = 'ALUMNI' AND status IN ('SUBMITTED','UNDER_REVIEW','NEEDS_INFORMATION')"
      );
      metrics.pendingAlumni = pendingAlumni;
      attention.push({
        key: "alumni",
        label: "Alumni applications",
        count: pendingAlumni,
        section: "alumni"
      });
    }
    if (has("partner.read", "submissions.read")) {
      const pendingCollaborations = await count(
        "SELECT COUNT(*) AS count FROM platform_submissions WHERE submission_type = 'COLLABORATION' AND status IN ('SUBMITTED','UNDER_REVIEW','NEEDS_INFORMATION')"
      );
      metrics.pendingCollaborations = pendingCollaborations;
      attention.push({
        key: "collaboration",
        label: "Collaboration requests",
        count: pendingCollaborations,
        section: "partners"
      });
    }
    if (has("event.read")) {
      metrics.upcomingEvents = await count(
        "SELECT COUNT(*) AS count FROM managed_events WHERE workflow_status='PUBLISHED' AND ends_at>=datetime('now')"
      );
    }
    if (has("course.read"))
      metrics.activeCourses = await count(
        "SELECT COUNT(*) AS count FROM learning_courses WHERE status='PUBLISHED'"
      );
    if (has("people.read"))
      metrics.publishedPeople = await count(
        "SELECT COUNT(*) AS count FROM people_profiles WHERE workflow_status='PUBLISHED' AND public_profile=1"
      );
    if (has("partner.read"))
      metrics.activePartners = await count(
        "SELECT COUNT(*) AS count FROM partner_profiles WHERE workflow_status='PUBLISHED' AND active=1"
      );
    if (has("opportunity.read")) {
      const [activeOpportunities, pendingOpportunities] = await Promise.all([
        count(
          "SELECT COUNT(*) AS count FROM opportunities WHERE workflow_status='PUBLISHED' AND (application_deadline IS NULL OR application_deadline>=datetime('now'))"
        ),
        count(
          "SELECT COUNT(*) AS count FROM opportunity_applications WHERE status IN ('SUBMITTED','UNDER_REVIEW','NEEDS_INFORMATION')"
        )
      ]);
      Object.assign(metrics, { activeOpportunities, pendingOpportunities });
      attention.push({
        key: "opportunities",
        label: "Opportunity applications",
        count: pendingOpportunities,
        section: "applications"
      });
    }
    if (has("content.read")) {
      const [totalBlogs, publishedBlogs, draftBlogs] = await Promise.all([
        count(
          "SELECT COUNT(*) AS count FROM website_content_items WHERE collection_key='blog_posts' AND status!='ARCHIVED'"
        ),
        count(
          "SELECT COUNT(*) AS count FROM website_content_items WHERE collection_key='blog_posts' AND status='PUBLISHED'"
        ),
        count(
          "SELECT COUNT(*) AS count FROM website_content_items WHERE collection_key='blog_posts' AND status='DRAFT'"
        )
      ]);
      Object.assign(metrics, { totalBlogs, publishedBlogs, draftBlogs });
    }
    metrics.unreadNotifications = await count(
      "SELECT COUNT(*) AS count FROM user_notifications WHERE user_id=? AND read_at IS NULL",
      [user.id]
    );
    if (has("finance.read")) {
      const finance = await context.env.DB.prepare(
        `SELECT
      COALESCE(SUM(CASE WHEN status='VERIFIED' AND direction='INCOME' AND transaction_date>=datetime('now','start of month') THEN amount_minor END),0) AS monthlyIncome,
      COALESCE(SUM(CASE WHEN status='VERIFIED' AND direction='EXPENSE' AND transaction_date>=datetime('now','start of month') THEN amount_minor END),0) AS monthlyExpenses,
      COALESCE(SUM(CASE WHEN status='VERIFIED' AND direction='INCOME' THEN amount_minor WHEN status='VERIFIED' AND direction='EXPENSE' THEN -amount_minor END),0) AS netBalance,
      COALESCE(SUM(CASE WHEN status IN ('PENDING','SUBMITTED') THEN 1 ELSE 0 END),0) AS pendingPayments
      FROM finance_transactions`
      ).first();
      Object.assign(
        metrics,
        finance ?? {
          monthlyIncome: 0,
          monthlyExpenses: 0,
          netBalance: 0,
          pendingPayments: 0
        }
      );
      const pendingPayments = Number(finance?.pendingPayments ?? 0);
      attention.push({
        key: "payments",
        label: "Payment verifications",
        count: pendingPayments,
        section: "finance"
      });
    }
    let recentActivity = [];
    if (has("audit.read")) {
      const result = await context.env.DB.prepare(
        `SELECT a.id, a.action, a.entity_type AS entityType, a.entity_id AS entityId,
              a.reason, a.request_id AS requestId, a.created_at AS createdAt,
              COALESCE(u.display_name, u.primary_email, 'System') AS actorName
       FROM audit_logs a LEFT JOIN users u ON u.id = a.actor_id
       ORDER BY a.created_at DESC LIMIT 12`
      ).all();
      recentActivity = result.results;
    }
    const system = has("settings.read", "rbac.read") ? {
      users: await count(
        "SELECT COUNT(*) AS count FROM users WHERE deleted_at IS NULL"
      ),
      activeSessions: await count(
        "SELECT COUNT(*) AS count FROM sessions WHERE revoked_at IS NULL AND expires_at > ?",
        [(/* @__PURE__ */ new Date()).toISOString()]
      ),
      failedEmails: await count(
        "SELECT COUNT(*) AS count FROM email_outbox WHERE status = 'FAILED'"
      )
    } : null;
    return context.json(
      success(
        {
          metrics,
          attention: attention.filter((item) => item.count > 0),
          analytics,
          recentActivity,
          system
        },
        context.get("requestId")
      )
    );
  }
);
adminRoutes.get("/admin/access/me", (context) => {
  const { user } = requireAuth(context);
  return context.json(
    success(
      { roles: user.roles, permissions: user.permissions },
      context.get("requestId")
    )
  );
});
adminRoutes.get(
  "/admin/rbac/permissions",
  requirePermission("rbac.read"),
  async (context) => {
    const { results } = await context.env.DB.prepare(
      "SELECT id, permission_key, category, description FROM permissions ORDER BY category, permission_key"
    ).all();
    return context.json(
      success(
        results.map((row) => ({
          id: row.id,
          key: row.permission_key,
          category: row.category,
          description: row.description
        })),
        context.get("requestId")
      )
    );
  }
);
adminRoutes.get(
  "/admin/rbac/roles",
  requirePermission("rbac.read"),
  async (context) => {
    const { results } = await context.env.DB.prepare(
      `SELECT r.id, r.role_key, r.name, r.description, r.is_system, r.deleted_at, p.permission_key
     FROM roles r
     LEFT JOIN role_permissions rp ON rp.role_id = r.id
     LEFT JOIN permissions p ON p.id = rp.permission_id
     ORDER BY r.deleted_at, r.role_key, p.permission_key`
    ).all();
    const roles = /* @__PURE__ */ new Map();
    for (const row of results) {
      const role = roles.get(row.id) ?? {
        id: row.id,
        key: row.role_key,
        name: row.name,
        description: row.description,
        system: row.is_system === 1,
        archivedAt: row.deleted_at,
        permissions: []
      };
      if (row.permission_key) role.permissions.push(row.permission_key);
      roles.set(row.id, role);
    }
    return context.json(success([...roles.values()], context.get("requestId")));
  }
);
adminRoutes.get(
  "/admin/rbac/assignments",
  requirePermission("rbac.read"),
  async (context) => {
    const query = normalizeEmail(context.req.query("email") ?? "");
    const pattern = query ? `%${query.replaceAll("%", "").replaceAll("_", "")}%` : "%";
    const { results } = await context.env.DB.prepare(
      `SELECT ur.id, ur.user_id, u.primary_email, u.display_name, u.is_fixed_super_admin AS fixed_super_admin, r.role_key, r.name AS role_name,
            ur.grant_reason, ur.granted_at, ur.expires_at, ur.revoked_at, ur.revocation_reason,
            grantor.primary_email AS granted_by_email, revoker.primary_email AS revoked_by_email
     FROM user_roles ur
     JOIN users u ON u.id = ur.user_id
     JOIN roles r ON r.id = ur.role_id
     LEFT JOIN users grantor ON grantor.id = ur.granted_by
     LEFT JOIN users revoker ON revoker.id = ur.revoked_by
     WHERE u.primary_email_normalized LIKE ?
     ORDER BY ur.granted_at DESC LIMIT 100`
    ).bind(pattern).all();
    return context.json(success(results, context.get("requestId")));
  }
);
adminRoutes.get(
  "/admin/users",
  requirePermission("users.read"),
  async (context) => {
    const query = normalizeEmail(context.req.query("email") ?? "");
    const pattern = query ? `%${query.replaceAll("%", "").replaceAll("_", "")}%` : "%";
    const { results } = await context.env.DB.prepare(
      `SELECT id, primary_email, display_name, status, created_at, deleted_at, is_fixed_super_admin
     FROM users WHERE primary_email_normalized LIKE ? ORDER BY created_at DESC LIMIT 50`
    ).bind(pattern).all();
    return context.json(
      success(
        results.map((row) => ({
          id: row.id,
          email: row.primary_email,
          displayName: row.display_name,
          status: row.status,
          createdAt: row.created_at,
          archivedAt: row.deleted_at,
          fixedSuperAdmin: row.is_fixed_super_admin === 1
        })),
        context.get("requestId")
      )
    );
  }
);
adminRoutes.get(
  "/admin/audit-logs",
  requirePermission("audit.read"),
  async (context) => {
    const limit = Math.min(
      Math.max(Number(context.req.query("limit") ?? 50) || 50, 1),
      100
    );
    const before = context.req.query("before") ?? "9999-12-31T23:59:59.999Z";
    const action = context.req.query("action")?.trim() || null;
    const { results } = await context.env.DB.prepare(
      `SELECT id, actor_type, actor_id, action, entity_type, entity_id, reason, metadata_json, request_id, created_at
     FROM audit_logs
     WHERE created_at < ? AND (? IS NULL OR action = ?)
     ORDER BY created_at DESC LIMIT ?`
    ).bind(before, action, action, limit).all();
    return context.json(success(results, context.get("requestId")));
  }
);
adminRoutes.post(
  "/admin/rbac/roles",
  csrfMiddleware(),
  requirePermission("rbac.roles.manage"),
  async (context) => {
    const { user } = requireAuth(context);
    const input = await parseJson(context, createRoleSchema);
    const idempotencyKey = requireIdempotencyKey(context);
    const replay = await getIdempotentReplay({
      db: context.env.DB,
      operation: "rbac.role.create",
      actorKey: user.id,
      idempotencyKey,
      requestData: input
    });
    if (replay) return idempotentJson(context, replay);
    const permissions = await permissionRows(
      context.env.DB,
      input.permissionKeys
    );
    const roleId = `role:${crypto.randomUUID()}`;
    const responseData = { roleId, roleKey: input.key, created: true };
    try {
      const result = await executeIdempotentCommand({
        db: context.env.DB,
        operation: "rbac.role.create",
        actorKey: user.id,
        idempotencyKey,
        requestData: input,
        responseData,
        responseStatus: 201,
        statements: [
          context.env.DB.prepare(
            `INSERT INTO roles (id, role_key, name, description, created_by) VALUES (?, ?, ?, ?, ?)`
          ).bind(roleId, input.key, input.name, input.description, user.id),
          ...permissions.map(
            (permission) => context.env.DB.prepare(
              "INSERT INTO role_permissions (role_id, permission_id, granted_by) VALUES (?, ?, ?)"
            ).bind(roleId, permission.id, user.id)
          ),
          createAuditStatement(context.env.DB, {
            requestId: context.get("requestId"),
            actorId: user.id,
            action: "ROLE_CREATED",
            entityType: "ROLE",
            entityId: roleId,
            reason: input.reason,
            metadata: {
              roleKey: input.key,
              permissionCount: permissions.length
            }
          })
        ]
      });
      return idempotentJson(context, result);
    } catch (error) {
      if (error instanceof Error && /UNIQUE constraint failed: roles.role_key/iu.test(error.message)) {
        throw new AppError({
          code: "ROLE_EXISTS",
          message: "A role with that key already exists.",
          status: 409
        });
      }
      return mapAuthorizationDatabaseError(error);
    }
  }
);
adminRoutes.put(
  "/admin/rbac/roles/:roleKey/permissions",
  csrfMiddleware(),
  requirePermission("rbac.roles.manage"),
  async (context) => {
    const { user } = requireAuth(context);
    const roleKey2 = context.req.param("roleKey");
    const input = await parseJson(context, updateRolePermissionsSchema);
    const idempotencyKey = requireIdempotencyKey(context);
    const requestData = { roleKey: roleKey2, ...input };
    const replay = await getIdempotentReplay({
      db: context.env.DB,
      operation: "rbac.role.permissions.replace",
      actorKey: user.id,
      idempotencyKey,
      requestData
    });
    if (replay) return idempotentJson(context, replay);
    const role = await activeRole(context.env.DB, roleKey2);
    if (role.is_system === 1) {
      throw new AppError({
        code: "SYSTEM_ROLE_IMMUTABLE",
        message: "System roles cannot be changed.",
        status: 409
      });
    }
    const permissions = await permissionRows(
      context.env.DB,
      input.permissionKeys
    );
    const result = await executeIdempotentCommand({
      db: context.env.DB,
      operation: "rbac.role.permissions.replace",
      actorKey: user.id,
      idempotencyKey,
      requestData,
      responseData: { roleId: role.id, roleKey: role.role_key, updated: true },
      responseStatus: 200,
      statements: [
        context.env.DB.prepare(
          "DELETE FROM role_permissions WHERE role_id = ?"
        ).bind(role.id),
        ...permissions.map(
          (permission) => context.env.DB.prepare(
            "INSERT INTO role_permissions (role_id, permission_id, granted_by) VALUES (?, ?, ?)"
          ).bind(role.id, permission.id, user.id)
        ),
        context.env.DB.prepare(
          "UPDATE roles SET updated_at = ? WHERE id = ?"
        ).bind((/* @__PURE__ */ new Date()).toISOString(), role.id),
        createAuditStatement(context.env.DB, {
          requestId: context.get("requestId"),
          actorId: user.id,
          action: "ROLE_PERMISSIONS_REPLACED",
          entityType: "ROLE",
          entityId: role.id,
          reason: input.reason,
          metadata: {
            roleKey: role.role_key,
            permissionCount: permissions.length
          }
        })
      ]
    });
    return idempotentJson(context, result);
  }
);
adminRoutes.post(
  "/admin/rbac/roles/:roleKey/archive",
  csrfMiddleware(),
  requirePermission("rbac.roles.manage"),
  async (context) => {
    const { user } = requireAuth(context);
    const roleKey2 = context.req.param("roleKey");
    const input = await parseJson(context, archiveRoleSchema);
    const idempotencyKey = requireIdempotencyKey(context);
    const requestData = { roleKey: roleKey2, ...input };
    const replay = await getIdempotentReplay({
      db: context.env.DB,
      operation: "rbac.role.archive",
      actorKey: user.id,
      idempotencyKey,
      requestData
    });
    if (replay) return idempotentJson(context, replay);
    const role = await activeRole(context.env.DB, roleKey2);
    if (role.is_system === 1) {
      throw new AppError({
        code: "SYSTEM_ROLE_IMMUTABLE",
        message: "System roles cannot be archived.",
        status: 409
      });
    }
    const activeAssignments = await context.env.DB.prepare(
      `SELECT COUNT(*) AS count FROM user_roles
       WHERE role_id = ? AND revoked_at IS NULL AND (expires_at IS NULL OR expires_at > ?)`
    ).bind(role.id, (/* @__PURE__ */ new Date()).toISOString()).first();
    if ((activeAssignments?.count ?? 0) > 0) {
      throw new AppError({
        code: "ROLE_HAS_ACTIVE_ASSIGNMENTS",
        message: "Revoke active assignments before archiving this role.",
        status: 409
      });
    }
    const now = (/* @__PURE__ */ new Date()).toISOString();
    const result = await executeIdempotentCommand({
      db: context.env.DB,
      operation: "rbac.role.archive",
      actorKey: user.id,
      idempotencyKey,
      requestData,
      responseData: { roleId: role.id, roleKey: role.role_key, archived: true },
      responseStatus: 200,
      statements: [
        context.env.DB.prepare(
          "UPDATE roles SET deleted_at = ?, deleted_by = ?, deletion_reason = ?, updated_at = ? WHERE id = ? AND deleted_at IS NULL"
        ).bind(now, user.id, input.reason, now, role.id),
        createAuditStatement(context.env.DB, {
          requestId: context.get("requestId"),
          actorId: user.id,
          action: "ROLE_ARCHIVED",
          entityType: "ROLE",
          entityId: role.id,
          reason: input.reason,
          metadata: { roleKey: role.role_key }
        })
      ]
    });
    return idempotentJson(context, result);
  }
);
adminRoutes.post(
  "/admin/rbac/assignments",
  csrfMiddleware(),
  requirePermission("rbac.assignments.manage"),
  async (context) => {
    const { user } = requireAuth(context);
    const input = await parseJson(context, grantRoleSchema);
    const idempotencyKey = requireIdempotencyKey(context);
    const replay = await getIdempotentReplay({
      db: context.env.DB,
      operation: "rbac.assignment.grant",
      actorKey: user.id,
      idempotencyKey,
      requestData: input
    });
    if (replay) return idempotentJson(context, replay);
    const [target, role] = await Promise.all([
      verifiedUserByEmail(context.env.DB, input.userEmail),
      activeRole(context.env.DB, input.roleKey)
    ]);
    if (input.expiresAt && input.expiresAt <= (/* @__PURE__ */ new Date()).toISOString()) {
      throw new AppError({
        code: "INVALID_EXPIRY",
        message: "Role assignment expiry must be in the future.",
        status: 422
      });
    }
    if (role.role_key === "SUPER_ADMIN")
      await requireSuperAdminAuthority(context.env.DB, user.id);
    const assignmentId = crypto.randomUUID();
    try {
      const result = await executeIdempotentCommand({
        db: context.env.DB,
        operation: "rbac.assignment.grant",
        actorKey: user.id,
        idempotencyKey,
        requestData: input,
        responseData: {
          assignmentId,
          userId: target.id,
          roleKey: role.role_key,
          granted: true
        },
        responseStatus: 201,
        statements: [
          context.env.DB.prepare(
            `INSERT INTO user_roles (id, user_id, role_id, granted_by, grant_reason, expires_at)
             VALUES (?, ?, ?, ?, ?, ?)`
          ).bind(
            assignmentId,
            target.id,
            role.id,
            user.id,
            input.reason,
            input.expiresAt ?? null
          ),
          createAuditStatement(context.env.DB, {
            requestId: context.get("requestId"),
            actorId: user.id,
            action: "ROLE_GRANTED",
            entityType: "USER_ROLE",
            entityId: assignmentId,
            reason: input.reason,
            metadata: {
              targetUserId: target.id,
              roleKey: role.role_key,
              expiresAt: input.expiresAt ?? null
            }
          })
        ]
      });
      return idempotentJson(context, result);
    } catch (error) {
      return mapAuthorizationDatabaseError(error);
    }
  }
);
adminRoutes.post(
  "/admin/rbac/assignments/:assignmentId/revoke",
  csrfMiddleware(),
  requirePermission("rbac.assignments.manage"),
  async (context) => {
    const { user } = requireAuth(context);
    const assignmentId = context.req.param("assignmentId");
    const input = await parseJson(context, revokeRoleSchema);
    const idempotencyKey = requireIdempotencyKey(context);
    const requestData = { assignmentId, ...input };
    const replay = await getIdempotentReplay({
      db: context.env.DB,
      operation: "rbac.assignment.revoke",
      actorKey: user.id,
      idempotencyKey,
      requestData
    });
    if (replay) return idempotentJson(context, replay);
    const assignment = await context.env.DB.prepare(
      `SELECT ur.id, ur.user_id, r.role_key, u.is_fixed_super_admin
       FROM user_roles ur JOIN roles r ON r.id = ur.role_id JOIN users u ON u.id=ur.user_id
       WHERE ur.id = ? AND ur.revoked_at IS NULL`
    ).bind(assignmentId).first();
    if (!assignment)
      throw new AppError({
        code: "ASSIGNMENT_NOT_FOUND",
        message: "The active role assignment was not found.",
        status: 404
      });
    rejectFixedSuperAdminMutation(assignment);
    if (assignment.role_key === "SUPER_ADMIN")
      await requireSuperAdminAuthority(context.env.DB, user.id);
    const now = (/* @__PURE__ */ new Date()).toISOString();
    try {
      const result = await executeIdempotentCommand({
        db: context.env.DB,
        operation: "rbac.assignment.revoke",
        actorKey: user.id,
        idempotencyKey,
        requestData,
        responseData: {
          assignmentId: assignment.id,
          roleKey: assignment.role_key,
          revoked: true
        },
        responseStatus: 200,
        statements: [
          context.env.DB.prepare(
            `UPDATE user_roles SET revoked_at = ?, revoked_by = ?, revocation_reason = ?
             WHERE id = ? AND revoked_at IS NULL`
          ).bind(now, user.id, input.reason, assignment.id),
          createAuditStatement(context.env.DB, {
            requestId: context.get("requestId"),
            actorId: user.id,
            action: "ROLE_REVOKED",
            entityType: "USER_ROLE",
            entityId: assignment.id,
            reason: input.reason,
            metadata: {
              targetUserId: assignment.user_id,
              roleKey: assignment.role_key
            }
          })
        ]
      });
      return idempotentJson(context, result);
    } catch (error) {
      return mapAuthorizationDatabaseError(error);
    }
  }
);
adminRoutes.put(
  "/admin/users/:userId/status",
  csrfMiddleware(),
  requirePermission("users.manage"),
  async (context) => {
    const { user } = requireAuth(context);
    const userId = context.req.param("userId");
    const input = await parseJson(context, updateUserStatusSchema);
    const idempotencyKey = requireIdempotencyKey(context);
    const requestData = { userId, ...input };
    const replay = await getIdempotentReplay({
      db: context.env.DB,
      operation: "users.status.update",
      actorKey: user.id,
      idempotencyKey,
      requestData
    });
    if (replay) return idempotentJson(context, replay);
    const target = await context.env.DB.prepare(
      "SELECT id, primary_email, display_name, status, created_at, deleted_at, is_fixed_super_admin FROM users WHERE id = ?"
    ).bind(userId).first();
    if (!target || target.deleted_at)
      throw new AppError({
        code: "USER_NOT_FOUND",
        message: "The active user was not found.",
        status: 404
      });
    rejectFixedSuperAdminMutation(target);
    const targetIsSuperAdmin = await userHasPermission(
      context.env.DB,
      target.id,
      "rbac.super_admin.manage"
    );
    if (targetIsSuperAdmin)
      await requireSuperAdminAuthority(context.env.DB, user.id);
    const now = (/* @__PURE__ */ new Date()).toISOString();
    try {
      const statements = [
        context.env.DB.prepare(
          "UPDATE users SET status = ?, updated_at = ? WHERE id = ? AND deleted_at IS NULL"
        ).bind(input.status, now, target.id),
        createAuditStatement(context.env.DB, {
          requestId: context.get("requestId"),
          actorId: user.id,
          action: input.status === "SUSPENDED" ? "USER_SUSPENDED" : "USER_RESTORED",
          entityType: "USER",
          entityId: target.id,
          reason: input.reason
        })
      ];
      if (input.status === "SUSPENDED") {
        statements.splice(
          1,
          0,
          context.env.DB.prepare(
            "UPDATE sessions SET revoked_at = ?, revocation_reason = 'USER_SUSPENDED' WHERE user_id = ? AND revoked_at IS NULL"
          ).bind(now, target.id)
        );
      }
      const result = await executeIdempotentCommand({
        db: context.env.DB,
        operation: "users.status.update",
        actorKey: user.id,
        idempotencyKey,
        requestData,
        responseData: {
          userId: target.id,
          status: input.status,
          updated: true
        },
        responseStatus: 200,
        statements
      });
      return idempotentJson(context, result);
    } catch (error) {
      return mapAuthorizationDatabaseError(error);
    }
  }
);
adminRoutes.post(
  "/admin/users/:userId/archive",
  csrfMiddleware(),
  requirePermission("users.archive"),
  async (context) => {
    const { user } = requireAuth(context);
    const userId = context.req.param("userId");
    const input = await parseJson(context, archiveUserSchema);
    const idempotencyKey = requireIdempotencyKey(context);
    const requestData = { userId, ...input };
    const replay = await getIdempotentReplay({
      db: context.env.DB,
      operation: "users.archive",
      actorKey: user.id,
      idempotencyKey,
      requestData
    });
    if (replay) return idempotentJson(context, replay);
    const target = await context.env.DB.prepare(
      "SELECT id, primary_email, display_name, status, created_at, deleted_at, is_fixed_super_admin FROM users WHERE id = ?"
    ).bind(userId).first();
    if (!target || target.deleted_at)
      throw new AppError({
        code: "USER_NOT_FOUND",
        message: "The active user was not found.",
        status: 404
      });
    rejectFixedSuperAdminMutation(target);
    if (normalizeEmail(input.confirmationEmail) !== normalizeEmail(target.primary_email)) {
      throw new AppError({
        code: "ARCHIVE_CONFIRMATION_MISMATCH",
        message: "The confirmation email does not match the account.",
        status: 422
      });
    }
    if (await userHasPermission(
      context.env.DB,
      target.id,
      "rbac.super_admin.manage"
    )) {
      await requireSuperAdminAuthority(context.env.DB, user.id);
    }
    const now = (/* @__PURE__ */ new Date()).toISOString();
    try {
      const result = await executeIdempotentCommand({
        db: context.env.DB,
        operation: "users.archive",
        actorKey: user.id,
        idempotencyKey,
        requestData,
        responseData: { userId: target.id, archived: true },
        responseStatus: 202,
        statements: [
          context.env.DB.prepare(
            `UPDATE users SET status = 'DELETED', deleted_at = ?, deleted_by = ?, deletion_reason = ?, updated_at = ?
             WHERE id = ? AND deleted_at IS NULL`
          ).bind(now, user.id, input.reason, now, target.id),
          context.env.DB.prepare(
            "UPDATE sessions SET revoked_at = ?, revocation_reason = 'USER_ARCHIVED' WHERE user_id = ? AND revoked_at IS NULL"
          ).bind(now, target.id),
          createAuditStatement(context.env.DB, {
            requestId: context.get("requestId"),
            actorId: user.id,
            action: "USER_ARCHIVED",
            entityType: "USER",
            entityId: target.id,
            reason: input.reason,
            metadata: { previousStatus: target.status }
          })
        ]
      });
      return idempotentJson(context, result);
    } catch (error) {
      return mapAuthorizationDatabaseError(error);
    }
  }
);
adminRoutes.post("/internal/bootstrap-super-admin", async (context) => {
  await enforceRateLimit({
    db: context.env.DB,
    scope: "authorization-bootstrap",
    identifier: clientIp(context.req.raw),
    limit: 5,
    windowSeconds: 3600
  });
  const suppliedSecret = context.req.header("X-Bootstrap-Token") ?? "";
  if (!await timingSafeEqualStrings(
    suppliedSecret,
    context.env.BOOTSTRAP_ADMIN_SECRET
  )) {
    throw new AppError({
      code: "BOOTSTRAP_AUTHENTICATION_FAILED",
      message: "Bootstrap authentication failed.",
      status: 403
    });
  }
  const input = await parseJson(context, bootstrapAdminSchema);
  const idempotencyKey = requireIdempotencyKey(context);
  const replay = await getIdempotentReplay({
    db: context.env.DB,
    operation: "authorization.bootstrap",
    actorKey: "SYSTEM_BOOTSTRAP",
    idempotencyKey,
    requestData: input
  });
  if (replay) return idempotentJson(context, replay);
  const target = await verifiedUserByEmail(context.env.DB, input.email);
  const assignmentId = crypto.randomUUID();
  try {
    const result = await executeIdempotentCommand({
      db: context.env.DB,
      operation: "authorization.bootstrap",
      actorKey: "SYSTEM_BOOTSTRAP",
      idempotencyKey,
      requestData: input,
      responseData: {
        assignmentId,
        userId: target.id,
        roleKey: "SUPER_ADMIN",
        bootstrapped: true
      },
      responseStatus: 201,
      statements: [
        context.env.DB.prepare(
          `INSERT INTO user_roles (id, user_id, role_id, granted_by, grant_reason)
           VALUES (?, ?, 'role:SUPER_ADMIN', NULL, ?)`
        ).bind(assignmentId, target.id, input.reason),
        createAuditStatement(context.env.DB, {
          requestId: context.get("requestId"),
          actorType: "SYSTEM",
          action: "AUTHORIZATION_BOOTSTRAPPED",
          entityType: "USER_ROLE",
          entityId: assignmentId,
          reason: input.reason,
          metadata: { targetUserId: target.id, roleKey: "SUPER_ADMIN" }
        })
      ]
    });
    return idempotentJson(context, result);
  } catch (error) {
    return mapAuthorizationDatabaseError(error);
  }
});
adminRoutes.post("/internal/provision-fixed-super-admins", async (context) => {
  await enforceRateLimit({
    db: context.env.DB,
    scope: "fixed-super-admin-provisioning",
    identifier: clientIp(context.req.raw),
    limit: 3,
    windowSeconds: 3600
  });
  const suppliedSecret = context.req.header("X-Bootstrap-Token") ?? "";
  if (!await timingSafeEqualStrings(
    suppliedSecret,
    context.env.BOOTSTRAP_ADMIN_SECRET
  )) {
    throw new AppError({
      code: "BOOTSTRAP_AUTHENTICATION_FAILED",
      message: "Bootstrap authentication failed.",
      status: 403
    });
  }
  const input = await parseJson(context, provisionFixedSuperAdminsSchema);
  const existing = await context.env.DB.prepare(
    "SELECT COUNT(*) AS count FROM users WHERE is_fixed_super_admin = 1"
  ).first("count");
  if ((existing ?? 0) > 0) {
    throw new AppError({
      code: "FIXED_SUPER_ADMINS_ALREADY_PROVISIONED",
      message: "The fixed super administrator accounts are already provisioned.",
      status: 409
    });
  }
  const now = (/* @__PURE__ */ new Date()).toISOString();
  const accounts = await Promise.all(
    input.accounts.map(async (account) => ({
      ...account,
      id: crypto.randomUUID(),
      passwordHash: await hashPassword(account.password),
      assignmentId: crypto.randomUUID()
    }))
  );
  const statements = [];
  for (const account of accounts) {
    statements.push(
      context.env.DB.prepare(
        `INSERT INTO users
          (id, primary_email, primary_email_normalized, display_name, status, onboarding_status,
           email_verified_at, is_fixed_super_admin)
         VALUES (?, ?, ?, ?, 'EMAIL_VERIFIED', 'COMPLETED', ?, 1)`
      ).bind(
        account.id,
        account.email,
        normalizeEmail(account.email),
        account.displayName,
        now
      ),
      context.env.DB.prepare(
        `INSERT INTO password_credentials (user_id, password_hash, must_change_password)
         VALUES (?, ?, 1)`
      ).bind(account.id, account.passwordHash),
      context.env.DB.prepare(
        "INSERT INTO notification_preferences (user_id) VALUES (?)"
      ).bind(account.id),
      context.env.DB.prepare(
        "INSERT INTO user_profiles (user_id) VALUES (?)"
      ).bind(account.id),
      context.env.DB.prepare(
        `INSERT INTO user_roles (id, user_id, role_id, granted_by, grant_reason)
         VALUES (?, ?, 'role:SUPER_ADMIN', NULL, ?)`
      ).bind(account.assignmentId, account.id, input.reason),
      createAuditStatement(context.env.DB, {
        requestId: context.get("requestId"),
        actorType: "SYSTEM",
        action: "FIXED_SUPER_ADMIN_PROVISIONED",
        entityType: "USER",
        entityId: account.id,
        reason: input.reason,
        metadata: {
          email: account.email,
          roleKey: "SUPER_ADMIN",
          passwordChangeRequired: true
        }
      })
    );
  }
  try {
    await context.env.DB.batch(statements);
  } catch (error) {
    const message = error instanceof Error ? error.message : "";
    if (/UNIQUE constraint failed/iu.test(message)) {
      throw new AppError({
        code: "FIXED_SUPER_ADMIN_CONFLICT",
        message: "One of the fixed administrator accounts already exists.",
        status: 409
      });
    }
    throw error;
  }
  return context.json(
    success(
      {
        provisioned: accounts.map((account) => ({
          email: account.email,
          role: "SUPER_ADMIN",
          mustChangePassword: true
        }))
      },
      context.get("requestId")
    ),
    201
  );
});

// worker/repositories/membership-repository.ts
async function membershipTypeByKey(db, key) {
  const row = await db.prepare(
    `SELECT id, type_key, name, description, term_months, payment_required, fee_minor, currency
       FROM membership_types
       WHERE type_key = ? AND application_enabled = 1 AND deleted_at IS NULL`
  ).bind(key).first();
  if (!row) {
    throw new AppError({
      code: "MEMBERSHIP_TYPE_UNAVAILABLE",
      message: "The selected membership type is not accepting applications.",
      status: 422
    });
  }
  return row;
}
__name(membershipTypeByKey, "membershipTypeByKey");
async function volunteerProgramByKey(db, key) {
  const row = await db.prepare(
    `SELECT id, program_key, name, description, term_months
       FROM volunteer_programs
       WHERE program_key = ? AND application_enabled = 1 AND deleted_at IS NULL`
  ).bind(key).first();
  if (!row) {
    throw new AppError({
      code: "VOLUNTEER_PROGRAM_UNAVAILABLE",
      message: "The selected volunteer program is not accepting applications.",
      status: 422
    });
  }
  return row;
}
__name(volunteerProgramByKey, "volunteerProgramByKey");
function openMembershipApplication(db, userId) {
  return db.prepare(
    `SELECT id, status, revision FROM membership_applications
       WHERE user_id = ?
         AND status IN ('DRAFT', 'SUBMITTED', 'UNDER_REVIEW', 'PAYMENT_PENDING', 'PAYMENT_VERIFICATION')
       ORDER BY created_at DESC LIMIT 1`
  ).bind(userId).first();
}
__name(openMembershipApplication, "openMembershipApplication");
function openVolunteerApplication(db, userId) {
  return db.prepare(
    `SELECT id, status, revision FROM volunteer_applications
       WHERE user_id = ? AND status IN ('DRAFT', 'SUBMITTED', 'UNDER_REVIEW')
       ORDER BY created_at DESC LIMIT 1`
  ).bind(userId).first();
}
__name(openVolunteerApplication, "openVolunteerApplication");
function currentMembership(db, userId) {
  return db.prepare("SELECT id, status FROM memberships WHERE user_id = ? AND status != 'CLOSED' ORDER BY created_at DESC LIMIT 1").bind(userId).first();
}
__name(currentMembership, "currentMembership");
function currentVolunteer(db, userId) {
  return db.prepare("SELECT id, status FROM volunteers WHERE user_id = ? AND status != 'CLOSED' ORDER BY created_at DESC LIMIT 1").bind(userId).first();
}
__name(currentVolunteer, "currentVolunteer");

// worker/services/membership-payment.ts
var membershipPaymentMethodSchema = external_exports.enum(["BKASH", "NAGAD"]);
var membershipPaymentSettingsSchema = external_exports.object({
  phone: external_exports.string().trim().min(3).max(50),
  paymentNumber: external_exports.string().trim().regex(/^01[3-9]\d{8}$/u, "Use a valid Bangladesh mobile wallet number."),
  paymentMethods: external_exports.array(membershipPaymentMethodSchema).min(1).max(2).refine((methods) => new Set(methods).size === methods.length, "Payment methods must be unique."),
  paymentInstructions: external_exports.string().trim().min(20).max(1e3)
}).strict();
async function readMembershipPaymentSettings(db) {
  const raw2 = await db.prepare(
    "SELECT value_json FROM platform_settings WHERE setting_key = 'website.membership'"
  ).first("value_json");
  if (!raw2) {
    throw new AppError({
      code: "PAYMENT_CONFIGURATION_MISSING",
      message: "Membership payment configuration is unavailable.",
      status: 503
    });
  }
  try {
    return membershipPaymentSettingsSchema.parse(JSON.parse(raw2));
  } catch {
    throw new AppError({
      code: "PAYMENT_CONFIGURATION_INVALID",
      message: "Membership payment configuration requires administrator attention.",
      status: 503
    });
  }
}
__name(readMembershipPaymentSettings, "readMembershipPaymentSettings");

// worker/validators/workflow.ts
var workflowReasonSchema = external_exports.object({
  reason: external_exports.string().trim().min(10).max(1e3)
}).strict();
var payerPhoneSchema = external_exports.string().trim().transform((value) => value.replace(/[\s()-]/g, "")).transform((value) => value.startsWith("+88") ? value.slice(3) : value.startsWith("88") ? value.slice(2) : value).pipe(external_exports.string().regex(/^01[3-9]\d{8}$/u, "Enter the Bangladesh mobile number used to make the payment."));
var paymentSubmissionSchema = external_exports.object({
  paymentMethod: external_exports.preprocess(
    (value) => typeof value === "string" ? value.trim().toUpperCase() : value,
    external_exports.enum(["BKASH", "NAGAD"])
  ),
  payerPhone: payerPhoneSchema,
  transactionReference: external_exports.string().trim().regex(/^[A-Za-z0-9][A-Za-z0-9._-]{5,63}$/u, "Enter a valid 6\u201364 character transaction ID.").transform((value) => value.toUpperCase())
}).strict();
var paymentStatusSchema = external_exports.enum(["SUBMITTED", "VERIFIED", "REJECTED", "CANCELLED"]);

// worker/validators/membership.ts
var typeKey = external_exports.string().trim().regex(/^[A-Z][A-Z0-9_]{1,63}$/u);
var shortText = external_exports.string().trim().min(2).max(100);
var phone = external_exports.string().trim().min(7).max(30).regex(/^\+?[0-9 ()-]+$/u, "Enter a valid phone number.");
var list = external_exports.array(external_exports.string().trim().min(1).max(60)).max(20).transform((items) => [...new Set(items)]);
var optionalUrl = external_exports.string().trim().max(500).url().refine((value) => value.startsWith("https://") || value.startsWith("http://"), "Use an HTTP or HTTPS URL.").optional();
var timeCommitment = external_exports.enum(["2-4 hours/week", "5-8 hours/week", "9-12 hours/week", "12+ hours/week"]);
var membershipFields = {
  membershipTypeKey: typeKey,
  fullName: shortText,
  phone,
  studentId: external_exports.string().trim().min(3).max(50),
  department: shortText,
  batch: external_exports.string().trim().min(2).max(30),
  academicSession: external_exports.string().trim().min(2).max(30).optional(),
  gender: external_exports.enum(["FEMALE", "MALE", "NON_BINARY", "PREFER_NOT_TO_SAY"]).optional(),
  address: external_exports.string().trim().max(500).optional(),
  skills: list,
  interests: list,
  experience: external_exports.string().trim().max(2e3).optional(),
  motivation: external_exports.string().trim().min(20).max(3e3),
  portfolioUrl: optionalUrl,
  githubUrl: optionalUrl,
  linkedinUrl: optionalUrl,
  timeCommitment,
  declarationAccepted: external_exports.literal(true)
};
var volunteerFields = {
  volunteerProgramKey: typeKey,
  fullName: shortText,
  phone,
  organization: external_exports.string().trim().max(150).optional(),
  department: external_exports.string().trim().max(100).optional(),
  batch: external_exports.string().trim().max(30).optional(),
  address: external_exports.string().trim().max(500).optional(),
  skills: list,
  interests: list,
  experience: external_exports.string().trim().max(2e3).optional(),
  motivation: external_exports.string().trim().min(20).max(3e3),
  portfolioUrl: optionalUrl,
  githubUrl: optionalUrl,
  linkedinUrl: optionalUrl,
  timeCommitment,
  declarationAccepted: external_exports.literal(true)
};
var membershipDraftSchema = external_exports.object({
  membershipTypeKey: membershipFields.membershipTypeKey,
  fullName: membershipFields.fullName.optional(),
  phone: membershipFields.phone.optional(),
  studentId: membershipFields.studentId.optional(),
  department: membershipFields.department.optional(),
  batch: membershipFields.batch.optional(),
  academicSession: membershipFields.academicSession,
  gender: membershipFields.gender,
  address: membershipFields.address,
  skills: membershipFields.skills.optional(),
  interests: membershipFields.interests.optional(),
  experience: membershipFields.experience,
  motivation: external_exports.string().trim().max(3e3).optional(),
  portfolioUrl: membershipFields.portfolioUrl,
  githubUrl: membershipFields.githubUrl,
  linkedinUrl: membershipFields.linkedinUrl,
  timeCommitment: membershipFields.timeCommitment.optional(),
  declarationAccepted: external_exports.boolean().optional()
}).strict();
var membershipApplicationSchema = external_exports.object({
  ...membershipFields,
  payment: paymentSubmissionSchema.optional()
}).strict();
var volunteerDraftSchema = external_exports.object({
  volunteerProgramKey: volunteerFields.volunteerProgramKey,
  fullName: volunteerFields.fullName.optional(),
  phone: volunteerFields.phone.optional(),
  organization: volunteerFields.organization,
  department: volunteerFields.department,
  batch: volunteerFields.batch,
  address: volunteerFields.address,
  skills: volunteerFields.skills.optional(),
  interests: volunteerFields.interests.optional(),
  experience: volunteerFields.experience,
  motivation: external_exports.string().trim().max(3e3).optional(),
  portfolioUrl: volunteerFields.portfolioUrl,
  githubUrl: volunteerFields.githubUrl,
  linkedinUrl: volunteerFields.linkedinUrl,
  timeCommitment: volunteerFields.timeCommitment.optional(),
  declarationAccepted: external_exports.boolean().optional()
}).strict();
var volunteerApplicationSchema = external_exports.object(volunteerFields).strict();
var cancellationSchema = external_exports.object({ reason: external_exports.string().trim().min(10).max(1e3) }).strict();
var closureRequestSchema = external_exports.object({ reason: external_exports.string().trim().min(10).max(1e3) }).strict();

// worker/routes/membership.ts
function idempotentJson2(context, result) {
  context.header("Idempotency-Replayed", result.replayed ? "true" : "false");
  if (result.status === 201) return context.json(success(result.data, context.get("requestId")), 201);
  if (result.status === 202) return context.json(success(result.data, context.get("requestId")), 202);
  return context.json(success(result.data, context.get("requestId")), 200);
}
__name(idempotentJson2, "idempotentJson");
function nullable(value) {
  return value && value.length > 0 ? value : null;
}
__name(nullable, "nullable");
function membershipValues(input, email4) {
  return [
    input.fullName ?? null,
    email4,
    input.phone ?? null,
    input.studentId ?? null,
    input.department ?? null,
    input.batch ?? null,
    nullable(input.academicSession),
    input.gender ?? null,
    nullable(input.address),
    JSON.stringify(input.skills ?? []),
    JSON.stringify(input.interests ?? []),
    nullable(input.experience),
    nullable(input.motivation),
    input.portfolioUrl ?? null,
    input.githubUrl ?? null,
    input.linkedinUrl ?? null,
    input.timeCommitment ?? null,
    input.declarationAccepted ? 1 : 0
  ];
}
__name(membershipValues, "membershipValues");
function volunteerValues(input, email4) {
  return [
    input.fullName ?? null,
    email4,
    input.phone ?? null,
    nullable(input.organization),
    nullable(input.department),
    nullable(input.batch),
    nullable(input.address),
    JSON.stringify(input.skills ?? []),
    JSON.stringify(input.interests ?? []),
    nullable(input.experience),
    nullable(input.motivation),
    input.portfolioUrl ?? null,
    input.githubUrl ?? null,
    input.linkedinUrl ?? null,
    input.timeCommitment ?? null,
    input.declarationAccepted ? 1 : 0
  ];
}
__name(volunteerValues, "volunteerValues");
function mapDomainDatabaseError(error) {
  const message = error instanceof Error ? error.message : "";
  if (/membership_payments_transaction_reference_idx|UNIQUE constraint failed: membership_payments\.payment_method, membership_payments\.transaction_reference/iu.test(message)) {
    throw new AppError({ code: "PAYMENT_REFERENCE_EXISTS", message: "This payment transaction ID has already been submitted.", status: 409 });
  }
  if (/membership_applications_one_open|volunteer_applications_one_open|UNIQUE constraint failed: (membership|volunteer)_applications\.user_id/iu.test(message)) {
    throw new AppError({ code: "OPEN_APPLICATION_EXISTS", message: "An open application already exists.", status: 409 });
  }
  if (/membership_renewals_one_open|volunteer_renewals_one_open|UNIQUE constraint failed: (membership|volunteer)_renewals\.(membership_id|volunteer_id)/iu.test(message)) {
    throw new AppError({ code: "OPEN_RENEWAL_EXISTS", message: "An open renewal request already exists.", status: 409 });
  }
  if (/membership_closure_one_open|volunteer_closure_one_open|UNIQUE constraint failed: (membership|volunteer)_closure_requests\.(membership_id|volunteer_id)/iu.test(message)) {
    throw new AppError({ code: "OPEN_CLOSURE_EXISTS", message: "An open closure request already exists.", status: 409 });
  }
  throw error;
}
__name(mapDomainDatabaseError, "mapDomainDatabaseError");
var membershipRoutes = new Hono2();
membershipRoutes.use("/membership/*", sessionMiddleware({ required: true }));
membershipRoutes.use("/volunteers/*", sessionMiddleware({ required: true }));
membershipRoutes.use("/admin/membership/*", sessionMiddleware({ required: true }));
membershipRoutes.use("/admin/volunteers/*", sessionMiddleware({ required: true }));
membershipRoutes.get("/membership/types", async (context) => {
  const { results } = await context.env.DB.prepare(
    `SELECT type_key AS typeKey, name, description, term_months AS termMonths,
            payment_required AS paymentRequired, fee_minor AS feeMinor, currency
     FROM membership_types WHERE application_enabled = 1 AND deleted_at IS NULL ORDER BY name`
  ).all();
  return context.json(success(results, context.get("requestId")));
});
membershipRoutes.get("/volunteers/programs", async (context) => {
  const { results } = await context.env.DB.prepare(
    `SELECT program_key AS programKey, name, description, term_months AS termMonths
     FROM volunteer_programs WHERE application_enabled = 1 AND deleted_at IS NULL ORDER BY name`
  ).all();
  return context.json(success(results, context.get("requestId")));
});
membershipRoutes.get("/membership/me", async (context) => {
  const { user } = requireAuth(context);
  const [applications, memberships, renewals, closures, paymentRequests, payments] = await Promise.all([
    context.env.DB.prepare(
      `SELECT ma.id AS applicationId, mt.type_key AS membershipTypeKey, mt.name AS membershipTypeName,
              ma.status, ma.full_name AS fullName, ma.email_snapshot AS email, ma.phone,
              ma.student_id AS studentId, ma.department, ma.batch, ma.academic_session AS academicSession,
              ma.gender, ma.address, ma.skills_json AS skillsJson, ma.interests_json AS interestsJson,
              ma.experience, ma.motivation, ma.portfolio_url AS portfolioUrl, ma.github_url AS githubUrl,
              ma.linkedin_url AS linkedinUrl, ma.time_commitment AS timeCommitment,
              ma.declaration_accepted AS declarationAccepted, ma.revision, ma.created_at AS createdAt,
              ma.updated_at AS updatedAt, ma.submitted_at AS submittedAt, ma.cancelled_at AS cancelledAt,
              ma.cancellation_reason AS cancellationReason, ma.decision_at AS decisionAt,
              ma.decision_reason AS decisionReason
       FROM membership_applications ma JOIN membership_types mt ON mt.id = ma.membership_type_id
       WHERE ma.user_id = ? ORDER BY ma.created_at DESC LIMIT 10`
    ).bind(user.id).all(),
    context.env.DB.prepare(
      `SELECT m.id AS membershipId, m.membership_number AS membershipNumber, mt.name AS membershipTypeName,
              m.batch, m.issue_date AS issueDate, m.start_date AS startDate, m.end_date AS endDate,
              m.status, m.certificate_eligible AS certificateEligible, m.closed_at AS closedAt,
              m.closure_reason AS closureReason
       FROM memberships m JOIN membership_types mt ON mt.id = m.membership_type_id
       WHERE m.user_id = ? ORDER BY m.created_at DESC`
    ).bind(user.id).all(),
    context.env.DB.prepare(
      `SELECT mr.id AS renewalId, mr.membership_id AS membershipId, mr.status,
              mr.requested_at AS requestedAt, mr.decision_at AS decisionAt, mr.decision_reason AS decisionReason
       FROM membership_renewals mr JOIN memberships m ON m.id = mr.membership_id
       WHERE m.user_id = ? ORDER BY mr.requested_at DESC`
    ).bind(user.id).all(),
    context.env.DB.prepare(
      `SELECT cr.id AS closureRequestId, cr.membership_id AS membershipId, cr.reason, cr.status,
              cr.requested_at AS requestedAt, cr.decision_at AS decisionAt, cr.decision_reason AS decisionReason
       FROM membership_closure_requests cr JOIN memberships m ON m.id = cr.membership_id
       WHERE m.user_id = ? ORDER BY cr.requested_at DESC`
    ).bind(user.id).all(),
    context.env.DB.prepare(
      `SELECT mpr.id AS paymentRequestId, mpr.application_id AS applicationId,
              mpr.expected_amount_minor AS expectedAmountMinor, mpr.currency,
              mpr.payment_methods_json AS paymentMethodsJson,
              mpr.payment_number AS paymentNumber,
              mpr.payment_instructions AS paymentInstructions,
              mpr.requested_at AS requestedAt, mpr.reason
       FROM membership_payment_requests mpr
       JOIN membership_applications ma ON ma.id = mpr.application_id
       WHERE ma.user_id = ? ORDER BY mpr.requested_at DESC`
    ).bind(user.id).all(),
    context.env.DB.prepare(
      `SELECT mp.id AS paymentId, mp.application_id AS applicationId,
              mp.expected_amount_minor AS expectedAmountMinor, mp.currency,
              mp.payment_method AS paymentMethod, mp.payer_phone AS payerPhone,
              mp.transaction_reference AS transactionReference,
              mp.status, mp.submitted_at AS submittedAt, mp.verified_at AS verifiedAt,
              mp.verification_reason AS verificationReason
       FROM membership_payments mp
       JOIN membership_applications ma ON ma.id = mp.application_id
       WHERE ma.user_id = ? ORDER BY mp.submitted_at DESC`
    ).bind(user.id).all()
  ]);
  return context.json(success({
    applications: applications.results,
    memberships: memberships.results,
    renewals: renewals.results,
    closures: closures.results,
    paymentRequests: paymentRequests.results,
    payments: payments.results
  }, context.get("requestId")));
});
membershipRoutes.get("/volunteers/me", async (context) => {
  const { user } = requireAuth(context);
  const [applications, volunteers, renewals, closures] = await Promise.all([
    context.env.DB.prepare(
      `SELECT va.id AS applicationId, vp.program_key AS volunteerProgramKey, vp.name AS volunteerProgramName,
              va.status, va.full_name AS fullName, va.email_snapshot AS email, va.phone, va.organization,
              va.department, va.batch, va.address, va.skills_json AS skillsJson,
              va.interests_json AS interestsJson, va.experience, va.motivation,
              va.portfolio_url AS portfolioUrl, va.github_url AS githubUrl, va.linkedin_url AS linkedinUrl,
              va.time_commitment AS timeCommitment, va.declaration_accepted AS declarationAccepted,
              va.revision, va.created_at AS createdAt, va.updated_at AS updatedAt,
              va.submitted_at AS submittedAt, va.cancelled_at AS cancelledAt,
              va.cancellation_reason AS cancellationReason, va.decision_at AS decisionAt,
              va.decision_reason AS decisionReason
       FROM volunteer_applications va JOIN volunteer_programs vp ON vp.id = va.volunteer_program_id
       WHERE va.user_id = ? ORDER BY va.created_at DESC LIMIT 10`
    ).bind(user.id).all(),
    context.env.DB.prepare(
      `SELECT v.id AS volunteerId, v.volunteer_number AS volunteerNumber, vp.name AS volunteerProgramName,
              v.issue_year AS issueYear, v.issue_date AS issueDate, v.start_date AS startDate,
              v.end_date AS endDate, v.status, v.certificate_eligible AS certificateEligible,
              v.closed_at AS closedAt, v.closure_reason AS closureReason
       FROM volunteers v JOIN volunteer_programs vp ON vp.id = v.volunteer_program_id
       WHERE v.user_id = ? ORDER BY v.created_at DESC`
    ).bind(user.id).all(),
    context.env.DB.prepare(
      `SELECT vr.id AS renewalId, vr.volunteer_id AS volunteerId, vr.status,
              vr.requested_at AS requestedAt, vr.decision_at AS decisionAt, vr.decision_reason AS decisionReason
       FROM volunteer_renewals vr JOIN volunteers v ON v.id = vr.volunteer_id
       WHERE v.user_id = ? ORDER BY vr.requested_at DESC`
    ).bind(user.id).all(),
    context.env.DB.prepare(
      `SELECT cr.id AS closureRequestId, cr.volunteer_id AS volunteerId, cr.reason, cr.status,
              cr.requested_at AS requestedAt, cr.decision_at AS decisionAt, cr.decision_reason AS decisionReason
       FROM volunteer_closure_requests cr JOIN volunteers v ON v.id = cr.volunteer_id
       WHERE v.user_id = ? ORDER BY cr.requested_at DESC`
    ).bind(user.id).all()
  ]);
  return context.json(success({ applications: applications.results, volunteers: volunteers.results, renewals: renewals.results, closures: closures.results }, context.get("requestId")));
});
membershipRoutes.put("/membership/draft", csrfMiddleware(), async (context) => {
  const { user } = requireAuth(context);
  const input = await parseJson(context, membershipDraftSchema);
  const idempotencyKey = requireIdempotencyKey(context);
  const replay = await getIdempotentReplay({ db: context.env.DB, operation: "membership.application.draft", actorKey: user.id, idempotencyKey, requestData: input });
  if (replay) return idempotentJson2(context, replay);
  const [type, open, membership] = await Promise.all([
    membershipTypeByKey(context.env.DB, input.membershipTypeKey),
    openMembershipApplication(context.env.DB, user.id),
    currentMembership(context.env.DB, user.id)
  ]);
  if (membership) throw new AppError({ code: "MEMBERSHIP_EXISTS", message: "A current membership already exists.", status: 409 });
  if (open && open.status !== "DRAFT") throw new AppError({ code: "APPLICATION_ALREADY_SUBMITTED", message: "The open application can no longer be edited.", status: 409 });
  const applicationId = open?.id ?? crypto.randomUUID();
  const revision = (open?.revision ?? 0) + 1;
  const now = (/* @__PURE__ */ new Date()).toISOString();
  const values = membershipValues(input, user.email);
  const statement = open ? context.env.DB.prepare(
    `UPDATE membership_applications SET membership_type_id = ?, full_name = ?, email_snapshot = ?,
          phone = ?, student_id = ?, department = ?, batch = ?, academic_session = ?, gender = ?, address = ?,
          skills_json = ?, interests_json = ?, experience = ?, motivation = ?, portfolio_url = ?, github_url = ?,
          linkedin_url = ?, time_commitment = ?, declaration_accepted = ?, revision = revision + 1, updated_at = ?
         WHERE id = ? AND user_id = ? AND status = 'DRAFT'`
  ).bind(type.id, ...values, now, applicationId, user.id) : context.env.DB.prepare(
    `INSERT INTO membership_applications
          (id, user_id, membership_type_id, status, full_name, email_snapshot, phone, student_id, department,
           batch, academic_session, gender, address, skills_json, interests_json, experience, motivation,
           portfolio_url, github_url, linkedin_url, time_commitment, declaration_accepted, updated_at)
         VALUES (?, ?, ?, 'DRAFT', ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
  ).bind(applicationId, user.id, type.id, ...values, now);
  try {
    const result = await executeIdempotentCommand({
      db: context.env.DB,
      operation: "membership.application.draft",
      actorKey: user.id,
      idempotencyKey,
      requestData: input,
      responseData: { applicationId, status: "DRAFT", revision },
      responseStatus: open ? 200 : 201,
      statements: [
        statement,
        createAuditStatement(context.env.DB, {
          requestId: context.get("requestId"),
          actorId: user.id,
          action: "MEMBERSHIP_APPLICATION_DRAFT_SAVED",
          entityType: "MEMBERSHIP_APPLICATION",
          entityId: applicationId,
          reason: "Applicant saved a membership application draft.",
          metadata: { revision, membershipTypeKey: type.type_key }
        })
      ]
    });
    return idempotentJson2(context, result);
  } catch (error) {
    return mapDomainDatabaseError(error);
  }
});
membershipRoutes.post("/membership/apply", csrfMiddleware(), async (context) => {
  const { user } = requireAuth(context);
  const input = await parseJson(context, membershipApplicationSchema);
  const idempotencyKey = requireIdempotencyKey(context);
  const replay = await getIdempotentReplay({ db: context.env.DB, operation: "membership.application.submit", actorKey: user.id, idempotencyKey, requestData: input });
  if (replay) return idempotentJson2(context, replay);
  const [type, open, membership] = await Promise.all([
    membershipTypeByKey(context.env.DB, input.membershipTypeKey),
    openMembershipApplication(context.env.DB, user.id),
    currentMembership(context.env.DB, user.id)
  ]);
  if (membership) throw new AppError({ code: "MEMBERSHIP_EXISTS", message: "A current membership already exists.", status: 409 });
  if (open && open.status !== "DRAFT") throw new AppError({ code: "APPLICATION_ALREADY_SUBMITTED", message: "An application is already being processed.", status: 409 });
  if (type.payment_required === 1 && (type.fee_minor === null || type.fee_minor <= 0)) {
    throw new AppError({ code: "PAYMENT_CONFIGURATION_INVALID", message: "The membership fee requires administrator attention.", status: 503 });
  }
  if (type.payment_required === 1 && !input.payment) {
    throw new AppError({ code: "PAYMENT_EVIDENCE_REQUIRED", message: "Submit bKash or Nagad payment evidence with this membership application.", status: 422 });
  }
  if (type.payment_required === 0 && input.payment) {
    throw new AppError({ code: "PAYMENT_NOT_REQUIRED", message: "The selected membership type does not require payment.", status: 422 });
  }
  const paymentSettings = type.payment_required === 1 ? await readMembershipPaymentSettings(context.env.DB) : null;
  if (input.payment && paymentSettings && !paymentSettings.paymentMethods.includes(input.payment.paymentMethod)) {
    throw new AppError({ code: "PAYMENT_METHOD_NOT_AVAILABLE", message: "Use an enabled payment method shown on the application form.", status: 409 });
  }
  const applicationId = open?.id ?? crypto.randomUUID();
  const paymentRequestId = input.payment ? crypto.randomUUID() : null;
  const paymentId = input.payment ? crypto.randomUUID() : null;
  const now = (/* @__PURE__ */ new Date()).toISOString();
  const values = membershipValues(input, user.email);
  const statement = open ? context.env.DB.prepare(
    `UPDATE membership_applications SET membership_type_id = ?, status = 'SUBMITTED', full_name = ?,
          email_snapshot = ?, phone = ?, student_id = ?, department = ?, batch = ?, academic_session = ?,
          gender = ?, address = ?, skills_json = ?, interests_json = ?, experience = ?, motivation = ?,
          portfolio_url = ?, github_url = ?, linkedin_url = ?, time_commitment = ?, declaration_accepted = ?,
          revision = revision + 1, submitted_at = ?, updated_at = ? WHERE id = ? AND user_id = ? AND status = 'DRAFT'`
  ).bind(type.id, ...values, now, now, applicationId, user.id) : context.env.DB.prepare(
    `INSERT INTO membership_applications
          (id, user_id, membership_type_id, status, full_name, email_snapshot, phone, student_id, department,
           batch, academic_session, gender, address, skills_json, interests_json, experience, motivation,
           portfolio_url, github_url, linkedin_url, time_commitment, declaration_accepted, submitted_at, updated_at)
         VALUES (?, ?, ?, 'SUBMITTED', ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
  ).bind(applicationId, user.id, type.id, ...values, now, now);
  const statements = [
    statement,
    createAuditStatement(context.env.DB, {
      requestId: context.get("requestId"),
      actorId: user.id,
      action: "MEMBERSHIP_APPLICATION_SUBMITTED",
      entityType: "MEMBERSHIP_APPLICATION",
      entityId: applicationId,
      reason: "Applicant submitted the membership declaration.",
      metadata: { membershipTypeKey: type.type_key, batch: input.batch }
    })
  ];
  if (input.payment && paymentSettings && paymentRequestId && paymentId && type.fee_minor !== null) {
    statements.push(
      context.env.DB.prepare(
        `INSERT INTO membership_payment_requests
          (id, application_id, expected_amount_minor, currency, payment_methods_json,
           payment_number, payment_instructions, requested_by, reason)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`
      ).bind(
        paymentRequestId,
        applicationId,
        type.fee_minor,
        type.currency,
        JSON.stringify(paymentSettings.paymentMethods),
        paymentSettings.paymentNumber,
        paymentSettings.paymentInstructions,
        user.id,
        "Payment evidence was submitted with the membership application."
      ),
      context.env.DB.prepare(
        `INSERT INTO membership_payments
          (id, application_id, payment_request_id, expected_amount_minor, currency,
           payment_method, payer_phone, transaction_reference, submitted_by)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`
      ).bind(
        paymentId,
        applicationId,
        paymentRequestId,
        type.fee_minor,
        type.currency,
        input.payment.paymentMethod,
        input.payment.payerPhone,
        input.payment.transactionReference,
        user.id
      ),
      createAuditStatement(context.env.DB, {
        requestId: context.get("requestId"),
        actorId: user.id,
        action: "MEMBERSHIP_PAYMENT_REQUEST_CREATED_AT_SUBMISSION",
        entityType: "MEMBERSHIP_PAYMENT_REQUEST",
        entityId: paymentRequestId,
        reason: "The server snapshotted the configured membership fee and payment destination during application submission.",
        metadata: { applicationId, expectedAmountMinor: type.fee_minor, currency: type.currency, paymentNumber: paymentSettings.paymentNumber }
      }),
      createAuditStatement(context.env.DB, {
        requestId: context.get("requestId"),
        actorId: user.id,
        action: "MEMBERSHIP_PAYMENT_SUBMITTED",
        entityType: "MEMBERSHIP_PAYMENT",
        entityId: paymentId,
        reason: "Applicant submitted payment evidence with the membership application for independent finance verification.",
        metadata: { applicationId, paymentMethod: input.payment.paymentMethod }
      })
    );
  }
  try {
    const result = await executeIdempotentCommand({
      db: context.env.DB,
      operation: "membership.application.submit",
      actorKey: user.id,
      idempotencyKey,
      requestData: input,
      responseData: { applicationId, paymentId, status: "SUBMITTED", paymentStatus: paymentId ? "SUBMITTED" : null, submitted: true },
      responseStatus: 201,
      statements
    });
    return idempotentJson2(context, result);
  } catch (error) {
    return mapDomainDatabaseError(error);
  }
});
membershipRoutes.put("/volunteers/draft", csrfMiddleware(), async (context) => {
  const { user } = requireAuth(context);
  const input = await parseJson(context, volunteerDraftSchema);
  const idempotencyKey = requireIdempotencyKey(context);
  const replay = await getIdempotentReplay({ db: context.env.DB, operation: "volunteer.application.draft", actorKey: user.id, idempotencyKey, requestData: input });
  if (replay) return idempotentJson2(context, replay);
  const [program, open, volunteer] = await Promise.all([
    volunteerProgramByKey(context.env.DB, input.volunteerProgramKey),
    openVolunteerApplication(context.env.DB, user.id),
    currentVolunteer(context.env.DB, user.id)
  ]);
  if (volunteer) throw new AppError({ code: "VOLUNTEER_RECORD_EXISTS", message: "A current volunteer record already exists.", status: 409 });
  if (open && open.status !== "DRAFT") throw new AppError({ code: "APPLICATION_ALREADY_SUBMITTED", message: "The open application can no longer be edited.", status: 409 });
  const applicationId = open?.id ?? crypto.randomUUID();
  const revision = (open?.revision ?? 0) + 1;
  const now = (/* @__PURE__ */ new Date()).toISOString();
  const values = volunteerValues(input, user.email);
  const statement = open ? context.env.DB.prepare(
    `UPDATE volunteer_applications SET volunteer_program_id = ?, full_name = ?, email_snapshot = ?, phone = ?,
          organization = ?, department = ?, batch = ?, address = ?, skills_json = ?, interests_json = ?,
          experience = ?, motivation = ?, portfolio_url = ?, github_url = ?, linkedin_url = ?,
          time_commitment = ?, declaration_accepted = ?, revision = revision + 1, updated_at = ?
         WHERE id = ? AND user_id = ? AND status = 'DRAFT'`
  ).bind(program.id, ...values, now, applicationId, user.id) : context.env.DB.prepare(
    `INSERT INTO volunteer_applications
          (id, user_id, volunteer_program_id, status, full_name, email_snapshot, phone, organization,
           department, batch, address, skills_json, interests_json, experience, motivation, portfolio_url,
           github_url, linkedin_url, time_commitment, declaration_accepted, updated_at)
         VALUES (?, ?, ?, 'DRAFT', ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
  ).bind(applicationId, user.id, program.id, ...values, now);
  try {
    const result = await executeIdempotentCommand({
      db: context.env.DB,
      operation: "volunteer.application.draft",
      actorKey: user.id,
      idempotencyKey,
      requestData: input,
      responseData: { applicationId, status: "DRAFT", revision },
      responseStatus: open ? 200 : 201,
      statements: [
        statement,
        createAuditStatement(context.env.DB, {
          requestId: context.get("requestId"),
          actorId: user.id,
          action: "VOLUNTEER_APPLICATION_DRAFT_SAVED",
          entityType: "VOLUNTEER_APPLICATION",
          entityId: applicationId,
          reason: "Applicant saved a volunteer application draft.",
          metadata: { revision, volunteerProgramKey: program.program_key }
        })
      ]
    });
    return idempotentJson2(context, result);
  } catch (error) {
    return mapDomainDatabaseError(error);
  }
});
membershipRoutes.post("/volunteers/apply", csrfMiddleware(), async (context) => {
  const { user } = requireAuth(context);
  const input = await parseJson(context, volunteerApplicationSchema);
  const idempotencyKey = requireIdempotencyKey(context);
  const replay = await getIdempotentReplay({ db: context.env.DB, operation: "volunteer.application.submit", actorKey: user.id, idempotencyKey, requestData: input });
  if (replay) return idempotentJson2(context, replay);
  const [program, open, volunteer] = await Promise.all([
    volunteerProgramByKey(context.env.DB, input.volunteerProgramKey),
    openVolunteerApplication(context.env.DB, user.id),
    currentVolunteer(context.env.DB, user.id)
  ]);
  if (volunteer) throw new AppError({ code: "VOLUNTEER_RECORD_EXISTS", message: "A current volunteer record already exists.", status: 409 });
  if (open && open.status !== "DRAFT") throw new AppError({ code: "APPLICATION_ALREADY_SUBMITTED", message: "An application is already being processed.", status: 409 });
  const applicationId = open?.id ?? crypto.randomUUID();
  const now = (/* @__PURE__ */ new Date()).toISOString();
  const values = volunteerValues(input, user.email);
  const statement = open ? context.env.DB.prepare(
    `UPDATE volunteer_applications SET volunteer_program_id = ?, status = 'SUBMITTED', full_name = ?,
          email_snapshot = ?, phone = ?, organization = ?, department = ?, batch = ?, address = ?, skills_json = ?,
          interests_json = ?, experience = ?, motivation = ?, portfolio_url = ?, github_url = ?, linkedin_url = ?,
          time_commitment = ?, declaration_accepted = ?, revision = revision + 1, submitted_at = ?, updated_at = ?
         WHERE id = ? AND user_id = ? AND status = 'DRAFT'`
  ).bind(program.id, ...values, now, now, applicationId, user.id) : context.env.DB.prepare(
    `INSERT INTO volunteer_applications
          (id, user_id, volunteer_program_id, status, full_name, email_snapshot, phone, organization,
           department, batch, address, skills_json, interests_json, experience, motivation, portfolio_url,
           github_url, linkedin_url, time_commitment, declaration_accepted, submitted_at, updated_at)
         VALUES (?, ?, ?, 'SUBMITTED', ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
  ).bind(applicationId, user.id, program.id, ...values, now, now);
  try {
    const result = await executeIdempotentCommand({
      db: context.env.DB,
      operation: "volunteer.application.submit",
      actorKey: user.id,
      idempotencyKey,
      requestData: input,
      responseData: { applicationId, status: "SUBMITTED", submitted: true },
      responseStatus: 201,
      statements: [
        statement,
        createAuditStatement(context.env.DB, {
          requestId: context.get("requestId"),
          actorId: user.id,
          action: "VOLUNTEER_APPLICATION_SUBMITTED",
          entityType: "VOLUNTEER_APPLICATION",
          entityId: applicationId,
          reason: "Applicant submitted the volunteer declaration.",
          metadata: { volunteerProgramKey: program.program_key }
        })
      ]
    });
    return idempotentJson2(context, result);
  } catch (error) {
    return mapDomainDatabaseError(error);
  }
});
async function cancelApplication(context, domain) {
  const { user } = requireAuth(context);
  const input = await parseJson(context, cancellationSchema);
  const applicationId = context.req.param("applicationId") ?? "";
  if (!applicationId) throw new AppError({ code: "APPLICATION_NOT_FOUND", message: "The application was not found.", status: 404 });
  const operation = `${domain}.application.cancel`;
  const requestData = { applicationId, ...input };
  const idempotencyKey = requireIdempotencyKey(context);
  const replay = await getIdempotentReplay({ db: context.env.DB, operation, actorKey: user.id, idempotencyKey, requestData });
  if (replay) return idempotentJson2(context, replay);
  const table = domain === "membership" ? "membership_applications" : "volunteer_applications";
  const application = await context.env.DB.prepare(
    `SELECT id, status FROM ${table} WHERE id = ? AND user_id = ?`
  ).bind(applicationId, user.id).first();
  if (!application) throw new AppError({ code: "APPLICATION_NOT_FOUND", message: "The application was not found.", status: 404 });
  if (!["DRAFT", "SUBMITTED"].includes(application.status)) {
    throw new AppError({ code: "APPLICATION_CANNOT_BE_CANCELLED", message: "The application can no longer be cancelled by the applicant.", status: 409 });
  }
  const now = (/* @__PURE__ */ new Date()).toISOString();
  const entityType = domain === "membership" ? "MEMBERSHIP_APPLICATION" : "VOLUNTEER_APPLICATION";
  const action = domain === "membership" ? "MEMBERSHIP_APPLICATION_CANCELLED" : "VOLUNTEER_APPLICATION_CANCELLED";
  const result = await executeIdempotentCommand({
    db: context.env.DB,
    operation,
    actorKey: user.id,
    idempotencyKey,
    requestData,
    responseData: { applicationId, status: "CANCELLED", cancelled: true },
    responseStatus: 200,
    statements: [
      context.env.DB.prepare(
        `UPDATE ${table} SET status = 'CANCELLED', cancelled_at = ?, cancellation_reason = ?, updated_at = ?
         WHERE id = ? AND user_id = ? AND status IN ('DRAFT', 'SUBMITTED')`
      ).bind(now, input.reason, now, applicationId, user.id),
      createAuditStatement(context.env.DB, {
        requestId: context.get("requestId"),
        actorId: user.id,
        action,
        entityType,
        entityId: applicationId,
        reason: input.reason,
        metadata: { previousStatus: application.status }
      })
    ]
  });
  return idempotentJson2(context, result);
}
__name(cancelApplication, "cancelApplication");
membershipRoutes.post("/membership/applications/:applicationId/cancel", csrfMiddleware(), (context) => cancelApplication(context, "membership"));
membershipRoutes.post("/volunteers/applications/:applicationId/cancel", csrfMiddleware(), (context) => cancelApplication(context, "volunteer"));
membershipRoutes.post("/membership/renew", csrfMiddleware(), async (context) => {
  const { user } = requireAuth(context);
  const idempotencyKey = requireIdempotencyKey(context);
  const requestData = {};
  const replay = await getIdempotentReplay({ db: context.env.DB, operation: "membership.renewal.request", actorKey: user.id, idempotencyKey, requestData });
  if (replay) return idempotentJson2(context, replay);
  const membership = await currentMembership(context.env.DB, user.id);
  if (!membership) throw new AppError({ code: "MEMBERSHIP_NOT_FOUND", message: "No current membership is available for renewal.", status: 409 });
  if (!["EXPIRING_SOON", "EXPIRED"].includes(membership.status)) throw new AppError({ code: "MEMBERSHIP_NOT_RENEWABLE", message: "Renewal becomes available when the membership is expiring soon or expired.", status: 409 });
  const renewalId = crypto.randomUUID();
  const now = (/* @__PURE__ */ new Date()).toISOString();
  try {
    const result = await executeIdempotentCommand({
      db: context.env.DB,
      operation: "membership.renewal.request",
      actorKey: user.id,
      idempotencyKey,
      requestData,
      responseData: { renewalId, membershipId: membership.id, status: "REQUESTED" },
      responseStatus: 201,
      statements: [
        context.env.DB.prepare("INSERT INTO membership_renewals (id, membership_id, requested_by, previous_membership_status) VALUES (?, ?, ?, ?)").bind(renewalId, membership.id, user.id, membership.status),
        context.env.DB.prepare("UPDATE memberships SET status = 'RENEWAL_PENDING', updated_at = ? WHERE id = ?").bind(now, membership.id),
        createAuditStatement(context.env.DB, {
          requestId: context.get("requestId"),
          actorId: user.id,
          action: "MEMBERSHIP_RENEWAL_REQUESTED",
          entityType: "MEMBERSHIP_RENEWAL",
          entityId: renewalId,
          reason: "Member requested renewal.",
          metadata: { membershipId: membership.id }
        })
      ]
    });
    return idempotentJson2(context, result);
  } catch (error) {
    return mapDomainDatabaseError(error);
  }
});
membershipRoutes.post("/volunteers/renew", csrfMiddleware(), async (context) => {
  const { user } = requireAuth(context);
  const idempotencyKey = requireIdempotencyKey(context);
  const requestData = {};
  const replay = await getIdempotentReplay({ db: context.env.DB, operation: "volunteer.renewal.request", actorKey: user.id, idempotencyKey, requestData });
  if (replay) return idempotentJson2(context, replay);
  const volunteer = await currentVolunteer(context.env.DB, user.id);
  if (!volunteer) throw new AppError({ code: "VOLUNTEER_NOT_FOUND", message: "No current volunteer record is available for renewal.", status: 409 });
  if (!["EXPIRING_SOON", "EXPIRED"].includes(volunteer.status)) throw new AppError({ code: "VOLUNTEER_NOT_RENEWABLE", message: "Renewal becomes available when the volunteer term is expiring soon or expired.", status: 409 });
  const renewalId = crypto.randomUUID();
  const now = (/* @__PURE__ */ new Date()).toISOString();
  try {
    const result = await executeIdempotentCommand({
      db: context.env.DB,
      operation: "volunteer.renewal.request",
      actorKey: user.id,
      idempotencyKey,
      requestData,
      responseData: { renewalId, volunteerId: volunteer.id, status: "REQUESTED" },
      responseStatus: 201,
      statements: [
        context.env.DB.prepare("INSERT INTO volunteer_renewals (id, volunteer_id, requested_by, previous_volunteer_status) VALUES (?, ?, ?, ?)").bind(renewalId, volunteer.id, user.id, volunteer.status),
        context.env.DB.prepare("UPDATE volunteers SET status = 'RENEWAL_PENDING', updated_at = ? WHERE id = ?").bind(now, volunteer.id),
        createAuditStatement(context.env.DB, {
          requestId: context.get("requestId"),
          actorId: user.id,
          action: "VOLUNTEER_RENEWAL_REQUESTED",
          entityType: "VOLUNTEER_RENEWAL",
          entityId: renewalId,
          reason: "Volunteer requested renewal.",
          metadata: { volunteerId: volunteer.id }
        })
      ]
    });
    return idempotentJson2(context, result);
  } catch (error) {
    return mapDomainDatabaseError(error);
  }
});
async function requestClosure(context, domain) {
  const { user } = requireAuth(context);
  const input = await parseJson(context, closureRequestSchema);
  const operation = `${domain}.closure.request`;
  const idempotencyKey = requireIdempotencyKey(context);
  const replay = await getIdempotentReplay({ db: context.env.DB, operation, actorKey: user.id, idempotencyKey, requestData: input });
  if (replay) return idempotentJson2(context, replay);
  const record = domain === "membership" ? await currentMembership(context.env.DB, user.id) : await currentVolunteer(context.env.DB, user.id);
  if (!record) throw new AppError({ code: "DOMAIN_RECORD_NOT_FOUND", message: "No current record is available for closure.", status: 409 });
  if (["CLOSURE_REQUESTED", "RENEWAL_PENDING"].includes(record.status)) throw new AppError({ code: "DOMAIN_STATE_CONFLICT", message: "The record already has an open lifecycle request.", status: 409 });
  const closureRequestId = crypto.randomUUID();
  const now = (/* @__PURE__ */ new Date()).toISOString();
  const table = domain === "membership" ? "membership_closure_requests" : "volunteer_closure_requests";
  const foreignKey = domain === "membership" ? "membership_id" : "volunteer_id";
  const recordTable = domain === "membership" ? "memberships" : "volunteers";
  const action = domain === "membership" ? "MEMBERSHIP_CLOSURE_REQUESTED" : "VOLUNTEER_CLOSURE_REQUESTED";
  const entityType = domain === "membership" ? "MEMBERSHIP_CLOSURE_REQUEST" : "VOLUNTEER_CLOSURE_REQUEST";
  try {
    const result = await executeIdempotentCommand({
      db: context.env.DB,
      operation,
      actorKey: user.id,
      idempotencyKey,
      requestData: input,
      responseData: { closureRequestId, recordId: record.id, status: "REQUESTED" },
      responseStatus: 201,
      statements: [
        context.env.DB.prepare(`INSERT INTO ${table} (id, ${foreignKey}, requested_by, reason, ${domain === "membership" ? "previous_membership_status" : "previous_volunteer_status"}) VALUES (?, ?, ?, ?, ?)`).bind(closureRequestId, record.id, user.id, input.reason, record.status),
        context.env.DB.prepare(`UPDATE ${recordTable} SET status = 'CLOSURE_REQUESTED', updated_at = ? WHERE id = ?`).bind(now, record.id),
        createAuditStatement(context.env.DB, {
          requestId: context.get("requestId"),
          actorId: user.id,
          action,
          entityType,
          entityId: closureRequestId,
          reason: input.reason,
          metadata: { recordId: record.id }
        })
      ]
    });
    return idempotentJson2(context, result);
  } catch (error) {
    return mapDomainDatabaseError(error);
  }
}
__name(requestClosure, "requestClosure");
membershipRoutes.post("/membership/closure-request", csrfMiddleware(), (context) => requestClosure(context, "membership"));
membershipRoutes.post("/volunteers/closure-request", csrfMiddleware(), (context) => requestClosure(context, "volunteer"));
membershipRoutes.get("/admin/membership/applications", requirePermission("membership.read"), async (context) => {
  const status = context.req.query("status")?.trim() || "SUBMITTED";
  if (!["DRAFT", "SUBMITTED", "UNDER_REVIEW", "PAYMENT_PENDING", "PAYMENT_VERIFICATION", "APPROVED", "REJECTED", "CANCELLED"].includes(status)) {
    throw new AppError({ code: "INVALID_STATUS", message: "The application status filter is invalid.", status: 422 });
  }
  const { results } = await context.env.DB.prepare(
    `SELECT ma.id AS applicationId, ma.status, ma.full_name AS fullName, ma.email_snapshot AS email,
            ma.phone, ma.student_id AS studentId, ma.department, ma.batch, mt.name AS membershipTypeName,
            mt.payment_required AS paymentRequired, mt.fee_minor AS feeMinor, mt.currency,
            (SELECT mp.status FROM membership_payments mp WHERE mp.application_id = ma.id
             ORDER BY mp.submitted_at DESC LIMIT 1) AS latestPaymentStatus,
            ma.submitted_at AS submittedAt, ma.created_at AS createdAt
     FROM membership_applications ma JOIN membership_types mt ON mt.id = ma.membership_type_id
     WHERE ma.status = ? ORDER BY COALESCE(ma.submitted_at, ma.created_at) ASC LIMIT 100`
  ).bind(status).all();
  return context.json(success(results, context.get("requestId")));
});
membershipRoutes.get("/admin/membership/members", requirePermission("membership.read"), async (context) => {
  const search = (context.req.query("search") ?? "").trim().slice(0, 100).replace(/[%_]/g, "");
  const status = (context.req.query("status") ?? "").trim().toUpperCase();
  const offset = Math.max(Number(context.req.query("offset") ?? 0) || 0, 0);
  const pattern = `%${search}%`;
  const [items, total] = await Promise.all([
    context.env.DB.prepare(
      `SELECT m.id, m.membership_number AS membershipNumber, m.status, m.start_date AS startDate,
              m.end_date AS endDate, m.created_at AS joinedAt, u.display_name AS name,
              u.primary_email AS email, ma.student_id AS studentId, ma.department, ma.batch,
              mt.name AS membershipType
       FROM memberships m JOIN users u ON u.id = m.user_id
       JOIN membership_applications ma ON ma.id = m.application_id
       JOIN membership_types mt ON mt.id = m.membership_type_id
       WHERE (? = '' OR m.status = ?) AND (u.display_name LIKE ? OR u.primary_email_normalized LIKE ? OR COALESCE(ma.student_id, '') LIKE ?)
       ORDER BY m.created_at DESC LIMIT 20 OFFSET ?`
    ).bind(status, status, pattern, pattern.toLowerCase(), pattern, offset).all(),
    context.env.DB.prepare(
      `SELECT COUNT(*) AS count FROM memberships m JOIN users u ON u.id = m.user_id
       JOIN membership_applications ma ON ma.id = m.application_id
       WHERE (? = '' OR m.status = ?) AND (u.display_name LIKE ? OR u.primary_email_normalized LIKE ? OR COALESCE(ma.student_id, '') LIKE ?)`
    ).bind(status, status, pattern, pattern.toLowerCase(), pattern).first("count")
  ]);
  return context.json(success({ items: items.results, total: total ?? 0 }, context.get("requestId")));
});
membershipRoutes.get("/admin/volunteers/applications", requirePermission("volunteer.read"), async (context) => {
  const status = context.req.query("status")?.trim() || "SUBMITTED";
  if (!["DRAFT", "SUBMITTED", "UNDER_REVIEW", "APPROVED", "REJECTED", "CANCELLED"].includes(status)) {
    throw new AppError({ code: "INVALID_STATUS", message: "The application status filter is invalid.", status: 422 });
  }
  const { results } = await context.env.DB.prepare(
    `SELECT va.id AS applicationId, va.status, va.full_name AS fullName, va.email_snapshot AS email,
            va.phone, va.organization, va.department, va.batch, vp.name AS volunteerProgramName,
            va.submitted_at AS submittedAt, va.created_at AS createdAt
     FROM volunteer_applications va JOIN volunteer_programs vp ON vp.id = va.volunteer_program_id
     WHERE va.status = ? ORDER BY COALESCE(va.submitted_at, va.created_at) ASC LIMIT 100`
  ).bind(status).all();
  return context.json(success(results, context.get("requestId")));
});
membershipRoutes.get("/admin/volunteers/people", requirePermission("volunteer.read"), async (context) => {
  const search = (context.req.query("search") ?? "").trim().slice(0, 100).replace(/[%_]/g, "");
  const status = (context.req.query("status") ?? "").trim().toUpperCase();
  const offset = Math.max(Number(context.req.query("offset") ?? 0) || 0, 0);
  const pattern = `%${search}%`;
  const [items, total] = await Promise.all([
    context.env.DB.prepare(
      `SELECT v.id, v.volunteer_number AS volunteerNumber, v.status, v.start_date AS startDate,
              v.end_date AS endDate, v.created_at AS joinedAt, u.display_name AS name,
              u.primary_email AS email, va.organization, va.department, va.batch, vp.name AS programName
       FROM volunteers v JOIN users u ON u.id = v.user_id
       JOIN volunteer_applications va ON va.id = v.application_id
       JOIN volunteer_programs vp ON vp.id = v.volunteer_program_id
       WHERE (? = '' OR v.status = ?) AND (u.display_name LIKE ? OR u.primary_email_normalized LIKE ? OR COALESCE(va.organization, '') LIKE ?)
       ORDER BY v.created_at DESC LIMIT 20 OFFSET ?`
    ).bind(status, status, pattern, pattern.toLowerCase(), pattern, offset).all(),
    context.env.DB.prepare(
      `SELECT COUNT(*) AS count FROM volunteers v JOIN users u ON u.id = v.user_id
       JOIN volunteer_applications va ON va.id = v.application_id
       WHERE (? = '' OR v.status = ?) AND (u.display_name LIKE ? OR u.primary_email_normalized LIKE ? OR COALESCE(va.organization, '') LIKE ?)`
    ).bind(status, status, pattern, pattern.toLowerCase(), pattern).first("count")
  ]);
  return context.json(success({ items: items.results, total: total ?? 0 }, context.get("requestId")));
});

// worker/routes/workflow.ts
function routeId(context) {
  const value = context.req.param("id");
  if (!value) throw new AppError({ code: "INVALID_ROUTE", message: "A record identifier is required.", status: 404 });
  return value;
}
__name(routeId, "routeId");
function idempotentJson3(context, result) {
  context.header("Idempotency-Replayed", result.replayed ? "true" : "false");
  if (result.status === 201) return context.json(success(result.data, context.get("requestId")), 201);
  return context.json(success(result.data, context.get("requestId")), 200);
}
__name(idempotentJson3, "idempotentJson");
function workflowConflict(error) {
  const message = error instanceof Error ? error.message : "";
  if (/UNIQUE constraint failed|not available for review|not eligible|workflow evidence is missing|verification decision is missing/iu.test(message)) {
    throw new AppError({
      code: "WORKFLOW_CONFLICT",
      message: "The workflow changed or another authorized action already won this decision.",
      status: 409
    });
  }
  throw error;
}
__name(workflowConflict, "workflowConflict");
async function membershipApplication(db, applicationId) {
  const row = await db.prepare(
    `SELECT ma.id, ma.user_id, ma.status, ma.batch, ma.membership_type_id,
            mt.payment_required, mt.fee_minor, mt.currency, mt.term_months
     FROM membership_applications ma
     JOIN membership_types mt ON mt.id = ma.membership_type_id
     WHERE ma.id = ?`
  ).bind(applicationId).first();
  if (!row) throw new AppError({ code: "APPLICATION_NOT_FOUND", message: "Membership application not found.", status: 404 });
  return row;
}
__name(membershipApplication, "membershipApplication");
async function volunteerApplication(db, applicationId) {
  const row = await db.prepare(
    `SELECT va.id, va.user_id, va.status, va.volunteer_program_id, vp.term_months
     FROM volunteer_applications va
     JOIN volunteer_programs vp ON vp.id = va.volunteer_program_id
     WHERE va.id = ?`
  ).bind(applicationId).first();
  if (!row) throw new AppError({ code: "APPLICATION_NOT_FOUND", message: "Volunteer application not found.", status: 404 });
  return row;
}
__name(volunteerApplication, "volunteerApplication");
function rejectSelfDecision(actorId, applicantId) {
  if (actorId === applicantId) {
    throw new AppError({
      code: "SELF_DECISION_FORBIDDEN",
      message: "An applicant cannot review, verify, approve, or reject their own record.",
      status: 409
    });
  }
}
__name(rejectSelfDecision, "rejectSelfDecision");
function identityAuditStatement(options) {
  const table = options.domain === "membership" ? "memberships" : "volunteers";
  const numberColumn = options.domain === "membership" ? "membership_number" : "volunteer_number";
  const action = options.domain === "membership" ? "MEMBERSHIP_ID_GENERATED" : "VOLUNTEER_ID_GENERATED";
  const entityType = options.domain === "membership" ? "MEMBERSHIP" : "VOLUNTEER";
  return options.db.prepare(
    `INSERT INTO audit_logs
      (id, actor_type, actor_id, action, entity_type, entity_id, reason, metadata_json, request_id)
     SELECT ?, 'USER', ?, ?, ?, ?, ?, json_object('identityNumber', ${numberColumn}, 'applicationId', ?), ?
     FROM ${table} WHERE id = ?`
  ).bind(
    crypto.randomUUID(),
    options.actorId,
    action,
    entityType,
    options.recordId,
    "Server allocated an immutable identity from the transactional sequence.",
    options.applicationId,
    options.requestId,
    options.recordId
  );
}
__name(identityAuditStatement, "identityAuditStatement");
var workflowRoutes = new Hono2();
workflowRoutes.use("/membership/applications/*", sessionMiddleware({ required: true }));
workflowRoutes.use("/admin/membership/*", sessionMiddleware({ required: true }));
workflowRoutes.use("/admin/volunteers/*", sessionMiddleware({ required: true }));
async function startReview(context, domain) {
  const { user } = requireAuth(context);
  const input = await parseJson(context, workflowReasonSchema);
  const applicationId = routeId(context);
  const operation = `${domain}.application.start-review`;
  const idempotencyKey = requireIdempotencyKey(context);
  const requestData = { applicationId, ...input };
  const replay = await getIdempotentReplay({ db: context.env.DB, operation, actorKey: user.id, idempotencyKey, requestData });
  if (replay) return idempotentJson3(context, replay);
  const application = domain === "membership" ? await membershipApplication(context.env.DB, applicationId) : await volunteerApplication(context.env.DB, applicationId);
  rejectSelfDecision(user.id, application.user_id);
  if (application.status !== "SUBMITTED") {
    throw new AppError({ code: "APPLICATION_NOT_REVIEWABLE", message: "Only a submitted application can enter review.", status: 409 });
  }
  const claimTable = domain === "membership" ? "membership_review_claims" : "volunteer_review_claims";
  const applicationTable = domain === "membership" ? "membership_applications" : "volunteer_applications";
  const action = domain === "membership" ? "MEMBERSHIP_REVIEW_STARTED" : "VOLUNTEER_REVIEW_STARTED";
  const entityType = domain === "membership" ? "MEMBERSHIP_APPLICATION" : "VOLUNTEER_APPLICATION";
  const now = (/* @__PURE__ */ new Date()).toISOString();
  try {
    const result = await executeIdempotentCommand({
      db: context.env.DB,
      operation,
      actorKey: user.id,
      idempotencyKey,
      requestData,
      responseData: { applicationId, status: "UNDER_REVIEW" },
      responseStatus: 200,
      statements: [
        context.env.DB.prepare(`INSERT INTO ${claimTable} (application_id, reviewer_id, reason) VALUES (?, ?, ?)`).bind(applicationId, user.id, input.reason),
        context.env.DB.prepare(
          `UPDATE ${applicationTable} SET status = 'UNDER_REVIEW', review_started_at = ?, reviewed_by = ?, updated_at = ?
           WHERE id = ? AND status = 'SUBMITTED'`
        ).bind(now, user.id, now, applicationId),
        createAuditStatement(context.env.DB, {
          requestId: context.get("requestId"),
          actorId: user.id,
          action,
          entityType,
          entityId: applicationId,
          reason: input.reason,
          metadata: { previousStatus: "SUBMITTED", status: "UNDER_REVIEW" }
        })
      ]
    });
    return idempotentJson3(context, result);
  } catch (error) {
    return workflowConflict(error);
  }
}
__name(startReview, "startReview");
workflowRoutes.post(
  "/admin/membership/applications/:id/start-review",
  requirePermission("membership.review"),
  csrfMiddleware(),
  (context) => startReview(context, "membership")
);
workflowRoutes.post(
  "/admin/volunteers/applications/:id/start-review",
  requirePermission("volunteer.review"),
  csrfMiddleware(),
  (context) => startReview(context, "volunteer")
);
workflowRoutes.post(
  "/admin/membership/applications/:id/request-payment",
  requirePermission("membership.review"),
  csrfMiddleware(),
  async (context) => {
    const { user } = requireAuth(context);
    const input = await parseJson(context, workflowReasonSchema);
    const applicationId = routeId(context);
    const operation = "membership.application.request-payment";
    const idempotencyKey = requireIdempotencyKey(context);
    const requestData = { applicationId, ...input };
    const replay = await getIdempotentReplay({ db: context.env.DB, operation, actorKey: user.id, idempotencyKey, requestData });
    if (replay) return idempotentJson3(context, replay);
    const application = await membershipApplication(context.env.DB, applicationId);
    rejectSelfDecision(user.id, application.user_id);
    if (application.status !== "UNDER_REVIEW") {
      throw new AppError({ code: "PAYMENT_REQUEST_NOT_ELIGIBLE", message: "The application must be under review.", status: 409 });
    }
    if (application.payment_required !== 1 || application.fee_minor === null) {
      throw new AppError({ code: "PAYMENT_NOT_CONFIGURED", message: "This membership type has no configured payment requirement.", status: 409 });
    }
    const paymentSettings = await readMembershipPaymentSettings(context.env.DB);
    const paymentRequestId = crypto.randomUUID();
    const now = (/* @__PURE__ */ new Date()).toISOString();
    try {
      const result = await executeIdempotentCommand({
        db: context.env.DB,
        operation,
        actorKey: user.id,
        idempotencyKey,
        requestData,
        responseData: {
          applicationId,
          paymentRequestId,
          status: "PAYMENT_PENDING",
          expectedAmountMinor: application.fee_minor,
          currency: application.currency,
          paymentMethods: paymentSettings.paymentMethods,
          paymentNumber: paymentSettings.paymentNumber,
          paymentInstructions: paymentSettings.paymentInstructions
        },
        responseStatus: 201,
        statements: [
          context.env.DB.prepare(
            `INSERT INTO membership_payment_requests
              (id, application_id, expected_amount_minor, currency, payment_methods_json,
               payment_number, payment_instructions, requested_by, reason)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`
          ).bind(
            paymentRequestId,
            applicationId,
            application.fee_minor,
            application.currency,
            JSON.stringify(paymentSettings.paymentMethods),
            paymentSettings.paymentNumber,
            paymentSettings.paymentInstructions,
            user.id,
            input.reason
          ),
          context.env.DB.prepare(
            "UPDATE membership_applications SET status = 'PAYMENT_PENDING', updated_at = ? WHERE id = ? AND status = 'UNDER_REVIEW'"
          ).bind(now, applicationId),
          createAuditStatement(context.env.DB, {
            requestId: context.get("requestId"),
            actorId: user.id,
            action: "MEMBERSHIP_PAYMENT_REQUESTED",
            entityType: "MEMBERSHIP_PAYMENT_REQUEST",
            entityId: paymentRequestId,
            reason: input.reason,
            metadata: {
              applicationId,
              expectedAmountMinor: application.fee_minor,
              currency: application.currency,
              paymentMethods: paymentSettings.paymentMethods,
              paymentNumber: paymentSettings.paymentNumber
            }
          })
        ]
      });
      return idempotentJson3(context, result);
    } catch (error) {
      return workflowConflict(error);
    }
  }
);
workflowRoutes.post("/membership/applications/:id/payment", csrfMiddleware(), async (context) => {
  const { user } = requireAuth(context);
  const input = await parseJson(context, paymentSubmissionSchema);
  const applicationId = routeId(context);
  const operation = "membership.payment.submit";
  const idempotencyKey = requireIdempotencyKey(context);
  const requestData = { applicationId, ...input };
  const replay = await getIdempotentReplay({ db: context.env.DB, operation, actorKey: user.id, idempotencyKey, requestData });
  if (replay) return idempotentJson3(context, replay);
  const request = await context.env.DB.prepare(
    `SELECT mpr.id AS request_id, mpr.application_id, ma.user_id, ma.status,
            mpr.expected_amount_minor, mpr.currency, mpr.payment_methods_json,
            mpr.payment_number, mpr.payment_instructions
     FROM membership_payment_requests mpr
     JOIN membership_applications ma ON ma.id = mpr.application_id
     WHERE mpr.application_id = ?`
  ).bind(applicationId).first();
  if (!request || request.user_id !== user.id) {
    throw new AppError({ code: "PAYMENT_REQUEST_NOT_FOUND", message: "Payment request not found.", status: 404 });
  }
  if (!["SUBMITTED", "UNDER_REVIEW", "PAYMENT_PENDING"].includes(request.status)) {
    throw new AppError({ code: "PAYMENT_NOT_ACCEPTED", message: "The application is not accepting payment evidence.", status: 409 });
  }
  let paymentMethodsJson;
  try {
    paymentMethodsJson = JSON.parse(request.payment_methods_json);
  } catch {
    throw new AppError({
      code: "PAYMENT_REQUEST_CONFIGURATION_INVALID",
      message: "This payment request requires administrator attention.",
      status: 503
    });
  }
  const allowedMethods = membershipPaymentMethodSchema.array().min(1).max(2).safeParse(paymentMethodsJson);
  if (!allowedMethods.success) {
    throw new AppError({
      code: "PAYMENT_REQUEST_CONFIGURATION_INVALID",
      message: "This payment request requires administrator attention.",
      status: 503
    });
  }
  if (!allowedMethods.data.includes(input.paymentMethod)) {
    throw new AppError({
      code: "PAYMENT_METHOD_NOT_AVAILABLE",
      message: "Use one of the payment methods included in the official payment request.",
      status: 409
    });
  }
  const paymentId = crypto.randomUUID();
  const now = (/* @__PURE__ */ new Date()).toISOString();
  const nextApplicationStatus = request.status === "PAYMENT_PENDING" ? "PAYMENT_VERIFICATION" : request.status;
  const statements = [
    context.env.DB.prepare(
      `INSERT INTO membership_payments
        (id, application_id, payment_request_id, expected_amount_minor, currency, payment_method,
         payer_phone, transaction_reference, submitted_by)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`
    ).bind(
      paymentId,
      applicationId,
      request.request_id,
      request.expected_amount_minor,
      request.currency,
      input.paymentMethod,
      input.payerPhone,
      input.transactionReference,
      user.id
    )
  ];
  if (request.status === "PAYMENT_PENDING") {
    statements.push(
      context.env.DB.prepare(
        "UPDATE membership_applications SET status = 'PAYMENT_VERIFICATION', updated_at = ? WHERE id = ? AND status = 'PAYMENT_PENDING'"
      ).bind(now, applicationId)
    );
  }
  statements.push(
    createAuditStatement(context.env.DB, {
      requestId: context.get("requestId"),
      actorId: user.id,
      action: "MEMBERSHIP_PAYMENT_SUBMITTED",
      entityType: "MEMBERSHIP_PAYMENT",
      entityId: paymentId,
      reason: "Applicant submitted payment evidence for independent finance verification.",
      metadata: { applicationId, paymentMethod: input.paymentMethod }
    })
  );
  try {
    const result = await executeIdempotentCommand({
      db: context.env.DB,
      operation,
      actorKey: user.id,
      idempotencyKey,
      requestData,
      responseData: { applicationId, paymentId, status: nextApplicationStatus },
      responseStatus: 201,
      statements
    });
    return idempotentJson3(context, result);
  } catch (error) {
    return workflowConflict(error);
  }
});
workflowRoutes.get("/admin/membership/payments", requirePermission("finance.read"), async (context) => {
  const parsed = paymentStatusSchema.safeParse(context.req.query("status")?.trim() || "SUBMITTED");
  if (!parsed.success) throw new AppError({ code: "INVALID_STATUS", message: "The payment status filter is invalid.", status: 422 });
  const { results } = await context.env.DB.prepare(
    `SELECT mp.id AS paymentId, mp.application_id AS applicationId, ma.full_name AS applicantName,
            ma.email_snapshot AS applicantEmail, mp.expected_amount_minor AS expectedAmountMinor,
            mp.currency, mp.payment_method AS paymentMethod, mp.payer_phone AS payerPhone,
            mp.transaction_reference AS transactionReference,
            mp.status, mp.submitted_at AS submittedAt, mp.verified_at AS verifiedAt,
            mp.verification_reason AS verificationReason
     FROM membership_payments mp
     JOIN membership_applications ma ON ma.id = mp.application_id
     WHERE mp.status = ? ORDER BY mp.submitted_at ASC LIMIT 100`
  ).bind(parsed.data).all();
  return context.json(success(results, context.get("requestId")));
});
async function decidePayment(context, decision) {
  const { user } = requireAuth(context);
  const input = await parseJson(context, workflowReasonSchema);
  const paymentId = routeId(context);
  const operation = `membership.payment.${decision.toLowerCase()}`;
  const idempotencyKey = requireIdempotencyKey(context);
  const requestData = { paymentId, ...input };
  const replay = await getIdempotentReplay({ db: context.env.DB, operation, actorKey: user.id, idempotencyKey, requestData });
  if (replay) return idempotentJson3(context, replay);
  const payment = await context.env.DB.prepare(
    "SELECT id, application_id, submitted_by, status FROM membership_payments WHERE id = ?"
  ).bind(paymentId).first();
  if (!payment) throw new AppError({ code: "PAYMENT_NOT_FOUND", message: "Payment not found.", status: 404 });
  rejectSelfDecision(user.id, payment.submitted_by);
  if (payment.status !== "SUBMITTED" || !payment.application_id) {
    throw new AppError({ code: "PAYMENT_NOT_VERIFIABLE", message: "Only a submitted application payment can be decided.", status: 409 });
  }
  const now = (/* @__PURE__ */ new Date()).toISOString();
  const statements = [
    context.env.DB.prepare(
      `INSERT INTO payment_verification_decisions (payment_id, decision, decided_by, reason)
       VALUES (?, ?, ?, ?)`
    ).bind(paymentId, decision, user.id, input.reason),
    context.env.DB.prepare(
      `UPDATE membership_payments
       SET status = ?, verified_by = ?, verified_at = ?, verification_reason = ?
       WHERE id = ? AND status = 'SUBMITTED'`
    ).bind(decision, user.id, now, input.reason, paymentId)
  ];
  if (decision === "REJECTED") {
    statements.push(
      context.env.DB.prepare(
        `UPDATE membership_applications SET status = 'PAYMENT_PENDING', updated_at = ?
         WHERE id = ? AND status = 'PAYMENT_VERIFICATION'`
      ).bind(now, payment.application_id)
    );
  }
  statements.push(createAuditStatement(context.env.DB, {
    requestId: context.get("requestId"),
    actorId: user.id,
    action: decision === "VERIFIED" ? "MEMBERSHIP_PAYMENT_VERIFIED" : "MEMBERSHIP_PAYMENT_REJECTED",
    entityType: "MEMBERSHIP_PAYMENT",
    entityId: paymentId,
    reason: input.reason,
    metadata: { applicationId: payment.application_id, decision }
  }));
  try {
    const result = await executeIdempotentCommand({
      db: context.env.DB,
      operation,
      actorKey: user.id,
      idempotencyKey,
      requestData,
      responseData: { paymentId, applicationId: payment.application_id, status: decision },
      responseStatus: 200,
      statements
    });
    return idempotentJson3(context, result);
  } catch (error) {
    return workflowConflict(error);
  }
}
__name(decidePayment, "decidePayment");
workflowRoutes.post(
  "/admin/membership/payments/:id/verify",
  requirePermission("finance.verify"),
  csrfMiddleware(),
  (context) => decidePayment(context, "VERIFIED")
);
workflowRoutes.post(
  "/admin/membership/payments/:id/reject",
  requirePermission("finance.verify"),
  csrfMiddleware(),
  (context) => decidePayment(context, "REJECTED")
);
async function rejectApplication(context, domain) {
  const { user } = requireAuth(context);
  const input = await parseJson(context, workflowReasonSchema);
  const applicationId = routeId(context);
  const operation = `${domain}.application.reject`;
  const idempotencyKey = requireIdempotencyKey(context);
  const requestData = { applicationId, ...input };
  const replay = await getIdempotentReplay({ db: context.env.DB, operation, actorKey: user.id, idempotencyKey, requestData });
  if (replay) return idempotentJson3(context, replay);
  const application = domain === "membership" ? await membershipApplication(context.env.DB, applicationId) : await volunteerApplication(context.env.DB, applicationId);
  rejectSelfDecision(user.id, application.user_id);
  const eligible = domain === "membership" ? ["UNDER_REVIEW", "PAYMENT_PENDING", "PAYMENT_VERIFICATION"] : ["UNDER_REVIEW"];
  if (!eligible.includes(application.status)) {
    throw new AppError({ code: "APPLICATION_NOT_DECIDABLE", message: "The application is not eligible for rejection.", status: 409 });
  }
  const decisions = domain === "membership" ? "membership_application_decisions" : "volunteer_application_decisions";
  const applications = domain === "membership" ? "membership_applications" : "volunteer_applications";
  const action = domain === "membership" ? "MEMBERSHIP_APPLICATION_REJECTED" : "VOLUNTEER_APPLICATION_REJECTED";
  const entityType = domain === "membership" ? "MEMBERSHIP_APPLICATION" : "VOLUNTEER_APPLICATION";
  const now = (/* @__PURE__ */ new Date()).toISOString();
  try {
    const result = await executeIdempotentCommand({
      db: context.env.DB,
      operation,
      actorKey: user.id,
      idempotencyKey,
      requestData,
      responseData: { applicationId, status: "REJECTED" },
      responseStatus: 200,
      statements: [
        context.env.DB.prepare(
          `INSERT INTO ${decisions} (application_id, decision, decided_by, reason) VALUES (?, 'REJECTED', ?, ?)`
        ).bind(applicationId, user.id, input.reason),
        context.env.DB.prepare(
          `UPDATE ${applications}
           SET status = 'REJECTED', reviewed_by = ?, decision_at = ?, decision_reason = ?, updated_at = ?
           WHERE id = ?`
        ).bind(user.id, now, input.reason, now, applicationId),
        createAuditStatement(context.env.DB, {
          requestId: context.get("requestId"),
          actorId: user.id,
          action,
          entityType,
          entityId: applicationId,
          reason: input.reason,
          metadata: { previousStatus: application.status, decision: "REJECTED" }
        })
      ]
    });
    return idempotentJson3(context, result);
  } catch (error) {
    return workflowConflict(error);
  }
}
__name(rejectApplication, "rejectApplication");
workflowRoutes.post(
  "/admin/membership/applications/:id/reject",
  requirePermission("membership.reject"),
  csrfMiddleware(),
  (context) => rejectApplication(context, "membership")
);
workflowRoutes.post(
  "/admin/volunteers/applications/:id/reject",
  requirePermission("volunteer.reject"),
  csrfMiddleware(),
  (context) => rejectApplication(context, "volunteer")
);
workflowRoutes.post(
  "/admin/membership/applications/:id/approve",
  requirePermission("membership.approve"),
  csrfMiddleware(),
  async (context) => {
    const { user } = requireAuth(context);
    const input = await parseJson(context, workflowReasonSchema);
    const applicationId = routeId(context);
    const operation = "membership.application.approve";
    const idempotencyKey = requireIdempotencyKey(context);
    const requestData = { applicationId, ...input };
    const replay = await getIdempotentReplay({ db: context.env.DB, operation, actorKey: user.id, idempotencyKey, requestData });
    if (replay) return idempotentJson3(context, replay);
    const application = await membershipApplication(context.env.DB, applicationId);
    rejectSelfDecision(user.id, application.user_id);
    const eligibleStatuses = application.payment_required === 0 ? ["UNDER_REVIEW"] : ["UNDER_REVIEW", "PAYMENT_VERIFICATION"];
    if (!eligibleStatuses.includes(application.status)) {
      throw new AppError({ code: "APPLICATION_NOT_APPROVABLE", message: "The application has not completed its required review and payment checks.", status: 409 });
    }
    const membershipId = crypto.randomUUID();
    const now = (/* @__PURE__ */ new Date()).toISOString();
    try {
      const result = await executeIdempotentCommand({
        db: context.env.DB,
        operation,
        actorKey: user.id,
        idempotencyKey,
        requestData,
        responseData: { applicationId, membershipId, status: "APPROVED" },
        responseStatus: 201,
        statements: [
          context.env.DB.prepare(
            `INSERT INTO membership_application_decisions (application_id, decision, decided_by, reason)
             VALUES (?, 'APPROVED', ?, ?)`
          ).bind(applicationId, user.id, input.reason),
          context.env.DB.prepare(
            `INSERT INTO membership_sequence_counters (batch, next_value)
             VALUES (?, 1) ON CONFLICT(batch) DO NOTHING`
          ).bind(application.batch),
          context.env.DB.prepare(
            `INSERT INTO memberships
              (id, application_id, user_id, membership_type_id, membership_number, batch,
               issue_date, start_date, end_date, status)
             SELECT ?, ma.id, ma.user_id, ma.membership_type_id,
                    'RUET-IOT-' || ma.batch || '-' || printf('%03d', msc.next_value), ma.batch,
                    date('now'), date('now'), date('now', '+' || mt.term_months || ' months'), 'ACTIVE'
             FROM membership_applications ma
             JOIN membership_types mt ON mt.id = ma.membership_type_id
             JOIN membership_sequence_counters msc ON msc.batch = ma.batch
             WHERE ma.id = ?`
          ).bind(membershipId, applicationId),
          context.env.DB.prepare(
            `UPDATE membership_sequence_counters SET next_value = next_value + 1,
              updated_at = strftime('%Y-%m-%dT%H:%M:%fZ', 'now') WHERE batch = ?`
          ).bind(application.batch),
          context.env.DB.prepare(
            `UPDATE membership_applications
             SET status = 'APPROVED', reviewed_by = ?, decision_at = ?, decision_reason = ?, updated_at = ?
             WHERE id = ?`
          ).bind(user.id, now, input.reason, now, applicationId),
          createAuditStatement(context.env.DB, {
            requestId: context.get("requestId"),
            actorId: user.id,
            action: "MEMBERSHIP_APPLICATION_APPROVED",
            entityType: "MEMBERSHIP_APPLICATION",
            entityId: applicationId,
            reason: input.reason,
            metadata: { previousStatus: application.status, membershipId }
          }),
          identityAuditStatement({
            db: context.env.DB,
            requestId: context.get("requestId"),
            actorId: user.id,
            domain: "membership",
            recordId: membershipId,
            applicationId
          })
        ]
      });
      return idempotentJson3(context, result);
    } catch (error) {
      return workflowConflict(error);
    }
  }
);
workflowRoutes.post(
  "/admin/volunteers/applications/:id/approve",
  requirePermission("volunteer.approve"),
  csrfMiddleware(),
  async (context) => {
    const { user } = requireAuth(context);
    const input = await parseJson(context, workflowReasonSchema);
    const applicationId = routeId(context);
    const operation = "volunteer.application.approve";
    const idempotencyKey = requireIdempotencyKey(context);
    const requestData = { applicationId, ...input };
    const replay = await getIdempotentReplay({ db: context.env.DB, operation, actorKey: user.id, idempotencyKey, requestData });
    if (replay) return idempotentJson3(context, replay);
    const application = await volunteerApplication(context.env.DB, applicationId);
    rejectSelfDecision(user.id, application.user_id);
    if (application.status !== "UNDER_REVIEW") {
      throw new AppError({ code: "APPLICATION_NOT_APPROVABLE", message: "The volunteer application must complete review first.", status: 409 });
    }
    const volunteerId = crypto.randomUUID();
    const now = (/* @__PURE__ */ new Date()).toISOString();
    const issueYear = Number((/* @__PURE__ */ new Date()).getUTCFullYear());
    try {
      const result = await executeIdempotentCommand({
        db: context.env.DB,
        operation,
        actorKey: user.id,
        idempotencyKey,
        requestData,
        responseData: { applicationId, volunteerId, status: "APPROVED" },
        responseStatus: 201,
        statements: [
          context.env.DB.prepare(
            `INSERT INTO volunteer_application_decisions (application_id, decision, decided_by, reason)
             VALUES (?, 'APPROVED', ?, ?)`
          ).bind(applicationId, user.id, input.reason),
          context.env.DB.prepare(
            `INSERT INTO volunteer_sequence_counters (issue_year, next_value)
             VALUES (?, 1) ON CONFLICT(issue_year) DO NOTHING`
          ).bind(issueYear),
          context.env.DB.prepare(
            `INSERT INTO volunteers
              (id, application_id, user_id, volunteer_program_id, volunteer_number, issue_year,
               issue_date, start_date, end_date, status)
             SELECT ?, va.id, va.user_id, va.volunteer_program_id,
                    'RUET-IOT-CV-' || substr(CAST(vsc.issue_year AS TEXT), 3, 2) || '-' || printf('%03d', vsc.next_value),
                    vsc.issue_year, date('now'), date('now'), date('now', '+' || vp.term_months || ' months'), 'ACTIVE'
             FROM volunteer_applications va
             JOIN volunteer_programs vp ON vp.id = va.volunteer_program_id
             JOIN volunteer_sequence_counters vsc ON vsc.issue_year = ?
             WHERE va.id = ?`
          ).bind(volunteerId, issueYear, applicationId),
          context.env.DB.prepare(
            `UPDATE volunteer_sequence_counters SET next_value = next_value + 1,
              updated_at = strftime('%Y-%m-%dT%H:%M:%fZ', 'now') WHERE issue_year = ?`
          ).bind(issueYear),
          context.env.DB.prepare(
            `UPDATE volunteer_applications
             SET status = 'APPROVED', reviewed_by = ?, decision_at = ?, decision_reason = ?, updated_at = ?
             WHERE id = ?`
          ).bind(user.id, now, input.reason, now, applicationId),
          createAuditStatement(context.env.DB, {
            requestId: context.get("requestId"),
            actorId: user.id,
            action: "VOLUNTEER_APPLICATION_APPROVED",
            entityType: "VOLUNTEER_APPLICATION",
            entityId: applicationId,
            reason: input.reason,
            metadata: { previousStatus: application.status, volunteerId }
          }),
          identityAuditStatement({
            db: context.env.DB,
            requestId: context.get("requestId"),
            actorId: user.id,
            domain: "volunteer",
            recordId: volunteerId,
            applicationId
          })
        ]
      });
      return idempotentJson3(context, result);
    } catch (error) {
      return workflowConflict(error);
    }
  }
);

// worker/lib/image-metadata.ts
var at = /* @__PURE__ */ __name((bytes, offset) => bytes[offset] ?? 0, "at");
var u16be = /* @__PURE__ */ __name((bytes, offset) => at(bytes, offset) << 8 | at(bytes, offset + 1), "u16be");
var u24le = /* @__PURE__ */ __name((bytes, offset) => at(bytes, offset) | at(bytes, offset + 1) << 8 | at(bytes, offset + 2) << 16, "u24le");
var u32be = /* @__PURE__ */ __name((bytes, offset) => (at(bytes, offset) << 24 | at(bytes, offset + 1) << 16 | at(bytes, offset + 2) << 8 | at(bytes, offset + 3)) >>> 0, "u32be");
function imageDimensions(bytes, contentType) {
  if (contentType === "image/png" && bytes.length >= 24) {
    const width = u32be(bytes, 16), height = u32be(bytes, 20);
    return width > 0 && height > 0 ? { width, height } : null;
  }
  if (contentType === "image/jpeg") {
    let offset = 2;
    while (offset + 8 < bytes.length) {
      if (bytes[offset] !== 255) {
        offset += 1;
        continue;
      }
      const marker = at(bytes, offset + 1);
      if ([192, 193, 194, 195, 197, 198, 199, 201, 202, 203, 205, 206, 207].includes(marker)) {
        const height = u16be(bytes, offset + 5), width = u16be(bytes, offset + 7);
        return width > 0 && height > 0 ? { width, height } : null;
      }
      const length = u16be(bytes, offset + 2);
      if (length < 2) break;
      offset += 2 + length;
    }
  }
  if (contentType === "image/webp" && bytes.length >= 30) {
    const chunk = String.fromCharCode(...bytes.slice(12, 16));
    if (chunk === "VP8X") return { width: 1 + u24le(bytes, 24), height: 1 + u24le(bytes, 27) };
    if (chunk === "VP8 " && bytes.length >= 30) return { width: (at(bytes, 26) | at(bytes, 27) << 8) & 16383, height: (at(bytes, 28) | at(bytes, 29) << 8) & 16383 };
    if (chunk === "VP8L" && bytes.length >= 25) {
      const bits = at(bytes, 21) | at(bytes, 22) << 8 | at(bytes, 23) << 16 | at(bytes, 24) << 24;
      return { width: (bits & 16383) + 1, height: (bits >> 14 & 16383) + 1 };
    }
  }
  return null;
}
__name(imageDimensions, "imageDimensions");

// worker/routes/content.ts
var publicCollections = [
  "activities",
  "activity_photos",
  "alumni",
  "announcements",
  "blog_posts",
  "courses",
  "events",
  "hero_slides",
  "lessons",
  "opportunities",
  "partners",
  "projects",
  "research_papers",
  "team_members",
  "certificates"
];
var submissionTypes = [
  "blog_posts",
  "certificates",
  "contact_messages",
  "course_certificates",
  "course_registrations",
  "event_registrations"
];
var collectionSchema = external_exports.enum(publicCollections);
var submissionTypeSchema = external_exports.enum(submissionTypes);
var jsonRecord = external_exports.record(external_exports.string(), external_exports.unknown()).refine(
  (value) => JSON.stringify(value).length <= 32 * 1024,
  "The submitted data is too large."
);
var querySchema = external_exports.object({
  table: external_exports.string().trim().min(2).max(64),
  filters: external_exports.array(
    external_exports.object({
      field: external_exports.string().regex(/^[a-z][a-z0-9_]{0,63}$/u),
      value: external_exports.unknown(),
      operator: external_exports.enum(["eq", "gte", "in"]).default("eq")
    })
  ).max(12).default([]),
  order: external_exports.object({
    field: external_exports.string().regex(/^[a-z][a-z0-9_]{0,63}$/u),
    ascending: external_exports.boolean()
  }).optional(),
  limit: external_exports.number().int().min(1).max(200).default(100),
  single: external_exports.boolean().default(false),
  countOnly: external_exports.boolean().default(false)
});
var mutationSchema = external_exports.object({
  table: external_exports.enum(["profiles", "course_registrations"]),
  values: jsonRecord,
  filters: external_exports.array(
    external_exports.object({
      field: external_exports.string().regex(/^[a-z][a-z0-9_]{0,63}$/u),
      value: external_exports.unknown()
    })
  ).max(4).default([])
});
var contentWriteSchema = external_exports.object({
  data: jsonRecord,
  status: external_exports.enum(["DRAFT", "PUBLISHED"]).default("DRAFT"),
  sortOrder: external_exports.number().int().min(-1e5).max(1e5).default(0)
});
var heroSlideDataSchema = external_exports.object({
  title: external_exports.string().trim().min(1).max(200),
  description: external_exports.string().trim().max(5e3).optional(),
  image_key: external_exports.string().trim().min(1).max(512).regex(/^website\/[a-zA-Z0-9/._-]+$/u).optional(),
  image_url: external_exports.string().trim().min(1).max(800).optional(),
  image_alt: external_exports.string().trim().max(300).optional()
}).passthrough().superRefine((value, context) => {
  if (Boolean(value.image_key) !== Boolean(value.image_url)) {
    context.addIssue({
      code: external_exports.ZodIssueCode.custom,
      message: "The Hero image reference is incomplete.",
      path: ["image_key"]
    });
  }
});
var activityPhotoDataSchema = external_exports.object({
  title: external_exports.string().trim().min(1).max(200),
  description: external_exports.string().trim().max(5e3).optional(),
  image_key: external_exports.string().trim().min(1).max(512).regex(/^website\/[a-zA-Z0-9/._-]+$/u).optional(),
  image_url: external_exports.string().trim().min(1).max(800).optional(),
  image_alt: external_exports.string().trim().max(300).optional()
}).passthrough().superRefine((value, context) => {
  if (Boolean(value.image_key) !== Boolean(value.image_url)) {
    context.addIssue({
      code: external_exports.ZodIssueCode.custom,
      message: "The Gallery image reference is incomplete.",
      path: ["image_key"]
    });
  }
});
var managedImageTypes = /* @__PURE__ */ new Set(["image/jpeg", "image/png", "image/webp"]);
var managedDocumentTypes = /* @__PURE__ */ new Set([
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.ms-powerpoint",
  "application/vnd.openxmlformats-officedocument.presentationml.presentation",
  "text/plain",
  "text/csv",
  "application/zip",
  "video/mp4"
]);
var managedMediaTypes = /* @__PURE__ */ new Set([
  ...managedImageTypes,
  ...managedDocumentTypes
]);
function hasValidImageSignature(bytes, contentType) {
  if (contentType === "image/jpeg")
    return bytes.length >= 3 && bytes[0] === 255 && bytes[1] === 216 && bytes[2] === 255;
  if (contentType === "image/png")
    return bytes.length >= 8 && [137, 80, 78, 71, 13, 10, 26, 10].every(
      (value, index) => bytes[index] === value
    );
  if (contentType === "image/webp") {
    return bytes.length >= 12 && String.fromCharCode(...bytes.slice(0, 4)) === "RIFF" && String.fromCharCode(...bytes.slice(8, 12)) === "WEBP";
  }
  return false;
}
__name(hasValidImageSignature, "hasValidImageSignature");
function hasValidMediaSignature(bytes, contentType) {
  if (managedImageTypes.has(contentType))
    return hasValidImageSignature(bytes, contentType);
  if (contentType === "application/pdf")
    return bytes.length >= 5 && String.fromCharCode(...bytes.slice(0, 5)) === "%PDF-";
  if ([
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    "application/vnd.openxmlformats-officedocument.presentationml.presentation",
    "application/zip"
  ].includes(contentType))
    return bytes.length >= 4 && bytes[0] === 80 && bytes[1] === 75;
  if (contentType === "application/msword" || contentType === "application/vnd.ms-powerpoint")
    return bytes.length >= 8 && [208, 207, 17, 224, 161, 177, 26, 225].every(
      (value, index) => bytes[index] === value
    );
  if (contentType === "video/mp4")
    return bytes.length >= 12 && String.fromCharCode(...bytes.slice(4, 8)) === "ftyp";
  return contentType === "text/plain" || contentType === "text/csv";
}
__name(hasValidMediaSignature, "hasValidMediaSignature");
function projectRow(row) {
  const data = JSON.parse(row.data_json);
  return {
    ...data,
    id: row.id,
    status: row.status.toLowerCase(),
    sort_order: row.sort_order,
    created_at: row.created_at,
    updated_at: row.updated_at
  };
}
__name(projectRow, "projectRow");
function parseCollection(value) {
  const parsed = collectionSchema.safeParse(value);
  if (!parsed.success) {
    throw new AppError({
      code: "DATA_COLLECTION_NOT_AVAILABLE",
      message: "That data collection is unavailable.",
      status: 404
    });
  }
  return parsed.data;
}
__name(parseCollection, "parseCollection");
function requireAllowedOrigin(context) {
  const origin = context.req.header("Origin");
  const siteUrl = new URL(context.env.SITE_URL);
  const frontendUrl = new URL(context.env.FRONTEND_ORIGIN);
  const allowedOrigins = /* @__PURE__ */ new Set([siteUrl.origin, frontendUrl.origin]);
  if (siteUrl.protocol === "https:" && !siteUrl.hostname.startsWith("www.")) {
    allowedOrigins.add(`${siteUrl.protocol}//www.${siteUrl.host}`);
  }
  if (!origin || !allowedOrigins.has(origin)) {
    throw new AppError({
      code: "INVALID_ORIGIN",
      message: "The request origin is not allowed.",
      status: 403
    });
  }
}
__name(requireAllowedOrigin, "requireAllowedOrigin");
function compareValues(left, right) {
  if (left === right) return 0;
  if (left === null || left === void 0) return 1;
  if (right === null || right === void 0) return -1;
  return String(left).localeCompare(String(right), void 0, {
    numeric: true
  });
}
__name(compareValues, "compareValues");
function projectSubmission(row) {
  return {
    ...JSON.parse(row.data_json),
    id: row.id,
    submission_status: row.status.toLowerCase(),
    created_at: row.created_at,
    updated_at: row.updated_at
  };
}
__name(projectSubmission, "projectSubmission");
function applyQuery(items, input) {
  let filtered = items;
  for (const filter of input.filters) {
    filtered = filtered.filter((item) => {
      if (filter.operator === "gte")
        return compareValues(item[filter.field], filter.value) >= 0;
      if (filter.operator === "in")
        return Array.isArray(filter.value) && filter.value.includes(item[filter.field]);
      return item[filter.field] === filter.value;
    });
  }
  if (input.order) {
    const { field, ascending } = input.order;
    filtered.sort(
      (left, right) => compareValues(left[field], right[field]) * (ascending ? 1 : -1)
    );
  }
  return filtered;
}
__name(applyQuery, "applyQuery");
var contentRoutes = new Hono2();
var specialistCollectionSections = {
  research_papers: "research",
  events: "events",
  courses: "courses",
  lessons: "courses",
  team_members: "people",
  alumni: "alumni",
  partners: "partners",
  opportunities: "opportunities",
  blog_posts: "blogs",
  certificates: "certificates"
};
function requireGenericContentOwnership(collection) {
  const section = specialistCollectionSections[collection];
  if (!section) return;
  throw new AppError({
    code: "SPECIALIST_MANAGEMENT_REQUIRED",
    message: `Use the dedicated ${section.replace(/_/gu, " ")} management module for this collection.`,
    status: 409,
    details: { collection: [collection], section: [section] }
  });
}
__name(requireGenericContentOwnership, "requireGenericContentOwnership");
contentRoutes.post(
  "/data/query",
  sessionMiddleware({ required: false }),
  async (context) => {
    const input = await parseJson(context, querySchema);
    const user = context.get("authUser");
    if (input.table === "profiles") {
      if (!user)
        return context.json(
          success({ items: [], count: 0 }, context.get("requestId"))
        );
      const row = await context.env.DB.prepare(
        "SELECT data_json, updated_at FROM user_profiles WHERE user_id = ?"
      ).bind(user.id).first();
      const profile = {
        user_id: user.id,
        full_name: user.displayName,
        ...row ? JSON.parse(row.data_json) : {},
        updated_at: row?.updated_at
      };
      return context.json(
        success({ items: [profile], count: 1 }, context.get("requestId"))
      );
    }
    const ownBlogQuery = input.table === "blog_posts" && user && input.filters.some(
      (filter) => filter.field === "author_id" && filter.value === user.id
    );
    const submissionType = submissionTypeSchema.safeParse(input.table);
    if (submissionType.success && (input.table !== "blog_posts" || ownBlogQuery)) {
      const isPublicEventList = input.table === "event_registrations" && !user && input.filters.some(
        (filter) => filter.field === "approval_status" && filter.value === "approved"
      );
      const isPublicCertificateLookup = (input.table === "certificates" || input.table === "course_certificates") && !user && input.filters.some(
        (filter) => filter.field === "certificate_number" || filter.field === "id"
      );
      if (!user && !isPublicEventList && !isPublicCertificateLookup) {
        throw new AppError({
          code: "AUTHENTICATION_REQUIRED",
          message: "Please sign in to continue.",
          status: 401
        });
      }
      const result2 = await context.env.DB.prepare(
        `SELECT id, data_json, status, created_at, updated_at FROM website_submissions
       WHERE submission_type = ? AND status != 'ARCHIVED' ORDER BY created_at DESC LIMIT 200`
      ).bind(submissionType.data).all();
      let items2 = result2.results.map(projectSubmission);
      if (user && input.table !== "contact_messages") {
        const ownerField = input.table === "blog_posts" ? "author_id" : "user_id";
        items2 = items2.filter((item) => item[ownerField] === user.id);
      }
      items2 = applyQuery(items2, input);
      if (isPublicEventList) {
        items2 = items2.map((item) => ({
          id: item.id,
          event_id: item.event_id,
          name: item.name,
          approval_status: "approved"
        }));
      }
      const count2 = items2.length;
      items2 = items2.slice(0, input.limit);
      return context.json(
        success(
          { items: input.countOnly ? [] : items2, count: count2 },
          context.get("requestId")
        )
      );
    }
    if (input.table === "members" || input.table === "public_members") {
      const result2 = await context.env.DB.prepare(
        `SELECT u.id, u.display_name AS full_name, m.membership_number AS membership_id,
              m.status AS membership_status, m.start_date AS membership_started_at
       FROM memberships m JOIN users u ON u.id = m.user_id
       WHERE m.status IN ('ACTIVE', 'EXPIRING_SOON')
       ORDER BY m.start_date DESC LIMIT ?`
      ).bind(input.limit).all();
      return context.json(
        success(
          { items: result2.results, count: result2.results.length },
          context.get("requestId")
        )
      );
    }
    const collection = collectionSchema.safeParse(input.table);
    if (!collection.success) {
      throw new AppError({
        code: "DATA_COLLECTION_NOT_AVAILABLE",
        message: "That data collection is not publicly available.",
        status: 404
      });
    }
    const result = await context.env.DB.prepare(
      `SELECT id, data_json, status, sort_order, created_at, updated_at
     FROM website_content_items
     WHERE collection_key = ? AND status = 'PUBLISHED'
     ORDER BY sort_order ASC, created_at DESC LIMIT 200`
    ).bind(collection.data).all();
    let items = applyQuery(result.results.map(projectRow), input);
    const count = items.length;
    items = items.slice(0, input.limit);
    return context.json(
      success(
        { items: input.countOnly ? [] : items, count },
        context.get("requestId")
      )
    );
  }
);
contentRoutes.post(
  "/data/mutate",
  sessionMiddleware({ required: true }),
  csrfMiddleware(),
  async (context) => {
    const { user } = requireAuth(context);
    const input = await parseJson(context, mutationSchema);
    const targetUser = input.filters.find(
      (filter) => filter.field === "user_id"
    )?.value;
    if (targetUser !== void 0 && targetUser !== user.id) {
      throw new AppError({
        code: "PROFILE_SCOPE_VIOLATION",
        message: "You can only update your own profile.",
        status: 403
      });
    }
    const now = (/* @__PURE__ */ new Date()).toISOString();
    if (input.table === "course_registrations") {
      const result = await context.env.DB.prepare(
        `SELECT id, data_json, status, created_at, updated_at FROM website_submissions
       WHERE submission_type = 'course_registrations' AND submitted_by = ? AND status != 'ARCHIVED'`
      ).bind(user.id).all();
      const matches = applyQuery(result.results.map(projectSubmission), {
        table: input.table,
        filters: input.filters.map((filter) => ({
          ...filter,
          operator: "eq"
        })),
        limit: 200,
        single: false,
        countOnly: false
      });
      if (matches.length === 0) {
        throw new AppError({
          code: "REGISTRATION_NOT_FOUND",
          message: "The course registration was not found.",
          status: 404
        });
      }
      const statements = [];
      for (const match2 of matches) {
        const original = result.results.find((row) => row.id === match2.id);
        const originalData = original ? JSON.parse(original.data_json) : {};
        const next = {
          ...originalData,
          ...input.values,
          user_id: user.id
        };
        const courseId = originalData.course_id;
        const progress = next.progress;
        if (typeof courseId === "string" && progress && typeof progress === "object" && !Array.isArray(progress)) {
          const lessonRows = await context.env.DB.prepare(
            `SELECT id FROM website_content_items WHERE collection_key = 'lessons' AND status = 'PUBLISHED'
           AND json_extract(data_json, '$.course_id') = ?`
          ).bind(courseId).all();
          next.completed = lessonRows.results.length > 0 && lessonRows.results.every(
            (lesson) => progress[lesson.id] === true
          );
          if (next.completed === true && originalData.completed !== true)
            next.completion_date = now;
          if (next.completed !== true) next.completion_date = null;
        } else {
          next.completed = false;
        }
        statements.push(
          context.env.DB.prepare(
            "UPDATE website_submissions SET data_json = ?, updated_at = ? WHERE id = ? AND submitted_by = ?"
          ).bind(JSON.stringify(next), now, match2.id, user.id)
        );
      }
      await context.env.DB.batch(statements);
      return context.json(
        success(
          { updated: true, count: statements.length },
          context.get("requestId")
        )
      );
    }
    await context.env.DB.batch([
      context.env.DB.prepare(
        `INSERT INTO user_profiles (user_id, data_json, updated_at) VALUES (?, ?, ?)
       ON CONFLICT(user_id) DO UPDATE SET data_json = excluded.data_json, updated_at = excluded.updated_at`
      ).bind(user.id, JSON.stringify(input.values), now),
      createAuditStatement(context.env.DB, {
        requestId: context.get("requestId"),
        actorId: user.id,
        action: "PROFILE_UPDATED",
        entityType: "USER_PROFILE",
        entityId: user.id
      })
    ]);
    return context.json(success({ updated: true }, context.get("requestId")));
  }
);
contentRoutes.post(
  "/data/submissions/:type",
  sessionMiddleware({ required: false }),
  async (context) => {
    requireAllowedOrigin(context);
    const type = submissionTypeSchema.safeParse(context.req.param("type"));
    if (!type.success)
      throw new AppError({
        code: "SUBMISSION_TYPE_NOT_AVAILABLE",
        message: "That submission type is unavailable.",
        status: 404
      });
    const payload = await parseJson(
      context,
      external_exports.object({ rows: external_exports.array(jsonRecord).min(1).max(10) })
    );
    const user = context.get("authUser");
    if (type.data !== "contact_messages" && !user) {
      throw new AppError({
        code: "AUTHENTICATION_REQUIRED",
        message: "Please sign in to continue.",
        status: 401
      });
    }
    if (user) {
      const session = context.get("authSession");
      const token2 = context.req.header("X-CSRF-Token")?.trim();
      if (!session || !token2 || !await timingSafeEqualStrings(
        await sha2562(token2),
        session.csrfTokenHash
      )) {
        throw new AppError({
          code: "CSRF_VALIDATION_FAILED",
          message: "The request could not be validated.",
          status: 403
        });
      }
    }
    const canonicalRows = payload.rows.map((row) => {
      const id2 = crypto.randomUUID();
      const ownerField = type.data === "blog_posts" ? "author_id" : "user_id";
      const data = type.data === "contact_messages" ? { ...row } : { ...row, [ownerField]: user.id };
      if (type.data === "certificates" || type.data === "course_certificates") {
        data.issued_at = data.issued_at ?? (/* @__PURE__ */ new Date()).toISOString();
      }
      return { id: id2, data };
    });
    if (type.data === "certificates" || type.data === "course_certificates") {
      throw new AppError({
        code: "CERTIFICATE_APPROVAL_REQUIRED",
        message: "Certificates are issued only after a learner request and administrator approval.",
        status: 403
      });
    }
    if (user) {
      for (const row of canonicalRows) {
        if (type.data === "blog_posts") row.data.published = false;
        if (type.data === "course_registrations" || type.data === "event_registrations") {
          const resourceType = type.data === "course_registrations" ? "courses" : "events";
          const resourceField = type.data === "course_registrations" ? "course_id" : "event_id";
          const resourceId = row.data[resourceField];
          if (typeof resourceId !== "string") {
            throw new AppError({
              code: "INVALID_REGISTRATION",
              message: "The registration target is invalid.",
              status: 422
            });
          }
          const resource = await context.env.DB.prepare(
            `SELECT data_json FROM website_content_items
           WHERE id = ? AND collection_key = ? AND status = 'PUBLISHED'`
          ).bind(resourceId, resourceType).first("data_json");
          if (!resource) {
            throw new AppError({
              code: "REGISTRATION_TARGET_NOT_FOUND",
              message: "The registration target was not found.",
              status: 404
            });
          }
          const resourceData = JSON.parse(resource);
          const isPaid = resourceData.is_paid === true;
          const paymentMethod = row.data.payment_method;
          if (!isPaid) {
            row.data.payment_method = null;
            row.data.transaction_id = null;
            row.data.payment_status = "confirmed";
          } else if (paymentMethod === "Cash") {
            row.data.transaction_id = null;
            row.data.payment_status = "unpaid";
          } else {
            if (typeof row.data.transaction_id !== "string" || row.data.transaction_id.trim().length < 3) {
              throw new AppError({
                code: "TRANSACTION_ID_REQUIRED",
                message: "A transaction ID is required.",
                status: 422
              });
            }
            row.data.payment_status = "pending";
          }
          row.data.approval_status = "pending";
        }
      }
    }
    if (user && [
      "course_registrations",
      "event_registrations",
      "certificates",
      "course_certificates"
    ].includes(type.data)) {
      for (const row of canonicalRows) {
        const domainKey = type.data === "event_registrations" ? "event_id" : "course_id";
        const domainValue = row.data[domainKey];
        if (typeof domainValue === "string") {
          const duplicate = await context.env.DB.prepare(
            `SELECT id FROM website_submissions WHERE submission_type = ? AND submitted_by = ?
           AND json_extract(data_json, ?) = ? AND status != 'ARCHIVED' LIMIT 1`
          ).bind(type.data, user.id, `$.${domainKey}`, domainValue).first("id");
          if (duplicate) {
            throw new AppError({
              code: "ALREADY_REGISTERED",
              message: "An active record already exists.",
              status: 409
            });
          }
        }
      }
    }
    const statements = canonicalRows.map(
      (row) => context.env.DB.prepare(
        `INSERT INTO website_submissions (id, submission_type, submitted_by, data_json)
     VALUES (?, ?, ?, ?)`
      ).bind(row.id, type.data, user?.id ?? null, JSON.stringify(row.data))
    );
    await context.env.DB.batch(statements);
    return context.json(
      success(
        {
          submitted: true,
          count: statements.length,
          items: canonicalRows.map((row) => ({
            ...row.data,
            id: row.id,
            created_at: (/* @__PURE__ */ new Date()).toISOString()
          }))
        },
        context.get("requestId")
      ),
      201
    );
  }
);
contentRoutes.post(
  "/data/rpc",
  sessionMiddleware({ required: false }),
  async (context) => {
    const input = await parseJson(
      context,
      external_exports.object({
        name: external_exports.string().min(2).max(64),
        args: external_exports.record(external_exports.string(), external_exports.unknown()).default({})
      })
    );
    if (input.name === "get_approved_member_count") {
      const count = await context.env.DB.prepare(
        "SELECT COUNT(*) AS count FROM memberships WHERE status IN ('ACTIVE', 'EXPIRING_SOON')"
      ).first("count");
      return context.json(success(count ?? 0, context.get("requestId")));
    }
    if (input.name === "get_public_members") {
      const result = await context.env.DB.prepare(
        `SELECT u.id, u.display_name AS full_name, m.membership_number AS membership_id, m.status AS membership_status
       FROM memberships m JOIN users u ON u.id = m.user_id
       WHERE m.status IN ('ACTIVE', 'EXPIRING_SOON')
       ORDER BY m.start_date DESC LIMIT 100`
      ).all();
      return context.json(success(result.results, context.get("requestId")));
    }
    if (input.name === "generate_certificate_number") {
      throw new AppError({
        code: "CERTIFICATE_APPROVAL_REQUIRED",
        message: "Certificate numbers are allocated only during administrator-approved issuance.",
        status: 403
      });
    }
    if (input.name === "get_certificate_holder") {
      const userId = input.args._user_id;
      if (typeof userId !== "string")
        return context.json(success([], context.get("requestId")));
      const row = await context.env.DB.prepare(
        `SELECT u.display_name, p.data_json FROM users u
       LEFT JOIN user_profiles p ON p.user_id = u.id WHERE u.id = ? AND u.status = 'EMAIL_VERIFIED'`
      ).bind(userId).first();
      if (!row) return context.json(success([], context.get("requestId")));
      const profile = row.data_json ? JSON.parse(row.data_json) : {};
      return context.json(
        success(
          [
            {
              full_name: row.display_name,
              department: profile.department ?? null
            }
          ],
          context.get("requestId")
        )
      );
    }
    throw new AppError({
      code: "DATA_FUNCTION_NOT_AVAILABLE",
      message: "That data function is unavailable.",
      status: 404
    });
  }
);
contentRoutes.get(
  "/admin/content/:collection",
  sessionMiddleware({ required: true }),
  requireAnyPermission(["content.read", "event.read"]),
  async (context) => {
    const { user } = requireAuth(context);
    const collection = parseCollection(context.req.param("collection"));
    if (!user.permissions.includes("content.read") && !(collection === "events" && user.permissions.includes("event.read"))) {
      throw new AppError({
        code: "PERMISSION_DENIED",
        message: "You do not have permission to view this content collection.",
        status: 403
      });
    }
    if (collection === "projects")
      throw new AppError({
        code: "PROJECT_MANAGEMENT_REQUIRED",
        message: "Use the dedicated Project Management module for project records.",
        status: 409
      });
    const result = await context.env.DB.prepare(
      `SELECT id, data_json, status, sort_order, created_at, updated_at
       FROM website_content_items WHERE collection_key = ? AND status != 'ARCHIVED'
       ORDER BY sort_order ASC, created_at DESC LIMIT 200`
    ).bind(collection).all();
    return context.json(
      success(result.results.map(projectRow), context.get("requestId"))
    );
  }
);
contentRoutes.put(
  "/admin/content/:collection/:id",
  sessionMiddleware({ required: true }),
  csrfMiddleware(),
  requireAnyPermission(["content.manage", "event.manage"]),
  async (context) => {
    const { user } = requireAuth(context);
    const collection = parseCollection(context.req.param("collection"));
    if (!user.permissions.includes("content.manage") && !(collection === "events" && user.permissions.includes("event.manage"))) {
      throw new AppError({
        code: "PERMISSION_DENIED",
        message: "You do not have permission to manage this content collection.",
        status: 403
      });
    }
    if (collection === "projects")
      throw new AppError({
        code: "PROJECT_MANAGEMENT_REQUIRED",
        message: "Use the dedicated Project Management module for project records.",
        status: 409
      });
    requireGenericContentOwnership(collection);
    const id2 = external_exports.string().trim().min(1).max(100).parse(context.req.param("id"));
    const input = await parseJson(context, contentWriteSchema);
    if (input.status === "PUBLISHED" && !user.permissions.includes("content.publish")) {
      throw new AppError({
        code: "PERMISSION_DENIED",
        message: "You do not have permission to publish website content.",
        status: 403
      });
    }
    let contentData = input.data;
    if (collection === "hero_slides" || collection === "activity_photos") {
      const isGalleryPhoto = collection === "activity_photos";
      const parsed = (isGalleryPhoto ? activityPhotoDataSchema : heroSlideDataSchema).safeParse(input.data);
      if (!parsed.success) {
        throw new AppError({
          code: isGalleryPhoto ? "INVALID_GALLERY_PHOTO" : "INVALID_HERO_SLIDE",
          message: `Review the ${isGalleryPhoto ? "Gallery photo" : "Hero Slide"} title and image details, then try again.`,
          status: 422
        });
      }
      if (input.status === "PUBLISHED" && !parsed.data.image_key) {
        throw new AppError({
          code: isGalleryPhoto ? "GALLERY_IMAGE_REQUIRED" : "HERO_IMAGE_REQUIRED",
          message: `Select a valid R2 ${isGalleryPhoto ? "Gallery" : "Hero"} image before publishing.`,
          status: 422
        });
      }
      const canonical = { ...parsed.data };
      for (const key of [
        "image_key",
        "image_url",
        "image_name",
        "image_alt",
        "image_content_type",
        "image_byte_size"
      ])
        delete canonical[key];
      if (parsed.data.image_key) {
        const expectedUrl = `/api/v1/media/files/${parsed.data.image_key}`;
        if (parsed.data.image_url !== expectedUrl) {
          throw new AppError({
            code: "INVALID_MEDIA_REFERENCE",
            message: `The selected ${isGalleryPhoto ? "Gallery" : "Hero"} image reference is invalid.`,
            status: 422
          });
        }
        const media = await context.env.DB.prepare(
          `SELECT original_name AS originalName, content_type AS contentType, byte_size AS byteSize
           FROM website_media_objects WHERE object_key = ? AND archived_at IS NULL`
        ).bind(parsed.data.image_key).first();
        if (!media || !managedImageTypes.has(media.contentType) || !await context.env.STORAGE.head(parsed.data.image_key)) {
          throw new AppError({
            code: "MEDIA_NOT_FOUND",
            message: `The selected ${isGalleryPhoto ? "Gallery" : "Hero"} image is no longer available. Choose another image.`,
            status: 422
          });
        }
        canonical.image_key = parsed.data.image_key;
        canonical.image_url = expectedUrl;
        canonical.image_name = media.originalName;
        canonical.image_content_type = media.contentType;
        canonical.image_byte_size = media.byteSize;
        if (parsed.data.image_alt) canonical.image_alt = parsed.data.image_alt;
      }
      contentData = canonical;
    }
    const now = (/* @__PURE__ */ new Date()).toISOString();
    const publishedAt2 = input.status === "PUBLISHED" ? now : null;
    await context.env.DB.batch([
      context.env.DB.prepare(
        `INSERT INTO website_content_items
          (id, collection_key, data_json, status, sort_order, created_by, updated_by, published_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)
         ON CONFLICT(id) DO UPDATE SET data_json = excluded.data_json, status = excluded.status,
           sort_order = excluded.sort_order, updated_by = excluded.updated_by, updated_at = ?,
           published_at = excluded.published_at, archived_at = NULL`
      ).bind(
        id2,
        collection,
        JSON.stringify(contentData),
        input.status,
        input.sortOrder,
        user.id,
        user.id,
        publishedAt2,
        now
      ),
      createAuditStatement(context.env.DB, {
        requestId: context.get("requestId"),
        actorId: user.id,
        action: "WEBSITE_CONTENT_SAVED",
        entityType: "WEBSITE_CONTENT",
        entityId: id2,
        metadata: { collection, status: input.status }
      })
    ]);
    return context.json(
      success(
        { id: id2, collection, status: input.status },
        context.get("requestId")
      )
    );
  }
);
contentRoutes.delete(
  "/admin/content/:collection/:id",
  sessionMiddleware({ required: true }),
  csrfMiddleware(),
  requireAnyPermission(["content.manage", "event.manage"]),
  async (context) => {
    const { user } = requireAuth(context);
    const collection = parseCollection(context.req.param("collection"));
    if (!user.permissions.includes("content.manage") && !(collection === "events" && user.permissions.includes("event.manage"))) {
      throw new AppError({
        code: "PERMISSION_DENIED",
        message: "You do not have permission to manage this content collection.",
        status: 403
      });
    }
    if (collection === "projects")
      throw new AppError({
        code: "PROJECT_MANAGEMENT_REQUIRED",
        message: "Use the dedicated Project Management module for project records.",
        status: 409
      });
    requireGenericContentOwnership(collection);
    const id2 = external_exports.string().trim().min(1).max(100).parse(context.req.param("id"));
    const now = (/* @__PURE__ */ new Date()).toISOString();
    await context.env.DB.batch([
      context.env.DB.prepare(
        `UPDATE website_content_items SET status = 'ARCHIVED', archived_at = ?, updated_at = ?, updated_by = ?
         WHERE id = ? AND collection_key = ? AND status != 'ARCHIVED'`
      ).bind(now, now, user.id, id2, collection),
      createAuditStatement(context.env.DB, {
        requestId: context.get("requestId"),
        actorId: user.id,
        action: "WEBSITE_CONTENT_ARCHIVED",
        entityType: "WEBSITE_CONTENT",
        entityId: id2,
        metadata: { collection }
      })
    ]);
    return context.json(success({ archived: true }, context.get("requestId")));
  }
);
contentRoutes.post(
  "/media/upload",
  sessionMiddleware({ required: true }),
  csrfMiddleware(),
  requireAnyPermission([
    "content.manage",
    "project.manage",
    "research.manage",
    "course.manage",
    "event.manage"
  ]),
  async (context) => {
    const { user } = requireAuth(context);
    const form = await context.req.formData();
    const file = form.get("file");
    if (!(file instanceof File) || file.size < 1 || file.size > 5 * 1024 * 1024 || !managedMediaTypes.has(file.type)) {
      throw new AppError({
        code: "INVALID_MEDIA",
        message: "Upload an approved image, PDF, Office document, text/CSV, ZIP, or MP4 file up to 5 MB.",
        status: 422
      });
    }
    const buffer = await file.arrayBuffer();
    if (!hasValidMediaSignature(new Uint8Array(buffer), file.type)) {
      throw new AppError({
        code: "INVALID_MEDIA",
        message: "The uploaded file signature does not match its declared media type.",
        status: 422
      });
    }
    const dimensions = managedImageTypes.has(file.type) ? imageDimensions(new Uint8Array(buffer), file.type) : null;
    const safeName = file.name.replace(/[^a-zA-Z0-9._-]+/gu, "-").slice(-100) || "image";
    const key = `website/${(/* @__PURE__ */ new Date()).toISOString().slice(0, 10)}/${crypto.randomUUID()}-${safeName}`;
    await context.env.STORAGE.put(key, buffer, {
      httpMetadata: {
        contentType: file.type,
        cacheControl: "public, max-age=31536000, immutable"
      },
      customMetadata: { uploadedBy: user.id, originalName: file.name }
    });
    await context.env.DB.prepare(
      `INSERT INTO website_media_objects (object_key, original_name, content_type, byte_size, uploaded_by, width, height)
       VALUES (?, ?, ?, ?, ?, ?, ?)`
    ).bind(
      key,
      file.name,
      file.type,
      file.size,
      user.id,
      dimensions?.width ?? null,
      dimensions?.height ?? null
    ).run();
    return context.json(
      success(
        {
          key,
          url: `/api/v1/media/files/${key}`,
          originalName: file.name,
          contentType: file.type,
          byteSize: file.size,
          width: dimensions?.width,
          height: dimensions?.height
        },
        context.get("requestId")
      ),
      201
    );
  }
);
contentRoutes.get(
  "/admin/media",
  sessionMiddleware({ required: true }),
  requireAnyPermission([
    "content.read",
    "project.read",
    "research.read",
    "course.read",
    "event.read"
  ]),
  async (context) => {
    const search = (context.req.query("search") ?? "").trim().slice(0, 100);
    const offset = Math.max(Number(context.req.query("offset") ?? 0) || 0, 0);
    const pattern = `%${search.replace(/[%_]/g, "")}%`;
    const [items, total] = await Promise.all([
      context.env.DB.prepare(
        `SELECT m.object_key AS objectKey, m.original_name AS originalName, m.content_type AS contentType,
                m.byte_size AS byteSize, m.width, m.height, m.alt_text AS altText,
                m.created_at AS createdAt, u.display_name AS uploadedBy
         FROM website_media_objects m JOIN users u ON u.id = m.uploaded_by
         WHERE m.archived_at IS NULL AND m.original_name LIKE ?
         ORDER BY m.created_at DESC LIMIT 24 OFFSET ?`
      ).bind(pattern, offset).all(),
      context.env.DB.prepare(
        "SELECT COUNT(*) AS count FROM website_media_objects WHERE archived_at IS NULL AND original_name LIKE ?"
      ).bind(pattern).first("count")
    ]);
    return context.json(
      success(
        { items: items.results, total: total ?? 0 },
        context.get("requestId")
      )
    );
  }
);
contentRoutes.delete(
  "/admin/media/*",
  sessionMiddleware({ required: true }),
  csrfMiddleware(),
  requirePermission("content.manage"),
  async (context) => {
    const { user } = requireAuth(context);
    const key = decodeURIComponent(
      context.req.path.replace("/api/v1/admin/media/", "")
    );
    const referenced = await context.env.DB.prepare(
      `SELECT id FROM website_content_items WHERE status != 'ARCHIVED' AND data_json LIKE ?
       UNION ALL SELECT id FROM research_documents WHERE object_key = ?
       UNION ALL SELECT id FROM lesson_contents WHERE object_key = ? AND archived_at IS NULL
       LIMIT 1`
    ).bind(`%${key.replace(/[%_]/g, "")}%`, key, key).first("id");
    if (referenced)
      throw new AppError({
        code: "MEDIA_IN_USE",
        message: "This media is still referenced by published or draft content and cannot be archived.",
        status: 409
      });
    const now = (/* @__PURE__ */ new Date()).toISOString();
    const result = await context.env.DB.batch([
      context.env.DB.prepare(
        "UPDATE website_media_objects SET archived_at = ? WHERE object_key = ? AND archived_at IS NULL"
      ).bind(now, key),
      createAuditStatement(context.env.DB, {
        requestId: context.get("requestId"),
        actorId: user.id,
        action: "WEBSITE_MEDIA_ARCHIVED",
        entityType: "WEBSITE_MEDIA",
        entityId: key,
        reason: "Administrator archived an unused media object."
      })
    ]);
    if ((result[0]?.meta.changes ?? 0) !== 1)
      throw new AppError({
        code: "MEDIA_NOT_FOUND",
        message: "The media object was not found.",
        status: 404
      });
    return context.json(success({ archived: true }, context.get("requestId")));
  }
);
contentRoutes.get("/media/files/*", async (context) => {
  const key = context.req.path.replace("/api/v1/media/files/", "");
  const metadata = await context.env.DB.prepare(
    "SELECT archived_at FROM website_media_objects WHERE object_key = ?"
  ).bind(key).first();
  if (!metadata || metadata.archived_at)
    throw new AppError({
      code: "MEDIA_NOT_FOUND",
      message: "The media object was not found.",
      status: 404
    });
  const object = await context.env.STORAGE.get(key);
  if (!object)
    throw new AppError({
      code: "MEDIA_NOT_FOUND",
      message: "The media object was not found.",
      status: 404
    });
  const headers = new Headers();
  object.writeHttpMetadata(headers);
  headers.set("ETag", object.httpEtag);
  return new Response(object.body, { headers });
});

// worker/validators/submissions.ts
var boundedText = /* @__PURE__ */ __name((minimum, maximum) => external_exports.string().trim().min(minimum).max(maximum), "boundedText");
var optionalText = /* @__PURE__ */ __name((maximum) => external_exports.string().trim().max(maximum).optional().nullable(), "optionalText");
var email2 = external_exports.string().trim().email().max(254);
var stringList = external_exports.array(external_exports.string().trim().min(1).max(120)).max(30).default([]);
var submitterSchema = external_exports.object({
  name: boundedText(2, 100),
  email: email2,
  phone: optionalText(32),
  institution: optionalText(160),
  department: optionalText(160)
});
var protectedPublicFields = {
  turnstileToken: external_exports.string().trim().min(1).max(2048),
  website: external_exports.string().max(0).optional().default("")
};
var contactSubmissionSchema = external_exports.object({
  ...protectedPublicFields,
  submitter: submitterSchema.pick({ name: true, email: true }),
  subject: boundedText(3, 160),
  message: boundedText(10, 5e3)
}).strict();
var projectSubmissionSchema = external_exports.object({
  ...protectedPublicFields,
  submitter: submitterSchema,
  title: boundedText(3, 180),
  summary: boundedText(20, 1200),
  category: boundedText(2, 100),
  proposedStatus: external_exports.enum(["PLANNED", "PROTOTYPE", "ONGOING"]).default("PLANNED"),
  proposedDuration: optionalText(100),
  problemStatement: boundedText(20, 5e3),
  proposedSolution: boundedText(20, 5e3),
  objectives: boundedText(10, 5e3),
  expectedOutcomes: boundedText(10, 5e3),
  targetBeneficiaries: optionalText(2e3),
  innovation: optionalText(3e3),
  technologies: external_exports.object({
    iot: stringList,
    hardware: stringList,
    sensors: stringList,
    microcontrollers: stringList,
    software: stringList,
    aiMl: stringList,
    communications: stringList,
    cloudPlatforms: stringList
  }).default({}),
  team: external_exports.object({
    type: external_exports.enum(["INDIVIDUAL", "TEAM"]),
    leader: optionalText(100),
    members: external_exports.array(external_exports.object({ name: boundedText(2, 100), email: email2.optional(), role: optionalText(100) })).max(20).default([])
  }),
  resources: external_exports.object({
    equipment: optionalText(3e3),
    estimatedBudget: optionalText(120),
    mentorship: optionalText(1e3),
    laboratory: optionalText(1e3)
  }).default({}),
  collaboration: external_exports.object({
    wanted: external_exports.boolean(),
    requiredExpertise: optionalText(2e3),
    collaboratorCount: external_exports.number().int().min(1).max(100).optional().nullable(),
    type: optionalText(160)
  })
}).strict();
var researchSubmissionSchema = external_exports.object({
  ...protectedPublicFields,
  submitter: submitterSchema,
  title: boundedText(3, 180),
  abstract: boundedText(50, 5e3),
  researchArea: boundedText(2, 160),
  keywords: external_exports.array(boundedText(2, 80)).min(1).max(20),
  problemStatement: boundedText(20, 5e3),
  objectives: boundedText(10, 5e3),
  researchQuestions: optionalText(5e3),
  methodology: boundedText(20, 8e3),
  expectedContribution: boundedText(10, 5e3),
  expectedOutcome: boundedText(10, 5e3),
  technical: external_exports.object({
    datasets: optionalText(3e3),
    hardware: optionalText(3e3),
    software: optionalText(3e3),
    iotComponents: optionalText(3e3),
    aiMlComponents: optionalText(3e3),
    experimentalSetup: optionalText(5e3)
  }).default({}),
  team: external_exports.object({
    principalInvestigator: boundedText(2, 100),
    members: external_exports.array(external_exports.object({ name: boundedText(2, 100), affiliation: optionalText(160) })).max(30).default([]),
    supervisor: optionalText(160)
  }),
  funding: external_exports.object({
    estimatedBudget: optionalText(120),
    required: external_exports.boolean(),
    source: optionalText(200),
    resources: optionalText(3e3)
  })
}).strict();
var submissionVerificationSchema = external_exports.object({
  token: external_exports.string().trim().min(32).max(512)
}).strict();
var alumniSubmissionSchema = external_exports.object({
  ...protectedPublicFields,
  submitter: submitterSchema,
  studentId: optionalText(80),
  batch: boundedText(1, 40),
  graduationYear: external_exports.number().int().min(1964).max(2100),
  formerClubPosition: optionalText(160),
  executiveYear: optionalText(40),
  membershipYear: optionalText(40),
  linkedin: optionalText(500),
  github: optionalText(500),
  portfolio: optionalText(500),
  professional: external_exports.object({ organization: optionalText(200), designation: optionalText(160), industry: optionalText(160), country: optionalText(100), city: optionalText(100), website: optionalText(500) }),
  clubJourney: external_exports.object({ yearJoined: optionalText(40), role: optionalText(160), majorContributions: boundedText(20, 5e3), memorableActivities: optionalText(5e3) }),
  publicDisplayConsent: external_exports.literal(true)
}).strict();
var collaborationSubmissionSchema = external_exports.object({
  ...protectedPublicFields,
  submitter: submitterSchema,
  organization: boundedText(2, 200),
  organizationType: optionalText(120),
  country: optionalText(100),
  city: optionalText(100),
  organizationWebsite: optionalText(500),
  logoUrl: optionalText(500),
  collaborationType: external_exports.enum(["RESEARCH", "PROJECT", "INDUSTRY", "ACADEMIC", "WORKSHOP_TRAINING", "SPONSORSHIP", "TECHNOLOGY_PARTNERSHIP", "COMMUNITY_INITIATIVE", "MENTORSHIP", "OTHER"]),
  proposalTitle: boundedText(3, 180),
  description: boundedText(30, 8e3),
  requesterContribution: boundedText(10, 5e3),
  clubContribution: boundedText(10, 5e3),
  partnershipInterest: optionalText(2e3),
  additionalMessage: optionalText(5e3),
  timeline: boundedText(2, 500)
}).strict();
var submissionTrackingSchema = external_exports.object({
  reference: external_exports.string().trim().min(12).max(40),
  token: external_exports.string().trim().min(32).max(512)
}).strict();
var adminSubmissionQuerySchema = external_exports.object({
  type: external_exports.enum(["CONTACT", "PROJECT", "RESEARCH", "COLLABORATION", "ALUMNI"]).optional(),
  status: external_exports.enum([
    "EMAIL_VERIFICATION",
    "SUBMITTED",
    "UNDER_REVIEW",
    "NEEDS_INFORMATION",
    "REVISION_REQUESTED",
    "APPROVED",
    "REJECTED",
    "PUBLISHED",
    "ONGOING",
    "COMPLETED",
    "HIDDEN",
    "ARCHIVED"
  ]).optional(),
  search: external_exports.string().trim().max(160).default(""),
  limit: external_exports.coerce.number().int().min(1).max(100).default(50),
  offset: external_exports.coerce.number().int().min(0).max(1e4).default(0)
});
var adminSubmissionUpdateSchema = external_exports.object({
  status: external_exports.enum([
    "UNDER_REVIEW",
    "NEEDS_INFORMATION",
    "REVISION_REQUESTED",
    "APPROVED",
    "REJECTED",
    "PUBLISHED",
    "ONGOING",
    "COMPLETED",
    "HIDDEN",
    "ARCHIVED"
  ]),
  publicResponse: optionalText(5e3),
  internalNote: optionalText(5e3),
  priority: external_exports.enum(["LOW", "NORMAL", "HIGH", "URGENT"]).optional(),
  assignedReviewerId: external_exports.string().uuid().optional().nullable(),
  reason: boundedText(3, 1e3)
}).strict();

// worker/routes/submissions.ts
function allowedAdminSubmissionTypes(permissions, manage = false) {
  if (permissions.includes(manage ? "submissions.manage" : "submissions.read"))
    return ["CONTACT", "PROJECT", "RESEARCH", "COLLABORATION", "ALUMNI"];
  const allowed = [];
  const has = /* @__PURE__ */ __name((...keys2) => keys2.some((key) => permissions.includes(key)), "has");
  if (has(
    ...manage ? ["project.review", "project.manage"] : ["project.read", "project.review", "project.manage"]
  ))
    allowed.push("PROJECT");
  if (has(
    ...manage ? ["research.review", "research.approve", "research.manage"] : ["research.read", "research.review", "research.manage"]
  ))
    allowed.push("RESEARCH");
  if (has(manage ? "people.manage" : "people.read")) allowed.push("ALUMNI");
  if (has(manage ? "partner.manage" : "partner.read"))
    allowed.push("COLLABORATION");
  if (has(manage ? "content.manage" : "content.read")) allowed.push("CONTACT");
  return allowed;
}
__name(allowedAdminSubmissionTypes, "allowedAdminSubmissionTypes");
function assertSubmissionAdminAccess(context, type, manage = false) {
  const { user } = requireAuth(context);
  if (!allowedAdminSubmissionTypes(user.permissions, manage).includes(type)) {
    throw new AppError({
      code: "FORBIDDEN",
      message: "You do not have permission to access this submission type.",
      status: 403
    });
  }
}
__name(assertSubmissionAdminAccess, "assertSubmissionAdminAccess");
var transitions = {
  EMAIL_VERIFICATION: [],
  SUBMITTED: ["UNDER_REVIEW", "REJECTED", "ARCHIVED"],
  UNDER_REVIEW: [
    "NEEDS_INFORMATION",
    "REVISION_REQUESTED",
    "APPROVED",
    "REJECTED",
    "ARCHIVED"
  ],
  NEEDS_INFORMATION: ["UNDER_REVIEW", "REJECTED", "ARCHIVED"],
  REVISION_REQUESTED: ["UNDER_REVIEW", "REJECTED", "ARCHIVED"],
  APPROVED: ["PUBLISHED", "ONGOING", "COMPLETED", "HIDDEN", "ARCHIVED"],
  REJECTED: ["UNDER_REVIEW", "ARCHIVED"],
  PUBLISHED: ["ONGOING", "COMPLETED", "HIDDEN", "ARCHIVED"],
  ONGOING: ["COMPLETED", "HIDDEN", "ARCHIVED"],
  COMPLETED: ["PUBLISHED", "HIDDEN", "ARCHIVED"],
  HIDDEN: ["PUBLISHED", "ARCHIVED"],
  ARCHIVED: []
};
var attachmentMimeTypes = {
  pdf: /* @__PURE__ */ new Set(["application/pdf", "application/octet-stream"]),
  doc: /* @__PURE__ */ new Set(["application/msword", "application/octet-stream"]),
  docx: /* @__PURE__ */ new Set([
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    "application/zip",
    "application/octet-stream"
  ]),
  ppt: /* @__PURE__ */ new Set(["application/vnd.ms-powerpoint", "application/octet-stream"]),
  pptx: /* @__PURE__ */ new Set([
    "application/vnd.openxmlformats-officedocument.presentationml.presentation",
    "application/zip",
    "application/octet-stream"
  ]),
  zip: /* @__PURE__ */ new Set([
    "application/zip",
    "application/x-zip-compressed",
    "application/octet-stream"
  ]),
  jpg: /* @__PURE__ */ new Set(["image/jpeg"]),
  jpeg: /* @__PURE__ */ new Set(["image/jpeg"]),
  png: /* @__PURE__ */ new Set(["image/png"]),
  webp: /* @__PURE__ */ new Set(["image/webp"])
};
function allowedOrigin(context) {
  const origin = context.req.header("Origin");
  const site = new URL(context.env.SITE_URL);
  const frontend = new URL(context.env.FRONTEND_ORIGIN);
  const allowed = /* @__PURE__ */ new Set([site.origin, frontend.origin]);
  if (site.protocol === "https:" && !site.hostname.startsWith("www."))
    allowed.add(`${site.protocol}//www.${site.host}`);
  if (!origin || !allowed.has(origin)) {
    throw new AppError({
      code: "INVALID_ORIGIN",
      message: "The request origin is not allowed.",
      status: 403
    });
  }
}
__name(allowedOrigin, "allowedOrigin");
async function validateSessionCsrf(context) {
  const session = context.get("authSession");
  const token2 = context.req.header("X-CSRF-Token")?.trim();
  if (!session || !token2 || !await timingSafeEqualStrings(await sha2562(token2), session.csrfTokenHash)) {
    throw new AppError({
      code: "CSRF_VALIDATION_FAILED",
      message: "The request could not be validated.",
      status: 403
    });
  }
}
__name(validateSessionCsrf, "validateSessionCsrf");
function referenceCode(type) {
  const day = (/* @__PURE__ */ new Date()).toISOString().slice(0, 10).replaceAll("-", "");
  return `RUIT-${type.slice(0, 4)}-${day}-${crypto.randomUUID().slice(0, 8).toUpperCase()}`;
}
__name(referenceCode, "referenceCode");
function publicProjection(row) {
  return {
    id: row.id,
    referenceCode: row.reference_code,
    type: row.submission_type,
    title: row.title,
    summary: row.summary,
    status: row.status,
    publicResponse: row.public_response,
    emailVerifiedAt: row.email_verified_at,
    submittedAt: row.submitted_at,
    createdAt: row.created_at,
    updatedAt: row.updated_at
  };
}
__name(publicProjection, "publicProjection");
function adminProjection(row) {
  return {
    ...publicProjection(row),
    userId: row.user_id,
    submitter: {
      name: row.submitter_name,
      email: row.submitter_email,
      phone: row.submitter_phone,
      institution: row.institution,
      department: row.department
    },
    payload: JSON.parse(row.payload_json),
    priority: row.priority,
    assignedReviewerId: row.assigned_reviewer_id,
    internalNotes: row.internal_notes
  };
}
__name(adminProjection, "adminProjection");
async function submissionDetail(db, row, includeInternal) {
  const [events, attachments] = await Promise.all([
    db.prepare(
      `SELECT event_type AS eventType,from_status AS fromStatus,to_status AS toStatus,
                public_message AS publicMessage,created_at AS createdAt
         FROM submission_events WHERE submission_id=? ORDER BY created_at ASC`
    ).bind(row.id).all(),
    db.prepare(
      `SELECT id,original_name AS originalName,content_type AS contentType,
                byte_size AS byteSize,created_at AS createdAt
         FROM submission_attachments WHERE submission_id=? AND archived_at IS NULL
         ORDER BY created_at ASC`
    ).bind(row.id).all()
  ]);
  return {
    ...includeInternal ? adminProjection(row) : publicProjection(row),
    payload: includeInternal ? adminProjection(row).payload : JSON.parse(row.payload_json),
    events: events.results,
    attachments: attachments.results
  };
}
__name(submissionDetail, "submissionDetail");
function notificationStatement(db, options) {
  return db.prepare(
    `INSERT INTO user_notifications
      (id, user_id, notification_type, title, message, action_url, related_entity_type, related_entity_id)
     VALUES (?, ?, ?, ?, ?, ?, 'SUBMISSION', ?)`
  ).bind(
    crypto.randomUUID(),
    options.userId,
    options.type,
    options.title,
    options.message,
    options.actionUrl,
    options.entityId
  );
}
__name(notificationStatement, "notificationStatement");
async function adminNotificationStatements(db, submission) {
  const admins = await db.prepare(
    `SELECT DISTINCT u.id FROM users u JOIN user_roles ur ON ur.user_id = u.id JOIN roles r ON r.id = ur.role_id
     WHERE r.role_key IN ('SUPER_ADMIN', 'ADMIN') AND ur.revoked_at IS NULL
       AND (ur.expires_at IS NULL OR ur.expires_at > strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
       AND u.status = 'EMAIL_VERIFIED' AND u.deleted_at IS NULL`
  ).all();
  return admins.results.map(
    (admin) => notificationStatement(db, {
      userId: admin.id,
      type: "SUBMISSION_RECEIVED",
      title: `New ${submission.type.toLowerCase()} submission`,
      message: `${submission.referenceCode}: ${submission.title}`,
      actionUrl: `/admin?submission=${encodeURIComponent(submission.id)}`,
      entityId: submission.id
    })
  );
}
__name(adminNotificationStatements, "adminNotificationStatements");
function authorityRecipients(env, type) {
  const primary = type === "CONTACT" ? env.CONTACT_AUTHORITY_EMAIL : type === "PROJECT" ? env.PROJECT_EMAIL : type === "RESEARCH" ? env.RESEARCH_EMAIL : type === "COLLABORATION" ? env.COLLABORATION_EMAIL : env.SUPER_ADMIN_EMAIL;
  return [
    ...new Set(
      type === "CONTACT" ? [primary] : [primary, env.SUPER_ADMIN_EMAIL]
    )
  ].filter(Boolean);
}
__name(authorityRecipients, "authorityRecipients");
async function authorityEmailStatements(env, submission) {
  const payload = authoritySubmissionEmail({
    siteUrl: env.SITE_URL,
    submissionId: submission.id,
    submissionType: submission.submission_type,
    referenceCode: submission.reference_code,
    submitterName: submission.submitter_name,
    submitterEmail: submission.submitter_email,
    title: submission.title,
    summary: submission.submission_type === "CONTACT" ? String(
      JSON.parse(submission.payload_json).message ?? submission.summary
    ) : submission.summary,
    submittedAt: submission.submitted_at ?? submission.created_at
  });
  return Promise.all(
    authorityRecipients(env, submission.submission_type).map(
      async (recipient) => insertEmailStatement(
        env.DB,
        await createEmailQueueRecord({
          secret: env.SESSION_SECRET,
          userId: null,
          template: submission.submission_type === "CONTACT" ? "CONTACT_AUTHORITY" : "SUBMISSION_AUTHORITY",
          recipientEmail: recipient,
          payload
        })
      )
    )
  );
}
__name(authorityEmailStatements, "authorityEmailStatements");
function canonicalContact(input) {
  return {
    type: "CONTACT",
    submitter: input.submitter,
    title: input.subject,
    summary: input.message.slice(0, 2e3),
    payload: {
      subject: input.subject,
      message: input.message,
      source: "contact-page"
    },
    turnstileToken: input.turnstileToken
  };
}
__name(canonicalContact, "canonicalContact");
function canonicalProject(input) {
  const {
    submitter,
    turnstileToken,
    website: _website,
    title,
    summary,
    ...payload
  } = input;
  return {
    type: "PROJECT",
    submitter,
    title,
    summary,
    payload,
    turnstileToken
  };
}
__name(canonicalProject, "canonicalProject");
function canonicalResearch(input) {
  const {
    submitter,
    turnstileToken,
    website: _website,
    title,
    abstract,
    ...payload
  } = input;
  return {
    type: "RESEARCH",
    submitter,
    title,
    summary: abstract.slice(0, 2e3),
    payload: { abstract, ...payload },
    turnstileToken
  };
}
__name(canonicalResearch, "canonicalResearch");
function canonicalAlumni(input) {
  const {
    submitter,
    turnstileToken,
    website: _honeypot,
    batch,
    graduationYear,
    professional,
    clubJourney,
    ...payload
  } = input;
  return {
    type: "ALUMNI",
    submitter,
    title: `${submitter.name} \u2014 Alumni application`,
    summary: `${submitter.department ?? "RUET"}, batch ${batch}, graduation ${graduationYear}. ${clubJourney.majorContributions}`.slice(
      0,
      2e3
    ),
    payload: { batch, graduationYear, professional, clubJourney, ...payload },
    turnstileToken
  };
}
__name(canonicalAlumni, "canonicalAlumni");
function canonicalCollaboration(input) {
  const {
    submitter,
    turnstileToken,
    website: _honeypot,
    proposalTitle,
    description,
    ...payload
  } = input;
  return {
    type: "COLLABORATION",
    submitter,
    title: proposalTitle,
    summary: description.slice(0, 2e3),
    payload: { description, ...payload },
    turnstileToken
  };
}
__name(canonicalCollaboration, "canonicalCollaboration");
async function createSubmission(context, input) {
  allowedOrigin(context);
  await enforceTurnstile({
    env: context.env,
    request: context.req.raw,
    token: input.turnstileToken,
    action: "submission"
  });
  const user = context.get("authUser");
  if (user) await validateSessionCsrf(context);
  const email4 = user?.email ?? input.submitter.email;
  await enforceRateLimit({
    db: context.env.DB,
    scope: `submission:${input.type.toLowerCase()}`,
    identifier: `${clientIp(context.req.raw)}:${normalizeEmail(email4)}`,
    limit: input.type === "CONTACT" ? 5 : 3,
    windowSeconds: 3600
  });
  const id2 = crypto.randomUUID();
  const reference = referenceCode(input.type);
  const trackingToken = createOpaqueToken();
  const verificationToken = user || input.type === "CONTACT" ? null : createOpaqueToken();
  const now = (/* @__PURE__ */ new Date()).toISOString();
  const status = verificationToken ? "EMAIL_VERIFICATION" : "SUBMITTED";
  const submitterName = user?.displayName ?? input.submitter.name;
  const normalized = normalizeEmail(email4);
  const row = {
    id: id2,
    reference_code: reference,
    submission_type: input.type,
    user_id: user?.id ?? null,
    submitter_name: submitterName,
    submitter_email: email4,
    submitter_email_normalized: normalized,
    submitter_phone: input.submitter.phone ?? null,
    institution: input.submitter.institution ?? null,
    department: input.submitter.department ?? null,
    title: input.title,
    summary: input.summary,
    payload_json: JSON.stringify(input.payload),
    tracking_token_hash: await sha2562(trackingToken),
    status,
    priority: "NORMAL",
    assigned_reviewer_id: null,
    public_response: null,
    internal_notes: null,
    email_verified_at: user || input.type === "CONTACT" ? now : null,
    submitted_at: status === "SUBMITTED" ? now : null,
    created_at: now,
    updated_at: now
  };
  const receipt = await createEmailQueueRecord({
    secret: context.env.SESSION_SECRET,
    userId: user?.id ?? null,
    template: input.type === "CONTACT" ? "CONTACT_RECEIVED" : "SUBMISSION_RECEIVED",
    recipientEmail: email4,
    payload: submissionReceiptEmail({
      siteUrl: context.env.SITE_URL,
      submitterName,
      submissionType: input.type,
      referenceCode: reference,
      title: input.title,
      trackingToken,
      verificationRequired: Boolean(verificationToken)
    })
  });
  const statements = [
    context.env.DB.prepare(
      `INSERT INTO platform_submissions
        (id, reference_code, submission_type, user_id, submitter_name, submitter_email,
         submitter_email_normalized, submitter_phone, institution, department, title, summary,
         payload_json, tracking_token_hash, status, email_verified_at, submitted_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    ).bind(
      id2,
      reference,
      input.type,
      user?.id ?? null,
      submitterName,
      email4,
      normalized,
      input.submitter.phone ?? null,
      input.submitter.institution ?? null,
      input.submitter.department ?? null,
      input.title,
      input.summary,
      row.payload_json,
      row.tracking_token_hash,
      status,
      row.email_verified_at,
      row.submitted_at
    ),
    context.env.DB.prepare(
      `INSERT INTO submission_events
        (id, submission_id, actor_user_id, actor_type, event_type, to_status, public_message, request_id)
       VALUES (?, ?, ?, ?, 'SUBMISSION_CREATED', ?, ?, ?)`
    ).bind(
      crypto.randomUUID(),
      id2,
      user?.id ?? null,
      user ? "USER" : "GUEST",
      status,
      verificationToken ? "Email verification is required before review." : "Submission received for review.",
      context.get("requestId")
    ),
    insertEmailStatement(context.env.DB, receipt),
    createAuditStatement(context.env.DB, {
      requestId: context.get("requestId"),
      actorId: user?.id,
      action: "PUBLIC_SUBMISSION_CREATED",
      entityType: "SUBMISSION",
      entityId: id2,
      metadata: { type: input.type, referenceCode: reference, guest: !user }
    })
  ];
  if (verificationToken) {
    const verificationEmail2 = await createEmailQueueRecord({
      secret: context.env.SESSION_SECRET,
      userId: null,
      template: "SUBMISSION_VERIFY",
      recipientEmail: email4,
      payload: submissionVerificationEmail({
        siteUrl: context.env.SITE_URL,
        submitterName,
        submissionType: input.type,
        referenceCode: reference,
        token: verificationToken
      })
    });
    statements.push(
      context.env.DB.prepare(
        `INSERT INTO submission_verification_tokens (id, submission_id, token_hash, expires_at)
         VALUES (?, ?, ?, ?)`
      ).bind(
        crypto.randomUUID(),
        id2,
        await sha2562(verificationToken),
        new Date(Date.now() + 24 * 60 * 60 * 1e3).toISOString()
      ),
      insertEmailStatement(context.env.DB, verificationEmail2)
    );
  } else {
    statements.push(...await authorityEmailStatements(context.env, row));
    statements.push(
      ...await adminNotificationStatements(context.env.DB, {
        id: id2,
        type: input.type,
        referenceCode: reference,
        title: input.title
      })
    );
  }
  if (user) {
    statements.push(
      notificationStatement(context.env.DB, {
        userId: user.id,
        type: "SUBMISSION_RECEIVED",
        title: `${input.type.toLowerCase()} submission received`,
        message: `${reference}: ${input.title}`,
        actionUrl: `/dashboard/submissions/${encodeURIComponent(id2)}`,
        entityId: id2
      })
    );
  }
  await context.env.DB.batch(statements);
  return {
    id: id2,
    referenceCode: reference,
    status,
    trackingToken,
    verificationRequired: Boolean(verificationToken),
    message: verificationToken ? "Submission saved. Verify your email before review begins." : "Submission received successfully."
  };
}
__name(createSubmission, "createSubmission");
async function submissionAccess(context, submission) {
  const user = context.get("authUser");
  if (user?.id === submission.user_id) return "OWNER";
  if (user && !user.mustChangePassword && allowedAdminSubmissionTypes(user.permissions).includes(
    submission.submission_type
  ))
    return "ADMIN";
  const token2 = context.req.header("X-Submission-Token") ?? context.req.query("token") ?? "";
  if (token2 && await timingSafeEqualStrings(
    await sha2562(token2),
    submission.tracking_token_hash
  ))
    return "GUEST";
  throw new AppError({
    code: "SUBMISSION_ACCESS_DENIED",
    message: "The submission reference or access token is invalid.",
    status: 403
  });
}
__name(submissionAccess, "submissionAccess");
async function sha256Hex(buffer) {
  const digest = new Uint8Array(await crypto.subtle.digest("SHA-256", buffer));
  return [...digest].map((byte) => byte.toString(16).padStart(2, "0")).join("");
}
__name(sha256Hex, "sha256Hex");
function validMagic(extension, bytes) {
  const pdf = bytes.length >= 4 && bytes[0] === 37 && bytes[1] === 80 && bytes[2] === 68 && bytes[3] === 70;
  const zip = bytes.length >= 4 && bytes[0] === 80 && bytes[1] === 75 && [3, 5, 7].includes(bytes[2]);
  const ole = bytes.length >= 8 && [208, 207, 17, 224, 161, 177, 26, 225].every(
    (value, index) => bytes[index] === value
  );
  const jpg = bytes.length >= 3 && bytes[0] === 255 && bytes[1] === 216 && bytes[2] === 255;
  const png = bytes.length >= 8 && [137, 80, 78, 71, 13, 10, 26, 10].every(
    (value, index) => bytes[index] === value
  );
  const webp = bytes.length >= 12 && String.fromCharCode(...bytes.slice(0, 4)) === "RIFF" && String.fromCharCode(...bytes.slice(8, 12)) === "WEBP";
  if (extension === "pdf") return pdf;
  if (["jpg", "jpeg"].includes(extension)) return jpg;
  if (extension === "png") return png;
  if (extension === "webp") return webp;
  if (["docx", "pptx", "zip"].includes(extension)) return zip;
  return ["doc", "ppt"].includes(extension) && ole;
}
__name(validMagic, "validMagic");
var submissionRoutes = new Hono2();
submissionRoutes.post(
  "/submissions/contact",
  sessionMiddleware({ required: false }),
  async (context) => {
    const result = await createSubmission(
      context,
      canonicalContact(await parseJson(context, contactSubmissionSchema))
    );
    return context.json(success(result, context.get("requestId")), 201);
  }
);
submissionRoutes.post(
  "/submissions/projects",
  sessionMiddleware({ required: false }),
  async (context) => {
    const result = await createSubmission(
      context,
      canonicalProject(await parseJson(context, projectSubmissionSchema))
    );
    return context.json(success(result, context.get("requestId")), 201);
  }
);
submissionRoutes.post(
  "/submissions/research",
  sessionMiddleware({ required: false }),
  async (context) => {
    const result = await createSubmission(
      context,
      canonicalResearch(await parseJson(context, researchSubmissionSchema))
    );
    return context.json(success(result, context.get("requestId")), 201);
  }
);
submissionRoutes.post(
  "/submissions/alumni",
  sessionMiddleware({ required: true }),
  async (context) => {
    const { user } = requireAuth(context);
    const existing = await context.env.DB.prepare(
      `SELECT id FROM platform_submissions WHERE user_id = ? AND submission_type = 'ALUMNI'
     AND status NOT IN ('REJECTED', 'ARCHIVED') LIMIT 1`
    ).bind(user.id).first("id");
    if (existing)
      throw new AppError({
        code: "ALUMNI_APPLICATION_EXISTS",
        message: "This account already has an active alumni application.",
        status: 409
      });
    const result = await createSubmission(
      context,
      canonicalAlumni(await parseJson(context, alumniSubmissionSchema))
    );
    return context.json(success(result, context.get("requestId")), 201);
  }
);
submissionRoutes.post(
  "/submissions/collaboration",
  sessionMiddleware({ required: false }),
  async (context) => {
    const result = await createSubmission(
      context,
      canonicalCollaboration(
        await parseJson(context, collaborationSubmissionSchema)
      )
    );
    return context.json(success(result, context.get("requestId")), 201);
  }
);
submissionRoutes.post("/submissions/verify", async (context) => {
  const input = await parseJson(context, submissionVerificationSchema);
  await enforceRateLimit({
    db: context.env.DB,
    scope: "submission-verification",
    identifier: clientIp(context.req.raw),
    limit: 10,
    windowSeconds: 3600
  });
  const tokenHash = await sha2562(input.token);
  const row = await context.env.DB.prepare(
    `SELECT s.* FROM submission_verification_tokens t JOIN platform_submissions s ON s.id = t.submission_id
     WHERE t.token_hash = ? AND t.consumed_at IS NULL AND t.expires_at > ? AND s.status = 'EMAIL_VERIFICATION'`
  ).bind(tokenHash, (/* @__PURE__ */ new Date()).toISOString()).first();
  if (!row)
    throw new AppError({
      code: "INVALID_OR_EXPIRED_TOKEN",
      message: "This submission verification link is invalid or expired.",
      status: 400
    });
  const now = (/* @__PURE__ */ new Date()).toISOString();
  const updated = {
    ...row,
    status: "SUBMITTED",
    email_verified_at: now,
    submitted_at: now
  };
  const statements = [
    context.env.DB.prepare(
      `UPDATE platform_submissions SET status = 'SUBMITTED', email_verified_at = ?, submitted_at = ?,
         last_status_at = ?, updated_at = ? WHERE id = ? AND status = 'EMAIL_VERIFICATION'`
    ).bind(now, now, now, now, row.id),
    context.env.DB.prepare(
      "UPDATE submission_verification_tokens SET consumed_at = ? WHERE token_hash = ?"
    ).bind(now, tokenHash),
    context.env.DB.prepare(
      `INSERT INTO submission_events
        (id, submission_id, actor_type, event_type, from_status, to_status, public_message, request_id)
       VALUES (?, ?, 'GUEST', 'EMAIL_VERIFIED', 'EMAIL_VERIFICATION', 'SUBMITTED', 'Email verified; submission entered the review queue.', ?)`
    ).bind(crypto.randomUUID(), row.id, context.get("requestId")),
    createAuditStatement(context.env.DB, {
      requestId: context.get("requestId"),
      action: "SUBMISSION_EMAIL_VERIFIED",
      entityType: "SUBMISSION",
      entityId: row.id,
      metadata: {
        type: row.submission_type,
        referenceCode: row.reference_code
      }
    }),
    ...await authorityEmailStatements(context.env, updated),
    ...await adminNotificationStatements(context.env.DB, {
      id: row.id,
      type: row.submission_type,
      referenceCode: row.reference_code,
      title: row.title
    })
  ];
  await context.env.DB.batch(statements);
  return context.json(
    success(
      {
        verified: true,
        referenceCode: row.reference_code,
        status: "SUBMITTED"
      },
      context.get("requestId")
    )
  );
});
submissionRoutes.get("/submissions/track", async (context) => {
  const parsed = submissionTrackingSchema.safeParse({
    reference: context.req.query("reference"),
    token: context.req.query("token")
  });
  if (!parsed.success)
    throw new AppError({
      code: "INVALID_TRACKING_REQUEST",
      message: "Enter a valid reference and tracking token.",
      status: 422
    });
  await enforceRateLimit({
    db: context.env.DB,
    scope: "submission-tracking",
    identifier: `${clientIp(context.req.raw)}:${parsed.data.reference}`,
    limit: 20,
    windowSeconds: 3600
  });
  const row = await context.env.DB.prepare(
    "SELECT * FROM platform_submissions WHERE reference_code = ? AND tracking_token_hash = ?"
  ).bind(parsed.data.reference, await sha2562(parsed.data.token)).first();
  if (!row)
    throw new AppError({
      code: "SUBMISSION_NOT_FOUND",
      message: "The submission reference or tracking token is invalid.",
      status: 404
    });
  const [events, attachments] = await Promise.all([
    context.env.DB.prepare(
      `SELECT event_type AS eventType, from_status AS fromStatus, to_status AS toStatus,
              public_message AS publicMessage, created_at AS createdAt
       FROM submission_events WHERE submission_id = ? ORDER BY created_at ASC`
    ).bind(row.id).all(),
    context.env.DB.prepare(
      `SELECT id, original_name AS originalName, content_type AS contentType, byte_size AS byteSize, created_at AS createdAt
       FROM submission_attachments WHERE submission_id = ? AND archived_at IS NULL ORDER BY created_at ASC`
    ).bind(row.id).all()
  ]);
  return context.json(
    success(
      {
        ...publicProjection(row),
        events: events.results,
        attachments: attachments.results
      },
      context.get("requestId")
    )
  );
});
submissionRoutes.get(
  "/submissions/mine",
  sessionMiddleware({ required: true }),
  async (context) => {
    const { user } = requireAuth(context);
    const result = await context.env.DB.prepare(
      "SELECT * FROM platform_submissions WHERE user_id = ? AND status != 'ARCHIVED' ORDER BY updated_at DESC LIMIT 100"
    ).bind(user.id).all();
    return context.json(
      success(result.results.map(publicProjection), context.get("requestId"))
    );
  }
);
submissionRoutes.get(
  "/submissions/mine/:id",
  sessionMiddleware({ required: true }),
  async (context) => {
    requireAuth(context);
    const id2 = external_exports.string().uuid().parse(context.req.param("id"));
    const row = await context.env.DB.prepare(
      "SELECT * FROM platform_submissions WHERE id=? AND status!='ARCHIVED'"
    ).bind(id2).first();
    if (!row)
      throw new AppError({
        code: "SUBMISSION_NOT_FOUND",
        message: "The submission was not found.",
        status: 404
      });
    const access = await submissionAccess(context, row);
    if (access === "GUEST")
      throw new AppError({
        code: "SUBMISSION_ACCESS_DENIED",
        message: "This page is available only to the owner or an authorized reviewer.",
        status: 403
      });
    return context.json(
      success(
        await submissionDetail(context.env.DB, row, access === "ADMIN"),
        context.get("requestId")
      )
    );
  }
);
submissionRoutes.get("/alumni", async (context) => {
  const result = await context.env.DB.prepare(
    `SELECT id, submitter_name, submitter_email, department, payload_json, updated_at
     FROM platform_submissions
     WHERE submission_type = 'ALUMNI' AND status = 'PUBLISHED' AND archived_at IS NULL
     ORDER BY updated_at DESC LIMIT 200`
  ).all();
  return context.json(
    success(
      result.results.flatMap((row) => {
        const payload = JSON.parse(row.payload_json);
        if (payload.publicDisplayConsent !== true) return [];
        const professional = payload.professional ?? {};
        return [
          {
            id: row.id,
            name: row.submitter_name,
            department: row.department,
            batch: payload.batch ?? null,
            graduationYear: payload.graduationYear ?? null,
            formerClubPosition: payload.formerClubPosition ?? null,
            organization: professional.organization ?? null,
            designation: professional.designation ?? null,
            country: professional.country ?? null,
            linkedin: payload.linkedin ?? null,
            github: payload.github ?? null,
            portfolio: payload.portfolio ?? null,
            photoUrl: `/api/v1/alumni/${encodeURIComponent(row.id)}/photo`
          }
        ];
      }),
      context.get("requestId")
    )
  );
});
submissionRoutes.get("/alumni/:id/photo", async (context) => {
  const attachment = await context.env.DB.prepare(
    `SELECT a.object_key, a.content_type FROM submission_attachments a
     JOIN platform_submissions s ON s.id = a.submission_id
     WHERE s.id = ? AND s.submission_type = 'ALUMNI' AND s.status = 'PUBLISHED'
       AND a.extension IN ('jpg', 'jpeg', 'png', 'webp') AND a.archived_at IS NULL
     ORDER BY a.created_at ASC LIMIT 1`
  ).bind(context.req.param("id")).first();
  if (!attachment)
    throw new AppError({
      code: "ALUMNI_PHOTO_NOT_FOUND",
      message: "No public alumni photo is available.",
      status: 404
    });
  const object = await context.env.STORAGE.get(attachment.object_key);
  if (!object)
    throw new AppError({
      code: "ALUMNI_PHOTO_NOT_FOUND",
      message: "No public alumni photo is available.",
      status: 404
    });
  return new Response(object.body, {
    headers: {
      "Content-Type": attachment.content_type,
      "Cache-Control": "public, max-age=3600",
      "X-Content-Type-Options": "nosniff"
    }
  });
});
submissionRoutes.post(
  "/submissions/:id/attachments",
  sessionMiddleware({ required: false }),
  async (context) => {
    allowedOrigin(context);
    const submission = await context.env.DB.prepare(
      "SELECT * FROM platform_submissions WHERE id = ?"
    ).bind(context.req.param("id")).first();
    if (!submission)
      throw new AppError({
        code: "SUBMISSION_NOT_FOUND",
        message: "The submission was not found.",
        status: 404
      });
    const access = await submissionAccess(context, submission);
    if (context.get("authUser")) await validateSessionCsrf(context);
    if (!["PROJECT", "RESEARCH", "COLLABORATION", "ALUMNI"].includes(
      submission.submission_type
    ) || ![
      "EMAIL_VERIFICATION",
      "SUBMITTED",
      "NEEDS_INFORMATION",
      "REVISION_REQUESTED"
    ].includes(submission.status)) {
      throw new AppError({
        code: "ATTACHMENT_UPLOAD_CLOSED",
        message: "Attachments cannot be added at this stage.",
        status: 409
      });
    }
    const form = await context.req.formData();
    const file = form.get("file");
    if (!(file instanceof File) || file.size < 1 || file.size > 10 * 1024 * 1024) {
      throw new AppError({
        code: "INVALID_ATTACHMENT",
        message: "Upload a supported file up to 10 MB.",
        status: 422
      });
    }
    const extension = file.name.split(".").pop()?.toLowerCase() ?? "";
    if (!attachmentMimeTypes[extension]?.has(
      file.type || "application/octet-stream"
    )) {
      throw new AppError({
        code: "INVALID_ATTACHMENT_TYPE",
        message: "Allowed formats: PDF, DOC, DOCX, PPT, PPTX, ZIP, JPG, PNG, and WebP.",
        status: 422
      });
    }
    const buffer = await file.arrayBuffer();
    if (!validMagic(extension, new Uint8Array(buffer).slice(0, 16))) {
      throw new AppError({
        code: "INVALID_ATTACHMENT_CONTENT",
        message: "The file content does not match its extension.",
        status: 422
      });
    }
    const attachmentId = crypto.randomUUID();
    const safeName = file.name.replace(/[^a-zA-Z0-9._-]+/gu, "-").slice(-120) || `document.${extension}`;
    const key = `submissions/${submission.submission_type.toLowerCase()}/${submission.id}/${attachmentId}-${safeName}`;
    await context.env.STORAGE.put(key, buffer, {
      httpMetadata: { contentType: file.type || "application/octet-stream" },
      customMetadata: {
        submissionId: submission.id,
        uploadedBy: context.get("authUser")?.id ?? access
      }
    });
    await context.env.DB.batch([
      context.env.DB.prepare(
        `INSERT INTO submission_attachments
        (id, submission_id, object_key, original_name, extension, content_type, byte_size, sha256_hex, uploaded_by_user_id)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`
      ).bind(
        attachmentId,
        submission.id,
        key,
        file.name,
        extension,
        file.type || "application/octet-stream",
        file.size,
        await sha256Hex(buffer),
        context.get("authUser")?.id ?? null
      ),
      context.env.DB.prepare(
        `INSERT INTO submission_events
        (id, submission_id, actor_user_id, actor_type, event_type, public_message, request_id)
       VALUES (?, ?, ?, ?, 'ATTACHMENT_ADDED', ?, ?)`
      ).bind(
        crypto.randomUUID(),
        submission.id,
        context.get("authUser")?.id ?? null,
        access === "ADMIN" ? "ADMIN" : access === "OWNER" ? "USER" : "GUEST",
        `Attachment added: ${file.name}`,
        context.get("requestId")
      )
    ]);
    return context.json(
      success(
        { id: attachmentId, originalName: file.name, byteSize: file.size },
        context.get("requestId")
      ),
      201
    );
  }
);
submissionRoutes.get(
  "/submissions/:id/attachments/:attachmentId",
  sessionMiddleware({ required: false }),
  async (context) => {
    const submission = await context.env.DB.prepare(
      "SELECT * FROM platform_submissions WHERE id = ?"
    ).bind(context.req.param("id")).first();
    if (!submission)
      throw new AppError({
        code: "SUBMISSION_NOT_FOUND",
        message: "The submission was not found.",
        status: 404
      });
    await submissionAccess(context, submission);
    const attachment = await context.env.DB.prepare(
      `SELECT object_key, original_name, content_type FROM submission_attachments
     WHERE id = ? AND submission_id = ? AND archived_at IS NULL`
    ).bind(context.req.param("attachmentId"), submission.id).first();
    if (!attachment)
      throw new AppError({
        code: "ATTACHMENT_NOT_FOUND",
        message: "The attachment was not found.",
        status: 404
      });
    const object = await context.env.STORAGE.get(attachment.object_key);
    if (!object)
      throw new AppError({
        code: "ATTACHMENT_NOT_FOUND",
        message: "The attachment was not found.",
        status: 404
      });
    const headers = new Headers({
      "Content-Type": attachment.content_type,
      "Content-Disposition": `attachment; filename="${attachment.original_name.replaceAll('"', "")}"`,
      "X-Content-Type-Options": "nosniff"
    });
    return new Response(object.body, { headers });
  }
);
submissionRoutes.get(
  "/admin/submissions",
  sessionMiddleware({ required: true }),
  async (context) => {
    const { user } = requireAuth(context);
    const allowedTypes = allowedAdminSubmissionTypes(user.permissions);
    if (allowedTypes.length === 0)
      throw new AppError({
        code: "FORBIDDEN",
        message: "You do not have permission to view submissions.",
        status: 403
      });
    const parsed = adminSubmissionQuerySchema.safeParse({
      type: context.req.query("type") || void 0,
      status: context.req.query("status") || void 0,
      search: context.req.query("search") ?? "",
      limit: context.req.query("limit") ?? void 0,
      offset: context.req.query("offset") ?? void 0
    });
    if (!parsed.success)
      throw new AppError({
        code: "INVALID_QUERY",
        message: "The submission filter is invalid.",
        status: 422
      });
    const where = [];
    const bindings = [];
    if (parsed.data.type) {
      if (!allowedTypes.includes(parsed.data.type))
        throw new AppError({
          code: "FORBIDDEN",
          message: "You do not have permission to view this submission type.",
          status: 403
        });
      where.push("submission_type = ?");
      bindings.push(parsed.data.type);
    } else if (allowedTypes.length < 5) {
      where.push(
        `submission_type IN (${allowedTypes.map(() => "?").join(",")})`
      );
      bindings.push(...allowedTypes);
    }
    if (parsed.data.status) {
      where.push("status = ?");
      bindings.push(parsed.data.status);
    }
    if (parsed.data.search) {
      where.push(
        "(reference_code LIKE ? OR title LIKE ? OR submitter_email_normalized LIKE ?)"
      );
      const search = `%${parsed.data.search.toLowerCase()}%`;
      bindings.push(search, search, search);
    }
    const clause = where.length ? `WHERE ${where.join(" AND ")}` : "";
    const [result, total] = await Promise.all([
      context.env.DB.prepare(
        `SELECT * FROM platform_submissions ${clause} ORDER BY created_at DESC LIMIT ? OFFSET ?`
      ).bind(...bindings, parsed.data.limit, parsed.data.offset).all(),
      context.env.DB.prepare(
        `SELECT COUNT(*) AS count FROM platform_submissions ${clause}`
      ).bind(...bindings).first("count")
    ]);
    return context.json(
      success(
        { items: result.results.map(adminProjection), total: total ?? 0 },
        context.get("requestId")
      )
    );
  }
);
submissionRoutes.get(
  "/admin/submissions/:id",
  sessionMiddleware({ required: true }),
  async (context) => {
    const row = await context.env.DB.prepare(
      "SELECT * FROM platform_submissions WHERE id = ?"
    ).bind(context.req.param("id")).first();
    if (!row)
      throw new AppError({
        code: "SUBMISSION_NOT_FOUND",
        message: "The submission was not found.",
        status: 404
      });
    assertSubmissionAdminAccess(context, row.submission_type);
    const [events, attachments] = await Promise.all([
      context.env.DB.prepare(
        "SELECT * FROM submission_events WHERE submission_id = ? ORDER BY created_at ASC"
      ).bind(row.id).all(),
      context.env.DB.prepare(
        `SELECT id, original_name AS originalName, content_type AS contentType, byte_size AS byteSize, created_at AS createdAt
         FROM submission_attachments WHERE submission_id = ? AND archived_at IS NULL`
      ).bind(row.id).all()
    ]);
    return context.json(
      success(
        {
          ...adminProjection(row),
          events: events.results,
          attachments: attachments.results
        },
        context.get("requestId")
      )
    );
  }
);
submissionRoutes.patch(
  "/admin/submissions/:id",
  sessionMiddleware({ required: true }),
  async (context) => {
    allowedOrigin(context);
    await validateSessionCsrf(context);
    const { user } = requireAuth(context);
    const input = await parseJson(context, adminSubmissionUpdateSchema);
    const row = await context.env.DB.prepare(
      "SELECT * FROM platform_submissions WHERE id = ?"
    ).bind(context.req.param("id")).first();
    if (!row)
      throw new AppError({
        code: "SUBMISSION_NOT_FOUND",
        message: "The submission was not found.",
        status: 404
      });
    assertSubmissionAdminAccess(context, row.submission_type, true);
    if (!transitions[row.status].includes(input.status)) {
      throw new AppError({
        code: "INVALID_SUBMISSION_TRANSITION",
        message: `A ${row.status} submission cannot move to ${input.status}.`,
        status: 409
      });
    }
    if (input.assignedReviewerId) {
      const reviewer = await context.env.DB.prepare(
        "SELECT id FROM users WHERE id = ? AND status = 'EMAIL_VERIFIED' AND deleted_at IS NULL"
      ).bind(input.assignedReviewerId).first("id");
      if (!reviewer)
        throw new AppError({
          code: "REVIEWER_NOT_FOUND",
          message: "The selected reviewer is unavailable.",
          status: 422
        });
    }
    const now = (/* @__PURE__ */ new Date()).toISOString();
    const publicResponse = input.publicResponse === void 0 ? row.public_response : input.publicResponse;
    const internalNotes = input.internalNote ? [row.internal_notes, `[${now}] ${user.email}: ${input.internalNote}`].filter(Boolean).join("\n") : row.internal_notes;
    const statusEmail = await createEmailQueueRecord({
      secret: context.env.SESSION_SECRET,
      userId: row.user_id,
      template: "SUBMISSION_STATUS",
      recipientEmail: row.submitter_email,
      payload: submissionStatusEmail({
        siteUrl: context.env.SITE_URL,
        submitterName: row.submitter_name,
        submissionType: row.submission_type,
        referenceCode: row.reference_code,
        status: input.status,
        publicResponse
      })
    });
    const statements = [
      context.env.DB.prepare(
        `UPDATE platform_submissions SET status = ?, public_response = ?, internal_notes = ?, priority = ?,
           assigned_reviewer_id = ?, last_status_at = ?, updated_at = ?, archived_at = ? WHERE id = ? AND status = ?`
      ).bind(
        input.status,
        publicResponse,
        internalNotes,
        input.priority ?? row.priority,
        input.assignedReviewerId === void 0 ? row.assigned_reviewer_id : input.assignedReviewerId,
        now,
        now,
        input.status === "ARCHIVED" ? now : null,
        row.id,
        row.status
      ),
      context.env.DB.prepare(
        `INSERT INTO submission_events
          (id, submission_id, actor_user_id, actor_type, event_type, from_status, to_status,
           public_message, internal_note, request_id)
         VALUES (?, ?, ?, 'ADMIN', 'STATUS_CHANGED', ?, ?, ?, ?, ?)`
      ).bind(
        crypto.randomUUID(),
        row.id,
        user.id,
        row.status,
        input.status,
        publicResponse,
        input.internalNote ?? null,
        context.get("requestId")
      ),
      insertEmailStatement(context.env.DB, statusEmail),
      createAuditStatement(context.env.DB, {
        requestId: context.get("requestId"),
        actorId: user.id,
        action: "SUBMISSION_STATUS_CHANGED",
        entityType: "SUBMISSION",
        entityId: row.id,
        reason: input.reason,
        metadata: {
          fromStatus: row.status,
          toStatus: input.status,
          type: row.submission_type,
          priority: input.priority ?? row.priority
        }
      })
    ];
    if (row.submission_type === "RESEARCH" && input.status === "APPROVED") {
      const researcherId = row.id;
      const slug2 = `${row.title.toLowerCase().trim().replace(/[^a-z0-9]+/gu, "-").replace(/^-|-$/gu, "").slice(0, 210)}-${row.reference_code.toLowerCase()}`;
      statements.push(
        context.env.DB.prepare(
          `INSERT OR IGNORE INTO research_works
            (id,title,slug,short_description,abstract,research_status,keywords_json,workflow_status,created_by,updated_by,created_at,updated_at)
           VALUES (?,?,?,?,?,'ONGOING','[]','DRAFT',?,?,?,?)`
        ).bind(
          row.id,
          row.title,
          slug2,
          row.summary,
          row.summary,
          user.id,
          user.id,
          now,
          now
        ),
        context.env.DB.prepare(
          `INSERT OR IGNORE INTO researchers (id,user_id,name,role,institution,email,created_at,updated_at)
           VALUES (?,?,?,'Lead Researcher',?,?,?,?)`
        ).bind(
          researcherId,
          row.user_id,
          row.submitter_name,
          row.institution,
          row.submitter_email,
          now,
          now
        ),
        context.env.DB.prepare(
          "INSERT OR IGNORE INTO research_authors (research_id,researcher_id,author_order,author_role) VALUES (?,?,0,'Lead Researcher')"
        ).bind(row.id, researcherId),
        createAuditStatement(context.env.DB, {
          requestId: context.get("requestId"),
          actorId: user.id,
          action: "RESEARCH_PROPOSAL_CONVERTED",
          entityType: "RESEARCH",
          entityId: row.id,
          metadata: {
            referenceCode: row.reference_code,
            workflowStatus: "DRAFT"
          }
        })
      );
    }
    if (row.user_id) {
      statements.push(
        notificationStatement(context.env.DB, {
          userId: row.user_id,
          type: "SUBMISSION_STATUS",
          title: `Submission ${row.reference_code} updated`,
          message: `Status changed from ${row.status} to ${input.status}.`,
          actionUrl: `/dashboard/submissions/${encodeURIComponent(row.id)}`,
          entityId: row.id
        })
      );
    }
    if (input.assignedReviewerId && input.assignedReviewerId !== row.assigned_reviewer_id) {
      statements.push(
        notificationStatement(context.env.DB, {
          userId: input.assignedReviewerId,
          type: "SUBMISSION_ASSIGNED",
          title: `Application ${row.reference_code} assigned to you`,
          message: `${row.submission_type} application: ${row.title}`,
          actionUrl: "/admin?section=applications",
          entityId: row.id
        })
      );
    }
    await context.env.DB.batch(statements);
    return context.json(
      success({ id: row.id, status: input.status }, context.get("requestId"))
    );
  }
);
submissionRoutes.get(
  "/notifications",
  sessionMiddleware({ required: true }),
  async (context) => {
    const { user } = requireAuth(context);
    const result = await context.env.DB.prepare(
      `SELECT id, notification_type AS type, title, message, action_url AS actionUrl,
            read_at AS readAt, created_at AS createdAt
     FROM user_notifications WHERE user_id = ? ORDER BY created_at DESC LIMIT 50`
    ).bind(user.id).all();
    return context.json(success(result.results, context.get("requestId")));
  }
);
submissionRoutes.post(
  "/notifications/:id/read",
  sessionMiddleware({ required: true }),
  async (context) => {
    allowedOrigin(context);
    await validateSessionCsrf(context);
    const { user } = requireAuth(context);
    await context.env.DB.prepare(
      "UPDATE user_notifications SET read_at = COALESCE(read_at, ?) WHERE id = ? AND user_id = ?"
    ).bind((/* @__PURE__ */ new Date()).toISOString(), context.req.param("id"), user.id).run();
    return context.json(success({ read: true }, context.get("requestId")));
  }
);

// worker/routes/settings.ts
var googleMapsUrl = external_exports.string().url().max(1e3).refine((value) => {
  const hostname = new URL(value).hostname.toLowerCase();
  return hostname === "google.com" || hostname === "www.google.com" || hostname === "maps.google.com";
}, "Use a valid Google Maps URL.");
var publicSettingsSchema = external_exports.object({
  contact: external_exports.object({
    generalEmail: external_exports.string().trim().email().max(254),
    phone: external_exports.string().trim().min(3).max(50)
  }),
  membership: membershipPaymentSettingsSchema,
  location: external_exports.object({
    address: external_exports.string().trim().min(10).max(500),
    mapEmbedUrl: googleMapsUrl.refine((value) => {
      const parsed = new URL(value);
      return parsed.pathname.startsWith("/maps") && (parsed.searchParams.get("output") === "embed" || parsed.pathname.includes("/embed"));
    }, "Use a Google Maps embed URL."),
    mapOpenUrl: googleMapsUrl
  })
}).strict();
var keys = {
  contact: "website.contact",
  membership: "website.membership",
  location: "website.location"
};
async function verifyCsrf(context) {
  const session = context.get("authSession");
  const csrf = context.req.header("X-CSRF-Token")?.trim();
  if (!session || !csrf || !await timingSafeEqualStrings(await sha2562(csrf), session.csrfTokenHash))
    throw new AppError({
      code: "CSRF_VALIDATION_FAILED",
      message: "The request could not be validated.",
      status: 403
    });
}
__name(verifyCsrf, "verifyCsrf");
async function readSettings(db) {
  const result = await db.prepare(
    "SELECT setting_key, value_json FROM platform_settings WHERE setting_key IN (?, ?, ?)"
  ).bind(keys.contact, keys.membership, keys.location).all();
  const records = Object.fromEntries(
    result.results.map((row) => [row.setting_key, JSON.parse(row.value_json)])
  );
  return publicSettingsSchema.parse({
    contact: records[keys.contact],
    membership: records[keys.membership],
    location: records[keys.location]
  });
}
__name(readSettings, "readSettings");
var settingsRoutes = new Hono2();
settingsRoutes.get(
  "/settings/public",
  async (context) => context.json(
    success(await readSettings(context.env.DB), context.get("requestId"))
  )
);
settingsRoutes.get(
  "/admin/settings/website",
  sessionMiddleware({ required: true }),
  requirePermission("settings.read"),
  async (context) => context.json(
    success(await readSettings(context.env.DB), context.get("requestId"))
  )
);
settingsRoutes.put(
  "/admin/settings/website",
  sessionMiddleware({ required: true }),
  requirePermission("settings.manage"),
  async (context) => {
    const { user } = requireAuth(context);
    const origin = context.req.header("Origin");
    const site = new URL(context.env.SITE_URL);
    const allowedOrigins = /* @__PURE__ */ new Set([
      site.origin,
      new URL(context.env.FRONTEND_ORIGIN).origin
    ]);
    if (site.protocol === "https:" && !site.hostname.startsWith("www."))
      allowedOrigins.add(`${site.protocol}//www.${site.host}`);
    if (!origin || !allowedOrigins.has(origin))
      throw new AppError({
        code: "INVALID_ORIGIN",
        message: "The request origin is not allowed.",
        status: 403
      });
    await verifyCsrf(context);
    const input = await parseJson(context, publicSettingsSchema);
    const statements = Object.keys(keys).map(
      (name) => context.env.DB.prepare(
        "UPDATE platform_settings SET value_json = ?, updated_at = ? WHERE setting_key = ?"
      ).bind(
        JSON.stringify(input[name]),
        (/* @__PURE__ */ new Date()).toISOString(),
        keys[name]
      )
    );
    statements.push(
      createAuditStatement(context.env.DB, {
        requestId: context.get("requestId"),
        actorId: user.id,
        action: "PUBLIC_WEBSITE_SETTINGS_UPDATED",
        entityType: "PLATFORM_SETTINGS",
        reason: "Updated public contact, membership, and location settings."
      })
    );
    await context.env.DB.batch(statements);
    return context.json(success(input, context.get("requestId")));
  }
);
settingsRoutes.get(
  "/admin/email-outbox",
  sessionMiddleware({ required: true }),
  requirePermission("audit.read"),
  async (context) => {
    const status = context.req.query("status")?.toUpperCase();
    if (status && !["PENDING", "SENDING", "SENT", "FAILED"].includes(status))
      throw new AppError({
        code: "INVALID_EMAIL_STATUS",
        message: "The email status filter is invalid.",
        status: 422
      });
    const result = await context.env.DB.prepare(
      `SELECT id, template, recipient_email AS recipientEmail, status, attempts,
            next_attempt_at AS nextAttemptAt, last_error AS lastError,
            provider_message_id AS providerMessageId, sent_at AS sentAt, created_at AS createdAt
     FROM email_outbox WHERE (? IS NULL OR status = ?) ORDER BY created_at DESC LIMIT 100`
    ).bind(status ?? null, status ?? null).all();
    return context.json(success(result.results, context.get("requestId")));
  }
);
settingsRoutes.post(
  "/admin/email-outbox/:id/retry",
  sessionMiddleware({ required: true }),
  requirePermission("settings.manage"),
  async (context) => {
    const { user } = requireAuth(context);
    await verifyCsrf(context);
    const result = await context.env.DB.batch([
      context.env.DB.prepare(
        "UPDATE email_outbox SET status = 'PENDING', next_attempt_at = ?, last_error = NULL, updated_at = ? WHERE id = ? AND status = 'FAILED'"
      ).bind(
        (/* @__PURE__ */ new Date()).toISOString(),
        (/* @__PURE__ */ new Date()).toISOString(),
        context.req.param("id")
      ),
      createAuditStatement(context.env.DB, {
        requestId: context.get("requestId"),
        actorId: user.id,
        action: "EMAIL_DELIVERY_RETRY_QUEUED",
        entityType: "EMAIL_OUTBOX",
        entityId: context.req.param("id"),
        reason: "Administrator requested a delivery retry."
      })
    ]);
    if ((result[0]?.meta.changes ?? 0) !== 1)
      throw new AppError({
        code: "EMAIL_NOT_RETRYABLE",
        message: "Only failed email deliveries can be retried.",
        status: 409
      });
    return context.json(success({ queued: true }, context.get("requestId")));
  }
);

// worker/routes/projects.ts
var PROJECT_COLLECTION = "projects";
var managedImageTypes2 = /* @__PURE__ */ new Set(["image/jpeg", "image/png", "image/webp"]);
var projectStatusSchema = external_exports.enum(["PLANNED", "ONGOING", "COMPLETED"]);
var publicationStatusSchema = external_exports.enum(["DRAFT", "PUBLISHED"]);
var shortText2 = external_exports.string().trim().max(200).default("");
var textList = external_exports.array(external_exports.string().trim().min(1).max(200)).max(50).default([]);
var optionalDate = external_exports.string().trim().regex(/^\d{4}-\d{2}-\d{2}$/u).optional();
var optionalUrl2 = external_exports.string().trim().url().max(1e3).optional();
var mediaReferenceSchema = external_exports.object({
  key: external_exports.string().trim().min(1).max(512).regex(/^website\/[a-zA-Z0-9/._-]+$/u),
  url: external_exports.string().trim().min(1).max(800),
  originalName: external_exports.string().trim().min(1).max(255).optional(),
  alt: external_exports.string().trim().max(300).optional(),
  contentType: external_exports.string().trim().max(100).optional(),
  byteSize: external_exports.number().int().positive().max(5 * 1024 * 1024).optional(),
  width: external_exports.number().int().positive().max(5e4).optional(),
  height: external_exports.number().int().positive().max(5e4).optional()
}).strict();
var projectWriteSchema = external_exports.object({
  title: external_exports.string().trim().min(1).max(200),
  slug: external_exports.string().trim().max(220).optional(),
  shortDescription: external_exports.string().trim().min(1).max(500),
  description: external_exports.string().trim().max(1e4).default(""),
  projectStatus: projectStatusSchema,
  publicationStatus: publicationStatusSchema.default("DRAFT"),
  category: external_exports.string().trim().max(100).default(""),
  projectLead: shortText2,
  teamMembers: textList,
  startDate: optionalDate,
  expectedCompletionDate: optionalDate,
  actualCompletionDate: optionalDate,
  coverImage: mediaReferenceSchema.nullable().default(null),
  gallery: external_exports.array(mediaReferenceSchema).max(20).default([]),
  technologies: textList,
  tags: textList,
  objectives: textList,
  features: textList,
  outcomes: external_exports.string().trim().max(1e4).default(""),
  partners: textList,
  projectUrl: optionalUrl2,
  githubUrl: optionalUrl2,
  demoUrl: optionalUrl2,
  sortOrder: external_exports.number().int().min(-1e5).max(1e5).default(0),
  advanced: external_exports.record(external_exports.string(), external_exports.unknown()).refine((value) => JSON.stringify(value).length <= 8 * 1024, "Advanced project data is too large.").default({})
}).superRefine((value, context) => {
  if (value.actualCompletionDate && value.projectStatus !== "COMPLETED") {
    context.addIssue({ code: external_exports.ZodIssueCode.custom, path: ["actualCompletionDate"], message: "Actual completion date is only available for completed projects." });
  }
  if (value.startDate && value.expectedCompletionDate && value.expectedCompletionDate < value.startDate) {
    context.addIssue({ code: external_exports.ZodIssueCode.custom, path: ["expectedCompletionDate"], message: "Expected completion cannot be before the start date." });
  }
});
var listQuerySchema = external_exports.object({
  search: external_exports.string().trim().max(120).default(""),
  projectStatus: external_exports.union([projectStatusSchema, external_exports.literal("")]).default(""),
  publicationStatus: external_exports.union([external_exports.enum(["DRAFT", "PUBLISHED", "ARCHIVED"]), external_exports.literal("")]).default(""),
  category: external_exports.string().trim().max(100).default(""),
  lead: external_exports.string().trim().max(200).default(""),
  sort: external_exports.enum(["newest", "oldest", "updated", "alphabetical"]).default("updated")
});
function slugify(value) {
  return value.normalize("NFKD").replace(/[\u0300-\u036f]/gu, "").toLowerCase().replace(/[^a-z0-9]+/gu, "-").replace(/^-+|-+$/gu, "").slice(0, 180) || "project";
}
__name(slugify, "slugify");
async function uniqueSlug(db, requested, title, projectId) {
  const base = slugify(requested || title);
  const rows = await db.prepare(
    "SELECT id, data_json FROM website_content_items WHERE collection_key = ? AND id != ?"
  ).bind(PROJECT_COLLECTION, projectId).all();
  const existingSlugs = new Set(rows.results.map((row) => {
    const data = JSON.parse(row.data_json);
    return slugify(typeof data.slug === "string" ? data.slug : String(data.title ?? row.id));
  }));
  for (let suffix = 1; suffix <= 1e3; suffix += 1) {
    const candidate = suffix === 1 ? base : `${base}-${suffix}`;
    if (!existingSlugs.has(candidate)) return candidate;
  }
  throw new AppError({ code: "PROJECT_SLUG_UNAVAILABLE", message: "A unique project URL could not be generated. Choose a different slug.", status: 409 });
}
__name(uniqueSlug, "uniqueSlug");
function storedProject(row) {
  const data = JSON.parse(row.data_json);
  const legacyStatus = typeof data.project_status === "string" ? data.project_status : typeof data.status === "string" ? data.status : "PLANNED";
  return {
    id: row.id,
    title: String(data.title ?? "Untitled project"),
    slug: String(data.slug ?? slugify(String(data.title ?? row.id))),
    shortDescription: String(data.short_description ?? data.shortDescription ?? data.description ?? ""),
    description: String(data.description ?? ""),
    projectStatus: projectStatusSchema.catch("PLANNED").parse(String(legacyStatus).toUpperCase()),
    publicationStatus: row.status,
    category: String(data.category ?? ""),
    projectLead: String(data.project_lead ?? data.projectLead ?? ""),
    teamMembers: Array.isArray(data.team_members) ? data.team_members : [],
    startDate: data.start_date ?? null,
    expectedCompletionDate: data.expected_completion_date ?? null,
    actualCompletionDate: data.actual_completion_date ?? null,
    coverImage: data.cover_image ?? (data.image_key ? { key: data.image_key, url: data.image_url, alt: data.image_alt } : null),
    gallery: Array.isArray(data.gallery) ? data.gallery : [],
    technologies: Array.isArray(data.technologies) ? data.technologies : [],
    tags: Array.isArray(data.tags) ? data.tags : [],
    objectives: Array.isArray(data.objectives) ? data.objectives : [],
    features: Array.isArray(data.features) ? data.features : [],
    outcomes: String(data.outcomes ?? ""),
    partners: Array.isArray(data.partners) ? data.partners : [],
    projectUrl: data.project_url ?? null,
    githubUrl: data.github_url ?? data.github_link ?? null,
    demoUrl: data.demo_url ?? data.demo_link ?? null,
    sortOrder: row.sort_order,
    advanced: data.advanced && typeof data.advanced === "object" && !Array.isArray(data.advanced) ? data.advanced : {},
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    publishedAt: row.published_at,
    archivedAt: row.archived_at
  };
}
__name(storedProject, "storedProject");
async function canonicalImages(env, input) {
  const byKey = /* @__PURE__ */ new Map();
  for (const image of [...input.gallery, ...input.coverImage ? [input.coverImage] : []]) byKey.set(image.key, image);
  if (byKey.size === 0) return { cover: null, gallery: [] };
  const keys2 = [...byKey.keys()];
  const placeholders = keys2.map(() => "?").join(", ");
  const result = await env.DB.prepare(
    `SELECT object_key, original_name, content_type, byte_size FROM website_media_objects
     WHERE archived_at IS NULL AND object_key IN (${placeholders})`
  ).bind(...keys2).all();
  const rows = new Map(result.results.map((row) => [row.object_key, row]));
  const objectHeads = await Promise.all(keys2.map((key) => env.STORAGE.head(key)));
  const canonical = /* @__PURE__ */ new Map();
  keys2.forEach((key, index) => {
    const row = rows.get(key);
    const supplied = byKey.get(key);
    if (!row || !managedImageTypes2.has(row.content_type) || !objectHeads[index]) {
      throw new AppError({ code: "PROJECT_MEDIA_NOT_FOUND", message: "One of the selected project images is no longer available. Remove it or choose another image.", status: 422 });
    }
    const expectedUrl = `/api/v1/media/files/${key}`;
    if (supplied.url !== expectedUrl) {
      throw new AppError({ code: "INVALID_PROJECT_MEDIA", message: "One of the selected project image references is invalid.", status: 422 });
    }
    canonical.set(key, {
      key,
      url: expectedUrl,
      originalName: row.original_name,
      contentType: row.content_type,
      byteSize: row.byte_size,
      ...supplied.alt ? { alt: supplied.alt } : {},
      ...supplied.width ? { width: supplied.width } : {},
      ...supplied.height ? { height: supplied.height } : {}
    });
  });
  const galleryKeys = [...new Set(input.gallery.map((image) => image.key))];
  if (input.coverImage && !galleryKeys.includes(input.coverImage.key)) galleryKeys.unshift(input.coverImage.key);
  return {
    cover: input.coverImage ? canonical.get(input.coverImage.key) ?? null : null,
    gallery: galleryKeys.map((key) => canonical.get(key)).filter(Boolean)
  };
}
__name(canonicalImages, "canonicalImages");
function canonicalData(input, slug2, images) {
  return {
    ...input.advanced,
    title: input.title,
    slug: slug2,
    short_description: input.shortDescription,
    description: input.description,
    project_status: input.projectStatus,
    category: input.category,
    project_lead: input.projectLead,
    team_members: input.teamMembers,
    start_date: input.startDate ?? null,
    expected_completion_date: input.expectedCompletionDate ?? null,
    actual_completion_date: input.actualCompletionDate ?? null,
    cover_image: images.cover,
    gallery: images.gallery,
    technologies: input.technologies,
    tags: input.tags,
    objectives: input.objectives,
    features: input.features,
    outcomes: input.outcomes,
    partners: input.partners,
    project_url: input.projectUrl ?? null,
    github_url: input.githubUrl ?? null,
    demo_url: input.demoUrl ?? null,
    advanced: input.advanced
  };
}
__name(canonicalData, "canonicalData");
function allProjectRows(db) {
  return db.prepare(
    `SELECT id, data_json, status, sort_order, created_at, updated_at, published_at, archived_at
     FROM website_content_items WHERE collection_key = ?`
  ).bind(PROJECT_COLLECTION).all();
}
__name(allProjectRows, "allProjectRows");
var projectRoutes = new Hono2();
projectRoutes.get("/projects", async (context) => {
  const result = await context.env.DB.prepare(
    `SELECT id, data_json, status, sort_order, created_at, updated_at, published_at, archived_at
     FROM website_content_items WHERE collection_key = ? AND status = 'PUBLISHED'
     ORDER BY sort_order ASC, published_at DESC`
  ).bind(PROJECT_COLLECTION).all();
  return context.json(success({ items: result.results.map(storedProject), count: result.results.length }, context.get("requestId")));
});
projectRoutes.get("/projects/:slug", async (context) => {
  const slug2 = slugify(context.req.param("slug"));
  const result = await context.env.DB.prepare(
    `SELECT id, data_json, status, sort_order, created_at, updated_at, published_at, archived_at
     FROM website_content_items WHERE collection_key = ? AND status = 'PUBLISHED'`
  ).bind(PROJECT_COLLECTION).all();
  const project = result.results.map(storedProject).find((item) => item.slug === slug2);
  if (!project) throw new AppError({ code: "PROJECT_NOT_FOUND", message: "The project was not found.", status: 404 });
  return context.json(success(project, context.get("requestId")));
});
projectRoutes.get("/admin/projects", sessionMiddleware({ required: true }), requirePermission("project.read"), async (context) => {
  const parsed = listQuerySchema.safeParse({
    search: context.req.query("search") ?? "",
    projectStatus: context.req.query("projectStatus") ?? "",
    publicationStatus: context.req.query("publicationStatus") ?? "",
    category: context.req.query("category") ?? "",
    lead: context.req.query("lead") ?? "",
    sort: context.req.query("sort") ?? "updated"
  });
  if (!parsed.success) throw new AppError({ code: "INVALID_PROJECT_FILTER", message: "One or more project filters are invalid.", status: 422 });
  const result = await allProjectRows(context.env.DB);
  const all = result.results.map(storedProject);
  const query = parsed.data.search.toLowerCase();
  const items = all.filter((project) => {
    const searchable = [project.title, project.shortDescription, project.description, project.category, project.projectLead, ...project.tags ?? []].join(" ").toLowerCase();
    return (!query || searchable.includes(query)) && (!parsed.data.projectStatus || project.projectStatus === parsed.data.projectStatus) && (!parsed.data.publicationStatus || project.publicationStatus === parsed.data.publicationStatus) && (!parsed.data.category || project.category === parsed.data.category) && (!parsed.data.lead || project.projectLead === parsed.data.lead);
  });
  items.sort((left, right) => {
    if (parsed.data.sort === "alphabetical") return String(left.title).localeCompare(String(right.title));
    if (parsed.data.sort === "oldest") return String(left.createdAt).localeCompare(String(right.createdAt));
    if (parsed.data.sort === "newest") return String(right.createdAt).localeCompare(String(left.createdAt));
    return String(right.updatedAt).localeCompare(String(left.updatedAt));
  });
  const stats = {
    total: all.length,
    ongoing: all.filter((project) => project.projectStatus === "ONGOING").length,
    completed: all.filter((project) => project.projectStatus === "COMPLETED").length,
    planned: all.filter((project) => project.projectStatus === "PLANNED").length,
    drafts: all.filter((project) => project.publicationStatus === "DRAFT").length
  };
  const categories = [...new Set(all.map((project) => String(project.category)).filter(Boolean))].sort();
  const leads = [...new Set(all.map((project) => String(project.projectLead)).filter(Boolean))].sort();
  return context.json(success({ items, stats, facets: { categories, leads } }, context.get("requestId")));
});
projectRoutes.get("/admin/projects/options", sessionMiddleware({ required: true }), requirePermission("project.read"), async (context) => {
  const result = await context.env.DB.prepare(
    `SELECT id, collection_key, data_json FROM website_content_items
     WHERE collection_key IN ('team_members', 'partners') AND status != 'ARCHIVED'
     ORDER BY sort_order ASC, created_at DESC LIMIT 500`
  ).all();
  const values = result.results.map((row) => {
    const data = JSON.parse(row.data_json);
    return { id: row.id, type: row.collection_key, name: String(data.name ?? data.title ?? data.full_name ?? "Unnamed") };
  });
  return context.json(success({ people: values.filter((value) => value.type === "team_members"), partners: values.filter((value) => value.type === "partners") }, context.get("requestId")));
});
projectRoutes.get("/admin/projects/:id", sessionMiddleware({ required: true }), requirePermission("project.read"), async (context) => {
  const id2 = external_exports.string().trim().min(1).max(100).parse(context.req.param("id"));
  const row = await context.env.DB.prepare(
    `SELECT id, data_json, status, sort_order, created_at, updated_at, published_at, archived_at
     FROM website_content_items WHERE id = ? AND collection_key = ? LIMIT 1`
  ).bind(id2, PROJECT_COLLECTION).first();
  if (!row) throw new AppError({ code: "PROJECT_NOT_FOUND", message: "The project was not found.", status: 404 });
  return context.json(success(storedProject(row), context.get("requestId")));
});
projectRoutes.put(
  "/admin/projects/:id",
  sessionMiddleware({ required: true }),
  csrfMiddleware(),
  requirePermission("project.manage"),
  async (context) => {
    const { user } = requireAuth(context);
    const id2 = external_exports.string().trim().min(1).max(100).parse(context.req.param("id"));
    const input = await parseJson(context, projectWriteSchema);
    const existing = await context.env.DB.prepare(
      "SELECT status FROM website_content_items WHERE id = ? AND collection_key = ?"
    ).bind(id2, PROJECT_COLLECTION).first();
    if (existing?.status === "ARCHIVED") throw new AppError({ code: "PROJECT_ARCHIVED", message: "Archived projects cannot be edited.", status: 409 });
    const slug2 = await uniqueSlug(context.env.DB, input.slug, input.title, id2);
    const images = await canonicalImages(context.env, input);
    const data = canonicalData(input, slug2, images);
    const now = (/* @__PURE__ */ new Date()).toISOString();
    const created = !existing;
    const statements = [
      context.env.DB.prepare(
        `INSERT INTO website_content_items
          (id, collection_key, data_json, status, sort_order, created_by, updated_by, published_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)
         ON CONFLICT(id) DO UPDATE SET data_json = excluded.data_json, status = excluded.status,
           sort_order = excluded.sort_order, updated_by = excluded.updated_by, updated_at = ?,
           published_at = excluded.published_at, archived_at = NULL`
      ).bind(id2, PROJECT_COLLECTION, JSON.stringify(data), input.publicationStatus, input.sortOrder, user.id, user.id, input.publicationStatus === "PUBLISHED" ? now : null, now),
      createAuditStatement(context.env.DB, {
        requestId: context.get("requestId"),
        actorId: user.id,
        action: created ? "PROJECT_CREATED" : "PROJECT_UPDATED",
        entityType: "PROJECT",
        entityId: id2,
        metadata: { slug: slug2, projectStatus: input.projectStatus, publicationStatus: input.publicationStatus }
      })
    ];
    if (input.publicationStatus === "PUBLISHED" && existing?.status !== "PUBLISHED") {
      statements.push(createAuditStatement(context.env.DB, { requestId: context.get("requestId"), actorId: user.id, action: "PROJECT_PUBLISHED", entityType: "PROJECT", entityId: id2, metadata: { slug: slug2 } }));
    } else if (input.publicationStatus === "DRAFT" && existing?.status === "PUBLISHED") {
      statements.push(createAuditStatement(context.env.DB, { requestId: context.get("requestId"), actorId: user.id, action: "PROJECT_UNPUBLISHED", entityType: "PROJECT", entityId: id2, metadata: { slug: slug2 } }));
    }
    try {
      await context.env.DB.batch(statements);
    } catch (error) {
      if (error instanceof Error && /website_projects_slug_unique_idx|unique constraint/iu.test(error.message)) {
        throw new AppError({ code: "PROJECT_SLUG_CONFLICT", message: "That project URL was just assigned to another project. Save again to generate the next available slug.", status: 409 });
      }
      throw error;
    }
    return context.json(success({ id: id2, slug: slug2, created, publicationStatus: input.publicationStatus }, context.get("requestId")), created ? 201 : 200);
  }
);
projectRoutes.post(
  "/admin/projects/:id/archive",
  sessionMiddleware({ required: true }),
  csrfMiddleware(),
  requirePermission("project.manage"),
  async (context) => {
    const { user } = requireAuth(context);
    const id2 = external_exports.string().trim().min(1).max(100).parse(context.req.param("id"));
    const existing = await context.env.DB.prepare(
      "SELECT id FROM website_content_items WHERE id = ? AND collection_key = ? AND status != 'ARCHIVED' LIMIT 1"
    ).bind(id2, PROJECT_COLLECTION).first();
    if (!existing) throw new AppError({ code: "PROJECT_NOT_FOUND", message: "The project was not found or is already archived.", status: 404 });
    const now = (/* @__PURE__ */ new Date()).toISOString();
    const result = await context.env.DB.batch([
      context.env.DB.prepare(
        `UPDATE website_content_items SET status = 'ARCHIVED', archived_at = ?, published_at = NULL,
         updated_at = ?, updated_by = ? WHERE id = ? AND collection_key = ? AND status != 'ARCHIVED'`
      ).bind(now, now, user.id, id2, PROJECT_COLLECTION),
      createAuditStatement(context.env.DB, { requestId: context.get("requestId"), actorId: user.id, action: "PROJECT_ARCHIVED", entityType: "PROJECT", entityId: id2 })
    ]);
    if ((result[0]?.meta.changes ?? 0) !== 1) throw new AppError({ code: "PROJECT_UPDATE_CONFLICT", message: "The project changed while it was being archived. Please refresh and try again.", status: 409 });
    return context.json(success({ id: id2, archived: true }, context.get("requestId")));
  }
);

// worker/routes/certificates.ts
var requestSchema = external_exports.object({ courseId: external_exports.string().uuid() });
var decisionSchema = external_exports.object({ reason: external_exports.string().trim().min(3).max(1e3).optional() });
var listStatusSchema = external_exports.enum(["ALL", "REQUESTED", "UNDER_REVIEW", "APPROVED", "REJECTED", "ISSUED"]);
function safeObject(value) {
  try {
    return JSON.parse(value);
  } catch {
    return {};
  }
}
__name(safeObject, "safeObject");
function requestView(row) {
  const course = safeObject(row.course_data);
  const enrollment = safeObject(row.enrollment_data);
  const progress = enrollment.progress && typeof enrollment.progress === "object" && !Array.isArray(enrollment.progress) ? Object.values(enrollment.progress) : [];
  const completedLessons = progress.filter((item) => item === true).length;
  return {
    id: row.id,
    userId: row.user_id,
    courseId: row.course_id,
    enrollmentId: row.enrollment_id,
    student: row.holder_name,
    email: row.email,
    course: typeof course.title === "string" ? course.title : "Course",
    status: row.status,
    requestedAt: row.requested_at,
    reviewedAt: row.reviewed_at,
    rejectionReason: row.rejection_reason,
    completionDate: typeof enrollment.completion_date === "string" ? enrollment.completion_date : row.requested_at,
    completedLessons,
    progress: enrollment.completed === true ? 100 : 0,
    paymentStatus: typeof enrollment.payment_status === "string" ? enrollment.payment_status : "unknown",
    domainType: row.domain_type,
    eventId: row.event_id,
    eventRegistrationId: row.event_registration_id
  };
}
__name(requestView, "requestView");
function certificateView(row) {
  return {
    id: row.id,
    certificateNumber: row.certificate_number,
    requestId: row.request_id,
    userId: row.user_id,
    courseId: row.course_id,
    enrollmentId: row.enrollment_id,
    status: row.status,
    student: row.holder_name,
    course: row.course_title,
    completionDate: row.completion_date,
    issuedAt: row.issued_at,
    certificateUrl: row.certificate_url,
    revokedAt: row.revoked_at,
    revocationReason: row.revocation_reason,
    issuingOrganization: "RUET IoT Club",
    domainType: row.domain_type,
    eventId: row.event_id,
    eventRegistrationId: row.event_registration_id
  };
}
__name(certificateView, "certificateView");
function publicCertificateView(row) {
  return {
    id: row.id,
    certificateNumber: row.certificate_number,
    status: row.status,
    student: row.holder_name,
    course: row.course_title,
    completionDate: row.completion_date,
    issuedAt: row.issued_at,
    certificateUrl: row.certificate_url,
    issuingOrganization: "RUET IoT Club",
    domainType: row.domain_type
  };
}
__name(publicCertificateView, "publicCertificateView");
var requestSelect = `
  SELECT r.id, r.user_id, r.course_id, r.enrollment_id, r.status, r.requested_at,
         r.domain_type, r.event_id, r.event_registration_id,
         r.reviewed_at, r.rejection_reason, u.display_name AS holder_name,
         u.primary_email AS email, c.data_json AS course_data, e.data_json AS enrollment_data
  FROM certificate_requests r
  JOIN users u ON u.id = r.user_id
  JOIN website_content_items c ON c.id = r.course_id
  JOIN website_submissions e ON e.id = r.enrollment_id`;
var certificateRoutes = new Hono2();
certificateRoutes.post(
  "/learning/certificates/requests",
  sessionMiddleware({ required: true }),
  csrfMiddleware(),
  async (context) => {
    const { user } = requireAuth(context);
    const input = await parseJson(context, requestSchema);
    const enrollment = await context.env.DB.prepare(
      `SELECT id, submitted_by, data_json, created_at FROM website_submissions
       WHERE submission_type = 'course_registrations' AND submitted_by = ?
         AND json_extract(data_json, '$.course_id') = ? AND status != 'ARCHIVED'
       ORDER BY created_at DESC LIMIT 1`
    ).bind(user.id, input.courseId).first();
    if (!enrollment) throw new AppError({ code: "ENROLLMENT_NOT_FOUND", message: "An active course enrollment is required.", status: 404 });
    const data = safeObject(enrollment.data_json);
    if (data.completed !== true) throw new AppError({ code: "CERTIFICATE_NOT_ELIGIBLE", message: "Complete every published lesson before requesting a certificate.", status: 403 });
    if (data.payment_status !== "confirmed") throw new AppError({ code: "PAYMENT_NOT_VERIFIED", message: "Payment must be verified before requesting a certificate.", status: 403 });
    const existing = await context.env.DB.prepare(
      "SELECT id, status FROM certificate_requests WHERE user_id = ? AND course_id = ?"
    ).bind(user.id, input.courseId).first();
    if (existing) return context.json(success(existing, context.get("requestId")));
    const id2 = crypto.randomUUID();
    const now = (/* @__PURE__ */ new Date()).toISOString();
    await context.env.DB.batch([
      context.env.DB.prepare(
        `INSERT INTO certificate_requests
          (id, user_id, course_id, enrollment_id, status, requested_at, created_at, updated_at)
         VALUES (?, ?, ?, ?, 'REQUESTED', ?, ?, ?)`
      ).bind(id2, user.id, input.courseId, enrollment.id, now, now, now),
      createAuditStatement(context.env.DB, {
        requestId: context.get("requestId"),
        actorId: user.id,
        action: "CERTIFICATE_REQUESTED",
        entityType: "CERTIFICATE_REQUEST",
        entityId: id2,
        metadata: { courseId: input.courseId, enrollmentId: enrollment.id }
      })
    ]);
    return context.json(success({ id: id2, status: "REQUESTED" }, context.get("requestId")), 201);
  }
);
certificateRoutes.post(
  "/learning/events/:eventId/certificate-request",
  sessionMiddleware({ required: true }),
  csrfMiddleware(),
  async (context) => {
    const { user } = requireAuth(context);
    const eventId = external_exports.string().uuid().parse(context.req.param("eventId"));
    const row = await context.env.DB.prepare(
      `SELECT r.*,e.certificate_available,e.certificate_require_registration,e.certificate_require_payment,
       e.certificate_require_attendance,e.certificate_min_attendance_percent
       FROM event_registrations r JOIN managed_events e ON e.id=r.event_id
       WHERE r.event_id=? AND r.user_id=?`
    ).bind(eventId, user.id).first();
    if (!row) throw new AppError({ code: "EVENT_REGISTRATION_NOT_FOUND", message: "An event registration is required.", status: 404 });
    if (Number(row.certificate_available) !== 1) throw new AppError({ code: "CERTIFICATE_UNAVAILABLE", message: "Certificates are not enabled for this event.", status: 409 });
    const override = row.certificate_eligible_override;
    const eligible = override === 1 || override !== 0 && (Number(row.certificate_require_registration) !== 1 || row.registration_status === "APPROVED") && (Number(row.certificate_require_payment) !== 1 || row.event_type === "FREE" || row.payment_status === "VERIFIED") && (Number(row.certificate_require_attendance) !== 1 || row.attendance_status === "PRESENT");
    if (!eligible) throw new AppError({ code: "CERTIFICATE_NOT_ELIGIBLE", message: "Registration, payment, or attendance requirements are not yet satisfied.", status: 403 });
    const existing = await context.env.DB.prepare("SELECT id,status FROM certificate_requests WHERE user_id=? AND course_id=?").bind(user.id, eventId).first();
    if (existing) return context.json(success(existing, context.get("requestId")));
    const id2 = crypto.randomUUID(), now = (/* @__PURE__ */ new Date()).toISOString();
    await context.env.DB.batch([
      context.env.DB.prepare(
        `INSERT INTO certificate_requests(id,user_id,course_id,enrollment_id,status,requested_at,created_at,updated_at,domain_type,event_id,event_registration_id)
         VALUES(?,?,?,?,'REQUESTED',?,?,?,'EVENT',?,?)`
      ).bind(id2, user.id, eventId, row.legacy_submission_id, now, now, now, eventId, row.id),
      createAuditStatement(context.env.DB, { requestId: context.get("requestId"), actorId: user.id, action: "EVENT_CERTIFICATE_REQUESTED", entityType: "CERTIFICATE_REQUEST", entityId: id2, metadata: { eventId, eventRegistrationId: row.id } })
    ]);
    return context.json(success({ id: id2, status: "REQUESTED", domainType: "EVENT" }, context.get("requestId")), 201);
  }
);
certificateRoutes.get("/learning/certificates/me", sessionMiddleware({ required: true }), async (context) => {
  const { user } = requireAuth(context);
  const requests = await context.env.DB.prepare(`${requestSelect} WHERE r.user_id = ? ORDER BY r.requested_at DESC`).bind(user.id).all();
  const certificates = await context.env.DB.prepare(
    "SELECT * FROM certificates WHERE user_id = ? ORDER BY issued_at DESC"
  ).bind(user.id).all();
  return context.json(success({ requests: requests.results.map(requestView), certificates: certificates.results.map(certificateView) }, context.get("requestId")));
});
certificateRoutes.get("/certificates/:identifier", async (context) => {
  const identifier = external_exports.string().trim().min(3).max(100).parse(context.req.param("identifier"));
  const row = await context.env.DB.prepare(
    "SELECT * FROM certificates WHERE id = ? OR certificate_number = ? LIMIT 1"
  ).bind(identifier, identifier.toUpperCase()).first();
  if (!row) throw new AppError({ code: "CERTIFICATE_NOT_FOUND", message: "The certificate was not found.", status: 404 });
  return context.json(success(publicCertificateView(row), context.get("requestId")));
});
certificateRoutes.get(
  "/admin/certificates",
  sessionMiddleware({ required: true }),
  requirePermission("certificate.read"),
  async (context) => {
    const status = listStatusSchema.catch("ALL").parse((context.req.query("status") || "ALL").toUpperCase());
    const search = (context.req.query("search") || "").trim().toLowerCase();
    const rows = await context.env.DB.prepare(`${requestSelect} ${status === "ALL" ? "" : "WHERE r.status = ?"} ORDER BY r.requested_at DESC LIMIT 500`).bind(...status === "ALL" ? [] : [status]).all();
    let items = rows.results.map(requestView);
    if (search) items = items.filter((item) => `${item.student} ${item.email} ${item.course} ${item.id}`.toLowerCase().includes(search));
    const issued = await context.env.DB.prepare("SELECT * FROM certificates ORDER BY issued_at DESC LIMIT 500").all();
    return context.json(success({ requests: items, certificates: issued.results.map(certificateView) }, context.get("requestId")));
  }
);
certificateRoutes.post(
  "/admin/certificates/:requestId/approve",
  sessionMiddleware({ required: true }),
  csrfMiddleware(),
  requirePermission("certificate.issue"),
  async (context) => {
    const { user } = requireAuth(context);
    const requestId = external_exports.string().uuid().parse(context.req.param("requestId"));
    const request = await context.env.DB.prepare(`${requestSelect} WHERE r.id = ?`).bind(requestId).first();
    if (!request) throw new AppError({ code: "CERTIFICATE_REQUEST_NOT_FOUND", message: "The certificate request was not found.", status: 404 });
    if (request.status === "ISSUED") {
      const current = await context.env.DB.prepare("SELECT * FROM certificates WHERE request_id = ?").bind(requestId).first();
      return context.json(success(current ? certificateView(current) : { status: "ISSUED" }, context.get("requestId")));
    }
    if (!["REQUESTED", "UNDER_REVIEW", "APPROVED"].includes(request.status)) {
      throw new AppError({ code: "INVALID_CERTIFICATE_STATE", message: "Only active certificate requests can be approved.", status: 409 });
    }
    const enrollment = safeObject(request.enrollment_data);
    if (request.domain_type === "EVENT") {
      const eventRegistration = await context.env.DB.prepare(
        `SELECT r.*,e.certificate_available,e.certificate_require_registration,e.certificate_require_payment,e.certificate_require_attendance
         FROM event_registrations r JOIN managed_events e ON e.id=r.event_id WHERE r.id=? AND r.event_id=?`
      ).bind(request.event_registration_id, request.event_id).first();
      const override = eventRegistration?.certificate_eligible_override;
      const eligible = eventRegistration && Number(eventRegistration.certificate_available) === 1 && (override === 1 || override !== 0 && (Number(eventRegistration.certificate_require_registration) !== 1 || eventRegistration.registration_status === "APPROVED") && (Number(eventRegistration.certificate_require_payment) !== 1 || eventRegistration.event_type === "FREE" || eventRegistration.payment_status === "VERIFIED") && (Number(eventRegistration.certificate_require_attendance) !== 1 || eventRegistration.attendance_status === "PRESENT"));
      if (!eligible) throw new AppError({ code: "CERTIFICATE_NOT_ELIGIBLE", message: "The event registration is no longer eligible for certificate issuance.", status: 409 });
    } else if (enrollment.completed !== true || enrollment.payment_status !== "confirmed") {
      throw new AppError({ code: "CERTIFICATE_NOT_ELIGIBLE", message: "The enrollment is no longer eligible for certificate issuance.", status: 409 });
    }
    const course = safeObject(request.course_data);
    const year = (/* @__PURE__ */ new Date()).getUTCFullYear();
    await context.env.DB.prepare("INSERT INTO certificate_sequences (year, next_value) VALUES (?, 1) ON CONFLICT(year) DO NOTHING").bind(year).run();
    const sequence = await context.env.DB.prepare(
      "UPDATE certificate_sequences SET next_value = next_value + 1 WHERE year = ? RETURNING next_value - 1 AS value"
    ).bind(year).first("value");
    if (!sequence) throw new AppError({ code: "CERTIFICATE_SEQUENCE_FAILED", message: "A certificate number could not be allocated.", status: 500 });
    const certificateId = crypto.randomUUID();
    const number = `RIOT-${year}-${String(sequence).padStart(6, "0")}`;
    const now = (/* @__PURE__ */ new Date()).toISOString();
    const completionDate = typeof enrollment.completion_date === "string" ? enrollment.completion_date : now;
    const courseTitle = typeof course.title === "string" ? course.title : request.domain_type === "EVENT" ? "RUET IoT Club Event" : "RUET IoT Club Course";
    const certificateUrl = `/certificate/${certificateId}`;
    const legacyData = { user_id: request.user_id, course_id: request.course_id, certificate_number: number, issued_at: now, completion_date: completionDate, status: "issued" };
    await context.env.DB.batch([
      context.env.DB.prepare(
        `INSERT INTO certificates
          (id, certificate_number, request_id, user_id, course_id, enrollment_id, holder_name, course_title,
           completion_date, issued_at, issued_by, certificate_url, domain_type, event_id, event_registration_id)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
      ).bind(certificateId, number, request.id, request.user_id, request.course_id, request.enrollment_id, request.holder_name, courseTitle, completionDate, now, user.id, certificateUrl, request.domain_type, request.event_id, request.event_registration_id),
      context.env.DB.prepare(
        "UPDATE certificate_requests SET status = 'ISSUED', reviewed_at = ?, reviewed_by = ?, updated_at = ? WHERE id = ?"
      ).bind(now, user.id, now, request.id),
      context.env.DB.prepare(
        "INSERT INTO website_submissions (id, submission_type, submitted_by, data_json, status, created_at, updated_at) VALUES (?, 'certificates', ?, ?, 'APPROVED', ?, ?)"
      ).bind(certificateId, request.user_id, JSON.stringify(legacyData), now, now),
      createAuditStatement(context.env.DB, {
        requestId: context.get("requestId"),
        actorId: user.id,
        action: "CERTIFICATE_APPROVED_AND_ISSUED",
        entityType: "CERTIFICATE",
        entityId: certificateId,
        metadata: { requestId: request.id, certificateNumber: number }
      })
    ]);
    return context.json(success(certificateView({
      id: certificateId,
      certificate_number: number,
      request_id: request.id,
      user_id: request.user_id,
      course_id: request.course_id,
      enrollment_id: request.enrollment_id,
      status: "ISSUED",
      holder_name: request.holder_name,
      course_title: courseTitle,
      completion_date: completionDate,
      issued_at: now,
      certificate_url: certificateUrl,
      revoked_at: null,
      revocation_reason: null,
      domain_type: request.domain_type,
      event_id: request.event_id,
      event_registration_id: request.event_registration_id
    }), context.get("requestId")), 201);
  }
);
certificateRoutes.post(
  "/admin/certificates/:requestId/reject",
  sessionMiddleware({ required: true }),
  csrfMiddleware(),
  requirePermission("certificate.issue"),
  async (context) => {
    const { user } = requireAuth(context);
    const requestId = external_exports.string().uuid().parse(context.req.param("requestId"));
    const input = await parseJson(context, decisionSchema.extend({ reason: external_exports.string().trim().min(3).max(1e3) }));
    const now = (/* @__PURE__ */ new Date()).toISOString();
    const result = await context.env.DB.prepare(
      `UPDATE certificate_requests SET status = 'REJECTED', rejection_reason = ?, reviewed_at = ?, reviewed_by = ?, updated_at = ?
       WHERE id = ? AND status IN ('REQUESTED', 'UNDER_REVIEW') RETURNING id`
    ).bind(input.reason, now, user.id, now, requestId).first("id");
    if (!result) throw new AppError({ code: "INVALID_CERTIFICATE_STATE", message: "The request cannot be rejected in its current state.", status: 409 });
    await createAuditStatement(context.env.DB, { requestId: context.get("requestId"), actorId: user.id, action: "CERTIFICATE_REJECTED", entityType: "CERTIFICATE_REQUEST", entityId: requestId, reason: input.reason }).run();
    return context.json(success({ id: requestId, status: "REJECTED" }, context.get("requestId")));
  }
);
certificateRoutes.post(
  "/admin/certificates/:certificateId/revoke",
  sessionMiddleware({ required: true }),
  csrfMiddleware(),
  requireAnyPermission(["certificate.revoke", "certificate.manage"]),
  async (context) => {
    const { user } = requireAuth(context);
    const certificateId = external_exports.string().uuid().parse(context.req.param("certificateId"));
    const input = await parseJson(context, decisionSchema.extend({ reason: external_exports.string().trim().min(3).max(1e3) }));
    const now = (/* @__PURE__ */ new Date()).toISOString();
    const result = await context.env.DB.prepare(
      `UPDATE certificates SET status = 'REVOKED', revoked_at = ?, revoked_by = ?, revocation_reason = ?
       WHERE id = ? AND status = 'ISSUED' RETURNING certificate_number`
    ).bind(now, user.id, input.reason, certificateId).first("certificate_number");
    if (!result) throw new AppError({ code: "INVALID_CERTIFICATE_STATE", message: "Only an issued certificate can be revoked.", status: 409 });
    await context.env.DB.batch([
      context.env.DB.prepare("UPDATE website_submissions SET data_json = json_set(data_json, '$.status', 'revoked', '$.revoked_at', ?, '$.revocation_reason', ?), updated_at = ? WHERE id = ?").bind(now, input.reason, now, certificateId),
      createAuditStatement(context.env.DB, { requestId: context.get("requestId"), actorId: user.id, action: "CERTIFICATE_REVOKED", entityType: "CERTIFICATE", entityId: certificateId, reason: input.reason, metadata: { certificateNumber: result } })
    ]);
    return context.json(success({ id: certificateId, status: "REVOKED" }, context.get("requestId")));
  }
);

// src/lib/eventModel.ts
var validTime = /* @__PURE__ */ __name((value) => {
  if (!value) return null;
  const time = new Date(value).getTime();
  return Number.isFinite(time) ? time : null;
}, "validTime");
function deriveEventStatus(input, now = Date.now()) {
  const override = input.eventStatusOverride ?? (input.eventStatus === "CANCELLED" || input.eventStatus === "POSTPONED" ? input.eventStatus : null);
  if (override) return override;
  const starts = validTime(input.startsAt);
  const ends = validTime(input.endsAt);
  if (starts === null || ends === null) return "SCHEDULED";
  if (now >= ends) return "COMPLETED";
  if (now >= starts) return "ONGOING";
  return "SCHEDULED";
}
__name(deriveEventStatus, "deriveEventStatus");
function deriveRegistrationStatus(input, now = Date.now()) {
  const eventStatus = deriveEventStatus(input, now);
  if (!input.registrationRequired || input.registrationMode === "CLOSED")
    return "CLOSED";
  if (["COMPLETED", "CANCELLED", "POSTPONED"].includes(eventStatus))
    return "CLOSED";
  const deadline = validTime(input.registrationDeadline);
  if (deadline !== null && now >= deadline) return "CLOSED";
  const capacity = Math.max(0, Number(input.maxParticipants || 0));
  const reserved = Math.max(0, Number(input.reservedCount || 0));
  if (capacity > 0 && reserved >= capacity && !input.registrationCapacityOverride)
    return "FULL";
  if (input.registrationStatusOverride) return input.registrationStatusOverride;
  const opens = validTime(input.registrationOpensAt);
  return opens !== null && now < opens ? "UPCOMING" : "OPEN";
}
__name(deriveRegistrationStatus, "deriveRegistrationStatus");
function isValidTimeZone(value) {
  try {
    new Intl.DateTimeFormat("en", { timeZone: value }).format(0);
    return true;
  } catch {
    return false;
  }
}
__name(isValidTimeZone, "isValidTimeZone");
function mediaReferenceFromUrl(url2, altText = "") {
  if (!url2) return null;
  const prefix = "/api/v1/media/files/";
  const key = url2.startsWith(prefix) ? url2.slice(prefix.length) : "";
  const originalName = decodeURIComponent(
    url2.split("/").pop() || "Selected media"
  );
  return { key, url: url2, originalName, altText };
}
__name(mediaReferenceFromUrl, "mediaReferenceFromUrl");

// worker/routes/platform.ts
var idSchema = external_exports.string().uuid();
var statusQuery = external_exports.string().trim().max(40).optional();
var urlValue = external_exports.string().trim().url().max(800).or(
  external_exports.string().trim().regex(/^\/api\/v1\/media\/files\//u).max(800)
);
var optionalUrl3 = urlValue.optional().or(external_exports.literal(""));
var stringList2 = external_exports.array(external_exports.string().trim().min(1).max(120)).max(40).default([]);
var workflowStatus = external_exports.enum(["DRAFT", "REVIEW", "PUBLISHED", "ARCHIVED"]);
var researcherSchema = external_exports.object({
  id: idSchema.optional(),
  name: external_exports.string().trim().min(2).max(160),
  role: external_exports.string().trim().max(120).optional(),
  institution: external_exports.string().trim().max(200).optional(),
  email: external_exports.string().trim().email().max(254).optional(),
  photoUrl: optionalUrl3
});
var documentSchema = external_exports.object({
  id: idSchema.optional(),
  type: external_exports.enum([
    "COVER",
    "PDF",
    "PAPER",
    "DATASET",
    "PRESENTATION",
    "SUPPLEMENTARY"
  ]),
  title: external_exports.string().trim().min(1).max(200),
  url: urlValue,
  objectKey: external_exports.string().trim().max(512).optional(),
  contentType: external_exports.string().trim().max(120).optional(),
  byteSize: external_exports.number().int().min(1).max(5 * 1024 * 1024).optional(),
  sortOrder: external_exports.number().int().min(-1e4).max(1e4).default(0)
});
var researchSchema = external_exports.object({
  title: external_exports.string().trim().min(3).max(240),
  slug: external_exports.string().trim().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/u).max(260).optional(),
  shortDescription: external_exports.string().trim().max(1e3).optional(),
  abstract: external_exports.string().trim().max(3e4).optional(),
  researchStatus: external_exports.enum(["ONGOING", "COMPLETED", "PUBLISHED", "ARCHIVED"]),
  category: external_exports.string().trim().max(120).optional(),
  researchArea: external_exports.string().trim().max(160).optional(),
  keywords: stringList2,
  publicationTitle: external_exports.string().trim().max(240).optional(),
  journalConference: external_exports.string().trim().max(240).optional(),
  publisher: external_exports.string().trim().max(200).optional(),
  publicationDate: external_exports.string().trim().max(40).optional(),
  doi: external_exports.string().trim().max(200).optional(),
  isbnIssn: external_exports.string().trim().max(100).optional(),
  volume: external_exports.string().trim().max(60).optional(),
  issue: external_exports.string().trim().max(60).optional(),
  pages: external_exports.string().trim().max(60).optional(),
  citation: external_exports.string().trim().max(2e3).optional(),
  externalUrl: optionalUrl3,
  coverUrl: optionalUrl3,
  workflowStatus,
  featured: external_exports.boolean().default(false),
  sortOrder: external_exports.number().int().min(-1e4).max(1e4).default(0),
  researchers: external_exports.array(researcherSchema).max(40).default([]),
  documents: external_exports.array(documentSchema).max(30).default([])
});
var courseSchema = external_exports.object({
  title: external_exports.string().trim().min(3).max(240),
  shortDescription: external_exports.string().trim().max(1e3).optional(),
  fullDescription: external_exports.string().trim().max(3e4).optional(),
  thumbnailUrl: optionalUrl3,
  instructor: external_exports.string().trim().max(160).optional(),
  instructorBio: external_exports.string().trim().max(5e3).optional(),
  category: external_exports.string().trim().max(120).optional(),
  level: external_exports.enum(["BEGINNER", "INTERMEDIATE", "ADVANCED"]),
  duration: external_exports.string().trim().max(100).optional(),
  language: external_exports.string().trim().min(2).max(80).default("English"),
  tags: stringList2,
  objectives: stringList2,
  prerequisites: stringList2,
  courseType: external_exports.enum(["FREE", "PAID"]),
  price: external_exports.number().min(0).max(1e6).default(0),
  currency: external_exports.string().trim().length(3).transform((value) => value.toUpperCase()).default("BDT"),
  paymentInstructions: external_exports.string().trim().max(3e3).optional(),
  status: workflowStatus,
  featured: external_exports.boolean().default(false),
  sortOrder: external_exports.number().int().min(-1e4).max(1e4).default(0)
}).superRefine((value, context) => {
  if (value.courseType === "PAID" && value.price <= 0)
    context.addIssue({
      code: external_exports.ZodIssueCode.custom,
      message: "Paid courses require a positive price.",
      path: ["price"]
    });
  if (value.courseType === "FREE" && value.price !== 0)
    context.addIssue({
      code: external_exports.ZodIssueCode.custom,
      message: "Free courses cannot have a price.",
      path: ["price"]
    });
});
var moduleSchema = external_exports.object({
  courseId: idSchema,
  title: external_exports.string().trim().min(1).max(200),
  description: external_exports.string().trim().max(3e3).optional(),
  sortOrder: external_exports.number().int().min(-1e4).max(1e4).default(0),
  status: external_exports.enum(["DRAFT", "PUBLISHED"])
});
var lessonSchema = external_exports.object({
  courseId: idSchema,
  moduleId: idSchema,
  title: external_exports.string().trim().min(1).max(200),
  description: external_exports.string().trim().max(5e3).optional(),
  durationMinutes: external_exports.number().int().min(0).max(1e5).optional(),
  sortOrder: external_exports.number().int().min(-1e4).max(1e4).default(0),
  status: external_exports.enum(["DRAFT", "PUBLISHED"])
});
var lessonContentSchema = external_exports.object({
  lessonId: idSchema,
  contentType: external_exports.enum([
    "TEXT",
    "RICH_TEXT",
    "YOUTUBE",
    "VIDEO",
    "PDF",
    "DOC",
    "PPT",
    "IMAGE",
    "EXTERNAL",
    "DOWNLOAD"
  ]),
  title: external_exports.string().trim().max(200).optional(),
  body: external_exports.string().trim().max(6e4).optional(),
  url: optionalUrl3,
  objectKey: external_exports.string().trim().max(512).optional(),
  metadataContentType: external_exports.string().trim().max(120).optional(),
  byteSize: external_exports.number().int().min(1).max(5 * 1024 * 1024).optional(),
  sortOrder: external_exports.number().int().min(-1e4).max(1e4).default(0),
  status: external_exports.enum(["DRAFT", "PUBLISHED"])
}).refine(
  (value) => Boolean(value.body || value.url || value.objectKey),
  "Lesson content requires text or a resource."
);
var paymentSchema = external_exports.object({
  paymentMethod: external_exports.string().trim().min(2).max(80),
  transactionReference: external_exports.string().trim().min(3).max(160).optional()
});
var eventRegistrationSchema = external_exports.object({
  name: external_exports.string().trim().min(2).max(160),
  email: external_exports.string().trim().email().max(254),
  phone: external_exports.string().trim().max(40).optional(),
  department: external_exports.string().trim().max(120).optional(),
  paymentMethod: external_exports.string().trim().min(2).max(80).optional(),
  transactionReference: external_exports.string().trim().min(3).max(160).optional(),
  payerPhone: external_exports.string().trim().regex(/^01\d{9}$/u).optional()
});
var decisionSchema2 = external_exports.object({
  action: external_exports.enum([
    "APPROVE",
    "REJECT",
    "VERIFY_PAYMENT",
    "CANCEL",
    "PRESENT",
    "ABSENT"
  ]),
  reason: external_exports.string().trim().min(3).max(1e3).optional()
});
function slugify2(value) {
  return value.toLowerCase().trim().replace(/[^a-z0-9]+/gu, "-").replace(/^-|-$/gu, "").slice(0, 240);
}
__name(slugify2, "slugify");
function parseList(value) {
  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}
__name(parseList, "parseList");
function optional(value) {
  return value?.trim() || null;
}
__name(optional, "optional");
var platformRoutes = new Hono2();
platformRoutes.get("/research", async (context) => {
  const search = (context.req.query("search") || "").trim().toLowerCase();
  const status = statusQuery.parse(context.req.query("status"));
  const rows = await context.env.DB.prepare(
    `SELECT r.*,
    (SELECT json_group_array(json_object('id', a.researcher_id, 'name', p.name, 'role', COALESCE(a.author_role,p.role), 'institution', p.institution, 'photoUrl', p.photo_url)) FROM research_authors a JOIN researchers p ON p.id=a.researcher_id WHERE a.research_id=r.id ORDER BY a.author_order) AS authors_json,
    (SELECT json_group_array(json_object('id', d.id, 'type', d.document_type, 'title', d.title, 'url', d.url, 'contentType', d.content_type, 'byteSize', d.byte_size)) FROM research_documents d WHERE d.research_id=r.id ORDER BY d.sort_order) AS documents_json
    FROM research_works r WHERE r.workflow_status='PUBLISHED' ORDER BY r.featured DESC, r.sort_order, r.publish_date DESC`
  ).all();
  let items = rows.results.map((row) => ({
    ...row,
    keywords: parseList(String(row.keywords_json)),
    researchers: parseList(String(row.authors_json || "[]")),
    documents: parseList(String(row.documents_json || "[]"))
  }));
  if (status && status !== "ALL")
    items = items.filter(
      (item) => item["research_status"] === status.toUpperCase()
    );
  if (search)
    items = items.filter(
      (item) => `${item["title"]} ${item["short_description"] || ""} ${item["abstract"] || ""} ${item["research_area"] || ""}`.toLowerCase().includes(search)
    );
  const stats = {
    total: items.length,
    ongoing: items.filter((item) => item["research_status"] === "ONGOING").length,
    completed: items.filter((item) => item["research_status"] === "COMPLETED").length,
    published: items.filter((item) => item["research_status"] === "PUBLISHED").length,
    researchers: new Set(
      items.flatMap(
        (item) => item.researchers.map((author) => author.id)
      )
    ).size
  };
  return context.json(success({ items, stats }, context.get("requestId")));
});
platformRoutes.get("/research/:slug", async (context) => {
  const slug2 = external_exports.string().trim().min(2).max(260).parse(context.req.param("slug"));
  const row = await context.env.DB.prepare(
    "SELECT * FROM research_works WHERE (slug=? OR id=?) AND workflow_status='PUBLISHED'"
  ).bind(slug2, slug2).first();
  if (!row)
    throw new AppError({
      code: "RESEARCH_NOT_FOUND",
      message: "The research work was not found.",
      status: 404
    });
  const [authors, documents] = await Promise.all([
    context.env.DB.prepare(
      "SELECT p.id,p.name,COALESCE(a.author_role,p.role) AS role,p.institution,p.email,p.photo_url AS photoUrl FROM research_authors a JOIN researchers p ON p.id=a.researcher_id WHERE a.research_id=? ORDER BY a.author_order"
    ).bind(row.id).all(),
    context.env.DB.prepare(
      "SELECT id,document_type AS type,title,url,content_type AS contentType,byte_size AS byteSize FROM research_documents WHERE research_id=? ORDER BY sort_order"
    ).bind(row.id).all()
  ]);
  return context.json(
    success(
      {
        ...row,
        keywords: parseList(String(row.keywords_json)),
        researchers: authors.results,
        documents: documents.results
      },
      context.get("requestId")
    )
  );
});
platformRoutes.get(
  "/admin/research",
  sessionMiddleware({ required: true }),
  requirePermission("research.read"),
  async (context) => {
    const rows = await context.env.DB.prepare(
      "SELECT * FROM research_works WHERE workflow_status!='ARCHIVED' ORDER BY featured DESC,sort_order,updated_at DESC"
    ).all();
    const proposals = await context.env.DB.prepare(
      `SELECT
    SUM(CASE WHEN status IN ('SUBMITTED','UNDER_REVIEW','REVISION_REQUESTED','NEEDS_INFORMATION') THEN 1 ELSE 0 END) AS pending,
    SUM(CASE WHEN status='APPROVED' THEN 1 ELSE 0 END) AS approved,
    SUM(CASE WHEN status='REJECTED' THEN 1 ELSE 0 END) AS rejected
    FROM platform_submissions WHERE submission_type='RESEARCH'`
    ).first();
    const items = [];
    for (const row of rows.results) {
      const [authors, docs] = await Promise.all([
        context.env.DB.prepare(
          "SELECT p.id,p.name,COALESCE(a.author_role,p.role) AS role,p.institution,p.email,p.photo_url AS photoUrl FROM research_authors a JOIN researchers p ON p.id=a.researcher_id WHERE a.research_id=? ORDER BY a.author_order"
        ).bind(row.id).all(),
        context.env.DB.prepare(
          "SELECT id,document_type AS type,title,url,object_key AS objectKey,content_type AS contentType,byte_size AS byteSize,sort_order AS sortOrder FROM research_documents WHERE research_id=? ORDER BY sort_order"
        ).bind(row.id).all()
      ]);
      items.push({
        ...row,
        keywords: parseList(String(row.keywords_json)),
        researchers: authors.results,
        documents: docs.results
      });
    }
    return context.json(
      success(
        {
          items,
          proposalStats: {
            pending: proposals?.pending ?? 0,
            approved: proposals?.approved ?? 0,
            rejected: proposals?.rejected ?? 0
          }
        },
        context.get("requestId")
      )
    );
  }
);
platformRoutes.put(
  "/admin/research/:id",
  sessionMiddleware({ required: true }),
  csrfMiddleware(),
  requirePermission("research.manage"),
  async (context) => {
    const { user } = requireAuth(context);
    const id2 = idSchema.parse(context.req.param("id"));
    const input = await parseJson(context, researchSchema);
    const now = (/* @__PURE__ */ new Date()).toISOString();
    if (input.workflowStatus === "PUBLISHED" && !user.permissions.includes("content.publish"))
      throw new AppError({
        code: "PERMISSION_DENIED",
        message: "Publishing permission is required.",
        status: 403
      });
    const slug2 = input.slug || slugify2(input.title);
    const exists = await context.env.DB.prepare(
      "SELECT id FROM research_works WHERE id=?"
    ).bind(id2).first("id");
    const statements = [
      context.env.DB.prepare(
        `INSERT INTO research_works
    (id,title,slug,short_description,abstract,research_status,category,research_area,keywords_json,publication_title,journal_conference,publisher,publication_date,doi,isbn_issn,volume,issue,pages,citation,external_url,cover_url,workflow_status,featured,sort_order,publish_date,created_by,updated_by,created_at,updated_at)
    VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)
    ON CONFLICT(id) DO UPDATE SET title=excluded.title,slug=excluded.slug,short_description=excluded.short_description,abstract=excluded.abstract,research_status=excluded.research_status,category=excluded.category,research_area=excluded.research_area,keywords_json=excluded.keywords_json,publication_title=excluded.publication_title,journal_conference=excluded.journal_conference,publisher=excluded.publisher,publication_date=excluded.publication_date,doi=excluded.doi,isbn_issn=excluded.isbn_issn,volume=excluded.volume,issue=excluded.issue,pages=excluded.pages,citation=excluded.citation,external_url=excluded.external_url,cover_url=excluded.cover_url,workflow_status=excluded.workflow_status,featured=excluded.featured,sort_order=excluded.sort_order,publish_date=excluded.publish_date,updated_by=excluded.updated_by,updated_at=excluded.updated_at`
      ).bind(
        id2,
        input.title,
        slug2,
        optional(input.shortDescription),
        optional(input.abstract),
        input.researchStatus,
        optional(input.category),
        optional(input.researchArea),
        JSON.stringify(input.keywords),
        optional(input.publicationTitle),
        optional(input.journalConference),
        optional(input.publisher),
        optional(input.publicationDate),
        optional(input.doi),
        optional(input.isbnIssn),
        optional(input.volume),
        optional(input.issue),
        optional(input.pages),
        optional(input.citation),
        optional(input.externalUrl),
        optional(input.coverUrl),
        input.workflowStatus,
        input.featured ? 1 : 0,
        input.sortOrder,
        input.workflowStatus === "PUBLISHED" ? now : null,
        user.id,
        user.id,
        now,
        now
      )
    ];
    statements.push(
      context.env.DB.prepare(
        "DELETE FROM research_authors WHERE research_id=?"
      ).bind(id2),
      context.env.DB.prepare(
        "DELETE FROM research_documents WHERE research_id=?"
      ).bind(id2)
    );
    input.researchers.forEach((researcher, index) => {
      const researcherId = researcher.id || crypto.randomUUID();
      statements.push(
        context.env.DB.prepare(
          "INSERT INTO researchers (id,name,role,institution,email,photo_url,updated_at) VALUES (?,?,?,?,?,?,?) ON CONFLICT(id) DO UPDATE SET name=excluded.name,role=excluded.role,institution=excluded.institution,email=excluded.email,photo_url=excluded.photo_url,updated_at=excluded.updated_at"
        ).bind(
          researcherId,
          researcher.name,
          optional(researcher.role),
          optional(researcher.institution),
          optional(researcher.email),
          optional(researcher.photoUrl),
          now
        ),
        context.env.DB.prepare(
          "INSERT INTO research_authors (research_id,researcher_id,author_order,author_role) VALUES (?,?,?,?)"
        ).bind(id2, researcherId, index, optional(researcher.role))
      );
    });
    input.documents.forEach(
      (doc) => statements.push(
        context.env.DB.prepare(
          "INSERT INTO research_documents (id,research_id,document_type,title,object_key,url,content_type,byte_size,sort_order) VALUES (?,?,?,?,?,?,?,?,?)"
        ).bind(
          doc.id || crypto.randomUUID(),
          id2,
          doc.type,
          doc.title,
          optional(doc.objectKey),
          doc.url,
          optional(doc.contentType),
          doc.byteSize ?? null,
          doc.sortOrder
        )
      )
    );
    statements.push(
      createAuditStatement(context.env.DB, {
        requestId: context.get("requestId"),
        actorId: user.id,
        action: exists ? "RESEARCH_UPDATED" : input.workflowStatus === "PUBLISHED" ? "RESEARCH_PUBLISHED" : "RESEARCH_CREATED",
        entityType: "RESEARCH_WORK",
        entityId: id2,
        metadata: { workflowStatus: input.workflowStatus }
      })
    );
    await context.env.DB.batch(statements);
    return context.json(
      success({ id: id2, slug: slug2 }, context.get("requestId")),
      exists ? 200 : 201
    );
  }
);
platformRoutes.post(
  "/admin/research/:id/archive",
  sessionMiddleware({ required: true }),
  csrfMiddleware(),
  requirePermission("research.manage"),
  async (context) => {
    const { user } = requireAuth(context);
    const id2 = idSchema.parse(context.req.param("id"));
    const now = (/* @__PURE__ */ new Date()).toISOString();
    const result = await context.env.DB.prepare(
      "UPDATE research_works SET workflow_status='ARCHIVED',research_status='ARCHIVED',archived_at=?,updated_by=?,updated_at=? WHERE id=? AND workflow_status!='ARCHIVED' RETURNING id"
    ).bind(now, user.id, now, id2).first("id");
    if (!result)
      throw new AppError({
        code: "RESEARCH_NOT_FOUND",
        message: "Research work not found.",
        status: 404
      });
    await createAuditStatement(context.env.DB, {
      requestId: context.get("requestId"),
      actorId: user.id,
      action: "RESEARCH_ARCHIVED",
      entityType: "RESEARCH_WORK",
      entityId: id2
    }).run();
    return context.json(
      success({ id: id2, status: "ARCHIVED" }, context.get("requestId"))
    );
  }
);
platformRoutes.get("/courses", async (context) => {
  const rows = await context.env.DB.prepare(
    "SELECT * FROM learning_courses WHERE status='PUBLISHED' ORDER BY featured DESC,sort_order,published_at DESC"
  ).all();
  return context.json(
    success(
      rows.results.map((row) => ({
        ...row,
        price: Number(row.price_minor) / 100,
        tags: parseList(String(row.tags_json)),
        objectives: parseList(String(row.objectives_json)),
        prerequisites: parseList(String(row.prerequisites_json))
      })),
      context.get("requestId")
    )
  );
});
async function courseDetail(db, id2, publishedOnly) {
  const course = await db.prepare(
    `SELECT * FROM learning_courses WHERE id=? ${publishedOnly ? "AND status='PUBLISHED'" : ""}`
  ).bind(id2).first();
  if (!course) return null;
  const modules = await db.prepare(
    `SELECT * FROM course_modules WHERE course_id=? AND archived_at IS NULL ${publishedOnly ? "AND status='PUBLISHED'" : ""} ORDER BY sort_order`
  ).bind(id2).all();
  const result = [];
  for (const module of modules.results) {
    const lessons = await db.prepare(
      `SELECT * FROM course_lessons WHERE module_id=? AND archived_at IS NULL ${publishedOnly ? "AND status='PUBLISHED'" : ""} ORDER BY sort_order`
    ).bind(module.id).all();
    const lessonItems = [];
    for (const lesson of lessons.results) {
      const contents = await db.prepare(
        `SELECT * FROM lesson_contents WHERE lesson_id=? AND archived_at IS NULL ${publishedOnly ? "AND status='PUBLISHED'" : ""} ORDER BY sort_order`
      ).bind(lesson.id).all();
      lessonItems.push({ ...lesson, contents: contents.results });
    }
    result.push({ ...module, lessons: lessonItems });
  }
  return {
    ...course,
    price: Number(course.price_minor) / 100,
    tags: parseList(String(course.tags_json)),
    objectives: parseList(String(course.objectives_json)),
    prerequisites: parseList(String(course.prerequisites_json)),
    modules: result
  };
}
__name(courseDetail, "courseDetail");
platformRoutes.get("/courses/:id", async (context) => {
  const id2 = idSchema.parse(context.req.param("id"));
  const data = await courseDetail(context.env.DB, id2, true);
  if (!data)
    throw new AppError({
      code: "COURSE_NOT_FOUND",
      message: "The course was not found.",
      status: 404
    });
  return context.json(success(data, context.get("requestId")));
});
platformRoutes.get(
  "/admin/courses",
  sessionMiddleware({ required: true }),
  requirePermission("course.read"),
  async (context) => {
    const courses = await context.env.DB.prepare(
      "SELECT c.*,(SELECT COUNT(*) FROM course_enrollments e WHERE e.course_id=c.id) AS enrollment_count,(SELECT COUNT(*) FROM course_enrollments e WHERE e.course_id=c.id AND e.enrollment_status='COMPLETED') AS completed_count FROM learning_courses c WHERE c.status!='ARCHIVED' ORDER BY c.sort_order,c.updated_at DESC"
    ).all();
    return context.json(
      success(
        courses.results.map((row) => ({
          ...row,
          price: Number(row.price_minor) / 100,
          tags: parseList(String(row.tags_json)),
          objectives: parseList(String(row.objectives_json)),
          prerequisites: parseList(String(row.prerequisites_json))
        })),
        context.get("requestId")
      )
    );
  }
);
platformRoutes.get(
  "/admin/courses/:id",
  sessionMiddleware({ required: true }),
  requirePermission("course.read"),
  async (context) => {
    const data = await courseDetail(
      context.env.DB,
      idSchema.parse(context.req.param("id")),
      false
    );
    if (!data)
      throw new AppError({
        code: "COURSE_NOT_FOUND",
        message: "Course not found.",
        status: 404
      });
    return context.json(success(data, context.get("requestId")));
  }
);
platformRoutes.put(
  "/admin/courses/:id",
  sessionMiddleware({ required: true }),
  csrfMiddleware(),
  requirePermission("course.manage"),
  async (context) => {
    const { user } = requireAuth(context);
    const id2 = idSchema.parse(context.req.param("id"));
    const input = await parseJson(context, courseSchema);
    const now = (/* @__PURE__ */ new Date()).toISOString();
    if (input.status === "PUBLISHED" && !user.permissions.includes("content.publish"))
      throw new AppError({
        code: "PERMISSION_DENIED",
        message: "Publishing permission is required.",
        status: 403
      });
    const exists = await context.env.DB.prepare(
      "SELECT id FROM learning_courses WHERE id=?"
    ).bind(id2).first("id");
    const data = {
      title: input.title,
      description: input.shortDescription,
      full_description: input.fullDescription,
      image_url: input.thumbnailUrl,
      instructor: input.instructor,
      instructor_bio: input.instructorBio,
      category: input.category,
      level: input.level.toLowerCase(),
      duration: input.duration,
      language: input.language,
      tags: input.tags,
      learning_objectives: input.objectives,
      prerequisites: input.prerequisites,
      is_paid: input.courseType === "PAID",
      price: input.price,
      currency: input.currency,
      payment_instructions: input.paymentInstructions,
      status: input.status.toLowerCase()
    };
    await context.env.DB.batch([
      context.env.DB.prepare(
        `INSERT INTO learning_courses(id,title,short_description,full_description,thumbnail_url,instructor,instructor_bio,category,level,duration,language,tags_json,objectives_json,prerequisites_json,course_type,price_minor,currency,payment_instructions,status,featured,sort_order,published_at,created_by,updated_by,created_at,updated_at) VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?) ON CONFLICT(id) DO UPDATE SET title=excluded.title,short_description=excluded.short_description,full_description=excluded.full_description,thumbnail_url=excluded.thumbnail_url,instructor=excluded.instructor,instructor_bio=excluded.instructor_bio,category=excluded.category,level=excluded.level,duration=excluded.duration,language=excluded.language,tags_json=excluded.tags_json,objectives_json=excluded.objectives_json,prerequisites_json=excluded.prerequisites_json,course_type=excluded.course_type,price_minor=excluded.price_minor,currency=excluded.currency,payment_instructions=excluded.payment_instructions,status=excluded.status,featured=excluded.featured,sort_order=excluded.sort_order,published_at=excluded.published_at,updated_by=excluded.updated_by,updated_at=excluded.updated_at`
      ).bind(
        id2,
        input.title,
        optional(input.shortDescription),
        optional(input.fullDescription),
        optional(input.thumbnailUrl),
        optional(input.instructor),
        optional(input.instructorBio),
        optional(input.category),
        input.level,
        optional(input.duration),
        input.language,
        JSON.stringify(input.tags),
        JSON.stringify(input.objectives),
        JSON.stringify(input.prerequisites),
        input.courseType,
        Math.round(input.price * 100),
        input.currency,
        optional(input.paymentInstructions),
        input.status,
        input.featured ? 1 : 0,
        input.sortOrder,
        input.status === "PUBLISHED" ? now : null,
        user.id,
        user.id,
        now,
        now
      ),
      context.env.DB.prepare(
        `INSERT INTO website_content_items(id,collection_key,data_json,status,sort_order,created_by,updated_by,created_at,updated_at,published_at) VALUES(?,'courses',?,?,?,?,?,?,?,?,?) ON CONFLICT(id) DO UPDATE SET data_json=excluded.data_json,status=excluded.status,sort_order=excluded.sort_order,updated_by=excluded.updated_by,updated_at=excluded.updated_at,published_at=excluded.published_at`
      ).bind(
        id2,
        JSON.stringify(data),
        input.status === "PUBLISHED" ? "PUBLISHED" : "DRAFT",
        input.sortOrder,
        user.id,
        user.id,
        now,
        now,
        input.status === "PUBLISHED" ? now : null
      ),
      createAuditStatement(context.env.DB, {
        requestId: context.get("requestId"),
        actorId: user.id,
        action: exists ? "COURSE_UPDATED" : input.status === "PUBLISHED" ? "COURSE_PUBLISHED" : "COURSE_CREATED",
        entityType: "COURSE",
        entityId: id2
      })
    ]);
    return context.json(
      success({ id: id2 }, context.get("requestId")),
      exists ? 200 : 201
    );
  }
);
platformRoutes.put(
  "/admin/course-modules/:id",
  sessionMiddleware({ required: true }),
  csrfMiddleware(),
  requirePermission("course.manage"),
  async (context) => {
    const { user } = requireAuth(context);
    const id2 = idSchema.parse(context.req.param("id"));
    const input = await parseJson(context, moduleSchema);
    const now = (/* @__PURE__ */ new Date()).toISOString();
    await context.env.DB.batch([
      context.env.DB.prepare(
        "INSERT INTO course_modules(id,course_id,title,description,sort_order,status,created_at,updated_at) VALUES(?,?,?,?,?,?,?,?) ON CONFLICT(id) DO UPDATE SET title=excluded.title,description=excluded.description,sort_order=excluded.sort_order,status=excluded.status,updated_at=excluded.updated_at"
      ).bind(
        id2,
        input.courseId,
        input.title,
        optional(input.description),
        input.sortOrder,
        input.status,
        now,
        now
      ),
      createAuditStatement(context.env.DB, {
        requestId: context.get("requestId"),
        actorId: user.id,
        action: "COURSE_MODULE_SAVED",
        entityType: "COURSE_MODULE",
        entityId: id2,
        metadata: { courseId: input.courseId }
      })
    ]);
    return context.json(success({ id: id2 }, context.get("requestId")));
  }
);
platformRoutes.put(
  "/admin/course-lessons/:id",
  sessionMiddleware({ required: true }),
  csrfMiddleware(),
  requirePermission("course.manage"),
  async (context) => {
    const { user } = requireAuth(context);
    const id2 = idSchema.parse(context.req.param("id"));
    const input = await parseJson(context, lessonSchema);
    const now = (/* @__PURE__ */ new Date()).toISOString();
    const moduleCourse = await context.env.DB.prepare(
      "SELECT course_id FROM course_modules WHERE id=?"
    ).bind(input.moduleId).first("course_id");
    if (moduleCourse !== input.courseId)
      throw new AppError({
        code: "INVALID_COURSE_MODULE",
        message: "The lesson module does not belong to this course.",
        status: 422
      });
    await context.env.DB.batch([
      context.env.DB.prepare(
        "INSERT INTO course_lessons(id,course_id,module_id,title,description,duration_minutes,sort_order,status,created_at,updated_at) VALUES(?,?,?,?,?,?,?,?,?,?) ON CONFLICT(id) DO UPDATE SET module_id=excluded.module_id,title=excluded.title,description=excluded.description,duration_minutes=excluded.duration_minutes,sort_order=excluded.sort_order,status=excluded.status,updated_at=excluded.updated_at"
      ).bind(
        id2,
        input.courseId,
        input.moduleId,
        input.title,
        optional(input.description),
        input.durationMinutes ?? null,
        input.sortOrder,
        input.status,
        now,
        now
      ),
      createAuditStatement(context.env.DB, {
        requestId: context.get("requestId"),
        actorId: user.id,
        action: "COURSE_LESSON_SAVED",
        entityType: "COURSE_LESSON",
        entityId: id2,
        metadata: { courseId: input.courseId }
      })
    ]);
    return context.json(success({ id: id2 }, context.get("requestId")));
  }
);
platformRoutes.put(
  "/admin/lesson-contents/:id",
  sessionMiddleware({ required: true }),
  csrfMiddleware(),
  requirePermission("course.manage"),
  async (context) => {
    const { user } = requireAuth(context);
    const id2 = idSchema.parse(context.req.param("id"));
    const input = await parseJson(context, lessonContentSchema);
    const now = (/* @__PURE__ */ new Date()).toISOString();
    await context.env.DB.batch([
      context.env.DB.prepare(
        "INSERT INTO lesson_contents(id,lesson_id,content_type,title,body,url,object_key,content_type_metadata,byte_size,sort_order,status,created_at,updated_at) VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?) ON CONFLICT(id) DO UPDATE SET content_type=excluded.content_type,title=excluded.title,body=excluded.body,url=excluded.url,object_key=excluded.object_key,content_type_metadata=excluded.content_type_metadata,byte_size=excluded.byte_size,sort_order=excluded.sort_order,status=excluded.status,updated_at=excluded.updated_at"
      ).bind(
        id2,
        input.lessonId,
        input.contentType,
        optional(input.title),
        optional(input.body),
        optional(input.url),
        optional(input.objectKey),
        optional(input.metadataContentType),
        input.byteSize ?? null,
        input.sortOrder,
        input.status,
        now,
        now
      ),
      createAuditStatement(context.env.DB, {
        requestId: context.get("requestId"),
        actorId: user.id,
        action: "LESSON_CONTENT_SAVED",
        entityType: "LESSON_CONTENT",
        entityId: id2
      })
    ]);
    return context.json(success({ id: id2 }, context.get("requestId")));
  }
);
platformRoutes.post(
  "/admin/course-content/:kind/:id/archive",
  sessionMiddleware({ required: true }),
  csrfMiddleware(),
  requirePermission("course.manage"),
  async (context) => {
    const { user } = requireAuth(context);
    const kind = external_exports.enum(["module", "lesson", "content"]).parse(context.req.param("kind"));
    const id2 = idSchema.parse(context.req.param("id"));
    const now = (/* @__PURE__ */ new Date()).toISOString();
    const table = kind === "module" ? "course_modules" : kind === "lesson" ? "course_lessons" : "lesson_contents";
    await context.env.DB.batch([
      context.env.DB.prepare(
        `UPDATE ${table} SET archived_at=?,updated_at=? WHERE id=? AND archived_at IS NULL`
      ).bind(now, now, id2),
      createAuditStatement(context.env.DB, {
        requestId: context.get("requestId"),
        actorId: user.id,
        action: `COURSE_${kind.toUpperCase()}_ARCHIVED`,
        entityType: `COURSE_${kind.toUpperCase()}`,
        entityId: id2
      })
    ]);
    return context.json(
      success({ id: id2, archived: true }, context.get("requestId"))
    );
  }
);
platformRoutes.post(
  "/learning/courses/:id/enroll",
  sessionMiddleware({ required: true }),
  csrfMiddleware(),
  async (context) => {
    const { user } = requireAuth(context);
    const courseId = idSchema.parse(context.req.param("id"));
    const input = await parseJson(context, paymentSchema);
    const course = await context.env.DB.prepare(
      "SELECT * FROM learning_courses WHERE id=? AND status='PUBLISHED'"
    ).bind(courseId).first();
    if (!course)
      throw new AppError({
        code: "COURSE_NOT_FOUND",
        message: "The course is unavailable.",
        status: 404
      });
    const existing = await context.env.DB.prepare(
      "SELECT id FROM course_enrollments WHERE course_id=? AND user_id=?"
    ).bind(courseId, user.id).first("id");
    if (existing)
      throw new AppError({
        code: "ALREADY_ENROLLED",
        message: "You are already enrolled in this course.",
        status: 409
      });
    const paid = course.course_type === "PAID";
    if (paid && !input.transactionReference && input.paymentMethod !== "Cash")
      throw new AppError({
        code: "TRANSACTION_ID_REQUIRED",
        message: "A transaction reference is required for paid enrollment.",
        status: 422
      });
    const id2 = crypto.randomUUID(), legacyId = crypto.randomUUID(), now = (/* @__PURE__ */ new Date()).toISOString();
    const legacy = {
      course_id: courseId,
      user_id: user.id,
      payment_method: paid ? input.paymentMethod : null,
      transaction_id: paid ? input.transactionReference : null,
      payment_status: paid ? "pending" : "confirmed",
      approval_status: paid ? "pending" : "approved",
      progress: {},
      completed: false
    };
    const statements = [
      context.env.DB.prepare(
        "INSERT INTO website_submissions(id,submission_type,submitted_by,data_json,status,created_at,updated_at) VALUES(?,'course_registrations',?,?,'SUBMITTED',?,?)"
      ).bind(legacyId, user.id, JSON.stringify(legacy), now, now),
      context.env.DB.prepare(
        "INSERT INTO course_enrollments(id,legacy_submission_id,course_id,user_id,course_type,price_minor,currency,payment_status,enrollment_status,enrolled_at,created_at,updated_at) VALUES(?,?,?,?,?,?,?,?,?,?,?,?)"
      ).bind(
        id2,
        legacyId,
        courseId,
        user.id,
        String(course.course_type),
        Number(course.price_minor),
        String(course.currency),
        paid ? "SUBMITTED" : "NOT_REQUIRED",
        paid ? "PENDING" : "ENROLLED",
        now,
        now,
        now
      ),
      createAuditStatement(context.env.DB, {
        requestId: context.get("requestId"),
        actorId: user.id,
        action: "COURSE_ENROLLED",
        entityType: "COURSE_ENROLLMENT",
        entityId: id2,
        metadata: { courseId, courseType: course.course_type }
      })
    ];
    if (paid)
      statements.push(
        context.env.DB.prepare(
          "INSERT INTO learning_payments(id,domain_type,domain_id,user_id,expected_amount_minor,currency,payment_method,transaction_reference,status,submitted_at) VALUES(?,'COURSE',?,?,?,?,?,?, 'SUBMITTED',?)"
        ).bind(
          crypto.randomUUID(),
          id2,
          user.id,
          Number(course.price_minor),
          String(course.currency),
          input.paymentMethod,
          input.transactionReference || null,
          now
        )
      );
    await context.env.DB.batch(statements);
    return context.json(
      success(
        {
          id: id2,
          status: paid ? "PENDING" : "ENROLLED",
          paymentStatus: paid ? "SUBMITTED" : "NOT_REQUIRED"
        },
        context.get("requestId")
      ),
      201
    );
  }
);
platformRoutes.post(
  "/learning/enrollments/:id/progress/:lessonId",
  sessionMiddleware({ required: true }),
  csrfMiddleware(),
  async (context) => {
    const { user } = requireAuth(context);
    const enrollmentId = idSchema.parse(context.req.param("id")), lessonId = idSchema.parse(context.req.param("lessonId"));
    const input = await parseJson(
      context,
      external_exports.object({ completed: external_exports.boolean() })
    );
    const enrollment = await context.env.DB.prepare(
      "SELECT * FROM course_enrollments WHERE id=? AND user_id=?"
    ).bind(enrollmentId, user.id).first();
    if (!enrollment)
      throw new AppError({
        code: "ENROLLMENT_NOT_FOUND",
        message: "Enrollment not found.",
        status: 404
      });
    if (!["ENROLLED", "IN_PROGRESS", "COMPLETED"].includes(
      String(enrollment.enrollment_status)
    ) || enrollment.course_type === "PAID" && enrollment.payment_status !== "VERIFIED")
      throw new AppError({
        code: "ENROLLMENT_INACTIVE",
        message: "The enrollment is not active.",
        status: 403
      });
    const valid = await context.env.DB.prepare(
      "SELECT id FROM course_lessons WHERE id=? AND course_id=? AND status='PUBLISHED' AND archived_at IS NULL"
    ).bind(lessonId, enrollment.course_id).first("id");
    if (!valid)
      throw new AppError({
        code: "LESSON_NOT_FOUND",
        message: "Lesson not found.",
        status: 404
      });
    if (input.completed)
      await context.env.DB.prepare(
        "INSERT OR REPLACE INTO course_progress(enrollment_id,lesson_id,completed_at) VALUES(?,?,?)"
      ).bind(enrollmentId, lessonId, (/* @__PURE__ */ new Date()).toISOString()).run();
    else
      await context.env.DB.prepare(
        "DELETE FROM course_progress WHERE enrollment_id=? AND lesson_id=?"
      ).bind(enrollmentId, lessonId).run();
    const total = await context.env.DB.prepare(
      "SELECT COUNT(*) AS count FROM course_lessons WHERE course_id=? AND status='PUBLISHED' AND archived_at IS NULL"
    ).bind(enrollment.course_id).first("count") ?? 0;
    const done = await context.env.DB.prepare(
      "SELECT COUNT(*) AS count FROM course_progress p JOIN course_lessons l ON l.id=p.lesson_id WHERE p.enrollment_id=? AND l.status='PUBLISHED' AND l.archived_at IS NULL"
    ).bind(enrollmentId).first("count") ?? 0;
    const complete = total > 0 && done === total, now = (/* @__PURE__ */ new Date()).toISOString();
    await context.env.DB.batch([
      context.env.DB.prepare(
        "UPDATE course_enrollments SET enrollment_status=?,last_activity_at=?,completed_at=?,updated_at=? WHERE id=?"
      ).bind(
        complete ? "COMPLETED" : done > 0 ? "IN_PROGRESS" : "ENROLLED",
        now,
        complete ? now : null,
        now,
        enrollmentId
      ),
      context.env.DB.prepare(
        "UPDATE website_submissions SET data_json=json_set(data_json,'$.completed',?,'$.completion_date',?),updated_at=? WHERE id=?"
      ).bind(
        complete,
        complete ? now : null,
        now,
        enrollment.legacy_submission_id
      ),
      createAuditStatement(context.env.DB, {
        requestId: context.get("requestId"),
        actorId: user.id,
        action: complete ? "COURSE_COMPLETED" : "COURSE_PROGRESS_UPDATED",
        entityType: "COURSE_ENROLLMENT",
        entityId: enrollmentId,
        metadata: { completedLessons: done, totalLessons: total }
      })
    ]);
    return context.json(
      success(
        {
          completedLessons: done,
          totalLessons: total,
          percentage: total ? Math.round(done / total * 100) : 0,
          status: complete ? "COMPLETED" : done > 0 ? "IN_PROGRESS" : "ENROLLED"
        },
        context.get("requestId")
      )
    );
  }
);
platformRoutes.get(
  "/learning/dashboard",
  sessionMiddleware({ required: true }),
  async (context) => {
    const { user } = requireAuth(context);
    const rows = await context.env.DB.prepare(
      "SELECT e.*,c.title,c.thumbnail_url,c.instructor,(SELECT COUNT(*) FROM course_lessons l WHERE l.course_id=e.course_id AND l.status='PUBLISHED' AND l.archived_at IS NULL) AS total_lessons,(SELECT COUNT(*) FROM course_progress p JOIN course_lessons l ON l.id=p.lesson_id WHERE p.enrollment_id=e.id AND l.archived_at IS NULL) AS completed_lessons,(SELECT json_group_array(p.lesson_id) FROM course_progress p JOIN course_lessons l ON l.id=p.lesson_id WHERE p.enrollment_id=e.id AND l.archived_at IS NULL) AS completed_lesson_ids_json FROM course_enrollments e JOIN learning_courses c ON c.id=e.course_id WHERE e.user_id=? ORDER BY e.enrolled_at DESC"
    ).bind(user.id).all();
    const courses = rows.results.map((row) => ({
      ...row,
      completed_lesson_ids: parseList(
        String(row.completed_lesson_ids_json || "[]")
      ),
      progress: Number(row.total_lessons) ? Math.round(
        Number(row.completed_lessons) / Number(row.total_lessons) * 100
      ) : 0
    }));
    const events = await context.env.DB.prepare(
      `SELECT r.*,e.title,e.slug,e.starts_at,e.ends_at,e.location_type,e.venue,e.online_platform,e.online_url,e.meeting_instructions,
       e.certificate_available,e.certificate_require_registration,e.certificate_require_payment,e.certificate_require_attendance,
       (SELECT status FROM certificate_requests c WHERE c.domain_type='EVENT' AND c.event_registration_id=r.id) AS certificate_status,
       CASE WHEN e.certificate_available=1 AND COALESCE(r.certificate_eligible_override,
         CASE WHEN (e.certificate_require_registration=0 OR r.registration_status='APPROVED')
          AND (e.certificate_require_payment=0 OR r.event_type='FREE' OR r.payment_status='VERIFIED')
          AND (e.certificate_require_attendance=0 OR r.attendance_status='PRESENT') THEN 1 ELSE 0 END)=1 THEN 1 ELSE 0 END AS certificate_eligible
       FROM event_registrations r JOIN managed_events e ON e.id=r.event_id WHERE r.user_id=? ORDER BY r.registered_at DESC`
    ).bind(user.id).all();
    const certificates = await context.env.DB.prepare(
      "SELECT id,certificate_number,status,course_title,issued_at,certificate_url FROM certificates WHERE user_id=? ORDER BY issued_at DESC"
    ).bind(user.id).all();
    return context.json(
      success(
        { courses, events: events.results, certificates: certificates.results },
        context.get("requestId")
      )
    );
  }
);
platformRoutes.get(
  "/admin/enrollments",
  sessionMiddleware({ required: true }),
  requirePermission("course.read"),
  async (context) => {
    const rows = await context.env.DB.prepare(
      "SELECT e.*,u.display_name AS student,u.primary_email AS email,c.title,(SELECT COUNT(*) FROM course_lessons l WHERE l.course_id=e.course_id AND l.status='PUBLISHED' AND l.archived_at IS NULL) AS total_lessons,(SELECT COUNT(*) FROM course_progress p JOIN course_lessons l ON l.id=p.lesson_id WHERE p.enrollment_id=e.id AND l.archived_at IS NULL) AS completed_lessons,(SELECT status FROM certificate_requests r WHERE r.enrollment_id=e.legacy_submission_id) AS certificate_status FROM course_enrollments e JOIN users u ON u.id=e.user_id JOIN learning_courses c ON c.id=e.course_id ORDER BY e.enrolled_at DESC LIMIT 1000"
    ).all();
    return context.json(
      success(
        rows.results.map((row) => ({
          ...row,
          price: Number(row.price_minor) / 100,
          progress: Number(row.total_lessons) ? Math.round(
            Number(row.completed_lessons) / Number(row.total_lessons) * 100
          ) : 0
        })),
        context.get("requestId")
      )
    );
  }
);
platformRoutes.post(
  "/admin/enrollments/:id/decision",
  sessionMiddleware({ required: true }),
  csrfMiddleware(),
  requireAnyPermission(["course.manage", "finance.verify"]),
  async (context) => {
    const { user } = requireAuth(context);
    const id2 = idSchema.parse(context.req.param("id"));
    const input = await parseJson(context, decisionSchema2);
    const enrollment = await context.env.DB.prepare(
      "SELECT * FROM course_enrollments WHERE id=?"
    ).bind(id2).first();
    if (!enrollment)
      throw new AppError({
        code: "ENROLLMENT_NOT_FOUND",
        message: "Enrollment not found.",
        status: 404
      });
    const now = (/* @__PURE__ */ new Date()).toISOString();
    let enrollmentStatus = String(enrollment.enrollment_status), paymentStatus = String(enrollment.payment_status);
    if (input.action === "VERIFY_PAYMENT") {
      if (!user.permissions.includes("finance.verify"))
        throw new AppError({
          code: "PERMISSION_DENIED",
          message: "Payment verification permission is required.",
          status: 403
        });
      paymentStatus = "VERIFIED";
      enrollmentStatus = "ENROLLED";
    } else if (input.action === "APPROVE") enrollmentStatus = "ENROLLED";
    else if (input.action === "REJECT") {
      enrollmentStatus = "CANCELLED";
      paymentStatus = paymentStatus === "SUBMITTED" ? "REJECTED" : paymentStatus;
    } else if (input.action === "CANCEL") enrollmentStatus = "CANCELLED";
    await context.env.DB.batch([
      context.env.DB.prepare(
        "UPDATE course_enrollments SET enrollment_status=?,payment_status=?,cancelled_at=?,updated_at=? WHERE id=?"
      ).bind(
        enrollmentStatus,
        paymentStatus,
        enrollmentStatus === "CANCELLED" ? now : null,
        now,
        id2
      ),
      context.env.DB.prepare(
        "UPDATE website_submissions SET data_json=json_set(data_json,'$.payment_status',?,'$.approval_status',?),updated_at=? WHERE id=?"
      ).bind(
        paymentStatus === "VERIFIED" ? "confirmed" : paymentStatus.toLowerCase(),
        enrollmentStatus === "ENROLLED" ? "approved" : enrollmentStatus.toLowerCase(),
        now,
        enrollment.legacy_submission_id
      ),
      context.env.DB.prepare(
        "UPDATE learning_payments SET status=?,verified_at=?,verified_by=?,decision_reason=? WHERE domain_type='COURSE' AND domain_id=?"
      ).bind(
        paymentStatus,
        paymentStatus === "VERIFIED" ? now : null,
        paymentStatus === "VERIFIED" ? user.id : null,
        optional(input.reason),
        id2
      ),
      createAuditStatement(context.env.DB, {
        requestId: context.get("requestId"),
        actorId: user.id,
        action: `ENROLLMENT_${input.action}`,
        entityType: "COURSE_ENROLLMENT",
        entityId: id2,
        reason: input.reason
      })
    ]);
    return context.json(
      success(
        { id: id2, enrollmentStatus, paymentStatus },
        context.get("requestId")
      )
    );
  }
);
platformRoutes.get(
  "/admin/event-registrations",
  sessionMiddleware({ required: true }),
  requirePermission("event.read"),
  async (context) => {
    const eventId = context.req.query("eventId");
    const rows = await context.env.DB.prepare(
      `SELECT r.*,e.title AS event_title,p.id AS payment_id,p.payment_method,p.transaction_reference,p.payer_phone AS payment_payer_phone,p.status AS provider_payment_status,
       (SELECT status FROM certificate_requests c WHERE c.domain_type='EVENT' AND c.event_registration_id=r.id) AS certificate_status
       FROM event_registrations r JOIN managed_events e ON e.id=r.event_id
       LEFT JOIN learning_payments p ON p.domain_type='EVENT' AND p.domain_id=r.id
       WHERE (? IS NULL OR r.event_id=?) ORDER BY r.registered_at DESC LIMIT 1000`
    ).bind(eventId || null, eventId || null).all();
    return context.json(success(rows.results, context.get("requestId")));
  }
);
platformRoutes.get(
  "/admin/event-registrations.csv",
  sessionMiddleware({ required: true }),
  requirePermission("event.read"),
  async (context) => {
    const eventId = idSchema.parse(context.req.query("eventId"));
    const rows = await context.env.DB.prepare(
      `SELECT r.participant_name,r.email,r.phone,r.registration_status,r.payment_status,r.attendance_status,r.registered_at,
       p.payment_method,p.transaction_reference,p.payer_phone FROM event_registrations r
       LEFT JOIN learning_payments p ON p.domain_type='EVENT' AND p.domain_id=r.id WHERE r.event_id=? ORDER BY r.registered_at`
    ).bind(eventId).all();
    const escape = /* @__PURE__ */ __name((value) => `"${String(value ?? "").replace(/"/gu, '""')}"`, "escape");
    const keys2 = ["participant_name", "email", "phone", "registration_status", "payment_status", "attendance_status", "registered_at", "payment_method", "transaction_reference", "payer_phone"];
    const csv = [keys2.join(","), ...rows.results.map((row) => keys2.map((key) => escape(row[key])).join(","))].join("\r\n");
    return new Response(`\uFEFF${csv}`, { headers: { "content-type": "text/csv; charset=utf-8", "content-disposition": `attachment; filename="event-${eventId}-participants.csv"` } });
  }
);
platformRoutes.post(
  "/learning/events/:id/register",
  sessionMiddleware({ required: true }),
  csrfMiddleware(),
  async (context) => {
    const { user } = requireAuth(context);
    const eventId = idSchema.parse(context.req.param("id"));
    const input = await parseJson(context, eventRegistrationSchema);
    const event = await context.env.DB.prepare(
      "SELECT * FROM managed_events WHERE id=? AND workflow_status='PUBLISHED'"
    ).bind(eventId).first();
    if (!event)
      throw new AppError({
        code: "EVENT_NOT_FOUND",
        message: "The event is unavailable.",
        status: 404
      });
    if (Number(event.registration_required) !== 1 || event.registration_mode !== "INTERNAL")
      throw new AppError({ code: "INTERNAL_REGISTRATION_UNAVAILABLE", message: "This event does not accept internal registrations.", status: 409 });
    const nowTime = Date.now();
    const capacity = Math.max(0, Number(event.max_participants || 0));
    const reserved = await context.env.DB.prepare(
      "SELECT COUNT(*) AS count FROM event_registrations WHERE event_id=? AND registration_status IN ('PENDING','APPROVED')"
    ).bind(eventId).first("count") ?? 0;
    const effectiveRegistrationStatus = deriveRegistrationStatus({
      startsAt: String(event.starts_at),
      endsAt: String(event.ends_at),
      eventStatus: String(event.event_status),
      eventStatusOverride: event.event_status_override || null,
      registrationRequired: Number(event.registration_required) === 1,
      registrationMode: String(event.registration_mode),
      registrationOpensAt: event.registration_opens_at ? String(event.registration_opens_at) : null,
      registrationDeadline: event.registration_deadline ? String(event.registration_deadline) : null,
      registrationStatusOverride: event.registration_status_override || null,
      maxParticipants: capacity,
      reservedCount: reserved,
      registrationCapacityOverride: Number(event.registration_capacity_override) === 1
    }, nowTime);
    if (effectiveRegistrationStatus === "UPCOMING")
      throw new AppError({ code: "REGISTRATION_UPCOMING", message: "Registration has not opened yet.", status: 409 });
    if (effectiveRegistrationStatus === "FULL")
      throw new AppError({ code: "EVENT_FULL", message: "Registration is closed because this event is full.", status: 409 });
    if (effectiveRegistrationStatus !== "OPEN")
      throw new AppError({ code: "REGISTRATION_CLOSED", message: "Registration is closed for this event.", status: 409 });
    const paid = Number(event.payment_required) === 1;
    const fee = Number(event.fee_minor || 0);
    if (paid && (!input.paymentMethod || !input.transactionReference || !input.payerPhone))
      throw new AppError({
        code: "PAYMENT_REFERENCE_REQUIRED",
        message: "Paid event registration requires the mobile-wallet transaction ID and payer number.",
        status: 422
      });
    if (paid) {
      let methods = [];
      try {
        methods = JSON.parse(String(event.payment_methods_json || "[]"));
      } catch {
        methods = [];
      }
      if (!input.paymentMethod || !methods.includes(input.paymentMethod.toUpperCase()))
        throw new AppError({ code: "PAYMENT_METHOD_UNAVAILABLE", message: "Choose one of the payment methods configured for this event.", status: 422 });
    }
    const duplicate = await context.env.DB.prepare(
      "SELECT id FROM event_registrations WHERE event_id=? AND user_id=?"
    ).bind(eventId, user.id).first("id");
    if (duplicate)
      throw new AppError({
        code: "ALREADY_REGISTERED",
        message: "You are already registered for this event.",
        status: 409
      });
    if (paid) {
      const duplicatePayment = await context.env.DB.prepare(
        "SELECT id FROM learning_payments WHERE payment_method=? AND transaction_reference=?"
      ).bind(input.paymentMethod, input.transactionReference).first("id");
      if (duplicatePayment) throw new AppError({ code: "DUPLICATE_TRANSACTION", message: "This transaction ID has already been submitted.", status: 409 });
    }
    const id2 = crypto.randomUUID(), legacyId = crypto.randomUUID(), now = (/* @__PURE__ */ new Date()).toISOString();
    const legacy = {
      event_id: eventId,
      user_id: user.id,
      name: input.name,
      email: input.email,
      phone: input.phone || null,
      department: input.department || null,
      payment_method: paid ? input.paymentMethod : null,
      transaction_id: paid ? input.transactionReference : null,
      payment_status: paid ? "pending" : "confirmed",
      approval_status: paid ? "pending" : "approved"
    };
    const statements = [
      context.env.DB.prepare(
        "INSERT INTO website_submissions(id,submission_type,submitted_by,data_json,status,created_at,updated_at) VALUES(?,'event_registrations',?,?,'SUBMITTED',?,?)"
      ).bind(legacyId, user.id, JSON.stringify(legacy), now, now),
      context.env.DB.prepare(
        "INSERT INTO event_registrations(id,legacy_submission_id,event_id,user_id,participant_name,email,phone,event_type,fee_minor,currency,payment_status,registration_status,payer_phone,registered_at,updated_at) VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)"
      ).bind(
        id2,
        legacyId,
        eventId,
        user.id,
        input.name,
        input.email,
        optional(input.phone),
        paid ? "PAID" : "FREE",
        paid ? fee : 0,
        String(event.currency || "BDT"),
        paid ? "SUBMITTED" : "NOT_REQUIRED",
        paid ? "PENDING" : "APPROVED",
        paid ? input.payerPhone : null,
        now,
        now
      ),
      context.env.DB.prepare(
        "INSERT INTO event_registration_events(id,registration_id,event_id,actor_user_id,event_type,to_registration_status,to_payment_status,to_attendance_status,note,request_id,created_at) VALUES(?,?,?,?,?,?,?,?,?,?,?)"
      ).bind(crypto.randomUUID(), id2, eventId, user.id, "REGISTERED", paid ? "PENDING" : "APPROVED", paid ? "SUBMITTED" : "NOT_REQUIRED", "NOT_MARKED", "Participant submitted registration.", context.get("requestId"), now),
      createAuditStatement(context.env.DB, {
        requestId: context.get("requestId"),
        actorId: user.id,
        action: "EVENT_REGISTERED",
        entityType: "EVENT_REGISTRATION",
        entityId: id2,
        metadata: { eventId, eventType: paid ? "PAID" : "FREE" }
      })
    ];
    if (paid) {
      const paymentId = crypto.randomUUID();
      statements.push(
        context.env.DB.prepare(
          "INSERT INTO learning_payments(id,domain_type,domain_id,user_id,expected_amount_minor,currency,payment_method,transaction_reference,payer_phone,status,submitted_at,updated_at) VALUES(?,'EVENT',?,?,?,?,?,?,?,'SUBMITTED',?,?)"
        ).bind(paymentId, id2, user.id, fee, String(event.currency || "BDT"), input.paymentMethod, input.transactionReference, input.payerPhone, now, now),
        context.env.DB.prepare(
          "INSERT INTO learning_payment_events(id,payment_id,registration_id,actor_user_id,event_type,to_status,transaction_reference,note,request_id,created_at) VALUES(?,?,?,?,?,?,?,?,?,?)"
        ).bind(crypto.randomUUID(), paymentId, id2, user.id, "SUBMITTED", "SUBMITTED", input.transactionReference, "Participant submitted bKash payment details.", context.get("requestId"), now)
      );
    }
    await context.env.DB.batch(statements);
    return context.json(
      success(
        {
          id: id2,
          registeredAt: now,
          paymentStatus: paid ? "SUBMITTED" : "NOT_REQUIRED",
          registrationStatus: paid ? "PENDING" : "APPROVED"
        },
        context.get("requestId")
      ),
      201
    );
  }
);
platformRoutes.post(
  "/admin/event-registrations/:id/decision",
  sessionMiddleware({ required: true }),
  csrfMiddleware(),
  requireAnyPermission(["event.manage", "finance.verify"]),
  async (context) => {
    const { user } = requireAuth(context);
    const id2 = idSchema.parse(context.req.param("id"));
    const input = await parseJson(context, decisionSchema2);
    const row = await context.env.DB.prepare(
      "SELECT * FROM event_registrations WHERE id=?"
    ).bind(id2).first();
    if (!row)
      throw new AppError({
        code: "EVENT_REGISTRATION_NOT_FOUND",
        message: "Registration not found.",
        status: 404
      });
    let registration = String(row.registration_status), payment = String(row.payment_status), attendance = String(row.attendance_status);
    if (input.action === "VERIFY_PAYMENT") {
      if (!user.permissions.includes("finance.verify"))
        throw new AppError({
          code: "PERMISSION_DENIED",
          message: "Payment verification permission is required.",
          status: 403
        });
      payment = "VERIFIED";
      registration = "APPROVED";
    } else if (input.action === "APPROVE") registration = "APPROVED";
    else if (input.action === "REJECT") {
      registration = "REJECTED";
      if (["PENDING", "SUBMITTED"].includes(payment)) payment = "REJECTED";
    } else if (input.action === "CANCEL") registration = "CANCELLED";
    else if (input.action === "PRESENT") attendance = "PRESENT";
    else if (input.action === "ABSENT") attendance = "ABSENT";
    const now = (/* @__PURE__ */ new Date()).toISOString();
    const paymentRow = await context.env.DB.prepare("SELECT id,status,transaction_reference FROM learning_payments WHERE domain_type='EVENT' AND domain_id=?").bind(id2).first();
    const statements = [
      context.env.DB.prepare(
        "UPDATE event_registrations SET registration_status=?,payment_status=?,attendance_status=?,attendance_marked_at=?,attendance_marked_by=?,reviewed_at=?,reviewed_by=?,updated_at=? WHERE id=?"
      ).bind(registration, payment, attendance, ["PRESENT", "ABSENT"].includes(attendance) ? now : row.attendance_marked_at, ["PRESENT", "ABSENT"].includes(attendance) ? user.id : row.attendance_marked_by, now, user.id, now, id2),
      context.env.DB.prepare(
        "INSERT INTO event_registration_events(id,registration_id,event_id,actor_user_id,event_type,from_registration_status,to_registration_status,from_payment_status,to_payment_status,from_attendance_status,to_attendance_status,note,request_id,created_at) VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,?)"
      ).bind(crypto.randomUUID(), id2, row.event_id, user.id, input.action, row.registration_status, registration, row.payment_status, payment, row.attendance_status, attendance, input.reason || null, context.get("requestId"), now),
      context.env.DB.prepare(
        `INSERT OR IGNORE INTO user_notifications(id,user_id,notification_type,title,message,action_url,related_entity_type,related_entity_id,priority,dedupe_key)
         VALUES(?,?,?, ?,?,'/dashboard','EVENT_REGISTRATION',?,'NORMAL',?)`
      ).bind(crypto.randomUUID(), row.user_id, `EVENT_${input.action}`, "Event registration updated", `Your registration is now ${registration.toLowerCase()}, payment ${payment.toLowerCase()}, and attendance ${attendance.toLowerCase().replace(/_/gu, " ")}.`, id2, `event-registration:${id2}:${input.action}:${now}`),
      createAuditStatement(context.env.DB, {
        requestId: context.get("requestId"),
        actorId: user.id,
        action: `EVENT_REGISTRATION_${input.action}`,
        entityType: "EVENT_REGISTRATION",
        entityId: id2,
        reason: input.reason
      })
    ];
    if (paymentRow && payment !== row.payment_status) statements.push(
      context.env.DB.prepare("UPDATE learning_payments SET status=?,verified_at=?,verified_by=?,decision_reason=?,updated_at=? WHERE id=?").bind(payment, payment === "VERIFIED" ? now : null, payment === "VERIFIED" ? user.id : null, input.reason || null, now, paymentRow.id),
      context.env.DB.prepare("INSERT INTO learning_payment_events(id,payment_id,registration_id,actor_user_id,event_type,from_status,to_status,transaction_reference,note,request_id,created_at) VALUES(?,?,?,?,?,?,?,?,?,?,?)").bind(crypto.randomUUID(), paymentRow.id, id2, user.id, input.action, paymentRow.status, payment, paymentRow.transaction_reference, input.reason || null, context.get("requestId"), now)
    );
    await context.env.DB.batch(statements);
    return context.json(
      success(
        {
          id: id2,
          registrationStatus: registration,
          paymentStatus: payment,
          attendanceStatus: attendance
        },
        context.get("requestId")
      )
    );
  }
);
platformRoutes.get(
  "/admin/event-registrations/:id/history",
  sessionMiddleware({ required: true }),
  requirePermission("event.read"),
  async (context) => {
    const id2 = idSchema.parse(context.req.param("id"));
    const [registration, payment] = await Promise.all([
      context.env.DB.prepare("SELECT h.*,u.display_name AS actor FROM event_registration_events h LEFT JOIN users u ON u.id=h.actor_user_id WHERE h.registration_id=? ORDER BY h.created_at DESC").bind(id2).all(),
      context.env.DB.prepare("SELECT h.*,u.display_name AS actor FROM learning_payment_events h LEFT JOIN users u ON u.id=h.actor_user_id WHERE h.registration_id=? ORDER BY h.created_at DESC").bind(id2).all()
    ]);
    return context.json(success({ registration: registration.results, payment: payment.results }, context.get("requestId")));
  }
);

// node_modules/htmlparser2/node_modules/entities/dist/decode-codepoint.js
var decodeMap = /* @__PURE__ */ new Map([
  [0, 65533],
  // C1 Unicode control character reference replacements
  [128, 8364],
  [130, 8218],
  [131, 402],
  [132, 8222],
  [133, 8230],
  [134, 8224],
  [135, 8225],
  [136, 710],
  [137, 8240],
  [138, 352],
  [139, 8249],
  [140, 338],
  [142, 381],
  [145, 8216],
  [146, 8217],
  [147, 8220],
  [148, 8221],
  [149, 8226],
  [150, 8211],
  [151, 8212],
  [152, 732],
  [153, 8482],
  [154, 353],
  [155, 8250],
  [156, 339],
  [158, 382],
  [159, 376]
]);
function replaceCodePoint(codePoint) {
  if (codePoint >= 55296 && codePoint <= 57343 || codePoint > 1114111) {
    return 65533;
  }
  return decodeMap.get(codePoint) ?? codePoint;
}
__name(replaceCodePoint, "replaceCodePoint");

// node_modules/htmlparser2/node_modules/entities/dist/internal/decode-shared.js
function decodeBase64(input) {
  const binary = atob(input);
  const evenLength = binary.length & ~1;
  const out = new Uint16Array(evenLength / 2);
  for (let index = 0, outIndex = 0; index < evenLength; index += 2) {
    const lo = binary.charCodeAt(index);
    const hi = binary.charCodeAt(index + 1);
    out[outIndex++] = lo | hi << 8;
  }
  return out;
}
__name(decodeBase64, "decodeBase64");

// node_modules/htmlparser2/node_modules/entities/dist/generated/decode-data-html.js
var htmlDecodeTree = /* @__PURE__ */ decodeBase64("QR08ALkAAgH6AYsDNQR2BO0EPgXZBQEGLAbdBxMISQrvCmQLfQurDKQNLw4fD4YPpA+6D/IPAAAAAAAAAAAAAAAAKhBMEY8TmxUWF2EYLBkxGuAa3RsJHDscWR8YIC8jSCSIJcMl6ie3Ku8rEC0CLjoupS7kLgAIRU1hYmNmZ2xtbm9wcnN0dVQAWgBeAGUAaQBzAHcAfgCBAIQAhwCSAJoAoACsALMAbABpAGcAO4DGAMZAUAA7gCYAJkBjAHUAdABlADuAwQDBQHIiZXZlAAJhAAFpeW0AcgByAGMAO4DCAMJAEGRyAADgNdgE3XIAYQB2AGUAO4DAAMBA8CFoYZFj4SFjcgBhZAAAoFMqAAFncIsAjgBvAG4ABGFmAADgNdg43fAlbHlGdW5jdGlvbgCgYSBpAG4AZwA7gMUAxUAAAWNzpACoAHIAAOA12Jzc6SFnbgCgVCJpAGwAZABlADuAwwDDQG0AbAA7gMQAxEAABGFjZWZvcnN1xQDYANoA7QDxAPYA+QD8AAABY3LJAM8AayNzbGFzaAAAoBYidgHTANUAAKDnKmUAZAAAoAYjeQARZIABY3J0AOAA5QDrAGEidXNlAACgNSLuI291bGxpcwCgLCFhAJJjcgAA4DXYBd1wAGYAAOA12Dnd5SF2ZdhiYwDyAOoAbSJwZXEAAKBOIgAHSE9hY2RlZmhpbG9yc3UXARoBHwE6AVIBVQFiAWQBZgGCAakB6QHtAfIBYwB5ACdkUABZADuAqQCpQIABY3B5ACUBKAE1AfUhdGUGYWmg0iJ0KGFsRGlmZmVyZW50aWFsRAAAoEUhbCJleXMAAKAtIQACYWVpb0EBRAFKAU0B8iFvbgxhZABpAGwAO4DHAMdAcgBjAAhhbiJpbnQAAKAwIm8AdAAKYQABZG5ZAV0BaSJsbGEAuGB0I2VyRG90ALdg8gA5AWkAp2NyImNsZQAAAkRNUFRwAXQBeQF9AW8AdAAAoJkiaSJudXMAAKCWIuwhdXMAoJUiaSJtZXMAAKCXIm8AAAFjc4cBlAFrKndpc2VDb250b3VySW50ZWdyYWwAAKAyImUjQ3VybHkAAAFEUZwBpAFvJXVibGVRdW90ZQAAoB0gdSJvdGUAAKAZIAACbG5wdbABtgHNAdgBbwBuAGWgNyIAoHQqgAFnaXQAvAHBAcUB8iJ1ZW50AKBhIm4AdAAAoC8i7yV1ckludGVncmFsAKAuIgABZnLRAdMBAKACIe8iZHVjdACgECJuLnRlckNsb2Nrd2lzZUNvbnRvdXJJbnRlZ3JhbAAAoDMi7yFzcwCgLypjAHIAAOA12J7ccABDoNMiYQBwAACgTSKABURKU1phY2VmaW9zAAsCEgIVAhgCGwIsAjQCOQI9AnMCfwNvoEUh9CJyYWhkAKARKWMAeQACZGMAeQAFZGMAeQAPZIABZ3JzACECJQIoAuchZXIAoCEgcgAAoKEhaAB2AACg5CoAAWF5MAIzAvIhb24OYRRkbAB0oAciYQCUY3IAAOA12AfdAAFhZkECawIAAWNtRQJnAvIjaXRpY2FsAAJBREdUUAJUAl8CYwJjInV0ZQC0YG8AdAFZAloC2WJiJGxlQWN1dGUA3WJyImF2ZQBgYGkibGRlANxi7yFuZACgxCJmJWVyZW50aWFsRAAAoEYhcAR9AgAAAAAAAIECjgIAABoDZgAA4DXYO91EoagAhQKJAm8AdAAAoNwgcSJ1YWwAAKBQIuIhbGUAA0NETFJVVpkCqAK1Au8C/wIRA28AbgB0AG8AdQByAEkAbgB0AGUAZwByAGEA7ADEAW8AdAKvAgAAAACwAqhgbiNBcnJvdwAAoNMhAAFlb7kC0AJmAHQAgAFBUlQAwQLGAs0CciJyb3cAAKDQIekkZ2h0QXJyb3cAoNQhZQDlACsCbgBnAAABTFLWAugC5SFmdAABQVLcAuECciJyb3cAAKD4J+kkZ2h0QXJyb3cAoPon6SRnaHRBcnJvdwCg+SdpImdodAAAAUFU9gL7AnIicm93AACg0iFlAGUAAKCoInAAQQIGAwAAAAALA3Iicm93AACg0SFvJHduQXJyb3cAAKDVIWUlcnRpY2FsQmFyAACgJSJuAAADQUJMUlRhJAM2AzoDWgNxA3oDciJyb3cAAKGTIUJVLAMwA2EAcgAAoBMpcCNBcnJvdwAAoPUhciJldmUAEWPlIWZ00gJDAwAASwMAAFIDaSVnaHRWZWN0b3IAAKBQKWUkZVZlY3RvcgAAoF4p5SJjdG9yQqC9IWEAcgAAoFYpaSJnaHQA1AFiAwAAaQNlJGVWZWN0b3IAAKBfKeUiY3RvckKgwSFhAHIAAKBXKWUAZQBBoKQiciJyb3cAAKCnIXIAcgBvAPcAtAIAAWN0gwOHA3IAAOA12J/c8iFvaxBhAAhOVGFjZGZnbG1vcHFzdHV4owOlA6kDsAO/A8IDxgPNA9ID8gP9AwEEFAQeBCAEJQRHAEphSAA7gNAA0EBjAHUAdABlADuAyQDJQIABYWl5ALYDuQO+A/Ihb24aYXIAYwA7gMoAykAtZG8AdAAWYXIAAOA12AjdcgBhAHYAZQA7gMgAyEDlIm1lbnQAoAgiAAFhcNYD2QNjAHIAEmF0AHkAUwLhAwAAAADpA20lYWxsU3F1YXJlAACg+yVlJ3J5U21hbGxTcXVhcmUAAKCrJQABZ3D2A/kDbwBuABhhZgAA4DXYPN3zImlsb26VY3UAAAFhaQYEDgRsAFSgdSppImxkZQAAoEIi7CNpYnJpdW0AoMwhAAFjaRgEGwRyAACgMCFtAACgcyphAJdjbQBsADuAywDLQAABaXApBC0E8yF0cwCgAyLvJG5lbnRpYWxFAKBHIYACY2Zpb3MAPQQ/BEMEXQRyBHkAJGRyAADgNdgJ3WwibGVkAFMCTAQAAAAAVARtJWFsbFNxdWFyZQAAoPwlZSdyeVNtYWxsU3F1YXJlAACgqiVwA2UEAABpBAAAAABtBGYAAOA12D3dwSFsbACgACLyI2llcnRyZgCgMSFjAPIAcQQABkpUYWJjZGZnb3JzdIgEiwSOBJMElwSkBKcEqwStBLIE5QTqBGMAeQADZDuAPgA+QO0hbWFkoJMD3GNyImV2ZQAeYYABZWl5AJ0EoASjBOQhaWwiYXIAYwAcYRNkbwB0ACBhcgAA4DXYCt0AoNkicABmAADgNdg+3eUiYXRlcgADRUZHTFNUvwTIBM8E1QTZBOAEcSJ1YWwATKBlIuUhc3MAoNsidSRsbEVxdWFsAACgZyJyI2VhdGVyAACgoirlIXNzAKB3IuwkYW50RXF1YWwAoH4qaSJsZGUAAKBzImMAcgAA4DXYotwAoGsiAARBYWNmaW9zdfkE/QQFBQgFCwUTBSIFKwVSIkRjeQAqZAABY3QBBQQFZQBrAMdiXmDpIXJjJGFyAACgDCFsJWJlcnRTcGFjZQAAoAsh8AEYBQAAGwVmAACgDSHpJXpvbnRhbExpbmUAoAAlAAFjdCYFKAXyABIF8iFvayZhbQBwAEQBMQU5BW8AdwBuAEgAdQBtAPAAAAFxInVhbAAAoE8iAAdFSk9hY2RmZ21ub3N0dVMFVgVZBVwFYwVtBXAFcwV6BZAFtgXFBckFzQVjAHkAFWTsIWlnMmFjAHkAAWRjAHUAdABlADuAzQDNQAABaXlnBWwFcgBjADuAzgDOQBhkbwB0ADBhcgAAoBEhcgBhAHYAZQA7gMwAzEAAoREhYXB/BYsFAAFjZ4MFhQVyACphaSNuYXJ5SQAAoEghbABpAGUA8wD6AvQBlQUAAKUFZaAsIgABZ3KaBZ4F8iFhbACgKyLzI2VjdGlvbgCgwiJpI3NpYmxlAAABQ1SsBbEFbyJtbWEAAKBjIGkibWVzAACgYiCAAWdwdAC8Bb8FwwVvAG4ALmFmAADgNdhA3WEAmWNjAHIAAKAQIWkibGRlAChh6wHSBQAA1QVjAHkABmRsADuAzwDPQIACY2Zvc3UA4QXpBe0F8gX9BQABaXnlBegFcgBjADRhGWRyAADgNdgN3XAAZgAA4DXYQd3jAfcFAAD7BXIAAOA12KXc8iFjeQhk6yFjeQRkgANISmFjZm9zAAwGDwYSBhUGHQYhBiYGYwB5ACVkYwB5AAxk8CFwYZpjAAFleRkGHAbkIWlsNmEaZHIAAOA12A7dcABmAADgNdhC3WMAcgAA4DXYptyABUpUYWNlZmxtb3N0AD0GQAZDBl4GawZkB2gHcAd0B80H2gdjAHkACWQ7gDwAPECAAmNtbnByAEwGTwZSBlUGWwb1IXRlOWHiIWRhm2NnAACg6ifsI2FjZXRyZgCgEiFyAACgniGAAWFleQBkBmcGagbyIW9uPWHkIWlsO2EbZAABZnNvBjQHdAAABUFDREZSVFVWYXKABp4GpAbGBssG3AYDByEHwQIqBwABbnKEBowGZyVsZUJyYWNrZXQAAKDoJ/Ihb3cAoZAhQlKTBpcGYQByAACg5CHpJGdodEFycm93AKDGIWUjaWxpbmcAAKAII28A9QGqBgAAsgZiJWxlQnJhY2tldAAAoOYnbgDUAbcGAAC+BmUkZVZlY3RvcgAAoGEp5SJjdG9yQqDDIWEAcgAAoFkpbCJvb3IAAKAKI2kiZ2h0AAABQVbSBtcGciJyb3cAAKCUIeUiY3RvcgCgTikAAWVy4AbwBmUAAKGjIkFW5gbrBnIicm93AACgpCHlImN0b3IAoFopaSNhbmdsZQBCorIi+wYAAAAA/wZhAHIAAKDPKXEidWFsAACgtCJwAIABRFRWAAoHEQcYB+8kd25WZWN0b3IAoFEpZSRlVmVjdG9yAACgYCnlImN0b3JCoL8hYQByAACgWCnlImN0b3JCoLwhYQByAACgUilpAGcAaAB0AGEAcgByAG8A9wDMAnMAAANFRkdMU1Q/B0cHTgdUB1gHXwfxJXVhbEdyZWF0ZXIAoNoidSRsbEVxdWFsAACgZiJyI2VhdGVyAACgdiLlIXNzAKChKuwkYW50RXF1YWwAoH0qaSJsZGUAAKByInIAAOA12A/dZaDYIuYjdGFycm93AKDaIWkiZG90AD9hgAFucHcAege1B7kHZwAAAkxSbHKCB5QHmwerB+UhZnQAAUFSiAeNB3Iicm93AACg9SfpJGdodEFycm93AKD3J+kkZ2h0QXJyb3cAoPYn5SFmdAABYXLcAqEHaQBnAGgAdABhAHIAcgBvAPcA5wJpAGcAaAB0AGEAcgByAG8A9wDuAmYAAOA12EPdZQByAAABTFK/B8YHZSRmdEFycm93AACgmSHpJGdodEFycm93AKCYIYABY2h0ANMH1QfXB/IAWgYAoLAh8iFva0FhAKBqIgAEYWNlZmlvc3XpB+wH7gf/BwMICQgOCBEIcAAAoAUpeQAcZAABZGzyB/kHaSR1bVNwYWNlAACgXyBsI2ludHJmAACgMyFyAADgNdgQ3e4jdXNQbHVzAKATInAAZgAA4DXYRN1jAPIA/gecY4AESmFjZWZvc3R1ACEIJAgoCDUIgQiFCDsKQApHCmMAeQAKZGMidXRlAENhgAFhZXkALggxCDQI8iFvbkdh5CFpbEVhHWSAAWdzdwA7CGEIfQjhInRpdmWAAU1UVgBECEwIWQhlJWRpdW1TcGFjZQAAoAsgaABpAAABY25SCFMIawBTAHAAYQBjAOUASwhlAHIAeQBUAGgAaQDuAFQI9CFlZAABR0xnCHUIcgBlAGEAdABlAHIARwByAGUAYQB0AGUA8gDrBGUAcwBzAEwAZQBzAPMA2wdMImluZQAKYHIAAOA12BHdAAJCbnB0jAiRCJkInAhyImVhawAAoGAgwiZyZWFraW5nU3BhY2WgYGYAAKAVIUOq7CqzCMIIzQgAAOcIGwkAAAAAAAAtCQAAbwkAAIcJAACdCcAJGQoAADQKAAFvdbYIvAjuI2dydWVudACgYiJwIkNhcAAAoG0ibyh1YmxlVmVydGljYWxCYXIAAKAmIoABbHF4ANII1wjhCOUibWVudACgCSL1IWFsVKBgImkibGRlAADgQiI4A2kic3RzAACgBCJyI2VhdGVyAACjbyJFRkdMU1T1CPoIAgkJCQ0JFQlxInVhbAAAoHEidSRsbEVxdWFsAADgZyI4A3IjZWF0ZXIAAOBrIjgD5SFzcwCgeSLsJGFudEVxdWFsAOB+KjgDaSJsZGUAAKB1IvUhbXBEASAJJwnvI3duSHVtcADgTiI4A3EidWFsAADgTyI4A2UAAAFmczEJRgn0JFRyaWFuZ2xlQqLqIj0JAAAAAEIJYQByAADgzyk4A3EidWFsAACg7CJzAICibiJFR0xTVABRCVYJXAlhCWkJcSJ1YWwAAKBwInIjZWF0ZXIAAKB4IuUhc3MA4GoiOAPsJGFudEVxdWFsAOB9KjgDaSJsZGUAAKB0IuUic3RlZAABR0x1CX8J8iZlYXRlckdyZWF0ZXIA4KIqOAPlI3NzTGVzcwDgoSo4A/IjZWNlZGVzAKGAIkVTjwmVCXEidWFsAADgryo4A+wkYW50RXF1YWwAoOAiAAFlaaAJqQl2JmVyc2VFbGVtZW50AACgDCLnJWh0VHJpYW5nbGVCousitgkAAAAAuwlhAHIAAODQKTgDcSJ1YWwAAKDtIgABcXXDCeAJdSNhcmVTdQAAAWJwywnVCfMhZXRF4I8iOANxInVhbAAAoOIi5SJyc2V0ReCQIjgDcSJ1YWwAAKDjIoABYmNwAOYJ8AkNCvMhZXRF4IIi0iBxInVhbAAAoIgi4yJlZWRzgKGBIkVTVAD6CQAKBwpxInVhbAAA4LAqOAPsJGFudEVxdWFsAKDhImkibGRlAADgfyI4A+UicnNldEXggyLSIHEidWFsAACgiSJpImxkZQCAoUEiRUZUACIKJwouCnEidWFsAACgRCJ1JGxsRXF1YWwAAKBHImkibGRlAACgSSJlJXJ0aWNhbEJhcgAAoCQiYwByAADgNdip3GkAbABkAGUAO4DRANFAnWMAB0VhY2RmZ21vcHJzdHV2XgphCmgKcgp2CnoKgQqRCpYKqwqtCrsKyArNCuwhaWdSYWMAdQB0AGUAO4DTANNAAAFpeWwKcQpyAGMAO4DUANRAHmRiImxhYwBQYXIAAOA12BLdcgBhAHYAZQA7gNIA0kCAAWFlaQCHCooKjQpjAHIATGFnAGEAqWNjInJvbgCfY3AAZgAA4DXYRt3lI25DdXJseQABRFGeCqYKbyV1YmxlUXVvdGUAAKAcIHUib3RlAACgGCAAoFQqAAFjbLEKtQpyAADgNdiq3GEAcwBoADuA2ADYQGkAbAHACsUKZABlADuA1QDVQGUAcwAAoDcqbQBsADuA1gDWQGUAcgAAAUJQ0wrmCgABYXLXCtoKcgAAoD4gYQBjAAABZWvgCuIKAKDeI2UAdAAAoLQjYSVyZW50aGVzaXMAAKDcI4AEYWNmaGlsb3JzAP0KAwsFCwkLCwsMCxELIwtaC3IjdGlhbEQAAKACInkAH2RyAADgNdgT3WkApmOgY/Ujc01pbnVzsWAAAWlwFQsgC24AYwBhAHIAZQBwAGwAYQBuAOUACgVmAACgGSGAobsqZWlvACoLRQtJC+MiZWRlc4CheiJFU1QANAs5C0ALcSJ1YWwAAKCvKuwkYW50RXF1YWwAoHwiaSJsZGUAAKB+Im0AZQAAoDMgAAFkcE0LUQv1IWN0AKAPIm8jcnRpb24AYaA3ImwAAKAdIgABY2leC2ILcgAA4DXYq9yoYwACVWZvc2oLbwtzC3cLTwBUADuAIgAiQHIAAOA12BTdcABmAACgGiFjAHIAAOA12KzcAAZCRWFjZWZoaW9yc3WPC5MLlwupC7YL2AvbC90LhQyTDJoMowzhIXJyAKAQKUcAO4CuAK5AgAFjbnIAnQugC6ML9SF0ZVRhZwAAoOsncgB0oKAhbAAAoBYpgAFhZXkArwuyC7UL8iFvblhh5CFpbFZhIGR2oBwhZSJyc2UAAAFFVb8LzwsAAWxxwwvIC+UibWVudACgCyL1JGlsaWJyaXVtAKDLIXAmRXF1aWxpYnJpdW0AAKBvKXIAAKAcIW8AoWPnIWh0AARBQ0RGVFVWYewLCgwQDDIMNwxeDHwM9gIAAW5y8Av4C2clbGVCcmFja2V0AACg6SfyIW93AKGSIUJM/wsDDGEAcgAAoOUhZSRmdEFycm93AACgxCFlI2lsaW5nAACgCSNvAPUBFgwAAB4MYiVsZUJyYWNrZXQAAKDnJ24A1AEjDAAAKgxlJGVWZWN0b3IAAKBdKeUiY3RvckKgwiFhAHIAAKBVKWwib29yAACgCyMAAWVyOwxLDGUAAKGiIkFWQQxGDHIicm93AACgpiHlImN0b3IAoFspaSNhbmdsZQBCorMiVgwAAAAAWgxhAHIAAKDQKXEidWFsAACgtSJwAIABRFRWAGUMbAxzDO8kd25WZWN0b3IAoE8pZSRlVmVjdG9yAACgXCnlImN0b3JCoL4hYQByAACgVCnlImN0b3JCoMAhYQByAACgUykAAXB1iQyMDGYAAKAdIe4kZEltcGxpZXMAoHAp6SRnaHRhcnJvdwCg2yEAAWNongyhDHIAAKAbIQCgsSHsJGVEZWxheWVkAKD0KYAGSE9hY2ZoaW1vcXN0dQC/DMgMzAzQDOIM5gwKDQ0NFA0ZDU8NVA1YDQABQ2PDDMYMyCFjeSlkeQAoZEYiVGN5ACxkYyJ1dGUAWmEAorwqYWVpedgM2wzeDOEM8iFvbmBh5CFpbF5hcgBjAFxhIWRyAADgNdgW3e8hcnQAAkRMUlXvDPYM/QwEDW8kd25BcnJvdwAAoJMhZSRmdEFycm93AACgkCHpJGdodEFycm93AKCSIXAjQXJyb3cAAKCRIechbWGjY+EkbGxDaXJjbGUAoBgicABmAADgNdhK3XICHw0AAAAAIg10AACgGiLhIXJlgKGhJUlTVQAqDTINSg3uJXRlcnNlY3Rpb24AoJMidQAAAWJwNw1ADfMhZXRFoI8icSJ1YWwAAKCRIuUicnNldEWgkCJxInVhbAAAoJIibiJpb24AAKCUImMAcgAA4DXYrtxhAHIAAKDGIgACYmNtcF8Nag2ODZANc6DQImUAdABFoNAicSJ1YWwAAKCGIgABY2huDYkNZSJlZHMAgKF7IkVTVAB4DX0NhA1xInVhbAAAoLAq7CRhbnRFcXVhbACgfSJpImxkZQAAoH8iVABoAGEA9ADHCwCgESIAodEiZXOVDZ8NciJzZXQARaCDInEidWFsAACghyJlAHQAAKDRIoAFSFJTYWNmaGlvcnMAtQ27Db8NyA3ODdsN3w3+DRgOHQ4jDk8AUgBOADuA3gDeQMEhREUAoCIhAAFIY8MNxg1jAHkAC2R5ACZkAAFidcwNzQ0JYKRjgAFhZXkA1A3XDdoN8iFvbmRh5CFpbGJhImRyAADgNdgX3QABZWnjDe4N8gHoDQAA7Q3lImZvcmUAoDQiYQCYYwABY27yDfkNayNTcGFjZQAA4F8gCiDTInBhY2UAoAkg7CFkZYChPCJFRlQABw4MDhMOcSJ1YWwAAKBDInUkbGxFcXVhbAAAoEUiaSJsZGUAAKBIInAAZgAA4DXYS93pI3BsZURvdACg2yAAAWN0Jw4rDnIAAOA12K/c8iFva2Zh4QpFDlYOYA5qDgAAbg5yDgAAAAAAAAAAAAB5DnwOqA6zDgAADg8RDxYPGg8AAWNySA5ODnUAdABlADuA2gDaQHIAb6CfIeMhaXIAoEkpcgDjAVsOAABdDnkADmR2AGUAbGEAAWl5Yw5oDnIAYwA7gNsA20AjZGIibGFjAHBhcgAA4DXYGN1yAGEAdgBlADuA2QDZQOEhY3JqYQABZGl/Dp8OZQByAAABQlCFDpcOAAFhcokOiw5yAF9gYQBjAAABZWuRDpMOAKDfI2UAdAAAoLUjYSVyZW50aGVzaXMAAKDdI28AbgBQoMMi7CF1cwCgjiIAAWdwqw6uDm8AbgByYWYAAOA12EzdAARBREVUYWRwc78O0g7ZDuEOBQPqDvMOBw9yInJvdwDCoZEhyA4AAMwOYQByAACgEilvJHduQXJyb3cAAKDFIW8kd25BcnJvdwAAoJUhcSV1aWxpYnJpdW0AAKBuKWUAZQBBoKUiciJyb3cAAKClIW8AdwBuAGEAcgByAG8A9wAQA2UAcgAAAUxS+Q4AD2UkZnRBcnJvdwAAoJYh6SRnaHRBcnJvdwCglyFpAGyg0gNvAG4ApWPpIW5nbmFjAHIAAOA12LDcaSJsZGUAaGFtAGwAO4DcANxAgAREYmNkZWZvc3YALQ8xDzUPNw89D3IPdg97D4AP4SFzaACgqyJhAHIAAKDrKnkAEmThIXNobKCpIgCg5ioAAWVyQQ9DDwCgwSKAAWJ0eQBJD00Paw9hAHIAAKAWIGmgFiDjIWFsAAJCTFNUWA9cD18PZg9hAHIAAKAjIukhbmV8YGUkcGFyYXRvcgAAoFgnaSJsZGUAAKBAItQkaGluU3BhY2UAoAogcgAA4DXYGd1wAGYAAOA12E3dYwByAADgNdix3GQiYXNoAACgqiKAAmNlZm9zAI4PkQ+VD5kPng/pIXJjdGHkIWdlAKDAInIAAOA12BrdcABmAADgNdhO3WMAcgAA4DXYstwAAmZpb3OqD64Prw+0D3IAAOA12BvdnmNwAGYAAOA12E/dYwByAADgNdiz3IAEQUlVYWNmb3N1AMgPyw/OD9EP2A/gD+QP6Q/uD2MAeQAvZGMAeQAHZGMAeQAuZGMAdQB0AGUAO4DdAN1AAAFpedwP3w9yAGMAdmErZHIAAOA12BzdcABmAADgNdhQ3WMAcgAA4DXYtNxtAGwAeGEABEhhY2RlZm9z/g8BEAUQDRAQEB0QIBAkEGMAeQAWZGMidXRlAHlhAAFheQkQDBDyIW9ufWEXZG8AdAB7YfIBFRAAABwQbwBXAGkAZAB0AOgAVAhhAJZjcgAAoCghcABmAACgJCFjAHIAAOA12LXc4QtCEEkQTRAAAGcQbRByEAAAAAAAAAAAeRCKEJcQ8hD9EAAAGxEhETIROREAAD4RYwB1AHQAZQA7gOEA4UByImV2ZQADYYCiPiJFZGl1eQBWEFkQWxBgEGUQAOA+IjMDAKA/InIAYwA7gOIA4kB0AGUAO4C0ALRAMGRsAGkAZwA7gOYA5kByoGEgAOA12B7dcgBhAHYAZQA7gOAA4EAAAWVwfBCGEAABZnCAEIQQ8yF5bQCgNSHoAIMQaABhALFjAAFhcI0QWwAAAWNskRCTEHIAAWFnAACgPypkApwQAAAAALEQAKInImFkc3ajEKcQqRCuEG4AZAAAoFUqAKBcKmwib3BlAACgWCoAoFoqAKMgImVsbXJzersQvRDAEN0Q5RDtEACgpCllAACgICJzAGQAYaAhImEEzhDQENIQ1BDWENgQ2hDcEACgqCkAoKkpAKCqKQCgqykAoKwpAKCtKQCgrikAoK8pdAB2oB8iYgBkoL4iAKCdKQABcHTpEOwQaAAAoCIixWDhIXJyAKB8IwABZ3D1EPgQbwBuAAVhZgAA4DXYUt0Ao0giRWFlaW9wBxEJEQ0RDxESERQRAKBwKuMhaXIAoG8qAKBKImQAAKBLInMAJ2DyIW94ZaBIIvEADhFpAG4AZwA7gOUA5UCAAWN0eQAmESoRKxFyAADgNdi23CpgbQBwAGWgSCLxAPgBaQBsAGQAZQA7gOMA40BtAGwAO4DkAORAAAFjaUERRxFvAG4AaQBuAPQA6AFuAHQAAKARKgAITmFiY2RlZmlrbG5vcHJzdWQRaBGXEZ8RpxGrEdIR1hErEjASexKKEn0RThNbE3oTbwB0AACg7SoAAWNybBGJEWsAAAJjZXBzdBF4EX0RghHvIW5nAKBMInAjc2lsb24A9mNyImltZQAAoDUgaQBtAGWgPSJxAACgzSJ2AY0RkRFlAGUAAKC9ImUAZABnoAUjZQAAoAUjcgBrAHSgtSPiIXJrAKC2IwABb3mjEaYRbgDnAHcRMWTxIXVvAKAeIIACY21wcnQAtBG5Eb4RwRHFEeEhdXPloDUi5ABwInR5dgAAoLApcwDpAH0RbgBvAPUA6gCAAWFodwDLEcwRzhGyYwCgNiHlIWVuAKBsInIAAOA12B/dZwCAA2Nvc3R1dncA4xHyEQUSEhIhEiYSKRKAAWFpdQDpEesR7xHwAKMFcgBjAACg7yVwAACgwyKAAWRwdAD4EfwRABJvAHQAAKAAKuwhdXMAoAEqaSJtZXMAAKACKnECCxIAAAAADxLjIXVwAKAGKmEAcgAAoAUm8iNpYW5nbGUAAWR1GhIeEu8hd24AoL0lcAAAoLMlcCJsdXMAAKAEKmUA5QBCD+UAkg9hInJvdwAAoA0pgAFha28ANhJoEncSAAFjbjoSZRJrAIABbHN0AEESRxJNEm8jemVuZ2UAAKDrKXEAdQBhAHIA5QBcBPIjaWFuZ2xlgKG0JWRscgBYElwSYBLvIXduAKC+JeUhZnQAoMIlaSJnaHQAAKC4JWsAAKAjJLEBbRIAAHUSsgFxEgAAcxIAoJIlAKCRJTQAAKCTJWMAawAAoIglAAFlb38ShxJx4D0A5SD1IWl2AOBhIuUgdAAAoBAjAAJwdHd4kRKVEpsSnxJmAADgNdhT3XSgpSJvAG0AAKClIvQhaWUAoMgiAAZESFVWYmRobXB0dXayEsES0RLgEvcS+xIKExoTHxMjEygTNxMAAkxSbHK5ErsSvRK/EgCgVyUAoFQlAKBWJQCgUyUAolAlRFVkdckSyxLNEs8SAKBmJQCgaSUAoGQlAKBnJQACTFJsctgS2hLcEt4SAKBdJQCgWiUAoFwlAKBZJQCjUSVITFJobHLrEu0S7xLxEvMS9RIAoGwlAKBjJQCgYCUAoGslAKBiJQCgXyVvAHgAAKDJKQACTFJscgITBBMGEwgTAKBVJQCgUiUAoBAlAKAMJQCiACVEVWR1EhMUExYTGBMAoGUlAKBoJQCgLCUAoDQlaSJudXMAAKCfIuwhdXMAoJ4iaSJtZXMAAKCgIgACTFJsci8TMRMzEzUTAKBbJQCgWCUAoBglAKAUJQCjAiVITFJobHJCE0QTRhNIE0oTTBMAoGolAKBhJQCgXiUAoDwlAKAkJQCgHCUAAWV2UhNVE3YA5QD5AGIAYQByADuApgCmQAACY2Vpb2ITZhNqE24TcgAA4DXYt9xtAGkAAKBPIG0A5aA9IogRbAAAoVwAYmh0E3YTAKDFKfMhdWIAoMgnbAF+E4QTbABloCIgdAAAoCIgcAAAoU4iRWWJE4sTAKCuKvGgTyI8BeEMqRMAAN8TABQDFB8UAAAjFDQUAAAAAIUUAAAAAI0UAAAAANcU4xT3FPsUAACIFQAAlhWAAWNwcgCuE7ET1RP1IXRlB2GAoikiYWJjZHMAuxO/E8QTzhPSE24AZAAAoEQqciJjdXAAAKBJKgABYXXIE8sTcAAAoEsqcAAAoEcqbwB0AACgQCoA4CkiAP4AAWVv2RPcE3QAAKBBIO4ABAUAAmFlaXXlE+8T9RP4E/AB6hMAAO0TcwAAoE0qbwBuAA1hZABpAGwAO4DnAOdAcgBjAAlhcABzAHOgTCptAACgUCpvAHQAC2GAAWRtbgAIFA0UEhRpAGwAO4C4ALhAcCJ0eXYAAKCyKXQAAIGiADtlGBQZFKJAcgBkAG8A9ABiAXIAAOA12CDdgAFjZWkAKBQqFDIUeQBHZGMAawBtoBMn4SFyawCgEyfHY3IAAKPLJUVjZWZtcz8UQRRHFHcUfBSAFACgwykAocYCZWxGFEkUcQAAoFciZQBhAlAUAAAAAGAUciJyb3cAAAFsclYUWhTlIWZ0AKC6IWkiZ2h0AACguyGAAlJTYWNkAGgUaRRrFG8UcxSuYACgyCRzAHQAAKCbIukhcmMAoJoi4SFzaACgnSJuImludAAAoBAqaQBkAACg7yrjIWlyAKDCKfUhYnN1oGMmaQB0AACgYybsApMUmhS2FAAAwxRvAG4AZaA6APGgVCKrAG0CnxQAAAAAoxRhAHSgLABAYAChASJmbKcUqRTuABMNZQAAAW14rhSyFOUhbnQAoAEiZQDzANIB5wG6FAAAwBRkoEUibwB0AACgbSpuAPQAzAGAAWZyeQDIFMsUzhQA4DXYVN1vAOQA1wEAgakAO3MeAdMUcgAAoBchAAFhb9oU3hRyAHIAAKC1IXMAcwAAoBcnAAFjdeYU6hRyAADgNdi43AABYnDuFPIUZaDPKgCg0SploNAqAKDSKuQhb3QAoO8igANkZWxwcnZ3AAYVEBUbFSEVRBVlFYQV4SFycgABbHIMFQ4VAKA4KQCgNSlwAhYVAAAAABkVcgAAoN4iYwAAoN8i4SFycnCgtiEAoD0pgKIqImJjZG9zACsVMBU6FT4VQRVyImNhcAAAoEgqAAFhdTQVNxVwAACgRipwAACgSipvAHQAAKCNInIAAKBFKgDgKiIA/gACYWxydksVURVuFXMVcgByAG2gtyEAoDwpeQCAAWV2dwBYFWUVaRVxAHACXxUAAAAAYxVyAGUA4wAXFXUA4wAZFWUAZQAAoM4iZSJkZ2UAAKDPImUAbgA7gKQApEBlI2Fycm93AAABbHJ7FX8V5SFmdACgtiFpImdodAAAoLchZQDkAG0VAAFjaYsVkRVvAG4AaQBuAPQAkwFuAHQAAKAxImwiY3R5AACgLSOACUFIYWJjZGVmaGlqbG9yc3R1d3oAuBW7Fb8V1RXgFegV+RUKFhUWHxZUFlcWZRbFFtsW7xb7FgUXChdyAPIAtAJhAHIAAKBlKQACZ2xyc8YVyhXOFdAV5yFlcgCgICDlIXRoAKA4IfIA9QxoAHagECAAoKMiawHZFd4VYSJyb3cAAKAPKWEA4wBfAgABYXnkFecV8iFvbg9hNGQAoUYhYW/tFfQVAAFnciEC8RVyAACgyiF0InNlcQAAoHcqgAFnbG0A/xUCFgUWO4CwALBAdABhALRjcCJ0eXYAAKCxKQABaXIOFhIW8yFodACgfykA4DXYId1hAHIAAAFschsWHRYAoMMhAKDCIYACYWVnc3YAKBauAjYWOhY+Fm0AAKHEIm9zLhY0Fm4AZABzoMQi9SFpdACgZiZhIm1tYQDdY2kAbgAAoPIiAKH3AGlvQxZRFmQAZQAAgfcAO29KFksW90BuI3RpbWVzAACgxyJuAPgAUBZjAHkAUmRjAG8CXhYAAAAAYhZyAG4AAKAeI28AcAAAoA0jgAJscHR1dwBuFnEWdRaSFp4W7CFhciRgZgAA4DXYVd0AotkCZW1wc30WhBaJFo0WcQBkoFAibwB0AACgUSJpIm51cwAAoDgi7CF1cwCgFCLxInVhcmUAoKEiYgBsAGUAYgBhAHIAdwBlAGQAZwDlANcAbgCAAWFkaAClFqoWtBZyAHIAbwD3APUMbwB3AG4AYQByAHIAbwB3APMA8xVhI3Jwb29uAAABbHK8FsAWZQBmAPQAHBZpAGcAaAD0AB4WYgHJFs8WawBhAHIAbwD3AJILbwLUFgAAAADYFnIAbgAAoB8jbwBwAACgDCOAAWNvdADhFukW7BYAAXJ55RboFgDgNdi53FVkbAAAoPYp8iFvaxFhAAFkcvMW9xZvAHQAAKDxImkA5qC/JVsSAAFhaP8WAhdyAPIANQNhAPIA1wvhIm5nbGUAoKYpAAFjaQ4XEBd5AF9k5yJyYXJyAKD/JwAJRGFjZGVmZ2xtbm9wcXJzdHV4MRc4F0YXWxcyBF4XaRd5F40XrBe0F78X2RcVGCEYLRg1GEAYAAFEbzUXgRZvAPQA+BUAAWNzPBdCF3UAdABlADuA6QDpQPQhZXIAoG4qAAJhaW95TRdQF1YXWhfyIW9uG2FyAGOgViI7gOoA6kDsIW9uAKBVIk1kbwB0ABdhAAFEcmIXZhdvAHQAAKBSIgDgNdgi3XKhmipuF3QXYQB2AGUAO4DoAOhAZKCWKm8AdAAAoJgqgKGZKmlscwCAF4UXhxfuInRlcnMAoOcjAKATIWSglSpvAHQAAKCXKoABYXBzAJMXlheiF2MAcgATYXQAeQBzogUinxcAAAAAoRdlAHQAAKAFInAAMaADIDMBqRerFwCgBCAAoAUgAAFnc7AXsRdLYXAAAKACIAABZ3C4F7sXbwBuABlhZgAA4DXYVt2AAWFscwDFF8sXzxdyAHOg1SJsAACg4yl1AHMAAKBxKmkAAKG1A2x21RfYF28AbgC1Y/VjAAJjc3V24BfoF/0XEBgAAWlv5BdWF3IAYwAAoFYiaQLuFwAAAADwF+0ADQThIW50AAFnbPUX+Rd0AHIAAKCWKuUhc3MAoJUqgAFhZWkAAxgGGAoYbABzAD1gcwB0AACgXyJ2AESgYSJEAACgeCrwImFyc2wAoOUpAAFEYRkYHRhvAHQAAKBTInIAcgAAoHEpgAFjZGkAJxgqGO0XcgAAoC8hbwD0AIwCAAFhaDEYMhi3YzuA8ADwQAABbXI5GD0YbAA7gOsA60BvAACgrCCAAWNpcABGGEgYSxhsACFgcwD0ACwEAAFlb08YVxhjAHQAYQB0AGkAbwDuABoEbgBlAG4AdABpAGEAbADlADME4Ql1GAAAgRgAAIMYiBgAAAAAoRilGAAAqhgAALsYvhjRGAAA1xgnGWwAbABpAG4AZwBkAG8AdABzAGUA8QBlF3kARGRtImFsZQAAoEAmgAFpbHIAjRiRGJ0Y7CFpZwCgA/tpApcYAAAAAJoYZwAAoAD7aQBnAACgBPsA4DXYI93sIWlnAKAB++whaWcA4GYAagCAAWFsdACvGLIYthh0AACgbSZpAGcAAKAC+24AcwAAoLElbwBmAJJh8AHCGAAAxhhmAADgNdhX3QABYWvJGMwYbADsAGsEdqDUIgCg2SphI3J0aW50AACgDSoAAWFv2hgiGQABY3PeGB8ZsQPnGP0YBRkSGRUZAAAdGbID7xjyGPQY9xj5GAAA+xg7gL0AvUAAoFMhO4C8ALxAAKBVIQCgWSEAoFshswEBGQAAAxkAoFQhAKBWIbQCCxkOGQAAAAAQGTuAvgC+QACgVyEAoFwhNQAAoFghtgEZGQAAGxkAoFohAKBdITgAAKBeIWwAAKBEIHcAbgAAoCIjYwByAADgNdi73IAIRWFiY2RlZmdpamxub3JzdHYARhlKGVoZXhlmGWkZkhmWGZkZnRmgGa0ZxhnLGc8Z4BkjGmygZyIAoIwqgAFjbXAAUBlTGVgZ9SF0ZfVhbQBhAOSgswM6FgCghipyImV2ZQAfYQABaXliGWUZcgBjAB1hM2RvAHQAIWGAoWUibHFzAMYEcBl6GfGhZSLOBAAAdhlsAGEAbgD0AN8EgKF+KmNkbACBGYQZjBljAACgqSpvAHQAb6CAKmyggioAoIQqZeDbIgD+cwAAoJQqcgAA4DXYJN3noGsirATtIWVsAKA3IWMAeQBTZIChdyJFYWoApxmpGasZAKCSKgCgpSoAoKQqAAJFYWVztBm2Gb0ZwhkAoGkicABwoIoq8iFveACgiipxoIgq8aCIKrUZaQBtAACg5yJwAGYAAOA12FjdYQB2AOUAYwIAAWNp0xnWGXIAAKAKIW0AAKFzImVs3BneGQCgjioAoJAqAIM+ADtjZGxxco0E6xn0GfgZ/BkBGgABY2nvGfEZAKCnKnIAAKB6Km8AdAAAoNci0CFhcgCglSl1ImVzdAAAoHwqgAJhZGVscwAKGvQZFhrVBCAa8AEPGgAAFBpwAHIAbwD4AFkZcgAAoHgpcQAAAWxxxAQbGmwAZQBzAPMASRlpAO0A5AQAAWVuJxouGnIjdG5lcXEAAOBpIgD+xQAsGgAFQWFiY2Vma29zeUAaQxpmGmoabRqDGocalhrCGtMacgDyAMwCAAJpbG1yShpOGlAaVBpyAHMA8ABxD2YAvWBpAGwA9AASBQABZHJYGlsaYwB5AEpkAKGUIWN3YBpkGmkAcgAAoEgpAKCtIWEAcgAAoA8h6SFyYyVhgAFhbHIAcxp7Gn8a8iF0c3WgZSZpAHQAAKBlJuwhaXAAoCYg4yFvbgCguSJyAADgNdgl3XMAAAFld4wakRphInJvdwAAoCUpYSJyb3cAAKAmKYACYW1vcHIAnxqjGqcauhq+GnIAcgAAoP8h9CFodACgOyJrAAABbHKsGrMaZSRmdGFycm93AACgqSHpJGdodGFycm93AKCqIWYAAOA12Fnd4iFhcgCgFSCAAWNsdADIGswa0BpyAADgNdi93GEAcwDoAGka8iFvaydhAAFicNca2xr1IWxsAKBDIOghZW4AoBAg4Qr2GgAA/RoAAAgbExsaGwAAIRs7GwAAAAA+G2IbmRuVG6sbAACyG80b0htjAHUAdABlADuA7QDtQAChYyBpeQEbBhtyAGMAO4DuAO5AOGQAAWN4CxsNG3kANWRjAGwAO4ChAKFAAAFmcssCFhsA4DXYJt1yAGEAdgBlADuA7ADsQIChSCFpbm8AJxsyGzYbAAFpbisbLxtuAHQAAKAMKnQAAKAtIuYhaW4AoNwpdABhAACgKSHsIWlnM2GAAWFvcABDG1sbXhuAAWNndABJG0sbWRtyACthgAFlbHAAcQVRG1UbaQBuAOUAyAVhAHIA9AByBWgAMWFmAACgtyJlAGQAtWEAoggiY2ZvdGkbbRt1G3kb4SFyZQCgBSFpAG4AdKAeImkAZQAAoN0pZABvAPQAWxsAoisiY2VscIEbhRuPG5QbYQBsAACguiIAAWdyiRuNG2UAcgDzACMQ4wCCG2EicmhrAACgFyryIW9kAKA8KgACY2dwdJ8boRukG6gbeQBRZG8AbgAvYWYAAOA12FrdYQC5Y3UAZQBzAHQAO4C/AL9AAAFjabUbuRtyAADgNdi+3G4AAKIIIkVkc3bCG8QbyBvQAwCg+SJvAHQAAKD1Inag9CIAoPMiaaBiIOwhZGUpYesB1hsAANkbYwB5AFZkbAA7gO8A70AAA2NmbW9zdeYb7hvyG/Ub+hsFHAABaXnqG+0bcgBjADVhOWRyAADgNdgn3eEhdGg3YnAAZgAA4DXYW93jAf8bAAADHHIAAOA12L/c8iFjeVhk6yFjeVRkAARhY2ZnaGpvcxUcGhwiHCYcKhwtHDAcNRzwIXBhdqC6A/BjAAFleR4cIRzkIWlsN2E6ZHIAAOA12CjdciJlZW4AOGFjAHkARWRjAHkAXGRwAGYAAOA12FzdYwByAADgNdjA3IALQUJFSGFiY2RlZmdoamxtbm9wcnN0dXYAXhxtHHEcdRx5HN8cBx0dHTwd3B3tHfEdAR4EHh0eLB5FHrwewx7hHgkfPR9LH4ABYXJ0AGQcZxxpHHIA8gBvB/IAxQLhIWlsAKAbKeEhcnIAoA4pZ6BmIgCgiyphAHIAAKBiKWMJjRwAAJAcAACVHAAAAAAAAAAAAACZHJwcAACmHKgcrRwAANIc9SF0ZTph7SJwdHl2AKC0KXIAYQDuAFoG4iFkYbtjZwAAoegnZGyhHKMcAKCRKeUAiwYAoIUqdQBvADuAqwCrQHIAgKOQIWJmaGxwc3QAuhy/HMIcxBzHHMoczhxmoOQhcwAAoB8pcwAAoB0p6wCyGnAAAKCrIWwAAKA5KWkAbQAAoHMpbAAAoKIhAKGrKmFl1hzaHGkAbAAAoBkpc6CtKgDgrSoA/oABYWJyAOUc6RztHHIAcgAAoAwpcgBrAACgcicAAWFr8Rz4HGMAAAFla/Yc9xx7YFtgAAFlc/wc/hwAoIspbAAAAWR1Ax0FHQCgjykAoI0pAAJhZXV5Dh0RHRodHB3yIW9uPmEAAWRpFR0YHWkAbAA8YewAowbiAPccO2QAAmNxcnMkHScdLB05HWEAAKA2KXUAbwDyoBwgqhEAAWR1MB00HeghYXIAoGcpcyJoYXIAAKBLKWgAAKCyIQCiZCJmZ3FzRB1FB5Qdnh10AIACYWhscnQATh1WHWUdbB2NHXIicm93AHSgkCFhAOkAzxxhI3Jwb29uAAABZHVeHWId7yF3bgCgvSFwAACgvCHlJGZ0YXJyb3dzAKDHIWkiZ2h0AIABYWhzAHUdex2DHXIicm93APOglCGdBmEAcgBwAG8AbwBuAPMAzgtxAHUAaQBnAGEAcgByAG8A9wBlGugkcmVldGltZXMAoMsi8aFkIk0HAACaHWwAYQBuAPQAXgcAon0qY2Rnc6YdqR2xHbcdYwAAoKgqbwB0AG+gfypyoIEqAKCDKmXg2iIA/nMAAKCTKoACYWRlZ3MAwB3GHcod1h3ZHXAAcAByAG8A+ACmHG8AdAAAoNYicQAAAWdxzx3SHXQA8gBGB2cAdADyAHQcdADyAFMHaQDtAGMHgAFpbHIA4h3mHeod8yFodACgfClvAG8A8gDKBgDgNdgp3UWgdiIAoJEqYQH1Hf4dcgAAAWR1YB35HWygvCEAoGopbABrAACghCVjAHkAWWQAomoiYWNodAweDx4VHhkecgDyAGsdbwByAG4AZQDyAGAW4SFyZACgaylyAGkAAKD6JQABaW8hHiQe5CFvdEBh9SFzdGGgsCPjIWhlAKCwIwACRWFlczMeNR48HkEeAKBoInAAcKCJKvIhb3gAoIkqcaCHKvGghyo0HmkAbQAAoOYiAARhYm5vcHR3elIeXB5fHoUelh6mHqsetB4AAW5yVh5ZHmcAAKDsJ3IAAKD9IXIA6wCwBmcAgAFsbXIAZh52Hnse5SFmdAABYXKIB2weaQBnAGgAdABhAHIAcgBvAPcAkwfhInBzdG8AoPwnaQBnAGgAdABhAHIAcgBvAPcAmgdwI2Fycm93AAABbHKNHpEeZQBmAPQAxhxpImdodAAAoKwhgAFhZmwAnB6fHqIecgAAoIUpAOA12F3ddQBzAACgLSppIm1lcwAAoDQqYQGvHrMecwB0AACgFyLhAIoOZaHKJbkeRhLuIWdlAKDKJWEAcgBsoCgAdAAAoJMpgAJhY2htdADMHs8e1R7bHt0ecgDyAJ0GbwByAG4AZQDyANYWYQByAGSgyyEAoG0pAKAOIHIAaQAAoL8iAANhY2hpcXTrHu8e1QfzHv0eBh/xIXVvAKA5IHIAAOA12MHcbQDloXIi+h4AAPweAKCNKgCgjyoAAWJ19xwBH28AcqAYIACgGiDyIW9rQmEAhDwAO2NkaGlscXJCBhcfxh0gHyQfKB8sHzEfAAFjaRsfHR8AoKYqcgAAoHkqcgBlAOUAkx3tIWVzAKDJIuEhcnIAoHYpdSJlc3QAAKB7KgABUGk1HzkfYQByAACglillocMlAgdfEnIAAAFkdUIfRx9zImhhcgAAoEop6CFhcgCgZikAAWVuTx9WH3IjdG5lcXEAAOBoIgD+xQBUHwAHRGFjZGVmaGlsbm9wc3VuH3Ifoh+rH68ftx+7H74f5h/uH/MfBwj/HwsgxCFvdACgOiIAAmNscHJ5H30fiR+eH3IAO4CvAK9AAAFldIEfgx8AoEImZaAgJ3MAZQAAoCAnc6CmIXQAbwCAoaYhZGx1AJQfmB+cH28AdwDuAHkDZQBmAPQA6gbwAOkO6yFlcgCgriUAAW95ph+qH+0hbWEAoCkqPGThIXNoAKAUIOElc3VyZWRhbmdsZQCgISJyAADgNdgq3W8AAKAnIYABY2RuAMQfyR/bH3IAbwA7gLUAtUBhoiMi0B8AANMf1x9zAPQAKxFpAHIAAKDwKm8AdAA7gLcAt0B1AHMA4qESIh4TAADjH3WgOCIAoCoqYwHqH+0fcAAAoNsq8gB+GnAAbAB1APMACAgAAWRw9x/7H+UhbHMAoKciZgAA4DXYXt0AAWN0AyAHIHIAAOA12MLc8CFvcwCgPiJsobwDECAVIPQiaW1hcACguCJhAPAAEyAADEdMUlZhYmNkZWZnaGlqbG1vcHJzdHV2dzwgRyBmIG0geSCqILgg2iDeIBEhFSEyIUMhTSFQIZwhnyHSIQAiIyKLIrEivyIUIwABZ3RAIEMgAODZIjgD9uBrItIgBwmAAWVsdABNIF8gYiBmAHQAAAFhclMgWCByInJvdwAAoM0h6SRnaHRhcnJvdwCgziEA4NgiOAP24Goi0iBfCekkZ2h0YXJyb3cAoM8hAAFEZHEgdSDhIXNoAKCvIuEhc2gAoK4igAJiY25wdACCIIYgiSCNIKIgbABhAACgByL1IXRlRGFnAADgICLSIACiSSJFaW9wlSCYIJwgniAA4HAqOANkAADgSyI4A3MASWFyAG8A+AAyCnUAcgBhoG4mbADzoG4mmwjzAa8gAACzIHAAO4CgAKBAbQBwAOXgTiI4AyoJgAJhZW91eQDBIMogzSDWINkg8AHGIAAAyCAAoEMqbwBuAEhh5CFpbEZhbgBnAGSgRyJvAHQAAOBtKjgDcAAAoEIqPWThIXNoAKATIACjYCJBYWRxc3jpIO0g+SD+IAIhDCFyAHIAAKDXIXIAAAFocvIg9SBrAACgJClvoJch9wAGD28AdAAA4FAiOAN1AGkA9gC7CAABZWkGIQohYQByAACgKCntAN8I6SFzdPOgBCLlCHIAAOA12CvdAAJFZXN0/wgcISshLiHxoXEiIiEAABMJ8aFxIgAJAAAnIWwAYQBuAPQAEwlpAO0AGQlyoG8iAKBvIoABQWFwADghOyE/IXIA8gBeIHIAcgAAoK4hYQByAACg8ipzogsiSiEAAAAAxwtkoPwiAKD6ImMAeQBaZIADQUVhZGVzdABcIV8hYiFmIWkhkyGWIXIA8gBXIADgZiI4A3IAcgAAoJohcgAAoCUggKFwImZxcwBwIYQhjiF0AAABYXJ1IXohcgByAG8A9wBlIWkAZwBoAHQAYQByAHIAbwD3AD4h8aFwImAhAACKIWwAYQBuAPQAZwlz4H0qOAMAoG4iaQDtAG0JcqBuImkA5aDqIkUJaQDkADoKAAFwdKMhpyFmAADgNdhf3YCBrAA7aW4AriGvIcchrEBuAIChCSJFZHYAtyG6Ib8hAOD5IjgDbwB0AADg9SI4A+EB1gjEIcYhAKD3IgCg9iJpAHagDCLhAagJzyHRIQCg/iIAoP0igAFhb3IA2CHsIfEhcgCAoSYiYXN0AOAh5SHpIWwAbABlAOwAywhsAADg/SrlIADgAiI4A2wiaW50AACgFCrjoYAi9yEAAPohdQDlAJsJY+CvKjgDZaCAIvEAkwkAAkFhaXQHIgoiFyIeInIA8gBsIHIAcgAAoZshY3cRIhQiAOAzKTgDAOCdITgDZyRodGFycm93AACgmyFyAGkA5aDrIr4JgANjaGltcHF1AC8iPCJHIpwhTSJQIloigKGBImNlcgA2Iv0JOSJ1AOUABgoA4DXYw9zvIXJ0bQKdIQAAAABEImEAcgDhAOEhbQBloEEi8aBEIiYKYQDyAMsIcwB1AAABYnBWIlgi5QDUCeUA3wmAAWJjcABgInMieCKAoYQiRWVzAGci7glqIgDgxSo4A2UAdABl4IIi0iBxAPGgiCJoImMAZaCBIvEA/gmAoYUiRWVzAH8iFgqCIgDgxio4A2UAdABl4IMi0iBxAPGgiSKAIgACZ2lscpIilCKaIpwi7AAMCWwAZABlADuA8QDxQOcAWwlpI2FuZ2xlAAABbHKkIqoi5SFmdGWg6iLxAEUJaSJnaHQAZaDrIvEAvgltoL0DAKEjAGVzuCK8InIAbwAAoBYhcAAAoAcggARESGFkZ2lscnMAziLSItYi2iLeIugi7SICIw8j4SFzaACgrSLhIXJyAKAEKXAAAOBNItIg4SFzaACgrCIAAWV04iLlIgDgZSLSIADgPgDSIG4iZmluAACg3imAAUFldADzIvci+iJyAHIAAKACKQDgZCLSIHLgPADSIGkAZQAA4LQi0iAAAUF0BiMKI3IAcgAAoAMp8iFpZQDgtSLSIGkAbQAA4Dwi0iCAAUFhbgAaIx4jKiNyAHIAAKDWIXIAAAFociMjJiNrAACgIylvoJYh9wD/DuUhYXIAoCcpUxJqFAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAVCMAAF4jaSN/I4IjjSOeI8AUAAAAAKYjwCMAANoj3yMAAO8jHiQvJD8kRCQAAWNzVyNsFHUAdABlADuA8wDzQAABaXlhI2cjcgBjoJoiO4D0APRAPmSAAmFiaW9zAHEjdCN3I3EBeiNzAOgAdhTsIWFjUWF2AACgOCrvIWxkAKC8KewhaWdTYQABY3KFI4kjaQByAACgvykA4DXYLN1vA5QjAAAAAJYjAACcI24A22JhAHYAZQA7gPIA8kAAoMEpAAFibaEjjAphAHIAAKC1KQACYWNpdKwjryO6I70jcgDyAFkUAAFpcrMjtiNyAACgvinvIXNzAKC7KW4A5QDZCgCgwCmAAWFlaQDFI8gjyyNjAHIATWFnAGEAyWOAAWNkbgDRI9Qj1iPyIW9uv2MAoLYpdQDzAHgBcABmAADgNdhg3YABYWVsAOQj5yPrI3IAAKC3KXIAcAAAoLkpdQDzAHwBAKMoImFkaW9zdvkj/CMPJBMkFiQbJHIA8gBeFIChXSplZm0AAyQJJAwkcgBvoDQhZgAAoDQhO4CqAKpAO4C6ALpA5yFvZgCgtiJyAACgVipsIm9wZQAAoFcqAKBbKoABY2xvACMkJSQrJPIACCRhAHMAaAA7gPgA+EBsAACgmCJpAGwBMyQ4JGQAZQA7gPUA9UBlAHMAYaCXInMAAKA2Km0AbAA7gPYA9kDiIWFyAKA9I+EKXiQAAHokAAB8JJQkAACYJKkkAAAAALUkEQsAAPAkAAAAAAQleiUAAIMlcgCAoSUiYXN0AGUkbyQBCwCBtgA7bGokayS2QGwAZQDsABgDaQJ1JAAAAAB4JG0AAKDzKgCg/Sp5AD9kcgCAAmNpbXB0AIUkiCSLJJkSjyRuAHQAJWBvAGQALmBpAGwAAKAwIOUhbmsAoDEgcgAA4DXYLd2AAWltbwCdJKAkpCR2oMYD1WNtAGEA9AD+B24AZQAAoA4m9KHAA64kAAC0JGMjaGZvcmsAAKDUItZjAAFhdbgkxCRuAAABY2u9JMIkawBooA8hAKAOIfYAaRpzAACkKwBhYmNkZW1zdNMkIRPXJNsk4STjJOck6yTjIWlyAKAjKmkAcgAAoCIqAAFvdYsW3yQAoCUqAKByKm4AO4CxALFAaQBtAACgJip3AG8AAKAnKoABaXB1APUk+iT+JO4idGludACgFSpmAADgNdhh3W4AZAA7gKMAo0CApHoiRWFjZWlub3N1ABMlFSUYJRslTCVRJVklSSV1JQCgsypwAACgtyp1AOUAPwtjoK8qgKJ6ImFjZW5zACclLSU0JTYlSSVwAHAAcgBvAPgAFyV1AHIAbAB5AGUA8QA/C/EAOAuAAWFlcwA8JUElRSXwInByb3gAoLkqcQBxAACgtSppAG0AAKDoImkA7QBEC20AZQDzoDIgIguAAUVhcwBDJVclRSXwAEAlgAFkZnAATwtfJXElgAFhbHMAZSVpJW0l7CFhcgCgLiPpIW5lAKASI/UhcmYAoBMjdKAdIu8AWQvyIWVsAKCwIgABY2l9JYElcgAA4DXYxdzIY24iY3NwAACgCCAAA2Zpb3BzdZElKxuVJZolnyWkJXIAAOA12C7dcABmAADgNdhi3XIiaW1lAACgVyBjAHIAAOA12MbcgAFhZW8AqiW6JcAldAAAAWVpryW2JXIAbgBpAG8AbgDzABkFbgB0AACgFipzAHQAZaA/APEACRj0AG0LgApBQkhhYmNkZWZoaWxtbm9wcnN0dXgA4yXyJfYl+iVpJpAmpia9JtUm5ib4JlonaCdxJ3UnnietJ7EnyCfiJ+cngAFhcnQA6SXsJe4lcgDyAJkM8gD6AuEhaWwAoBwpYQByAPIA3BVhAHIAAKBkKYADY2RlbnFydAAGJhAmEyYYJiYmKyZaJgABZXUKJg0mAOA9IjEDdABlAFVhaQDjACAN7SJwdHl2AKCzKWcAgKHpJ2RlbAAgJiImJCYAoJIpAKClKeUA9wt1AG8AO4C7ALtAcgAApZIhYWJjZmhscHN0dz0mQCZFJkcmSiZMJk4mUSZVJlgmcAAAoHUpZqDlIXMAAKAgKQCgMylzAACgHinrALka8ACVHmwAAKBFKWkAbQAAoHQpbAAAoKMhAKCdIQABYWleJmImaQBsAACgGilvAG6gNiJhAGwA8wB2C4ABYWJyAG8mciZ2JnIA8gAvEnIAawAAoHMnAAFha3omgSZjAAABZWt/JoAmfWBdYAABZXOFJocmAKCMKWwAAAFkdYwmjiYAoI4pAKCQKQACYWV1eZcmmiajJqUm8iFvbllhAAFkaZ4moSZpAGwAV2HsAA8M4gCAJkBkAAJjbHFzrSawJrUmuiZhAACgNylkImhhcgAAoGkpdQBvAPKgHSCjAWgAAKCzIYABYWNnAMMm0iaUC2wAgKEcIWlwcwDLJs4migxuAOUAoAxhAHIA9ADaC3QAAKCtJYABaWxyANsm3ybjJvMhaHQAoH0pbwBvAPIANgwA4DXYL90AAWFv6ib1JnIAAAFkde8m8SYAoMEhbKDAIQCgbCl2oMED8WOAAWducwD+Jk4nUCdoAHQAAANhaGxyc3QKJxInISc1Jz0nRydyInJvdwB0oJIhYQDpAFYmYSNycG9vbgAAAWR1GiceJ28AdwDuAPAmcAAAoMAh5SFmdAABYWgnJy0ncgByAG8AdwDzAAkMYQByAHAAbwBvAG4A8wATBGklZ2h0YXJyb3dzAACgySFxAHUAaQBnAGEAcgByAG8A9wBZJugkcmVldGltZXMAoMwiZwDaYmkAbgBnAGQAbwB0AHMAZQDxABwYgAFhaG0AYCdjJ2YncgDyAAkMYQDyABMEAKAPIG8idXN0AGGgsSPjIWhlAKCxI+0haWQAoO4qAAJhYnB0fCeGJ4knmScAAW5ygCeDJ2cAAKDtJ3IAAKD+IXIA6wAcDIABYWZsAI8nkieVJ3IAAKCGKQDgNdhj3XUAcwAAoC4qaSJtZXMAAKA1KgABYXCiJ6gncgBnoCkAdAAAoJQp7yJsaW50AKASKmEAcgDyADwnAAJhY2hxuCe8J6EMwCfxIXVvAKA6IHIAAOA12MfcAAFidYAmxCdvAPKgGSCoAYABaGlyAM4n0ifWJ3IAZQDlAE0n7SFlcwCgyiJpAIChuSVlZmwAXAxjEt4n9CFyaQCgzinsInVoYXIAoGgpAKAeIWENBSgJKA0oSyhVKIYoAACLKLAoAAAAAOMo5ygAABApJCkxKW0pcSmHKaYpAACYKgAAAACxKmMidXRlAFthcQB1AO8ABR+ApHsiRWFjZWlucHN5ABwoHignKCooLygyKEEoRihJKACgtCrwASMoAAAlKACguCpvAG4AYWF1AOUAgw1koLAqaQBsAF9hcgBjAF1hgAFFYXMAOCg6KD0oAKC2KnAAAKC6KmkAbQAAoOki7yJsaW50AKATKmkA7QCIDUFkbwB0AGKixSKRFgAAAABTKACgZiqAA0FhY21zdHgAYChkKG8ocyh1KHkogihyAHIAAKDYIXIAAAFocmkoayjrAJAab6CYIfcAzAd0ADuApwCnQGkAO2D3IWFyAKApKW0AAAFpbn4ozQBuAHUA8wDOAHQAAKA2J3IA7+A12DDdIxkAAmFjb3mRKJUonSisKHIAcAAAoG8mAAFoeZkonChjAHkASWRIZHIAdABtAqUoAAAAAKgoaQDkAFsPYQByAGEA7ABsJDuArQCtQAABZ22zKLsobQBhAAChwwNmdroouijCY4CjPCJkZWdsbnByAMgozCjPKNMo1yjaKN4obwB0AACgairxoEMiCw5FoJ4qAKCgKkWgnSoAoJ8qZQAAoEYi7CF1cwCgJCrhIXJyAKByKWEAcgDyAPwMAAJhZWl07Sj8KAEpCCkAAWxz8Sj4KGwAcwBlAHQAbQDpAH8oaABwAACgMyrwImFyc2wAoOQpAAFkbFoPBSllAACgIyNloKoqc6CsKgDgrCoA/oABZmxwABUpGCkfKfQhY3lMZGKgLwBhoMQpcgAAoD8jZgAA4DXYZN1hAAABZHIoKRcDZQBzAHWgYCZpAHQAAKBgJoABY3N1ADYpRilhKQABYXU6KUApcABzoJMiAOCTIgD+cABzoJQiAOCUIgD+dQAAAWJwSylWKQChjyJlcz4NUCllAHQAZaCPIvEAPw0AoZAiZXNIDVspZQB0AGWgkCLxAEkNAKGhJWFmZilbBHIAZQFrKVwEAKChJWEAcgDyAAMNAAJjZW10dyl7KX8pgilyAADgNdjI3HQAbQDuAM4AaQDsAAYpYQByAOYAVw0AAWFyiimOKXIA5qAGJhESAAFhbpIpoylpImdodAAAAWVwmSmgKXAAcwBpAGwAbwDuANkXaADpAKAkcwCvYIACYmNtbnAArin8KY4NJSooKgCkgiJFZGVtbnByc7wpvinCKcgpzCnUKdgp3CkAoMUqbwB0AACgvSpkoIYibwB0AACgwyr1IWx0AKDBKgABRWXQKdIpAKDLKgCgiiLsIXVzAKC/KuEhcnIAoHkpgAFlaXUA4inxKfQpdAAAoYIiZW7oKewpcQDxoIYivSllAHEA8aCKItEpbQAAoMcqAAFicPgp+ikAoNUqAKDTKmMAgKJ7ImFjZW5zAAcqDSoUKhYqRihwAHAAcgBvAPgAIyh1AHIAbAB5AGUA8QCDDfEAfA2AAWFlcwAcKiIqPShwAHAAcgBvAPgAPChxAPEAOShnAACgaiYApoMiMTIzRWRlaGxtbnBzPCo/KkIqRSpHKlIqWCpjKmcqaypzKncqO4C5ALlAO4CyALJAO4CzALNAAKDGKgABb3NLKk4qdAAAoL4qdQBiAACg2CpkoIcibwB0AACgxCpzAAABb3VdKmAqbAAAoMknYgAAoNcq4SFycgCgeyn1IWx0AKDCKgABRWVvKnEqAKDMKgCgiyLsIXVzAKDAKoABZWl1AH0qjCqPKnQAAKGDImVugyqHKnEA8aCHIkYqZQBxAPGgiyJwKm0AAKDIKgABYnCTKpUqAKDUKgCg1iqAAUFhbgCdKqEqrCpyAHIAAKDZIXIAAAFocqYqqCrrAJUab6CZIfcAxQf3IWFyAKAqKWwAaQBnADuA3wDfQOELzyrZKtwq6SrsKvEqAAD1KjQrAAAAAAAAAAAAAEwrbCsAAHErvSsAAAAAAADRK3IC1CoAAAAA2CrnIWV0AKAWI8RjcgDrAOUKgAFhZXkA4SrkKucq8iFvbmVh5CFpbGNhQmRvAPQAIg5sInJlYwAAoBUjcgAA4DXYMd0AAmVpa2/7KhIrKCsuK/IBACsAAAkrZQAAATRm6g0EK28AcgDlAOsNYQBzorgDECsAAAAAEit5AG0A0WMAAWNuFislK2sAAAFhcxsrIStwAHAAcgBvAPgAFw5pAG0AAKA8InMA8AD9DQABYXMsKyEr8AAXDnIAbgA7gP4A/kDsATgrOyswG2QA5QBnAmUAcwCAgdcAO2JkAEMrRCtJK9dAYaCgInIAAKAxKgCgMCqAAWVwcwBRK1MraSvhAAkh4qKkIlsrXysAAAAAYytvAHQAAKA2I2kAcgAAoPEqb+A12GXdcgBrAACg2irhAHgociJpbWUAAKA0IIABYWlwAHYreSu3K2QA5QC+DYADYWRlbXBzdACFK6MrmiunK6wrsCuzK24iZ2xlAACitSVkbHFykCuUK5ornCvvIXduAKC/JeUhZnRloMMl8QACBwCgXCJpImdodABloLkl8QBdDG8AdAAAoOwlaSJudXMAAKA6KuwhdXMAoDkqYgAAoM0p6SFtZQCgOyrlInppdW0AoOIjgAFjaHQAwivKK80rAAFyecYrySsA4DXYydxGZGMAeQBbZPIhb2tnYQABaW/UK9creAD0ANERaCJlYWQAAAFsct4r5ytlAGYAdABhAHIAcgBvAPcAXQbpJGdodGFycm93AKCgIQAJQUhhYmNkZmdobG1vcHJzdHV3CiwNLBEsHSwnLDEsQCxLLFIsYix6LIQsjyzLLOgs7Sz/LAotcgDyAAkDYQByAACgYykAAWNyFSwbLHUAdABlADuA+gD6QPIACQ1yAOMBIywAACUseQBeZHYAZQBtYQABaXkrLDAscgBjADuA+wD7QENkgAFhYmgANyw6LD0scgDyANEO7CFhY3FhYQDyAOAOAAFpckQsSCzzIWh0AKB+KQDgNdgy3XIAYQB2AGUAO4D5APlAYQFWLF8scgAAAWxyWixcLACgvyEAoL4hbABrAACggCUAAWN0Zix2LG8CbCwAAAAAcyxyAG4AZaAcI3IAAKAcI28AcAAAoA8jcgBpAACg+CUAAWFsfiyBLGMAcgBrYTuAqACoQAABZ3CILIssbwBuAHNhZgAA4DXYZt0AA2FkaGxzdZksniynLLgsuyzFLHIAcgBvAPcACQ1vAHcAbgBhAHIAcgBvAPcA2A5hI3Jwb29uAAABbHKvLLMsZQBmAPQAWyxpAGcAaAD0AF0sdQDzAKYOaQAAocUDaGzBLMIs0mNvAG4AxWPwI2Fycm93cwCgyCGAAWNpdADRLOEs5CxvAtcsAAAAAN4scgBuAGWgHSNyAACgHSNvAHAAAKAOI24AZwBvYXIAaQAAoPklYwByAADgNdjK3IABZGlyAPMs9yz6LG8AdAAAoPAi7CFkZWlhaQBmoLUlAKC0JQABYW0DLQYtcgDyAMosbAA7gPwA/EDhIm5nbGUAoKcpgAdBQkRhY2RlZmxub3Byc3oAJy0qLTAtNC2bLZ0toS2/LcMtxy3TLdgt3C3gLfwtcgDyABADYQByAHag6CoAoOkqYQBzAOgA/gIAAW5yOC08LechcnQAoJwpgANla25wcnN0AJkpSC1NLVQtXi1iLYItYQBwAHAA4QAaHG8AdABoAGkAbgDnAKEXgAFoaXIAoSmzJFotbwBwAPQAdCVooJUh7wD4JgABaXVmLWotZwBtAOEAuygAAWJwbi14LXMjZXRuZXEAceCKIgD+AODLKgD+cyNldG5lcQBx4IsiAP4A4MwqAP4AAWhyhi2KLWUAdADhABIraSNhbmdsZQAAAWxyki2WLeUhZnQAoLIiaSJnaHQAAKCzInkAMmThIXNoAKCiIoABZWxyAKcttC24LWKiKCKuLQAAAACyLWEAcgAAoLsicQAAoFoi7CFpcACg7iIAAWJ0vC1eD2EA8gBfD3IAAOA12DPddAByAOkAlS1zAHUAAAFicM0t0C0A4IIi0iAA4IMi0iBwAGYAAOA12GfdcgBvAPAAWQt0AHIA6QCaLQABY3XkLegtcgAA4DXYy9wAAWJw7C30LW4AAAFFZXUt8S0A4IoiAP5uAAABRWV/LfktAOCLIgD+6SJnemFnAKCaKYADY2Vmb3BycwANLhAuJS4pLiMuLi40LukhcmN1YQABZGkULiEuAAFiZxguHC5hAHIAAKBfKmUAcaAnIgCgWSLlIXJwAKAYIXIAAOA12DTdcABmAADgNdho3WWgQCJhAHQA6ABqD2MAcgAA4DXYzNzjCuQRUC4AAFQuAABYLmIuAAAAAGMubS5wLnQuAAAAAIguki4AAJouJxIqEnQAcgDpAB0ScgAA4DXYNd0AAUFhWy5eLnIA8gDnAnIA8gCTB75jAAFBYWYuaS5yAPIA4AJyAPIAjAdhAPAAeh5pAHMAAKD7IoABZHB0APgReS6DLgABZmx9LoAuAOA12GnddQDzAP8RaQBtAOUABBIAAUFhiy6OLnIA8gDuAnIA8gCaBwABY3GVLgoScgAA4DXYzdwAAXB0nS6hLmwAdQDzACUScgDpACASAARhY2VmaW9zdbEuvC7ELsguzC7PLtQu2S5jAAABdXm2LrsudABlADuA/QD9QE9kAAFpecAuwy5yAGMAd2FLZG4AO4ClAKVAcgAA4DXYNt1jAHkAV2RwAGYAAOA12GrdYwByAADgNdjO3AABY23dLt8ueQBOZGwAO4D/AP9AAAVhY2RlZmhpb3N38y73Lv8uAi8MLxAvEy8YLx0vIi9jInV0ZQB6YQABYXn7Lv4u8iFvbn5hN2RvAHQAfGEAAWV0Bi8KL3QAcgDmAB8QYQC2Y3IAAOA12DfdYwB5ADZk5yJyYXJyAKDdIXAAZgAA4DXYa91jAHIAAOA12M/cAAFqbiYvKC8AoA0gagAAoAwg");

// node_modules/htmlparser2/node_modules/entities/dist/generated/decode-data-xml.js
var xmlDecodeTree = /* @__PURE__ */ decodeBase64("AAJhZ2xxBwARABMAFQBtAg0AAAAAAA8AcAAmYG8AcwAnYHQAPmB0ADxg9SFvdCJg");

// node_modules/htmlparser2/node_modules/entities/dist/internal/bin-trie-flags.js
var BinTrieFlags;
(function(BinTrieFlags2) {
  BinTrieFlags2[BinTrieFlags2["VALUE_LENGTH"] = 49152] = "VALUE_LENGTH";
  BinTrieFlags2[BinTrieFlags2["FLAG13"] = 8192] = "FLAG13";
  BinTrieFlags2[BinTrieFlags2["BRANCH_LENGTH"] = 8064] = "BRANCH_LENGTH";
  BinTrieFlags2[BinTrieFlags2["JUMP_TABLE"] = 127] = "JUMP_TABLE";
})(BinTrieFlags || (BinTrieFlags = {}));

// node_modules/htmlparser2/node_modules/entities/dist/decode.js
var CharCodes;
(function(CharCodes3) {
  CharCodes3[CharCodes3["NUM"] = 35] = "NUM";
  CharCodes3[CharCodes3["SEMI"] = 59] = "SEMI";
  CharCodes3[CharCodes3["EQUALS"] = 61] = "EQUALS";
  CharCodes3[CharCodes3["ZERO"] = 48] = "ZERO";
  CharCodes3[CharCodes3["NINE"] = 57] = "NINE";
  CharCodes3[CharCodes3["LOWER_A"] = 97] = "LOWER_A";
  CharCodes3[CharCodes3["LOWER_F"] = 102] = "LOWER_F";
  CharCodes3[CharCodes3["LOWER_X"] = 120] = "LOWER_X";
  CharCodes3[CharCodes3["LOWER_Z"] = 122] = "LOWER_Z";
  CharCodes3[CharCodes3["UPPER_A"] = 65] = "UPPER_A";
  CharCodes3[CharCodes3["UPPER_F"] = 70] = "UPPER_F";
  CharCodes3[CharCodes3["UPPER_Z"] = 90] = "UPPER_Z";
})(CharCodes || (CharCodes = {}));
var TO_LOWER_BIT = 32;
function isNumber(code) {
  return code >= CharCodes.ZERO && code <= CharCodes.NINE;
}
__name(isNumber, "isNumber");
function isHexadecimalCharacter(code) {
  return code >= CharCodes.UPPER_A && code <= CharCodes.UPPER_F || code >= CharCodes.LOWER_A && code <= CharCodes.LOWER_F;
}
__name(isHexadecimalCharacter, "isHexadecimalCharacter");
function isAsciiAlphaNumeric(code) {
  return code >= CharCodes.UPPER_A && code <= CharCodes.UPPER_Z || code >= CharCodes.LOWER_A && code <= CharCodes.LOWER_Z || isNumber(code);
}
__name(isAsciiAlphaNumeric, "isAsciiAlphaNumeric");
function isEntityInAttributeInvalidEnd(code) {
  return code === CharCodes.EQUALS || isAsciiAlphaNumeric(code);
}
__name(isEntityInAttributeInvalidEnd, "isEntityInAttributeInvalidEnd");
var EntityDecoderState;
(function(EntityDecoderState2) {
  EntityDecoderState2[EntityDecoderState2["EntityStart"] = 0] = "EntityStart";
  EntityDecoderState2[EntityDecoderState2["NumericStart"] = 1] = "NumericStart";
  EntityDecoderState2[EntityDecoderState2["NumericDecimal"] = 2] = "NumericDecimal";
  EntityDecoderState2[EntityDecoderState2["NumericHex"] = 3] = "NumericHex";
  EntityDecoderState2[EntityDecoderState2["NamedEntity"] = 4] = "NamedEntity";
})(EntityDecoderState || (EntityDecoderState = {}));
var DecodingMode;
(function(DecodingMode2) {
  DecodingMode2[DecodingMode2["Legacy"] = 0] = "Legacy";
  DecodingMode2[DecodingMode2["Strict"] = 1] = "Strict";
  DecodingMode2[DecodingMode2["Attribute"] = 2] = "Attribute";
})(DecodingMode || (DecodingMode = {}));
var EntityDecoder = class {
  static {
    __name(this, "EntityDecoder");
  }
  decodeTree;
  emitCodePoint;
  errors;
  constructor(decodeTree, emitCodePoint, errors) {
    this.decodeTree = decodeTree;
    this.emitCodePoint = emitCodePoint;
    this.errors = errors;
  }
  /** The current state of the decoder. */
  state = EntityDecoderState.EntityStart;
  /** Characters that were consumed while parsing an entity. */
  consumed = 1;
  /**
   * The result of the entity.
   *
   * Either the result index of a numeric entity, or the codepoint of a
   * numeric entity.
   */
  result = 0;
  /** The current index in the decode tree. */
  treeIndex = 0;
  /** The number of characters that were consumed in excess. */
  excess = 1;
  /** The mode in which the decoder is operating. */
  decodeMode = DecodingMode.Strict;
  /** The number of characters that have been consumed in the current run. */
  runConsumed = 0;
  /**
   * Resets the instance to make it reusable.
   * @param decodeMode Entity decoding mode to use.
   */
  startEntity(decodeMode) {
    this.decodeMode = decodeMode;
    this.state = EntityDecoderState.EntityStart;
    this.result = 0;
    this.treeIndex = 0;
    this.excess = 1;
    this.consumed = 1;
    this.runConsumed = 0;
  }
  /**
   * Write an entity to the decoder. This can be called multiple times with partial entities.
   * If the entity is incomplete, the decoder will return -1.
   *
   * Mirrors the implementation of `getDecoder`, but with the ability to stop decoding if the
   * entity is incomplete, and resume when the next string is written.
   * @param input The string containing the entity (or a continuation of the entity).
   * @param offset The offset at which the entity begins. Should be 0 if this is not the first call.
   * @returns The number of characters that were consumed, or -1 if the entity is incomplete.
   */
  write(input, offset) {
    switch (this.state) {
      case EntityDecoderState.EntityStart: {
        if (input.charCodeAt(offset) === CharCodes.NUM) {
          this.state = EntityDecoderState.NumericStart;
          this.consumed += 1;
          return this.stateNumericStart(input, offset + 1);
        }
        this.state = EntityDecoderState.NamedEntity;
        return this.stateNamedEntity(input, offset);
      }
      case EntityDecoderState.NumericStart: {
        return this.stateNumericStart(input, offset);
      }
      case EntityDecoderState.NumericDecimal: {
        return this.stateNumericDecimal(input, offset);
      }
      case EntityDecoderState.NumericHex: {
        return this.stateNumericHex(input, offset);
      }
      case EntityDecoderState.NamedEntity: {
        return this.stateNamedEntity(input, offset);
      }
    }
  }
  /**
   * Switches between the numeric decimal and hexadecimal states.
   *
   * Equivalent to the `Numeric character reference state` in the HTML spec.
   * @param input The string containing the entity (or a continuation of the entity).
   * @param offset The current offset.
   * @returns The number of characters that were consumed, or -1 if the entity is incomplete.
   */
  stateNumericStart(input, offset) {
    if (offset >= input.length) {
      return -1;
    }
    if ((input.charCodeAt(offset) | TO_LOWER_BIT) === CharCodes.LOWER_X) {
      this.state = EntityDecoderState.NumericHex;
      this.consumed += 1;
      return this.stateNumericHex(input, offset + 1);
    }
    this.state = EntityDecoderState.NumericDecimal;
    return this.stateNumericDecimal(input, offset);
  }
  /**
   * Parses a hexadecimal numeric entity.
   *
   * Equivalent to the `Hexademical character reference state` in the HTML spec.
   * @param input The string containing the entity (or a continuation of the entity).
   * @param offset The current offset.
   * @returns The number of characters that were consumed, or -1 if the entity is incomplete.
   */
  stateNumericHex(input, offset) {
    while (offset < input.length) {
      const char = input.charCodeAt(offset);
      if (isNumber(char) || isHexadecimalCharacter(char)) {
        const digit = char <= CharCodes.NINE ? char - CharCodes.ZERO : (char | TO_LOWER_BIT) - CharCodes.LOWER_A + 10;
        this.result = this.result * 16 + digit;
        this.consumed++;
        offset++;
      } else {
        return this.emitNumericEntity(char, 3);
      }
    }
    return -1;
  }
  /**
   * Parses a decimal numeric entity.
   *
   * Equivalent to the `Decimal character reference state` in the HTML spec.
   * @param input The string containing the entity (or a continuation of the entity).
   * @param offset The current offset.
   * @returns The number of characters that were consumed, or -1 if the entity is incomplete.
   */
  stateNumericDecimal(input, offset) {
    while (offset < input.length) {
      const char = input.charCodeAt(offset);
      if (isNumber(char)) {
        this.result = this.result * 10 + (char - CharCodes.ZERO);
        this.consumed++;
        offset++;
      } else {
        return this.emitNumericEntity(char, 2);
      }
    }
    return -1;
  }
  /**
   * Validate and emit a numeric entity.
   *
   * Implements the logic from the `Hexademical character reference start
   * state` and `Numeric character reference end state` in the HTML spec.
   * @param lastCp The last code point of the entity. Used to see if the
   *               entity was terminated with a semicolon.
   * @param expectedLength The minimum number of characters that should be
   *                       consumed. Used to validate that at least one digit
   *                       was consumed.
   * @returns The number of characters that were consumed.
   */
  emitNumericEntity(lastCp, expectedLength) {
    if (this.consumed <= expectedLength) {
      this.errors?.absenceOfDigitsInNumericCharacterReference(this.consumed);
      return 0;
    }
    if (lastCp === CharCodes.SEMI) {
      this.consumed += 1;
    } else if (this.decodeMode === DecodingMode.Strict) {
      return 0;
    }
    this.emitCodePoint(replaceCodePoint(this.result), this.consumed);
    if (this.errors) {
      if (lastCp !== CharCodes.SEMI) {
        this.errors.missingSemicolonAfterCharacterReference();
      }
      this.errors.validateNumericCharacterReference(this.result);
    }
    return this.consumed;
  }
  /**
   * Parses a named entity.
   *
   * Equivalent to the `Named character reference state` in the HTML spec.
   * @param input The string containing the entity (or a continuation of the entity).
   * @param offset The current offset.
   * @returns The number of characters that were consumed, or -1 if the entity is incomplete.
   */
  stateNamedEntity(input, offset) {
    const { decodeTree } = this;
    let current = decodeTree[this.treeIndex];
    let valueLength = (current & BinTrieFlags.VALUE_LENGTH) >> 14;
    while (offset < input.length) {
      if (valueLength === 0 && (current & BinTrieFlags.FLAG13) !== 0) {
        const runLength = (current & BinTrieFlags.BRANCH_LENGTH) >> 7;
        if (this.runConsumed === 0) {
          const firstChar = current & BinTrieFlags.JUMP_TABLE;
          if (input.charCodeAt(offset) !== firstChar) {
            return this.result === 0 ? 0 : this.emitNotTerminatedNamedEntity();
          }
          offset++;
          this.excess++;
          this.runConsumed++;
        }
        while (this.runConsumed < runLength) {
          if (offset >= input.length) {
            return -1;
          }
          const charIndexInPacked = this.runConsumed - 1;
          const packedWord = decodeTree[this.treeIndex + 1 + (charIndexInPacked >> 1)];
          const expectedChar = charIndexInPacked % 2 === 0 ? packedWord & 255 : packedWord >> 8 & 255;
          if (input.charCodeAt(offset) !== expectedChar) {
            this.runConsumed = 0;
            return this.result === 0 ? 0 : this.emitNotTerminatedNamedEntity();
          }
          offset++;
          this.excess++;
          this.runConsumed++;
        }
        this.runConsumed = 0;
        this.treeIndex += 1 + (runLength >> 1);
        current = decodeTree[this.treeIndex];
        valueLength = (current & BinTrieFlags.VALUE_LENGTH) >> 14;
      }
      if (offset >= input.length)
        break;
      const char = input.charCodeAt(offset);
      if (char === CharCodes.SEMI && valueLength !== 0 && (current & BinTrieFlags.FLAG13) !== 0) {
        return this.emitNamedEntityData(this.treeIndex, valueLength, this.consumed + this.excess);
      }
      this.treeIndex = determineBranch(decodeTree, current, this.treeIndex + Math.max(1, valueLength), char);
      if (this.treeIndex < 0) {
        return this.result === 0 || // If we are parsing an attribute
        this.decodeMode === DecodingMode.Attribute && // We shouldn't have consumed any characters after the entity,
        (valueLength === 0 || // And there should be no invalid characters.
        isEntityInAttributeInvalidEnd(char)) ? 0 : this.emitNotTerminatedNamedEntity();
      }
      current = decodeTree[this.treeIndex];
      valueLength = (current & BinTrieFlags.VALUE_LENGTH) >> 14;
      if (valueLength !== 0) {
        if (char === CharCodes.SEMI) {
          return this.emitNamedEntityData(this.treeIndex, valueLength, this.consumed + this.excess);
        }
        if (this.decodeMode !== DecodingMode.Strict && (current & BinTrieFlags.FLAG13) === 0) {
          this.result = this.treeIndex;
          this.consumed += this.excess;
          this.excess = 0;
        }
      }
      offset++;
      this.excess++;
    }
    return -1;
  }
  /**
   * Emit a named entity that was not terminated with a semicolon.
   * @returns The number of characters consumed.
   */
  emitNotTerminatedNamedEntity() {
    const { result, decodeTree } = this;
    const valueLength = (decodeTree[result] & BinTrieFlags.VALUE_LENGTH) >> 14;
    this.emitNamedEntityData(result, valueLength, this.consumed);
    this.errors?.missingSemicolonAfterCharacterReference();
    return this.consumed;
  }
  /**
   * Emit a named entity.
   * @param result The index of the entity in the decode tree.
   * @param valueLength The number of bytes in the entity.
   * @param consumed The number of characters consumed.
   * @returns The number of characters consumed.
   */
  emitNamedEntityData(result, valueLength, consumed) {
    const { decodeTree } = this;
    this.emitCodePoint(valueLength === 1 ? decodeTree[result] & ~(BinTrieFlags.VALUE_LENGTH | BinTrieFlags.FLAG13) : decodeTree[result + 1], consumed);
    if (valueLength === 3) {
      this.emitCodePoint(decodeTree[result + 2], consumed);
    }
    return consumed;
  }
  /**
   * Signal to the parser that the end of the input was reached.
   *
   * Remaining data will be emitted and relevant errors will be produced.
   * @returns The number of characters consumed.
   */
  end() {
    switch (this.state) {
      case EntityDecoderState.NamedEntity: {
        return this.result !== 0 && (this.decodeMode !== DecodingMode.Attribute || this.result === this.treeIndex) ? this.emitNotTerminatedNamedEntity() : 0;
      }
      // Otherwise, emit a numeric entity if we have one.
      case EntityDecoderState.NumericDecimal: {
        return this.emitNumericEntity(0, 2);
      }
      case EntityDecoderState.NumericHex: {
        return this.emitNumericEntity(0, 3);
      }
      case EntityDecoderState.NumericStart: {
        this.errors?.absenceOfDigitsInNumericCharacterReference(this.consumed);
        return 0;
      }
      case EntityDecoderState.EntityStart: {
        return 0;
      }
    }
  }
};
function determineBranch(decodeTree, current, nodeIndex, char) {
  const branchCount = (current & BinTrieFlags.BRANCH_LENGTH) >> 7;
  const jumpOffset = current & BinTrieFlags.JUMP_TABLE;
  if (branchCount === 0) {
    return jumpOffset !== 0 && char === jumpOffset ? nodeIndex : -1;
  }
  if (jumpOffset) {
    const value = char - jumpOffset;
    return value < 0 || value >= branchCount ? -1 : decodeTree[nodeIndex + value] - 1;
  }
  const packedKeySlots = branchCount + 1 >> 1;
  let lo = 0;
  let hi = branchCount - 1;
  while (lo <= hi) {
    const mid = lo + hi >>> 1;
    const slot = mid >> 1;
    const packed = decodeTree[nodeIndex + slot];
    const midKey = packed >> (mid & 1) * 8 & 255;
    if (midKey < char) {
      lo = mid + 1;
    } else if (midKey > char) {
      hi = mid - 1;
    } else {
      return decodeTree[nodeIndex + packedKeySlots + mid];
    }
  }
  return -1;
}
__name(determineBranch, "determineBranch");

// node_modules/htmlparser2/dist/Tokenizer.js
var CharCodes2;
(function(CharCodes3) {
  CharCodes3[CharCodes3["Tab"] = 9] = "Tab";
  CharCodes3[CharCodes3["NewLine"] = 10] = "NewLine";
  CharCodes3[CharCodes3["FormFeed"] = 12] = "FormFeed";
  CharCodes3[CharCodes3["CarriageReturn"] = 13] = "CarriageReturn";
  CharCodes3[CharCodes3["Space"] = 32] = "Space";
  CharCodes3[CharCodes3["ExclamationMark"] = 33] = "ExclamationMark";
  CharCodes3[CharCodes3["Number"] = 35] = "Number";
  CharCodes3[CharCodes3["Amp"] = 38] = "Amp";
  CharCodes3[CharCodes3["SingleQuote"] = 39] = "SingleQuote";
  CharCodes3[CharCodes3["DoubleQuote"] = 34] = "DoubleQuote";
  CharCodes3[CharCodes3["Dash"] = 45] = "Dash";
  CharCodes3[CharCodes3["Slash"] = 47] = "Slash";
  CharCodes3[CharCodes3["Zero"] = 48] = "Zero";
  CharCodes3[CharCodes3["Nine"] = 57] = "Nine";
  CharCodes3[CharCodes3["Semi"] = 59] = "Semi";
  CharCodes3[CharCodes3["Lt"] = 60] = "Lt";
  CharCodes3[CharCodes3["Eq"] = 61] = "Eq";
  CharCodes3[CharCodes3["Gt"] = 62] = "Gt";
  CharCodes3[CharCodes3["Questionmark"] = 63] = "Questionmark";
  CharCodes3[CharCodes3["UpperA"] = 65] = "UpperA";
  CharCodes3[CharCodes3["LowerA"] = 97] = "LowerA";
  CharCodes3[CharCodes3["UpperF"] = 70] = "UpperF";
  CharCodes3[CharCodes3["LowerF"] = 102] = "LowerF";
  CharCodes3[CharCodes3["UpperZ"] = 90] = "UpperZ";
  CharCodes3[CharCodes3["LowerZ"] = 122] = "LowerZ";
  CharCodes3[CharCodes3["LowerX"] = 120] = "LowerX";
  CharCodes3[CharCodes3["OpeningSquareBracket"] = 91] = "OpeningSquareBracket";
})(CharCodes2 || (CharCodes2 = {}));
var State;
(function(State2) {
  State2[State2["Text"] = 1] = "Text";
  State2[State2["BeforeTagName"] = 2] = "BeforeTagName";
  State2[State2["InTagName"] = 3] = "InTagName";
  State2[State2["InSelfClosingTag"] = 4] = "InSelfClosingTag";
  State2[State2["BeforeClosingTagName"] = 5] = "BeforeClosingTagName";
  State2[State2["InClosingTagName"] = 6] = "InClosingTagName";
  State2[State2["AfterClosingTagName"] = 7] = "AfterClosingTagName";
  State2[State2["BeforeAttributeName"] = 8] = "BeforeAttributeName";
  State2[State2["InAttributeName"] = 9] = "InAttributeName";
  State2[State2["AfterAttributeName"] = 10] = "AfterAttributeName";
  State2[State2["BeforeAttributeValue"] = 11] = "BeforeAttributeValue";
  State2[State2["InAttributeValueDq"] = 12] = "InAttributeValueDq";
  State2[State2["InAttributeValueSq"] = 13] = "InAttributeValueSq";
  State2[State2["InAttributeValueNq"] = 14] = "InAttributeValueNq";
  State2[State2["BeforeDeclaration"] = 15] = "BeforeDeclaration";
  State2[State2["InDeclaration"] = 16] = "InDeclaration";
  State2[State2["InProcessingInstruction"] = 17] = "InProcessingInstruction";
  State2[State2["BeforeComment"] = 18] = "BeforeComment";
  State2[State2["CDATASequence"] = 19] = "CDATASequence";
  State2[State2["DeclarationSequence"] = 20] = "DeclarationSequence";
  State2[State2["InSpecialComment"] = 21] = "InSpecialComment";
  State2[State2["InCommentLike"] = 22] = "InCommentLike";
  State2[State2["SpecialStartSequence"] = 23] = "SpecialStartSequence";
  State2[State2["InSpecialTag"] = 24] = "InSpecialTag";
  State2[State2["InPlainText"] = 25] = "InPlainText";
  State2[State2["InEntity"] = 26] = "InEntity";
})(State || (State = {}));
function isWhitespace(c) {
  return c === CharCodes2.Space || c === CharCodes2.NewLine || c === CharCodes2.Tab || c === CharCodes2.FormFeed || c === CharCodes2.CarriageReturn;
}
__name(isWhitespace, "isWhitespace");
function isEndOfTagSection(c) {
  return c === CharCodes2.Slash || c === CharCodes2.Gt || isWhitespace(c);
}
__name(isEndOfTagSection, "isEndOfTagSection");
function isASCIIAlpha(c) {
  return c >= CharCodes2.LowerA && c <= CharCodes2.LowerZ || c >= CharCodes2.UpperA && c <= CharCodes2.UpperZ;
}
__name(isASCIIAlpha, "isASCIIAlpha");
var QuoteType;
(function(QuoteType2) {
  QuoteType2[QuoteType2["NoValue"] = 0] = "NoValue";
  QuoteType2[QuoteType2["Unquoted"] = 1] = "Unquoted";
  QuoteType2[QuoteType2["Single"] = 2] = "Single";
  QuoteType2[QuoteType2["Double"] = 3] = "Double";
})(QuoteType || (QuoteType = {}));
var Sequences = {
  Empty: new Uint8Array(0),
  Cdata: new Uint8Array([67, 68, 65, 84, 65, 91]),
  // CDATA[
  CdataEnd: new Uint8Array([93, 93, 62]),
  // ]]>
  CommentEnd: new Uint8Array([45, 45, 33, 62]),
  // `--!>`
  Doctype: new Uint8Array([100, 111, 99, 116, 121, 112, 101]),
  // `doctype`
  IframeEnd: new Uint8Array([60, 47, 105, 102, 114, 97, 109, 101]),
  // `</iframe`
  NoembedEnd: new Uint8Array([
    60,
    47,
    110,
    111,
    101,
    109,
    98,
    101,
    100
  ]),
  // `</noembed`
  NoframesEnd: new Uint8Array([
    60,
    47,
    110,
    111,
    102,
    114,
    97,
    109,
    101,
    115
  ]),
  // `</noframes`
  Plaintext: new Uint8Array([
    60,
    47,
    112,
    108,
    97,
    105,
    110,
    116,
    101,
    120,
    116
  ]),
  // `</plaintext`
  ScriptEnd: new Uint8Array([60, 47, 115, 99, 114, 105, 112, 116]),
  // `<\/script`
  StyleEnd: new Uint8Array([60, 47, 115, 116, 121, 108, 101]),
  // `</style`
  TitleEnd: new Uint8Array([60, 47, 116, 105, 116, 108, 101]),
  // `</title`
  TextareaEnd: new Uint8Array([
    60,
    47,
    116,
    101,
    120,
    116,
    97,
    114,
    101,
    97
  ]),
  // `</textarea`
  XmpEnd: new Uint8Array([60, 47, 120, 109, 112])
  // `</xmp`
};
var specialStartSequences = /* @__PURE__ */ new Map([
  [Sequences.IframeEnd[2], Sequences.IframeEnd],
  [Sequences.NoembedEnd[2], Sequences.NoembedEnd],
  [Sequences.Plaintext[2], Sequences.Plaintext],
  [Sequences.ScriptEnd[2], Sequences.ScriptEnd],
  [Sequences.TitleEnd[2], Sequences.TitleEnd],
  [Sequences.XmpEnd[2], Sequences.XmpEnd]
]);
var Tokenizer = class {
  static {
    __name(this, "Tokenizer");
  }
  cbs;
  /** The current state the tokenizer is in. */
  state = State.Text;
  /** The read buffer. */
  buffer = "";
  /** The beginning of the section that is currently being read. */
  sectionStart = 0;
  /** The index within the buffer that we are currently looking at. */
  index = 0;
  /** The start of the last entity. */
  entityStart = 0;
  /** Some behavior, eg. when decoding entities, is done while we are in another state. This keeps track of the other state type. */
  baseState = State.Text;
  /** For special parsing behavior inside of script and style tags. */
  isSpecial = false;
  /** Indicates whether the tokenizer has been paused. */
  running = true;
  /** The offset of the current buffer. */
  offset = 0;
  xmlMode;
  decodeEntities;
  recognizeSelfClosing;
  entityDecoder;
  constructor({ xmlMode = false, decodeEntities = true, recognizeSelfClosing = xmlMode }, cbs) {
    this.cbs = cbs;
    this.xmlMode = xmlMode;
    this.decodeEntities = decodeEntities;
    this.recognizeSelfClosing = recognizeSelfClosing;
    this.entityDecoder = new EntityDecoder(xmlMode ? xmlDecodeTree : htmlDecodeTree, (cp, consumed) => this.emitCodePoint(cp, consumed));
  }
  reset() {
    this.state = State.Text;
    this.buffer = "";
    this.sectionStart = 0;
    this.index = 0;
    this.baseState = State.Text;
    this.isSpecial = false;
    this.currentSequence = Sequences.Empty;
    this.sequenceIndex = 0;
    this.running = true;
    this.offset = 0;
  }
  write(chunk) {
    this.offset += this.buffer.length;
    this.buffer = chunk;
    this.parse();
  }
  end() {
    if (this.running)
      this.finish();
  }
  pause() {
    this.running = false;
  }
  resume() {
    this.running = true;
    if (this.index < this.buffer.length + this.offset) {
      this.parse();
    }
  }
  stateText(c) {
    if (c === CharCodes2.Lt || !this.decodeEntities && this.fastForwardTo(CharCodes2.Lt)) {
      if (this.index > this.sectionStart) {
        this.cbs.ontext(this.sectionStart, this.index);
      }
      this.state = State.BeforeTagName;
      this.sectionStart = this.index;
    } else if (this.decodeEntities && c === CharCodes2.Amp) {
      this.startEntity();
    }
  }
  currentSequence = Sequences.Empty;
  sequenceIndex = 0;
  enterTagBody() {
    if (this.currentSequence === Sequences.Plaintext) {
      this.currentSequence = Sequences.Empty;
      this.state = State.InPlainText;
    } else if (this.isSpecial) {
      this.state = State.InSpecialTag;
      this.sequenceIndex = 0;
    } else {
      this.state = State.Text;
    }
  }
  /**
   * Match the opening tag name against an HTML text-only tag sequence.
   *
   * Some tags share an initial prefix (`script`/`style`, `title`/`textarea`,
   * `noembed`/`noframes`), so we may switch to an alternate sequence at the
   * first distinguishing byte.  On a successful full match we fall back to
   * the normal tag-name state; a later `>` will enter raw-text, RCDATA, or
   * plaintext mode based on `currentSequence` / `isSpecial`.
   * @param c Current character code point.
   */
  stateSpecialStartSequence(c) {
    const lower = c | 32;
    if (this.sequenceIndex < this.currentSequence.length) {
      if (lower === this.currentSequence[this.sequenceIndex]) {
        this.sequenceIndex++;
        return;
      }
      if (this.sequenceIndex === 3) {
        if (this.currentSequence === Sequences.ScriptEnd && lower === Sequences.StyleEnd[3]) {
          this.currentSequence = Sequences.StyleEnd;
          this.sequenceIndex = 4;
          return;
        }
        if (this.currentSequence === Sequences.TitleEnd && lower === Sequences.TextareaEnd[3]) {
          this.currentSequence = Sequences.TextareaEnd;
          this.sequenceIndex = 4;
          return;
        }
      } else if (this.sequenceIndex === 4 && this.currentSequence === Sequences.NoembedEnd && lower === Sequences.NoframesEnd[4]) {
        this.currentSequence = Sequences.NoframesEnd;
        this.sequenceIndex = 5;
        return;
      }
    } else if (isEndOfTagSection(c)) {
      this.sequenceIndex = 0;
      this.state = State.InTagName;
      this.stateInTagName(c);
      return;
    }
    this.isSpecial = false;
    this.currentSequence = Sequences.Empty;
    this.sequenceIndex = 0;
    this.state = State.InTagName;
    this.stateInTagName(c);
  }
  stateCDATASequence(c) {
    if (c === Sequences.Cdata[this.sequenceIndex]) {
      if (++this.sequenceIndex === Sequences.Cdata.length) {
        this.state = State.InCommentLike;
        this.currentSequence = Sequences.CdataEnd;
        this.sequenceIndex = 0;
        this.sectionStart = this.index + 1;
      }
    } else {
      this.sequenceIndex = 0;
      if (this.xmlMode) {
        this.state = State.InDeclaration;
        this.stateInDeclaration(c);
      } else {
        this.state = State.InSpecialComment;
        this.stateInSpecialComment(c);
      }
    }
  }
  /**
   * When we wait for one specific character, we can speed things up
   * by skipping through the buffer until we find it.
   * @param c Current character code point.
   * @returns Whether the character was found.
   */
  fastForwardTo(c) {
    while (++this.index < this.buffer.length + this.offset) {
      if (this.buffer.charCodeAt(this.index - this.offset) === c) {
        return true;
      }
    }
    this.index = this.buffer.length + this.offset - 1;
    return false;
  }
  /**
   * Emit a comment token and return to the text state.
   * @param offset Number of characters in the end sequence that have already been matched.
   */
  emitComment(offset) {
    this.cbs.oncomment(this.sectionStart, this.index, offset);
    this.sequenceIndex = 0;
    this.sectionStart = this.index + 1;
    this.state = State.Text;
  }
  /**
   * Comments and CDATA end with `-->` and `]]>`.
   *
   * Their common qualities are:
   * - Their end sequences have a distinct character they start with.
   * - That character is then repeated, so we have to check multiple repeats.
   * - All characters but the start character of the sequence can be skipped.
   * @param c Current character code point.
   */
  stateInCommentLike(c) {
    if (!this.xmlMode && this.currentSequence === Sequences.CommentEnd && this.sequenceIndex <= 1 && /*
     * We're still at the very start of the comment: the only
     * characters consumed since `<!--` are the dashes that
     * advanced sequenceIndex (0 for `<!-->`, 1 for `<!--->`).
     */
    this.index === this.sectionStart + this.sequenceIndex && c === CharCodes2.Gt) {
      this.emitComment(this.sequenceIndex);
    } else if (this.currentSequence === Sequences.CommentEnd && this.sequenceIndex === 2 && c === CharCodes2.Gt) {
      this.emitComment(2);
    } else if (this.currentSequence === Sequences.CommentEnd && this.sequenceIndex === this.currentSequence.length - 1 && c !== CharCodes2.Gt) {
      this.sequenceIndex = Number(c === CharCodes2.Dash);
    } else if (c === this.currentSequence[this.sequenceIndex]) {
      if (++this.sequenceIndex === this.currentSequence.length) {
        if (this.currentSequence === Sequences.CdataEnd) {
          this.cbs.oncdata(this.sectionStart, this.index, 2);
        } else {
          this.cbs.oncomment(this.sectionStart, this.index, 3);
        }
        this.sequenceIndex = 0;
        this.sectionStart = this.index + 1;
        this.state = State.Text;
      }
    } else if (this.sequenceIndex === 0) {
      if (this.fastForwardTo(this.currentSequence[0])) {
        this.sequenceIndex = 1;
      }
    } else if (c !== this.currentSequence[this.sequenceIndex - 1]) {
      this.sequenceIndex = 0;
    }
  }
  /**
   * HTML only allows ASCII alpha characters (a-z and A-Z) at the beginning of a tag name.
   *
   * XML allows a lot more characters here (@see https://www.w3.org/TR/REC-xml/#NT-NameStartChar).
   * We allow anything that wouldn't end the tag.
   * @param c Current character code point.
   */
  isTagStartChar(c) {
    return this.xmlMode ? !isEndOfTagSection(c) : isASCIIAlpha(c);
  }
  /**
   * Scan raw-text / RCDATA content for the matching end tag.
   *
   * For RCDATA tags (`<title>`, `<textarea>`) entities are decoded inline.
   * For raw-text tags (`<script>`, `<style>`, etc.) we fast-forward to `<`.
   * @param c Current character code point.
   */
  stateInSpecialTag(c) {
    if (this.sequenceIndex === this.currentSequence.length) {
      if (isEndOfTagSection(c)) {
        const endOfText = this.index - this.currentSequence.length;
        if (this.sectionStart < endOfText) {
          const actualIndex = this.index;
          this.index = endOfText;
          this.cbs.ontext(this.sectionStart, endOfText);
          this.index = actualIndex;
        }
        this.isSpecial = false;
        this.sectionStart = endOfText + 2;
        this.stateInClosingTagName(c);
        return;
      }
      this.sequenceIndex = 0;
    }
    if ((c | 32) === this.currentSequence[this.sequenceIndex]) {
      this.sequenceIndex += 1;
    } else if (this.sequenceIndex === 0) {
      if (this.currentSequence === Sequences.TitleEnd || this.currentSequence === Sequences.TextareaEnd) {
        if (this.decodeEntities && c === CharCodes2.Amp) {
          this.startEntity();
        }
      } else if (this.fastForwardTo(CharCodes2.Lt)) {
        this.sequenceIndex = 1;
      }
    } else {
      this.sequenceIndex = Number(c === CharCodes2.Lt);
    }
  }
  stateBeforeTagName(c) {
    if (c === CharCodes2.ExclamationMark) {
      this.state = State.BeforeDeclaration;
      this.sectionStart = this.index + 1;
    } else if (c === CharCodes2.Questionmark) {
      if (this.xmlMode) {
        this.state = State.InProcessingInstruction;
        this.sequenceIndex = 0;
        this.sectionStart = this.index + 1;
      } else {
        this.state = State.InSpecialComment;
        this.sectionStart = this.index;
      }
    } else if (this.isTagStartChar(c)) {
      this.sectionStart = this.index;
      const special = this.xmlMode || this.cbs.isInForeignContext?.() ? void 0 : specialStartSequences.get(c | 32);
      if (special === void 0) {
        this.state = State.InTagName;
      } else {
        this.isSpecial = true;
        this.currentSequence = special;
        this.sequenceIndex = 3;
        this.state = State.SpecialStartSequence;
      }
    } else if (c === CharCodes2.Slash) {
      this.state = State.BeforeClosingTagName;
    } else {
      this.state = State.Text;
      this.stateText(c);
    }
  }
  stateInTagName(c) {
    if (isEndOfTagSection(c)) {
      this.cbs.onopentagname(this.sectionStart, this.index);
      this.sectionStart = -1;
      this.state = State.BeforeAttributeName;
      this.stateBeforeAttributeName(c);
    }
  }
  stateBeforeClosingTagName(c) {
    if (isWhitespace(c)) {
      if (this.xmlMode) {
      } else {
        this.state = State.InSpecialComment;
        this.sectionStart = this.index;
      }
    } else if (c === CharCodes2.Gt) {
      this.state = State.Text;
      if (!this.xmlMode) {
        this.sectionStart = this.index + 1;
      }
    } else {
      this.state = this.isTagStartChar(c) ? State.InClosingTagName : State.InSpecialComment;
      this.sectionStart = this.index;
    }
  }
  stateInClosingTagName(c) {
    if (isEndOfTagSection(c)) {
      this.cbs.onclosetag(this.sectionStart, this.index);
      this.sectionStart = -1;
      this.state = State.AfterClosingTagName;
      this.stateAfterClosingTagName(c);
    }
  }
  stateAfterClosingTagName(c) {
    if (c === CharCodes2.Gt || this.fastForwardTo(CharCodes2.Gt)) {
      this.state = State.Text;
      this.sectionStart = this.index + 1;
    }
  }
  stateBeforeAttributeName(c) {
    if (c === CharCodes2.Gt) {
      this.cbs.onopentagend(this.index);
      this.enterTagBody();
      this.sectionStart = this.index + 1;
    } else if (c === CharCodes2.Slash) {
      this.state = State.InSelfClosingTag;
    } else if (!isWhitespace(c)) {
      this.state = State.InAttributeName;
      this.sectionStart = this.index;
    }
  }
  /**
   * Handle `/` before `>` in an opening tag.
   *
   * In HTML mode, text-only tags ignore the self-closing flag and still enter
   * their raw-text/RCDATA/plaintext state unless self-closing tags are being
   * recognized. In XML mode, or for ordinary tags, the tokenizer returns to
   * regular text parsing after emitting the self-closing callback.
   * @param c Current character code point.
   */
  stateInSelfClosingTag(c) {
    if (c === CharCodes2.Gt) {
      this.cbs.onselfclosingtag(this.index);
      this.sectionStart = this.index + 1;
      if (!this.recognizeSelfClosing) {
        this.enterTagBody();
        return;
      }
      this.state = State.Text;
      this.isSpecial = false;
      this.currentSequence = Sequences.Empty;
    } else if (!isWhitespace(c)) {
      this.state = State.BeforeAttributeName;
      this.stateBeforeAttributeName(c);
    }
  }
  stateInAttributeName(c) {
    if (c === CharCodes2.Eq || isEndOfTagSection(c)) {
      this.cbs.onattribname(this.sectionStart, this.index);
      this.sectionStart = this.index;
      this.state = State.AfterAttributeName;
      this.stateAfterAttributeName(c);
    }
  }
  stateAfterAttributeName(c) {
    if (c === CharCodes2.Eq) {
      this.state = State.BeforeAttributeValue;
    } else if (c === CharCodes2.Slash || c === CharCodes2.Gt) {
      this.cbs.onattribend(QuoteType.NoValue, this.sectionStart);
      this.sectionStart = -1;
      this.state = State.BeforeAttributeName;
      this.stateBeforeAttributeName(c);
    } else if (!isWhitespace(c)) {
      this.cbs.onattribend(QuoteType.NoValue, this.sectionStart);
      this.state = State.InAttributeName;
      this.sectionStart = this.index;
    }
  }
  stateBeforeAttributeValue(c) {
    if (c === CharCodes2.DoubleQuote) {
      this.state = State.InAttributeValueDq;
      this.sectionStart = this.index + 1;
    } else if (c === CharCodes2.SingleQuote) {
      this.state = State.InAttributeValueSq;
      this.sectionStart = this.index + 1;
    } else if (!isWhitespace(c)) {
      this.sectionStart = this.index;
      this.state = State.InAttributeValueNq;
      this.stateInAttributeValueNoQuotes(c);
    }
  }
  handleInAttributeValue(c, quote) {
    if (c === quote || !this.decodeEntities && this.fastForwardTo(quote)) {
      this.cbs.onattribdata(this.sectionStart, this.index);
      this.sectionStart = -1;
      this.cbs.onattribend(quote === CharCodes2.DoubleQuote ? QuoteType.Double : QuoteType.Single, this.index + 1);
      this.state = State.BeforeAttributeName;
    } else if (this.decodeEntities && c === CharCodes2.Amp) {
      this.startEntity();
    }
  }
  stateInAttributeValueDoubleQuotes(c) {
    this.handleInAttributeValue(c, CharCodes2.DoubleQuote);
  }
  stateInAttributeValueSingleQuotes(c) {
    this.handleInAttributeValue(c, CharCodes2.SingleQuote);
  }
  stateInAttributeValueNoQuotes(c) {
    if (isWhitespace(c) || c === CharCodes2.Gt) {
      this.cbs.onattribdata(this.sectionStart, this.index);
      this.sectionStart = -1;
      this.cbs.onattribend(QuoteType.Unquoted, this.index);
      this.state = State.BeforeAttributeName;
      this.stateBeforeAttributeName(c);
    } else if (this.decodeEntities && c === CharCodes2.Amp) {
      this.startEntity();
    }
  }
  /**
   * Distinguish between CDATA, declarations, HTML comments, and HTML bogus
   * comments after `<!`.
   *
   * In HTML mode, only real comments and doctypes stay on declaration paths;
   * everything else becomes a bogus comment terminated by the next `>`.
   * @param c Current character code point.
   */
  stateBeforeDeclaration(c) {
    if (c === CharCodes2.OpeningSquareBracket) {
      this.state = State.CDATASequence;
      this.sequenceIndex = 0;
    } else if (this.xmlMode) {
      this.state = c === CharCodes2.Dash ? State.BeforeComment : State.InDeclaration;
    } else if ((c | 32) === Sequences.Doctype[0]) {
      this.state = State.DeclarationSequence;
      this.currentSequence = Sequences.Doctype;
      this.sequenceIndex = 1;
    } else if (c === CharCodes2.Gt) {
      this.cbs.oncomment(this.sectionStart, this.index, 0);
      this.state = State.Text;
      this.sectionStart = this.index + 1;
    } else if (c === CharCodes2.Dash) {
      this.state = State.BeforeComment;
    } else {
      this.state = State.InSpecialComment;
    }
  }
  /**
   * Continue matching `doctype` after `<!d`.
   *
   * A full `doctype` match stays on the declaration path; any other name falls
   * back to an HTML bogus comment, which matches browser behavior for
   * non-doctype `<!...>` constructs.
   * @param c Current character code point.
   */
  stateDeclarationSequence(c) {
    if (this.sequenceIndex === this.currentSequence.length) {
      this.state = State.InDeclaration;
      this.stateInDeclaration(c);
    } else if ((c | 32) === this.currentSequence[this.sequenceIndex]) {
      this.sequenceIndex += 1;
    } else if (c === CharCodes2.Gt) {
      this.cbs.oncomment(this.sectionStart, this.index, 0);
      this.state = State.Text;
      this.sectionStart = this.index + 1;
    } else {
      this.state = State.InSpecialComment;
    }
  }
  stateInDeclaration(c) {
    if (c === CharCodes2.Gt || this.fastForwardTo(CharCodes2.Gt)) {
      this.cbs.ondeclaration(this.sectionStart, this.index);
      this.state = State.Text;
      this.sectionStart = this.index + 1;
    }
  }
  /**
   * XML processing instructions (`<?...?>`).
   *
   * In HTML mode `<?` is routed to `InSpecialComment` instead, so this
   * state is only reachable in XML mode.
   * @param c Current character code point.
   */
  stateInProcessingInstruction(c) {
    if (c === CharCodes2.Questionmark) {
      this.sequenceIndex = 1;
    } else if (c === CharCodes2.Gt && this.sequenceIndex === 1) {
      this.cbs.onprocessinginstruction(this.sectionStart, this.index - 1);
      this.sequenceIndex = 0;
      this.state = State.Text;
      this.sectionStart = this.index + 1;
    } else {
      this.sequenceIndex = Number(this.fastForwardTo(CharCodes2.Questionmark));
    }
  }
  stateBeforeComment(c) {
    if (c === CharCodes2.Dash) {
      this.state = State.InCommentLike;
      this.currentSequence = Sequences.CommentEnd;
      this.sequenceIndex = 0;
      this.sectionStart = this.index + 1;
    } else if (this.xmlMode) {
      this.state = State.InDeclaration;
    } else if (c === CharCodes2.Gt) {
      this.cbs.oncomment(this.sectionStart, this.index, 0);
      this.state = State.Text;
      this.sectionStart = this.index + 1;
    } else {
      this.state = State.InSpecialComment;
    }
  }
  stateInSpecialComment(c) {
    if (c === CharCodes2.Gt || this.fastForwardTo(CharCodes2.Gt)) {
      this.cbs.oncomment(this.sectionStart, this.index, 0);
      this.state = State.Text;
      this.sectionStart = this.index + 1;
    }
  }
  startEntity() {
    this.baseState = this.state;
    this.state = State.InEntity;
    this.entityStart = this.index;
    this.entityDecoder.startEntity(this.xmlMode ? DecodingMode.Strict : this.baseState === State.Text || this.baseState === State.InSpecialTag ? DecodingMode.Legacy : DecodingMode.Attribute);
  }
  stateInEntity() {
    const indexInBuffer = this.index - this.offset;
    const length = this.entityDecoder.write(this.buffer, indexInBuffer);
    if (length >= 0) {
      this.state = this.baseState;
      if (length === 0) {
        this.index -= 1;
      }
    } else {
      if (indexInBuffer < this.buffer.length && this.buffer.charCodeAt(indexInBuffer) === CharCodes2.Amp) {
        this.state = this.baseState;
        this.index -= 1;
        return;
      }
      this.index = this.offset + this.buffer.length - 1;
    }
  }
  /**
   * Remove data that has already been consumed from the buffer.
   */
  cleanup() {
    if (this.running && this.sectionStart !== this.index) {
      if (this.state === State.Text || this.state === State.InPlainText || this.state === State.InSpecialTag && this.sequenceIndex === 0) {
        this.cbs.ontext(this.sectionStart, this.index);
        this.sectionStart = this.index;
      } else if (this.state === State.InAttributeValueDq || this.state === State.InAttributeValueSq || this.state === State.InAttributeValueNq) {
        this.cbs.onattribdata(this.sectionStart, this.index);
        this.sectionStart = this.index;
      }
    }
  }
  shouldContinue() {
    return this.index < this.buffer.length + this.offset && this.running;
  }
  /**
   * Iterates through the buffer, calling the function corresponding to the current state.
   *
   * States that are more likely to be hit are higher up, as a performance improvement.
   */
  parse() {
    while (this.shouldContinue()) {
      const c = this.buffer.charCodeAt(this.index - this.offset);
      switch (this.state) {
        case State.Text: {
          this.stateText(c);
          break;
        }
        case State.InPlainText: {
          this.index = this.buffer.length + this.offset - 1;
          break;
        }
        case State.SpecialStartSequence: {
          this.stateSpecialStartSequence(c);
          break;
        }
        case State.InSpecialTag: {
          this.stateInSpecialTag(c);
          break;
        }
        case State.CDATASequence: {
          this.stateCDATASequence(c);
          break;
        }
        case State.DeclarationSequence: {
          this.stateDeclarationSequence(c);
          break;
        }
        case State.InAttributeValueDq: {
          this.stateInAttributeValueDoubleQuotes(c);
          break;
        }
        case State.InAttributeName: {
          this.stateInAttributeName(c);
          break;
        }
        case State.InCommentLike: {
          this.stateInCommentLike(c);
          break;
        }
        case State.InSpecialComment: {
          this.stateInSpecialComment(c);
          break;
        }
        case State.BeforeAttributeName: {
          this.stateBeforeAttributeName(c);
          break;
        }
        case State.InTagName: {
          this.stateInTagName(c);
          break;
        }
        case State.InClosingTagName: {
          this.stateInClosingTagName(c);
          break;
        }
        case State.BeforeTagName: {
          this.stateBeforeTagName(c);
          break;
        }
        case State.AfterAttributeName: {
          this.stateAfterAttributeName(c);
          break;
        }
        case State.InAttributeValueSq: {
          this.stateInAttributeValueSingleQuotes(c);
          break;
        }
        case State.BeforeAttributeValue: {
          this.stateBeforeAttributeValue(c);
          break;
        }
        case State.BeforeClosingTagName: {
          this.stateBeforeClosingTagName(c);
          break;
        }
        case State.AfterClosingTagName: {
          this.stateAfterClosingTagName(c);
          break;
        }
        case State.InAttributeValueNq: {
          this.stateInAttributeValueNoQuotes(c);
          break;
        }
        case State.InSelfClosingTag: {
          this.stateInSelfClosingTag(c);
          break;
        }
        case State.InDeclaration: {
          this.stateInDeclaration(c);
          break;
        }
        case State.BeforeDeclaration: {
          this.stateBeforeDeclaration(c);
          break;
        }
        case State.BeforeComment: {
          this.stateBeforeComment(c);
          break;
        }
        case State.InProcessingInstruction: {
          this.stateInProcessingInstruction(c);
          break;
        }
        case State.InEntity: {
          this.stateInEntity();
          break;
        }
      }
      this.index++;
    }
    this.cleanup();
  }
  finish() {
    if (this.state === State.InEntity) {
      this.entityDecoder.end();
      this.state = this.baseState;
    }
    this.handleTrailingData();
    this.cbs.onend();
  }
  handleTrailingCommentLikeData(endIndex) {
    if (this.state !== State.InCommentLike) {
      return false;
    }
    if (this.currentSequence === Sequences.CdataEnd) {
      if (this.xmlMode) {
        if (this.sectionStart < endIndex) {
          this.cbs.oncdata(this.sectionStart, endIndex, 0);
        }
      } else {
        const cdataStart = this.sectionStart - Sequences.Cdata.length - 1;
        this.cbs.oncomment(cdataStart, endIndex, 0);
      }
    } else {
      const offset = this.xmlMode ? 0 : Math.min(this.sequenceIndex, Sequences.CommentEnd.length - 1);
      this.cbs.oncomment(this.sectionStart, endIndex, offset);
    }
    return true;
  }
  handleTrailingMarkupDeclaration(endIndex) {
    if (this.xmlMode) {
      switch (this.state) {
        case State.InSpecialComment:
        case State.BeforeComment:
        case State.CDATASequence:
        case State.DeclarationSequence:
        case State.InDeclaration: {
          this.cbs.ontext(this.sectionStart, endIndex);
          return true;
        }
        default: {
          return false;
        }
      }
    }
    switch (this.state) {
      case State.BeforeDeclaration:
      case State.InSpecialComment:
      case State.BeforeComment:
      case State.CDATASequence: {
        this.cbs.oncomment(this.sectionStart, endIndex, 0);
        return true;
      }
      case State.DeclarationSequence: {
        if (this.sequenceIndex !== Sequences.Doctype.length) {
          this.cbs.oncomment(this.sectionStart, endIndex, 0);
        }
        return true;
      }
      case State.InDeclaration: {
        return true;
      }
      default: {
        return false;
      }
    }
  }
  /** Handle any trailing data. */
  handleTrailingData() {
    const endIndex = this.buffer.length + this.offset;
    if (this.handleTrailingCommentLikeData(endIndex) || this.handleTrailingMarkupDeclaration(endIndex)) {
      return;
    }
    if (this.sectionStart >= endIndex) {
      return;
    }
    switch (this.state) {
      case State.InTagName:
      case State.BeforeAttributeName:
      case State.BeforeAttributeValue:
      case State.AfterAttributeName:
      case State.InAttributeName:
      case State.InAttributeValueSq:
      case State.InAttributeValueDq:
      case State.InAttributeValueNq:
      case State.InClosingTagName: {
        break;
      }
      default: {
        this.cbs.ontext(this.sectionStart, endIndex);
      }
    }
  }
  emitCodePoint(cp, consumed) {
    if (this.baseState !== State.Text && this.baseState !== State.InSpecialTag) {
      if (this.sectionStart < this.entityStart) {
        this.cbs.onattribdata(this.sectionStart, this.entityStart);
      }
      this.sectionStart = this.entityStart + consumed;
      this.index = this.sectionStart - 1;
      this.cbs.onattribentity(cp);
    } else {
      if (this.sectionStart < this.entityStart) {
        this.cbs.ontext(this.sectionStart, this.entityStart);
      }
      this.sectionStart = this.entityStart + consumed;
      this.index = this.sectionStart - 1;
      this.cbs.ontextentity(cp, this.sectionStart);
    }
  }
};

// node_modules/htmlparser2/dist/Parser.js
var { fromCodePoint } = String;
var formTags = /* @__PURE__ */ new Set([
  "input",
  "option",
  "optgroup",
  "select",
  "button",
  "datalist",
  "textarea"
]);
var pTag = /* @__PURE__ */ new Set(["p"]);
var headingTags = /* @__PURE__ */ new Set(["h1", "h2", "h3", "h4", "h5", "h6", "p"]);
var tableSectionTags = /* @__PURE__ */ new Set(["thead", "tbody"]);
var ddtTags = /* @__PURE__ */ new Set(["dd", "dt"]);
var rtpTags = /* @__PURE__ */ new Set(["rt", "rp"]);
var openImpliesClose = /* @__PURE__ */ new Map([
  ["tr", /* @__PURE__ */ new Set(["tr", "th", "td"])],
  ["th", /* @__PURE__ */ new Set(["th"])],
  ["td", /* @__PURE__ */ new Set(["thead", "th", "td"])],
  ["body", /* @__PURE__ */ new Set(["head", "link", "script"])],
  ["a", /* @__PURE__ */ new Set(["a"])],
  ["li", /* @__PURE__ */ new Set(["li"])],
  ["p", pTag],
  ["h1", headingTags],
  ["h2", headingTags],
  ["h3", headingTags],
  ["h4", headingTags],
  ["h5", headingTags],
  ["h6", headingTags],
  ["select", formTags],
  ["input", formTags],
  ["output", formTags],
  ["button", formTags],
  ["datalist", formTags],
  ["textarea", formTags],
  ["option", /* @__PURE__ */ new Set(["option"])],
  ["optgroup", /* @__PURE__ */ new Set(["optgroup", "option"])],
  ["dd", ddtTags],
  ["dt", ddtTags],
  ["address", pTag],
  ["article", pTag],
  ["aside", pTag],
  ["blockquote", pTag],
  ["details", pTag],
  ["div", pTag],
  ["dl", pTag],
  ["fieldset", pTag],
  ["figcaption", pTag],
  ["figure", pTag],
  ["footer", pTag],
  ["form", pTag],
  ["header", pTag],
  ["hr", pTag],
  ["main", pTag],
  ["nav", pTag],
  ["ol", pTag],
  ["pre", pTag],
  ["section", pTag],
  ["table", pTag],
  ["ul", pTag],
  ["rt", rtpTags],
  ["rp", rtpTags],
  ["tbody", tableSectionTags],
  ["tfoot", tableSectionTags]
]);
var DOCUMENT_TYPE = "doctype";
var voidElements = /* @__PURE__ */ new Set([
  "area",
  "base",
  "basefont",
  "br",
  "col",
  "command",
  "embed",
  "frame",
  "hr",
  "img",
  "input",
  "isindex",
  "keygen",
  "link",
  "meta",
  "param",
  "source",
  "track",
  "wbr"
]);
var foreignContextElements = /* @__PURE__ */ new Set(["math", "svg"]);
var htmlIntegrationElements = /* @__PURE__ */ new Set([
  "mi",
  "mo",
  "mn",
  "ms",
  "mtext",
  "annotation-xml",
  "foreignObject",
  "desc",
  "title"
]);
var svgTagNameAdjustments = /* @__PURE__ */ new Map([
  ["altglyph", "altGlyph"],
  ["altglyphdef", "altGlyphDef"],
  ["altglyphitem", "altGlyphItem"],
  ["animatecolor", "animateColor"],
  ["animatemotion", "animateMotion"],
  ["animatetransform", "animateTransform"],
  ["clippath", "clipPath"],
  ["feblend", "feBlend"],
  ["fecolormatrix", "feColorMatrix"],
  ["fecomponenttransfer", "feComponentTransfer"],
  ["fecomposite", "feComposite"],
  ["feconvolvematrix", "feConvolveMatrix"],
  ["fediffuselighting", "feDiffuseLighting"],
  ["fedisplacementmap", "feDisplacementMap"],
  ["fedistantlight", "feDistantLight"],
  ["fedropshadow", "feDropShadow"],
  ["feflood", "feFlood"],
  ["fefunca", "feFuncA"],
  ["fefuncb", "feFuncB"],
  ["fefuncg", "feFuncG"],
  ["fefuncr", "feFuncR"],
  ["fegaussianblur", "feGaussianBlur"],
  ["feimage", "feImage"],
  ["femerge", "feMerge"],
  ["femergenode", "feMergeNode"],
  ["femorphology", "feMorphology"],
  ["feoffset", "feOffset"],
  ["fepointlight", "fePointLight"],
  ["fespecularlighting", "feSpecularLighting"],
  ["fespotlight", "feSpotLight"],
  ["fetile", "feTile"],
  ["feturbulence", "feTurbulence"],
  ["foreignobject", "foreignObject"],
  ["glyphref", "glyphRef"],
  ["lineargradient", "linearGradient"],
  ["radialgradient", "radialGradient"],
  ["textpath", "textPath"]
]);
var ForeignContext;
(function(ForeignContext2) {
  ForeignContext2[ForeignContext2["None"] = 0] = "None";
  ForeignContext2[ForeignContext2["Svg"] = 1] = "Svg";
  ForeignContext2[ForeignContext2["MathML"] = 2] = "MathML";
})(ForeignContext || (ForeignContext = {}));
var reNameEnd = /\s|\//;
var Parser = class {
  static {
    __name(this, "Parser");
  }
  options;
  /** The start index of the last event. */
  startIndex = 0;
  /** The end index of the last event. */
  endIndex = 0;
  /**
   * Store the start index of the current open tag,
   * so we can update the start index for attributes.
   */
  openTagStart = 0;
  tagname = "";
  attribname = "";
  attribvalue = "";
  attribs = null;
  stack = [];
  foreignContext;
  cbs;
  lowerCaseTagNames;
  lowerCaseAttributeNames;
  recognizeSelfClosing;
  /** We are parsing HTML. Inverse of the `xmlMode` option. */
  htmlMode;
  tokenizer;
  buffers = [];
  bufferOffset = 0;
  /** The index of the last written buffer. Used when resuming after a `pause()`. */
  writeIndex = 0;
  /** Indicates whether the parser has finished running / `.end` has been called. */
  ended = false;
  constructor(cbs, options = {}) {
    this.options = options;
    this.cbs = cbs ?? {};
    this.htmlMode = !this.options.xmlMode;
    this.lowerCaseTagNames = options.lowerCaseTags ?? this.htmlMode;
    this.lowerCaseAttributeNames = options.lowerCaseAttributeNames ?? this.htmlMode;
    this.recognizeSelfClosing = options.recognizeSelfClosing ?? !this.htmlMode;
    this.tokenizer = new (options.Tokenizer ?? Tokenizer)(this.options, this);
    this.foreignContext = [ForeignContext.None];
    this.cbs.onparserinit?.(this);
  }
  // Tokenizer event handlers
  /**
   * @param start Start index for the current parser event.
   * @param endIndex End index for the current parser event.
   * @internal
   */
  ontext(start, endIndex) {
    const data = this.getSlice(start, endIndex);
    this.endIndex = endIndex - 1;
    this.cbs.ontext?.(data);
    this.startIndex = endIndex;
  }
  /**
   * @param cp Current Unicode code point.
   * @param endIndex End index for the current parser event.
   * @internal
   */
  ontextentity(cp, endIndex) {
    this.endIndex = endIndex - 1;
    this.cbs.ontext?.(fromCodePoint(cp));
    this.startIndex = endIndex;
  }
  /** @internal */
  isInForeignContext() {
    return this.foreignContext[0] !== ForeignContext.None;
  }
  /**
   * Checks if the current tag is a void element. Override this if you want
   * to specify your own additional void elements.
   * @param name Name of the pseudo selector.
   */
  isVoidElement(name) {
    return this.htmlMode && voidElements.has(name);
  }
  /**
   * Read a tag name from the buffer.
   *
   * When `lowerCaseTagNames` is enabled (the default in HTML mode), the name
   * is lowercased and may be adjusted for SVG casing or the `image` → `img`
   * alias.
   * @param start Start index of the tag name in the buffer.
   * @param endIndex End index of the tag name in the buffer.
   */
  readTagName(start, endIndex) {
    const name = this.lowerCaseTagNames ? this.getSlice(start, endIndex).toLowerCase() : this.getSlice(start, endIndex);
    if (!(this.lowerCaseTagNames && this.htmlMode)) {
      return name;
    }
    if (this.foreignContext[0] === ForeignContext.Svg) {
      return svgTagNameAdjustments.get(name) ?? name;
    }
    if (this.foreignContext.length > 1) {
      const adjusted = svgTagNameAdjustments.get(name);
      if (adjusted !== void 0 && this.stack.includes(adjusted)) {
        return adjusted;
      }
    }
    if (!this.isInForeignContext()) {
      return name === "image" ? "img" : name;
    }
    return name;
  }
  /**
   * @param start Start index for the current parser event.
   * @param endIndex End index for the current parser event.
   * @internal
   */
  onopentagname(start, endIndex) {
    this.endIndex = endIndex;
    this.emitOpenTag(this.readTagName(start, endIndex));
  }
  emitOpenTag(name) {
    this.openTagStart = this.startIndex;
    this.tagname = name;
    if (this.htmlMode && name === "form" && this.stack.includes("form")) {
      this.tagname = "";
      return;
    }
    const impliesClose = this.htmlMode && openImpliesClose.get(name);
    if (impliesClose) {
      while (this.stack.length > 0 && impliesClose.has(this.stack[0])) {
        this.popElement(true);
      }
    }
    if (!this.isVoidElement(name)) {
      this.stack.unshift(name);
      if (this.htmlMode) {
        if (name === "svg") {
          this.foreignContext.unshift(ForeignContext.Svg);
        } else if (name === "math") {
          this.foreignContext.unshift(ForeignContext.MathML);
        } else if (htmlIntegrationElements.has(name)) {
          this.foreignContext.unshift(ForeignContext.None);
        }
      }
    }
    this.cbs.onopentagname?.(name);
    if (this.cbs.onopentag)
      this.attribs = {};
  }
  endOpenTag(isImplied) {
    this.startIndex = this.openTagStart;
    if (this.attribs) {
      this.cbs.onopentag?.(this.tagname, this.attribs, isImplied);
      this.attribs = null;
    }
    if (this.cbs.onclosetag && this.isVoidElement(this.tagname)) {
      this.cbs.onclosetag(this.tagname, true);
    }
    this.tagname = "";
  }
  /**
   * @param endIndex End index for the current parser event.
   * @internal
   */
  onopentagend(endIndex) {
    this.endIndex = endIndex;
    this.endOpenTag(false);
    this.startIndex = endIndex + 1;
  }
  /**
   * @param start Start index for the current parser event.
   * @param endIndex End index for the current parser event.
   * @internal
   */
  onclosetag(start, endIndex) {
    this.endIndex = endIndex;
    const name = this.readTagName(start, endIndex);
    if (!this.isVoidElement(name)) {
      const pos = this.stack.indexOf(name);
      if (pos !== -1) {
        for (let index = 0; index < pos; index++) {
          this.popElement(true);
        }
        this.popElement(false);
      } else if (this.htmlMode && name === "p") {
        this.emitOpenTag("p");
        this.closeCurrentTag(true);
      }
    } else if (this.htmlMode && name === "br") {
      this.cbs.onopentagname?.("br");
      this.cbs.onopentag?.("br", {}, true);
      this.cbs.onclosetag?.("br", false);
    }
    this.startIndex = endIndex + 1;
  }
  /**
   * @param endIndex End index for the current parser event.
   * @internal
   */
  onselfclosingtag(endIndex) {
    this.endIndex = endIndex;
    if (this.recognizeSelfClosing || this.isInForeignContext()) {
      this.closeCurrentTag(false);
      this.startIndex = endIndex + 1;
    } else {
      this.onopentagend(endIndex);
    }
  }
  /**
   * Pop the top element off the stack, emit a close event, and maintain
   * the foreign context stack.
   * @param implied Whether this close is implied (not from an explicit end tag).
   */
  popElement(implied) {
    const element = this.stack.shift();
    if (this.htmlMode && (foreignContextElements.has(element) || htmlIntegrationElements.has(element))) {
      this.foreignContext.shift();
    }
    this.cbs.onclosetag?.(element, implied);
  }
  closeCurrentTag(isOpenImplied) {
    const name = this.tagname;
    this.endOpenTag(isOpenImplied);
    if (this.stack[0] === name) {
      this.popElement(!isOpenImplied);
    }
  }
  /**
   * @param start Start index for the current parser event.
   * @param endIndex End index for the current parser event.
   * @internal
   */
  onattribname(start, endIndex) {
    this.startIndex = start;
    const name = this.getSlice(start, endIndex);
    this.attribname = this.lowerCaseAttributeNames ? name.toLowerCase() : name;
  }
  /**
   * @param start Start index for the current parser event.
   * @param endIndex End index for the current parser event.
   * @internal
   */
  onattribdata(start, endIndex) {
    this.attribvalue += this.getSlice(start, endIndex);
  }
  /**
   * @param cp Current Unicode code point.
   * @internal
   */
  onattribentity(cp) {
    this.attribvalue += fromCodePoint(cp);
  }
  /**
   * @param quote Quote type used for the current attribute.
   * @param endIndex End index for the current parser event.
   * @internal
   */
  onattribend(quote, endIndex) {
    this.endIndex = endIndex;
    this.cbs.onattribute?.(this.attribname, this.attribvalue, quote === QuoteType.Double ? '"' : quote === QuoteType.Single ? "'" : quote === QuoteType.NoValue ? void 0 : null);
    if (this.attribs && !Object.hasOwn(this.attribs, this.attribname)) {
      this.attribs[this.attribname] = this.attribvalue;
    }
    this.attribvalue = "";
  }
  getInstructionName(value) {
    const index = value.search(reNameEnd);
    let name = index < 0 ? value : value.substr(0, index);
    if (this.lowerCaseTagNames) {
      name = name.toLowerCase();
    }
    return name;
  }
  /**
   * @param start Start index for the current parser event.
   * @param endIndex End index for the current parser event.
   * @internal
   */
  ondeclaration(start, endIndex) {
    this.endIndex = endIndex;
    const value = this.getSlice(start, endIndex);
    if (this.cbs.onprocessinginstruction) {
      const name = this.htmlMode ? this.lowerCaseTagNames ? DOCUMENT_TYPE : value.slice(0, DOCUMENT_TYPE.length) : this.getInstructionName(value);
      this.cbs.onprocessinginstruction(`!${name}`, `!${value}`);
    }
    this.startIndex = endIndex + 1;
  }
  /**
   * @param start Start index for the current parser event.
   * @param endIndex End index for the current parser event.
   * @internal
   */
  onprocessinginstruction(start, endIndex) {
    this.endIndex = endIndex;
    const value = this.getSlice(start, endIndex);
    if (this.cbs.onprocessinginstruction) {
      const name = this.getInstructionName(value);
      this.cbs.onprocessinginstruction(`?${name}`, `?${value}`);
    }
    this.startIndex = endIndex + 1;
  }
  /**
   * @param start Start index for the current parser event.
   * @param endIndex End index for the current parser event.
   * @param offset Offset applied when computing parser indices.
   * @internal
   */
  oncomment(start, endIndex, offset) {
    this.endIndex = endIndex;
    this.cbs.oncomment?.(this.getSlice(start, endIndex - offset));
    this.cbs.oncommentend?.();
    this.startIndex = endIndex + 1;
  }
  /**
   * @param start Start index for the current parser event.
   * @param endIndex End index for the current parser event.
   * @param offset Offset applied when computing parser indices.
   * @internal
   */
  oncdata(start, endIndex, offset) {
    this.endIndex = endIndex;
    const value = this.getSlice(start, endIndex - offset);
    if (!this.htmlMode || this.options.recognizeCDATA) {
      this.cbs.oncdatastart?.();
      this.cbs.ontext?.(value);
      this.cbs.oncdataend?.();
    } else if (this.isInForeignContext()) {
      this.cbs.ontext?.(value);
    } else {
      this.cbs.oncomment?.(`[CDATA[${value}]]`);
      this.cbs.oncommentend?.();
    }
    this.startIndex = endIndex + 1;
  }
  /** @internal */
  onend() {
    if (this.cbs.onclosetag) {
      this.endIndex = this.startIndex;
      for (let index = 0; index < this.stack.length; index++) {
        this.cbs.onclosetag(this.stack[index], true);
      }
    }
    this.cbs.onend?.();
  }
  /**
   * Resets the parser to a blank state, ready to parse a new HTML document
   */
  reset() {
    this.cbs.onreset?.();
    this.tokenizer.reset();
    this.tagname = "";
    this.attribname = "";
    this.attribvalue = "";
    this.attribs = null;
    this.stack.length = 0;
    this.startIndex = 0;
    this.endIndex = 0;
    this.cbs.onparserinit?.(this);
    this.buffers.length = 0;
    this.foreignContext.length = 0;
    this.foreignContext.unshift(ForeignContext.None);
    this.bufferOffset = 0;
    this.writeIndex = 0;
    this.ended = false;
  }
  /**
   * Resets the parser, then parses a complete document and
   * pushes it to the handler.
   * @param data Document to parse.
   */
  parseComplete(data) {
    this.reset();
    this.end(data);
  }
  getSlice(start, end) {
    if (start === end) {
      return "";
    }
    while (start - this.bufferOffset >= this.buffers[0].length) {
      this.shiftBuffer();
    }
    let slice = this.buffers[0].slice(start - this.bufferOffset, end - this.bufferOffset);
    while (end - this.bufferOffset > this.buffers[0].length) {
      this.shiftBuffer();
      slice += this.buffers[0].slice(0, end - this.bufferOffset);
    }
    return slice;
  }
  shiftBuffer() {
    this.bufferOffset += this.buffers[0].length;
    this.writeIndex--;
    this.buffers.shift();
  }
  /**
   * Parses a chunk of data and calls the corresponding callbacks.
   * @param chunk Chunk to parse.
   */
  write(chunk) {
    if (this.ended) {
      this.cbs.onerror?.(new Error(".write() after done!"));
      return;
    }
    this.buffers.push(chunk);
    if (this.tokenizer.running) {
      this.tokenizer.write(chunk);
      this.writeIndex++;
    }
  }
  /**
   * Parses the end of the buffer and clears the stack, calls onend.
   * @param chunk Optional final chunk to parse.
   */
  end(chunk) {
    if (this.ended) {
      this.cbs.onerror?.(new Error(".end() after done!"));
      return;
    }
    if (chunk)
      this.write(chunk);
    this.ended = true;
    this.tokenizer.end();
  }
  /**
   * Pauses parsing. The parser won't emit events until `resume` is called.
   */
  pause() {
    this.tokenizer.pause();
  }
  /**
   * Resumes parsing after `pause` was called.
   */
  resume() {
    this.tokenizer.resume();
    while (this.tokenizer.running && this.writeIndex < this.buffers.length) {
      this.tokenizer.write(this.buffers[this.writeIndex++]);
    }
    if (this.ended)
      this.tokenizer.end();
  }
};

// worker/lib/sanitize-blog-html.ts
var allowedTags = /* @__PURE__ */ new Set([
  "p",
  "br",
  "h2",
  "h3",
  "h4",
  "strong",
  "em",
  "u",
  "s",
  "ul",
  "ol",
  "li",
  "a",
  "blockquote",
  "pre",
  "code",
  "table",
  "thead",
  "tbody",
  "tr",
  "th",
  "td",
  "img",
  "hr"
]);
var voidTags = /* @__PURE__ */ new Set(["br", "img", "hr"]);
var suppressedTags = /* @__PURE__ */ new Set([
  "script",
  "style",
  "iframe",
  "object",
  "embed",
  "svg",
  "math",
  "template"
]);
var allowedAttributes = {
  a: /* @__PURE__ */ new Set(["href", "title"]),
  img: /* @__PURE__ */ new Set(["src", "alt", "title", "width", "height"]),
  th: /* @__PURE__ */ new Set(["colspan", "rowspan", "scope"]),
  td: /* @__PURE__ */ new Set(["colspan", "rowspan"]),
  code: /* @__PURE__ */ new Set(["data-language"])
};
var escapeText = /* @__PURE__ */ __name((value) => value.replace(/&/gu, "&amp;").replace(/</gu, "&lt;").replace(/>/gu, "&gt;"), "escapeText");
var escapeAttribute = /* @__PURE__ */ __name((value) => escapeText(value).replace(/"/gu, "&quot;").replace(/'/gu, "&#39;"), "escapeAttribute");
function safeUrl(value, image) {
  const normalized = value.trim();
  if (image && normalized.startsWith("/api/v1/media/files/")) return normalized;
  if (!image && (normalized.startsWith("/") || normalized.startsWith("#")))
    return normalized;
  try {
    const url2 = new URL(normalized);
    if (url2.protocol === "https:" || !image && (url2.protocol === "http:" || url2.protocol === "mailto:"))
      return url2.toString();
  } catch {
  }
  return null;
}
__name(safeUrl, "safeUrl");
function sanitizeBlogHtml(source) {
  let output = "";
  let suppressedDepth = 0;
  const stack = [];
  const parser = new Parser(
    {
      onopentag(name, attributes) {
        const tag = name.toLowerCase();
        const suppressed = suppressedDepth > 0 || suppressedTags.has(tag);
        if (suppressed) suppressedDepth += 1;
        const emitted = !suppressed && allowedTags.has(tag);
        stack.push({ name: tag, emitted, suppressed });
        if (!emitted) return;
        const pairs = [];
        for (const [attribute, rawValue] of Object.entries(attributes)) {
          const key = attribute.toLowerCase();
          if (!allowedAttributes[tag]?.has(key)) continue;
          let value = rawValue;
          if (key === "href" || key === "src")
            value = safeUrl(rawValue, key === "src");
          if (value === null) continue;
          if (["width", "height", "colspan", "rowspan"].includes(key) && !/^\d{1,4}$/u.test(value))
            continue;
          pairs.push(`${key}="${escapeAttribute(value)}"`);
        }
        if (tag === "a")
          pairs.push('target="_blank"', 'rel="noopener noreferrer"');
        if (tag === "img") pairs.push('loading="lazy"');
        output += `<${tag}${pairs.length ? ` ${pairs.join(" ")}` : ""}>`;
      },
      ontext(text2) {
        if (suppressedDepth === 0) output += escapeText(text2);
      },
      onclosetag() {
        const entry = stack.pop();
        if (!entry) return;
        if (entry.suppressed)
          suppressedDepth = Math.max(0, suppressedDepth - 1);
        if (entry.emitted && !voidTags.has(entry.name))
          output += `</${entry.name}>`;
      }
    },
    { decodeEntities: true }
  );
  parser.write(source);
  parser.end();
  return output;
}
__name(sanitizeBlogHtml, "sanitizeBlogHtml");

// worker/domain/events.ts
var idSchema2 = external_exports.string().uuid();
var mediaUrl = external_exports.string().trim().max(800).refine(
  (value) => value === "" || value.startsWith("/api/v1/media/files/") || /^https:\/\//u.test(value),
  "Use an HTTPS or Media Library URL."
);
var optionalUrl4 = mediaUrl.nullable().optional().transform((value) => value || "").default("");
var optionalText2 = /* @__PURE__ */ __name((maximum) => external_exports.preprocess((value) => value ?? "", external_exports.string().trim().max(maximum)).default(""), "optionalText");
var textList2 = external_exports.array(external_exports.string().trim().min(1).max(200)).max(60).default([]);
var idList = external_exports.array(idSchema2).max(60).default([]);
var mediaReferenceSchema2 = external_exports.object({
  mediaId: external_exports.string().trim().max(512).optional(),
  key: external_exports.string().trim().max(512),
  url: mediaUrl,
  originalName: external_exports.string().trim().max(255),
  contentType: external_exports.string().trim().max(100).optional(),
  byteSize: external_exports.number().int().positive().max(5 * 1024 * 1024).optional(),
  width: external_exports.number().int().positive().max(5e4).optional(),
  height: external_exports.number().int().positive().max(5e4).optional(),
  altText: external_exports.string().trim().max(300).optional().default(""),
  createdAt: external_exports.string().datetime({ offset: true }).optional()
});
var eventSchema = external_exports.object({
  slug: external_exports.string().trim().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/u, "Use a URL-safe lowercase slug.").max(200),
  confirmSlugChange: external_exports.boolean().optional().default(false),
  title: external_exports.string().trim().min(3).max(200),
  shortDescription: external_exports.string().trim().min(3).max(500),
  fullDescription: external_exports.string().trim().min(3).max(2e4),
  eventType: external_exports.string().trim().min(2).max(100),
  category: external_exports.string().trim().min(2).max(100),
  eventStatus: external_exports.enum(["SCHEDULED", "ONGOING", "COMPLETED", "CANCELLED", "POSTPONED"]).optional(),
  eventStatusOverride: external_exports.enum(["CANCELLED", "POSTPONED"]).nullable().optional().default(null),
  featured: external_exports.boolean().default(false),
  sortOrder: external_exports.number().int().min(-1e4).max(1e4).default(0),
  startsAt: external_exports.string().datetime({ offset: true }),
  endsAt: external_exports.string().datetime({ offset: true }),
  timezone: external_exports.string().trim().min(3).max(100).default("Asia/Dhaka"),
  locationType: external_exports.enum(["PHYSICAL", "ONLINE", "HYBRID"]),
  venue: optionalText2(240),
  address: optionalText2(500),
  city: optionalText2(120),
  country: external_exports.string().trim().max(120).default("Bangladesh"),
  latitude: external_exports.number().min(-90).max(90).nullable().optional().default(null),
  longitude: external_exports.number().min(-180).max(180).nullable().optional().default(null),
  onlineUrl: optionalUrl4,
  onlinePlatform: optionalText2(120),
  meetingInstructions: optionalText2(3e3),
  mapUrl: optionalUrl4,
  heroImage: mediaReferenceSchema2.nullable().optional().default(null),
  galleryImages: external_exports.array(mediaReferenceSchema2).max(30).optional().default([]),
  ogImage: mediaReferenceSchema2.nullable().optional().default(null),
  coverImageUrl: optionalUrl4,
  thumbnailUrl: optionalUrl4,
  gallery: external_exports.array(mediaUrl).max(30).default([]),
  posterUrl: optionalUrl4,
  videoUrl: optionalUrl4,
  registrationRequired: external_exports.boolean().default(false),
  registrationMode: external_exports.enum(["INTERNAL", "EXTERNAL", "CLOSED"]).default("INTERNAL"),
  registrationUrl: optionalUrl4,
  registrationOpensAt: external_exports.preprocess(
    (value) => value ?? "",
    external_exports.string().datetime({ offset: true }).or(external_exports.literal(""))
  ),
  registrationDeadline: external_exports.preprocess(
    (value) => value ?? "",
    external_exports.string().datetime({ offset: true }).or(external_exports.literal(""))
  ),
  maxParticipants: external_exports.number().int().min(0).max(1e6).default(0),
  registrationCapacityOverride: external_exports.boolean().default(false),
  feeMinor: external_exports.number().int().min(0).max(1e8).default(0),
  currency: external_exports.string().trim().length(3).transform((value) => value.toUpperCase()).default("BDT"),
  paymentRequired: external_exports.boolean().default(false),
  paymentMethods: external_exports.array(external_exports.enum(["BKASH", "NAGAD", "CASH"])).max(3).default(["BKASH", "NAGAD"]),
  bkashNumber: external_exports.string().trim().refine(
    (value) => value === "" || /^01\d{9}$/u.test(value),
    "Use a valid Bangladeshi mobile number."
  ).default("01580352238"),
  registrationStatus: external_exports.enum(["UPCOMING", "OPEN", "CLOSED", "FULL"]).optional(),
  registrationStatusOverride: external_exports.enum(["UPCOMING", "OPEN", "CLOSED", "FULL"]).nullable().optional().default(null),
  organizer: external_exports.string().trim().min(2).max(200).default("RUET IoT Club"),
  organizerPersonId: idSchema2.nullable().optional().default(null),
  coOrganizers: textList2,
  coOrganizerIds: idList,
  partners: textList2,
  partnerIds: idList,
  sponsors: textList2,
  sponsorIds: idList,
  speakers: textList2,
  speakerIds: idList,
  trainers: textList2,
  trainerIds: idList,
  tags: textList2,
  targetAudience: optionalText2(3e3),
  eligibility: optionalText2(1e4),
  certificateAvailable: external_exports.boolean().default(false),
  certificateRequireRegistration: external_exports.boolean().default(false),
  certificateRequirePayment: external_exports.boolean().default(false),
  certificateRequireAttendance: external_exports.boolean().default(false),
  certificateMinAttendancePercent: external_exports.number().int().min(0).max(100).default(0),
  contactEmail: external_exports.preprocess(
    (value) => value ?? "",
    external_exports.string().trim().email().max(254).or(external_exports.literal(""))
  ),
  contactPhone: optionalText2(40),
  seoTitle: optionalText2(200),
  metaDescription: optionalText2(500),
  ogImageUrl: optionalUrl4,
  canonicalUrl: optionalUrl4,
  workflowStatus: external_exports.enum(["DRAFT", "PUBLISHED"]).default("DRAFT")
}).superRefine((event, context) => {
  const starts = new Date(event.startsAt).getTime();
  const ends = new Date(event.endsAt).getTime();
  if (ends <= starts)
    context.addIssue({
      code: "custom",
      path: ["endsAt"],
      message: "End time must be after start time."
    });
  if (!isValidTimeZone(event.timezone))
    context.addIssue({
      code: "custom",
      path: ["timezone"],
      message: "Use a valid IANA timezone such as Asia/Dhaka."
    });
  if (event.registrationOpensAt && event.registrationDeadline && new Date(event.registrationOpensAt) >= new Date(event.registrationDeadline))
    context.addIssue({
      code: "custom",
      path: ["registrationDeadline"],
      message: "Registration must close after it opens."
    });
  if (event.registrationDeadline && new Date(event.registrationDeadline).getTime() > ends)
    context.addIssue({
      code: "custom",
      path: ["registrationDeadline"],
      message: "Registration must close before the event ends."
    });
  if (!event.registrationRequired && event.paymentRequired)
    context.addIssue({
      code: "custom",
      path: ["paymentRequired"],
      message: "Payment cannot be required when registration is disabled."
    });
  if (event.paymentRequired && event.feeMinor <= 0)
    context.addIssue({
      code: "custom",
      path: ["feeMinor"],
      message: "Paid events require a positive fee."
    });
  if (event.paymentRequired && event.paymentMethods.length === 0)
    context.addIssue({
      code: "custom",
      path: ["paymentMethods"],
      message: "Paid events require at least one payment method."
    });
  if (event.paymentRequired && event.paymentMethods.some(
    (method) => ["BKASH", "NAGAD"].includes(method)
  ) && !/^01\d{9}$/u.test(event.bkashNumber))
    context.addIssue({
      code: "custom",
      path: ["bkashNumber"],
      message: "Mobile payments require a valid receiver number."
    });
  if (!event.paymentRequired && event.feeMinor !== 0)
    context.addIssue({
      code: "custom",
      path: ["feeMinor"],
      message: "Free events cannot have a fee."
    });
  if (event.workflowStatus !== "PUBLISHED") return;
  if (["PHYSICAL", "HYBRID"].includes(event.locationType)) {
    for (const [path, value, message] of [
      ["venue", event.venue, "Physical and hybrid events require a venue."],
      [
        "address",
        event.address,
        "Physical and hybrid events require an address."
      ],
      ["city", event.city, "Physical and hybrid events require a city."],
      [
        "country",
        event.country,
        "Physical and hybrid events require a country."
      ]
    ])
      if (!value) context.addIssue({ code: "custom", path: [path], message });
  }
  if (["ONLINE", "HYBRID"].includes(event.locationType)) {
    if (!event.onlinePlatform)
      context.addIssue({
        code: "custom",
        path: ["onlinePlatform"],
        message: "Online and hybrid events require an online platform."
      });
    if (!event.onlineUrl)
      context.addIssue({
        code: "custom",
        path: ["onlineUrl"],
        message: "Online and hybrid events require a meeting URL."
      });
  }
  if (event.registrationRequired && event.registrationMode === "EXTERNAL" && !event.registrationUrl)
    context.addIssue({
      code: "custom",
      path: ["registrationUrl"],
      message: "External registration requires a URL."
    });
});
var boolColumns = /* @__PURE__ */ new Set([
  "featured",
  "registration_required",
  "payment_required",
  "registration_capacity_override",
  "certificate_available",
  "certificate_require_registration",
  "certificate_require_payment",
  "certificate_require_attendance"
]);
var camel = /* @__PURE__ */ __name((value) => value.replace(/_([a-z])/gu, (_, letter) => letter.toUpperCase()), "camel");
var nullable2 = /* @__PURE__ */ __name((value) => value?.trim() || null, "nullable");
function mediaFromRow(row, prefix, fallbackUrl, fallbackAlt) {
  const key = String(row[`${prefix}_media_key`] || "");
  if (!key) return mediaReferenceFromUrl(fallbackUrl, fallbackAlt);
  return {
    mediaId: key,
    key,
    url: `/api/v1/media/files/${key}`,
    originalName: String(
      row[`${prefix}_media_original_name`] || key.split("/").pop() || "Selected media"
    ),
    contentType: String(row[`${prefix}_media_content_type`] || ""),
    byteSize: Number(row[`${prefix}_media_byte_size`] || 0) || void 0,
    width: Number(row[`${prefix}_media_width`] || 0) || void 0,
    height: Number(row[`${prefix}_media_height`] || 0) || void 0,
    altText: String(row[`${prefix}_image_alt`] || fallbackAlt || ""),
    createdAt: row[`${prefix}_media_created_at`] ? String(row[`${prefix}_media_created_at`]) : void 0
  };
}
__name(mediaFromRow, "mediaFromRow");
function eventView(row, now = Date.now()) {
  const item = {};
  for (const [key, value] of Object.entries(row)) {
    if (key.endsWith("_json")) {
      try {
        item[camel(key.slice(0, -5))] = JSON.parse(String(value || "[]"));
      } catch {
        item[camel(key.slice(0, -5))] = [];
      }
    } else item[camel(key)] = boolColumns.has(key) ? Boolean(value) : value;
  }
  const eventStatus = deriveEventStatus(
    {
      startsAt: String(row.starts_at),
      endsAt: String(row.ends_at),
      eventStatus: String(row.event_status),
      eventStatusOverride: row.event_status_override || null
    },
    now
  );
  const approved = Number(row.approved_count || 0);
  const reserved = Number(row.reserved_count || 0);
  const capacity = Number(row.max_participants || 0);
  const registrationStatus = deriveRegistrationStatus(
    {
      startsAt: String(row.starts_at),
      endsAt: String(row.ends_at),
      eventStatus,
      eventStatusOverride: row.event_status_override || null,
      registrationRequired: Boolean(row.registration_required),
      registrationMode: String(row.registration_mode),
      registrationOpensAt: row.registration_opens_at ? String(row.registration_opens_at) : null,
      registrationDeadline: row.registration_deadline ? String(row.registration_deadline) : null,
      registrationStatusOverride: row.registration_status_override || null,
      maxParticipants: capacity,
      reservedCount: reserved,
      registrationCapacityOverride: Boolean(row.registration_capacity_override)
    },
    now
  );
  const heroImage = mediaFromRow(
    row,
    "hero",
    row.cover_image_url ? String(row.cover_image_url) : null,
    String(row.hero_image_alt || row.title || "")
  );
  const ogImage = mediaFromRow(
    row,
    "og",
    row.og_image_url ? String(row.og_image_url) : null,
    String(row.og_image_alt || row.title || "")
  );
  let galleryImages = [];
  try {
    galleryImages = JSON.parse(String(row.gallery_media_json || "[]"));
  } catch {
    galleryImages = [];
  }
  if (!galleryImages.length) {
    const gallery = Array.isArray(item.gallery) ? item.gallery : [];
    galleryImages = gallery.map(
      (url2, index) => mediaReferenceFromUrl(
        String(url2),
        `${String(row.title || "Event")} gallery image ${index + 1}`
      )
    ).filter(Boolean);
  }
  item.eventStatus = eventStatus;
  item.registrationStatus = registrationStatus;
  item.heroImage = heroImage;
  item.coverImageUrl = heroImage?.url || row.cover_image_url || null;
  item.galleryImages = galleryImages;
  item.gallery = galleryImages.map((image) => image.url);
  item.ogImage = ogImage;
  item.ogImageUrl = ogImage?.url || heroImage?.url || row.og_image_url || null;
  item.effectiveOgImageUrl = item.ogImageUrl;
  item.approvedCount = approved;
  item.reservedCount = reserved;
  item.remainingCapacity = capacity > 0 ? Math.max(0, capacity - reserved) : null;
  return item;
}
__name(eventView, "eventView");
function normalizeEventInput(input) {
  const rawHeroImage = input.heroImage ?? mediaReferenceFromUrl(input.coverImageUrl, input.title);
  const rawGalleryImages = input.galleryImages.length ? input.galleryImages : input.gallery.map(
    (url2, index) => mediaReferenceFromUrl(
      url2,
      `${input.title} gallery image ${index + 1}`
    )
  ).filter(Boolean);
  const rawOgImage = input.ogImage ?? mediaReferenceFromUrl(input.ogImageUrl, input.title);
  const heroImage = rawHeroImage ? { ...rawHeroImage, altText: rawHeroImage.altText || "" } : null;
  const galleryImages = rawGalleryImages.map((image) => ({
    ...image,
    altText: image.altText || ""
  }));
  const ogImage = rawOgImage ? { ...rawOgImage, altText: rawOgImage.altText || "" } : null;
  const eventStatus = deriveEventStatus({
    startsAt: input.startsAt,
    endsAt: input.endsAt,
    eventStatusOverride: input.eventStatusOverride
  });
  const registrationStatus = deriveRegistrationStatus({
    startsAt: input.startsAt,
    endsAt: input.endsAt,
    eventStatus,
    eventStatusOverride: input.eventStatusOverride,
    registrationRequired: input.registrationRequired,
    registrationMode: input.registrationMode,
    registrationOpensAt: input.registrationOpensAt || null,
    registrationDeadline: input.registrationDeadline || null,
    registrationStatusOverride: input.registrationStatusOverride,
    maxParticipants: input.maxParticipants,
    reservedCount: 0,
    registrationCapacityOverride: input.registrationCapacityOverride
  });
  return {
    ...input,
    eventStatus,
    registrationStatus,
    heroImage,
    coverImageUrl: heroImage?.url || input.coverImageUrl,
    galleryImages,
    gallery: galleryImages.map((image) => image.url),
    ogImage,
    ogImageUrl: ogImage?.url || input.ogImageUrl,
    feeMinor: input.paymentRequired ? input.feeMinor : 0,
    paymentMethods: input.paymentRequired ? input.paymentMethods : ["BKASH", "NAGAD"],
    registrationMode: input.registrationRequired ? input.registrationMode : "CLOSED"
  };
}
__name(normalizeEventInput, "normalizeEventInput");
async function validateEventMediaReferences(db, storage, input) {
  const references = [
    input.heroImage,
    ...input.galleryImages,
    input.ogImage
  ].filter(Boolean);
  const seen = /* @__PURE__ */ new Set();
  for (const reference of references) {
    if (!reference.key || seen.has(reference.key)) continue;
    seen.add(reference.key);
    if (reference.url !== `/api/v1/media/files/${reference.key}`)
      throw new AppError({
        code: "INVALID_MEDIA_REFERENCE",
        message: "A selected event image has an invalid Media Library reference.",
        status: 422
      });
    const media = await db.prepare(
      "SELECT content_type FROM website_media_objects WHERE object_key=? AND archived_at IS NULL"
    ).bind(reference.key).first();
    if (!media?.content_type.startsWith("image/") || !await storage.head(reference.key))
      throw new AppError({
        code: "MEDIA_NOT_FOUND",
        message: "A selected event image is no longer available. Choose another image.",
        status: 422
      });
  }
}
__name(validateEventMediaReferences, "validateEventMediaReferences");
function legacyEventData(input) {
  return {
    slug: input.slug,
    title: input.title,
    description: input.shortDescription,
    full_description: input.fullDescription,
    type: input.eventType,
    category: input.category,
    event_status: input.eventStatus?.toLowerCase(),
    date: input.startsAt,
    end_date: input.endsAt,
    timezone: input.timezone,
    location_type: input.locationType.toLowerCase(),
    venue: input.venue,
    address: input.address,
    city: input.city,
    country: input.country,
    latitude: input.latitude,
    longitude: input.longitude,
    online_url: input.onlineUrl,
    online_platform: input.onlinePlatform,
    meeting_instructions: input.meetingInstructions,
    map_url: input.mapUrl,
    image_url: input.coverImageUrl,
    hero_image_alt: input.heroImage?.altText,
    thumbnail_url: input.thumbnailUrl,
    gallery: input.gallery,
    gallery_images: input.galleryImages,
    poster_url: input.posterUrl,
    video_url: input.videoUrl,
    registration_required: input.registrationRequired,
    registration_mode: input.registrationMode.toLowerCase(),
    registration_url: input.registrationUrl,
    registration_opens_at: input.registrationOpensAt || null,
    registration_deadline: input.registrationDeadline || null,
    max_participants: input.maxParticipants,
    registration_capacity_override: input.registrationCapacityOverride,
    is_paid: input.paymentRequired,
    registration_fee: input.feeMinor / 100,
    currency: input.currency,
    payment_required: input.paymentRequired,
    payment_methods: input.paymentMethods,
    payment_number: input.bkashNumber,
    bkash_number: input.bkashNumber,
    registration_status: input.registrationStatus?.toLowerCase(),
    organizer: input.organizer,
    co_organizers: input.coOrganizers,
    partners: input.partners,
    sponsors: input.sponsors,
    speakers: input.speakers,
    trainers: input.trainers,
    tags: input.tags,
    target_audience: input.targetAudience,
    eligibility: input.eligibility,
    certificate_available: input.certificateAvailable,
    certificate_requirements: {
      registration: input.certificateRequireRegistration,
      payment: input.certificateRequirePayment,
      attendance: input.certificateRequireAttendance,
      min_attendance_percent: input.certificateMinAttendancePercent
    },
    contact_email: input.contactEmail,
    contact_phone: input.contactPhone,
    seo_title: input.seoTitle,
    meta_description: input.metaDescription,
    og_image: input.ogImageUrl || input.coverImageUrl,
    canonical_url: input.canonicalUrl,
    featured: input.featured
  };
}
__name(legacyEventData, "legacyEventData");
var eventColumns = [
  "id",
  "slug",
  "title",
  "short_description",
  "full_description",
  "event_type",
  "category",
  "event_status",
  "event_status_override",
  "featured",
  "sort_order",
  "starts_at",
  "ends_at",
  "timezone",
  "location_type",
  "venue",
  "address",
  "city",
  "country",
  "latitude",
  "longitude",
  "online_url",
  "online_platform",
  "meeting_instructions",
  "map_url",
  "cover_image_url",
  "hero_media_key",
  "hero_image_alt",
  "thumbnail_url",
  "gallery_json",
  "gallery_media_json",
  "poster_url",
  "video_url",
  "registration_required",
  "registration_mode",
  "registration_url",
  "registration_opens_at",
  "registration_deadline",
  "max_participants",
  "registration_capacity_override",
  "fee_minor",
  "currency",
  "payment_required",
  "payment_methods_json",
  "bkash_number",
  "registration_status",
  "registration_status_override",
  "organizer",
  "organizer_person_id",
  "co_organizers_json",
  "co_organizer_ids_json",
  "partners_json",
  "partner_ids_json",
  "sponsors_json",
  "sponsor_ids_json",
  "speakers_json",
  "speaker_ids_json",
  "trainers_json",
  "trainer_ids_json",
  "tags_json",
  "target_audience",
  "eligibility",
  "certificate_available",
  "certificate_require_registration",
  "certificate_require_payment",
  "certificate_require_attendance",
  "certificate_min_attendance_percent",
  "contact_email",
  "contact_phone",
  "seo_title",
  "meta_description",
  "og_image_url",
  "og_media_key",
  "og_image_alt",
  "canonical_url",
  "workflow_status",
  "published_at",
  "created_by",
  "updated_by",
  "created_at",
  "updated_at"
];
function eventValues(input, id2, userId, now, publishedAt2) {
  return [
    id2,
    input.slug,
    input.title,
    input.shortDescription,
    sanitizeBlogHtml(input.fullDescription),
    input.eventType,
    input.category,
    input.eventStatus,
    input.eventStatusOverride,
    Number(input.featured),
    input.sortOrder,
    input.startsAt,
    input.endsAt,
    input.timezone,
    input.locationType,
    nullable2(input.venue),
    nullable2(input.address),
    nullable2(input.city),
    input.country,
    input.latitude,
    input.longitude,
    nullable2(input.onlineUrl),
    nullable2(input.onlinePlatform),
    nullable2(input.meetingInstructions),
    nullable2(input.mapUrl),
    nullable2(input.coverImageUrl),
    nullable2(input.heroImage?.key),
    nullable2(input.heroImage?.altText),
    nullable2(input.thumbnailUrl),
    JSON.stringify(input.gallery),
    JSON.stringify(input.galleryImages),
    nullable2(input.posterUrl),
    nullable2(input.videoUrl),
    Number(input.registrationRequired),
    input.registrationMode,
    nullable2(input.registrationUrl),
    nullable2(input.registrationOpensAt),
    nullable2(input.registrationDeadline),
    input.maxParticipants,
    Number(input.registrationCapacityOverride),
    input.feeMinor,
    input.currency,
    Number(input.paymentRequired),
    JSON.stringify(input.paymentMethods),
    input.bkashNumber,
    input.registrationStatus,
    input.registrationStatusOverride,
    input.organizer,
    input.organizerPersonId,
    JSON.stringify(input.coOrganizers),
    JSON.stringify(input.coOrganizerIds),
    JSON.stringify(input.partners),
    JSON.stringify(input.partnerIds),
    JSON.stringify(input.sponsors),
    JSON.stringify(input.sponsorIds),
    JSON.stringify(input.speakers),
    JSON.stringify(input.speakerIds),
    JSON.stringify(input.trainers),
    JSON.stringify(input.trainerIds),
    JSON.stringify(input.tags),
    nullable2(input.targetAudience),
    nullable2(input.eligibility),
    Number(input.certificateAvailable),
    Number(input.certificateRequireRegistration),
    Number(input.certificateRequirePayment),
    Number(input.certificateRequireAttendance),
    input.certificateMinAttendancePercent,
    nullable2(input.contactEmail),
    nullable2(input.contactPhone),
    nullable2(input.seoTitle),
    nullable2(input.metaDescription),
    nullable2(input.ogImageUrl),
    nullable2(input.ogImage?.key),
    nullable2(input.ogImage?.altText),
    nullable2(input.canonicalUrl),
    input.workflowStatus,
    publishedAt2,
    userId,
    userId,
    now,
    now
  ];
}
__name(eventValues, "eventValues");
var selectEvent = `SELECT e.*,
  hm.original_name AS hero_media_original_name,hm.content_type AS hero_media_content_type,hm.byte_size AS hero_media_byte_size,hm.width AS hero_media_width,hm.height AS hero_media_height,hm.created_at AS hero_media_created_at,
  om.original_name AS og_media_original_name,om.content_type AS og_media_content_type,om.byte_size AS og_media_byte_size,om.width AS og_media_width,om.height AS og_media_height,om.created_at AS og_media_created_at,
  (SELECT COUNT(*) FROM event_registrations r WHERE r.event_id=e.id AND r.registration_status='APPROVED') AS approved_count,
  (SELECT COUNT(*) FROM event_registrations r WHERE r.event_id=e.id AND r.registration_status IN ('PENDING','APPROVED')) AS reserved_count
  FROM managed_events e LEFT JOIN website_media_objects hm ON hm.object_key=e.hero_media_key LEFT JOIN website_media_objects om ON om.object_key=e.og_media_key`;

// worker/routes/community.ts
var communityRoutes = new Hono2();
var id = external_exports.string().trim().min(1).max(100);
var text = /* @__PURE__ */ __name((minimum = 0, maximum = 5e3) => external_exports.string().trim().min(minimum).max(maximum), "text");
var optionalText3 = /* @__PURE__ */ __name((maximum = 5e3) => text(0, maximum).optional().nullable(), "optionalText");
var url = external_exports.string().trim().url().max(1e3).optional().nullable();
var email3 = external_exports.string().trim().email().max(254).optional().nullable();
var stringList3 = external_exports.array(text(1, 300)).max(100).default([]);
var workflow = external_exports.enum(["DRAFT", "PUBLISHED", "ARCHIVED"]);
var personSchema = external_exports.object({
  slug: text(3, 160).regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/u),
  fullName: text(2, 150),
  profilePhotoUrl: optionalText3(1e3),
  shortBio: optionalText3(500),
  biography: optionalText3(1e4),
  publicEmail: email3,
  publicPhone: optionalText3(32),
  series: optionalText3(80),
  department: optionalText3(160),
  university: optionalText3(200),
  studentIdPrivate: optionalText3(80),
  graduationYear: external_exports.number().int().min(1950).max(2200).optional().nullable(),
  personType: external_exports.enum([
    "EXECUTIVE",
    "ADVISORY_BOARD",
    "FACULTY_ADVISOR",
    "GENERAL_MEMBER",
    "VOLUNTEER",
    "ALUMNI",
    "MENTOR",
    "RESEARCHER",
    "COORDINATOR",
    "FORMER_EXECUTIVE"
  ]),
  position: text(2, 120),
  term: optionalText3(100),
  committeeSession: optionalText3(100),
  startsOn: optionalText3(30),
  endsOn: optionalText3(30),
  currentPosition: external_exports.boolean().default(true),
  sortOrder: external_exports.number().int().min(-1e5).max(1e5).default(0),
  featured: external_exports.boolean().default(false),
  publicProfile: external_exports.boolean().default(true),
  linkedinUrl: url,
  githubUrl: url,
  facebookUrl: url,
  websiteUrl: url,
  researchProfileUrl: url,
  workflowStatus: workflow
});
var partnerSchema = external_exports.object({
  slug: text(3, 160).regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/u),
  organizationName: text(2, 200),
  logoUrl: optionalText3(1e3),
  coverImageUrl: optionalText3(1e3),
  shortDescription: text(3, 500),
  fullDescription: text(3, 2e4),
  category: text(2, 100),
  country: optionalText3(100),
  city: optionalText3(120),
  websiteUrl: url,
  contactEmail: email3,
  contactPerson: optionalText3(160),
  partnershipType: optionalText3(160),
  startsOn: optionalText3(30),
  endsOn: optionalText3(30),
  active: external_exports.boolean().default(true),
  featured: external_exports.boolean().default(false),
  sortOrder: external_exports.number().int().min(-1e5).max(1e5).default(0),
  facebookUrl: url,
  linkedinUrl: url,
  instagramUrl: url,
  otherUrl: url,
  seoTitle: optionalText3(200),
  metaDescription: optionalText3(500),
  workflowStatus: workflow,
  sourceSubmissionId: optionalText3(100)
});
var opportunitySchema = external_exports.object({
  slug: text(3, 160).regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/u),
  title: text(3, 200),
  shortDescription: text(3, 500),
  fullDescription: text(3, 2e4),
  category: text(2, 100),
  organization: text(2, 200),
  opportunityType: text(2, 100),
  featured: external_exports.boolean().default(false),
  applicationOpensAt: external_exports.string().datetime().optional().nullable(),
  applicationDeadline: external_exports.string().datetime().optional().nullable(),
  startsAt: external_exports.string().datetime().optional().nullable(),
  endsAt: external_exports.string().datetime().optional().nullable(),
  eligibility: optionalText3(5e3),
  whoCanApply: optionalText3(3e3),
  academicLevel: optionalText3(300),
  department: optionalText3(300),
  series: optionalText3(300),
  location: optionalText3(300),
  ageRequirement: optionalText3(300),
  otherEligibility: optionalText3(3e3),
  applicationMode: external_exports.enum(["INTERNAL", "EXTERNAL"]),
  applicationUrl: url,
  contactEmail: email3,
  contactPhone: optionalText3(32),
  requiredDocuments: stringList3,
  coverImageUrl: optionalText3(1e3),
  logoUrl: optionalText3(1e3),
  attachments: stringList3,
  seoTitle: optionalText3(200),
  metaDescription: optionalText3(500),
  ogImageUrl: optionalText3(1e3),
  sortOrder: external_exports.number().int().min(-1e5).max(1e5).default(0),
  workflowStatus: workflow
});
var kindSchema = external_exports.enum(["events", "people", "partners", "opportunities"]);
var configs = {
  events: {
    table: "managed_events",
    collection: "events",
    permission: "event",
    schema: eventSchema,
    publicWhere: "",
    publicOrder: "CASE WHEN ends_at >= strftime('%Y-%m-%dT%H:%M:%fZ','now') THEN 0 ELSE 1 END, featured DESC, CASE WHEN ends_at >= strftime('%Y-%m-%dT%H:%M:%fZ','now') THEN starts_at END ASC, ends_at DESC"
  },
  people: {
    table: "people_profiles",
    collection: "team_members",
    permission: "people",
    schema: personSchema,
    publicWhere: "AND public_profile=1",
    publicOrder: "featured DESC, person_type ASC, sort_order ASC, full_name ASC"
  },
  partners: {
    table: "partner_profiles",
    collection: "partners",
    permission: "partner",
    schema: partnerSchema,
    publicWhere: "AND active=1",
    publicOrder: "featured DESC, category ASC, sort_order ASC, organization_name ASC"
  },
  opportunities: {
    table: "opportunities",
    collection: "opportunities",
    permission: "opportunity",
    schema: opportunitySchema,
    publicWhere: "",
    publicOrder: "featured DESC, application_deadline ASC, sort_order ASC"
  }
};
function bool(value) {
  return value ? 1 : 0;
}
__name(bool, "bool");
function compact(value) {
  return Object.fromEntries(
    Object.entries(value).filter(([, item]) => item !== void 0)
  );
}
__name(compact, "compact");
function rowToApi(row) {
  const result = {};
  for (const [key, value] of Object.entries(row)) {
    const camel2 = key.replace(
      /_([a-z])/g,
      (_, letter) => letter.toUpperCase()
    );
    if (key.endsWith("_json")) {
      const name = camel2.slice(0, -4);
      try {
        result[name] = JSON.parse(String(value ?? "[]"));
      } catch {
        result[name] = [];
      }
    } else if ([
      "featured",
      "active",
      "public_profile",
      "current_position",
      "registration_required",
      "payment_required",
      "registration_capacity_override",
      "certificate_available",
      "certificate_require_registration",
      "certificate_require_payment",
      "certificate_require_attendance"
    ].includes(key)) {
      result[camel2] = Boolean(value);
    } else result[camel2] = value;
  }
  return result;
}
__name(rowToApi, "rowToApi");
function publishedAt(status, previous) {
  return status === "PUBLISHED" ? previous || (/* @__PURE__ */ new Date()).toISOString() : null;
}
__name(publishedAt, "publishedAt");
function adminNotificationStatement(db, options) {
  return db.prepare(
    `INSERT OR IGNORE INTO user_notifications(id,user_id,notification_type,title,message,action_url,related_entity_type,related_entity_id,priority,dedupe_key)
     SELECT lower(hex(randomblob(16))),ur.user_id,?,?,?,?,?,?,?,?
     FROM user_roles ur JOIN role_permissions rp ON rp.role_id=ur.role_id JOIN permissions p ON p.id=rp.permission_id
     WHERE p.permission_key='admin.access' AND ur.revoked_at IS NULL AND (ur.expires_at IS NULL OR ur.expires_at>strftime('%Y-%m-%dT%H:%M:%fZ','now'))
     GROUP BY ur.user_id`
  ).bind(
    options.type,
    options.title,
    options.message,
    options.actionUrl,
    options.entityType,
    options.entityId,
    "NORMAL",
    options.dedupeKey
  );
}
__name(adminNotificationStatement, "adminNotificationStatement");
function userNotificationStatement(db, options) {
  return db.prepare(
    "INSERT OR IGNORE INTO user_notifications(id,user_id,notification_type,title,message,action_url,related_entity_type,related_entity_id,priority,dedupe_key) VALUES(?,?,?,?,?,?,?,?,?,?)"
  ).bind(
    crypto.randomUUID(),
    options.userId,
    options.type,
    options.title,
    options.message,
    options.actionUrl ?? null,
    options.entityType,
    options.entityId,
    "NORMAL",
    options.dedupeKey
  );
}
__name(userNotificationStatement, "userNotificationStatement");
function contentJson(kind, input) {
  if (kind === "events") return legacyEventData(input);
  if (kind === "people")
    return compact({
      name: input.fullName,
      slug: input.slug,
      image_url: input.profilePhotoUrl,
      bio: input.shortBio,
      biography: input.biography,
      email: input.publicEmail,
      phone: input.publicPhone,
      batch: input.series,
      department: input.department,
      university: input.university,
      category: input.personType,
      position: input.position,
      term: input.term,
      session: input.committeeSession,
      current_position: input.currentPosition,
      featured: input.featured,
      linkedin: input.linkedinUrl,
      github: input.githubUrl,
      facebook: input.facebookUrl,
      website: input.websiteUrl,
      research_profile: input.researchProfileUrl
    });
  if (kind === "partners")
    return compact({
      title: input.organizationName,
      name: input.organizationName,
      slug: input.slug,
      logo_url: input.logoUrl,
      image_url: input.logoUrl,
      cover_image_url: input.coverImageUrl,
      description: input.shortDescription,
      full_description: input.fullDescription,
      category: input.category,
      country: input.country,
      city: input.city,
      website: input.websiteUrl,
      contact_email: input.contactEmail,
      contact_person: input.contactPerson,
      partnership_type: input.partnershipType,
      start_date: input.startsOn,
      end_date: input.endsOn,
      active: input.active,
      featured: input.featured,
      facebook: input.facebookUrl,
      linkedin: input.linkedinUrl,
      instagram: input.instagramUrl,
      other_url: input.otherUrl,
      seo_title: input.seoTitle,
      meta_description: input.metaDescription
    });
  return compact({
    title: input.title,
    slug: input.slug,
    description: input.shortDescription,
    full_description: input.fullDescription,
    category: input.category,
    organization: input.organization,
    type: input.opportunityType,
    featured: input.featured,
    application_opens: input.applicationOpensAt,
    deadline: input.applicationDeadline,
    start_date: input.startsAt,
    end_date: input.endsAt,
    eligibility: input.eligibility,
    who_can_apply: input.whoCanApply,
    academic_level: input.academicLevel,
    department: input.department,
    series: input.series,
    location: input.location,
    age_requirement: input.ageRequirement,
    other_eligibility: input.otherEligibility,
    internal_application: input.applicationMode === "INTERNAL",
    application_url: input.applicationUrl,
    contact_email: input.contactEmail,
    contact_phone: input.contactPhone,
    required_documents: input.requiredDocuments,
    cover_image_url: input.coverImageUrl,
    logo_url: input.logoUrl,
    attachments: input.attachments,
    seo_title: input.seoTitle,
    meta_description: input.metaDescription,
    og_image: input.ogImageUrl
  });
}
__name(contentJson, "contentJson");
function upsertStatement(db, kind, recordId, input, userId, now, existingPublishedAt) {
  if (kind === "events") {
    const updateColumns = eventColumns.filter(
      (column) => !["id", "created_by", "created_at"].includes(column)
    );
    return db.prepare(
      `INSERT INTO managed_events(${eventColumns.join(",")}) VALUES(${eventColumns.map(() => "?").join(",")})
       ON CONFLICT(id) DO UPDATE SET ${updateColumns.map((column) => `${column}=excluded.${column}`).join(",")}`
    ).bind(
      ...eventValues(
        input,
        recordId,
        userId,
        now,
        publishedAt(input.workflowStatus, existingPublishedAt)
      )
    );
  }
  if (kind === "people")
    return db.prepare(
      `INSERT INTO people_profiles(id,slug,full_name,profile_photo_url,short_bio,biography,public_email,public_phone,series,department,university,student_id_private,graduation_year,person_type,position,term,committee_session,starts_on,ends_on,current_position,sort_order,featured,public_profile,linkedin_url,github_url,facebook_url,website_url,research_profile_url,workflow_status,published_at,created_by,updated_by,created_at,updated_at)
     VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)
     ON CONFLICT(id) DO UPDATE SET slug=excluded.slug,full_name=excluded.full_name,profile_photo_url=excluded.profile_photo_url,short_bio=excluded.short_bio,biography=excluded.biography,public_email=excluded.public_email,public_phone=excluded.public_phone,series=excluded.series,department=excluded.department,university=excluded.university,student_id_private=excluded.student_id_private,graduation_year=excluded.graduation_year,person_type=excluded.person_type,position=excluded.position,term=excluded.term,committee_session=excluded.committee_session,starts_on=excluded.starts_on,ends_on=excluded.ends_on,current_position=excluded.current_position,sort_order=excluded.sort_order,featured=excluded.featured,public_profile=excluded.public_profile,linkedin_url=excluded.linkedin_url,github_url=excluded.github_url,facebook_url=excluded.facebook_url,website_url=excluded.website_url,research_profile_url=excluded.research_profile_url,workflow_status=excluded.workflow_status,published_at=excluded.published_at,updated_by=excluded.updated_by,updated_at=excluded.updated_at`
    ).bind(
      recordId,
      input.slug,
      input.fullName,
      input.profilePhotoUrl,
      input.shortBio,
      input.biography,
      input.publicEmail,
      input.publicPhone,
      input.series,
      input.department,
      input.university,
      input.studentIdPrivate,
      input.graduationYear,
      input.personType,
      input.position,
      input.term,
      input.committeeSession,
      input.startsOn,
      input.endsOn,
      bool(input.currentPosition),
      input.sortOrder,
      bool(input.featured),
      bool(input.publicProfile),
      input.linkedinUrl,
      input.githubUrl,
      input.facebookUrl,
      input.websiteUrl,
      input.researchProfileUrl,
      input.workflowStatus,
      publishedAt(input.workflowStatus, existingPublishedAt),
      userId,
      userId,
      now,
      now
    );
  if (kind === "partners")
    return db.prepare(
      `INSERT INTO partner_profiles(id,source_submission_id,slug,organization_name,logo_url,cover_image_url,short_description,full_description,category,country,city,website_url,contact_email,contact_person,partnership_type,starts_on,ends_on,active,featured,sort_order,facebook_url,linkedin_url,instagram_url,other_url,seo_title,meta_description,workflow_status,published_at,created_by,updated_by,created_at,updated_at)
     VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)
     ON CONFLICT(id) DO UPDATE SET source_submission_id=COALESCE(excluded.source_submission_id,source_submission_id),slug=excluded.slug,organization_name=excluded.organization_name,logo_url=excluded.logo_url,cover_image_url=excluded.cover_image_url,short_description=excluded.short_description,full_description=excluded.full_description,category=excluded.category,country=excluded.country,city=excluded.city,website_url=excluded.website_url,contact_email=excluded.contact_email,contact_person=excluded.contact_person,partnership_type=excluded.partnership_type,starts_on=excluded.starts_on,ends_on=excluded.ends_on,active=excluded.active,featured=excluded.featured,sort_order=excluded.sort_order,facebook_url=excluded.facebook_url,linkedin_url=excluded.linkedin_url,instagram_url=excluded.instagram_url,other_url=excluded.other_url,seo_title=excluded.seo_title,meta_description=excluded.meta_description,workflow_status=excluded.workflow_status,published_at=excluded.published_at,updated_by=excluded.updated_by,updated_at=excluded.updated_at`
    ).bind(
      recordId,
      input.sourceSubmissionId,
      input.slug,
      input.organizationName,
      input.logoUrl,
      input.coverImageUrl,
      input.shortDescription,
      input.fullDescription,
      input.category,
      input.country,
      input.city,
      input.websiteUrl,
      input.contactEmail,
      input.contactPerson,
      input.partnershipType,
      input.startsOn,
      input.endsOn,
      bool(input.active),
      bool(input.featured),
      input.sortOrder,
      input.facebookUrl,
      input.linkedinUrl,
      input.instagramUrl,
      input.otherUrl,
      input.seoTitle,
      input.metaDescription,
      input.workflowStatus,
      publishedAt(input.workflowStatus, existingPublishedAt),
      userId,
      userId,
      now,
      now
    );
  return db.prepare(
    `INSERT INTO opportunities(id,slug,title,short_description,full_description,category,organization,opportunity_type,featured,application_opens_at,application_deadline,starts_at,ends_at,eligibility,who_can_apply,academic_level,department,series,location,age_requirement,other_eligibility,application_mode,application_url,contact_email,contact_phone,required_documents_json,cover_image_url,logo_url,attachments_json,seo_title,meta_description,og_image_url,sort_order,workflow_status,published_at,created_by,updated_by,created_at,updated_at)
     VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)
     ON CONFLICT(id) DO UPDATE SET slug=excluded.slug,title=excluded.title,short_description=excluded.short_description,full_description=excluded.full_description,category=excluded.category,organization=excluded.organization,opportunity_type=excluded.opportunity_type,featured=excluded.featured,application_opens_at=excluded.application_opens_at,application_deadline=excluded.application_deadline,starts_at=excluded.starts_at,ends_at=excluded.ends_at,eligibility=excluded.eligibility,who_can_apply=excluded.who_can_apply,academic_level=excluded.academic_level,department=excluded.department,series=excluded.series,location=excluded.location,age_requirement=excluded.age_requirement,other_eligibility=excluded.other_eligibility,application_mode=excluded.application_mode,application_url=excluded.application_url,contact_email=excluded.contact_email,contact_phone=excluded.contact_phone,required_documents_json=excluded.required_documents_json,cover_image_url=excluded.cover_image_url,logo_url=excluded.logo_url,attachments_json=excluded.attachments_json,seo_title=excluded.seo_title,meta_description=excluded.meta_description,og_image_url=excluded.og_image_url,sort_order=excluded.sort_order,workflow_status=excluded.workflow_status,published_at=excluded.published_at,updated_by=excluded.updated_by,updated_at=excluded.updated_at`
  ).bind(
    recordId,
    input.slug,
    input.title,
    input.shortDescription,
    input.fullDescription,
    input.category,
    input.organization,
    input.opportunityType,
    bool(input.featured),
    input.applicationOpensAt,
    input.applicationDeadline,
    input.startsAt,
    input.endsAt,
    input.eligibility,
    input.whoCanApply,
    input.academicLevel,
    input.department,
    input.series,
    input.location,
    input.ageRequirement,
    input.otherEligibility,
    input.applicationMode,
    input.applicationUrl,
    input.contactEmail,
    input.contactPhone,
    JSON.stringify(input.requiredDocuments),
    input.coverImageUrl,
    input.logoUrl,
    JSON.stringify(input.attachments),
    input.seoTitle,
    input.metaDescription,
    input.ogImageUrl,
    input.sortOrder,
    input.workflowStatus,
    publishedAt(input.workflowStatus, existingPublishedAt),
    userId,
    userId,
    now,
    now
  );
}
__name(upsertStatement, "upsertStatement");
communityRoutes.get("/community/:kind", async (context) => {
  const kind = kindSchema.parse(context.req.param("kind"));
  const config = configs[kind];
  if (kind === "events") {
    const result2 = await context.env.DB.prepare(
      `${selectEvent} WHERE e.workflow_status='PUBLISHED' ORDER BY CASE WHEN e.ends_at >= strftime('%Y-%m-%dT%H:%M:%fZ','now') THEN 0 ELSE 1 END,e.featured DESC,CASE WHEN e.ends_at >= strftime('%Y-%m-%dT%H:%M:%fZ','now') THEN e.starts_at END ASC,e.ends_at DESC LIMIT 500`
    ).all();
    return context.json(
      success(
        result2.results.map((row) => eventView(row)),
        context.get("requestId")
      )
    );
  }
  const columns = kind === "people" ? "id,slug,full_name,profile_photo_url,short_bio,biography,public_email,public_phone,series,department,university,graduation_year,person_type,position,term,committee_session,starts_on,ends_on,current_position,sort_order,featured,linkedin_url,github_url,facebook_url,website_url,research_profile_url,workflow_status,published_at,created_at,updated_at" : "*";
  const result = await context.env.DB.prepare(
    `SELECT ${columns} FROM ${config.table} WHERE workflow_status='PUBLISHED' ${config.publicWhere} ORDER BY ${config.publicOrder} LIMIT 500`
  ).all();
  return context.json(
    success(result.results.map(rowToApi), context.get("requestId"))
  );
});
communityRoutes.get("/community/:kind/:slug", async (context) => {
  const kind = kindSchema.parse(context.req.param("kind"));
  const config = configs[kind];
  const slug2 = text(3, 160).parse(context.req.param("slug"));
  if (kind === "events") {
    const row2 = await context.env.DB.prepare(
      `${selectEvent} WHERE e.slug=? AND e.workflow_status='PUBLISHED'`
    ).bind(slug2).first();
    if (!row2)
      throw new AppError({
        code: "NOT_FOUND",
        message: "The requested page is unavailable.",
        status: 404
      });
    return context.json(success(eventView(row2), context.get("requestId")));
  }
  const columns = kind === "people" ? "id,slug,full_name,profile_photo_url,short_bio,biography,public_email,public_phone,series,department,university,graduation_year,person_type,position,term,committee_session,starts_on,ends_on,current_position,sort_order,featured,linkedin_url,github_url,facebook_url,website_url,research_profile_url,workflow_status,published_at,created_at,updated_at" : "*";
  const row = await context.env.DB.prepare(
    `SELECT ${columns} FROM ${config.table} WHERE slug=? AND workflow_status='PUBLISHED' ${config.publicWhere}`
  ).bind(slug2).first();
  if (!row)
    throw new AppError({
      code: "NOT_FOUND",
      message: "The requested page is unavailable.",
      status: 404
    });
  return context.json(success(rowToApi(row), context.get("requestId")));
});
communityRoutes.get(
  "/admin/community/:kind",
  sessionMiddleware({ required: true }),
  async (context, next) => {
    const kind = kindSchema.parse(context.req.param("kind"));
    return requirePermission(`${configs[kind].permission}.read`)(context, next);
  },
  async (context) => {
    const kind = kindSchema.parse(context.req.param("kind"));
    if (kind === "events") {
      const result2 = await context.env.DB.prepare(
        `${selectEvent} WHERE e.workflow_status!='ARCHIVED' ORDER BY e.updated_at DESC LIMIT 500`
      ).all();
      return context.json(
        success(
          result2.results.map((row) => eventView(row)),
          context.get("requestId")
        )
      );
    }
    const result = await context.env.DB.prepare(
      `SELECT * FROM ${configs[kind].table} WHERE workflow_status!='ARCHIVED' ORDER BY updated_at DESC LIMIT 500`
    ).all();
    return context.json(
      success(result.results.map(rowToApi), context.get("requestId"))
    );
  }
);
communityRoutes.put(
  "/admin/community/:kind/:id",
  sessionMiddleware({ required: true }),
  csrfMiddleware(),
  async (context, next) => {
    const kind = kindSchema.parse(context.req.param("kind"));
    return requireAnyPermission([
      `${configs[kind].permission}.manage`,
      "content.manage"
    ])(context, next);
  },
  async (context) => {
    const { user } = requireAuth(context);
    const kind = kindSchema.parse(context.req.param("kind"));
    const config = configs[kind];
    const recordId = id.parse(context.req.param("id"));
    const parsed = await parseJson(context, config.schema);
    const input = kind === "events" ? normalizeEventInput(parsed) : parsed;
    if (kind === "events") {
      await validateEventMediaReferences(
        context.env.DB,
        context.env.STORAGE,
        input
      );
      const duplicate = await context.env.DB.prepare(
        "SELECT id FROM managed_events WHERE slug=? AND id!=?"
      ).bind(input.slug, recordId).first("id");
      if (duplicate)
        throw new AppError({
          code: "EVENT_SLUG_EXISTS",
          message: "Another event already uses this slug.",
          status: 409
        });
    }
    if (input.workflowStatus === "PUBLISHED" && !user.permissions.some(
      (permission) => ["content.publish", `${config.permission}.manage`].includes(permission)
    ))
      throw new AppError({
        code: "PERMISSION_DENIED",
        message: "You do not have permission to publish this record.",
        status: 403
      });
    const existing = await context.env.DB.prepare(
      `SELECT published_at FROM ${config.table} WHERE id=?`
    ).bind(recordId).first();
    const now = (/* @__PURE__ */ new Date()).toISOString();
    const publishTime = publishedAt(
      input.workflowStatus,
      existing?.published_at
    );
    const statements = [
      context.env.DB.prepare(
        `INSERT INTO website_content_items(id,collection_key,data_json,status,sort_order,created_by,updated_by,created_at,updated_at,published_at,archived_at)
         VALUES(?,?,?,?,?,?,?,?,?,?,NULL)
         ON CONFLICT(id) DO UPDATE SET collection_key=excluded.collection_key,data_json=excluded.data_json,status=excluded.status,sort_order=excluded.sort_order,updated_by=excluded.updated_by,updated_at=excluded.updated_at,published_at=excluded.published_at,archived_at=NULL`
      ).bind(
        recordId,
        config.collection,
        JSON.stringify(contentJson(kind, input)),
        input.workflowStatus,
        input.sortOrder ?? 0,
        user.id,
        user.id,
        now,
        now,
        publishTime
      ),
      upsertStatement(
        context.env.DB,
        kind,
        recordId,
        input,
        user.id,
        now,
        existing?.published_at ?? null
      ),
      createAuditStatement(context.env.DB, {
        requestId: context.get("requestId"),
        actorId: user.id,
        action: `${kind.toUpperCase()}_SAVED`,
        entityType: kind.toUpperCase(),
        entityId: recordId,
        metadata: { status: input.workflowStatus }
      })
    ];
    if (input.workflowStatus === "PUBLISHED" && !existing?.published_at && (kind === "events" || kind === "opportunities"))
      statements.push(
        context.env.DB.prepare(
          `INSERT OR IGNORE INTO user_notifications(id,user_id,notification_type,title,message,action_url,related_entity_type,related_entity_id,priority,dedupe_key)
         SELECT lower(hex(randomblob(16))),id,?,?,?,?,?,?,?,? FROM users WHERE status='EMAIL_VERIFIED' AND deleted_at IS NULL`
        ).bind(
          kind === "events" ? "EVENT_PUBLISHED" : "OPPORTUNITY_PUBLISHED",
          kind === "events" ? `New event: ${input.title}` : `New opportunity: ${input.title}`,
          kind === "events" ? input.shortDescription : input.shortDescription,
          kind === "events" ? `/events/${input.slug}` : `/opportunities/${input.slug}`,
          kind.toUpperCase(),
          recordId,
          "NORMAL",
          `${kind}:published:${recordId}`
        )
      );
    await context.env.DB.batch(statements);
    return context.json(
      success(
        { id: recordId, status: input.workflowStatus },
        context.get("requestId")
      )
    );
  }
);
communityRoutes.delete(
  "/admin/community/:kind/:id",
  sessionMiddleware({ required: true }),
  csrfMiddleware(),
  async (context, next) => {
    const kind = kindSchema.parse(context.req.param("kind"));
    return requireAnyPermission([
      `${configs[kind].permission}.manage`,
      "content.manage"
    ])(context, next);
  },
  async (context) => {
    const { user } = requireAuth(context);
    const kind = kindSchema.parse(context.req.param("kind"));
    const recordId = id.parse(context.req.param("id"));
    const now = (/* @__PURE__ */ new Date()).toISOString();
    await context.env.DB.batch([
      context.env.DB.prepare(
        `UPDATE ${configs[kind].table} SET workflow_status='ARCHIVED',updated_by=?,updated_at=? WHERE id=?`
      ).bind(user.id, now, recordId),
      context.env.DB.prepare(
        "UPDATE website_content_items SET status='ARCHIVED',archived_at=?,updated_by=?,updated_at=? WHERE id=?"
      ).bind(now, user.id, now, recordId),
      createAuditStatement(context.env.DB, {
        requestId: context.get("requestId"),
        actorId: user.id,
        action: `${kind.toUpperCase()}_ARCHIVED`,
        entityType: kind.toUpperCase(),
        entityId: recordId
      })
    ]);
    return context.json(
      success({ id: recordId, status: "ARCHIVED" }, context.get("requestId"))
    );
  }
);
var opportunityApplicationSchema = external_exports.object({
  applicantName: text(2, 150),
  applicantEmail: external_exports.string().trim().email().max(254),
  applicantPhone: optionalText3(32),
  organization: optionalText3(200),
  coverNote: text(20, 1e4),
  answers: external_exports.record(external_exports.string(), external_exports.unknown()).default({}),
  website: external_exports.string().max(0).optional().default(""),
  turnstileToken: text(1, 2048)
});
communityRoutes.post(
  "/opportunities/:id/apply",
  sessionMiddleware({ required: false }),
  async (context) => {
    const opportunityId = id.parse(context.req.param("id"));
    const input = await parseJson(context, opportunityApplicationSchema);
    await enforceRateLimit({
      db: context.env.DB,
      scope: "opportunity-application",
      identifier: `${clientIp(context.req.raw)}:${normalizeEmail(input.applicantEmail)}`,
      limit: 5,
      windowSeconds: 60 * 60
    });
    await enforceTurnstile({
      env: context.env,
      request: context.req.raw,
      token: input.turnstileToken,
      action: "submission"
    });
    const opportunity = await context.env.DB.prepare(
      "SELECT id,title,application_mode,application_deadline FROM opportunities WHERE id=? AND workflow_status='PUBLISHED'"
    ).bind(opportunityId).first();
    if (!opportunity || opportunity.application_mode !== "INTERNAL")
      throw new AppError({
        code: "APPLICATION_UNAVAILABLE",
        message: "This opportunity does not accept applications on this website.",
        status: 409
      });
    if (opportunity.application_deadline && new Date(opportunity.application_deadline) < /* @__PURE__ */ new Date())
      throw new AppError({
        code: "APPLICATION_CLOSED",
        message: "The application deadline has passed.",
        status: 409
      });
    const auth = context.get("authUser");
    const trackingToken = createOpaqueToken();
    const verifyToken = auth ? null : createOpaqueToken();
    const applicationId = crypto.randomUUID();
    const now = (/* @__PURE__ */ new Date()).toISOString();
    const verificationExpiresAt = verifyToken ? new Date(Date.now() + 24 * 60 * 60 * 1e3).toISOString() : null;
    const reference = `RIOT-${(/* @__PURE__ */ new Date()).getUTCFullYear()}-${applicationId.replaceAll("-", "").slice(0, 8).toUpperCase()}`;
    const status = auth ? "SUBMITTED" : "EMAIL_VERIFICATION";
    const verificationEmail2 = verifyToken ? await createEmailQueueRecord({
      secret: context.env.SESSION_SECRET,
      userId: null,
      template: "SUBMISSION_VERIFY",
      recipientEmail: input.applicantEmail,
      payload: opportunityApplicationVerificationEmail({
        siteUrl: context.env.SITE_URL,
        applicantName: input.applicantName,
        referenceCode: reference,
        token: verifyToken
      })
    }) : null;
    const receiptEmail = await createEmailQueueRecord({
      secret: context.env.SESSION_SECRET,
      userId: auth?.id ?? null,
      template: "SUBMISSION_RECEIVED",
      recipientEmail: input.applicantEmail,
      payload: submissionReceiptEmail({
        siteUrl: context.env.SITE_URL,
        submitterName: input.applicantName,
        submissionType: "OPPORTUNITY",
        referenceCode: reference,
        title: opportunity.title,
        trackingToken,
        verificationRequired: !auth
      })
    });
    const statements = [
      context.env.DB.prepare(
        `INSERT INTO opportunity_applications(id,reference_code,opportunity_id,user_id,applicant_name,applicant_email,applicant_email_normalized,applicant_phone,organization,cover_note,payload_json,tracking_token_hash,verification_token_hash,verification_expires_at,email_verified_at,status,submitted_at,updated_at)
       VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`
      ).bind(
        applicationId,
        reference,
        opportunityId,
        auth?.id ?? null,
        input.applicantName,
        input.applicantEmail,
        normalizeEmail(input.applicantEmail),
        input.applicantPhone,
        input.organization,
        input.coverNote,
        JSON.stringify(input.answers),
        await sha2562(trackingToken),
        verifyToken ? await sha2562(verifyToken) : null,
        verificationExpiresAt,
        auth ? now : null,
        status,
        now,
        now
      ),
      context.env.DB.prepare(
        "INSERT INTO opportunity_application_events(id,application_id,actor_user_id,event_type,to_status,note,request_id) VALUES(?,?,?,?,?,?,?)"
      ).bind(
        crypto.randomUUID(),
        applicationId,
        auth?.id ?? null,
        "APPLICATION_CREATED",
        status,
        "Application received",
        context.get("requestId")
      ),
      createAuditStatement(context.env.DB, {
        requestId: context.get("requestId"),
        actorId: auth?.id,
        actorType: auth ? "USER" : "SYSTEM",
        action: "OPPORTUNITY_APPLICATION_CREATED",
        entityType: "OPPORTUNITY_APPLICATION",
        entityId: applicationId
      }),
      adminNotificationStatement(context.env.DB, {
        type: "OPPORTUNITY_APPLICATION",
        title: "New opportunity application",
        message: `${input.applicantName} applied for ${opportunity.title}.`,
        actionUrl: "/admin?section=applications",
        entityType: "OPPORTUNITY_APPLICATION",
        entityId: applicationId,
        dedupeKey: `opportunity-application:${applicationId}:created`
      })
    ];
    if (verificationEmail2)
      statements.push(insertEmailStatement(context.env.DB, verificationEmail2));
    statements.push(insertEmailStatement(context.env.DB, receiptEmail));
    await context.env.DB.batch(statements);
    return context.json(
      success(
        {
          id: applicationId,
          referenceCode: reference,
          trackingToken,
          verificationRequired: !auth
        },
        context.get("requestId")
      ),
      201
    );
  }
);
communityRoutes.post("/opportunity-applications/verify", async (context) => {
  const input = await parseJson(context, external_exports.object({ token: text(32, 512) }));
  await enforceRateLimit({
    db: context.env.DB,
    scope: "opportunity-application-verify",
    identifier: clientIp(context.req.raw),
    limit: 20,
    windowSeconds: 60 * 60
  });
  const hash = await sha2562(input.token);
  const application = await context.env.DB.prepare(
    "SELECT id,status,verification_expires_at FROM opportunity_applications WHERE verification_token_hash=?"
  ).bind(hash).first();
  if (!application || application.status !== "EMAIL_VERIFICATION")
    throw new AppError({
      code: "INVALID_VERIFICATION_TOKEN",
      message: "This verification link is invalid or already used.",
      status: 400
    });
  if (!application.verification_expires_at || new Date(application.verification_expires_at) < /* @__PURE__ */ new Date())
    throw new AppError({
      code: "VERIFICATION_TOKEN_EXPIRED",
      message: "This verification link has expired. Submit the application again.",
      status: 410
    });
  const now = (/* @__PURE__ */ new Date()).toISOString();
  await context.env.DB.batch([
    context.env.DB.prepare(
      "UPDATE opportunity_applications SET status='SUBMITTED',email_verified_at=?,verification_token_hash=NULL,verification_expires_at=NULL,updated_at=? WHERE id=?"
    ).bind(now, now, application.id),
    context.env.DB.prepare(
      "INSERT INTO opportunity_application_events(id,application_id,event_type,from_status,to_status,note,request_id) VALUES(?,?,?,?,?,?,?)"
    ).bind(
      crypto.randomUUID(),
      application.id,
      "EMAIL_VERIFIED",
      "EMAIL_VERIFICATION",
      "SUBMITTED",
      "Applicant email verified",
      context.get("requestId")
    ),
    adminNotificationStatement(context.env.DB, {
      type: "OPPORTUNITY_APPLICATION",
      title: "Opportunity application verified",
      message: "A guest opportunity application is ready for review.",
      actionUrl: "/admin?section=applications",
      entityType: "OPPORTUNITY_APPLICATION",
      entityId: application.id,
      dedupeKey: `opportunity-application:${application.id}:verified`
    })
  ]);
  return context.json(success({ verified: true }, context.get("requestId")));
});
communityRoutes.get("/opportunity-applications/track", async (context) => {
  const input = external_exports.object({ reference: text(3, 100), token: text(32, 512) }).parse(context.req.query());
  await enforceRateLimit({
    db: context.env.DB,
    scope: "opportunity-application-track",
    identifier: clientIp(context.req.raw),
    limit: 60,
    windowSeconds: 60 * 60
  });
  const tokenHash = await sha2562(input.token);
  const application = await context.env.DB.prepare(
    `SELECT a.id,a.reference_code,a.status,a.cover_note,a.submitted_at,a.updated_at,o.title
     FROM opportunity_applications a JOIN opportunities o ON o.id=a.opportunity_id
     WHERE a.reference_code=? AND a.tracking_token_hash=?`
  ).bind(input.reference, tokenHash).first();
  if (!application)
    throw new AppError({
      code: "TRACKING_NOT_FOUND",
      message: "The reference or tracking token is incorrect.",
      status: 404
    });
  const events = await context.env.DB.prepare(
    "SELECT event_type,from_status,to_status,note,created_at FROM opportunity_application_events WHERE application_id=? ORDER BY created_at ASC"
  ).bind(application.id).all();
  return context.json(
    success(
      {
        id: application.id,
        referenceCode: application.reference_code,
        type: "OPPORTUNITY",
        title: application.title,
        summary: application.cover_note,
        status: application.status,
        publicResponse: null,
        createdAt: application.submitted_at,
        updatedAt: application.updated_at,
        events: events.results.map((event) => ({
          eventType: event.event_type,
          fromStatus: event.from_status,
          toStatus: event.to_status,
          publicMessage: event.note,
          createdAt: event.created_at
        })),
        attachments: []
      },
      context.get("requestId")
    )
  );
});
communityRoutes.get(
  "/admin/opportunity-applications",
  sessionMiddleware({ required: true }),
  requireAnyPermission(["opportunity.read", "submissions.read"]),
  async (context) => {
    const result = await context.env.DB.prepare(
      `SELECT a.*,o.title AS opportunity_title,u.display_name AS reviewer_name
       FROM opportunity_applications a JOIN opportunities o ON o.id=a.opportunity_id
       LEFT JOIN users u ON u.id=a.assigned_reviewer_id
       ORDER BY a.submitted_at DESC LIMIT 500`
    ).all();
    return context.json(
      success(result.results.map(rowToApi), context.get("requestId"))
    );
  }
);
communityRoutes.get(
  "/admin/opportunity-applications/:id",
  sessionMiddleware({ required: true }),
  requireAnyPermission(["opportunity.read", "submissions.read"]),
  async (context) => {
    const applicationId = id.parse(context.req.param("id"));
    const row = await context.env.DB.prepare(
      `SELECT a.*,o.title AS opportunity_title FROM opportunity_applications a
       JOIN opportunities o ON o.id=a.opportunity_id WHERE a.id=?`
    ).bind(applicationId).first();
    if (!row)
      throw new AppError({
        code: "NOT_FOUND",
        message: "Opportunity application not found.",
        status: 404
      });
    const events = await context.env.DB.prepare(
      "SELECT event_type,from_status,to_status,note,created_at,actor_user_id FROM opportunity_application_events WHERE application_id=? ORDER BY created_at ASC"
    ).bind(applicationId).all();
    let payload = {};
    try {
      payload = JSON.parse(String(row.payload_json || "{}"));
    } catch {
    }
    return context.json(
      success(
        {
          id: row.id,
          source: "OPPORTUNITY",
          referenceCode: row.reference_code,
          type: "OPPORTUNITY",
          title: row.opportunity_title,
          summary: row.cover_note,
          status: row.status,
          priority: row.priority,
          assignedReviewerId: row.assigned_reviewer_id,
          submitter: {
            name: row.applicant_name,
            email: row.applicant_email,
            phone: row.applicant_phone,
            institution: row.organization,
            department: null
          },
          payload,
          publicResponse: null,
          internalNotes: row.internal_notes,
          createdAt: row.submitted_at,
          updatedAt: row.updated_at,
          attachments: [],
          events: events.results.map((event) => ({
            eventType: event.event_type,
            fromStatus: event.from_status,
            toStatus: event.to_status,
            note: event.note,
            createdAt: event.created_at,
            actorUserId: event.actor_user_id
          }))
        },
        context.get("requestId")
      )
    );
  }
);
communityRoutes.get(
  "/admin/application-reviewers",
  sessionMiddleware({ required: true }),
  requireAnyPermission([
    "submissions.read",
    "membership.read",
    "volunteer.read",
    "event.read",
    "course.read",
    "opportunity.read"
  ]),
  async (context) => {
    const result = await context.env.DB.prepare(
      "SELECT id,display_name AS displayName,primary_email AS email FROM users WHERE status='EMAIL_VERIFIED' AND deleted_at IS NULL ORDER BY display_name COLLATE NOCASE LIMIT 250"
    ).all();
    return context.json(success(result.results, context.get("requestId")));
  }
);
var opportunityTransitions = {
  SUBMITTED: ["UNDER_REVIEW", "REJECTED", "ARCHIVED"],
  UNDER_REVIEW: ["NEEDS_INFORMATION", "APPROVED", "REJECTED", "ARCHIVED"],
  NEEDS_INFORMATION: ["UNDER_REVIEW", "REJECTED", "ARCHIVED"],
  APPROVED: ["COMPLETED", "ARCHIVED"],
  REJECTED: ["UNDER_REVIEW", "ARCHIVED"],
  COMPLETED: ["ARCHIVED"]
};
communityRoutes.patch(
  "/admin/opportunity-applications/:id",
  sessionMiddleware({ required: true }),
  csrfMiddleware(),
  requireAnyPermission(["opportunity.manage", "submissions.manage"]),
  async (context) => {
    const { user } = requireAuth(context);
    const applicationId = id.parse(context.req.param("id"));
    const input = await parseJson(
      context,
      external_exports.object({
        status: external_exports.enum([
          "UNDER_REVIEW",
          "NEEDS_INFORMATION",
          "APPROVED",
          "REJECTED",
          "COMPLETED",
          "ARCHIVED"
        ]),
        reason: text(3, 2e3),
        priority: external_exports.enum(["LOW", "NORMAL", "HIGH", "URGENT"]).optional(),
        assignedReviewerId: id.optional().nullable()
      })
    );
    const row = await context.env.DB.prepare(
      "SELECT id,user_id,applicant_name,applicant_email,reference_code,status,priority,assigned_reviewer_id,internal_notes FROM opportunity_applications WHERE id=?"
    ).bind(applicationId).first();
    if (!row)
      throw new AppError({
        code: "NOT_FOUND",
        message: "Opportunity application not found.",
        status: 404
      });
    if (!(opportunityTransitions[row.status] ?? []).includes(input.status))
      throw new AppError({
        code: "INVALID_APPLICATION_TRANSITION",
        message: `A ${row.status} application cannot move to ${input.status}.`,
        status: 409
      });
    if (input.assignedReviewerId) {
      const reviewer = await context.env.DB.prepare(
        "SELECT id FROM users WHERE id=? AND status='EMAIL_VERIFIED' AND deleted_at IS NULL"
      ).bind(input.assignedReviewerId).first("id");
      if (!reviewer)
        throw new AppError({
          code: "REVIEWER_NOT_FOUND",
          message: "The selected reviewer is unavailable.",
          status: 422
        });
    }
    const now = (/* @__PURE__ */ new Date()).toISOString();
    const notes = [
      row.internal_notes,
      `[${now}] ${user.email}: ${input.reason}`
    ].filter(Boolean).join("\n");
    const statusEmail = await createEmailQueueRecord({
      secret: context.env.SESSION_SECRET,
      userId: row.user_id,
      template: "SUBMISSION_STATUS",
      recipientEmail: row.applicant_email,
      payload: submissionStatusEmail({
        siteUrl: context.env.SITE_URL,
        submitterName: row.applicant_name,
        submissionType: "opportunity",
        referenceCode: row.reference_code,
        status: input.status,
        publicResponse: input.reason
      })
    });
    const statements = [
      context.env.DB.prepare(
        "UPDATE opportunity_applications SET status=?,priority=?,assigned_reviewer_id=?,internal_notes=?,updated_at=? WHERE id=? AND status=?"
      ).bind(
        input.status,
        input.priority ?? row.priority,
        input.assignedReviewerId === void 0 ? row.assigned_reviewer_id : input.assignedReviewerId,
        notes,
        now,
        row.id,
        row.status
      ),
      context.env.DB.prepare(
        "INSERT INTO opportunity_application_events(id,application_id,actor_user_id,event_type,from_status,to_status,note,request_id) VALUES(?,?,?,?,?,?,?,?)"
      ).bind(
        crypto.randomUUID(),
        row.id,
        user.id,
        "STATUS_CHANGED",
        row.status,
        input.status,
        input.reason,
        context.get("requestId")
      ),
      insertEmailStatement(context.env.DB, statusEmail),
      createAuditStatement(context.env.DB, {
        requestId: context.get("requestId"),
        actorId: user.id,
        action: "OPPORTUNITY_APPLICATION_STATUS_CHANGED",
        entityType: "OPPORTUNITY_APPLICATION",
        entityId: row.id,
        reason: input.reason,
        metadata: {
          from: row.status,
          to: input.status,
          priority: input.priority ?? row.priority
        }
      })
    ];
    if (row.user_id)
      statements.push(
        userNotificationStatement(context.env.DB, {
          userId: row.user_id,
          type: "OPPORTUNITY_APPLICATION_STATUS",
          title: `Opportunity application ${input.status.toLowerCase().replaceAll("_", " ")}`,
          message: input.reason,
          actionUrl: `/track-submission?reference=${encodeURIComponent(row.reference_code)}`,
          entityType: "OPPORTUNITY_APPLICATION",
          entityId: row.id,
          dedupeKey: `opportunity-application:${row.id}:${input.status}`
        })
      );
    if (input.assignedReviewerId && input.assignedReviewerId !== row.assigned_reviewer_id)
      statements.push(
        userNotificationStatement(context.env.DB, {
          userId: input.assignedReviewerId,
          type: "APPLICATION_ASSIGNED",
          title: `Application ${row.reference_code} assigned to you`,
          message: "An opportunity application is ready for your review.",
          actionUrl: "/admin?section=applications",
          entityType: "OPPORTUNITY_APPLICATION",
          entityId: row.id,
          dedupeKey: `opportunity-application:${row.id}:assigned:${input.assignedReviewerId}`
        })
      );
    await context.env.DB.batch(statements);
    return context.json(
      success({ id: row.id, status: input.status }, context.get("requestId"))
    );
  }
);
var financeSchema = external_exports.object({
  transactionDate: external_exports.string().datetime(),
  transactionType: text(2, 100),
  category: text(2, 100),
  direction: external_exports.enum(["INCOME", "EXPENSE"]),
  amountMinor: external_exports.number().int().min(0).max(1e9),
  currency: text(3, 3).transform((value) => value.toUpperCase()),
  paymentMethod: optionalText3(100),
  externalReference: optionalText3(200),
  description: text(3, 5e3),
  relatedModule: external_exports.enum([
    "EVENT",
    "RESEARCH",
    "COURSE",
    "PROJECT",
    "MEMBERSHIP",
    "OPPORTUNITY",
    "PARTNERSHIP",
    "DONATION",
    "OTHER"
  ]),
  relatedEntityId: optionalText3(100),
  status: external_exports.enum(["PENDING", "SUBMITTED", "VERIFIED", "REJECTED", "CANCELLED"]).default("PENDING"),
  receiptObjectKey: optionalText3(512),
  notes: optionalText3(1e4)
});
communityRoutes.get(
  "/admin/finance/transactions",
  sessionMiddleware({ required: true }),
  requirePermission("finance.read"),
  async (context) => {
    const query = external_exports.object({
      status: external_exports.string().optional(),
      direction: external_exports.string().optional(),
      category: external_exports.string().optional(),
      module: external_exports.string().optional(),
      q: external_exports.string().optional(),
      from: external_exports.string().optional(),
      to: external_exports.string().optional()
    }).parse(context.req.query());
    const clauses = [];
    const values = [];
    for (const [column, value] of [
      ["status", query.status],
      ["direction", query.direction],
      ["category", query.category],
      ["related_module", query.module]
    ])
      if (value) {
        clauses.push(`${column}=?`);
        values.push(value);
      }
    if (query.from) {
      clauses.push("transaction_date>=?");
      values.push(query.from);
    }
    if (query.to) {
      clauses.push("transaction_date<=?");
      values.push(query.to);
    }
    if (query.q) {
      clauses.push(
        "(transaction_code LIKE ? OR external_reference LIKE ? OR description LIKE ?)"
      );
      values.push(`%${query.q}%`, `%${query.q}%`, `%${query.q}%`);
    }
    const result = await context.env.DB.prepare(
      `SELECT * FROM finance_transactions ${clauses.length ? `WHERE ${clauses.join(" AND ")}` : ""} ORDER BY transaction_date DESC LIMIT 1000`
    ).bind(...values).all();
    return context.json(
      success(result.results.map(rowToApi), context.get("requestId"))
    );
  }
);
communityRoutes.get(
  "/admin/finance/summary",
  sessionMiddleware({ required: true }),
  requirePermission("finance.read"),
  async (context) => {
    const row = await context.env.DB.prepare(
      `SELECT
       COALESCE(SUM(CASE WHEN status='VERIFIED' AND direction='INCOME' THEN amount_minor END),0) AS total_income,
       COALESCE(SUM(CASE WHEN status='VERIFIED' AND direction='EXPENSE' THEN amount_minor END),0) AS total_expenses,
       COALESCE(SUM(CASE WHEN status='VERIFIED' AND direction='INCOME' THEN amount_minor WHEN status='VERIFIED' AND direction='EXPENSE' THEN -amount_minor END),0) AS net_balance,
       COALESCE(SUM(CASE WHEN status IN ('PENDING','SUBMITTED') THEN 1 ELSE 0 END),0) AS pending_verification,
       COALESCE(SUM(CASE WHEN status='VERIFIED' AND transaction_date>=datetime('now','start of month') AND direction='INCOME' THEN amount_minor WHEN status='VERIFIED' AND transaction_date>=datetime('now','start of month') AND direction='EXPENSE' THEN -amount_minor END),0) AS this_month,
       COALESCE(SUM(CASE WHEN status='VERIFIED' AND transaction_date>=datetime('now','start of year') AND direction='INCOME' THEN amount_minor WHEN status='VERIFIED' AND transaction_date>=datetime('now','start of year') AND direction='EXPENSE' THEN -amount_minor END),0) AS this_year
       FROM finance_transactions`
    ).first();
    return context.json(success(rowToApi(row ?? {}), context.get("requestId")));
  }
);
communityRoutes.post(
  "/admin/finance/transactions",
  sessionMiddleware({ required: true }),
  csrfMiddleware(),
  requirePermission("finance.manage"),
  async (context) => {
    const { user } = requireAuth(context);
    const input = await parseJson(context, financeSchema);
    if (input.status === "VERIFIED" && !user.permissions.includes("finance.verify"))
      throw new AppError({
        code: "PERMISSION_DENIED",
        message: "Payment verification requires the finance.verify permission.",
        status: 403
      });
    const transactionId = crypto.randomUUID();
    const now = (/* @__PURE__ */ new Date()).toISOString();
    const code = `FIN-${(/* @__PURE__ */ new Date()).getUTCFullYear()}-${transactionId.replaceAll("-", "").slice(0, 10).toUpperCase()}`;
    const statements = [
      context.env.DB.prepare(
        `INSERT INTO finance_transactions(id,transaction_code,transaction_date,transaction_type,category,direction,amount_minor,currency,payment_method,external_reference,description,related_module,related_entity_id,submitted_by,verified_by,verified_at,status,receipt_object_key,notes,created_at,updated_at) VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`
      ).bind(
        transactionId,
        code,
        input.transactionDate,
        input.transactionType,
        input.category,
        input.direction,
        input.amountMinor,
        input.currency,
        input.paymentMethod,
        input.externalReference,
        input.description,
        input.relatedModule,
        input.relatedEntityId,
        user.id,
        input.status === "VERIFIED" ? user.id : null,
        input.status === "VERIFIED" ? now : null,
        input.status,
        input.receiptObjectKey,
        input.notes,
        now,
        now
      ),
      context.env.DB.prepare(
        "INSERT INTO finance_transaction_events(id,transaction_id,actor_user_id,event_type,to_status,note,request_id) VALUES(?,?,?,?,?,?,?)"
      ).bind(
        crypto.randomUUID(),
        transactionId,
        user.id,
        "TRANSACTION_CREATED",
        input.status,
        input.notes,
        context.get("requestId")
      ),
      createAuditStatement(context.env.DB, {
        requestId: context.get("requestId"),
        actorId: user.id,
        action: "FINANCE_TRANSACTION_CREATED",
        entityType: "FINANCE_TRANSACTION",
        entityId: transactionId,
        metadata: {
          amountMinor: input.amountMinor,
          currency: input.currency,
          direction: input.direction,
          status: input.status
        }
      })
    ];
    if (input.status === "SUBMITTED")
      statements.push(
        adminNotificationStatement(context.env.DB, {
          type: "PAYMENT_REVIEW",
          title: "Payment requires verification",
          message: `${code} is waiting for finance review.`,
          actionUrl: "/admin?section=finance",
          entityType: "FINANCE_TRANSACTION",
          entityId: transactionId,
          dedupeKey: `finance:${transactionId}:submitted`
        })
      );
    await context.env.DB.batch(statements);
    return context.json(
      success(
        { id: transactionId, transactionCode: code },
        context.get("requestId")
      ),
      201
    );
  }
);
communityRoutes.patch(
  "/admin/finance/transactions/:id/status",
  sessionMiddleware({ required: true }),
  csrfMiddleware(),
  requirePermission("finance.verify"),
  async (context) => {
    const { user } = requireAuth(context);
    const transactionId = id.parse(context.req.param("id"));
    const input = await parseJson(
      context,
      external_exports.object({
        status: external_exports.enum(["VERIFIED", "REJECTED", "CANCELLED"]),
        reason: text(3, 2e3)
      })
    );
    const current = await context.env.DB.prepare(
      "SELECT status FROM finance_transactions WHERE id=?"
    ).bind(transactionId).first();
    if (!current)
      throw new AppError({
        code: "NOT_FOUND",
        message: "Transaction not found.",
        status: 404
      });
    if (transactionId.startsWith("membership-payment:") || transactionId.startsWith("learning-payment:"))
      throw new AppError({
        code: "SOURCE_WORKFLOW_REQUIRED",
        message: "Review this payment in its membership or learning workflow so every linked record remains synchronized.",
        status: 409
      });
    if (["VERIFIED", "REJECTED", "CANCELLED"].includes(current.status))
      throw new AppError({
        code: "FINAL_STATE",
        message: "This transaction already has a final decision.",
        status: 409
      });
    const now = (/* @__PURE__ */ new Date()).toISOString();
    const statements = [
      context.env.DB.prepare(
        "UPDATE finance_transactions SET status=?,verified_by=?,verified_at=?,decision_reason=?,updated_at=? WHERE id=?"
      ).bind(input.status, user.id, now, input.reason, now, transactionId),
      context.env.DB.prepare(
        "INSERT INTO finance_transaction_events(id,transaction_id,actor_user_id,event_type,from_status,to_status,note,request_id) VALUES(?,?,?,?,?,?,?,?)"
      ).bind(
        crypto.randomUUID(),
        transactionId,
        user.id,
        "STATUS_CHANGED",
        current.status,
        input.status,
        input.reason,
        context.get("requestId")
      ),
      createAuditStatement(context.env.DB, {
        requestId: context.get("requestId"),
        actorId: user.id,
        action: "FINANCE_TRANSACTION_STATUS_CHANGED",
        entityType: "FINANCE_TRANSACTION",
        entityId: transactionId,
        reason: input.reason,
        metadata: { from: current.status, to: input.status }
      })
    ];
    const owner = await context.env.DB.prepare(
      "SELECT submitted_by FROM finance_transactions WHERE id=?"
    ).bind(transactionId).first();
    if (owner?.submitted_by)
      statements.push(
        userNotificationStatement(context.env.DB, {
          userId: owner.submitted_by,
          type: `PAYMENT_${input.status}`,
          title: `Payment ${input.status.toLowerCase()}`,
          message: input.reason,
          actionUrl: "/dashboard",
          entityType: "FINANCE_TRANSACTION",
          entityId: transactionId,
          dedupeKey: `finance:${transactionId}:${input.status}`
        })
      );
    await context.env.DB.batch(statements);
    return context.json(
      success(
        { id: transactionId, status: input.status },
        context.get("requestId")
      )
    );
  }
);
communityRoutes.get(
  "/notifications/inbox",
  sessionMiddleware({ required: true }),
  async (context) => {
    const { user } = requireAuth(context);
    const query = external_exports.object({
      q: external_exports.string().optional(),
      type: external_exports.string().optional(),
      unread: external_exports.enum(["true", "false"]).optional(),
      page: external_exports.coerce.number().int().min(1).default(1),
      pageSize: external_exports.coerce.number().int().min(1).max(100).default(20)
    }).parse(context.req.query());
    const clauses = ["user_id=?"];
    const values = [user.id];
    if (query.q) {
      clauses.push("(title LIKE ? OR message LIKE ?)");
      values.push(`%${query.q}%`, `%${query.q}%`);
    }
    if (query.type) {
      clauses.push("notification_type=?");
      values.push(query.type);
    }
    if (query.unread === "true") clauses.push("read_at IS NULL");
    if (query.unread === "false") clauses.push("read_at IS NOT NULL");
    const where = clauses.join(" AND ");
    const [rows, count, unread] = await Promise.all([
      context.env.DB.prepare(
        `SELECT id,notification_type AS type,title,message,action_url AS actionUrl,related_entity_type AS entityType,related_entity_id AS entityId,priority,read_at AS readAt,created_at AS createdAt FROM user_notifications WHERE ${where} ORDER BY created_at DESC LIMIT ? OFFSET ?`
      ).bind(...values, query.pageSize, (query.page - 1) * query.pageSize).all(),
      context.env.DB.prepare(
        `SELECT COUNT(*) AS count FROM user_notifications WHERE ${where}`
      ).bind(...values).first(),
      context.env.DB.prepare(
        "SELECT COUNT(*) AS count FROM user_notifications WHERE user_id=? AND read_at IS NULL"
      ).bind(user.id).first()
    ]);
    return context.json(
      success(
        {
          items: rows.results,
          total: Number(count?.count ?? 0),
          unreadCount: Number(unread?.count ?? 0),
          page: query.page,
          pageSize: query.pageSize
        },
        context.get("requestId")
      )
    );
  }
);
communityRoutes.post(
  "/notifications/mark-all-read",
  sessionMiddleware({ required: true }),
  csrfMiddleware(),
  async (context) => {
    const { user } = requireAuth(context);
    const now = (/* @__PURE__ */ new Date()).toISOString();
    const result = await context.env.DB.prepare(
      "UPDATE user_notifications SET read_at=? WHERE user_id=? AND read_at IS NULL"
    ).bind(now, user.id).run();
    return context.json(
      success({ updated: result.meta.changes }, context.get("requestId"))
    );
  }
);
communityRoutes.get(
  "/admin/applications",
  sessionMiddleware({ required: true }),
  requireAnyPermission([
    "submissions.read",
    "membership.read",
    "volunteer.read",
    "event.read",
    "course.read",
    "opportunity.read"
  ]),
  async (context) => {
    const query = external_exports.object({
      type: external_exports.string().optional(),
      status: external_exports.string().optional(),
      search: external_exports.string().optional(),
      limit: external_exports.coerce.number().int().min(1).max(100).default(20),
      offset: external_exports.coerce.number().int().min(0).default(0)
    }).parse(context.req.query());
    const results = await Promise.all([
      context.env.DB.prepare(
        "SELECT 'PLATFORM' AS source,id,reference_code,submission_type AS type,title,summary,status,submitter_name AS applicant_name,submitter_email AS applicant_email,submitter_phone AS applicant_phone,institution,department,payload_json,priority,assigned_reviewer_id,created_at,updated_at FROM platform_submissions"
      ).all(),
      context.env.DB.prepare(
        "SELECT 'MEMBERSHIP' AS source,a.id,'MEM-'||upper(substr(replace(a.id,'-',''),1,10)) AS reference_code,'MEMBERSHIP' AS type,COALESCE(t.name,'Membership application') AS title,COALESCE(a.motivation,'Membership application') AS summary,a.status,COALESCE(a.full_name,u.display_name) AS applicant_name,COALESCE(a.email_snapshot,u.primary_email) AS applicant_email,a.phone AS applicant_phone,NULL AS institution,a.department,json_object('studentId',a.student_id,'batch',a.batch,'academicSession',a.academic_session,'skills',json(a.skills_json),'interests',json(a.interests_json),'experience',a.experience,'motivation',a.motivation) AS payload_json,'NORMAL' AS priority,a.reviewed_by AS assigned_reviewer_id,a.created_at,a.updated_at FROM membership_applications a JOIN users u ON u.id=a.user_id LEFT JOIN membership_types t ON t.id=a.membership_type_id WHERE a.status!='DRAFT'"
      ).all(),
      context.env.DB.prepare(
        "SELECT 'VOLUNTEER' AS source,a.id,'VOL-'||upper(substr(replace(a.id,'-',''),1,10)) AS reference_code,'VOLUNTEER' AS type,COALESCE(p.name,'Volunteer application') AS title,COALESCE(a.motivation,'Volunteer application') AS summary,a.status,COALESCE(a.full_name,u.display_name) AS applicant_name,COALESCE(a.email_snapshot,u.primary_email) AS applicant_email,a.phone AS applicant_phone,a.organization AS institution,a.department,json_object('batch',a.batch,'skills',json(a.skills_json),'interests',json(a.interests_json),'experience',a.experience,'motivation',a.motivation) AS payload_json,'NORMAL' AS priority,a.reviewed_by AS assigned_reviewer_id,a.created_at,a.updated_at FROM volunteer_applications a JOIN users u ON u.id=a.user_id LEFT JOIN volunteer_programs p ON p.id=a.volunteer_program_id WHERE a.status!='DRAFT'"
      ).all(),
      context.env.DB.prepare(
        "SELECT 'OPPORTUNITY' AS source,a.id,a.reference_code,'OPPORTUNITY' AS type,o.title,a.cover_note AS summary,a.status,a.applicant_name,a.applicant_email,a.applicant_phone,a.organization AS institution,NULL AS department,a.payload_json,a.priority,a.assigned_reviewer_id,a.submitted_at AS created_at,a.updated_at FROM opportunity_applications a JOIN opportunities o ON o.id=a.opportunity_id"
      ).all(),
      context.env.DB.prepare(
        "SELECT 'EVENT' AS source,r.id,'EVT-'||upper(substr(replace(r.id,'-',''),1,10)) AS reference_code,'EVENT_REGISTRATION' AS type,json_extract(e.data_json,'$.title') AS title,'Event registration' AS summary,r.registration_status AS status,r.participant_name AS applicant_name,r.email AS applicant_email,r.phone AS applicant_phone,NULL AS institution,NULL AS department,json_object('eventId',r.event_id,'paymentStatus',r.payment_status,'attendanceStatus',r.attendance_status,'feeMinor',r.fee_minor,'currency',r.currency) AS payload_json,'NORMAL' AS priority,r.reviewed_by AS assigned_reviewer_id,r.registered_at AS created_at,COALESCE(r.reviewed_at,r.registered_at) AS updated_at FROM event_registrations r JOIN website_content_items e ON e.id=r.event_id"
      ).all(),
      context.env.DB.prepare(
        "SELECT 'COURSE' AS source,r.id,'CRS-'||upper(substr(replace(r.id,'-',''),1,10)) AS reference_code,'COURSE_REGISTRATION' AS type,c.title,'Course enrollment' AS summary,r.enrollment_status AS status,u.display_name AS applicant_name,u.primary_email AS applicant_email,NULL AS applicant_phone,NULL AS institution,NULL AS department,json_object('courseId',r.course_id,'paymentStatus',r.payment_status,'completedLessons',(SELECT COUNT(*) FROM course_progress p WHERE p.enrollment_id=r.id),'priceMinor',r.price_minor,'currency',r.currency) AS payload_json,'NORMAL' AS priority,NULL AS assigned_reviewer_id,r.enrolled_at AS created_at,r.updated_at FROM course_enrollments r JOIN learning_courses c ON c.id=r.course_id JOIN users u ON u.id=r.user_id"
      ).all()
    ]);
    const normalized = results.flatMap((result) => result.results).filter((row) => {
      if (query.type && row.type !== query.type) return false;
      if (query.status && row.status !== query.status) return false;
      if (query.search && !String(
        `${row.reference_code} ${row.title} ${row.applicant_name} ${row.applicant_email}`
      ).toLowerCase().includes(query.search.toLowerCase()))
        return false;
      return true;
    }).sort(
      (left, right) => String(right.created_at).localeCompare(String(left.created_at))
    );
    const items = normalized.slice(query.offset, query.offset + query.limit).map((row) => {
      let payload = {};
      try {
        payload = JSON.parse(String(row.payload_json || "{}"));
      } catch {
      }
      return {
        id: row.id,
        source: row.source,
        referenceCode: row.reference_code,
        type: row.type,
        title: row.title,
        summary: row.summary,
        status: row.status,
        priority: row.priority,
        assignedReviewerId: row.assigned_reviewer_id,
        submitter: {
          name: row.applicant_name,
          email: row.applicant_email,
          phone: row.applicant_phone,
          institution: row.institution,
          department: row.department
        },
        payload,
        publicResponse: null,
        internalNotes: null,
        createdAt: row.created_at,
        updatedAt: row.updated_at
      };
    });
    return context.json(
      success({ items, total: normalized.length }, context.get("requestId"))
    );
  }
);
communityRoutes.post(
  "/admin/partnership-applications/:id/convert",
  sessionMiddleware({ required: true }),
  csrfMiddleware(),
  requirePermission("partner.manage"),
  async (context) => {
    const { user } = requireAuth(context);
    const submissionId = id.parse(context.req.param("id"));
    const submission = await context.env.DB.prepare(
      "SELECT id,title,summary,payload_json,status FROM platform_submissions WHERE id=? AND submission_type='COLLABORATION'"
    ).bind(submissionId).first();
    if (!submission)
      throw new AppError({
        code: "NOT_FOUND",
        message: "Partnership application not found.",
        status: 404
      });
    if (!["APPROVED", "PUBLISHED"].includes(submission.status))
      throw new AppError({
        code: "APPROVAL_REQUIRED",
        message: "Approve the partnership application before conversion.",
        status: 409
      });
    const existing = await context.env.DB.prepare(
      "SELECT id FROM partner_profiles WHERE source_submission_id=?"
    ).bind(submissionId).first();
    if (existing)
      return context.json(
        success(
          { id: existing.id, alreadyConverted: true },
          context.get("requestId")
        )
      );
    let payload = {};
    try {
      payload = JSON.parse(submission.payload_json);
    } catch {
    }
    const organization = String(
      payload.organization || submission.title || "Partner"
    ).trim();
    const recordId = crypto.randomUUID();
    const now = (/* @__PURE__ */ new Date()).toISOString();
    const slug2 = `${organization.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 130)}-${recordId.slice(0, 8)}`;
    const data = {
      title: organization,
      name: organization,
      slug: slug2,
      description: submission.summary,
      full_description: String(payload.description || submission.summary),
      category: String(payload.collaborationType || "Other"),
      country: String(payload.country || "Bangladesh"),
      city: payload.city || null,
      website: payload.organizationWebsite || null,
      contact_email: payload.submitter?.email || null,
      contact_person: payload.submitter?.name || null,
      partnership_type: payload.collaborationType || null,
      active: true,
      featured: false
    };
    await context.env.DB.batch([
      context.env.DB.prepare(
        "INSERT INTO website_content_items(id,collection_key,data_json,status,sort_order,created_by,updated_by,created_at,updated_at) VALUES(?,'partners',?,'DRAFT',0,?,?,?,?)"
      ).bind(recordId, JSON.stringify(data), user.id, user.id, now, now),
      context.env.DB.prepare(
        `INSERT INTO partner_profiles(id,source_submission_id,slug,organization_name,short_description,full_description,category,country,city,website_url,contact_email,contact_person,partnership_type,active,featured,sort_order,workflow_status,created_by,updated_by,created_at,updated_at) VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,1,0,0,'DRAFT',?,?,?,?)`
      ).bind(
        recordId,
        submissionId,
        slug2,
        organization,
        submission.summary,
        String(payload.description || submission.summary),
        String(payload.collaborationType || "Other"),
        String(payload.country || "Bangladesh"),
        payload.city || null,
        payload.organizationWebsite || null,
        payload.submitter?.email || null,
        payload.submitter?.name || null,
        payload.collaborationType || null,
        user.id,
        user.id,
        now,
        now
      ),
      createAuditStatement(context.env.DB, {
        requestId: context.get("requestId"),
        actorId: user.id,
        action: "PARTNERSHIP_APPLICATION_CONVERTED",
        entityType: "PARTNER",
        entityId: recordId,
        metadata: { submissionId }
      })
    ]);
    return context.json(
      success({ id: recordId, status: "DRAFT" }, context.get("requestId")),
      201
    );
  }
);

// worker/routes/sitemap.ts
var sitemapRoutes = new Hono2();
var staticPaths = [
  "/",
  "/about",
  "/projects",
  "/projects/submit",
  "/events",
  "/partners",
  "/opportunities",
  "/alumni",
  "/alumni/apply",
  "/members",
  "/team",
  "/gallery",
  "/join",
  "/contact",
  "/collaborate",
  "/blog",
  "/research",
  "/research/submit",
  "/courses",
  "/verify"
];
function xml(value) {
  return value.replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll('"', "&quot;").replaceAll("'", "&apos;");
}
__name(xml, "xml");
sitemapRoutes.get("/sitemap.xml", async (context) => {
  const queries = await Promise.all([
    context.env.DB.prepare("SELECT '/events/'||slug AS path,updated_at FROM managed_events WHERE workflow_status='PUBLISHED'").all(),
    context.env.DB.prepare("SELECT '/people/'||slug AS path,updated_at FROM people_profiles WHERE workflow_status='PUBLISHED'").all(),
    context.env.DB.prepare("SELECT '/partners/'||slug AS path,updated_at FROM partner_profiles WHERE workflow_status='PUBLISHED' AND active=1").all(),
    context.env.DB.prepare("SELECT '/opportunities/'||slug AS path,updated_at FROM opportunities WHERE workflow_status='PUBLISHED'").all(),
    context.env.DB.prepare("SELECT '/projects/'||json_extract(data_json,'$.slug') AS path,updated_at FROM website_content_items WHERE collection_key='projects' AND status='PUBLISHED' AND json_extract(data_json,'$.slug') IS NOT NULL").all(),
    context.env.DB.prepare("SELECT '/research/'||slug AS path,updated_at FROM research_works WHERE workflow_status='PUBLISHED'").all(),
    context.env.DB.prepare("SELECT '/courses/'||id AS path,updated_at FROM learning_courses WHERE status='PUBLISHED'").all(),
    context.env.DB.prepare("SELECT '/blog/'||json_extract(data_json,'$.slug') AS path,updated_at FROM website_content_items WHERE collection_key='blog_posts' AND status='PUBLISHED' AND json_extract(data_json,'$.slug') IS NOT NULL").all()
  ]);
  const origin = context.env.SITE_URL.replace(/\/$/u, "");
  const urls = [
    ...staticPaths.map((path) => ({ path, updated_at: null })),
    ...queries.flatMap((result) => result.results)
  ];
  const body = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls.map((entry) => `  <url><loc>${xml(`${origin}${entry.path}`)}</loc>${entry.updated_at ? `<lastmod>${xml(entry.updated_at.slice(0, 10))}</lastmod>` : ""}</url>`).join("\n")}
</urlset>`;
  return context.body(body, 200, { "Content-Type": "application/xml; charset=utf-8", "Cache-Control": "public, max-age=300, s-maxage=300" });
});

// worker/routes/blogs.ts
var blogRoutes = new Hono2();
var BLOG_COLLECTION = "blog_posts";
var BLOG_SUBMISSION_TYPE = "blog_posts";
var blogId = external_exports.string().trim().min(1).max(100);
var slug = external_exports.string().trim().min(3).max(180).regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/u);
var optionalImage = external_exports.union([
  external_exports.string().trim().url().max(1e3),
  external_exports.string().trim().regex(/^\/api\/v1\/media\/files\/[A-Za-z0-9_./-]+$/u).max(1e3),
  external_exports.literal("")
]).optional().nullable();
var blogSchema = external_exports.object({
  title: external_exports.string().trim().min(1, "Enter a title before saving.").max(240),
  slug,
  excerpt: external_exports.string().trim().max(600).default(""),
  featuredImageUrl: optionalImage,
  featuredImageAlt: external_exports.string().trim().max(300).optional().nullable(),
  contentHtml: external_exports.string().trim().max(2e5).default(""),
  authorName: external_exports.string().trim().max(160).default(""),
  category: external_exports.string().trim().max(100).default(""),
  tags: external_exports.array(external_exports.string().trim().min(1).max(60)).max(20).default([]),
  publicationDate: external_exports.string().datetime().optional().nullable(),
  status: external_exports.enum(["DRAFT", "PUBLISHED"]),
  seoTitle: external_exports.string().trim().max(70).optional().nullable(),
  seoDescription: external_exports.string().trim().max(180).optional().nullable(),
  seoKeywords: external_exports.array(external_exports.string().trim().min(1).max(80)).max(20).default([]),
  socialImageUrl: optionalImage
}).strict();
var authorSubmissionSchema = external_exports.object({
  title: external_exports.string().trim().min(3).max(240),
  content: external_exports.string().trim().min(20).max(2e5),
  category: external_exports.string().trim().max(100).optional().nullable()
}).strict();
var reviewSchema = external_exports.object({
  status: external_exports.enum([
    "IN_REVIEW",
    "REVISION_REQUESTED",
    "APPROVED",
    "REJECTED"
  ]),
  reviewerResponse: external_exports.string().trim().max(2e3).optional().nullable(),
  requiredAction: external_exports.string().trim().max(2e3).optional().nullable()
}).strict();
var managedImageTypes3 = /* @__PURE__ */ new Set(["image/jpeg", "image/png", "image/webp"]);
function meaningfulText(value) {
  return value.replace(/<[^>]*>/gu, " ").replace(/&(?:nbsp|#160|#xA0);/giu, " ").replace(/\s+/gu, " ").trim();
}
__name(meaningfulText, "meaningfulText");
function publishErrors(input, contentHtml) {
  const details = {};
  if (!input.excerpt.trim())
    details.excerpt = ["Excerpt is required before publishing."];
  if (!meaningfulText(contentHtml))
    details.contentHtml = ["Article content is required before publishing."];
  if (!input.featuredImageUrl)
    details.featuredImageUrl = [
      "Hero image is required before publishing."
    ];
  if (!input.authorName.trim())
    details.authorName = ["Author is required before publishing."];
  if (!input.category.trim())
    details.category = ["Category is required before publishing."];
  if (!input.publicationDate)
    details.publicationDate = [
      "Publication date is required before publishing."
    ];
  return details;
}
__name(publishErrors, "publishErrors");
function throwValidation(details) {
  if (Object.keys(details).length === 0) return;
  throw new AppError({
    code: "VALIDATION_ERROR",
    message: "Some blog fields need attention.",
    status: 422,
    details
  });
}
__name(throwValidation, "throwValidation");
function managedMediaKey(value) {
  if (!value) return null;
  try {
    const pathname = new URL(value, "https://ruetiotclub.org").pathname;
    const prefix = "/api/v1/media/files/";
    if (!pathname.startsWith(prefix)) return null;
    return decodeURIComponent(pathname.slice(prefix.length));
  } catch {
    return null;
  }
}
__name(managedMediaKey, "managedMediaKey");
async function verifiedHeroImage(env, value) {
  if (!value) return null;
  const key = managedMediaKey(value);
  if (!key) return value;
  const [media, object] = await Promise.all([
    env.DB.prepare(
      "SELECT content_type,byte_size FROM website_media_objects WHERE object_key=? AND archived_at IS NULL"
    ).bind(key).first(),
    env.STORAGE.head(key)
  ]);
  if (!media || !object || !managedImageTypes3.has(media.content_type) || media.byte_size > 5 * 1024 * 1024)
    throwValidation({
      featuredImageUrl: [
        "The selected hero image is unavailable. Choose an existing JPG, PNG, or WebP image up to 5 MB."
      ]
    });
  return `/api/v1/media/files/${key}`;
}
__name(verifiedHeroImage, "verifiedHeroImage");
function cleanHtml(value) {
  return sanitizeBlogHtml(value);
}
__name(cleanHtml, "cleanHtml");
function plainTextToHtml(value) {
  const escaped = value.replace(/&/gu, "&amp;").replace(/</gu, "&lt;").replace(/>/gu, "&gt;").replace(/"/gu, "&quot;").replace(/'/gu, "&#039;");
  return escaped.split(/\n{2,}/u).map((paragraph) => `<p>${paragraph.replace(/\n/gu, "<br>")}</p>`).join("");
}
__name(plainTextToHtml, "plainTextToHtml");
function slugifyTitle(value) {
  return value.toLowerCase().normalize("NFKD").replace(/[\u0300-\u036f]/gu, "").replace(/[^a-z0-9]+/gu, "-").replace(/^-+|-+$/gu, "").slice(0, 150) || "community-article";
}
__name(slugifyTitle, "slugifyTitle");
function submissionSelect() {
  return `SELECT s.id,s.submitted_by,u.display_name AS submitter_name,u.primary_email AS submitter_email,
    s.data_json,w.workflow_status,w.reviewer_response,w.required_action,w.canonical_blog_id,
    w.submitted_at,w.reviewed_at,w.published_at,w.updated_at
    FROM website_submissions s
    JOIN blog_submission_workflows w ON w.submission_id=s.id
    JOIN users u ON u.id=s.submitted_by`;
}
__name(submissionSelect, "submissionSelect");
function apiBlogSubmission(row) {
  const data = JSON.parse(row.data_json);
  return {
    id: row.id,
    title: String(data.title ?? "Untitled"),
    content: String(data.content ?? ""),
    category: data.category ? String(data.category) : null,
    status: row.workflow_status,
    reviewerResponse: row.reviewer_response,
    requiredAction: row.required_action,
    canonicalBlogId: row.canonical_blog_id,
    submitter: {
      id: row.submitted_by,
      name: row.submitter_name,
      email: row.submitter_email
    },
    submittedAt: row.submitted_at,
    reviewedAt: row.reviewed_at,
    publishedAt: row.published_at,
    updatedAt: row.updated_at
  };
}
__name(apiBlogSubmission, "apiBlogSubmission");
async function uniqueSubmissionSlug(db, title, id2) {
  const base = slugifyTitle(title);
  for (let attempt = 0; attempt < 20; attempt += 1) {
    const candidate = attempt === 0 ? base : `${base}-${attempt + 1}`;
    const existing = await db.prepare(
      "SELECT id FROM website_content_items WHERE collection_key=? AND status!='ARCHIVED' AND json_extract(data_json,'$.slug')=? AND id!=?"
    ).bind(BLOG_COLLECTION, candidate, id2).first("id");
    if (!existing) return candidate;
  }
  return `${base}-${id2.slice(0, 8)}`;
}
__name(uniqueSubmissionSlug, "uniqueSubmissionSlug");
function blogNotification(db, options) {
  return db.prepare(
    `INSERT OR IGNORE INTO user_notifications
      (id,user_id,notification_type,title,message,action_url,related_entity_type,related_entity_id,priority,dedupe_key)
      VALUES(?,?,?,?,?,?,'BLOG_SUBMISSION',?,'NORMAL',?)`
  ).bind(
    crypto.randomUUID(),
    options.userId,
    options.type,
    options.title,
    options.message,
    options.actionUrl,
    options.submissionId,
    options.dedupeKey
  );
}
__name(blogNotification, "blogNotification");
async function workflowPublicationStatements(db, options) {
  const workflow2 = await db.prepare(
    `SELECT w.submission_id,s.submitted_by
       FROM blog_submission_workflows w
       JOIN website_submissions s ON s.id=w.submission_id
       WHERE w.canonical_blog_id=?`
  ).bind(options.canonicalBlogId).first();
  if (!workflow2) return [];
  const status = options.published ? "PUBLISHED" : "APPROVED";
  return [
    db.prepare(
      `UPDATE blog_submission_workflows SET workflow_status=?,published_at=?,updated_at=?
         WHERE submission_id=?`
    ).bind(
      status,
      options.published ? options.now : null,
      options.now,
      workflow2.submission_id
    ),
    db.prepare(
      "UPDATE website_submissions SET status='APPROVED',updated_at=? WHERE id=?"
    ).bind(options.now, workflow2.submission_id),
    blogNotification(db, {
      userId: workflow2.submitted_by,
      submissionId: workflow2.submission_id,
      type: options.published ? "BLOG_PUBLISHED" : "BLOG_UNPUBLISHED",
      title: options.published ? "Your blog is published" : "Your blog returned to draft",
      message: options.published ? "Your reviewed article is now available on the public blog." : "The canonical article is no longer public and remains approved.",
      actionUrl: options.published ? `/blog/${options.slug}` : "/blog/write",
      dedupeKey: `blog-submission:${workflow2.submission_id}:${status}:${options.now}`
    })
  ];
}
__name(workflowPublicationStatements, "workflowPublicationStatements");
async function reviewerNotifications(db, submissionId, title) {
  const reviewers = await db.prepare(
    `SELECT DISTINCT u.id FROM users u
       JOIN user_roles ur ON ur.user_id=u.id
       JOIN role_permissions rp ON rp.role_id=ur.role_id
       WHERE rp.permission_id='permission:content.manage'
         AND ur.revoked_at IS NULL
         AND (ur.expires_at IS NULL OR ur.expires_at>strftime('%Y-%m-%dT%H:%M:%fZ','now'))
         AND u.status='EMAIL_VERIFIED' AND u.deleted_at IS NULL`
  ).all();
  return reviewers.results.map(
    (reviewer) => blogNotification(db, {
      userId: reviewer.id,
      submissionId,
      type: "BLOG_SUBMISSION_RECEIVED",
      title: "Blog submission received",
      message: title,
      actionUrl: `/admin?section=blogs&submission=${encodeURIComponent(submissionId)}`,
      dedupeKey: `blog-submission:${submissionId}:received:${reviewer.id}`
    })
  );
}
__name(reviewerNotifications, "reviewerNotifications");
function apiBlog(row) {
  const data = JSON.parse(row.data_json);
  const legacyContent = typeof data.content === "string" ? data.content : "";
  const contentHtml = cleanHtml(
    typeof data.contentHtml === "string" ? data.contentHtml : legacyContent
  );
  return {
    id: row.id,
    title: String(data.title ?? "Untitled"),
    slug: String(data.slug ?? row.id),
    excerpt: String(
      data.excerpt ?? legacyContent.replace(/<[^>]+>/gu, " ").replace(/\s+/gu, " ").trim().slice(0, 280)
    ),
    featuredImageUrl: data.featuredImageUrl ?? data.cover_image ?? null,
    featuredImageAlt: data.featuredImageAlt ?? data.title ?? "",
    contentHtml,
    authorName: String(data.authorName ?? data.author_name ?? "RUET IoT Club"),
    authorId: data.authorId ?? data.author_id ?? null,
    category: String(data.category ?? "General"),
    tags: Array.isArray(data.tags) ? data.tags : [],
    publicationDate: data.publicationDate ?? (row.status === "PUBLISHED" ? row.published_at ?? row.created_at : null),
    status: row.status,
    seoTitle: data.seoTitle ?? null,
    seoDescription: data.seoDescription ?? null,
    seoKeywords: Array.isArray(data.seoKeywords) ? data.seoKeywords : [],
    socialImageUrl: data.socialImageUrl ?? null,
    views: Number(row.view_count ?? 0),
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    publishedAt: row.published_at
  };
}
__name(apiBlog, "apiBlog");
function rowSelect() {
  return `SELECT i.id,i.data_json,i.status,i.sort_order,i.created_at,i.updated_at,i.published_at,i.archived_at,COALESCE(m.view_count,0) AS view_count
    FROM website_content_items i LEFT JOIN blog_post_metrics m ON m.blog_id=i.id`;
}
__name(rowSelect, "rowSelect");
async function ensureUniqueSlug(db, value, exceptId) {
  const duplicate = await db.prepare(
    "SELECT id FROM website_content_items WHERE collection_key=? AND status!='ARCHIVED' AND json_extract(data_json,'$.slug')=? AND id!=?"
  ).bind(BLOG_COLLECTION, value, exceptId).first("id");
  if (duplicate)
    throw new AppError({
      code: "BLOG_SLUG_EXISTS",
      message: "This slug is already used by another blog.",
      status: 409,
      details: { slug: ["This slug is already in use."] }
    });
}
__name(ensureUniqueSlug, "ensureUniqueSlug");
blogRoutes.post(
  "/blog-submissions",
  sessionMiddleware({ required: true }),
  csrfMiddleware(),
  async (context) => {
    const { user } = requireAuth(context);
    const input = await parseJson(context, authorSubmissionSchema);
    const id2 = crypto.randomUUID();
    const now = (/* @__PURE__ */ new Date()).toISOString();
    const notifications = await reviewerNotifications(
      context.env.DB,
      id2,
      input.title
    );
    await context.env.DB.batch([
      context.env.DB.prepare(
        `INSERT INTO website_submissions(id,submission_type,submitted_by,data_json,status,created_at,updated_at)
         VALUES(?,?,?,?,'SUBMITTED',?,?)`
      ).bind(
        id2,
        BLOG_SUBMISSION_TYPE,
        user.id,
        JSON.stringify({
          title: input.title,
          content: input.content,
          category: input.category || null,
          author_id: user.id,
          published: false
        }),
        now,
        now
      ),
      context.env.DB.prepare(
        `INSERT INTO blog_submission_workflows(submission_id,workflow_status,submitted_at,updated_at)
         VALUES(?,'SUBMITTED',?,?)`
      ).bind(id2, now, now),
      createAuditStatement(context.env.DB, {
        requestId: context.get("requestId"),
        actorId: user.id,
        action: "BLOG_SUBMITTED",
        entityType: "BLOG_SUBMISSION",
        entityId: id2,
        metadata: { title: input.title }
      }),
      ...notifications
    ]);
    return context.json(
      success({ id: id2, status: "SUBMITTED" }, context.get("requestId")),
      201
    );
  }
);
blogRoutes.get(
  "/blog-submissions/mine",
  sessionMiddleware({ required: true }),
  async (context) => {
    const { user } = requireAuth(context);
    const rows = await context.env.DB.prepare(
      `${submissionSelect()} WHERE s.submission_type=? AND s.submitted_by=? ORDER BY w.updated_at DESC`
    ).bind(BLOG_SUBMISSION_TYPE, user.id).all();
    return context.json(
      success({ items: rows.results.map(apiBlogSubmission) }, context.get("requestId"))
    );
  }
);
blogRoutes.put(
  "/blog-submissions/:id",
  sessionMiddleware({ required: true }),
  csrfMiddleware(),
  async (context) => {
    const { user } = requireAuth(context);
    const id2 = blogId.parse(context.req.param("id"));
    const input = await parseJson(context, authorSubmissionSchema);
    const row = await context.env.DB.prepare(
      `${submissionSelect()} WHERE s.id=? AND s.submission_type=?`
    ).bind(id2, BLOG_SUBMISSION_TYPE).first();
    if (!row)
      throw new AppError({
        code: "BLOG_SUBMISSION_NOT_FOUND",
        message: "Blog submission not found.",
        status: 404
      });
    if (row.submitted_by !== user.id)
      throw new AppError({
        code: "BLOG_SUBMISSION_FORBIDDEN",
        message: "You cannot edit another author's submission.",
        status: 403
      });
    if (!["SUBMITTED", "REVISION_REQUESTED"].includes(row.workflow_status))
      throw new AppError({
        code: "BLOG_SUBMISSION_LOCKED",
        message: "This submission cannot be edited in its current state.",
        status: 409
      });
    const now = (/* @__PURE__ */ new Date()).toISOString();
    await context.env.DB.batch([
      context.env.DB.prepare(
        "UPDATE website_submissions SET data_json=?,status='SUBMITTED',updated_at=? WHERE id=? AND submitted_by=?"
      ).bind(
        JSON.stringify({
          title: input.title,
          content: input.content,
          category: input.category || null,
          author_id: user.id,
          published: false
        }),
        now,
        id2,
        user.id
      ),
      context.env.DB.prepare(
        `UPDATE blog_submission_workflows
         SET workflow_status='SUBMITTED',reviewer_response=NULL,required_action=NULL,
             reviewed_by=NULL,reviewed_at=NULL,updated_at=? WHERE submission_id=?`
      ).bind(now, id2),
      createAuditStatement(context.env.DB, {
        requestId: context.get("requestId"),
        actorId: user.id,
        action: "BLOG_RESUBMITTED",
        entityType: "BLOG_SUBMISSION",
        entityId: id2
      })
    ]);
    return context.json(
      success({ id: id2, status: "SUBMITTED" }, context.get("requestId"))
    );
  }
);
blogRoutes.get(
  "/admin/blog-submissions",
  sessionMiddleware({ required: true }),
  requirePermission("content.read"),
  async (context) => {
    const query = external_exports.object({
      status: external_exports.enum([
        "SUBMITTED",
        "IN_REVIEW",
        "REVISION_REQUESTED",
        "APPROVED",
        "PUBLISHED",
        "REJECTED"
      ]).optional()
    }).parse(context.req.query());
    const rows = query.status ? await context.env.DB.prepare(
      `${submissionSelect()} WHERE s.submission_type=? AND w.workflow_status=? ORDER BY w.updated_at DESC`
    ).bind(BLOG_SUBMISSION_TYPE, query.status).all() : await context.env.DB.prepare(
      `${submissionSelect()} WHERE s.submission_type=? ORDER BY CASE w.workflow_status WHEN 'SUBMITTED' THEN 0 WHEN 'IN_REVIEW' THEN 1 WHEN 'REVISION_REQUESTED' THEN 2 ELSE 3 END,w.updated_at DESC`
    ).bind(BLOG_SUBMISSION_TYPE).all();
    return context.json(
      success({ items: rows.results.map(apiBlogSubmission) }, context.get("requestId"))
    );
  }
);
blogRoutes.patch(
  "/admin/blog-submissions/:id/status",
  sessionMiddleware({ required: true }),
  csrfMiddleware(),
  requirePermission("content.manage"),
  async (context) => {
    const { user } = requireAuth(context);
    const id2 = blogId.parse(context.req.param("id"));
    const input = await parseJson(context, reviewSchema);
    if (["REVISION_REQUESTED", "REJECTED"].includes(
      input.status
    ) && !input.reviewerResponse)
      throwValidation({
        reviewerResponse: ["Explain the review decision to the author."]
      });
    if (input.status === "REVISION_REQUESTED" && !input.requiredAction)
      throwValidation({
        requiredAction: ["Describe what the author needs to revise."]
      });
    const row = await context.env.DB.prepare(
      `${submissionSelect()} WHERE s.id=? AND s.submission_type=?`
    ).bind(id2, BLOG_SUBMISSION_TYPE).first();
    if (!row)
      throw new AppError({
        code: "BLOG_SUBMISSION_NOT_FOUND",
        message: "Blog submission not found.",
        status: 404
      });
    if (row.workflow_status === "PUBLISHED")
      throw new AppError({
        code: "BLOG_SUBMISSION_LOCKED",
        message: "Published submissions are managed through the canonical blog.",
        status: 409
      });
    const now = (/* @__PURE__ */ new Date()).toISOString();
    let canonicalBlogId = row.canonical_blog_id;
    const statements = [];
    if (input.status === "APPROVED" && !canonicalBlogId) {
      const data = JSON.parse(row.data_json);
      canonicalBlogId = id2;
      const title = String(data.title ?? "Community article");
      const slugValue = await uniqueSubmissionSlug(context.env.DB, title, id2);
      const content = String(data.content ?? "");
      const canonicalData2 = {
        title,
        slug: slugValue,
        excerpt: content.replace(/\s+/gu, " ").trim().slice(0, 280),
        featuredImageUrl: null,
        featuredImageAlt: title,
        contentHtml: cleanHtml(plainTextToHtml(content)),
        authorName: row.submitter_name,
        authorId: row.submitted_by,
        category: String(data.category ?? "General"),
        tags: [],
        publicationDate: null,
        status: "DRAFT",
        seoTitle: null,
        seoDescription: null,
        seoKeywords: [],
        socialImageUrl: null,
        published: false,
        sourceSubmissionId: id2
      };
      statements.push(
        context.env.DB.prepare(
          `INSERT OR IGNORE INTO website_content_items
           (id,collection_key,data_json,status,sort_order,created_by,updated_by,created_at,updated_at)
           VALUES(?,?,?,'DRAFT',0,?,?,?,?)`
        ).bind(
          canonicalBlogId,
          BLOG_COLLECTION,
          JSON.stringify(canonicalData2),
          user.id,
          user.id,
          now,
          now
        ),
        context.env.DB.prepare(
          "INSERT OR IGNORE INTO blog_post_metrics(blog_id) VALUES(?)"
        ).bind(canonicalBlogId)
      );
    }
    const legacyStatus = input.status === "IN_REVIEW" ? "UNDER_REVIEW" : input.status === "REVISION_REQUESTED" ? "UNDER_REVIEW" : input.status;
    statements.push(
      context.env.DB.prepare(
        "UPDATE website_submissions SET status=?,updated_at=? WHERE id=?"
      ).bind(legacyStatus, now, id2),
      context.env.DB.prepare(
        `UPDATE blog_submission_workflows SET workflow_status=?,canonical_blog_id=?,
         reviewer_response=?,required_action=?,reviewed_by=?,reviewed_at=?,updated_at=?
         WHERE submission_id=?`
      ).bind(
        input.status,
        canonicalBlogId,
        input.reviewerResponse || null,
        input.requiredAction || null,
        user.id,
        now,
        now,
        id2
      ),
      blogNotification(context.env.DB, {
        userId: row.submitted_by,
        submissionId: id2,
        type: `BLOG_${input.status}`,
        title: `Blog submission ${input.status.toLowerCase().replace(/_/gu, " ")}`,
        message: input.reviewerResponse || (input.status === "APPROVED" ? "Your article is now a canonical draft awaiting publication." : "Your submission status was updated."),
        actionUrl: "/blog/write",
        dedupeKey: `blog-submission:${id2}:${input.status}:${now}`
      }),
      createAuditStatement(context.env.DB, {
        requestId: context.get("requestId"),
        actorId: user.id,
        action: `BLOG_SUBMISSION_${input.status}`,
        entityType: "BLOG_SUBMISSION",
        entityId: id2,
        reason: input.reviewerResponse || void 0,
        metadata: {
          fromStatus: row.workflow_status,
          toStatus: input.status,
          canonicalBlogId
        }
      })
    );
    await context.env.DB.batch(statements);
    return context.json(
      success(
        { id: id2, status: input.status, canonicalBlogId },
        context.get("requestId")
      )
    );
  }
);
blogRoutes.get("/blogs", async (context) => {
  const query = external_exports.object({
    q: external_exports.string().trim().max(160).default(""),
    category: external_exports.string().trim().max(100).default(""),
    page: external_exports.coerce.number().int().min(1).default(1),
    pageSize: external_exports.coerce.number().int().min(1).max(50).default(12)
  }).parse(context.req.query());
  const clauses = [
    "i.collection_key=?",
    "i.status='PUBLISHED'",
    "COALESCE(json_extract(i.data_json,'$.publicationDate'),i.published_at,i.created_at)<=?"
  ];
  const values = [BLOG_COLLECTION, (/* @__PURE__ */ new Date()).toISOString()];
  if (query.category) {
    clauses.push("json_extract(i.data_json,'$.category')=?");
    values.push(query.category);
  }
  if (query.q) {
    clauses.push(
      "(json_extract(i.data_json,'$.title') LIKE ? OR json_extract(i.data_json,'$.excerpt') LIKE ? OR json_extract(i.data_json,'$.tags') LIKE ?)"
    );
    values.push(`%${query.q}%`, `%${query.q}%`, `%${query.q}%`);
  }
  const where = clauses.join(" AND ");
  const [rows, count, categories] = await Promise.all([
    context.env.DB.prepare(
      `${rowSelect()} WHERE ${where} ORDER BY COALESCE(json_extract(i.data_json,'$.publicationDate'),i.published_at,i.created_at) DESC LIMIT ? OFFSET ?`
    ).bind(...values, query.pageSize, (query.page - 1) * query.pageSize).all(),
    context.env.DB.prepare(
      `SELECT COUNT(*) AS count FROM website_content_items i WHERE ${where}`
    ).bind(...values).first(),
    context.env.DB.prepare(
      "SELECT DISTINCT json_extract(data_json,'$.category') AS category FROM website_content_items WHERE collection_key=? AND status='PUBLISHED' AND json_extract(data_json,'$.category') IS NOT NULL ORDER BY category"
    ).bind(BLOG_COLLECTION).all()
  ]);
  return context.json(
    success(
      {
        items: rows.results.map(apiBlog),
        total: Number(count?.count ?? 0),
        page: query.page,
        pageSize: query.pageSize,
        categories: categories.results.map((row) => row.category)
      },
      context.get("requestId")
    )
  );
});
blogRoutes.get("/blogs/:slug", async (context) => {
  const identifier = blogId.parse(context.req.param("slug"));
  const now = (/* @__PURE__ */ new Date()).toISOString();
  const row = await context.env.DB.prepare(
    `${rowSelect()} WHERE i.collection_key=? AND i.status='PUBLISHED' AND (i.id=? OR json_extract(i.data_json,'$.slug')=?) AND COALESCE(json_extract(i.data_json,'$.publicationDate'),i.published_at,i.created_at)<=?`
  ).bind(BLOG_COLLECTION, identifier, identifier, now).first();
  if (!row)
    throw new AppError({
      code: "BLOG_NOT_FOUND",
      message: "This blog post is unavailable.",
      status: 404
    });
  await context.env.DB.prepare(
    "INSERT INTO blog_post_metrics(blog_id,view_count,last_viewed_at,updated_at) VALUES(?,1,?,?) ON CONFLICT(blog_id) DO UPDATE SET view_count=view_count+1,last_viewed_at=excluded.last_viewed_at,updated_at=excluded.updated_at"
  ).bind(row.id, now, now).run();
  const blog = apiBlog({ ...row, view_count: Number(row.view_count ?? 0) + 1 });
  const relatedRows = await context.env.DB.prepare(
    `${rowSelect()} WHERE i.collection_key=? AND i.status='PUBLISHED' AND i.id!=? AND COALESCE(json_extract(i.data_json,'$.publicationDate'),i.published_at,i.created_at)<=? ORDER BY CASE WHEN json_extract(i.data_json,'$.category')=? THEN 0 ELSE 1 END,COALESCE(json_extract(i.data_json,'$.publicationDate'),i.published_at,i.created_at) DESC LIMIT 3`
  ).bind(BLOG_COLLECTION, row.id, now, blog.category).all();
  return context.json(
    success(
      { ...blog, related: relatedRows.results.map(apiBlog) },
      context.get("requestId")
    )
  );
});
blogRoutes.get(
  "/admin/blogs",
  sessionMiddleware({ required: true }),
  requirePermission("content.read"),
  async (context) => {
    const query = external_exports.object({
      q: external_exports.string().trim().max(160).default(""),
      category: external_exports.string().trim().max(100).default(""),
      status: external_exports.enum(["DRAFT", "PUBLISHED", "ARCHIVED"]).optional(),
      from: external_exports.string().optional(),
      to: external_exports.string().optional(),
      sort: external_exports.enum(["updatedAt", "publicationDate", "title", "views"]).default("updatedAt"),
      direction: external_exports.enum(["asc", "desc"]).default("desc"),
      page: external_exports.coerce.number().int().min(1).default(1),
      pageSize: external_exports.coerce.number().int().min(1).max(100).default(20)
    }).parse(context.req.query());
    const clauses = ["i.collection_key=?"];
    const values = [BLOG_COLLECTION];
    if (query.status) {
      clauses.push("i.status=?");
      values.push(query.status);
    } else clauses.push("i.status!='ARCHIVED'");
    if (query.category) {
      clauses.push("json_extract(i.data_json,'$.category')=?");
      values.push(query.category);
    }
    if (query.from) {
      clauses.push(
        "COALESCE(json_extract(i.data_json,'$.publicationDate'),i.created_at)>=?"
      );
      values.push(query.from);
    }
    if (query.to) {
      clauses.push(
        "COALESCE(json_extract(i.data_json,'$.publicationDate'),i.created_at)<=?"
      );
      values.push(query.to);
    }
    if (query.q) {
      clauses.push(
        "(json_extract(i.data_json,'$.title') LIKE ? OR json_extract(i.data_json,'$.excerpt') LIKE ? OR json_extract(i.data_json,'$.authorName') LIKE ?)"
      );
      values.push(`%${query.q}%`, `%${query.q}%`, `%${query.q}%`);
    }
    const sortColumns = {
      updatedAt: "i.updated_at",
      publicationDate: "COALESCE(json_extract(i.data_json,'$.publicationDate'),i.published_at,i.created_at)",
      title: "json_extract(i.data_json,'$.title')",
      views: "COALESCE(m.view_count,0)"
    };
    const where = clauses.join(" AND ");
    const [rows, count] = await Promise.all([
      context.env.DB.prepare(
        `${rowSelect()} WHERE ${where} ORDER BY ${sortColumns[query.sort]} ${query.direction.toUpperCase()} LIMIT ? OFFSET ?`
      ).bind(...values, query.pageSize, (query.page - 1) * query.pageSize).all(),
      context.env.DB.prepare(
        `SELECT COUNT(*) AS count FROM website_content_items i WHERE ${where}`
      ).bind(...values).first()
    ]);
    return context.json(
      success(
        {
          items: rows.results.map(apiBlog),
          total: Number(count?.count ?? 0),
          page: query.page,
          pageSize: query.pageSize
        },
        context.get("requestId")
      )
    );
  }
);
blogRoutes.get(
  "/admin/blogs/stats",
  sessionMiddleware({ required: true }),
  requirePermission("content.read"),
  async (context) => {
    const row = await context.env.DB.prepare(
      "SELECT COUNT(*) AS total,SUM(CASE WHEN status='PUBLISHED' THEN 1 ELSE 0 END) AS published,SUM(CASE WHEN status='DRAFT' THEN 1 ELSE 0 END) AS drafts FROM website_content_items WHERE collection_key=? AND status!='ARCHIVED'"
    ).bind(BLOG_COLLECTION).first();
    const recent = await context.env.DB.prepare(
      `${rowSelect()} WHERE i.collection_key=? AND i.status!='ARCHIVED' ORDER BY i.updated_at DESC LIMIT 5`
    ).bind(BLOG_COLLECTION).all();
    return context.json(
      success(
        {
          total: Number(row?.total ?? 0),
          published: Number(row?.published ?? 0),
          drafts: Number(row?.drafts ?? 0),
          recent: recent.results.map(apiBlog)
        },
        context.get("requestId")
      )
    );
  }
);
blogRoutes.get(
  "/admin/blogs/:id",
  sessionMiddleware({ required: true }),
  requirePermission("content.read"),
  async (context) => {
    const id2 = blogId.parse(context.req.param("id"));
    const row = await context.env.DB.prepare(
      `${rowSelect()} WHERE i.id=? AND i.collection_key=?`
    ).bind(id2, BLOG_COLLECTION).first();
    if (!row)
      throw new AppError({
        code: "BLOG_NOT_FOUND",
        message: "Blog post not found.",
        status: 404
      });
    return context.json(success(apiBlog(row), context.get("requestId")));
  }
);
blogRoutes.put(
  "/admin/blogs/:id",
  sessionMiddleware({ required: true }),
  csrfMiddleware(),
  requirePermission("content.manage"),
  async (context) => {
    const { user } = requireAuth(context);
    const id2 = blogId.parse(context.req.param("id"));
    const input = await parseJson(context, blogSchema);
    if (input.status === "PUBLISHED" && !user.permissions.includes("content.publish"))
      throw new AppError({
        code: "PERMISSION_DENIED",
        message: "You do not have permission to publish blogs.",
        status: 403
      });
    await ensureUniqueSlug(context.env.DB, input.slug, id2);
    const existing = await context.env.DB.prepare(
      "SELECT status,published_at,created_at FROM website_content_items WHERE id=? AND collection_key=?"
    ).bind(id2, BLOG_COLLECTION).first();
    const now = (/* @__PURE__ */ new Date()).toISOString();
    const contentHtml = cleanHtml(input.contentHtml);
    if (input.status === "PUBLISHED")
      throwValidation(publishErrors(input, contentHtml));
    const featuredImageUrl = input.status === "PUBLISHED" ? await verifiedHeroImage(context.env, input.featuredImageUrl) : input.featuredImageUrl;
    const publicationDate = input.publicationDate;
    const data = {
      ...input,
      publicationDate,
      contentHtml,
      featuredImageUrl,
      authorId: user.id,
      published: input.status === "PUBLISHED",
      cover_image: featuredImageUrl || null,
      author_name: input.authorName
    };
    const workflowStatements = await workflowPublicationStatements(
      context.env.DB,
      {
        canonicalBlogId: id2,
        published: input.status === "PUBLISHED",
        now,
        slug: input.slug
      }
    );
    await context.env.DB.batch([
      context.env.DB.prepare(
        `INSERT INTO website_content_items(id,collection_key,data_json,status,sort_order,created_by,updated_by,created_at,updated_at,published_at,archived_at) VALUES(?,?,?,?,0,?,?,?,?,?,NULL)
      ON CONFLICT(id) DO UPDATE SET data_json=excluded.data_json,status=excluded.status,updated_by=excluded.updated_by,updated_at=excluded.updated_at,published_at=excluded.published_at,archived_at=NULL`
      ).bind(
        id2,
        BLOG_COLLECTION,
        JSON.stringify(data),
        input.status,
        user.id,
        user.id,
        existing?.created_at ?? now,
        now,
        input.status === "PUBLISHED" ? existing?.published_at ?? publicationDate : null
      ),
      context.env.DB.prepare(
        "INSERT OR IGNORE INTO blog_post_metrics(blog_id) VALUES(?)"
      ).bind(id2),
      createAuditStatement(context.env.DB, {
        requestId: context.get("requestId"),
        actorId: user.id,
        action: existing ? "BLOG_UPDATED" : "BLOG_CREATED",
        entityType: "BLOG",
        entityId: id2,
        metadata: {
          slug: input.slug,
          fromStatus: existing?.status ?? null,
          toStatus: input.status
        }
      }),
      ...workflowStatements
    ]);
    return context.json(
      success(
        { id: id2, slug: input.slug, status: input.status },
        context.get("requestId")
      ),
      existing ? 200 : 201
    );
  }
);
blogRoutes.patch(
  "/admin/blogs/:id/status",
  sessionMiddleware({ required: true }),
  csrfMiddleware(),
  requirePermission("content.publish"),
  async (context) => {
    const { user } = requireAuth(context);
    const id2 = blogId.parse(context.req.param("id"));
    const input = await parseJson(
      context,
      external_exports.object({
        status: external_exports.enum(["DRAFT", "PUBLISHED"]),
        reason: external_exports.string().trim().min(3).max(1e3)
      }).strict()
    );
    const row = await context.env.DB.prepare(
      `${rowSelect()} WHERE i.id=? AND i.collection_key=? AND i.status!='ARCHIVED'`
    ).bind(id2, BLOG_COLLECTION).first();
    if (!row)
      throw new AppError({
        code: "BLOG_NOT_FOUND",
        message: "Blog post not found.",
        status: 404
      });
    const data = JSON.parse(row.data_json);
    const now = (/* @__PURE__ */ new Date()).toISOString();
    if (input.status === "PUBLISHED") {
      const current = apiBlog(row);
      const parsed = blogSchema.safeParse({
        title: current.title,
        slug: current.slug,
        excerpt: current.excerpt,
        featuredImageUrl: current.featuredImageUrl,
        featuredImageAlt: current.featuredImageAlt,
        contentHtml: current.contentHtml,
        authorName: current.authorName,
        category: current.category,
        tags: current.tags,
        publicationDate: current.publicationDate,
        status: "PUBLISHED",
        seoTitle: current.seoTitle,
        seoDescription: current.seoDescription,
        seoKeywords: current.seoKeywords,
        socialImageUrl: current.socialImageUrl
      });
      if (!parsed.success) {
        const details = {};
        for (const issue of parsed.error.issues) {
          const key = issue.path.join(".") || "body";
          details[key] = [...details[key] ?? [], issue.message];
        }
        throw new AppError({
          code: "VALIDATION_ERROR",
          message: "Some blog fields need attention.",
          status: 422,
          details
        });
      }
      const contentHtml = cleanHtml(parsed.data.contentHtml);
      throwValidation(publishErrors(parsed.data, contentHtml));
      await ensureUniqueSlug(context.env.DB, parsed.data.slug, id2);
      const featuredImageUrl = await verifiedHeroImage(
        context.env,
        parsed.data.featuredImageUrl
      );
      Object.assign(data, parsed.data, {
        contentHtml,
        featuredImageUrl,
        cover_image: featuredImageUrl
      });
    }
    data.published = input.status === "PUBLISHED";
    const workflowStatements = await workflowPublicationStatements(
      context.env.DB,
      {
        canonicalBlogId: id2,
        published: input.status === "PUBLISHED",
        now,
        slug: String(data.slug ?? id2)
      }
    );
    await context.env.DB.batch([
      context.env.DB.prepare(
        "UPDATE website_content_items SET data_json=?,status=?,published_at=?,updated_by=?,updated_at=? WHERE id=? AND status=?"
      ).bind(
        JSON.stringify(data),
        input.status,
        input.status === "PUBLISHED" ? row.published_at ?? String(data.publicationDate) : null,
        user.id,
        now,
        id2,
        row.status
      ),
      createAuditStatement(context.env.DB, {
        requestId: context.get("requestId"),
        actorId: user.id,
        action: input.status === "PUBLISHED" ? "BLOG_PUBLISHED" : "BLOG_UNPUBLISHED",
        entityType: "BLOG",
        entityId: id2,
        reason: input.reason,
        metadata: { fromStatus: row.status, toStatus: input.status }
      }),
      ...workflowStatements
    ]);
    return context.json(
      success({ id: id2, status: input.status }, context.get("requestId"))
    );
  }
);
blogRoutes.delete(
  "/admin/blogs/:id",
  sessionMiddleware({ required: true }),
  csrfMiddleware(),
  requirePermission("content.manage"),
  async (context) => {
    const { user } = requireAuth(context);
    const id2 = blogId.parse(context.req.param("id"));
    const input = await parseJson(
      context,
      external_exports.object({ reason: external_exports.string().trim().min(3).max(1e3) }).strict()
    );
    const now = (/* @__PURE__ */ new Date()).toISOString();
    const result = await context.env.DB.batch([
      context.env.DB.prepare(
        "UPDATE website_content_items SET status='ARCHIVED',archived_at=?,updated_by=?,updated_at=? WHERE id=? AND collection_key=? AND status!='ARCHIVED'"
      ).bind(now, user.id, now, id2, BLOG_COLLECTION),
      createAuditStatement(context.env.DB, {
        requestId: context.get("requestId"),
        actorId: user.id,
        action: "BLOG_ARCHIVED",
        entityType: "BLOG",
        entityId: id2,
        reason: input.reason
      })
    ]);
    if ((result[0]?.meta.changes ?? 0) !== 1)
      throw new AppError({
        code: "BLOG_NOT_FOUND",
        message: "Blog post not found.",
        status: 404
      });
    return context.json(
      success({ id: id2, status: "ARCHIVED" }, context.get("requestId"))
    );
  }
);

// worker/routes/events.ts
var idSchema3 = external_exports.string().uuid();
var eventRoutes = new Hono2();
eventRoutes.get(
  "/admin/events",
  sessionMiddleware({ required: true }),
  requirePermission("event.read"),
  async (context) => {
    const rows = await context.env.DB.prepare(
      `${selectEvent} WHERE e.workflow_status!='ARCHIVED' ORDER BY e.updated_at DESC LIMIT 500`
    ).all();
    return context.json(
      success(
        rows.results.map((row) => eventView(row)),
        context.get("requestId")
      )
    );
  }
);
eventRoutes.get(
  "/admin/events/:id",
  sessionMiddleware({ required: true }),
  requirePermission("event.read"),
  async (context) => {
    const id2 = idSchema3.parse(context.req.param("id"));
    const row = await context.env.DB.prepare(`${selectEvent} WHERE e.id=?`).bind(id2).first();
    if (!row)
      throw new AppError({
        code: "EVENT_NOT_FOUND",
        message: "The event was not found.",
        status: 404
      });
    return context.json(success(eventView(row), context.get("requestId")));
  }
);
eventRoutes.put(
  "/admin/events/:id",
  sessionMiddleware({ required: true }),
  csrfMiddleware(),
  requireAnyPermission(["event.manage", "content.manage"]),
  async (context) => {
    const { user } = requireAuth(context);
    const id2 = idSchema3.parse(context.req.param("id"));
    const input = normalizeEventInput(await parseJson(context, eventSchema));
    await validateEventMediaReferences(
      context.env.DB,
      context.env.STORAGE,
      input
    );
    const duplicate = await context.env.DB.prepare(
      "SELECT id FROM managed_events WHERE slug=? AND id!=?"
    ).bind(input.slug, id2).first("id");
    if (duplicate)
      throw new AppError({
        code: "EVENT_SLUG_EXISTS",
        message: "Another event already uses this slug.",
        status: 409
      });
    const previous = await context.env.DB.prepare(
      "SELECT slug,workflow_status,published_at FROM managed_events WHERE id=?"
    ).bind(id2).first();
    if (previous?.workflow_status === "PUBLISHED" && previous.slug !== input.slug && !input.confirmSlugChange)
      throw new AppError({
        code: "EVENT_SLUG_CONFIRMATION_REQUIRED",
        message: "Changing this published event slug changes its public URL. Confirm the URL change and save again.",
        status: 409
      });
    const now = (/* @__PURE__ */ new Date()).toISOString();
    const publishTime = input.workflowStatus === "PUBLISHED" ? previous?.published_at || now : null;
    const updateColumns = eventColumns.filter(
      (column) => !["id", "created_by", "created_at"].includes(column)
    );
    const action = !previous ? "EVENT_CREATED" : previous.workflow_status !== input.workflowStatus ? `EVENT_${input.workflowStatus === "PUBLISHED" ? "PUBLISHED" : "UNPUBLISHED"}` : "EVENT_UPDATED";
    const statements = [
      context.env.DB.prepare(
        `INSERT INTO website_content_items(id,collection_key,data_json,status,sort_order,created_by,updated_by,created_at,updated_at,published_at,archived_at)
         VALUES(?,'events',?,?,?,?,?,?,?,?,NULL)
         ON CONFLICT(id) DO UPDATE SET data_json=excluded.data_json,status=excluded.status,sort_order=excluded.sort_order,
         updated_by=excluded.updated_by,updated_at=excluded.updated_at,published_at=excluded.published_at,archived_at=NULL`
      ).bind(
        id2,
        JSON.stringify(legacyEventData(input)),
        input.workflowStatus,
        input.sortOrder,
        user.id,
        user.id,
        now,
        now,
        publishTime
      ),
      context.env.DB.prepare(
        `INSERT INTO managed_events(${eventColumns.join(",")}) VALUES(${eventColumns.map(() => "?").join(",")})
         ON CONFLICT(id) DO UPDATE SET ${updateColumns.map((column) => `${column}=excluded.${column}`).join(",")}`
      ).bind(...eventValues(input, id2, user.id, now, publishTime)),
      createAuditStatement(context.env.DB, {
        requestId: context.get("requestId"),
        actorId: user.id,
        action,
        entityType: "EVENT",
        entityId: id2,
        metadata: {
          slug: input.slug,
          workflowStatus: input.workflowStatus,
          eventStatus: input.eventStatus,
          registrationStatus: input.registrationStatus
        }
      })
    ];
    if (input.workflowStatus === "PUBLISHED" && previous?.workflow_status !== "PUBLISHED")
      statements.push(
        context.env.DB.prepare(
          `INSERT OR IGNORE INTO user_notifications(id,user_id,notification_type,title,message,action_url,related_entity_type,related_entity_id,priority,dedupe_key)
         SELECT lower(hex(randomblob(16))),id,'EVENT_PUBLISHED',?,?,?,'EVENT',?,'NORMAL',? FROM users WHERE status='EMAIL_VERIFIED' AND deleted_at IS NULL`
        ).bind(
          `New event: ${input.title}`,
          input.shortDescription,
          `/events/${input.slug}`,
          id2,
          `event:published:${id2}`
        )
      );
    await context.env.DB.batch(statements);
    return context.json(
      success(
        {
          id: id2,
          slug: input.slug,
          status: input.workflowStatus,
          eventStatus: input.eventStatus,
          registrationStatus: input.registrationStatus,
          action
        },
        context.get("requestId")
      ),
      previous ? 200 : 201
    );
  }
);
eventRoutes.delete(
  "/admin/events/:id",
  sessionMiddleware({ required: true }),
  csrfMiddleware(),
  requireAnyPermission(["event.manage", "content.manage"]),
  async (context) => {
    const { user } = requireAuth(context);
    const id2 = idSchema3.parse(context.req.param("id"));
    const now = (/* @__PURE__ */ new Date()).toISOString();
    const result = await context.env.DB.prepare(
      "UPDATE managed_events SET workflow_status='ARCHIVED',updated_by=?,updated_at=? WHERE id=? AND workflow_status!='ARCHIVED' RETURNING id"
    ).bind(user.id, now, id2).first("id");
    if (!result)
      throw new AppError({
        code: "EVENT_NOT_FOUND",
        message: "The event was not found.",
        status: 404
      });
    await context.env.DB.batch([
      context.env.DB.prepare(
        "UPDATE website_content_items SET status='ARCHIVED',archived_at=?,updated_by=?,updated_at=? WHERE id=?"
      ).bind(now, user.id, now, id2),
      createAuditStatement(context.env.DB, {
        requestId: context.get("requestId"),
        actorId: user.id,
        action: "EVENT_ARCHIVED",
        entityType: "EVENT",
        entityId: id2
      })
    ]);
    return context.json(
      success({ id: id2, status: "ARCHIVED" }, context.get("requestId"))
    );
  }
);

// worker/lib/spa-routes.ts
var exactRoutes = /* @__PURE__ */ new Set([
  "/",
  "/about",
  "/projects",
  "/projects/submit",
  "/events",
  "/events/register",
  "/partners",
  "/opportunities",
  "/verify-opportunity-application",
  "/alumni",
  "/alumni/apply",
  "/members",
  "/team",
  "/gallery",
  "/join",
  "/contact",
  "/collaborate",
  "/auth",
  "/forgot-password",
  "/reset-password",
  "/verify-email",
  "/verify-email-change",
  "/account/security",
  "/dashboard",
  "/dashboard/membership",
  "/admin",
  "/blog",
  "/blog/write",
  "/research",
  "/research/submit",
  "/verify-submission",
  "/track-submission",
  "/courses",
  "/verify"
]);
var dynamicRoutes = [
  /^\/projects\/[^/]+$/u,
  /^\/events\/[^/]+$/u,
  /^\/partners\/[^/]+$/u,
  /^\/opportunities\/[^/]+$/u,
  /^\/people\/[^/]+$/u,
  /^\/dashboard\/submissions\/[^/]+$/u,
  /^\/blog\/[^/]+$/u,
  /^\/research\/[^/]+$/u,
  /^\/courses\/[^/]+$/u,
  /^\/certificate\/[^/]+$/u,
  /^\/verify-certificate\/[^/]+$/u
];
function normalizeSpaPath(pathname) {
  if (pathname === "/") return pathname;
  return pathname.replace(/\/+$/u, "");
}
__name(normalizeSpaPath, "normalizeSpaPath");
function isSpaRoute(pathname) {
  const normalized = normalizeSpaPath(pathname);
  return exactRoutes.has(normalized) || dynamicRoutes.some((pattern) => pattern.test(normalized));
}
__name(isSpaRoute, "isSpaRoute");
function isStaticAssetPath(pathname) {
  return /\.[A-Za-z0-9]{1,12}$/u.test(pathname);
}
__name(isStaticAssetPath, "isStaticAssetPath");

// worker/app.ts
var app = new Hono2();
app.use("*", requestContext());
app.use("*", securityHeaders());
app.use("*", async (context, next) => {
  const url2 = new URL(context.req.url);
  const canonical = new URL(context.env.SITE_URL);
  if (context.env.ENVIRONMENT === "production" && url2.hostname === `www.${canonical.hostname}`) {
    url2.protocol = canonical.protocol;
    url2.hostname = canonical.hostname;
    url2.port = canonical.port;
    return context.redirect(url2.toString(), 308);
  }
  await next();
});
app.use("/api/*", noStoreApiResponses());
app.use(
  "/api/v1/auth/*",
  bodyLimit({
    maxSize: 16 * 1024,
    onError: /* @__PURE__ */ __name(() => {
      throw new AppError({
        code: "PAYLOAD_TOO_LARGE",
        message: "The request body is too large.",
        status: 413
      });
    }, "onError")
  })
);
app.use(
  "/api/v1/account/*",
  bodyLimit({
    maxSize: 16 * 1024,
    onError: /* @__PURE__ */ __name(() => {
      throw new AppError({
        code: "PAYLOAD_TOO_LARGE",
        message: "The request body is too large.",
        status: 413
      });
    }, "onError")
  })
);
app.use(
  "/api/v1/admin/*",
  bodyLimit({
    maxSize: 256 * 1024,
    onError: /* @__PURE__ */ __name(() => {
      throw new AppError({
        code: "PAYLOAD_TOO_LARGE",
        message: "The request body is too large.",
        status: 413
      });
    }, "onError")
  })
);
app.use(
  "/api/v1/internal/*",
  bodyLimit({
    maxSize: 16 * 1024,
    onError: /* @__PURE__ */ __name(() => {
      throw new AppError({
        code: "PAYLOAD_TOO_LARGE",
        message: "The request body is too large.",
        status: 413
      });
    }, "onError")
  })
);
app.use(
  "/api/v1/data/*",
  bodyLimit({
    maxSize: 64 * 1024,
    onError: /* @__PURE__ */ __name(() => {
      throw new AppError({
        code: "PAYLOAD_TOO_LARGE",
        message: "The request body is too large.",
        status: 413
      });
    }, "onError")
  })
);
app.use(
  "/api/v1/media/upload",
  bodyLimit({
    maxSize: 6 * 1024 * 1024,
    onError: /* @__PURE__ */ __name(() => {
      throw new AppError({
        code: "PAYLOAD_TOO_LARGE",
        message: "The media file is too large.",
        status: 413
      });
    }, "onError")
  })
);
app.use(
  "/api/v1/submissions/*",
  bodyLimit({
    maxSize: 11 * 1024 * 1024,
    onError: /* @__PURE__ */ __name(() => {
      throw new AppError({
        code: "PAYLOAD_TOO_LARGE",
        message: "The submission payload is too large.",
        status: 413
      });
    }, "onError")
  })
);
app.use(
  "/api/v1/membership/*",
  bodyLimit({
    maxSize: 32 * 1024,
    onError: /* @__PURE__ */ __name(() => {
      throw new AppError({
        code: "PAYLOAD_TOO_LARGE",
        message: "The request body is too large.",
        status: 413
      });
    }, "onError")
  })
);
app.use(
  "/api/v1/volunteers/*",
  bodyLimit({
    maxSize: 32 * 1024,
    onError: /* @__PURE__ */ __name(() => {
      throw new AppError({
        code: "PAYLOAD_TOO_LARGE",
        message: "The request body is too large.",
        status: 413
      });
    }, "onError")
  })
);
app.get(
  "/api/v1",
  (context) => context.json(
    success(
      {
        service: "RUET IoT Club API",
        version: "v1",
        documentation: "/docs/architecture"
      },
      context.get("requestId")
    )
  )
);
app.route("/api/v1", healthRoutes);
app.route("/api/v1", authRoutes);
app.route("/api/v1", adminRoutes);
app.route("/api/v1", membershipRoutes);
app.route("/api/v1", workflowRoutes);
app.route("/api/v1", contentRoutes);
app.route("/api/v1", submissionRoutes);
app.route("/api/v1", settingsRoutes);
app.route("/api/v1", projectRoutes);
app.route("/api/v1", certificateRoutes);
app.route("/api/v1", platformRoutes);
app.route("/api/v1", communityRoutes);
app.route("/api/v1", blogRoutes);
app.route("/api/v1", eventRoutes);
app.route("/", sitemapRoutes);
app.all(
  "/api/*",
  (context) => context.json(
    failure(
      "ROUTE_NOT_FOUND",
      "The requested API route does not exist.",
      context.get("requestId")
    ),
    404
  )
);
async function assetOrNotFound(context) {
  const pathname = new URL(context.req.url).pathname;
  const asset = await context.env.ASSETS.fetch(context.req.raw);
  if (isSpaRoute(pathname) || isStaticAssetPath(pathname)) return asset;
  return new Response(context.req.method === "HEAD" ? null : asset.body, {
    status: 404,
    headers: asset.headers
  });
}
__name(assetOrNotFound, "assetOrNotFound");
app.get("*", assetOrNotFound);
app.on("HEAD", "*", assetOrNotFound);
app.notFound(
  (context) => context.json(
    failure(
      "NOT_FOUND",
      "The requested resource does not exist.",
      context.get("requestId")
    ),
    404
  )
);
app.onError((error, context) => {
  const requestId = context.get("requestId") || crypto.randomUUID();
  if (error instanceof AppError) {
    return context.json(
      failure(error.code, error.message, requestId, error.details),
      error.status
    );
  }
  if (error instanceof ZodError) {
    const flattened = error.flatten();
    const details = Object.fromEntries(
      Object.entries(flattened.fieldErrors).filter(
        (entry) => Array.isArray(entry[1])
      )
    );
    if (flattened.formErrors.length > 0) details._root = flattened.formErrors;
    return context.json(
      failure(
        "VALIDATION_ERROR",
        "The request could not be validated.",
        requestId,
        details
      ),
      422
    );
  }
  console.error(
    JSON.stringify({
      message: "request.failed",
      requestId,
      path: new URL(context.req.url).pathname,
      error: error instanceof Error ? error.message : "Unknown error"
    })
  );
  return context.json(
    failure("INTERNAL_ERROR", "An unexpected error occurred.", requestId),
    500
  );
});

// worker/index.ts
var index_default = {
  async fetch(request, env, context) {
    return app.fetch(request, env, context);
  },
  async scheduled(_controller, env, context) {
    context.waitUntil(dispatchPendingEmails(env));
  }
};
export {
  index_default as default
};
//# sourceMappingURL=index.js.map
