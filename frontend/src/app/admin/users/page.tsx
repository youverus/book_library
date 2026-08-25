'use client';
import { useEffect, useState, useCallback, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { api } from '@/lib/api';
import { useAuthStore } from '@/stores/auth';
import { Tabs } from '@/components/Tabs';

interface UserInfo {
  id: string;
  username: string;
  email: string;
  role: string;
  createdAt: string;
}

interface InviteCode {
  id: string;
  code: string;
  createdBy: string;
  usedBy: string | null;
  status: 'unused' | 'used' | 'revoked';
  createdAt: string;
  usedAt: string | null;
}

const statusLabel: Record<string, { text: string; className: string }> = {
  unused: { text: '未使用', className: 'bg-green-100 text-green-700' },
  used: { text: '已使用', className: 'bg-gray-100 text-gray-600' },
  revoked: { text: '已撤销', className: 'bg-red-100 text-red-600' },
};

export default function AdminUsersPage() {
  const router = useRouter();
  const user = useAuthStore(s => s.user);
  const [users, setUsers] = useState<UserInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'users' | 'invite-codes'>('users');
  const [codes, setCodes] = useState<InviteCode[]>([]);
  const [codesLoading, setCodesLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [customCode, setCustomCode] = useState('');
  const [bulkCount, setBulkCount] = useState(5);
  const [copied, setCopied] = useState<string | null>(null);

  const checkAuth = useCallback(() => {
    if (!user || user.role !== 'admin') {
      router.push('/login');
    }
  }, [user, router]);

  useEffect(() => { checkAuth(); }, [checkAuth]);

  const loadUsers = useCallback(async () => {
    try {
      const data = await api.get<UserInfo[]>('/users');
      setUsers(data);
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  }, []);

  const loadCodes = useCallback(async () => {
    try {
      const data = await api.get<InviteCode[]>('/invite-codes');
      setCodes(data);
    } catch {
      // ignore
    } finally {
      setCodesLoading(false);
    }
  }, []);

  useEffect(() => {
    if (user?.role === 'admin') {
      loadUsers();
      loadCodes();
    }
  }, [user, loadUsers, loadCodes]);

  const tabs = useMemo(() => [
    { key: 'users' as const, label: `用户（${users.length}）` },
    { key: 'invite-codes' as const, label: `邀请码（${codes.length}）` },
  ], [users.length, codes.length]);

  const handleGenerate = useCallback(async () => {
    setGenerating(true);
    try {
      await api.post('/invite-codes', customCode ? { code: customCode } : {});
      setCustomCode('');
      await loadCodes();
    } finally {
      setGenerating(false);
    }
  }, [customCode, loadCodes]);

  const handleBulkGenerate = useCallback(async () => {
    setGenerating(true);
    try {
      for (let i = 0; i < bulkCount; i++) {
        await api.post('/invite-codes', {});
      }
      await loadCodes();
    } finally {
      setGenerating(false);
    }
  }, [bulkCount, loadCodes]);

  const handleRevoke = useCallback(async (id: string) => {
    await api.del(`/invite-codes/${id}`);
    await loadCodes();
  }, [loadCodes]);

  const handleCopy = useCallback(async (code: string) => {
    await navigator.clipboard.writeText(code);
    setCopied(code);
    setTimeout(() => setCopied(null), 2000);
  }, []);

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold mb-6">用户管理</h1>
      <Tabs tabs={tabs} activeKey={activeTab} onChange={setActiveTab} />
      {activeTab === 'users' && <UsersTab users={users} loading={loading} />}
      {activeTab === 'invite-codes' && (
        <InviteCodesTab
          codes={codes}
          loading={codesLoading}
          generating={generating}
          customCode={customCode}
          bulkCount={bulkCount}
          copied={copied}
          onGenerate={handleGenerate}
          onBulkGenerate={handleBulkGenerate}
          onRevoke={handleRevoke}
          onCopy={handleCopy}
          onCustomCodeChange={setCustomCode}
          onBulkCountChange={setBulkCount}
        />
      )}
    </div>
  );
}

function UsersTab({ users, loading }: { users: UserInfo[]; loading: boolean }) {
  if (loading) {
    return <div className="text-center text-gray-500 py-12">加载中...</div>;
  }
  return (
    <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
      <div className="px-6 py-4 border-b border-gray-100">
        <h2 className="text-lg font-semibold">注册用户（{users.length}）</h2>
        <p className="text-sm text-gray-400 mt-1">仅可查看 ID 和邮箱，不可执行其他操作</p>
      </div>
      {users.length === 0 ? (
        <div className="px-6 py-12 text-center text-gray-400">暂无注册用户</div>
      ) : (
        <div className="divide-y divide-gray-50">
          {users.map(u => (
            <div key={u.id} className="px-6 py-4 flex items-center justify-between">
              <div className="min-w-0">
                <div className="font-medium text-gray-800">{u.username}</div>
                <div className="text-sm text-gray-400 font-mono">{u.email}</div>
              </div>
              <div className="text-right shrink-0 ml-4">
                <div className="text-xs text-gray-400 font-mono">{u.id}</div>
                <div className="text-xs text-gray-400 mt-1">
                  {new Date(u.createdAt).toLocaleDateString('zh-CN')}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function InviteCodesTab({
  codes,
  loading,
  generating,
  customCode,
  bulkCount,
  copied,
  onGenerate,
  onBulkGenerate,
  onRevoke,
  onCopy,
  onCustomCodeChange,
  onBulkCountChange,
}: {
  codes: InviteCode[];
  loading: boolean;
  generating: boolean;
  customCode: string;
  bulkCount: number;
  copied: string | null;
  onGenerate: () => Promise<void>;
  onBulkGenerate: () => Promise<void>;
  onRevoke: (id: string) => Promise<void>;
  onCopy: (code: string) => Promise<void>;
  onCustomCodeChange: (v: string) => void;
  onBulkCountChange: (v: number) => void;
}) {
  if (loading) {
    return <div className="text-center text-gray-500 py-12">加载中...</div>;
  }
  return (
    <>
      <div className="bg-white rounded-2xl border border-gray-100 p-6 mb-6">
        <h2 className="text-lg font-semibold mb-4">生成邀请码</h2>
        <div className="flex gap-3">
          <input
            value={customCode}
            onChange={e => onCustomCodeChange(e.target.value)}
            placeholder="自定义邀请码（留空随机生成 16 位）"
            className="flex-1 px-4 py-2.5 rounded-xl border border-gray-200 focus:outline-none focus:border-brand-500 transition"
          />
          <button
            onClick={onGenerate}
            disabled={generating}
            className="px-6 py-2.5 rounded-xl bg-brand-500 text-white font-medium hover:bg-brand-600 disabled:opacity-50 transition"
          >
            {generating ? '生成中...' : '生成'}
          </button>
        </div>
        <div className="flex items-center gap-3 mt-3 pt-3 border-t border-gray-100">
          <span className="text-sm text-gray-500">批量生成</span>
          <input
            type="number"
            min={1}
            max={50}
            value={bulkCount}
            onChange={e => onBulkCountChange(Math.max(1, Math.min(50, Number(e.target.value))))}
            className="w-20 px-3 py-1.5 rounded-lg border border-gray-200 text-sm focus:outline-none focus:border-brand-500"
          />
          <span className="text-sm text-gray-500">个</span>
          <button
            onClick={onBulkGenerate}
            disabled={generating}
            className="px-4 py-1.5 rounded-lg border border-brand-200 text-brand-600 text-sm font-medium hover:bg-brand-50 disabled:opacity-50 transition"
          >
            批量生成
          </button>
        </div>
      </div>
      <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-100">
          <h2 className="text-lg font-semibold">全部邀请码（{codes.length}）</h2>
        </div>
        {codes.length === 0 ? (
          <div className="px-6 py-12 text-center text-gray-400">暂无邀请码</div>
        ) : (
          <div className="divide-y divide-gray-50">
            {codes.map(c => (
              <div key={c.id} className="px-6 py-4 flex items-center justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-3 mb-1">
                    <span className="font-mono text-lg font-semibold tracking-wider">{c.code}</span>
                    <span className={`text-xs px-2 py-0.5 rounded-full ${statusLabel[c.status].className}`}>
                      {statusLabel[c.status].text}
                    </span>
                  </div>
                  <div className="text-sm text-gray-400">
                    创建于 {new Date(c.createdAt).toLocaleString('zh-CN')}
                    {c.usedAt && ` · 使用于 ${new Date(c.usedAt).toLocaleString('zh-CN')}`}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {c.status === 'unused' && (
                    <>
                      <button
                        onClick={() => onCopy(c.code)}
                        className="px-3 py-1.5 text-sm rounded-lg border border-gray-200 hover:bg-gray-50 transition"
                      >
                        {copied === c.code ? '已复制' : '复制'}
                      </button>
                      <button
                        onClick={() => onRevoke(c.id)}
                        className="px-3 py-1.5 text-sm rounded-lg text-red-600 border border-red-200 hover:bg-red-50 transition"
                      >
                        撤销
                      </button>
                    </>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </>
  );
}
