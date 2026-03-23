const BASE = '/api'

async function req(path, options = {}) {
  const resp = await fetch(BASE + path, {
    headers: { 'Content-Type': 'application/json', ...options.headers },
    ...options,
  })
  if (!resp.ok) {
    const err = await resp.json().catch(() => ({}))
    throw new Error(err.detail || `HTTP ${resp.status}`)
  }
  return resp.json()
}

export const api = {
  // Stats
  getStats: () => req('/receipts/stats'),

  // Receipts
  getReceipts: (status, limit = 50, offset = 0) => {
    const params = new URLSearchParams({ limit, offset })
    if (status) params.set('status', status)
    return req(`/receipts?${params}`)
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

  // Clients
  getClients: () => req('/clients'),
  deactivateClient: (id) =>
    req(`/clients/${id}/deactivate`, { method: 'PATCH' }),
  updateClientName: (id, name) =>
    req(`/clients/${id}/name?name=${encodeURIComponent(name)}`, { method: 'PATCH' }),

  // Reports
  requestReport: (message) =>
    req('/reports/request', { method: 'POST', body: JSON.stringify({ message }) }),
  sendNow: () => req('/reports/send-now', { method: 'POST' }),
}
