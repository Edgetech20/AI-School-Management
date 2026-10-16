import { useMutation } from "@tanstack/react-query";
import { FormEvent, useState } from "react";
import { useNavigate } from "react-router-dom";
import { login } from "../api/auth";

interface LoginPageProps {
  onLoginSuccess?: () => void;
}

export function LoginPage({ onLoginSuccess }: LoginPageProps) {
  const [form, setForm] = useState({ username: "", password: "" });
  const [error, setError] = useState("");
  const navigate = useNavigate();

  const loginMutation = useMutation({
    mutationFn: login,
    onSuccess: (data) => {
      localStorage.setItem("auth_token", data.access_token);
      onLoginSuccess?.();
      navigate("/");
    },
    onError: (err: any) => {
      setError(err.response?.data?.detail || "Login failed");
    }
  });

  function submit(e: FormEvent) {
    e.preventDefault();
    setError("");
    loginMutation.mutate(form);
  }
  return (
    <div className="h-screen overflow-hidden flex flex-col bg-slate-100">
 
      {/* ── Navy Hero Banner ── */}
      <div className="relative flex-shrink-0 flex flex-col items-center justify-end pb-16 pt-10 px-4 bg-gradient-to-br from-blue-950 via-blue-900 to-blue-600 overflow-hidden">
 
        {/* Dot grid */}
        <div className="absolute inset-0 [background-image:radial-gradient(rgba(255,255,255,0.07)_1px,transparent_1px)] [background-size:22px_22px]" />
 
        {/* Decorative rings top-right */}
        <div className="absolute -top-10 -right-10 w-40 h-40 rounded-full border border-white/5" />
        <div className="absolute -top-5 -right-5 w-24 h-24 rounded-full border border-white/8" />
 
        {/* Bottom blur glow */}
        <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-72 h-28 rounded-full bg-blue-400/20 blur-3xl" />
 
        {/* Content */}
        <div className="relative flex flex-col items-center">
          <div className="w-14 h-14 mb-3 rounded-2xl bg-white/10 border border-white/20 flex items-center justify-center shadow-2xl">
            <svg className="w-7 h-7 text-blue-200" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.4">
              <path strokeLinecap="round" strokeLinejoin="round" d="M7 3H5a2 2 0 0 0-2 2v2M17 3h2a2 2 0 0 1 2 2v2M7 21H5a2 2 0 0 1-2-2v-2M17 21h2a2 2 0 0 0 2-2v-2" />
              <circle cx="12" cy="11" r="3" />
              <path strokeLinecap="round" d="M9 17c0-1.657 1.343-3 3-3s3 1.343 3 3" />
            </svg>
          </div>
          <h1 className="text-xl font-bold text-white tracking-tight">Admin Console</h1>
          <p className="mt-1 text-[10px] font-semibold text-blue-300 uppercase tracking-[0.16em]">
            Face Attendance System
          </p>
        </div>
      </div>
 
      {/* ── Card ── */}
      <div className="flex-1 overflow-hidden flex flex-col items-center px-4 -mt-8">
        <div className="w-full max-w-sm bg-white rounded-2xl border border-slate-200 shadow-[0_8px_40px_rgba(30,58,138,0.10)] overflow-hidden">
 
          {/* Card header strip */}
          <div className="bg-slate-50 border-b border-slate-100 px-5 py-2.5 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-blue-700 inline-block" />
              <p className="text-[10px] font-bold text-slate-500 uppercase tracking-[0.14em]">Secure Login</p>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-green-500 inline-block" />
              <p className="text-[10px] font-medium text-green-600">System Online</p>
            </div>
          </div>
 
          <div className="px-6 py-5">
            <form className="space-y-3.5" onSubmit={submit}>
 
              {/* Username */}
              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1.5">
                  Username
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none">
                    <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path strokeLinecap="round" d="M16 7a4 4 0 1 1-8 0 4 4 0 0 1 8 0zM12 14a7 7 0 0 0-7 7h14a7 7 0 0 0-7-7z" />
                    </svg>
                  </span>
                  <input
                    type="text"
                    placeholder="Enter username"
                    autoComplete="username"
                    value={form.username}
                    onChange={(e) => setForm({ ...form, username: e.target.value })}
                    required
                    className="w-full bg-slate-50 border border-slate-200 hover:border-slate-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/15 text-slate-800 placeholder-slate-300 text-sm rounded-xl pl-9 pr-4 py-2.5 outline-none transition-all duration-200"
                  />
                </div>
              </div>
 
              {/* Password */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest">
                    Password
                  </label>
                  <span className="text-[11px] text-blue-500 font-medium cursor-pointer hover:text-blue-700 transition-colors">
                    Forgot password?
                  </span>
                </div>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none">
                    <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <rect x="3" y="11" width="18" height="11" rx="2" />
                      <path strokeLinecap="round" d="M7 11V7a5 5 0 0 1 10 0v4" />
                    </svg>
                  </span>
                  <input
                    type="password"
                    placeholder="Enter password"
                    autoComplete="current-password"
                    value={form.password}
                    onChange={(e) => setForm({ ...form, password: e.target.value })}
                    required
                    className="w-full bg-slate-50 border border-slate-200 hover:border-slate-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/15 text-slate-800 placeholder-slate-300 text-sm rounded-xl pl-9 pr-4 py-2.5 outline-none transition-all duration-200"
                  />
                </div>
              </div>
 
              {/* Error */}
              {error && (
                <div className="flex items-center gap-2.5 rounded-xl bg-red-50 border border-red-100 px-4 py-2.5">
                  <svg className="w-3.5 h-3.5 text-red-500 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <circle cx="12" cy="12" r="10" />
                    <line x1="12" y1="8" x2="12" y2="12" />
                    <line x1="12" y1="16" x2="12.01" y2="16" />
                  </svg>
                  <p className="text-xs text-red-600">{error}</p>
                </div>
              )}
 
              {/* Submit */}
              <button
                type="submit"
                disabled={loginMutation.isPending}
                className="w-full bg-gradient-to-r from-blue-900 to-blue-700 hover:from-blue-800 hover:to-blue-600 active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold text-sm rounded-xl py-3 transition-all duration-200 flex items-center justify-center gap-2 shadow-lg shadow-blue-900/25 mt-1"
              >
                {loginMutation.isPending ? (
                  <>
                    <svg className="w-4 h-4 animate-spin" viewBox="0 0 24 24" fill="none">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 0 1 8-8V0C5.373 0 0 5.373 0 12h4z" />
                    </svg>
                    Authenticating...
                  </>
                ) : (
                  <>
                    Sign In
                    <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M13 7l5 5m0 0l-5 5m5-5H6" />
                    </svg>
                  </>
                )}
              </button>
            </form>
 
            {/* Divider */}
            <div className="flex items-center gap-3 my-4">
              <div className="flex-1 h-px bg-slate-100" />
              <span className="text-[10px] font-semibold text-slate-300 uppercase tracking-widest">Demo Access</span>
              <div className="flex-1 h-px bg-slate-100" />
            </div>
 
            {/* Demo credentials */}
            <div className="bg-blue-50 border border-blue-100 rounded-xl p-3">
              <div className="grid grid-cols-2 gap-2">
                <div className="bg-white border border-blue-100 rounded-lg px-3 py-2">
                  <div className="flex items-center gap-1.5 mb-1">
                    <svg className="w-2.5 h-2.5 text-blue-300" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path strokeLinecap="round" d="M16 7a4 4 0 1 1-8 0 4 4 0 0 1 8 0zM12 14a7 7 0 0 0-7 7h14a7 7 0 0 0-7-7z" />
                    </svg>
                    <p className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">Username</p>
                  </div>
                  <p className="text-xs font-mono font-bold text-blue-900">admin</p>
                </div>
                <div className="bg-white border border-blue-100 rounded-lg px-3 py-2">
                  <div className="flex items-center gap-1.5 mb-1">
                    <svg className="w-2.5 h-2.5 text-blue-300" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <rect x="3" y="11" width="18" height="11" rx="2" />
                      <path strokeLinecap="round" d="M7 11V7a5 5 0 0 1 10 0v4" />
                    </svg>
                    <p className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">Password</p>
                  </div>
                  <p className="text-xs font-mono font-bold text-blue-900">Admin@123</p>
                </div>
              </div>
            </div>
          </div>
        </div>
 
        {/* Footer */}
        <p className="mt-4 pb-4 text-[11px] text-slate-400 text-center">
          © {new Date().getFullYear()} Face Attendance System · School Admin
        </p>
      </div>
    </div>
  );
}