'use client';

import { useEffect, useState } from 'react';
import { estimateStorageUsage } from '@/lib/db/settings';
import { getDb } from '@/lib/db';

function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B';
  const units = ['B', 'KB', 'MB', 'GB'];
  const i = Math.min(units.length - 1, Math.floor(Math.log(bytes) / Math.log(1024)));
  return `${(bytes / 1024 ** i).toFixed(i === 0 ? 0 : 1)} ${units[i]}`;
}

export function StorageInfo() {
  const [usage, setUsage] = useState<{ usageBytes: number; quotaBytes: number } | null>(null);
  const [counts, setCounts] = useState<{ conversations: number; messages: number } | null>(null);

  useEffect(() => {
    estimateStorageUsage().then(setUsage);
    const db = getDb();
    Promise.all([db.conversations.count(), db.messages.count()]).then(([conversations, messages]) =>
      setCounts({ conversations, messages }),
    );
  }, []);

  const pct = usage && usage.quotaBytes > 0 ? Math.min(100, (usage.usageBytes / usage.quotaBytes) * 100) : 0;

  return (
    <div className="rounded-xl border border-border bg-base-raised2/50 p-3.5">
      <div className="flex items-center justify-between text-sm">
        <span className="text-ink">Local storage used</span>
        <span className="font-mono text-xs text-ink-muted">
          {usage ? `${formatBytes(usage.usageBytes)} / ${formatBytes(usage.quotaBytes)}` : 'Estimating…'}
        </span>
      </div>
      {usage && (
        <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-base-raised">
          <div className="h-full rounded-full bg-gold transition-all" style={{ width: `${pct}%` }} />
        </div>
      )}
      {counts && (
        <p className="mt-2.5 text-xs text-ink-faint">
          {counts.conversations} conversation{counts.conversations === 1 ? '' : 's'} · {counts.messages} message
          {counts.messages === 1 ? '' : 's'} stored in this browser
        </p>
      )}
    </div>
  );
}
