export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-950 relative overflow-hidden">
      {/* Background gradient orbs */}
      <div className="absolute top-[-20%] left-[-10%] w-[500px] h-[500px] rounded-full bg-indigo-600/10 blur-[120px]" />
      <div className="absolute bottom-[-20%] right-[-10%] w-[500px] h-[500px] rounded-full bg-purple-600/10 blur-[120px]" />

      <div className="relative z-10 w-full max-w-md px-4">
        {/* Logo */}
        <div className="text-center mb-8 animate-fade-in">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-linear-to-br from-indigo-500 to-purple-600 mb-4 shadow-lg shadow-indigo-500/20">
            <svg className="w-8 h-8 text-white" fill="currentColor" viewBox="0 0 24 24">
              <path d="M12 2C6.48 2 2 6.04 2 11c0 2.62 1.24 4.98 3.18 6.61L4 22l4.5-2.5C9.6 19.8 10.78 20 12 20c5.52 0 10-4.04 10-9S17.52 2 12 2zm1 13h-2v-2h2v2zm0-4h-2V7h2v4z"/>
            </svg>
          </div>
          <h1 className="text-2xl font-bold text-white">MessengerClone</h1>
          <p className="text-gray-500 text-sm mt-1">Chat realtime cùng bạn bè</p>
        </div>

        {/* Card */}
        <div className="glass rounded-2xl border border-white/5 p-8 shadow-2xl animate-slide-up">
          {children}
        </div>
      </div>
    </div>
  );
}
