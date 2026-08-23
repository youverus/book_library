'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { api, type User } from '@/lib/api';
import { useAuthStore } from '@/stores/auth';

export default function MePage() {
  const router = useRouter();
  const { user, token, logout } = useAuthStore();
  const [profile, setProfile] = useState<User | null>(null);

  useEffect(() => {
    if (!token) return;
    api.get<User>('/auth/me').then(setProfile).catch(() => logout());
  }, [token]);

  if (!token) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-16 text-center">
        <p className="text-gray-500 mb-4">请先登录</p>
        <Link href="/login" className="px-6 py-3 rounded-xl bg-brand-500 text-white font-medium">前往登录</Link>
      </div>
    );
  }

  const display = profile || user;

  return (
    <div className="max-w-2xl mx-auto px-4 py-6 sm:py-10">
      <h1 className="text-2xl font-bold mb-6">👤 我的</h1>

      <div className="rounded-2xl bg-white border border-gray-100 p-6 shadow-sm">
        <div className="flex items-center gap-4">
          <div className="w-16 h-16 rounded-full bg-brand-100 flex items-center justify-center text-2xl">
            {display?.username?.charAt(0).toUpperCase()}
          </div>
          <div>
            <p className="text-lg font-semibold">{display?.username}</p>
            <p className="text-sm text-gray-500">{display?.email}</p>
            <span className="inline-block mt-1 px-2 py-0.5 rounded text-xs bg-brand-50 text-brand-700">
              {display?.role === 'admin' ? '管理员' : '读者'}
            </span>
          </div>
        </div>
      </div>

      <div className="mt-6 grid grid-cols-2 gap-3">
        <Link href="/bookshelf" className="p-4 rounded-2xl bg-white border border-gray-100 shadow-sm hover:shadow transition">
          <p className="text-2xl">📚</p>
          <p className="mt-1 font-medium">我的书架</p>
        </Link>
        <button onClick={() => { logout(); router.push('/'); }}
          className="p-4 rounded-2xl bg-white border border-gray-100 shadow-sm hover:shadow transition text-left">
          <p className="text-2xl">🚪</p>
          <p className="mt-1 font-medium">退出登录</p>
        </button>
      </div>
    </div>
  );
}
