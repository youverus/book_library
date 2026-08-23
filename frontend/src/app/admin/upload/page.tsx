'use client';

import { useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { api } from '@/lib/api';
import { useAuthStore } from '@/stores/auth';

export default function UploadPage() {
  const router = useRouter();
  const { user } = useAuthStore();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [file, setFile] = useState<File | null>(null);
  const [title, setTitle] = useState('');
  const [author, setAuthor] = useState('');
  const [category, setCategory] = useState('其他');
  const [description, setDescription] = useState('');
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  if (user?.role !== 'admin') {
    return (
      <div className="max-w-2xl mx-auto px-4 py-16 text-center">
        <p className="text-gray-500">需要管理员权限</p>
      </div>
    );
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
      setCategory('其他');
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
    <div className="max-w-2xl mx-auto px-4 py-6 sm:py-10">
      <h1 className="text-2xl font-bold mb-6">📤 上传书籍</h1>

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
          <label className="block text-sm font-medium text-gray-700 mb-2">分类</label>
          <select
            value={category}
            onChange={e => setCategory(e.target.value)}
            className="w-full px-4 py-2.5 rounded-xl border border-gray-200 focus:border-brand-300 focus:ring-2 focus:ring-brand-100 outline-none transition bg-white"
          >
            <option value="文学">文学</option>
            <option value="科幻">科幻</option>
            <option value="历史">历史</option>
            <option value="古典">古典</option>
            <option value="童话">童话</option>
            <option value="其他">其他</option>
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
          disabled={uploading}
          className="w-full py-3 rounded-xl bg-brand-500 text-white font-medium hover:bg-brand-600 transition disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {uploading ? '上传中...' : '上传书籍'}
        </button>
      </div>
    </div>
  );
}
