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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm animate-fade-in">
      <div className="w-full max-w-md mx-4 bg-(--bg-secondary) rounded-2xl border border-white/5 shadow-2xl animate-slide-up overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-white/5">
          <h3 className="text-base font-semibold text-white flex items-center gap-2">
            <Users className="w-4 h-4 text-indigo-400" />
            {step === 'select' ? 'Chọn thành viên' : 'Đặt tên nhóm'}
          </h3>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-gray-500 hover:text-white hover:bg-white/5 transition-all"
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
                    className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-indigo-500/20 text-indigo-300 text-xs"
                  >
                    {u.displayName || u.username}
                    <button onClick={() => toggleUser(u)} className="hover:text-white">
                      <X className="w-3 h-3" />
                    </button>
                  </span>
                ))}
              </div>
            )}

            {/* Search */}
            <div className="px-5 py-3">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                <input
                  value={query}
                  onChange={(e) => handleSearch(e.target.value)}
                  placeholder="Tìm theo @username hoặc email..."
                  className="w-full pl-10 pr-4 py-2.5 bg-white/5 border border-white/5 rounded-xl text-sm text-white placeholder-gray-600 transition-all focus:border-indigo-500/30"
                  autoFocus
                />
              </div>
            </div>

            {/* Results */}
            <div className="max-h-60 overflow-y-auto px-2 pb-3">
              {isSearching ? (
                <div className="flex justify-center py-8">
                  <Loader2 className="w-5 h-5 text-gray-500 animate-spin" />
                </div>
              ) : users.length > 0 ? (
                users.map((u) => {
                  const isSelected = selectedUsers.some((s) => s._id === u._id);
                  return (
                    <button
                      key={u._id}
                      onClick={() => toggleUser(u)}
                      className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all ${
                        isSelected ? 'bg-indigo-500/10' : 'hover:bg-white/5'
                      }`}
                    >
                      {u.avatar ? (
                        <img src={u.avatar} alt={u.displayName || u.username} className="w-9 h-9 rounded-full object-cover" />
                      ) : (
                        <div className="w-9 h-9 rounded-full bg-linear-to-br from-indigo-500/20 to-purple-500/20 flex items-center justify-center text-indigo-400 font-semibold text-xs">
                          {(u.displayName || u.username).charAt(0).toUpperCase()}
                        </div>
                      )}
                      <div className="text-left flex-1">
                        <p className="text-sm font-medium text-white">{u.displayName || u.username}</p>
                        <p className="text-xs text-gray-500">@{u.username}</p>
                      </div>
                      <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all ${
                        isSelected ? 'bg-indigo-500 border-indigo-500' : 'border-gray-600'
                      }`}>
                        {isSelected && <Check className="w-3 h-3 text-white" />}
                      </div>
                    </button>
                  );
                })
              ) : query.trim() ? (
                <p className="text-center text-gray-600 text-sm py-8">Không tìm thấy</p>
              ) : (
                <p className="text-center text-gray-600 text-sm py-8">Tìm người dùng để thêm vào nhóm</p>
              )}
            </div>

            {/* Footer */}
            <div className="p-4 border-t border-white/5 bg-black/20 flex justify-between items-center">
              <span className="text-xs text-gray-500">Đã chọn {selectedUsers.length} người</span>
              <button
                onClick={handleNext}
                disabled={selectedUsers.length < 2}
                className="px-5 py-2 rounded-xl text-sm font-medium text-white transition-all disabled:opacity-30"
                style={{ background: selectedUsers.length >= 2 ? 'var(--accent-gradient)' : 'rgba(255,255,255,0.05)' }}
              >
                Tiếp theo
              </button>
            </div>
          </>
        ) : (
          <>
            {/* Name input step */}
            <div className="p-6">
              <div className="flex flex-wrap gap-2 mb-4">
                {selectedUsers.map((u) => (
                  <div key={u._id} className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/5">
                    {u.avatar ? (
                      <img src={u.avatar} alt="" className="w-5 h-5 rounded-full object-cover" />
                    ) : (
                      <div className="w-5 h-5 rounded-full bg-indigo-500/20 flex items-center justify-center text-[9px] text-indigo-400 font-semibold">
                        {(u.displayName || u.username).charAt(0).toUpperCase()}
                      </div>
                    )}
                    <span className="text-xs text-gray-300">{u.displayName || u.username}</span>
                  </div>
                ))}
              </div>

              <label className="block text-xs text-gray-400 mb-1.5 ml-1">Tên nhóm</label>
              <input
                value={groupName}
                onChange={(e) => setGroupName(e.target.value)}
                placeholder="Nhập tên nhóm..."
                className="w-full px-4 py-2.5 bg-white/5 border border-white/5 rounded-xl text-sm text-white placeholder-gray-600 transition-all focus:border-indigo-500/30"
                autoFocus
                onKeyDown={(e) => e.key === 'Enter' && createGroup()}
              />
            </div>

            {/* Footer */}
            <div className="p-4 border-t border-white/5 bg-black/20 flex gap-2 justify-end">
              <button
                onClick={() => setStep('select')}
                className="px-4 py-2 text-sm text-gray-400 hover:text-white transition-colors"
              >
                Quay lại
              </button>
              <button
                onClick={createGroup}
                disabled={isCreating || !groupName.trim()}
                className="flex items-center gap-2 px-5 py-2 rounded-xl text-sm font-medium text-white transition-all disabled:opacity-50"
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
