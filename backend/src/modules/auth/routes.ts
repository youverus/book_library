import { Hono } from 'hono';
import { z } from 'zod';
import { userRepo } from '../../repositories/userRepo.js';
import { inviteCodeRepo } from '../../repositories/inviteCodeRepo.js';
import { hashPassword, verifyPassword } from '../../utils/password.js';
import { signToken } from '../../utils/jwt.js';
import { ok, fail, httpError } from '../../utils/response.js';
import { AppError } from '../../utils/errors.js';
import { requireAuth, type AuthState } from '../../middleware/auth.js';

const registerSchema = z.object({
  username: z.string().min(3).max(30),
  email: z.string().email(),
  password: z.string().min(6).max(64),
  inviteCode: z.string().min(1, '邀请码不能为空'),
});

const loginSchema = z.object({
  account: z.string().min(1),
  password: z.string().min(1),
});

export const authRoutes = new Hono<AuthState>();

authRoutes.post('/register', async c => {
  const body = await c.req.json();
  const parsed = registerSchema.safeParse(body);
  if (!parsed.success) throw new AppError(400, parsed.error.issues.map(i => i.message).join('; '));
  const { username, email, password, inviteCode } = parsed.data;

  const conflict = await userRepo.exists(username, email);
  if (conflict === 'username') throw new AppError(409, '用户名已存在');
  if (conflict === 'email') throw new AppError(409, '邮箱已被注册');

  // 验证邀请码有效性
  const isValid = await inviteCodeRepo.isValid(inviteCode);
  if (!isValid) throw new AppError(400, '邀请码无效或已被使用');

  const passwordHash = await hashPassword(password);
  const user = await userRepo.create({ username, email, passwordHash });

  // 将邀请码标记为已使用，关联到新用户
  await inviteCodeRepo.markAsUsed(inviteCode, user!.id);

  const token = await signToken({ sub: user!.id, username: user!.username, role: user!.role });
  return ok(c, { user: { id: user!.id, username: user!.username, email: user!.email, role: user!.role }, token });
});

authRoutes.post('/login', async c => {
  const body = await c.req.json();
  const parsed = loginSchema.safeParse(body);
  if (!parsed.success) throw new AppError(400, parsed.error.issues.map(i => i.message).join('; '));
  const { account, password } = parsed.data;

  const user = await userRepo.findByAccount(account);
  if (!user) throw new AppError(401, '账号或密码错误');
  const valid = await verifyPassword(password, user.passwordHash);
  if (!valid) throw new AppError(401, '账号或密码错误');

  const token = await signToken({ sub: user.id, username: user.username, role: user.role });
  return ok(c, { user: { id: user.id, username: user.username, email: user.email, role: user.role }, token });
});

authRoutes.get('/me', requireAuth, async c => {
  const u = c.get('user');
  const user = await userRepo.findById(u.sub);
  if (!user) return httpError(c, 404, '用户不存在');
  return ok(c, { id: user.id, username: user.username, email: user.email, role: user.role });
});

authRoutes.post('/logout', async c => {
  // JWT 无状态：客户端丢弃 token；如需黑名单可在此扩展
  return ok(c, null, '登出成功');
});

authRoutes.post('/refresh', requireAuth, async c => {
  const u = c.get('user');
  const token = await signToken({ sub: u.sub, username: u.username, role: u.role });
  return ok(c, { token });
});
