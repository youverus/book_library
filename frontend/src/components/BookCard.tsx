import Link from 'next/link';
import type { Book } from '@/lib/api';

export function BookCard({ book }: { book: Book }) {
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
