import api from '../api'

export const attemptsService = {
  // Exam listing & session
  getExams: (params?: Record<string, unknown>) =>
    api.get('/exams', { params }),

  getExam: (examId: number) =>
    api.get(`/exams/${examId}`),

  start: (examId: number) =>
    api.post(`/exams/${examId}/start`),

  resetDemo: (examId: number) =>
    api.post(`/exams/${examId}/reset-demo`),

  // Attempt operations
  getAttempt: (attemptId: number) =>
    api.get(`/attempts/${attemptId}`),

  finish: (attemptId: number, data?: Record<string, unknown>) =>
    api.post(`/attempts/${attemptId}/completion`, data),

  // Progress
  getNextBatch: (attemptId: number, params?: Record<string, unknown>) =>
    api.get(`/attempts/${attemptId}/next-batch`, { params }),

  submitBatch: (attemptId: number, data: Record<string, unknown>) =>
    api.post(`/attempts/${attemptId}/submit-batch`, data),

  saveAnswer: (attemptId: number, data: Record<string, unknown>) =>
    api.post(`/attempts/${attemptId}/save-answer`, data),

  updateProgress: (attemptId: number, data: Record<string, unknown>) =>
    api.patch(`/attempts/${attemptId}/progress`, data),

  // Security
  timeout: (attemptId: number) =>
    api.post(`/attempts/${attemptId}/timeout`),

  logWarning: (attemptId: number, data: Record<string, unknown>) =>
    api.post(`/attempts/${attemptId}/warnings`, data),

  // Results
  getResults: (attemptId: number) =>
    api.get(`/attempts/${attemptId}/results`),
}
