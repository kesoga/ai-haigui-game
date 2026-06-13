import { getLocalStoryBottom } from '../constants/storyBottoms'
import type { TStory } from '../types/game'

const BACKEND_API_URL = '/api/chat'
const STORIES_API_URL = '/api/stories'

interface ChatRequest {
  question: string
  story: Pick<TStory, 'id' | 'surface'>
}

interface ApiResponse {
  status: string
  message?: string
  timestamp?: string
}

interface AuthStatusResponse extends ApiResponse {
  authRequired: boolean
  authenticated: boolean
}

interface ChatResponse extends ApiResponse {
  answer: string
  isFallback?: boolean
  retriesCount?: number
  providerResponseValid?: boolean
  error?: string
}

interface BottomResponse extends ApiResponse {
  storyId: string
  bottom: string
}

interface GuessResponse extends ApiResponse {
  storyId: string
  isCorrect: boolean
  similarity: number
}

async function readJsonResponse<T extends ApiResponse>(response: Response): Promise<T> {
  try {
    return await response.json() as T
  } catch {
    throw new Error(response.ok ? '响应格式错误' : `API 请求失败: ${response.status}`)
  }
}

export async function checkAuthStatus(): Promise<AuthStatusResponse> {
  const response = await fetch('/api/auth/status', {
    credentials: 'include'
  })
  const data = await readJsonResponse<AuthStatusResponse>(response)
  if (!response.ok || data.status !== 'success') {
    throw new Error(data.message || '认证状态检查失败')
  }
  return data
}

export async function loginWithPassword(password: string): Promise<AuthStatusResponse> {
  const response = await fetch('/api/auth/login', {
    method: 'POST',
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ password })
  })
  const data = await readJsonResponse<AuthStatusResponse>(response)
  if (!response.ok || data.status !== 'success') {
    throw new Error(data.message || '访问密码错误')
  }
  return data
}

export async function askAI(
  question: string,
  story: TStory
): Promise<{ answer: string; isFallback: boolean; retriesCount: number; providerResponseValid: boolean }> {
  try {
    const requestBody: ChatRequest = {
      question,
      story: {
        id: story.id,
        surface: story.surface
      }
    }

    const response = await fetch(BACKEND_API_URL, {
      method: 'POST',
      credentials: 'include',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(requestBody)
    })

    if (!response.ok) {
      const errorData = await readJsonResponse<ChatResponse>(response)
      throw new Error(errorData.message || `API 请求失败: ${response.status}`)
    }

    const data = await readJsonResponse<ChatResponse>(response)
    if (data.status !== 'success') {
      throw new Error(data.error || 'AI 回答获取失败')
    }

    return {
      answer: data.answer,
      isFallback: data.isFallback || false,
      retriesCount: data.retriesCount ?? 0,
      providerResponseValid: data.providerResponseValid ?? false
    }
  } catch (error) {
    console.error('API 调用错误:', error)
    return {
      answer: '无关',
      isFallback: true,
      retriesCount: 1,
      providerResponseValid: false
    }
  }
}

export async function getStoryBottom(storyId: string): Promise<string> {
  try {
    const response = await fetch(`${STORIES_API_URL}/${encodeURIComponent(storyId)}/bottom`, {
      credentials: 'include'
    })

    const data = await readJsonResponse<BottomResponse>(response)
    if (!response.ok || data.status !== 'success') {
      throw new Error(data.message || '汤底获取失败')
    }

    return data.bottom
  } catch (error) {
    console.error('汤底获取错误:', error)
    const localBottom = getLocalStoryBottom(storyId)
    if (localBottom) {
      return localBottom
    }
    throw error instanceof Error ? error : new Error('汤底获取失败')
  }
}

export async function submitFinalAnswer(
  storyId: string,
  answer: string
): Promise<{ isCorrect: boolean; similarity: number }> {
  try {
    const response = await fetch(`${STORIES_API_URL}/${encodeURIComponent(storyId)}/guess`, {
      method: 'POST',
      credentials: 'include',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ answer })
    })

    const data = await readJsonResponse<GuessResponse>(response)
    if (!response.ok || data.status !== 'success') {
      throw new Error(data.message || '最终答案提交失败')
    }

    return {
      isCorrect: data.isCorrect,
      similarity: data.similarity
    }
  } catch (error) {
    console.error('最终答案提交错误:', error)
    return {
      isCorrect: false,
      similarity: 0
    }
  }
}
