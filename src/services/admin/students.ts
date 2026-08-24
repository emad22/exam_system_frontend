import api from '../api'

export const studentsService = {
  getAll: (params?: Record<string, unknown>) =>
    api.get('/admin/students', { params }),

  getOne: (id: number) =>
    api.get(`/admin/students/${id}`),

  create: (data: Record<string, unknown>) =>
    api.post('/admin/students', data),

  update: (id: number, data: Record<string, unknown>) =>
    api.patch(`/admin/students/${id}`, data),

  destroy: (id: number) =>
    api.delete(`/admin/students/${id}`),

  bulkDelete: (ids: number[]) =>
    api.post('/admin/students/bulk-delete', { ids }),

  batchImport: (formData: FormData) =>
    api.post('/admin/students/batch', formData),

  downloadTemplate: () =>
    api.get('/admin/students/template', { responseType: 'blob' }),

  bulkUpdateSkills: (data: Record<string, unknown>) =>
    api.post('/admin/students/bulk-skills', data),

  exportSkills: () =>
    api.get('/admin/students/bulk-skills-export', { responseType: 'blob' }),

  importSkills: (formData: FormData) =>
    api.post('/admin/students/bulk-skills-import', formData),

  reset: (id: number) =>
    api.post(`/admin/students/${id}/reset`),

  toggleBypassIdentityVerification: (id: number) =>
    api.post(`/admin/students/${id}/toggle-bypass-identity-verification`),
}
