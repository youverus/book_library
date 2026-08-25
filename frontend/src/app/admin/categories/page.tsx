'use client';
import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { api, type Category } from '@/lib/api';
import { useAuthStore } from '@/stores/auth';

interface CatWithCount extends Category {
  bookCount?: number;
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
      const [cats, counts] = await Promise.all([
        api.get<CatWithCount[]>('/categories'),
        api.get<{ category: string; count: number }[]>('/books/categories'),
      ]);
      const countMap = new Map(counts.map(c => [c.category, c.count]));
      setCategories(cats.map(c => ({ ...c, bookCount: countMap.get(c.category) ?? 0 })));
    } catch {
      try {
        const data = await api.get<CatWithCount[]>('/categories');
        setCategories(data.map(c => ({ ...c, bookCount: 0 })));
      } catch { /* ignore */ }
    }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { if (user?.role === 'admin') loadCategories(); }, [user, loadCategories]);

  async function addCategory() {
    const name = newCat.trim();
    if (!name) {
      alert('请输入分类名称');
      return;
    }
    if (name.length > 20) {
      alert('分类名称不能超过 20 个字符');
      return;
    }
    try {
      await api.post('/categories', { name });
      setNewCat('');
      await loadCategories();
    } catch (err) {
      const msg = err instanceof Error ? err.message : '添加失败';
      alert(msg);
    }
  }

  async function deleteCategory(name: string, bookCount: number) {
    if (bookCount > 0) {
      alert(`该分类下还有 ${bookCount} 本书，无法删除。请先删除或移动这些书籍。`);
      return;
    }
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
          <p className="text-sm text-gray-400 mt-1">只有分类下没有书籍时才能删除</p>
        </div>
        {categories.length === 0 ? (
          <div className="px-6 py-12 text-center text-gray-400">暂无分类</div>
        ) : (
          <div className="divide-y divide-gray-50">
            {categories.map(cat => {
              const canDelete = (cat.bookCount ?? 0) === 0;
              return (
                <div key={cat.id} className="px-6 py-4 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <span className="font-medium text-gray-800">{cat.category}</span>
                    <span className="text-xs px-2 py-0.5 rounded-full bg-gray-100 text-gray-500">
                      {cat.bookCount ?? 0} 本书
                    </span>
                  </div>
                  <button onClick={() => deleteCategory(cat.category, cat.bookCount ?? 0)}
                    disabled={!canDelete}
                    title={canDelete ? '删除分类' : '该分类下还有书籍，无法删除'}
                    className={`px-3 py-1.5 text-sm rounded-lg border transition ${
                      canDelete
                        ? 'text-red-600 border-red-200 hover:bg-red-50'
                        : 'text-gray-300 border-gray-100 cursor-not-allowed'
                    }`}>
                    删除
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
