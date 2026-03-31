'use client';

import { useState, useRef } from 'react';
import { useAuthStore } from '@/stores/authStore';
import api from '@/lib/axios';
import { X, Camera, Loader2, Save } from 'lucide-react';
import toast from 'react-hot-toast';
import { AxiosError } from 'axios';

interface ProfileModalProps {
  onClose: () => void;
}

export function ProfileModal({ onClose }: ProfileModalProps) {
  const { user, setUser } = useAuthStore();
  const [displayName, setDisplayName] = useState(user?.displayName || '');
  const [avatarPreview, setAvatarPreview] = useState<string | null>(user?.avatar || null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
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

  const handleSave = async () => {
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

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm animate-fade-in">
      <div className="w-full max-w-sm mx-4 bg-(--bg-secondary) rounded-2xl border border-white/5 shadow-2xl animate-slide-up overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-white/5">
          <h3 className="text-base font-semibold text-white">Thông tin cá nhân</h3>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-gray-500 hover:text-white hover:bg-white/5 transition-all"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6">
          <div className="flex flex-col items-center">
            {/* Avatar picker */}
            <div 
              className="relative w-24 h-24 mb-6 cursor-pointer group rounded-full overflow-hidden border-2 border-(--bg-tertiary)"
              onClick={handleAvatarClick}
            >
              {avatarPreview ? (
                <img src={avatarPreview} alt="Avatar" className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full bg-linear-to-br from-indigo-500/20 to-purple-500/20 flex items-center justify-center text-indigo-400 text-3xl font-semibold">
                  {user?.username?.[0]?.toUpperCase()}
                </div>
              )}
              
              <div className="absolute inset-0 bg-black/50 flex flex-col items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                <Camera className="w-6 h-6 text-white mb-1" />
                <span className="text-[10px] text-white/90">Đổi ảnh</span>
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
              <div>
                <label className="block text-xs text-gray-400 mb-1.5 ml-1">Tên hiển thị</label>
                <input
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  className="w-full px-4 py-2.5 bg-white/5 border border-white/5 rounded-xl text-sm text-white placeholder-gray-600 transition-all focus:border-indigo-500/30 outline-none"
                  placeholder="Nhập tên hiển thị"
                />
              </div>

              <div>
                <label className="block text-xs text-gray-400 mb-1.5 ml-1">Username (@handle)</label>
                <input
                  value={`@${user?.username || ''}`}
                  disabled
                  className="w-full px-4 py-2.5 bg-white/5 border border-white/5 rounded-xl text-sm text-gray-500 cursor-not-allowed outline-none"
                />
              </div>

              <div>
                <label className="block text-xs text-gray-400 mb-1.5 ml-1">Email</label>
                <input
                  value={user?.email || ''}
                  disabled
                  className="w-full px-4 py-2.5 bg-white/5 border border-white/5 rounded-xl text-sm text-gray-500 cursor-not-allowed outline-none"
                />
                <p className="text-[10px] text-gray-500 mt-1 ml-1">Không thể thay đổi email</p>
              </div>
            </div>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="p-4 border-t border-white/5 bg-black/20 flex gap-2 justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm text-gray-400 hover:text-white transition-colors"
          >
            Hủy
          </button>
          <button
            onClick={handleSave}
            disabled={isSaving || !displayName.trim()}
            className="flex items-center gap-2 px-5 py-2 rounded-xl text-sm font-medium text-white transition-all disabled:opacity-50"
            style={{ background: 'var(--accent-gradient)' }}
          >
            {isSaving ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Save className="w-4 h-4" />
            )}
            Lưu
          </button>
        </div>
      </div>
    </div>
  );
}
