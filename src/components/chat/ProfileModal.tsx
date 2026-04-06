'use client';

import { useState, useRef } from 'react';
import { useAuthStore } from '@/stores/authStore';
import api from '@/lib/axios';
import { X, Camera, Loader2, Save, User as UserIcon, Lock, Key } from 'lucide-react';
import toast from 'react-hot-toast';
import { AxiosError } from 'axios';

interface ProfileModalProps {
  onClose: () => void;
}

type TabType = 'info' | 'password';

export function ProfileModal({ onClose }: ProfileModalProps) {
  const { user, setUser } = useAuthStore();
  const [activeTab, setActiveTab] = useState<TabType>('info');
  
  // Info Tab State
  const [displayName, setDisplayName] = useState(user?.displayName || '');
  const [avatarPreview, setAvatarPreview] = useState<string | null>(user?.avatar || null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  
  // Password Tab State
  const [oldPassword, setOldPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  
  const [isSaving, setIsSaving] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleAvatarClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      toast.error('Chỉ hỗ trợ file ảnh');
      return;
    }

    if (file.size > 2 * 1024 * 1024) {
      toast.error('Ảnh phải nhỏ hơn 2MB');
      return;
    }

    setSelectedFile(file);
    const reader = new FileReader();
    reader.onload = (e) => {
      setAvatarPreview(e.target?.result as string);
    };
    reader.readAsDataURL(file);
  };

  const handleSaveProfile = async () => {
    if (!displayName.trim() || displayName.length < 3 || displayName.length > 50) {
      toast.error('Tên hiển thị phải từ 3 đến 50 ký tự');
      return;
    }

    setIsSaving(true);
    try {
      const formData = new FormData();
      formData.append('displayName', displayName.trim());
      
      if (selectedFile) {
        formData.append('avatarFile', selectedFile);
      }

      const res = await api.put('/users/profile', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });

      const updatedUser = res.data.data;
      setUser(updatedUser);
      toast.success('Cập nhật thành công');
      onClose();
    } catch (error) {
      const axiosError = error as AxiosError<{ error: { message: string } }>;
      const message = axiosError.response?.data?.error?.message || 'Không thể cập nhật profile';
      toast.error(message);
    } finally {
      setIsSaving(false);
    }
  };

  const handleUpdatePassword = async () => {
    if (!oldPassword || !newPassword || !confirmPassword) {
      toast.error('Vui lòng nhập đầy đủ thông tin');
      return;
    }

    if (newPassword.length < 6) {
      toast.error('Mật khẩu mới phải có ít nhất 6 ký tự');
      return;
    }

    if (newPassword !== confirmPassword) {
      toast.error('Mật khẩu xác nhận không khớp');
      return;
    }

    setIsSaving(true);
    try {
      await api.post('/users/change-password', {
        oldPassword,
        newPassword
      });
      
      toast.success('Đổi mật khẩu thành công');
      setOldPassword('');
      setNewPassword('');
      setConfirmPassword('');
      setActiveTab('info');
    } catch (error) {
      const axiosError = error as AxiosError<{ error: { message: string } }>;
      const message = axiosError.response?.data?.error?.message || 'Không thể đổi mật khẩu';
      toast.error(message);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm animate-fade-in transition-all px-4">
      <div className="w-full max-w-sm bg-(--bg-secondary) rounded-2xl border border-(--border-color) shadow-2xl animate-slide-up overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-(--border-color)">
          <h3 className="text-base font-bold text-(--text-primary)">Cài đặt tài khoản</h3>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-(--text-muted) hover:text-(--text-primary) hover:bg-(--bg-hover) transition-all"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Tab Switcher */}
        <div className="flex px-5 pt-4 gap-1 border-b border-(--border-color) bg-(--bg-tertiary)/10">
          <button
            onClick={() => setActiveTab('info')}
            className={`flex items-center gap-2 px-4 py-2.5 text-xs font-semibold rounded-t-xl transition-all relative ${
              activeTab === 'info' 
                ? 'text-indigo-500 bg-(--bg-secondary) border-x border-t border-(--border-color)' 
                : 'text-(--text-muted) hover:text-(--text-primary) hover:bg-(--bg-hover)'
            }`}
          >
            <UserIcon className="w-3.5 h-3.5" />
            Thông tin
            {activeTab === 'info' && <div className="absolute -bottom-px left-0 right-0 h-px bg-(--bg-secondary)" />}
          </button>
          <button
            onClick={() => setActiveTab('password')}
            className={`flex items-center gap-2 px-4 py-2.5 text-xs font-semibold rounded-t-xl transition-all relative ${
              activeTab === 'password' 
                ? 'text-indigo-500 bg-(--bg-secondary) border-x border-t border-(--border-color)' 
                : 'text-(--text-muted) hover:text-(--text-primary) hover:bg-(--bg-hover)'
            }`}
          >
            <Lock className="w-3.5 h-3.5" />
            Mật khẩu
            {activeTab === 'password' && <div className="absolute -bottom-px left-0 right-0 h-px bg-(--bg-secondary)" />}
          </button>
        </div>

        {/* Content */}
        <div className="p-6">
          {activeTab === 'info' ? (
            <div className="flex flex-col items-center">
              {/* Avatar picker */}
              <div 
                className="relative w-24 h-24 mb-6 cursor-pointer group rounded-full overflow-hidden border-2 border-(--bg-tertiary) shadow-inner animate-zoom-in"
                onClick={handleAvatarClick}
              >
                {avatarPreview ? (
                  <img src={avatarPreview} alt="Avatar" className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full bg-linear-to-br from-indigo-500/10 to-purple-500/10 flex items-center justify-center text-indigo-500 text-3xl font-bold">
                    {user?.displayName?.[0]?.toUpperCase() || user?.username?.[0]?.toUpperCase()}
                  </div>
                )}
                
                <div className="absolute inset-0 bg-black/40 flex flex-col items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                  <Camera className="w-5 h-5 text-white mb-1" />
                  <span className="text-[10px] text-white/90 font-bold uppercase tracking-wider">Đổi ảnh</span>
                </div>
              </div>
              <input 
                type="file" 
                ref={fileInputRef} 
                className="hidden" 
                accept="image/*"
                onChange={handleFileChange} 
              />

              {/* Form Fields */}
              <div className="w-full space-y-4">
                <div className="animate-slide-up" style={{ animationDelay: '100ms' }}>
                  <label className="block text-[11px] font-bold text-(--text-muted) mb-1.5 ml-1 uppercase tracking-wider">Tên hiển thị</label>
                  <input
                    value={displayName}
                    onChange={(e) => setDisplayName(e.target.value)}
                    className="w-full px-4 py-2.5 bg-(--bg-tertiary) border border-(--border-color) rounded-xl text-sm text-(--text-primary) placeholder-(--text-muted) transition-all focus:border-indigo-500/50 focus:ring-2 focus:ring-indigo-500/10 outline-none"
                    placeholder="Nhập tên hiển thị"
                  />
                </div>

                <div className="animate-slide-up" style={{ animationDelay: '200ms' }}>
                  <label className="block text-[11px] font-bold text-(--text-muted) mb-1.5 ml-1 uppercase tracking-wider">Username (@handle)</label>
                  <input
                    value={`@${user?.username || ''}`}
                    disabled
                    className="w-full px-4 py-2.5 bg-(--bg-tertiary) border border-(--border-color) rounded-xl text-sm text-(--text-muted) cursor-not-allowed outline-none opacity-60"
                  />
                </div>

                <div className="animate-slide-up" style={{ animationDelay: '300ms' }}>
                  <label className="block text-[11px] font-bold text-(--text-muted) mb-1.5 ml-1 uppercase tracking-wider">Email</label>
                  <input
                    value={user?.email || ''}
                    disabled
                    className="w-full px-4 py-2.5 bg-(--bg-tertiary) border border-(--border-color) rounded-xl text-sm text-(--text-muted) cursor-not-allowed outline-none opacity-60"
                  />
                  <p className="text-[10px] text-(--text-muted) mt-1.5 ml-1 flex items-center gap-1.5 font-medium italic">
                    <span className="w-1 h-1 rounded-full bg-orange-500/50" />
                    Không thể thay đổi email
                  </p>
                </div>
              </div>
            </div>
          ) : (
            <div className="space-y-4 animate-fade-in">
                <div className="bg-indigo-500/5 border border-indigo-500/10 p-3.5 rounded-xl mb-4">
                  <div className="flex gap-3">
                    <div className="p-2 bg-indigo-500/10 rounded-lg text-indigo-500">
                      <Key className="w-4 h-4" />
                    </div>
                    <div>
                      <h4 className="text-xs font-bold text-(--text-primary) mb-0.5">Bảo mật tài khoản</h4>
                      <p className="text-[10px] text-(--text-muted) leading-relaxed">Mật khẩu mới phải có ít nhất 6 ký tự để đảm bảo an toàn.</p>
                    </div>
                  </div>
                </div>

                <div className="animate-slide-up" style={{ animationDelay: '100ms' }}>
                  <label className="block text-[11px] font-bold text-(--text-muted) mb-1.5 ml-1 uppercase tracking-wider">Mật khẩu hiện tại</label>
                  <input
                    type="password"
                    value={oldPassword}
                    onChange={(e) => setOldPassword(e.target.value)}
                    className="w-full px-4 py-2.5 bg-(--bg-tertiary) border border-(--border-color) rounded-xl text-sm text-(--text-primary) placeholder-(--text-muted) transition-all focus:border-indigo-500/50 focus:ring-2 focus:ring-indigo-500/10 outline-none"
                    placeholder="••••••••"
                  />
                </div>

                <div className="animate-slide-up" style={{ animationDelay: '200ms' }}>
                  <label className="block text-[11px] font-bold text-(--text-muted) mb-1.5 ml-1 uppercase tracking-wider">Mật khẩu mới</label>
                  <input
                    type="password"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    className="w-full px-4 py-2.5 bg-(--bg-tertiary) border border-(--border-color) rounded-xl text-sm text-(--text-primary) placeholder-(--text-muted) transition-all focus:border-indigo-500/50 focus:ring-2 focus:ring-indigo-500/10 outline-none"
                    placeholder="••••••••"
                  />
                </div>

                <div className="animate-slide-up" style={{ animationDelay: '300ms' }}>
                  <label className="block text-[11px] font-bold text-(--text-muted) mb-1.5 ml-1 uppercase tracking-wider">Xác nhận mật khẩu</label>
                  <input
                    type="password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className="w-full px-4 py-2.5 bg-(--bg-tertiary) border border-(--border-color) rounded-xl text-sm text-(--text-primary) placeholder-(--text-muted) transition-all focus:border-indigo-500/50 focus:ring-2 focus:ring-indigo-500/10 outline-none"
                    placeholder="••••••••"
                  />
                </div>
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="p-4 border-t border-(--border-color) bg-(--bg-tertiary)/20 flex gap-2 justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm text-(--text-muted) hover:text-(--text-primary) transition-colors font-bold"
          >
            Hủy
          </button>
          
          {activeTab === 'info' ? (
            <button
                onClick={handleSaveProfile}
                disabled={isSaving || !displayName.trim() || (displayName === (user?.displayName || '') && !selectedFile)}
                className="group relative flex items-center gap-2 px-6 py-2.5 rounded-xl text-sm font-bold text-white transition-all disabled:opacity-50 shadow-indigo-500/20 shadow-xl active:scale-95 overflow-hidden"
                style={{ background: 'var(--accent-gradient)' }}
            >
                <div className="absolute inset-0 bg-white/10 opacity-0 group-hover:opacity-100 transition-opacity" />
                {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4 transition-transform group-hover:scale-110" />}
                Lưu
            </button>
          ) : (
            <button
                onClick={handleUpdatePassword}
                disabled={isSaving || !oldPassword || !newPassword || !confirmPassword}
                className="group relative flex items-center gap-2 px-6 py-2.5 rounded-xl text-sm font-bold text-white transition-all disabled:opacity-50 shadow-indigo-500/20 shadow-xl active:scale-95 overflow-hidden"
                style={{ background: 'var(--accent-gradient)' }}
            >
                <div className="absolute inset-0 bg-white/10 opacity-0 group-hover:opacity-100 transition-opacity" />
                {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Key className="w-4 h-4 transition-transform group-hover:rotate-12" />}
                Đổi mật khẩu
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
