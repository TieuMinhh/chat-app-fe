'use client';

import { useEffect, useState } from 'react';
import { useAuthStore } from '@/stores/authStore';
import { useChatStore } from '@/stores/chatStore';
import { ConversationList } from '@/components/chat/ConversationList';
import api from '@/lib/axios';
import { LogOut, MessageCircle, Home, Users, Settings } from 'lucide-react';
import toast from 'react-hot-toast';
import { useRouter, usePathname } from 'next/navigation';
import { ProfileModal } from '@/components/chat/ProfileModal';
import { ThemeToggle } from '@/components/ui/ThemeToggle';

export default function MainLayout({ children }: { children: React.ReactNode }) {
  const { user, logout: authLogout } = useAuthStore();
  const { setConversations } = useChatStore();
  const [showProfile, setShowProfile] = useState(false);
  const router = useRouter();
  const pathname = usePathname();

  // On mobile, we hide the sidebar if we are in a chat room
  const isChatRoom = pathname.startsWith('/chat/') && pathname !== '/chat';

  useEffect(() => {
    const fetchConversations = async () => {
      try {
        const res = await api.get('/conversations');
        setConversations(res.data.data);
      } catch (error) {
        console.error('Failed to fetch conversations:', error);
      }
    };
    fetchConversations();
  }, [setConversations]);

  const handleLogout = async () => {
    try {
      await api.post('/auth/logout');
    } catch {}
    authLogout();
    router.push('/login');
    toast.success('Đã đăng xuất');
  };

  return (
    <div className="flex h-screen bg-(--bg-primary) text-(--text-primary) overflow-hidden transition-colors duration-500">
      {/* Sidebar */}
      <div className={`
        ${isChatRoom ? 'hidden md:flex' : 'flex'} 
        w-full md:w-[360px] flex-col border-r border-(--border-color) bg-(--bg-secondary)
      `}>
        {/* Sidebar Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-(--border-color)">
          <button
            onClick={() => setShowProfile(true)}
            className="flex items-center gap-3 p-1.5 rounded-xl hover:bg-(--bg-hover) transition-all text-left truncate group"
          >
            <div className="w-9 h-9 rounded-full overflow-hidden shrink-0 border border-(--border-color)/50">
              {user?.avatar ? (
                <img src={user.avatar} alt="Avatar" className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full bg-linear-to-br from-indigo-500 to-purple-600 flex items-center justify-center shadow-lg shadow-indigo-500/20">
                  <MessageCircle className="w-4 h-4 text-white" />
                </div>
              )}
            </div>
            <div className="min-w-0">
              <h1 className="text-sm font-semibold truncate text-(--text-primary) group-hover:text-(--accent-primary) transition-colors">
                {user?.displayName || user?.username}
              </h1>
              <p className="text-xs text-(--text-muted) transition-colors font-medium">Cài đặt</p>
            </div>
          </button>
          
          <div className="flex items-center gap-1">
            <ThemeToggle />
            <div className="w-px h-4 bg-(--border-color) mx-1.5" />
            <button
              onClick={() => router.push('/chat')}
              className="p-2 rounded-lg text-(--text-muted) hover:text-(--accent-primary) hover:bg-(--bg-hover) transition-all"
              title="Trang chủ"
            >
              <Home className="w-4 h-4" />
            </button>
            <button
              onClick={handleLogout}
              className="p-2 rounded-lg text-(--text-muted) hover:text-red-500 hover:bg-(--bg-hover) transition-all"
              title="Đăng xuất"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>

        <ConversationList />
        
        {/* Bottom Nav (Mobile Only) */}
        {!isChatRoom && (
          <div className="md:hidden flex items-center justify-around px-2 py-3 border-t border-(--border-color) bg-(--bg-secondary)/80 backdrop-blur-xl">
             <button className="flex flex-col items-center gap-1 text-(--accent-primary)">
               <MessageCircle className="w-6 h-6" />
               <span className="text-[10px] font-medium">Đoạn chat</span>
             </button>
             <button className="flex flex-col items-center gap-1 text-(--text-muted)">
               <Users className="w-6 h-6" />
               <span className="text-[10px] font-medium">Danh bạ</span>
             </button>
             <button 
               onClick={() => setShowProfile(true)}
               className="flex flex-col items-center gap-1 text-(--text-muted)"
             >
               <Settings className="w-6 h-6" />
               <span className="text-[10px] font-medium">Cài đặt</span>
             </button>
          </div>
        )}

        {/* Profile Modal */}
        {showProfile && (
          <ProfileModal onClose={() => setShowProfile(false)} />
        )}
      </div>

      {/* Main Content */}
      <div className={`
        ${!isChatRoom ? 'hidden md:flex' : 'flex'}
        flex-1 flex flex-col min-h-0 min-w-0 overflow-hidden
      `}>
        {children}
      </div>
    </div>
  );
}
