import api from '../api'

export const partnersService = {
  getAll: (params?: Record<string, unknown>) =>
    api.get('/admin/partners', { params }),

  getActive: () =>
    api.get('/admin/partners/active'),

  getOne: (id: number) =>
    api.get(`/admin/partners/${id}`),

  create: (data: Record<string, unknown>) =>
    api.post('/admin/partners', data),

  update: (id: number, data: Record<string, unknown>) =>
    api.patch(`/admin/partners/${id}`, data),

  destroy: (id: number) =>
    api.delete(`/admin/partners/${id}`),

  hold: (id: number) =>
    api.post(`/admin/partners/${id}/hold`),

  unhold: (id: number) =>
    api.post(`/admin/partners/${id}/unhold`),
}
