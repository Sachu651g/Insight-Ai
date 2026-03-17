import React, { useEffect, useRef, useState, useCallback } from 'react'

const MERMAID_THEME = {
  startOnLoad:   false,
  theme:         'base',
  securityLevel: 'loose',
  themeVariables: {
    background:          '#0d0f14',
    primaryColor:        '#141720',
    primaryTextColor:    '#e8eaf6',
    primaryBorderColor:  '#1e2235',
    lineColor:           '#7986cb',
    secondaryColor:      '#1a1d26',
    tertiaryColor:       '#0d0f14',
    edgeLabelBackground: '#141720',
    clusterBkg:          '#1a1d26',
    titleColor:          '#00e5ff',
    nodeBorder:          '#2d3555',
    mainBkg:             '#141720',
    fontFamily:          '"JetBrains Mono", monospace',
    fontSize:            '13px',
    // ER diagram specific
    attributeBackgroundColorEven: '#141720',
    attributeBackgroundColorOdd:  '#1a1d26',
  },
  er: { diagramPadding: 20, useMaxWidth: true },
}

/**
 * MermaidViewer
 * -------------
 * Renders any Mermaid diagram definition (flowchart, ER, sequence…).
 * Supports download as SVG and a raw-source toggle for debugging.
 *
 * Props:
 *   definition  {string}  - Mermaid source string (from getERDiagram())
 *   title       {string}  - Panel heading
 *   id          {string}  - Unique DOM id (required if multiple on same page)
 *   isLoading   {boolean}
 */
export default function MermaidViewer({
  definition = '',
  title      = 'entity relationship diagram',
  id         = 'mermaid-root',
  isLoading  = false,
}) {
  const containerRef  = useRef(null)
  const [status,    setStatus]    = useState('idle')  // 'idle' | 'rendering' | 'done' | 'error'
  const [errorMsg,  setErrorMsg]  = useState('')
  const [showSource,setShowSource]= useState(false)
  const [svgCache,  setSvgCache]  = useState('')

  // ── Render whenever definition changes ──────────────────────────────────────
  useEffect(() => {
    if (!definition.trim()) { setStatus('idle'); return }

    let cancelled = false
    setStatus('rendering')
    setErrorMsg('')
    setSvgCache('')

    ;(async () => {
      try {
        const { default: mermaid } = await import('mermaid')
        mermaid.initialize(MERMAID_THEME)

        if (cancelled) return

        const uid = `${id}-${Date.now()}`
        const { svg } = await mermaid.render(uid, definition.trim())

        if (cancelled) return

        setSvgCache(svg)
        if (containerRef.current) {
          containerRef.current.innerHTML = svg
          // Make SVG responsive
          const svgEl = containerRef.current.querySelector('svg')
          if (svgEl) {
            svgEl.removeAttribute('height')
            svgEl.style.width  = '100%'
            svgEl.style.height = 'auto'
            svgEl.style.maxWidth = '100%'
          }
        }
        setStatus('done')
      } catch (err) {
        if (!cancelled) {
          console.error('[MermaidViewer]', err)
          setErrorMsg(err?.message ?? 'Failed to render diagram')
          setStatus('error')
        }
      }
    })()

    return () => { cancelled = true }
  }, [definition, id])

  // ── Download SVG ─────────────────────────────────────────────────────────────
  const handleDownload = useCallback(() => {
    if (!svgCache) return
    const blob = new Blob([svgCache], { type: 'image/svg+xml' })
    const url  = URL.createObjectURL(blob)
    const a    = Object.assign(document.createElement('a'), { href: url, download: `${id}.svg` })
    a.click()
    URL.revokeObjectURL(url)
  }, [svgCache, id])

  if (!definition.trim() && !isLoading) {
    return <EREmptyState />
  }

  return (
    <div className="flex flex-col rounded-xl border border-panel-border bg-surface-50 overflow-hidden animate-fade-in">

      {/* ── Header ── */}
      <div className="flex items-center gap-2 px-4 py-2.5 bg-surface-100 border-b border-panel-border shrink-0">
        <span className="text-accent-cyan text-sm">⬡</span>
        <span className="label-mono text-accent-cyan">{title}</span>

        <div className="flex items-center gap-1.5 ml-auto">
          {/* Status indicator */}
          {status === 'rendering' && (
            <span className="label-mono text-accent-amber animate-pulse">rendering…</span>
          )}
          {status === 'done' && (
            <span className="label-mono text-accent-green">✓ ready</span>
          )}

          {/* Source toggle */}
          {definition && (
            <button
              onClick={() => setShowSource(v => !v)}
              className="label-mono px-2 py-0.5 rounded border border-panel-border hover:border-accent-cyan/40 hover:text-accent-cyan transition-colors duration-150"
            >
              {showSource ? 'diagram' : 'source'}
            </button>
          )}

          {/* Download */}
          {svgCache && (
            <button
              onClick={handleDownload}
              className="label-mono px-2 py-0.5 rounded border border-panel-border hover:border-accent-green/40 hover:text-accent-green transition-colors duration-150"
            >
              ↓ svg
            </button>
          )}
        </div>
      </div>

      {/* ── Body ── */}
      <div className="overflow-auto p-4" style={{ minHeight: '180px', maxHeight: '480px' }}>

        {/* Loading shimmer */}
        {(isLoading || status === 'rendering') && (
          <div className="space-y-3">
            <div className="h-4 shimmer-bg rounded w-3/4" />
            <div className="h-32 shimmer-bg rounded-xl" />
            <div className="h-4 shimmer-bg rounded w-1/2" />
          </div>
        )}

        {/* Error */}
        {status === 'error' && (
          <div className="rounded-lg border border-accent-red/30 bg-accent-red/10 p-4 space-y-2">
            <p className="label-mono text-accent-red">render error</p>
            <p className="font-mono text-xs text-accent-red/80 leading-relaxed">{errorMsg}</p>
            <details className="mt-2">
              <summary className="label-mono text-text-muted cursor-pointer hover:text-text-secondary">
                show source
              </summary>
              <pre className="mt-2 text-xs text-text-muted overflow-x-auto whitespace-pre-wrap">
                {definition}
              </pre>
            </details>
          </div>
        )}

        {/* Source view */}
        {showSource && !isLoading && status !== 'rendering' && (
          <pre className="font-mono text-xs text-text-code leading-relaxed whitespace-pre-wrap overflow-x-auto">
            {definition}
          </pre>
        )}

        {/* Rendered diagram */}
        {!showSource && status !== 'error' && (
          <div
            ref={containerRef}
            className="mermaid [&_svg]:max-w-full [&_svg]:mx-auto [&_svg]:overflow-visible"
            style={{ display: status === 'done' ? 'block' : 'none' }}
          />
        )}
      </div>
    </div>
  )
}

// ─── Empty state ──────────────────────────────────────────────────────────────

function EREmptyState() {
  return (
    <div className="flex flex-col items-center justify-center gap-3 rounded-xl border border-dashed border-panel-border bg-surface-50 py-14 animate-fade-in">
      <span className="text-3xl opacity-20">⬡</span>
      <p className="font-mono text-xs text-text-muted text-center leading-relaxed max-w-[200px]">
        Open the "ER Diagram" view in the sidebar to load the entity relationship diagram.
      </p>
    </div>
  )
}
