import { formatText } from "@/lib/text-formatter"

/**
 * 任意のフリーテキストを段落・箇条書き・注記に分けて描画する。
 * 整形ロジックは `lib/text-formatter.ts` を参照。
 */
export function FormattedText({
  text,
  emptyFallback,
}: {
  text: string | null | undefined
  emptyFallback?: React.ReactNode
}) {
  const blocks = formatText(text)
  if (blocks.length === 0) {
    return emptyFallback ? <>{emptyFallback}</> : null
  }
  return (
    <div className="space-y-3 text-sm text-gray-700 leading-relaxed">
      {blocks.map((block, i) => {
        if (block.type === "list") {
          return (
            <ul key={i} className="space-y-1.5 pl-1">
              {block.items.map((item, j) => (
                <li key={j} className="flex gap-2">
                  <span className="mt-1.5 inline-block h-1.5 w-1.5 shrink-0 rounded-full bg-primary-400" />
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          )
        }
        if (block.type === "note") {
          return (
            <p
              key={i}
              className="text-xs text-gray-500 border-l-2 border-gray-200 pl-3 py-0.5"
            >
              ※ {block.text}
            </p>
          )
        }
        return (
          <p key={i} className="whitespace-pre-wrap">
            {block.text}
          </p>
        )
      })}
    </div>
  )
}
