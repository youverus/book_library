'use client';
import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { api } from '@/lib/api';
import { useAuthStore } from '@/stores/auth';

interface UserInfo {
  id: string;
  username: string;
  email: string;
  role: string;
  createdAt: string;
}

export default function AdminUsersPage() {
  const router = useRouter();
  const user = useAuthStore(s => s.user);
  const [users, setUsers] = useState<UserInfo[]>([]);
  const [loading, setLoading] = useState(true);

  const checkAuth = useCallback(() => {
    if (!user || user.role !== 'admin') {
      router.push('/login');
    }
  }, [user, router]);

  useEffect(() => { checkAuth(); }, [checkAuth]);

  const loadUsers = useCallback(async () => {
    try {
      const data = await api.get<UserInfo[]>('/users');
      setUsers(data);
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (user?.role === 'admin') loadUsers();
  }, [user, loadUsers]);

  if (loading) {
    return <div className="max-w-4xl mx-auto px-4 py-12 text-center text-gray-500">加载中...</div>;
  }

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold mb-6">用户管理</h1>
      <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-100">
          <h2 className="text-lg font-semibold">注册用户（{users.length}）</h2>
          <p className="text-sm text-gray-400 mt-1">仅可查看 ID 和邮箱，不可执行其他操作</p>
        </div>
        {users.length === 0 ? (
          <div className="px-6 py-12 text-center text-gray-400">暂无注册用户</div>
        ) : (
          <div className="divide-y divide-gray-50">
            {users.map(u => (
              <div key={u.id} className="px-6 py-4 flex items-center justify-between">
                <div className="min-w-0">
                  <div className="font-medium text-gray-800">{u.username}</div>
                  <div className="text-sm text-gray-400 font-mono">{u.email}</div>
                </div>
                <div className="text-right shrink-0 ml-4">
                  <div className="text-xs text-gray-400 font-mono">{u.id}</div>
                  <div className="text-xs text-gray-400 mt-1">
                    {new Date(u.createdAt).toLocaleDateString('zh-CN')}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
