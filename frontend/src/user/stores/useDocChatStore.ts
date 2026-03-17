import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { api } from '../../lib/wailsApi'
import type { ChatMessage, ChatResponse } from '../../types'

const MAX_HISTORY = 20   // messages kept in localStorage per doc
const SEND_HISTORY = 6  // messages sent to AI per request

interface DocChatState {
  /** Per-doc chat histories: { [docId]: ChatMessage[] } */
  histories: Record<string, ChatMessage[]>
  /** Currently loading docId (null = idle) */
  loadingDocId: string | null
  error: string | null
}

interface DocChatActions {
  sendMessage: (docId: string, question: string) => Promise<ChatResponse | null>
  clearHistory: (docId: string) => void
  getHistory: (docId: string) => ChatMessage[]
}

export const useDocChatStore = create<DocChatState & DocChatActions>()(
  persist(
    (set, get) => ({
      histories: {},
      loadingDocId: null,
      error: null,

      getHistory: (docId: string) => get().histories[docId] ?? [],

      sendMessage: async (docId: string, question: string) => {
        const state = get()
        if (state.loadingDocId) return null // prevent concurrent sends

        const currentHistory = state.histories[docId] ?? []

        // Optimistically add user message
        const userMsg: ChatMessage = { role: 'user', content: question }
        const updatedHistory = [...currentHistory, userMsg]
        set(s => ({
          loadingDocId: docId,
          error: null,
          histories: { ...s.histories, [docId]: updatedHistory },
        }))

        try {
          // Trim to last SEND_HISTORY for API call
          const trimmed = updatedHistory.slice(-SEND_HISTORY)
          const response = await api.chatWithDocument(docId, question, trimmed)

          const assistantMsg: ChatMessage = { role: 'assistant', content: response.answer }
          const withReply = [...updatedHistory, assistantMsg]
          // Cap at MAX_HISTORY
          const capped = withReply.length > MAX_HISTORY
            ? withReply.slice(withReply.length - MAX_HISTORY)
            : withReply

          set(s => ({
            loadingDocId: null,
            histories: { ...s.histories, [docId]: capped },
          }))
          return response
        } catch (err) {
          const msg = err instanceof Error ? err.message : String(err)
          set(s => ({
            loadingDocId: null,
            error: msg,
            // Remove the optimistic user message on error
            histories: { ...s.histories, [docId]: currentHistory },
          }))
          return null
        }
      },

      clearHistory: (docId: string) => {
        set(s => {
          const next = { ...s.histories }
          delete next[docId]
          return { histories: next }
        })
      },
    }),
    {
      name: 'doc-chat-histories',
      partialize: (state) => ({ histories: state.histories }),
    },
  ),
)
