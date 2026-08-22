'use client';

import { useState } from 'react';
import { WifiOff } from 'lucide-react';
import { Sidebar } from './Sidebar';
import { BackgroundLayer } from '@/components/background/BackgroundLayer';
import { ChatWindow } from '@/components/chat/ChatWindow';
import { Composer } from '@/components/chat/Composer';
import { SettingsPanel } from '@/components/settings/SettingsPanel';
import { TooltipProvider } from '@/components/ui/Tooltip';
import { useSettings } from '@/hooks/useSettings';
import { useConversations } from '@/hooks/useConversations';
import { useOnlineStatus } from '@/hooks/useOnlineStatus';
import { DEFAULT_MODEL_ID } from '@/lib/ai/models';
import type { ChatAttachment } from '@/lib/ai/types';

export function AppShell() {
  const { settings, updateSettings, ready } = useSettings();
  const [collapsed, setCollapsed] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [modelId, setModelId] = useState(DEFAULT_MODEL_ID);
  const isOnline = useOnlineStatus();

  const {
    conversations,
    activeId,
    messages,
    isGenerating,
    openConversation,
    startNewConversation,
    renameConversation,
    deleteConversationById,
    archiveConversation,
    sendMessage,
    sendImageMessage,
    editAndResend,
    regenerate,
    stopGenerating,
  } = useConversations(settings.defaultModelId);

  if (!ready) {
    return <div className="flex h-dvh items-center justify-center bg-base text-ink-faint text-sm">Loading MAAR AI…</div>;
  }

  const handleSend = (content: string, attachments: ChatAttachment[]) => {
    if (!content && attachments.length === 0) return;
    sendMessage(content, modelId, attachments);
  };

  return (
    <TooltipProvider>
      <BackgroundLayer
        enabled={settings.backgroundEnabled}
        opacity={settings.backgroundOpacity}
        blur={settings.backgroundBlur}
        overlay={settings.backgroundOverlay}
      />

      <div className="flex h-dvh w-full overflow-hidden">
        <Sidebar
          conversations={conversations}
          activeId={activeId}
          collapsed={collapsed}
          onToggleCollapsed={() => setCollapsed((c) => !c)}
          onNewChat={startNewConversation}
          onOpen={openConversation}
          onRename={renameConversation}
          onDelete={deleteConversationById}
          onArchive={archiveConversation}
          onOpenSettings={() => setSettingsOpen(true)}
        />

        <div className="flex min-w-0 flex-1 flex-col">
          {!isOnline && (
            <div className="flex items-center justify-center gap-2 border-b border-border bg-base-raised2/80 px-4 py-1.5 text-xs text-ink-muted">
              <WifiOff size={13} />
              You&rsquo;re offline — your conversations are still here, but generating new responses needs an internet
              connection.
            </div>
          )}

          <ChatWindow
            messages={messages}
            onSuggestion={(prompt) => handleSend(prompt, [])}
            onEditMessage={(id, content) => editAndResend(id, content, modelId)}
            onRegenerate={(id) => regenerate(id)}
          />

          <Composer
            modelId={modelId}
            onModelChange={setModelId}
            isGenerating={isGenerating}
            sendOnEnter={settings.sendOnEnter}
            onSend={handleSend}
            onGenerateImage={sendImageMessage}
            onStop={stopGenerating}
          />
        </div>
      </div>

      <SettingsPanel
        open={settingsOpen}
        onOpenChange={setSettingsOpen}
        settings={settings}
        onUpdate={updateSettings}
        onDataCleared={() => window.location.reload()}
      />
    </TooltipProvider>
  );
}
