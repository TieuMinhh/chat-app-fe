'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useChatStore } from '@/stores/chatStore';
import api from '@/lib/axios';
import { User } from '@/types';
import { Search, X, Loader2, MessageCircle } from 'lucide-react';
import toast from 'react-hot-toast';

interface NewChatModalProps {
  onClose: () => void;
}

export function NewChatModal({ onClose }: NewChatModalProps) {
  const router = useRouter();
  const { updateConversation } = useChatStore();
  const [query, setQuery] = useState('');
  const [users, setUsers] = useState<User[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [isCreating, setIsCreating] = useState(false);

  let searchTimeout: NodeJS.Timeout;

  const handleSearch = (value: string) => {
    setQuery(value);

    if (searchTimeout) clearTimeout(searchTimeout);

    if (!value.trim()) {
      setUsers([]);
      return;
    }

    searchTimeout = setTimeout(async () => {
      setIsSearching(true);
      try {
        const res = await api.get('/users/search', { params: { q: value } });
        setUsers(res.data.data);
      } catch {
        console.error('Search failed');
      } finally {
        setIsSearching(false);
      }
    }, 500);
  };

  const startChat = async (selectedUser: User) => {
    setIsCreating(true);
    try {
      const res = await api.post('/conversations', {
        type: 'private',
        memberId: selectedUser._id,
      });
      const conversation = res.data.data.conversation || res.data.data;
      updateConversation(conversation);
      onClose();
      router.push(`/chat/${conversation._id}`);
    } catch {
      toast.error('Không thể tạo cuộc trò chuyện');
    } finally {
      setIsCreating(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm animate-fade-in transition-all">
      <div className="w-full max-w-md mx-4 bg-(--bg-secondary) rounded-2xl border border-(--border-color) shadow-2xl animate-slide-up overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-(--border-color)">
          <h3 className="text-base font-semibold text-(--text-primary)">Tin nhắn mới</h3>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-(--text-muted) hover:text-(--text-primary) hover:bg-(--bg-hover) transition-all"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Search */}
        <div className="px-5 py-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-(--text-muted)" />
            <input
              value={query}
              onChange={(e) => handleSearch(e.target.value)}
              placeholder="Tìm theo @username hoặc email..."
              className="w-full pl-10 pr-4 py-2.5 bg-(--bg-tertiary) border border-(--border-color) rounded-xl text-sm text-(--text-primary) placeholder-(--text-muted) transition-all focus:border-indigo-500/50 outline-none"
              autoFocus
            />
          </div>
        </div>

        {/* Results */}
        <div className="max-h-80 overflow-y-auto px-2 pb-4 scrollbar-hide">
          {isSearching ? (
            <div className="flex justify-center py-8">
              <Loader2 className="w-5 h-5 text-indigo-500 animate-spin" />
            </div>
          ) : users.length > 0 ? (
            users.map((u) => (
              <button
                key={u._id}
                onClick={() => startChat(u)}
                disabled={isCreating}
                className="w-full flex items-center gap-3 px-3 py-3 rounded-xl hover:bg-(--bg-hover) transition-all disabled:opacity-50 group"
              >
                {u.avatar ? (
                  <img src={u.avatar} alt={u.displayName || u.username} className="w-10 h-10 rounded-full object-cover border border-(--border-color)" />
                ) : (
                  <div className="w-10 h-10 rounded-full bg-linear-to-br from-indigo-500/10 to-purple-500/10 flex items-center justify-center text-indigo-500 font-semibold text-sm">
                    {(u.displayName || u.username).charAt(0).toUpperCase()}
                  </div>
                )}
                <div className="text-left flex-1">
                  <p className="text-sm font-medium text-(--text-primary) group-hover:text-indigo-500 transition-colors uppercase tracking-tight">{u.displayName || u.username}</p>
                  <p className="text-xs text-(--text-muted)">@{u.username}</p>
                </div>
                <MessageCircle className="w-4 h-4 text-(--text-muted) group-hover:text-indigo-500 transition-colors" />
              </button>
            ))
          ) : query.trim() ? (
            <div className="flex flex-col items-center justify-center py-10 opacity-60">
              <Search className="w-10 h-10 text-(--text-muted) mb-3" />
              <p className="text-center text-(--text-secondary) text-sm font-medium">
                Không tìm thấy người dùng
              </p>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-10 opacity-60">
              <MessageCircle className="w-10 h-10 text-(--text-muted) mb-3" />
              <p className="text-center text-(--text-secondary) text-sm font-medium">
                Tìm kiếm bạn bè để bắt đầu trò chuyện
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
