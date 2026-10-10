import { Parser } from "htmlparser2";

const allowedTags = new Set([
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
  "hr",
]);
const voidTags = new Set(["br", "img", "hr"]);
const suppressedTags = new Set([
  "script",
  "style",
  "iframe",
  "object",
  "embed",
  "svg",
  "math",
  "template",
]);
const allowedAttributes: Record<string, Set<string>> = {
  a: new Set(["href", "title"]),
  img: new Set(["src", "alt", "title", "width", "height"]),
  th: new Set(["colspan", "rowspan", "scope"]),
  td: new Set(["colspan", "rowspan"]),
  code: new Set(["data-language"]),
};

const escapeText = (value: string) =>
  value.replace(/&/gu, "&amp;").replace(/</gu, "&lt;").replace(/>/gu, "&gt;");
const escapeAttribute = (value: string) =>
  escapeText(value).replace(/"/gu, "&quot;").replace(/'/gu, "&#39;");

function safeUrl(value: string, image: boolean) {
  const normalized = value.trim();
  if (image && normalized.startsWith("/api/v1/media/files/")) return normalized;
  if (!image && (normalized.startsWith("/") || normalized.startsWith("#")))
    return normalized;
  try {
    const url = new URL(normalized);
    if (
      url.protocol === "https:" ||
      (!image && (url.protocol === "http:" || url.protocol === "mailto:"))
    )
      return url.toString();
  } catch {
    /* Invalid and dangerous schemes are discarded. */
  }
  return null;
}

export function sanitizeBlogHtml(source: string) {
  let output = "";
  let suppressedDepth = 0;
  const stack: Array<{ name: string; emitted: boolean; suppressed: boolean }> =
    [];
  const parser = new Parser(
    {
      onopentag(name, attributes) {
        const tag = name.toLowerCase();
        const suppressed = suppressedDepth > 0 || suppressedTags.has(tag);
        if (suppressed) suppressedDepth += 1;
        const emitted = !suppressed && allowedTags.has(tag);
        stack.push({ name: tag, emitted, suppressed });
        if (!emitted) return;
        const pairs: string[] = [];
        for (const [attribute, rawValue] of Object.entries(attributes)) {
          const key = attribute.toLowerCase();
          if (!allowedAttributes[tag]?.has(key)) continue;
          let value: string | null = rawValue;
          if (key === "href" || key === "src")
            value = safeUrl(rawValue, key === "src");
          if (value === null) continue;
          if (
            ["width", "height", "colspan", "rowspan"].includes(key) &&
            !/^\d{1,4}$/u.test(value)
          )
            continue;
          pairs.push(`${key}="${escapeAttribute(value)}"`);
        }
        if (tag === "a")
          pairs.push('target="_blank"', 'rel="noopener noreferrer"');
        if (tag === "img") pairs.push('loading="lazy"');
        output += `<${tag}${pairs.length ? ` ${pairs.join(" ")}` : ""}>`;
      },
      ontext(text) {
        if (suppressedDepth === 0) output += escapeText(text);
      },
      onclosetag() {
        const entry = stack.pop();
        if (!entry) return;
        if (entry.suppressed)
          suppressedDepth = Math.max(0, suppressedDepth - 1);
        if (entry.emitted && !voidTags.has(entry.name))
          output += `</${entry.name}>`;
      },
    },
    { decodeEntities: true },
  );
  parser.write(source);
  parser.end();
  return output;
}
