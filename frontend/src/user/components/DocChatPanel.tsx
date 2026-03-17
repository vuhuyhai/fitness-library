/**
 * DocChatPanel — 360px AI chat panel for document Q&A.
 * Mounts as a flex sibling to the main content area in UserViewerPanel.
 */
import { useRef, useEffect, useState, KeyboardEvent } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { X, Send, MessageCircle, Loader2, AlertCircle, Quote, Trash2 } from 'lucide-react'
import { useDocChatStore } from '../stores/useDocChatStore'
import type { Document, ChatResponse } from '../../types'

// Suggested questions keyed by doc type / cat_id
const SUGGESTED: Record<string, string[]> = {
  workout: [
    'Bài tập này phù hợp trình độ nào?',
    'Tần suất tập luyện được khuyến nghị là bao nhiêu?',
    'Những bài tập nào trong giáo trình này cần thiết bị?',
  ],
  pdf: [
    'Tóm tắt ý chính của tài liệu này là gì?',
    'Có những khuyến nghị cụ thể nào được đưa ra?',
    'Tài liệu này phù hợp với ai?',
  ],
  article: [
    'Điểm quan trọng nhất trong bài này là gì?',
    'Tác giả đưa ra bằng chứng nào?',
    'Tôi nên áp dụng điều này như thế nào?',
  ],
  default: [
    'Tóm tắt nội dung chính cho tôi.',
    'Có lời khuyên thực hành nào không?',
    'Điều quan trọng nhất tôi cần biết là gì?',
  ],
}

function getSuggested(doc: Document): string[] {
  return SUGGESTED[doc.type] ?? SUGGESTED.default
}

interface Props {
  doc: Document
  onClose: () => void
}

export default function DocChatPanel({ doc, onClose }: Props) {
  const [input, setInput] = useState('')
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLTextAreaElement>(null)

  const history = useDocChatStore((s) => s.histories[doc.id] ?? [])
  const loadingDocId = useDocChatStore((s) => s.loadingDocId)
  const error = useDocChatStore((s) => s.error)
  const sendMessage = useDocChatStore((s) => s.sendMessage)
  const clearHistory = useDocChatStore((s) => s.clearHistory)

  const isLoading = loadingDocId === doc.id

  // Scroll to bottom when messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [history])

  // Focus input on mount
  useEffect(() => {
    inputRef.current?.focus()
  }, [])

  async function handleSend(question?: string) {
    const q = (question ?? input).trim()
    if (!q || isLoading) return
    setInput('')
    await sendMessage(doc.id, q)
  }

  function handleKeyDown(e: KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  const suggested = getSuggested(doc)

  return (
    <motion.div
      initial={{ width: 0, opacity: 0 }}
      animate={{ width: 360, opacity: 1 }}
      exit={{ width: 0, opacity: 0 }}
      transition={{ type: 'spring', damping: 28, stiffness: 220, mass: 0.9 }}
      className="flex-shrink-0 flex flex-col border-l border-border/50 bg-surface-2 overflow-hidden"
      style={{ width: 360 }}
    >
      {/* Header */}
      <div className="flex items-center gap-2 px-4 py-3 border-b border-border/50 flex-shrink-0">
        <MessageCircle className="w-4 h-4 text-success" />
        <span className="text-sm font-semibold text-fg-primary flex-1">Chat với tài liệu</span>
        {history.length > 0 && (
          <button
            onClick={() => clearHistory(doc.id)}
            title="Xóa lịch sử chat"
            className="p-1.5 rounded-lg hover:bg-surface-3 text-fg-muted hover:text-danger transition-colors"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        )}
        <button
          onClick={onClose}
          aria-label="Đóng chat"
          className="p-1.5 rounded-lg hover:bg-surface-3 text-fg-muted hover:text-fg-primary transition-colors"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-3 py-3 space-y-3 scroll-smooth">
        {history.length === 0 ? (
          <div className="py-4">
            <p className="text-xs text-fg-muted text-center mb-4">
              Hỏi bất cứ điều gì về tài liệu này
            </p>
            <div className="space-y-2">
              {suggested.map((q) => (
                <button
                  key={q}
                  onClick={() => handleSend(q)}
                  className="w-full text-left text-xs px-3 py-2.5 rounded-xl bg-surface border border-border/50 hover:border-success/40 hover:bg-success/5 text-fg-secondary hover:text-fg-primary transition-colors leading-relaxed"
                >
                  {q}
                </button>
              ))}
            </div>
          </div>
        ) : (
          <>
            {history.map((msg, i) => (
              <ChatBubble key={i} role={msg.role} content={msg.content} />
            ))}
            {isLoading && <TypingIndicator />}
            {error && !isLoading && (
              <motion.div
                initial={{ opacity: 0, y: 4 }}
                animate={{ opacity: 1, y: 0 }}
                className="flex items-start gap-2 px-3 py-2.5 rounded-xl bg-danger/10 border border-danger/20 text-danger"
              >
                <AlertCircle className="w-3.5 h-3.5 mt-0.5 flex-shrink-0" />
                <p className="text-xs leading-relaxed">{error}</p>
              </motion.div>
            )}
          </>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Quick suggestions while chatting */}
      {history.length > 0 && history.length < 4 && !isLoading && (
        <div className="px-3 pb-2 flex gap-1.5 flex-wrap">
          {suggested.slice(0, 2).map((q) => (
            <button
              key={q}
              onClick={() => handleSend(q)}
              className="text-[10px] px-2.5 py-1 rounded-full bg-surface border border-border/50 hover:border-success/40 text-fg-muted hover:text-success transition-colors whitespace-nowrap max-w-[160px] truncate"
            >
              {q}
            </button>
          ))}
        </div>
      )}

      {/* Input */}
      <div className="flex-shrink-0 px-3 pb-3 pt-1 border-t border-border/40">
        <div className="flex items-end gap-2 bg-surface border border-border/50 rounded-xl px-3 py-2 focus-within:border-success/50 transition-colors">
          <textarea
            ref={inputRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Nhập câu hỏi... (Enter để gửi)"
            disabled={isLoading}
            rows={1}
            className="flex-1 bg-transparent text-xs text-fg-primary placeholder:text-fg-muted resize-none focus:outline-none min-h-[20px] max-h-[80px] leading-relaxed"
            style={{ overflowY: 'auto' }}
          />
          <button
            onClick={() => handleSend()}
            disabled={!input.trim() || isLoading}
            className="flex-shrink-0 p-1.5 rounded-lg bg-success text-white disabled:opacity-40 hover:bg-success/90 active:scale-95 transition-all"
          >
            {isLoading ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <Send className="w-3.5 h-3.5" />
            )}
          </button>
        </div>
        <p className="text-[10px] text-fg-muted mt-1.5 text-center">
          AI chỉ trả lời dựa trên nội dung tài liệu này
        </p>
      </div>
    </motion.div>
  )
}

// ─── Chat Bubble ──────────────────────────────────────────────────────────────

interface BubbleProps {
  role: 'user' | 'assistant'
  content: string
  citations?: string[]
}

function ChatBubble({ role, content }: BubbleProps) {
  // Parse citations from assistant messages (they come as part of ChatResponse but
  // we stored only content — extract quoted text with > prefix if any)
  const isUser = role === 'user'

  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2 }}
      className={`flex ${isUser ? 'justify-end' : 'justify-start'}`}
    >
      <div
        className={`max-w-[85%] rounded-2xl px-3 py-2.5 text-xs leading-relaxed ${
          isUser
            ? 'bg-success text-white rounded-br-sm'
            : 'bg-surface border border-border/50 text-fg-primary rounded-bl-sm'
        }`}
      >
        {content}
      </div>
    </motion.div>
  )
}

// ─── Citation Card ────────────────────────────────────────────────────────────

function CitationCard({ text }: { text: string }) {
  return (
    <div className="flex items-start gap-1.5 px-2.5 py-2 rounded-lg bg-info/8 border border-info/20 mt-1.5">
      <Quote className="w-3 h-3 text-info flex-shrink-0 mt-0.5" />
      <p className="text-[10px] text-fg-secondary italic leading-relaxed">{text}</p>
    </div>
  )
}

// ─── Typing Indicator ─────────────────────────────────────────────────────────

function TypingIndicator() {
  return (
    <motion.div
      initial={{ opacity: 0, y: 4 }}
      animate={{ opacity: 1, y: 0 }}
      className="flex justify-start"
    >
      <div className="bg-surface border border-border/50 rounded-2xl rounded-bl-sm px-4 py-3 flex items-center gap-1">
        {[0, 1, 2].map((i) => (
          <motion.span
            key={i}
            className="block w-1.5 h-1.5 rounded-full bg-fg-muted"
            animate={{ y: [0, -4, 0] }}
            transition={{ duration: 0.6, repeat: Infinity, delay: i * 0.15 }}
          />
        ))}
      </div>
    </motion.div>
  )
}
