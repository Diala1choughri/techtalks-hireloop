import React, { useState } from 'react';
import { setTokens, authFetch, clearTokens } from './auth';

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

// TEMPORARY PREVIEW MODE: Flip to false once the backend database is connected (ZN)
const DEMO_BYPASS = true;

export default function RecruiterLogin({ onBack, onLoginSuccess }) {
    const [mode, setMode] = useState('login'); // 'login' | 'register'
    const [name, setName] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');

        if (!email.trim() || !password.trim()) {
            setError('Please enter both your email and password.');
            return;
        }

        if (mode === 'register' && !name.trim()) {
            setError('Please enter your full name.');
            return;
        }

        // Temporary preview login so we can test the workspace & Kanban board without a backend
        if (DEMO_BYPASS) {
            onLoginSuccess({
                id: 'demo-user-1',
                name: name.trim() || email.split('@')[0] || 'Team Preview',
                email: email.trim(),
                role: 'HR', // Gives full create/edit/Kanban access for testing
            });
            return;
        }

        setLoading(true);
        try {
            const endpoint = mode === 'register' ? '/auth/register' : '/auth/login';
            const payload =
                mode === 'register'
                    ? { name: name.trim(), email: email.trim(), password }
                    : { email: email.trim(), password };

            const authRes = await fetch(`${API_BASE}${endpoint}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload),
            });

            const authData = await authRes.json().catch(() => ({}));

            if (!authRes.ok) {
                setError(
                    authData.message ||
                    (mode === 'register'
                        ? 'Could not create your account.'
                        : 'Invalid email or password.')
                );
                return;
            }

            const accessToken = authData.access_token || authData.accessToken;
            const refreshToken = authData.refresh_token || authData.refreshToken;

            if (!accessToken) {
                setError('Login succeeded, but no access token was returned.');
                return;
            }

            setTokens(accessToken, refreshToken);

            // Verify session and get authoritative user & role from /me
            const meRes = await authFetch('/auth/me');
            if (!meRes.ok) {
                clearTokens();
                setError('Session could not be verified with /me.');
                return;
            }

            const meData = await meRes.json().catch(() => ({}));
            const verifiedUser = meData.user || meData;

            if (!verifiedUser || !verifiedUser.email) {
                clearTokens();
                setError('Invalid user profile returned from /me.');
                return;
            }

            onLoginSuccess(verifiedUser);
        } catch {
            setError('Unable to reach the server. Please check your connection.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-[#FBF9F5] text-[#2C2825] font-serif flex flex-col justify-between selection:bg-[#D4A373] selection:text-white">

            {/* Top Navbar */}
            <header className="w-full border-b border-[#EBE5DE] px-8 py-5 flex justify-between items-center bg-[#FBF9F5]/85 backdrop-blur-sm">
                <div className="flex items-center gap-2.5">
                    <div className="w-2.5 h-2.5 bg-[#C86D51] rounded-full"></div>
                    <span className="font-medium tracking-wide text-lg text-[#2C2825]">HireLoop</span>
                </div>

                <button
                    type="button"
                    onClick={onBack}
                    className="text-xs font-sans px-4 py-2 rounded-lg bg-[#EBE5DE] hover:bg-[#DED6CC] text-[#2C2825] transition"
                >
                    &larr; Candidate Portal
                </button>
            </header>

            {/* Centered Login Card */}
            <main className="flex-1 flex items-center justify-center px-6 py-12">
                <div className="max-w-md w-full bg-[#F3EFEA] border border-[#EBE5DE] rounded-3xl p-8 sm:p-10 shadow-sm space-y-7 text-left">

                    <div className="space-y-2">
                        <span className="text-xs font-sans tracking-widest text-[#A65D37] uppercase">
                            {mode === 'login' ? 'Team Workspace' : 'Create Account'}
                        </span>
                        <h1 className="text-3xl font-normal text-[#2C2825]">
                            {mode === 'login' ? 'Welcome back.' : 'Join the hiring team.'}
                        </h1>
                        <p className="text-sm font-sans text-[#796E65] leading-relaxed">
                            {mode === 'login'
                                ? 'Sign in to manage open roles, review applicants, and move candidates forward.'
                                : 'Set up your workspace profile to get started with the hiring team.'}
                        </p>
                    </div>

                    {DEMO_BYPASS && (
                        <div className="p-3 rounded-xl bg-[#FBF9F5] border border-[#EBE5DE] text-xs font-sans text-[#796E65]">
                            <span className="font-medium text-[#A65D37]">Preview Mode:</span> Enter any email and password to explore the workspace and Kanban board.
                        </div>
                    )}

                    {error && (
                        <div className="p-3 rounded-xl bg-[#FBF9F5] border border-[#C86D51] text-xs font-sans text-[#A65D37]">
                            {error}
                        </div>
                    )}

                    <form onSubmit={handleSubmit} className="space-y-4 font-sans">
                        {mode === 'register' && (
                            <div>
                                <label className="block text-xs font-medium text-[#796E65] mb-1.5 uppercase tracking-wider">
                                    Full Name
                                </label>
                                <input
                                    type="text"
                                    required
                                    value={name}
                                    onChange={(e) => setName(e.target.value)}
                                    placeholder="Yasmina Haddad"
                                    className="w-full px-4 py-3 bg-[#FBF9F5] text-[#2C2825] placeholder-[#B5A89E] border border-[#EBE5DE] rounded-xl focus:outline-none focus:ring-1 focus:ring-[#C86D51] text-sm"
                                />
                            </div>
                        )}

                        <div>
                            <label className="block text-xs font-medium text-[#796E65] mb-1.5 uppercase tracking-wider">
                                Work Email
                            </label>
                            <input
                                type="email"
                                required
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                placeholder="you@company.com"
                                className="w-full px-4 py-3 bg-[#FBF9F5] text-[#2C2825] placeholder-[#B5A89E] border border-[#EBE5DE] rounded-xl focus:outline-none focus:ring-1 focus:ring-[#C86D51] text-sm"
                            />
                        </div>

                        <div>
                            <label className="block text-xs font-medium text-[#796E65] mb-1.5 uppercase tracking-wider">
                                Password
                            </label>
                            <input
                                type="password"
                                required
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                placeholder="••••••••"
                                className="w-full px-4 py-3 bg-[#FBF9F5] text-[#2C2825] placeholder-[#B5A89E] border border-[#EBE5DE] rounded-xl focus:outline-none focus:ring-1 focus:ring-[#C86D51] text-sm"
                            />
                        </div>

                        <button
                            type="submit"
                            disabled={loading}
                            className="w-full py-3.5 px-6 bg-[#C86D51] hover:bg-[#B35C41] disabled:opacity-60 text-white font-medium rounded-xl transition text-sm shadow-sm mt-2"
                        >
                            {loading
                                ? 'Checking credentials...'
                                : mode === 'login'
                                    ? 'Sign In →'
                                    : 'Create Account →'}
                        </button>
                    </form>

                    {/* Toggle Login / Register */}
                    <div className="pt-2 border-t border-[#EBE5DE] text-center font-sans">
                        <button
                            type="button"
                            onClick={() => {
                                setMode(mode === 'login' ? 'register' : 'login');
                                setError('');
                            }}
                            className="text-xs text-[#796E65] hover:text-[#2C2825] transition"
                        >
                            {mode === 'login'
                                ? "Don't have a team account? Register"
                                : 'Already have an account? Sign in'}
                        </button>
                    </div>
                </div>
            </main>
        </div>
    );
}