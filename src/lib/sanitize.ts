import sanitizeHtml from "sanitize-html"

const ALLOWED_TAGS = [
  "h1", "h2", "h3", "h4", "h5", "h6",
  "p", "br", "hr",
  "ul", "ol", "li",
  "blockquote", "pre", "code",
  "strong", "b", "em", "i", "u", "s", "del", "mark",
  "a", "img",
  "table", "thead", "tbody", "tr", "th", "td",
  "div", "span", "section", "article", "aside",
  "figure", "figcaption",
  "details", "summary",
]

const ALLOWED_ATTRS: sanitizeHtml.IOptions["allowedAttributes"] = {
  a: ["href", "title", "target", "rel"],
  img: ["src", "alt", "width", "height", "loading"],
  "*": ["class", "id"],
  td: ["colspan", "rowspan"],
  th: ["colspan", "rowspan", "scope"],
}

export function sanitizeArticleHtml(html: string): string {
  return sanitizeHtml(html, {
    allowedTags: ALLOWED_TAGS,
    allowedAttributes: ALLOWED_ATTRS,
    allowedSchemes: ["http", "https", "mailto"],
    transformTags: {
      a: (tagName, attribs) => ({
        tagName,
        attribs: {
          ...attribs,
          // 外部リンクは安全にする
          ...(attribs.href && !attribs.href.startsWith("/") && !attribs.href.startsWith("#")
            ? { rel: "noopener noreferrer", target: "_blank" }
            : {}),
        },
      }),
    },
  })
}
