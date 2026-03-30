'use client';

import { useEffect, useRef, useState, use } from 'react';
import { useAuthStore } from '@/stores/authStore';
import { useChatStore } from '@/stores/chatStore';
import { getSocket } from '@/lib/socket';
import api from '@/lib/axios';
import { ChatHeader } from '@/components/chat/ChatHeader';
import { MessageBubble } from '@/components/chat/MessageBubble';
import { MessageInput } from '@/components/chat/MessageInput';
import { TypingIndicator } from '@/components/chat/TypingIndicator';
import { Loader2, Ban, Pin } from 'lucide-react';
import { MessagesResponse } from '@/types';

export default function ChatRoomPage({ params }: { params: Promise<{ conversationId: string }> }) {
  const { conversationId } = use(params);
  const { user } = useAuthStore();
  const { messages, setMessages, prependMessages, setActiveConversation, conversations } = useChatStore();
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(false);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [blockStatus, setBlockStatus] = useState<{ blocked: boolean; blockedBy: string | null }>({ blocked: false, blockedBy: null });
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const messagesContainerRef = useRef<HTMLDivElement>(null);
  const isInitialLoad = useRef(true);

  const currentMessages = messages[conversationId] || [];
  const currentConversation = conversations.find(c => c._id === conversationId);

  // Set active conversation & join room
  useEffect(() => {
    setActiveConversation(conversationId);
    useChatStore.getState().resetUnreadCount(conversationId);
    
    const socket = getSocket();
    if (socket) {
      socket.emit('join_conversation', conversationId);
      socket.emit('read_message', { conversationId });
    }

    return () => {
      setActiveConversation(null);
    };
  }, [conversationId, setActiveConversation]);

  // Fetch initial messages
  useEffect(() => {
    const fetchMessages = async () => {
      setIsLoading(true);
      try {
        const res = await api.get<{ data: MessagesResponse }>('/messages', {
          params: { conversationId, limit: 30 },
        });
        const data = res.data.data;
        // Messages come newest first, reverse for display
        setMessages(conversationId, [...data.messages].reverse());
        setHasMore(data.hasMore);
        setNextCursor(data.nextCursor);
        isInitialLoad.current = true;
      } catch (error) {
        console.error('Failed to fetch messages:', error);
      } finally {
        setIsLoading(false);
      }
    };
    fetchMessages();
  }, [conversationId, setMessages]);

  // Auto scroll to bottom on new messages
  useEffect(() => {
    if (!isLoading && messagesEndRef.current) {
      setTimeout(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: isInitialLoad.current ? 'instant' : 'smooth' });
        isInitialLoad.current = false;
      }, 50);
    }
  }, [conversationId, currentMessages.length, isLoading]);

  // Load more messages (scroll up)
  const loadMoreMessages = async () => {
    if (isLoadingMore || !hasMore || !nextCursor) return;

    setIsLoadingMore(true);
    const container = messagesContainerRef.current;
    const prevScrollHeight = container?.scrollHeight || 0;

    try {
      const res = await api.get<{ data: MessagesResponse }>('/messages', {
        params: { conversationId, before: nextCursor, limit: 20 },
      });
      const data = res.data.data;
      prependMessages(conversationId, [...data.messages].reverse());
      setHasMore(data.hasMore);
      setNextCursor(data.nextCursor);

      // Maintain scroll position after prepending
      requestAnimationFrame(() => {
        if (container) {
          container.scrollTop = container.scrollHeight - prevScrollHeight;
        }
      });
    } catch (error) {
      console.error('Failed to load more messages:', error);
    } finally {
      setIsLoadingMore(false);
    }
  };

  // Handle scroll
  const handleScroll = () => {
    const container = messagesContainerRef.current;
    if (container && container.scrollTop < 50) {
      loadMoreMessages();
    }
  };

  if (isLoading) {
    return (
      <div className="flex-1 flex items-center justify-center bg-(--bg-primary)">
        <Loader2 className="w-8 h-8 text-indigo-500 animate-spin" />
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col bg-(--bg-primary) min-h-0 overflow-hidden">
      <ChatHeader conversationId={conversationId} onBlockStatusChange={setBlockStatus} />

      {/* Messages */}
      <div
        ref={messagesContainerRef}
        onScroll={handleScroll}
        className="flex-1 overflow-y-auto px-4 py-4 space-y-1"
      >
        {isLoadingMore && (
          <div className="flex justify-center py-2">
            <Loader2 className="w-5 h-5 text-gray-500 animate-spin" />
          </div>
        )}

        {currentMessages.map((message, index) => {
          const senderId = typeof message.senderId === 'object' ? message.senderId._id : message.senderId;
          const isMine = senderId === user?._id;
          const showAvatar =
            !isMine &&
            (index === 0 ||
              (() => {
                const prevMsg = currentMessages[index - 1];
                const prevSender = prevMsg?.senderId;
                const prevSenderId = prevSender && typeof prevSender === 'object'
                  ? (prevSender as { _id: string })._id
                  : prevSender;
                return prevSenderId !== senderId;
              })());

          const isGroup = currentConversation?.type === 'group';
          const otherMember = !isGroup
            ? currentConversation?.members.find((m) => {
                const mId = typeof m.userId === 'object' ? m.userId._id : m.userId;
                return mId !== user?._id;
              })
            : null;
          const otherUserAvatar = typeof otherMember?.userId === 'object' ? otherMember.userId.avatar : null;

          const handleReact = (emoji: string) => {
            const socket = getSocket();
            if (!socket) return;
            
            const hasReacted = message.reactions?.find(r => r.userId === user?._id && r.emoji === emoji);
            if (hasReacted) {
              socket.emit('remove_reaction', { messageId: message._id, conversationId, emoji });
            } else {
              socket.emit('add_reaction', { messageId: message._id, conversationId, emoji });
            }
          };

          const handleReply = () => {
             useChatStore.getState().setReplyingTo(message);
          };

          const handleEdit = () => {
             useChatStore.getState().setEditingMessage(message);
          };

          const handleDelete = () => {
            if (window.confirm('Bạn có chắc chắn muốn xóa tin nhắn này?')) {
              const socket = getSocket();
              socket?.emit('delete_message', { messageId: message._id, conversationId });
            }
          };

          const handlePin = () => {
            const socket = getSocket();
            const isPinned = currentConversation?.pinnedMessages?.includes(message._id);
            if (isPinned) {
              socket?.emit('unpin_message', { messageId: message._id, conversationId });
            } else {
              socket?.emit('pin_message', { messageId: message._id, conversationId });
            }
          };

          return (
            <div key={message._id || message.tempId} className="relative">
              {currentConversation?.pinnedMessages?.includes(message._id) && (
                <div className="flex items-center gap-1.5 ml-12 mb-1 animate-in fade-in slide-in-from-left-2">
                   <Pin className="w-3 h-3 text-indigo-400 fill-indigo-400/20" />
                   <span className="text-[10px] text-gray-500 font-medium">Đã ghim</span>
                </div>
              )}
              <MessageBubble
                message={message}
                isMine={isMine}
                showAvatar={showAvatar}
                showSenderName={isGroup && showAvatar}
                otherUserAvatar={otherUserAvatar}
                onReact={handleReact}
                onReply={handleReply}
                onEdit={handleEdit}
                onDelete={handleDelete}
                onPin={handlePin}
              />
            </div>
          );
        })}

        <TypingIndicator conversationId={conversationId} />
        <div ref={messagesEndRef} />
      </div>

      {/* Block banner or message input */}
      {blockStatus.blocked ? (
        <div className="px-4 py-4 border-t border-white/5 glass">
          <div className="flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-red-500/10 border border-red-500/20">
            <Ban className="w-4 h-4 text-red-400" />
            <p className="text-sm text-red-400">
              {blockStatus.blockedBy === user?._id
                ? 'Bạn đã chặn người này. Bỏ chặn để gửi tin nhắn.'
                : 'Bạn đã bị chặn nên không thể gửi tin nhắn.'}
            </p>
          </div>
        </div>
      ) : (
        <MessageInput conversationId={conversationId} />
      )}
    </div>
  );
}
