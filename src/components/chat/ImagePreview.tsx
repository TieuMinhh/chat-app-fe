'use client';

import { useEffect } from 'react';
import { X, Download } from 'lucide-react';

interface ImagePreviewProps {
  imageUrl: string;
  onClose: () => void;
}

export function ImagePreview({ imageUrl, onClose }: ImagePreviewProps) {
  // Close on escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  const handleDownload = () => {
    const link = document.createElement('a');
    link.href = imageUrl;
    link.download = 'image';
    link.target = '_blank';
    link.click();
  };

  return (
    <div
      className="fixed inset-0 z-60 flex items-center justify-center bg-black/90 backdrop-blur-sm animate-fade-in"
      onClick={onClose}
    >
      {/* Controls */}
      <div className="absolute top-4 right-4 flex items-center gap-2 z-10">
        <button
          onClick={(e) => { e.stopPropagation(); handleDownload(); }}
          className="p-2.5 rounded-full bg-white/10 text-white hover:bg-white/20 transition-all"
          title="Tải xuống"
        >
          <Download className="w-5 h-5" />
        </button>
        <button
          onClick={onClose}
          className="p-2.5 rounded-full bg-white/10 text-white hover:bg-white/20 transition-all"
          title="Đóng"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* Image */}
      <img
        src={imageUrl}
        alt="Preview"
        className="max-w-[90vw] max-h-[90vh] object-contain rounded-lg shadow-2xl animate-slide-up"
        onClick={(e) => e.stopPropagation()}
      />
    </div>
  );
}
