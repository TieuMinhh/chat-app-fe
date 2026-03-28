'use client';

import { useChatStore } from '@/stores/chatStore';
import { useAuthStore } from '@/stores/authStore';

interface TypingIndicatorProps {
  conversationId: string;
}

export function TypingIndicator({ conversationId }: TypingIndicatorProps) {
  const { typingUsers } = useChatStore();
  const { user } = useAuthStore();

  const typingInConversation = (typingUsers[conversationId] || []).filter(
    (id) => id !== user?._id
  );

  if (typingInConversation.length === 0) return null;

  return (
    <div className="flex items-center gap-2 px-2 py-1 animate-fade-in">
      <div className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white/5">
        {/* Bouncing dots */}
        <div className="flex gap-1">
          <div
            className="w-2 h-2 rounded-full bg-gray-400"
            style={{ animation: 'bounce-dot 1.4s infinite ease-in-out', animationDelay: '0s' }}
          />
          <div
            className="w-2 h-2 rounded-full bg-gray-400"
            style={{ animation: 'bounce-dot 1.4s infinite ease-in-out', animationDelay: '0.2s' }}
          />
          <div
            className="w-2 h-2 rounded-full bg-gray-400"
            style={{ animation: 'bounce-dot 1.4s infinite ease-in-out', animationDelay: '0.4s' }}
          />
        </div>
      </div>
    </div>
  );
}
