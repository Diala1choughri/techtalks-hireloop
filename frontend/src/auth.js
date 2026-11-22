const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

const ACCESS_KEY = 'hireloop_access_token';
const REFRESH_KEY = 'hireloop_refresh_token';

export function getAccessToken() {
    return localStorage.getItem(ACCESS_KEY);
}

export function getRefreshToken() {
    return localStorage.getItem(REFRESH_KEY);
}

export function setTokens(accessToken, refreshToken) {
    if (accessToken) localStorage.setItem(ACCESS_KEY, accessToken);
    if (refreshToken) localStorage.setItem(REFRESH_KEY, refreshToken);
}

export function clearTokens() {
    localStorage.removeItem(ACCESS_KEY);
    localStorage.removeItem(REFRESH_KEY);
}

// Automatically tries refreshing the access token if /me or an API call returns 401
export async function authFetch(path, options = {}) {
    let token = getAccessToken();

    const makeRequest = (authToken) =>
        fetch(`${API_BASE}${path}`, {
            ...options,
            headers: {
                'Content-Type': 'application/json',
                ...(options.headers || {}),
                ...(authToken ? { Authorization: `Bearer ${authToken}` } : {}),
            },
        });

    let response = await makeRequest(token);

    if (response.status === 401 && getRefreshToken()) {
        const refreshRes = await fetch(`${API_BASE}/auth/refresh`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ refresh_token: getRefreshToken() }),
        });

        if (refreshRes.ok) {
            const refreshData = await refreshRes.json();
            const newAccess = refreshData.access_token || refreshData.accessToken;
            const newRefresh = refreshData.refresh_token || refreshData.refreshToken;
            setTokens(newAccess, newRefresh);
            response = await makeRequest(newAccess);
        } else {
            clearTokens();
        }
    }

    return response;
}