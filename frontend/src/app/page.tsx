'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { api, type Book } from '@/lib/api';
import { useAuthStore } from '@/stores/auth';

export default function HomePage() {
  const user = useAuthStore(s => s.user);
  const [books, setBooks] = useState<Book[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get<{ items: Book[]; total: number }>('/books?page=1&pageSize=5&sort=newest')
      .then(data => {
        setBooks(data.items);
        setTotal(data.total);
      })
      .catch(() => {
        setBooks([]);
        setTotal(0);
      })
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="max-w-6xl mx-auto px-4 py-6 sm:py-10">
      {/* Hero */}
      <section className="rounded-2xl bg-gradient-to-br from-brand-500 to-brand-700 text-white p-8 sm:p-12 mb-10">
        <h1 className="text-3xl sm:text-5xl font-bold mb-3">欢迎来到 Book Library</h1>
        <p className="text-brand-100 text-base sm:text-lg mb-6 max-w-xl">
          轻量跨平台在线书城，阅读进度、书架、笔记在手机 / 平板 / 桌面实时同步。
        </p>
        {user ? (
          <Link href="/store" className="inline-block px-6 py-3 bg-white text-brand-700 rounded-xl font-medium hover:bg-brand-50 transition">
            进入书城 →
          </Link>
        ) : (
          <Link href="/login" className="inline-block px-6 py-3 bg-white text-brand-700 rounded-xl font-medium hover:bg-brand-50 transition">
            登录后开始阅读 →
          </Link>
        )}
      </section>

      {/* 新书上架 */}
      <section className="mb-10">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-bold text-gray-800">📖 新书上架</h2>
          {user && (
            <Link href="/store" className="text-sm text-brand-600 hover:underline">查看全部</Link>
          )}
        </div>
        {loading ? (
          <p className="text-gray-400 text-center py-12">加载中...</p>
        ) : books.length === 0 ? (
          <p className="text-gray-400 text-center py-12">暂无书籍，请联系管理员添加</p>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
            {books.map(b => (
              <BookCard key={b.id} book={b} canClick={!!user} />
            ))}
          </div>
        )}
      </section>

      <p className="mt-8 text-center text-sm text-gray-400">共收录 {total} 本书籍</p>
    </div>
  );
}

function BookCard({ book, canClick }: { book: Book; canClick: boolean }) {
  if (!canClick) {
    return (
      <div className="group block opacity-70">
        <div className="aspect-[3/4] rounded-xl bg-gradient-to-br from-brand-100 to-brand-50 flex items-center justify-center overflow-hidden shadow-sm">
          {book.coverUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={book.coverUrl} alt={book.title} className="w-full h-full object-cover" />
          ) : (
            <span className="text-3xl">📖</span>
          )}
        </div>
        <h3 className="mt-2 text-sm font-medium text-gray-800 line-clamp-1">{book.title}</h3>
        <p className="text-xs text-gray-400 line-clamp-1">{book.author || '佚名'}</p>
        <p className="mt-1 text-xs text-brand-500">登录后查看</p>
      </div>
    );
  }

  return (
    <Link href={`/books/${book.id}`} className="group block">
      <div className="aspect-[3/4] rounded-xl bg-gradient-to-br from-brand-100 to-brand-50 flex items-center justify-center overflow-hidden shadow-sm group-hover:shadow-md transition">
        {book.coverUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={book.coverUrl} alt={book.title} className="w-full h-full object-cover" />
        ) : (
          <span className="text-3xl">📖</span>
        )}
      </div>
      <h3 className="mt-2 text-sm font-medium text-gray-800 line-clamp-1">{book.title}</h3>
      <p className="text-xs text-gray-400 line-clamp-1">{book.author || '佚名'}</p>
    </Link>
  );
}
