'use client';

import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  Upload,
  FileAudio,
  Play,
  Pause,
  Trash2,
  Plus,
  Volume2,
  Loader2,
  CheckCircle,
  AlertCircle,
  Mic,
  Settings,
  Download
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Slider } from '@/components/ui/slider';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  cloneAndSynthesize,
  saveVoice,
  listVoices,
  deleteVoice,
  synthesizeWithVoice,
  checkHealth,
  Voice,
} from '@/lib/api';

export default function VoiceCloneApp() {
  // 状态
  const [activeTab, setActiveTab] = useState<'clone' | 'voices'>('clone');
  const [referenceAudio, setReferenceAudio] = useState<File | null>(null);
  const [referenceUrl, setReferenceUrl] = useState<string | null>(null);
  const [text, setText] = useState('');
  const [speed, setSpeed] = useState(1.0);
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedAudio, setGeneratedAudio] = useState<string | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // 音色管理
  const [voices, setVoices] = useState<Voice[]>([]);
  const [selectedVoice, setSelectedVoice] = useState<Voice | null>(null);
  const [newVoiceName, setNewVoiceName] = useState('');
  const [isSavingVoice, setIsSavingVoice] = useState(false);

  // 模型状态
  const [modelStatus, setModelStatus] = useState<'loading' | 'ready' | 'error'>('loading');
  const [healthCheckInterval, setHealthCheckInterval] = useState<ReturnType<typeof setInterval> | null>(null);

  // Refs
  const audioRef = useRef<HTMLAudioElement>(null);
  const referenceAudioRef = useRef<HTMLAudioElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const voiceFileInputRef = useRef<HTMLInputElement>(null);
  const voiceAudioRef = useRef<HTMLAudioElement>(null);

  // 检查服务健康状态
  useEffect(() => {
    const checkModelStatus = async () => {
      try {
        const health = await checkHealth();
        if (health.model_loaded) {
          setModelStatus('ready');
          if (healthCheckInterval) {
            clearInterval(healthCheckInterval);
          }
        } else {
          setModelStatus('loading');
        }
      } catch {
        setModelStatus('error');
      }
    };

    checkModelStatus();
    const interval = setInterval(checkModelStatus, 10000);
    setHealthCheckInterval(interval);

    return () => {
      if (interval) clearInterval(interval);
    };
  }, []);

  // 加载音色列表
  const loadVoices = useCallback(async () => {
    try {
      const voiceList = await listVoices();
      setVoices(voiceList);
    } catch (err) {
      console.error('加载音色列表失败:', err);
    }
  }, []);

  useEffect(() => {
    if (activeTab === 'voices') {
      loadVoices();
    }
  }, [activeTab, loadVoices]);

  // 处理参考音频上传
  const handleAudioUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (!file.type.startsWith('audio/')) {
        setError('请上传音频文件');
        return;
      }
      setReferenceAudio(file);
      if (referenceUrl) {
        URL.revokeObjectURL(referenceUrl);
      }
      const url = URL.createObjectURL(file);
      setReferenceUrl(url);
      setError(null);
    }
  };

  // 播放/暂停参考音频
  const toggleReferencePlayback = () => {
    if (referenceAudioRef.current) {
      if (isPlaying) {
        referenceAudioRef.current.pause();
      } else {
        referenceAudioRef.current.play();
      }
      setIsPlaying(!isPlaying);
    }
  };

  // 克隆并合成
  const handleCloneAndSynthesize = async () => {
    if (!referenceAudio && !selectedVoice) {
      setError('请上传参考音频或选择一个已保存的音色');
      return;
    }
    if (!text.trim()) {
      setError('请输入要转换的文本');
      return;
    }

    setIsGenerating(true);
    setError(null);
    setSuccess(null);

    try {
      let result;
      if (selectedVoice) {
        result = await synthesizeWithVoice(text, selectedVoice.id, speed);
      } else {
        result = await cloneAndSynthesize(text, referenceAudio!, speed);
      }
      setGeneratedAudio(result.audioUrl);
      setSuccess('语音生成成功！');
    } catch (err) {
      setError(err instanceof Error ? err.message : '生成失败');
    } finally {
      setIsGenerating(false);
    }
  };

  // 播放生成的音频
  const playGenerated = () => {
    if (audioRef.current && generatedAudio) {
      audioRef.current.src = generatedAudio;
      audioRef.current.play();
    }
  };

  // 保存音色
  const handleSaveVoice = async () => {
    if (!referenceAudio) {
      setError('请先上传参考音频');
      return;
    }
    if (!newVoiceName.trim()) {
      setError('请输入音色名称');
      return;
    }

    setIsSavingVoice(true);
    setError(null);

    try {
      await saveVoice(newVoiceName, referenceAudio);
      setSuccess(`音色 "${newVoiceName}" 保存成功！`);
      setNewVoiceName('');
      await loadVoices();
    } catch (err) {
      setError(err instanceof Error ? err.message : '保存失败');
    } finally {
      setIsSavingVoice(false);
    }
  };

  // 删除音色
  const handleDeleteVoice = async (voiceId: string) => {
    try {
      await deleteVoice(voiceId);
      setVoices(voices.filter(v => v.id !== voiceId));
      if (selectedVoice?.id === voiceId) {
        setSelectedVoice(null);
      }
      setSuccess('音色删除成功');
    } catch (err) {
      setError(err instanceof Error ? err.message : '删除失败');
    }
  };

  // 下载生成的音频
  const handleDownload = () => {
    if (generatedAudio && audioRef.current) {
      const link = document.createElement('a');
      link.href = generatedAudio;
      link.download = `voice_clone_${Date.now()}.wav`;
      link.click();
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800">
      {/* Header */}
      <header className="border-b bg-white/80 dark:bg-slate-900/80 backdrop-blur-sm sticky top-0 z-50">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-gradient-to-br from-violet-500 to-purple-600 rounded-xl flex items-center justify-center">
                <Mic className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="text-xl font-bold">Voice Cloning TTS</h1>
                <p className="text-sm text-muted-foreground">Qwen3-TTS 声音克隆</p>
              </div>
            </div>

            {/* 模型状态 */}
            <Badge
              variant={modelStatus === 'ready' ? 'default' : modelStatus === 'loading' ? 'secondary' : 'destructive'}
              className="flex items-center gap-2"
            >
              {modelStatus === 'loading' && <Loader2 className="w-4 h-4 animate-spin" />}
              {modelStatus === 'ready' && <CheckCircle className="w-4 h-4" />}
              {modelStatus === 'error' && <AlertCircle className="w-4 h-4" />}
              {modelStatus === 'loading' ? '模型加载中...' : modelStatus === 'ready' ? '模型就绪' : '服务异常'}
            </Badge>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-8">
        {/* Tabs */}
        <div className="flex gap-2 mb-8">
          <Button
            variant={activeTab === 'clone' ? 'default' : 'outline'}
            onClick={() => setActiveTab('clone')}
            className="flex items-center gap-2"
          >
            <Volume2 className="w-4 h-4" />
            声音克隆
          </Button>
          <Button
            variant={activeTab === 'voices' ? 'default' : 'outline'}
            onClick={() => setActiveTab('voices')}
            className="flex items-center gap-2"
          >
            <Settings className="w-4 h-4" />
            音色管理
          </Button>
        </div>

        {activeTab === 'clone' ? (
          <div className="grid md:grid-cols-2 gap-8">
            {/* Left: Upload & Input */}
            <Card>
              <CardHeader>
                <CardTitle>上传参考音频</CardTitle>
                <CardDescription>
                  上传一段人声音频（5-30秒效果最佳），用于提取音色特征
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* 上传区域 */}
                <div
                  className={`border-2 border-dashed rounded-xl p-8 text-center transition-colors cursor-pointer
                    ${referenceAudio ? 'border-green-500 bg-green-50 dark:bg-green-900/20' : 'border-slate-300 hover:border-violet-500'}`}
                  onClick={() => fileInputRef.current?.click()}
                >
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="audio/*"
                    onChange={handleAudioUpload}
                    className="hidden"
                  />
                  {referenceAudio ? (
                    <div className="flex flex-col items-center gap-3">
                      <FileAudio className="w-12 h-12 text-green-500" />
                      <p className="font-medium">{referenceAudio.name}</p>
                      <p className="text-sm text-muted-foreground">
                        点击更换音频文件
                      </p>
                    </div>
                  ) : (
                    <div className="flex flex-col items-center gap-3">
                      <Upload className="w-12 h-12 text-slate-400" />
                      <p className="font-medium">点击上传音频</p>
                      <p className="text-sm text-muted-foreground">
                        支持 WAV, MP3, M4A 格式
                      </p>
                    </div>
                  )}
                </div>

                {/* 预览参考音频 */}
                {referenceUrl && (
                  <div className="flex items-center gap-3 p-4 bg-slate-100 dark:bg-slate-800 rounded-lg">
                    <Button
                      variant="outline"
                      size="icon"
                      onClick={toggleReferencePlayback}
                    >
                      {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
                    </Button>
                    <div className="flex-1">
                      <p className="text-sm font-medium">参考音频预览</p>
                      <audio
                        ref={referenceAudioRef}
                        src={referenceUrl}
                        onEnded={() => setIsPlaying(false)}
                      />
                    </div>
                  </div>
                )}

                {/* 已保存的音色 */}
                {voices.length > 0 && (
                  <div className="space-y-2">
                    <label className="text-sm font-medium">或选择已保存的音色</label>
                    <div className="flex flex-wrap gap-2">
                      {voices.map((voice) => (
                        <Badge
                          key={voice.id}
                          variant={selectedVoice?.id === voice.id ? 'default' : 'outline'}
                          className="cursor-pointer"
                          onClick={() => setSelectedVoice(selectedVoice?.id === voice.id ? null : voice)}
                        >
                          {voice.name}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}

                {/* 文本输入 */}
                <div className="space-y-2">
                  <label className="text-sm font-medium">输入要转换的文本</label>
                  <Textarea
                    value={text}
                    onChange={(e) => setText(e.target.value)}
                    placeholder="请输入要转换为语音的文本内容..."
                    className="min-h-[120px] resize-none"
                  />
                  <p className="text-xs text-muted-foreground">
                    {text.length} 字符
                  </p>
                </div>

                {/* 语速控制 */}
                <div className="space-y-2">
                  <div className="flex justify-between items-center">
                    <label className="text-sm font-medium">语速</label>
                    <span className="text-sm font-mono">{speed.toFixed(1)}x</span>
                  </div>
                  <Slider
                    value={[speed]}
                    onValueChange={([v]) => setSpeed(v)}
                    min={0.5}
                    max={2.0}
                    step={0.1}
                    className="py-2"
                  />
                  <div className="flex justify-between text-xs text-muted-foreground">
                    <span>0.5x (慢)</span>
                    <span>1.0x (正常)</span>
                    <span>2.0x (快)</span>
                  </div>
                </div>

                {/* 错误/成功提示 */}
                {error && (
                  <div className="flex items-center gap-2 p-3 bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 rounded-lg text-sm">
                    <AlertCircle className="w-4 h-4 flex-shrink-0" />
                    {error}
                  </div>
                )}
                {success && (
                  <div className="flex items-center gap-2 p-3 bg-green-50 dark:bg-green-900/20 text-green-600 dark:text-green-400 rounded-lg text-sm">
                    <CheckCircle className="w-4 h-4 flex-shrink-0" />
                    {success}
                  </div>
                )}

                {/* 生成按钮 */}
                <Button
                  className="w-full"
                  size="lg"
                  onClick={handleCloneAndSynthesize}
                  disabled={isGenerating || modelStatus === 'loading'}
                >
                  {isGenerating ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      正在生成...
                    </>
                  ) : (
                    <>
                      <Volume2 className="w-4 h-4 mr-2" />
                      生成克隆语音
                    </>
                  )}
                </Button>

                {/* 保存音色 */}
                {referenceAudio && (
                  <Dialog>
                    <DialogTrigger asChild>
                      <Button variant="outline" className="w-full">
                        <Plus className="w-4 h-4 mr-2" />
                        保存当前音色
                      </Button>
                    </DialogTrigger>
                    <DialogContent>
                      <DialogHeader>
                        <DialogTitle>保存音色</DialogTitle>
                        <DialogDescription>
                          给这个音色起个名字，方便以后使用
                        </DialogDescription>
                      </DialogHeader>
                      <div className="space-y-4 py-4">
                        <Input
                          value={newVoiceName}
                          onChange={(e) => setNewVoiceName(e.target.value)}
                          placeholder="例如：我的声音、小姐姐"
                        />
                        <Button
                          className="w-full"
                          onClick={handleSaveVoice}
                          disabled={isSavingVoice}
                        >
                          {isSavingVoice ? (
                            <>
                              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                              保存中...
                            </>
                          ) : (
                            <>
                              <Plus className="w-4 h-4 mr-2" />
                              确认保存
                            </>
                          )}
                        </Button>
                      </div>
                    </DialogContent>
                  </Dialog>
                )}
              </CardContent>
            </Card>

            {/* Right: Preview */}
            <Card>
              <CardHeader>
                <CardTitle>生成结果</CardTitle>
                <CardDescription>
                  预览和下载生成的语音
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {generatedAudio ? (
                  <>
                    {/* 音频播放器 */}
                    <div className="bg-slate-100 dark:bg-slate-800 rounded-xl p-6">
                      <div className="flex flex-col items-center gap-4">
                        <div className="w-20 h-20 bg-gradient-to-br from-violet-500 to-purple-600 rounded-full flex items-center justify-center animate-pulse">
                          <Volume2 className="w-10 h-10 text-white" />
                        </div>
                        <audio
                          ref={audioRef}
                          src={generatedAudio}
                          onEnded={() => setIsPlaying(false)}
                        />
                        <div className="flex gap-3">
                          <Button
                            onClick={playGenerated}
                            className="flex items-center gap-2"
                          >
                            <Play className="w-4 h-4" />
                            播放
                          </Button>
                          <Button
                            variant="outline"
                            onClick={handleDownload}
                            className="flex items-center gap-2"
                          >
                            <Download className="w-4 h-4" />
                            下载
                          </Button>
                        </div>
                      </div>
                    </div>

                    {/* 播放控制信息 */}
                    <div className="text-center text-sm text-muted-foreground">
                      <p>语速: {speed.toFixed(1)}x</p>
                      <p>文本长度: {text.length} 字符</p>
                    </div>
                  </>
                ) : (
                  <div className="flex flex-col items-center justify-center py-16 text-center">
                    <div className="w-20 h-20 bg-slate-200 dark:bg-slate-700 rounded-full flex items-center justify-center mb-4">
                      <Volume2 className="w-10 h-10 text-slate-400" />
                    </div>
                    <p className="text-muted-foreground">
                      上传参考音频并输入文本后<br />点击生成按钮开始克隆
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        ) : (
          /* Voices Management Tab */
          <Card>
            <CardHeader>
              <CardTitle>已保存的音色</CardTitle>
              <CardDescription>
                管理你保存的声音克隆音色
              </CardDescription>
            </CardHeader>
            <CardContent>
              {voices.length > 0 ? (
                <div className="grid md:grid-cols-3 gap-4">
                  {voices.map((voice) => (
                    <div
                      key={voice.id}
                      className="p-4 border rounded-lg hover:border-violet-500 transition-colors"
                    >
                      <div className="flex items-start justify-between mb-3">
                        <div>
                          <h3 className="font-medium">{voice.name}</h3>
                          <p className="text-xs text-muted-foreground">
                            ID: {voice.id}
                          </p>
                        </div>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleDeleteVoice(voice.id)}
                        >
                          <Trash2 className="w-4 h-4 text-red-500" />
                        </Button>
                      </div>
                      <Button
                        variant="outline"
                        className="w-full"
                        onClick={() => {
                          setSelectedVoice(voice);
                          setActiveTab('clone');
                        }}
                      >
                        <Play className="w-4 h-4 mr-2" />
                        使用此音色
                      </Button>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-16">
                  <div className="w-20 h-20 bg-slate-200 dark:bg-slate-700 rounded-full flex items-center justify-center mx-auto mb-4">
                    <Mic className="w-10 h-10 text-slate-400" />
                  </div>
                  <p className="text-muted-foreground mb-4">
                    还没有保存任何音色
                  </p>
                  <Button onClick={() => setActiveTab('clone')}>
                    <Plus className="w-4 h-4 mr-2" />
                    去克隆声音
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        )}
      </main>

      {/* Footer */}
      <footer className="border-t mt-16 py-8">
        <div className="container mx-auto px-4 text-center text-sm text-muted-foreground">
          <p>Powered by Qwen3-TTS-1.7B | ModelScope</p>
        </div>
      </footer>
    </div>
  );
}
