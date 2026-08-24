import api from '../api'

export const gradingService = {
  getAll: (params?: Record<string, unknown>) =>
    api.get('/admin/grading', { params }),

  getAttempt: (attemptId: number) =>
    api.get(`/admin/grading/attempt/${attemptId}`),

  gradeAttempt: (attemptId: number, data: Record<string, unknown>) =>
    api.patch(`/admin/grading/attempt/${attemptId}`, data),

  getAnswer: (answerId: number) =>
    api.get(`/admin/grading/${answerId}`),

  updateAnswer: (answerId: number, data: Record<string, unknown>) =>
    api.patch(`/admin/grading/${answerId}`, data),

  aiSuggest: (answerId: number) =>
    api.post(`/admin/grading/${answerId}/ai-suggest`),

  getActiveRubrics: () =>
    api.get('/admin/rubrics/active'),
}
