'use client';
import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { api, type Book, type Bookshelf, type Progress, type ChapterItem } from '@/lib/api';
import { useAuthStore } from '@/stores/auth';

export default function BookDetailPage() {
  const params = useParams();
  const id = params.id as string;
  const router = useRouter();
  const user = useAuthStore(s => s.user);
  const [book, setBook] = useState<Book | null>(null);
  const [loading, setLoading] = useState(true);
  const [deleting, setDeleting] = useState(false);
  const [progress, setProgress] = useState<Progress | null>(null);
  const [chapters, setChapters] = useState<ChapterItem[]>([]);
  const [shelves, setShelves] = useState<Bookshelf[]>([]);
  const [showShelfPicker, setShowShelfPicker] = useState(false);
  const [adding, setAdding] = useState(false);
  const [addedMsg, setAddedMsg] = useState('');

  // 检查书籍是否在书架中
  const [isInShelf, setIsInShelf] = useState(false);

  useEffect(() => {
    api.get<Book>(`/books/${id}`).then(setBook).catch(() => setBook(null)).finally(() => setLoading(false));
  }, [id]);

  // 登录后加载书架、进度和章节列表
  useEffect(() => {
    if (!user) return;
    api.get<Bookshelf[]>('/bookshelves').then(setShelves).catch(() => {});
    api.get<Progress | null>(`/progress/${id}`).then(setProgress).catch(() => {});
    // 获取章节列表
    api.get<{ chapters: ChapterItem[] }>(`/files/books/${id}/content`).then(data => {
      setChapters(data.chapters || []);
    }).catch(() => {});
  }, [id, user]);

  // 检查当前书籍是否在任一书架中
  useEffect(() => {
    if (!user || shelves.length === 0) {
      setIsInShelf(false);
      return;
    }
    Promise.all(shelves.map(s => api.get<Book[]>(`/bookshelves/${s.id}/books`)))
      .then(results => {
        const inAny = results.some(books => books.some(b => b.id === id));
        setIsInShelf(inAny);
      })
      .catch(() => setIsInShelf(false));
  }, [id, user, shelves]);

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

  async function addToShelf(shelfId: string) {
    setAdding(true);
    try {
      await api.post(`/bookshelves/${shelfId}/books`, { bookId: id });
      setShowShelfPicker(false);
      setIsInShelf(true);
      setAddedMsg('已加入书架');
      setTimeout(() => setAddedMsg(''), 2000);
    } catch (err) {
      alert(err instanceof Error ? err.message : '添加失败');
    } finally {
      setAdding(false);
    }
  }

  async function createDefaultShelf() {
    setAdding(true);
    try {
      const shelf = await api.post<Bookshelf>('/bookshelves', { name: '默认书架' });
      await api.post(`/bookshelves/${shelf.id}/books`, { bookId: id });
      setShelves([...shelves, shelf]);
      setIsInShelf(true);
      setAddedMsg('已加入默认书架');
      setTimeout(() => setAddedMsg(''), 2000);
    } catch (err) {
      alert(err instanceof Error ? err.message : '添加失败');
    } finally {
      setAdding(false);
    }
  }

  function handleAddToShelf() {
    if (shelves.length === 0) {
      createDefaultShelf();
    } else {
      setShowShelfPicker(true);
    }
  }

  if (loading) return <div className="max-w-4xl mx-auto px-4 py-12 text-center text-gray-400">加载中...</div>;
  if (!book) return <div className="max-w-4xl mx-auto px-4 py-12 text-center text-gray-400">书籍不存在</div>;

  const hasProgress = progress && progress.chapter > 1;
  const currentChapterIndex = progress?.chapter || 1;

  return (
    <div className="max-w-4xl mx-auto px-4 py-6 sm:py-10">
      <Link href="/" className="text-sm text-brand-600 hover:underline">← 返回首页</Link>

      {showShelfPicker && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30" onClick={() => setShowShelfPicker(false)}>
          <div className="bg-white rounded-2xl p-6 w-80 shadow-xl" onClick={e => e.stopPropagation()}>
            <h3 className="text-lg font-semibold mb-4">选择书架</h3>
            {shelves.map(s => (
              <button key={s.id} onClick={() => addToShelf(s.id)} disabled={adding}
                className="w-full text-left px-4 py-3 rounded-xl hover:bg-gray-50 border-b border-gray-100 last:border-0 disabled:opacity-50">
                {s.name}
              </button>
            ))}
            <button onClick={() => setShowShelfPicker(false)}
              className="mt-3 w-full py-2 text-sm text-gray-500 hover:text-gray-700">
              取消
            </button>
          </div>
        </div>
      )}

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

          {/* 阅读进度提示 */}
          {hasProgress && (
            <div className="mt-4 px-4 py-3 rounded-xl bg-brand-50 text-brand-700 text-sm">
              已读到第 {progress!.chapter} 章，进度 {progress!.percentage}
            </div>
          )}

          <div className="mt-6 flex flex-wrap gap-3 items-center">
            {/* 继续阅读：有进度时显示，跳到上次位置 */}
            {hasProgress && (
              <Link
                href={`/books/${book.id}/read?chapter=${progress!.chapter}`}
                className="px-6 py-3 rounded-xl bg-brand-500 text-white font-medium hover:bg-brand-600 transition"
              >
                继续阅读
              </Link>
            )}
            {/* 开始阅读：始终显示，从头开始 */}
            <Link
              href={`/books/${book.id}/read?restart=1`}
              className="px-6 py-3 rounded-xl border border-brand-200 text-brand-600 font-medium hover:bg-brand-50 transition"
            >
              开始阅读
            </Link>
            {/* 加入书架：未加入书架时显示 */}
            {!isInShelf && (
              <button
                onClick={handleAddToShelf}
                disabled={adding}
                className="px-6 py-3 rounded-xl border border-gray-200 text-gray-700 font-medium hover:bg-gray-50 transition disabled:opacity-50"
              >
                {adding ? '添加中...' : '+ 加入书架'}
              </button>
            )}
            {addedMsg && <span className="text-sm text-green-600">{addedMsg}</span>}
            {user?.role === 'admin' && (
              <button onClick={handleDelete} disabled={deleting}
                className="px-6 py-3 rounded-xl border border-red-200 text-red-600 font-medium hover:bg-red-50 transition disabled:opacity-50">
                {deleting ? '删除中...' : '删除书籍'}
              </button>
            )}
          </div>
        </div>
      </div>

      {/* 章节列表 */}
      {chapters.length > 0 && (
        <div className="mt-10">
          <h2 className="text-lg font-bold text-gray-800 mb-4">目录（{chapters.length} 章）</h2>
          <div className="bg-white rounded-2xl border border-gray-100 divide-y divide-gray-50 max-h-[600px] overflow-y-auto">
            {chapters.map(ch => {
              const isCurrent = ch.index === currentChapterIndex;
              const isRead = hasProgress && ch.index < currentChapterIndex;
              return (
                <Link
                  key={ch.index}
                  href={`/books/${book.id}/read?chapter=${ch.index}`}
                  className={`flex items-center justify-between px-6 py-4 transition hover:bg-gray-50 ${
                    isCurrent ? 'bg-brand-50' : ''
                  }`}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <span className={`text-sm font-mono w-8 text-right shrink-0 ${
                      isCurrent ? 'text-brand-600 font-bold' : 'text-gray-400'
                    }`}>
                      {ch.index}
                    </span>
                    <span className={`truncate ${
                      isCurrent ? 'text-brand-700 font-medium' : isRead ? 'text-gray-400' : 'text-gray-700'
                    }`}>
                      {ch.title}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    {isCurrent && (
                      <span className="text-xs px-2 py-0.5 rounded-full bg-brand-500 text-white">当前</span>
                    )}
                    {isRead && (
                      <span className="text-xs text-gray-400">已读</span>
                    )}
                  </div>
                </Link>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
