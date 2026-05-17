const TIMEOUT_MS = 2 * 60 * 60 * 1000; // 2 Hours inactivity timeout

export const authStorage = {
    setToken(token) {
        localStorage.setItem('token', token);
        this.updateActivity();
    },
    setRole(role) {
        localStorage.setItem('role', role);
        this.updateActivity();
    },
    setUser(user) {
        localStorage.setItem('user', JSON.stringify(user));
        this.updateActivity();
    },
    updateActivity() {
        localStorage.setItem('last_activity', Date.now().toString());
    },
    getToken() {
        if (this.isExpired()) {
            this.clear();
            return null;
        }
        this.updateActivity();
        return localStorage.getItem('token');
    },
    getRole() {
        if (this.isExpired()) {
            this.clear();
            return null;
        }
        return localStorage.getItem('role');
    },
    getUser() {
        if (this.isExpired()) {
            this.clear();
            return null;
        }
        const userStr = localStorage.getItem('user');
        return userStr ? JSON.parse(userStr) : null;
    },
    isExpired() {
        const token = localStorage.getItem('token');
        if (!token) return true; // No token means no session

        const lastActivity = localStorage.getItem('last_activity');
        if (!lastActivity) return true; // No timestamp means expired/invalid

        const elapsed = Date.now() - parseInt(lastActivity, 10);
        return elapsed > TIMEOUT_MS;
    },
    clear() {
        localStorage.removeItem('token');
        localStorage.removeItem('role');
        localStorage.removeItem('user');
        localStorage.removeItem('last_activity');
    }
};
