/**
 * Voice Cloning TTS API 服务
 */

const API_BASE = process.env.NEXT_PUBLIC_TTS_API || 'http://localhost:5001';

export interface Voice {
  id: string;
  name: string;
  created: string;
}

export interface CloneResult {
  audioUrl: string;
  blob: Blob;
}

/**
 * 上传参考音频并克隆音色，然后合成语音
 */
export async function cloneAndSynthesize(
  text: string,
  audioFile: File,
  speed: number = 1.0,
  onProgress?: (progress: number) => void
): Promise<CloneResult> {
  const formData = new FormData();
  formData.append('text', text);
  formData.append('audio', audioFile);
  formData.append('speed', speed.toString());

  try {
    const response = await fetch(`${API_BASE}/api/tts/clone`, {
      method: 'POST',
      body: formData,
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.detail || '语音合成失败');
    }

    const blob = await response.blob();
    const audioUrl = URL.createObjectURL(blob);

    return { audioUrl, blob };
  } catch (error) {
    throw error;
  }
}

/**
 * 保存音色
 */
export async function saveVoice(
  name: string,
  audioFile: File
): Promise<{ voice_id: string; name: string }> {
  const formData = new FormData();
  formData.append('name', name);
  formData.append('audio', audioFile);

  const response = await fetch(`${API_BASE}/api/voices/save`, {
    method: 'POST',
    body: formData,
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.detail || '保存音色失败');
  }

  return response.json();
}

/**
 * 获取所有已保存的音色
 */
export async function listVoices(): Promise<Voice[]> {
  const response = await fetch(`${API_BASE}/api/voices`);
  
  if (!response.ok) {
    throw new Error('获取音色列表失败');
  }

  const data = await response.json();
  return data.voices || [];
}

/**
 * 删除音色
 */
export async function deleteVoice(voiceId: string): Promise<void> {
  const response = await fetch(`${API_BASE}/api/voices/${voiceId}`, {
    method: 'DELETE',
  });

  if (!response.ok) {
    throw new Error('删除音色失败');
  }
}

/**
 * 使用已保存的音色合成语音
 */
export async function synthesizeWithVoice(
  text: string,
  voiceId: string,
  speed: number = 1.0
): Promise<CloneResult> {
  const formData = new FormData();
  formData.append('text', text);
  formData.append('voice_id', voiceId);
  formData.append('speed', speed.toString());

  const response = await fetch(`${API_BASE}/api/tts/synthesize`, {
    method: 'POST',
    body: formData,
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.detail || '语音合成失败');
  }

  const blob = await response.blob();
  const audioUrl = URL.createObjectURL(blob);

  return { audioUrl, blob };
}

/**
 * 检查 TTS 服务健康状态
 */
export async function checkHealth(): Promise<{ status: string; model_loaded: boolean }> {
  try {
    const response = await fetch(`${API_BASE}/health`);
    return response.json();
  } catch {
    return { status: 'unavailable', model_loaded: false };
  }
}
