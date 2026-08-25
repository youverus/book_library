'use client';
import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { api, type Book } from '@/lib/api';
import { useAuthStore } from '@/stores/auth';
import { BookCard } from '@/components/BookCard';

export default function StorePage() {
  const router = useRouter();
  const user = useAuthStore(s => s.user);
  const [books, setBooks] = useState<Book[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [keyword, setKeyword] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('');
  const [categories, setCategories] = useState<string[]>([]);
  const pageSize = 18;

  // 未登录跳转
  useEffect(() => {
    if (!user) router.push('/login');
  }, [user, router]);

  // 加载分类
  useEffect(() => {
    api.get<{ category: string; count: number }[]>('/books/categories')
      .then(data => setCategories(data.map(c => c.category)))
      .catch(() => {});
  }, []);

  const loadBooks = useCallback(async () => {
    try {
      const params = new URLSearchParams({
        page: String(page),
        pageSize: String(pageSize),
        sort: 'newest',
      });
      if (keyword) params.set('keyword', keyword);
      if (selectedCategory) params.set('category', selectedCategory);
      const data = await api.get<{ items: Book[]; total: number }>(`/books?${params}`);
      setBooks(data.items);
      setTotal(data.total);
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  }, [page, keyword, selectedCategory]);

  useEffect(() => {
    if (user) loadBooks();
  }, [user, loadBooks]);

  if (!user) {
    return <div className="max-w-6xl mx-auto px-4 py-12 text-center text-gray-500">请先登录...</div>;
  }

  if (loading) {
    return <div className="max-w-6xl mx-auto px-4 py-12 text-center text-gray-500">加载中...</div>;
  }

  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  return (
    <div className="max-w-6xl mx-auto px-4 py-6 sm:py-10">
      <h1 className="text-2xl font-bold mb-6">🏪 书城</h1>

      {/* 筛选栏 */}
      <div className="flex flex-col sm:flex-row gap-3 mb-6">
        <input
          value={keyword}
          onChange={e => { setKeyword(e.target.value); setPage(1); }}
          placeholder="搜索书名、作者..."
          className="flex-1 px-4 py-2.5 rounded-xl border border-gray-200 focus:outline-none focus:border-brand-500 transition"
        />
        <select
          value={selectedCategory}
          onChange={e => { setSelectedCategory(e.target.value); setPage(1); }}
          className="px-4 py-2.5 rounded-xl border border-gray-200 focus:outline-none focus:border-brand-500 transition bg-white"
        >
          <option value="">全部分类</option>
          {categories.map(c => (
            <option key={c} value={c}>{c}</option>
          ))}
        </select>
      </div>

      {/* 书籍网格 */}
      {books.length === 0 ? (
        <div className="text-center py-16 text-gray-400">
          {keyword || selectedCategory ? '没有找到匹配的书籍' : '书城暂无书籍，请联系管理员上传'}
        </div>
      ) : (
        <>
          <p className="text-sm text-gray-500 mb-4">共 {total} 本</p>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
            {books.map(b => <BookCard key={b.id} book={b} />)}
          </div>
        </>
      )}

      {/* 分页 */}
      {totalPages > 1 && (
        <div className="mt-8 flex items-center justify-center gap-4">
          <button
            onClick={() => setPage(p => Math.max(1, p - 1))}
            disabled={page <= 1}
            className="px-4 py-2 text-sm rounded-lg border border-gray-200 hover:bg-gray-50 disabled:opacity-50 transition"
          >
            上一页
          </button>
          <span className="text-sm text-gray-500">第 {page} / {totalPages} 页</span>
          <button
            onClick={() => setPage(p => Math.min(totalPages, p + 1))}
            disabled={page >= totalPages}
            className="px-4 py-2 text-sm rounded-lg border border-gray-200 hover:bg-gray-50 disabled:opacity-50 transition"
          >
            下一页
          </button>
        </div>
      )}
    </div>
  );
}
