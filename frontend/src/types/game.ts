export type TTriAnswer = '是' | '否' | '无关'

export type TDifficulty = '简单' | '中等' | '困难'

export type TGameType = '时间线' | '人物' | '事件'

export interface TStory {
  id: string
  title: string
  difficulty: TDifficulty
  surface: string
  bottom: string
  type: TGameType
  preview: string
  soupPrompt: string
}

export interface TAskRecord {
  id: string
  question: string
  answer: TTriAnswer
  timestamp: string
  retriesCount: number
}

export interface TGameSessionState {
  sessionId: string
  storyId: string
  askedCount: number
  maxQuestions: number
  isBottomRevealed: boolean
  records: TAskRecord[]
}
