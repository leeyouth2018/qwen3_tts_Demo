#!/bin/bash
# Voice Cloning TTS 安装脚本

set -e

echo "=========================================="
echo "Voice Cloning TTS 安装脚本"
echo "=========================================="

PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$PROJECT_ROOT"

# 创建必要的目录
echo "创建必要的目录..."
mkdir -p /tmp/models /tmp/voices

# 检查 Python
if ! command -v python3 &> /dev/null; then
    echo "错误: 需要 Python 3.8+"
    exit 1
fi

echo "Python 版本: $(python3 --version)"

# 安装 Python 依赖
echo ""
echo "安装 Python 依赖..."
cd "$PROJECT_ROOT/backend"
pip3 install -r requirements.txt

# 下载模型
echo ""
echo "下载 Qwen3-TTS 模型..."
cd "$PROJECT_ROOT/backend"
python3 download_model.py

echo ""
echo "=========================================="
echo "✓ 安装完成!"
echo "=========================================="
echo ""
echo "下一步:"
echo "  1. 运行 pnpm install (如果还没运行)"
echo "  2. 运行 pnpm dev 启动应用"
echo ""
