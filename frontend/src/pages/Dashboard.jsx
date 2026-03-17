import React, { useState, useCallback, useEffect, useRef } from 'react'
import ChatWindow    from '../components/ChatWindow.jsx'
import ChartRenderer from '../components/ChartRenderer.jsx'
import SQLViewer     from '../components/SQLViewer.jsx'
import InsightsPanel from '../components/InsightsPanel.jsx'
import Suggestions   from '../components/Suggestions.jsx'
import MermaidViewer from '../components/MermaidViewer.jsx'
import { getERDiagram, getSchema, healthCheck, askAI } from '../services/api.js'

// ─── Constants ────────────────────────────────────────────────────────────────

const RIGHT_TABS = [
  { id: 'insights', label: 'Insights',    icon: '💡' },
  { id: 'chart',    label: 'Chart',       icon: '◈'  },
  { id: 'sql',      label: 'SQL',         icon: '⌗'  },
]

const SIDEBAR_ITEMS = [
  { id: 'chat',    label: 'New Chat',       icon: '✦',  section: 'main'   },
  { id: 'history', label: 'History',        icon: '◷',  section: 'main'   },
  { id: 'schema',  label: 'Schema Viewer',  icon: '⊞',  section: 'explore'},
  { id: 'er',      label: 'ER Diagram',     icon: '⬡',  section: 'explore'},
  { id: 'suggest', label: 'Suggestions',    icon: '◆',  section: 'tools'  },
  { id: 'settings',label: 'Settings',       icon: '⚙',  section: 'meta'   },
]

// ─── Dashboard ────────────────────────────────────────────────────────────────

export default function Dashboard() {
  // ── Layout state ──────────────────────────────────────────────────────────
  const [sidebarView,   setSidebarView]   = useState('chat')    // active sidebar item
  const [rightTab,      setRightTab]      = useState('insights')// active right panel tab
  const [sidebarOpen,   setSidebarOpen]   = useState(true)      // mobile collapse

  // ── Backend state ──────────────────────────────────────────────────────────
  const [backendStatus, setBackendStatus] = useState('checking')// 'checking'|'online'|'offline'
  const [lastResponse,  setLastResponse]  = useState(null)      // AskAIResponse
  const [erDiagram,     setErDiagram]     = useState('')
  const [erLoading,     setErLoading]     = useState(false)
  const [schema,        setSchema]        = useState(null)
  const [schemaLoading, setSchemaLoading] = useState(false)
  const [globalLoading, setGlobalLoading] = useState(false)

  // Ref to forward "send query" down to ChatWindow's internal handler
  const chatSendRef = useRef(null)

  // ── Derived from lastResponse ──────────────────────────────────────────────
  const sql            = lastResponse?.sql             ?? ''
  const chartUrl       = lastResponse?.chartUrl        ?? null   // full image URL
  const chartType      = lastResponse?.chartType       ?? 'bar'  // Plotly type hint
  const rows           = lastResponse?.data            ?? []
  const columns        = rows.length > 0 ? Object.keys(rows[0]) : []
  const explanation    = lastResponse?.explanation     ?? ''
  const insight        = lastResponse?.insight         ?? ''
  const recommendation = lastResponse?.recommendation  ?? ''
  const question       = lastResponse?.question        ?? ''
  const suggestions    = lastResponse?.suggestions     ?? []

  // ── Health check on mount ──────────────────────────────────────────────────
  useEffect(() => {
    healthCheck().then(ok => setBackendStatus(ok ? 'online' : 'offline'))
    const id = setInterval(
      () => healthCheck().then(ok => setBackendStatus(ok ? 'online' : 'offline')),
      30_000,
    )
    return () => clearInterval(id)
  }, [])

  // ── Load ER diagram when sidebar OR right-panel ER tab is selected ──────────
  useEffect(() => {
    const needsER = sidebarView === 'er' || rightTab === 'er'
    if (!needsER || erDiagram || erLoading) return
    setErLoading(true)
    getERDiagram()
      .then(({ diagram }) => setErDiagram(diagram))
      .catch(err => console.error('[Dashboard] getERDiagram:', err))
      .finally(() => setErLoading(false))
  }, [sidebarView, rightTab, erDiagram, erLoading])

  // ── Load schema when schema view is selected ───────────────────────────────
  useEffect(() => {
    if (sidebarView !== 'schema' || schema || schemaLoading) return
    setSchemaLoading(true)
    getSchema()
      .then(data => setSchema(data))
      .catch(err => console.error('[Dashboard] getSchema:', err))
      .finally(() => setSchemaLoading(false))
  }, [sidebarView, schema, schemaLoading])

  // ── Handle response from ChatWindow ───────────────────────────────────────
  const handleResponse = useCallback((result) => {
    setLastResponse(result)
    // Auto-switch right panel to SQL tab so user sees query + data immediately
    setRightTab('sql')
  }, [])

  // ── Handle suggestion click (injects query into ChatWindow) ───────────────
  const handleSuggestionSelect = useCallback(async (text) => {
    setSidebarView('chat')
    setGlobalLoading(true)
    try {
      // If ChatWindow exposed its send fn via ref, use it; else call askAI directly
      if (chatSendRef.current) {
        await chatSendRef.current(text)
      } else {
        const result = await askAI(text)
        setLastResponse(result)
      }
    } finally {
      setGlobalLoading(false)
    }
  }, [])

  // ── Sidebar nav click ──────────────────────────────────────────────────────
  const handleSidebarNav = useCallback((id) => {
    setSidebarView(id)
    if (id === 'chat') {
      // nothing extra
    }
  }, [])

  // ─ Render ──────────────────────────────────────────────────────────────────
  return (
    <div className="flex flex-col h-screen bg-surface bg-grid overflow-hidden">

      {/* ══ Top bar ══ */}
      <Topbar
        backendStatus={backendStatus}
        sidebarOpen={sidebarOpen}
        onToggleSidebar={() => setSidebarOpen(v => !v)}
      />

      {/* ══ Body ══ */}
      <div className="flex flex-1 overflow-hidden min-h-0">

        {/* ── Left sidebar ── */}
        <aside className={[
          'flex flex-col shrink-0 border-r border-panel-border bg-surface-100 transition-all duration-200 overflow-hidden',
          sidebarOpen ? 'w-52' : 'w-14',
        ].join(' ')}>
          <LeftSidebar
            activeId={sidebarView}
            onSelect={handleSidebarNav}
            collapsed={!sidebarOpen}
          />
        </aside>

        {/* ── Centre: Chat or sidebar view ── */}
        <main className="flex-1 flex flex-col min-w-0 overflow-hidden border-r border-panel-border">

          {/* Show chat or one of the sidebar content views */}
          {sidebarView === 'chat' || sidebarView === 'history' ? (
            <div className="flex-1 flex flex-col overflow-hidden p-3">
              <ChatWindow
                onResponse={handleResponse}
                sendRef={chatSendRef}
                suggestions={suggestions}
              />
            </div>
          ) : sidebarView === 'er' ? (
            <SidebarContent title="ER Diagram" icon="⬡">
              <MermaidViewer
                definition={erDiagram}
                title="entity relationships"
                id="sidebar-er"
                isLoading={erLoading}
              />
            </SidebarContent>
          ) : sidebarView === 'schema' ? (
            <SidebarContent title="Schema Viewer" icon="⊞">
              <SchemaPanel schema={schema} isLoading={schemaLoading} />
            </SidebarContent>
          ) : sidebarView === 'suggest' ? (
            <SidebarContent title="Suggestions" icon="◆">
              <Suggestions
                suggestions={suggestions}
                onSelect={handleSuggestionSelect}
                isLoading={globalLoading}
              />
            </SidebarContent>
          ) : sidebarView === 'settings' ? (
            <SidebarContent title="Settings" icon="⚙">
              <SettingsPanel />
            </SidebarContent>
          ) : null}
        </main>

        {/* ── Right panel: Visualization ── */}
        <aside className="hidden lg:flex flex-col w-[420px] xl:w-[480px] shrink-0 overflow-hidden">
          <RightPanel
            rightTab={rightTab}
            onTabChange={setRightTab}
            /* Chart */
            chartUrl={chartUrl}
            rows={rows}
            columns={columns}
            chartType={chartType}
            /* SQL */
            sql={sql}
            /* Insights */
            explanation={explanation}
            insight={insight}
            recommendation={recommendation}
            question={question}
            /* ER */
            erDiagram={erDiagram}
            erLoading={erLoading}
            hasResponse={!!lastResponse}
          />
        </aside>

      </div>
    </div>
  )
}

// ─── Top bar ──────────────────────────────────────────────────────────────────

function Topbar({ backendStatus, sidebarOpen, onToggleSidebar }) {
  const STATUS = {
    checking: { dot: 'bg-accent-amber animate-pulse', label: 'checking…' },
    online:   { dot: 'bg-accent-green',               label: 'connected'    },
    offline:  { dot: 'bg-accent-red',                 label: 'disconnected' },
  }
  const { dot, label } = STATUS[backendStatus] ?? STATUS.checking

  return (
    <header className="flex items-center gap-3 px-4 py-2.5 border-b border-panel-border bg-surface-100 shrink-0 z-10">
      {/* Sidebar toggle */}
      <button
        onClick={onToggleSidebar}
        className="w-7 h-7 rounded-lg flex items-center justify-center border border-panel-border hover:border-accent-cyan/40 hover:text-accent-cyan text-text-muted transition-colors duration-150"
        title={sidebarOpen ? 'Collapse sidebar' : 'Expand sidebar'}
      >
        <span className="font-mono text-xs">{sidebarOpen ? '◁' : '▷'}</span>
      </button>

      {/* Logo */}
      <div className="flex items-center gap-2.5">
        <div className="w-6 h-6 rounded-full border border-accent-cyan/50 flex items-center justify-center shadow-glow-sm">
          <span className="text-accent-cyan text-[10px]">✦</span>
        </div>
        <div>
          <h1 className="font-mono font-semibold text-sm text-text-primary leading-none">
            InsightAgent <span className="text-accent-cyan">AI</span>
          </h1>
          <p className="font-mono text-[9px] text-text-muted leading-none mt-0.5">
            Database Intelligence
          </p>
        </div>
      </div>

      <div className="flex-1" />

      {/* Backend status */}
      <div className="hidden sm:flex items-center gap-1.5 px-2.5 py-1 rounded-full border border-panel-border bg-surface-50">
        <span className={`status-dot ${dot}`} />
        <span className="label-mono text-text-muted">backend: {label}</span>
      </div>
      <span className="label-mono text-text-muted hidden md:block">localhost:8000</span>
    </header>
  )
}

// ─── Left sidebar ─────────────────────────────────────────────────────────────

const SECTIONS = ['main', 'explore', 'tools', 'meta']
const SECTION_LABEL = { main: 'workspace', explore: 'explore', tools: 'tools', meta: '' }

function LeftSidebar({ activeId, onSelect, collapsed }) {
  return (
    <nav className="flex flex-col flex-1 py-3 gap-1 overflow-y-auto">
      {SECTIONS.map(section => {
        const items = SIDEBAR_ITEMS.filter(i => i.section === section)
        if (!items.length) return null
        return (
          <div key={section} className="mb-1">
            {!collapsed && SECTION_LABEL[section] && (
              <p className="px-4 mb-1 label-mono text-[9px] text-text-muted uppercase tracking-widest">
                {SECTION_LABEL[section]}
              </p>
            )}
            {items.map(item => (
              <button
                key={item.id}
                onClick={() => onSelect(item.id)}
                title={collapsed ? item.label : undefined}
                className={[
                  'w-full flex items-center gap-3 px-3 py-2 mx-1 rounded-lg transition-all duration-150 text-left',
                  collapsed ? 'justify-center' : '',
                  activeId === item.id
                    ? 'bg-accent-cyan/10 text-accent-cyan border border-accent-cyan/25'
                    : 'text-text-secondary hover:bg-surface-50 hover:text-text-primary border border-transparent',
                ].join(' ')}
                style={{ width: collapsed ? 'calc(100% - 8px)' : 'calc(100% - 8px)' }}
              >
                <span className="text-sm shrink-0">{item.icon}</span>
                {!collapsed && (
                  <span className="font-mono text-xs truncate">{item.label}</span>
                )}
              </button>
            ))}
          </div>
        )
      })}
    </nav>
  )
}

// ─── Right visualization panel ────────────────────────────────────────────────

function RightPanel({
  rightTab, onTabChange,
  rows, columns, chartType, chartUrl,
  sql,
  explanation, insight, recommendation, question,
  erDiagram, erLoading,
  hasResponse,
}) {
  // Add ER as a right panel tab option when data is available
  const tabs = [
    ...RIGHT_TABS,
    { id: 'er', label: 'ER Diagram', icon: '⬡' },
  ]

  return (
    <div className="flex flex-col h-full bg-surface-100 border-l border-panel-border">

      {/* Tab bar */}
      <div className="flex items-center gap-1 px-3 py-2 border-b border-panel-border shrink-0 bg-surface-100">
        <span className="label-mono text-text-muted mr-1 hidden xl:block">visualize</span>
        {tabs.map(tab => (
          <RightTabBtn
            key={tab.id}
            tab={tab}
            active={rightTab === tab.id}
            hasContent={
              tab.id === 'sql'      ? !!sql         :
              tab.id === 'chart'    ? rows.length > 0 :
              tab.id === 'insights' ? !!explanation || !!insight :
              tab.id === 'er'       ? !!erDiagram   : false
            }
            onClick={() => onTabChange(tab.id)}
          />
        ))}
      </div>

      {/* Panel body */}
      <div className="flex-1 overflow-auto p-3 min-h-0">
        {rightTab === 'insights' && (
          <InsightsPanel
            explanation={explanation}
            insight={insight}
            recommendation={recommendation}
            question={question}
            isLoading={false}
          />
        )}

        {rightTab === 'chart' && (
          <ChartRenderer
            chartUrl={chartUrl}
            data={rows}
            columns={columns}
            chartType={chartType}
            height={280}
          />
        )}

        {rightTab === 'sql' && (
          <SQLViewer
            sql={sql}
            rows={rows}
            columns={columns}
          />
        )}

        {rightTab === 'er' && (
          <MermaidViewer
            definition={erDiagram}
            title="entity relationships"
            id="right-er"
            isLoading={erLoading}
          />
        )}
      </div>
    </div>
  )
}

function RightTabBtn({ tab, active, hasContent, onClick }) {
  return (
    <button
      onClick={onClick}
      className={[
        'relative flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-mono text-xs transition-all duration-150',
        active
          ? 'bg-accent-cyan/10 text-accent-cyan border border-accent-cyan/30'
          : 'text-text-muted hover:text-text-secondary hover:bg-surface-50 border border-transparent',
      ].join(' ')}
    >
      <span className="text-[11px]">{tab.icon}</span>
      <span className="hidden xl:inline">{tab.label}</span>
      {/* Dot badge when panel has content but isn't active */}
      {hasContent && !active && (
        <span className="absolute top-0.5 right-0.5 w-1.5 h-1.5 rounded-full bg-accent-cyan/70" />
      )}
    </button>
  )
}

// ─── Sidebar content wrapper ──────────────────────────────────────────────────

function SidebarContent({ title, icon, children }) {
  return (
    <div className="flex flex-col flex-1 overflow-hidden">
      <div className="flex items-center gap-2 px-5 py-3 border-b border-panel-border shrink-0">
        <span className="text-accent-cyan">{icon}</span>
        <h2 className="font-mono text-sm text-text-primary">{title}</h2>
      </div>
      <div className="flex-1 overflow-y-auto p-4">
        {children}
      </div>
    </div>
  )
}

// ─── Schema panel ─────────────────────────────────────────────────────────────

function SchemaPanel({ schema, isLoading }) {
  const [openTable, setOpenTable] = useState(null)

  if (isLoading) {
    return (
      <div className="space-y-3">
        {[1,2,3].map(i => <div key={i} className="h-12 shimmer-bg rounded-xl" />)}
      </div>
    )
  }

  if (!schema) {
    return (
      <div className="flex flex-col items-center justify-center gap-3 py-16 text-center">
        <span className="text-3xl opacity-20">⊞</span>
        <p className="font-mono text-xs text-text-muted">Schema not loaded yet.</p>
      </div>
    )
  }

  return (
    <div className="space-y-2">
      {schema.database && (
        <div className="flex items-center gap-2 mb-4 px-3 py-2 rounded-xl bg-accent-cyan/5 border border-accent-cyan/20">
          <span className="label-mono text-accent-cyan">database</span>
          <span className="font-mono text-xs text-text-primary ml-auto">{schema.database}</span>
          {schema.dialect && <span className="label-mono text-text-muted">{schema.dialect}</span>}
        </div>
      )}
      {(schema.tables ?? []).map((table, i) => (
        <div key={i} className="rounded-xl border border-panel-border overflow-hidden">
          <button
            onClick={() => setOpenTable(openTable === i ? null : i)}
            className="w-full flex items-center gap-3 px-4 py-2.5 bg-surface-100 hover:bg-surface-50 transition-colors duration-150 text-left"
          >
            <span className="text-accent-amber font-mono text-xs font-semibold">{table.name}</span>
            <span className="ml-auto label-mono text-text-muted">{table.columns?.length ?? 0} cols</span>
            <span className="text-text-muted font-mono text-xs">{openTable === i ? '▲' : '▼'}</span>
          </button>
          {openTable === i && (
            <div className="border-t border-panel-border">
              <table className="w-full text-xs font-mono">
                <thead>
                  <tr className="bg-surface-50">
                    <th className="px-4 py-1.5 text-left label-mono text-text-muted">column</th>
                    <th className="px-4 py-1.5 text-left label-mono text-text-muted">type</th>
                    <th className="px-4 py-1.5 text-left label-mono text-text-muted">nullable</th>
                  </tr>
                </thead>
                <tbody>
                  {(table.columns ?? []).map((col, j) => (
                    <tr key={j} className="border-t border-panel-border/40 hover:bg-accent-cyan/5">
                      <td className="px-4 py-1.5 text-text-primary">{col.name}</td>
                      <td className="px-4 py-1.5 text-accent-magenta">{col.type}</td>
                      <td className="px-4 py-1.5 text-text-muted">{col.nullable ? 'yes' : 'no'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      ))}
    </div>
  )
}

// ─── Settings panel ───────────────────────────────────────────────────────────

function SettingsPanel() {
  return (
    <div className="space-y-4">
      <div className="rounded-xl border border-panel-border p-4 space-y-3">
        <p className="label-mono text-accent-cyan">api configuration</p>
        <SettingRow label="Backend URL" value="http://localhost:8000" />
        <SettingRow label="Model" value="gpt-4 / llm-backend" />
        <SettingRow label="Timeout" value="120s" />
      </div>
      <div className="rounded-xl border border-panel-border p-4 space-y-3">
        <p className="label-mono text-accent-amber">display</p>
        <SettingRow label="Theme" value="Dark (terminal)" />
        <SettingRow label="Chart default" value="bar" />
        <SettingRow label="Max table rows" value="20 / page" />
      </div>
      <p className="label-mono text-text-muted text-center text-[10px] pt-2">
        settings persistence coming soon
      </p>
    </div>
  )
}

function SettingRow({ label, value }) {
  return (
    <div className="flex items-center justify-between">
      <span className="font-mono text-xs text-text-secondary">{label}</span>
      <span className="font-mono text-xs text-text-primary bg-surface-50 px-2 py-0.5 rounded border border-panel-border">{value}</span>
    </div>
  )
}
