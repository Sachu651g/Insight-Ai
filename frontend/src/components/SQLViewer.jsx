import React, { useState, useMemo } from 'react'
import clsx from 'clsx'

/**
 * SQLViewer
 * ---------
 * Displays the generated SQL query with syntax highlighting, line numbers,
 * a copy button, and a paginated results table.
 *
 * Props:
 *   sql       {string}    Generated SQL from AskAIResponse.sql
 *   rows      {Object[]}  Result rows from AskAIResponse.data
 *   columns   {string[]}  Derived column names
 *   isLoading {boolean}
 *   error     {string}
 */
export default function SQLViewer({ sql = '', rows = [], columns = [], isLoading = false, error }) {
  const [copied,    setCopied]    = useState(false)
  const [collapsed, setCollapsed] = useState(false)
  const [page,      setPage]      = useState(0)

  const PAGE_SIZE = 20
  const totalPages = Math.ceil(rows.length / PAGE_SIZE)
  const visibleRows = rows.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE)

  const handleCopy = async () => {
    if (!sql) return
    try {
      await navigator.clipboard.writeText(sql)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch { /* unavailable */ }
  }

  // Split SQL into lines for line-number rendering
  const lines = useMemo(() => (sql || '').split('\n'), [sql])

  return (
    <div className="flex flex-col gap-0 rounded-xl border border-panel-border overflow-hidden bg-surface-50 animate-fade-in">

      {/* ── SQL code block ── */}
      <div>
        {/* Toolbar */}
        <div className="flex items-center gap-2 px-4 py-2 bg-surface-100 border-b border-panel-border">
          {/* Traffic-light dots */}
          <span className="w-2.5 h-2.5 rounded-full bg-accent-red/50" />
          <span className="w-2.5 h-2.5 rounded-full bg-accent-amber/50" />
          <span className="w-2.5 h-2.5 rounded-full bg-accent-green/50" />

          <span className="label-mono text-accent-amber ml-2">generated sql</span>

          <div className="flex-1" />

          <button
            onClick={() => setCollapsed(v => !v)}
            className="label-mono px-2 py-0.5 rounded border border-panel-border hover:border-accent-amber/40 hover:text-accent-amber transition-colors duration-150"
          >
            {collapsed ? '▶ expand' : '▼ collapse'}
          </button>

          <button
            onClick={handleCopy}
            disabled={!sql}
            className="label-mono px-2 py-0.5 rounded border border-panel-border hover:border-accent-cyan/40 hover:text-accent-cyan transition-colors duration-150 disabled:opacity-30"
          >
            {copied ? '✓ copied' : '⎘ copy'}
          </button>
        </div>

        {/* Code */}
        {!collapsed && (
          <div className="overflow-x-auto max-h-52">
            {isLoading ? (
              <div className="p-4 space-y-2">
                {[80, 60, 90, 50].map((w, i) => (
                  <div key={i} className="h-4 shimmer-bg rounded" style={{ width: `${w}%` }} />
                ))}
              </div>
            ) : sql ? (
              <table className="w-full border-collapse font-mono text-xs">
                <tbody>
                  {lines.map((line, i) => (
                    <tr key={i} className="hover:bg-accent-cyan/5 transition-colors duration-75 group">
                      {/* Line number */}
                      <td className="select-none w-10 pl-4 pr-3 py-0.5 text-right text-text-muted border-r border-panel-border/50 group-hover:text-text-secondary">
                        {i + 1}
                      </td>
                      {/* Code */}
                      <td className="pl-4 pr-4 py-0.5 text-text-code leading-5 whitespace-pre">
                        <HighlightSQL line={line} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <div className="flex items-center justify-center h-24">
                <p className="font-mono text-xs text-text-muted">No query generated yet — run a question first.</p>
              </div>
            )}
          </div>
        )}

        {/* Error */}
        {error && (
          <div className="flex items-start gap-2 px-4 py-2.5 bg-accent-red/10 border-t border-accent-red/25">
            <span className="text-accent-red mt-0.5 shrink-0">✕</span>
            <p className="font-mono text-xs text-accent-red">{error}</p>
          </div>
        )}
      </div>

      {/* ── Results table ── */}
      {rows.length > 0 && columns.length > 0 && (
        <ResultsTable
          rows={visibleRows}
          columns={columns}
          totalRows={rows.length}
          page={page}
          totalPages={totalPages}
          onPageChange={setPage}
        />
      )}
    </div>
  )
}

// ─── Results table ────────────────────────────────────────────────────────────

function ResultsTable({ rows, columns, totalRows, page, totalPages, onPageChange }) {
  return (
    <div className="border-t border-panel-border">
      {/* Table header */}
      <div className="flex items-center gap-2 px-4 py-2 bg-surface-100 border-b border-panel-border">
        <span className="label-mono text-accent-green">⊞ results</span>
        <span className="ml-auto label-mono text-text-muted">{totalRows} row{totalRows !== 1 ? 's' : ''}</span>
      </div>

      <div className="overflow-x-auto max-h-56">
        <table className="w-full text-xs font-mono border-collapse">
          <thead className="sticky top-0 z-10">
            <tr className="bg-surface-100">
              <th className="w-10 px-3 py-2 text-right label-mono text-text-muted border-b border-panel-border">#</th>
              {columns.map(col => (
                <th
                  key={col}
                  className="px-3 py-2 text-left label-mono text-accent-cyan border-b border-panel-border whitespace-nowrap"
                >
                  {col}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row, i) => (
              <tr
                key={i}
                className={clsx(
                  'border-b border-panel-border/40 hover:bg-accent-cyan/5 transition-colors duration-75',
                  i % 2 === 0 ? '' : 'bg-surface-100/40',
                )}
              >
                <td className="px-3 py-1.5 text-right text-text-muted">{i + 1}</td>
                {columns.map(col => (
                  <td key={col} className="px-3 py-1.5 whitespace-nowrap text-text-secondary">
                    <CellValue value={row[col]} />
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between px-4 py-2 border-t border-panel-border bg-surface-100">
          <button
            disabled={page === 0}
            onClick={() => onPageChange(p => p - 1)}
            className="label-mono px-2 py-0.5 rounded border border-panel-border hover:border-accent-cyan/40 hover:text-accent-cyan transition-colors duration-150 disabled:opacity-30"
          >
            ← prev
          </button>
          <span className="label-mono text-text-muted">
            page {page + 1} / {totalPages}
          </span>
          <button
            disabled={page >= totalPages - 1}
            onClick={() => onPageChange(p => p + 1)}
            className="label-mono px-2 py-0.5 rounded border border-panel-border hover:border-accent-cyan/40 hover:text-accent-cyan transition-colors duration-150 disabled:opacity-30"
          >
            next →
          </button>
        </div>
      )}
    </div>
  )
}

// ─── Cell value renderer ──────────────────────────────────────────────────────

function CellValue({ value }) {
  if (value === null || value === undefined) {
    return <span className="text-text-muted italic opacity-50">null</span>
  }
  const str = String(value)
  // Number — right-tinted
  if (!isNaN(Number(value)) && str.trim() !== '') {
    return <span className="text-accent-magenta">{str}</span>
  }
  // Boolean
  if (str === 'true')  return <span className="text-accent-green">true</span>
  if (str === 'false') return <span className="text-accent-red/70">false</span>
  return <span>{str}</span>
}

// ─── CSS SQL Highlighter ──────────────────────────────────────────────────────

const KW_RE = /\b(SELECT|FROM|WHERE|JOIN|LEFT|RIGHT|INNER|OUTER|FULL|CROSS|ON|GROUP\s+BY|ORDER\s+BY|HAVING|LIMIT|OFFSET|DISTINCT|AS|AND|OR|NOT|IN|IS|NULL|LIKE|BETWEEN|EXISTS|UNION|ALL|INSERT|INTO|VALUES|UPDATE|SET|DELETE|CREATE|DROP|ALTER|TABLE|INDEX|VIEW|WITH|CASE|WHEN|THEN|ELSE|END|COUNT|SUM|AVG|MIN|MAX|COALESCE|CAST|ISNULL|IFNULL|ROUND|DATE|NOW|OVER|PARTITION\s+BY|ROW_NUMBER|RANK|DENSE_RANK|LEAD|LAG)\b/gi

function HighlightSQL({ line }) {
  const html = line
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/'([^']*)'/g,  `<span style="color:#ffb300">'$1'</span>`)
    .replace(/`([^`]*)`/g,  `<span style="color:#ffb300">\`$1\`</span>`)
    .replace(/\b(\d+\.?\d*)\b/g, `<span style="color:#e040fb">$1</span>`)
    .replace(/(--[^\n]*)/g, `<span style="color:#3d4770;font-style:italic">$1</span>`)
    .replace(KW_RE, m => `<span style="color:#00e5ff;font-weight:600">${m.toUpperCase()}</span>`)
  return <span dangerouslySetInnerHTML={{ __html: html }} />
}
