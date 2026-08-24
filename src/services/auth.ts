import api from './api'

export const authService = {
  login: (data: { email: string; password: string }) =>
    api.post('/login', data),

  register: (data: Record<string, unknown>) =>
    api.post('/register', data),

  me: () =>
    api.get('/user'),

  logout: () =>
    api.post('/logout'),

  getProfile: () =>
    api.get('/profile'),

  updateProfile: (data: Record<string, unknown>) =>
    api.patch('/profile', data),
}
