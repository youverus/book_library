import Link from 'next/link';
import { api, type Book } from '@/lib/api';

async function getBooks() {
  try {
    return await api.get<{ items: Book[]; total: number }>('/books?page=1&pageSize=12&sort=newest');
  } catch {
    return { items: [], total: 0 };
  }
}

export default async function HomePage() {
  const { items, total } = await getBooks();
  const newArrivals = items.slice(0, 6);
  const recommendations = items.slice(6, 12);

  return (
    <div className="max-w-6xl mx-auto px-4 py-6 sm:py-10">
      {/* Hero */}
      <section className="rounded-2xl bg-gradient-to-br from-brand-500 to-brand-700 text-white p-8 sm:p-12 mb-10">
        <h1 className="text-3xl sm:text-5xl font-bold mb-3">欢迎来到 Book Library</h1>
        <p className="text-brand-100 text-base sm:text-lg mb-6 max-w-xl">
          轻量跨平台在线书城，阅读进度、书架、笔记在手机 / 平板 / 桌面实时同步。
        </p>
        <Link href="/search" className="inline-block px-6 py-3 bg-white text-brand-700 rounded-xl font-medium hover:bg-brand-50 transition">
          开始阅读 →
        </Link>
      </section>

      {/* 新书上架 */}
      <section className="mb-10">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-bold text-gray-800">📖 新书上架</h2>
          <Link href="/search" className="text-sm text-brand-600 hover:underline">查看全部</Link>
        </div>
        {newArrivals.length === 0 ? (
          <p className="text-gray-400 text-center py-12">暂无书籍，请联系管理员添加</p>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
            {newArrivals.map(b => <BookCard key={b.id} book={b} />)}
          </div>
        )}
      </section>

      {/* 为你推荐 */}
      {recommendations.length > 0 && (
        <section>
          <h2 className="text-xl font-bold text-gray-800 mb-4">✨ 为你推荐</h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
            {recommendations.map(b => <BookCard key={b.id} book={b} />)}
          </div>
        </section>
      )}

      <p className="mt-8 text-center text-sm text-gray-400">共收录 {total} 本书籍</p>
    </div>
  );
}

function BookCard({ book }: { book: Book }) {
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
