'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuthStore } from '@/stores/auth';

const links = [
  { href: '/', label: '首页' },
  { href: '/bookshelf', label: '书架' },
  { href: '/search', label: '搜索' },
  { href: '/me', label: '我的' },
];

const adminLinks = [
  { href: '/admin/books', label: '书籍管理' },
  { href: '/admin/users', label: '用户管理' },
];

export function NavBar() {
  const pathname = usePathname();
  const { user, logout } = useAuthStore();
  const isAdmin = user?.role === 'admin';

  return (
    <nav className="max-w-6xl mx-auto px-4 h-14 flex items-center justify-between">
      <Link href="/" className="text-lg font-bold text-brand-600">📚 Book Library</Link>
      <div className="flex items-center gap-1 sm:gap-4">
        {links.map(l => {
          const active = pathname === l.href || (l.href !== '/' && pathname.startsWith(l.href));
          return (
            <Link
              key={l.href}
              href={l.href}
              className={`px-3 py-2 rounded-lg text-sm font-medium transition ${
                active ? 'bg-brand-50 text-brand-700' : 'text-gray-600 hover:bg-gray-50'
              }`}
            >
              {l.label}
            </Link>
          );
        })}
        {isAdmin && adminLinks.map(l => {
          const active = pathname.startsWith(l.href);
          return (
            <Link key={l.href} href={l.href}
              className={`px-3 py-2 rounded-lg text-sm font-medium transition ${
                active ? 'bg-brand-50 text-brand-700' : 'text-gray-600 hover:bg-gray-50'
              }`}>
              {l.label}
            </Link>
          );
        })}
        {user ? (
          <>
          <span className="hidden sm:inline text-sm text-gray-400 ml-2">{user.username}</span>
          <button onClick={logout} className="ml-2 px-3 py-2 text-sm text-gray-500 hover:text-red-500">登出</button>
          </>
        ) : (
          <Link href="/login" className="ml-2 px-4 py-2 rounded-lg bg-brand-500 text-white text-sm font-medium hover:bg-brand-600">登录</Link>
        )}
      </div>
    </nav>
  );
}
