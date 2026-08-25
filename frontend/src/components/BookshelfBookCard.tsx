'use client';
import { useState } from 'react';
import { api, type Book } from '@/lib/api';
import { BookCard } from './BookCard';

interface BookshelfBookCardProps {
  book: Book;
  shelfId: string;
  onRemoved?: () => void;
}

export function BookshelfBookCard({ book, shelfId, onRemoved }: BookshelfBookCardProps) {
  const [removing, setRemoving] = useState(false);

  async function handleRemove() {
    if (!confirm(`确定要从书架移除《${book.title}》吗？`)) return;
    setRemoving(true);
    try {
      await api.del(`/bookshelves/${shelfId}/books/${book.id}`);
      onRemoved?.();
    } catch (err) {
      alert(err instanceof Error ? err.message : '移除失败');
    } finally {
      setRemoving(false);
    }
  }

  return (
    <div className="relative group">
      <BookCard book={book} />
      <button
        onClick={handleRemove}
        disabled={removing}
        className="mt-2 w-full px-3 py-1.5 text-sm rounded-lg border border-red-200 text-red-600 hover:bg-red-50 transition disabled:opacity-50"
      >
        {removing ? '移除中...' : '移除'}
      </button>
    </div>
  );
}
