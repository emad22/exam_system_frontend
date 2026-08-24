import api from '../api'

export const adminProctoringService = {
  getAll: (params?: Record<string, unknown>) =>
    api.get('/admin/proctoring', { params }),

  getStatistics: () =>
    api.get('/admin/proctoring/statistics'),

  getSession: (sessionId: number) =>
    api.get(`/admin/proctoring/${sessionId}`),

  getViolations: (sessionId: number) =>
    api.get(`/admin/proctoring/${sessionId}/violations`),

  getReport: (sessionId: number) =>
    api.get(`/admin/proctoring/${sessionId}/report`),

  exportReport: (sessionId: number) =>
    api.get(`/admin/proctoring/${sessionId}/export`, { responseType: 'blob' }),

  getStudentSessions: (studentId: number) =>
    api.get(`/admin/proctoring/student/${studentId}`),

  updateStatus: (sessionId: number, data: Record<string, unknown>) =>
    api.patch(`/admin/proctoring/${sessionId}/status`, data),

  reviewViolation: (violationId: number, data: Record<string, unknown>) =>
    api.post(`/admin/proctoring/${violationId}/review`, data),

  endSkill: (sessionId: number, data: Record<string, unknown>) =>
    api.post(`/admin/proctoring/${sessionId}/end-skill`, data),

  destroy: (sessionId: number) =>
    api.delete(`/admin/proctoring/${sessionId}`),

  deleteAllStudentSessions: (studentId: number) =>
    api.delete(`/admin/proctoring/student/${studentId}/all`),

  bulkDelete: (ids: number[]) =>
    api.post('/admin/proctoring/bulk-delete', { ids }),
}
