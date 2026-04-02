'use client';

import { useState, useRef, useEffect } from 'react';
import { Mic, Square, Trash2, Send } from 'lucide-react';

interface VoiceRecorderProps {
  onSend: (blob: Blob) => void;
  onCancel: () => void;
}

export function VoiceRecorder({ onSend, onCancel }: VoiceRecorderProps) {
  const [isRecording, setIsRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  const startTimer = () => {
    setRecordingTime(0);
    timerRef.current = setInterval(() => {
      setRecordingTime((prev) => prev + 1);
    }, 1000);
  };

  const stopTimer = () => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
  };

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      chunksRef.current = [];

      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) {
          chunksRef.current.push(e.data);
        }
      };

      mediaRecorder.start();
      setIsRecording(true);
      startTimer();
    } catch (err) {
      console.error('Failed to start recording:', err);
      onCancel();
    }
  };

  const stopRecording = (shouldSend: boolean) => {
    if (!mediaRecorderRef.current) return;

    mediaRecorderRef.current.onstop = () => {
      if (shouldSend && chunksRef.current.length > 0) {
        const blob = new Blob(chunksRef.current, { type: 'audio/webm' });
        onSend(blob);
      }
      mediaRecorderRef.current?.stream.getTracks().forEach(track => track.stop());
    };

    mediaRecorderRef.current.stop();
    setIsRecording(false);
    stopTimer();
  };

  useEffect(() => {
    startRecording();
    return () => {
      stopTimer();
      if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
        mediaRecorderRef.current.stop();
        mediaRecorderRef.current.stream.getTracks().forEach(track => track.stop());
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className="flex items-center gap-3 bg-(--accent-primary)/10 border border-(--accent-primary)/20 rounded-2xl px-4 py-2 w-full animate-in slide-in-from-bottom-2 transition-colors">
      <div className="flex items-center gap-2 flex-1">
        <div className="w-2 h-2 rounded-full bg-red-500 animate-pulse shadow-[0_0_8px_rgba(239,68,68,0.5)]" />
        <span className="text-sm font-mono text-(--accent-primary) font-bold">{formatTime(recordingTime)}</span>
        <div className="flex-1 h-1 bg-(--bg-tertiary) rounded-full overflow-hidden">
          <div className="h-full bg-(--accent-primary) animate-[pulse_1.5s_infinite] opacity-50" style={{ width: '100%' }} />
        </div>
      </div>

      <div className="flex items-center gap-1">
        <button 
          onClick={(e) => { e.preventDefault(); stopRecording(false); onCancel(); }}
          className="p-2 hover:bg-(--bg-hover) rounded-full text-(--text-muted) hover:text-red-500 transition-all"
          title="Hủy"
        >
          <Trash2 className="w-5 h-5" />
        </button>
        <button 
          onClick={(e) => { e.preventDefault(); stopRecording(true); }}
          className="p-2.5 rounded-xl text-white shadow-lg shadow-indigo-500/20 transition-all active:scale-95 group"
          style={{ background: 'var(--accent-gradient)' }}
          title="Gửi voice"
        >
          <Send className="w-5 h-5 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
        </button>
      </div>
    </div>
  );
}
