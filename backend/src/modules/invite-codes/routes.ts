import { Hono } from 'hono';
import { z } from 'zod';
import { inviteCodeRepo } from '../../repositories/inviteCodeRepo.js';
import { ok } from '../../utils/response.js';
import { AppError } from '../../utils/errors.js';
import { requireAuth, requireAdmin, type AuthState } from '../../middleware/auth.js';

const createSchema = z.object({
  code: z.string().min(4).max(20).optional(),
});

const validateSchema = z.object({
  code: z.string().min(1),
});

export const inviteCodeRoutes = new Hono<AuthState>();

// 公开：验证邀请码是否有效
inviteCodeRoutes.post('/validate', async c => {
  const body = await c.req.json();
  const parsed = validateSchema.safeParse(body);
  if (!parsed.success) throw new AppError(400, parsed.error.issues.map(i => i.message).join('; '));
  const { code } = parsed.data;
  const record = await inviteCodeRepo.findByCode(code);
  if (!record || record.status !== 'unused') {
    return ok(c, { valid: false, message: '邀请码无效或已被使用' });
  }
  return ok(c, { valid: true });
});

// 管理员：生成邀请码
inviteCodeRoutes.post('/', requireAuth, requireAdmin, async c => {
  const body = await c.req.json();
  const parsed = createSchema.safeParse(body);
  if (!parsed.success) throw new AppError(400, parsed.error.issues.map(i => i.message).join('; '));
  const creatorId = c.get('user').sub;
  const record = await inviteCodeRepo.create(creatorId, parsed.data.code);
  return ok(c, record, '邀请码生成成功');
});

// 管理员：列出所有邀请码
inviteCodeRoutes.get('/', requireAuth, requireAdmin, async c => {
  const codes = await inviteCodeRepo.listAll();
  return ok(c, codes);
});

// 管理员：撤销邀请码
inviteCodeRoutes.delete('/:id', requireAuth, requireAdmin, async c => {
  const { id } = c.req.param();
  await inviteCodeRepo.revoke(id);
  return ok(c, null, '邀请码已撤销');
});
