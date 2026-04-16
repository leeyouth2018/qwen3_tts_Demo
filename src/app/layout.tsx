import type { Metadata } from 'next';
import { Inspector } from 'react-dev-inspector';
import './globals.css';

export const metadata: Metadata = {
  title: {
    default: 'Voice Cloning TTS',
    template: '%s | Voice Cloning TTS',
  },
  description: '使用 Qwen3-TTS-1.7B 实现声音克隆和文本转语音',
  keywords: ['Voice Cloning', 'TTS', 'Text-to-Speech', 'Qwen3-TTS', '声音克隆'],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const isDev = process.env.COZE_PROJECT_ENV === 'DEV';

  return (
    <html lang="zh-CN">
      <body className={`antialiased`}>
        {isDev && <Inspector />}
        {children}
      </body>
    </html>
  );
}
