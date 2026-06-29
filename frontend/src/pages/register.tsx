import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import Link from 'next/link';
import { useAuth } from '../contexts/AuthContext';
import { register as registerApi } from '../services/auth';
import { toast } from 'react-toastify';
import { FiEye, FiEyeOff, FiArrowRight, FiBook } from 'react-icons/fi';

export default function Register() {
  const [form, setForm] = useState({ username: '', email: '', password: '', confirmPassword: '', full_name: '' });
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [loading, setLoading] = useState(false);
  const [passwordWarn, setPasswordWarn] = useState('');
  const { login, isAuthenticated, authLoading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!authLoading && isAuthenticated) router.replace('/');
  }, [isAuthenticated, authLoading, router]);

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#000000]">
        <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-tamil-500" />
      </div>
    );
  }

  const update = (field: string, value: string) => {
    setForm(prev => ({ ...prev, [field]: value }));
    if (field === 'password') {
      if (value.length > 0 && value.length < 8) setPasswordWarn('At least 8 characters');
      else if (!/[A-Z]/.test(value)) setPasswordWarn('Need an uppercase letter');
      else if (!/[a-z]/.test(value)) setPasswordWarn('Need a lowercase letter');
      else if (!/[0-9]/.test(value)) setPasswordWarn('Need a number');
      else setPasswordWarn('');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (form.password !== form.confirmPassword) {
      toast.error('Passwords do not match');
      return;
    }
    if (form.password.length < 8) {
      toast.error('Password must be at least 8 characters');
      return;
    }
    if (!/[A-Z]/.test(form.password) || !/[a-z]/.test(form.password) || !/[0-9]/.test(form.password)) {
      toast.error('Password must contain uppercase, lowercase, and a number');
      return;
    }
    setLoading(true);
    try {
      const res = await registerApi({
        username: form.username,
        email: form.email,
        password: form.password,
        full_name: form.full_name || undefined,
      });
      login(res.access_token, res.user);
      toast.success('Account created!');
      router.push('/');
    } catch (err: any) {
      toast.error(err.response?.data?.detail || 'Registration failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#000000] px-4">
      <div className="w-full max-w-sm animate-fade-in-up">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-gradient-to-br from-tamil-500 to-orange-500 shadow-lg shadow-tamil-500/25 mb-4">
            <FiBook size={24} className="text-white" />
          </div>
          <h1 className="text-2xl font-bold text-white">Create account</h1>
          <p className="text-sm text-gray-500 mt-1">Join the Tamil E-Book community</p>
        </div>

        <div className="card-glass p-6">
          <form onSubmit={handleSubmit} className="space-y-3.5">
            <div>
              <label className="block text-sm font-medium text-gray-400 mb-1.5">Full Name</label>
              <input type="text" className="w-full h-10 px-3.5 bg-white/[0.04] border border-white/[0.08] rounded-xl text-sm text-white placeholder-gray-600 focus:outline-none focus:ring-2 focus:ring-tamil-500/40 focus:border-tamil-500/50 transition-all" value={form.full_name} onChange={(e) => update('full_name', e.target.value)} placeholder="Your name (optional)" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-400 mb-1.5">Username *</label>
              <input type="text" className="w-full h-10 px-3.5 bg-white/[0.04] border border-white/[0.08] rounded-xl text-sm text-white placeholder-gray-600 focus:outline-none focus:ring-2 focus:ring-tamil-500/40 focus:border-tamil-500/50 transition-all" value={form.username} onChange={(e) => update('username', e.target.value)} placeholder="Choose a username" required />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-400 mb-1.5">Email *</label>
              <input type="email" className="w-full h-10 px-3.5 bg-white/[0.04] border border-white/[0.08] rounded-xl text-sm text-white placeholder-gray-600 focus:outline-none focus:ring-2 focus:ring-tamil-500/40 focus:border-tamil-500/50 transition-all" value={form.email} onChange={(e) => update('email', e.target.value)} placeholder="your@email.com" required />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-400 mb-1.5">Password *</label>
              <div className="relative">
                <input type={showPassword ? 'text' : 'password'} className="w-full h-10 px-3.5 bg-white/[0.04] border border-white/[0.08] rounded-xl text-sm text-white placeholder-gray-600 focus:outline-none focus:ring-2 focus:ring-tamil-500/40 focus:border-tamil-500/50 transition-all pr-10" value={form.password} onChange={(e) => update('password', e.target.value)} placeholder="Min 6 characters" required />
                  <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-300 transition-colors">
                  {showPassword ? <FiEyeOff size={16} /> : <FiEye size={16} />}
                </button>
              </div>
              {passwordWarn && <p className="text-xs text-orange-400 mt-1">{passwordWarn}</p>}
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-400 mb-1.5">Confirm Password *</label>
              <div className="relative">
                <input type={showConfirm ? 'text' : 'password'} className="w-full h-10 px-3.5 bg-white/[0.04] border border-white/[0.08] rounded-xl text-sm text-white placeholder-gray-600 focus:outline-none focus:ring-2 focus:ring-tamil-500/40 focus:border-tamil-500/50 transition-all pr-10" value={form.confirmPassword} onChange={(e) => update('confirmPassword', e.target.value)} placeholder="Repeat password" required />
                <button type="button" onClick={() => setShowConfirm(!showConfirm)} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-300 transition-colors">
                  {showConfirm ? <FiEyeOff size={16} /> : <FiEye size={16} />}
                </button>
              </div>
            </div>
            <button type="submit" className="btn-primary w-full h-10 text-sm flex items-center justify-center gap-2 mt-1" disabled={loading}>
              {loading ? (
                <span className="flex items-center gap-2">
                  <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" /></svg>
                  Creating account
                </span>
              ) : (
                <span className="flex items-center gap-2">Create Account <FiArrowRight size={14} /></span>
              )}
            </button>
          </form>
        </div>

        <p className="text-center mt-6 text-sm text-gray-500">
          Already have an account?{' '}
          <Link href="/login" className="text-tamil-500 hover:text-tamil-400 font-medium transition-colors">Sign in</Link>
        </p>
      </div>
    </div>
  );
}
