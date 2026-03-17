import React, { useState } from 'react'
import clsx from 'clsx'

// Default suggestions shown before the backend returns personalised ones
const DEFAULT_SUGGESTIONS = [
  { text: 'Show top 5 products by total revenue',         category: 'revenue'   },
  { text: 'Which customers have the highest lifetime value?', category: 'customers' },
  { text: 'Compare sales performance by region this quarter', category: 'sales'     },
  { text: 'Find all orders with a delivery delay > 7 days',   category: 'ops'       },
  { text: 'What is the monthly revenue trend for this year?',  category: 'trend'     },
  { text: 'Show the 10 most returned products',               category: 'ops'       },
]

const CATEGORY_STYLE = {
  revenue:   'text-accent-green  border-accent-green/30  bg-accent-green/10',
  customers: 'text-accent-cyan   border-accent-cyan/30   bg-accent-cyan/10',
  sales:     'text-accent-amber  border-accent-amber/30  bg-accent-amber/10',
  ops:       'text-accent-magenta border-accent-magenta/30 bg-accent-magenta/10',
  trend:     'text-accent-cyan   border-accent-cyan/30   bg-accent-cyan/10',
  default:   'text-text-secondary border-panel-border    bg-surface-50',
}

/**
 * Suggestions
 * -----------
 * Renders a list of suggested queries as clickable chips.
 * When clicked, calls onSelect(text) which should forward the query to askAI().
 *
 * Props:
 *   suggestions {string[] | {text,category}[]}  - from AskAIResponse.suggestions
 *   onSelect    {Function}                       - called with the query string
 *   isLoading   {boolean}
 *   title       {string}
 */
export default function Suggestions({ suggestions = [], onSelect, isLoading = false, title = 'suggested queries' }) {
  const [activeIdx, setActiveIdx] = useState(null)

  // Normalise: backend returns string[], we accept both string[] and {text,category}[]
  const items = (suggestions.length > 0 ? suggestions : DEFAULT_SUGGESTIONS).map(s =>
    typeof s === 'string' ? { text: s, category: 'default' } : s,
  )

  const handleClick = async (text, i) => {
    if (isLoading) return
    setActiveIdx(i)
    await onSelect?.(text)
    setActiveIdx(null)
  }

  return (
    <div className="flex flex-col rounded-xl border border-panel-border bg-surface-50 overflow-hidden animate-fade-in">

      {/* Header */}
      <div className="flex items-center gap-2 px-4 py-2.5 bg-surface-100 border-b border-panel-border shrink-0">
        <span className="text-accent-magenta text-xs">◆</span>
        <span className="label-mono text-accent-magenta">{title}</span>
        <span className="ml-auto label-mono text-text-muted">click to run</span>
      </div>

      {/* Chips */}
      <ul className="p-3 space-y-1.5 overflow-y-auto" style={{ maxHeight: '320px' }}>
        {isLoading
          ? Array.from({ length: 5 }).map((_, i) => (
              <li key={i}>
                <div className="h-10 shimmer-bg rounded-lg" />
              </li>
            ))
          : items.map((item, i) => {
              const style = CATEGORY_STYLE[item.category] ?? CATEGORY_STYLE.default
              const isActive = activeIdx === i

              return (
                <li key={i}>
                  <button
                    onClick={() => handleClick(item.text, i)}
                    disabled={!!isLoading || isActive}
                    className={clsx(
                      'w-full text-left px-3 py-2.5 rounded-lg border flex items-start gap-2.5',
                      'font-mono text-xs leading-snug transition-all duration-150',
                      'hover:brightness-125 active:scale-[0.99]',
                      'disabled:cursor-not-allowed disabled:opacity-60',
                      'animate-slide-up',
                      isActive
                        ? 'bg-accent-cyan/10 border-accent-cyan/40 text-accent-cyan'
                        : 'bg-surface-100 border-panel-border text-text-secondary hover:border-accent-cyan/30 hover:text-text-primary hover:bg-accent-cyan/5',
                    )}
                    style={{ animationDelay: `${i * 45}ms` }}
                  >
                    {/* Icon */}
                    <span className="shrink-0 mt-0.5 text-text-muted">
                      {isActive ? <MiniSpinner /> : '›'}
                    </span>

                    {/* Text */}
                    <span className="flex-1">{item.text}</span>

                    {/* Category badge */}
                    {item.category && item.category !== 'default' && (
                      <span className={clsx(
                        'shrink-0 self-start mt-0.5 text-[9px] px-1.5 py-0.5 rounded border font-mono uppercase tracking-wider',
                        style,
                      )}>
                        {item.category}
                      </span>
                    )}
                  </button>
                </li>
              )
            })}
      </ul>

      {/* Footer hint */}
      <div className="px-4 py-2 border-t border-panel-border bg-surface-100 shrink-0">
        <p className="label-mono text-text-muted text-[10px]">
          suggestions update after each query
        </p>
      </div>
    </div>
  )
}

function MiniSpinner() {
  return (
    <svg className="animate-spin w-3 h-3 text-accent-cyan inline" viewBox="0 0 24 24" fill="none">
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
    </svg>
  )
}
