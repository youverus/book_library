'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { api, type AuthResponse } from '@/lib/api';
import { useAuthStore } from '@/stores/auth';

export default function LoginPage() {
  const router = useRouter();
  const setAuth = useAuthStore(s => s.setAuth);
  const [account, setAccount] = useState('');
  const [password, setPassword] = useState('');
  const [err, setErr] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErr('');
    setLoading(true);
    try {
      const res = await api.post<AuthResponse>('/auth/login', { account, password });
      setAuth(res.token, res.user);
      router.push('/');
    } catch (error: any) {
      setErr(error.message || '登录失败');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="max-w-md mx-auto px-4 py-12">
      <h1 className="text-2xl font-bold text-center mb-8">欢迎回来</h1>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm text-gray-600 mb-1">用户名 / 邮箱</label>
          <input value={account} onChange={e => setAccount(e.target.value)}
            className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:outline-none focus:border-brand-500 transition"
            placeholder="请输入用户名或邮箱" required />
        </div>
        <div>
          <label className="block text-sm text-gray-600 mb-1">密码</label>
          <input type="password" value={password} onChange={e => setPassword(e.target.value)}
            className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:outline-none focus:border-brand-500 transition"
            placeholder="请输入密码" required />
        </div>
        {err && <p className="text-sm text-red-500">{err}</p>}
        <button disabled={loading}
          className="w-full py-3 rounded-xl bg-brand-500 text-white font-medium hover:bg-brand-600 disabled:opacity-50 transition">
          {loading ? '登录中...' : '登录'}
        </button>
      </form>
      <p className="mt-6 text-center text-sm text-gray-500">
        还没有账号？<Link href="/register" className="text-brand-600 hover:underline">立即注册</Link>
      </p>
    </div>
  );
}
