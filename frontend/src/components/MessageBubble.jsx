import React, { useState } from 'react'
import clsx from 'clsx'

/**
 * MessageBubble
 * -------------
 * Renders one turn in the chat thread.
 *
 * message shape:
 * {
 *   id:         string | number
 *   role:       'user' | 'assistant' | 'system' | 'error'
 *   content:    string                          ← plain text (user / system / error)
 *   timestamp:  Date | string                  (optional)
 *
 *   // Assistant-only rich fields (from AskAIResponse):
 *   explanation?:    string
 *   sql?:            string
 *   chart?:          string   ← chart type hint e.g. "bar"
 *   insight?:        string
 *   recommendation?: string
 *   rowCount?:       number
 * }
 */
export default function MessageBubble({ message }) {
  if (message.role === 'system') return <SystemBanner message={message} />
  if (message.role === 'error')  return <ErrorBubble  message={message} />
  if (message.role === 'user')   return <UserBubble   message={message} />
  return <AssistantBubble message={message} />
}

// ─── User bubble ─────────────────────────────────────────────────────────────

function UserBubble({ message }) {
  return (
    <div className="flex justify-end gap-3 animate-slide-up">
      <div className="flex flex-col items-end gap-1 max-w-[72%]">
        <div className="bg-accent-cyan/10 border border-accent-cyan/25 rounded-2xl rounded-tr-sm px-4 py-3">
          <p className="font-mono text-sm text-text-primary leading-relaxed whitespace-pre-wrap">
            {message.content}
          </p>
        </div>
        <Timestamp ts={message.timestamp} align="right" />
      </div>
      <Avatar role="user" />
    </div>
  )
}

// ─── Assistant bubble ─────────────────────────────────────────────────────────

function AssistantBubble({ message }) {
  const hasRichContent = message.sql || message.insight || message.recommendation

  return (
    <div className="flex gap-3 animate-slide-up">
      <Avatar role="assistant" />

      <div className="flex flex-col gap-2 max-w-[80%] min-w-0">
        {/* Main explanation text */}
        {message.explanation && (
          <div className="bg-panel border border-panel-border rounded-2xl rounded-tl-sm px-4 py-3">
            <p className="font-body text-sm text-text-primary leading-relaxed whitespace-pre-wrap">
              {message.explanation}
            </p>
          </div>
        )}

        {/* Fallback plain content if no structured fields */}
        {!message.explanation && message.content && (
          <div className="bg-panel border border-panel-border rounded-2xl rounded-tl-sm px-4 py-3">
            <p className="font-body text-sm text-text-primary leading-relaxed whitespace-pre-wrap">
              {message.content}
            </p>
          </div>
        )}

        {/* Rich cards (SQL + chart placeholder + insight + recommendation) */}
        {hasRichContent && (
          <div className="flex flex-col gap-2">
            {message.sql && <SQLCard sql={message.sql} />}
            {message.chart && <ChartPlaceholder chartType={message.chart} rowCount={message.rowCount} />}
            {(message.insight || message.recommendation) && (
              <InsightCard insight={message.insight} recommendation={message.recommendation} />
            )}
          </div>
        )}

        <Timestamp ts={message.timestamp} align="left" />
      </div>
    </div>
  )
}

// ─── SQL card ─────────────────────────────────────────────────────────────────

function SQLCard({ sql }) {
  const [expanded, setExpanded] = useState(false)
  const [copied,   setCopied]   = useState(false)

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(sql)
      setCopied(true)
      setTimeout(() => setCopied(false), 1800)
    } catch { /* clipboard unavailable */ }
  }

  // Show a short preview (first 120 chars) when collapsed
  const preview   = sql.length > 120 ? sql.slice(0, 120).trimEnd() + ' …' : sql
  const displayed = expanded ? sql : preview
  const canExpand = sql.length > 120

  return (
    <div className="rounded-xl border border-panel-border bg-surface-50 overflow-hidden">
      {/* Header */}
      <div className="flex items-center gap-2 px-3 py-2 border-b border-panel-border bg-surface-100">
        <span className="label-mono text-accent-amber">⌗ generated sql</span>
        <div className="flex-1" />
        {canExpand && (
          <button
            onClick={() => setExpanded(v => !v)}
            className="label-mono px-2 py-0.5 rounded border border-panel-border hover:border-accent-amber/40 hover:text-accent-amber transition-colors duration-150"
          >
            {expanded ? 'collapse' : 'expand'}
          </button>
        )}
        <button
          onClick={handleCopy}
          className="label-mono px-2 py-0.5 rounded border border-panel-border hover:border-accent-cyan/40 hover:text-accent-cyan transition-colors duration-150"
        >
          {copied ? '✓ copied' : 'copy'}
        </button>
      </div>

      {/* Code */}
      <pre className="px-4 py-3 font-mono text-xs leading-relaxed text-text-code overflow-x-auto whitespace-pre-wrap">
        <HighlightSQL sql={displayed} />
      </pre>
    </div>
  )
}

// ─── Chart placeholder ────────────────────────────────────────────────────────

const CHART_ICONS = {
  bar:     '▦',
  line:    '∿',
  pie:     '◕',
  scatter: '⁙',
  area:    '◿',
  default: '◈',
}

function ChartPlaceholder({ chartType, rowCount }) {
  const icon  = CHART_ICONS[chartType] ?? CHART_ICONS.default
  const label = chartType ? `${chartType} chart` : 'chart'

  return (
    <div className="rounded-xl border border-dashed border-accent-cyan/25 bg-accent-cyan/5 px-4 py-6 flex flex-col items-center gap-2">
      <span className="text-2xl text-accent-cyan/40">{icon}</span>
      <p className="font-mono text-xs text-text-muted text-center leading-relaxed">
        <span className="text-accent-cyan/70">{label}</span>
        {rowCount != null && (
          <> &nbsp;·&nbsp; <span className="text-text-muted">{rowCount} row{rowCount !== 1 ? 's' : ''}</span></>
        )}
        <br />
        <span className="text-text-muted/60">chart rendering coming soon</span>
      </p>
    </div>
  )
}

// ─── Insight + recommendation card ───────────────────────────────────────────

function InsightCard({ insight, recommendation }) {
  return (
    <div className="rounded-xl border border-panel-border bg-surface-50 overflow-hidden divide-y divide-panel-border">
      {insight && (
        <div className="px-4 py-3 flex gap-3">
          <span className="shrink-0 text-accent-green text-sm mt-0.5">💡</span>
          <div>
            <p className="label-mono text-accent-green mb-1">insight</p>
            <p className="font-body text-xs text-text-secondary leading-relaxed">{insight}</p>
          </div>
        </div>
      )}
      {recommendation && (
        <div className="px-4 py-3 flex gap-3">
          <span className="shrink-0 text-accent-amber text-sm mt-0.5">→</span>
          <div>
            <p className="label-mono text-accent-amber mb-1">recommendation</p>
            <p className="font-body text-xs text-text-secondary leading-relaxed">{recommendation}</p>
          </div>
        </div>
      )}
    </div>
  )
}

// ─── Error bubble ─────────────────────────────────────────────────────────────

function ErrorBubble({ message }) {
  return (
    <div className="flex gap-3 animate-slide-up">
      <div className="shrink-0 w-7 h-7 rounded-full flex items-center justify-center text-xs border bg-accent-red/15 border-accent-red/30 text-accent-red mt-0.5">
        ✕
      </div>
      <div className="max-w-[78%] bg-accent-red/10 border border-accent-red/25 rounded-2xl rounded-tl-sm px-4 py-3">
        <p className="label-mono text-accent-red mb-1">error</p>
        <p className="font-body text-sm text-accent-red/80 leading-relaxed">{message.content}</p>
        {message.timestamp && <Timestamp ts={message.timestamp} align="left" />}
      </div>
    </div>
  )
}

// ─── System banner ────────────────────────────────────────────────────────────

function SystemBanner({ message }) {
  return (
    <div className="flex justify-center py-1 animate-fade-in">
      <span className="label-mono px-3 py-1 rounded-full bg-surface-50 border border-panel-border text-text-muted">
        {message.content}
      </span>
    </div>
  )
}

// ─── Avatar ───────────────────────────────────────────────────────────────────

function Avatar({ role }) {
  const isUser = role === 'user'
  return (
    <div className={clsx(
      'shrink-0 w-7 h-7 rounded-full flex items-center justify-center text-xs font-mono font-bold mt-0.5',
      isUser
        ? 'bg-accent-cyan/20  text-accent-cyan  border border-accent-cyan/40'
        : 'bg-accent-green/15 text-accent-green border border-accent-green/30',
    )}>
      {isUser ? 'U' : '✦'}
    </div>
  )
}

// ─── Timestamp ────────────────────────────────────────────────────────────────

function Timestamp({ ts, align }) {
  if (!ts) return null
  let label = ''
  try { label = new Date(ts).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) } catch { return null }
  return (
    <time className={clsx('block font-mono text-[10px] text-text-muted mt-0.5', align === 'right' ? 'text-right' : 'text-left')}>
      {label}
    </time>
  )
}

// ─── Lightweight CSS SQL highlighter ─────────────────────────────────────────

const SQL_KW = /\b(SELECT|FROM|WHERE|JOIN|LEFT|RIGHT|INNER|OUTER|FULL|CROSS|ON|GROUP\s+BY|ORDER\s+BY|HAVING|LIMIT|OFFSET|DISTINCT|AS|AND|OR|NOT|IN|IS|NULL|LIKE|BETWEEN|EXISTS|UNION|ALL|INSERT|INTO|VALUES|UPDATE|SET|DELETE|CREATE|DROP|ALTER|TABLE|INDEX|VIEW|WITH|CASE|WHEN|THEN|ELSE|END|COUNT|SUM|AVG|MIN|MAX|COALESCE|CAST|OVER|PARTITION\s+BY|ROW_NUMBER|RANK|DENSE_RANK)\b/gi

function HighlightSQL({ sql }) {
  const escaped = sql
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/'([^']*)'/g,  "<span style='color:#ffb300'>'$1'</span>")
    .replace(/\b(\d+\.?\d*)\b/g, "<span style='color:#e040fb'>$1</span>")
    .replace(/(--[^\n]*)/g, "<span style='color:#3d4770;font-style:italic'>$1</span>")
    .replace(SQL_KW, (m) => `<span style='color:#00e5ff;font-weight:600'>${m.toUpperCase()}</span>`)

  return <span dangerouslySetInnerHTML={{ __html: escaped }} />
}
