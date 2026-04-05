import type { TStory } from '../types/game'

// 后端API配置
const BACKEND_API_URL = '/api/chat'

interface ChatRequest {
  question: string
  story: TStory
}

interface ChatResponse {
  status: string
  answer: string
  isFallback?: boolean
  timestamp: string
  error?: string
}

/**
 * 调用后端AI API获取回答
 * @param question 用户问题
 * @param story 当前故事
 * @returns AI回答和是否使用了默认回答
 */
export async function askAI(question: string, story: TStory): Promise<{ answer: string; isFallback: boolean }> {
  try {
    const requestBody: ChatRequest = {
      question,
      story
    }

    const response = await fetch(BACKEND_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(requestBody)
    })

    if (!response.ok) {
      const errorData = await response.json()
      throw new Error(errorData.message || `API请求失败: ${response.status}`)
    }

    const data: ChatResponse = await response.json()
    
    if (data.status !== 'success') {
      throw new Error(data.error || 'AI回答获取失败')
    }

    return {
      answer: data.answer,
      isFallback: data.isFallback || false
    }
  } catch (error) {
    console.error('API调用错误:', error)
    throw error instanceof Error ? error : new Error('AI回答获取失败，请重试')
  }
}
