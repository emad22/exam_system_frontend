import api from '../api'

export const reportsService = {
  getAll: (params?: Record<string, unknown>) =>
    api.get('/admin/reports', { params }),

  getOne: (attemptId: number) =>
    api.get(`/admin/reports/${attemptId}`),

  reset: (attemptId: number) =>
    api.post(`/admin/reports/${attemptId}/reset`),

  forceComplete: (attemptId: number) =>
    api.post(`/admin/reports/${attemptId}/force-complete`),

  resetSkill: (attemptId: number, skillId: number) =>
    api.post(`/admin/reports/${attemptId}/skills/${skillId}/reset`),

  resetLastLevel: (attemptId: number, skillId: number) =>
    api.post(`/admin/reports/${attemptId}/skills/${skillId}/reset-last-level`),
}
