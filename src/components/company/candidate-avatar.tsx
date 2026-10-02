/**
 * 企業側画面で使う求職者の顔写真アバター。
 * 写真未設定時は名前の頭文字を表示。Server Component（JS 不要）。
 */
export function CandidateAvatar({
  avatarUrl,
  name,
  size = "md",
}: {
  avatarUrl: string | null
  name: string | null
  size?: "sm" | "md" | "lg"
}) {
  const cls =
    size === "lg"
      ? "h-16 w-16 text-xl"
      : size === "sm"
        ? "h-9 w-9 text-sm"
        : "h-12 w-12 text-base"

  if (avatarUrl) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={avatarUrl}
        alt=""
        className={`${cls} shrink-0 rounded-full border border-gray-200 object-cover`}
      />
    )
  }
  return (
    <div
      aria-hidden
      className={`${cls} flex shrink-0 items-center justify-center rounded-full bg-primary-100 font-bold text-primary-700`}
    >
      {name ? name.charAt(0) : "？"}
    </div>
  )
}
