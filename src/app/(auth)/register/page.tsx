'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import api from '@/lib/axios';
import { useAuthStore } from '@/stores/authStore';
import toast from 'react-hot-toast';
import { Eye, EyeOff, Loader2, Mail, Lock, User } from 'lucide-react';
import { AxiosError } from 'axios';

const registerSchema = z.object({
  username: z
    .string()
    .min(3, 'Username ít nhất 3 ký tự')
    .max(30, 'Username tối đa 30 ký tự')
    .regex(/^[a-zA-Z0-9_]+$/, 'Username chỉ chứa chữ, số và dấu _'),
  email: z.string().email('Email không hợp lệ'),
  password: z.string().min(6, 'Mật khẩu ít nhất 6 ký tự'),
  confirmPassword: z.string(),
}).refine((data) => data.password === data.confirmPassword, {
  message: 'Mật khẩu không khớp',
  path: ['confirmPassword'],
});

type RegisterForm = z.infer<typeof registerSchema>;

export default function RegisterPage() {
  const router = useRouter();
  const { setAuth } = useAuthStore();
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const {
    register: formRegister,
    handleSubmit,
    formState: { errors },
  } = useForm<RegisterForm>({
    resolver: zodResolver(registerSchema),
  });

  const onSubmit = async (data: RegisterForm) => {
    setIsLoading(true);
    try {
      const res = await api.post('/auth/register', {
        username: data.username,
        email: data.email,
        password: data.password,
      });
      const { user, accessToken } = res.data.data;
      setAuth(user, accessToken);
      toast.success('Đăng ký thành công!');
      router.push('/chat');
    } catch (error) {
      const axiosError = error as AxiosError<{ error: { message: string } }>;
      const message = axiosError.response?.data?.error?.message || 'Đăng ký thất bại';
      toast.error(message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div>
      <h2 className="text-xl font-semibold text-(--text-primary) mb-6">Tạo tài khoản</h2>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        {/* Username */}
        <div>
          <div className="relative">
            <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-(--text-muted)" />
            <input
              {...formRegister('username')}
              type="text"
              placeholder="Username"
              className="w-full pl-10 pr-4 py-3 bg-(--bg-tertiary) border border-(--border-color) rounded-xl text-(--text-primary) placeholder-(--text-muted) transition-all focus:border-(--accent-primary)/50 outline-none"
            />
          </div>
          {errors.username && (
            <p className="text-red-400 text-xs mt-1">{errors.username.message}</p>
          )}
        </div>

        {/* Email */}
        <div>
          <div className="relative">
            <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-(--text-muted)" />
            <input
              {...formRegister('email')}
              type="email"
              placeholder="Email"
              className="w-full pl-10 pr-4 py-3 bg-(--bg-tertiary) border border-(--border-color) rounded-xl text-(--text-primary) placeholder-(--text-muted) transition-all focus:border-(--accent-primary)/50 outline-none"
            />
          </div>
          {errors.email && (
            <p className="text-red-400 text-xs mt-1">{errors.email.message}</p>
          )}
        </div>

        {/* Password */}
        <div>
          <div className="relative">
            <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-(--text-muted)" />
            <input
              {...formRegister('password')}
              type={showPassword ? 'text' : 'password'}
              placeholder="Mật khẩu"
              className="w-full pl-10 pr-12 py-3 bg-(--bg-tertiary) border border-(--border-color) rounded-xl text-(--text-primary) placeholder-(--text-muted) transition-all focus:border-(--accent-primary)/50 outline-none"
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-(--text-muted) hover:text-(--text-primary) transition-colors"
            >
              {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          </div>
          {errors.password && (
            <p className="text-red-400 text-xs mt-1">{errors.password.message}</p>
          )}
        </div>

        {/* Confirm Password */}
        <div>
          <div className="relative">
            <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-(--text-muted)" />
            <input
              {...formRegister('confirmPassword')}
              type={showPassword ? 'text' : 'password'}
              placeholder="Nhập lại mật khẩu"
              className="w-full pl-10 pr-4 py-3 bg-(--bg-tertiary) border border-(--border-color) rounded-xl text-(--text-primary) placeholder-(--text-muted) transition-all focus:border-(--accent-primary)/50 outline-none"
            />
          </div>
          {errors.confirmPassword && (
            <p className="text-red-400 text-xs mt-1">{errors.confirmPassword.message}</p>
          )}
        </div>

        {/* Submit */}
        <button
          type="submit"
          disabled={isLoading}
          className="w-full py-3 rounded-xl font-medium text-white transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed"
          style={{ background: 'var(--accent-gradient)' }}
        >
          {isLoading ? (
            <Loader2 className="w-5 h-5 animate-spin mx-auto" />
          ) : (
            'Đăng ký'
          )}
        </button>
      </form>

      <p className="text-center text-(--text-muted) text-sm mt-6">
        Đã có tài khoản?{' '}
        <Link href="/login" className="text-(--accent-primary) hover:underline font-semibold transition-colors">
          Đăng nhập
        </Link>
      </p>
    </div>
  );
}
