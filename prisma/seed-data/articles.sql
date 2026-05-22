-- ============================================================
-- ゲンバキャリア: 199 記事プレースホルダー投入 SQL
-- 生成日時: 2026-04-10T06:43:44.209Z
-- 使い方: この SQL を Supabase ダッシュボード → SQL Editor で実行
-- 既存の slug は ON CONFLICT DO NOTHING でスキップされるので安全
-- ============================================================

BEGIN;

INSERT INTO articles (id, slug, title, excerpt, body, category, tags, image_url, meta_description, author_name, status, featured, view_count, published_at, created_at, updated_at) VALUES (gen_random_uuid(), 'construction-industry-overview-2026', '建設業界の現状と将来性 — 2026年版', '国内建設市場の規模推移と今後の見通しを解説。人手不足の実態とICT化の進展を踏まえた業界の将来性を分析します。', '<p>国内建設市場の規模推移と今後の見通しを解説。人手不足の実態とICT化の進展を踏まえた業界の将来性を分析します。</p>

<h2>建設業界の現状と将来性について</h2>
<p>この記事では、業界動向・市場規模に関する情報を詳しく解説します。建設業界で働く方やこれから転職を検討している方に向けて、実践的な内容をまとめました。</p>

<h2>まとめ</h2>
<p>建設業界は人手不足が続いており、未経験者の方にもチャンスがある業界です。資格取得や経験を積むことで着実にキャリアアップが可能です。</p>
<p>ゲンバキャリアでは、建築・土木・設備・解体に特化した求人情報を掲載しています。あなたに合った求人を探してみてください。</p>', 'industry', ARRAY['業界動向','市場規模']::text[], NULL, '国内建設市場の規模推移と今後の見通しを解説。人手不足の実態とICT化の進展を踏まえた業界の将来性を分析します。', 'ゲンバキャリア編集部', 'published', TRUE, 0, '2026-01-01T00:00:00.000Z', NOW(), NOW()) ON CONFLICT (slug) DO NOTHING;
INSERT INTO articles (id, slug, title, excerpt, body, category, tags, image_url, meta_description, author_name, status, featured, view_count, published_at, created_at, updated_at) VALUES (gen_random_uuid(), 'construction-job-types-guide', '建設業界の職種一覧 — 仕事内容・必要資格・年収まとめ', '建築・土木・設備・内装・解体など建設業界の主要職種を網羅。それぞれの仕事内容・必要資格・年収相場を紹介。', '<p>建築・土木・設備・内装・解体など建設業界の主要職種を網羅。それぞれの仕事内容・必要資格・年収相場を紹介。</p>

<h2>建設業界の職種一覧について</h2>
<p>この記事では、職種一覧・未経験に関する情報を詳しく解説します。建設業界で働く方やこれから転職を検討している方に向けて、実践的な内容をまとめました。</p>

<h2>まとめ</h2>
<p>建設業界は人手不足が続いており、未経験者の方にもチャンスがある業界です。資格取得や経験を積むことで着実にキャリアアップが可能です。</p>
<p>ゲンバキャリアでは、建築・土木・設備・解体に特化した求人情報を掲載しています。あなたに合った求人を探してみてください。</p>', 'job-type', ARRAY['職種一覧','未経験']::text[], NULL, '建築・土木・設備・内装・解体など建設業界の主要職種を網羅。それぞれの仕事内容・必要資格・年収相場を紹介。', 'ゲンバキャリア編集部', 'published', TRUE, 0, '2026-01-02T00:00:00.000Z', NOW(), NOW()) ON CONFLICT (slug) DO NOTHING;
INSERT INTO articles (id, slug, title, excerpt, body, category, tags, image_url, meta_description, author_name, status, featured, view_count, published_at, created_at, updated_at) VALUES (gen_random_uuid(), 'construction-career-change-first-step', '未経験から建設業界へ — 転職の最初の一歩', '異業種から建設業界へ転職するためのステップを解説。求人の探し方から面接対策まで。', '<p>異業種から建設業界へ転職するためのステップを解説。求人の探し方から面接対策まで。</p>

<h2>未経験から建設業界へについて</h2>
<p>この記事では、未経験・転職に関する情報を詳しく解説します。建設業界で働く方やこれから転職を検討している方に向けて、実践的な内容をまとめました。</p>

<h2>まとめ</h2>
<p>建設業界は人手不足が続いており、未経験者の方にもチャンスがある業界です。資格取得や経験を積むことで着実にキャリアアップが可能です。</p>
<p>ゲンバキャリアでは、建築・土木・設備・解体に特化した求人情報を掲載しています。あなたに合った求人を探してみてください。</p>', 'career', ARRAY['未経験','転職']::text[], NULL, '異業種から建設業界へ転職するためのステップを解説。求人の探し方から面接対策まで。', 'ゲンバキャリア編集部', 'published', TRUE, 0, '2026-01-03T00:00:00.000Z', NOW(), NOW()) ON CONFLICT (slug) DO NOTHING;
INSERT INTO articles (id, slug, title, excerpt, body, category, tags, image_url, meta_description, author_name, status, featured, view_count, published_at, created_at, updated_at) VALUES (gen_random_uuid(), 'tobishoku-work-guide', '鳶職人の仕事内容 — 種類・1日の流れ・やりがい', '足場鳶・鉄骨鳶・重量鳶の違い、1日のスケジュール、仕事のやりがいと厳しさを現場目線で紹介。', '<p>足場鳶・鉄骨鳶・重量鳶の違い、1日のスケジュール、仕事のやりがいと厳しさを現場目線で紹介。</p>

<h2>鳶職人の仕事内容について</h2>
<p>この記事では、鳶職・職種解説に関する情報を詳しく解説します。建設業界で働く方やこれから転職を検討している方に向けて、実践的な内容をまとめました。</p>

<h2>まとめ</h2>
<p>建設業界は人手不足が続いており、未経験者の方にもチャンスがある業界です。資格取得や経験を積むことで着実にキャリアアップが可能です。</p>
<p>ゲンバキャリアでは、建築・土木・設備・解体に特化した求人情報を掲載しています。あなたに合った求人を探してみてください。</p>', 'job-type', ARRAY['鳶職','職種解説']::text[], NULL, '足場鳶・鉄骨鳶・重量鳶の違い、1日のスケジュール、仕事のやりがいと厳しさを現場目線で紹介。', 'ゲンバキャリア編集部', 'published', FALSE, 0, '2026-01-04T00:00:00.000Z', NOW(), NOW()) ON CONFLICT (slug) DO NOTHING;
INSERT INTO articles (id, slug, title, excerpt, body, category, tags, image_url, meta_description, author_name, status, featured, view_count, published_at, created_at, updated_at) VALUES (gen_random_uuid(), 'construction-worker-salary-data', '建設作業員の平均年収は？職種別・年齢別データ', '厚生労働省のデータをもとに建設作業員の平均年収を職種別・年齢別に分析。収入を上げるポイントも解説。', '<p>厚生労働省のデータをもとに建設作業員の平均年収を職種別・年齢別に分析。収入を上げるポイントも解説。</p>

<h2>建設作業員の平均年収は？職種別・年齢別データについて</h2>
<p>この記事では、年収・統計に関する情報を詳しく解説します。建設業界で働く方やこれから転職を検討している方に向けて、実践的な内容をまとめました。</p>

<h2>まとめ</h2>
<p>建設業界は人手不足が続いており、未経験者の方にもチャンスがある業界です。資格取得や経験を積むことで着実にキャリアアップが可能です。</p>
<p>ゲンバキャリアでは、建築・土木・設備・解体に特化した求人情報を掲載しています。あなたに合った求人を探してみてください。</p>', 'salary', ARRAY['年収','統計']::text[], NULL, '厚生労働省のデータをもとに建設作業員の平均年収を職種別・年齢別に分析。収入を上げるポイントも解説。', 'ゲンバキャリア編集部', 'published', FALSE, 0, '2026-01-05T00:00:00.000Z', NOW(), NOW()) ON CONFLICT (slug) DO NOTHING;
INSERT INTO articles (id, slug, title, excerpt, body, category, tags, image_url, meta_description, author_name, status, featured, view_count, published_at, created_at, updated_at) VALUES (gen_random_uuid(), 'second-class-construction-management', '2級建築施工管理技士とは — 受験資格・試験内容・勉強法', '2級建築施工管理技士の受験資格、試験科目、合格率、おすすめの勉強方法を徹底解説。', '<p>2級建築施工管理技士の受験資格、試験科目、合格率、おすすめの勉強方法を徹底解説。</p>

<h2>2級建築施工管理技士とはについて</h2>
<p>この記事では、施工管理技士・資格に関する情報を詳しく解説します。建設業界で働く方やこれから転職を検討している方に向けて、実践的な内容をまとめました。</p>

<h2>まとめ</h2>
<p>建設業界は人手不足が続いており、未経験者の方にもチャンスがある業界です。資格取得や経験を積むことで着実にキャリアアップが可能です。</p>
<p>ゲンバキャリアでは、建築・土木・設備・解体に特化した求人情報を掲載しています。あなたに合った求人を探してみてください。</p>', 'license', ARRAY['施工管理技士','資格']::text[], NULL, '2級建築施工管理技士の受験資格、試験科目、合格率、おすすめの勉強方法を徹底解説。', 'ゲンバキャリア編集部', 'published', FALSE, 0, '2026-01-06T00:00:00.000Z', NOW(), NOW()) ON CONFLICT (slug) DO NOTHING;
INSERT INTO articles (id, slug, title, excerpt, body, category, tags, image_url, meta_description, author_name, status, featured, view_count, published_at, created_at, updated_at) VALUES (gen_random_uuid(), 'type2-electrician-guide', '第二種電気工事士の取得ガイド — 筆記・実技の攻略法', '第二種電気工事士の試験概要から効率的な勉強法、実技試験のコツまでを解説。', '<p>第二種電気工事士の試験概要から効率的な勉強法、実技試験のコツまでを解説。</p>

<h2>第二種電気工事士の取得ガイドについて</h2>
<p>この記事では、電気工事士・国家資格に関する情報を詳しく解説します。建設業界で働く方やこれから転職を検討している方に向けて、実践的な内容をまとめました。</p>

<h2>まとめ</h2>
<p>建設業界は人手不足が続いており、未経験者の方にもチャンスがある業界です。資格取得や経験を積むことで着実にキャリアアップが可能です。</p>
<p>ゲンバキャリアでは、建築・土木・設備・解体に特化した求人情報を掲載しています。あなたに合った求人を探してみてください。</p>', 'license', ARRAY['電気工事士','国家資格']::text[], NULL, '第二種電気工事士の試験概要から効率的な勉強法、実技試験のコツまでを解説。', 'ゲンバキャリア編集部', 'published', FALSE, 0, '2026-01-07T00:00:00.000Z', NOW(), NOW()) ON CONFLICT (slug) DO NOTHING;
INSERT INTO articles (id, slug, title, excerpt, body, category, tags, image_url, meta_description, author_name, status, featured, view_count, published_at, created_at, updated_at) VALUES (gen_random_uuid(), 'construction-resume-tips', '建設業界向け履歴書の書き方 — 採用担当が見るポイント', '建設会社の採用担当が重視する履歴書のポイント。職歴の書き方や資格欄の記載方法を具体例つきで解説。', '<p>建設会社の採用担当が重視する履歴書のポイント。職歴の書き方や資格欄の記載方法を具体例つきで解説。</p>

<h2>建設業界向け履歴書の書き方について</h2>
<p>この記事では、履歴書・面接対策に関する情報を詳しく解説します。建設業界で働く方やこれから転職を検討している方に向けて、実践的な内容をまとめました。</p>

<h2>まとめ</h2>
<p>建設業界は人手不足が続いており、未経験者の方にもチャンスがある業界です。資格取得や経験を積むことで着実にキャリアアップが可能です。</p>
<p>ゲンバキャリアでは、建築・土木・設備・解体に特化した求人情報を掲載しています。あなたに合った求人を探してみてください。</p>', 'career', ARRAY['履歴書','面接対策']::text[], NULL, '建設会社の採用担当が重視する履歴書のポイント。職歴の書き方や資格欄の記載方法を具体例つきで解説。', 'ゲンバキャリア編集部', 'published', FALSE, 0, '2026-01-08T00:00:00.000Z', NOW(), NOW()) ON CONFLICT (slug) DO NOTHING;
INSERT INTO articles (id, slug, title, excerpt, body, category, tags, image_url, meta_description, author_name, status, featured, view_count, published_at, created_at, updated_at) VALUES (gen_random_uuid(), 'civil-engineering-worker-guide', '土木作業員の仕事内容と1日の流れ', '道路・橋梁・トンネルなど土木工事の現場で働く作業員の仕事内容を詳しく紹介。', '<p>道路・橋梁・トンネルなど土木工事の現場で働く作業員の仕事内容を詳しく紹介。</p>

<h2>土木作業員の仕事内容と1日の流れについて</h2>
<p>この記事では、土木・職種解説に関する情報を詳しく解説します。建設業界で働く方やこれから転職を検討している方に向けて、実践的な内容をまとめました。</p>

<h2>まとめ</h2>
<p>建設業界は人手不足が続いており、未経験者の方にもチャンスがある業界です。資格取得や経験を積むことで着実にキャリアアップが可能です。</p>
<p>ゲンバキャリアでは、建築・土木・設備・解体に特化した求人情報を掲載しています。あなたに合った求人を探してみてください。</p>', 'job-type', ARRAY['土木','職種解説']::text[], NULL, '道路・橋梁・トンネルなど土木工事の現場で働く作業員の仕事内容を詳しく紹介。', 'ゲンバキャリア編集部', 'published', FALSE, 0, '2026-01-09T00:00:00.000Z', NOW(), NOW()) ON CONFLICT (slug) DO NOTHING;
INSERT INTO articles (id, slug, title, excerpt, body, category, tags, image_url, meta_description, author_name, status, featured, view_count, published_at, created_at, updated_at) VALUES (gen_random_uuid(), 'construction-interview-questions', '建設会社の面接でよく聞かれる質問と回答例', '建設業界特有の面接質問と好印象を与える回答例を紹介。体力面や安全意識に関する質問への対策も。', '<p>建設業界特有の面接質問と好印象を与える回答例を紹介。体力面や安全意識に関する質問への対策も。</p>

<h2>建設会社の面接でよく聞かれる質問と回答例について</h2>
<p>この記事では、面接・転職に関する情報を詳しく解説します。建設業界で働く方やこれから転職を検討している方に向けて、実践的な内容をまとめました。</p>

<h2>まとめ</h2>
<p>建設業界は人手不足が続いており、未経験者の方にもチャンスがある業界です。資格取得や経験を積むことで着実にキャリアアップが可能です。</p>
<p>ゲンバキャリアでは、建築・土木・設備・解体に特化した求人情報を掲載しています。あなたに合った求人を探してみてください。</p>', 'career', ARRAY['面接','転職']::text[], NULL, '建設業界特有の面接質問と好印象を与える回答例を紹介。体力面や安全意識に関する質問への対策も。', 'ゲンバキャリア編集部', 'published', FALSE, 0, '2026-01-10T00:00:00.000Z', NOW(), NOW()) ON CONFLICT (slug) DO NOTHING;
INSERT INTO articles (id, slug, title, excerpt, body, category, tags, image_url, meta_description, author_name, status, featured, view_count, published_at, created_at, updated_at) VALUES (gen_random_uuid(), 'tamakake-license-guide', '玉掛け技能講習の取り方 — 費用・日数・試験内容', 'クレーン作業に必須の玉掛け技能講習。申込みから修了までの流れ、費用、試験内容を解説。', '<p>クレーン作業に必須の玉掛け技能講習。申込みから修了までの流れ、費用、試験内容を解説。</p>

<h2>玉掛け技能講習の取り方について</h2>
<p>この記事では、玉掛け・技能講習に関する情報を詳しく解説します。建設業界で働く方やこれから転職を検討している方に向けて、実践的な内容をまとめました。</p>

<h2>まとめ</h2>
<p>建設業界は人手不足が続いており、未経験者の方にもチャンスがある業界です。資格取得や経験を積むことで着実にキャリアアップが可能です。</p>
<p>ゲンバキャリアでは、建築・土木・設備・解体に特化した求人情報を掲載しています。あなたに合った求人を探してみてください。</p>', 'license', ARRAY['玉掛け','技能講習']::text[], NULL, 'クレーン作業に必須の玉掛け技能講習。申込みから修了までの流れ、費用、試験内容を解説。', 'ゲンバキャリア編集部', 'published', FALSE, 0, '2026-01-11T00:00:00.000Z', NOW(), NOW()) ON CONFLICT (slug) DO NOTHING;
INSERT INTO articles (id, slug, title, excerpt, body, category, tags, image_url, meta_description, author_name, status, featured, view_count, published_at, created_at, updated_at) VALUES (gen_random_uuid(), 'construction-work-clothes', '建設現場の作業着・装備ガイド — 必須アイテム一覧', 'ヘルメット・安全帯・作業靴など建設現場で必要な装備品を紹介。選び方のポイントと費用の目安。', '<p>ヘルメット・安全帯・作業靴など建設現場で必要な装備品を紹介。選び方のポイントと費用の目安。</p>

<h2>建設現場の作業着・装備ガイドについて</h2>
<p>この記事では、装備・安全に関する情報を詳しく解説します。建設業界で働く方やこれから転職を検討している方に向けて、実践的な内容をまとめました。</p>

<h2>まとめ</h2>
<p>建設業界は人手不足が続いており、未経験者の方にもチャンスがある業界です。資格取得や経験を積むことで着実にキャリアアップが可能です。</p>
<p>ゲンバキャリアでは、建築・土木・設備・解体に特化した求人情報を掲載しています。あなたに合った求人を探してみてください。</p>', 'industry', ARRAY['装備','安全']::text[], NULL, 'ヘルメット・安全帯・作業靴など建設現場で必要な装備品を紹介。選び方のポイントと費用の目安。', 'ゲンバキャリア編集部', 'published', FALSE, 0, '2026-01-12T00:00:00.000Z', NOW(), NOW()) ON CONFLICT (slug) DO NOTHING;
INSERT INTO articles (id, slug, title, excerpt, body, category, tags, image_url, meta_description, author_name, status, featured, view_count, published_at, created_at, updated_at) VALUES (gen_random_uuid(), 'sekokan-vs-genba-worker', '施工管理と現場作業員の違い — 仕事内容・年収・キャリア', '施工管理技士と現場作業員の役割の違い、年収差、キャリアパスを比較。どちらが自分に合うか判断する材料に。', '<p>施工管理技士と現場作業員の役割の違い、年収差、キャリアパスを比較。どちらが自分に合うか判断する材料に。</p>

<h2>施工管理と現場作業員の違いについて</h2>
<p>この記事では、施工管理・比較に関する情報を詳しく解説します。建設業界で働く方やこれから転職を検討している方に向けて、実践的な内容をまとめました。</p>

<h2>まとめ</h2>
<p>建設業界は人手不足が続いており、未経験者の方にもチャンスがある業界です。資格取得や経験を積むことで着実にキャリアアップが可能です。</p>
<p>ゲンバキャリアでは、建築・土木・設備・解体に特化した求人情報を掲載しています。あなたに合った求人を探してみてください。</p>', 'job-type', ARRAY['施工管理','比較']::text[], NULL, '施工管理技士と現場作業員の役割の違い、年収差、キャリアパスを比較。どちらが自分に合うか判断する材料に。', 'ゲンバキャリア編集部', 'published', FALSE, 0, '2026-01-13T00:00:00.000Z', NOW(), NOW()) ON CONFLICT (slug) DO NOTHING;
INSERT INTO articles (id, slug, title, excerpt, body, category, tags, image_url, meta_description, author_name, status, featured, view_count, published_at, created_at, updated_at) VALUES (gen_random_uuid(), 'construction-salary-up-methods', '建設業で年収を上げる5つの方法', '資格取得・転職・独立など、建設業界で収入を上げるための具体的な5つの方法を紹介。', '<p>資格取得・転職・独立など、建設業界で収入を上げるための具体的な5つの方法を紹介。</p>

<h2>建設業で年収を上げる5つの方法について</h2>
<p>この記事では、年収アップ・キャリアに関する情報を詳しく解説します。建設業界で働く方やこれから転職を検討している方に向けて、実践的な内容をまとめました。</p>

<h2>まとめ</h2>
<p>建設業界は人手不足が続いており、未経験者の方にもチャンスがある業界です。資格取得や経験を積むことで着実にキャリアアップが可能です。</p>
<p>ゲンバキャリアでは、建築・土木・設備・解体に特化した求人情報を掲載しています。あなたに合った求人を探してみてください。</p>', 'salary', ARRAY['年収アップ','キャリア']::text[], NULL, '資格取得・転職・独立など、建設業界で収入を上げるための具体的な5つの方法を紹介。', 'ゲンバキャリア編集部', 'published', FALSE, 0, '2026-01-14T00:00:00.000Z', NOW(), NOW()) ON CONFLICT (slug) DO NOTHING;
INSERT INTO articles (id, slug, title, excerpt, body, category, tags, image_url, meta_description, author_name, status, featured, view_count, published_at, created_at, updated_at) VALUES (gen_random_uuid(), 'ashiba-license-guide', '足場の組立て等作業主任者とは — 取得方法と役割', '足場の組立て等作業主任者の技能講習の概要、受講資格、現場での役割を解説。', '<p>足場の組立て等作業主任者の技能講習の概要、受講資格、現場での役割を解説。</p>

<h2>足場の組立て等作業主任者とはについて</h2>
<p>この記事では、足場・資格に関する情報を詳しく解説します。建設業界で働く方やこれから転職を検討している方に向けて、実践的な内容をまとめました。</p>

<h2>まとめ</h2>
<p>建設業界は人手不足が続いており、未経験者の方にもチャンスがある業界です。資格取得や経験を積むことで着実にキャリアアップが可能です。</p>
<p>ゲンバキャリアでは、建築・土木・設備・解体に特化した求人情報を掲載しています。あなたに合った求人を探してみてください。</p>', 'license', ARRAY['足場','資格']::text[], NULL, '足場の組立て等作業主任者の技能講習の概要、受講資格、現場での役割を解説。', 'ゲンバキャリア編集部', 'published', FALSE, 0, '2026-01-15T00:00:00.000Z', NOW(), NOW()) ON CONFLICT (slug) DO NOTHING;
INSERT INTO articles (id, slug, title, excerpt, body, category, tags, image_url, meta_description, author_name, status, featured, view_count, published_at, created_at, updated_at) VALUES (gen_random_uuid(), 'construction-safety-basics', '建設現場の安全対策 — 新人が知っておくべき基本', 'KY活動・保護具の使い方・高所作業の注意点など、新人作業員が知っておくべき安全の基本。', '<p>KY活動・保護具の使い方・高所作業の注意点など、新人作業員が知っておくべき安全の基本。</p>

<h2>建設現場の安全対策について</h2>
<p>この記事では、安全・新人向けに関する情報を詳しく解説します。建設業界で働く方やこれから転職を検討している方に向けて、実践的な内容をまとめました。</p>

<h2>まとめ</h2>
<p>建設業界は人手不足が続いており、未経験者の方にもチャンスがある業界です。資格取得や経験を積むことで着実にキャリアアップが可能です。</p>
<p>ゲンバキャリアでは、建築・土木・設備・解体に特化した求人情報を掲載しています。あなたに合った求人を探してみてください。</p>', 'industry', ARRAY['安全','新人向け']::text[], NULL, 'KY活動・保護具の使い方・高所作業の注意点など、新人作業員が知っておくべき安全の基本。', 'ゲンバキャリア編集部', 'published', FALSE, 0, '2026-01-16T00:00:00.000Z', NOW(), NOW()) ON CONFLICT (slug) DO NOTHING;
INSERT INTO articles (id, slug, title, excerpt, body, category, tags, image_url, meta_description, author_name, status, featured, view_count, published_at, created_at, updated_at) VALUES (gen_random_uuid(), 'interview-tobi-career', '飲食業から鳶職人へ — 転職3年目のリアル', '飲食店から鳶職に転職した32歳男性のリアルな体験談。きっかけ、苦労した点、現在の年収を語ります。', '<p>飲食店から鳶職に転職した32歳男性のリアルな体験談。きっかけ、苦労した点、現在の年収を語ります。</p>

<h2>飲食業から鳶職人へについて</h2>
<p>この記事では、鳶職・転職体験に関する情報を詳しく解説します。建設業界で働く方やこれから転職を検討している方に向けて、実践的な内容をまとめました。</p>

<h2>まとめ</h2>
<p>建設業界は人手不足が続いており、未経験者の方にもチャンスがある業界です。資格取得や経験を積むことで着実にキャリアアップが可能です。</p>
<p>ゲンバキャリアでは、建築・土木・設備・解体に特化した求人情報を掲載しています。あなたに合った求人を探してみてください。</p>', 'interview', ARRAY['鳶職','転職体験']::text[], NULL, '飲食店から鳶職に転職した32歳男性のリアルな体験談。きっかけ、苦労した点、現在の年収を語ります。', 'ゲンバキャリア編集部', 'published', FALSE, 0, '2026-01-17T00:00:00.000Z', NOW(), NOW()) ON CONFLICT (slug) DO NOTHING;
INSERT INTO articles (id, slug, title, excerpt, body, category, tags, image_url, meta_description, author_name, status, featured, view_count, published_at, created_at, updated_at) VALUES (gen_random_uuid(), 'heavy-equipment-operator-guide', '重機オペレーターの仕事内容 — 必要な免許と年収', 'バックホウ・ブルドーザーなど重機オペレーターの仕事内容、必要な免許、年収相場を解説。', '<p>バックホウ・ブルドーザーなど重機オペレーターの仕事内容、必要な免許、年収相場を解説。</p>

<h2>重機オペレーターの仕事内容について</h2>
<p>この記事では、重機・オペレーターに関する情報を詳しく解説します。建設業界で働く方やこれから転職を検討している方に向けて、実践的な内容をまとめました。</p>

<h2>まとめ</h2>
<p>建設業界は人手不足が続いており、未経験者の方にもチャンスがある業界です。資格取得や経験を積むことで着実にキャリアアップが可能です。</p>
<p>ゲンバキャリアでは、建築・土木・設備・解体に特化した求人情報を掲載しています。あなたに合った求人を探してみてください。</p>', 'job-type', ARRAY['重機','オペレーター']::text[], NULL, 'バックホウ・ブルドーザーなど重機オペレーターの仕事内容、必要な免許、年収相場を解説。', 'ゲンバキャリア編集部', 'published', FALSE, 0, '2026-01-18T00:00:00.000Z', NOW(), NOW()) ON CONFLICT (slug) DO NOTHING;
INSERT INTO articles (id, slug, title, excerpt, body, category, tags, image_url, meta_description, author_name, status, featured, view_count, published_at, created_at, updated_at) VALUES (gen_random_uuid(), 'construction-bonus-reality', '建設業界のボーナス事情 — 支給額と時期', '建設会社のボーナスはいくら？大手ゼネコンから中小企業まで、支給額の実態と時期を調査。', '<p>建設会社のボーナスはいくら？大手ゼネコンから中小企業まで、支給額の実態と時期を調査。</p>

<h2>建設業界のボーナス事情について</h2>
<p>この記事では、ボーナス・待遇に関する情報を詳しく解説します。建設業界で働く方やこれから転職を検討している方に向けて、実践的な内容をまとめました。</p>

<h2>まとめ</h2>
<p>建設業界は人手不足が続いており、未経験者の方にもチャンスがある業界です。資格取得や経験を積むことで着実にキャリアアップが可能です。</p>
<p>ゲンバキャリアでは、建築・土木・設備・解体に特化した求人情報を掲載しています。あなたに合った求人を探してみてください。</p>', 'salary', ARRAY['ボーナス','待遇']::text[], NULL, '建設会社のボーナスはいくら？大手ゼネコンから中小企業まで、支給額の実態と時期を調査。', 'ゲンバキャリア編集部', 'published', FALSE, 0, '2026-01-19T00:00:00.000Z', NOW(), NOW()) ON CONFLICT (slug) DO NOTHING;
INSERT INTO articles (id, slug, title, excerpt, body, category, tags, image_url, meta_description, author_name, status, featured, view_count, published_at, created_at, updated_at) VALUES (gen_random_uuid(), 'first-class-construction-management', '1級建築施工管理技士の難易度と勉強法', '1級建築施工管理技士の合格率・難易度・必要な勉強時間、おすすめの参考書を紹介。', '<p>1級建築施工管理技士の合格率・難易度・必要な勉強時間、おすすめの参考書を紹介。</p>

<h2>1級建築施工管理技士の難易度と勉強法について</h2>
<p>この記事では、施工管理技士・1級に関する情報を詳しく解説します。建設業界で働く方やこれから転職を検討している方に向けて、実践的な内容をまとめました。</p>

<h2>まとめ</h2>
<p>建設業界は人手不足が続いており、未経験者の方にもチャンスがある業界です。資格取得や経験を積むことで着実にキャリアアップが可能です。</p>
<p>ゲンバキャリアでは、建築・土木・設備・解体に特化した求人情報を掲載しています。あなたに合った求人を探してみてください。</p>', 'license', ARRAY['施工管理技士','1級']::text[], NULL, '1級建築施工管理技士の合格率・難易度・必要な勉強時間、おすすめの参考書を紹介。', 'ゲンバキャリア編集部', 'published', FALSE, 0, '2026-01-20T00:00:00.000Z', NOW(), NOW()) ON CONFLICT (slug) DO NOTHING;
INSERT INTO articles (id, slug, title, excerpt, body, category, tags, image_url, meta_description, author_name, status, featured, view_count, published_at, created_at, updated_at) VALUES (gen_random_uuid(), 'construction-women-guide', '建設業界で働く女性 — 職種・環境・キャリアパス', '建設現場で活躍する女性が増加中。女性が活躍できる職種や職場環境の実態を紹介。', '<p>建設現場で活躍する女性が増加中。女性が活躍できる職種や職場環境の実態を紹介。</p>

<h2>建設業界で働く女性について</h2>
<p>この記事では、女性・ダイバーシティに関する情報を詳しく解説します。建設業界で働く方やこれから転職を検討している方に向けて、実践的な内容をまとめました。</p>

<h2>まとめ</h2>
<p>建設業界は人手不足が続いており、未経験者の方にもチャンスがある業界です。資格取得や経験を積むことで着実にキャリアアップが可能です。</p>
<p>ゲンバキャリアでは、建築・土木・設備・解体に特化した求人情報を掲載しています。あなたに合った求人を探してみてください。</p>', 'industry', ARRAY['女性','ダイバーシティ']::text[], NULL, '建設現場で活躍する女性が増加中。女性が活躍できる職種や職場環境の実態を紹介。', 'ゲンバキャリア編集部', 'published', FALSE, 0, '2026-01-21T00:00:00.000Z', NOW(), NOW()) ON CONFLICT (slug) DO NOTHING;
INSERT INTO articles (id, slug, title, excerpt, body, category, tags, image_url, meta_description, author_name, status, featured, view_count, published_at, created_at, updated_at) VALUES (gen_random_uuid(), 'construction-overtime-reality', '建設業界の残業時間 — 2024年規制後の変化', '2024年の残業上限規制後、建設業界の働き方はどう変わったか。現場のリアルな声を紹介。', '<p>2024年の残業上限規制後、建設業界の働き方はどう変わったか。現場のリアルな声を紹介。</p>

<h2>建設業界の残業時間について</h2>
<p>この記事では、残業・働き方改革に関する情報を詳しく解説します。建設業界で働く方やこれから転職を検討している方に向けて、実践的な内容をまとめました。</p>

<h2>まとめ</h2>
<p>建設業界は人手不足が続いており、未経験者の方にもチャンスがある業界です。資格取得や経験を積むことで着実にキャリアアップが可能です。</p>
<p>ゲンバキャリアでは、建築・土木・設備・解体に特化した求人情報を掲載しています。あなたに合った求人を探してみてください。</p>', 'industry', ARRAY['残業','働き方改革']::text[], NULL, '2024年の残業上限規制後、建設業界の働き方はどう変わったか。現場のリアルな声を紹介。', 'ゲンバキャリア編集部', 'published', FALSE, 0, '2026-01-22T00:00:00.000Z', NOW(), NOW()) ON CONFLICT (slug) DO NOTHING;
INSERT INTO articles (id, slug, title, excerpt, body, category, tags, image_url, meta_description, author_name, status, featured, view_count, published_at, created_at, updated_at) VALUES (gen_random_uuid(), 'plumber-work-guide', '配管工の仕事内容と将来性 — 水道・ガス・空調', '配管工の種類（水道・ガス・空調）ごとの仕事内容、必要な資格、年収、将来性を解説。', '<p>配管工の種類（水道・ガス・空調）ごとの仕事内容、必要な資格、年収、将来性を解説。</p>

<h2>配管工の仕事内容と将来性について</h2>
<p>この記事では、配管工・職種解説に関する情報を詳しく解説します。建設業界で働く方やこれから転職を検討している方に向けて、実践的な内容をまとめました。</p>

<h2>まとめ</h2>
<p>建設業界は人手不足が続いており、未経験者の方にもチャンスがある業界です。資格取得や経験を積むことで着実にキャリアアップが可能です。</p>
<p>ゲンバキャリアでは、建築・土木・設備・解体に特化した求人情報を掲載しています。あなたに合った求人を探してみてください。</p>', 'job-type', ARRAY['配管工','職種解説']::text[], NULL, '配管工の種類（水道・ガス・空調）ごとの仕事内容、必要な資格、年収、将来性を解説。', 'ゲンバキャリア編集部', 'published', FALSE, 0, '2026-01-23T00:00:00.000Z', NOW(), NOW()) ON CONFLICT (slug) DO NOTHING;
INSERT INTO articles (id, slug, title, excerpt, body, category, tags, image_url, meta_description, author_name, status, featured, view_count, published_at, created_at, updated_at) VALUES (gen_random_uuid(), 'construction-age-limit', '建設業は何歳まで働ける？年齢別のキャリア設計', '20代・30代・40代・50代それぞれの建設業界でのキャリア設計と、体力面での対策を解説。', '<p>20代・30代・40代・50代それぞれの建設業界でのキャリア設計と、体力面での対策を解説。</p>

<h2>建設業は何歳まで働ける？年齢別のキャリア設計について</h2>
<p>この記事では、年齢・キャリアに関する情報を詳しく解説します。建設業界で働く方やこれから転職を検討している方に向けて、実践的な内容をまとめました。</p>

<h2>まとめ</h2>
<p>建設業界は人手不足が続いており、未経験者の方にもチャンスがある業界です。資格取得や経験を積むことで着実にキャリアアップが可能です。</p>
<p>ゲンバキャリアでは、建築・土木・設備・解体に特化した求人情報を掲載しています。あなたに合った求人を探してみてください。</p>', 'career', ARRAY['年齢','キャリア']::text[], NULL, '20代・30代・40代・50代それぞれの建設業界でのキャリア設計と、体力面での対策を解説。', 'ゲンバキャリア編集部', 'published', FALSE, 0, '2026-01-24T00:00:00.000Z', NOW(), NOW()) ON CONFLICT (slug) DO NOTHING;
INSERT INTO articles (id, slug, title, excerpt, body, category, tags, image_url, meta_description, author_name, status, featured, view_count, published_at, created_at, updated_at) VALUES (gen_random_uuid(), 'vehicle-construction-machine-license', '車両系建設機械の運転資格 — 種類と取得方法', '車両系建設機械運転技能講習と特別教育の違い、対象機械、取得費用を解説。', '<p>車両系建設機械運転技能講習と特別教育の違い、対象機械、取得費用を解説。</p>

<h2>車両系建設機械の運転資格について</h2>
<p>この記事では、重機・資格に関する情報を詳しく解説します。建設業界で働く方やこれから転職を検討している方に向けて、実践的な内容をまとめました。</p>

<h2>まとめ</h2>
<p>建設業界は人手不足が続いており、未経験者の方にもチャンスがある業界です。資格取得や経験を積むことで着実にキャリアアップが可能です。</p>
<p>ゲンバキャリアでは、建築・土木・設備・解体に特化した求人情報を掲載しています。あなたに合った求人を探してみてください。</p>', 'license', ARRAY['重機','資格']::text[], NULL, '車両系建設機械運転技能講習と特別教育の違い、対象機械、取得費用を解説。', 'ゲンバキャリア編集部', 'published', FALSE, 0, '2026-01-25T00:00:00.000Z', NOW(), NOW()) ON CONFLICT (slug) DO NOTHING;
INSERT INTO articles (id, slug, title, excerpt, body, category, tags, image_url, meta_description, author_name, status, featured, view_count, published_at, created_at, updated_at) VALUES (gen_random_uuid(), 'construction-apprentice-salary', '建設業界の見習い期間 — 給与・期間・成長ステップ', '建設業界での見習い期間の長さ、その間の給与水準、一人前になるまでの成長ステップを紹介。', '<p>建設業界での見習い期間の長さ、その間の給与水準、一人前になるまでの成長ステップを紹介。</p>

<h2>建設業界の見習い期間について</h2>
<p>この記事では、見習い・新人に関する情報を詳しく解説します。建設業界で働く方やこれから転職を検討している方に向けて、実践的な内容をまとめました。</p>

<h2>まとめ</h2>
<p>建設業界は人手不足が続いており、未経験者の方にもチャンスがある業界です。資格取得や経験を積むことで着実にキャリアアップが可能です。</p>
<p>ゲンバキャリアでは、建築・土木・設備・解体に特化した求人情報を掲載しています。あなたに合った求人を探してみてください。</p>', 'salary', ARRAY['見習い','新人']::text[], NULL, '建設業界での見習い期間の長さ、その間の給与水準、一人前になるまでの成長ステップを紹介。', 'ゲンバキャリア編集部', 'published', FALSE, 0, '2026-01-26T00:00:00.000Z', NOW(), NOW()) ON CONFLICT (slug) DO NOTHING;
INSERT INTO articles (id, slug, title, excerpt, body, category, tags, image_url, meta_description, author_name, status, featured, view_count, published_at, created_at, updated_at) VALUES (gen_random_uuid(), 'interview-factory-to-electrician', '工場勤務から電気工事士へ — 資格で切り開いた転職', '工場作業員から電気工事士に転職した28歳男性の体験談。資格取得の経緯と現在の仕事について。', '<p>工場作業員から電気工事士に転職した28歳男性の体験談。資格取得の経緯と現在の仕事について。</p>

<h2>工場勤務から電気工事士へについて</h2>
<p>この記事では、電気工事士・転職体験に関する情報を詳しく解説します。建設業界で働く方やこれから転職を検討している方に向けて、実践的な内容をまとめました。</p>

<h2>まとめ</h2>
<p>建設業界は人手不足が続いており、未経験者の方にもチャンスがある業界です。資格取得や経験を積むことで着実にキャリアアップが可能です。</p>
<p>ゲンバキャリアでは、建築・土木・設備・解体に特化した求人情報を掲載しています。あなたに合った求人を探してみてください。</p>', 'interview', ARRAY['電気工事士','転職体験']::text[], NULL, '工場作業員から電気工事士に転職した28歳男性の体験談。資格取得の経緯と現在の仕事について。', 'ゲンバキャリア編集部', 'published', FALSE, 0, '2026-01-27T00:00:00.000Z', NOW(), NOW()) ON CONFLICT (slug) DO NOTHING;
INSERT INTO articles (id, slug, title, excerpt, body, category, tags, image_url, meta_description, author_name, status, featured, view_count, published_at, created_at, updated_at) VALUES (gen_random_uuid(), 'demolition-work-guide', '解体工事の仕事内容 — 需要拡大中の注目職種', '老朽化建物の増加で需要が伸びる解体工事。仕事の流れ、必要な資格、年収を詳しく解説。', '<p>老朽化建物の増加で需要が伸びる解体工事。仕事の流れ、必要な資格、年収を詳しく解説。</p>

<h2>解体工事の仕事内容について</h2>
<p>この記事では、解体・職種解説に関する情報を詳しく解説します。建設業界で働く方やこれから転職を検討している方に向けて、実践的な内容をまとめました。</p>

<h2>まとめ</h2>
<p>建設業界は人手不足が続いており、未経験者の方にもチャンスがある業界です。資格取得や経験を積むことで着実にキャリアアップが可能です。</p>
<p>ゲンバキャリアでは、建築・土木・設備・解体に特化した求人情報を掲載しています。あなたに合った求人を探してみてください。</p>', 'job-type', ARRAY['解体','職種解説']::text[], NULL, '老朽化建物の増加で需要が伸びる解体工事。仕事の流れ、必要な資格、年収を詳しく解説。', 'ゲンバキャリア編集部', 'published', FALSE, 0, '2026-01-28T00:00:00.000Z', NOW(), NOW()) ON CONFLICT (slug) DO NOTHING;
INSERT INTO articles (id, slug, title, excerpt, body, category, tags, image_url, meta_description, author_name, status, featured, view_count, published_at, created_at, updated_at) VALUES (gen_random_uuid(), 'construction-health-check', '建設作業員の健康管理 — 体力維持と怪我の予防', '建設現場で長く働くための体力づくり、腰痛予防、熱中症対策など健康管理のポイント。', '<p>建設現場で長く働くための体力づくり、腰痛予防、熱中症対策など健康管理のポイント。</p>

<h2>建設作業員の健康管理について</h2>
<p>この記事では、健康・安全に関する情報を詳しく解説します。建設業界で働く方やこれから転職を検討している方に向けて、実践的な内容をまとめました。</p>

<h2>まとめ</h2>
<p>建設業界は人手不足が続いており、未経験者の方にもチャンスがある業界です。資格取得や経験を積むことで着実にキャリアアップが可能です。</p>
<p>ゲンバキャリアでは、建築・土木・設備・解体に特化した求人情報を掲載しています。あなたに合った求人を探してみてください。</p>', 'industry', ARRAY['健康','安全']::text[], NULL, '建設現場で長く働くための体力づくり、腰痛予防、熱中症対策など健康管理のポイント。', 'ゲンバキャリア編集部', 'published', FALSE, 0, '2026-01-29T00:00:00.000Z', NOW(), NOW()) ON CONFLICT (slug) DO NOTHING;
INSERT INTO articles (id, slug, title, excerpt, body, category, tags, image_url, meta_description, author_name, status, featured, view_count, published_at, created_at, updated_at) VALUES (gen_random_uuid(), 'sekokan-salary-data-2026', '施工管理技士の年収データ — 1級と2級の差は？', '施工管理技士の年収を1級・2級、建築・土木別に比較。年収を上げるためのキャリアパスも紹介。', '<p>施工管理技士の年収を1級・2級、建築・土木別に比較。年収を上げるためのキャリアパスも紹介。</p>

<h2>施工管理技士の年収データについて</h2>
<p>この記事では、施工管理・年収に関する情報を詳しく解説します。建設業界で働く方やこれから転職を検討している方に向けて、実践的な内容をまとめました。</p>

<h2>まとめ</h2>
<p>建設業界は人手不足が続いており、未経験者の方にもチャンスがある業界です。資格取得や経験を積むことで着実にキャリアアップが可能です。</p>
<p>ゲンバキャリアでは、建築・土木・設備・解体に特化した求人情報を掲載しています。あなたに合った求人を探してみてください。</p>', 'salary', ARRAY['施工管理','年収']::text[], NULL, '施工管理技士の年収を1級・2級、建築・土木別に比較。年収を上げるためのキャリアパスも紹介。', 'ゲンバキャリア編集部', 'published', FALSE, 0, '2026-01-30T00:00:00.000Z', NOW(), NOW()) ON CONFLICT (slug) DO NOTHING;
INSERT INTO articles (id, slug, title, excerpt, body, category, tags, image_url, meta_description, author_name, status, featured, view_count, published_at, created_at, updated_at) VALUES (gen_random_uuid(), 'construction-career-path-map', '建設業界のキャリアパス全体像 — 10年後の自分を描く', '作業員→職長→施工管理→独立。建設業界でのキャリアパスの全体像と、各ステージで必要なスキル・資格。', '<p>作業員→職長→施工管理→独立。建設業界でのキャリアパスの全体像と、各ステージで必要なスキル・資格。</p>

<h2>建設業界のキャリアパス全体像について</h2>
<p>この記事では、キャリア・将来設計に関する情報を詳しく解説します。建設業界で働く方やこれから転職を検討している方に向けて、実践的な内容をまとめました。</p>

<h2>まとめ</h2>
<p>建設業界は人手不足が続いており、未経験者の方にもチャンスがある業界です。資格取得や経験を積むことで着実にキャリアアップが可能です。</p>
<p>ゲンバキャリアでは、建築・土木・設備・解体に特化した求人情報を掲載しています。あなたに合った求人を探してみてください。</p>', 'career', ARRAY['キャリア','将来設計']::text[], NULL, '作業員→職長→施工管理→独立。建設業界でのキャリアパスの全体像と、各ステージで必要なスキル・資格。', 'ゲンバキャリア編集部', 'published', FALSE, 0, '2026-01-31T00:00:00.000Z', NOW(), NOW()) ON CONFLICT (slug) DO NOTHING;
INSERT INTO articles (id, slug, title, excerpt, body, category, tags, image_url, meta_description, author_name, status, featured, view_count, published_at, created_at, updated_at) VALUES (gen_random_uuid(), 'crane-operator-license', 'クレーン運転士の資格取得ガイド — 種類と費用', '移動式クレーン・小型移動式クレーンなど、クレーン関連の資格の種類と取得方法を解説。', '<p>移動式クレーン・小型移動式クレーンなど、クレーン関連の資格の種類と取得方法を解説。</p>

<h2>クレーン運転士の資格取得ガイドについて</h2>
<p>この記事では、クレーン・資格に関する情報を詳しく解説します。建設業界で働く方やこれから転職を検討している方に向けて、実践的な内容をまとめました。</p>

<h2>まとめ</h2>
<p>建設業界は人手不足が続いており、未経験者の方にもチャンスがある業界です。資格取得や経験を積むことで着実にキャリアアップが可能です。</p>
<p>ゲンバキャリアでは、建築・土木・設備・解体に特化した求人情報を掲載しています。あなたに合った求人を探してみてください。</p>', 'license', ARRAY['クレーン','資格']::text[], NULL, '移動式クレーン・小型移動式クレーンなど、クレーン関連の資格の種類と取得方法を解説。', 'ゲンバキャリア編集部', 'published', FALSE, 0, '2026-02-01T00:00:00.000Z', NOW(), NOW()) ON CONFLICT (slug) DO NOTHING;
INSERT INTO articles (id, slug, title, excerpt, body, category, tags, image_url, meta_description, author_name, status, featured, view_count, published_at, created_at, updated_at) VALUES (gen_random_uuid(), 'first-class-civil-management', '1級土木施工管理技士の攻略法 — 合格者の勉強法', '1級土木施工管理技士の試験概要と合格した人の具体的な勉強スケジュール・使用教材を紹介。', '<p>1級土木施工管理技士の試験概要と合格した人の具体的な勉強スケジュール・使用教材を紹介。</p>

<h2>1級土木施工管理技士の攻略法について</h2>
<p>この記事では、土木・施工管理技士に関する情報を詳しく解説します。建設業界で働く方やこれから転職を検討している方に向けて、実践的な内容をまとめました。</p>

<h2>まとめ</h2>
<p>建設業界は人手不足が続いており、未経験者の方にもチャンスがある業界です。資格取得や経験を積むことで着実にキャリアアップが可能です。</p>
<p>ゲンバキャリアでは、建築・土木・設備・解体に特化した求人情報を掲載しています。あなたに合った求人を探してみてください。</p>', 'license', ARRAY['土木','施工管理技士']::text[], NULL, '1級土木施工管理技士の試験概要と合格した人の具体的な勉強スケジュール・使用教材を紹介。', 'ゲンバキャリア編集部', 'published', FALSE, 0, '2026-02-02T00:00:00.000Z', NOW(), NOW()) ON CONFLICT (slug) DO NOTHING;
INSERT INTO articles (id, slug, title, excerpt, body, category, tags, image_url, meta_description, author_name, status, featured, view_count, published_at, created_at, updated_at) VALUES (gen_random_uuid(), 'architecture-license-comparison', '建築士と施工管理技士の違い — どちらを目指すべきか', '建築士と施工管理技士の役割・受験資格・年収の違いを比較。自分に合ったキャリアの選び方。', '<p>建築士と施工管理技士の役割・受験資格・年収の違いを比較。自分に合ったキャリアの選び方。</p>

<h2>建築士と施工管理技士の違いについて</h2>
<p>この記事では、建築士・比較に関する情報を詳しく解説します。建設業界で働く方やこれから転職を検討している方に向けて、実践的な内容をまとめました。</p>

<h2>まとめ</h2>
<p>建設業界は人手不足が続いており、未経験者の方にもチャンスがある業界です。資格取得や経験を積むことで着実にキャリアアップが可能です。</p>
<p>ゲンバキャリアでは、建築・土木・設備・解体に特化した求人情報を掲載しています。あなたに合った求人を探してみてください。</p>', 'license', ARRAY['建築士','比較']::text[], NULL, '建築士と施工管理技士の役割・受験資格・年収の違いを比較。自分に合ったキャリアの選び方。', 'ゲンバキャリア編集部', 'published', FALSE, 0, '2026-02-03T00:00:00.000Z', NOW(), NOW()) ON CONFLICT (slug) DO NOTHING;
INSERT INTO articles (id, slug, title, excerpt, body, category, tags, image_url, meta_description, author_name, status, featured, view_count, published_at, created_at, updated_at) VALUES (gen_random_uuid(), 'interior-finishing-jobs', '内装仕上げ工事の職種 — クロス・床・塗装の仕事と年収', 'クロス職人・床仕上げ・塗装工の仕事内容と年収を比較。未経験から始める方法も紹介。', '<p>クロス職人・床仕上げ・塗装工の仕事内容と年収を比較。未経験から始める方法も紹介。</p>

<h2>内装仕上げ工事の職種について</h2>
<p>この記事では、内装・職種解説に関する情報を詳しく解説します。建設業界で働く方やこれから転職を検討している方に向けて、実践的な内容をまとめました。</p>

<h2>まとめ</h2>
<p>建設業界は人手不足が続いており、未経験者の方にもチャンスがある業界です。資格取得や経験を積むことで着実にキャリアアップが可能です。</p>
<p>ゲンバキャリアでは、建築・土木・設備・解体に特化した求人情報を掲載しています。あなたに合った求人を探してみてください。</p>', 'job-type', ARRAY['内装','職種解説']::text[], NULL, 'クロス職人・床仕上げ・塗装工の仕事内容と年収を比較。未経験から始める方法も紹介。', 'ゲンバキャリア編集部', 'published', FALSE, 0, '2026-02-04T00:00:00.000Z', NOW(), NOW()) ON CONFLICT (slug) DO NOTHING;
INSERT INTO articles (id, slug, title, excerpt, body, category, tags, image_url, meta_description, author_name, status, featured, view_count, published_at, created_at, updated_at) VALUES (gen_random_uuid(), 'construction-holidays-reality', '建設業界の休日事情 — 週休2日は本当に増えた？', '4週8休推進の現状。実際の現場ではどの程度休めるのか、企業規模別のデータを紹介。', '<p>4週8休推進の現状。実際の現場ではどの程度休めるのか、企業規模別のデータを紹介。</p>

<h2>建設業界の休日事情について</h2>
<p>この記事では、休日・働き方に関する情報を詳しく解説します。建設業界で働く方やこれから転職を検討している方に向けて、実践的な内容をまとめました。</p>

<h2>まとめ</h2>
<p>建設業界は人手不足が続いており、未経験者の方にもチャンスがある業界です。資格取得や経験を積むことで着実にキャリアアップが可能です。</p>
<p>ゲンバキャリアでは、建築・土木・設備・解体に特化した求人情報を掲載しています。あなたに合った求人を探してみてください。</p>', 'industry', ARRAY['休日','働き方']::text[], NULL, '4週8休推進の現状。実際の現場ではどの程度休めるのか、企業規模別のデータを紹介。', 'ゲンバキャリア編集部', 'published', FALSE, 0, '2026-02-05T00:00:00.000Z', NOW(), NOW()) ON CONFLICT (slug) DO NOTHING;
INSERT INTO articles (id, slug, title, excerpt, body, category, tags, image_url, meta_description, author_name, status, featured, view_count, published_at, created_at, updated_at) VALUES (gen_random_uuid(), 'welding-license-guide', '溶接の資格一覧 — アーク溶接からJIS資格まで', 'アーク溶接特別教育、ガス溶接技能講習、JIS溶接技能者など溶接関連の資格を網羅解説。', '<p>アーク溶接特別教育、ガス溶接技能講習、JIS溶接技能者など溶接関連の資格を網羅解説。</p>

<h2>溶接の資格一覧について</h2>
<p>この記事では、溶接・資格に関する情報を詳しく解説します。建設業界で働く方やこれから転職を検討している方に向けて、実践的な内容をまとめました。</p>

<h2>まとめ</h2>
<p>建設業界は人手不足が続いており、未経験者の方にもチャンスがある業界です。資格取得や経験を積むことで着実にキャリアアップが可能です。</p>
<p>ゲンバキャリアでは、建築・土木・設備・解体に特化した求人情報を掲載しています。あなたに合った求人を探してみてください。</p>', 'license', ARRAY['溶接','資格']::text[], NULL, 'アーク溶接特別教育、ガス溶接技能講習、JIS溶接技能者など溶接関連の資格を網羅解説。', 'ゲンバキャリア編集部', 'published', FALSE, 0, '2026-02-06T00:00:00.000Z', NOW(), NOW()) ON CONFLICT (slug) DO NOTHING;
INSERT INTO articles (id, slug, title, excerpt, body, category, tags, image_url, meta_description, author_name, status, featured, view_count, published_at, created_at, updated_at) VALUES (gen_random_uuid(), 'construction-job-search-tips', '建設業界の求人の探し方 — 専門サイトの活用法', 'ハローワーク・専門求人サイト・知人紹介。建設業界での求人の探し方と各方法のメリット・デメリット。', '<p>ハローワーク・専門求人サイト・知人紹介。建設業界での求人の探し方と各方法のメリット・デメリット。</p>

<h2>建設業界の求人の探し方について</h2>
<p>この記事では、求人・転職に関する情報を詳しく解説します。建設業界で働く方やこれから転職を検討している方に向けて、実践的な内容をまとめました。</p>

<h2>まとめ</h2>
<p>建設業界は人手不足が続いており、未経験者の方にもチャンスがある業界です。資格取得や経験を積むことで着実にキャリアアップが可能です。</p>
<p>ゲンバキャリアでは、建築・土木・設備・解体に特化した求人情報を掲載しています。あなたに合った求人を探してみてください。</p>', 'career', ARRAY['求人','転職']::text[], NULL, 'ハローワーク・専門求人サイト・知人紹介。建設業界での求人の探し方と各方法のメリット・デメリット。', 'ゲンバキャリア編集部', 'published', FALSE, 0, '2026-02-07T00:00:00.000Z', NOW(), NOW()) ON CONFLICT (slug) DO NOTHING;
INSERT INTO articles (id, slug, title, excerpt, body, category, tags, image_url, meta_description, author_name, status, featured, view_count, published_at, created_at, updated_at) VALUES (gen_random_uuid(), 'rebar-worker-guide', '鉄筋工の仕事と年収 — 需要の高い専門職', '鉄筋工の仕事内容、必要な資格（鉄筋施工技能士）、年収の推移を現場経験者の視点で解説。', '<p>鉄筋工の仕事内容、必要な資格（鉄筋施工技能士）、年収の推移を現場経験者の視点で解説。</p>

<h2>鉄筋工の仕事と年収について</h2>
<p>この記事では、鉄筋・職種解説に関する情報を詳しく解説します。建設業界で働く方やこれから転職を検討している方に向けて、実践的な内容をまとめました。</p>

<h2>まとめ</h2>
<p>建設業界は人手不足が続いており、未経験者の方にもチャンスがある業界です。資格取得や経験を積むことで着実にキャリアアップが可能です。</p>
<p>ゲンバキャリアでは、建築・土木・設備・解体に特化した求人情報を掲載しています。あなたに合った求人を探してみてください。</p>', 'job-type', ARRAY['鉄筋','職種解説']::text[], NULL, '鉄筋工の仕事内容、必要な資格（鉄筋施工技能士）、年収の推移を現場経験者の視点で解説。', 'ゲンバキャリア編集部', 'published', FALSE, 0, '2026-02-08T00:00:00.000Z', NOW(), NOW()) ON CONFLICT (slug) DO NOTHING;
INSERT INTO articles (id, slug, title, excerpt, body, category, tags, image_url, meta_description, author_name, status, featured, view_count, published_at, created_at, updated_at) VALUES (gen_random_uuid(), 'construction-retirement-age', '建設業界の定年と退職金 — 老後の備え', '建設会社の定年年齢、退職金の相場、再雇用制度の実態を大手から中小まで調査。', '<p>建設会社の定年年齢、退職金の相場、再雇用制度の実態を大手から中小まで調査。</p>

<h2>建設業界の定年と退職金について</h2>
<p>この記事では、退職金・定年に関する情報を詳しく解説します。建設業界で働く方やこれから転職を検討している方に向けて、実践的な内容をまとめました。</p>

<h2>まとめ</h2>
<p>建設業界は人手不足が続いており、未経験者の方にもチャンスがある業界です。資格取得や経験を積むことで着実にキャリアアップが可能です。</p>
<p>ゲンバキャリアでは、建築・土木・設備・解体に特化した求人情報を掲載しています。あなたに合った求人を探してみてください。</p>', 'salary', ARRAY['退職金','定年']::text[], NULL, '建設会社の定年年齢、退職金の相場、再雇用制度の実態を大手から中小まで調査。', 'ゲンバキャリア編集部', 'published', FALSE, 0, '2026-02-09T00:00:00.000Z', NOW(), NOW()) ON CONFLICT (slug) DO NOTHING;
INSERT INTO articles (id, slug, title, excerpt, body, category, tags, image_url, meta_description, author_name, status, featured, view_count, published_at, created_at, updated_at) VALUES (gen_random_uuid(), 'oxygen-deficiency-license', '酸欠作業主任者の資格 — 取得方法と現場での重要性', '酸素欠乏・硫化水素危険作業主任者の技能講習。どんな現場で必要か、取得の流れを解説。', '<p>酸素欠乏・硫化水素危険作業主任者の技能講習。どんな現場で必要か、取得の流れを解説。</p>

<h2>酸欠作業主任者の資格について</h2>
<p>この記事では、酸欠・安全資格に関する情報を詳しく解説します。建設業界で働く方やこれから転職を検討している方に向けて、実践的な内容をまとめました。</p>

<h2>まとめ</h2>
<p>建設業界は人手不足が続いており、未経験者の方にもチャンスがある業界です。資格取得や経験を積むことで着実にキャリアアップが可能です。</p>
<p>ゲンバキャリアでは、建築・土木・設備・解体に特化した求人情報を掲載しています。あなたに合った求人を探してみてください。</p>', 'license', ARRAY['酸欠','安全資格']::text[], NULL, '酸素欠乏・硫化水素危険作業主任者の技能講習。どんな現場で必要か、取得の流れを解説。', 'ゲンバキャリア編集部', 'published', FALSE, 0, '2026-02-10T00:00:00.000Z', NOW(), NOW()) ON CONFLICT (slug) DO NOTHING;
INSERT INTO articles (id, slug, title, excerpt, body, category, tags, image_url, meta_description, author_name, status, featured, view_count, published_at, created_at, updated_at) VALUES (gen_random_uuid(), 'interview-sales-to-sekokan', '営業職から施工管理へ — コミュニケーション力が活きた転職', '営業職から施工管理技士に転職した35歳の体験談。前職のスキルがどう活きたかを語る。', '<p>営業職から施工管理技士に転職した35歳の体験談。前職のスキルがどう活きたかを語る。</p>

<h2>営業職から施工管理へについて</h2>
<p>この記事では、施工管理・転職体験に関する情報を詳しく解説します。建設業界で働く方やこれから転職を検討している方に向けて、実践的な内容をまとめました。</p>

<h2>まとめ</h2>
<p>建設業界は人手不足が続いており、未経験者の方にもチャンスがある業界です。資格取得や経験を積むことで着実にキャリアアップが可能です。</p>
<p>ゲンバキャリアでは、建築・土木・設備・解体に特化した求人情報を掲載しています。あなたに合った求人を探してみてください。</p>', 'interview', ARRAY['施工管理','転職体験']::text[], NULL, '営業職から施工管理技士に転職した35歳の体験談。前職のスキルがどう活きたかを語る。', 'ゲンバキャリア編集部', 'published', FALSE, 0, '2026-02-11T00:00:00.000Z', NOW(), NOW()) ON CONFLICT (slug) DO NOTHING;
INSERT INTO articles (id, slug, title, excerpt, body, category, tags, image_url, meta_description, author_name, status, featured, view_count, published_at, created_at, updated_at) VALUES (gen_random_uuid(), 'construction-company-size-comparison', '大手ゼネコンと中小建設会社の違い — 給与・環境・成長', '大手と中小の建設会社を年収・福利厚生・仕事内容・成長速度で比較。自分に合う規模は？', '<p>大手と中小の建設会社を年収・福利厚生・仕事内容・成長速度で比較。自分に合う規模は？</p>

<h2>大手ゼネコンと中小建設会社の違いについて</h2>
<p>この記事では、企業規模・比較に関する情報を詳しく解説します。建設業界で働く方やこれから転職を検討している方に向けて、実践的な内容をまとめました。</p>

<h2>まとめ</h2>
<p>建設業界は人手不足が続いており、未経験者の方にもチャンスがある業界です。資格取得や経験を積むことで着実にキャリアアップが可能です。</p>
<p>ゲンバキャリアでは、建築・土木・設備・解体に特化した求人情報を掲載しています。あなたに合った求人を探してみてください。</p>', 'industry', ARRAY['企業規模','比較']::text[], NULL, '大手と中小の建設会社を年収・福利厚生・仕事内容・成長速度で比較。自分に合う規模は？', 'ゲンバキャリア編集部', 'published', FALSE, 0, '2026-02-12T00:00:00.000Z', NOW(), NOW()) ON CONFLICT (slug) DO NOTHING;
INSERT INTO articles (id, slug, title, excerpt, body, category, tags, image_url, meta_description, author_name, status, featured, view_count, published_at, created_at, updated_at) VALUES (gen_random_uuid(), 'forklift-license-guide', 'フォークリフト運転技能講習 — 取得の流れと活用場面', 'フォークリフト運転技能講習の受講資格、費用、日数。建設現場での活用場面を紹介。', '<p>フォークリフト運転技能講習の受講資格、費用、日数。建設現場での活用場面を紹介。</p>

<h2>フォークリフト運転技能講習について</h2>
<p>この記事では、フォークリフト・資格に関する情報を詳しく解説します。建設業界で働く方やこれから転職を検討している方に向けて、実践的な内容をまとめました。</p>

<h2>まとめ</h2>
<p>建設業界は人手不足が続いており、未経験者の方にもチャンスがある業界です。資格取得や経験を積むことで着実にキャリアアップが可能です。</p>
<p>ゲンバキャリアでは、建築・土木・設備・解体に特化した求人情報を掲載しています。あなたに合った求人を探してみてください。</p>', 'license', ARRAY['フォークリフト','資格']::text[], NULL, 'フォークリフト運転技能講習の受講資格、費用、日数。建設現場での活用場面を紹介。', 'ゲンバキャリア編集部', 'published', FALSE, 0, '2026-02-13T00:00:00.000Z', NOW(), NOW()) ON CONFLICT (slug) DO NOTHING;
INSERT INTO articles (id, slug, title, excerpt, body, category, tags, image_url, meta_description, author_name, status, featured, view_count, published_at, created_at, updated_at) VALUES (gen_random_uuid(), 'painting-work-guide', '塗装工の仕事内容 — 建築塗装と土木塗装の違い', '建築塗装と土木塗装（橋梁等）の違い、仕事の流れ、年収、独立の可能性を解説。', '<p>建築塗装と土木塗装（橋梁等）の違い、仕事の流れ、年収、独立の可能性を解説。</p>

<h2>塗装工の仕事内容について</h2>
<p>この記事では、塗装・職種解説に関する情報を詳しく解説します。建設業界で働く方やこれから転職を検討している方に向けて、実践的な内容をまとめました。</p>

<h2>まとめ</h2>
<p>建設業界は人手不足が続いており、未経験者の方にもチャンスがある業界です。資格取得や経験を積むことで着実にキャリアアップが可能です。</p>
<p>ゲンバキャリアでは、建築・土木・設備・解体に特化した求人情報を掲載しています。あなたに合った求人を探してみてください。</p>', 'job-type', ARRAY['塗装','職種解説']::text[], NULL, '建築塗装と土木塗装（橋梁等）の違い、仕事の流れ、年収、独立の可能性を解説。', 'ゲンバキャリア編集部', 'published', FALSE, 0, '2026-02-14T00:00:00.000Z', NOW(), NOW()) ON CONFLICT (slug) DO NOTHING;
INSERT INTO articles (id, slug, title, excerpt, body, category, tags, image_url, meta_description, author_name, status, featured, view_count, published_at, created_at, updated_at) VALUES (gen_random_uuid(), 'construction-social-insurance', '建設業界の社会保険 — 加入義務と確認ポイント', '建設業界での社会保険加入の義務化。入社前に確認すべきポイントと一人親方の保険事情。', '<p>建設業界での社会保険加入の義務化。入社前に確認すべきポイントと一人親方の保険事情。</p>

<h2>建設業界の社会保険について</h2>
<p>この記事では、社会保険・労働環境に関する情報を詳しく解説します。建設業界で働く方やこれから転職を検討している方に向けて、実践的な内容をまとめました。</p>

<h2>まとめ</h2>
<p>建設業界は人手不足が続いており、未経験者の方にもチャンスがある業界です。資格取得や経験を積むことで着実にキャリアアップが可能です。</p>
<p>ゲンバキャリアでは、建築・土木・設備・解体に特化した求人情報を掲載しています。あなたに合った求人を探してみてください。</p>', 'industry', ARRAY['社会保険','労働環境']::text[], NULL, '建設業界での社会保険加入の義務化。入社前に確認すべきポイントと一人親方の保険事情。', 'ゲンバキャリア編集部', 'published', FALSE, 0, '2026-02-15T00:00:00.000Z', NOW(), NOW()) ON CONFLICT (slug) DO NOTHING;
INSERT INTO articles (id, slug, title, excerpt, body, category, tags, image_url, meta_description, author_name, status, featured, view_count, published_at, created_at, updated_at) VALUES (gen_random_uuid(), 'surveyor-license-guide', '測量士・測量士補の資格 — 取得方法と年収', '測量士と測量士補の違い、試験の概要、取得後のキャリアと年収の目安を解説。', '<p>測量士と測量士補の違い、試験の概要、取得後のキャリアと年収の目安を解説。</p>

<h2>測量士・測量士補の資格について</h2>
<p>この記事では、測量・資格に関する情報を詳しく解説します。建設業界で働く方やこれから転職を検討している方に向けて、実践的な内容をまとめました。</p>

<h2>まとめ</h2>
<p>建設業界は人手不足が続いており、未経験者の方にもチャンスがある業界です。資格取得や経験を積むことで着実にキャリアアップが可能です。</p>
<p>ゲンバキャリアでは、建築・土木・設備・解体に特化した求人情報を掲載しています。あなたに合った求人を探してみてください。</p>', 'license', ARRAY['測量','資格']::text[], NULL, '測量士と測量士補の違い、試験の概要、取得後のキャリアと年収の目安を解説。', 'ゲンバキャリア編集部', 'published', FALSE, 0, '2026-02-16T00:00:00.000Z', NOW(), NOW()) ON CONFLICT (slug) DO NOTHING;
INSERT INTO articles (id, slug, title, excerpt, body, category, tags, image_url, meta_description, author_name, status, featured, view_count, published_at, created_at, updated_at) VALUES (gen_random_uuid(), 'construction-apprenticeship-reality', '建設業界の徒弟制度は今も残る？ — 教育体制の変化', 'かつての徒弟制度から現代の教育体制へ。建設業界の人材育成方法の変遷と現状。', '<p>かつての徒弟制度から現代の教育体制へ。建設業界の人材育成方法の変遷と現状。</p>

<h2>建設業界の徒弟制度は今も残る？について</h2>
<p>この記事では、教育・人材育成に関する情報を詳しく解説します。建設業界で働く方やこれから転職を検討している方に向けて、実践的な内容をまとめました。</p>

<h2>まとめ</h2>
<p>建設業界は人手不足が続いており、未経験者の方にもチャンスがある業界です。資格取得や経験を積むことで着実にキャリアアップが可能です。</p>
<p>ゲンバキャリアでは、建築・土木・設備・解体に特化した求人情報を掲載しています。あなたに合った求人を探してみてください。</p>', 'industry', ARRAY['教育','人材育成']::text[], NULL, 'かつての徒弟制度から現代の教育体制へ。建設業界の人材育成方法の変遷と現状。', 'ゲンバキャリア編集部', 'published', FALSE, 0, '2026-02-17T00:00:00.000Z', NOW(), NOW()) ON CONFLICT (slug) DO NOTHING;
INSERT INTO articles (id, slug, title, excerpt, body, category, tags, image_url, meta_description, author_name, status, featured, view_count, published_at, created_at, updated_at) VALUES (gen_random_uuid(), 'construction-salary-by-region', '建設業界の年収 — 地域別ランキング', '東京・大阪・名古屋など主要都市と地方の建設作業員の年収差をデータで比較。', '<p>東京・大阪・名古屋など主要都市と地方の建設作業員の年収差をデータで比較。</p>

<h2>建設業界の年収について</h2>
<p>この記事では、年収・地域差に関する情報を詳しく解説します。建設業界で働く方やこれから転職を検討している方に向けて、実践的な内容をまとめました。</p>

<h2>まとめ</h2>
<p>建設業界は人手不足が続いており、未経験者の方にもチャンスがある業界です。資格取得や経験を積むことで着実にキャリアアップが可能です。</p>
<p>ゲンバキャリアでは、建築・土木・設備・解体に特化した求人情報を掲載しています。あなたに合った求人を探してみてください。</p>', 'salary', ARRAY['年収','地域差']::text[], NULL, '東京・大阪・名古屋など主要都市と地方の建設作業員の年収差をデータで比較。', 'ゲンバキャリア編集部', 'published', FALSE, 0, '2026-02-18T00:00:00.000Z', NOW(), NOW()) ON CONFLICT (slug) DO NOTHING;
INSERT INTO articles (id, slug, title, excerpt, body, category, tags, image_url, meta_description, author_name, status, featured, view_count, published_at, created_at, updated_at) VALUES (gen_random_uuid(), 'construction-spring-recruitment', '建設業界の春採用 — 4月入社に向けた転職活動の進め方', '4月入社を目指す建設業界の転職スケジュール。3月からでも間に合う求人の探し方。', '<p>4月入社を目指す建設業界の転職スケジュール。3月からでも間に合う求人の探し方。</p>

<h2>建設業界の春採用について</h2>
<p>この記事では、春採用・転職に関する情報を詳しく解説します。建設業界で働く方やこれから転職を検討している方に向けて、実践的な内容をまとめました。</p>

<h2>まとめ</h2>
<p>建設業界は人手不足が続いており、未経験者の方にもチャンスがある業界です。資格取得や経験を積むことで着実にキャリアアップが可能です。</p>
<p>ゲンバキャリアでは、建築・土木・設備・解体に特化した求人情報を掲載しています。あなたに合った求人を探してみてください。</p>', 'career', ARRAY['春採用','転職']::text[], NULL, '4月入社を目指す建設業界の転職スケジュール。3月からでも間に合う求人の探し方。', 'ゲンバキャリア編集部', 'published', FALSE, 0, '2026-02-19T00:00:00.000Z', NOW(), NOW()) ON CONFLICT (slug) DO NOTHING;
INSERT INTO articles (id, slug, title, excerpt, body, category, tags, image_url, meta_description, author_name, status, featured, view_count, published_at, created_at, updated_at) VALUES (gen_random_uuid(), 'second-class-civil-management', '2級土木施工管理技士の受験対策まとめ', '2級土木施工管理技士の受験資格、試験内容、過去問の活用法をまとめて解説。', '<p>2級土木施工管理技士の受験資格、試験内容、過去問の活用法をまとめて解説。</p>

<h2>2級土木施工管理技士の受験対策まとめについて</h2>
<p>この記事では、土木・施工管理技士に関する情報を詳しく解説します。建設業界で働く方やこれから転職を検討している方に向けて、実践的な内容をまとめました。</p>

<h2>まとめ</h2>
<p>建設業界は人手不足が続いており、未経験者の方にもチャンスがある業界です。資格取得や経験を積むことで着実にキャリアアップが可能です。</p>
<p>ゲンバキャリアでは、建築・土木・設備・解体に特化した求人情報を掲載しています。あなたに合った求人を探してみてください。</p>', 'license', ARRAY['土木','施工管理技士']::text[], NULL, '2級土木施工管理技士の受験資格、試験内容、過去問の活用法をまとめて解説。', 'ゲンバキャリア編集部', 'published', FALSE, 0, '2026-02-20T00:00:00.000Z', NOW(), NOW()) ON CONFLICT (slug) DO NOTHING;
INSERT INTO articles (id, slug, title, excerpt, body, category, tags, image_url, meta_description, author_name, status, featured, view_count, published_at, created_at, updated_at) VALUES (gen_random_uuid(), 'carpenter-work-guide', '大工の仕事内容 — 伝統技術とこれからの需要', '大工の種類（造作大工・型枠大工等）、仕事内容、年収、木造住宅の需要見通しを解説。', '<p>大工の種類（造作大工・型枠大工等）、仕事内容、年収、木造住宅の需要見通しを解説。</p>

<h2>大工の仕事内容について</h2>
<p>この記事では、大工・職種解説に関する情報を詳しく解説します。建設業界で働く方やこれから転職を検討している方に向けて、実践的な内容をまとめました。</p>

<h2>まとめ</h2>
<p>建設業界は人手不足が続いており、未経験者の方にもチャンスがある業界です。資格取得や経験を積むことで着実にキャリアアップが可能です。</p>
<p>ゲンバキャリアでは、建築・土木・設備・解体に特化した求人情報を掲載しています。あなたに合った求人を探してみてください。</p>', 'job-type', ARRAY['大工','職種解説']::text[], NULL, '大工の種類（造作大工・型枠大工等）、仕事内容、年収、木造住宅の需要見通しを解説。', 'ゲンバキャリア編集部', 'published', FALSE, 0, '2026-02-21T00:00:00.000Z', NOW(), NOW()) ON CONFLICT (slug) DO NOTHING;
INSERT INTO articles (id, slug, title, excerpt, body, category, tags, image_url, meta_description, author_name, status, featured, view_count, published_at, created_at, updated_at) VALUES (gen_random_uuid(), 'construction-vacation-tips', '建設業界で有給を取るコツ — 現場の暗黙ルール', '建設現場で有給休暇を取りやすくするためのポイント。閑散期の活用や事前調整の方法。', '<p>建設現場で有給休暇を取りやすくするためのポイント。閑散期の活用や事前調整の方法。</p>

<h2>建設業界で有給を取るコツについて</h2>
<p>この記事では、有給・働き方に関する情報を詳しく解説します。建設業界で働く方やこれから転職を検討している方に向けて、実践的な内容をまとめました。</p>

<h2>まとめ</h2>
<p>建設業界は人手不足が続いており、未経験者の方にもチャンスがある業界です。資格取得や経験を積むことで着実にキャリアアップが可能です。</p>
<p>ゲンバキャリアでは、建築・土木・設備・解体に特化した求人情報を掲載しています。あなたに合った求人を探してみてください。</p>', 'industry', ARRAY['有給','働き方']::text[], NULL, '建設現場で有給休暇を取りやすくするためのポイント。閑散期の活用や事前調整の方法。', 'ゲンバキャリア編集部', 'published', FALSE, 0, '2026-02-22T00:00:00.000Z', NOW(), NOW()) ON CONFLICT (slug) DO NOTHING;
INSERT INTO articles (id, slug, title, excerpt, body, category, tags, image_url, meta_description, author_name, status, featured, view_count, published_at, created_at, updated_at) VALUES (gen_random_uuid(), 'construction-night-work', '建設業の夜勤 — 手当・体調管理・対象工事', '夜間工事の種類、夜勤手当の相場、体調管理のコツを現場経験者が解説。', '<p>夜間工事の種類、夜勤手当の相場、体調管理のコツを現場経験者が解説。</p>

<h2>建設業の夜勤について</h2>
<p>この記事では、夜勤・手当に関する情報を詳しく解説します。建設業界で働く方やこれから転職を検討している方に向けて、実践的な内容をまとめました。</p>

<h2>まとめ</h2>
<p>建設業界は人手不足が続いており、未経験者の方にもチャンスがある業界です。資格取得や経験を積むことで着実にキャリアアップが可能です。</p>
<p>ゲンバキャリアでは、建築・土木・設備・解体に特化した求人情報を掲載しています。あなたに合った求人を探してみてください。</p>', 'salary', ARRAY['夜勤','手当']::text[], NULL, '夜間工事の種類、夜勤手当の相場、体調管理のコツを現場経験者が解説。', 'ゲンバキャリア編集部', 'published', FALSE, 0, '2026-02-23T00:00:00.000Z', NOW(), NOW()) ON CONFLICT (slug) DO NOTHING;
INSERT INTO articles (id, slug, title, excerpt, body, category, tags, image_url, meta_description, author_name, status, featured, view_count, published_at, created_at, updated_at) VALUES (gen_random_uuid(), 'scaffold-work-guide', '足場職人の仕事と資格 — 年収と将来性', '足場の組立て解体作業の仕事内容、必要な資格、年収相場、需要の見通しを紹介。', '<p>足場の組立て解体作業の仕事内容、必要な資格、年収相場、需要の見通しを紹介。</p>

<h2>足場職人の仕事と資格について</h2>
<p>この記事では、足場・職種解説に関する情報を詳しく解説します。建設業界で働く方やこれから転職を検討している方に向けて、実践的な内容をまとめました。</p>

<h2>まとめ</h2>
<p>建設業界は人手不足が続いており、未経験者の方にもチャンスがある業界です。資格取得や経験を積むことで着実にキャリアアップが可能です。</p>
<p>ゲンバキャリアでは、建築・土木・設備・解体に特化した求人情報を掲載しています。あなたに合った求人を探してみてください。</p>', 'job-type', ARRAY['足場','職種解説']::text[], NULL, '足場の組立て解体作業の仕事内容、必要な資格、年収相場、需要の見通しを紹介。', 'ゲンバキャリア編集部', 'published', FALSE, 0, '2026-02-24T00:00:00.000Z', NOW(), NOW()) ON CONFLICT (slug) DO NOTHING;
INSERT INTO articles (id, slug, title, excerpt, body, category, tags, image_url, meta_description, author_name, status, featured, view_count, published_at, created_at, updated_at) VALUES (gen_random_uuid(), 'construction-mental-health', '建設現場のメンタルヘルス — ストレス対策と相談窓口', '建設業界特有のストレス要因と、メンタルヘルスケアの方法、利用できる相談窓口を紹介。', '<p>建設業界特有のストレス要因と、メンタルヘルスケアの方法、利用できる相談窓口を紹介。</p>

<h2>建設現場のメンタルヘルスについて</h2>
<p>この記事では、メンタルヘルス・健康に関する情報を詳しく解説します。建設業界で働く方やこれから転職を検討している方に向けて、実践的な内容をまとめました。</p>

<h2>まとめ</h2>
<p>建設業界は人手不足が続いており、未経験者の方にもチャンスがある業界です。資格取得や経験を積むことで着実にキャリアアップが可能です。</p>
<p>ゲンバキャリアでは、建築・土木・設備・解体に特化した求人情報を掲載しています。あなたに合った求人を探してみてください。</p>', 'industry', ARRAY['メンタルヘルス','健康']::text[], NULL, '建設業界特有のストレス要因と、メンタルヘルスケアの方法、利用できる相談窓口を紹介。', 'ゲンバキャリア編集部', 'published', FALSE, 0, '2026-02-25T00:00:00.000Z', NOW(), NOW()) ON CONFLICT (slug) DO NOTHING;
INSERT INTO articles (id, slug, title, excerpt, body, category, tags, image_url, meta_description, author_name, status, featured, view_count, published_at, created_at, updated_at) VALUES (gen_random_uuid(), 'type1-electrician-guide', '第一種電気工事士の難易度と年収アップ効果', '第一種電気工事士の試験概要、合格率、取得後の年収変化。第二種との実務範囲の違いも解説。', '<p>第一種電気工事士の試験概要、合格率、取得後の年収変化。第二種との実務範囲の違いも解説。</p>

<h2>第一種電気工事士の難易度と年収アップ効果について</h2>
<p>この記事では、電気工事士・1種に関する情報を詳しく解説します。建設業界で働く方やこれから転職を検討している方に向けて、実践的な内容をまとめました。</p>

<h2>まとめ</h2>
<p>建設業界は人手不足が続いており、未経験者の方にもチャンスがある業界です。資格取得や経験を積むことで着実にキャリアアップが可能です。</p>
<p>ゲンバキャリアでは、建築・土木・設備・解体に特化した求人情報を掲載しています。あなたに合った求人を探してみてください。</p>', 'license', ARRAY['電気工事士','1種']::text[], NULL, '第一種電気工事士の試験概要、合格率、取得後の年収変化。第二種との実務範囲の違いも解説。', 'ゲンバキャリア編集部', 'published', FALSE, 0, '2026-02-26T00:00:00.000Z', NOW(), NOW()) ON CONFLICT (slug) DO NOTHING;
INSERT INTO articles (id, slug, title, excerpt, body, category, tags, image_url, meta_description, author_name, status, featured, view_count, published_at, created_at, updated_at) VALUES (gen_random_uuid(), 'interview-driver-to-dokata', 'トラック運転手から土木作業員へ — 40代の転職記', '長距離ドライバーから土木作業員に転職した42歳の体験談。体力面の不安と克服の過程。', '<p>長距離ドライバーから土木作業員に転職した42歳の体験談。体力面の不安と克服の過程。</p>

<h2>トラック運転手から土木作業員へについて</h2>
<p>この記事では、土木・転職体験に関する情報を詳しく解説します。建設業界で働く方やこれから転職を検討している方に向けて、実践的な内容をまとめました。</p>

<h2>まとめ</h2>
<p>建設業界は人手不足が続いており、未経験者の方にもチャンスがある業界です。資格取得や経験を積むことで着実にキャリアアップが可能です。</p>
<p>ゲンバキャリアでは、建築・土木・設備・解体に特化した求人情報を掲載しています。あなたに合った求人を探してみてください。</p>', 'interview', ARRAY['土木','転職体験']::text[], NULL, '長距離ドライバーから土木作業員に転職した42歳の体験談。体力面の不安と克服の過程。', 'ゲンバキャリア編集部', 'published', FALSE, 0, '2026-02-27T00:00:00.000Z', NOW(), NOW()) ON CONFLICT (slug) DO NOTHING;
INSERT INTO articles (id, slug, title, excerpt, body, category, tags, image_url, meta_description, author_name, status, featured, view_count, published_at, created_at, updated_at) VALUES (gen_random_uuid(), 'construction-tool-basics', '建設現場の基本工具 — 新人が最初に覚えるべき道具', 'インパクトドライバー・水平器・差し金など、建設現場で最初に覚えるべき基本工具を写真付きで紹介。', '<p>インパクトドライバー・水平器・差し金など、建設現場で最初に覚えるべき基本工具を写真付きで紹介。</p>

<h2>建設現場の基本工具について</h2>
<p>この記事では、工具・新人向けに関する情報を詳しく解説します。建設業界で働く方やこれから転職を検討している方に向けて、実践的な内容をまとめました。</p>

<h2>まとめ</h2>
<p>建設業界は人手不足が続いており、未経験者の方にもチャンスがある業界です。資格取得や経験を積むことで着実にキャリアアップが可能です。</p>
<p>ゲンバキャリアでは、建築・土木・設備・解体に特化した求人情報を掲載しています。あなたに合った求人を探してみてください。</p>', 'industry', ARRAY['工具','新人向け']::text[], NULL, 'インパクトドライバー・水平器・差し金など、建設現場で最初に覚えるべき基本工具を写真付きで紹介。', 'ゲンバキャリア編集部', 'published', FALSE, 0, '2026-02-28T00:00:00.000Z', NOW(), NOW()) ON CONFLICT (slug) DO NOTHING;
INSERT INTO articles (id, slug, title, excerpt, body, category, tags, image_url, meta_description, author_name, status, featured, view_count, published_at, created_at, updated_at) VALUES (gen_random_uuid(), 'left-hand-worker-guide', '左官工の仕事内容と年収 — 手に職をつける伝統技術', '左官工の仕事内容、技術の習得に必要な期間、年収相場、独立の可能性を解説。', '<p>左官工の仕事内容、技術の習得に必要な期間、年収相場、独立の可能性を解説。</p>

<h2>左官工の仕事内容と年収について</h2>
<p>この記事では、左官・職種解説に関する情報を詳しく解説します。建設業界で働く方やこれから転職を検討している方に向けて、実践的な内容をまとめました。</p>

<h2>まとめ</h2>
<p>建設業界は人手不足が続いており、未経験者の方にもチャンスがある業界です。資格取得や経験を積むことで着実にキャリアアップが可能です。</p>
<p>ゲンバキャリアでは、建築・土木・設備・解体に特化した求人情報を掲載しています。あなたに合った求人を探してみてください。</p>', 'job-type', ARRAY['左官','職種解説']::text[], NULL, '左官工の仕事内容、技術の習得に必要な期間、年収相場、独立の可能性を解説。', 'ゲンバキャリア編集部', 'published', FALSE, 0, '2026-03-01T00:00:00.000Z', NOW(), NOW()) ON CONFLICT (slug) DO NOTHING;
INSERT INTO articles (id, slug, title, excerpt, body, category, tags, image_url, meta_description, author_name, status, featured, view_count, published_at, created_at, updated_at) VALUES (gen_random_uuid(), 'construction-commute-tips', '建設現場への通勤事情 — 直行直帰と集合場所', '建設現場への通勤方法。直行直帰のルール、車通勤の可否、集合場所からの移動について。', '<p>建設現場への通勤方法。直行直帰のルール、車通勤の可否、集合場所からの移動について。</p>

<h2>建設現場への通勤事情について</h2>
<p>この記事では、通勤・働き方に関する情報を詳しく解説します。建設業界で働く方やこれから転職を検討している方に向けて、実践的な内容をまとめました。</p>

<h2>まとめ</h2>
<p>建設業界は人手不足が続いており、未経験者の方にもチャンスがある業界です。資格取得や経験を積むことで着実にキャリアアップが可能です。</p>
<p>ゲンバキャリアでは、建築・土木・設備・解体に特化した求人情報を掲載しています。あなたに合った求人を探してみてください。</p>', 'industry', ARRAY['通勤','働き方']::text[], NULL, '建設現場への通勤方法。直行直帰のルール、車通勤の可否、集合場所からの移動について。', 'ゲンバキャリア編集部', 'published', FALSE, 0, '2026-03-02T00:00:00.000Z', NOW(), NOW()) ON CONFLICT (slug) DO NOTHING;
INSERT INTO articles (id, slug, title, excerpt, body, category, tags, image_url, meta_description, author_name, status, featured, view_count, published_at, created_at, updated_at) VALUES (gen_random_uuid(), 'construction-job-offer-comparison', '建設会社の内定を比較する方法 — 給与以外の見るべき点', '複数の内定をもらったとき、給与・福利厚生・現場環境のどこを比較すべきか解説。', '<p>複数の内定をもらったとき、給与・福利厚生・現場環境のどこを比較すべきか解説。</p>

<h2>建設会社の内定を比較する方法について</h2>
<p>この記事では、内定・比較に関する情報を詳しく解説します。建設業界で働く方やこれから転職を検討している方に向けて、実践的な内容をまとめました。</p>

<h2>まとめ</h2>
<p>建設業界は人手不足が続いており、未経験者の方にもチャンスがある業界です。資格取得や経験を積むことで着実にキャリアアップが可能です。</p>
<p>ゲンバキャリアでは、建築・土木・設備・解体に特化した求人情報を掲載しています。あなたに合った求人を探してみてください。</p>', 'career', ARRAY['内定','比較']::text[], NULL, '複数の内定をもらったとき、給与・福利厚生・現場環境のどこを比較すべきか解説。', 'ゲンバキャリア編集部', 'published', FALSE, 0, '2026-03-03T00:00:00.000Z', NOW(), NOW()) ON CONFLICT (slug) DO NOTHING;
INSERT INTO articles (id, slug, title, excerpt, body, category, tags, image_url, meta_description, author_name, status, featured, view_count, published_at, created_at, updated_at) VALUES (gen_random_uuid(), 'ground-improvement-work', '地盤改良工事の仕事内容と必要な資格', '柱状改良・表層改良・杭工事など地盤改良の種類と、従事するために必要な資格を紹介。', '<p>柱状改良・表層改良・杭工事など地盤改良の種類と、従事するために必要な資格を紹介。</p>

<h2>地盤改良工事の仕事内容と必要な資格について</h2>
<p>この記事では、地盤改良・土木に関する情報を詳しく解説します。建設業界で働く方やこれから転職を検討している方に向けて、実践的な内容をまとめました。</p>

<h2>まとめ</h2>
<p>建設業界は人手不足が続いており、未経験者の方にもチャンスがある業界です。資格取得や経験を積むことで着実にキャリアアップが可能です。</p>
<p>ゲンバキャリアでは、建築・土木・設備・解体に特化した求人情報を掲載しています。あなたに合った求人を探してみてください。</p>', 'job-type', ARRAY['地盤改良','土木']::text[], NULL, '柱状改良・表層改良・杭工事など地盤改良の種類と、従事するために必要な資格を紹介。', 'ゲンバキャリア編集部', 'published', FALSE, 0, '2026-03-04T00:00:00.000Z', NOW(), NOW()) ON CONFLICT (slug) DO NOTHING;
INSERT INTO articles (id, slug, title, excerpt, body, category, tags, image_url, meta_description, author_name, status, featured, view_count, published_at, created_at, updated_at) VALUES (gen_random_uuid(), 'construction-salary-negotiation', '建設業界の給与交渉術 — 面接で年収を上げるコツ', '建設会社の面接で給与交渉をする際のタイミングと伝え方。資格や経験の効果的なアピール法。', '<p>建設会社の面接で給与交渉をする際のタイミングと伝え方。資格や経験の効果的なアピール法。</p>

<h2>建設業界の給与交渉術について</h2>
<p>この記事では、給与交渉・面接に関する情報を詳しく解説します。建設業界で働く方やこれから転職を検討している方に向けて、実践的な内容をまとめました。</p>

<h2>まとめ</h2>
<p>建設業界は人手不足が続いており、未経験者の方にもチャンスがある業界です。資格取得や経験を積むことで着実にキャリアアップが可能です。</p>
<p>ゲンバキャリアでは、建築・土木・設備・解体に特化した求人情報を掲載しています。あなたに合った求人を探してみてください。</p>', 'salary', ARRAY['給与交渉','面接']::text[], NULL, '建設会社の面接で給与交渉をする際のタイミングと伝え方。資格や経験の効果的なアピール法。', 'ゲンバキャリア編集部', 'published', FALSE, 0, '2026-03-05T00:00:00.000Z', NOW(), NOW()) ON CONFLICT (slug) DO NOTHING;
INSERT INTO articles (id, slug, title, excerpt, body, category, tags, image_url, meta_description, author_name, status, featured, view_count, published_at, created_at, updated_at) VALUES (gen_random_uuid(), 'fire-protection-engineer', '消防設備士の資格 — 甲種・乙種の違いと取得方法', '消防設備士の甲種と乙種の違い、試験内容、建設業界での活用場面を解説。', '<p>消防設備士の甲種と乙種の違い、試験内容、建設業界での活用場面を解説。</p>

<h2>消防設備士の資格について</h2>
<p>この記事では、消防設備士・資格に関する情報を詳しく解説します。建設業界で働く方やこれから転職を検討している方に向けて、実践的な内容をまとめました。</p>

<h2>まとめ</h2>
<p>建設業界は人手不足が続いており、未経験者の方にもチャンスがある業界です。資格取得や経験を積むことで着実にキャリアアップが可能です。</p>
<p>ゲンバキャリアでは、建築・土木・設備・解体に特化した求人情報を掲載しています。あなたに合った求人を探してみてください。</p>', 'license', ARRAY['消防設備士','資格']::text[], NULL, '消防設備士の甲種と乙種の違い、試験内容、建設業界での活用場面を解説。', 'ゲンバキャリア編集部', 'published', FALSE, 0, '2026-03-06T00:00:00.000Z', NOW(), NOW()) ON CONFLICT (slug) DO NOTHING;
INSERT INTO articles (id, slug, title, excerpt, body, category, tags, image_url, meta_description, author_name, status, featured, view_count, published_at, created_at, updated_at) VALUES (gen_random_uuid(), 'interview-newgrad-construction', '高校卒業後すぐ建設業界へ — 20歳の現場職人の話', '高校卒業後に建設会社に入社した20歳の職人が語る、現場の日常と成長の実感。', '<p>高校卒業後に建設会社に入社した20歳の職人が語る、現場の日常と成長の実感。</p>

<h2>高校卒業後すぐ建設業界へについて</h2>
<p>この記事では、新卒・体験談に関する情報を詳しく解説します。建設業界で働く方やこれから転職を検討している方に向けて、実践的な内容をまとめました。</p>

<h2>まとめ</h2>
<p>建設業界は人手不足が続いており、未経験者の方にもチャンスがある業界です。資格取得や経験を積むことで着実にキャリアアップが可能です。</p>
<p>ゲンバキャリアでは、建築・土木・設備・解体に特化した求人情報を掲載しています。あなたに合った求人を探してみてください。</p>', 'interview', ARRAY['新卒','体験談']::text[], NULL, '高校卒業後に建設会社に入社した20歳の職人が語る、現場の日常と成長の実感。', 'ゲンバキャリア編集部', 'published', FALSE, 0, '2026-03-07T00:00:00.000Z', NOW(), NOW()) ON CONFLICT (slug) DO NOTHING;
INSERT INTO articles (id, slug, title, excerpt, body, category, tags, image_url, meta_description, author_name, status, featured, view_count, published_at, created_at, updated_at) VALUES (gen_random_uuid(), 'construction-union-guide', '建設業の組合と労働組合 — 加入のメリット', '建設業界の労働組合の種類と加入メリット。共済制度や退職金制度について。', '<p>建設業界の労働組合の種類と加入メリット。共済制度や退職金制度について。</p>

<h2>建設業の組合と労働組合について</h2>
<p>この記事では、労働組合・権利に関する情報を詳しく解説します。建設業界で働く方やこれから転職を検討している方に向けて、実践的な内容をまとめました。</p>

<h2>まとめ</h2>
<p>建設業界は人手不足が続いており、未経験者の方にもチャンスがある業界です。資格取得や経験を積むことで着実にキャリアアップが可能です。</p>
<p>ゲンバキャリアでは、建築・土木・設備・解体に特化した求人情報を掲載しています。あなたに合った求人を探してみてください。</p>', 'industry', ARRAY['労働組合','権利']::text[], NULL, '建設業界の労働組合の種類と加入メリット。共済制度や退職金制度について。', 'ゲンバキャリア編集部', 'published', FALSE, 0, '2026-03-08T00:00:00.000Z', NOW(), NOW()) ON CONFLICT (slug) DO NOTHING;
INSERT INTO articles (id, slug, title, excerpt, body, category, tags, image_url, meta_description, author_name, status, featured, view_count, published_at, created_at, updated_at) VALUES (gen_random_uuid(), 'waterproofing-work-guide', '防水工の仕事と年収 — 雨漏り修繕から新築まで', '防水工の仕事内容、シート防水・ウレタン防水の違い、年収、将来性を解説。', '<p>防水工の仕事内容、シート防水・ウレタン防水の違い、年収、将来性を解説。</p>

<h2>防水工の仕事と年収について</h2>
<p>この記事では、防水・職種解説に関する情報を詳しく解説します。建設業界で働く方やこれから転職を検討している方に向けて、実践的な内容をまとめました。</p>

<h2>まとめ</h2>
<p>建設業界は人手不足が続いており、未経験者の方にもチャンスがある業界です。資格取得や経験を積むことで着実にキャリアアップが可能です。</p>
<p>ゲンバキャリアでは、建築・土木・設備・解体に特化した求人情報を掲載しています。あなたに合った求人を探してみてください。</p>', 'job-type', ARRAY['防水','職種解説']::text[], NULL, '防水工の仕事内容、シート防水・ウレタン防水の違い、年収、将来性を解説。', 'ゲンバキャリア編集部', 'published', FALSE, 0, '2026-03-09T00:00:00.000Z', NOW(), NOW()) ON CONFLICT (slug) DO NOTHING;
INSERT INTO articles (id, slug, title, excerpt, body, category, tags, image_url, meta_description, author_name, status, featured, view_count, published_at, created_at, updated_at) VALUES (gen_random_uuid(), 'construction-tax-guide', '建設作業員の確定申告 — 一人親方と会社員の違い', '一人親方の確定申告の基本と、会社員との税金の違い。経費にできるものリスト。', '<p>一人親方の確定申告の基本と、会社員との税金の違い。経費にできるものリスト。</p>

<h2>建設作業員の確定申告について</h2>
<p>この記事では、確定申告・税金に関する情報を詳しく解説します。建設業界で働く方やこれから転職を検討している方に向けて、実践的な内容をまとめました。</p>

<h2>まとめ</h2>
<p>建設業界は人手不足が続いており、未経験者の方にもチャンスがある業界です。資格取得や経験を積むことで着実にキャリアアップが可能です。</p>
<p>ゲンバキャリアでは、建築・土木・設備・解体に特化した求人情報を掲載しています。あなたに合った求人を探してみてください。</p>', 'salary', ARRAY['確定申告','税金']::text[], NULL, '一人親方の確定申告の基本と、会社員との税金の違い。経費にできるものリスト。', 'ゲンバキャリア編集部', 'published', FALSE, 0, '2026-03-10T00:00:00.000Z', NOW(), NOW()) ON CONFLICT (slug) DO NOTHING;
INSERT INTO articles (id, slug, title, excerpt, body, category, tags, image_url, meta_description, author_name, status, featured, view_count, published_at, created_at, updated_at) VALUES (gen_random_uuid(), 'construction-first-day', '建設現場の初日 — 新人が準備すべきこと', '建設会社に入社した初日の流れ。持ち物・服装・挨拶の仕方から現場ルールまで。', '<p>建設会社に入社した初日の流れ。持ち物・服装・挨拶の仕方から現場ルールまで。</p>

<h2>建設現場の初日について</h2>
<p>この記事では、新人・入社準備に関する情報を詳しく解説します。建設業界で働く方やこれから転職を検討している方に向けて、実践的な内容をまとめました。</p>

<h2>まとめ</h2>
<p>建設業界は人手不足が続いており、未経験者の方にもチャンスがある業界です。資格取得や経験を積むことで着実にキャリアアップが可能です。</p>
<p>ゲンバキャリアでは、建築・土木・設備・解体に特化した求人情報を掲載しています。あなたに合った求人を探してみてください。</p>', 'career', ARRAY['新人','入社準備']::text[], NULL, '建設会社に入社した初日の流れ。持ち物・服装・挨拶の仕方から現場ルールまで。', 'ゲンバキャリア編集部', 'published', FALSE, 0, '2026-03-11T00:00:00.000Z', NOW(), NOW()) ON CONFLICT (slug) DO NOTHING;
INSERT INTO articles (id, slug, title, excerpt, body, category, tags, image_url, meta_description, author_name, status, featured, view_count, published_at, created_at, updated_at) VALUES (gen_random_uuid(), 'construction-terminology-50', '建設現場の専門用語50選 — 新人向け', '建設現場でよく使われる専門用語50個をカテゴリ別に解説。これだけ覚えれば現場で困らない。', '<p>建設現場でよく使われる専門用語50個をカテゴリ別に解説。これだけ覚えれば現場で困らない。</p>

<h2>建設現場の専門用語50選について</h2>
<p>この記事では、用語・新人向けに関する情報を詳しく解説します。建設業界で働く方やこれから転職を検討している方に向けて、実践的な内容をまとめました。</p>

<h2>まとめ</h2>
<p>建設業界は人手不足が続いており、未経験者の方にもチャンスがある業界です。資格取得や経験を積むことで着実にキャリアアップが可能です。</p>
<p>ゲンバキャリアでは、建築・土木・設備・解体に特化した求人情報を掲載しています。あなたに合った求人を探してみてください。</p>', 'industry', ARRAY['用語','新人向け']::text[], NULL, '建設現場でよく使われる専門用語50個をカテゴリ別に解説。これだけ覚えれば現場で困らない。', 'ゲンバキャリア編集部', 'published', FALSE, 0, '2026-03-12T00:00:00.000Z', NOW(), NOW()) ON CONFLICT (slug) DO NOTHING;
INSERT INTO articles (id, slug, title, excerpt, body, category, tags, image_url, meta_description, author_name, status, featured, view_count, published_at, created_at, updated_at) VALUES (gen_random_uuid(), 'concrete-work-basics', 'コンクリート工事の基本 — 打設・養生・検査の流れ', 'コンクリート工事の一連の流れ。打設準備から養生期間、強度試験まで現場の基本を解説。', '<p>コンクリート工事の一連の流れ。打設準備から養生期間、強度試験まで現場の基本を解説。</p>

<h2>コンクリート工事の基本について</h2>
<p>この記事では、コンクリート・基礎知識に関する情報を詳しく解説します。建設業界で働く方やこれから転職を検討している方に向けて、実践的な内容をまとめました。</p>

<h2>まとめ</h2>
<p>建設業界は人手不足が続いており、未経験者の方にもチャンスがある業界です。資格取得や経験を積むことで着実にキャリアアップが可能です。</p>
<p>ゲンバキャリアでは、建築・土木・設備・解体に特化した求人情報を掲載しています。あなたに合った求人を探してみてください。</p>', 'job-type', ARRAY['コンクリート','基礎知識']::text[], NULL, 'コンクリート工事の一連の流れ。打設準備から養生期間、強度試験まで現場の基本を解説。', 'ゲンバキャリア編集部', 'published', FALSE, 0, '2026-03-13T00:00:00.000Z', NOW(), NOW()) ON CONFLICT (slug) DO NOTHING;
INSERT INTO articles (id, slug, title, excerpt, body, category, tags, image_url, meta_description, author_name, status, featured, view_count, published_at, created_at, updated_at) VALUES (gen_random_uuid(), 'construction-mentor-system', '建設現場のOJT制度 — 先輩から学ぶ技術習得', '建設業界のOJT（現場教育）の実態。技術を効率よく学ぶためのポイント。', '<p>建設業界のOJT（現場教育）の実態。技術を効率よく学ぶためのポイント。</p>

<h2>建設現場のOJT制度について</h2>
<p>この記事では、OJT・人材育成に関する情報を詳しく解説します。建設業界で働く方やこれから転職を検討している方に向けて、実践的な内容をまとめました。</p>

<h2>まとめ</h2>
<p>建設業界は人手不足が続いており、未経験者の方にもチャンスがある業界です。資格取得や経験を積むことで着実にキャリアアップが可能です。</p>
<p>ゲンバキャリアでは、建築・土木・設備・解体に特化した求人情報を掲載しています。あなたに合った求人を探してみてください。</p>', 'industry', ARRAY['OJT','人材育成']::text[], NULL, '建設業界のOJT（現場教育）の実態。技術を効率よく学ぶためのポイント。', 'ゲンバキャリア編集部', 'published', FALSE, 0, '2026-03-14T00:00:00.000Z', NOW(), NOW()) ON CONFLICT (slug) DO NOTHING;
INSERT INTO articles (id, slug, title, excerpt, body, category, tags, image_url, meta_description, author_name, status, featured, view_count, published_at, created_at, updated_at) VALUES (gen_random_uuid(), 'plaster-board-installer-guide', 'ボード工の仕事内容と年収 — 内装工事の要', '石膏ボードの施工を行うボード工の仕事内容、必要な技術、年収の目安を紹介。', '<p>石膏ボードの施工を行うボード工の仕事内容、必要な技術、年収の目安を紹介。</p>

<h2>ボード工の仕事内容と年収について</h2>
<p>この記事では、ボード工・内装に関する情報を詳しく解説します。建設業界で働く方やこれから転職を検討している方に向けて、実践的な内容をまとめました。</p>

<h2>まとめ</h2>
<p>建設業界は人手不足が続いており、未経験者の方にもチャンスがある業界です。資格取得や経験を積むことで着実にキャリアアップが可能です。</p>
<p>ゲンバキャリアでは、建築・土木・設備・解体に特化した求人情報を掲載しています。あなたに合った求人を探してみてください。</p>', 'job-type', ARRAY['ボード工','内装']::text[], NULL, '石膏ボードの施工を行うボード工の仕事内容、必要な技術、年収の目安を紹介。', 'ゲンバキャリア編集部', 'published', FALSE, 0, '2026-03-15T00:00:00.000Z', NOW(), NOW()) ON CONFLICT (slug) DO NOTHING;
INSERT INTO articles (id, slug, title, excerpt, body, category, tags, image_url, meta_description, author_name, status, featured, view_count, published_at, created_at, updated_at) VALUES (gen_random_uuid(), 'construction-new-employee-salary', '建設業界の初任給 — 高卒と大卒でどう違う？', '建設会社の初任給を高卒・大卒・職種別に比較。入社1年目の手取り額の実態。', '<p>建設会社の初任給を高卒・大卒・職種別に比較。入社1年目の手取り額の実態。</p>

<h2>建設業界の初任給について</h2>
<p>この記事では、初任給・新卒に関する情報を詳しく解説します。建設業界で働く方やこれから転職を検討している方に向けて、実践的な内容をまとめました。</p>

<h2>まとめ</h2>
<p>建設業界は人手不足が続いており、未経験者の方にもチャンスがある業界です。資格取得や経験を積むことで着実にキャリアアップが可能です。</p>
<p>ゲンバキャリアでは、建築・土木・設備・解体に特化した求人情報を掲載しています。あなたに合った求人を探してみてください。</p>', 'salary', ARRAY['初任給','新卒']::text[], NULL, '建設会社の初任給を高卒・大卒・職種別に比較。入社1年目の手取り額の実態。', 'ゲンバキャリア編集部', 'published', FALSE, 0, '2026-03-16T00:00:00.000Z', NOW(), NOW()) ON CONFLICT (slug) DO NOTHING;
INSERT INTO articles (id, slug, title, excerpt, body, category, tags, image_url, meta_description, author_name, status, featured, view_count, published_at, created_at, updated_at) VALUES (gen_random_uuid(), 'construction-license-priority', '建設業界で最初に取るべき資格5選', '入社1〜2年目で取得を目指すべき資格を優先度順に紹介。費用と日数の目安つき。', '<p>入社1〜2年目で取得を目指すべき資格を優先度順に紹介。費用と日数の目安つき。</p>

<h2>建設業界で最初に取るべき資格5選について</h2>
<p>この記事では、資格・新人向けに関する情報を詳しく解説します。建設業界で働く方やこれから転職を検討している方に向けて、実践的な内容をまとめました。</p>

<h2>まとめ</h2>
<p>建設業界は人手不足が続いており、未経験者の方にもチャンスがある業界です。資格取得や経験を積むことで着実にキャリアアップが可能です。</p>
<p>ゲンバキャリアでは、建築・土木・設備・解体に特化した求人情報を掲載しています。あなたに合った求人を探してみてください。</p>', 'license', ARRAY['資格','新人向け']::text[], NULL, '入社1〜2年目で取得を目指すべき資格を優先度順に紹介。費用と日数の目安つき。', 'ゲンバキャリア編集部', 'published', FALSE, 0, '2026-03-17T00:00:00.000Z', NOW(), NOW()) ON CONFLICT (slug) DO NOTHING;
INSERT INTO articles (id, slug, title, excerpt, body, category, tags, image_url, meta_description, author_name, status, featured, view_count, published_at, created_at, updated_at) VALUES (gen_random_uuid(), 'interview-woman-sekokan', '女性施工管理技士のリアル — 現場での苦労と手応え', '建築施工管理技士として働く30代女性のインタビュー。現場での苦労と働きがい。', '<p>建築施工管理技士として働く30代女性のインタビュー。現場での苦労と働きがい。</p>

<h2>女性施工管理技士のリアルについて</h2>
<p>この記事では、女性・施工管理に関する情報を詳しく解説します。建設業界で働く方やこれから転職を検討している方に向けて、実践的な内容をまとめました。</p>

<h2>まとめ</h2>
<p>建設業界は人手不足が続いており、未経験者の方にもチャンスがある業界です。資格取得や経験を積むことで着実にキャリアアップが可能です。</p>
<p>ゲンバキャリアでは、建築・土木・設備・解体に特化した求人情報を掲載しています。あなたに合った求人を探してみてください。</p>', 'interview', ARRAY['女性','施工管理']::text[], NULL, '建築施工管理技士として働く30代女性のインタビュー。現場での苦労と働きがい。', 'ゲンバキャリア編集部', 'published', FALSE, 0, '2026-03-18T00:00:00.000Z', NOW(), NOW()) ON CONFLICT (slug) DO NOTHING;
INSERT INTO articles (id, slug, title, excerpt, body, category, tags, image_url, meta_description, author_name, status, featured, view_count, published_at, created_at, updated_at) VALUES (gen_random_uuid(), 'construction-smartphone-apps', '建設現場で使えるスマホアプリ10選', '施工管理・図面閲覧・写真管理など、現場で役立つスマートフォンアプリを厳選紹介。', '<p>施工管理・図面閲覧・写真管理など、現場で役立つスマートフォンアプリを厳選紹介。</p>

<h2>建設現場で使えるスマホアプリ10選について</h2>
<p>この記事では、アプリ・ICTに関する情報を詳しく解説します。建設業界で働く方やこれから転職を検討している方に向けて、実践的な内容をまとめました。</p>

<h2>まとめ</h2>
<p>建設業界は人手不足が続いており、未経験者の方にもチャンスがある業界です。資格取得や経験を積むことで着実にキャリアアップが可能です。</p>
<p>ゲンバキャリアでは、建築・土木・設備・解体に特化した求人情報を掲載しています。あなたに合った求人を探してみてください。</p>', 'industry', ARRAY['アプリ','ICT']::text[], NULL, '施工管理・図面閲覧・写真管理など、現場で役立つスマートフォンアプリを厳選紹介。', 'ゲンバキャリア編集部', 'published', FALSE, 0, '2026-03-19T00:00:00.000Z', NOW(), NOW()) ON CONFLICT (slug) DO NOTHING;
INSERT INTO articles (id, slug, title, excerpt, body, category, tags, image_url, meta_description, author_name, status, featured, view_count, published_at, created_at, updated_at) VALUES (gen_random_uuid(), 'pipe-fitter-salary', '管工事作業員の年収 — 配管・空調・ガスの比較', '配管工・空調設備工・ガス配管工の年収を比較。管工事施工管理技士の効果も解説。', '<p>配管工・空調設備工・ガス配管工の年収を比較。管工事施工管理技士の効果も解説。</p>

<h2>管工事作業員の年収について</h2>
<p>この記事では、管工事・年収に関する情報を詳しく解説します。建設業界で働く方やこれから転職を検討している方に向けて、実践的な内容をまとめました。</p>

<h2>まとめ</h2>
<p>建設業界は人手不足が続いており、未経験者の方にもチャンスがある業界です。資格取得や経験を積むことで着実にキャリアアップが可能です。</p>
<p>ゲンバキャリアでは、建築・土木・設備・解体に特化した求人情報を掲載しています。あなたに合った求人を探してみてください。</p>', 'salary', ARRAY['管工事','年収']::text[], NULL, '配管工・空調設備工・ガス配管工の年収を比較。管工事施工管理技士の効果も解説。', 'ゲンバキャリア編集部', 'published', FALSE, 0, '2026-03-20T00:00:00.000Z', NOW(), NOW()) ON CONFLICT (slug) DO NOTHING;
INSERT INTO articles (id, slug, title, excerpt, body, category, tags, image_url, meta_description, author_name, status, featured, view_count, published_at, created_at, updated_at) VALUES (gen_random_uuid(), 'high-place-work-license', '高所作業車運転技能講習の取り方と活用場面', '高所作業車の運転資格の種類、講習内容、費用。どんな現場で使うかを具体例で紹介。', '<p>高所作業車の運転資格の種類、講習内容、費用。どんな現場で使うかを具体例で紹介。</p>

<h2>高所作業車運転技能講習の取り方と活用場面について</h2>
<p>この記事では、高所作業車・資格に関する情報を詳しく解説します。建設業界で働く方やこれから転職を検討している方に向けて、実践的な内容をまとめました。</p>

<h2>まとめ</h2>
<p>建設業界は人手不足が続いており、未経験者の方にもチャンスがある業界です。資格取得や経験を積むことで着実にキャリアアップが可能です。</p>
<p>ゲンバキャリアでは、建築・土木・設備・解体に特化した求人情報を掲載しています。あなたに合った求人を探してみてください。</p>', 'license', ARRAY['高所作業車','資格']::text[], NULL, '高所作業車の運転資格の種類、講習内容、費用。どんな現場で使うかを具体例で紹介。', 'ゲンバキャリア編集部', 'published', FALSE, 0, '2026-03-21T00:00:00.000Z', NOW(), NOW()) ON CONFLICT (slug) DO NOTHING;
INSERT INTO articles (id, slug, title, excerpt, body, category, tags, image_url, meta_description, author_name, status, featured, view_count, published_at, created_at, updated_at) VALUES (gen_random_uuid(), 'construction-hierarchy-explained', '建設現場の職制 — 職長・班長・作業員の役割', '建設現場の組織構造。職長・班長・作業員それぞれの役割と責任範囲を解説。', '<p>建設現場の組織構造。職長・班長・作業員それぞれの役割と責任範囲を解説。</p>

<h2>建設現場の職制について</h2>
<p>この記事では、組織・現場管理に関する情報を詳しく解説します。建設業界で働く方やこれから転職を検討している方に向けて、実践的な内容をまとめました。</p>

<h2>まとめ</h2>
<p>建設業界は人手不足が続いており、未経験者の方にもチャンスがある業界です。資格取得や経験を積むことで着実にキャリアアップが可能です。</p>
<p>ゲンバキャリアでは、建築・土木・設備・解体に特化した求人情報を掲載しています。あなたに合った求人を探してみてください。</p>', 'industry', ARRAY['組織','現場管理']::text[], NULL, '建設現場の組織構造。職長・班長・作業員それぞれの役割と責任範囲を解説。', 'ゲンバキャリア編集部', 'published', FALSE, 0, '2026-03-22T00:00:00.000Z', NOW(), NOW()) ON CONFLICT (slug) DO NOTHING;
INSERT INTO articles (id, slug, title, excerpt, body, category, tags, image_url, meta_description, author_name, status, featured, view_count, published_at, created_at, updated_at) VALUES (gen_random_uuid(), 'road-paving-work-guide', '舗装工事の仕事内容 — アスファルト・コンクリート', '道路舗装工事の種類と作業の流れ。必要な重機の操作資格と年収の目安。', '<p>道路舗装工事の種類と作業の流れ。必要な重機の操作資格と年収の目安。</p>

<h2>舗装工事の仕事内容について</h2>
<p>この記事では、舗装・土木に関する情報を詳しく解説します。建設業界で働く方やこれから転職を検討している方に向けて、実践的な内容をまとめました。</p>

<h2>まとめ</h2>
<p>建設業界は人手不足が続いており、未経験者の方にもチャンスがある業界です。資格取得や経験を積むことで着実にキャリアアップが可能です。</p>
<p>ゲンバキャリアでは、建築・土木・設備・解体に特化した求人情報を掲載しています。あなたに合った求人を探してみてください。</p>', 'job-type', ARRAY['舗装','土木']::text[], NULL, '道路舗装工事の種類と作業の流れ。必要な重機の操作資格と年収の目安。', 'ゲンバキャリア編集部', 'published', FALSE, 0, '2026-03-23T00:00:00.000Z', NOW(), NOW()) ON CONFLICT (slug) DO NOTHING;
INSERT INTO articles (id, slug, title, excerpt, body, category, tags, image_url, meta_description, author_name, status, featured, view_count, published_at, created_at, updated_at) VALUES (gen_random_uuid(), 'construction-independent-guide', '建設業で独立する方法 — 一人親方から法人化まで', '一人親方として独立する手順、必要な届出、法人化のタイミングを経験者が解説。', '<p>一人親方として独立する手順、必要な届出、法人化のタイミングを経験者が解説。</p>

<h2>建設業で独立する方法について</h2>
<p>この記事では、独立・一人親方に関する情報を詳しく解説します。建設業界で働く方やこれから転職を検討している方に向けて、実践的な内容をまとめました。</p>

<h2>まとめ</h2>
<p>建設業界は人手不足が続いており、未経験者の方にもチャンスがある業界です。資格取得や経験を積むことで着実にキャリアアップが可能です。</p>
<p>ゲンバキャリアでは、建築・土木・設備・解体に特化した求人情報を掲載しています。あなたに合った求人を探してみてください。</p>', 'career', ARRAY['独立','一人親方']::text[], NULL, '一人親方として独立する手順、必要な届出、法人化のタイミングを経験者が解説。', 'ゲンバキャリア編集部', 'published', FALSE, 0, '2026-03-24T00:00:00.000Z', NOW(), NOW()) ON CONFLICT (slug) DO NOTHING;
INSERT INTO articles (id, slug, title, excerpt, body, category, tags, image_url, meta_description, author_name, status, featured, view_count, published_at, created_at, updated_at) VALUES (gen_random_uuid(), 'building-inspector-license', '建築物環境衛生管理技術者の資格と仕事', '通称「ビル管」の資格概要、受験資格、試験内容、取得後のキャリアを解説。', '<p>通称「ビル管」の資格概要、受験資格、試験内容、取得後のキャリアを解説。</p>

<h2>建築物環境衛生管理技術者の資格と仕事について</h2>
<p>この記事では、ビル管理・資格に関する情報を詳しく解説します。建設業界で働く方やこれから転職を検討している方に向けて、実践的な内容をまとめました。</p>

<h2>まとめ</h2>
<p>建設業界は人手不足が続いており、未経験者の方にもチャンスがある業界です。資格取得や経験を積むことで着実にキャリアアップが可能です。</p>
<p>ゲンバキャリアでは、建築・土木・設備・解体に特化した求人情報を掲載しています。あなたに合った求人を探してみてください。</p>', 'license', ARRAY['ビル管理','資格']::text[], NULL, '通称「ビル管」の資格概要、受験資格、試験内容、取得後のキャリアを解説。', 'ゲンバキャリア編集部', 'published', FALSE, 0, '2026-03-25T00:00:00.000Z', NOW(), NOW()) ON CONFLICT (slug) DO NOTHING;
INSERT INTO articles (id, slug, title, excerpt, body, category, tags, image_url, meta_description, author_name, status, featured, view_count, published_at, created_at, updated_at) VALUES (gen_random_uuid(), 'construction-rain-day-work', '雨の日の建設現場 — 中止基準と待機時の給与', '雨天時の作業中止基準、待機中の給与支払い、室内作業への切り替えについて。', '<p>雨天時の作業中止基準、待機中の給与支払い、室内作業への切り替えについて。</p>

<h2>雨の日の建設現場について</h2>
<p>この記事では、雨天・労働条件に関する情報を詳しく解説します。建設業界で働く方やこれから転職を検討している方に向けて、実践的な内容をまとめました。</p>

<h2>まとめ</h2>
<p>建設業界は人手不足が続いており、未経験者の方にもチャンスがある業界です。資格取得や経験を積むことで着実にキャリアアップが可能です。</p>
<p>ゲンバキャリアでは、建築・土木・設備・解体に特化した求人情報を掲載しています。あなたに合った求人を探してみてください。</p>', 'industry', ARRAY['雨天','労働条件']::text[], NULL, '雨天時の作業中止基準、待機中の給与支払い、室内作業への切り替えについて。', 'ゲンバキャリア編集部', 'published', FALSE, 0, '2026-03-26T00:00:00.000Z', NOW(), NOW()) ON CONFLICT (slug) DO NOTHING;
INSERT INTO articles (id, slug, title, excerpt, body, category, tags, image_url, meta_description, author_name, status, featured, view_count, published_at, created_at, updated_at) VALUES (gen_random_uuid(), 'construction-skill-sheet', '建設業界のスキルマップ — 自分のレベルを把握する', '技術力・資格・経験年数を可視化するスキルマップの作り方。転職や昇給交渉にも活用。', '<p>技術力・資格・経験年数を可視化するスキルマップの作り方。転職や昇給交渉にも活用。</p>

<h2>建設業界のスキルマップについて</h2>
<p>この記事では、スキル・自己分析に関する情報を詳しく解説します。建設業界で働く方やこれから転職を検討している方に向けて、実践的な内容をまとめました。</p>

<h2>まとめ</h2>
<p>建設業界は人手不足が続いており、未経験者の方にもチャンスがある業界です。資格取得や経験を積むことで着実にキャリアアップが可能です。</p>
<p>ゲンバキャリアでは、建築・土木・設備・解体に特化した求人情報を掲載しています。あなたに合った求人を探してみてください。</p>', 'career', ARRAY['スキル','自己分析']::text[], NULL, '技術力・資格・経験年数を可視化するスキルマップの作り方。転職や昇給交渉にも活用。', 'ゲンバキャリア編集部', 'published', FALSE, 0, '2026-03-27T00:00:00.000Z', NOW(), NOW()) ON CONFLICT (slug) DO NOTHING;
INSERT INTO articles (id, slug, title, excerpt, body, category, tags, image_url, meta_description, author_name, status, featured, view_count, published_at, created_at, updated_at) VALUES (gen_random_uuid(), 'excavation-work-guide', '掘削工事の種類と安全管理 — 基礎知識', '根切り・開削・推進工法など掘削工事の種類。土留め工法と安全管理のポイント。', '<p>根切り・開削・推進工法など掘削工事の種類。土留め工法と安全管理のポイント。</p>

<h2>掘削工事の種類と安全管理について</h2>
<p>この記事では、掘削・安全に関する情報を詳しく解説します。建設業界で働く方やこれから転職を検討している方に向けて、実践的な内容をまとめました。</p>

<h2>まとめ</h2>
<p>建設業界は人手不足が続いており、未経験者の方にもチャンスがある業界です。資格取得や経験を積むことで着実にキャリアアップが可能です。</p>
<p>ゲンバキャリアでは、建築・土木・設備・解体に特化した求人情報を掲載しています。あなたに合った求人を探してみてください。</p>', 'job-type', ARRAY['掘削','安全']::text[], NULL, '根切り・開削・推進工法など掘削工事の種類。土留め工法と安全管理のポイント。', 'ゲンバキャリア編集部', 'published', FALSE, 0, '2026-03-28T00:00:00.000Z', NOW(), NOW()) ON CONFLICT (slug) DO NOTHING;
INSERT INTO articles (id, slug, title, excerpt, body, category, tags, image_url, meta_description, author_name, status, featured, view_count, published_at, created_at, updated_at) VALUES (gen_random_uuid(), 'construction-cad-operator', '建設業界のCADオペレーター — 仕事内容と年収', '建設現場で使われるCADの種類、オペレーターの仕事内容、年収、在宅ワークの可能性。', '<p>建設現場で使われるCADの種類、オペレーターの仕事内容、年収、在宅ワークの可能性。</p>

<h2>建設業界のCADオペレーターについて</h2>
<p>この記事では、CAD・設計に関する情報を詳しく解説します。建設業界で働く方やこれから転職を検討している方に向けて、実践的な内容をまとめました。</p>

<h2>まとめ</h2>
<p>建設業界は人手不足が続いており、未経験者の方にもチャンスがある業界です。資格取得や経験を積むことで着実にキャリアアップが可能です。</p>
<p>ゲンバキャリアでは、建築・土木・設備・解体に特化した求人情報を掲載しています。あなたに合った求人を探してみてください。</p>', 'job-type', ARRAY['CAD','設計']::text[], NULL, '建設現場で使われるCADの種類、オペレーターの仕事内容、年収、在宅ワークの可能性。', 'ゲンバキャリア編集部', 'published', FALSE, 0, '2026-03-29T00:00:00.000Z', NOW(), NOW()) ON CONFLICT (slug) DO NOTHING;
INSERT INTO articles (id, slug, title, excerpt, body, category, tags, image_url, meta_description, author_name, status, featured, view_count, published_at, created_at, updated_at) VALUES (gen_random_uuid(), 'management-license-comparison', '施工管理技士6種類を比較 — どれを取るべき？', '建築・土木・電気・管・造園・建設機械の施工管理技士6種を難易度・需要・年収で比較。', '<p>建築・土木・電気・管・造園・建設機械の施工管理技士6種を難易度・需要・年収で比較。</p>

<h2>施工管理技士6種類を比較について</h2>
<p>この記事では、施工管理技士・比較に関する情報を詳しく解説します。建設業界で働く方やこれから転職を検討している方に向けて、実践的な内容をまとめました。</p>

<h2>まとめ</h2>
<p>建設業界は人手不足が続いており、未経験者の方にもチャンスがある業界です。資格取得や経験を積むことで着実にキャリアアップが可能です。</p>
<p>ゲンバキャリアでは、建築・土木・設備・解体に特化した求人情報を掲載しています。あなたに合った求人を探してみてください。</p>', 'license', ARRAY['施工管理技士','比較']::text[], NULL, '建築・土木・電気・管・造園・建設機械の施工管理技士6種を難易度・需要・年収で比較。', 'ゲンバキャリア編集部', 'published', FALSE, 0, '2026-03-30T00:00:00.000Z', NOW(), NOW()) ON CONFLICT (slug) DO NOTHING;
INSERT INTO articles (id, slug, title, excerpt, body, category, tags, image_url, meta_description, author_name, status, featured, view_count, published_at, created_at, updated_at) VALUES (gen_random_uuid(), 'construction-training-cost', '建設系資格の取得費用一覧 — 会社負担はどこまで？', '主要な建設系資格の受験料・講習費用一覧。会社の資格取得支援制度の実態。', '<p>主要な建設系資格の受験料・講習費用一覧。会社の資格取得支援制度の実態。</p>

<h2>建設系資格の取得費用一覧について</h2>
<p>この記事では、資格費用・福利厚生に関する情報を詳しく解説します。建設業界で働く方やこれから転職を検討している方に向けて、実践的な内容をまとめました。</p>

<h2>まとめ</h2>
<p>建設業界は人手不足が続いており、未経験者の方にもチャンスがある業界です。資格取得や経験を積むことで着実にキャリアアップが可能です。</p>
<p>ゲンバキャリアでは、建築・土木・設備・解体に特化した求人情報を掲載しています。あなたに合った求人を探してみてください。</p>', 'salary', ARRAY['資格費用','福利厚生']::text[], NULL, '主要な建設系資格の受験料・講習費用一覧。会社の資格取得支援制度の実態。', 'ゲンバキャリア編集部', 'published', FALSE, 0, '2026-03-31T00:00:00.000Z', NOW(), NOW()) ON CONFLICT (slug) DO NOTHING;
INSERT INTO articles (id, slug, title, excerpt, body, category, tags, image_url, meta_description, author_name, status, featured, view_count, published_at, created_at, updated_at) VALUES (gen_random_uuid(), 'interview-sekokan-5years', '施工管理5年目のキャリアと年収の変化', '施工管理技士として5年目を迎えた29歳のリアル。年収の推移とこれからの目標。', '<p>施工管理技士として5年目を迎えた29歳のリアル。年収の推移とこれからの目標。</p>

<h2>施工管理5年目のキャリアと年収の変化について</h2>
<p>この記事では、施工管理・キャリアに関する情報を詳しく解説します。建設業界で働く方やこれから転職を検討している方に向けて、実践的な内容をまとめました。</p>

<h2>まとめ</h2>
<p>建設業界は人手不足が続いており、未経験者の方にもチャンスがある業界です。資格取得や経験を積むことで着実にキャリアアップが可能です。</p>
<p>ゲンバキャリアでは、建築・土木・設備・解体に特化した求人情報を掲載しています。あなたに合った求人を探してみてください。</p>', 'interview', ARRAY['施工管理','キャリア']::text[], NULL, '施工管理技士として5年目を迎えた29歳のリアル。年収の推移とこれからの目標。', 'ゲンバキャリア編集部', 'published', FALSE, 0, '2026-04-01T00:00:00.000Z', NOW(), NOW()) ON CONFLICT (slug) DO NOTHING;
INSERT INTO articles (id, slug, title, excerpt, body, category, tags, image_url, meta_description, author_name, status, featured, view_count, published_at, created_at, updated_at) VALUES (gen_random_uuid(), 'construction-bim-basics', 'BIMとは何か — 建設業界のデジタル化入門', 'BIM（Building Information Modeling）の基本概念と建設現場での活用事例を初心者向けに解説。', '<p>BIM（Building Information Modeling）の基本概念と建設現場での活用事例を初心者向けに解説。</p>

<h2>BIMとは何かについて</h2>
<p>この記事では、BIM・ICTに関する情報を詳しく解説します。建設業界で働く方やこれから転職を検討している方に向けて、実践的な内容をまとめました。</p>

<h2>まとめ</h2>
<p>建設業界は人手不足が続いており、未経験者の方にもチャンスがある業界です。資格取得や経験を積むことで着実にキャリアアップが可能です。</p>
<p>ゲンバキャリアでは、建築・土木・設備・解体に特化した求人情報を掲載しています。あなたに合った求人を探してみてください。</p>', 'industry', ARRAY['BIM','ICT']::text[], NULL, 'BIM（Building Information Modeling）の基本概念と建設現場での活用事例を初心者向けに解説。', 'ゲンバキャリア編集部', 'published', FALSE, 0, '2026-04-02T00:00:00.000Z', NOW(), NOW()) ON CONFLICT (slug) DO NOTHING;
INSERT INTO articles (id, slug, title, excerpt, body, category, tags, image_url, meta_description, author_name, status, featured, view_count, published_at, created_at, updated_at) VALUES (gen_random_uuid(), 'steel-frame-worker-guide', '鉄骨工の仕事内容と年収 — 高所作業のプロ', '鉄骨建方・溶接・ボルト締めなど鉄骨工の仕事内容、必要な資格、年収を紹介。', '<p>鉄骨建方・溶接・ボルト締めなど鉄骨工の仕事内容、必要な資格、年収を紹介。</p>

<h2>鉄骨工の仕事内容と年収について</h2>
<p>この記事では、鉄骨・職種解説に関する情報を詳しく解説します。建設業界で働く方やこれから転職を検討している方に向けて、実践的な内容をまとめました。</p>

<h2>まとめ</h2>
<p>建設業界は人手不足が続いており、未経験者の方にもチャンスがある業界です。資格取得や経験を積むことで着実にキャリアアップが可能です。</p>
<p>ゲンバキャリアでは、建築・土木・設備・解体に特化した求人情報を掲載しています。あなたに合った求人を探してみてください。</p>', 'job-type', ARRAY['鉄骨','職種解説']::text[], NULL, '鉄骨建方・溶接・ボルト締めなど鉄骨工の仕事内容、必要な資格、年収を紹介。', 'ゲンバキャリア編集部', 'published', FALSE, 0, '2026-04-03T00:00:00.000Z', NOW(), NOW()) ON CONFLICT (slug) DO NOTHING;
INSERT INTO articles (id, slug, title, excerpt, body, category, tags, image_url, meta_description, author_name, status, featured, view_count, published_at, created_at, updated_at) VALUES (gen_random_uuid(), 'construction-benefit-comparison', '建設会社の福利厚生比較 — 確認すべき10項目', '社会保険・退職金・資格手当・寮など、入社前に確認すべき福利厚生10項目。', '<p>社会保険・退職金・資格手当・寮など、入社前に確認すべき福利厚生10項目。</p>

<h2>建設会社の福利厚生比較について</h2>
<p>この記事では、福利厚生・比較に関する情報を詳しく解説します。建設業界で働く方やこれから転職を検討している方に向けて、実践的な内容をまとめました。</p>

<h2>まとめ</h2>
<p>建設業界は人手不足が続いており、未経験者の方にもチャンスがある業界です。資格取得や経験を積むことで着実にキャリアアップが可能です。</p>
<p>ゲンバキャリアでは、建築・土木・設備・解体に特化した求人情報を掲載しています。あなたに合った求人を探してみてください。</p>', 'salary', ARRAY['福利厚生','比較']::text[], NULL, '社会保険・退職金・資格手当・寮など、入社前に確認すべき福利厚生10項目。', 'ゲンバキャリア編集部', 'published', FALSE, 0, '2026-04-04T00:00:00.000Z', NOW(), NOW()) ON CONFLICT (slug) DO NOTHING;
INSERT INTO articles (id, slug, title, excerpt, body, category, tags, image_url, meta_description, author_name, status, featured, view_count, published_at, created_at, updated_at) VALUES (gen_random_uuid(), 'organic-solvent-license', '有機溶剤作業主任者の資格 — 取得方法と必要な現場', '有機溶剤作業主任者技能講習の概要。塗装・防水工事で必要な場面を解説。', '<p>有機溶剤作業主任者技能講習の概要。塗装・防水工事で必要な場面を解説。</p>

<h2>有機溶剤作業主任者の資格について</h2>
<p>この記事では、有機溶剤・安全資格に関する情報を詳しく解説します。建設業界で働く方やこれから転職を検討している方に向けて、実践的な内容をまとめました。</p>

<h2>まとめ</h2>
<p>建設業界は人手不足が続いており、未経験者の方にもチャンスがある業界です。資格取得や経験を積むことで着実にキャリアアップが可能です。</p>
<p>ゲンバキャリアでは、建築・土木・設備・解体に特化した求人情報を掲載しています。あなたに合った求人を探してみてください。</p>', 'license', ARRAY['有機溶剤','安全資格']::text[], NULL, '有機溶剤作業主任者技能講習の概要。塗装・防水工事で必要な場面を解説。', 'ゲンバキャリア編集部', 'published', FALSE, 0, '2026-04-05T00:00:00.000Z', NOW(), NOW()) ON CONFLICT (slug) DO NOTHING;
INSERT INTO articles (id, slug, title, excerpt, body, category, tags, image_url, meta_description, author_name, status, featured, view_count, published_at, created_at, updated_at) VALUES (gen_random_uuid(), 'construction-subcontractor-guide', '建設業の元請と下請の関係 — 仕組みと注意点', '建設業界の重層下請構造の仕組み。元請・一次下請・二次下請の関係と注意すべき点。', '<p>建設業界の重層下請構造の仕組み。元請・一次下請・二次下請の関係と注意すべき点。</p>

<h2>建設業の元請と下請の関係について</h2>
<p>この記事では、元請・下請に関する情報を詳しく解説します。建設業界で働く方やこれから転職を検討している方に向けて、実践的な内容をまとめました。</p>

<h2>まとめ</h2>
<p>建設業界は人手不足が続いており、未経験者の方にもチャンスがある業界です。資格取得や経験を積むことで着実にキャリアアップが可能です。</p>
<p>ゲンバキャリアでは、建築・土木・設備・解体に特化した求人情報を掲載しています。あなたに合った求人を探してみてください。</p>', 'industry', ARRAY['元請','下請']::text[], NULL, '建設業界の重層下請構造の仕組み。元請・一次下請・二次下請の関係と注意すべき点。', 'ゲンバキャリア編集部', 'published', FALSE, 0, '2026-04-06T00:00:00.000Z', NOW(), NOW()) ON CONFLICT (slug) DO NOTHING;
INSERT INTO articles (id, slug, title, excerpt, body, category, tags, image_url, meta_description, author_name, status, featured, view_count, published_at, created_at, updated_at) VALUES (gen_random_uuid(), 'tunnel-work-guide', 'トンネル工事の仕事内容 — 山岳工法とシールド工法', 'トンネル工事の2大工法と作業内容。特殊な資格、給与、勤務形態を解説。', '<p>トンネル工事の2大工法と作業内容。特殊な資格、給与、勤務形態を解説。</p>

<h2>トンネル工事の仕事内容について</h2>
<p>この記事では、トンネル・土木に関する情報を詳しく解説します。建設業界で働く方やこれから転職を検討している方に向けて、実践的な内容をまとめました。</p>

<h2>まとめ</h2>
<p>建設業界は人手不足が続いており、未経験者の方にもチャンスがある業界です。資格取得や経験を積むことで着実にキャリアアップが可能です。</p>
<p>ゲンバキャリアでは、建築・土木・設備・解体に特化した求人情報を掲載しています。あなたに合った求人を探してみてください。</p>', 'job-type', ARRAY['トンネル','土木']::text[], NULL, 'トンネル工事の2大工法と作業内容。特殊な資格、給与、勤務形態を解説。', 'ゲンバキャリア編集部', 'published', FALSE, 0, '2026-04-07T00:00:00.000Z', NOW(), NOW()) ON CONFLICT (slug) DO NOTHING;
INSERT INTO articles (id, slug, title, excerpt, body, category, tags, image_url, meta_description, author_name, status, featured, view_count, published_at, created_at, updated_at) VALUES (gen_random_uuid(), 'construction-career-at-30', '30代から建設業界へ転職 — 未経験でも遅くない理由', '30代で建設業界に転職するメリットとデメリット。成功のポイントを経験者が解説。', '<p>30代で建設業界に転職するメリットとデメリット。成功のポイントを経験者が解説。</p>

<h2>30代から建設業界へ転職について</h2>
<p>この記事では、30代・転職に関する情報を詳しく解説します。建設業界で働く方やこれから転職を検討している方に向けて、実践的な内容をまとめました。</p>

<h2>まとめ</h2>
<p>建設業界は人手不足が続いており、未経験者の方にもチャンスがある業界です。資格取得や経験を積むことで着実にキャリアアップが可能です。</p>
<p>ゲンバキャリアでは、建築・土木・設備・解体に特化した求人情報を掲載しています。あなたに合った求人を探してみてください。</p>', 'career', ARRAY['30代','転職']::text[], NULL, '30代で建設業界に転職するメリットとデメリット。成功のポイントを経験者が解説。', 'ゲンバキャリア編集部', 'published', FALSE, 0, '2026-04-08T00:00:00.000Z', NOW(), NOW()) ON CONFLICT (slug) DO NOTHING;
INSERT INTO articles (id, slug, title, excerpt, body, category, tags, image_url, meta_description, author_name, status, featured, view_count, published_at, created_at, updated_at) VALUES (gen_random_uuid(), 'construction-night-salary-premium', '建設業の各種手当一覧 — 夜勤・危険・資格手当', '夜勤手当・危険手当・資格手当・現場手当など建設業界の各種手当の相場。', '<p>夜勤手当・危険手当・資格手当・現場手当など建設業界の各種手当の相場。</p>

<h2>建設業の各種手当一覧について</h2>
<p>この記事では、手当・給与に関する情報を詳しく解説します。建設業界で働く方やこれから転職を検討している方に向けて、実践的な内容をまとめました。</p>

<h2>まとめ</h2>
<p>建設業界は人手不足が続いており、未経験者の方にもチャンスがある業界です。資格取得や経験を積むことで着実にキャリアアップが可能です。</p>
<p>ゲンバキャリアでは、建築・土木・設備・解体に特化した求人情報を掲載しています。あなたに合った求人を探してみてください。</p>', 'salary', ARRAY['手当','給与']::text[], NULL, '夜勤手当・危険手当・資格手当・現場手当など建設業界の各種手当の相場。', 'ゲンバキャリア編集部', 'published', FALSE, 0, '2026-04-09T00:00:00.000Z', NOW(), NOW()) ON CONFLICT (slug) DO NOTHING;
INSERT INTO articles (id, slug, title, excerpt, body, category, tags, image_url, meta_description, author_name, status, featured, view_count, published_at, created_at, updated_at) VALUES (gen_random_uuid(), 'small-construction-license', '小型移動式クレーン運転技能講習 — 取得ガイド', '小型移動式クレーン（つり上げ荷重5t未満）の運転技能講習。日数・費用・試験内容。', '<p>小型移動式クレーン（つり上げ荷重5t未満）の運転技能講習。日数・費用・試験内容。</p>

<h2>小型移動式クレーン運転技能講習について</h2>
<p>この記事では、クレーン・資格に関する情報を詳しく解説します。建設業界で働く方やこれから転職を検討している方に向けて、実践的な内容をまとめました。</p>

<h2>まとめ</h2>
<p>建設業界は人手不足が続いており、未経験者の方にもチャンスがある業界です。資格取得や経験を積むことで着実にキャリアアップが可能です。</p>
<p>ゲンバキャリアでは、建築・土木・設備・解体に特化した求人情報を掲載しています。あなたに合った求人を探してみてください。</p>', 'license', ARRAY['クレーン','資格']::text[], NULL, '小型移動式クレーン（つり上げ荷重5t未満）の運転技能講習。日数・費用・試験内容。', 'ゲンバキャリア編集部', 'published', FALSE, 0, '2026-04-10T00:00:00.000Z', NOW(), NOW()) ON CONFLICT (slug) DO NOTHING;
INSERT INTO articles (id, slug, title, excerpt, body, category, tags, image_url, meta_description, author_name, status, featured, view_count, published_at, created_at, updated_at) VALUES (gen_random_uuid(), 'interview-couple-construction', '夫婦で建設業界 — 内装工事の家族経営の現実', '夫婦でクロス貼りの仕事をしている40代の体験談。家族経営のメリットと難しさ。', '<p>夫婦でクロス貼りの仕事をしている40代の体験談。家族経営のメリットと難しさ。</p>

<h2>夫婦で建設業界について</h2>
<p>この記事では、家族経営・内装に関する情報を詳しく解説します。建設業界で働く方やこれから転職を検討している方に向けて、実践的な内容をまとめました。</p>

<h2>まとめ</h2>
<p>建設業界は人手不足が続いており、未経験者の方にもチャンスがある業界です。資格取得や経験を積むことで着実にキャリアアップが可能です。</p>
<p>ゲンバキャリアでは、建築・土木・設備・解体に特化した求人情報を掲載しています。あなたに合った求人を探してみてください。</p>', 'interview', ARRAY['家族経営','内装']::text[], NULL, '夫婦でクロス貼りの仕事をしている40代の体験談。家族経営のメリットと難しさ。', 'ゲンバキャリア編集部', 'published', FALSE, 0, '2026-04-11T00:00:00.000Z', NOW(), NOW()) ON CONFLICT (slug) DO NOTHING;
INSERT INTO articles (id, slug, title, excerpt, body, category, tags, image_url, meta_description, author_name, status, featured, view_count, published_at, created_at, updated_at) VALUES (gen_random_uuid(), 'construction-rainy-season-safety', '梅雨時期の建設現場 — 安全対策と工程管理', '梅雨時期の建設現場で注意すべき安全対策。足元の滑り防止、電気設備の漏電対策など。', '<p>梅雨時期の建設現場で注意すべき安全対策。足元の滑り防止、電気設備の漏電対策など。</p>

<h2>梅雨時期の建設現場について</h2>
<p>この記事では、梅雨・安全対策に関する情報を詳しく解説します。建設業界で働く方やこれから転職を検討している方に向けて、実践的な内容をまとめました。</p>

<h2>まとめ</h2>
<p>建設業界は人手不足が続いており、未経験者の方にもチャンスがある業界です。資格取得や経験を積むことで着実にキャリアアップが可能です。</p>
<p>ゲンバキャリアでは、建築・土木・設備・解体に特化した求人情報を掲載しています。あなたに合った求人を探してみてください。</p>', 'industry', ARRAY['梅雨','安全対策']::text[], NULL, '梅雨時期の建設現場で注意すべき安全対策。足元の滑り防止、電気設備の漏電対策など。', 'ゲンバキャリア編集部', 'published', FALSE, 0, '2026-04-12T00:00:00.000Z', NOW(), NOW()) ON CONFLICT (slug) DO NOTHING;
INSERT INTO articles (id, slug, title, excerpt, body, category, tags, image_url, meta_description, author_name, status, featured, view_count, published_at, created_at, updated_at) VALUES (gen_random_uuid(), 'construction-moisture-measures', '雨天時のコンクリート打設 — 品質管理のポイント', '雨天時のコンクリート打設は可能か。養生方法と品質を確保するための管理ポイント。', '<p>雨天時のコンクリート打設は可能か。養生方法と品質を確保するための管理ポイント。</p>

<h2>雨天時のコンクリート打設について</h2>
<p>この記事では、コンクリート・品質管理に関する情報を詳しく解説します。建設業界で働く方やこれから転職を検討している方に向けて、実践的な内容をまとめました。</p>

<h2>まとめ</h2>
<p>建設業界は人手不足が続いており、未経験者の方にもチャンスがある業界です。資格取得や経験を積むことで着実にキャリアアップが可能です。</p>
<p>ゲンバキャリアでは、建築・土木・設備・解体に特化した求人情報を掲載しています。あなたに合った求人を探してみてください。</p>', 'industry', ARRAY['コンクリート','品質管理']::text[], NULL, '雨天時のコンクリート打設は可能か。養生方法と品質を確保するための管理ポイント。', 'ゲンバキャリア編集部', 'published', FALSE, 0, '2026-04-13T00:00:00.000Z', NOW(), NOW()) ON CONFLICT (slug) DO NOTHING;
INSERT INTO articles (id, slug, title, excerpt, body, category, tags, image_url, meta_description, author_name, status, featured, view_count, published_at, created_at, updated_at) VALUES (gen_random_uuid(), 'drainage-work-guide', '排水設備工事の仕事内容と必要な資格', '排水設備工事の種類、仕事内容、排水設備工事責任技術者の資格について解説。', '<p>排水設備工事の種類、仕事内容、排水設備工事責任技術者の資格について解説。</p>

<h2>排水設備工事の仕事内容と必要な資格について</h2>
<p>この記事では、排水・設備に関する情報を詳しく解説します。建設業界で働く方やこれから転職を検討している方に向けて、実践的な内容をまとめました。</p>

<h2>まとめ</h2>
<p>建設業界は人手不足が続いており、未経験者の方にもチャンスがある業界です。資格取得や経験を積むことで着実にキャリアアップが可能です。</p>
<p>ゲンバキャリアでは、建築・土木・設備・解体に特化した求人情報を掲載しています。あなたに合った求人を探してみてください。</p>', 'job-type', ARRAY['排水','設備']::text[], NULL, '排水設備工事の種類、仕事内容、排水設備工事責任技術者の資格について解説。', 'ゲンバキャリア編集部', 'published', FALSE, 0, '2026-04-14T00:00:00.000Z', NOW(), NOW()) ON CONFLICT (slug) DO NOTHING;
INSERT INTO articles (id, slug, title, excerpt, body, category, tags, image_url, meta_description, author_name, status, featured, view_count, published_at, created_at, updated_at) VALUES (gen_random_uuid(), 'construction-insurance-guide', '建設業の労災保険 — 補償内容と申請手続き', '建設現場での労災事故。補償の内容、申請の流れ、一人親方の特別加入について。', '<p>建設現場での労災事故。補償の内容、申請の流れ、一人親方の特別加入について。</p>

<h2>建設業の労災保険について</h2>
<p>この記事では、労災・保険に関する情報を詳しく解説します。建設業界で働く方やこれから転職を検討している方に向けて、実践的な内容をまとめました。</p>

<h2>まとめ</h2>
<p>建設業界は人手不足が続いており、未経験者の方にもチャンスがある業界です。資格取得や経験を積むことで着実にキャリアアップが可能です。</p>
<p>ゲンバキャリアでは、建築・土木・設備・解体に特化した求人情報を掲載しています。あなたに合った求人を探してみてください。</p>', 'industry', ARRAY['労災','保険']::text[], NULL, '建設現場での労災事故。補償の内容、申請の流れ、一人親方の特別加入について。', 'ゲンバキャリア編集部', 'published', FALSE, 0, '2026-04-15T00:00:00.000Z', NOW(), NOW()) ON CONFLICT (slug) DO NOTHING;
INSERT INTO articles (id, slug, title, excerpt, body, category, tags, image_url, meta_description, author_name, status, featured, view_count, published_at, created_at, updated_at) VALUES (gen_random_uuid(), 'scaffolding-safety-rules', '足場作業の安全ルール — 法改正のポイント', '足場作業に関する労働安全衛生法の最新改正ポイント。特別教育の義務化と内容。', '<p>足場作業に関する労働安全衛生法の最新改正ポイント。特別教育の義務化と内容。</p>

<h2>足場作業の安全ルールについて</h2>
<p>この記事では、足場・安全法規に関する情報を詳しく解説します。建設業界で働く方やこれから転職を検討している方に向けて、実践的な内容をまとめました。</p>

<h2>まとめ</h2>
<p>建設業界は人手不足が続いており、未経験者の方にもチャンスがある業界です。資格取得や経験を積むことで着実にキャリアアップが可能です。</p>
<p>ゲンバキャリアでは、建築・土木・設備・解体に特化した求人情報を掲載しています。あなたに合った求人を探してみてください。</p>', 'license', ARRAY['足場','安全法規']::text[], NULL, '足場作業に関する労働安全衛生法の最新改正ポイント。特別教育の義務化と内容。', 'ゲンバキャリア編集部', 'published', FALSE, 0, '2026-04-16T00:00:00.000Z', NOW(), NOW()) ON CONFLICT (slug) DO NOTHING;
INSERT INTO articles (id, slug, title, excerpt, body, category, tags, image_url, meta_description, author_name, status, featured, view_count, published_at, created_at, updated_at) VALUES (gen_random_uuid(), 'construction-drone-survey', 'ドローン測量の基本 — 建設業界での活用と資格', '建設現場でのドローン活用事例。測量・点検での使い方と操縦に必要な資格。', '<p>建設現場でのドローン活用事例。測量・点検での使い方と操縦に必要な資格。</p>

<h2>ドローン測量の基本について</h2>
<p>この記事では、ドローン・測量に関する情報を詳しく解説します。建設業界で働く方やこれから転職を検討している方に向けて、実践的な内容をまとめました。</p>

<h2>まとめ</h2>
<p>建設業界は人手不足が続いており、未経験者の方にもチャンスがある業界です。資格取得や経験を積むことで着実にキャリアアップが可能です。</p>
<p>ゲンバキャリアでは、建築・土木・設備・解体に特化した求人情報を掲載しています。あなたに合った求人を探してみてください。</p>', 'industry', ARRAY['ドローン','測量']::text[], NULL, '建設現場でのドローン活用事例。測量・点検での使い方と操縦に必要な資格。', 'ゲンバキャリア編集部', 'published', FALSE, 0, '2026-04-17T00:00:00.000Z', NOW(), NOW()) ON CONFLICT (slug) DO NOTHING;
INSERT INTO articles (id, slug, title, excerpt, body, category, tags, image_url, meta_description, author_name, status, featured, view_count, published_at, created_at, updated_at) VALUES (gen_random_uuid(), 'interview-50s-construction', '50代で建設業界に転職 — セカンドキャリアの選択', '50代で警備員から建設作業員に転職した男性の体験。体力面の工夫と収入の変化。', '<p>50代で警備員から建設作業員に転職した男性の体験。体力面の工夫と収入の変化。</p>

<h2>50代で建設業界に転職について</h2>
<p>この記事では、50代・転職体験に関する情報を詳しく解説します。建設業界で働く方やこれから転職を検討している方に向けて、実践的な内容をまとめました。</p>

<h2>まとめ</h2>
<p>建設業界は人手不足が続いており、未経験者の方にもチャンスがある業界です。資格取得や経験を積むことで着実にキャリアアップが可能です。</p>
<p>ゲンバキャリアでは、建築・土木・設備・解体に特化した求人情報を掲載しています。あなたに合った求人を探してみてください。</p>', 'interview', ARRAY['50代','転職体験']::text[], NULL, '50代で警備員から建設作業員に転職した男性の体験。体力面の工夫と収入の変化。', 'ゲンバキャリア編集部', 'published', FALSE, 0, '2026-04-18T00:00:00.000Z', NOW(), NOW()) ON CONFLICT (slug) DO NOTHING;
INSERT INTO articles (id, slug, title, excerpt, body, category, tags, image_url, meta_description, author_name, status, featured, view_count, published_at, created_at, updated_at) VALUES (gen_random_uuid(), 'demolition-license-guide', '解体工事施工技士の資格 — 取得方法と活用', '解体工事施工技士の受験資格、試験内容、合格率。解体業界でのキャリアアップに。', '<p>解体工事施工技士の受験資格、試験内容、合格率。解体業界でのキャリアアップに。</p>

<h2>解体工事施工技士の資格について</h2>
<p>この記事では、解体・資格に関する情報を詳しく解説します。建設業界で働く方やこれから転職を検討している方に向けて、実践的な内容をまとめました。</p>

<h2>まとめ</h2>
<p>建設業界は人手不足が続いており、未経験者の方にもチャンスがある業界です。資格取得や経験を積むことで着実にキャリアアップが可能です。</p>
<p>ゲンバキャリアでは、建築・土木・設備・解体に特化した求人情報を掲載しています。あなたに合った求人を探してみてください。</p>', 'license', ARRAY['解体','資格']::text[], NULL, '解体工事施工技士の受験資格、試験内容、合格率。解体業界でのキャリアアップに。', 'ゲンバキャリア編集部', 'published', FALSE, 0, '2026-04-19T00:00:00.000Z', NOW(), NOW()) ON CONFLICT (slug) DO NOTHING;
INSERT INTO articles (id, slug, title, excerpt, body, category, tags, image_url, meta_description, author_name, status, featured, view_count, published_at, created_at, updated_at) VALUES (gen_random_uuid(), 'electrical-work-salary-up', '電気工事士が年収を上げる方法 — 資格と転職', '電気工事士が年収を上げるための方法。上位資格の取得、転職先の選び方。', '<p>電気工事士が年収を上げるための方法。上位資格の取得、転職先の選び方。</p>

<h2>電気工事士が年収を上げる方法について</h2>
<p>この記事では、電気工事士・年収アップに関する情報を詳しく解説します。建設業界で働く方やこれから転職を検討している方に向けて、実践的な内容をまとめました。</p>

<h2>まとめ</h2>
<p>建設業界は人手不足が続いており、未経験者の方にもチャンスがある業界です。資格取得や経験を積むことで着実にキャリアアップが可能です。</p>
<p>ゲンバキャリアでは、建築・土木・設備・解体に特化した求人情報を掲載しています。あなたに合った求人を探してみてください。</p>', 'salary', ARRAY['電気工事士','年収アップ']::text[], NULL, '電気工事士が年収を上げるための方法。上位資格の取得、転職先の選び方。', 'ゲンバキャリア編集部', 'published', FALSE, 0, '2026-04-20T00:00:00.000Z', NOW(), NOW()) ON CONFLICT (slug) DO NOTHING;
INSERT INTO articles (id, slug, title, excerpt, body, category, tags, image_url, meta_description, author_name, status, featured, view_count, published_at, created_at, updated_at) VALUES (gen_random_uuid(), 'construction-document-management', '施工管理の書類業務 — 効率化の方法', '施工管理技士の書類業務の内容。日報・写真管理・安全書類の効率化ツールを紹介。', '<p>施工管理技士の書類業務の内容。日報・写真管理・安全書類の効率化ツールを紹介。</p>

<h2>施工管理の書類業務について</h2>
<p>この記事では、書類・施工管理に関する情報を詳しく解説します。建設業界で働く方やこれから転職を検討している方に向けて、実践的な内容をまとめました。</p>

<h2>まとめ</h2>
<p>建設業界は人手不足が続いており、未経験者の方にもチャンスがある業界です。資格取得や経験を積むことで着実にキャリアアップが可能です。</p>
<p>ゲンバキャリアでは、建築・土木・設備・解体に特化した求人情報を掲載しています。あなたに合った求人を探してみてください。</p>', 'career', ARRAY['書類','施工管理']::text[], NULL, '施工管理技士の書類業務の内容。日報・写真管理・安全書類の効率化ツールを紹介。', 'ゲンバキャリア編集部', 'published', FALSE, 0, '2026-04-21T00:00:00.000Z', NOW(), NOW()) ON CONFLICT (slug) DO NOTHING;
INSERT INTO articles (id, slug, title, excerpt, body, category, tags, image_url, meta_description, author_name, status, featured, view_count, published_at, created_at, updated_at) VALUES (gen_random_uuid(), 'formwork-carpenter-guide', '型枠大工の仕事と年収 — RC造のスペシャリスト', '型枠大工の仕事内容、使う道具、年収相場。未経験からの技術習得期間を解説。', '<p>型枠大工の仕事内容、使う道具、年収相場。未経験からの技術習得期間を解説。</p>

<h2>型枠大工の仕事と年収について</h2>
<p>この記事では、型枠・職種解説に関する情報を詳しく解説します。建設業界で働く方やこれから転職を検討している方に向けて、実践的な内容をまとめました。</p>

<h2>まとめ</h2>
<p>建設業界は人手不足が続いており、未経験者の方にもチャンスがある業界です。資格取得や経験を積むことで着実にキャリアアップが可能です。</p>
<p>ゲンバキャリアでは、建築・土木・設備・解体に特化した求人情報を掲載しています。あなたに合った求人を探してみてください。</p>', 'job-type', ARRAY['型枠','職種解説']::text[], NULL, '型枠大工の仕事内容、使う道具、年収相場。未経験からの技術習得期間を解説。', 'ゲンバキャリア編集部', 'published', FALSE, 0, '2026-04-22T00:00:00.000Z', NOW(), NOW()) ON CONFLICT (slug) DO NOTHING;
INSERT INTO articles (id, slug, title, excerpt, body, category, tags, image_url, meta_description, author_name, status, featured, view_count, published_at, created_at, updated_at) VALUES (gen_random_uuid(), 'construction-ai-future', 'AIは建設業界をどう変える？ — 自動化の現状と将来', '建設ロボット・AIによる施工管理支援など、建設業界のAI活用の現状と将来展望。', '<p>建設ロボット・AIによる施工管理支援など、建設業界のAI活用の現状と将来展望。</p>

<h2>AIは建設業界をどう変える？について</h2>
<p>この記事では、AI・ICTに関する情報を詳しく解説します。建設業界で働く方やこれから転職を検討している方に向けて、実践的な内容をまとめました。</p>

<h2>まとめ</h2>
<p>建設業界は人手不足が続いており、未経験者の方にもチャンスがある業界です。資格取得や経験を積むことで着実にキャリアアップが可能です。</p>
<p>ゲンバキャリアでは、建築・土木・設備・解体に特化した求人情報を掲載しています。あなたに合った求人を探してみてください。</p>', 'industry', ARRAY['AI','ICT']::text[], NULL, '建設ロボット・AIによる施工管理支援など、建設業界のAI活用の現状と将来展望。', 'ゲンバキャリア編集部', 'published', FALSE, 0, '2026-04-23T00:00:00.000Z', NOW(), NOW()) ON CONFLICT (slug) DO NOTHING;
INSERT INTO articles (id, slug, title, excerpt, body, category, tags, image_url, meta_description, author_name, status, featured, view_count, published_at, created_at, updated_at) VALUES (gen_random_uuid(), 'construction-education-training', '建設業界の職業訓練校 — 入校方法と学べること', 'ポリテクセンター等の職業訓練校で建設技術を学ぶ方法。入校条件・期間・費用。', '<p>ポリテクセンター等の職業訓練校で建設技術を学ぶ方法。入校条件・期間・費用。</p>

<h2>建設業界の職業訓練校について</h2>
<p>この記事では、職業訓練・教育に関する情報を詳しく解説します。建設業界で働く方やこれから転職を検討している方に向けて、実践的な内容をまとめました。</p>

<h2>まとめ</h2>
<p>建設業界は人手不足が続いており、未経験者の方にもチャンスがある業界です。資格取得や経験を積むことで着実にキャリアアップが可能です。</p>
<p>ゲンバキャリアでは、建築・土木・設備・解体に特化した求人情報を掲載しています。あなたに合った求人を探してみてください。</p>', 'career', ARRAY['職業訓練','教育']::text[], NULL, 'ポリテクセンター等の職業訓練校で建設技術を学ぶ方法。入校条件・期間・費用。', 'ゲンバキャリア編集部', 'published', FALSE, 0, '2026-04-24T00:00:00.000Z', NOW(), NOW()) ON CONFLICT (slug) DO NOTHING;
INSERT INTO articles (id, slug, title, excerpt, body, category, tags, image_url, meta_description, author_name, status, featured, view_count, published_at, created_at, updated_at) VALUES (gen_random_uuid(), 'construction-heatstroke-law', '建設現場の暑さ対策義務 — 法令で求められること', 'WBGT値の管理義務、休憩場所の設置基準など、建設現場の暑さ対策に関する法令。', '<p>WBGT値の管理義務、休憩場所の設置基準など、建設現場の暑さ対策に関する法令。</p>

<h2>建設現場の暑さ対策義務について</h2>
<p>この記事では、暑さ対策・法規に関する情報を詳しく解説します。建設業界で働く方やこれから転職を検討している方に向けて、実践的な内容をまとめました。</p>

<h2>まとめ</h2>
<p>建設業界は人手不足が続いており、未経験者の方にもチャンスがある業界です。資格取得や経験を積むことで着実にキャリアアップが可能です。</p>
<p>ゲンバキャリアでは、建築・土木・設備・解体に特化した求人情報を掲載しています。あなたに合った求人を探してみてください。</p>', 'industry', ARRAY['暑さ対策','法規']::text[], NULL, 'WBGT値の管理義務、休憩場所の設置基準など、建設現場の暑さ対策に関する法令。', 'ゲンバキャリア編集部', 'published', FALSE, 0, '2026-04-25T00:00:00.000Z', NOW(), NOW()) ON CONFLICT (slug) DO NOTHING;
INSERT INTO articles (id, slug, title, excerpt, body, category, tags, image_url, meta_description, author_name, status, featured, view_count, published_at, created_at, updated_at) VALUES (gen_random_uuid(), 'construction-heatstroke-prevention', '建設現場の熱中症対策 — 予防と応急処置', '建設現場での熱中症を防ぐための対策。水分補給・塩分摂取・空調服の活用法。', '<p>建設現場での熱中症を防ぐための対策。水分補給・塩分摂取・空調服の活用法。</p>

<h2>建設現場の熱中症対策について</h2>
<p>この記事では、熱中症・安全に関する情報を詳しく解説します。建設業界で働く方やこれから転職を検討している方に向けて、実践的な内容をまとめました。</p>

<h2>まとめ</h2>
<p>建設業界は人手不足が続いており、未経験者の方にもチャンスがある業界です。資格取得や経験を積むことで着実にキャリアアップが可能です。</p>
<p>ゲンバキャリアでは、建築・土木・設備・解体に特化した求人情報を掲載しています。あなたに合った求人を探してみてください。</p>', 'industry', ARRAY['熱中症','安全']::text[], NULL, '建設現場での熱中症を防ぐための対策。水分補給・塩分摂取・空調服の活用法。', 'ゲンバキャリア編集部', 'published', FALSE, 0, '2026-04-26T00:00:00.000Z', NOW(), NOW()) ON CONFLICT (slug) DO NOTHING;
INSERT INTO articles (id, slug, title, excerpt, body, category, tags, image_url, meta_description, author_name, status, featured, view_count, published_at, created_at, updated_at) VALUES (gen_random_uuid(), 'cooling-vest-guide', '空調服・冷却ベストの選び方 — 現場別おすすめ', 'ファン付き作業着・冷却ベストの種類と選び方。建築・土木・内装の現場別おすすめ。', '<p>ファン付き作業着・冷却ベストの種類と選び方。建築・土木・内装の現場別おすすめ。</p>

<h2>空調服・冷却ベストの選び方について</h2>
<p>この記事では、空調服・暑さ対策に関する情報を詳しく解説します。建設業界で働く方やこれから転職を検討している方に向けて、実践的な内容をまとめました。</p>

<h2>まとめ</h2>
<p>建設業界は人手不足が続いており、未経験者の方にもチャンスがある業界です。資格取得や経験を積むことで着実にキャリアアップが可能です。</p>
<p>ゲンバキャリアでは、建築・土木・設備・解体に特化した求人情報を掲載しています。あなたに合った求人を探してみてください。</p>', 'industry', ARRAY['空調服','暑さ対策']::text[], NULL, 'ファン付き作業着・冷却ベストの種類と選び方。建築・土木・内装の現場別おすすめ。', 'ゲンバキャリア編集部', 'published', FALSE, 0, '2026-04-27T00:00:00.000Z', NOW(), NOW()) ON CONFLICT (slug) DO NOTHING;
INSERT INTO articles (id, slug, title, excerpt, body, category, tags, image_url, meta_description, author_name, status, featured, view_count, published_at, created_at, updated_at) VALUES (gen_random_uuid(), 'summer-construction-schedule', '夏場の建設現場 — 作業時間と休憩のルール', '夏の建設現場での早朝シフト・昼休み延長など、暑さ対策としての作業時間の工夫。', '<p>夏の建設現場での早朝シフト・昼休み延長など、暑さ対策としての作業時間の工夫。</p>

<h2>夏場の建設現場について</h2>
<p>この記事では、夏場・作業時間に関する情報を詳しく解説します。建設業界で働く方やこれから転職を検討している方に向けて、実践的な内容をまとめました。</p>

<h2>まとめ</h2>
<p>建設業界は人手不足が続いており、未経験者の方にもチャンスがある業界です。資格取得や経験を積むことで着実にキャリアアップが可能です。</p>
<p>ゲンバキャリアでは、建築・土木・設備・解体に特化した求人情報を掲載しています。あなたに合った求人を探してみてください。</p>', 'industry', ARRAY['夏場','作業時間']::text[], NULL, '夏の建設現場での早朝シフト・昼休み延長など、暑さ対策としての作業時間の工夫。', 'ゲンバキャリア編集部', 'published', FALSE, 0, '2026-04-28T00:00:00.000Z', NOW(), NOW()) ON CONFLICT (slug) DO NOTHING;
INSERT INTO articles (id, slug, title, excerpt, body, category, tags, image_url, meta_description, author_name, status, featured, view_count, published_at, created_at, updated_at) VALUES (gen_random_uuid(), 'bridge-construction-work', '橋梁工事の仕事内容と必要な資格', '橋梁の新設・補修工事の流れ。必要な資格と経験、特有の危険と安全管理。', '<p>橋梁の新設・補修工事の流れ。必要な資格と経験、特有の危険と安全管理。</p>

<h2>橋梁工事の仕事内容と必要な資格について</h2>
<p>この記事では、橋梁・土木に関する情報を詳しく解説します。建設業界で働く方やこれから転職を検討している方に向けて、実践的な内容をまとめました。</p>

<h2>まとめ</h2>
<p>建設業界は人手不足が続いており、未経験者の方にもチャンスがある業界です。資格取得や経験を積むことで着実にキャリアアップが可能です。</p>
<p>ゲンバキャリアでは、建築・土木・設備・解体に特化した求人情報を掲載しています。あなたに合った求人を探してみてください。</p>', 'job-type', ARRAY['橋梁','土木']::text[], NULL, '橋梁の新設・補修工事の流れ。必要な資格と経験、特有の危険と安全管理。', 'ゲンバキャリア編集部', 'published', FALSE, 0, '2026-04-29T00:00:00.000Z', NOW(), NOW()) ON CONFLICT (slug) DO NOTHING;
INSERT INTO articles (id, slug, title, excerpt, body, category, tags, image_url, meta_description, author_name, status, featured, view_count, published_at, created_at, updated_at) VALUES (gen_random_uuid(), 'construction-summer-salary', '建設業界の夏季手当と暑中手当 — 支給する企業は？', '暑中手当・夏季特別手当を支給する建設会社の割合と支給額の目安。', '<p>暑中手当・夏季特別手当を支給する建設会社の割合と支給額の目安。</p>

<h2>建設業界の夏季手当と暑中手当について</h2>
<p>この記事では、夏季手当・待遇に関する情報を詳しく解説します。建設業界で働く方やこれから転職を検討している方に向けて、実践的な内容をまとめました。</p>

<h2>まとめ</h2>
<p>建設業界は人手不足が続いており、未経験者の方にもチャンスがある業界です。資格取得や経験を積むことで着実にキャリアアップが可能です。</p>
<p>ゲンバキャリアでは、建築・土木・設備・解体に特化した求人情報を掲載しています。あなたに合った求人を探してみてください。</p>', 'salary', ARRAY['夏季手当','待遇']::text[], NULL, '暑中手当・夏季特別手当を支給する建設会社の割合と支給額の目安。', 'ゲンバキャリア編集部', 'published', FALSE, 0, '2026-04-30T00:00:00.000Z', NOW(), NOW()) ON CONFLICT (slug) DO NOTHING;
INSERT INTO articles (id, slug, title, excerpt, body, category, tags, image_url, meta_description, author_name, status, featured, view_count, published_at, created_at, updated_at) VALUES (gen_random_uuid(), 'gas-welding-license', 'ガス溶接技能講習の取り方 — 費用と日数', 'ガス溶接技能講習の概要。アーク溶接との違い、受講資格、費用を解説。', '<p>ガス溶接技能講習の概要。アーク溶接との違い、受講資格、費用を解説。</p>

<h2>ガス溶接技能講習の取り方について</h2>
<p>この記事では、ガス溶接・資格に関する情報を詳しく解説します。建設業界で働く方やこれから転職を検討している方に向けて、実践的な内容をまとめました。</p>

<h2>まとめ</h2>
<p>建設業界は人手不足が続いており、未経験者の方にもチャンスがある業界です。資格取得や経験を積むことで着実にキャリアアップが可能です。</p>
<p>ゲンバキャリアでは、建築・土木・設備・解体に特化した求人情報を掲載しています。あなたに合った求人を探してみてください。</p>', 'license', ARRAY['ガス溶接','資格']::text[], NULL, 'ガス溶接技能講習の概要。アーク溶接との違い、受講資格、費用を解説。', 'ゲンバキャリア編集部', 'published', FALSE, 0, '2026-05-01T00:00:00.000Z', NOW(), NOW()) ON CONFLICT (slug) DO NOTHING;
INSERT INTO articles (id, slug, title, excerpt, body, category, tags, image_url, meta_description, author_name, status, featured, view_count, published_at, created_at, updated_at) VALUES (gen_random_uuid(), 'interview-sekokan-career-up', '現場作業員から施工管理へ — 10年の軌跡', '建設作業員から施工管理技士にキャリアアップした38歳の10年間の成長記録。', '<p>建設作業員から施工管理技士にキャリアアップした38歳の10年間の成長記録。</p>

<h2>現場作業員から施工管理へについて</h2>
<p>この記事では、キャリアアップ・施工管理に関する情報を詳しく解説します。建設業界で働く方やこれから転職を検討している方に向けて、実践的な内容をまとめました。</p>

<h2>まとめ</h2>
<p>建設業界は人手不足が続いており、未経験者の方にもチャンスがある業界です。資格取得や経験を積むことで着実にキャリアアップが可能です。</p>
<p>ゲンバキャリアでは、建築・土木・設備・解体に特化した求人情報を掲載しています。あなたに合った求人を探してみてください。</p>', 'interview', ARRAY['キャリアアップ','施工管理']::text[], NULL, '建設作業員から施工管理技士にキャリアアップした38歳の10年間の成長記録。', 'ゲンバキャリア編集部', 'published', FALSE, 0, '2026-05-02T00:00:00.000Z', NOW(), NOW()) ON CONFLICT (slug) DO NOTHING;
INSERT INTO articles (id, slug, title, excerpt, body, category, tags, image_url, meta_description, author_name, status, featured, view_count, published_at, created_at, updated_at) VALUES (gen_random_uuid(), 'construction-uv-protection', '建設作業員のUV対策 — 日焼け止めと装備', '屋外作業での紫外線対策。日焼け止めの塗り方、長袖作業着、サングラスの選び方。', '<p>屋外作業での紫外線対策。日焼け止めの塗り方、長袖作業着、サングラスの選び方。</p>

<h2>建設作業員のUV対策について</h2>
<p>この記事では、紫外線・健康に関する情報を詳しく解説します。建設業界で働く方やこれから転職を検討している方に向けて、実践的な内容をまとめました。</p>

<h2>まとめ</h2>
<p>建設業界は人手不足が続いており、未経験者の方にもチャンスがある業界です。資格取得や経験を積むことで着実にキャリアアップが可能です。</p>
<p>ゲンバキャリアでは、建築・土木・設備・解体に特化した求人情報を掲載しています。あなたに合った求人を探してみてください。</p>', 'industry', ARRAY['紫外線','健康']::text[], NULL, '屋外作業での紫外線対策。日焼け止めの塗り方、長袖作業着、サングラスの選び方。', 'ゲンバキャリア編集部', 'published', FALSE, 0, '2026-05-03T00:00:00.000Z', NOW(), NOW()) ON CONFLICT (slug) DO NOTHING;
INSERT INTO articles (id, slug, title, excerpt, body, category, tags, image_url, meta_description, author_name, status, featured, view_count, published_at, created_at, updated_at) VALUES (gen_random_uuid(), 'plant-engineering-guide', 'プラント建設の仕事内容と年収 — 高待遇の理由', '化学プラント・発電所の建設工事の仕事内容。高待遇の理由と求められる資格。', '<p>化学プラント・発電所の建設工事の仕事内容。高待遇の理由と求められる資格。</p>

<h2>プラント建設の仕事内容と年収について</h2>
<p>この記事では、プラント・職種解説に関する情報を詳しく解説します。建設業界で働く方やこれから転職を検討している方に向けて、実践的な内容をまとめました。</p>

<h2>まとめ</h2>
<p>建設業界は人手不足が続いており、未経験者の方にもチャンスがある業界です。資格取得や経験を積むことで着実にキャリアアップが可能です。</p>
<p>ゲンバキャリアでは、建築・土木・設備・解体に特化した求人情報を掲載しています。あなたに合った求人を探してみてください。</p>', 'job-type', ARRAY['プラント','職種解説']::text[], NULL, '化学プラント・発電所の建設工事の仕事内容。高待遇の理由と求められる資格。', 'ゲンバキャリア編集部', 'published', FALSE, 0, '2026-05-04T00:00:00.000Z', NOW(), NOW()) ON CONFLICT (slug) DO NOTHING;
INSERT INTO articles (id, slug, title, excerpt, body, category, tags, image_url, meta_description, author_name, status, featured, view_count, published_at, created_at, updated_at) VALUES (gen_random_uuid(), 'construction-hydration-tips', '建設現場の水分補給 — 正しい飲み方と経口補水液', '現場作業中の正しい水分補給の量とタイミング。経口補水液とスポーツドリンクの違い。', '<p>現場作業中の正しい水分補給の量とタイミング。経口補水液とスポーツドリンクの違い。</p>

<h2>建設現場の水分補給について</h2>
<p>この記事では、水分補給・健康に関する情報を詳しく解説します。建設業界で働く方やこれから転職を検討している方に向けて、実践的な内容をまとめました。</p>

<h2>まとめ</h2>
<p>建設業界は人手不足が続いており、未経験者の方にもチャンスがある業界です。資格取得や経験を積むことで着実にキャリアアップが可能です。</p>
<p>ゲンバキャリアでは、建築・土木・設備・解体に特化した求人情報を掲載しています。あなたに合った求人を探してみてください。</p>', 'industry', ARRAY['水分補給','健康']::text[], NULL, '現場作業中の正しい水分補給の量とタイミング。経口補水液とスポーツドリンクの違い。', 'ゲンバキャリア編集部', 'published', FALSE, 0, '2026-05-05T00:00:00.000Z', NOW(), NOW()) ON CONFLICT (slug) DO NOTHING;
INSERT INTO articles (id, slug, title, excerpt, body, category, tags, image_url, meta_description, author_name, status, featured, view_count, published_at, created_at, updated_at) VALUES (gen_random_uuid(), 'operation-chief-license', '作業主任者の資格一覧 — 建設現場で必要な13種', '建設現場で必要な作業主任者の資格13種類。取得の優先順位と講習内容を解説。', '<p>建設現場で必要な作業主任者の資格13種類。取得の優先順位と講習内容を解説。</p>

<h2>作業主任者の資格一覧について</h2>
<p>この記事では、作業主任者・資格一覧に関する情報を詳しく解説します。建設業界で働く方やこれから転職を検討している方に向けて、実践的な内容をまとめました。</p>

<h2>まとめ</h2>
<p>建設業界は人手不足が続いており、未経験者の方にもチャンスがある業界です。資格取得や経験を積むことで着実にキャリアアップが可能です。</p>
<p>ゲンバキャリアでは、建築・土木・設備・解体に特化した求人情報を掲載しています。あなたに合った求人を探してみてください。</p>', 'license', ARRAY['作業主任者','資格一覧']::text[], NULL, '建設現場で必要な作業主任者の資格13種類。取得の優先順位と講習内容を解説。', 'ゲンバキャリア編集部', 'published', FALSE, 0, '2026-05-06T00:00:00.000Z', NOW(), NOW()) ON CONFLICT (slug) DO NOTHING;
INSERT INTO articles (id, slug, title, excerpt, body, category, tags, image_url, meta_description, author_name, status, featured, view_count, published_at, created_at, updated_at) VALUES (gen_random_uuid(), 'construction-efficiency-tools', '建設現場の効率化ツール — ICT施工の実践例', 'i-Construction推進で導入が進むICTツール。現場での活用事例と効果を紹介。', '<p>i-Construction推進で導入が進むICTツール。現場での活用事例と効果を紹介。</p>

<h2>建設現場の効率化ツールについて</h2>
<p>この記事では、ICT・効率化に関する情報を詳しく解説します。建設業界で働く方やこれから転職を検討している方に向けて、実践的な内容をまとめました。</p>

<h2>まとめ</h2>
<p>建設業界は人手不足が続いており、未経験者の方にもチャンスがある業界です。資格取得や経験を積むことで着実にキャリアアップが可能です。</p>
<p>ゲンバキャリアでは、建築・土木・設備・解体に特化した求人情報を掲載しています。あなたに合った求人を探してみてください。</p>', 'industry', ARRAY['ICT','効率化']::text[], NULL, 'i-Construction推進で導入が進むICTツール。現場での活用事例と効果を紹介。', 'ゲンバキャリア編集部', 'published', FALSE, 0, '2026-05-07T00:00:00.000Z', NOW(), NOW()) ON CONFLICT (slug) DO NOTHING;
INSERT INTO articles (id, slug, title, excerpt, body, category, tags, image_url, meta_description, author_name, status, featured, view_count, published_at, created_at, updated_at) VALUES (gen_random_uuid(), 'construction-career-at-40', '40代の建設業界転職 — 経験を活かすポジション', '40代で建設業界に転職する際の狙い目ポジション。管理職・施工管理・安全管理。', '<p>40代で建設業界に転職する際の狙い目ポジション。管理職・施工管理・安全管理。</p>

<h2>40代の建設業界転職について</h2>
<p>この記事では、40代・転職に関する情報を詳しく解説します。建設業界で働く方やこれから転職を検討している方に向けて、実践的な内容をまとめました。</p>

<h2>まとめ</h2>
<p>建設業界は人手不足が続いており、未経験者の方にもチャンスがある業界です。資格取得や経験を積むことで着実にキャリアアップが可能です。</p>
<p>ゲンバキャリアでは、建築・土木・設備・解体に特化した求人情報を掲載しています。あなたに合った求人を探してみてください。</p>', 'career', ARRAY['40代','転職']::text[], NULL, '40代で建設業界に転職する際の狙い目ポジション。管理職・施工管理・安全管理。', 'ゲンバキャリア編集部', 'published', FALSE, 0, '2026-05-08T00:00:00.000Z', NOW(), NOW()) ON CONFLICT (slug) DO NOTHING;
INSERT INTO articles (id, slug, title, excerpt, body, category, tags, image_url, meta_description, author_name, status, featured, view_count, published_at, created_at, updated_at) VALUES (gen_random_uuid(), 'asbestos-removal-work', 'アスベスト除去工事の仕事と資格', 'アスベスト除去工事の流れ、必要な資格（石綿作業主任者）、安全管理の重要性。', '<p>アスベスト除去工事の流れ、必要な資格（石綿作業主任者）、安全管理の重要性。</p>

<h2>アスベスト除去工事の仕事と資格について</h2>
<p>この記事では、アスベスト・解体に関する情報を詳しく解説します。建設業界で働く方やこれから転職を検討している方に向けて、実践的な内容をまとめました。</p>

<h2>まとめ</h2>
<p>建設業界は人手不足が続いており、未経験者の方にもチャンスがある業界です。資格取得や経験を積むことで着実にキャリアアップが可能です。</p>
<p>ゲンバキャリアでは、建築・土木・設備・解体に特化した求人情報を掲載しています。あなたに合った求人を探してみてください。</p>', 'job-type', ARRAY['アスベスト','解体']::text[], NULL, 'アスベスト除去工事の流れ、必要な資格（石綿作業主任者）、安全管理の重要性。', 'ゲンバキャリア編集部', 'published', FALSE, 0, '2026-05-09T00:00:00.000Z', NOW(), NOW()) ON CONFLICT (slug) DO NOTHING;
INSERT INTO articles (id, slug, title, excerpt, body, category, tags, image_url, meta_description, author_name, status, featured, view_count, published_at, created_at, updated_at) VALUES (gen_random_uuid(), 'construction-part-time-salary', '建設業のアルバイト・日雇い — 日当相場と探し方', '建設現場のアルバイト・日雇いの日当相場、探し方、正社員との待遇の違い。', '<p>建設現場のアルバイト・日雇いの日当相場、探し方、正社員との待遇の違い。</p>

<h2>建設業のアルバイト・日雇いについて</h2>
<p>この記事では、アルバイト・日雇いに関する情報を詳しく解説します。建設業界で働く方やこれから転職を検討している方に向けて、実践的な内容をまとめました。</p>

<h2>まとめ</h2>
<p>建設業界は人手不足が続いており、未経験者の方にもチャンスがある業界です。資格取得や経験を積むことで着実にキャリアアップが可能です。</p>
<p>ゲンバキャリアでは、建築・土木・設備・解体に特化した求人情報を掲載しています。あなたに合った求人を探してみてください。</p>', 'salary', ARRAY['アルバイト','日雇い']::text[], NULL, '建設現場のアルバイト・日雇いの日当相場、探し方、正社員との待遇の違い。', 'ゲンバキャリア編集部', 'published', FALSE, 0, '2026-05-10T00:00:00.000Z', NOW(), NOW()) ON CONFLICT (slug) DO NOTHING;
INSERT INTO articles (id, slug, title, excerpt, body, category, tags, image_url, meta_description, author_name, status, featured, view_count, published_at, created_at, updated_at) VALUES (gen_random_uuid(), 'energy-management-license', 'エネルギー管理士の資格 — 建設業での活用', 'エネルギー管理士の試験概要と建設・設備業界での活用場面。省エネ法との関連。', '<p>エネルギー管理士の試験概要と建設・設備業界での活用場面。省エネ法との関連。</p>

<h2>エネルギー管理士の資格について</h2>
<p>この記事では、エネルギー管理・資格に関する情報を詳しく解説します。建設業界で働く方やこれから転職を検討している方に向けて、実践的な内容をまとめました。</p>

<h2>まとめ</h2>
<p>建設業界は人手不足が続いており、未経験者の方にもチャンスがある業界です。資格取得や経験を積むことで着実にキャリアアップが可能です。</p>
<p>ゲンバキャリアでは、建築・土木・設備・解体に特化した求人情報を掲載しています。あなたに合った求人を探してみてください。</p>', 'license', ARRAY['エネルギー管理','資格']::text[], NULL, 'エネルギー管理士の試験概要と建設・設備業界での活用場面。省エネ法との関連。', 'ゲンバキャリア編集部', 'published', FALSE, 0, '2026-05-11T00:00:00.000Z', NOW(), NOW()) ON CONFLICT (slug) DO NOTHING;
INSERT INTO articles (id, slug, title, excerpt, body, category, tags, image_url, meta_description, author_name, status, featured, view_count, published_at, created_at, updated_at) VALUES (gen_random_uuid(), 'interview-foreign-worker-japan', '外国人技能実習生の建設現場 — 共に働く日本人の声', '外国人技能実習生と一緒に働く日本人作業員が語る、コミュニケーションの工夫と課題。', '<p>外国人技能実習生と一緒に働く日本人作業員が語る、コミュニケーションの工夫と課題。</p>

<h2>外国人技能実習生の建設現場について</h2>
<p>この記事では、外国人・多様性に関する情報を詳しく解説します。建設業界で働く方やこれから転職を検討している方に向けて、実践的な内容をまとめました。</p>

<h2>まとめ</h2>
<p>建設業界は人手不足が続いており、未経験者の方にもチャンスがある業界です。資格取得や経験を積むことで着実にキャリアアップが可能です。</p>
<p>ゲンバキャリアでは、建築・土木・設備・解体に特化した求人情報を掲載しています。あなたに合った求人を探してみてください。</p>', 'interview', ARRAY['外国人','多様性']::text[], NULL, '外国人技能実習生と一緒に働く日本人作業員が語る、コミュニケーションの工夫と課題。', 'ゲンバキャリア編集部', 'published', FALSE, 0, '2026-05-12T00:00:00.000Z', NOW(), NOW()) ON CONFLICT (slug) DO NOTHING;
INSERT INTO articles (id, slug, title, excerpt, body, category, tags, image_url, meta_description, author_name, status, featured, view_count, published_at, created_at, updated_at) VALUES (gen_random_uuid(), 'construction-summer-work-tips', '夏の建設現場を乗り切る10のコツ', '現場経験者が教える夏場の建設作業を乗り切るための実践的な10のアドバイス。', '<p>現場経験者が教える夏場の建設作業を乗り切るための実践的な10のアドバイス。</p>

<h2>夏の建設現場を乗り切る10のコツについて</h2>
<p>この記事では、夏場・健康に関する情報を詳しく解説します。建設業界で働く方やこれから転職を検討している方に向けて、実践的な内容をまとめました。</p>

<h2>まとめ</h2>
<p>建設業界は人手不足が続いており、未経験者の方にもチャンスがある業界です。資格取得や経験を積むことで着実にキャリアアップが可能です。</p>
<p>ゲンバキャリアでは、建築・土木・設備・解体に特化した求人情報を掲載しています。あなたに合った求人を探してみてください。</p>', 'industry', ARRAY['夏場','健康']::text[], NULL, '現場経験者が教える夏場の建設作業を乗り切るための実践的な10のアドバイス。', 'ゲンバキャリア編集部', 'published', FALSE, 0, '2026-05-13T00:00:00.000Z', NOW(), NOW()) ON CONFLICT (slug) DO NOTHING;
INSERT INTO articles (id, slug, title, excerpt, body, category, tags, image_url, meta_description, author_name, status, featured, view_count, published_at, created_at, updated_at) VALUES (gen_random_uuid(), 'reinforced-concrete-basics', '鉄筋コンクリート造（RC造）の基礎知識', 'RC造の仕組み、施工の流れ、関わる職種を建設初心者向けにわかりやすく解説。', '<p>RC造の仕組み、施工の流れ、関わる職種を建設初心者向けにわかりやすく解説。</p>

<h2>鉄筋コンクリート造（RC造）の基礎知識について</h2>
<p>この記事では、RC造・基礎知識に関する情報を詳しく解説します。建設業界で働く方やこれから転職を検討している方に向けて、実践的な内容をまとめました。</p>

<h2>まとめ</h2>
<p>建設業界は人手不足が続いており、未経験者の方にもチャンスがある業界です。資格取得や経験を積むことで着実にキャリアアップが可能です。</p>
<p>ゲンバキャリアでは、建築・土木・設備・解体に特化した求人情報を掲載しています。あなたに合った求人を探してみてください。</p>', 'industry', ARRAY['RC造','基礎知識']::text[], NULL, 'RC造の仕組み、施工の流れ、関わる職種を建設初心者向けにわかりやすく解説。', 'ゲンバキャリア編集部', 'published', FALSE, 0, '2026-05-14T00:00:00.000Z', NOW(), NOW()) ON CONFLICT (slug) DO NOTHING;
INSERT INTO articles (id, slug, title, excerpt, body, category, tags, image_url, meta_description, author_name, status, featured, view_count, published_at, created_at, updated_at) VALUES (gen_random_uuid(), 'construction-retirement-planning', '建設業界の退職後のキャリア — 経験を活かす仕事', '建設業界を退職した後のキャリア選択肢。技術指導員・安全コンサルタント・講師の道。', '<p>建設業界を退職した後のキャリア選択肢。技術指導員・安全コンサルタント・講師の道。</p>

<h2>建設業界の退職後のキャリアについて</h2>
<p>この記事では、退職後・シニアに関する情報を詳しく解説します。建設業界で働く方やこれから転職を検討している方に向けて、実践的な内容をまとめました。</p>

<h2>まとめ</h2>
<p>建設業界は人手不足が続いており、未経験者の方にもチャンスがある業界です。資格取得や経験を積むことで着実にキャリアアップが可能です。</p>
<p>ゲンバキャリアでは、建築・土木・設備・解体に特化した求人情報を掲載しています。あなたに合った求人を探してみてください。</p>', 'career', ARRAY['退職後','シニア']::text[], NULL, '建設業界を退職した後のキャリア選択肢。技術指導員・安全コンサルタント・講師の道。', 'ゲンバキャリア編集部', 'published', FALSE, 0, '2026-05-15T00:00:00.000Z', NOW(), NOW()) ON CONFLICT (slug) DO NOTHING;
INSERT INTO articles (id, slug, title, excerpt, body, category, tags, image_url, meta_description, author_name, status, featured, view_count, published_at, created_at, updated_at) VALUES (gen_random_uuid(), 'construction-fire-prevention', '建設現場の火災予防 — 溶接・溶断作業の注意点', '溶接・溶断作業中の火災事故を防ぐための対策。養生方法と消火器の配置基準。', '<p>溶接・溶断作業中の火災事故を防ぐための対策。養生方法と消火器の配置基準。</p>

<h2>建設現場の火災予防について</h2>
<p>この記事では、火災予防・安全に関する情報を詳しく解説します。建設業界で働く方やこれから転職を検討している方に向けて、実践的な内容をまとめました。</p>

<h2>まとめ</h2>
<p>建設業界は人手不足が続いており、未経験者の方にもチャンスがある業界です。資格取得や経験を積むことで着実にキャリアアップが可能です。</p>
<p>ゲンバキャリアでは、建築・土木・設備・解体に特化した求人情報を掲載しています。あなたに合った求人を探してみてください。</p>', 'industry', ARRAY['火災予防','安全']::text[], NULL, '溶接・溶断作業中の火災事故を防ぐための対策。養生方法と消火器の配置基準。', 'ゲンバキャリア編集部', 'published', FALSE, 0, '2026-05-16T00:00:00.000Z', NOW(), NOW()) ON CONFLICT (slug) DO NOTHING;
INSERT INTO articles (id, slug, title, excerpt, body, category, tags, image_url, meta_description, author_name, status, featured, view_count, published_at, created_at, updated_at) VALUES (gen_random_uuid(), 'pile-driving-work', '杭打ち工事の種類と仕事内容', '既製杭・場所打ち杭の違い、施工の流れ、従事するための資格と年収を解説。', '<p>既製杭・場所打ち杭の違い、施工の流れ、従事するための資格と年収を解説。</p>

<h2>杭打ち工事の種類と仕事内容について</h2>
<p>この記事では、杭工事・基礎に関する情報を詳しく解説します。建設業界で働く方やこれから転職を検討している方に向けて、実践的な内容をまとめました。</p>

<h2>まとめ</h2>
<p>建設業界は人手不足が続いており、未経験者の方にもチャンスがある業界です。資格取得や経験を積むことで着実にキャリアアップが可能です。</p>
<p>ゲンバキャリアでは、建築・土木・設備・解体に特化した求人情報を掲載しています。あなたに合った求人を探してみてください。</p>', 'job-type', ARRAY['杭工事','基礎']::text[], NULL, '既製杭・場所打ち杭の違い、施工の流れ、従事するための資格と年収を解説。', 'ゲンバキャリア編集部', 'published', FALSE, 0, '2026-05-17T00:00:00.000Z', NOW(), NOW()) ON CONFLICT (slug) DO NOTHING;
INSERT INTO articles (id, slug, title, excerpt, body, category, tags, image_url, meta_description, author_name, status, featured, view_count, published_at, created_at, updated_at) VALUES (gen_random_uuid(), 'construction-commuting-allowance', '建設会社の通勤手当 — 車通勤・電車通勤の支給額', '建設会社の通勤手当の支給基準。車通勤のガソリン代・駐車場代の扱いについて。', '<p>建設会社の通勤手当の支給基準。車通勤のガソリン代・駐車場代の扱いについて。</p>

<h2>建設会社の通勤手当について</h2>
<p>この記事では、通勤手当・待遇に関する情報を詳しく解説します。建設業界で働く方やこれから転職を検討している方に向けて、実践的な内容をまとめました。</p>

<h2>まとめ</h2>
<p>建設業界は人手不足が続いており、未経験者の方にもチャンスがある業界です。資格取得や経験を積むことで着実にキャリアアップが可能です。</p>
<p>ゲンバキャリアでは、建築・土木・設備・解体に特化した求人情報を掲載しています。あなたに合った求人を探してみてください。</p>', 'salary', ARRAY['通勤手当','待遇']::text[], NULL, '建設会社の通勤手当の支給基準。車通勤のガソリン代・駐車場代の扱いについて。', 'ゲンバキャリア編集部', 'published', FALSE, 0, '2026-05-18T00:00:00.000Z', NOW(), NOW()) ON CONFLICT (slug) DO NOTHING;
INSERT INTO articles (id, slug, title, excerpt, body, category, tags, image_url, meta_description, author_name, status, featured, view_count, published_at, created_at, updated_at) VALUES (gen_random_uuid(), 'construction-permit-types', '建設業許可の種類 — 29業種の分類と取得要件', '建設業許可の一般と特定の違い、29業種の分類、取得に必要な経営業務管理責任者の要件。', '<p>建設業許可の一般と特定の違い、29業種の分類、取得に必要な経営業務管理責任者の要件。</p>

<h2>建設業許可の種類について</h2>
<p>この記事では、建設業許可・法規に関する情報を詳しく解説します。建設業界で働く方やこれから転職を検討している方に向けて、実践的な内容をまとめました。</p>

<h2>まとめ</h2>
<p>建設業界は人手不足が続いており、未経験者の方にもチャンスがある業界です。資格取得や経験を積むことで着実にキャリアアップが可能です。</p>
<p>ゲンバキャリアでは、建築・土木・設備・解体に特化した求人情報を掲載しています。あなたに合った求人を探してみてください。</p>', 'industry', ARRAY['建設業許可','法規']::text[], NULL, '建設業許可の一般と特定の違い、29業種の分類、取得に必要な経営業務管理責任者の要件。', 'ゲンバキャリア編集部', 'published', FALSE, 0, '2026-05-19T00:00:00.000Z', NOW(), NOW()) ON CONFLICT (slug) DO NOTHING;
INSERT INTO articles (id, slug, title, excerpt, body, category, tags, image_url, meta_description, author_name, status, featured, view_count, published_at, created_at, updated_at) VALUES (gen_random_uuid(), 'land-surveyor-career', '測量士のキャリアパス — 独立までの道筋', '測量士としてのキャリアパス。会社員から独立開業するまでに必要な経験と手続き。', '<p>測量士としてのキャリアパス。会社員から独立開業するまでに必要な経験と手続き。</p>

<h2>測量士のキャリアパスについて</h2>
<p>この記事では、測量・キャリアに関する情報を詳しく解説します。建設業界で働く方やこれから転職を検討している方に向けて、実践的な内容をまとめました。</p>

<h2>まとめ</h2>
<p>建設業界は人手不足が続いており、未経験者の方にもチャンスがある業界です。資格取得や経験を積むことで着実にキャリアアップが可能です。</p>
<p>ゲンバキャリアでは、建築・土木・設備・解体に特化した求人情報を掲載しています。あなたに合った求人を探してみてください。</p>', 'career', ARRAY['測量','キャリア']::text[], NULL, '測量士としてのキャリアパス。会社員から独立開業するまでに必要な経験と手続き。', 'ゲンバキャリア編集部', 'published', FALSE, 0, '2026-05-20T00:00:00.000Z', NOW(), NOW()) ON CONFLICT (slug) DO NOTHING;
INSERT INTO articles (id, slug, title, excerpt, body, category, tags, image_url, meta_description, author_name, status, featured, view_count, published_at, created_at, updated_at) VALUES (gen_random_uuid(), 'interview-retired-to-security', '建設作業員から施設警備へ — 60代の転身', '60代で建設作業員を引退し、施設警備に転職した男性の体験談。体力の変化と新しいやりがい。', '<p>60代で建設作業員を引退し、施設警備に転職した男性の体験談。体力の変化と新しいやりがい。</p>

<h2>建設作業員から施設警備へについて</h2>
<p>この記事では、シニア・転職体験に関する情報を詳しく解説します。建設業界で働く方やこれから転職を検討している方に向けて、実践的な内容をまとめました。</p>

<h2>まとめ</h2>
<p>建設業界は人手不足が続いており、未経験者の方にもチャンスがある業界です。資格取得や経験を積むことで着実にキャリアアップが可能です。</p>
<p>ゲンバキャリアでは、建築・土木・設備・解体に特化した求人情報を掲載しています。あなたに合った求人を探してみてください。</p>', 'interview', ARRAY['シニア','転職体験']::text[], NULL, '60代で建設作業員を引退し、施設警備に転職した男性の体験談。体力の変化と新しいやりがい。', 'ゲンバキャリア編集部', 'published', FALSE, 0, '2026-05-21T00:00:00.000Z', NOW(), NOW()) ON CONFLICT (slug) DO NOTHING;
INSERT INTO articles (id, slug, title, excerpt, body, category, tags, image_url, meta_description, author_name, status, featured, view_count, published_at, created_at, updated_at) VALUES (gen_random_uuid(), 'construction-night-shift-health', '夜勤続きの建設作業員の健康管理術', '夜間工事が続くときの睡眠・食事・体調管理のコツ。現場経験者のアドバイス。', '<p>夜間工事が続くときの睡眠・食事・体調管理のコツ。現場経験者のアドバイス。</p>

<h2>夜勤続きの建設作業員の健康管理術について</h2>
<p>この記事では、夜勤・健康に関する情報を詳しく解説します。建設業界で働く方やこれから転職を検討している方に向けて、実践的な内容をまとめました。</p>

<h2>まとめ</h2>
<p>建設業界は人手不足が続いており、未経験者の方にもチャンスがある業界です。資格取得や経験を積むことで着実にキャリアアップが可能です。</p>
<p>ゲンバキャリアでは、建築・土木・設備・解体に特化した求人情報を掲載しています。あなたに合った求人を探してみてください。</p>', 'industry', ARRAY['夜勤','健康']::text[], NULL, '夜間工事が続くときの睡眠・食事・体調管理のコツ。現場経験者のアドバイス。', 'ゲンバキャリア編集部', 'published', FALSE, 0, '2026-05-22T00:00:00.000Z', NOW(), NOW()) ON CONFLICT (slug) DO NOTHING;
INSERT INTO articles (id, slug, title, excerpt, body, category, tags, image_url, meta_description, author_name, status, featured, view_count, published_at, created_at, updated_at) VALUES (gen_random_uuid(), 'signboard-installer-guide', '看板工事・サイン工事の仕事と資格', '看板・サインの設置工事の仕事内容。高所作業車の資格や電気工事士との関連。', '<p>看板・サインの設置工事の仕事内容。高所作業車の資格や電気工事士との関連。</p>

<h2>看板工事・サイン工事の仕事と資格について</h2>
<p>この記事では、看板・特殊工事に関する情報を詳しく解説します。建設業界で働く方やこれから転職を検討している方に向けて、実践的な内容をまとめました。</p>

<h2>まとめ</h2>
<p>建設業界は人手不足が続いており、未経験者の方にもチャンスがある業界です。資格取得や経験を積むことで着実にキャリアアップが可能です。</p>
<p>ゲンバキャリアでは、建築・土木・設備・解体に特化した求人情報を掲載しています。あなたに合った求人を探してみてください。</p>', 'job-type', ARRAY['看板','特殊工事']::text[], NULL, '看板・サインの設置工事の仕事内容。高所作業車の資格や電気工事士との関連。', 'ゲンバキャリア編集部', 'published', FALSE, 0, '2026-05-23T00:00:00.000Z', NOW(), NOW()) ON CONFLICT (slug) DO NOTHING;
INSERT INTO articles (id, slug, title, excerpt, body, category, tags, image_url, meta_description, author_name, status, featured, view_count, published_at, created_at, updated_at) VALUES (gen_random_uuid(), 'construction-2024-regulation', '2024年問題のその後 — 建設業界の残業規制2年目', '2024年施行の残業上限規制から2年。建設業界の対応状況と現場への影響を検証。', '<p>2024年施行の残業上限規制から2年。建設業界の対応状況と現場への影響を検証。</p>

<h2>2024年問題のその後について</h2>
<p>この記事では、法規制・働き方改革に関する情報を詳しく解説します。建設業界で働く方やこれから転職を検討している方に向けて、実践的な内容をまとめました。</p>

<h2>まとめ</h2>
<p>建設業界は人手不足が続いており、未経験者の方にもチャンスがある業界です。資格取得や経験を積むことで着実にキャリアアップが可能です。</p>
<p>ゲンバキャリアでは、建築・土木・設備・解体に特化した求人情報を掲載しています。あなたに合った求人を探してみてください。</p>', 'industry', ARRAY['法規制','働き方改革']::text[], NULL, '2024年施行の残業上限規制から2年。建設業界の対応状況と現場への影響を検証。', 'ゲンバキャリア編集部', 'published', FALSE, 0, '2026-05-24T00:00:00.000Z', NOW(), NOW()) ON CONFLICT (slug) DO NOTHING;
INSERT INTO articles (id, slug, title, excerpt, body, category, tags, image_url, meta_description, author_name, status, featured, view_count, published_at, created_at, updated_at) VALUES (gen_random_uuid(), 'first-class-pipe-management', '1級管工事施工管理技士の受験対策', '1級管工事施工管理技士の試験概要、出題傾向、合格者の勉強法を紹介。', '<p>1級管工事施工管理技士の試験概要、出題傾向、合格者の勉強法を紹介。</p>

<h2>1級管工事施工管理技士の受験対策について</h2>
<p>この記事では、管工事・施工管理技士に関する情報を詳しく解説します。建設業界で働く方やこれから転職を検討している方に向けて、実践的な内容をまとめました。</p>

<h2>まとめ</h2>
<p>建設業界は人手不足が続いており、未経験者の方にもチャンスがある業界です。資格取得や経験を積むことで着実にキャリアアップが可能です。</p>
<p>ゲンバキャリアでは、建築・土木・設備・解体に特化した求人情報を掲載しています。あなたに合った求人を探してみてください。</p>', 'license', ARRAY['管工事','施工管理技士']::text[], NULL, '1級管工事施工管理技士の試験概要、出題傾向、合格者の勉強法を紹介。', 'ゲンバキャリア編集部', 'published', FALSE, 0, '2026-05-25T00:00:00.000Z', NOW(), NOW()) ON CONFLICT (slug) DO NOTHING;
INSERT INTO articles (id, slug, title, excerpt, body, category, tags, image_url, meta_description, author_name, status, featured, view_count, published_at, created_at, updated_at) VALUES (gen_random_uuid(), 'construction-salary-vs-office', '建設業界とオフィスワークの年収比較', '建設業界の年収をIT・製造・サービス業と比較。体力仕事のプレミアムは存在するか。', '<p>建設業界の年収をIT・製造・サービス業と比較。体力仕事のプレミアムは存在するか。</p>

<h2>建設業界とオフィスワークの年収比較について</h2>
<p>この記事では、年収比較・他業界に関する情報を詳しく解説します。建設業界で働く方やこれから転職を検討している方に向けて、実践的な内容をまとめました。</p>

<h2>まとめ</h2>
<p>建設業界は人手不足が続いており、未経験者の方にもチャンスがある業界です。資格取得や経験を積むことで着実にキャリアアップが可能です。</p>
<p>ゲンバキャリアでは、建築・土木・設備・解体に特化した求人情報を掲載しています。あなたに合った求人を探してみてください。</p>', 'salary', ARRAY['年収比較','他業界']::text[], NULL, '建設業界の年収をIT・製造・サービス業と比較。体力仕事のプレミアムは存在するか。', 'ゲンバキャリア編集部', 'published', FALSE, 0, '2026-05-26T00:00:00.000Z', NOW(), NOW()) ON CONFLICT (slug) DO NOTHING;
INSERT INTO articles (id, slug, title, excerpt, body, category, tags, image_url, meta_description, author_name, status, featured, view_count, published_at, created_at, updated_at) VALUES (gen_random_uuid(), 'waterworks-engineer-license', '給水装置工事主任技術者の資格ガイド', '給水装置工事主任技術者の受験資格、試験内容、合格率。配管工のキャリアアップに。', '<p>給水装置工事主任技術者の受験資格、試験内容、合格率。配管工のキャリアアップに。</p>

<h2>給水装置工事主任技術者の資格ガイドについて</h2>
<p>この記事では、給水・資格に関する情報を詳しく解説します。建設業界で働く方やこれから転職を検討している方に向けて、実践的な内容をまとめました。</p>

<h2>まとめ</h2>
<p>建設業界は人手不足が続いており、未経験者の方にもチャンスがある業界です。資格取得や経験を積むことで着実にキャリアアップが可能です。</p>
<p>ゲンバキャリアでは、建築・土木・設備・解体に特化した求人情報を掲載しています。あなたに合った求人を探してみてください。</p>', 'license', ARRAY['給水','資格']::text[], NULL, '給水装置工事主任技術者の受験資格、試験内容、合格率。配管工のキャリアアップに。', 'ゲンバキャリア編集部', 'published', FALSE, 0, '2026-05-27T00:00:00.000Z', NOW(), NOW()) ON CONFLICT (slug) DO NOTHING;
INSERT INTO articles (id, slug, title, excerpt, body, category, tags, image_url, meta_description, author_name, status, featured, view_count, published_at, created_at, updated_at) VALUES (gen_random_uuid(), 'construction-remote-management', '遠隔施工管理の現状 — ウェアラブルカメラの活用', 'ウェアラブルカメラ・タブレットを使った遠隔施工管理の導入事例と課題。', '<p>ウェアラブルカメラ・タブレットを使った遠隔施工管理の導入事例と課題。</p>

<h2>遠隔施工管理の現状について</h2>
<p>この記事では、遠隔・ICTに関する情報を詳しく解説します。建設業界で働く方やこれから転職を検討している方に向けて、実践的な内容をまとめました。</p>

<h2>まとめ</h2>
<p>建設業界は人手不足が続いており、未経験者の方にもチャンスがある業界です。資格取得や経験を積むことで着実にキャリアアップが可能です。</p>
<p>ゲンバキャリアでは、建築・土木・設備・解体に特化した求人情報を掲載しています。あなたに合った求人を探してみてください。</p>', 'industry', ARRAY['遠隔','ICT']::text[], NULL, 'ウェアラブルカメラ・タブレットを使った遠隔施工管理の導入事例と課題。', 'ゲンバキャリア編集部', 'published', FALSE, 0, '2026-05-28T00:00:00.000Z', NOW(), NOW()) ON CONFLICT (slug) DO NOTHING;
INSERT INTO articles (id, slug, title, excerpt, body, category, tags, image_url, meta_description, author_name, status, featured, view_count, published_at, created_at, updated_at) VALUES (gen_random_uuid(), 'construction-hearing-protection', '建設現場の騒音対策 — 難聴予防と保護具', '建設現場での騒音性難聴を防ぐための耳栓・イヤーマフの選び方と使用義務。', '<p>建設現場での騒音性難聴を防ぐための耳栓・イヤーマフの選び方と使用義務。</p>

<h2>建設現場の騒音対策について</h2>
<p>この記事では、騒音・安全に関する情報を詳しく解説します。建設業界で働く方やこれから転職を検討している方に向けて、実践的な内容をまとめました。</p>

<h2>まとめ</h2>
<p>建設業界は人手不足が続いており、未経験者の方にもチャンスがある業界です。資格取得や経験を積むことで着実にキャリアアップが可能です。</p>
<p>ゲンバキャリアでは、建築・土木・設備・解体に特化した求人情報を掲載しています。あなたに合った求人を探してみてください。</p>', 'industry', ARRAY['騒音','安全']::text[], NULL, '建設現場での騒音性難聴を防ぐための耳栓・イヤーマフの選び方と使用義務。', 'ゲンバキャリア編集部', 'published', FALSE, 0, '2026-05-29T00:00:00.000Z', NOW(), NOW()) ON CONFLICT (slug) DO NOTHING;
INSERT INTO articles (id, slug, title, excerpt, body, category, tags, image_url, meta_description, author_name, status, featured, view_count, published_at, created_at, updated_at) VALUES (gen_random_uuid(), 'interview-sekokan-to-developer', '施工管理からデベロッパーへ — 発注者側への転職', 'ゼネコンの施工管理からデベロッパーに転職した33歳の体験談。働き方の変化と年収。', '<p>ゼネコンの施工管理からデベロッパーに転職した33歳の体験談。働き方の変化と年収。</p>

<h2>施工管理からデベロッパーへについて</h2>
<p>この記事では、デベロッパー・転職体験に関する情報を詳しく解説します。建設業界で働く方やこれから転職を検討している方に向けて、実践的な内容をまとめました。</p>

<h2>まとめ</h2>
<p>建設業界は人手不足が続いており、未経験者の方にもチャンスがある業界です。資格取得や経験を積むことで着実にキャリアアップが可能です。</p>
<p>ゲンバキャリアでは、建築・土木・設備・解体に特化した求人情報を掲載しています。あなたに合った求人を探してみてください。</p>', 'interview', ARRAY['デベロッパー','転職体験']::text[], NULL, 'ゼネコンの施工管理からデベロッパーに転職した33歳の体験談。働き方の変化と年収。', 'ゲンバキャリア編集部', 'published', FALSE, 0, '2026-05-30T00:00:00.000Z', NOW(), NOW()) ON CONFLICT (slug) DO NOTHING;
INSERT INTO articles (id, slug, title, excerpt, body, category, tags, image_url, meta_description, author_name, status, featured, view_count, published_at, created_at, updated_at) VALUES (gen_random_uuid(), 'solar-panel-installer-guide', '太陽光パネル設置工事の仕事と将来性', '太陽光パネル設置工事の需要、仕事内容、必要な資格。再生可能エネルギー市場の展望。', '<p>太陽光パネル設置工事の需要、仕事内容、必要な資格。再生可能エネルギー市場の展望。</p>

<h2>太陽光パネル設置工事の仕事と将来性について</h2>
<p>この記事では、太陽光・再エネに関する情報を詳しく解説します。建設業界で働く方やこれから転職を検討している方に向けて、実践的な内容をまとめました。</p>

<h2>まとめ</h2>
<p>建設業界は人手不足が続いており、未経験者の方にもチャンスがある業界です。資格取得や経験を積むことで着実にキャリアアップが可能です。</p>
<p>ゲンバキャリアでは、建築・土木・設備・解体に特化した求人情報を掲載しています。あなたに合った求人を探してみてください。</p>', 'job-type', ARRAY['太陽光','再エネ']::text[], NULL, '太陽光パネル設置工事の需要、仕事内容、必要な資格。再生可能エネルギー市場の展望。', 'ゲンバキャリア編集部', 'published', FALSE, 0, '2026-05-31T00:00:00.000Z', NOW(), NOW()) ON CONFLICT (slug) DO NOTHING;
INSERT INTO articles (id, slug, title, excerpt, body, category, tags, image_url, meta_description, author_name, status, featured, view_count, published_at, created_at, updated_at) VALUES (gen_random_uuid(), 'construction-volunteer-disaster', '建設業者の災害復旧活動 — 社会貢献と課題', '地震・台風の際の建設業者による災害復旧活動。社会的役割と人手不足の課題。', '<p>地震・台風の際の建設業者による災害復旧活動。社会的役割と人手不足の課題。</p>

<h2>建設業者の災害復旧活動について</h2>
<p>この記事では、災害・社会貢献に関する情報を詳しく解説します。建設業界で働く方やこれから転職を検討している方に向けて、実践的な内容をまとめました。</p>

<h2>まとめ</h2>
<p>建設業界は人手不足が続いており、未経験者の方にもチャンスがある業界です。資格取得や経験を積むことで着実にキャリアアップが可能です。</p>
<p>ゲンバキャリアでは、建築・土木・設備・解体に特化した求人情報を掲載しています。あなたに合った求人を探してみてください。</p>', 'industry', ARRAY['災害','社会貢献']::text[], NULL, '地震・台風の際の建設業者による災害復旧活動。社会的役割と人手不足の課題。', 'ゲンバキャリア編集部', 'published', FALSE, 0, '2026-06-01T00:00:00.000Z', NOW(), NOW()) ON CONFLICT (slug) DO NOTHING;
INSERT INTO articles (id, slug, title, excerpt, body, category, tags, image_url, meta_description, author_name, status, featured, view_count, published_at, created_at, updated_at) VALUES (gen_random_uuid(), 'construction-foreign-worker-system', '建設業の外国人材受入れ制度 — 技能実習と特定技能', '建設分野の技能実習と特定技能の違い。受入れ企業の要件と手続きの流れ。', '<p>建設分野の技能実習と特定技能の違い。受入れ企業の要件と手続きの流れ。</p>

<h2>建設業の外国人材受入れ制度について</h2>
<p>この記事では、外国人材・制度に関する情報を詳しく解説します。建設業界で働く方やこれから転職を検討している方に向けて、実践的な内容をまとめました。</p>

<h2>まとめ</h2>
<p>建設業界は人手不足が続いており、未経験者の方にもチャンスがある業界です。資格取得や経験を積むことで着実にキャリアアップが可能です。</p>
<p>ゲンバキャリアでは、建築・土木・設備・解体に特化した求人情報を掲載しています。あなたに合った求人を探してみてください。</p>', 'industry', ARRAY['外国人材','制度']::text[], NULL, '建設分野の技能実習と特定技能の違い。受入れ企業の要件と手続きの流れ。', 'ゲンバキャリア編集部', 'published', FALSE, 0, '2026-06-02T00:00:00.000Z', NOW(), NOW()) ON CONFLICT (slug) DO NOTHING;
INSERT INTO articles (id, slug, title, excerpt, body, category, tags, image_url, meta_description, author_name, status, featured, view_count, published_at, created_at, updated_at) VALUES (gen_random_uuid(), 'site-supervisor-daily-routine', '施工管理技士の1日 — 朝礼から日報まで', '施工管理技士の典型的な1日のスケジュール。朝礼・巡回・打合せ・書類作業の時間配分。', '<p>施工管理技士の典型的な1日のスケジュール。朝礼・巡回・打合せ・書類作業の時間配分。</p>

<h2>施工管理技士の1日について</h2>
<p>この記事では、施工管理・1日の流れに関する情報を詳しく解説します。建設業界で働く方やこれから転職を検討している方に向けて、実践的な内容をまとめました。</p>

<h2>まとめ</h2>
<p>建設業界は人手不足が続いており、未経験者の方にもチャンスがある業界です。資格取得や経験を積むことで着実にキャリアアップが可能です。</p>
<p>ゲンバキャリアでは、建築・土木・設備・解体に特化した求人情報を掲載しています。あなたに合った求人を探してみてください。</p>', 'career', ARRAY['施工管理','1日の流れ']::text[], NULL, '施工管理技士の典型的な1日のスケジュール。朝礼・巡回・打合せ・書類作業の時間配分。', 'ゲンバキャリア編集部', 'published', FALSE, 0, '2026-06-03T00:00:00.000Z', NOW(), NOW()) ON CONFLICT (slug) DO NOTHING;
INSERT INTO articles (id, slug, title, excerpt, body, category, tags, image_url, meta_description, author_name, status, featured, view_count, published_at, created_at, updated_at) VALUES (gen_random_uuid(), 'construction-loan-support', '建設業界の住宅ローン審査 — 日給月給でも通る？', '建設作業員の住宅ローン審査の実態。日給月給制・一人親方でも審査を通すコツ。', '<p>建設作業員の住宅ローン審査の実態。日給月給制・一人親方でも審査を通すコツ。</p>

<h2>建設業界の住宅ローン審査について</h2>
<p>この記事では、住宅ローン・生活に関する情報を詳しく解説します。建設業界で働く方やこれから転職を検討している方に向けて、実践的な内容をまとめました。</p>

<h2>まとめ</h2>
<p>建設業界は人手不足が続いており、未経験者の方にもチャンスがある業界です。資格取得や経験を積むことで着実にキャリアアップが可能です。</p>
<p>ゲンバキャリアでは、建築・土木・設備・解体に特化した求人情報を掲載しています。あなたに合った求人を探してみてください。</p>', 'salary', ARRAY['住宅ローン','生活']::text[], NULL, '建設作業員の住宅ローン審査の実態。日給月給制・一人親方でも審査を通すコツ。', 'ゲンバキャリア編集部', 'published', FALSE, 0, '2026-06-04T00:00:00.000Z', NOW(), NOW()) ON CONFLICT (slug) DO NOTHING;
INSERT INTO articles (id, slug, title, excerpt, body, category, tags, image_url, meta_description, author_name, status, featured, view_count, published_at, created_at, updated_at) VALUES (gen_random_uuid(), 'hazardous-material-license', '危険物取扱者の資格 — 建設現場での活用場面', '危険物取扱者（乙種4類）の概要と、建設現場での燃料管理や塗装作業での活用。', '<p>危険物取扱者（乙種4類）の概要と、建設現場での燃料管理や塗装作業での活用。</p>

<h2>危険物取扱者の資格について</h2>
<p>この記事では、危険物・資格に関する情報を詳しく解説します。建設業界で働く方やこれから転職を検討している方に向けて、実践的な内容をまとめました。</p>

<h2>まとめ</h2>
<p>建設業界は人手不足が続いており、未経験者の方にもチャンスがある業界です。資格取得や経験を積むことで着実にキャリアアップが可能です。</p>
<p>ゲンバキャリアでは、建築・土木・設備・解体に特化した求人情報を掲載しています。あなたに合った求人を探してみてください。</p>', 'license', ARRAY['危険物','資格']::text[], NULL, '危険物取扱者（乙種4類）の概要と、建設現場での燃料管理や塗装作業での活用。', 'ゲンバキャリア編集部', 'published', FALSE, 0, '2026-06-05T00:00:00.000Z', NOW(), NOW()) ON CONFLICT (slug) DO NOTHING;
INSERT INTO articles (id, slug, title, excerpt, body, category, tags, image_url, meta_description, author_name, status, featured, view_count, published_at, created_at, updated_at) VALUES (gen_random_uuid(), 'construction-promotion-path', '建設会社の昇進・昇格の仕組み — 評価基準は？', '建設会社の昇進制度の実態。資格・経験年数・人望など評価されるポイントを解説。', '<p>建設会社の昇進制度の実態。資格・経験年数・人望など評価されるポイントを解説。</p>

<h2>建設会社の昇進・昇格の仕組みについて</h2>
<p>この記事では、昇進・評価に関する情報を詳しく解説します。建設業界で働く方やこれから転職を検討している方に向けて、実践的な内容をまとめました。</p>

<h2>まとめ</h2>
<p>建設業界は人手不足が続いており、未経験者の方にもチャンスがある業界です。資格取得や経験を積むことで着実にキャリアアップが可能です。</p>
<p>ゲンバキャリアでは、建築・土木・設備・解体に特化した求人情報を掲載しています。あなたに合った求人を探してみてください。</p>', 'career', ARRAY['昇進','評価']::text[], NULL, '建設会社の昇進制度の実態。資格・経験年数・人望など評価されるポイントを解説。', 'ゲンバキャリア編集部', 'published', FALSE, 0, '2026-06-06T00:00:00.000Z', NOW(), NOW()) ON CONFLICT (slug) DO NOTHING;
INSERT INTO articles (id, slug, title, excerpt, body, category, tags, image_url, meta_description, author_name, status, featured, view_count, published_at, created_at, updated_at) VALUES (gen_random_uuid(), 'interview-intern-to-fulltime', 'インターンから正社員へ — 建設会社での学生時代の経験', '大学生時代に建設会社でインターンを経験し、そのまま正社員になった24歳の話。', '<p>大学生時代に建設会社でインターンを経験し、そのまま正社員になった24歳の話。</p>

<h2>インターンから正社員へについて</h2>
<p>この記事では、インターン・学生に関する情報を詳しく解説します。建設業界で働く方やこれから転職を検討している方に向けて、実践的な内容をまとめました。</p>

<h2>まとめ</h2>
<p>建設業界は人手不足が続いており、未経験者の方にもチャンスがある業界です。資格取得や経験を積むことで着実にキャリアアップが可能です。</p>
<p>ゲンバキャリアでは、建築・土木・設備・解体に特化した求人情報を掲載しています。あなたに合った求人を探してみてください。</p>', 'interview', ARRAY['インターン','学生']::text[], NULL, '大学生時代に建設会社でインターンを経験し、そのまま正社員になった24歳の話。', 'ゲンバキャリア編集部', 'published', FALSE, 0, '2026-06-07T00:00:00.000Z', NOW(), NOW()) ON CONFLICT (slug) DO NOTHING;
INSERT INTO articles (id, slug, title, excerpt, body, category, tags, image_url, meta_description, author_name, status, featured, view_count, published_at, created_at, updated_at) VALUES (gen_random_uuid(), 'construction-earthquake-resistant', '耐震工事の仕事内容 — 需要が伸びる専門分野', '耐震補強工事の種類と仕事内容。古い建物の耐震化需要の拡大と求められる技術。', '<p>耐震補強工事の種類と仕事内容。古い建物の耐震化需要の拡大と求められる技術。</p>

<h2>耐震工事の仕事内容について</h2>
<p>この記事では、耐震・リフォームに関する情報を詳しく解説します。建設業界で働く方やこれから転職を検討している方に向けて、実践的な内容をまとめました。</p>

<h2>まとめ</h2>
<p>建設業界は人手不足が続いており、未経験者の方にもチャンスがある業界です。資格取得や経験を積むことで着実にキャリアアップが可能です。</p>
<p>ゲンバキャリアでは、建築・土木・設備・解体に特化した求人情報を掲載しています。あなたに合った求人を探してみてください。</p>', 'job-type', ARRAY['耐震','リフォーム']::text[], NULL, '耐震補強工事の種類と仕事内容。古い建物の耐震化需要の拡大と求められる技術。', 'ゲンバキャリア編集部', 'published', FALSE, 0, '2026-06-08T00:00:00.000Z', NOW(), NOW()) ON CONFLICT (slug) DO NOTHING;
INSERT INTO articles (id, slug, title, excerpt, body, category, tags, image_url, meta_description, author_name, status, featured, view_count, published_at, created_at, updated_at) VALUES (gen_random_uuid(), 'construction-green-building', 'グリーンビルディングと建設業 — 環境配慮型建築の仕事', 'ZEB・LEED認証など環境配慮型建築の動向。建設業界の新しい仕事の領域。', '<p>ZEB・LEED認証など環境配慮型建築の動向。建設業界の新しい仕事の領域。</p>

<h2>グリーンビルディングと建設業について</h2>
<p>この記事では、環境・ZEBに関する情報を詳しく解説します。建設業界で働く方やこれから転職を検討している方に向けて、実践的な内容をまとめました。</p>

<h2>まとめ</h2>
<p>建設業界は人手不足が続いており、未経験者の方にもチャンスがある業界です。資格取得や経験を積むことで着実にキャリアアップが可能です。</p>
<p>ゲンバキャリアでは、建築・土木・設備・解体に特化した求人情報を掲載しています。あなたに合った求人を探してみてください。</p>', 'industry', ARRAY['環境','ZEB']::text[], NULL, 'ZEB・LEED認証など環境配慮型建築の動向。建設業界の新しい仕事の領域。', 'ゲンバキャリア編集部', 'published', FALSE, 0, '2026-06-09T00:00:00.000Z', NOW(), NOW()) ON CONFLICT (slug) DO NOTHING;
INSERT INTO articles (id, slug, title, excerpt, body, category, tags, image_url, meta_description, author_name, status, featured, view_count, published_at, created_at, updated_at) VALUES (gen_random_uuid(), 'building-equipment-inspector', '建築設備検査員の資格と仕事', '建築設備検査員の資格概要、講習内容、定期検査の仕事内容を解説。', '<p>建築設備検査員の資格概要、講習内容、定期検査の仕事内容を解説。</p>

<h2>建築設備検査員の資格と仕事について</h2>
<p>この記事では、検査・資格に関する情報を詳しく解説します。建設業界で働く方やこれから転職を検討している方に向けて、実践的な内容をまとめました。</p>

<h2>まとめ</h2>
<p>建設業界は人手不足が続いており、未経験者の方にもチャンスがある業界です。資格取得や経験を積むことで着実にキャリアアップが可能です。</p>
<p>ゲンバキャリアでは、建築・土木・設備・解体に特化した求人情報を掲載しています。あなたに合った求人を探してみてください。</p>', 'license', ARRAY['検査','資格']::text[], NULL, '建築設備検査員の資格概要、講習内容、定期検査の仕事内容を解説。', 'ゲンバキャリア編集部', 'published', FALSE, 0, '2026-06-10T00:00:00.000Z', NOW(), NOW()) ON CONFLICT (slug) DO NOTHING;
INSERT INTO articles (id, slug, title, excerpt, body, category, tags, image_url, meta_description, author_name, status, featured, view_count, published_at, created_at, updated_at) VALUES (gen_random_uuid(), 'construction-work-life-balance', '建設業界のワークライフバランス — 改善する企業の取組み', '週休2日制の導入・ICT活用・業務効率化など、建設業界のWLB改善の取組み事例。', '<p>週休2日制の導入・ICT活用・業務効率化など、建設業界のWLB改善の取組み事例。</p>

<h2>建設業界のワークライフバランスについて</h2>
<p>この記事では、ワークライフバランス・働き方に関する情報を詳しく解説します。建設業界で働く方やこれから転職を検討している方に向けて、実践的な内容をまとめました。</p>

<h2>まとめ</h2>
<p>建設業界は人手不足が続いており、未経験者の方にもチャンスがある業界です。資格取得や経験を積むことで着実にキャリアアップが可能です。</p>
<p>ゲンバキャリアでは、建築・土木・設備・解体に特化した求人情報を掲載しています。あなたに合った求人を探してみてください。</p>', 'industry', ARRAY['ワークライフバランス','働き方']::text[], NULL, '週休2日制の導入・ICT活用・業務効率化など、建設業界のWLB改善の取組み事例。', 'ゲンバキャリア編集部', 'published', FALSE, 0, '2026-06-11T00:00:00.000Z', NOW(), NOW()) ON CONFLICT (slug) DO NOTHING;
INSERT INTO articles (id, slug, title, excerpt, body, category, tags, image_url, meta_description, author_name, status, featured, view_count, published_at, created_at, updated_at) VALUES (gen_random_uuid(), 'construction-network-building', '建設業界の人脈作り — 仕事につながるネットワーク', '建設業界での人脈の作り方と重要性。勉強会・組合・SNSの活用法。', '<p>建設業界での人脈の作り方と重要性。勉強会・組合・SNSの活用法。</p>

<h2>建設業界の人脈作りについて</h2>
<p>この記事では、人脈・キャリアに関する情報を詳しく解説します。建設業界で働く方やこれから転職を検討している方に向けて、実践的な内容をまとめました。</p>

<h2>まとめ</h2>
<p>建設業界は人手不足が続いており、未経験者の方にもチャンスがある業界です。資格取得や経験を積むことで着実にキャリアアップが可能です。</p>
<p>ゲンバキャリアでは、建築・土木・設備・解体に特化した求人情報を掲載しています。あなたに合った求人を探してみてください。</p>', 'career', ARRAY['人脈','キャリア']::text[], NULL, '建設業界での人脈の作り方と重要性。勉強会・組合・SNSの活用法。', 'ゲンバキャリア編集部', 'published', FALSE, 0, '2026-06-12T00:00:00.000Z', NOW(), NOW()) ON CONFLICT (slug) DO NOTHING;
INSERT INTO articles (id, slug, title, excerpt, body, category, tags, image_url, meta_description, author_name, status, featured, view_count, published_at, created_at, updated_at) VALUES (gen_random_uuid(), 'prefab-construction-guide', 'プレハブ建築の仕事内容 — 工場生産と現場組立', 'プレハブ工法の特徴と現場での組立作業の流れ。必要な技術と求人の探し方。', '<p>プレハブ工法の特徴と現場での組立作業の流れ。必要な技術と求人の探し方。</p>

<h2>プレハブ建築の仕事内容について</h2>
<p>この記事では、プレハブ・建築に関する情報を詳しく解説します。建設業界で働く方やこれから転職を検討している方に向けて、実践的な内容をまとめました。</p>

<h2>まとめ</h2>
<p>建設業界は人手不足が続いており、未経験者の方にもチャンスがある業界です。資格取得や経験を積むことで着実にキャリアアップが可能です。</p>
<p>ゲンバキャリアでは、建築・土木・設備・解体に特化した求人情報を掲載しています。あなたに合った求人を探してみてください。</p>', 'job-type', ARRAY['プレハブ','建築']::text[], NULL, 'プレハブ工法の特徴と現場での組立作業の流れ。必要な技術と求人の探し方。', 'ゲンバキャリア編集部', 'published', FALSE, 0, '2026-06-13T00:00:00.000Z', NOW(), NOW()) ON CONFLICT (slug) DO NOTHING;
INSERT INTO articles (id, slug, title, excerpt, body, category, tags, image_url, meta_description, author_name, status, featured, view_count, published_at, created_at, updated_at) VALUES (gen_random_uuid(), 'construction-inheritance-business', '建設会社の事業承継 — 後継者不足の現状と対策', '中小建設会社の事業承継問題。後継者候補の育成と社外承継（M&A）の選択肢。', '<p>中小建設会社の事業承継問題。後継者候補の育成と社外承継（M&A）の選択肢。</p>

<h2>建設会社の事業承継について</h2>
<p>この記事では、事業承継・経営に関する情報を詳しく解説します。建設業界で働く方やこれから転職を検討している方に向けて、実践的な内容をまとめました。</p>

<h2>まとめ</h2>
<p>建設業界は人手不足が続いており、未経験者の方にもチャンスがある業界です。資格取得や経験を積むことで着実にキャリアアップが可能です。</p>
<p>ゲンバキャリアでは、建築・土木・設備・解体に特化した求人情報を掲載しています。あなたに合った求人を探してみてください。</p>', 'industry', ARRAY['事業承継','経営']::text[], NULL, '中小建設会社の事業承継問題。後継者候補の育成と社外承継（M&A）の選択肢。', 'ゲンバキャリア編集部', 'published', FALSE, 0, '2026-06-14T00:00:00.000Z', NOW(), NOW()) ON CONFLICT (slug) DO NOTHING;
INSERT INTO articles (id, slug, title, excerpt, body, category, tags, image_url, meta_description, author_name, status, featured, view_count, published_at, created_at, updated_at) VALUES (gen_random_uuid(), 'interview-comeback-construction', '建設業界に出戻り転職 — 他業種を経験して戻った理由', '一度IT業界に転職したが建設現場に戻った36歳の体験談。他業界で気づいた建設業の魅力。', '<p>一度IT業界に転職したが建設現場に戻った36歳の体験談。他業界で気づいた建設業の魅力。</p>

<h2>建設業界に出戻り転職について</h2>
<p>この記事では、出戻り・転職体験に関する情報を詳しく解説します。建設業界で働く方やこれから転職を検討している方に向けて、実践的な内容をまとめました。</p>

<h2>まとめ</h2>
<p>建設業界は人手不足が続いており、未経験者の方にもチャンスがある業界です。資格取得や経験を積むことで着実にキャリアアップが可能です。</p>
<p>ゲンバキャリアでは、建築・土木・設備・解体に特化した求人情報を掲載しています。あなたに合った求人を探してみてください。</p>', 'interview', ARRAY['出戻り','転職体験']::text[], NULL, '一度IT業界に転職したが建設現場に戻った36歳の体験談。他業界で気づいた建設業の魅力。', 'ゲンバキャリア編集部', 'published', FALSE, 0, '2026-06-15T00:00:00.000Z', NOW(), NOW()) ON CONFLICT (slug) DO NOTHING;
INSERT INTO articles (id, slug, title, excerpt, body, category, tags, image_url, meta_description, author_name, status, featured, view_count, published_at, created_at, updated_at) VALUES (gen_random_uuid(), 'construction-quality-control', '建設現場の品質管理 — 検査の種類と合否基準', '配筋検査・コンクリート強度試験・出来形検査など、建設現場の品質管理体制を解説。', '<p>配筋検査・コンクリート強度試験・出来形検査など、建設現場の品質管理体制を解説。</p>

<h2>建設現場の品質管理について</h2>
<p>この記事では、品質管理・検査に関する情報を詳しく解説します。建設業界で働く方やこれから転職を検討している方に向けて、実践的な内容をまとめました。</p>

<h2>まとめ</h2>
<p>建設業界は人手不足が続いており、未経験者の方にもチャンスがある業界です。資格取得や経験を積むことで着実にキャリアアップが可能です。</p>
<p>ゲンバキャリアでは、建築・土木・設備・解体に特化した求人情報を掲載しています。あなたに合った求人を探してみてください。</p>', 'industry', ARRAY['品質管理','検査']::text[], NULL, '配筋検査・コンクリート強度試験・出来形検査など、建設現場の品質管理体制を解説。', 'ゲンバキャリア編集部', 'published', FALSE, 0, '2026-06-16T00:00:00.000Z', NOW(), NOW()) ON CONFLICT (slug) DO NOTHING;
INSERT INTO articles (id, slug, title, excerpt, body, category, tags, image_url, meta_description, author_name, status, featured, view_count, published_at, created_at, updated_at) VALUES (gen_random_uuid(), 'construction-job-matching-tips', '建設業界の求人 — 自分に合った会社を見つける方法', '建設会社を選ぶ際のチェックポイント。会社規模・現場エリア・待遇の見方を解説。', '<p>建設会社を選ぶ際のチェックポイント。会社規模・現場エリア・待遇の見方を解説。</p>

<h2>建設業界の求人について</h2>
<p>この記事では、求人・転職に関する情報を詳しく解説します。建設業界で働く方やこれから転職を検討している方に向けて、実践的な内容をまとめました。</p>

<h2>まとめ</h2>
<p>建設業界は人手不足が続いており、未経験者の方にもチャンスがある業界です。資格取得や経験を積むことで着実にキャリアアップが可能です。</p>
<p>ゲンバキャリアでは、建築・土木・設備・解体に特化した求人情報を掲載しています。あなたに合った求人を探してみてください。</p>', 'career', ARRAY['求人','転職']::text[], NULL, '建設会社を選ぶ際のチェックポイント。会社規模・現場エリア・待遇の見方を解説。', 'ゲンバキャリア編集部', 'published', FALSE, 0, '2026-06-17T00:00:00.000Z', NOW(), NOW()) ON CONFLICT (slug) DO NOTHING;
INSERT INTO articles (id, slug, title, excerpt, body, category, tags, image_url, meta_description, author_name, status, featured, view_count, published_at, created_at, updated_at) VALUES (gen_random_uuid(), 'construction-generation-gap', '建設現場の世代間ギャップ — ベテランと若手の橋渡し', '建設現場でのベテランと若手のコミュニケーション課題と、円滑に働くためのポイント。', '<p>建設現場でのベテランと若手のコミュニケーション課題と、円滑に働くためのポイント。</p>

<h2>建設現場の世代間ギャップについて</h2>
<p>この記事では、世代間・コミュニケーションに関する情報を詳しく解説します。建設業界で働く方やこれから転職を検討している方に向けて、実践的な内容をまとめました。</p>

<h2>まとめ</h2>
<p>建設業界は人手不足が続いており、未経験者の方にもチャンスがある業界です。資格取得や経験を積むことで着実にキャリアアップが可能です。</p>
<p>ゲンバキャリアでは、建築・土木・設備・解体に特化した求人情報を掲載しています。あなたに合った求人を探してみてください。</p>', 'industry', ARRAY['世代間','コミュニケーション']::text[], NULL, '建設現場でのベテランと若手のコミュニケーション課題と、円滑に働くためのポイント。', 'ゲンバキャリア編集部', 'published', FALSE, 0, '2026-06-18T00:00:00.000Z', NOW(), NOW()) ON CONFLICT (slug) DO NOTHING;
INSERT INTO articles (id, slug, title, excerpt, body, category, tags, image_url, meta_description, author_name, status, featured, view_count, published_at, created_at, updated_at) VALUES (gen_random_uuid(), 'construction-overseas-work', '海外の建設現場で働く — 日本人技術者の需要', '東南アジア・中東などで活躍する日本人建設技術者の需要。給与水準と必要なスキル。', '<p>東南アジア・中東などで活躍する日本人建設技術者の需要。給与水準と必要なスキル。</p>

<h2>海外の建設現場で働くについて</h2>
<p>この記事では、海外・キャリアに関する情報を詳しく解説します。建設業界で働く方やこれから転職を検討している方に向けて、実践的な内容をまとめました。</p>

<h2>まとめ</h2>
<p>建設業界は人手不足が続いており、未経験者の方にもチャンスがある業界です。資格取得や経験を積むことで着実にキャリアアップが可能です。</p>
<p>ゲンバキャリアでは、建築・土木・設備・解体に特化した求人情報を掲載しています。あなたに合った求人を探してみてください。</p>', 'career', ARRAY['海外','キャリア']::text[], NULL, '東南アジア・中東などで活躍する日本人建設技術者の需要。給与水準と必要なスキル。', 'ゲンバキャリア編集部', 'published', FALSE, 0, '2026-06-19T00:00:00.000Z', NOW(), NOW()) ON CONFLICT (slug) DO NOTHING;
INSERT INTO articles (id, slug, title, excerpt, body, category, tags, image_url, meta_description, author_name, status, featured, view_count, published_at, created_at, updated_at) VALUES (gen_random_uuid(), 'construction-future-2030', '2030年の建設業界 — 技術革新と人材の未来予測', 'ロボット施工・3Dプリンティング建築・完全BIM化など、2030年に向けた建設業界の変化を展望。', '<p>ロボット施工・3Dプリンティング建築・完全BIM化など、2030年に向けた建設業界の変化を展望。</p>

<h2>2030年の建設業界について</h2>
<p>この記事では、将来・技術革新に関する情報を詳しく解説します。建設業界で働く方やこれから転職を検討している方に向けて、実践的な内容をまとめました。</p>

<h2>まとめ</h2>
<p>建設業界は人手不足が続いており、未経験者の方にもチャンスがある業界です。資格取得や経験を積むことで着実にキャリアアップが可能です。</p>
<p>ゲンバキャリアでは、建築・土木・設備・解体に特化した求人情報を掲載しています。あなたに合った求人を探してみてください。</p>', 'industry', ARRAY['将来','技術革新']::text[], NULL, 'ロボット施工・3Dプリンティング建築・完全BIM化など、2030年に向けた建設業界の変化を展望。', 'ゲンバキャリア編集部', 'published', FALSE, 0, '2026-06-20T00:00:00.000Z', NOW(), NOW()) ON CONFLICT (slug) DO NOTHING;
INSERT INTO articles (id, slug, title, excerpt, body, category, tags, image_url, meta_description, author_name, status, featured, view_count, published_at, created_at, updated_at) VALUES (gen_random_uuid(), 'construction-first-license-success', '建設系の資格を初めて取得した日 — 合格者の声', '建設系の資格に初めて合格した人たちの声を集めました。勉強のコツと合格後の変化。', '<p>建設系の資格に初めて合格した人たちの声を集めました。勉強のコツと合格後の変化。</p>

<h2>建設系の資格を初めて取得した日について</h2>
<p>この記事では、資格合格・体験談に関する情報を詳しく解説します。建設業界で働く方やこれから転職を検討している方に向けて、実践的な内容をまとめました。</p>

<h2>まとめ</h2>
<p>建設業界は人手不足が続いており、未経験者の方にもチャンスがある業界です。資格取得や経験を積むことで着実にキャリアアップが可能です。</p>
<p>ゲンバキャリアでは、建築・土木・設備・解体に特化した求人情報を掲載しています。あなたに合った求人を探してみてください。</p>', 'interview', ARRAY['資格合格','体験談']::text[], NULL, '建設系の資格に初めて合格した人たちの声を集めました。勉強のコツと合格後の変化。', 'ゲンバキャリア編集部', 'published', FALSE, 0, '2026-06-21T00:00:00.000Z', NOW(), NOW()) ON CONFLICT (slug) DO NOTHING;
INSERT INTO articles (id, slug, title, excerpt, body, category, tags, image_url, meta_description, author_name, status, featured, view_count, published_at, created_at, updated_at) VALUES (gen_random_uuid(), 'construction-gratitude-message', '建設業界で働くすべての人へ — 私たちが街をつくる', '建設業界で働くことの意義と誇り。インフラ・住宅・施設を支える仕事のやりがいを伝えます。', '<p>建設業界で働くことの意義と誇り。インフラ・住宅・施設を支える仕事のやりがいを伝えます。</p>

<h2>建設業界で働くすべての人へについて</h2>
<p>この記事では、やりがい・社会貢献に関する情報を詳しく解説します。建設業界で働く方やこれから転職を検討している方に向けて、実践的な内容をまとめました。</p>

<h2>まとめ</h2>
<p>建設業界は人手不足が続いており、未経験者の方にもチャンスがある業界です。資格取得や経験を積むことで着実にキャリアアップが可能です。</p>
<p>ゲンバキャリアでは、建築・土木・設備・解体に特化した求人情報を掲載しています。あなたに合った求人を探してみてください。</p>', 'industry', ARRAY['やりがい','社会貢献']::text[], NULL, '建設業界で働くことの意義と誇り。インフラ・住宅・施設を支える仕事のやりがいを伝えます。', 'ゲンバキャリア編集部', 'published', FALSE, 0, '2026-06-22T00:00:00.000Z', NOW(), NOW()) ON CONFLICT (slug) DO NOTHING;
INSERT INTO articles (id, slug, title, excerpt, body, category, tags, image_url, meta_description, author_name, status, featured, view_count, published_at, created_at, updated_at) VALUES (gen_random_uuid(), 'construction-renovation-market', 'リフォーム・リノベーション市場 — 建設業の成長分野', '新築からリフォームへ。リノベーション市場の拡大と、必要とされる技術・資格。', '<p>新築からリフォームへ。リノベーション市場の拡大と、必要とされる技術・資格。</p>

<h2>リフォーム・リノベーション市場について</h2>
<p>この記事では、リフォーム・市場に関する情報を詳しく解説します。建設業界で働く方やこれから転職を検討している方に向けて、実践的な内容をまとめました。</p>

<h2>まとめ</h2>
<p>建設業界は人手不足が続いており、未経験者の方にもチャンスがある業界です。資格取得や経験を積むことで着実にキャリアアップが可能です。</p>
<p>ゲンバキャリアでは、建築・土木・設備・解体に特化した求人情報を掲載しています。あなたに合った求人を探してみてください。</p>', 'industry', ARRAY['リフォーム','市場']::text[], NULL, '新築からリフォームへ。リノベーション市場の拡大と、必要とされる技術・資格。', 'ゲンバキャリア編集部', 'published', FALSE, 0, '2026-06-23T00:00:00.000Z', NOW(), NOW()) ON CONFLICT (slug) DO NOTHING;
INSERT INTO articles (id, slug, title, excerpt, body, category, tags, image_url, meta_description, author_name, status, featured, view_count, published_at, created_at, updated_at) VALUES (gen_random_uuid(), 'crane-signal-operator', 'クレーン合図者の資格と役割 — 安全な揚重作業のために', 'クレーン合図者の特別教育の内容と、現場での合図方法。吊り荷作業の安全を守る重要な役割。', '<p>クレーン合図者の特別教育の内容と、現場での合図方法。吊り荷作業の安全を守る重要な役割。</p>

<h2>クレーン合図者の資格と役割について</h2>
<p>この記事では、クレーン・安全に関する情報を詳しく解説します。建設業界で働く方やこれから転職を検討している方に向けて、実践的な内容をまとめました。</p>

<h2>まとめ</h2>
<p>建設業界は人手不足が続いており、未経験者の方にもチャンスがある業界です。資格取得や経験を積むことで着実にキャリアアップが可能です。</p>
<p>ゲンバキャリアでは、建築・土木・設備・解体に特化した求人情報を掲載しています。あなたに合った求人を探してみてください。</p>', 'license', ARRAY['クレーン','安全']::text[], NULL, 'クレーン合図者の特別教育の内容と、現場での合図方法。吊り荷作業の安全を守る重要な役割。', 'ゲンバキャリア編集部', 'published', FALSE, 0, '2026-06-24T00:00:00.000Z', NOW(), NOW()) ON CONFLICT (slug) DO NOTHING;
INSERT INTO articles (id, slug, title, excerpt, body, category, tags, image_url, meta_description, author_name, status, featured, view_count, published_at, created_at, updated_at) VALUES (gen_random_uuid(), 'concrete-pump-operator', 'コンクリートポンプ車の運転 — 必要な資格と仕事', 'コンクリートポンプ車の運転に必要な資格、仕事内容、年収の目安を解説。', '<p>コンクリートポンプ車の運転に必要な資格、仕事内容、年収の目安を解説。</p>

<h2>コンクリートポンプ車の運転について</h2>
<p>この記事では、コンクリート・オペレーターに関する情報を詳しく解説します。建設業界で働く方やこれから転職を検討している方に向けて、実践的な内容をまとめました。</p>

<h2>まとめ</h2>
<p>建設業界は人手不足が続いており、未経験者の方にもチャンスがある業界です。資格取得や経験を積むことで着実にキャリアアップが可能です。</p>
<p>ゲンバキャリアでは、建築・土木・設備・解体に特化した求人情報を掲載しています。あなたに合った求人を探してみてください。</p>', 'job-type', ARRAY['コンクリート','オペレーター']::text[], NULL, 'コンクリートポンプ車の運転に必要な資格、仕事内容、年収の目安を解説。', 'ゲンバキャリア編集部', 'published', FALSE, 0, '2026-06-25T00:00:00.000Z', NOW(), NOW()) ON CONFLICT (slug) DO NOTHING;
INSERT INTO articles (id, slug, title, excerpt, body, category, tags, image_url, meta_description, author_name, status, featured, view_count, published_at, created_at, updated_at) VALUES (gen_random_uuid(), 'construction-mentor-importance', '建設現場での良い師匠の見つけ方', '技術を学ぶ上で重要な師匠との出会い。良い指導者を見つけるためのポイントと心構え。', '<p>技術を学ぶ上で重要な師匠との出会い。良い指導者を見つけるためのポイントと心構え。</p>

<h2>建設現場での良い師匠の見つけ方について</h2>
<p>この記事では、師匠・成長に関する情報を詳しく解説します。建設業界で働く方やこれから転職を検討している方に向けて、実践的な内容をまとめました。</p>

<h2>まとめ</h2>
<p>建設業界は人手不足が続いており、未経験者の方にもチャンスがある業界です。資格取得や経験を積むことで着実にキャリアアップが可能です。</p>
<p>ゲンバキャリアでは、建築・土木・設備・解体に特化した求人情報を掲載しています。あなたに合った求人を探してみてください。</p>', 'career', ARRAY['師匠','成長']::text[], NULL, '技術を学ぶ上で重要な師匠との出会い。良い指導者を見つけるためのポイントと心構え。', 'ゲンバキャリア編集部', 'published', FALSE, 0, '2026-06-26T00:00:00.000Z', NOW(), NOW()) ON CONFLICT (slug) DO NOTHING;
INSERT INTO articles (id, slug, title, excerpt, body, category, tags, image_url, meta_description, author_name, status, featured, view_count, published_at, created_at, updated_at) VALUES (gen_random_uuid(), 'construction-startup-cost', '建設業で独立する際の初期費用 — 資金計画ガイド', '一人親方・法人設立に必要な初期費用の目安。工具・車両・保険・許認可の費用一覧。', '<p>一人親方・法人設立に必要な初期費用の目安。工具・車両・保険・許認可の費用一覧。</p>

<h2>建設業で独立する際の初期費用について</h2>
<p>この記事では、独立・資金に関する情報を詳しく解説します。建設業界で働く方やこれから転職を検討している方に向けて、実践的な内容をまとめました。</p>

<h2>まとめ</h2>
<p>建設業界は人手不足が続いており、未経験者の方にもチャンスがある業界です。資格取得や経験を積むことで着実にキャリアアップが可能です。</p>
<p>ゲンバキャリアでは、建築・土木・設備・解体に特化した求人情報を掲載しています。あなたに合った求人を探してみてください。</p>', 'salary', ARRAY['独立','資金']::text[], NULL, '一人親方・法人設立に必要な初期費用の目安。工具・車両・保険・許認可の費用一覧。', 'ゲンバキャリア編集部', 'published', FALSE, 0, '2026-06-27T00:00:00.000Z', NOW(), NOW()) ON CONFLICT (slug) DO NOTHING;
INSERT INTO articles (id, slug, title, excerpt, body, category, tags, image_url, meta_description, author_name, status, featured, view_count, published_at, created_at, updated_at) VALUES (gen_random_uuid(), 'interview-father-son-construction', '親子で建設会社を営む — 2代目の苦悩と覚悟', '父から建設会社を引き継いだ2代目社長の体験談。経営と現場の両立の難しさ。', '<p>父から建設会社を引き継いだ2代目社長の体験談。経営と現場の両立の難しさ。</p>

<h2>親子で建設会社を営むについて</h2>
<p>この記事では、事業承継・家族に関する情報を詳しく解説します。建設業界で働く方やこれから転職を検討している方に向けて、実践的な内容をまとめました。</p>

<h2>まとめ</h2>
<p>建設業界は人手不足が続いており、未経験者の方にもチャンスがある業界です。資格取得や経験を積むことで着実にキャリアアップが可能です。</p>
<p>ゲンバキャリアでは、建築・土木・設備・解体に特化した求人情報を掲載しています。あなたに合った求人を探してみてください。</p>', 'interview', ARRAY['事業承継','家族']::text[], NULL, '父から建設会社を引き継いだ2代目社長の体験談。経営と現場の両立の難しさ。', 'ゲンバキャリア編集部', 'published', FALSE, 0, '2026-06-28T00:00:00.000Z', NOW(), NOW()) ON CONFLICT (slug) DO NOTHING;
INSERT INTO articles (id, slug, title, excerpt, body, category, tags, image_url, meta_description, author_name, status, featured, view_count, published_at, created_at, updated_at) VALUES (gen_random_uuid(), 'scaffolding-inspection-rules', '足場の点検義務 — 組立後・強風後の確認事項', '足場の設置後・強風後に義務付けられている点検項目と、記録の残し方を解説。', '<p>足場の設置後・強風後に義務付けられている点検項目と、記録の残し方を解説。</p>

<h2>足場の点検義務について</h2>
<p>この記事では、足場・点検に関する情報を詳しく解説します。建設業界で働く方やこれから転職を検討している方に向けて、実践的な内容をまとめました。</p>

<h2>まとめ</h2>
<p>建設業界は人手不足が続いており、未経験者の方にもチャンスがある業界です。資格取得や経験を積むことで着実にキャリアアップが可能です。</p>
<p>ゲンバキャリアでは、建築・土木・設備・解体に特化した求人情報を掲載しています。あなたに合った求人を探してみてください。</p>', 'industry', ARRAY['足場','点検']::text[], NULL, '足場の設置後・強風後に義務付けられている点検項目と、記録の残し方を解説。', 'ゲンバキャリア編集部', 'published', FALSE, 0, '2026-06-29T00:00:00.000Z', NOW(), NOW()) ON CONFLICT (slug) DO NOTHING;
INSERT INTO articles (id, slug, title, excerpt, body, category, tags, image_url, meta_description, author_name, status, featured, view_count, published_at, created_at, updated_at) VALUES (gen_random_uuid(), 'construction-dust-measures', '建設現場の粉じん対策 — 防塵マスクの選び方', '建設現場で発生する粉じんの種類と健康への影響。防塵マスクの種類と正しい装着法。', '<p>建設現場で発生する粉じんの種類と健康への影響。防塵マスクの種類と正しい装着法。</p>

<h2>建設現場の粉じん対策について</h2>
<p>この記事では、粉じん・安全に関する情報を詳しく解説します。建設業界で働く方やこれから転職を検討している方に向けて、実践的な内容をまとめました。</p>

<h2>まとめ</h2>
<p>建設業界は人手不足が続いており、未経験者の方にもチャンスがある業界です。資格取得や経験を積むことで着実にキャリアアップが可能です。</p>
<p>ゲンバキャリアでは、建築・土木・設備・解体に特化した求人情報を掲載しています。あなたに合った求人を探してみてください。</p>', 'industry', ARRAY['粉じん','安全']::text[], NULL, '建設現場で発生する粉じんの種類と健康への影響。防塵マスクの種類と正しい装着法。', 'ゲンバキャリア編集部', 'published', FALSE, 0, '2026-06-30T00:00:00.000Z', NOW(), NOW()) ON CONFLICT (slug) DO NOTHING;
INSERT INTO articles (id, slug, title, excerpt, body, category, tags, image_url, meta_description, author_name, status, featured, view_count, published_at, created_at, updated_at) VALUES (gen_random_uuid(), 'electrical-panel-installer', '分電盤・配電盤の設置工事 — 専門性の高い電気工事', '分電盤・配電盤の設置工事に携わる電気工事士の仕事内容と求められる技術レベル。', '<p>分電盤・配電盤の設置工事に携わる電気工事士の仕事内容と求められる技術レベル。</p>

<h2>分電盤・配電盤の設置工事について</h2>
<p>この記事では、電気・配電盤に関する情報を詳しく解説します。建設業界で働く方やこれから転職を検討している方に向けて、実践的な内容をまとめました。</p>

<h2>まとめ</h2>
<p>建設業界は人手不足が続いており、未経験者の方にもチャンスがある業界です。資格取得や経験を積むことで着実にキャリアアップが可能です。</p>
<p>ゲンバキャリアでは、建築・土木・設備・解体に特化した求人情報を掲載しています。あなたに合った求人を探してみてください。</p>', 'job-type', ARRAY['電気','配電盤']::text[], NULL, '分電盤・配電盤の設置工事に携わる電気工事士の仕事内容と求められる技術レベル。', 'ゲンバキャリア編集部', 'published', FALSE, 0, '2026-07-01T00:00:00.000Z', NOW(), NOW()) ON CONFLICT (slug) DO NOTHING;
INSERT INTO articles (id, slug, title, excerpt, body, category, tags, image_url, meta_description, author_name, status, featured, view_count, published_at, created_at, updated_at) VALUES (gen_random_uuid(), 'construction-camp-life', '建設現場の宿舎・寮生活 — リアルな住環境', '建設会社の寮や現場宿舎のリアルな住環境。間取り・設備・費用・ルールについて。', '<p>建設会社の寮や現場宿舎のリアルな住環境。間取り・設備・費用・ルールについて。</p>

<h2>建設現場の宿舎・寮生活について</h2>
<p>この記事では、寮・生活に関する情報を詳しく解説します。建設業界で働く方やこれから転職を検討している方に向けて、実践的な内容をまとめました。</p>

<h2>まとめ</h2>
<p>建設業界は人手不足が続いており、未経験者の方にもチャンスがある業界です。資格取得や経験を積むことで着実にキャリアアップが可能です。</p>
<p>ゲンバキャリアでは、建築・土木・設備・解体に特化した求人情報を掲載しています。あなたに合った求人を探してみてください。</p>', 'industry', ARRAY['寮','生活']::text[], NULL, '建設会社の寮や現場宿舎のリアルな住環境。間取り・設備・費用・ルールについて。', 'ゲンバキャリア編集部', 'published', FALSE, 0, '2026-07-02T00:00:00.000Z', NOW(), NOW()) ON CONFLICT (slug) DO NOTHING;
INSERT INTO articles (id, slug, title, excerpt, body, category, tags, image_url, meta_description, author_name, status, featured, view_count, published_at, created_at, updated_at) VALUES (gen_random_uuid(), 'second-class-pipe-management', '2級管工事施工管理技士の受験対策', '2級管工事施工管理技士の受験資格、試験科目、おすすめの勉強スケジュールを紹介。', '<p>2級管工事施工管理技士の受験資格、試験科目、おすすめの勉強スケジュールを紹介。</p>

<h2>2級管工事施工管理技士の受験対策について</h2>
<p>この記事では、管工事・2級に関する情報を詳しく解説します。建設業界で働く方やこれから転職を検討している方に向けて、実践的な内容をまとめました。</p>

<h2>まとめ</h2>
<p>建設業界は人手不足が続いており、未経験者の方にもチャンスがある業界です。資格取得や経験を積むことで着実にキャリアアップが可能です。</p>
<p>ゲンバキャリアでは、建築・土木・設備・解体に特化した求人情報を掲載しています。あなたに合った求人を探してみてください。</p>', 'license', ARRAY['管工事','2級']::text[], NULL, '2級管工事施工管理技士の受験資格、試験科目、おすすめの勉強スケジュールを紹介。', 'ゲンバキャリア編集部', 'published', FALSE, 0, '2026-07-03T00:00:00.000Z', NOW(), NOW()) ON CONFLICT (slug) DO NOTHING;
INSERT INTO articles (id, slug, title, excerpt, body, category, tags, image_url, meta_description, author_name, status, featured, view_count, published_at, created_at, updated_at) VALUES (gen_random_uuid(), 'construction-daily-report-tips', '施工管理の日報の書き方 — 効率的な記録方法', '施工管理技士の日報に何を書くべきか。効率的な記録方法とデジタルツールの活用。', '<p>施工管理技士の日報に何を書くべきか。効率的な記録方法とデジタルツールの活用。</p>

<h2>施工管理の日報の書き方について</h2>
<p>この記事では、日報・施工管理に関する情報を詳しく解説します。建設業界で働く方やこれから転職を検討している方に向けて、実践的な内容をまとめました。</p>

<h2>まとめ</h2>
<p>建設業界は人手不足が続いており、未経験者の方にもチャンスがある業界です。資格取得や経験を積むことで着実にキャリアアップが可能です。</p>
<p>ゲンバキャリアでは、建築・土木・設備・解体に特化した求人情報を掲載しています。あなたに合った求人を探してみてください。</p>', 'career', ARRAY['日報','施工管理']::text[], NULL, '施工管理技士の日報に何を書くべきか。効率的な記録方法とデジタルツールの活用。', 'ゲンバキャリア編集部', 'published', FALSE, 0, '2026-07-04T00:00:00.000Z', NOW(), NOW()) ON CONFLICT (slug) DO NOTHING;
INSERT INTO articles (id, slug, title, excerpt, body, category, tags, image_url, meta_description, author_name, status, featured, view_count, published_at, created_at, updated_at) VALUES (gen_random_uuid(), 'interview-young-entrepreneur', '25歳で建設会社を起業 — 若手経営者の挑戦', '25歳で内装工事会社を起業した若手経営者のインタビュー。独立のきっかけと経営の現実。', '<p>25歳で内装工事会社を起業した若手経営者のインタビュー。独立のきっかけと経営の現実。</p>

<h2>25歳で建設会社を起業について</h2>
<p>この記事では、起業・若手に関する情報を詳しく解説します。建設業界で働く方やこれから転職を検討している方に向けて、実践的な内容をまとめました。</p>

<h2>まとめ</h2>
<p>建設業界は人手不足が続いており、未経験者の方にもチャンスがある業界です。資格取得や経験を積むことで着実にキャリアアップが可能です。</p>
<p>ゲンバキャリアでは、建築・土木・設備・解体に特化した求人情報を掲載しています。あなたに合った求人を探してみてください。</p>', 'interview', ARRAY['起業','若手']::text[], NULL, '25歳で内装工事会社を起業した若手経営者のインタビュー。独立のきっかけと経営の現実。', 'ゲンバキャリア編集部', 'published', FALSE, 0, '2026-07-05T00:00:00.000Z', NOW(), NOW()) ON CONFLICT (slug) DO NOTHING;
INSERT INTO articles (id, slug, title, excerpt, body, category, tags, image_url, meta_description, author_name, status, featured, view_count, published_at, created_at, updated_at) VALUES (gen_random_uuid(), 'construction-earthquake-response', '地震発生時の建設現場の対応 — 避難と安全確認', '建設現場で地震が発生した際の避難手順、安全確認の方法、BCP対応について。', '<p>建設現場で地震が発生した際の避難手順、安全確認の方法、BCP対応について。</p>

<h2>地震発生時の建設現場の対応について</h2>
<p>この記事では、地震・安全に関する情報を詳しく解説します。建設業界で働く方やこれから転職を検討している方に向けて、実践的な内容をまとめました。</p>

<h2>まとめ</h2>
<p>建設業界は人手不足が続いており、未経験者の方にもチャンスがある業界です。資格取得や経験を積むことで着実にキャリアアップが可能です。</p>
<p>ゲンバキャリアでは、建築・土木・設備・解体に特化した求人情報を掲載しています。あなたに合った求人を探してみてください。</p>', 'industry', ARRAY['地震','安全']::text[], NULL, '建設現場で地震が発生した際の避難手順、安全確認の方法、BCP対応について。', 'ゲンバキャリア編集部', 'published', FALSE, 0, '2026-07-06T00:00:00.000Z', NOW(), NOW()) ON CONFLICT (slug) DO NOTHING;
INSERT INTO articles (id, slug, title, excerpt, body, category, tags, image_url, meta_description, author_name, status, featured, view_count, published_at, created_at, updated_at) VALUES (gen_random_uuid(), 'flooring-installer-guide', '床仕上げ工の仕事と年収 — フローリング・タイル・長尺', 'フローリング・塩ビタイル・長尺シートなど床仕上げ工の仕事内容と年収。', '<p>フローリング・塩ビタイル・長尺シートなど床仕上げ工の仕事内容と年収。</p>

<h2>床仕上げ工の仕事と年収について</h2>
<p>この記事では、床・内装に関する情報を詳しく解説します。建設業界で働く方やこれから転職を検討している方に向けて、実践的な内容をまとめました。</p>

<h2>まとめ</h2>
<p>建設業界は人手不足が続いており、未経験者の方にもチャンスがある業界です。資格取得や経験を積むことで着実にキャリアアップが可能です。</p>
<p>ゲンバキャリアでは、建築・土木・設備・解体に特化した求人情報を掲載しています。あなたに合った求人を探してみてください。</p>', 'job-type', ARRAY['床','内装']::text[], NULL, 'フローリング・塩ビタイル・長尺シートなど床仕上げ工の仕事内容と年収。', 'ゲンバキャリア編集部', 'published', FALSE, 0, '2026-07-07T00:00:00.000Z', NOW(), NOW()) ON CONFLICT (slug) DO NOTHING;
INSERT INTO articles (id, slug, title, excerpt, body, category, tags, image_url, meta_description, author_name, status, featured, view_count, published_at, created_at, updated_at) VALUES (gen_random_uuid(), 'construction-certification-merit', '建設業界の資格 — 取得で年収はどれだけ上がる？', '主要な建設系資格ごとの年収上昇額を調査。投資対効果の高い資格ランキング。', '<p>主要な建設系資格ごとの年収上昇額を調査。投資対効果の高い資格ランキング。</p>

<h2>建設業界の資格について</h2>
<p>この記事では、資格・年収アップに関する情報を詳しく解説します。建設業界で働く方やこれから転職を検討している方に向けて、実践的な内容をまとめました。</p>

<h2>まとめ</h2>
<p>建設業界は人手不足が続いており、未経験者の方にもチャンスがある業界です。資格取得や経験を積むことで着実にキャリアアップが可能です。</p>
<p>ゲンバキャリアでは、建築・土木・設備・解体に特化した求人情報を掲載しています。あなたに合った求人を探してみてください。</p>', 'salary', ARRAY['資格','年収アップ']::text[], NULL, '主要な建設系資格ごとの年収上昇額を調査。投資対効果の高い資格ランキング。', 'ゲンバキャリア編集部', 'published', FALSE, 0, '2026-07-08T00:00:00.000Z', NOW(), NOW()) ON CONFLICT (slug) DO NOTHING;
INSERT INTO articles (id, slug, title, excerpt, body, category, tags, image_url, meta_description, author_name, status, featured, view_count, published_at, created_at, updated_at) VALUES (gen_random_uuid(), 'landscape-construction-guide', '造園工事の仕事内容 — 緑を作るプロフェッショナル', '公園・庭園・屋上緑化などの造園工事の仕事内容。造園施工管理技士の資格も解説。', '<p>公園・庭園・屋上緑化などの造園工事の仕事内容。造園施工管理技士の資格も解説。</p>

<h2>造園工事の仕事内容について</h2>
<p>この記事では、造園・職種解説に関する情報を詳しく解説します。建設業界で働く方やこれから転職を検討している方に向けて、実践的な内容をまとめました。</p>

<h2>まとめ</h2>
<p>建設業界は人手不足が続いており、未経験者の方にもチャンスがある業界です。資格取得や経験を積むことで着実にキャリアアップが可能です。</p>
<p>ゲンバキャリアでは、建築・土木・設備・解体に特化した求人情報を掲載しています。あなたに合った求人を探してみてください。</p>', 'job-type', ARRAY['造園','職種解説']::text[], NULL, '公園・庭園・屋上緑化などの造園工事の仕事内容。造園施工管理技士の資格も解説。', 'ゲンバキャリア編集部', 'published', FALSE, 0, '2026-07-09T00:00:00.000Z', NOW(), NOW()) ON CONFLICT (slug) DO NOTHING;
INSERT INTO articles (id, slug, title, excerpt, body, category, tags, image_url, meta_description, author_name, status, featured, view_count, published_at, created_at, updated_at) VALUES (gen_random_uuid(), 'construction-blackout-measures', '建設現場の停電対策 — 発電機の種類と安全な使い方', '工事用発電機の種類と使い方。感電防止・CO中毒防止の注意点。', '<p>工事用発電機の種類と使い方。感電防止・CO中毒防止の注意点。</p>

<h2>建設現場の停電対策について</h2>
<p>この記事では、停電・安全に関する情報を詳しく解説します。建設業界で働く方やこれから転職を検討している方に向けて、実践的な内容をまとめました。</p>

<h2>まとめ</h2>
<p>建設業界は人手不足が続いており、未経験者の方にもチャンスがある業界です。資格取得や経験を積むことで着実にキャリアアップが可能です。</p>
<p>ゲンバキャリアでは、建築・土木・設備・解体に特化した求人情報を掲載しています。あなたに合った求人を探してみてください。</p>', 'industry', ARRAY['停電','安全']::text[], NULL, '工事用発電機の種類と使い方。感電防止・CO中毒防止の注意点。', 'ゲンバキャリア編集部', 'published', FALSE, 0, '2026-07-10T00:00:00.000Z', NOW(), NOW()) ON CONFLICT (slug) DO NOTHING;
INSERT INTO articles (id, slug, title, excerpt, body, category, tags, image_url, meta_description, author_name, status, featured, view_count, published_at, created_at, updated_at) VALUES (gen_random_uuid(), 'construction-body-maintenance', '建設作業員の体のケア — 腰痛・膝痛の予防法', '建設作業員に多い腰痛・膝痛の原因と予防法。ストレッチ・サポーター・整体の活用。', '<p>建設作業員に多い腰痛・膝痛の原因と予防法。ストレッチ・サポーター・整体の活用。</p>

<h2>建設作業員の体のケアについて</h2>
<p>この記事では、健康・体のケアに関する情報を詳しく解説します。建設業界で働く方やこれから転職を検討している方に向けて、実践的な内容をまとめました。</p>

<h2>まとめ</h2>
<p>建設業界は人手不足が続いており、未経験者の方にもチャンスがある業界です。資格取得や経験を積むことで着実にキャリアアップが可能です。</p>
<p>ゲンバキャリアでは、建築・土木・設備・解体に特化した求人情報を掲載しています。あなたに合った求人を探してみてください。</p>', 'industry', ARRAY['健康','体のケア']::text[], NULL, '建設作業員に多い腰痛・膝痛の原因と予防法。ストレッチ・サポーター・整体の活用。', 'ゲンバキャリア編集部', 'published', FALSE, 0, '2026-07-11T00:00:00.000Z', NOW(), NOW()) ON CONFLICT (slug) DO NOTHING;
INSERT INTO articles (id, slug, title, excerpt, body, category, tags, image_url, meta_description, author_name, status, featured, view_count, published_at, created_at, updated_at) VALUES (gen_random_uuid(), 'boiler-engineer-license', 'ボイラー技士の資格 — 建設設備業での需要', 'ボイラー技士（特級・1級・2級）の資格概要と建設設備業界での活用場面。', '<p>ボイラー技士（特級・1級・2級）の資格概要と建設設備業界での活用場面。</p>

<h2>ボイラー技士の資格について</h2>
<p>この記事では、ボイラー・資格に関する情報を詳しく解説します。建設業界で働く方やこれから転職を検討している方に向けて、実践的な内容をまとめました。</p>

<h2>まとめ</h2>
<p>建設業界は人手不足が続いており、未経験者の方にもチャンスがある業界です。資格取得や経験を積むことで着実にキャリアアップが可能です。</p>
<p>ゲンバキャリアでは、建築・土木・設備・解体に特化した求人情報を掲載しています。あなたに合った求人を探してみてください。</p>', 'license', ARRAY['ボイラー','資格']::text[], NULL, 'ボイラー技士（特級・1級・2級）の資格概要と建設設備業界での活用場面。', 'ゲンバキャリア編集部', 'published', FALSE, 0, '2026-07-12T00:00:00.000Z', NOW(), NOW()) ON CONFLICT (slug) DO NOTHING;
INSERT INTO articles (id, slug, title, excerpt, body, category, tags, image_url, meta_description, author_name, status, featured, view_count, published_at, created_at, updated_at) VALUES (gen_random_uuid(), 'construction-innovation-startups', '建設テック企業の台頭 — スタートアップが変える業界', '建設テック分野のスタートアップ企業の動向。業務効率化・安全管理・マッチングの革新。', '<p>建設テック分野のスタートアップ企業の動向。業務効率化・安全管理・マッチングの革新。</p>

<h2>建設テック企業の台頭について</h2>
<p>この記事では、スタートアップ・技術革新に関する情報を詳しく解説します。建設業界で働く方やこれから転職を検討している方に向けて、実践的な内容をまとめました。</p>

<h2>まとめ</h2>
<p>建設業界は人手不足が続いており、未経験者の方にもチャンスがある業界です。資格取得や経験を積むことで着実にキャリアアップが可能です。</p>
<p>ゲンバキャリアでは、建築・土木・設備・解体に特化した求人情報を掲載しています。あなたに合った求人を探してみてください。</p>', 'industry', ARRAY['スタートアップ','技術革新']::text[], NULL, '建設テック分野のスタートアップ企業の動向。業務効率化・安全管理・マッチングの革新。', 'ゲンバキャリア編集部', 'published', FALSE, 0, '2026-07-13T00:00:00.000Z', NOW(), NOW()) ON CONFLICT (slug) DO NOTHING;
INSERT INTO articles (id, slug, title, excerpt, body, category, tags, image_url, meta_description, author_name, status, featured, view_count, published_at, created_at, updated_at) VALUES (gen_random_uuid(), 'construction-pride-stories', '建設業界で誇れる瞬間 — 現場職人たちの声', '建設業界で働く人たちが最も誇りに感じた瞬間を集めました。竣工時の感動やお客様の声。', '<p>建設業界で働く人たちが最も誇りに感じた瞬間を集めました。竣工時の感動やお客様の声。</p>

<h2>建設業界で誇れる瞬間について</h2>
<p>この記事では、やりがい・インタビューに関する情報を詳しく解説します。建設業界で働く方やこれから転職を検討している方に向けて、実践的な内容をまとめました。</p>

<h2>まとめ</h2>
<p>建設業界は人手不足が続いており、未経験者の方にもチャンスがある業界です。資格取得や経験を積むことで着実にキャリアアップが可能です。</p>
<p>ゲンバキャリアでは、建築・土木・設備・解体に特化した求人情報を掲載しています。あなたに合った求人を探してみてください。</p>', 'interview', ARRAY['やりがい','インタビュー']::text[], NULL, '建設業界で働く人たちが最も誇りに感じた瞬間を集めました。竣工時の感動やお客様の声。', 'ゲンバキャリア編集部', 'published', FALSE, 0, '2026-07-14T00:00:00.000Z', NOW(), NOW()) ON CONFLICT (slug) DO NOTHING;
INSERT INTO articles (id, slug, title, excerpt, body, category, tags, image_url, meta_description, author_name, status, featured, view_count, published_at, created_at, updated_at) VALUES (gen_random_uuid(), 'construction-transfer-checklist', '建設業界への転職チェックリスト — 準備から入社まで', '建設業界への転職に必要な準備をチェックリスト形式で整理。漏れなく転職活動を進めるために。', '<p>建設業界への転職に必要な準備をチェックリスト形式で整理。漏れなく転職活動を進めるために。</p>

<h2>建設業界への転職チェックリストについて</h2>
<p>この記事では、転職・チェックリストに関する情報を詳しく解説します。建設業界で働く方やこれから転職を検討している方に向けて、実践的な内容をまとめました。</p>

<h2>まとめ</h2>
<p>建設業界は人手不足が続いており、未経験者の方にもチャンスがある業界です。資格取得や経験を積むことで着実にキャリアアップが可能です。</p>
<p>ゲンバキャリアでは、建築・土木・設備・解体に特化した求人情報を掲載しています。あなたに合った求人を探してみてください。</p>', 'career', ARRAY['転職','チェックリスト']::text[], NULL, '建設業界への転職に必要な準備をチェックリスト形式で整理。漏れなく転職活動を進めるために。', 'ゲンバキャリア編集部', 'published', FALSE, 0, '2026-07-15T00:00:00.000Z', NOW(), NOW()) ON CONFLICT (slug) DO NOTHING;
INSERT INTO articles (id, slug, title, excerpt, body, category, tags, image_url, meta_description, author_name, status, featured, view_count, published_at, created_at, updated_at) VALUES (gen_random_uuid(), 'paint-specialist-license', '塗装技能士の資格 — 1級・2級の違いと取得方法', '塗装技能士の受験資格、実技試験の内容、合格後の仕事の広がりを解説。', '<p>塗装技能士の受験資格、実技試験の内容、合格後の仕事の広がりを解説。</p>

<h2>塗装技能士の資格について</h2>
<p>この記事では、塗装・技能士に関する情報を詳しく解説します。建設業界で働く方やこれから転職を検討している方に向けて、実践的な内容をまとめました。</p>

<h2>まとめ</h2>
<p>建設業界は人手不足が続いており、未経験者の方にもチャンスがある業界です。資格取得や経験を積むことで着実にキャリアアップが可能です。</p>
<p>ゲンバキャリアでは、建築・土木・設備・解体に特化した求人情報を掲載しています。あなたに合った求人を探してみてください。</p>', 'license', ARRAY['塗装','技能士']::text[], NULL, '塗装技能士の受験資格、実技試験の内容、合格後の仕事の広がりを解説。', 'ゲンバキャリア編集部', 'published', FALSE, 0, '2026-07-16T00:00:00.000Z', NOW(), NOW()) ON CONFLICT (slug) DO NOTHING;
INSERT INTO articles (id, slug, title, excerpt, body, category, tags, image_url, meta_description, author_name, status, featured, view_count, published_at, created_at, updated_at) VALUES (gen_random_uuid(), 'construction-team-building', '建設現場のチームワーク — 安全と品質を支える連携', '多職種が同時に働く建設現場でのチームワークの重要性。朝礼・KY活動の意義。', '<p>多職種が同時に働く建設現場でのチームワークの重要性。朝礼・KY活動の意義。</p>

<h2>建設現場のチームワークについて</h2>
<p>この記事では、チームワーク・現場管理に関する情報を詳しく解説します。建設業界で働く方やこれから転職を検討している方に向けて、実践的な内容をまとめました。</p>

<h2>まとめ</h2>
<p>建設業界は人手不足が続いており、未経験者の方にもチャンスがある業界です。資格取得や経験を積むことで着実にキャリアアップが可能です。</p>
<p>ゲンバキャリアでは、建築・土木・設備・解体に特化した求人情報を掲載しています。あなたに合った求人を探してみてください。</p>', 'industry', ARRAY['チームワーク','現場管理']::text[], NULL, '多職種が同時に働く建設現場でのチームワークの重要性。朝礼・KY活動の意義。', 'ゲンバキャリア編集部', 'published', FALSE, 0, '2026-07-17T00:00:00.000Z', NOW(), NOW()) ON CONFLICT (slug) DO NOTHING;
INSERT INTO articles (id, slug, title, excerpt, body, category, tags, image_url, meta_description, author_name, status, featured, view_count, published_at, created_at, updated_at) VALUES (gen_random_uuid(), 'construction-career-summary-2026', '2026年上半期の建設業界振り返り — 求人動向と今後', '2026年上半期の建設業界の求人動向、賃金の変化、主要プロジェクトの状況を振り返り。', '<p>2026年上半期の建設業界の求人動向、賃金の変化、主要プロジェクトの状況を振り返り。</p>

<h2>2026年上半期の建設業界振り返りについて</h2>
<p>この記事では、振り返り・市場に関する情報を詳しく解説します。建設業界で働く方やこれから転職を検討している方に向けて、実践的な内容をまとめました。</p>

<h2>まとめ</h2>
<p>建設業界は人手不足が続いており、未経験者の方にもチャンスがある業界です。資格取得や経験を積むことで着実にキャリアアップが可能です。</p>
<p>ゲンバキャリアでは、建築・土木・設備・解体に特化した求人情報を掲載しています。あなたに合った求人を探してみてください。</p>', 'industry', ARRAY['振り返り','市場']::text[], NULL, '2026年上半期の建設業界の求人動向、賃金の変化、主要プロジェクトの状況を振り返り。', 'ゲンバキャリア編集部', 'published', FALSE, 0, '2026-07-18T00:00:00.000Z', NOW(), NOW()) ON CONFLICT (slug) DO NOTHING;

COMMIT;

-- 完了: 199 記事の INSERT 文を生成しました
