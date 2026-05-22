import Link from "next/link"
import type { Metadata } from "next"
import {
  ArrowLeft,
  Target,
  Compass,
  ListChecks,
  Search,
  ShieldCheck,
  Sparkles,
  AlertTriangle,
  Image as ImageIcon,
  Bot,
  Link as LinkIcon,
  CheckCircle2,
  Quote,
} from "lucide-react"

export const metadata: Metadata = {
  title: "記事執筆ガイドライン",
  robots: { index: false, follow: false },
}

export default function ArticleGuidelinesPage() {
  return (
    <article className="prose prose-sm max-w-none text-gray-800">
      <Link
        href="/admin/docs"
        className="press inline-flex items-center gap-1 text-xs text-gray-500 hover:text-primary-600 no-underline"
      >
        <ArrowLeft className="h-3.5 w-3.5" />
        ドキュメント一覧に戻る
      </Link>

      <header className="mt-3 mb-8 not-prose">
        <p className="text-xs font-bold text-primary-600 tracking-wide">
          EDITORIAL HANDBOOK
        </p>
        <h1 className="mt-1 text-2xl sm:text-3xl font-extrabold text-gray-900">
          記事執筆ガイドライン
        </h1>
        <p className="mt-2 text-sm text-gray-600 leading-relaxed">
          建設業界の求人サイト「ゲンバキャリア」マガジンの記事を執筆・編集する
          すべてのメンバーが必ず守るべき品質基準・SEO ルール・E-E-A-T 設計を
          まとめたマニュアルです。新規執筆の前に必ず通読してください。
        </p>
        <p className="mt-3 text-[11px] text-gray-400">最終更新: 2026 年 5 月 20 日</p>
      </header>

      {/* === 目次 === */}
      <nav className="not-prose mb-10 border bg-warm-50 p-4">
        <p className="text-xs font-bold text-gray-700 mb-2">目次</p>
        <ol className="space-y-1 text-xs text-gray-700">
          {[
            { id: "mission", n: 1, label: "ミッションとターゲット読者" },
            { id: "intent", n: 2, label: "検索ニーズ 4 タイプの理解" },
            { id: "templates", n: 3, label: "記事タイプ別テンプレート" },
            { id: "seo", n: 4, label: "SEO 設計の基本ルール" },
            { id: "structure", n: 5, label: "見出し構造と読まれる書き方" },
            { id: "eeat", n: 6, label: "E-E-A-T (信頼性) を担保する書き方" },
            { id: "keywords", n: 7, label: "キーワード戦略" },
            { id: "internal", n: 8, label: "内部リンクの貼り方" },
            { id: "images", n: 9, label: "画像・OG 画像のルール" },
            { id: "ng", n: 10, label: "使ってはいけない表現・NG リスト" },
            { id: "ai", n: 11, label: "AI 補助の使い方とリスク" },
            { id: "review", n: 12, label: "レビュー・公開フロー" },
            { id: "checklist", n: 13, label: "公開前チェックリスト" },
          ].map((t) => (
            <li key={t.id}>
              <a
                href={`#${t.id}`}
                className="press hover:text-primary-600 no-underline"
              >
                {t.n}. {t.label}
              </a>
            </li>
          ))}
        </ol>
      </nav>

      {/* === 1. ミッションとターゲット読者 === */}
      <Section id="mission" no={1} icon={<Target className="h-5 w-5" />} title="ミッションとターゲット読者">
        <p>
          ゲンバキャリアのマガジンは「<strong>建設業界で働きたい・働き続けたい
          人を、誇張のないファクトベース情報で支える</strong>」ことを使命と
          しています。記事のすべてはこのミッションに従って書かれます。
        </p>

        <h3 className="font-bold mt-4">ターゲット読者 (Persona)</h3>
        <Persona
          name="P1 / 未経験で建設業に興味がある人 (20〜30 代)"
          situation="他業種で働いており「手に職をつけたい」「現場で体を動かしたい」と転職を検討中。建設業の知識は薄い。"
          needs="職種の違い・年収相場・きつさの実態・未経験 OK 求人の探し方"
        />
        <Persona
          name="P2 / 建設業界の現役プレイヤー (経験 3〜10 年)"
          situation="現場で働いているが「もっと条件の良い会社」「資格取得で次のステップ」を探している。"
          needs="資格取得ノウハウ・職長 / 監督へのキャリアパス・年収アップの実例"
        />
        <Persona
          name="P3 / 建設会社の採用担当者"
          situation="人手不足で求人が集まらない。応募の質を上げたい。"
          needs="求人原稿の書き方・自社の魅力の伝え方・採用市場の動向"
        />
        <p className="mt-3 text-sm text-gray-600">
          各記事の冒頭で「この記事はこんな方向け」を明示し、ターゲットの 1〜2
          ペルソナに絞って書いてください。全部に当てはまる記事は誰にも刺さりません。
        </p>
      </Section>

      {/* === 2. 検索ニーズの理解 === */}
      <Section id="intent" no={2} icon={<Compass className="h-5 w-5" />} title="検索ニーズ 4 タイプの理解">
        <p>
          Google は検索クエリを <strong>4 タイプの検索意図</strong>{" "}
          (Know / Do / Go / Buy) に分けて評価します。記事を書く前に必ずこの
          いずれにマッチするかを決めてください。
        </p>
        <table className="not-prose mt-3 w-full text-xs border-collapse">
          <thead>
            <tr className="bg-gray-50">
              <th className="border p-2 text-left">タイプ</th>
              <th className="border p-2 text-left">クエリ例</th>
              <th className="border p-2 text-left">記事タイプ</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td className="border p-2 font-bold">Know (知りたい)</td>
              <td className="border p-2">「鳶 仕事内容」「施工管理 とは」</td>
              <td className="border p-2">職種解説 / 業界知識</td>
            </tr>
            <tr>
              <td className="border p-2 font-bold">Do (やりたい)</td>
              <td className="border p-2">「1 級施工管理技士 勉強法」</td>
              <td className="border p-2">資格・免許 / How-To</td>
            </tr>
            <tr>
              <td className="border p-2 font-bold">Go (行きたい)</td>
              <td className="border p-2">「東京 建築 求人」</td>
              <td className="border p-2">LP (Prefecture × Category)</td>
            </tr>
            <tr>
              <td className="border p-2 font-bold">Buy (応募したい)</td>
              <td className="border p-2">「月給 30 万 建設 寮あり」</td>
              <td className="border p-2">求人検索結果 / 体験談</td>
            </tr>
          </tbody>
        </table>
        <p className="mt-3 text-sm text-gray-600">
          Know と Do は記事 (マガジン)、Go と Buy は LP (求人検索) で受けます。
          マガジン記事は Know / Do に絞ることで CV から逆引きせず、独立した
          自然流入チャネルとして機能します。
        </p>
      </Section>

      {/* === 3. 記事テンプレート === */}
      <Section id="templates" no={3} icon={<ListChecks className="h-5 w-5" />} title="記事タイプ別テンプレート">
        <Template
          name="A. 職種解説 (Know)"
          example="「鳶職とは? 仕事内容・給与・キャリアパスを 1 級鳶職人が解説」"
          structure={[
            "リード (誰向け・何が分かるか)",
            "鳶職とは — 定義と種類 (足場鳶・鉄骨鳶・重量鳶)",
            "1 日のスケジュール (時系列で)",
            "給与レンジ (国交省統計・自社求人 平均)",
            "必要な資格 / 体力・スキル",
            "キャリアパス (見習い → 職長 → 親方 / 独立)",
            "向いている人 / 向いていない人",
            "FAQ (5 問程度)",
            "関連求人 LP への CTA",
          ]}
        />
        <Template
          name="B. 資格・免許 (Do)"
          example="「1 級施工管理技士の合格率・勉強時間・学科 vs 実地のコツ」"
          structure={[
            "リード + 結論 (合格率 X%、必要 Y 時間)",
            "資格の概要・取得メリット (年収 +α / 役割)",
            "受験資格・スケジュール",
            "学科試験対策 (頻出分野 / おすすめ教材)",
            "実地試験 / 実務経験論文の書き方",
            "合格者の体験談 (引用または取材)",
            "次のステップ (1 級 → 監理技術者 / 独立)",
            "関連資格 LP リンク",
          ]}
        />
        <Template
          name="C. 年収・給与 (Know + Buy)"
          example="「電気工事士の年収はいくら? 第二種・第一種・主任技術者で比較」"
          structure={[
            "結論 (中央値・レンジ)",
            "国交省 / 厚労省 統計の引用",
            "資格別 / 経験別 給与テーブル",
            "地域別の差 (東京と地方)",
            "年収を上げる 3 つの方法 (資格 / 転職 / 独立)",
            "関連 求人ボリューム表示 (該当 LP リンク)",
          ]}
        />
        <Template
          name="D. 転職・キャリア (Know)"
          example="「30 代未経験から建設業へ転職する 5 つの注意点」"
          structure={[
            "リード + 結論",
            "30 代未経験のリアル (採用市場のデータ)",
            "注意点 1〜5 (各見出し H3、具体例 1 件以上)",
            "成功事例 / 失敗事例",
            "おすすめの職種 (3 つ程度)",
            "求人検索 CTA",
          ]}
        />
        <Template
          name="E. 体験談・インタビュー (interview)"
          example="「未経験から職長に。3 年で年収 250 万→480 万になった工務店勤務 28 歳の話」"
          structure={[
            "プロフィール (年齢・職種・経験年数・所在地)",
            "なぜ建設業界を選んだか (動機)",
            "1 年目 / 2 年目 / 3 年目で何があったか",
            "印象に残った現場・人",
            "年収の変化 (具体的な数字)",
            "今後やりたいこと",
            "未経験で挑戦したい人へのメッセージ",
          ]}
        />
      </Section>

      {/* === 4. SEO 基本 === */}
      <Section id="seo" no={4} icon={<Search className="h-5 w-5" />} title="SEO 設計の基本ルール">
        <h3 className="font-bold">タイトル (Article.title)</h3>
        <ul>
          <li>
            <strong>32〜40 文字</strong> (検索結果の表示限界目安)
          </li>
          <li>主要キーワードを<strong>左端 12 文字以内</strong>に</li>
          <li>
            数字 / 期間 / 結論を含めると CTR が上がる<br />
            ◯ 「1 級施工管理技士の合格率 24%・勉強時間 500h・体験談 3 件」<br />
            × 「施工管理技士について」
          </li>
        </ul>
        <h3 className="font-bold mt-4">メタディスクリプション (Article.metaDescription)</h3>
        <ul>
          <li>
            <strong>120〜140 文字</strong>
          </li>
          <li>
            タイトルにない補足キーワードを足すと検索一致面積が広がる
          </li>
          <li>「この記事で分かること」を冒頭に</li>
        </ul>
        <h3 className="font-bold mt-4">スラッグ (Article.slug)</h3>
        <ul>
          <li>
            英数ハイフンのみ、<strong>3〜5 単語</strong>に
          </li>
          <li>
            ◯ <code>tobi-salary-career</code> / <code>1kyu-sekou-passing-rate</code>
          </li>
          <li>
            × <code>20260520-article-about-construction-manager-tobi-and-salary</code>{" "}
            (長すぎる)
          </li>
        </ul>
        <h3 className="font-bold mt-4">タグ (Article.tags)</h3>
        <ul>
          <li>
            5〜8 個。検索意図に直結するワード (「鳶」「年収」「未経験」など)
          </li>
          <li>同じタグが 5 件以上溜まると <code>/tags/[tag]</code> ページが
            自然に強くなる</li>
        </ul>
      </Section>

      {/* === 5. 見出し構造 === */}
      <Section id="structure" no={5} icon={<ListChecks className="h-5 w-5" />} title="見出し構造と読まれる書き方">
        <ul>
          <li>
            <strong>H1 は記事タイトルのみ</strong>。本文中で H1 を再利用しない
          </li>
          <li>
            セクションは <strong>H2</strong>、サブセクションは <strong>H3</strong>
            。H4 以下はほぼ使わない
          </li>
          <li>
            <strong>各 H2 は 200〜600 字</strong> を目安に。短すぎると薄く、
            長すぎると読まれない
          </li>
          <li>
            記事冒頭 200 字以内に「<strong>この記事で分かる結論</strong>
            」を提示 (PREP 法の P)
          </li>
          <li>
            箇条書きは 3〜7 項目。それ以上ならグループ化する
          </li>
          <li>
            数字・固有名詞・期間は<strong>具体的</strong>に。「最近」「多い」
            「だいたい」は使わない
          </li>
        </ul>
        <BlockQuote>
          結論 → 理由 → 具体例 → 再結論 (PREP 法) を意識して書くと、
          ユーザーが途中離脱しても主旨を持ち帰れる記事になります。
          滞在時間が伸び、検索順位の安定に直結します。
        </BlockQuote>
      </Section>

      {/* === 6. E-E-A-T === */}
      <Section id="eeat" no={6} icon={<ShieldCheck className="h-5 w-5" />} title="E-E-A-T (信頼性) を担保する書き方">
        <p>
          Google が品質評価で重視する <strong>Experience / Expertise /
          Authoritativeness / Trustworthiness</strong> シグナルを記事内で
          明示します。
        </p>
        <ul>
          <li>
            <strong>Experience</strong>: 著者の現場経験を具体例で示す<br />
            例「ゼネコンで施工管理を 12 年経験した著者の所感では...」
          </li>
          <li>
            <strong>Expertise</strong>: 著者の保有資格を本文末に明記<br />
            例「執筆者: 武田 賢二 (一級施工管理技士)」
          </li>
          <li>
            <strong>Authoritativeness</strong>: 公的統計・公式情報を必ず 1〜2 件
            引用 (国交省 / 厚労省 / 業界団体)
          </li>
          <li>
            <strong>Trustworthiness</strong>: 推測には「と考えられます」、
            体験には「筆者の経験では」と{" "}
            <strong>出典・主観を明確に区別</strong>
          </li>
        </ul>
        <h3 className="font-bold mt-4">出典の引用ルール</h3>
        <ul>
          <li>本文中に「(出典: 国土交通省『令和 X 年度 建設業就業者数』)」</li>
          <li>
            一次情報 (PDF / 公式統計) は外部リンクで{" "}
            <code>rel=&quot;noopener nofollow&quot;</code> を付ける
          </li>
          <li>
            個人ブログ・まとめサイトは原則禁止。引用する場合は
            「個人ブログでは...という意見も見られる」と表現を弱める
          </li>
        </ul>
      </Section>

      {/* === 7. キーワード戦略 === */}
      <Section id="keywords" no={7} icon={<Search className="h-5 w-5" />} title="キーワード戦略">
        <h3 className="font-bold">主要 KW と派生 KW を最初にリスト化</h3>
        <p>記事を書く前に、以下を必ず紙またはエディタに書き出します:</p>
        <ol>
          <li>
            <strong>メイン KW</strong> 1 つ (例: 「1 級施工管理技士」)
          </li>
          <li>
            <strong>ロングテール KW</strong> 3〜5 個 (例: 「1 級施工管理技士
            合格率」「勉強時間」「過去問」)
          </li>
          <li>
            <strong>共起 KW</strong> 5〜10 個 (例: 「監理技術者」「主任技術者」
            「実地試験」「学科」)
          </li>
        </ol>
        <p>
          メイン KW はタイトル + 本文中 (H2 含む) で <strong>4〜8 回</strong>。
          詰め込みすぎは逆効果なので「読んで自然」を最優先。
        </p>

        <h3 className="font-bold mt-4">「ゲンバキャリア」と言われるための狙い目領域</h3>
        <ul>
          <li>
            建設業特化 × ロングテールは大手 (マイナビ / doda) が手薄
          </li>
          <li>
            <strong>地域 × 職種 × 給与</strong> の 3 軸組み合わせは強い穴場
          </li>
          <li>
            「<strong>体験談</strong>」「<strong>1 日の流れ</strong>」「
            <strong>きつい本当の理由</strong>」など主観コンテンツは差別化
          </li>
          <li>
            資格系は「合格率 / 勉強時間 / 過去問」の 3 点セットで強い
          </li>
        </ul>
      </Section>

      {/* === 8. 内部リンク === */}
      <Section id="internal" no={8} icon={<LinkIcon className="h-5 w-5" />} title="内部リンクの貼り方">
        <p>
          記事内に最低 <strong>3〜5 件</strong> の内部リンクを必ず貼ります。
          記事を孤立させると検索評価が伸びません。
        </p>
        <h3 className="font-bold">貼るべきリンク先</h3>
        <ul>
          <li>
            関連 LP: <code>/jobs?category=management</code>,{" "}
            <code>/tokyo</code>, <code>/tokyo/management</code>
          </li>
          <li>
            関連資格 LP: <code>/license/ikkyu-sekou-kanri</code> 等
          </li>
          <li>
            関連年収 LP: <code>/salary/400man</code>
          </li>
          <li>
            関連記事 (同カテゴリ・同タグ)
          </li>
          <li>
            著者プロフィール: <code>/authors/[slug]</code> (記事末)
          </li>
        </ul>
        <h3 className="font-bold mt-4">アンカーテキストのルール</h3>
        <ul>
          <li>
            ◯「<strong>東京の施工管理求人を見る</strong>」<br />
            × 「<strong>こちら</strong>」「<strong>詳しくはこの記事</strong>」
          </li>
          <li>
            内部リンクは <code>rel</code> 属性なし (default で OK)
          </li>
          <li>
            外部リンクは <code>target=&quot;_blank&quot; rel=&quot;noopener&quot;</code>
          </li>
        </ul>
      </Section>

      {/* === 9. 画像 === */}
      <Section id="images" no={9} icon={<ImageIcon className="h-5 w-5" />} title="画像・OG 画像のルール">
        <ul>
          <li>
            アイキャッチ: <strong>1200 × 630px</strong> (OG 画像兼用) / JPEG
            または WebP / 200KB 以下
          </li>
          <li>
            本文中の画像: 幅 1200px 以下、JPEG / WebP、各 200KB 以下
          </li>
          <li>
            画像 1 枚あたり 1 行の <strong>alt テキスト必須</strong>。装飾画像でも
            空文字でなく説明を書く
          </li>
          <li>
            <strong>ライセンス確認は必須</strong>。Unsplash / Pexels / 自社撮影
            / 取材先承諾済みのみ。Google 画像検索からの転用は厳禁
          </li>
          <li>
            社員・取材対象の顔は<strong>掲載前に書面承諾</strong>を取る
          </li>
        </ul>
      </Section>

      {/* === 10. NG リスト === */}
      <Section id="ng" no={10} icon={<AlertTriangle className="h-5 w-5" />} title="使ってはいけない表現・NG リスト">
        <h3 className="font-bold">誇張・断定</h3>
        <ul>
          <li>「絶対」「必ず」「100% 受かる」「No.1」「業界最高」</li>
          <li>「誰でも稼げる」「未経験で年収 1000 万」</li>
          <li>「最短 1 ヶ月で職長に」(根拠不明)</li>
        </ul>
        <h3 className="font-bold mt-4">法令・規格違反の助言</h3>
        <ul>
          <li>「資格なしで電気工事しても大丈夫」</li>
          <li>「ヘルメット無しでも問題ない」</li>
          <li>「無免許で重機を操作できる」</li>
        </ul>
        <h3 className="font-bold mt-4">差別・揶揄</h3>
        <ul>
          <li>「土方」「ガテン系」など蔑称的に使われる用語は避ける</li>
          <li>女性・外国人・若年・高齢に対する固定観念表現</li>
          <li>特定の企業名を貶める書き方</li>
        </ul>
        <h3 className="font-bold mt-4">過度な煽り</h3>
        <ul>
          <li>「知らないと損する」「これを見ないと一生後悔する」</li>
          <li>「ヤバい」「神」など SNS スラング (体験談で本人の発言として
            引用する場合のみ可)
          </li>
        </ul>
      </Section>

      {/* === 11. AI 補助 === */}
      <Section id="ai" no={11} icon={<Bot className="h-5 w-5" />} title="AI 補助の使い方とリスク">
        <p>
          下書きは Claude / ChatGPT / Gemini で生成して構いません。ただし
          <strong>必ず人がファクトチェック・リライト</strong>してから公開します。
        </p>
        <h3 className="font-bold">AI が間違いやすいポイント</h3>
        <ul>
          <li>
            <strong>資格試験の合格率・受験日</strong> (古い情報を返す)
          </li>
          <li>
            <strong>給与レンジ</strong> (海外データと混在することがある)
          </li>
          <li>
            <strong>法令・規格の引用</strong> (条文番号を誤ることがある)
          </li>
          <li>
            <strong>具体的な人物・企業の体験談</strong> (架空の事例を生成する)
          </li>
        </ul>
        <h3 className="font-bold mt-4">使ってよい用途</h3>
        <ul>
          <li>記事構成案・見出しリストの草案</li>
          <li>文章のリライト (より平易に / よりプロっぽく)</li>
          <li>
            メタディスクリプションの候補出し (10 案出して 1 つ選ぶ)
          </li>
          <li>誤字脱字・冗長表現の指摘</li>
        </ul>
      </Section>

      {/* === 12. レビュー === */}
      <Section id="review" no={12} icon={<Sparkles className="h-5 w-5" />} title="レビュー・公開フロー">
        <ol>
          <li>
            <strong>下書き作成 (Status: draft)</strong>: 執筆者が
            管理画面で記事を作成
          </li>
          <li>
            <strong>セルフチェック</strong>: 下記の公開前チェックリスト 13 項目を
            自分で確認
          </li>
          <li>
            <strong>編集レビュー</strong>: 別メンバーに依頼。事実誤認・誇張・
            読みにくさを指摘
          </li>
          <li>
            <strong>必要なら専門家監修</strong>: 資格・法令・施工管理など専門性が
            高い記事は有資格者に内容確認を依頼
          </li>
          <li>
            <strong>公開 (Status: published, publishedAt set)</strong>: 公開後は
            勝手に編集せず、修正は updatedAt 更新で履歴を残す
          </li>
          <li>
            <strong>初動チェック</strong>: 公開後 24h で Search Console の
            「URL 検査」でインデックス申請
          </li>
        </ol>
      </Section>

      {/* === 13. チェックリスト === */}
      <Section id="checklist" no={13} icon={<CheckCircle2 className="h-5 w-5" />} title="公開前チェックリスト">
        <div className="not-prose grid gap-2 my-4">
          {[
            "タイトル 32〜40 字、主要 KW が左寄せ",
            "メタディスクリプション 120〜140 字、補足 KW あり",
            "スラッグ 英数ハイフン 3〜5 単語",
            "リード (冒頭 200 字) で結論を提示",
            "H2 が 3〜7 個、各 200〜600 字",
            "数字・期間・固有名詞が具体的",
            "公的統計の出典が 1 件以上",
            "内部リンク 3〜5 件以上 (LP / 関連記事 / 著者)",
            "アイキャッチ 1200×630, 200KB 以下, alt 完備",
            "誇張・断定・差別語が無い",
            "AI 草稿の場合は最低 30% リライト済み",
            "著者プロフィールが正しく紐づいている",
            "タグ 5〜8 個 (検索意図に直結)",
          ].map((item, i) => (
            <label
              key={i}
              className="flex items-start gap-2 border border-gray-200 bg-white p-2.5 hover:bg-warm-50 cursor-pointer"
            >
              <input
                type="checkbox"
                className="mt-0.5 h-4 w-4 accent-primary-600 shrink-0"
              />
              <span className="text-xs text-gray-700">
                <span className="font-bold text-gray-400 mr-1.5">
                  {String(i + 1).padStart(2, "0")}
                </span>
                {item}
              </span>
            </label>
          ))}
        </div>
        <p className="text-xs text-gray-500">
          ※ このチェックリストはあくまで補助です。チェックを入れただけで
          品質が担保されるわけではないので、各項目の主旨に立ち戻って
          実質的に確認してください。
        </p>
      </Section>

      {/* === Footer link === */}
      <footer className="not-prose mt-12 border-t pt-6 flex items-center justify-between text-xs text-gray-500">
        <Link
          href="/admin/articles"
          className="press inline-flex items-center gap-1 text-primary-600 font-bold hover:text-primary-700 no-underline"
        >
          記事管理画面へ →
        </Link>
        <Link
          href="/editorial-policy"
          className="press hover:text-primary-600 no-underline"
          target="_blank"
          rel="noopener"
        >
          公開用 編集ポリシー (外部公開) ↗
        </Link>
      </footer>
    </article>
  )
}

function Section({
  id,
  no,
  icon,
  title,
  children,
}: {
  id: string
  no: number
  icon: React.ReactNode
  title: string
  children: React.ReactNode
}) {
  return (
    <section id={id} className="not-prose mt-10 scroll-mt-20">
      <h2 className="flex items-center gap-2 text-lg sm:text-xl font-bold text-gray-900">
        <span className="flex h-7 w-7 items-center justify-center bg-primary-50 text-primary-600">
          {icon}
        </span>
        <span className="text-primary-600 text-sm">{String(no).padStart(2, "0")}</span>
        {title}
      </h2>
      <div className="mt-3 text-sm text-gray-800 leading-relaxed space-y-2 [&_ul]:list-disc [&_ul]:ml-5 [&_ul]:space-y-1 [&_ol]:list-decimal [&_ol]:ml-5 [&_ol]:space-y-1 [&_h3]:text-sm [&_h3]:font-bold [&_h3]:text-gray-900 [&_code]:bg-gray-100 [&_code]:px-1 [&_code]:py-0.5 [&_code]:text-xs [&_code]:rounded-sm">
        {children}
      </div>
    </section>
  )
}

function Persona({
  name,
  situation,
  needs,
}: {
  name: string
  situation: string
  needs: string
}) {
  return (
    <div className="my-3 border-l-3 border-l-primary-400 bg-warm-50 pl-3 py-2">
      <p className="font-bold text-gray-900 text-sm">{name}</p>
      <p className="mt-1 text-xs text-gray-700">
        <span className="font-bold">状況:</span> {situation}
      </p>
      <p className="mt-0.5 text-xs text-gray-700">
        <span className="font-bold">ニーズ:</span> {needs}
      </p>
    </div>
  )
}

function Template({
  name,
  example,
  structure,
}: {
  name: string
  example: string
  structure: string[]
}) {
  return (
    <div className="my-4 border bg-white p-3">
      <p className="font-bold text-gray-900 text-sm">{name}</p>
      <p className="mt-1 text-[11px] text-gray-500">例: {example}</p>
      <ol className="mt-2 space-y-0.5 text-xs text-gray-700 list-decimal ml-5">
        {structure.map((s, i) => (
          <li key={i}>{s}</li>
        ))}
      </ol>
    </div>
  )
}

function BlockQuote({ children }: { children: React.ReactNode }) {
  return (
    <blockquote className="my-4 border-l-3 border-l-amber-400 bg-amber-50 px-3 py-2 text-xs text-gray-800">
      <Quote className="inline h-3 w-3 mr-1 text-amber-600" />
      {children}
    </blockquote>
  )
}
