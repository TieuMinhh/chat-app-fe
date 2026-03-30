import { MessageSquare } from 'lucide-react';

export default function ChatDefaultPage() {
  return (
    <div className="flex-1 flex items-center justify-center bg-(--bg-primary)">
      <div className="text-center animate-fade-in">
        <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-white/5 mb-6">
          <MessageSquare className="w-10 h-10 text-gray-600" />
        </div>
        <h2 className="text-xl font-semibold text-gray-400 mb-2">
          Chào mừng đến MessengerClone
        </h2>
        <p className="text-gray-600 text-sm max-w-sm">
          Chọn một cuộc trò chuyện bên trái hoặc bắt đầu cuộc trò chuyện mới
        </p>
      </div>
    </div>
  );
}
