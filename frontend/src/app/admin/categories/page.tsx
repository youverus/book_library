'use client';
import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { api, type Category } from '@/lib/api';
import { useAuthStore } from '@/stores/auth';

interface CatWithCount extends Category {
  count?: number;
}

export default function AdminCategoriesPage() {
  const router = useRouter();
  const user = useAuthStore(s => s.user);
  const [categories, setCategories] = useState<CatWithCount[]>([]);
  const [loading, setLoading] = useState(true);
  const [newCat, setNewCat] = useState('');

  const checkAuth = useCallback(() => {
    if (!user || user.role !== 'admin') router.push('/login');
  }, [user, router]);
  useEffect(() => { checkAuth(); }, [checkAuth]);

  const loadCategories = useCallback(async () => {
    try {
      const data = await api.get<CatWithCount[]>('/categories');
      setCategories(data);
    } catch { /* ignore */ }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { if (user?.role === 'admin') loadCategories(); }, [user, loadCategories]);

  async function addCategory() {
    const name = newCat.trim();
    if (!name) return;
    try {
      await api.post('/categories', { name });
      setNewCat('');
      await loadCategories();
    } catch (err) {
      alert(err instanceof Error ? err.message : '添加失败');
    }
  }

  async function deleteCategory(name: string) {
    if (!confirm(`确定要删除分类「${name}」吗？`)) return;
    try {
      await api.del(`/categories/${encodeURIComponent(name)}`);
      await loadCategories();
    } catch (err) {
      alert(err instanceof Error ? err.message : '删除失败');
    }
  }

  if (loading) return <div className="max-w-4xl mx-auto px-4 py-12 text-center text-gray-500">加载中...</div>;

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold mb-6">分类管理</h1>
      <div className="bg-white rounded-2xl border border-gray-100 p-6 mb-6">
        <h2 className="text-lg font-semibold mb-4">添加分类</h2>
        <div className="flex gap-3">
          <input value={newCat} onChange={e => setNewCat(e.target.value)}
            placeholder="输入新分类名称"
            className="flex-1 px-4 py-2.5 rounded-xl border border-gray-200 focus:outline-none focus:border-brand-500 transition"
            onKeyDown={e => e.key === 'Enter' && addCategory()}
          />
          <button onClick={addCategory}
            className="px-6 py-2.5 rounded-xl bg-brand-500 text-white font-medium hover:bg-brand-600 transition">
            添加
          </button>
        </div>
      </div>
      <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-100">
          <h2 className="text-lg font-semibold">全部分类（{categories.length}）</h2>
        </div>
        {categories.length === 0 ? (
          <div className="px-6 py-12 text-center text-gray-400">暂无分类</div>
        ) : (
          <div className="divide-y divide-gray-50">
            {categories.map(cat => (
              <div key={cat.id} className="px-6 py-4 flex items-center justify-between">
                <span className="font-medium text-gray-800">{cat.category}</span>
                <button onClick={() => deleteCategory(cat.category)}
                  className="px-3 py-1.5 text-sm rounded-lg text-red-600 border border-red-200 hover:bg-red-50 transition">
                  删除
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
