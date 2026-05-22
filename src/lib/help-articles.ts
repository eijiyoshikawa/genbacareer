/**
 * ヘルプ記事の構成定義（求職者向け / 求人掲載側）
 *
 * Article モデルの category フィールドに以下の値を持つ前提で運用する：
 *   - "help-seeker"   求職者向けマニュアル
 *   - "help-employer" 企業向けマニュアル
 *
 * subcategory にトピックグループ（getting-started, search, etc.）を入れて
 * 章立てを表現する。
 *
 * 本ファイルは雛形（タイトル・概要のみ）。実際の本文は管理画面 (/admin/articles)
 * から編集する想定。seed-help-articles.ts で初回投入できる。
 */

export interface HelpArticleStub {
  slug: string
  title: string
  excerpt: string
  subcategory: string
}

export interface HelpSection {
  /** subcategory として使う英字キー */
  key: string
  /** UI 表示用ラベル */
  label: string
  articles: HelpArticleStub[]
}

/**
 * 求職者向けヘルプ
 */
export const SEEKER_HELP_SECTIONS: HelpSection[] = [
  {
    key: "getting-started",
    label: "はじめに",
    articles: [
      {
        slug: "seeker-signup",
        title: "会員登録の流れ",
        excerpt:
          "メールアドレスでの会員登録手順と、確認メールの受信〜認証完了までの流れをご案内します。",
        subcategory: "getting-started",
      },
      {
        slug: "seeker-login",
        title: "ログイン方法",
        excerpt:
          "メールアドレス・Google・LINE の 3 通りでログインできます。それぞれの方法を解説します。",
        subcategory: "getting-started",
      },
      {
        slug: "seeker-password-reset",
        title: "パスワードを忘れた場合",
        excerpt:
          "ログイン画面の「パスワードを忘れた方」リンクからリセット用メールを受け取り、新しいパスワードを設定する手順です。",
        subcategory: "getting-started",
      },
    ],
  },
  {
    key: "profile",
    label: "プロフィール・履歴書",
    articles: [
      {
        slug: "seeker-profile-edit",
        title: "基本情報の編集",
        excerpt:
          "氏名・電話番号・希望勤務地などのプロフィール情報を更新する方法。",
        subcategory: "profile",
      },
      {
        slug: "seeker-resume",
        title: "履歴書・職務経歴書の作成",
        excerpt:
          "サイト内で履歴書を作成し、PDF として出力できます。応募時に自動で添付されます。",
        subcategory: "profile",
      },
      {
        slug: "seeker-account-delete",
        title: "退会手続き",
        excerpt:
          "退会時のデータ削除範囲・応募中の求人の扱いについて。",
        subcategory: "profile",
      },
    ],
  },
  {
    key: "search",
    label: "求人を探す",
    articles: [
      {
        slug: "seeker-search-keyword",
        title: "キーワード検索の使い方",
        excerpt:
          "業種・職種・資格名などのキーワードで求人を絞り込む方法。",
        subcategory: "search",
      },
      {
        slug: "seeker-search-filter",
        title: "条件を絞り込む",
        excerpt:
          "地域・職種・給与・雇用形態の組み合わせで検索結果を絞り込めます。",
        subcategory: "search",
      },
      {
        slug: "seeker-search-prefecture",
        title: "エリアから探す",
        excerpt:
          "都道府県別ページから職種別の求人一覧へ移動できます。",
        subcategory: "search",
      },
    ],
  },
  {
    key: "apply",
    label: "応募する",
    articles: [
      {
        slug: "seeker-apply-flow",
        title: "応募の流れ",
        excerpt:
          "メールアドレス確認 → 求人選択 → 応募ボタン → 完了通知メールという流れです。",
        subcategory: "apply",
      },
      {
        slug: "seeker-apply-message",
        title: "応募メッセージの書き方",
        excerpt:
          "志望動機や自己 PR を簡潔にまとめると返信率が上がります。サンプル例を掲載。",
        subcategory: "apply",
      },
      {
        slug: "seeker-apply-status",
        title: "応募状況を確認する",
        excerpt:
          "マイページから書類選考中・面接予定・内定などのステータスを追跡できます。",
        subcategory: "apply",
      },
    ],
  },
  {
    key: "faq",
    label: "よくある質問",
    articles: [
      {
        slug: "seeker-faq",
        title: "よくある質問（求職者向け）",
        excerpt:
          "登録・応募・退会など、求職者の方からよく寄せられる質問への回答集。",
        subcategory: "faq",
      },
    ],
  },
]

/**
 * 求人掲載側ヘルプ
 */
export const EMPLOYER_HELP_SECTIONS: HelpSection[] = [
  {
    key: "getting-started",
    label: "導入",
    articles: [
      {
        slug: "employer-signup",
        title: "企業登録の流れ",
        excerpt:
          "会社情報・担当者情報を登録して掲載開始までの流れをご案内します。",
        subcategory: "getting-started",
      },
      {
        slug: "employer-team",
        title: "企業ユーザーの追加",
        excerpt:
          "管理者・メンバー権限のメンバーを追加し、複数人で運用する方法。",
        subcategory: "getting-started",
      },
    ],
  },
  {
    key: "jobs",
    label: "求人投稿",
    articles: [
      {
        slug: "employer-job-create",
        title: "新しい求人を投稿する",
        excerpt:
          "タイトル・職種・給与・勤務地・雇用形態などの入力手順。",
        subcategory: "jobs",
      },
      {
        slug: "employer-job-writing-tips",
        title: "応募が来る求人の書き方",
        excerpt:
          "タイトル設計・福利厚生の見せ方・写真の選び方など、採用率を上げるコツ。",
        subcategory: "jobs",
      },
      {
        slug: "employer-job-pricing",
        title: "給与レンジの記載ガイド",
        excerpt:
          "ノンデスク産業向けの給与記載ベストプラクティスと注意点。",
        subcategory: "jobs",
      },
      {
        slug: "employer-job-edit-close",
        title: "求人の編集と募集終了",
        excerpt:
          "募集中の求人を編集する方法、内容変更時の注意点、募集終了の手順。",
        subcategory: "jobs",
      },
    ],
  },
  {
    key: "applications",
    label: "応募者管理",
    articles: [
      {
        slug: "employer-application-list",
        title: "応募者一覧の見方",
        excerpt:
          "応募者の一覧表示と並び替え、検索の方法。",
        subcategory: "applications",
      },
      {
        slug: "employer-application-status",
        title: "選考ステータスの管理",
        excerpt:
          "書類選考中・面接予定・内定・不採用などのステータス更新。",
        subcategory: "applications",
      },
      {
        slug: "employer-application-message",
        title: "応募者へメッセージを送る",
        excerpt:
          "面接日程の調整・追加質問など、応募者とのコミュニケーション方法。",
        subcategory: "applications",
      },
    ],
  },
  {
    key: "billing",
    label: "料金・請求",
    articles: [
      {
        slug: "employer-billing-pricing",
        title: "料金体系のご案内",
        excerpt:
          "成果報酬制（採用決定時のみ課金）の仕組みと金額。",
        subcategory: "billing",
      },
      {
        slug: "employer-billing-invoice",
        title: "請求書・領収書のダウンロード",
        excerpt:
          "管理画面から各月の請求書 PDF をダウンロードする方法。",
        subcategory: "billing",
      },
      {
        slug: "employer-billing-payment",
        title: "支払い方法について",
        excerpt:
          "マネーフォワード クラウド請求書経由の銀行振込について。",
        subcategory: "billing",
      },
    ],
  },
  {
    key: "faq",
    label: "よくある質問",
    articles: [
      {
        slug: "employer-faq",
        title: "よくある質問（企業向け）",
        excerpt:
          "登録・求人投稿・スカウト・課金など、企業からよく寄せられる質問への回答集。",
        subcategory: "faq",
      },
    ],
  },
]

/**
 * audience（"seeker" / "employer"）から該当のセクション一覧を返す。
 */
export function getHelpSections(
  audience: "seeker" | "employer"
): HelpSection[] {
  return audience === "seeker"
    ? SEEKER_HELP_SECTIONS
    : EMPLOYER_HELP_SECTIONS
}

/** Article.category に入れる値 */
export function helpCategory(audience: "seeker" | "employer"): string {
  return audience === "seeker" ? "help-seeker" : "help-employer"
}
