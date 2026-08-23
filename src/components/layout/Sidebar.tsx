'use client';

import { useEffect, useState } from 'react';
import Image from 'next/image';
import * as RadixDropdown from '@radix-ui/react-dropdown-menu';
import {
  Archive,
  ArchiveRestore,
  MoreHorizontal,
  Pencil,
  PanelLeftClose,
  PanelLeftOpen,
  Plus,
  Search,
  Settings as SettingsIcon,
  Trash2,
  X,
} from 'lucide-react';
import type { ConversationRecord } from '@/lib/db';
import { searchConversations, type SearchResult } from '@/lib/db/conversations';
import { cn } from '@/lib/utils/cn';

interface Props {
  conversations: ConversationRecord[];
  activeId: string | null;
  collapsed: boolean;
  onToggleCollapsed: () => void;
  mobileOpen: boolean;
  onMobileClose: () => void;
  onNewChat: () => void;
  onOpen: (id: string) => void;
  onRename: (id: string, title: string) => void;
  onDelete: (id: string) => void;
  onArchive: (id: string, archived: boolean) => void;
  onOpenSettings: () => void;
}

export function Sidebar({
  conversations,
  activeId,
  collapsed,
  onToggleCollapsed,
  mobileOpen,
  onMobileClose,
  onNewChat,
  onOpen,
  onRename,
  onDelete,
  onArchive,
  onOpenSettings,
}: Props) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResult[] | null>(null);
  const [renamingId, setRenamingId] = useState<string | null>(null);
  const [renameDraft, setRenameDraft] = useState('');

  useEffect(() => {
    if (!query.trim()) {
      setResults(null);
      return;
    }
    const t = setTimeout(() => {
      searchConversations(query).then(setResults);
    }, 150);
    return () => clearTimeout(t);
  }, [query]);

  // Lock background scroll while the mobile drawer is open.
  useEffect(() => {
    if (mobileOpen) {
      document.body.style.overflow = 'hidden';
      return () => {
        document.body.style.overflow = '';
      };
    }
  }, [mobileOpen]);

  const list = results ? results.map((r) => r.conversation) : conversations;

  const runAndCloseOnMobile = (action: () => void) => {
    action();
    onMobileClose();
  };

  const collapsedRail = (
    <div className="flex h-full w-[64px] flex-col items-center gap-3 border-r border-border bg-base-raised/60 py-4">
      <button
        type="button"
        onClick={onToggleCollapsed}
        className="rounded-lg p-2 text-ink-muted transition-colors hover:bg-base-raised2 hover:text-ink"
        aria-label="Expand sidebar"
      >
        <PanelLeftOpen size={18} />
      </button>
      <Image src="/logo-compact.svg" alt="MAAR AI" width={32} height={32} className="rounded-lg" />
      <button
        type="button"
        onClick={onNewChat}
        className="mt-2 rounded-lg p-2 text-ink-muted transition-colors hover:bg-base-raised2 hover:text-ink"
        aria-label="New chat"
      >
        <Plus size={18} />
      </button>
      <div className="mt-auto">
        <button
          type="button"
          onClick={onOpenSettings}
          className="rounded-lg p-2 text-ink-muted transition-colors hover:bg-base-raised2 hover:text-ink"
          aria-label="Settings"
        >
          <SettingsIcon size={18} />
        </button>
      </div>
    </div>
  );

  // Shared between the desktop expanded rail and the mobile drawer.
  const expandedBody = (isMobile: boolean) => (
    <div className="flex h-full w-full flex-col bg-base-raised/95 backdrop-blur-sm md:bg-base-raised/60">
      <div className="flex items-center justify-between px-3 pt-4">
        <Image src="/logo.svg" alt="MAAR AI" width={140} height={40} priority />
        {isMobile ? (
          <button
            type="button"
            onClick={onMobileClose}
            className="rounded-lg p-2 text-ink-muted transition-colors hover:bg-base-raised2 hover:text-ink"
            aria-label="Close menu"
          >
            <X size={18} />
          </button>
        ) : (
          <button
            type="button"
            onClick={onToggleCollapsed}
            className="rounded-lg p-2 text-ink-muted transition-colors hover:bg-base-raised2 hover:text-ink"
            aria-label="Collapse sidebar"
          >
            <PanelLeftClose size={17} />
          </button>
        )}
      </div>

      <div className="px-3 pt-4">
        <button
          type="button"
          onClick={() => runAndCloseOnMobile(onNewChat)}
          className="flex w-full items-center gap-2 rounded-lg border border-border bg-base-raised2/60 px-3 py-2.5 text-sm font-medium text-ink transition-colors hover:border-border-strong hover:bg-base-raised2 md:py-2"
        >
          <Plus size={16} />
          New chat
        </button>
      </div>

      <div className="px-3 pt-3">
        <div className="flex items-center gap-2 rounded-lg border border-border bg-base-raised2/40 px-2.5 py-2 md:py-1.5">
          <Search size={14} className="text-ink-faint" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search conversations"
            aria-label="Search conversations"
            className="w-full bg-transparent text-base text-ink placeholder:text-ink-faint focus:outline-none sm:text-sm"
          />
        </div>
      </div>

      <nav className="mt-3 flex-1 overflow-y-auto px-2 pb-2" aria-label="Conversations">
        {list.length === 0 && (
          <p className="px-2.5 py-6 text-center text-xs text-ink-faint">
            {query ? 'No conversations match your search.' : 'No conversations yet.'}
          </p>
        )}
        <ul className="flex flex-col gap-0.5">
          {list.map((c) => (
            <li key={c.id} className="group relative">
              {renamingId === c.id ? (
                <input
                  autoFocus
                  value={renameDraft}
                  onChange={(e) => setRenameDraft(e.target.value)}
                  onBlur={() => {
                    onRename(c.id, renameDraft.trim() || c.title);
                    setRenamingId(null);
                  }}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') e.currentTarget.blur();
                    if (e.key === 'Escape') setRenamingId(null);
                  }}
                  className="w-full rounded-lg border border-gold/50 bg-base-raised2 px-2.5 py-2 text-sm text-ink focus:outline-none"
                />
              ) : (
                <button
                  type="button"
                  onClick={() => runAndCloseOnMobile(() => onOpen(c.id))}
                  className={cn(
                    'flex w-full items-center justify-between gap-2 rounded-lg px-2.5 py-2.5 text-left text-sm transition-colors md:py-2',
                    c.id === activeId ? 'bg-base-raised2 text-ink' : 'text-ink-muted hover:bg-base-raised2/60 hover:text-ink',
                  )}
                >
                  <span className="truncate">{c.title}</span>
                  <RadixDropdown.Root>
                    <RadixDropdown.Trigger asChild>
                      <span
                        role="button"
                        tabIndex={-1}
                        onClick={(e) => e.stopPropagation()}
                        className="shrink-0 rounded-md p-1.5 text-ink-faint opacity-100 transition-opacity hover:bg-base-raised hover:text-ink md:p-1 md:opacity-0 md:group-hover:opacity-100"
                        aria-label={`Options for ${c.title}`}
                      >
                        <MoreHorizontal size={15} />
                      </span>
                    </RadixDropdown.Trigger>
                    <RadixDropdown.Portal>
                      <RadixDropdown.Content
                        align="start"
                        className="z-50 w-44 rounded-lg border border-border bg-base-raised p-1 shadow-panel"
                      >
                        <RadixDropdown.Item
                          onSelect={() => {
                            setRenamingId(c.id);
                            setRenameDraft(c.title);
                          }}
                          className="flex cursor-pointer items-center gap-2 rounded-md px-2 py-1.5 text-xs text-ink outline-none hover:bg-base-raised2"
                        >
                          <Pencil size={13} /> Rename
                        </RadixDropdown.Item>
                        <RadixDropdown.Item
                          onSelect={() => onArchive(c.id, !c.archived)}
                          className="flex cursor-pointer items-center gap-2 rounded-md px-2 py-1.5 text-xs text-ink outline-none hover:bg-base-raised2"
                        >
                          {c.archived ? <ArchiveRestore size={13} /> : <Archive size={13} />}
                          {c.archived ? 'Unarchive' : 'Archive'}
                        </RadixDropdown.Item>
                        <RadixDropdown.Item
                          onSelect={() => onDelete(c.id)}
                          className="flex cursor-pointer items-center gap-2 rounded-md px-2 py-1.5 text-xs text-danger outline-none hover:bg-danger/10"
                        >
                          <Trash2 size={13} /> Delete
                        </RadixDropdown.Item>
                      </RadixDropdown.Content>
                    </RadixDropdown.Portal>
                  </RadixDropdown.Root>
                </button>
              )}
            </li>
          ))}
        </ul>
      </nav>

      <div className="border-t border-border p-2 pb-[max(0.5rem,env(safe-area-inset-bottom))]">
        <button
          type="button"
          onClick={() => runAndCloseOnMobile(onOpenSettings)}
          className="flex w-full items-center gap-2 rounded-lg px-2.5 py-2.5 text-sm text-ink-muted transition-colors hover:bg-base-raised2 hover:text-ink md:py-2"
        >
          <SettingsIcon size={16} />
          Settings
        </button>
        <p className="mt-2 px-2.5 text-[10px] leading-relaxed text-ink-faint">
          Created by Md Adil Rajon
          <br />© {new Date().getFullYear()} MAAR AI
        </p>
      </div>
    </div>
  );

  return (
    <>
      {/* Desktop: static rail, collapsed or expanded, participates in the flex layout. */}
      <div className="hidden shrink-0 md:flex md:h-full">
        {collapsed ? collapsedRail : <div className="h-full w-[280px] border-r border-border">{expandedBody(false)}</div>}
      </div>

      {/* Mobile: off-canvas drawer over the content, closed by default. */}
      <div className={cn('fixed inset-0 z-40 md:hidden', mobileOpen ? '' : 'pointer-events-none')} aria-hidden={!mobileOpen}>
        <div
          onClick={onMobileClose}
          className={cn(
            'absolute inset-0 bg-black/60 backdrop-blur-[2px] transition-opacity duration-300',
            mobileOpen ? 'opacity-100' : 'opacity-0',
          )}
        />
        <div
          className={cn(
            'absolute inset-y-0 left-0 w-[85vw] max-w-[320px] shadow-2xl transition-transform duration-300 ease-out',
            mobileOpen ? 'translate-x-0' : '-translate-x-full',
          )}
        >
          {expandedBody(true)}
        </div>
      </div>
    </>
  );
}
