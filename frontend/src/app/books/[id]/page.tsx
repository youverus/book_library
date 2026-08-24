'use client';
import { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link';
import { api, type Book } from '@/lib/api';
import { useAuthStore } from '@/stores/auth';

export default function BookDetailPage() {
  const params = useParams();
  const id = params.id as string;
  const router = useRouter();
  const user = useAuthStore(s => s.user);
  const [book, setBook] = useState<Book | null>(null);
  const [loading, setLoading] = useState(true);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    api.get<Book>(`/books/${id}`).then(setBook).catch(() => setBook(null)).finally(() => setLoading(false));
  }, [id]);

  async function handleDelete() {
    if (!confirm(`确定要删除《${book?.title}》吗？此操作不可恢复。`)) return;
    setDeleting(true);
    try {
      await api.del(`/books/${id}`);
      router.push('/');
    } catch {
      setDeleting(false);
    }
  }

  if (loading) return <div className="max-w-4xl mx-auto px-4 py-12 text-center text-gray-400">加载中...</div>;
  if (!book) return <div className="max-w-4xl mx-auto px-4 py-12 text-center text-gray-400">书籍不存在</div>;

  return (
    <div className="max-w-4xl mx-auto px-4 py-6 sm:py-10">
      <Link href="/" className="text-sm text-brand-600 hover:underline">← 返回首页</Link>

      <div className="mt-6 flex flex-col sm:flex-row gap-6">
        <div className="w-full sm:w-48 shrink-0">
          <div className="aspect-[3/4] rounded-2xl bg-gradient-to-br from-brand-100 to-brand-50 flex items-center justify-center shadow">
            {book.coverUrl ? (
              <img src={book.coverUrl} alt={book.title} className="w-full h-full object-cover rounded-2xl" />
            ) : (
              <span className="text-5xl">📖</span>
            )}
          </div>
        </div>

        <div className="flex-1">
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">{book.title}</h1>
          <p className="mt-1 text-gray-500">{book.author || '佚名'}</p>
          <div className="mt-3 flex flex-wrap gap-2">
            <span className="px-3 py-1 rounded-full bg-brand-50 text-brand-700 text-xs">{book.category}</span>
            <span className="px-3 py-1 rounded-full bg-gray-100 text-gray-600 text-xs">{book.totalChapters} 章</span>
            <span className="px-3 py-1 rounded-full bg-gray-100 text-gray-600 text-xs">{book.totalPages} 页</span>
          </div>
          <p className="mt-4 text-gray-600 leading-relaxed">{book.description}</p>

          <div className="mt-6 flex gap-3">
            <Link href={`/books/${book.id}/read`}
              className="px-6 py-3 rounded-xl bg-brand-500 text-white font-medium hover:bg-brand-600 transition">
              开始阅读
            </Link>
            <button className="px-6 py-3 rounded-xl border border-gray-200 text-gray-700 font-medium hover:bg-gray-50 transition">
              + 加入书架
            </button>
            {user?.role === 'admin' && (
              <button onClick={handleDelete} disabled={deleting}
                className="px-6 py-3 rounded-xl border border-red-200 text-red-600 font-medium hover:bg-red-50 transition disabled:opacity-50">
                {deleting ? '删除中...' : '删除书籍'}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
