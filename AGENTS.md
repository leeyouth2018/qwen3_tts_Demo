# Voice Cloning TTS - 项目文档

## 项目概述

基于 Qwen3-TTS-1.7B 的声音克隆网页应用，支持：
- 上传参考音频克隆音色
- 文本转语音合成
- 音色保存与管理
- 语速调节

## 技术架构

### 前端 (Next.js)
- 端口: 5000
- 技术栈: React 19, TypeScript, Tailwind CSS, shadcn/ui
- 功能: 音频上传、文本输入、实时播放、下载

### 后端 (Python FastAPI)
- 端口: 5001
- 技术栈: FastAPI, NumPy, scipy
- 模型: Qwen3-TTS-12Hz-1.7B-Base (ModelScope)
- 特性: Demo 模式（无需完整模型即可运行）

## 目录结构

```
.
├── backend/
│   ├── app.py              # FastAPI 应用主文件
│   ├── requirements.txt    # Python 依赖
│   ├── download_model.py   # 模型下载脚本
│   └── setup.sh           # 安装脚本
├── src/
│   ├── app/
│   │   ├── page.tsx       # 主页面
│   │   └── layout.tsx     # 布局
│   ├── components/
│   │   └── VoiceCloneApp.tsx  # 主要功能组件
│   └── lib/
│       └── api.ts         # API 服务层
├── scripts/
│   └── start-voice-tts.sh # 组合启动脚本
└── .env.local             # 环境变量
```

## 启动方式

### 方式1: 使用启动脚本（推荐）
```bash
cd /workspace/projects
bash scripts/start-voice-tts.sh
```

### 方式2: 手动启动
```bash
# 终端1: 启动 Python 后端
cd /workspace/projects/backend
python3 -m uvicorn app:app --host 0.0.0.0 --port 5001

# 终端2: 启动 Next.js 前端
cd /workspace/projects
pnpm dev
```

### 方式3: 仅前端 + Demo 模式
```bash
# Demo 模式会自动生成示例音频，无需完整模型
cd /workspace/projects
pnpm dev
```

## API 接口

### 健康检查
```
GET /health
```

### 声音克隆 + 合成
```
POST /api/tts/clone
Content-Type: multipart/form-data

参数:
- text: string (必填) - 要转换的文本
- audio: file (必填) - 参考音频文件
- speed: float (可选, 默认1.0) - 语速 0.5-2.0

响应: audio/wav
```

### 保存音色
```
POST /api/voices/save
Content-Type: multipart/form-data

参数:
- name: string (必填) - 音色名称
- audio: file (必填) - 参考音频文件

响应: { "success": true, "voice_id": "...", "name": "..." }
```

### 列表音色
```
GET /api/voices

响应: { "voices": [{ "id": "...", "name": "...", "created": "..." }] }
```

### 删除音色
```
DELETE /api/voices/{voice_id}

响应: { "success": true }
```

### 使用音色合成
```
POST /api/tts/synthesize
Content-Type: multipart/form-data

参数:
- text: string (必填) - 要转换的文本
- voice_id: string (必填) - 音色ID
- speed: float (可选, 默认1.0) - 语速

响应: audio/wav
```

## 模型下载

### 使用 ModelScope SDK
```bash
cd /workspace/projects/backend
python3 download_model.py
```

或使用命令行：
```bash
pip install modelscope
modelscope download --model Qwen/Qwen3-TTS-12Hz-1.7B-Base
```

### 环境变量
- `MODEL_DIR`: 模型存储目录 (默认: /tmp/models)
- `VOICE_DIR`: 音色存储目录 (默认: /tmp/voices)
- `DEMO_MODE`: 是否启用 Demo 模式 (默认: true)

## 安装依赖

### Python 依赖
```bash
cd /workspace/projects/backend
pip install -r requirements.txt
```

### Node.js 依赖
```bash
cd /workspace/projects
pnpm install
```

## 使用说明

### 1. 声音克隆
1. 点击上传区域，上传参考音频（5-30秒效果最佳）
2. 在文本框中输入要转换的内容
3. 调节语速（0.5x - 2.0x）
4. 点击"生成克隆语音"按钮
5. 等待生成完成，点击播放或下载

### 2. 保存音色
1. 上传参考音频后
2. 点击"保存当前音色"
3. 输入音色名称
4. 确认保存

### 3. 使用已保存的音色
1. 在音色列表中点击某个音色
2. 输入要转换的文本
3. 点击生成

## 注意事项

1. **Demo 模式**: 当前默认启用 Demo 模式，会生成示例音频。如需真实克隆效果，需要安装完整的 torch 和模型依赖。

2. **音频格式**: 支持 WAV、MP3、M4A 等常见音频格式，推荐使用 WAV 格式。

3. **音频时长**: 参考音频建议 5-30 秒，时长过短可能影响克隆效果。

4. **网络**: 首次使用需要从 ModelScope 下载模型（约 3.6GB）。

## 故障排除

### 模型加载失败
```bash
# 检查依赖
pip install torch torchaudio

# 重新下载模型
python3 backend/download_model.py
```

### 前端无法连接后端
- 检查后端服务是否运行: `curl http://localhost:5001/health`
- 检查端口是否被占用: `ss -lptn | grep 5001`

### 音频处理失败
- 确保安装了 ffmpeg: `apt-get install ffmpeg`
- 或确保安装了 scipy/soundfile/pydub
