#!/usr/bin/env python3
"""
Qwen3-TTS 模型下载工具
使用: python3 download_model.py
"""

import os

def main():
    print("=" * 50)
    print("Qwen3-TTS 模型下载工具")
    print("=" * 50)

    model_dir = os.environ.get("MODEL_DIR", "/tmp/models")
    os.makedirs(model_dir, exist_ok=True)

    print(f"\n模型将下载到: {model_dir}")
    print("\n开始下载 Qwen3-TTS-12Hz-1.7B-Base 模型...")
    print("这可能需要几分钟时间，请耐心等待...\n")

    try:
        from modelscope import snapshot_download

        model_path = snapshot_download(
            "Qwen/Qwen3-TTS-12Hz-1.7B-Base",
            cache_dir=model_dir
        )

        print("\n" + "=" * 50)
        print("✓ 模型下载成功!")
        print(f"模型路径: {model_path}")
        print("=" * 50)

        # 验证模型文件
        print("\n验证模型文件...")
        files = os.listdir(model_path)
        print(f"模型文件数量: {len(files)}")
        for f in files[:5]:
            print(f"  - {f}")
        if len(files) > 5:
            print(f"  ... 还有 {len(files) - 5} 个文件")

    except ImportError:
        print("\n✗ 错误: 请先安装 modelscope")
        print("运行: pip install modelscope")
    except Exception as e:
        print(f"\n✗ 下载失败: {e}")
        raise

if __name__ == "__main__":
    main()
