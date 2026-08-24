'use client';
import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { api } from '@/lib/api';
import { useAuthStore } from '@/stores/auth';

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

export default function AdminInviteCodesPage() {
  const router = useRouter();
  const user = useAuthStore(s => s.user);
  const [codes, setCodes] = useState<InviteCode[]>([]);
  const [loading, setLoading] = useState(true);
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

  const loadCodes = useCallback(async () => {
    try {
      const data = await api.get<InviteCode[]>('/invite-codes');
      setCodes(data);
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (user?.role === 'admin') loadCodes();
  }, [user, loadCodes]);

  async function generate() {
    setGenerating(true);
    try {
      await api.post('/invite-codes', customCode ? { code: customCode } : {});
      setCustomCode('');
      await loadCodes();
    } finally {
      setGenerating(false);
    }
  }

  async function bulkGenerate() {
    setGenerating(true);
    try {
      for (let i = 0; i < bulkCount; i++) {
        await api.post('/invite-codes', {});
      }
      await loadCodes();
    } finally {
      setGenerating(false);
    }
  }

  async function revoke(id: string) {
    await api.del(`/invite-codes/${id}`);
    await loadCodes();
  }

  async function copyCode(code: string) {
    await navigator.clipboard.writeText(code);
    setCopied(code);
    setTimeout(() => setCopied(null), 2000);
  }

  if (loading) {
    return <div className="max-w-4xl mx-auto px-4 py-12 text-center text-gray-500">加载中...</div>;
  }

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold mb-6">邀请码管理</h1>
      <div className="bg-white rounded-2xl border border-gray-100 p-6 mb-6">
        <h2 className="text-lg font-semibold mb-4">生成邀请码</h2>
        <div className="flex gap-3">
          <input
            value={customCode}
            onChange={e => setCustomCode(e.target.value.toUpperCase())}
            placeholder="自定义邀请码（留空随机生成 16 位）"
            className="flex-1 px-4 py-2.5 rounded-xl border border-gray-200 focus:outline-none focus:border-brand-500 transition"
          />
          <button
            onClick={generate}
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
            onChange={e => setBulkCount(Math.max(1, Math.min(50, Number(e.target.value))))}
            className="w-20 px-3 py-1.5 rounded-lg border border-gray-200 text-sm focus:outline-none focus:border-brand-500"
          />
          <span className="text-sm text-gray-500">个</span>
          <button
            onClick={bulkGenerate}
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
                        onClick={() => copyCode(c.code)}
                        className="px-3 py-1.5 text-sm rounded-lg border border-gray-200 hover:bg-gray-50 transition"
                      >
                        {copied === c.code ? '已复制' : '复制'}
                      </button>
                      <button
                        onClick={() => revoke(c.id)}
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
    </div>
  );
}
