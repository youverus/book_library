const API_BASE = process.env.NEXT_PUBLIC_API_BASE || '/api';

export interface ApiResult<T> {
  code: number;
  data: T;
  message: string;
}

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string>),
  };
  if (token) headers['Authorization'] = `Bearer ${token}`;

  const res = await fetch(`${API_BASE}${path}`, { ...options, headers });
  const json: ApiResult<T> = await res.json();
  if (json.code !== 0) {
    const err = new Error(json.message || '请求失败') as Error & { code: number };
    err.code = json.code;
    throw err;
  }
  return json.data;
}

export const api = {
  get: <T>(path: string) => request<T>(path),
  post: <T>(path: string, body?: unknown) => request<T>(path, { method: 'POST', body: JSON.stringify(body ?? {}) }),
  put: <T>(path: string, body?: unknown) => request<T>(path, { method: 'PUT', body: JSON.stringify(body ?? {}) }),
  del: <T>(path: string) => request<T>(path, { method: 'DELETE' }),
};

// ─── 类型 ───
export interface User {
  id: string;
  username: string;
  email: string;
  role: string;
}

export interface Book {
  id: string;
  title: string;
  author: string;
  coverUrl: string;
  description: string;
  category: string;
  totalChapters: number;
  totalPages: number;
  filePath: string;
  fileType: 'txt' | 'epub' | 'pdf';
  fileSize: number;
  createdAt: string;
  updatedAt: string;
}

export interface Bookshelf {
  id: string;
  name: string;
  bookCount: number;
}

export interface Progress {
  bookId: string;
  chapter: number;
  page: number;
  percentage: string;
  lastPosition: string;
  updatedAt: string;
}

export interface Note {
  id: string;
  bookId: string;
  chapter: number;
  page: number;
  type: 'note' | 'bookmark';
  content: string;
  createdAt: string;
  updatedAt: string;
}

export interface Category {
  id: string;
  category: string;
  sortOrder?: number;
}

export interface Paginated<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
}

export interface AuthResponse {
  user: User;
  token: string;
}

export interface ChapterItem {
  index: number;
  title: string;
  preview?: string;
}

export interface ChapterContent {
  bookId: string;
  bookTitle: string;
  fileType: string;
  chapter: {
    index: number;
    title: string;
    content: string;
  };
  totalChapters: number;
  chapters?: ChapterItem[];
}
