import React, { useState, useRef, useEffect } from 'react'
import { Message } from './Message'

interface ChatBoxProps {
  messages: Array<{
    role: 'user' | 'ai'
    content: string
  }>
  onSend: (message: string) => void
  isLoading?: boolean
  disabled?: boolean
}

export function ChatBox({ messages, onSend, isLoading = false, disabled = false }: ChatBoxProps) {
  const [input, setInput] = useState('')
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  
  // 自动滚动到底部
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  // 输入框自动聚焦
  useEffect(() => {
    if (!disabled && !isLoading) {
      inputRef.current?.focus()
    }
  }, [disabled, isLoading])
  
  const handleSend = () => {
    if (input.trim() && !disabled && !isLoading) {
      onSend(input.trim())
      setInput('')
    }
  }
  
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }



  return (
    <div className="flex h-full flex-col">
      {/* 消息列表 */}
      <div className="case-chat-scroll flex-1 space-y-4 overflow-y-auto p-4">
        {messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center">
            <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full border border-amber-200/20 bg-stone-950/80 shadow-[0_0_30px_rgba(245,158,11,0.14)] animate-pulse">
              <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-amber-400">
                <circle cx="12" cy="12" r="10"></circle>
                <path d="M12 16v-4"></path>
                <path d="M12 8h.01"></path>
              </svg>
            </div>
            <p className="text-sm text-stone-300">开始提问吧</p>
            <p className="mt-1 text-xs text-stone-500">裁判只留下三种回答</p>
          </div>
        ) : (
          <>
            {messages.map((message, index) => (
              <Message key={index} message={message} isLoading={isLoading && index === messages.length - 1 && message.content === '思考中...'} />
            ))}
            <div ref={messagesEndRef} />
          </>
        )}
      </div>
      
      {/* 输入区域 */}
      <div className="border-t border-amber-100/10 bg-stone-950/50 p-4">
        {disabled ? (
          <div className="flex items-center justify-center py-3 text-sm text-stone-500">
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mr-2">
              <circle cx="12" cy="12" r="10"></circle>
              <line x1="12" y1="8" x2="12" y2="12"></line>
              <line x1="12" y1="16" x2="12.01" y2="16"></line>
            </svg>
            游戏已结束，无法继续提问
          </div>
        ) : (
          <div className="flex gap-3">
            <input
              ref={inputRef}
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="输入你的问题..."
              disabled={disabled || isLoading}
              className="flex-1 rounded-lg border border-amber-100/15 bg-black/40 px-4 py-3 text-stone-100 placeholder-stone-500 transition-all focus:border-amber-300/70 focus:outline-none focus:ring-1 focus:ring-amber-300/40 disabled:cursor-not-allowed disabled:opacity-50"
            />
            <button
              onClick={handleSend}
              disabled={!input.trim() || disabled || isLoading}
              className={`rounded-lg px-4 py-3 text-sm font-semibold transition-all ${!input.trim() || disabled || isLoading ? 'cursor-not-allowed bg-stone-800 text-stone-500' : 'bg-amber-300 text-stone-950 hover:bg-amber-200 hover:scale-105 active:scale-95'}`}
            >
              {isLoading ? (
                <span className="flex items-center">
                  <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-slate-400" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  发送中
                </span>
              ) : (
                <span className="flex items-center">
                  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mr-1">
                    <line x1="22" y1="2" x2="11" y2="13"></line>
                    <polygon points="22 2 15 22 11 13 2 9 22 2"></polygon>
                  </svg>
                  发送
                </span>
              )}
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
