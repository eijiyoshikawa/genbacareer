import { prisma } from "@/lib/db"

const ARTICLE_BODY = `<p>建設業界は2026年現在、国内総生産（GDP）の約5%を占める基幹産業です。国土交通省の統計によると、建設投資額は約70兆円規模で推移しており、インフラ老朽化対策や都市再開発の需要が継続しています。</p>

<h2>建設業界の市場規模と推移</h2>
<p>建設投資額は2020年代に入ってから安定的に推移しています。政府建設投資（公共事業）と民間建設投資の内訳は以下のとおりです。</p>

<table>
<thead>
<tr><th>年度</th><th>政府建設投資</th><th>民間建設投資</th><th>合計</th></tr>
</thead>
<tbody>
<tr><td>2023年度</td><td>約25兆円</td><td>約42兆円</td><td>約67兆円</td></tr>
<tr><td>2024年度</td><td>約26兆円</td><td>約43兆円</td><td>約69兆円</td></tr>
<tr><td>2025年度（見込み）</td><td>約27兆円</td><td>約44兆円</td><td>約71兆円</td></tr>
</tbody>
</table>

<h2>人手不足の現状</h2>
<p>建設業の就業者数は約480万人（2025年時点）で、ピーク時（1997年の685万人）と比べて約30%減少しています。特に深刻なのは以下の点です。</p>
<ul>
<li>就業者の約35%が55歳以上で、高齢化が進行</li>
<li>29歳以下の若手就業者は全体の約12%にとどまる</li>
<li>技能労働者の有効求人倍率は5倍を超える職種もある</li>
</ul>
<p>この人手不足は裏を返せば、建設業界への転職を考えている方にとって大きなチャンスです。未経験者を積極的に採用する企業が増えており、入社後の資格取得支援制度も充実しています。</p>

<h2>ICT化・DXの進展</h2>
<p>人手不足への対応策として、建設業界ではICT（情報通信技術）の導入が急速に進んでいます。</p>
<ul>
<li><strong>BIM/CIM</strong>：3次元モデルを活用した設計・施工管理</li>
<li><strong>ドローン測量</strong>：広範囲の地形測量を短時間で実施</li>
<li><strong>遠隔施工管理</strong>：ウェアラブルカメラによる現場の遠隔確認</li>
<li><strong>建設ロボット</strong>：鉄筋結束、溶接、搬送の自動化</li>
</ul>

<h2>2026年以降の見通し</h2>
<p>大阪・関西万博関連の建設需要、リニア中央新幹線、老朽化インフラの更新など、建設投資を支える大型プロジェクトは今後も継続します。</p>
<p>国土交通省は建設業の処遇改善にも取り組んでおり、労務単価の引き上げや週休2日の推進が進んでいます。建設業界は「きつい・汚い・危険」のイメージから脱却しつつあり、働きやすい環境への転換が進んでいます。</p>

<h2>まとめ</h2>
<p>建設業界は市場規模が安定しており、人手不足による求人需要が旺盛な状態が続いています。ICT化の進展により働き方も変わりつつあり、未経験者にも門戸が開かれた業界です。建設業界への転職を考えている方は、まず求人情報を確認してみることをおすすめします。</p>`

export async function POST(request: Request) {
  const authHeader = request.headers.get("authorization")
  const cronSecret = process.env.CRON_SECRET
  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return Response.json({ error: "Unauthorized" }, { status: 401 })
  }

  const existing = await prisma.article.findUnique({ where: { slug: "construction-industry-overview-2026" } })
  if (existing) {
    return Response.json({ message: "Article already exists", slug: existing.slug })
  }

  const article = await prisma.article.create({
    data: {
      slug: "construction-industry-overview-2026",
      title: "建設業界の現状と将来性 — 2026年版",
      excerpt: "国内建設市場の規模推移と今後の見通しを解説。人手不足の実態とICT化の進展を踏まえた業界の将来性を分析します。",
      body: ARTICLE_BODY,
      category: "industry",
      tags: ["業界動向", "市場規模"],
      metaDescription: "2026年の建設業界の現状と将来性を解説。市場規模、人手不足、ICT化の動向をデータで分析。",
      authorName: "ゲンバキャリア編集部",
      status: "published",
      featured: true,
      publishedAt: new Date("2026-01-01T09:00:00+09:00"),
    },
  })

  return Response.json({ success: true, slug: article.slug, id: article.id })
}
