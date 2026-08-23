import { api, type Book } from '@/lib/api';

async function getBook(id: string) {
  try { return await api.get<Book>(`/books/${id}`); }
  catch { return null; }
}

export default async function ReadPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const book = await getBook(id);
  if (!book) return <div className="max-w-3xl mx-auto px-4 py-12 text-center text-gray-400">书籍不存在</div>;

  return (
    <div className="max-w-3xl mx-auto px-4 py-8">
      <div className="mb-6">
        <h1 className="text-xl font-bold">{book.title}</h1>
        <p className="text-sm text-gray-500">{book.author}</p>
      </div>

      <div className="rounded-2xl bg-white border border-gray-100 p-6 sm:p-10 shadow-sm min-h-[60vh]">
        <p className="text-gray-400 text-center py-20">
          📖 阅读器引擎即将上线<br />
          <span className="text-sm">当前为占位页，后续接入 EPUB/TXT 章节渲染</span>
        </p>
      </div>
    </div>
  );
}
