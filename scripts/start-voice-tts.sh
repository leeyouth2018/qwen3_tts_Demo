#!/bin/bash
# Voice Cloning TTS 组合启动脚本

PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$PROJECT_ROOT"

# 创建必要的目录
mkdir -p /tmp/models /tmp/voices

echo "=========================================="
echo "Voice Cloning TTS 服务启动"
echo "=========================================="

# 检查并安装 Python 依赖
if ! python3 -c "import fastapi" 2>/dev/null; then
    echo "安装 Python 依赖..."
    cd "$PROJECT_ROOT/backend"
    pip3 install -q -r requirements.txt
fi

# 启动 Python 后端
echo "启动 Python TTS 服务 (端口 5001)..."
cd "$PROJECT_ROOT/backend"
python3 -m uvicorn app:app --host 0.0.0.0 --port 5001 >> /app/work/logs/bypass/tts_server.log 2>&1 &
TTS_PID=$!
echo "TTS 服务 PID: $TTS_PID"

# 等待后端启动
sleep 3

# 检查后端是否启动成功
if curl -s http://localhost:5001/health > /dev/null 2>&1; then
    echo "✓ TTS 服务已就绪"
else
    echo "⚠ TTS 服务启动中，模型可能需要加载时间..."
fi

# 启动 Next.js
echo ""
echo "启动 Next.js 前端 (端口 5000)..."
cd "$PROJECT_ROOT"
pnpm run dev >> /app/work/logs/bypass/nextjs.log 2>&1 &
NEXTJS_PID=$!
echo "Next.js PID: $NEXTJS_PID"

echo ""
echo "=========================================="
echo "服务已启动!"
echo "  - 前端: http://localhost:5000"
echo "  - TTS API: http://localhost:5001"
echo "=========================================="
echo ""
echo "日志文件:"
echo "  - TTS: /app/work/logs/bypass/tts_server.log"
echo "  - Next.js: /app/work/logs/bypass/nextjs.log"
echo ""
echo "按 Ctrl+C 停止所有服务"
echo ""

# 等待退出
wait
