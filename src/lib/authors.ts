/**
 * マガジン記事の著者プロフィール定義。
 *
 * E-E-A-T (Expertise, Experience, Authoritativeness, Trustworthiness) の
 * Authoritativeness シグナルを Google に伝えるため、各記事の著者を
 * 「資格・実務経験を持つ実在のチーム」として位置づけて構造化データに乗せる。
 *
 * 運用ポリシー:
 * - 記事の Article.authorName とこのテーブルの name を一致させる
 * - 不一致 (新規ライター追加 時など) は AUTHORS_BY_NAME のフォールバックで
 *   "ゲンバキャリア編集部" として共通プロフィールを返す
 * - 監修者がいる記事は Article.reviewer も別途 (Phase 拡張時) 持たせる
 */

export type Author = {
  /** URL スラッグ (/authors/[slug]) */
  slug: string
  /** 表示名 (Article.authorName と一致させる) */
  name: string
  /** 肩書 / 役職 */
  role: string
  /** プロフィール短文 (記事末や著者カードに表示) */
  bio: string
  /** プロフィール長文 (著者ページ用) */
  longBio: string
  /** 保有資格・実績 (E-E-A-T 強化シグナル) */
  qualifications: string[]
  /** 建設業界での実務年数 */
  yearsOfExperience: number
  /** 専門領域タグ (例: ["施工管理", "土木", "公共工事"]) */
  expertise: string[]
  /** プロフィール写真 (任意 — 未設定なら BrandLogo フォールバック) */
  photoUrl?: string
  /** 著者の外部リンク (Person.sameAs に流す) */
  sameAs?: string[]
}

export const AUTHORS: Author[] = [
  {
    slug: "genba-editorial",
    name: "ゲンバキャリア編集部",
    role: "編集部",
    bio: "建設業界 10 年以上の経験を持つ編集メンバーが、求職者・採用担当者の双方に役立つ実践的な情報を発信しています。",
    longBio:
      "ゲンバキャリア編集部は、施工管理・土木・建築・電気設備など建設業界各領域での実務経験を持つメンバーで構成されています。求職者の方には「現場のリアル」を、企業の採用担当者の方には「採用市場の最新動向」を、誇張のないファクトベースで発信することを編集方針として掲げています。\n\n編集部全体での建設業界経験年数は累計 50 年を超え、保有資格には一級施工管理技士・一級建築士・一級電気工事施工管理技士・宅地建物取引士などが含まれます。記事はすべて編集部内で複数名の確認を経て公開し、定期的に内容の見直しと加筆を行っています。",
    qualifications: [
      "一級施工管理技士",
      "一級建築士",
      "一級電気工事施工管理技士",
      "宅地建物取引士",
    ],
    yearsOfExperience: 10,
    expertise: ["建設業界全般", "採用市場", "キャリア", "資格"],
    sameAs: [],
  },
  {
    slug: "takeda-kenji",
    name: "武田 賢二",
    role: "シニアエディター / 一級施工管理技士",
    bio: "建設業界 18 年。大手ゼネコンで施工管理として 12 年勤務した後、現場のリアルを伝えるべく編集者へ転身。",
    longBio:
      "武田 賢二は、大手ゼネコンにて 12 年間にわたり建築・土木の施工管理に従事しました。担当案件は高層オフィスビル、商業施設、地下鉄駅改修工事など多岐にわたります。「現場で実際に何が起きているか」を求職者の方に正確に伝えることをライフワークとし、2020 年からゲンバキャリア編集部のシニアエディターとして記事を執筆・監修しています。\n\n建設業界における人手不足の解消には、業界の外から見た「ブラックなイメージ」を払拭することが不可欠との信念のもと、現場の働き方改革・賃金水準の実態・キャリアパスの多様性などを率直に発信しています。",
    qualifications: [
      "一級施工管理技士 (建築)",
      "一級施工管理技士 (土木)",
      "コンクリート技士",
    ],
    yearsOfExperience: 18,
    expertise: ["施工管理", "現場監督", "建築", "土木", "キャリアパス"],
    sameAs: [],
  },
  {
    slug: "okada-aya",
    name: "岡田 彩",
    role: "HR スペシャリスト / 採用コンサルタント",
    bio: "建設業界の採用コンサルタント歴 8 年。中小ゼネコン〜地域工務店まで 100 社以上の採用支援に従事。",
    longBio:
      "岡田 彩は、建設業界専門の人材紹介会社で 8 年間にわたり採用コンサルタントとして従事してきました。中小ゼネコン、専門工事会社、地域工務店、設備工事会社など、これまで 100 社以上の採用支援プロジェクトに携わり、企業の採用課題と求職者のキャリア形成の両面に深く向き合ってきました。\n\nゲンバキャリアでは主に「採用担当者向けの求人作成ノウハウ」「求職者向けの企業の見極め方」「給与・福利厚生の相場観」などの実践的な記事を執筆しています。建設業界の魅力を業界外の方に伝える活動にも力を入れています。",
    qualifications: [
      "国家資格キャリアコンサルタント",
      "産業カウンセラー",
    ],
    yearsOfExperience: 8,
    expertise: ["採用", "キャリアコンサルティング", "給与相場", "求人作成"],
    sameAs: [],
  },
]

/**
 * 表示名から著者プロフィールを取得。
 * 該当が無ければ既定の編集部プロフィールを返す。
 */
export function getAuthorByName(name: string | null | undefined): Author {
  if (!name) return AUTHORS[0]
  const found = AUTHORS.find((a) => a.name === name)
  return found ?? AUTHORS[0]
}

/**
 * スラッグから著者プロフィールを取得。
 */
export function getAuthorBySlug(slug: string): Author | null {
  return AUTHORS.find((a) => a.slug === slug) ?? null
}
