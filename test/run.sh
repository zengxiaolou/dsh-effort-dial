#!/bin/bash
# 独立验收：用真实 React 18 + 真实 DOM 渲染插件，模拟拖动/提交/被拒回弹
# 用法: ./test/run.sh   （需要本机有 Google Chrome）
set -e
cd "$(dirname "$0")/.."
CHROME="/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"
[ -x "$CHROME" ] || { echo "缺少 Chrome"; exit 1; }
[ -f /tmp/rt/react.development.js ] || {
  mkdir -p /tmp/rt && cd /tmp/rt
  curl -sL https://unpkg.com/react@18.3.1/umd/react.development.js -o react.development.js
  curl -sL https://unpkg.com/react-dom@18.3.1/umd/react-dom.development.js -o react-dom.development.js
  cd - >/dev/null
}
OUT="/tmp/dial-test-$(date +%s).png"
"$CHROME" --headless=new --disable-gpu --hide-scrollbars --allow-file-access-from-files \
  --virtual-time-budget=5000 --window-size=1000,840 \
  --screenshot="$OUT" "file://$(pwd)/test/dial.test.html" >/dev/null 2>&1
echo "截图（含断言结果）: $OUT"
