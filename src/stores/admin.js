import { defineStore } from 'pinia';
import api from '@/services/api';

export const useAdminStore = defineStore('admin', {
  state: () => ({
    user: null,
    notifications: [],
    lastFetched: 0,
    notifFailCount: 0
  }),
  actions: {
    async fetchUser() {
      if (this.user) return this.user;
      try {
        const res = await api.get('/user');
        this.user = res.data;
        return this.user;
      } catch (err) {
        console.error('Auth check failed', err);
        throw err;
      }
    },
    async fetchNotifications() {
      try {
        const res = await api.get('/admin/notifications');
        this.notifications = res.data;
        this.notifFailCount = 0; // reset on success
      } catch (err) {
        this.notifFailCount = (this.notifFailCount || 0) + 1;
        if (this.notifFailCount <= 3) {
          console.error('Notifications fetch failed', err);
        }
        // throw so the caller can stop polling after too many failures
        throw err;
      }
    },
    clearNotifications() {
      this.notifications = [];
    },
    markAsRead(id) {
      this.notifications = this.notifications.filter(n => n.id !== id);
    }
  }
});
