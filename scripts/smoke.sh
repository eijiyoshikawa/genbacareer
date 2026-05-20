#!/bin/bash
# リリース直前 / デプロイ後の smoke test。
#
# 使い方:
#   ./scripts/smoke.sh                       # 本番 (genbacareer.jp)
#   ./scripts/smoke.sh https://staging.example.com
#
# 確認項目:
#   - /                       (HTTP 200)
#   - /jobs                   (HTTP 200, X-Robots-Tag に index, noarchive)
#   - /robots.txt             (HTTP 200, GPTBot Disallow を含む)
#   - /sitemap.xml            (HTTP 200, application/xml)
#   - /api/health             (HTTP 200, status:"ok")
#   - /api/health?full=1      (HTTP 200, 必須 env が全部 ok)
#   - curl で 403 になるはず (UA = curl)
#   - mozilla UA で /jobs   (HTTP 200)
#
# 失敗があれば exit 1。

set -e

BASE_URL=${1:-https://www.genbacareer.jp}
FAIL=0

echo "🧪 smoke test: $BASE_URL"
echo

# -------- 公開ページ --------
check_status() {
  local path=$1
  local expected=$2
  local extra_curl_args=$3
  local ua=${4:-"Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36"}
  local status

  status=$(curl -s -o /dev/null -w "%{http_code}" \
    -H "User-Agent: $ua" \
    $extra_curl_args \
    "$BASE_URL$path")

  if [ "$status" = "$expected" ]; then
    echo "  ✅ $path → $status"
  else
    echo "  ❌ $path → $status (expected $expected)"
    FAIL=1
  fi
}

check_header() {
  local path=$1
  local header=$2
  local pattern=$3
  local value
  value=$(curl -sI "$BASE_URL$path" -H "User-Agent: Mozilla/5.0" | grep -i "^$header:" || true)
  if echo "$value" | grep -qE "$pattern"; then
    echo "  ✅ $path → $header matches /$pattern/"
  else
    echo "  ❌ $path → $header missing or not matching /$pattern/"
    echo "      got: $value"
    FAIL=1
  fi
}

check_body() {
  local path=$1
  local pattern=$2
  local body
  body=$(curl -s "$BASE_URL$path" -H "User-Agent: Mozilla/5.0")
  if echo "$body" | grep -qE "$pattern"; then
    echo "  ✅ $path body matches /$pattern/"
  else
    echo "  ❌ $path body missing /$pattern/"
    FAIL=1
  fi
}

echo "📄 ページ到達性"
check_status "/" 200
check_status "/jobs" 200
check_status "/robots.txt" 200
check_status "/sitemap.xml" 200
check_status "/api/health" 200
echo

echo "🔒 セキュリティ"
check_header "/" "Strict-Transport-Security" "max-age"
check_header "/" "X-Frame-Options" "DENY"
check_header "/" "Content-Security-Policy" "default-src"
check_header "/" "X-Robots-Tag" "(noarchive|index)"
echo

echo "🤖 robots.txt"
check_body "/robots.txt" "GPTBot"
check_body "/robots.txt" "ClaudeBot"
check_body "/robots.txt" "Sitemap:"
echo

echo "🛡 スクレイピング防御"
# curl UA は 403 にされるはず（middleware で弾く）
check_status "/jobs" 403 "" "curl/7.85.0"
# python-requests UA も 403
check_status "/jobs" 403 "" "python-requests/2.31.0"
echo

echo "🏥 ヘルスチェック"
check_body "/api/health" '"status":"ok"'
echo

# -------- 構造化データ --------
echo "🧷 構造化データ"
check_body "/" "Organization"
check_body "/" "WebSite"
echo

if [ "$FAIL" -ne 0 ]; then
  echo
  echo "❌ smoke test failed."
  exit 1
fi

echo
echo "🎉 全項目クリア — リリース準備完了"
