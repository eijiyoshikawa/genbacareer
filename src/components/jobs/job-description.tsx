import { formatDescriptionSections } from "@/lib/job-enrichment"
import { FormattedText } from "./formatted-text"

/**
 * HelloWork の長文 description を見出し付きセクションに分解し、
 * 各セクションの本文は `FormattedText` で段落・箇条書き・注記に整形して描画する。
 */
export function JobDescription({
  text,
}: {
  text: string | null | undefined
}) {
  const sections = formatDescriptionSections(text)
  if (sections.length === 0) {
    return (
      <p className="text-sm text-gray-500">
        詳細な仕事内容は公共求人の掲載ページでご確認ください。
      </p>
    )
  }

  return (
    <div className="space-y-5">
      {sections.map((section, i) => (
        <section key={i}>
          {section.heading && (
            <h3 className="mb-2 inline-block bg-primary-50 px-2.5 py-1 text-sm font-bold text-primary-700">
              {section.heading}
            </h3>
          )}
          <FormattedText text={section.body} />
        </section>
      ))}
    </div>
  )
}
