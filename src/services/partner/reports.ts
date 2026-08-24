import api from '../api'

export const partnerService = {
  getStats: () =>
    api.get('/partner/stats'),

  // Students
  getStudents: (params?: Record<string, unknown>) =>
    api.get('/partner/students', { params }),

  // Reports
  getReports: (params?: Record<string, unknown>) =>
    api.get('/partner/reports', { params }),

  getReport: (attemptId: number) =>
    api.get(`/partner/reports/${attemptId}`),

  // Certificates
  getCertificates: (params?: Record<string, unknown>) =>
    api.get('/partner/certificates', { params }),

  bulkDownloadCertificates: (ids: number[]) =>
    api.post('/partner/certificates/bulk-download', { ids }, { responseType: 'blob' }),

  createCertificateForAttempt: (attemptId: number) =>
    api.post(`/partner/certificates/create-for-attempt/${attemptId}`),
}
