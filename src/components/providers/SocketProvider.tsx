'use client';

import { useEffect, useCallback } from 'react';
import { useAuthStore } from '@/stores/authStore';
import { useChatStore } from '@/stores/chatStore';
import { connectSocket, disconnectSocket, getSocket } from '@/lib/socket';
import { Message, Conversation } from '@/types';
import api from '@/lib/axios';
import toast from 'react-hot-toast';

export function SocketProvider({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, accessToken } = useAuthStore();
  // Use useChatStore.getState() inside callbacks instead of destructuring 
  // to avoid re-rendering the whole Provider on state changes

  const setupSocketListeners = useCallback(() => {
    const socket = getSocket();
    if (!socket) return;

    // Online users
    socket.on('online_users', (users: string[]) => {
      useChatStore.getState().setOnlineUsers(users);
    });

    socket.on('user_online', ({ userId }: { userId: string }) => {
      useChatStore.getState().addOnlineUser(userId);
    });

    socket.on('user_offline', ({ userId }: { userId: string }) => {
      useChatStore.getState().removeOnlineUser(userId);
    });

    // Messages
    socket.on('receive_message', async (message: Message) => {
      const store = useChatStore.getState();
      const auth = useAuthStore.getState();

      // If conversation doesn't exist in store, fetch it first
      const existingConv = store.conversations.find((c) => c._id === message.conversationId);
      if (!existingConv) {
        try {
          const res = await api.get(`/conversations/${message.conversationId}`);
          store.updateConversation(res.data.data);
        } catch (error) {
          console.error('Failed to fetch new conversation:', error);
        }
      }

      store.addMessage(message.conversationId, { ...message, status: 'delivered' });

      // Unread logic
      const senderStrId = typeof message.senderId === 'object' ? message.senderId._id : message.senderId;
      const isMine = senderStrId === auth.user?._id;

      if (!isMine) {
        if (store.activeConversationId !== message.conversationId) {
          store.incrementUnreadCount(message.conversationId);
          
          socket.emit('mark_delivered', {
            messageId: message._id,
            conversationId: message.conversationId,
          });
        } else {
          // If viewing the chat, immediately mark as read
          socket.emit('read_message', { conversationId: message.conversationId });
        }
      }
    });

    socket.on('message_sent', ({ tempId, message }: { tempId: string; message: Message }) => {
      useChatStore.getState().updateMessageStatus(message.conversationId, tempId, message);
    });

    socket.on('message_read', ({ conversationId, userId, readAt }: { conversationId: string, userId: string, readAt: string }) => {
      useChatStore.getState().markMessagesAsRead(conversationId, userId, readAt);
    });

    socket.on('message_delivered', ({ conversationId, messageId, userId, deliveredAt }: { conversationId: string, messageId: string, userId: string, deliveredAt: string }) => {
      useChatStore.getState().markMessagesAsDelivered(conversationId, messageId, userId, deliveredAt);
    });

    // Typing
    socket.on('typing', ({ conversationId, userId }: { conversationId: string; userId: string }) => {
      useChatStore.getState().addTypingUser(conversationId, userId);
    });

    socket.on('stop_typing', ({ conversationId, userId }: { conversationId: string; userId: string }) => {
      useChatStore.getState().removeTypingUser(conversationId, userId);
    });

    // Notifications
    socket.on('notification_new', (notification: { content: string; conversationId?: string }) => {
      // Show toast notification
      toast(notification.content, {
        icon: '🔔',
        duration: 4000,
        style: {
          background: '#1a1a24',
          color: '#f0f0f5',
          border: '1px solid #2a2a3a',
          maxWidth: '350px',
          fontSize: '13px',
        },
      });
    });

    // Conversation updates (group: add/remove member, rename)
    socket.on('conversation_updated', (conversation: Conversation) => {
      useChatStore.getState().updateConversation(conversation);
    });

    // Block event - message was rejected due to block
    socket.on('blocked', (data: { tempId: string; conversationId: string; message: string }) => {
      // Remove the optimistic message
      const store = useChatStore.getState();
      const msgs = store.messages[data.conversationId];
      if (msgs) {
        store.setMessages(data.conversationId, msgs.filter((m) => m.tempId !== data.tempId));
      }

      toast.error(data.message, {
        icon: '🚫',
        duration: 5000,
        style: {
          background: '#1a1a24',
          color: '#f0f0f5',
          border: '1px solid #3a2020',
          maxWidth: '350px',
          fontSize: '13px',
        },
      });
    });

    // Reactions
    socket.on('reaction_updated', ({ messageId, conversationId, reactions }: { messageId: string, conversationId: string, reactions: any[] }) => {
      useChatStore.getState().updateMessageReactions(conversationId, messageId, reactions);
    });

    // Edit/Delete
    socket.on('message_updated', ({ messageId, conversationId, content, isEdited, updatedAt }: { messageId: string, conversationId: string, content: string, isEdited: boolean, updatedAt: string }) => {
      useChatStore.getState().updateMessageContent(conversationId, messageId, content, isEdited, updatedAt);
    });

    socket.on('message_deleted', ({ messageId, conversationId }: { messageId: string, conversationId: string }) => {
      useChatStore.getState().deleteMessageInStore(conversationId, messageId);
    });
  }, []);

  useEffect(() => {
    if (isAuthenticated && accessToken) {
      connectSocket();
      setupSocketListeners();

      return () => {
        disconnectSocket();
      };
    }
  }, [isAuthenticated, accessToken, setupSocketListeners]);

  return <>{children}</>;
}
