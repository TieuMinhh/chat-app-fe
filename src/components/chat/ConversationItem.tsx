'use client';

import { Conversation } from '@/types';
import { useChatStore } from '@/stores/chatStore';
import { formatLastSeen } from '@/lib/utils';
import { Users } from 'lucide-react';

interface ConversationItemProps {
  conversation: Conversation;
  isActive: boolean;
  currentUserId: string;
  onClick: () => void;
}

export function ConversationItem({ conversation, isActive, currentUserId, onClick }: ConversationItemProps) {
  const { onlineUsers } = useChatStore();

  // Get the other user in private chat
  const otherMember = conversation.type === 'private'
    ? conversation.members.find((m) => {
        const userId = typeof m.userId === 'object' ? m.userId._id : m.userId;
        return userId !== currentUserId;
      })
    : null;

  const otherUser = otherMember?.userId && typeof otherMember.userId === 'object'
    ? otherMember.userId
    : null;

  const displayName = conversation.type === 'group'
    ? conversation.name || 'Nhóm'
    : otherUser?.displayName || otherUser?.username || 'Unknown';

  const avatarText = displayName.charAt(0).toUpperCase();

  const isOnline = conversation.type === 'private' && otherUser
    ? onlineUsers.includes(otherUser._id)
    : false;

  // Try to use the full message object from the store if it's loaded for accurate read receipts
  const allMessages = useChatStore((state) => state.messages[conversation._id]);
  const storeLastMessage = allMessages && allMessages.length > 0 ? allMessages[allMessages.length - 1] : null;

  const isMine = storeLastMessage 
    ? (typeof storeLastMessage.senderId === 'object' ? storeLastMessage.senderId._id : storeLastMessage.senderId) === currentUserId
    : conversation.lastMessage?.senderId === currentUserId;

  // For group chat, show sender name prefix
  const getSenderPrefix = () => {
    if (conversation.type !== 'group') return isMine ? 'Bạn: ' : '';
    if (isMine) return 'Bạn: ';
    if (storeLastMessage) {
      const sender = typeof storeLastMessage.senderId === 'object' ? storeLastMessage.senderId : null;
      if (sender) return `${sender.displayName || sender.username}: `;
    }
    return '';
  };

  const lastMessageContent = storeLastMessage?.content || conversation.lastMessage?.content;
  const lastMessageType = storeLastMessage?.messageType || conversation.lastMessage?.messageType;
  
  const getMessagePreview = () => {
    if (!lastMessageContent && !lastMessageType) return 'Bắt đầu trò chuyện';
    if (lastMessageType === 'image') return `${getSenderPrefix()}📷 Hình ảnh`;
    if (lastMessageType === 'sticker') return `${getSenderPrefix()}✨ Nhãn dán`;
    if (lastMessageType === 'file') return `${getSenderPrefix()}📎 Tệp đính kèm`;
    if (lastMessageType === 'voice') return `${getSenderPrefix()}🎤 Tin nhắn thoại`;
    return `${getSenderPrefix()}${lastMessageContent || ''}`;
  };

  const lastMessageText = getMessagePreview();

  const lastMessageTime = storeLastMessage
    ? formatLastSeen(storeLastMessage.createdAt)
    : conversation.lastMessage
    ? formatLastSeen(conversation.lastMessage.createdAt)
    : '';

  const { unreadCounts } = useChatStore();
  const unreadCount = unreadCounts[conversation._id] || 0;
  const isUnread = unreadCount > 0;

  const renderReadReceipt = () => {
    if (!isMine || !storeLastMessage) return null;

    const hasRead = storeLastMessage.readBy && storeLastMessage.readBy.length > 0;
    const hasDelivered = storeLastMessage.deliveredTo && storeLastMessage.deliveredTo.length > 0;

    if (conversation.type === 'private' && hasRead && otherUser?.avatar) {
      return (
        <div className="shrink-0 ml-2 flex items-center gap-1.5">
          <span className="text-[11px] text-gray-500">Đã xem</span>
          <img src={otherUser.avatar} alt="read" className="w-3.5 h-3.5 rounded-full object-cover opacity-80" />
        </div>
      );
    }
    if (hasRead) {
      return (
        <div className="shrink-0 ml-2">
          <span className="text-[11px] text-gray-500">
            {conversation.type === 'group' ? `${storeLastMessage.readBy.length} đã xem` : 'Đã xem'}
          </span>
        </div>
      );
    }
    if (hasDelivered || storeLastMessage.status === 'delivered') {
      return (
        <div className="shrink-0 ml-2">
          <span className="text-[11px] text-gray-500">Đã nhận</span>
        </div>
      );
    }
    
    // Sent status
    return (
      <div className="shrink-0 ml-2">
        <span className="text-[11px] text-gray-500">Đã gửi</span>
      </div>
    );
  };

  // Group avatar: show other members' avatars (exclude current user)
  const renderGroupAvatar = () => {
    const otherMembers = conversation.members
      .filter((m) => {
        if (typeof m.userId !== 'object') return false;
        return m.userId._id !== currentUserId;
      })
      .map((m) => (typeof m.userId === 'object' ? m.userId : null))
      .filter(Boolean);

    if (otherMembers.length === 0) {
      return (
        <div className="w-12 h-12 rounded-full bg-linear-to-br from-purple-500/20 to-pink-500/20 flex items-center justify-center">
          <Users className="w-5 h-5 text-purple-400" />
        </div>
      );
    }

    // Single other member - show their avatar like private chat
    if (otherMembers.length === 1) {
      const member = otherMembers[0]!;
      return member.avatar ? (
        <img src={member.avatar} alt="" className="w-12 h-12 rounded-full object-cover" />
      ) : (
        <div className="w-12 h-12 rounded-full bg-linear-to-br from-purple-500/20 to-pink-500/20 flex items-center justify-center text-purple-400 font-semibold text-sm">
          {(member.displayName || member.username || '?').charAt(0).toUpperCase()}
        </div>
      );
    }

    // 2 members - show side by side (overlapping circles, Messenger style)
    if (otherMembers.length === 2) {
      return (
        <div className="w-12 h-12 relative">
          {otherMembers.map((member, i) => {
            const size = 'w-8 h-8';
            const position = i === 0 ? 'top-0 left-0' : 'bottom-0 right-0';
            return member?.avatar ? (
              <img
                key={member._id}
                src={member.avatar}
                alt=""
                className={`${size} rounded-full object-cover absolute ${position} border-2 border-(--bg-secondary)`}
              />
            ) : (
              <div
                key={member?._id || i}
                className={`${size} rounded-full bg-linear-to-br from-indigo-500/30 to-purple-500/30 flex items-center justify-center text-[10px] text-indigo-400 font-bold absolute ${position} border-2 border-(--bg-secondary)`}
              >
                {(member?.displayName || member?.username || '?').charAt(0).toUpperCase()}
              </div>
            );
          })}
        </div>
      );
    }

    // 3+ members - show 2x2 grid
    const gridMembers = otherMembers.slice(0, 4);
    return (
      <div className="w-12 h-12 rounded-full overflow-hidden relative bg-(--bg-tertiary)">
        <div className="grid grid-cols-2 w-full h-full gap-px">
          {gridMembers.map((member, i) => (
            member?.avatar ? (
              <img
                key={member._id}
                src={member.avatar}
                alt=""
                className="w-full h-full object-cover"
              />
            ) : (
              <div
                key={member?._id || i}
                className="w-full h-full bg-linear-to-br from-indigo-500/30 to-purple-500/30 flex items-center justify-center text-[8px] text-indigo-400 font-bold"
              >
                {(member?.displayName || member?.username || '?').charAt(0).toUpperCase()}
              </div>
            )
          ))}
          {/* Fill empty cells for 3-member grid */}
          {gridMembers.length === 3 && (
            <div className="w-full h-full bg-linear-to-br from-gray-600/20 to-gray-500/20 flex items-center justify-center text-[10px] text-gray-500">
              +
            </div>
          )}
        </div>
      </div>
    );
  };

  return (
    <button
      onClick={onClick}
      className={`w-full flex items-center gap-3 px-4 py-3 transition-all hover:bg-white/5 ${
        isActive ? 'bg-white/5 border-r-2 border-indigo-500' : ''
      }`}
    >
      {/* Avatar */}
      <div className="relative shrink-0">
        {conversation.type === 'group' ? (
          renderGroupAvatar()
        ) : otherUser?.avatar ? (
          <img
            src={otherUser.avatar}
            alt={displayName}
            className="w-12 h-12 rounded-full object-cover"
          />
        ) : (
          <div className="w-12 h-12 rounded-full bg-linear-to-br from-indigo-500/20 to-purple-500/20 flex items-center justify-center text-indigo-400 font-semibold text-sm">
            {avatarText}
          </div>
        )}
        {/* Online indicator */}
        {isOnline && (
          <div className="absolute bottom-0 right-0 w-3.5 h-3.5 bg-emerald-500 rounded-full border-2 border-(--bg-secondary) online-pulse" />
        )}
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0 text-left">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5 min-w-0">
            <p className={`text-sm truncate ${isUnread ? 'font-bold text-white' : 'font-medium text-gray-200'}`}>
              {displayName}
            </p>
            {conversation.type === 'group' && (
              <span className="text-[10px] text-gray-600 shrink-0">{conversation.members.length}</span>
            )}
          </div>
          {lastMessageTime && (
            <span className={`text-xs shrink-0 ml-2 ${isUnread ? 'font-semibold text-white' : 'text-gray-500'}`}>
              {lastMessageTime}
            </span>
          )}
        </div>
        <div className="flex items-center justify-between mt-0.5">
          <p className={`text-xs truncate ${isUnread ? 'font-semibold text-white' : 'text-gray-500'}`}>
            {lastMessageText}
          </p>
          <div className="flex items-center gap-1.5 shrink-0">
            {renderReadReceipt()}
            {isUnread && (
              <span className="ml-1 min-w-[18px] h-[18px] px-1 flex items-center justify-center rounded-full bg-indigo-500 text-white text-[10px] font-bold">
                {unreadCount > 99 ? '99+' : unreadCount}
              </span>
            )}
          </div>
        </div>
      </div>
    </button>
  );
}
