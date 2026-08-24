import api from '../api'

export const staffService = {
  getAll: (params?: Record<string, unknown>) =>
    api.get('/admin/staff', { params }),

  getOne: (id: number) =>
    api.get(`/admin/staff/${id}`),

  create: (data: Record<string, unknown>) =>
    api.post('/admin/staff', data),

  update: (id: number, data: Record<string, unknown>) =>
    api.patch(`/admin/staff/${id}`, data),

  destroy: (id: number) =>
    api.delete(`/admin/staff/${id}`),
}
