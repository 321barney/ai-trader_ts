/**
 * API Client for Frontend
 */

export const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

interface ApiResponse<T> {
    success: boolean;
    data?: T;
    message?: string;
    error?: string;
}

class ApiClient {
    private accessToken: string | null = null;
    private refreshToken: string | null = null;

    setTokens(accessToken: string | null, refreshToken: string | null) {
        // Validate and sanitize before assignment
        const validAccess = (accessToken && accessToken !== 'undefined' && accessToken !== 'null') ? accessToken : null;
        const validRefresh = (refreshToken && refreshToken !== 'undefined' && refreshToken !== 'null') ? refreshToken : null;

        this.accessToken = validAccess;
        this.refreshToken = validRefresh;

        if (typeof window !== 'undefined') {
            if (validAccess) {
                localStorage.setItem('accessToken', validAccess);
            } else {
                localStorage.removeItem('accessToken');
            }
            if (validRefresh) {
                localStorage.setItem('refreshToken', validRefresh);
            } else {
                localStorage.removeItem('refreshToken');
            }
        }
    }

    getAccessToken(): string | null {
        // Double check memory state
        if (this.accessToken && this.accessToken !== 'undefined' && this.accessToken !== 'null') {
            return this.accessToken;
        }

        if (typeof window !== 'undefined') {
            let token = localStorage.getItem('accessToken');
            // Migration fallback
            if (!token || token === 'undefined' || token === 'null') {
                token = localStorage.getItem('token');
            }

            // Validate fallback
            if (token && token !== 'undefined' && token !== 'null') {
                // Determine if we should treat this as a migration or just a load
                this.accessToken = token; // Sync memory
                return token;
            }
        }
        return null;
    }

    getRefreshToken(): string | null {
        // Double check memory state
        if (this.refreshToken && this.refreshToken !== 'undefined' && this.refreshToken !== 'null') {
            return this.refreshToken;
        }

        if (typeof window !== 'undefined') {
            const token = localStorage.getItem('refreshToken');
            if (token && token !== 'undefined' && token !== 'null') {
                this.refreshToken = token; // Sync memory
                return token;
            }
        }
        return null;
    }

    clearTokens() {
        this.setTokens(null, null);
    }

    private async request<T>(
        endpoint: string,
        options: RequestInit = {},
        retryCount = 0
    ): Promise<ApiResponse<T>> {
        const token = this.getAccessToken();

        const headers: HeadersInit = {
            'Content-Type': 'application/json',
            ...(token && { Authorization: `Bearer ${token}` }),
            ...options.headers,
        };

        const response = await fetch(`${API_BASE}${endpoint}`, {
            ...options,
            headers,
        });

        // Handle 401 (Unauthorized) - Try refresh
        if (response.status === 401 && retryCount < 1 && !endpoint.includes('/auth/login')) {
            const refreshToken = this.getRefreshToken();
            if (refreshToken) {
                try {
                    const refreshRes = await fetch(`${API_BASE}/api/auth/refresh`, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ refreshToken }),
                    });

                    const refreshData = await refreshRes.json();

                    if (refreshData.success && refreshData.data?.accessToken) {
                        this.setTokens(refreshData.data.accessToken, refreshData.data.refreshToken);
                        return this.request<T>(endpoint, options, retryCount + 1);
                    }
                } catch (e) {
                    // Refresh failed
                }
            }
            // If refresh failed or no token, logout
            this.setTokens(null, null);
            if (typeof window !== 'undefined') {
                // Optional: Redirect to login if needed, or let the app handle the error
                // window.location.href = '/login';
            }
        }

        const data = await response.json();
        return data;
    }

    // Generic methods
    public async get<T>(endpoint: string) {
        return this.request<T>(endpoint, { method: 'GET' });
    }

    public async post<T>(endpoint: string, body?: any) {
        return this.request<T>(endpoint, {
            method: 'POST',
            body: body ? JSON.stringify(body) : undefined
        });
    }

    public async put<T>(endpoint: string, body?: any) {
        return this.request<T>(endpoint, {
            method: 'PUT',
            body: body ? JSON.stringify(body) : undefined
        });
    }

    public async del<T>(endpoint: string) {
        return this.request<T>(endpoint, { method: 'DELETE' });
    }

    // Auth
    async register(username: string, email: string, password: string) {
        return this.request<{ user: any; accessToken: string; refreshToken: string }>('/api/auth/register', {
            method: 'POST',
            body: JSON.stringify({ username, email, password }),
        });
    }

    async login(email: string, password: string) {
        const result = await this.request<{ user: any; accessToken: string; refreshToken: string }>('/api/auth/login', {
            method: 'POST',
            body: JSON.stringify({ email, password }),
        });
        if (result.success && result.data?.accessToken) {
            this.setTokens(result.data.accessToken, result.data.refreshToken);
        }
        return result;
    }

    async logout() {
        const result = await this.request('/api/auth/logout', { method: 'POST' });
        this.setTokens(null, null);
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
