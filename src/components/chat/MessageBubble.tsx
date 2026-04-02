import { useState } from 'react';
import { Message, Reaction } from '@/types';
import { formatMessageTime } from '@/lib/utils';
import { Check, CheckCheck, Loader2, Download, FileText, Smile, Reply, MoreVertical, Edit2, Trash2, Pin } from 'lucide-react';
import { ImagePreview } from './ImagePreview';
import { useAuthStore } from '@/stores/authStore';

interface MessageBubbleProps {
  message: Message;
  isMine: boolean;
  showAvatar: boolean;
  showSenderName?: boolean;
  otherUserAvatar?: string | null;
  onReact?: (emoji: string) => void;
  onReply?: () => void;
  onEdit?: () => void;
  onDelete?: () => void;
  onPin?: () => void;
}

// Generate a consistent color for user based on their ID
function getUserColor(userId: string): string {
  const colors = [
    'text-blue-400', 'text-emerald-400', 'text-amber-400', 'text-pink-400',
    'text-cyan-400', 'text-orange-400', 'text-violet-400', 'text-rose-400',
  ];
  let hash = 0;
  for (let i = 0; i < userId.length; i++) {
    hash = userId.charCodeAt(i) + ((hash << 5) - hash);
  }
  return colors[Math.abs(hash) % colors.length];
}

const COMMON_REACTIONS = ['👍', '❤️', '😂', '😮', '😢', '🔥'];

export function MessageBubble({ 
  message, 
  isMine, 
  showAvatar, 
  showSenderName, 
  otherUserAvatar,
  onReact,
  onReply,
  onEdit,
  onDelete,
  onPin
}: MessageBubbleProps) {
  const { user: currentUser } = useAuthStore();
  const sender = typeof message.senderId === 'object' ? message.senderId : null;
  const [showImagePreview, setShowImagePreview] = useState(false);
  const [showReactionPicker, setShowReactionPicker] = useState(false);
  const [showMoreActions, setShowMoreActions] = useState(false);

  const getStatusIcon = () => {
    if (!isMine) return null;

    const status = message.status;

    if (status === 'sending') {
      return <Loader2 className="w-3 h-3 text-gray-400 animate-spin" />;
    }

    if (message.readBy && message.readBy.length > 0) {
      const readAvatar = typeof message.readBy[0].userId === 'object' 
        ? (message.readBy[0].userId as { avatar?: string }).avatar 
        : (otherUserAvatar || null);

      if (readAvatar) {
        return <img src={readAvatar} alt="read" className="w-[14px] h-[14px] rounded-full object-cover ml-1 mt-0.5 opacity-80" />;
      }
      return <div className="w-[14px] h-[14px] rounded-full bg-gray-500/50 ml-1 mt-0.5 flex items-center justify-center text-[8px] text-white">✓</div>;
    }

    if (message.deliveredTo && message.deliveredTo.length > 0) {
      return <CheckCheck className="w-[14px] h-[14px] text-gray-500 ml-1" />;
    }

    return <Check className="w-[14px] h-[14px] text-gray-500 ml-1" />;
  };

  const formatSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const reactionGroups = message.reactions?.reduce((acc: Record<string, string[]>, curr: Reaction) => {
    if (!acc[curr.emoji]) acc[curr.emoji] = [];
    acc[curr.emoji].push(curr.userId);
    return acc;
  }, {});

  const renderReplyContext = () => {
    if (!message.replyTo) return null;
    const repliedMsg = message.replyTo;
    const repliedSender = typeof repliedMsg.senderId === 'object' ? repliedMsg.senderId : null;
    const repliedSenderId = typeof repliedMsg.senderId === 'object' ? (repliedMsg.senderId as any)._id : repliedMsg.senderId;
    const isRepliedMine = repliedSenderId === currentUser?._id;
    const senderName = repliedSender ? (repliedSender.displayName || repliedSender.username) : (isRepliedMine ? 'Bạn' : 'Người dùng');

    return (
      <div className={`mb-1 p-2 rounded-lg bg-(--bg-tertiary) border-l-2 border-indigo-500 text-[11px] max-w-full overflow-hidden ${isMine ? 'mr-1' : 'ml-1'}`}>
        <p className="font-semibold text-indigo-400 mb-0.5">{senderName}</p>
        <p className="text-(--text-muted) truncate">
          {repliedMsg.messageType === 'image' ? '📷 Hình ảnh' : 
           repliedMsg.messageType === 'file' ? '📎 Tệp đính kèm' : 
           repliedMsg.content}
        </p>
      </div>
    );
  };

  const renderLinkPreview = () => {
    if (!message.linkPreview) return null;
    const lp = message.linkPreview;
    return (
      <a 
        href={lp.url} 
        target="_blank" 
        rel="noopener noreferrer" 
        className="mt-2 block rounded-xl overflow-hidden bg-(--bg-tertiary) border border-(--border-color) hover:bg-(--bg-hover) transition-all shrink-0 max-w-[300px]"
      >
        {lp.image && (
          <div className="h-32 w-full overflow-hidden border-b border-(--border-color)">
            <img src={lp.image} alt={lp.title} className="w-full h-full object-cover" />
          </div>
        )}
        <div className="p-2">
          <p className="text-[10px] text-indigo-500 font-bold uppercase tracking-wider mb-0.5 truncate">{lp.siteName || new URL(lp.url).hostname}</p>
          <p className="text-xs font-semibold text-(--text-primary) mb-1 line-clamp-1">{lp.title}</p>
          {lp.description && <p className="text-[10px] text-(--text-muted) line-clamp-2">{lp.description}</p>}
        </div>
      </a>
    );
  };

  const renderImage = () => {
    const imageUrl = message.attachments?.[0]?.url || message.content;
    return (
      <>
        <div
          className={`relative cursor-pointer rounded-2xl overflow-hidden max-w-[280px] shadow-lg ${message.status === 'sending' ? 'opacity-70' : 'hover:brightness-95 transition-all'}`}
          onClick={() => setShowImagePreview(true)}
        >
          <img src={imageUrl} alt="Shared image" className="w-full max-h-[350px] object-cover" loading="lazy" />
          {message.status === 'sending' && (
            <div className="absolute inset-0 flex items-center justify-center bg-black/20">
              <Loader2 className="w-8 h-8 text-white animate-spin" />
            </div>
          )}
        </div>
        {message.content && message.content !== imageUrl && (
          <div className={`px-4 py-2.5 text-sm leading-relaxed mt-1 rounded-2xl shadow-sm ${isMine ? 'message-sent text-white' : 'message-received text-(--text-primary)'}`}>
            {message.content}
          </div>
        )}
        {showImagePreview && <ImagePreview imageUrl={imageUrl} onClose={() => setShowImagePreview(false)} />}
      </>
    );
  };

  const renderFile = () => {
    const attachment = message.attachments?.[0];
    if (!attachment) return null;
    return (
      <div className={`px-4 py-3 rounded-2xl shadow-sm ${isMine ? 'message-sent' : 'message-received'} ${message.status === 'sending' ? 'opacity-70' : ''}`}>
        <a href={attachment.url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-3 group">
          <div className="w-10 h-10 rounded-lg bg-white/10 flex items-center justify-center shrink-0">
            <FileText className="w-5 h-5 text-indigo-300" />
          </div>
          <div className="flex-1 min-w-0">
            <p className={`text-sm font-medium truncate ${isMine ? 'text-white' : 'text-(--text-primary)'}`}>{attachment.fileName}</p>
            <p className="text-[10px] text-(--text-muted) font-mono uppercase">{formatSize(attachment.fileSize)}</p>
          </div>
          <Download className="w-4 h-4 text-(--text-muted) group-hover:text-white transition-colors shrink-0" />
        </a>
        {message.content && <p className={`text-sm mt-2 pt-2 border-t border-white/10 ${isMine ? 'text-white/80' : 'text-(--text-secondary)'}`}>{message.content}</p>}
      </div>
    );
  };

  const renderVoice = () => {
    const attachment = message.attachments?.[0];
    if (!attachment) return null;
    return (
      <div className={`px-4 py-2.5 rounded-2xl shadow-sm flex items-center gap-3 min-w-[200px] ${isMine ? 'message-sent' : 'message-received'}`}>
        <div className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center">
          <div className="w-2 h-2 rounded-full bg-indigo-400 animate-pulse" />
        </div>
        <audio src={attachment.url} controls className={`h-8 max-w-full ${!isMine ? 'dark:filter dark:invert' : 'filter invert'}`} />
      </div>
    );
  };

  const renderSticker = () => (
    <div className="relative group/sticker">
      <img src={message.content} alt="Sticker" className="w-28 h-28 sm:w-36 sm:h-36 object-contain" loading="lazy" />
      {message.status === 'sending' && (
        <div className="absolute inset-0 flex items-center justify-center bg-(--bg-tertiary)/50 rounded-2xl">
          <Loader2 className="w-6 h-6 text-indigo-500 animate-spin" />
        </div>
      )}
    </div>
  );

  if (message.isDeleted) {
    return (
      <div className={`flex ${isMine ? 'justify-end' : 'justify-start'} px-2 mb-1`}>
        <div className={`px-4 py-2 rounded-2xl bg-(--bg-tertiary) border border-(--border-color) text-(--text-muted) text-sm italic max-w-[70%]`}>
          Tin nhắn đã bị xóa
        </div>
      </div>
    );
  }

  return (
    <div className={`group flex ${isMine ? 'justify-end' : 'justify-start'} px-4 py-0.5 animate-fade-in relative`}>
      <div className={`flex items-end gap-2 max-w-[75%] ${isMine ? 'flex-row-reverse' : ''}`}>
        {!isMine && (
          <div className="shrink-0 w-8 h-8 mb-1">
            {showAvatar && sender ? (
              sender.avatar ? (
                <img src={sender.avatar} alt={sender.displayName || sender.username} className="w-8 h-8 rounded-full object-cover border border-(--border-color) ring-2 ring-indigo-500/10 shadow-sm" />
              ) : (
                <div className="w-8 h-8 rounded-full bg-linear-to-br from-indigo-500 to-purple-500 flex items-center justify-center text-white font-bold text-xs shadow-md">
                  {(sender.displayName || sender.username)?.charAt(0).toUpperCase()}
                </div>
              )
            ) : <div className="w-8 h-8" />}
          </div>
        )}

        <div className={`relative flex flex-col ${isMine ? 'items-end' : 'items-start'}`}>
          {!message.isDeleted && (
            <div className={`absolute top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-all duration-200 flex items-center bg-(--bg-secondary) border border-(--border-color) px-1 py-0.5 z-40 shadow-xl ${isMine ? 'right-full mr-2' : 'left-full ml-2'}`}>
              <div className="relative">
                <button onClick={(e) => { e.stopPropagation(); setShowReactionPicker(!showReactionPicker); }} className="p-1.5 hover:bg-(--bg-hover) rounded-full transition-colors text-(--text-muted) hover:text-amber-500">
                  <Smile className="w-4 h-4" />
                </button>
                {showReactionPicker && (
                  <div className={`absolute bottom-full mb-3 ${isMine ? 'left-0' : 'right-0'} flex items-center gap-1 bg-(--bg-primary) border border-(--border-color) p-1.5 rounded-full shadow-2xl z-50 animate-in fade-in zoom-in-95`}>
                    {COMMON_REACTIONS.map(emoji => (
                      <button key={emoji} onClick={(e) => { e.stopPropagation(); onReact?.(emoji); setShowReactionPicker(false); }} className="hover:scale-125 transition-transform p-1 text-lg leading-none">
                        {emoji}
                      </button>
                    ))}
                  </div>
                )}
              </div>
              <button onClick={(e) => { e.stopPropagation(); onReply?.(); }} className="p-1.5 hover:bg-(--bg-hover) rounded-full transition-colors text-(--text-muted) hover:text-(--text-primary)">
                <Reply className="w-4 h-4" />
              </button>
              <div className="relative">
                <button onClick={(e) => { e.stopPropagation(); setShowMoreActions(!showMoreActions); }} className="p-1.5 hover:bg-(--bg-hover) rounded-full transition-colors text-(--text-muted) hover:text-(--text-primary)">
                  <MoreVertical className="w-4 h-4" />
                </button>
                {showMoreActions && (
                  <div className={`absolute bottom-full mb-2 ${isMine ? 'right-0' : 'left-0'} min-w-[160px] bg-(--bg-secondary) border border-(--border-color) rounded-xl shadow-2xl p-1 z-50 overflow-hidden animate-in fade-in zoom-in-95`}>
                    <button onClick={(e) => { e.stopPropagation(); onPin?.(); setShowMoreActions(false); }} className="w-full flex items-center gap-2 px-3 py-2.5 text-xs text-(--text-secondary) hover:bg-(--bg-hover) transition-colors text-left rounded-lg">
                      <Pin className="w-3.5 h-3.5" /> Ghim tin nhắn
                    </button>
                    {isMine && (
                      <>
                        <button onClick={(e) => { e.stopPropagation(); onEdit?.(); setShowMoreActions(false); }} className="w-full flex items-center gap-2 px-3 py-2.5 text-xs text-(--text-secondary) hover:bg-(--bg-hover) transition-colors text-left rounded-lg">
                          <Edit2 className="w-3.5 h-3.5" /> Chỉnh sửa
                        </button>
                        <div className="h-px bg-(--border-color) my-1" />
                        <button onClick={(e) => { e.stopPropagation(); onDelete?.(); setShowMoreActions(false); }} className="w-full flex items-center gap-2 px-3 py-2.5 text-xs text-red-500 hover:bg-red-500/10 transition-colors text-left rounded-lg">
                          <Trash2 className="w-3.5 h-3.5" /> Xóa
                        </button>
                      </>
                    )}
                  </div>
                )}
              </div>
            </div>
          )}

          <div className="relative">
            {showSenderName && !isMine && sender && (
              <p className={`text-[11px] mb-1 ml-1 font-bold ${getUserColor(sender._id)} drop-shadow-sm`}>
                {sender.displayName || sender.username}
              </p>
            )}
            <div className="relative">
              {renderReplyContext()}
              {message.messageType === 'sticker' ? renderSticker() : 
               message.messageType === 'image' ? renderImage() : 
               message.messageType === 'file' ? renderFile() : 
               message.messageType === 'voice' ? renderVoice() : (
                <div className={`group/bubble px-4 py-2.5 text-sm leading-relaxed rounded-2xl shadow-sm relative ${isMine ? 'message-sent text-white' : 'message-received text-(--text-primary)'} ${message.status === 'sending' ? 'opacity-70' : ''}`}>
                  <div className="flex flex-col gap-1">
                    <span>{message.content}</span>
                    {message.isEdited && <span className="text-[9px] opacity-60 self-end">Đã chỉnh sửa</span>}
                  </div>
                  {renderLinkPreview()}
                </div>
              )}
              {message.reactions && message.reactions.length > 0 && (
                <div className={`absolute -bottom-2.5 flex items-center gap-0.5 bg-(--bg-tertiary) border border-(--border-color) rounded-full px-1.5 py-0.5 shadow-md z-10 ${isMine ? 'right-2' : 'left-2'}`}>
                  {Object.entries(reactionGroups || {}).map(([emoji, userIds]) => (
                    <div key={emoji} className="flex items-center gap-0.5 group/react cursor-pointer hover:scale-110 transition-transform">
                      <span className="text-[13px] leading-none">{emoji}</span>
                      {userIds.length > 1 && <span className="text-[9px] text-(--text-muted) font-bold">{userIds.length}</span>}
                      <div className="absolute bottom-full mb-2 left-1/2 -translate-x-1/2 px-2 py-1 bg-black text-white text-[10px] rounded opacity-0 group-hover/react:opacity-100 pointer-events-none whitespace-nowrap z-50">
                        {userIds.length} người đã bày tỏ cảm xúc
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
          <div className={`flex items-center gap-1 mt-1 ${isMine ? 'justify-end' : ''} h-4`}>
            <span className="text-[10px] text-gray-500 font-medium">{formatMessageTime(message.createdAt)}</span>
            {getStatusIcon()}
          </div>
        </div>
      </div>
    </div>
  );
}
