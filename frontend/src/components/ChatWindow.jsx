import React, { useRef, useEffect, useState, useCallback } from 'react'
import MessageBubble from './MessageBubble.jsx'
import { askAI } from '../services/api.js'

/**
 * ChatWindow
 * ----------
 * Self-contained ChatGPT-style interface that manages its own message history
 * and calls askAI() from the API service layer.
 *
 * Props:
 *   onResponse?       {Function}  - called with the full AskAIResponse after each
 *                                   successful API call — lets Dashboard sync SQL /
 *                                   chart / insight state without prop-drilling.
 *   sendRef?          {React.MutableRefObject} - Dashboard can assign a send fn here
 *                                   to programmatically submit queries (e.g. from
 *                                   the Suggestions sidebar).
 *   initialMessages?  {Array}     - seed messages (e.g. a welcome card)
 *   suggestions?      {string[]}  - suggestion chips rendered in the empty state
 */
export default function ChatWindow({ onResponse, sendRef, initialMessages = [], suggestions = [] }) {
  const [messages,  setMessages]  = useState(initialMessages)
  const [input,     setInput]     = useState('')
  const [isLoading, setIsLoading] = useState(false)

  const bottomRef   = useRef(null)
  const textareaRef = useRef(null)

  // ── Auto-scroll on new message or typing indicator ──────────────────────────
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, isLoading])

  // ── Auto-grow textarea ───────────────────────────────────────────────────────
  useEffect(() => {
    const el = textareaRef.current
    if (!el) return
    el.style.height = 'auto'
    el.style.height = `${Math.min(el.scrollHeight, 160)}px`
  }, [input])

  // ── Expose send fn via ref so Dashboard/Suggestions can trigger queries ─────
  useEffect(() => {
    if (sendRef) sendRef.current = (text) => handleSend(text)
  }) // no deps — keeps the ref fresh every render


  // ── Send handler ─────────────────────────────────────────────────────────────
  const handleSend = useCallback(async (text) => {
    const query = (text ?? input).trim()
    if (!query || isLoading) return

    // 1. Append user message immediately
    const userMsg = {
      id:        `u-${Date.now()}`,
      role:      'user',
      content:   query,
      timestamp: new Date(),
    }
    setMessages(prev => [...prev, userMsg])
    setInput('')
    setIsLoading(true)

    // 2. Call the API
    try {
      const result = await askAI(query)

      // Build the assistant message from the structured response
      const assistantMsg = {
        id:             `a-${Date.now()}`,
        role:           'assistant',
        // `content` is the fallback plain text; rich fields take precedence in MessageBubble
        content:        result.explanation || result.insight || '(no explanation returned)',
        explanation:    result.explanation,
        sql:            result.sql,
        chart:          result.chart,
        insight:        result.insight,
        recommendation: result.recommendation,
        rowCount:       Array.isArray(result.data) ? result.data.length : undefined,
        timestamp:      new Date(),
      }

      setMessages(prev => [...prev, assistantMsg])

      // Bubble the full result up to Dashboard so it can update SQL/chart panels
      onResponse?.(result)
    } catch (err) {
      const errorMsg = {
        id:        `e-${Date.now()}`,
        role:      'error',
        content:   err?.message ?? 'Something went wrong. Please try again.',
        timestamp: new Date(),
      }
      setMessages(prev => [...prev, errorMsg])
    } finally {
      setIsLoading(false)
    }
  }, [input, isLoading, onResponse])

  // ── Keyboard submit (Enter = send, Shift+Enter = newline) ────────────────────
  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  const handleFormSubmit = (e) => {
    e.preventDefault()
    handleSend()
  }

  // ── Clear history ────────────────────────────────────────────────────────────
  const handleClear = () => {
    if (isLoading) return
    setMessages([])
  }

  // ── Render ───────────────────────────────────────────────────────────────────
  return (
    <section className="flex flex-col h-full glass rounded-xl overflow-hidden">

      {/* ══ Header ══ */}
      <header className="flex items-center gap-3 px-5 py-3 border-b border-panel-border shrink-0">
        <span className="status-dot online animate-pulse-slow" />
        <h2 className="label-mono">agent chat</h2>

        <div className="flex items-center gap-2 ml-auto">
          <span className="font-mono text-xs text-text-muted">
            {messages.filter(m => m.role !== 'system').length} message{messages.length !== 1 ? 's' : ''}
          </span>
          {messages.length > 0 && !isLoading && (
            <button
              onClick={handleClear}
              className="label-mono px-2 py-0.5 rounded border border-panel-border hover:border-accent-red/40 hover:text-accent-red transition-colors duration-150"
              title="Clear conversation"
            >
              clear
            </button>
          )}
        </div>
      </header>

      {/* ══ Message list ══ */}
      <div className="flex-1 overflow-y-auto px-4 py-5 space-y-5 min-h-0">

        {/* Empty state */}
        {messages.length === 0 && !isLoading && (
          <EmptyState suggestions={suggestions} onSuggest={handleSend} />
        )}

        {/* Messages */}
        {messages.map(msg => (
          <MessageBubble key={msg.id} message={msg} />
        ))}

        {/* Typing / thinking indicator */}
        {isLoading && <TypingIndicator />}

        {/* Scroll anchor */}
        <div ref={bottomRef} />
      </div>

      {/* ══ Input bar ══ */}
      <form
        onSubmit={handleFormSubmit}
        className="shrink-0 border-t border-panel-border bg-surface-100 px-4 py-3 flex gap-3 items-end"
      >
        <div className="relative flex-1">
          <textarea
            ref={textareaRef}
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Ask a question about your data…"
            rows={1}
            disabled={isLoading}
            className={[
              'w-full resize-none bg-surface-50 border border-panel-border rounded-xl',
              'px-4 py-2.5 pr-10 font-mono text-sm text-text-primary placeholder-text-muted',
              'focus:outline-none focus:border-accent-cyan focus:shadow-glow-sm',
              'transition-all duration-200 disabled:opacity-50 leading-relaxed',
            ].join(' ')}
          />
          {/* Character hint */}
          {input.length > 0 && (
            <span className="absolute bottom-2 right-3 font-mono text-[9px] text-text-muted pointer-events-none">
              ⏎
            </span>
          )}
        </div>

        <button
          type="submit"
          disabled={!input.trim() || isLoading}
          className={[
            'shrink-0 h-10 px-5 rounded-xl font-mono text-sm font-medium',
            'bg-accent-cyan/10 border border-accent-cyan/40 text-accent-cyan',
            'hover:bg-accent-cyan/20 hover:shadow-glow-sm',
            'active:scale-95 transition-all duration-150',
            'disabled:opacity-30 disabled:cursor-not-allowed disabled:active:scale-100',
          ].join(' ')}
        >
          {isLoading ? <SpinnerIcon /> : 'run ↵'}
        </button>
      </form>
    </section>
  )
}

// ─── Empty state ──────────────────────────────────────────────────────────────

const DEFAULT_SUGGESTIONS = [
  'Show top 5 products by revenue',
  'Which customers have the highest lifetime value?',
  'Compare sales by region this quarter',
  'Find orders with delivery delays over 7 days',
]

function EmptyState({ suggestions = [], onSuggest }) {
  const chips = suggestions.length > 0 ? suggestions : DEFAULT_SUGGESTIONS

  return (
    <div className="flex flex-col items-center justify-center gap-6 pt-12 pb-4 animate-fade-in">
      {/* Logo mark */}
      <div className="relative">
        <div className="w-14 h-14 rounded-full border border-accent-cyan/30 flex items-center justify-center shadow-glow-md">
          <span className="text-accent-cyan text-2xl">✦</span>
        </div>
        <span className="absolute -bottom-1 -right-1 w-4 h-4 rounded-full bg-accent-green border-2 border-surface animate-pulse" />
      </div>

      <div className="text-center space-y-1">
        <p className="font-mono text-sm text-text-primary">InsightAgent AI</p>
        <p className="font-mono text-xs text-text-muted max-w-[260px] leading-relaxed">
          Ask anything in plain English. I'll generate SQL, run it, and explain the results.
        </p>
      </div>

      {/* Suggestion chips */}
      <div className="w-full max-w-md space-y-2">
        <p className="label-mono text-center mb-3">try asking…</p>
        {chips.map((s, i) => (
          <button
            key={i}
            onClick={() => onSuggest?.(s)}
            className={[
              'w-full text-left px-4 py-2.5 rounded-xl',
              'bg-surface-50 border border-panel-border',
              'font-mono text-xs text-text-secondary',
              'hover:border-accent-cyan/40 hover:text-text-primary hover:bg-accent-cyan/5',
              'transition-all duration-150 active:scale-[0.99]',
              'flex items-center gap-3 animate-slide-up',
            ].join(' ')}
            style={{ animationDelay: `${i * 60}ms` }}
          >
            <span className="text-text-muted shrink-0">›</span>
            <span>{s}</span>
          </button>
        ))}
      </div>
    </div>
  )
}

// ─── Typing indicator ─────────────────────────────────────────────────────────

function TypingIndicator() {
  return (
    <div className="flex gap-3 animate-fade-in">
      {/* Assistant avatar */}
      <div className="shrink-0 w-7 h-7 rounded-full flex items-center justify-center text-xs font-mono border bg-accent-green/15 text-accent-green border-accent-green/30 mt-0.5">
        ✦
      </div>

      <div className="bg-panel border border-panel-border rounded-2xl rounded-tl-sm px-4 py-3 flex items-center gap-3">
        {/* Animated dots */}
        <span className="flex gap-1.5">
          {[0, 1, 2].map(i => (
            <span
              key={i}
              className="w-1.5 h-1.5 rounded-full bg-accent-cyan animate-bounce"
              style={{ animationDelay: `${i * 150}ms` }}
            />
          ))}
        </span>
        <span className="font-mono text-xs text-text-secondary">
          thinking…
        </span>
      </div>
    </div>
  )
}

// ─── Spinner icon ─────────────────────────────────────────────────────────────

function SpinnerIcon() {
  return (
    <svg
      className="animate-spin w-4 h-4 text-accent-cyan"
      xmlns="http://www.w3.org/2000/svg"
      fill="none"
      viewBox="0 0 24 24"
    >
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
    </svg>
  )
}
