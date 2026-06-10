/**
 * メイン写真が無い求人のヒーロー画像フォールバック。
 *
 * 求人・会社いずれにも写真が無い場合、ここで指定した画像群から
 * 求人 ID をシードに「決定的に」1 枚を選んで表示する。
 *
 * 決定的に選ぶ理由:
 *   - リロードのたびに変わるとちらつく / SSR と CSR で不一致になる
 *   - 同じ求人は常に同じ画像になり、見た目が安定する
 *
 * 画像の指定: DEFAULT_JOB_IMAGES に 15 枚分の公開 URL を入れる。空配列の場合は
 * フォールバックせず、従来のネイビー帯 (HeroBanner の写真なし表示) になる。
 *
 * 設定方法: 表示したい 15 枚を ./job-default-images/ に置き、
 *   pnpm tsx --env-file=.env.local scripts/upload-default-job-images.ts \
 *     --dir=./job-default-images --apply --write
 * を実行すると Supabase Storage (company-media/job-defaults/) へアップロードし、
 * この配列を自動で書き換える。
 */
export const DEFAULT_JOB_IMAGES: string[] = [
  "https://wjimvcyzunfgaqzthdbd.supabase.co/storage/v1/object/public/company-media/job-defaults/01.webp",
  "https://wjimvcyzunfgaqzthdbd.supabase.co/storage/v1/object/public/company-media/job-defaults/02.webp",
  "https://wjimvcyzunfgaqzthdbd.supabase.co/storage/v1/object/public/company-media/job-defaults/03.webp",
  "https://wjimvcyzunfgaqzthdbd.supabase.co/storage/v1/object/public/company-media/job-defaults/04.webp",
  "https://wjimvcyzunfgaqzthdbd.supabase.co/storage/v1/object/public/company-media/job-defaults/05.webp",
  "https://wjimvcyzunfgaqzthdbd.supabase.co/storage/v1/object/public/company-media/job-defaults/06.webp",
  "https://wjimvcyzunfgaqzthdbd.supabase.co/storage/v1/object/public/company-media/job-defaults/07.webp",
  "https://wjimvcyzunfgaqzthdbd.supabase.co/storage/v1/object/public/company-media/job-defaults/08.webp",
  "https://wjimvcyzunfgaqzthdbd.supabase.co/storage/v1/object/public/company-media/job-defaults/09.webp",
  "https://wjimvcyzunfgaqzthdbd.supabase.co/storage/v1/object/public/company-media/job-defaults/10.webp",
  "https://wjimvcyzunfgaqzthdbd.supabase.co/storage/v1/object/public/company-media/job-defaults/11.webp",
  "https://wjimvcyzunfgaqzthdbd.supabase.co/storage/v1/object/public/company-media/job-defaults/12.webp",
  "https://wjimvcyzunfgaqzthdbd.supabase.co/storage/v1/object/public/company-media/job-defaults/13.webp",
  "https://wjimvcyzunfgaqzthdbd.supabase.co/storage/v1/object/public/company-media/job-defaults/14.webp",
  "https://wjimvcyzunfgaqzthdbd.supabase.co/storage/v1/object/public/company-media/job-defaults/15.webp",
]

/** 文字列シードから安定したハッシュ値（FNV-1a 風）を作る */
function hashSeed(seed: string): number {
  let h = 2166136261
  for (let i = 0; i < seed.length; i++) {
    h ^= seed.charCodeAt(i)
    h = Math.imul(h, 16777619)
  }
  return h >>> 0
}

/**
 * 候補配列とシードから 1 枚を決定的に選ぶ純関数（テスト用に分離）。
 * 候補が空なら null。
 */
export function pickFromImages(
  images: string[],
  seed: string
): string | null {
  if (images.length === 0) return null
  return images[hashSeed(seed) % images.length]
}

/**
 * 求人 ID 等のシードから、フォールバック画像を 1 枚決定的に選ぶ。
 * 候補が無ければ null（呼び出し側で従来のネイビー帯にフォールバック）。
 */
export function pickDefaultJobImage(seed: string): string | null {
  return pickFromImages(DEFAULT_JOB_IMAGES, seed)
}
