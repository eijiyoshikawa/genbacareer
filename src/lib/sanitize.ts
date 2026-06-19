import sanitizeHtml from "sanitize-html"

const articleSanitizeOptions: sanitizeHtml.IOptions = {
  allowedTags: sanitizeHtml.defaults.allowedTags.concat([
    "img",
    "picture",
    "figure",
    "figcaption",
    "details",
    "summary",
  ]),
  allowedAttributes: {
    ...sanitizeHtml.defaults.allowedAttributes,
    a: ["href", "name", "target", "rel"],
    img: ["src", "alt", "title", "width", "height", "loading", "decoding"],
    "*": ["class", "id"],
    th: ["colspan", "rowspan", "scope"],
    td: ["colspan", "rowspan"],
  },
  allowedSchemes: ["http", "https", "mailto"],
  allowedSchemesAppliedToAttributes: ["href", "src"],
}

export function sanitizeArticleHtml(html: string): string {
  return sanitizeHtml(html, articleSanitizeOptions)
}
