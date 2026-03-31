'use client';

import { useState, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/stores/authStore';
import { useChatStore } from '@/stores/chatStore';
import api from '@/lib/axios';
import { Conversation, User } from '@/types';
import { X, Crown, UserPlus, UserMinus, LogOut, Edit3, Loader2, Search, Check, Camera } from 'lucide-react';
import toast from 'react-hot-toast';

interface GroupInfoPanelProps {
  conversation: Conversation;
  onClose: () => void;
}

interface ContextMenu {
  x: number;
  y: number;
  member: User;
}

export function GroupInfoPanel({ conversation, onClose }: GroupInfoPanelProps) {
  const router = useRouter();
  const { user } = useAuthStore();
  const { updateConversation } = useChatStore();
  const [isEditing, setIsEditing] = useState(false);
  const [newName, setNewName] = useState(conversation.name || '');
  const [isSaving, setIsSaving] = useState(false);
  const [showAddMember, setShowAddMember] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<User[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [isAdding, setIsAdding] = useState(false);
  const [isUploadingAvatar, setIsUploadingAvatar] = useState(false);
  const [contextMenu, setContextMenu] = useState<ContextMenu | null>(null);
  const avatarInputRef = useRef<HTMLInputElement>(null);

  const isAdmin = user?._id === conversation.adminId;
  const memberCount = conversation.members.length;

  // Close context menu on click outside
  useEffect(() => {
    const handleClick = () => setContextMenu(null);
    if (contextMenu) {
      window.addEventListener('click', handleClick);
      return () => window.removeEventListener('click', handleClick);
    }
  }, [contextMenu]);

  const handleUpdateName = async () => {
    if (!newName.trim() || newName === conversation.name) {
      setIsEditing(false);
      return;
    }

    setIsSaving(true);
    try {
      const res = await api.put(`/conversations/${conversation._id}`, { name: newName.trim() });
      updateConversation(res.data.data);
      setIsEditing(false);
      toast.success('Đã cập nhật tên nhóm');
    } catch {
      toast.error('Không thể cập nhật');
    } finally {
      setIsSaving(false);
    }
  };

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      toast.error('Chỉ chấp nhận file ảnh');
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      toast.error('Ảnh tối đa 5MB');
      return;
    }

    setIsUploadingAvatar(true);
    try {
      // Upload to cloudinary first
      const formData = new FormData();
      formData.append('files', file);
      const uploadRes = await api.post('/uploads', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      const avatarUrl = uploadRes.data.data[0]?.url;

      if (avatarUrl) {
        // Update conversation avatar
        const res = await api.put(`/conversations/${conversation._id}`, { avatar: avatarUrl });
        updateConversation(res.data.data);
        toast.success('Đã cập nhật ảnh nhóm');
      }
    } catch {
      toast.error('Không thể cập nhật ảnh');
    } finally {
      setIsUploadingAvatar(false);
      if (avatarInputRef.current) avatarInputRef.current.value = '';
    }
  };

  const handleRemoveMember = async (targetUserId: string, targetName: string) => {
    try {
      const res = await api.delete(`/conversations/${conversation._id}/members/${targetUserId}`);
      updateConversation(res.data.data);
      toast.success(`Đã xóa ${targetName} khỏi nhóm`);
    } catch {
      toast.error('Không thể xóa thành viên');
    }
    setContextMenu(null);
  };

  const handleLeave = async () => {
    if (!confirm('Bạn có chắc muốn rời nhóm?')) return;

    try {
      await api.post(`/conversations/${conversation._id}/leave`);
      toast.success('Đã rời nhóm');
      onClose();
      router.push('/chat');
    } catch {
      toast.error('Không thể rời nhóm');
    }
  };

  const handleContextMenu = (e: React.MouseEvent, member: User) => {
    e.preventDefault();
    if (!isAdmin || member._id === user?._id) return;
    setContextMenu({
      x: e.clientX,
      y: e.clientY,
      member,
    });
  };

  let searchTimeout: NodeJS.Timeout;
  const handleSearchUsers = (value: string) => {
    setSearchQuery(value);
    if (searchTimeout) clearTimeout(searchTimeout);
    if (!value.trim()) {
      setSearchResults([]);
      return;
    }
    searchTimeout = setTimeout(async () => {
      setIsSearching(true);
      try {
        const res = await api.get('/users/search', { params: { q: value } });
        const existingIds = conversation.members.map((m) =>
          typeof m.userId === 'object' ? m.userId._id : m.userId
        );
        setSearchResults(res.data.data.filter((u: User) => !existingIds.includes(u._id)));
      } catch {
        console.error('Search failed');
      } finally {
        setIsSearching(false);
      }
    }, 500);
  };

  const handleAddMember = async (newUser: User) => {
    setIsAdding(true);
    try {
      const res = await api.post(`/conversations/${conversation._id}/members`, {
        memberIds: [newUser._id],
      });
      updateConversation(res.data.data);
      setSearchResults((prev) => prev.filter((u) => u._id !== newUser._id));
      toast.success(`Đã thêm ${newUser.displayName || newUser.username}`);
    } catch {
      toast.error('Không thể thêm thành viên');
    } finally {
      setIsAdding(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm animate-fade-in">
      <div className="w-full max-w-sm mx-4 bg-(--bg-secondary) rounded-2xl border border-white/5 shadow-2xl animate-slide-up overflow-hidden max-h-[85vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-white/5 shrink-0">
          <h3 className="text-base font-semibold text-white">Thông tin nhóm</h3>
          <button onClick={onClose} className="p-1.5 rounded-lg text-gray-500 hover:text-white hover:bg-white/5 transition-all">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="overflow-y-auto flex-1">
          {/* Group Avatar + Name */}
          <div className="px-5 py-5 border-b border-white/5">
            {/* Avatar */}
            <div className="flex items-center justify-center mb-4">
              <div className="relative group">
                {conversation.avatar ? (
                  <img src={conversation.avatar} alt="" className="w-16 h-16 rounded-full object-cover" />
                ) : (
                  <div className="w-16 h-16 rounded-full bg-linear-to-br from-indigo-500/30 to-purple-500/30 flex items-center justify-center text-2xl font-bold text-indigo-400">
                    {(conversation.name || 'G').charAt(0).toUpperCase()}
                  </div>
                )}
                {isAdmin && (
                  <>
                    <button
                      onClick={() => avatarInputRef.current?.click()}
                      disabled={isUploadingAvatar}
                      className="absolute inset-0 rounded-full bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer"
                    >
                      {isUploadingAvatar ? (
                        <Loader2 className="w-5 h-5 text-white animate-spin" />
                      ) : (
                        <Camera className="w-5 h-5 text-white" />
                      )}
                    </button>
                    <input
                      ref={avatarInputRef}
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={handleAvatarUpload}
                    />
                  </>
                )}
              </div>
            </div>

            {/* Name */}
            {isEditing ? (
              <div className="flex items-center gap-2">
                <input
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  className="flex-1 px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-sm text-white focus:border-indigo-500/30"
                  autoFocus
                  onKeyDown={(e) => e.key === 'Enter' && handleUpdateName()}
                />
                <button onClick={handleUpdateName} disabled={isSaving} className="p-2 rounded-lg bg-indigo-500/20 text-indigo-400 hover:bg-indigo-500/30">
                  {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                </button>
              </div>
            ) : (
              <div className="flex items-center justify-center gap-2">
                <h4 className="text-lg font-semibold text-white text-center">{conversation.name || 'Nhóm'}</h4>
                {isAdmin && (
                  <button onClick={() => setIsEditing(true)} className="p-1 rounded text-gray-500 hover:text-indigo-400">
                    <Edit3 className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            )}
            <p className="text-xs text-gray-500 text-center mt-1">{memberCount} thành viên</p>
          </div>

          {/* Members List */}
          <div className="px-3 py-3">
            <div className="flex items-center justify-between px-2 mb-2">
              <h5 className="text-xs font-medium text-gray-400 uppercase tracking-wider">Thành viên</h5>
              {isAdmin && (
                <button
                  onClick={() => setShowAddMember(!showAddMember)}
                  className="flex items-center gap-1 px-2 py-1 rounded-lg text-xs text-indigo-400 hover:bg-indigo-500/10 transition-all"
                >
                  <UserPlus className="w-3 h-3" />
                  Thêm
                </button>
              )}
            </div>

            {/* Add Member Search */}
            {showAddMember && (
              <div className="mb-3 px-1">
                <div className="relative mb-2">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-500" />
                  <input
                    value={searchQuery}
                    onChange={(e) => handleSearchUsers(e.target.value)}
                    placeholder="Tìm người dùng..."
                    className="w-full pl-9 pr-3 py-2 bg-white/5 border border-white/5 rounded-lg text-xs text-white placeholder-gray-600 focus:border-indigo-500/30"
                    autoFocus
                  />
                </div>
                {isSearching && (
                  <div className="flex justify-center py-2">
                    <Loader2 className="w-4 h-4 text-gray-500 animate-spin" />
                  </div>
                )}
                {searchResults.map((u) => (
                  <button
                    key={u._id}
                    onClick={() => handleAddMember(u)}
                    disabled={isAdding}
                    className="w-full flex items-center gap-2 px-2 py-2 rounded-lg hover:bg-white/5 transition-all"
                  >
                    {u.avatar ? (
                      <img src={u.avatar} alt="" className="w-7 h-7 rounded-full object-cover" />
                    ) : (
                      <div className="w-7 h-7 rounded-full bg-indigo-500/20 flex items-center justify-center text-[10px] text-indigo-400 font-semibold">
                        {(u.displayName || u.username).charAt(0).toUpperCase()}
                      </div>
                    )}
                    <span className="text-xs text-gray-300 flex-1 text-left">{u.displayName || u.username}</span>
                    <UserPlus className="w-3.5 h-3.5 text-indigo-400" />
                  </button>
                ))}
              </div>
            )}

            {/* Existing Members - right-click to kick */}
            {conversation.members.map((m) => {
              const member = typeof m.userId === 'object' ? m.userId : null;
              if (!member) return null;
              const isMemberAdmin = member._id === conversation.adminId;
              const isMe = member._id === user?._id;

              return (
                <div
                  key={member._id}
                  className={`flex items-center gap-3 px-2 py-2 rounded-lg transition-all ${
                    isAdmin && !isMe ? 'cursor-context-menu hover:bg-white/5' : 'hover:bg-white/5'
                  }`}
                  onContextMenu={(e) => handleContextMenu(e, member)}
                >
                  {member.avatar ? (
                    <img src={member.avatar} alt="" className="w-8 h-8 rounded-full object-cover" />
                  ) : (
                    <div className="w-8 h-8 rounded-full bg-linear-to-br from-indigo-500/20 to-purple-500/20 flex items-center justify-center text-indigo-400 font-semibold text-xs">
                      {(member.displayName || member.username).charAt(0).toUpperCase()}
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5">
                      <p className="text-sm text-white truncate">{member.displayName || member.username}</p>
                      {isMe && <span className="text-[10px] text-gray-500">(Bạn)</span>}
                      {isMemberAdmin && (
                        <Crown className="w-3 h-3 text-amber-400 shrink-0" />
                      )}
                    </div>
                    <p className="text-[10px] text-gray-500">@{member.username}</p>
                  </div>
                  {isAdmin && !isMe && (
                    <span className="text-[9px] text-gray-600 italic opacity-0 group-hover:opacity-100">Chuột phải để kick</span>
                  )}
                </div>
              );
            })}

            {isAdmin && (
              <p className="text-[10px] text-gray-600 italic text-center mt-2 px-2">
                💡 Nhấn chuột phải vào thành viên để kick khỏi nhóm
              </p>
            )}
          </div>
        </div>

        {/* Footer: Leave Group */}
        <div className="p-4 border-t border-white/5 bg-black/20 shrink-0">
          <button
            onClick={handleLeave}
            className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium text-red-400 hover:bg-red-500/10 transition-all"
          >
            <LogOut className="w-4 h-4" />
            Rời nhóm
          </button>
        </div>
      </div>

      {/* Right-click Context Menu */}
      {contextMenu && (
        <>
          <div className="fixed inset-0 z-60" onClick={() => setContextMenu(null)} />
          <div
            className="fixed z-70 w-48 bg-(--bg-tertiary) border border-white/10 rounded-xl shadow-2xl overflow-hidden animate-fade-in"
            style={{ left: contextMenu.x, top: contextMenu.y }}
          >
            <div className="px-3 py-2 border-b border-white/5">
              <p className="text-xs text-gray-400 truncate">
                {contextMenu.member.displayName || contextMenu.member.username}
              </p>
            </div>
            <button
              onClick={() => handleRemoveMember(contextMenu.member._id, contextMenu.member.displayName || contextMenu.member.username)}
              className="w-full flex items-center gap-2 px-3 py-2.5 text-sm text-red-400 hover:bg-red-500/10 transition-all"
            >
              <UserMinus className="w-4 h-4" />
              Kick khỏi nhóm
            </button>
          </div>
        </>
      )}
    </div>
  );
}
