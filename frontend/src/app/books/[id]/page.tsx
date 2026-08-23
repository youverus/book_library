import { api, type Book, type Progress, type Note } from '@/lib/api';
import Link from 'next/link';

async function getBook(id: string) {
  try { return await api.get<Book>(`/books/${id}`); }
  catch { return null; }
}

export default async function BookDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const book = await getBook(id);
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
          </div>
        </div>
      </div>
    </div>
  );
}
