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
  
  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }



  return (
    <div className="flex flex-col h-full">
      {/* 消息列表 */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center">
            <div className="w-16 h-16 rounded-full bg-slate-800 flex items-center justify-center mb-4 animate-pulse">
              <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-amber-400">
                <circle cx="12" cy="12" r="10"></circle>
                <path d="M12 16v-4"></path>
                <path d="M12 8h.01"></path>
              </svg>
            </div>
            <p className="text-slate-400 text-sm">开始提问吧！</p>
            <p className="text-slate-500 text-xs mt-1">我会用「是」、「否」或「无关」来回答</p>
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
      <div className="border-t border-slate-700 p-4">
        {disabled ? (
          <div className="flex items-center justify-center py-3 text-slate-500 text-sm">
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
              onKeyPress={handleKeyPress}
              placeholder="输入你的问题..."
              disabled={disabled || isLoading}
              className="flex-1 rounded-lg border border-slate-700 bg-slate-950 px-4 py-3 text-slate-200 placeholder-slate-500 focus:border-amber-400 focus:outline-none focus:ring-1 focus:ring-amber-400/50 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            />
            <button
              onClick={handleSend}
              disabled={!input.trim() || disabled || isLoading}
              className={`rounded-lg px-4 py-3 text-sm font-semibold transition-all ${!input.trim() || disabled || isLoading ? 'bg-slate-700 text-slate-400 cursor-not-allowed' : 'bg-amber-400 text-slate-950 hover:bg-amber-300 hover:scale-105 active:scale-95'}`}
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
