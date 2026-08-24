import api from '../api'

export const questionsService = {
  getAll: (params?: Record<string, unknown>) =>
    api.get('/admin/questions', { params }),

  getOne: (id: number) =>
    api.get(`/admin/questions/${id}`),

  preview: (id: number) =>
    api.get(`/admin/questions/${id}/preview`),

  create: (formData: FormData) =>
    api.post('/admin/questions', formData),

  update: (id: number, formData: FormData) => {
    formData.append('_method', 'PATCH')
    return api.post(`/admin/questions/${id}`, formData)
  },

  destroy: (id: number) =>
    api.delete(`/admin/questions/${id}`),

  duplicate: (id: number) =>
    api.post(`/admin/questions/${id}/duplicate`),

  bulkUpdateLevel: (data: { question_ids: number[]; level_id: number }) =>
    api.post('/admin/questions/bulk-level', data),

  getBySkill: (skillId: number) =>
    api.get(`/admin/skills/${skillId}/questions`),

  getTagsBySkill: (skillId: number) =>
    api.get(`/admin/skills/${skillId}/tags`),

  uploadMedia: (formData: FormData) =>
    api.post('/admin/media/upload', formData),

  streamPdf: (questionId: number) =>
    api.get(`/questions/${questionId}/pdf`, { responseType: 'blob' }),
}
