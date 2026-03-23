const BASE = '/api'

async function req(path, options = {}) {
  const resp = await fetch(BASE + path, {
    headers: { 'Content-Type': 'application/json', ...options.headers },
    ...options,
  })
  if (!resp.ok) {
    const err = await resp.json().catch(() => ({}))
    throw new Error(err.detail || `Erro HTTP ${resp.status}`)
  }
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
  getReceipts: ({ status, date_from, date_to, limit = 20, offset = 0 } = {}) => {
    const qs = buildParams({ status, date_from, date_to, limit, offset })
    return req(`/receipts?${qs}`)
  },

  getReceipt: (id) => req(`/receipts/${id}`),

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
  getClients: ({ date_from, date_to, limit = 20, offset = 0 } = {}) => {
    const qs = buildParams({ date_from, date_to, limit, offset })
    return req(`/clients?${qs}`)
  },

  deactivateClient: (id) =>
    req(`/clients/${id}/deactivate`, { method: 'PATCH' }),

  updateClientName: (id, name) =>
    req(`/clients/${id}/name?name=${encodeURIComponent(name)}`, { method: 'PATCH' }),

  // ── Reports ────────────────────────────────────────────────────────────────
  requestReport: (message) =>
    req('/reports/request', { method: 'POST', body: JSON.stringify({ message }) }),

  sendNow: () =>
    req('/reports/send-now', { method: 'POST' }),
}
