'use client';
import { useState } from 'react';
import { api, type Book } from '@/lib/api';
import { BookCard } from '@/components/BookCard';

export default function SearchPage() {
  const [q, setQ] = useState('');
  const [results, setResults] = useState<Book[]>([]);
  const [total, setTotal] = useState(0);
  const [searched, setSearched] = useState(false);

  async function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    if (!q.trim()) return;
    const data = await api.get<{ items: Book[]; total: number }>(`/search?q=${encodeURIComponent(q)}`);
    setResults(data.items);
    setTotal(data.total);
    setSearched(true);
  }

  return (
    <div className="max-w-6xl mx-auto px-4 py-6 sm:py-10">
      <h1 className="text-2xl font-bold mb-6">🔍 搜索书籍</h1>
      <form onSubmit={handleSearch} className="flex gap-2 mb-8">
        <input value={q} onChange={e => setQ(e.target.value)}
          className="flex-1 px-4 py-3 rounded-xl border border-gray-200 focus:outline-none focus:border-brand-500 transition"
          placeholder="搜索书名、作者、简介..." />
        <button className="px-6 py-3 rounded-xl bg-brand-500 text-white font-medium hover:bg-brand-600 transition">搜索</button>
      </form>

      {searched && (
        <>
          <p className="text-sm text-gray-500 mb-4">找到 {total} 本相关书籍</p>
          {results.length === 0 ? (
            <p className="text-gray-400 text-center py-12">没有找到相关书籍</p>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-x-4 gap-y-6">
              {results.map(b => <BookCard key={b.id} book={b} />)}
            </div>
          )}
        </>
      )}
    </div>
  );
}
