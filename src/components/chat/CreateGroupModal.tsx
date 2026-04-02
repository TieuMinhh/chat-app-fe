'use client';

import { useState, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useChatStore } from '@/stores/chatStore';
import api from '@/lib/axios';
import { User } from '@/types';
import { Search, X, Loader2, Users, Check } from 'lucide-react';
import toast from 'react-hot-toast';

interface CreateGroupModalProps {
  onClose: () => void;
}

export function CreateGroupModal({ onClose }: CreateGroupModalProps) {
  const router = useRouter();
  const { updateConversation } = useChatStore();
  const [step, setStep] = useState<'select' | 'name'>('select');
  const [query, setQuery] = useState('');
  const [users, setUsers] = useState<User[]>([]);
  const [selectedUsers, setSelectedUsers] = useState<User[]>([]);
  const [groupName, setGroupName] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [isCreating, setIsCreating] = useState(false);

  const searchTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const handleSearch = useCallback((value: string) => {
    setQuery(value);
    if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current);

    if (!value.trim()) {
      setUsers([]);
      return;
    }

    searchTimeoutRef.current = setTimeout(async () => {
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
  }, []);

  const toggleUser = (user: User) => {
    setSelectedUsers((prev) => {
      const exists = prev.find((u) => u._id === user._id);
      if (exists) return prev.filter((u) => u._id !== user._id);
      return [...prev, user];
    });
  };

  const handleNext = () => {
    if (selectedUsers.length < 2) {
      toast.error('Cần ít nhất 2 người để tạo nhóm');
      return;
    }
    setStep('name');
  };

  const createGroup = async () => {
    if (!groupName.trim()) {
      toast.error('Vui lòng nhập tên nhóm');
      return;
    }

    setIsCreating(true);
    try {
      const res = await api.post('/conversations', {
        type: 'group',
        memberIds: selectedUsers.map((u) => u._id),
        name: groupName.trim(),
      });
      const conversation = res.data.data.conversation || res.data.data;
      updateConversation(conversation);
      onClose();
      router.push(`/chat/${conversation._id}`);
      toast.success('Đã tạo nhóm!');
    } catch {
      toast.error('Không thể tạo nhóm');
    } finally {
      setIsCreating(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm animate-fade-in transition-all">
      <div className="w-full max-w-md mx-4 bg-(--bg-secondary) rounded-2xl border border-(--border-color) shadow-2xl animate-slide-up overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-(--border-color)">
          <h3 className="text-base font-semibold text-(--text-primary) flex items-center gap-2">
            <Users className="w-4 h-4 text-(--accent-primary)" />
            {step === 'select' ? 'Chọn thành viên' : 'Đặt tên nhóm'}
          </h3>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-(--text-muted) hover:text-(--text-primary) hover:bg-(--bg-hover) transition-all"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {step === 'select' ? (
          <>
            {/* Selected chips */}
            {selectedUsers.length > 0 && (
              <div className="px-5 pt-3 flex flex-wrap gap-2">
                {selectedUsers.map((u) => (
                  <span
                    key={u._id}
                    className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-(--accent-primary)/10 text-(--accent-primary) text-xs font-medium border border-(--accent-primary)/20"
                  >
                    {u.displayName || u.username}
                    <button onClick={() => toggleUser(u)} className="hover:text-(--text-primary) transition-colors">
                      <X className="w-3 h-3" />
                    </button>
                  </span>
                ))}
              </div>
            )}

            {/* Search */}
            <div className="px-5 py-3">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-(--text-muted)" />
                <input
                  value={query}
                  onChange={(e) => handleSearch(e.target.value)}
                  placeholder="Tìm theo @username hoặc email..."
                  className="w-full pl-10 pr-4 py-2.5 bg-(--bg-tertiary) border border-(--border-color) rounded-xl text-sm text-(--text-primary) placeholder-(--text-muted) transition-all focus:border-(--accent-primary)/50 outline-none"
                  autoFocus
                />
              </div>
            </div>

            {/* Results */}
            <div className="max-h-60 overflow-y-auto px-2 pb-3 scrollbar-hide">
              {isSearching ? (
                <div className="flex justify-center py-8">
                  <Loader2 className="w-5 h-5 text-(--accent-primary) animate-spin" />
                </div>
              ) : users.length > 0 ? (
                users.map((u) => {
                  const isSelected = selectedUsers.some((s) => s._id === u._id);
                  return (
                    <button
                      key={u._id}
                      onClick={() => toggleUser(u)}
                      className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all ${
                        isSelected ? 'bg-(--accent-primary)/10' : 'hover:bg-(--bg-hover)'
                      }`}
                    >
                      {u.avatar ? (
                        <img src={u.avatar} alt={u.displayName || u.username} className="w-9 h-9 rounded-full object-cover border border-(--border-color)/50" />
                      ) : (
                        <div className="w-9 h-9 rounded-full bg-linear-to-br from-indigo-500/10 to-purple-500/10 flex items-center justify-center text-indigo-500 font-semibold text-xs">
                          {(u.displayName || u.username).charAt(0).toUpperCase()}
                        </div>
                      )}
                      <div className="text-left flex-1 min-w-0">
                        <p className="text-sm font-semibold text-(--text-primary) truncate">{u.displayName || u.username}</p>
                        <p className="text-xs text-(--text-muted) truncate">@{u.username}</p>
                      </div>
                      <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all ${
                        isSelected ? 'bg-(--accent-primary) border-(--accent-primary)' : 'border-(--border-color)'
                      }`}>
                        {isSelected && <Check className="w-3 h-3 text-white" />}
                      </div>
                    </button>
                  );
                })
              ) : query.trim() ? (
                <p className="text-center text-(--text-muted) text-sm py-8">Không tìm thấy</p>
              ) : (
                <p className="text-center text-(--text-muted) text-sm py-8">Tìm người dùng để thêm vào nhóm</p>
              )}
            </div>

            {/* Footer */}
            <div className="p-4 border-t border-(--border-color) bg-(--bg-tertiary)/30 flex justify-between items-center shrink-0">
              <span className="text-xs text-(--text-muted) font-medium">Đã chọn {selectedUsers.length} người</span>
              <button
                onClick={handleNext}
                disabled={selectedUsers.length < 2}
                className="px-5 py-2 rounded-xl text-sm font-semibold text-white transition-all disabled:opacity-30 shadow-lg active:scale-95"
                style={{ background: selectedUsers.length >= 2 ? 'var(--accent-gradient)' : 'var(--bg-active)' }}
              >
                Tiếp theo
              </button>
            </div>
          </>
        ) : (
          <>
            {/* Name input step */}
            <div className="p-6">
              <div className="flex flex-wrap gap-2 mb-6">
                {selectedUsers.map((u) => (
                  <div key={u._id} className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-(--bg-tertiary) border border-(--border-color)/50">
                    {u.avatar ? (
                      <img src={u.avatar} alt="" className="w-5 h-5 rounded-full object-cover" />
                    ) : (
                      <div className="w-5 h-5 rounded-full bg-indigo-500/10 flex items-center justify-center text-[9px] text-indigo-500 font-bold">
                        {(u.displayName || u.username).charAt(0).toUpperCase()}
                      </div>
                    )}
                    <span className="text-xs text-(--text-secondary) font-medium">{u.displayName || u.username}</span>
                  </div>
                ))}
              </div>

              <label className="block text-xs text-(--text-muted) mb-1.5 ml-1 font-bold uppercase tracking-wider">Tên nhóm</label>
              <input
                value={groupName}
                onChange={(e) => setGroupName(e.target.value)}
                placeholder="Nhập tên nhóm..."
                className="w-full px-4 py-3 bg-(--bg-tertiary) border border-(--border-color) rounded-xl text-sm text-(--text-primary) placeholder-(--text-muted) transition-all focus:border-(--accent-primary)/50 outline-none"
                autoFocus
                onKeyDown={(e) => e.key === 'Enter' && createGroup()}
              />
            </div>

            {/* Footer */}
            <div className="p-4 border-t border-(--border-color) bg-(--bg-tertiary)/30 flex gap-2 justify-end shrink-0">
              <button
                onClick={() => setStep('select')}
                className="px-4 py-2 text-sm text-(--text-muted) hover:text-(--text-primary) transition-colors font-semibold outline-none"
              >
                Quay lại
              </button>
              <button
                onClick={createGroup}
                disabled={isCreating || !groupName.trim()}
                className="flex items-center gap-2 px-6 py-2.5 rounded-xl text-sm font-semibold text-white transition-all disabled:opacity-50 shadow-lg active:scale-95"
                style={{ background: 'var(--accent-gradient)' }}
              >
                {isCreating && <Loader2 className="w-4 h-4 animate-spin" />}
                Tạo nhóm
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
