'use client';

import React, { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Loader2, Eye, EyeOff, Info } from 'lucide-react';
import { loginSchema, type LoginFormData } from '@/lib/schemas';
import { apiFetch } from '@/lib/api';

export default function LoginPage() {
  const [error, setError] = useState<string | null>(null);
  const [infoMessage, setInfoMessage] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);

  useEffect(() => {
    // Check if redirected due to expired session or logout
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      if (params.get('expired') === 'true') {
        setInfoMessage('Sesi Anda telah berakhir. Silakan login kembali.');
        // Clean up remaining backend session cookies
        fetch('/api/auth/logout', { method: 'POST', credentials: 'include' }).catch(() => {});
      } else if (params.get('logout') === 'true') {
        setInfoMessage('Anda telah berhasil logout.');
      }
    }
  }, []);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
    defaultValues: { user: '', password: '' },
  });

  const onSubmit = async (data: LoginFormData) => {
    setError(null);
    setInfoMessage(null);
    try {
      await apiFetch('/api/auth/login', {
        method: 'POST',
        body: JSON.stringify(data),
      });
      window.location.href = '/trackers';
    } catch {
      setError('Login gagal. Periksa username dan password.');
    }
  };

  return (
    <div className="min-h-screen bg-[#f8fafc] flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-14 h-14 bg-[#008444] rounded-2xl shadow-sm mb-3">
            <span className="text-xl font-bold text-white tracking-wider">TL</span>
          </div>
          <h1 className="text-2xl font-extrabold text-gray-900 tracking-tight">
            TRACK<span className="text-[#008444]">LAB</span>
          </h1>
          <p className="text-gray-500 text-xs mt-1 font-medium">Kalbe Biopharma Assessment</p>
        </div>

        {/* Login Card */}
        <div className="card p-8 bg-white border border-gray-200 shadow-sm rounded-2xl">
          <h2 className="text-base font-bold text-gray-900 mb-5">Sign in to your account</h2>

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            {/* Info Message (expired / logout) */}
            {infoMessage && (
              <div className="bg-emerald-50 border border-emerald-200 rounded-lg px-3.5 py-2.5 text-xs text-[#008444] font-medium flex items-center gap-2">
                <Info className="w-4 h-4 flex-shrink-0" />
                <span>{infoMessage}</span>
              </div>
            )}

            {/* Error */}
            {error && (
              <div className="bg-red-50 border border-red-200 rounded-lg px-3.5 py-2.5 text-xs text-red-700 font-medium">
                {error}
              </div>
            )}

            {/* Username */}
            <div>
              <label htmlFor="user" className="label-text text-xs font-semibold">
                Username
              </label>
              <input
                id="user"
                type="text"
                autoComplete="username"
                {...register('user')}
                className={`input-field text-xs ${errors.user ? 'input-error' : ''}`}
                placeholder="Enter your username"
              />
              {errors.user && <p className="error-text text-xs">{errors.user.message}</p>}
            </div>

            {/* Password */}
            <div>
              <label htmlFor="password" className="label-text text-xs font-semibold">
                Password
              </label>
              <div className="relative">
                <input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="current-password"
                  {...register('password')}
                  className={`input-field text-xs pr-10 ${errors.password ? 'input-error' : ''}`}
                  placeholder="Enter your password"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              {errors.password && <p className="error-text text-xs">{errors.password.message}</p>}
            </div>

            {/* Submit */}
            <button
              type="submit"
              disabled={isSubmitting}
              className="btn-primary w-full py-2.5 text-xs font-semibold"
            >
              {isSubmitting && <Loader2 className="w-4 h-4 animate-spin" />}
              {isSubmitting ? 'Signing in...' : 'Sign In'}
            </button>
          </form>
        </div>

        <p className="text-center text-[11px] text-gray-400 mt-6 font-medium">
          &copy; 2026 Kalbe Biopharma. All rights reserved.
        </p>
      </div>
    </div>
  );
}
