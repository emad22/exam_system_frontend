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
        const proctorSessionId = localStorage.getItem('active_proctoring_session_id');
        const proctorSessionToken = localStorage.getItem('active_proctoring_session_token');
        if (proctorSessionId && proctorSessionToken) {
            const getApiBaseUrl = () => {
                const envUrl = import.meta.env?.VITE_API_BASE_URL;
                if (envUrl) return envUrl;
                if (typeof window !== 'undefined') {
                    const isLocal = ['localhost', '127.0.0.1'].includes(window.location.hostname);
                    return isLocal ? 'http://localhost:8000/api/v1' : `${window.location.origin}/api/v1`;
                }
                return '/api/v1';
            };
            const blob = new Blob(
                [JSON.stringify({
                    close_reason: 'session_expired',
                    session_token: proctorSessionToken,
                    ended_at: new Date().toISOString(),
                })],
                { type: 'application/json' }
            );
            navigator.sendBeacon(`${getApiBaseUrl()}/proctoring/session/${proctorSessionId}/end-beacon`, blob);
        }

        localStorage.removeItem('token');
        localStorage.removeItem('role');
        localStorage.removeItem('user');
        localStorage.removeItem('last_activity');
        localStorage.removeItem('active_proctoring_session_id');
        localStorage.removeItem('active_proctoring_session_token');
    }
};