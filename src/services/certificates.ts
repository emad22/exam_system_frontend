import api from './api'

export const certificatesService = {
  // Student
  getMyCertificates: () =>
    api.get('/certificates'),

  download: (id: number) =>
    api.get(`/certificates/${id}/download`, { responseType: 'blob' }),

  // Public
  verify: (code: string) =>
    api.get(`/verify-certificate/${code}`),
}
