// src/services/authStorage.ts

const TIMEOUT_MS = 2 * 60 * 60 * 1000; // 2 Hours inactivity timeout

export interface User {
    id?: number;
    name?: string;
    email?: string;
    role?: string;
    [key: string]: unknown;
}

export const authStorage = {
    setToken(token: string): void {
        localStorage.setItem('token', token);
        this.updateActivity();
    },

    setRole(role: string): void {
        localStorage.setItem('role', role);
        this.updateActivity();
    },

    setUser(user: User): void {
        localStorage.setItem('user', JSON.stringify(user));
        this.updateActivity();
    },

    updateActivity(): void {
        localStorage.setItem('last_activity', Date.now().toString());
    },

    getToken(): string | null {
        if (this.isExpired()) {
            this.clear();
            return null;
        }

        this.updateActivity();

        return localStorage.getItem('token');
    },

    getRole(): string | null {
        if (this.isExpired()) {
            this.clear();
            return null;
        }

        return localStorage.getItem('role');
    },

    getUser(): User | null {
        if (this.isExpired()) {
            this.clear();
            return null;
        }

        const userStr = localStorage.getItem('user');

        return userStr ? (JSON.parse(userStr) as User) : null;
    },

    isExpired(): boolean {
        const token = localStorage.getItem('token');

        if (!token) {
            return true;
        }

        const lastActivity = localStorage.getItem('last_activity');

        if (!lastActivity) {
            return true;
        }

        const elapsed = Date.now() - parseInt(lastActivity, 10);

        return elapsed > TIMEOUT_MS;
    },

    clear(): void {
        localStorage.removeItem('token');
        localStorage.removeItem('role');
        localStorage.removeItem('user');
        localStorage.removeItem('last_activity');
    }
};