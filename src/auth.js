const API_BASE = (import.meta.env.VITE_API_URL || 'http://localhost:5000/api').replace(/\/+$/, '');

const ACCESS_KEY = 'hireloop_access_token';
const REFRESH_KEY = 'hireloop_refresh_token';
const SESSION_USER_KEY = 'hireloop_session_user';

function normalizePath(path) {
    const cleanPath = path.startsWith('/') ? path : `/${path}`;
    if (API_BASE.endsWith('/api') && cleanPath.startsWith('/api/')) {
        return cleanPath.slice(4);
    }
    return cleanPath;
}

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

export function setSessionUser(user) {
    if (user) {
        sessionStorage.setItem(SESSION_USER_KEY, JSON.stringify(user));
    } else {
        sessionStorage.removeItem(SESSION_USER_KEY);
    }
}

export function getSessionUser() {
    try {
        const raw = sessionStorage.getItem(SESSION_USER_KEY);
        return raw ? JSON.parse(raw) : null;
    } catch {
        return null;
    }
}

export function clearTokens() {
    localStorage.removeItem(ACCESS_KEY);
    localStorage.removeItem(REFRESH_KEY);
    sessionStorage.removeItem(SESSION_USER_KEY);
}

export async function logout() {
    const refreshToken = getRefreshToken();
    if (refreshToken) {
        try {
            await fetch(`${API_BASE}/auth/logout`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ refresh_token: refreshToken }),
            });
        } catch {
            // Ignore network error during logout cleanup
        }
    }
    clearTokens();
}

// Automatically tries refreshing the access token if /me or an API call returns 401
export async function authFetch(path, options = {}) {
    let token = getAccessToken();
    const targetUrl = `${API_BASE}${normalizePath(path)}`;

    const makeRequest = (authToken) =>
        fetch(targetUrl, {
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
            const refreshData = await refreshRes.json().catch(() => ({}));
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

export async function getMe() {
    if (!getAccessToken() && !getRefreshToken()) {
        return getSessionUser();
    }

    try {
        const res = await authFetch('/auth/me');
        if (!res.ok) return getSessionUser();
        const data = await res.json().catch(() => null);
        const user = data?.user || data;
        if (user && user.email) {
            setSessionUser(user);
            return user;
        }
        return getSessionUser();
    } catch {
        return getSessionUser();
    }
}