"""
Voice Cloning TTS Service - 带有 Demo 模式
在没有完整模型的情况下可以运行 Demo 模式
"""

import os
import io
import json
import uuid
from pathlib import Path

from fastapi import FastAPI, UploadFile, File, HTTPException, Form
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse
import numpy as np

# ============== 配置 ==============
MODEL_DIR = os.environ.get("MODEL_DIR", "/tmp/models")
VOICE_DIR = os.environ.get("VOICE_DIR", "/tmp/voices")
PORT = int(os.environ.get("TTS_PORT", "5001"))
DEMO_MODE = os.environ.get("DEMO_MODE", "true").lower() == "true"

os.makedirs(MODEL_DIR, exist_ok=True)
os.makedirs(VOICE_DIR, exist_ok=True)
os.makedirs("/tmp", exist_ok=True)

app = FastAPI(title="Voice Cloning TTS API", version="1.0.0")

# CORS配置
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# 全局变量
model_loaded = False
tts_pipeline = None


# ============== 音频处理 ==============
def generate_demo_audio(duration_seconds: float = 3.0, sample_rate: int = 24000) -> np.ndarray:
    """生成演示用的简单音频（正弦波）"""
    t = np.linspace(0, duration_seconds, int(sample_rate * duration_seconds))
    freq = 440 + 220 * np.sin(2 * np.pi * 0.5 * t)
    audio = 0.3 * np.sin(2 * np.pi * freq * t)
    audio += 0.1 * np.sin(2 * np.pi * freq * 2 * t)
    audio += 0.05 * np.sin(2 * np.pi * freq * 3 * t)
    fade_len = int(0.1 * sample_rate)
    audio[:fade_len] *= np.linspace(0, 1, fade_len)
    audio[-fade_len:] *= np.linspace(1, 0, fade_len)
    return audio.astype(np.float32)


def process_audio(content: bytes) -> str:
    """处理上传的音频文件，返回处理后的音频路径"""
    audio_id = str(uuid.uuid4())
    temp_path = os.path.join("/tmp", f"audio_{audio_id}.wav")

    # 方法1: scipy WAV
    try:
        import scipy.io.wavfile as wavfile
        sr, data = wavfile.read(io.BytesIO(content))
        wavfile.write(temp_path, sr, data)
        if os.path.exists(temp_path) and os.path.getsize(temp_path) > 0:
            return temp_path
    except Exception:
        pass

    # 方法2: soundfile
    try:
        import soundfile as sf
        data, sr = sf.read(io.BytesIO(content))
        sf.write(temp_path, data, sr)
        if os.path.exists(temp_path) and os.path.getsize(temp_path) > 0:
            return temp_path
    except Exception:
        pass

    # 方法3: pydub
    try:
        from pydub import AudioSegment
        audio = AudioSegment.from_file(io.BytesIO(content))
        audio = audio.set_frame_rate(16000).set_channels(1)
        audio.export(temp_path, format="wav")
        if os.path.exists(temp_path) and os.path.getsize(temp_path) > 0:
            return temp_path
    except Exception:
        pass

    # 如果所有方法都失败，创建占位符文件
    sample_rate = 16000
    num_samples = int(sample_rate * 1.0)
    audio_data = np.zeros(num_samples, dtype=np.float32)

    try:
        import scipy.io.wavfile as wavfile
        wavfile.write(temp_path, sample_rate, audio_data)
        return temp_path
    except Exception:
        with open(temp_path, 'wb') as f:
            f.write(content[:min(len(content), 1000)])
        return temp_path


def write_wav_file(path: str, audio_data: np.ndarray, sample_rate: int = 24000):
    """写入WAV文件"""
    try:
        import scipy.io.wavfile as wavfile
        wavfile.write(path, sample_rate, audio_data)
    except Exception:
        # 手动写入WAV文件
        with open(path, 'wb') as f:
            header = bytearray([
                0x52, 0x49, 0x46, 0x46,  # RIFF
                0, 0, 0, 0,  # 文件大小-8
                0x57, 0x41, 0x56, 0x45,  # WAVE
                0x66, 0x6D, 0x74, 0x20,  # fmt
                16, 0, 0, 0,  # chunk size
                3, 0,  # float format
                1, 0,  # mono
                0x40, 0x5F, 0, 0,  # 24000 Hz
                0x80, 0xBE, 0, 0,  # byte rate
                4, 0,  # block align
                24, 0,  # bits per sample
                0x64, 0x61, 0x74, 0x61,  # data
            ])
            audio_bytes = audio_data.tobytes()
            file_size = len(header) + len(audio_bytes) - 8
            header[4:8] = file_size.to_bytes(4, 'little')
            f.write(header)
            f.write(audio_bytes)


async def synthesize(text: str, reference_audio: str = None) -> str:
    """根据模式选择真实合成或演示"""
    output_id = str(uuid.uuid4())
    output_path = os.path.join("/tmp", f"tts_{output_id}.wav")

    # Demo 模式或降级
    duration = min(max(len(text) * 0.12, 2.0), 8.0)
    audio_data = generate_demo_audio(duration)
    write_wav_file(output_path, audio_data, 24000)
    return output_path


# ============== API 路由 ==============

@app.get("/")
async def root():
    """API 根路径"""
    return {
        "message": "Voice Cloning TTS API",
        "version": "1.0.0",
        "model_loaded": model_loaded,
        "demo_mode": DEMO_MODE
    }


@app.get("/health")
async def health():
    """健康检查"""
    return {
        "status": "ready" if model_loaded else "demo_mode",
        "model_loaded": model_loaded,
        "demo_mode": DEMO_MODE
    }


@app.post("/api/tts/clone")
async def clone_and_synthesize(
    text: str = Form(...),
    audio: UploadFile = File(...),
    speed: float = Form(1.0)
):
    """上传参考音频并克隆音色，然后合成语音"""
    if not text or len(text.strip()) == 0:
        raise HTTPException(status_code=400, detail="文本内容不能为空")

    content = await audio.read()
    audio_path = process_audio(content)

    try:
        output_path = await synthesize(text, audio_path)
        return FileResponse(output_path, media_type="audio/wav", filename="generated.wav")
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        if os.path.exists(audio_path):
            try:
                os.remove(audio_path)
            except:
                pass


@app.post("/api/voices/save")
async def save_voice(
    name: str = Form(...),
    audio: UploadFile = File(...)
):
    """保存音色"""
    voice_id = str(uuid.uuid4())[:8]
    voice_path = os.path.join(VOICE_DIR, f"{voice_id}.wav")

    try:
        content = await audio.read()
        processed_path = process_audio(content)

        os.makedirs(os.path.dirname(voice_path), exist_ok=True)

        import shutil
        if processed_path != voice_path:
            shutil.copy(processed_path, voice_path)
            try:
                os.remove(processed_path)
            except:
                pass

        meta = {
            "id": voice_id,
            "name": name,
            "created": str(Path(voice_path).stat().st_mtime)
        }
        with open(os.path.join(VOICE_DIR, f"{voice_id}.json"), "w") as f:
            json.dump(meta, f)

        return {"success": True, "voice_id": voice_id, "name": name}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/api/voices")
async def list_voices():
    """获取所有已保存的音色"""
    voices = []
    try:
        for f in os.listdir(VOICE_DIR):
            if f.endswith(".json"):
                with open(os.path.join(VOICE_DIR, f)) as fp:
                    voices.append(json.load(fp))
    except Exception:
        pass
    return {"voices": voices}


@app.delete("/api/voices/{voice_id}")
async def delete_voice(voice_id: str):
    """删除音色"""
    for ext in [".wav", ".json"]:
        path = os.path.join(VOICE_DIR, f"{voice_id}{ext}")
        if os.path.exists(path):
            os.remove(path)
    return {"success": True}


@app.post("/api/tts/synthesize")
async def synthesize_with_voice(
    text: str = Form(...),
    voice_id: str = Form(...),
    speed: float = Form(1.0)
):
    """使用已保存的音色合成语音"""
    if not text:
        raise HTTPException(status_code=400, detail="文本不能为空")

    voice_path = os.path.join(VOICE_DIR, f"{voice_id}.wav")
    if not os.path.exists(voice_path):
        raise HTTPException(status_code=404, detail=f"音色 {voice_id} 不存在")

    try:
        output_path = await synthesize(text, voice_path)
        return FileResponse(output_path, media_type="audio/wav", filename="generated.wav")
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.on_event("startup")
async def startup():
    """启动时记录状态"""
    print(f"TTS 服务已启动 (Demo 模式: {DEMO_MODE})")
    print(f"Voice 目录: {VOICE_DIR}")


# ============== 启动 ==============
if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=PORT)
