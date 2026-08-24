import api from '../api'

export const certificatesService = {
  // Admin
  getAll: (params?: Record<string, unknown>) =>
    api.get('/admin/certificates', { params }),

  toggleVisibility: (id: number) =>
    api.patch(`/admin/certificates/${id}/toggle-visibility`),

  bulkDownload: (ids: number[]) =>
    api.post('/admin/certificates/bulk-download', { ids }, { responseType: 'blob' }),

  createForAttempt: (attemptId: number) =>
    api.post(`/admin/certificates/create-for-attempt/${attemptId}`),

  destroy: (id: number) =>
    api.delete(`/admin/certificates/${id}`),

  // Templates
  getTemplates: () =>
    api.get('/admin/certificate-templates'),

  getTemplate: (id: number) =>
    api.get(`/admin/certificate-templates/${id}`),

  previewTemplate: (id: number) =>
    api.get(`/admin/certificate-templates/${id}/preview`, { responseType: 'blob' }),

  createTemplate: (formData: FormData) =>
    api.post('/admin/certificate-templates', formData),

  updateTemplate: (id: number, formData: FormData) => {
    formData.append('_method', 'PATCH')
    return api.post(`/admin/certificate-templates/${id}`, formData)
  },

  destroyTemplate: (id: number) =>
    api.delete(`/admin/certificate-templates/${id}`),
}
