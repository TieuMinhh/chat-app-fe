'use client';

import { useEffect, useState } from 'react';
import { useAuthStore } from '@/stores/authStore';
import { useChatStore } from '@/stores/chatStore';
import { Conversation } from '@/types';
import { formatLastSeen } from '@/lib/utils';
import api from '@/lib/axios';
import { Phone, Video, Users, Info, Ban, ShieldOff, MoreVertical, Pin, ArrowLeft } from 'lucide-react';
import { GroupInfoPanel } from './GroupInfoPanel';
import { PinnedMessagesPanel } from './PinnedMessagesPanel';
import toast from 'react-hot-toast';
import { useRouter } from 'next/navigation';

interface ChatHeaderProps {
  conversationId: string;
  onBlockStatusChange?: (status: { blocked: boolean; blockedBy: string | null }) => void;
}

export function ChatHeader({ conversationId, onBlockStatusChange }: ChatHeaderProps) {
  const router = useRouter();
  const { user } = useAuthStore();
  const { conversations, onlineUsers } = useChatStore();
  const [fetchedConversation, setFetchedConversation] = useState<Conversation | null>(null);
  const [showGroupInfo, setShowGroupInfo] = useState(false);
  const [showPinnedMessages, setShowPinnedMessages] = useState(false);
  const [showMenu, setShowMenu] = useState(false);
  const [blockStatus, setBlockStatus] = useState<{ blocked: boolean; blockedBy: string | null }>({ blocked: false, blockedBy: null });

  const conversation = conversations.find((c) => c._id === conversationId) || fetchedConversation;

  useEffect(() => {
    if (!conversations.find((c) => c._id === conversationId)) {
      api.get(`/conversations/${conversationId}`).then((res) => {
        setFetchedConversation(res.data.data);
      }).catch(err => {
        console.error("Failed to fetch conversation:", err);
      });
    }
  }, [conversationId, conversations]);

  // Check block status for private chats
  useEffect(() => {
    if (conversation?.type !== 'private' || !user) return;
    const otherUser = conversation.members.find((m) => {
      const mId = typeof m.userId === 'object' ? m.userId._id : m.userId;
      return mId !== user._id;
    });
    if (!otherUser) return;
    const otherUserId = typeof otherUser.userId === 'object' ? otherUser.userId._id : otherUser.userId;

    api.get(`/users/${otherUserId}/block-status`).then((res) => {
      const status = res.data.data;
      setBlockStatus(status);
      onBlockStatusChange?.(status);
    }).catch(() => {});
  }, [conversationId, conversation, user, onBlockStatusChange]);

  if (!conversation) return null;

  const isGroup = conversation.type === 'group';

  const otherMember = !isGroup
    ? conversation.members.find((m) => {
        const userId = typeof m.userId === 'object' ? m.userId._id : m.userId;
        return userId !== user?._id;
      })
    : null;

  const otherUser = otherMember?.userId && typeof otherMember.userId === 'object'
    ? otherMember.userId
    : null;

  const displayName = isGroup
    ? conversation.name || 'Nhóm'
    : otherUser?.displayName || otherUser?.username || 'Unknown';

  const isOnline = !isGroup && otherUser ? onlineUsers.includes(otherUser._id) : false;

  const onlineMemberCount = isGroup
    ? conversation.members.filter((m) => {
        const mId = typeof m.userId === 'object' ? m.userId._id : m.userId;
        return mId !== user?._id && onlineUsers.includes(mId);
      }).length
    : 0;

  const statusText = isGroup
    ? `${conversation.members.length} thành viên${onlineMemberCount > 0 ? ` · ${onlineMemberCount} đang hoạt động` : ''}`
    : isOnline
    ? 'Đang hoạt động'
    : otherUser?.lastSeen
    ? `Hoạt động ${formatLastSeen(otherUser.lastSeen)}`
    : '';

  const avatarText = displayName.charAt(0).toUpperCase();

  const handleBlockToggle = async () => {
    if (!otherUser) return;
    setShowMenu(false);

    try {
      if (blockStatus.blocked && blockStatus.blockedBy === user?._id) {
        // Unblock
        await api.delete(`/users/${otherUser._id}/block`);
        const newStatus = { blocked: false, blockedBy: null };
        setBlockStatus(newStatus);
        onBlockStatusChange?.(newStatus);
        toast.success(`Đã bỏ chặn ${otherUser.displayName || otherUser.username}`);
      } else if (!blockStatus.blocked) {
        // Block
        await api.post(`/users/${otherUser._id}/block`);
        const newStatus = { blocked: true, blockedBy: user?._id || null };
        setBlockStatus(newStatus);
        onBlockStatusChange?.(newStatus);
        toast.success(`Đã chặn ${otherUser.displayName || otherUser.username}`);
      }
    } catch {
      toast.error('Không thể thực hiện');
    }
  };

  return (
    <>
      <div className="flex items-center justify-between px-4 py-3 border-b border-(--border-color) glass transition-colors duration-500">
        <div className="flex items-center gap-1 md:gap-3">
          {/* Back Button (Mobile Only) */}
          <button 
            onClick={() => router.push('/chat')}
            className="md:hidden p-2 -ml-2 text-(--text-muted) hover:text-(--text-primary) transition-all"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>

          <div
            onClick={() => isGroup && setShowGroupInfo(true)}
            className={`flex items-center gap-3 ${isGroup ? 'cursor-pointer hover:opacity-80 transition-opacity' : ''}`}
            role={isGroup ? 'button' : undefined}
          >
            {/* Avatar */}
            <div className="relative shrink-0">
              {isGroup ? (
                conversation.avatar ? (
                  <img src={conversation.avatar} alt="" className="w-9 h-9 md:w-10 md:h-10 rounded-full object-cover" />
                ) : (
                  <div className="w-9 h-9 md:w-10 md:h-10 rounded-full bg-linear-to-br from-purple-500/20 to-pink-500/20 flex items-center justify-center">
                    <Users className="w-5 h-5 text-purple-400" />
                  </div>
                )
              ) : otherUser?.avatar ? (
                <img src={otherUser.avatar} alt={displayName} className="w-9 h-9 md:w-10 md:h-10 rounded-full object-cover" />
              ) : (
                <div className="w-9 h-9 md:w-10 md:h-10 rounded-full bg-linear-to-br from-indigo-500/20 to-purple-500/20 flex items-center justify-center text-indigo-400 font-semibold text-sm">
                  {avatarText}
                </div>
              )}
              {isOnline && (
                <div className="absolute bottom-0 right-0 w-3 h-3 bg-emerald-500 rounded-full border-2 border-(--bg-secondary) online-pulse" />
              )}
            </div>

            {/* Info */}
            <div className="flex flex-col text-left max-w-[150px] sm:max-w-xs transition-colors duration-500">
              <h2 className="text-sm font-semibold text-(--text-primary) truncate">{displayName}</h2>
              {blockStatus.blocked ? (
                <p className="text-[10px] md:text-xs text-red-400">
                  {blockStatus.blockedBy === user?._id ? 'Đã chặn người này' : 'Đã bị chặn'}
                </p>
              ) : statusText ? (
                <p className={`text-[10px] md:text-xs truncate ${isOnline || onlineMemberCount > 0 ? 'text-emerald-400' : 'text-(--text-muted)'}`}>
                  {statusText}
                </p>
              ) : null}
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-0.5 md:gap-1">
          <button className="hidden sm:flex p-2 rounded-lg text-(--text-muted) hover:text-(--text-primary) hover:bg-(--bg-hover) transition-all">
            <Phone className="w-4 h-4" />
          </button>
          <button className="hidden sm:flex p-2 rounded-lg text-(--text-muted) hover:text-(--text-primary) hover:bg-(--bg-hover) transition-all">
            <Video className="w-4 h-4" />
          </button>

          <button 
            onClick={() => setShowPinnedMessages(!showPinnedMessages)}
            className={`p-2 rounded-lg transition-all relative ${showPinnedMessages ? 'text-(--accent-primary) bg-(--accent-primary)/10' : 'text-(--text-muted) hover:text-(--text-primary) hover:bg-(--bg-hover)'}`}
            title="Tin nhắn đã ghim"
          >
            <Pin className="w-4 h-4" />
            {conversation.pinnedMessages && conversation.pinnedMessages.length > 0 && (
              <span className="absolute top-1.5 right-1.5 w-1.5 h-1.5 bg-(--accent-primary) rounded-full" />
            )}
          </button>

          {isGroup ? (
            <button
              onClick={() => setShowGroupInfo(true)}
              className="p-2 rounded-lg text-(--text-muted) hover:text-(--text-primary) hover:bg-(--bg-hover) transition-all"
              title="Thông tin nhóm"
            >
              <Info className="w-4 h-4" />
            </button>
          ) : (
            <div className="relative">
              <button
                onClick={() => setShowMenu(!showMenu)}
                className="p-2 rounded-lg text-(--text-muted) hover:text-(--text-primary) hover:bg-(--bg-hover) transition-all"
              >
                <MoreVertical className="w-4 h-4" />
              </button>
              {showMenu && (
                <>
                  <div className="fixed inset-0 z-40" onClick={() => setShowMenu(false)} />
                  <div className="absolute right-0 top-full mt-1 w-48 bg-(--bg-secondary) border border-(--border-color) rounded-xl shadow-xl z-50 overflow-hidden animate-fade-in">
                    {blockStatus.blocked && blockStatus.blockedBy === user?._id ? (
                      <button
                        onClick={handleBlockToggle}
                        className="w-full flex items-center gap-3 px-4 py-3 text-sm text-emerald-400 hover:bg-(--bg-hover) transition-all"
                      >
                        <ShieldOff className="w-4 h-4" />
                        Bỏ chặn
                      </button>
                    ) : !blockStatus.blocked ? (
                      <button
                        onClick={handleBlockToggle}
                        className="w-full flex items-center gap-3 px-4 py-3 text-sm text-red-500 hover:bg-(--bg-hover) transition-all"
                      >
                        <Ban className="w-4 h-4" />
                        Chặn người này
                      </button>
                    ) : null}
                  </div>
                </>
              )}
            </div>
          )}
        </div>
      </div>

      {showGroupInfo && conversation && (
        <GroupInfoPanel
          conversation={conversation}
          onClose={() => setShowGroupInfo(false)}
        />
      )}

      {showPinnedMessages && conversation && (
        <PinnedMessagesPanel
          conversation={conversation}
          onClose={() => setShowPinnedMessages(false)}
        />
      )}
    </>
  );
}
