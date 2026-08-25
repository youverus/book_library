'use client';
import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { api, type Book } from '@/lib/api';
import { useAuthStore } from '@/stores/auth';

export default function AdminBooksPage() {
  const router = useRouter();
  const user = useAuthStore(s => s.user);
  const [books, setBooks] = useState<Book[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [keyword, setKeyword] = useState('');
  const [deleting, setDeleting] = useState<string | null>(null);
  const pageSize = 20;

  const checkAuth = useCallback(() => {
    if (!user || user.role !== 'admin') router.push('/login');
  }, [user, router]);

  const loadBooks = useCallback(async () => {
    try {
      const qs = `page=${page}&pageSize=${pageSize}${keyword ? `&keyword=${encodeURIComponent(keyword)}` : ''}`;
      const data = await api.get<{ items: Book[]; total: number }>(`/books?${qs}`);
      setBooks(data.items);
      setTotal(data.total);
    } catch {
      /* ignore */
    } finally {
      setLoading(false);
    }
  }, [page, keyword]);

  useEffect(() => { checkAuth(); }, [checkAuth]);

  useEffect(() => {
    if (user?.role === 'admin') loadBooks();
  }, [user, loadBooks]);

  async function deleteBook(book: Book) {
    if (!confirm(`确定要删除《${book.title}》吗？此操作不可恢复，源文件也会被删除。`)) return;
    setDeleting(book.id);
    try {
      await api.del(`/books/${book.id}`);
      await loadBooks();
    } catch (err) {
      alert(err instanceof Error ? err.message : '删除失败');
    } finally {
      setDeleting(null);
    }
  }

  if (loading) {
    return <div className="max-w-5xl mx-auto px-4 py-12 text-center text-gray-500">加载中...</div>;
  }

  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  return (
    <div className="max-w-5xl mx-auto px-4 py-8">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">书籍管理</h1>
        <Link href="/admin/upload" className="px-5 py-2.5 rounded-xl bg-brand-500 text-white font-medium hover:bg-brand-600 transition">
          + 上传新书
        </Link>
      </div>

      <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between gap-4">
          <h2 className="text-lg font-semibold">全部书籍（{total}）</h2>
          <input
            value={keyword}
            onChange={e => { setKeyword(e.target.value); setPage(1); }}
            placeholder="搜索书名..."
            className="px-4 py-2 rounded-lg border border-gray-200 text-sm focus:outline-none focus:border-brand-500 w-56"
          />
        </div>

        {books.length === 0 ? (
          <div className="px-6 py-12 text-center text-gray-400">暂无书籍</div>
        ) : (
          <div className="divide-y divide-gray-50">
            {books.map(b => (
              <div key={b.id} className="px-6 py-4 flex items-center justify-between gap-4">
                <div className="flex items-center gap-4 min-w-0">
                  <div className="w-10 h-12 rounded-lg bg-gradient-to-br from-brand-100 to-brand-50 flex items-center justify-center shrink-0">
                    {b.coverUrl ? (
                      <img src={b.coverUrl} alt={b.title} className="w-full h-full object-cover rounded-lg" />
                    ) : (
                      <span className="text-lg">📖</span>
                    )}
                  </div>
                  <div className="min-w-0">
                    <div className="font-medium text-gray-800 truncate">{b.title}</div>
                    <div className="text-sm text-gray-400 truncate">{b.author || '佚名'} · {b.category} · {b.fileType.toUpperCase()}</div>
                  </div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <Link href={`/books/${b.id}`}
                    className="px-3 py-1.5 text-sm rounded-lg border border-gray-200 hover:bg-gray-50 transition">
                    查看
                  </Link>
                  <button onClick={() => deleteBook(b)} disabled={deleting === b.id}
                    className="px-3 py-1.5 text-sm rounded-lg text-red-600 border border-red-200 hover:bg-red-50 transition disabled:opacity-50">
                    {deleting === b.id ? '删除中...' : '删除'}
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        {totalPages > 1 && (
          <div className="px-6 py-4 border-t border-gray-100 flex items-center justify-between">
            <span className="text-sm text-gray-500">第 {page} / {totalPages} 页</span>
            <div className="flex gap-2">
              <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page <= 1}
                className="px-4 py-2 text-sm rounded-lg border border-gray-200 hover:bg-gray-50 disabled:opacity-50 transition">
                上一页
              </button>
              <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page >= totalPages}
                className="px-4 py-2 text-sm rounded-lg border border-gray-200 hover:bg-gray-50 disabled:opacity-50 transition">
                下一页
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
