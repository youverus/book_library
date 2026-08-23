'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { api, type Bookshelf, type Book } from '@/lib/api';
import { useAuthStore } from '@/stores/auth';
import { BookCard } from '@/components/BookCard';

export default function BookshelfPage() {
  const token = useAuthStore(s => s.token);
  const [shelves, setShelves] = useState<Bookshelf[]>([]);
  const [activeShelf, setActiveShelf] = useState<string | null>(null);
  const [books, setBooks] = useState<Book[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!token) { setLoading(false); return; }
    api.get<Bookshelf[]>('/bookshelves').then(data => {
      setShelves(data);
      if (data.length > 0) setActiveShelf(data[0].id);
    }).finally(() => setLoading(false));
  }, [token]);

  useEffect(() => {
    if (!activeShelf) return;
    api.get<Book[]>(`/bookshelves/${activeShelf}/books`).then(setBooks);
  }, [activeShelf]);

  if (!token) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-16 text-center">
        <p className="text-gray-500 mb-4">请先登录查看书架</p>
        <Link href="/login" className="px-6 py-3 rounded-xl bg-brand-500 text-white font-medium">前往登录</Link>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto px-4 py-6 sm:py-10">
      <h1 className="text-2xl font-bold mb-6">📚 我的书架</h1>

      {loading ? (
        <p className="text-gray-400">加载中...</p>
      ) : shelves.length === 0 ? (
        <p className="text-gray-400">还没有书架，去首页添加书籍吧</p>
      ) : (
        <>
          <div className="flex gap-2 overflow-x-auto no-scrollbar mb-6">
            {shelves.map(s => (
              <button key={s.id} onClick={() => setActiveShelf(s.id)}
                className={`px-4 py-2 rounded-full text-sm whitespace-nowrap transition ${
                  activeShelf === s.id ? 'bg-brand-500 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}>
                {s.name} ({s.bookCount})
              </button>
            ))}
          </div>

          {books.length === 0 ? (
            <p className="text-gray-400">这个书架还没有书</p>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
              {books.map(b => <BookCard key={b.id} book={b} />)}
            </div>
          )}
        </>
      )}
    </div>
  );
}
