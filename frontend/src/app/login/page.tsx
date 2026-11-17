'use client';

import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Loader2, Eye, EyeOff } from 'lucide-react';
import { loginSchema, type LoginFormData } from '@/lib/schemas';
import { apiFetch } from '@/lib/api';

export default function LoginPage() {
  const [error, setError] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);

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
    <div className="min-h-screen bg-gradient-to-br from-kalbe-50 via-white to-kalbe-50 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-kalbe-500 rounded-2xl mb-4">
            <span className="text-2xl font-bold text-white">TL</span>
          </div>
          <h1 className="text-2xl font-bold text-gray-900">
            TRACK<span className="text-kalbe-500">LAB</span>
          </h1>
          <p className="text-gray-500 text-sm mt-1">Kalbe Biopharma Assessment</p>
        </div>

        {/* Login Card */}
        <div className="card p-8">
          <h2 className="text-lg font-semibold text-gray-900 mb-6">Sign in to your account</h2>

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
            {/* Error */}
            {error && (
              <div className="bg-red-50 border border-red-200 rounded-lg px-4 py-3 text-sm text-red-700">
                {error}
              </div>
            )}

            {/* Username */}
            <div>
              <label htmlFor="user" className="label-text">
                Username
              </label>
              <input
                id="user"
                type="text"
                autoComplete="username"
                {...register('user')}
                className={`input-field ${errors.user ? 'input-error' : ''}`}
                placeholder="Enter your username"
              />
              {errors.user && <p className="error-text">{errors.user.message}</p>}
            </div>

            {/* Password */}
            <div>
              <label htmlFor="password" className="label-text">
                Password
              </label>
              <div className="relative">
                <input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="current-password"
                  {...register('password')}
                  className={`input-field pr-10 ${errors.password ? 'input-error' : ''}`}
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
              {errors.password && <p className="error-text">{errors.password.message}</p>}
            </div>

            {/* Submit */}
            <button
              type="submit"
              disabled={isSubmitting}
              className="btn-primary w-full py-2.5"
            >
              {isSubmitting && <Loader2 className="w-4 h-4 animate-spin" />}
              {isSubmitting ? 'Signing in...' : 'Sign In'}
            </button>
          </form>
        </div>

        <p className="text-center text-xs text-gray-400 mt-6">
          &copy; 2026 Kalbe Biopharma. All rights reserved.
        </p>
      </div>
    </div>
  );
}
