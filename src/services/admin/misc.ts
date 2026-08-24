import api from '../api'

// Dashboard
export const dashboardService = {
  getStats: () => api.get('/admin/stats'),
  getLiveStudents: () => api.get('/admin/live-students'),
}

// Notifications
export const notificationsService = {
  getAll: () => api.get('/admin/notifications'),
  markAsRead: (ids: number[]) => api.post('/admin/notifications/mark-as-read', { ids }),
}

// Activity Logs
export const activityLogsService = {
  getAll: (params?: Record<string, unknown>) =>
    api.get('/admin/activity-logs', { params }),

  getOne: (id: number) =>
    api.get(`/admin/activity-logs/${id}`),

  destroy: (id: number) =>
    api.delete(`/admin/activity-logs/${id}`),

  bulkDelete: (ids: number[]) =>
    api.post('/admin/activity-logs/bulk-delete', { ids }),
}

// Packages
export const packagesService = {
  getAll: () => api.get('/admin/packages'),
  getOne: (id: number) => api.get(`/admin/packages/${id}`),
  create: (data: Record<string, unknown>) => api.post('/admin/packages', data),
  update: (id: number, data: Record<string, unknown>) => api.patch(`/admin/packages/${id}`, data),
  destroy: (id: number) => api.delete(`/admin/packages/${id}`),
}

// Exam Categories
export const examCategoriesService = {
  getAll: () => api.get('/admin/exam-categories'),
  getPublic: () => api.get('/public/exam-categories'),
  create: (data: Record<string, unknown>) => api.post('/admin/exam-categories', data),
  update: (id: number, data: Record<string, unknown>) => api.patch(`/admin/exam-categories/${id}`, data),
  destroy: (id: number) => api.delete(`/admin/exam-categories/${id}`),
}

// System Requirements
export const systemRequirementsService = {
  getAll: () => api.get('/admin/system-requirements'),
  getPublic: () => api.get('/public/system-requirements'),
  create: (data: Record<string, unknown>) => api.post('/admin/system-requirements', data),
  update: (id: number, formData: FormData) => {
    formData.append('_method', 'PATCH')
    return api.post(`/admin/system-requirements/${id}`, formData)
  },
  destroy: (id: number) => api.delete(`/admin/system-requirements/${id}`),
}

// Rubrics
export const rubricsService = {
  getAll: () => api.get('/admin/rubrics'),
  getActive: () => api.get('/admin/rubrics/active'),
  getOne: (id: number) => api.get(`/admin/rubrics/${id}`),
  create: (data: Record<string, unknown>) => api.post('/admin/rubrics', data),
  update: (id: number, data: Record<string, unknown>) => api.patch(`/admin/rubrics/${id}`, data),
  destroy: (id: number) => api.delete(`/admin/rubrics/${id}`),
  resetDefault: () => api.post('/admin/rubrics/reset-default'),
}

// CEFR / ACTFL Thresholds
export const cefrActflService = {
  getAll: () => api.get('/admin/cefr-actfl-thresholds'),
  getFlat: () => api.get('/admin/cefr-actfl-thresholds/flat'),
  getOne: (id: number) => api.get(`/admin/cefr-actfl-thresholds/${id}`),
  create: (data: Record<string, unknown>) => api.post('/admin/cefr-actfl-thresholds', data),
  update: (id: number, data: Record<string, unknown>) => api.patch(`/admin/cefr-actfl-thresholds/${id}`, data),
  destroy: (id: number) => api.delete(`/admin/cefr-actfl-thresholds/${id}`),
  bulkUpdate: (data: Record<string, unknown>) => api.put('/admin/cefr-actfl-thresholds/bulk-update', data),
}

// Languages
export const languagesService = {
  getAll: () => api.get('/admin/languages'),
}

// Passages
export const passagesService = {
  getAll: () => api.get('/admin/passages'),
}
