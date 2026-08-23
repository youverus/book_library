import { getDB } from './index.js';
import { migrate } from './migrate.js';
import { hashPassword } from '../utils/password.js';

async function seed() {
  await migrate();
  const db = getDB();
  const Database = (await import('better-sqlite3')).default;
  const { config } = await import('../config.js');
  const raw = new Database(config.db.sqlitePath);
  raw.pragma('journal_mode = WAL');
  raw.pragma('foreign_keys = ON');

  const existingAdmin = raw.prepare('SELECT id FROM users WHERE username = ?').get('admin');
  if (!existingAdmin) {
    const passwordHash = await hashPassword('admin123');
    raw.prepare('INSERT INTO users (id, username, email, password_hash, role) VALUES (?, ?, ?, ?, ?)').run(
      'usr_admin_001', 'admin', 'admin@youhxian.cn', passwordHash, 'admin'
    );
    console.log('[seed] 管理员账号已创建: admin / admin123');
  } else {
    console.log('[seed] 管理员账号已存在，跳过');
  }

  const bookCount = raw.prepare('SELECT count(*) as c FROM books').get() as { c: number };
  if (bookCount.c === 0) {
    const books = [
      { title: '三体', author: '刘慈欣', category: '科幻', desc: '地球文明与三体文明的宏大史诗。' },
      { title: '百年孤独', author: '加西亚·马尔克斯', category: '文学', desc: '布恩迪亚家族七代人的传奇故事。' },
      { title: '人类简史', author: '尤瓦尔·赫拉利', category: '历史', desc: '从动物到上帝的人类进化史。' },
      { title: '活着', author: '余华', category: '文学', desc: '一个人与命运之间的友情。' },
      { title: '小王子', author: '圣埃克苏佩里', category: '童话', desc: '献给所有曾经是孩子的大人。' },
      { title: '红楼梦', author: '曹雪芹', category: '古典', desc: '中国古典小说巅峰之作。' },
      { title: '1984', author: '乔治·奥威尔', category: '科幻', desc: '反乌托邦经典。' },
      { title: '围城', author: '钱钟书', category: '文学', desc: '新儒林外史。' },
      { title: '挪威的森林', author: '村上春树', category: '文学', desc: '青春恋爱物语。' },
      { title: '西游记', author: '吴承恩', category: '古典', desc: '四大名著之一。' },
    ];
    const stmt = raw.prepare('INSERT INTO books (id, title, author, category, description, total_chapters, total_pages) VALUES (?, ?, ?, ?, ?, ?, ?)');
    let i = 1;
    for (const b of books) {
      stmt.run(`book_${String(i).padStart(3, '0')}`, b.title, b.author, b.category, b.desc, 20, 300);
      i++;
    }
    console.log(`[seed] 已写入 ${books.length} 本示例书籍`);
  } else {
    console.log(`[seed] 书籍已存在（${bookCount.c} 本），跳过`);
  }

  raw.close();
  console.log('[seed] 种子数据完成');
}

seed().catch(err => {
  console.error('[seed] 失败:', err);
  process.exit(1);
});
