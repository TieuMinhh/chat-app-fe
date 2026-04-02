'use client';

import { useTheme } from 'next-themes';
import { useEffect, useState } from 'react';
import { Sun, Moon } from 'lucide-react';

export function ThemeToggle() {
  const { setTheme, resolvedTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  const isDark = resolvedTheme === 'dark';

  // Tránh lỗi hydration mismatch (pattern chuẩn của Next.js cho Theme)
  useEffect(() => {
    // Sử dụng Promise để tránh cảnh báo "synchronous setState" của ESLint
    Promise.resolve().then(() => setMounted(true));
  }, []);

  if (!mounted) return (
    <div className="w-11 h-6 bg-(--bg-tertiary) rounded-full animate-pulse opacity-50" />
  );

  return (
    <button
      onClick={() => setTheme(isDark ? 'light' : 'dark')}
      className={`
        group relative inline-flex h-6 w-11 shrink-0 cursor-pointer items-center rounded-full 
        transition-all duration-300 ease-in-out focus:outline-none
        ${isDark ? 'bg-indigo-500/20 shadow-[inset_0_2px_4px_rgba(0,0,0,0.3)]' : 'bg-gray-200 shadow-[inset_0_2px_4px_rgba(0,0,0,0.1)]'}
      `}
      aria-label="Toggle Theme"
    >
      {/* Background Track Icons */}
      <div className="absolute inset-0 flex items-center justify-between px-1.5 pointer-events-none">
        <Moon className={`w-3 h-3 transition-all duration-300 ${isDark ? 'text-indigo-400 opacity-100' : 'text-gray-400 opacity-0'}`} />
        <Sun className={`w-3 h-3 transition-all duration-300 ${isDark ? 'text-gray-600 opacity-0' : 'text-yellow-500 opacity-100'}`} />
      </div>

      {/* Sliding Thumb */}
      <span
        className={`
          pointer-events-none flex h-5 w-5 transform items-center justify-center rounded-full 
          bg-white shadow-lg ring-0 transition-all duration-300 ease-[cubic-bezier(0.34,1.56,0.64,1)]
          ${isDark ? 'translate-x-5.5' : 'translate-x-0.5'}
        `}
      >
        {isDark ? (
          <Moon className="w-3 h-3 text-indigo-600 animate-in fade-in zoom-in duration-300" />
        ) : (
          <Sun className="w-3 h-3 text-yellow-500 animate-in fade-in zoom-in duration-300" />
        )}
      </span>
    </button>
  );
}
