'use client';

import { useState, useRef, useCallback, useEffect } from 'react';
import { useChatStore } from '@/stores/chatStore';
import { useAuthStore } from '@/stores/authStore';
import { getSocket } from '@/lib/socket';
import { generateTempId } from '@/lib/utils';
import { Message, Attachment } from '@/types';
import api from '@/lib/axios';
import { Send, Paperclip, Smile, X, FileText, Loader2, Mic, Sticker, ThumbsUp } from 'lucide-react';
import toast from 'react-hot-toast';
import { VoiceRecorder } from './VoiceRecorder';
import { StickerPicker } from './StickerPicker';
import dynamic from 'next/dynamic';

const EmojiPicker = dynamic(() => import('emoji-picker-react'), { ssr: false });

interface MessageInputProps {
  conversationId: string;
}

interface PendingFile {
  file: File;
  preview: string | null;
  type: 'image' | 'file';
}

export function MessageInput({ conversationId }: MessageInputProps) {
  const [content, setContent] = useState('');
  const [pendingFiles, setPendingFiles] = useState<PendingFile[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [showStickerPicker, setShowStickerPicker] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const { user } = useAuthStore();
  const { addMessage, replyingTo, setReplyingTo, editingMessage, setEditingMessage } = useChatStore();
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const isTypingRef = useRef(false);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const pickerRef = useRef<HTMLDivElement>(null);

  // Auto-resize textarea
  useEffect(() => {
    if (inputRef.current) {
      inputRef.current.style.height = 'auto';
      inputRef.current.style.height = Math.min(inputRef.current.scrollHeight, 150) + 'px';
    }
  }, [content]);

  // Handle outside click for emoji and sticker pickers
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (pickerRef.current && !pickerRef.current.contains(event.target as Node)) {
        setShowEmojiPicker(false);
        setShowStickerPicker(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Synchronize content with editingMessage when it changes (Pattern: Adjusting state during render)
  const [prevEditingId, setPrevEditingId] = useState<string | undefined>(editingMessage?._id);
  if (editingMessage?._id !== prevEditingId) {
    setPrevEditingId(editingMessage?._id);
    if (editingMessage) {
      setContent(editingMessage.content);
    }
  }

  // Handle focus when starting to edit
  useEffect(() => {
    if (editingMessage) {
      const timeout = setTimeout(() => {
        inputRef.current?.focus();
      }, 0);
      return () => clearTimeout(timeout);
    }
  }, [editingMessage]);

  const handleTypingStart = useCallback(() => {
    const socket = getSocket();
    if (!socket || isTypingRef.current) return;

    isTypingRef.current = true;
    socket.emit('typing_start', { conversationId });
  }, [conversationId]);

  const handleTypingStop = useCallback(() => {
    const socket = getSocket();
    if (!socket || !isTypingRef.current) return;

    isTypingRef.current = false;
    socket.emit('typing_stop', { conversationId });
  }, [conversationId]);

  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setContent(e.target.value);

    // Typing indicator with debounce
    handleTypingStart();

    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }
    typingTimeoutRef.current = setTimeout(() => {
      handleTypingStop();
    }, 3000);
  };

  const processFiles = (fileList: File[] | FileList) => {
    const files = Array.from(fileList);
    if (files.length === 0) return;

    const totalFiles = pendingFiles.length + files.length;
    if (totalFiles > 5) {
      toast.error('Tối đa 5 file mỗi lần gửi');
      return;
    }

    const newPending: PendingFile[] = [];
    for (const file of files) {
      const isImage = file.type.startsWith('image/');
      
      // Validate file size
      if (isImage && file.size > 5 * 1024 * 1024) {
        toast.error(`${file.name} quá lớn (tối đa 5MB cho ảnh)`);
        continue;
      }
      if (!isImage && file.size > 25 * 1024 * 1024) {
        toast.error(`${file.name} quá lớn (tối đa 25MB)`);
        continue;
      }

      newPending.push({
        file,
        preview: isImage ? URL.createObjectURL(file) : null,
        type: isImage ? 'image' : 'file',
      });
    }

    setPendingFiles((prev) => [...prev, ...newPending]);

    // Reset input
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) processFiles(e.target.files);
  };

  const removePendingFile = (index: number) => {
    setPendingFiles((prev) => {
      const removed = prev[index];
      if (removed.preview) URL.revokeObjectURL(removed.preview);
      return prev.filter((_, i) => i !== index);
    });
  };

  const onEmojiClick = (emojiData: any) => {
    setContent((prev) => prev + emojiData.emoji);
    inputRef.current?.focus();
    // Keep picker open if needed, or close it. Usually MessageInput closes it after click.
    setShowEmojiPicker(false);
  };

  const handleStickerSelect = (url: string) => {
    const tempId = generateTempId();
    const socket = getSocket();
    if (!socket) return;

    socket.emit('send_message', {
      tempId,
      conversationId,
      content: url,
      messageType: 'sticker',
    });

    setShowStickerPicker(false);
  };

  // Quick Like (Thumbs up) logic
  const isInputEmpty = !content.trim() && pendingFiles.length === 0 && !editingMessage;

  const handleSendOrLike = () => {
    if (isInputEmpty) {
      handleStickerSelect('https://raw.githubusercontent.com/Tarikul-Islam-Anik/Animated-Fluent-Emojis/master/Emojis/Hand%20gestures/Thumbs%20Up.png');
    } else {
      sendMessage();
    }
  };

  const handleVoiceSend = async (blob: Blob) => {
    if (!user) return;
    const socket = getSocket();
    if (!socket) return;

    const tempId = generateTempId();
    const file = new File([blob], 'voice_message.webm', { type: 'audio/webm' });

    // Optimistic UI
    const optimisticMessage: Message = {
      _id: tempId,
      tempId,
      conversationId,
      senderId: user,
      content: '',
      messageType: 'voice',
      attachments: [],
      readBy: [],
      deliveredTo: [],
      replyTo: replyingTo ? { ...replyingTo } : null,
      reactions: [],
      isEdited: false,
      isDeleted: false,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      status: 'sending',
    };

    addMessage(conversationId, optimisticMessage);
    setIsRecording(false);

    try {
      setIsUploading(true);
      const formData = new FormData();
      formData.append('files', file);
      const res = await api.post('/uploads', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      const attachments = res.data.data;
      setIsUploading(false);

      socket.emit('send_message', {
        tempId,
        conversationId,
        content: '',
        messageType: 'voice',
        attachments,
        replyTo: replyingTo?._id,
      });
      setReplyingTo(null);
    } catch (error) {
      setIsUploading(false);
      toast.error('Gửi tin nhắn thoại thất bại');
      console.error('Voice send error:', error);
    }
  };

  const sendMessage = async () => {
    const text = content.trim();
    const hasFiles = pendingFiles.length > 0;
    if (!text && !hasFiles && !editingMessage) return;
    if (!user) return;

    const socket = getSocket();
    if (!socket) return;

    if (editingMessage) {
      socket.emit('edit_message', {
        messageId: editingMessage._id,
        conversationId,
        content: text,
      });
      setEditingMessage(null);
      setContent('');
      return;
    }

    const tempId = generateTempId();

    // Determine message type
    let messageType: 'text' | 'image' | 'file' | 'voice' = 'text';
    if (hasFiles) {
      messageType = pendingFiles.some((f) => f.type === 'image') ? 'image' : 'file';
    }

    // Optimistic UI
    const optimisticMessage: Message = {
      _id: tempId,
      tempId,
      conversationId,
      senderId: user,
      content: text,
      messageType,
      attachments: [],
      readBy: [],
      deliveredTo: [],
      replyTo: replyingTo ? { ...replyingTo } : null,
      reactions: [],
      isEdited: false,
      isDeleted: false,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      status: 'sending',
    };

    addMessage(conversationId, optimisticMessage);
    setContent('');
    const filesToUpload = [...pendingFiles];
    setPendingFiles([]);
    setReplyingTo(null);
    handleTypingStop();
    inputRef.current?.focus();

    try {
      // Upload files if any
      let attachments: Attachment[] = [];
      if (filesToUpload.length > 0) {
        setIsUploading(true);
        const formData = new FormData();
        filesToUpload.forEach((pf) => formData.append('files', pf.file));
        const res = await api.post('/uploads', formData, {
          headers: { 'Content-Type': 'multipart/form-data' },
        });
        attachments = res.data.data;
        setIsUploading(false);
      }

      // Emit to server
      socket.emit('send_message', {
        tempId,
        conversationId,
        content: text,
        messageType,
        attachments,
        replyTo: replyingTo?._id,
      });

      // Clean up previews
      filesToUpload.forEach((pf) => {
        if (pf.preview) URL.revokeObjectURL(pf.preview);
      });
    } catch (error) {
      setIsUploading(false);
      toast.error('Gửi tin nhắn thất bại');
      console.error('Send message error:', error);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
    if (e.key === 'Escape') {
      setReplyingTo(null);
      setEditingMessage(null);
      if (editingMessage) setContent('');
    }
  };

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const files = Array.from(e.dataTransfer.files);
    if (files.length > 0) {
      processFiles(files);
    }
  };

  const handlePaste = (e: React.ClipboardEvent) => {
    const items = e.clipboardData.items;
    const imageFiles: File[] = [];
    for (const item of items) {
      if (item.type.startsWith('image/')) {
        const file = item.getAsFile();
        if (file) imageFiles.push(file);
      }
    }
    if (imageFiles.length > 0) {
      e.preventDefault();
      processFiles(imageFiles);
    }
  };

  return (
    <div
      className="px-4 py-3 border-t border-white/5 glass relative"
      onDragOver={handleDrag}
      onDrop={handleDrop}
    >
      {/* Reply/Edit indicator */}
      {(replyingTo || editingMessage) && (
        <div className="flex items-center justify-between gap-3 p-3 mb-3 rounded-xl bg-indigo-500/10 border border-indigo-500/20 animate-in slide-in-from-bottom-2">
          <div className="flex items-center gap-3 overflow-hidden">
            <div className="w-1 h-8 rounded-full bg-indigo-500 shrink-0" />
            <div className="min-w-0">
              <p className="text-[11px] font-bold text-indigo-400 uppercase tracking-wider mb-0.5">
                {replyingTo ? 'Đang trả lời' : 'Đang chỉnh sửa'}
              </p>
              <p className="text-xs text-gray-400 truncate italic">
                {replyingTo ? 
                  (typeof replyingTo.senderId === 'object' ? replyingTo.senderId.displayName || replyingTo.senderId.username : 'Tin nhắn') + ': ' + replyingTo.content : 
                  editingMessage?.content}
              </p>
            </div>
          </div>
          <button 
            onClick={() => { setReplyingTo(null); setEditingMessage(null); if (editingMessage) setContent(''); }}
            className="p-1.5 hover:bg-white/10 rounded-full transition-colors text-gray-500 hover:text-white shrink-0"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Pending files preview */}
      {pendingFiles.length > 0 && (
        <div className="flex gap-2 mb-3 overflow-x-auto pb-1 scrollbar-hide">
          {pendingFiles.map((pf, index) => (
            <div key={index} className="relative group shrink-0">
              {pf.type === 'image' && pf.preview ? (
                <div className="w-16 h-16 rounded-xl overflow-hidden border border-white/10 shadow-sm">
                  <img src={pf.preview} alt="" className="w-full h-full object-cover" />
                </div>
              ) : (
                <div className="w-16 h-16 rounded-xl border border-white/10 bg-white/5 flex flex-col items-center justify-center p-1 shadow-sm">
                  <FileText className="w-5 h-5 text-gray-400 mb-0.5" />
                  <span className="text-[8px] text-gray-500 truncate max-w-full font-mono">{pf.file.name.split('.').pop()?.toUpperCase()}</span>
                </div>
              )}
              <button
                onClick={() => removePendingFile(index)}
                className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full bg-gray-900 border border-white/10 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity shadow-lg"
              >
                <X className="w-3 h-3" />
              </button>
            </div>
          ))}
        </div>
      )}

      {isRecording ? (
        <VoiceRecorder onSend={handleVoiceSend} onCancel={() => setIsRecording(false)} />
      ) : (
        <div className="flex items-end gap-2 max-w-5xl mx-auto">
          {/* Attachment button */}
          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={isUploading}
            className="p-2.5 rounded-xl text-gray-500 hover:text-indigo-400 hover:bg-white/5 transition-all shrink-0 disabled:opacity-30"
            title="Đính kèm tệp"
          >
            {isUploading ? (
              <Loader2 className="w-5 h-5 animate-spin" />
            ) : (
              <Paperclip className="w-5 h-5" />
            )}
          </button>
          <input
            ref={fileInputRef}
            type="file"
            multiple
            accept="image/*,.pdf,.doc,.docx,.xls,.xlsx,.zip,.rar,.txt"
            className="hidden"
            onChange={handleFileSelect}
          />

          {/* Text input container */}
          <div className="flex-1 relative bg-white/5 border border-white/5 rounded-2xl transition-all focus-within:border-indigo-500/30">
            <textarea
              ref={inputRef}
              value={content}
              onChange={handleInputChange}
              onKeyDown={handleKeyDown}
              onPaste={handlePaste}
              placeholder={editingMessage ? "Chỉnh sửa tin nhắn..." : "Nhập tin nhắn..."}
              rows={1}
              className="w-full px-4 py-3 bg-transparent text-[14px] text-white placeholder-gray-600 resize-none outline-none overflow-y-auto scrollbar-hide"
              style={{ maxHeight: '150px' }}
            />
            
            {/* Action buttons inside input */}
            <div className="absolute right-2 bottom-2 flex items-center gap-1">
              <div className="relative" ref={pickerRef}>
                <div className="flex items-center gap-0.5">
                  <button 
                    onClick={() => {
                      setShowStickerPicker(!showStickerPicker);
                      setShowEmojiPicker(false);
                    }}
                    className={`p-1.5 rounded-lg transition-all ${showStickerPicker ? 'text-indigo-400 bg-indigo-400/10' : 'text-gray-500 hover:text-indigo-400 hover:bg-white/5'}`}
                    title="Nhãn dán"
                  >
                    <Sticker className="w-5 h-5" />
                  </button>
                  <button 
                    onClick={() => {
                      setShowEmojiPicker(!showEmojiPicker);
                      setShowStickerPicker(false);
                    }}
                    className={`p-1.5 rounded-lg transition-all ${showEmojiPicker ? 'text-amber-400 bg-amber-400/10' : 'text-gray-500 hover:text-amber-400 hover:bg-white/5'}`}
                    title="Emoji"
                  >
                    <Smile className="w-5 h-5" />
                  </button>
                </div>

                {showEmojiPicker && (
                  <div className="absolute bottom-full right-0 mb-4 z-9999 text-left">
                     <EmojiPicker 
                      onEmojiClick={onEmojiClick} 
                      theme={'dark' as any}
                      lazyLoadEmojis={true}
                      width={320}
                      height={400}
                      previewConfig={{ showPreview: false }}
                    />
                  </div>
                )}

                {showStickerPicker && (
                  <div className="absolute bottom-full right-0 mb-4 z-9999 text-left">
                    <StickerPicker 
                      onSelect={handleStickerSelect}
                      onClose={() => setShowStickerPicker(false)}
                    />
                  </div>
                )}
              </div>
              
              <button 
                onClick={() => setIsRecording(true)}
                className="p-1.5 rounded-lg text-gray-500 hover:text-indigo-400 hover:bg-white/5 transition-all mr-1"
                title="Ghi âm"
              >
                <Mic className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Send button */}
          <button
            onClick={handleSendOrLike}
            disabled={isUploading}
            className={`p-3 rounded-2xl transition-all shrink-0 shadow-lg active:scale-95 ${isInputEmpty ? 'text-indigo-400 hover:bg-white/5' : 'text-white'}`}
            style={{
              background: !isInputEmpty && !isUploading
                ? 'var(--accent-gradient)'
                : 'transparent',
            }}
            title={isInputEmpty ? "Gửi Like" : "Gửi tin nhắn"}
          >
            {isInputEmpty ? (
              <ThumbsUp className="w-6 h-6 animate-in zoom-in spin-in-12 duration-300" />
            ) : (
              <Send className="w-5 h-5 animate-in zoom-in" />
            )}
          </button>
        </div>
      )}
    </div>
  );
}
