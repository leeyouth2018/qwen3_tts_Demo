import type { Metadata } from 'next';
import VoiceCloneApp from '@/components/VoiceCloneApp';

export const metadata: Metadata = {
  title: 'Voice Cloning TTS - 声音克隆',
  description: '使用 Qwen3-TTS-1.7B 实现声音克隆和文本转语音',
};

export default function Home() {
  return <VoiceCloneApp />;
}
