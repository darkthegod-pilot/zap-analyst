const BASE = '/api'

function getToken() {
  return localStorage.getItem('dc_auth_token') || ''
}

async function req(path, options = {}) {
  const token = getToken()
  const resp = await fetch(BASE + path, {
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...options.headers,
    },
    ...options,
  })
  if (!resp.ok) {
    const err = await resp.json().catch(() => ({}))
    throw new Error(err.detail || `Erro HTTP ${resp.status}`)
  }
  if (resp.status === 204) return null
  return resp.json()
}

function buildParams(obj) {
  const p = new URLSearchParams()
  Object.entries(obj).forEach(([k, v]) => {
    if (v !== null && v !== undefined && v !== '') p.set(k, v)
  })
  return p.toString()
}

export const api = {
  // ── Stats ─────────────────────────────────────────────────────────────────
  getStats: ({ date_from, date_to } = {}) => {
    const qs = buildParams({ date_from, date_to })
    return req(`/receipts/stats${qs ? '?' + qs : ''}`)
  },

  // ── Receipts ───────────────────────────────────────────────────────────────
  getReceipts: ({ status, date_from, date_to, q, limit = 20, offset = 0 } = {}) => {
    const qs = buildParams({ status, date_from, date_to, q, limit, offset })
    return req(`/receipts?${qs}`)
  },

  getReceipt: (id) => req(`/receipts/${id}`),

  reanalyzeReceipt: (id) =>
    req(`/receipts/${id}/reanalyze`, { method: 'POST' }),

  approveReceipt: (id, notes) =>
    req(`/receipts/${id}/approve`, {
      method: 'PATCH',
      body: JSON.stringify({ notes }),
    }),

  rejectReceipt: (id, notes) =>
    req(`/receipts/${id}/reject`, {
      method: 'PATCH',
      body: JSON.stringify({ notes }),
    }),

  // ── Clients ────────────────────────────────────────────────────────────────
  getClients: ({ date_from, date_to, q, limit = 20, offset = 0 } = {}) => {
    const qs = buildParams({ date_from, date_to, q, limit, offset })
    return req(`/clients?${qs}`)
  },

  getClientScore: (id) => req(`/clients/${id}/score`),

  createClient: (data) =>
    req('/clients', { method: 'POST', body: JSON.stringify(data) }),

  deleteClient: (id) =>
    req(`/clients/${id}`, { method: 'DELETE' }),

  freezeClient: (id) =>
    req(`/clients/${id}/freeze`, { method: 'PATCH' }),

  activateClient: (id) =>
    req(`/clients/${id}/activate`, { method: 'PATCH' }),

  deactivateClient: (id) =>
    req(`/clients/${id}/deactivate`, { method: 'PATCH' }),

  updateClientName: (id, name) =>
    req(`/clients/${id}/name`, { method: 'PATCH', body: JSON.stringify({ name }) }),

  updateClientNotes: (id, notes) =>
    req(`/clients/${id}/notes`, { method: 'PATCH', body: JSON.stringify({ notes }) }),

  // ── Calote ────────────────────────────────────────────────────────────────
  getCaloteClients: ({ limit = 20, offset = 0 } = {}) => {
    const qs = buildParams({ limit, offset })
    return req(`/clients/calote?${qs}`)
  },

  removeCalote: (id) =>
    req(`/clients/${id}/remove-calote`, { method: 'PATCH' }),

  // ── Bulk ──────────────────────────────────────────────────────────────────
  bulkAction: (ids, action) =>
    req('/receipts/bulk', { method: 'POST', body: JSON.stringify({ ids, action }) }),

  // ── Reports ────────────────────────────────────────────────────────────────
  getReportSummary: (period = 'today') =>
    req(`/reports/summary?period=${period}`),

  requestReport: (message) =>
    req('/reports/request', { method: 'POST', body: JSON.stringify({ message }) }),

  sendNow: () =>
    req('/reports/send-now', { method: 'POST' }),

  // ── Auth ──────────────────────────────────────────────────────────────────
  verifyPin: (pin) =>
    req('/auth/verify-pin', { method: 'POST', body: JSON.stringify({ pin }) }),

  checkToken: (token) =>
    req(`/auth/check?token=${encodeURIComponent(token)}`),

  // ── Settings ───────────────────────────────────────────────────────────────
  getSettings: () => req('/settings'),

  saveSettings: (data) =>
    req('/settings', { method: 'PUT', body: JSON.stringify(data) }),

  testZapi: () =>
    req('/settings/test-zapi', { method: 'POST' }),

  testOpenAI: () =>
    req('/settings/test-openai', { method: 'POST' }),
}
