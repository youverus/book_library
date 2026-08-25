'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { api, type AuthResponse } from '@/lib/api';
import { useAuthStore } from '@/stores/auth';

export default function RegisterPage() {
  const router = useRouter();
  const setAuth = useAuthStore(s => s.setAuth);
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [inviteCode, setInviteCode] = useState('');
  const [err, setErr] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErr('');
    setLoading(true);
    try {
      const res = await api.post<AuthResponse>('/auth/register', { username, email, password, inviteCode });
      setAuth(res.token, res.user);
      router.push('/');
    } catch (error: any) {
      setErr(error.message || '注册失败');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="max-w-md mx-auto px-4 py-12">
      <h1 className="text-2xl font-bold text-center mb-8">创建账号</h1>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm text-gray-600 mb-1">用户名</label>
          <input value={username} onChange={e => setUsername(e.target.value)}
            className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:outline-none focus:border-brand-500 transition"
            placeholder="至少 3 个字符" minLength={3} required />
        </div>
        <div>
          <label className="block text-sm text-gray-600 mb-1">邮箱</label>
          <input type="email" value={email} onChange={e => setEmail(e.target.value)}
            className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:outline-none focus:border-brand-500 transition"
            placeholder="you@example.com" required />
        </div>
        <div>
          <label className="block text-sm text-gray-600 mb-1">密码</label>
          <input type="password" value={password} onChange={e => setPassword(e.target.value)}
            className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:outline-none focus:border-brand-500 transition"
            placeholder="至少 6 个字符" minLength={6} required />
        </div>
        <div>
          <label className="block text-sm text-gray-600 mb-1">邀请码</label>
          <input value={inviteCode} onChange={e => setInviteCode(e.target.value)}
            className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:outline-none focus:border-brand-500 transition"
            placeholder="请输入邀请码" required />
        </div>
        {err && <p className="text-sm text-red-500">{err}</p>}
        <button disabled={loading}
          className="w-full py-3 rounded-xl bg-brand-500 text-white font-medium hover:bg-brand-600 disabled:opacity-50 transition">
          {loading ? '注册中...' : '注册'}
        </button>
      </form>
      <p className="mt-6 text-center text-sm text-gray-500">
        已有账号？<Link href="/login" className="text-brand-600 hover:underline">直接登录</Link>
      </p>
    </div>
  );
}
