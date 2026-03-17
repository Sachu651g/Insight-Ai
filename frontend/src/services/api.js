/**
 * InsightAgent AI — API Service
 * ================================
 * Connects to the FastAPI backend at http://localhost:8000
 *
 * Actual /ask response shape (from api_server.py):
 * {
 *   question:       string,
 *   sql:            string | null,
 *   data:           object[] | null,
 *   chart:          string | null,   ← URL path: "/charts/chart.png"
 *   chart_type:     string,          ← "bar" | "line" | "pie"
 *   explanation:    string,
 *   insight:        string,
 *   recommendation: string,
 *   suggestions:    string[],
 * }
 */

import axios from 'axios'

// ── Base URL ──────────────────────────────────────────────────────────────────
// Override with VITE_API_URL env var in production.
const API_BASE_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:8000'

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
    Accept: 'application/json',
  },
  timeout: 120_000,   // 2 min — LLM + SQL can be slow
})

// ── Request interceptor ───────────────────────────────────────────────────────
api.interceptors.request.use(
  config => config,
  error  => Promise.reject(error),
)

// ── Response interceptor — unwrap .data + normalise errors ───────────────────
api.interceptors.response.use(
  response => response.data,       // callers receive plain JSON, not AxiosResponse
  error => {
    const detail = error.response?.data?.detail
    const message = Array.isArray(detail)
      ? detail.map(e => `${(e.loc ?? []).join('.')} — ${e.msg}`).join('; ')
      : detail ?? error.response?.data?.message ?? error.message ?? 'Unexpected error'

    const apiError = new APIError(message, {
      status: error.response?.status ?? null,
      data:   error.response?.data   ?? null,
    })
    console.error('[InsightAgent API]', apiError.toString())
    return Promise.reject(apiError)
  },
)

// ── Custom error class ────────────────────────────────────────────────────────

export class APIError extends Error {
  constructor(message, { status = null, data = null } = {}) {
    super(message)
    this.name   = 'APIError'
    this.status = status
    this.data   = data
  }
  get isNetworkError() { return this.status === null }
  get isClientError()  { return this.status >= 400 && this.status < 500 }
  get isServerError()  { return this.status >= 500 }
  toString() {
    return this.status
      ? `APIError ${this.status}: ${this.message}`
      : `APIError (network): ${this.message}`
  }
}

// ── Type definitions (JSDoc) ──────────────────────────────────────────────────

/**
 * @typedef {Object} AskAIResponse
 * @property {string}      question        Echoed user question
 * @property {string}      sql             Generated SQL (may be empty for forecasts/chat)
 * @property {Object[]}    data            Result rows
 * @property {string|null} chartUrl        Full URL to chart image  e.g. "http://localhost:8000/charts/chart.png"
 * @property {string}      chartType       Plotly type hint: "bar"|"line"|"pie"|"scatter"
 * @property {string}      explanation     LLM explanation text
 * @property {string}      insight         Rule-based insight summary
 * @property {string}      recommendation  Rule-based business recommendation
 * @property {string[]}    suggestions     Follow-up question suggestions
 */

// ── askAI ─────────────────────────────────────────────────────────────────────

/**
 * POST /ask
 *
 * Sends a natural-language query to the LLM agent.
 *
 * @param {string} query
 * @returns {Promise<AskAIResponse>}
 *
 * @example
 * const r = await askAI('Which products generate the highest revenue?')
 * console.log(r.sql)          // "SELECT p.name, SUM(...) ..."
 * console.log(r.data)         // [{ name: 'Widget A', total_revenue: 4200 }, ...]
 * console.log(r.chartUrl)     // "http://localhost:8000/charts/chart.png"
 * console.log(r.chartType)    // "bar"
 * console.log(r.explanation)  // "Widget A dominates..."
 * console.log(r.suggestions)  // ["Which product sells the most?", ...]
 */
export async function askAI(query) {
  if (!query?.trim()) throw new TypeError('askAI: query must be a non-empty string')

  const raw = await api.post('/ask', { query: query.trim() })
  return normaliseAskResponse(raw)
}

// ── getSchema ─────────────────────────────────────────────────────────────────

/**
 * GET /schema
 *
 * @returns {Promise<{ database: string, dialect: string, tables: SchemaTable[] }>}
 */
export async function getSchema() {
  const raw = await api.get('/schema')
  return {
    database: raw.database ?? 'ecommerce.db',
    dialect:  raw.dialect  ?? 'SQLite',
    tables:   (raw.tables  ?? []).map(normaliseTable),
  }
}

// ── getERDiagram ──────────────────────────────────────────────────────────────

/**
 * GET /er-diagram
 *
 * @returns {Promise<{ diagram: string, title: string }>}
 */
export async function getERDiagram() {
  const raw = await api.get('/er-diagram')

  if (typeof raw === 'string') return { diagram: raw, title: 'ER Diagram' }

  const diagram =
    raw.diagram    ??
    raw.mermaid    ??
    raw.er_diagram ??
    raw.content    ?? ''

  if (!diagram) throw new APIError('GET /er-diagram returned an empty diagram')

  return { diagram, title: raw.title ?? 'ER Diagram' }
}

// ── getStarterSuggestions ─────────────────────────────────────────────────────

/**
 * GET /suggestions
 *
 * @returns {Promise<string[]>}
 */
export async function getStarterSuggestions() {
  try {
    const raw = await api.get('/suggestions')
    return Array.isArray(raw)
      ? raw
      : Array.isArray(raw.suggestions) ? raw.suggestions : []
  } catch {
    // Non-critical — fall back to client-side defaults silently
    return []
  }
}

// ── healthCheck ───────────────────────────────────────────────────────────────

/**
 * GET /health
 * Never throws — returns true/false.
 *
 * @returns {Promise<boolean>}
 */
export async function healthCheck() {
  try {
    await api.get('/health')
    return true
  } catch {
    return false
  }
}

// ── Normalisers ───────────────────────────────────────────────────────────────

function normaliseAskResponse(raw) {
  if (!raw || typeof raw !== 'object') {
    throw new APIError('Malformed /ask response')
  }

  // The backend returns chart as a relative path like "/charts/chart.png".
  // Convert to an absolute URL so <img src> works from the browser.
  const chartPath = coerceString(raw.chart)
  const chartUrl  = chartPath
    ? chartPath.startsWith('http')
      ? chartPath
      : `${API_BASE_URL}${chartPath.startsWith('/') ? '' : '/'}${chartPath}`
    : null

  return {
    question:       coerceString(raw.question),
    sql:            coerceString(raw.sql),
    data:           coerceArray(raw.data),
    chartUrl,                                        // full URL ready for <img>
    chartType:      coerceString(raw.chart_type).toLowerCase() || 'bar',
    explanation:    coerceString(raw.explanation),
    insight:        coerceString(raw.insight),
    recommendation: coerceString(raw.recommendation),
    suggestions:    coerceStringArray(raw.suggestions),
  }
}

function normaliseTable(raw) {
  if (!raw) return { name: '', columns: [], primaryKeys: [], foreignKeys: [] }
  return {
    name: coerceString(raw.name),
    columns: coerceArray(raw.columns).map(c => ({
      name:     coerceString(c?.name),
      type:     coerceString(c?.type) || 'TEXT',
      nullable: c?.nullable !== false,
    })),
    primaryKeys: coerceStringArray(raw.primaryKeys ?? raw.primary_keys),
    foreignKeys: coerceArray(raw.foreignKeys ?? raw.foreign_keys).map(fk => ({
      column:     coerceString(fk?.column),
      references: coerceString(fk?.references),
    })),
  }
}

// ── Micro-helpers ─────────────────────────────────────────────────────────────

function coerceString(v) {
  if (v == null)             return ''
  if (typeof v === 'string') return v.trim()
  if (typeof v === 'number' || typeof v === 'boolean') return String(v)
  return ''
}

function coerceArray(v) {
  if (Array.isArray(v)) return v
  if (v == null)        return []
  return [v]
}

function coerceStringArray(v) {
  return coerceArray(v).map(coerceString).filter(Boolean)
}

export default api
