'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import type { ConversationRecord } from '@/lib/db';
import {
  createConversation,
  deleteConversation as dbDeleteConversation,
  deleteMessagesAfter,
  getMessages,
  listConversations,
  newMessageId,
  renameConversation as dbRenameConversation,
  saveMessage,
  setArchived as dbSetArchived,
} from '@/lib/db/conversations';
import type { ChatAttachment, ChatMessage, MaarErrorCode } from '@/lib/ai/types';
import { streamChat } from '@/lib/ai/client';
import { generateImageClient } from '@/lib/ai/image-client';
import { friendlyErrorMessage } from '@/lib/ai/errors';
import { getModel, IMAGE_MODEL_ID } from '@/lib/ai/models';
import { buildActiveSkillsSystemPrompt } from '@/lib/db/skills';
import { MAAR_SYSTEM_PROMPT } from '@/lib/ai/system-prompt';
import { appendDocumentBlocks } from '@/lib/ai/document-block';

// Errors that mean "this model is temporarily unable to serve requests"
// (as opposed to a config problem like a missing key) are the ones worth
// automatically retrying against a fallback model.
const FALLBACK_TRIGGERS: MaarErrorCode[] = ['rate-limited', 'model-unavailable'];
const MAX_FALLBACK_HOPS = 2;

export function useConversations(defaultModelId: string) {
  const [conversations, setConversations] = useState<ConversationRecord[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isGenerating, setIsGenerating] = useState(false);
  const abortRef = useRef<AbortController | null>(null);

  const refreshList = useCallback(async () => {
    const list = await listConversations();
    setConversations(list);
    return list;
  }, []);

  useEffect(() => {
    refreshList();
  }, [refreshList]);

  useEffect(() => {
    if (!activeId) {
      setMessages([]);
      return;
    }
    getMessages(activeId).then(setMessages);
  }, [activeId]);

  const openConversation = useCallback((id: string) => {
    setActiveId(id);
  }, []);

  const startNewConversation = useCallback(() => {
    setActiveId(null);
    setMessages([]);
  }, []);

  const renameConversation = useCallback(
    async (id: string, title: string) => {
      await dbRenameConversation(id, title);
      await refreshList();
    },
    [refreshList],
  );

  const deleteConversationById = useCallback(
    async (id: string) => {
      await dbDeleteConversation(id);
      if (activeId === id) {
        setActiveId(null);
        setMessages([]);
      }
      await refreshList();
    },
    [activeId, refreshList],
  );

  const archiveConversation = useCallback(
    async (id: string, archived: boolean) => {
      await dbSetArchived(id, archived);
      await refreshList();
    },
    [refreshList],
  );

  const stopGenerating = useCallback(() => {
    abortRef.current?.abort();
  }, []);

  const sendMessage = useCallback(
    async (content: string, modelId: string, attachments?: ChatAttachment[]) => {
      let conversationId = activeId;

      if (!conversationId) {
        const title = content.trim().slice(0, 60) || 'New conversation';
        const conv = await createConversation(modelId, title);
        conversationId = conv.id;
        setActiveId(conversationId);
      }

      const userMessage: ChatMessage = {
        id: newMessageId(),
        role: 'user',
        content,
        attachments,
        createdAt: Date.now(),
      };
      await saveMessage(conversationId, userMessage);

      const assistantMessage: ChatMessage = {
        id: newMessageId(),
        role: 'assistant',
        content: '',
        createdAt: Date.now() + 1,
        isStreaming: true,
        model: modelId,
      };

      setMessages((prev) => [...prev, userMessage, assistantMessage]);
      await refreshList();

      const history = [...messages, userMessage].map((m) => ({
        role: m.role,
        content: appendDocumentBlocks(m.content, m.attachments),
        attachments: m.attachments,
      }));

      const skillsPrompt = await buildActiveSkillsSystemPrompt();
      const systemPrompt = skillsPrompt ? `${MAAR_SYSTEM_PROMPT}\n\n---\n\n${skillsPrompt}` : MAAR_SYSTEM_PROMPT;
      const messagesForRequest = [{ role: 'system' as const, content: systemPrompt }, ...history];

      const controller = new AbortController();
      abortRef.current = controller;
      setIsGenerating(true);

      // Batching deltas into a single React update per animation frame
      // keeps fast streams smooth instead of thrashing the markdown
      // renderer on every few-character chunk.
      let accumulated = '';
      let switchNote = '';
      let flushScheduled = false;
      let finalModelId = modelId;

      const commit = (patch: Partial<ChatMessage>) => {
        setMessages((prev) => prev.map((m) => (m.id === assistantMessage.id ? { ...m, ...patch } : m)));
      };

      const scheduleFlush = () => {
        if (flushScheduled) return;
        flushScheduled = true;
        requestAnimationFrame(() => {
          flushScheduled = false;
          commit({ content: switchNote + accumulated, isStreaming: true });
        });
      };

      const runStream = (streamModelId: string, attemptedIds: string[]): Promise<void> =>
        new Promise((resolve) => {
          finalModelId = streamModelId;
          streamChat(
            { model: streamModelId, messages: messagesForRequest },
            {
              onDelta: (text) => {
                accumulated += text;
                scheduleFlush();
              },
              onReasoningStatus: () => {
                // Surfaced as a live "Reasoning…" state by MessageBubble
                // whenever content is still empty; no extra action needed.
              },
              onError: async (code: MaarErrorCode) => {
                const failedModel = getModel(streamModelId);
                const fallbackId = failedModel?.fallbackModelId;
                const canFallback =
                  FALLBACK_TRIGGERS.includes(code) &&
                  fallbackId &&
                  !attemptedIds.includes(fallbackId) &&
                  attemptedIds.length < MAX_FALLBACK_HOPS;

                if (canFallback) {
                  const fallbackModel = getModel(fallbackId!);
                  switchNote = `*Switched to **${fallbackModel?.label ?? fallbackId}** — ${
                    failedModel?.label ?? streamModelId
                  } hit its usage limit.*\n\n`;
                  commit({ content: switchNote, isStreaming: true });
                  await runStream(fallbackId!, [...attemptedIds, streamModelId]);
                  resolve();
                  return;
                }

                commit({ isStreaming: false, error: friendlyErrorMessage(code) });
                resolve();
              },
              onDone: async () => {
                resolve();
              },
            },
            controller.signal,
          );
        });

      await runStream(modelId, [modelId]);

      const finalContent = switchNote + accumulated;
      const finalMessage: ChatMessage = {
        ...assistantMessage,
        content: finalContent,
        isStreaming: false,
        stopped: controller.signal.aborted && !accumulated,
        model: finalModelId,
      };
      commit({ content: finalContent, isStreaming: false, stopped: finalMessage.stopped, model: finalModelId });
      if (conversationId && (finalContent || finalMessage.stopped)) {
        await saveMessage(conversationId, finalMessage);
      }
      setIsGenerating(false);
      abortRef.current = null;
      refreshList();
    },
    [activeId, messages, refreshList],
  );

  const sendImageMessage = useCallback(
    async (prompt: string) => {
      let conversationId = activeId;

      if (!conversationId) {
        const conv = await createConversation(IMAGE_MODEL_ID, prompt.trim().slice(0, 60) || 'Generated image');
        conversationId = conv.id;
        setActiveId(conversationId);
      }

      const userMessage: ChatMessage = {
        id: newMessageId(),
        role: 'user',
        content: prompt,
        createdAt: Date.now(),
      };
      const assistantMessage: ChatMessage = {
        id: newMessageId(),
        role: 'assistant',
        content: '',
        createdAt: Date.now() + 1,
        isStreaming: true,
        model: IMAGE_MODEL_ID,
      };

      await saveMessage(conversationId, userMessage);
      setMessages((prev) => [...prev, userMessage, assistantMessage]);
      await refreshList();

      const controller = new AbortController();
      abortRef.current = controller;
      setIsGenerating(true);

      const result = await generateImageClient(prompt, IMAGE_MODEL_ID, controller.signal);

      let finalMessage: ChatMessage;
      if (result.ok) {
        finalMessage = {
          ...assistantMessage,
          content: '',
          isStreaming: false,
          attachments: result.images.map((dataUrl, i) => ({
            id: crypto.randomUUID(),
            name: `generated-image-${i + 1}.png`,
            mimeType: 'image/png',
            dataUrl,
            kind: 'image' as const,
          })),
        };
      } else {
        finalMessage = { ...assistantMessage, isStreaming: false, error: result.message };
      }

      setMessages((prev) => prev.map((m) => (m.id === assistantMessage.id ? finalMessage : m)));
      if (conversationId) await saveMessage(conversationId, finalMessage);
      setIsGenerating(false);
      abortRef.current = null;
      refreshList();
    },
    [activeId, refreshList],
  );

  const editAndResend = useCallback(
    async (messageId: string, newContent: string, modelId: string) => {
      if (!activeId) return;
      const target = messages.find((m) => m.id === messageId);
      if (!target) return;
      await deleteMessagesAfter(activeId, target.createdAt - 1);
      setMessages((prev) => prev.filter((m) => m.createdAt < target.createdAt));
      await sendMessage(newContent, modelId, target.attachments);
    },
    [activeId, messages, sendMessage],
  );

  const regenerate = useCallback(
    async (assistantMessageId: string) => {
      if (!activeId) return;
      const idx = messages.findIndex((m) => m.id === assistantMessageId);
      if (idx <= 0) return;
      const priorUser = [...messages.slice(0, idx)].reverse().find((m) => m.role === 'user');
      if (!priorUser) return;
      await deleteMessagesAfter(activeId, priorUser.createdAt);
      setMessages((prev) => prev.filter((m) => m.createdAt <= priorUser.createdAt));
      const model = getModel(priorUser.model ?? defaultModelId)?.id ?? defaultModelId;
      await sendMessage(priorUser.content, model, priorUser.attachments);
    },
    [activeId, messages, sendMessage, defaultModelId],
  );

  return {
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
    refreshList,
  };
}
