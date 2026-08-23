import { mkdirSync, writeFileSync, readFileSync, existsSync, statSync, unlinkSync } from 'node:fs';
import { resolve, dirname, join, extname } from 'node:path';
import { config } from '../config.js';
import { newId } from '../utils/uuid.js';

export interface StoredFile {
  fileName: string;
  filePath: string;
  fileType: 'txt' | 'epub' | 'pdf';
  fileSize: number;
}

export interface ChapterContent {
  index: number;
  title: string;
  content: string;
}

const ALLOWED_EXTENSIONS: Record<string, 'txt' | 'epub' | 'pdf'> = {
  '.txt': 'txt',
  '.epub': 'epub',
  '.pdf': 'pdf',
};

function ensureStorageDir() {
  const dir = config.storage.basePath;
  mkdirSync(dir, { recursive: true });
  return dir;
}

export const fileStorage = {
  async save(fileBuffer: Buffer, originalName: string): Promise<StoredFile> {
    const ext = extname(originalName).toLowerCase();
    const fileType = ALLOWED_EXTENSIONS[ext];
    if (!fileType) {
      throw new Error(`不支持的文件格式: ${ext}，仅支持 .txt, .epub, .pdf`);
    }
    if (fileBuffer.length > config.storage.maxFileSize) {
      throw new Error(`文件大小超过限制: ${(config.storage.maxFileSize / 1024 / 1024).toFixed(1)}MB`);
    }
    const dir = ensureStorageDir();
    const fileName = `${newId()}${ext}`;
    const filePath = resolve(dir, fileName);
    writeFileSync(filePath, fileBuffer);
    return {
      fileName,
      filePath,
      fileType,
      fileSize: fileBuffer.length,
    };
  },

  async readFile(filePath: string): Promise<Buffer> {
    if (!existsSync(filePath)) {
      throw new Error('文件不存在');
    }
    return readFileSync(filePath);
  },

  async parseTxt(filePath: string): Promise<{ chapters: ChapterContent[]; totalChapters: number }> {
    const buffer = await this.readFile(filePath);
    const text = buffer.toString('utf-8');
    const chapters = this.splitTxtToChapters(text);
    return {
      chapters,
      totalChapters: chapters.length,
    };
  },

  async parseEpub(filePath: string): Promise<{ chapters: ChapterContent[]; totalChapters: number; metadata: { title?: string; creator?: string } }> {
    const EPub = (await import('epub')).default;
    const epub = new EPub(filePath);
    await epub.parse();

    const chapters: ChapterContent[] = [];
    let index = 1;
    for (const chapter of epub.flow) {
      if (!chapter.id) continue;
      try {
        const rawContent = await epub.getChapter(chapter.id);
        const content = this.stripHtml(rawContent);
        if (content.length > 50) {
          chapters.push({
            index: index++,
            title: chapter.title || chapter.id || `第${index}章`,
            content,
          });
        }
      } catch {
      }
    }
    return {
      chapters,
      totalChapters: chapters.length,
      metadata: {
        title: epub.metadata?.title,
        creator: epub.metadata?.creator,
      },
    };
  },

  stripHtml(html: string): string {
    return html
      .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
      .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
      .replace(/<[^>]+>/g, '')
      .replace(/&nbsp;/g, ' ')
      .replace(/&amp;/g, '&')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&quot;/g, '"')
      .replace(/&#39;/g, "'")
      .replace(/\s+/g, ' ')
      .trim();
  },

  splitTxtToChapters(text: string): ChapterContent[] {
    const lines = text.split('\n');
    const chapters: ChapterContent[] = [];
    let currentTitle = '';
    let currentContent: string[] = [];
    let chapterIndex = 1;
    const chapterPattern = /^(?:第[零一二三四五六七八九十百千万\d]+章|Chapter\s*\d+)[：:\s]*(.*)/i;

    for (const line of lines) {
      const trimmed = line.trim();
      const match = trimmed.match(chapterPattern);
      if (match) {
        if (currentTitle && currentContent.length > 0) {
          chapters.push({
            index: chapterIndex++,
            title: currentTitle,
            content: currentContent.join('\n').trim(),
          });
        }
        currentTitle = trimmed;
        currentContent = [];
      } else if (currentTitle) {
        currentContent.push(line);
      }
    }
    if (currentTitle && currentContent.join('\n').trim()) {
      chapters.push({
        index: chapterIndex,
        title: currentTitle,
        content: currentContent.join('\n').trim(),
      });
    }
    if (chapters.length === 0) {
      chapters.push({
        index: 1,
        title: '正文',
        content: text,
      });
    }
    return chapters;
  },

  async delete(filePath: string): Promise<void> {
    if (existsSync(filePath)) {
      unlinkSync(filePath);
    }
  },

  exists(filePath: string): boolean {
    return existsSync(filePath);
  },

  getFileSize(filePath: string): number {
    if (!existsSync(filePath)) return 0;
    return statSync(filePath).size;
  },

  getRelativePath(filePath: string): string {
    const dir = config.storage.basePath;
    if (filePath.startsWith(dir)) {
      return filePath.slice(dir.length + 1);
    }
    return filePath;
  },
};
