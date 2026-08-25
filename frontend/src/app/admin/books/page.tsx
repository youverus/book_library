'use client';
import { useEffect, useState, useCallback, useMemo, useRef } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { api, type Book, type Category } from '@/lib/api';
import { useAuthStore } from '@/stores/auth';
import { Tabs } from '@/components/Tabs';

type BookTab = 'list' | 'categories' | 'upload';

interface CatWithCount extends Category {
  bookCount?: number;
}

export default function AdminBooksPage() {
  const router = useRouter();
  const user = useAuthStore(s => s.user);
  const [activeTab, setActiveTab] = useState<BookTab>('list');

  const checkAuth = useCallback(() => {
    if (!user || user.role !== 'admin') router.push('/login');
  }, [user, router]);

  useEffect(() => { checkAuth(); }, [checkAuth]);

  const tabs = useMemo(() => [
    { key: 'list' as const, label: '书籍列表' },
    { key: 'categories' as const, label: '分类管理' },
    { key: 'upload' as const, label: '上传书籍' },
  ], []);

  return (
    <div className="max-w-5xl mx-auto px-4 py-8">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">书籍管理</h1>
        {activeTab !== 'upload' && (
          <button
            onClick={() => setActiveTab('upload')}
            className="px-5 py-2.5 rounded-xl bg-brand-500 text-white font-medium hover:bg-brand-600 transition"
          >
            + 上传新书
          </button>
        )}
      </div>
      <Tabs tabs={tabs} activeKey={activeTab} onChange={setActiveTab} />
      {activeTab === 'list' && <BooksList />}
      {activeTab === 'categories' && <CategoriesTab />}
      {activeTab === 'upload' && <UploadTab />}
    </div>
  );
}

/* ==================== 书籍列表 ==================== */
function BooksList() {
  const router = useRouter();
  const user = useAuthStore(s => s.user);
  const [books, setBooks] = useState<Book[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [keyword, setKeyword] = useState('');
  const [deleting, setDeleting] = useState<string | null>(null);
  const pageSize = 20;

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
    return <div className="text-center text-gray-500 py-12">加载中...</div>;
  }

  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  return (
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
  );
}

/* ==================== 分类管理 ==================== */
function CategoriesTab() {
  const user = useAuthStore(s => s.user);
  const [categories, setCategories] = useState<CatWithCount[]>([]);
  const [loading, setLoading] = useState(true);
  const [newCat, setNewCat] = useState('');

  const loadCategories = useCallback(async () => {
    try {
      const [cats, counts] = await Promise.all([
        api.get<CatWithCount[]>('/categories'),
        api.get<{ category: string; count: number }[]>('/books/categories'),
      ]);
      const countMap = new Map(counts.map(c => [c.category, c.count]));
      setCategories(cats.map(c => ({ ...c, bookCount: countMap.get(c.category) ?? 0 })));
    } catch {
      try {
        const data = await api.get<CatWithCount[]>('/categories');
        setCategories(data.map(c => ({ ...c, bookCount: 0 })));
      } catch { /* ignore */ }
    }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { if (user?.role === 'admin') loadCategories(); }, [user, loadCategories]);

  async function addCategory() {
    const name = newCat.trim();
    if (!name) {
      alert('请输入分类名称');
      return;
    }
    if (name.length > 20) {
      alert('分类名称不能超过 20 个字符');
      return;
    }
    try {
      await api.post('/categories', { name });
      setNewCat('');
      await loadCategories();
    } catch (err) {
      const msg = err instanceof Error ? err.message : '添加失败';
      alert(msg);
    }
  }

  async function deleteCategory(name: string, bookCount: number) {
    if (bookCount > 0) {
      alert(`该分类下还有 ${bookCount} 本书，无法删除。请先删除或移动这些书籍。`);
      return;
    }
    if (!confirm(`确定要删除分类「${name}」吗？`)) return;
    try {
      await api.del(`/categories/${encodeURIComponent(name)}`);
      await loadCategories();
    } catch (err) {
      alert(err instanceof Error ? err.message : '删除失败');
    }
  }

  if (loading) return <div className="text-center text-gray-500 py-12">加载中...</div>;

  return (
    <>
      <div className="bg-white rounded-2xl border border-gray-100 p-6 mb-6">
        <h2 className="text-lg font-semibold mb-4">添加分类</h2>
        <div className="flex gap-3">
          <input value={newCat} onChange={e => setNewCat(e.target.value)}
            placeholder="输入新分类名称"
            className="flex-1 px-4 py-2.5 rounded-xl border border-gray-200 focus:outline-none focus:border-brand-500 transition"
            onKeyDown={e => e.key === 'Enter' && addCategory()}
          />
          <button onClick={addCategory}
            className="px-6 py-2.5 rounded-xl bg-brand-500 text-white font-medium hover:bg-brand-600 transition">
            添加
          </button>
        </div>
      </div>
      <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-100">
          <h2 className="text-lg font-semibold">全部分类（{categories.length}）</h2>
          <p className="text-sm text-gray-400 mt-1">只有分类下没有书籍时才能删除</p>
        </div>
        {categories.length === 0 ? (
          <div className="px-6 py-12 text-center text-gray-400">暂无分类</div>
        ) : (
          <div className="divide-y divide-gray-50">
            {categories.map(cat => {
              const canDelete = (cat.bookCount ?? 0) === 0;
              return (
                <div key={cat.id} className="px-6 py-4 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <span className="font-medium text-gray-800">{cat.category}</span>
                    <span className="text-xs px-2 py-0.5 rounded-full bg-gray-100 text-gray-500">
                      {cat.bookCount ?? 0} 本书
                    </span>
                  </div>
                  <button onClick={() => deleteCategory(cat.category, cat.bookCount ?? 0)}
                    disabled={!canDelete}
                    title={canDelete ? '删除分类' : '该分类下还有书籍，无法删除'}
                    className={`px-3 py-1.5 text-sm rounded-lg border transition ${
                      canDelete
                        ? 'text-red-600 border-red-200 hover:bg-red-50'
                        : 'text-gray-300 border-gray-100 cursor-not-allowed'
                    }`}>
                    删除
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </>
  );
}

/* ==================== 上传书籍 ==================== */
function UploadTab() {
  const router = useRouter();
  const { user } = useAuthStore();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [file, setFile] = useState<File | null>(null);
  const [title, setTitle] = useState('');
  const [author, setAuthor] = useState('');
  const [category, setCategory] = useState('');
  const [description, setDescription] = useState('');
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [categories, setCategories] = useState<{ id: string; category: string }[]>([]);
  const [categoriesLoading, setCategoriesLoading] = useState(true);

  useEffect(() => {
    api.get<{ id: string; category: string }[]>('/categories')
      .then((data) => {
        setCategories(data);
        if (data.length > 0 && !category) {
          setCategory(data[0].category);
        }
      })
      .catch(() => {
        /* fallback: keep empty */
      })
      .finally(() => setCategoriesLoading(false));
  }, []);

  if (categoriesLoading) {
    return <div className="text-center text-gray-500 py-12">加载中...</div>;
  }

  if (user?.role !== 'admin') {
    return <div className="text-center text-gray-500 py-12">需要管理员权限</div>;
  }

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const selected = e.target.files?.[0];
    if (selected) {
      setFile(selected);
      if (!title) {
        setTitle(selected.name.replace(/\.(txt|epub|pdf)$/i, ''));
      }
      setError('');
      setSuccess('');
    }
  }

  async function handleUpload() {
    if (!file) {
      setError('请选择文件');
      return;
    }
    if (!title.trim()) {
      setError('请输入书名');
      return;
    }
    if (!category) {
      setError('请先添加至少一个分类');
      return;
    }

    const allowedTypes = ['.txt', '.epub', '.pdf'];
    const ext = file.name.substring(file.name.lastIndexOf('.')).toLowerCase();
    if (!allowedTypes.includes(ext)) {
      setError('仅支持 .txt, .epub, .pdf 格式');
      return;
    }

    setUploading(true);
    setError('');
    setSuccess('');

    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('metadata', JSON.stringify({
        title: title.trim(),
        author: author.trim(),
        category,
        description: description.trim(),
      }));

      const token = localStorage.getItem('token');
      const res = await fetch('/api/files/upload', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` },
        body: formData,
      });
      const json = await res.json();

      if (json.code !== 0) {
        throw new Error(json.message || '上传失败');
      }

      setSuccess(`《${json.data.book.title}》上传成功！共 ${json.data.book.totalChapters} 章`);
      setFile(null);
      setTitle('');
      setAuthor('');
      setCategory(categories[0]?.category ?? '');
      setDescription('');
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : '上传失败');
    } finally {
      setUploading(false);
    }
  }

  return (
    <div className="max-w-2xl mx-auto">
      <div className="rounded-2xl bg-white border border-gray-100 p-6 shadow-sm space-y-5">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">书籍文件 *</label>
          <div
            onClick={() => fileInputRef.current?.click()}
            className="border-2 border-dashed border-gray-200 rounded-xl p-8 text-center cursor-pointer hover:border-brand-300 hover:bg-brand-50/30 transition"
          >
            {file ? (
              <div>
                <p className="text-2xl mb-2">📄</p>
                <p className="text-sm text-gray-700 font-medium">{file.name}</p>
                <p className="text-xs text-gray-400 mt-1">
                  {(file.size / 1024).toFixed(1)} KB
                </p>
              </div>
            ) : (
              <div>
                <p className="text-3xl mb-2">📁</p>
                <p className="text-sm text-gray-500">点击选择文件</p>
                <p className="text-xs text-gray-400 mt-1">支持 .txt, .epub, .pdf</p>
              </div>
            )}
          </div>
          <input
            ref={fileInputRef}
            type="file"
            accept=".txt,.epub,.pdf"
            onChange={handleFileChange}
            className="hidden"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">书名 *</label>
          <input
            type="text"
            value={title}
            onChange={e => setTitle(e.target.value)}
            placeholder="输入书名"
            className="w-full px-4 py-2.5 rounded-xl border border-gray-200 focus:border-brand-300 focus:ring-2 focus:ring-brand-100 outline-none transition"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">作者</label>
          <input
            type="text"
            value={author}
            onChange={e => setAuthor(e.target.value)}
            placeholder="输入作者名"
            className="w-full px-4 py-2.5 rounded-xl border border-gray-200 focus:border-brand-300 focus:ring-2 focus:ring-brand-100 outline-none transition"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            分类
            {categories.length === 0 && (
              <span className="text-red-500 text-xs ml-1">（暂无分类，请先在分类管理中添加）</span>
            )}
          </label>
          <select
            value={category}
            onChange={e => setCategory(e.target.value)}
            className="w-full px-4 py-2.5 rounded-xl border border-gray-200 focus:border-brand-300 focus:ring-2 focus:ring-brand-100 outline-none transition bg-white"
          >
            {categories.map((c) => (
              <option key={c.id} value={c.category}>{c.category}</option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">简介</label>
          <textarea
            value={description}
            onChange={e => setDescription(e.target.value)}
            placeholder="输入书籍简介（可选）"
            rows={3}
            className="w-full px-4 py-2.5 rounded-xl border border-gray-200 focus:border-brand-300 focus:ring-2 focus:ring-brand-100 outline-none transition resize-none"
          />
        </div>

        {error && (
          <div className="p-3 rounded-xl bg-red-50 text-red-600 text-sm">{error}</div>
        )}
        {success && (
          <div className="p-3 rounded-xl bg-green-50 text-green-600 text-sm">{success}</div>
        )}

        <button
          onClick={handleUpload}
          disabled={uploading || categories.length === 0}
          className="w-full py-3 rounded-xl bg-brand-500 text-white font-medium hover:bg-brand-600 transition disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {uploading ? '上传中...' : '上传书籍'}
        </button>
      </div>
    </div>
  );
}
