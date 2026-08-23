'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { api, type ChapterContent, type ChapterItem, type Progress } from '@/lib/api';

export default function ReadPage() {
  const params = useParams();
  const router = useRouter();
  const bookId = params.id as string;

  const [chapters, setChapters] = useState<ChapterItem[]>([]);
  const [currentChapter, setCurrentChapter] = useState<number>(1);
  const [chapterContent, setChapterContent] = useState<string>('');
  const [chapterTitle, setChapterTitle] = useState<string>('');
  const [bookTitle, setBookTitle] = useState<string>('');
  const [totalChapters, setTotalChapters] = useState<number>(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>('');
  const [showToc, setShowToc] = useState(false);
  const [saving, setSaving] = useState(false);

  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    loadChapters();
    loadProgress();
  }, [bookId]);

  useEffect(() => {
    if (currentChapter > 0) {
      loadChapter(currentChapter);
    }
  }, [currentChapter, bookId]);

  useEffect(() => {
    if (currentChapter > 0 && totalChapters > 0) {
      saveProgress(currentChapter);
    }
  }, [currentChapter]);

  async function loadChapters() {
    try {
      setLoading(true);
      const data = await api.get<ChapterContent>(`/files/books/${bookId}/content`);
      setChapters(data.chapters || []);
      setTotalChapters(data.totalChapters);
      setBookTitle(data.bookTitle);
    } catch (err) {
      setError(err instanceof Error ? err.message : '加载失败');
    } finally {
      setLoading(false);
    }
  }

  async function loadProgress() {
    try {
      const progress = await api.get<Progress | null>(`/progress/${bookId}`);
      if (progress && progress.chapter > 0) {
        setCurrentChapter(progress.chapter);
      } else if (chapters.length > 0) {
        setCurrentChapter(chapters[0].index);
      }
    } catch {
    }
  }

  async function loadChapter(index: number) {
    try {
      setLoading(true);
      const data = await api.get<ChapterContent>(`/files/books/${bookId}/content?chapter=${index}`);
      setChapterContent(data.chapter.content);
      setChapterTitle(data.chapter.title);
    } catch (err) {
      setError(err instanceof Error ? err.message : '加载章节失败');
    } finally {
      setLoading(false);
    }
  }

  function saveProgress(chapter: number) {
    if (saveTimerRef.current) {
      clearTimeout(saveTimerRef.current);
    }
    saveTimerRef.current = setTimeout(async () => {
      setSaving(true);
      try {
        const percentage = totalChapters > 0
          ? `${Math.round((chapter / totalChapters) * 100)}%`
          : '0%';
        await api.put(`/progress/${bookId}`, {
          chapter,
          percentage,
          lastPosition: `chapter-${chapter}`,
        });
      } catch {
      } finally {
        setSaving(false);
      }
    }, 1000);
  }

  const goToChapter = useCallback((index: number) => {
    setCurrentChapter(index);
    setShowToc(false);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, []);

  const prevChapter = useCallback(() => {
    if (currentChapter > 1) goToChapter(currentChapter - 1);
  }, [currentChapter, goToChapter]);

  const nextChapter = useCallback(() => {
    if (currentChapter < totalChapters) goToChapter(currentChapter + 1);
  }, [currentChapter, totalChapters, goToChapter]);

  const progressPercent = totalChapters > 0
    ? Math.round((currentChapter / totalChapters) * 100)
    : 0;

  if (error) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-12 text-center">
        <p className="text-gray-400 mb-4">{error}</p>
        <Link href={`/books/${bookId}`} className="text-brand-600 hover:underline">← 返回书籍详情</Link>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="sticky top-0 z-10 bg-white/80 backdrop-blur border-b border-gray-100">
        <div className="max-w-3xl mx-auto px-4 py-3 flex items-center justify-between">
          <Link href={`/books/${bookId}`} className="text-sm text-gray-500 hover:text-gray-700">← 返回</Link>
          <h1 className="text-sm font-medium text-gray-800 truncate mx-4">{bookTitle}</h1>
          <button
            onClick={() => setShowToc(!showToc)}
            className="text-sm text-brand-600 hover:text-brand-700"
          >
            目录
          </button>
        </div>
      </header>

      {showToc && (
        <div className="fixed inset-0 z-20 bg-black/20" onClick={() => setShowToc(false)}>
          <div
            className="absolute right-0 top-0 bottom-0 w-72 bg-white shadow-xl overflow-y-auto"
            onClick={e => e.stopPropagation()}
          >
            <div className="p-4 border-b border-gray-100">
              <h2 className="font-medium text-gray-800">目录</h2>
              <p className="text-xs text-gray-400">共 {totalChapters} 章</p>
            </div>
            <nav className="p-2">
              {chapters.map(ch => (
                <button
                  key={ch.index}
                  onClick={() => goToChapter(ch.index)}
                  className={`w-full text-left px-3 py-2 rounded-lg text-sm transition ${
                    ch.index === currentChapter
                      ? 'bg-brand-50 text-brand-700'
                      : 'text-gray-600 hover:bg-gray-50'
                  }`}
                >
                  {ch.title}
                </button>
              ))}
            </nav>
          </div>
        </div>
      )}

      <main className="max-w-3xl mx-auto px-4 py-6 sm:py-10">
        <div className="mb-4">
          <div className="flex items-center justify-between mb-2">
            <h2 className="text-lg font-bold text-gray-900">{chapterTitle}</h2>
            {saving && <span className="text-xs text-gray-400">保存中...</span>}
          </div>
          <div className="flex items-center gap-3">
            <div className="flex-1 h-1.5 bg-gray-100 rounded-full overflow-hidden">
              <div
                className="h-full bg-brand-500 rounded-full transition-all duration-300"
                style={{ width: `${progressPercent}%` }}
              />
            </div>
            <span className="text-xs text-gray-500 shrink-0">{progressPercent}%</span>
          </div>
          <p className="text-xs text-gray-400 mt-1">第 {currentChapter} / {totalChapters} 章</p>
        </div>

        {loading ? (
          <div className="rounded-2xl bg-white border border-gray-100 p-6 sm:p-10 shadow-sm min-h-[50vh] flex items-center justify-center">
            <div className="text-gray-400">加载中...</div>
          </div>
        ) : (
          <article className="rounded-2xl bg-white border border-gray-100 p-6 sm:p-10 shadow-sm">
            <div className="prose prose-gray max-w-none">
              {chapterContent.split('\n').map((paragraph, i) => (
                <p key={i} className="text-gray-700 leading-relaxed mb-4 text-base">
                  {paragraph || '\u00A0'}
                </p>
              ))}
            </div>
          </article>
        )}

        <div className="mt-6 flex items-center justify-between gap-4">
          <button
            onClick={prevChapter}
            disabled={currentChapter <= 1}
            className="flex-1 py-3 rounded-xl border border-gray-200 text-gray-700 font-medium hover:bg-gray-50 transition disabled:opacity-40 disabled:cursor-not-allowed"
          >
            ← 上一章
          </button>
          <button
            onClick={nextChapter}
            disabled={currentChapter >= totalChapters}
            className="flex-1 py-3 rounded-xl bg-brand-500 text-white font-medium hover:bg-brand-600 transition disabled:opacity-40 disabled:cursor-not-allowed"
          >
            下一章 →
          </button>
        </div>
      </main>
    </div>
  );
}
