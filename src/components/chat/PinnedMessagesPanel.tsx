'use client';

import { Message, Conversation } from '@/types';
import { X, Pin, MessageSquare, Trash2 } from 'lucide-react';
import { formatMessageTime } from '@/lib/utils';
import { getSocket } from '@/lib/socket';
import { useChatStore } from '@/stores/chatStore';

interface PinnedMessagesPanelProps {
  conversation: Conversation;
  onClose: () => void;
}

export function PinnedMessagesPanel({ conversation, onClose }: PinnedMessagesPanelProps) {
  const pinnedMessages = (conversation.pinnedMessages || []) as Message[];

  const handleUnpin = (messageId: string) => {
    const socket = getSocket();
    socket?.emit('unpin_message', { messageId, conversationId: conversation._id });
  };

  return (
    <div className="absolute top-0 right-0 w-80 h-full bg-gray-900 border-l border-white/10 z-50 flex flex-col animate-in slide-in-from-right shadow-2xl">
      <div className="flex items-center justify-between px-4 py-4 border-b border-white/5">
        <div className="flex items-center gap-2">
          <Pin className="w-4 h-4 text-indigo-400" />
          <h3 className="text-sm font-semibold text-white">Tin nhắn đã ghim</h3>
        </div>
        <button onClick={onClose} className="p-1 hover:bg-white/5 rounded-full text-gray-500 hover:text-white transition-colors">
          <X className="w-5 h-5" />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {pinnedMessages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center p-6">
            <div className="w-12 h-12 rounded-full bg-white/5 flex items-center justify-center mb-3">
              <Pin className="w-6 h-6 text-gray-600" />
            </div>
            <p className="text-sm text-gray-400 font-medium">Chưa có tin nhắn nào được ghim</p>
            <p className="text-xs text-gray-500 mt-1">Ghim những tin nhắn quan trọng để mọi người dễ dàng tìm thấy.</p>
          </div>
        ) : (
          pinnedMessages.map((msgOrId) => {
            const msg = typeof msgOrId === 'string' 
              ? (useChatStore.getState().messages[conversation._id]?.find((m: Message) => m._id === msgOrId) || { _id: msgOrId } as unknown as Message)
              : msgOrId;
            const sender = typeof msg.senderId === 'object' ? msg.senderId : null;
            return (
              <div key={msg._id} className="group relative bg-white/5 rounded-xl p-3 border border-white/5 hover:border-white/10 transition-all">
                <div className="flex items-start gap-3 mb-2">
                  <div className="w-7 h-7 rounded-full overflow-hidden shrink-0">
                    {sender?.avatar ? (
                      <img src={sender.avatar} alt="" className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full bg-indigo-500/20 flex items-center justify-center text-indigo-400 text-[10px] font-bold">
                        {sender?.username?.charAt(0).toUpperCase()}
                      </div>
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-[11px] font-bold text-indigo-400 truncate">
                      {sender?.displayName || sender?.username || 'Người dùng'}
                    </p>
            <p className="text-[10px] text-gray-500 uppercase font-medium">
              {msg.createdAt ? formatMessageTime(msg.createdAt) : '...'}
            </p>
          </div>
                  <button 
                    onClick={() => handleUnpin(msg._id)}
                    className="opacity-0 group-hover:opacity-100 p-1.5 hover:bg-red-500/10 rounded-lg text-gray-500 hover:text-red-400 transition-all"
                    title="Bỏ ghim"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
                
                <div className="text-xs text-gray-200 line-clamp-3 wrap-break-word bg-black/20 rounded-lg p-2 border border-white/5">
                  {msg.messageType === 'image' ? '📷 Hình ảnh' : 
                   msg.messageType === 'sticker' ? '✨ Nhãn dán' :
                   msg.messageType === 'file' ? '📎 Tệp đính kèm' : 
                   msg.messageType === 'voice' ? '🎤 Tin nhắn thoại' :
                   msg.content}
                </div>

                <div className="mt-2 flex justify-end">
                   <button 
                     onClick={() => {
                        useChatStore.getState().setScrollToMessageId(msg._id);
                        onClose();
                     }}
                     className="text-[10px] text-indigo-400 hover:underline flex items-center gap-1"
                   >
                     <MessageSquare className="w-3 h-3" /> Xem trong cuộc trò chuyện
                   </button>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
