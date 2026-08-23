import { Hono } from 'hono';
import { resolve } from 'node:path';
import { config } from '../../config.js';
import { z } from 'zod';
import { requireAuth, requireAdmin, type AuthState } from '../../middleware/auth.js';
import { ok, httpError } from '../../utils/response.js';
import { AppError } from '../../utils/errors.js';
import { fileStorage } from '../../services/fileStorage.js';
import { bookRepo } from '../../repositories/bookRepo.js';

const uploadMetaSchema = z.object({
  title: z.string().min(1),
  author: z.string().optional(),
  description: z.string().optional(),
  category: z.string().optional(),
  coverUrl: z.string().optional(),
});

export const fileRoutes = new Hono<AuthState>();

fileRoutes.post('/upload', requireAuth, requireAdmin, async c => {
  const contentType = c.req.header('Content-Type') || '';
  if (!contentType.includes('multipart/form-data')) {
    throw new AppError(400, '请使用 multipart/form-data 格式上传');
  }
  const formData = await c.req.formData();
  const file = formData.get('file');
  if (!file || !(file instanceof File)) {
    throw new AppError(400, '未找到上传的文件');
  }
  const metaStr = formData.get('metadata');
  let metadata: z.infer<typeof uploadMetaSchema> = { title: file.name };
  if (metaStr && typeof metaStr === 'string') {
    const parsed = uploadMetaSchema.safeParse(JSON.parse(metaStr));
    if (parsed.success) {
      metadata = parsed.data;
    } else {
      throw new AppError(400, parsed.error.issues.map(i => i.message).join('; '));
    }
  }
  const buffer = Buffer.from(await file.arrayBuffer());
  const stored = await fileStorage.save(buffer, file.name);
  const filePath = fileStorage.getRelativePath(stored.filePath);
  const book = await bookRepo.create({
    title: metadata.title,
    author: metadata.author,
    description: metadata.description,
    category: metadata.category,
    coverUrl: metadata.coverUrl,
    filePath,
    fileType: stored.fileType,
    fileSize: stored.fileSize,
  });
  if (stored.fileType === 'txt') {
    try {
      const { totalChapters } = await fileStorage.parseTxt(stored.filePath);
      await bookRepo.update(book.id, { totalChapters });
      book.totalChapters = totalChapters;
    } catch {
    }
  }
  if (stored.fileType === 'epub') {
    try {
      const { totalChapters, metadata } = await fileStorage.parseEpub(stored.filePath);
      const updates: Record<string, unknown> = { totalChapters };
      if (metadata.title && !book.title) updates.title = metadata.title;
      if (metadata.creator && !book.author) updates.author = metadata.creator;
      await bookRepo.update(book.id, updates);
      book.totalChapters = totalChapters;
    } catch {
    }
  }
  return ok(c, {
    book,
    file: {
      fileName: stored.fileName,
      fileType: stored.fileType,
      fileSize: stored.fileSize,
    },
  });
});

fileRoutes.get('/books/:id/content', requireAuth, async c => {
  const bookId = c.req.param('id');
  const book = await bookRepo.findById(bookId);
  if (!book) return httpError(c, 404, '书籍不存在');
  if (!book.filePath || !book.filePath.trim()) {
    return httpError(c, 404, '该书暂无源文件');
  }
  const fp: string = book.filePath as string;
  const chapterParam = c.req.query('chapter');
  const chapterIndex = chapterParam ? parseInt(chapterParam, 10) : undefined;
  if (book.fileType === 'txt') {
    const fullPath = resolvePath(fp);
    const { chapters, totalChapters } = await fileStorage.parseTxt(fullPath);
    if (chapterIndex !== undefined) {
      const chapter = chapters.find(ch => ch.index === chapterIndex);
      if (!chapter) return httpError(c, 404, '章节不存在');
      return ok(c, {
        bookId: book.id,
        bookTitle: book.title,
        fileType: 'txt',
        chapter: {
          index: chapter.index,
          title: chapter.title,
          content: chapter.content,
        },
        totalChapters,
      });
    }
    return ok(c, {
      bookId: book.id,
      bookTitle: book.title,
      fileType: 'txt',
      totalChapters,
      chapters: chapters.map(ch => ({ index: ch.index, title: ch.title, preview: ch.content.slice(0, 100) })),
    });
  }
  if (book.fileType === 'epub') {
    const fullPath = resolvePath(fp);
    try {
      const { chapters, totalChapters } = await fileStorage.parseEpub(fullPath);
      if (chapterIndex !== undefined) {
        const chapter = chapters.find(ch => ch.index === chapterIndex);
        if (!chapter) return httpError(c, 404, '章节不存在');
        return ok(c, {
          bookId: book.id,
          bookTitle: book.title,
          fileType: 'epub',
          chapter: {
            index: chapter.index,
            title: chapter.title,
            content: chapter.content,
          },
          totalChapters,
        });
      }
      return ok(c, {
        bookId: book.id,
        bookTitle: book.title,
        fileType: 'epub',
        totalChapters,
        chapters: chapters.map(ch => ({ index: ch.index, title: ch.title, preview: ch.content.slice(0, 100) })),
      });
    } catch (err) {
      return httpError(c, 500, `EPUB 解析失败: ${err instanceof Error ? err.message : '未知错误'}`);
    }
  }
  if (book.fileType === 'pdf') {
    return ok(c, {
      bookId: book.id,
      bookTitle: book.title,
      fileType: book.fileType,
      message: `${book.fileType.toUpperCase()} 格式暂不支持在线解析，请下载原文件阅读`,
      downloadUrl: `/api/files/books/${encodeURIComponent(book.id)}/download`,
    });
  }
  return httpError(c, 400, '不支持的文件格式');
});

fileRoutes.get('/books/:id/download', requireAuth, async c => {
  const bookId = c.req.param('id');
  const book = await bookRepo.findById(bookId);
  if (!book) return httpError(c, 404, '书籍不存在');
  if (!book.filePath || !book.filePath.trim()) {
    return httpError(c, 404, '该书暂无源文件');
  }
  const fp: string = book.filePath as string;
  const fullPath = resolvePath(fp);
  if (!fileStorage.exists(fullPath)) return httpError(c, 404, '文件已丢失');
  const buffer = await fileStorage.readFile(fullPath);
  const mimeTypes: Record<string, string> = {
    txt: 'text/plain; charset=utf-8',
    epub: 'application/epub+zip',
    pdf: 'application/pdf',
  };
  c.header('Content-Type', mimeTypes[book.fileType] || 'application/octet-stream');
  c.header('Content-Disposition', `attachment; filename="${encodeURIComponent(book.title)}.${book.fileType}"`);
  return c.body(buffer as any);
});

function resolvePath(relativePath: string): string {
  if (relativePath.startsWith('/')) return relativePath;
  return resolve(config.storage.basePath, relativePath);
}
