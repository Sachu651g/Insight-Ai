import React, { useState } from 'react'
import clsx from 'clsx'

/**
 * InsightsPanel
 * -------------
 * Full-featured panel that displays all textual intelligence from an AskAIResponse:
 *  • explanation     — what the query does
 *  • insight         — analytical finding
 *  • recommendation  — actionable next step
 *
 * Props:
 *   explanation     {string}
 *   insight         {string}
 *   recommendation  {string}
 *   question        {string}   — echoed user question (optional)
 *   isLoading       {boolean}
 */
export default function InsightsPanel({
  explanation    = '',
  insight        = '',
  recommendation = '',
  question       = '',
  isLoading      = false,
}) {
  const hasContent = explanation || insight || recommendation

  return (
    <div className="flex flex-col gap-0 rounded-xl border border-panel-border bg-surface-50 overflow-hidden animate-fade-in">

      {/* ── Header ── */}
      <div className="flex items-center gap-2 px-4 py-2.5 bg-surface-100 border-b border-panel-border shrink-0">
        <span className="w-1.5 h-1.5 rounded-full bg-accent-green animate-pulse-slow" />
        <span className="label-mono">insights & analysis</span>
        {hasContent && !isLoading && (
          <span className="ml-auto label-mono text-accent-green text-[10px]">✓ ready</span>
        )}
      </div>

      <div className="overflow-y-auto flex-1" style={{ maxHeight: '460px' }}>
        {isLoading ? (
          <LoadingSkeleton />
        ) : !hasContent ? (
          <EmptyState />
        ) : (
          <div className="divide-y divide-panel-border">

            {/* Question echo */}
            {question && (
              <div className="px-4 py-3 bg-accent-cyan/5">
                <p className="label-mono text-accent-cyan mb-1.5">query</p>
                <p className="font-mono text-xs text-text-secondary leading-relaxed italic">
                  "{question}"
                </p>
              </div>
            )}

            {/* Explanation */}
            {explanation && (
              <InsightSection
                icon="📋"
                label="explanation"
                labelColor="text-accent-cyan"
                borderColor="border-accent-cyan/30"
                bgColor="bg-accent-cyan/5"
                content={explanation}
              />
            )}

            {/* Insight */}
            {insight && (
              <InsightSection
                icon="💡"
                label="key insight"
                labelColor="text-accent-green"
                borderColor="border-accent-green/30"
                bgColor="bg-accent-green/5"
                content={insight}
              />
            )}

            {/* Recommendation */}
            {recommendation && (
              <InsightSection
                icon="→"
                label="recommendation"
                labelColor="text-accent-amber"
                borderColor="border-accent-amber/30"
                bgColor="bg-accent-amber/5"
                content={recommendation}
                isAction
              />
            )}

          </div>
        )}
      </div>
    </div>
  )
}

// ─── Section card ─────────────────────────────────────────────────────────────

function InsightSection({ icon, label, labelColor, borderColor, bgColor, content, isAction }) {
  const [expanded, setExpanded] = useState(true)
  const isLong = content.length > 220

  return (
    <div className={clsx('px-4 py-3', bgColor)}>
      <div className="flex items-center gap-2 mb-2">
        <span className={clsx('text-sm shrink-0', isAction ? labelColor : '')}>{icon}</span>
        <span className={clsx('label-mono', labelColor)}>{label}</span>
        {isLong && (
          <button
            onClick={() => setExpanded(v => !v)}
            className={clsx('ml-auto label-mono text-[10px] hover:opacity-80 transition-opacity', labelColor)}
          >
            {expanded ? '▲ less' : '▼ more'}
          </button>
        )}
      </div>

      <div className={clsx(
        'border-l-2 pl-3',
        borderColor,
        !expanded && isLong ? 'max-h-12 overflow-hidden relative' : '',
      )}>
        <p className="font-body text-sm text-text-primary leading-relaxed">{content}</p>
        {!expanded && isLong && (
          <div className={clsx('absolute bottom-0 left-0 right-0 h-8 bg-gradient-to-t from-surface-50/90 to-transparent')} />
        )}
      </div>
    </div>
  )
}

// ─── States ───────────────────────────────────────────────────────────────────

function LoadingSkeleton() {
  return (
    <div className="p-4 space-y-4">
      {[
        { label: '░░░░░░░░░░░', w: '40%' },
        { label: null,          w: '100%', lines: 3 },
        { label: '░░░░░░░░░',   w: '35%' },
        { label: null,          w: '100%', lines: 2 },
        { label: '░░░░░░░░░░░░',w: '45%' },
        { label: null,          w: '85%',  lines: 2 },
      ].map((s, i) =>
        s.label !== null ? (
          <div key={i} className="h-3 shimmer-bg rounded" style={{ width: s.w }} />
        ) : (
          <div key={i} className="space-y-1.5">
            {Array.from({ length: s.lines }).map((_, j) => (
              <div
                key={j}
                className="h-3 shimmer-bg rounded"
                style={{ width: j === s.lines - 1 ? '65%' : s.w }}
              />
            ))}
          </div>
        ),
      )}
    </div>
  )
}

function EmptyState() {
  return (
    <div className="flex flex-col items-center justify-center gap-3 py-12 px-4 text-center">
      <div className="w-10 h-10 rounded-full border border-panel-border flex items-center justify-center">
        <span className="text-text-muted text-sm">💡</span>
      </div>
      <p className="font-mono text-xs text-text-muted leading-relaxed max-w-[200px]">
        Run a query to see AI-generated explanations, insights, and recommendations here.
      </p>
    </div>
  )
}
