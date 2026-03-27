import { create } from 'zustand';
import { Conversation, Message } from '@/types';

interface ChatState {
  conversations: Conversation[];
  activeConversationId: string | null;
  messages: Record<string, Message[]>; // conversationId -> messages
  onlineUsers: string[];
  typingUsers: Record<string, string[]>; // conversationId -> userId[]
  replyingTo: Message | null;
  editingMessage: Message | null;

  setConversations: (conversations: Conversation[]) => void;
  updateConversation: (conversation: Conversation) => void;
  setActiveConversation: (id: string | null) => void;

  setReplyingTo: (message: Message | null) => void;
  setEditingMessage: (message: Message | null) => void;

  setMessages: (conversationId: string, messages: Message[]) => void;
  addMessage: (conversationId: string, message: Message) => void;
  prependMessages: (conversationId: string, messages: Message[]) => void;
  updateMessageStatus: (conversationId: string, tempId: string, message: Message) => void;

  setOnlineUsers: (users: string[]) => void;
  addOnlineUser: (userId: string) => void;
  removeOnlineUser: (userId: string) => void;

  addTypingUser: (conversationId: string, userId: string) => void;
  removeTypingUser: (conversationId: string, userId: string) => void;

  unreadCounts: Record<string, number>;
  incrementUnreadCount: (id: string) => void;
  resetUnreadCount: (id: string) => void;
  markMessagesAsRead: (conversationId: string, userId: string, readAt: string) => void;
  markMessagesAsDelivered: (conversationId: string, messageId: string, userId: string, deliveredAt: string) => void;
  updateMessageReactions: (conversationId: string, messageId: string, reactions: any[]) => void;
  updateMessageContent: (conversationId: string, messageId: string, content: string, isEdited: boolean, updatedAt: string) => void;
  deleteMessageInStore: (conversationId: string, messageId: string) => void;
  updatePinnedMessages: (conversationId: string, pinnedMessages: string[]) => void;
}

export const useChatStore = create<ChatState>((set) => ({
  conversations: [],
  activeConversationId: null,
  messages: {},
  onlineUsers: [],
  typingUsers: {},
  replyingTo: null,
  editingMessage: null,

  setConversations: (conversations) => set(() => {
    // Deduplicate by _id
    const unique = conversations.filter((c, index, self) => 
      index === self.findIndex((t) => t._id === c._id)
    );
    return { conversations: unique };
  }),

  updateConversation: (updated) =>
    set((state) => {
      const index = state.conversations.findIndex((c) => c._id === updated._id);
      if (index === -1) {
        // New conversation - add to top
        return { conversations: [updated, ...state.conversations] };
      }
      // Update existing and move to top
      const newConversations = [...state.conversations];
      newConversations.splice(index, 1);
      return { conversations: [updated, ...newConversations] };
    }),

  setActiveConversation: (id) => set({ activeConversationId: id }),

  setReplyingTo: (message) => set({ replyingTo: message }),
  setEditingMessage: (message) => set({ editingMessage: message }),

  setMessages: (conversationId, messages) =>
    set((state) => {
      // Deduplicate messages by _id
      const uniqueMessages = messages.filter((m, index, self) => 
        !m._id || index === self.findIndex((t) => t._id === m._id)
      );
      return {
        messages: { ...state.messages, [conversationId]: uniqueMessages },
      };
    }),

  addMessage: (conversationId, message) =>
    set((state) => {
      const existing = state.messages[conversationId] || [];
      
      // Prevent duplicates by checking _id or tempId
      const isDuplicate = existing.some(m => 
        (message._id && m._id === message._id) || 
        (message.tempId && m.tempId === message.tempId)
      );
      
      if (isDuplicate) {
        // If it's a "duplicate" but has a real _id now (e.g. from receive_message while we have a temp one),
        // we might want to update it. But updateMessageStatus usually handles tempId -> _id.
        // For now, let's just return state to avoid duplicate keys in the list.
        return state;
      }

      const newConversations = [...state.conversations];
      const convIndex = newConversations.findIndex(c => c._id === conversationId);
      if (convIndex !== -1) {
        const conv = newConversations[convIndex];
        const updatedConv = {
          ...conv,
          lastMessage: {
            content: message.content || '',
            senderId: typeof message.senderId === 'object' ? message.senderId._id : message.senderId,
            messageType: message.messageType || 'text',
            createdAt: message.createdAt || new Date().toISOString()
          },
          updatedAt: message.createdAt || new Date().toISOString()
        };
        newConversations.splice(convIndex, 1);
        // Move to top
        newConversations.unshift(updatedConv);
      }

      return {
        messages: {
          ...state.messages,
          [conversationId]: [...existing, message],
        },
        conversations: newConversations,
      };
    }),

  prependMessages: (conversationId, newMessages) =>
    set((state) => {
      const existing = state.messages[conversationId] || [];
      // Combine and deduplicate
      const combined = [...newMessages, ...existing];
      const unique = combined.filter((m, index, self) => 
        !m._id || index === self.findIndex((t) => t._id === m._id)
      );
      
      return {
        messages: {
          ...state.messages,
          [conversationId]: unique,
        },
      };
    }),

  updateMessageStatus: (conversationId, tempId, message) =>
    set((state) => {
      const currentMessages = state.messages[conversationId] || [];
      const updatedMessages = currentMessages.map((m) =>
        m.tempId === tempId ? { ...message, status: 'sent' as const } : m
      );
      return {
        messages: {
          ...state.messages,
          [conversationId]: updatedMessages,
        },
      };
    }),

  setOnlineUsers: (users) => set({ onlineUsers: users }),

  addOnlineUser: (userId) =>
    set((state) => ({
      onlineUsers: state.onlineUsers.includes(userId)
        ? state.onlineUsers
        : [...state.onlineUsers, userId],
    })),

  removeOnlineUser: (userId) =>
    set((state) => ({
      onlineUsers: state.onlineUsers.filter((id) => id !== userId),
    })),

  addTypingUser: (conversationId, userId) =>
    set((state) => {
      const current = state.typingUsers[conversationId] || [];
      if (current.includes(userId)) return state;
      return {
        typingUsers: {
          ...state.typingUsers,
          [conversationId]: [...current, userId],
        },
      };
    }),

  removeTypingUser: (conversationId, userId) =>
    set((state) => ({
      typingUsers: {
        ...state.typingUsers,
        [conversationId]: (state.typingUsers[conversationId] || []).filter(
          (id) => id !== userId
        ),
      },
    })),

  unreadCounts: {},

  incrementUnreadCount: (id) =>
    set((state) => ({
      unreadCounts: { ...state.unreadCounts, [id]: (state.unreadCounts[id] || 0) + 1 },
    })),

  resetUnreadCount: (id) =>
    set((state) => ({
      unreadCounts: { ...state.unreadCounts, [id]: 0 },
    })),

  markMessagesAsRead: (conversationId, userId, readAt) =>
    set((state) => {
      const messages = state.messages[conversationId];
      if (!messages) return state;

      return {
        messages: {
          ...state.messages,
          [conversationId]: messages.map((m) => {
            const hasRead = m.readBy?.find((r) => r.userId === userId || (typeof r.userId === 'object' && (r.userId as { _id: string })._id === userId));
            if (!hasRead && m.senderId !== userId && (typeof m.senderId === 'object' && m.senderId._id !== userId)) {
               return {
                  ...m,
                  readBy: [...(m.readBy || []), { userId, readAt }]
               };
            }
            return m;
          }),
        },
      };
    }),

  markMessagesAsDelivered: (conversationId, messageId, userId, deliveredAt) =>
    set((state) => {
      const messages = state.messages[conversationId];
      if (!messages) return state;

      return {
        messages: {
          ...state.messages,
          [conversationId]: messages.map((m) => {
            if (m._id === messageId) {
              const hasDelivered = m.deliveredTo?.find((r) => r.userId === userId || (typeof r.userId === 'object' && (r.userId as { _id: string })._id === userId));
              if (!hasDelivered) {
                return {
                  ...m,
                  deliveredTo: [...(m.deliveredTo || []), { userId, deliveredAt }]
                };
              }
            }
            return m;
          }),
        },
      };
    }),

  updateMessageReactions: (conversationId, messageId, reactions) =>
    set((state) => {
      const currentMessages = state.messages[conversationId];
      if (!currentMessages) return state;

      const updatedMessages = currentMessages.map((m) =>
        String(m._id) === String(messageId) ? { ...m, reactions } : m
      );

      return {
        messages: {
          ...state.messages,
          [conversationId]: updatedMessages,
        },
      };
    }),

  updateMessageContent: (conversationId, messageId, content, isEdited, updatedAt) =>
    set((state) => {
      const messages = state.messages[conversationId];
      if (!messages) return state;

      return {
        messages: {
          ...state.messages,
          [conversationId]: messages.map((m) =>
            String(m._id) === String(messageId) ? { ...m, content, isEdited, updatedAt } : m
          ),
        },
      };
    }),

  deleteMessageInStore: (conversationId, messageId) =>
    set((state) => {
      const messages = state.messages[conversationId];
      if (!messages) return state;

      return {
        messages: {
          ...state.messages,
          [conversationId]: messages.map((m) =>
            String(m._id) === String(messageId) ? { ...m, isDeleted: true, content: 'Tin nhắn đã bị xóa', attachments: [] } : m
          ),
        },
      };
    }),

  updatePinnedMessages: (conversationId, pinnedMessages) =>
    set((state) => ({
      conversations: state.conversations.map((c) =>
        c._id === conversationId ? { ...c, pinnedMessages } : c
      ),
    })),
}));
