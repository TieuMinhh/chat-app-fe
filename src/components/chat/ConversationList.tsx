'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useChatStore } from '@/stores/chatStore';
import { useAuthStore } from '@/stores/authStore';
import { ConversationItem } from './ConversationItem';
import { NewChatModal } from './NewChatModal';
import { CreateGroupModal } from './CreateGroupModal';
import { Search, Plus, Users, MessageCircle } from 'lucide-react';

export function ConversationList() {
  const router = useRouter();
  const { conversations, activeConversationId } = useChatStore();
  const { user } = useAuthStore();
  const [searchQuery, setSearchQuery] = useState('');
  const [showNewChat, setShowNewChat] = useState(false);
  const [showCreateGroup, setShowCreateGroup] = useState(false);
  const [showMenu, setShowMenu] = useState(false);

  const filteredConversations = conversations.filter((conv) => {
    if (!searchQuery.trim()) return true;
    const query = searchQuery.toLowerCase();

    // Search by group name or member username
    if (conv.name?.toLowerCase().includes(query)) return true;
    return conv.members.some((m) =>
      typeof m.userId === 'object' && (
        m.userId.displayName?.toLowerCase().includes(query) ||
        m.userId.username?.toLowerCase().includes(query)
      )
    );
  });

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      {/* Search + New Chat */}
      <div className="px-4 py-3 space-y-3">
        <div className="flex items-center gap-2">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
            <input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Tìm kiếm cuộc trò chuyện..."
              className="w-full pl-10 pr-4 py-2.5 bg-white/5 border border-white/5 rounded-xl text-sm text-white placeholder-gray-600 transition-all focus:border-indigo-500/30"
            />
          </div>
          <div className="relative">
            <button
              onClick={() => setShowMenu(!showMenu)}
              className="p-2.5 rounded-xl bg-white/5 text-gray-400 hover:text-indigo-400 hover:bg-indigo-500/10 transition-all"
              title="Tạo mới"
            >
              <Plus className="w-5 h-5" />
            </button>

            {/* Dropdown menu */}
            {showMenu && (
              <>
                <div className="fixed inset-0 z-40" onClick={() => setShowMenu(false)} />
                <div className="absolute right-0 top-full mt-1 w-52 bg-(--bg-tertiary) border border-white/10 rounded-xl shadow-xl z-50 overflow-hidden animate-fade-in">
                  <button
                    onClick={() => { setShowNewChat(true); setShowMenu(false); }}
                    className="w-full flex items-center gap-3 px-4 py-3 text-sm text-gray-300 hover:bg-white/5 hover:text-white transition-all"
                  >
                    <MessageCircle className="w-4 h-4 text-indigo-400" />
                    Chat mới
                  </button>
                  <button
                    onClick={() => { setShowCreateGroup(true); setShowMenu(false); }}
                    className="w-full flex items-center gap-3 px-4 py-3 text-sm text-gray-300 hover:bg-white/5 hover:text-white transition-all"
                  >
                    <Users className="w-4 h-4 text-purple-400" />
                    Tạo nhóm
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      {/* List */}
      <div className="flex-1 overflow-y-auto">
        {filteredConversations.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-40 text-gray-600">
            <p className="text-sm">Không có cuộc trò chuyện nào</p>
          </div>
        ) : (
          filteredConversations.map((conv) => (
            <ConversationItem
              key={conv._id}
              conversation={conv}
              isActive={conv._id === activeConversationId}
              currentUserId={user?._id || ''}
              onClick={() => router.push(`/chat/${conv._id}`)}
            />
          ))
        )}
      </div>

      {/* Modals */}
      {showNewChat && <NewChatModal onClose={() => setShowNewChat(false)} />}
      {showCreateGroup && <CreateGroupModal onClose={() => setShowCreateGroup(false)} />}
    </div>
  );
}
