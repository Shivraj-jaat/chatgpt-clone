'use client';

import React, { useState } from 'react';
import { X, Mail, Lock, User, Eye, EyeOff, AlertCircle, ArrowRight, Sparkles } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  defaultMode?: 'login' | 'signup';
}

export default function AuthModal({ isOpen, onClose, defaultMode = 'login' }: AuthModalProps) {
  const { loginWithEmail, signupWithEmail, loginWithGoogle, loginAsGuest, isFirebaseConfigured } = useAuth();
  const [mode, setMode] = useState<'login' | 'signup'>(defaultMode);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const getCleanErrorMessage = (err: any): string => {
    const code = err?.code || '';
    switch (code) {
      case 'auth/invalid-credential':
      case 'auth/wrong-password':
      case 'auth/user-not-found':
        return 'Invalid email or password. Please try again.';
      case 'auth/email-already-in-use':
        return 'An account with this email already exists. Please log in.';
      case 'auth/weak-password':
        return 'Password must be at least 6 characters.';
      case 'auth/invalid-email':
        return 'Please enter a valid email address.';
      case 'auth/popup-closed-by-user':
        return 'Sign-in popup was closed before completing.';
      case 'auth/operation-not-allowed':
        return 'This sign-in method is not enabled in Firebase Console (Authentication > Sign-in method).';
      default:
        return err?.message || 'Authentication failed. Please try again.';
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!email.trim() || !password) {
      setError('Please fill in all required fields.');
      return;
    }

    setLoading(true);
    try {
      if (mode === 'signup') {
        await signupWithEmail(email, password, displayName);
      } else {
        await loginWithEmail(email, password);
      }
      onClose();
    } catch (err: any) {
      setError(getCleanErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    setError(null);
    setLoading(true);
    try {
      await loginWithGoogle();
      onClose();
    } catch (err: any) {
      setError(getCleanErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  const handleGuestContinue = async () => {
    setLoading(true);
    try {
      await loginAsGuest();
      onClose();
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="relative w-full max-w-md rounded-2xl bg-[#212121] border border-[#383838] shadow-2xl p-6 md:p-8 text-[#ececec]">
        
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute right-4 top-4 p-1.5 rounded-lg text-[#8e8e8e] hover:text-white hover:bg-[#2f2f2f] transition-colors"
          title="Close"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Header with ChatGPT Logo */}
        <div className="text-center mb-6">
          <div className="w-12 h-12 mx-auto mb-3 rounded-full bg-[#10a37f] flex items-center justify-center text-white shadow-lg shadow-[#10a37f]/20">
            <svg className="w-7 h-7 fill-current" viewBox="0 0 24 24">
              <path d="M12 2a10 10 0 1 0 10 10A10 10 0 0 0 12 2zm0 18a8 8 0 1 1 8-8 8 8 0 0 1-8 8z" />
              <path d="M12 6a6 6 0 1 0 6 6 6 6 0 0 0-6-6zm0 10a4 4 0 1 1 4-4 4 4 0 0 1-4 4z" />
            </svg>
          </div>
          <h2 className="text-xl md:text-2xl font-bold tracking-tight">
            {mode === 'login' ? 'Welcome back' : 'Create your account'}
          </h2>
          <p className="text-xs text-[#8e8e8e] mt-1">
            {mode === 'login'
              ? 'Log in to sync your conversations across devices'
              : 'Sign up to keep your chat history securely saved in Cloud'}
          </p>
        </div>

        {/* Error Alert */}
        {error && (
          <div className="mb-4 p-3 rounded-xl bg-red-950/50 border border-red-800/80 text-red-200 text-xs flex items-start gap-2.5">
            <AlertCircle className="w-4 h-4 flex-shrink-0 text-red-400 mt-0.5" />
            <span className="leading-relaxed">{error}</span>
          </div>
        )}

        {/* Google One-Click Sign In */}
        <button
          type="button"
          onClick={handleGoogleSignIn}
          disabled={loading}
          className="w-full flex items-center justify-center gap-3 py-2.5 px-4 rounded-xl bg-[#2f2f2f] hover:bg-[#383838] border border-[#424242] text-sm font-medium transition-colors mb-4 disabled:opacity-50"
        >
          <svg className="w-4 h-4" viewBox="0 0 24 24">
            <path
              fill="#4285F4"
              d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.8-2.4 3.65v3h3.88c2.27-2.09 3.665-5.17 3.665-9.09z"
            />
            <path
              fill="#34A853"
              d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.77-2.1-6.72-4.93H1.26v3.09C3.25 21.36 7.34 24 12 24z"
            />
            <path
              fill="#FBBC05"
              d="M5.28 14.32c-.25-.72-.38-1.49-.38-2.32s.13-1.6.38-2.32V6.59H1.26C.46 8.18 0 9.99 0 12s.46 3.82 1.26 5.41l4.02-3.09z"
            />
            <path
              fill="#EA4335"
              d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.34 0 3.25 2.64 1.26 6.59l4.02 3.09c.95-2.83 3.6-4.93 6.72-4.93z"
            />
          </svg>
          <span>Continue with Google</span>
        </button>

        {/* Divider */}
        <div className="relative my-4 flex items-center justify-center">
          <div className="border-t border-[#383838] w-full" />
          <span className="bg-[#212121] px-3 text-[11px] font-medium text-[#8e8e8e] uppercase tracking-wider absolute">
            OR
          </span>
        </div>

        {/* Email & Password Form */}
        <form onSubmit={handleSubmit} className="space-y-3.5">
          {mode === 'signup' && (
            <div>
              <label className="block text-xs font-medium text-[#b4b4b4] mb-1">
                Your Name
              </label>
              <div className="relative">
                <User className="w-4 h-4 absolute left-3 top-3 text-[#8e8e8e]" />
                <input
                  type="text"
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  placeholder="John Doe"
                  className="w-full pl-9 pr-3 py-2.5 rounded-xl bg-[#171717] border border-[#383838] focus:border-[#10a37f] focus:outline-none text-sm text-[#ececec] placeholder-[#666]"
                />
              </div>
            </div>
          )}

          <div>
            <label className="block text-xs font-medium text-[#b4b4b4] mb-1">
              Email address
            </label>
            <div className="relative">
              <Mail className="w-4 h-4 absolute left-3 top-3 text-[#8e8e8e]" />
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="name@example.com"
                className="w-full pl-9 pr-3 py-2.5 rounded-xl bg-[#171717] border border-[#383838] focus:border-[#10a37f] focus:outline-none text-sm text-[#ececec] placeholder-[#666]"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-[#b4b4b4] mb-1">
              Password
            </label>
            <div className="relative">
              <Lock className="w-4 h-4 absolute left-3 top-3 text-[#8e8e8e]" />
              <input
                type={showPassword ? 'text' : 'password'}
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                minLength={6}
                className="w-full pl-9 pr-10 py-2.5 rounded-xl bg-[#171717] border border-[#383838] focus:border-[#10a37f] focus:outline-none text-sm text-[#ececec] placeholder-[#666]"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-3 text-[#8e8e8e] hover:text-white"
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-2.5 px-4 rounded-xl bg-[#10a37f] hover:bg-[#0e8e6e] text-white font-medium text-sm transition-colors shadow-md flex items-center justify-center gap-2 disabled:opacity-50 mt-2"
          >
            <span>{loading ? 'Processing...' : mode === 'login' ? 'Sign In' : 'Create Account'}</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </form>

        {/* Toggle Mode */}
        <div className="text-center mt-5 text-xs text-[#8e8e8e]">
          {mode === 'login' ? (
            <span>
              Don't have an account?{' '}
              <button
                type="button"
                onClick={() => {
                  setMode('signup');
                  setError(null);
                }}
                className="text-[#10a37f] hover:underline font-medium"
              >
                Sign up
              </button>
            </span>
          ) : (
            <span>
              Already have an account?{' '}
              <button
                type="button"
                onClick={() => {
                  setMode('login');
                  setError(null);
                }}
                className="text-[#10a37f] hover:underline font-medium"
              >
                Log in
              </button>
            </span>
          )}
        </div>

        {/* Continue as Guest */}
        <div className="text-center mt-3 pt-3 border-t border-[#2e2e2e]">
          <button
            type="button"
            onClick={handleGuestContinue}
            className="text-xs text-[#8e8e8e] hover:text-[#ececec] transition-colors"
          >
            Skip for now & continue as Guest
          </button>
        </div>
      </div>
    </div>
  );
}

