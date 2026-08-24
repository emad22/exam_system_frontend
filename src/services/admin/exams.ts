import api from '../api'

export const examsService = {
  getAll: (params?: Record<string, unknown>) =>
    api.get('/admin/exams', { params }),

  getOne: (id: number) =>
    api.get(`/admin/exams/${id}`),

  create: (data: Record<string, unknown>) =>
    api.post('/admin/exams', data),

  update: (id: number, data: Record<string, unknown>) =>
    api.patch(`/admin/exams/${id}`, data),

  setDefault: (id: number) =>
    api.patch(`/admin/exams/${id}/set-default`),

  destroy: (id: number) =>
    api.delete(`/admin/exams/${id}`),

  importFolder: (data: Record<string, unknown>) =>
    api.post('/admin/exams/import-folder', data),
}
