import api from '../api'

export const skillsService = {
  getAll: () =>
    api.get('/admin/skills'),

  getWithLevels: () =>
    api.get('/admin/skills-with-levels'),

  getSkillWithLevels: (skillId: number) =>
    api.get(`/admin/skills/${skillId}/levels`),

  create: (data: Record<string, unknown>) =>
    api.post('/admin/skills', data),

  update: (id: number, data: Record<string, unknown>) =>
    api.patch(`/admin/skills/${id}`, data),

  destroy: (id: number) =>
    api.delete(`/admin/skills/${id}`),

  bulkUpdateLevels: (skillId: number, data: Record<string, unknown>) =>
    api.post(`/admin/skills/${skillId}/levels/bulk`, data),
}

export const levelsService = {
  getAll: () =>
    api.get('/admin/levels'),

  getOne: (id: number) =>
    api.get(`/admin/levels/${id}`),

  create: (data: Record<string, unknown>) =>
    api.post('/admin/levels', data),

  update: (id: number, formData: FormData) => {
    formData.append('_method', 'PATCH')
    return api.post(`/admin/levels/${id}`, formData)
  },

  destroy: (id: number) =>
    api.delete(`/admin/levels/${id}`),
}
