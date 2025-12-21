/**
 * API Client for Frontend
 */

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

interface ApiResponse<T> {
    success: boolean;
    data?: T;
    message?: string;
    error?: string;
}

class ApiClient {
    private token: string | null = null;

    setToken(token: string | null) {
        this.token = token;
        if (typeof window !== 'undefined') {
            if (token) {
                localStorage.setItem('token', token);
            } else {
                localStorage.removeItem('token');
            }
        }
    }

    getToken(): string | null {
        if (this.token) return this.token;
        if (typeof window !== 'undefined') {
            return localStorage.getItem('token');
        }
        return null;
    }

    private async request<T>(
        endpoint: string,
        options: RequestInit = {}
    ): Promise<ApiResponse<T>> {
        const token = this.getToken();

        const headers: HeadersInit = {
            'Content-Type': 'application/json',
            ...(token && { Authorization: `Bearer ${token}` }),
            ...options.headers,
        };

        const response = await fetch(`${API_BASE}${endpoint}`, {
            ...options,
            headers,
        });

        const data = await response.json();
        return data;
    }

    // Auth
    async register(username: string, email: string, password: string) {
        return this.request<{ user: any; token: string }>('/api/auth/register', {
            method: 'POST',
            body: JSON.stringify({ username, email, password }),
        });
    }

    async login(email: string, password: string) {
        const result = await this.request<{ user: any; token: string }>('/api/auth/login', {
            method: 'POST',
            body: JSON.stringify({ email, password }),
        });
        if (result.success && result.data?.token) {
            this.setToken(result.data.token);
        }
        return result;
    }

    async logout() {
        const result = await this.request('/api/auth/logout', { method: 'POST' });
        this.setToken(null);
        return result;
    }

    async getCurrentUser() {
        return this.request<any>('/api/auth/me');
    }

    // Onboarding
    async getOnboardingStatus() {
        return this.request<any>('/api/onboarding/status');
    }

    async saveOnboardingStep(step: number, data: any) {
        return this.request('/api/onboarding/step', {
            method: 'POST',
            body: JSON.stringify({ step, data }),
        });
    }

    // Trading
    async getTradingStatus() {
        return this.request<any>('/api/trading/status');
    }

    async enableTrading(disclaimerAccepted: boolean) {
        return this.request('/api/trading/enable', {
            method: 'PUT',
            body: JSON.stringify({ disclaimerAccepted }),
        });
    }

    async disableTrading() {
        return this.request('/api/trading/disable', { method: 'PUT' });
    }

    async updateTradingSettings(settings: { tradingMode?: string; strategyMode?: string }) {
        return this.request('/api/trading/settings', {
            method: 'PUT',
            body: JSON.stringify(settings),
        });
    }

    async getSignals(limit = 10) {
        return this.request<any[]>(`/api/trading/signals?limit=${limit}`);
    }

    async getTrades(limit = 20, status?: string) {
        const params = new URLSearchParams({ limit: limit.toString() });
        if (status) params.append('status', status);
        return this.request<any[]>(`/api/trading/trades?${params}`);
    }

    async getPnL() {
        return this.request<any>('/api/trading/pnl');
    }

    // Agents
    async getAgentDecisions(limit = 20) {
        return this.request<any[]>(`/api/agents/decisions?limit=${limit}`);
    }

    async runAnalysis(symbol: string) {
        return this.request('/api/agents/analyze', {
            method: 'POST',
            body: JSON.stringify({ symbol }),
        });
    }

    async getRLStatus() {
        return this.request<any>('/api/agents/rl/status');
    }

    async modifyRLParams(params: any) {
        return this.request('/api/agents/rl/params', {
            method: 'PUT',
            body: JSON.stringify(params),
        });
    }

    async startRLTraining(config?: any) {
        return this.request('/api/agents/rl/train', {
            method: 'POST',
            body: JSON.stringify(config || {}),
        });
    }

    async stopRLTraining(reason?: string) {
        return this.request('/api/agents/rl/stop', {
            method: 'POST',
            body: JSON.stringify({ reason }),
        });
    }
}

export const api = new ApiClient();
export default api;
