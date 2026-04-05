// 消息组件，用于显示单条聊天消息
interface MessageProps {
  message: {
    role: 'user' | 'ai'
    content: string
  }
  isLoading?: boolean
}

// 漫画风格气泡组件
function ComicBubble({ children, isUser }: { children: React.ReactNode; isUser: boolean }) {
  return (
    <div className={`relative ${isUser ? 'flex justify-end' : 'flex'}`}>
      {/* 漫画气泡 */}
      <div className={`relative max-w-[85%] ${isUser ? 'order-2' : 'order-1'}`}>
        {/* 气泡主体 */}
        <div className={`relative rounded-2xl p-4 shadow-xl ${isUser ? 'bg-amber-100 text-slate-950' : 'bg-slate-800 text-slate-200'}`}>
          {/* 黄色条纹边框 */}
          <div className="absolute inset-0 rounded-2xl border-4 border-double border-amber-400" style={{ borderRadius: '1.5rem' }}></div>
          
          {/* 气泡内容 */}
          <div className="relative z-10">
            {children}
          </div>
          
          {/* 气泡尾巴 */}
          <div className={`absolute ${isUser ? 'right-6 bottom-2' : 'left-6 bottom-2'}`}>
            <div className={`w-0 h-0 border-l-8 border-r-8 border-t-12 ${isUser ? 'border-l-transparent border-r-amber-100 border-t-transparent' : 'border-l-slate-800 border-r-transparent border-t-transparent'}`}>
              <div className="absolute -top-12 ${isUser ? '-left-8 -right-4' : '-left-4 -right-8'}">
                <div className={`w-0 h-0 border-l-6 border-r-6 border-t-10 ${isUser ? 'border-l-transparent border-r-amber-400 border-t-transparent' : 'border-l-slate-700 border-r-transparent border-t-transparent'}`}></div>
              </div>
            </div>
          </div>
          
          {/* 装饰性条纹 */}
          <div className="absolute inset-0 rounded-2xl overflow-hidden pointer-events-none">
            <div className="absolute top-0 left-0 right-0 h-1 bg-amber-300 opacity-30"></div>
            <div className="absolute bottom-0 left-0 right-0 h-1 bg-amber-300 opacity-30"></div>
            <div className="absolute top-0 bottom-0 left-0 w-1 bg-amber-300 opacity-30"></div>
            <div className="absolute top-0 bottom-0 right-0 w-1 bg-amber-300 opacity-30"></div>
          </div>
        </div>
        
        {/* 装饰性圆点 */}
        <div className={`absolute ${isUser ? 'top-2 right-2' : 'top-2 left-2'} w-2 h-2 rounded-full bg-amber-400`}></div>
        <div className={`absolute ${isUser ? 'bottom-2 left-2' : 'bottom-2 right-2'} w-2 h-2 rounded-full bg-amber-400`}></div>
      </div>
    </div>
  )
}

export function Message({ message, isLoading = false }: MessageProps) {
  const isUser = message.role === 'user'

  return (
    <div className={`flex items-start gap-3 mb-6 animate-messageIn ${isUser ? 'justify-end' : 'justify-start'}`}>
      {/* 头像/图标 */}
      <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${isUser ? 'bg-amber-400' : 'bg-slate-700'} transition-transform duration-300 hover:scale-110`}>
        <span className={`text-sm font-bold ${isUser ? 'text-slate-950' : 'text-slate-200'}`}>
          {isUser ? '你' : 'AI'}
        </span>
      </div>

      {/* 漫画气泡 */}
      <ComicBubble isUser={isUser}>
        {isLoading ? (
          <div className="flex items-center space-x-2">
            <div className="w-2 h-2 bg-slate-600 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
            <div className="w-2 h-2 bg-slate-600 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
            <div className="w-2 h-2 bg-slate-600 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
          </div>
        ) : (
          <p className="text-sm leading-relaxed transition-all duration-300 hover:opacity-90">{message.content}</p>
        )}
      </ComicBubble>
    </div>
  )
}
