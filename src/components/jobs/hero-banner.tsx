import {
  HardHat,
  Shovel,
  Wrench,
  Hammer,
  Buildings,
  Truck,
  ClipboardText,
  Ruler,
} from "@phosphor-icons/react/dist/ssr"

const ICONS: Record<
  string,
  { Icon: typeof HardHat; from: string; to: string }
> = {
  construction: { Icon: HardHat, from: "from-orange-400", to: "to-orange-600" },
  civil: { Icon: Shovel, from: "from-amber-500", to: "to-amber-700" },
  electrical: { Icon: Wrench, from: "from-blue-500", to: "to-blue-700" },
  interior: { Icon: Hammer, from: "from-emerald-500", to: "to-emerald-700" },
  demolition: { Icon: Buildings, from: "from-stone-500", to: "to-stone-700" },
  driver: { Icon: Truck, from: "from-cyan-500", to: "to-cyan-700" },
  management: { Icon: ClipboardText, from: "from-indigo-500", to: "to-indigo-700" },
  survey: { Icon: Ruler, from: "from-purple-500", to: "to-purple-700" },
}

/**
 * 求人詳細ページの上部に置く帯状のビジュアル。
 * HW 求人は画像を持たないので、カテゴリごとに色 + アイコンで雰囲気を出す。
 */
export function HeroBanner({ category }: { category: string }) {
  const cfg = ICONS[category] ?? ICONS.construction
  const IconCmp = cfg.Icon
  return (
    <div
      className={`relative h-28 sm:h-40 overflow-hidden bg-gradient-to-br ${cfg.from} ${cfg.to}`}
    >
      <div className="absolute inset-0 flex items-center justify-end pr-8 sm:pr-12 opacity-30">
        <IconCmp weight="duotone" className="h-24 w-24 sm:h-36 sm:w-36 text-white" />
      </div>
      <div className="absolute inset-0 bg-gradient-to-t from-black/10 to-transparent" />
    </div>
  )
}
