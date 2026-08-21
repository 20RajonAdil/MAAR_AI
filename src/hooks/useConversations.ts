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
import { friendlyErrorMessage } from '@/lib/ai/errors';
import { getModel } from '@/lib/ai/models';

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
      let conv: ConversationRecord | null = null;

      if (!conversationId) {
        const title = content.trim().slice(0, 60) || 'New conversation';
        conv = await createConversation(modelId, title);
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
        content: m.content,
        attachments: m.attachments,
      }));

      const controller = new AbortController();
      abortRef.current = controller;
      setIsGenerating(true);

      let accumulated = '';
      let reasoningStatus: string | null = null;

      const commit = async (patch: Partial<ChatMessage>) => {
        setMessages((prev) => prev.map((m) => (m.id === assistantMessage.id ? { ...m, ...patch } : m)));
      };

      await streamChat(
        { model: modelId, messages: history },
        {
          onDelta: (text) => {
            accumulated += text;
            commit({ content: accumulated, isStreaming: true });
          },
          onReasoningStatus: (status) => {
            reasoningStatus = status;
            commit({ content: accumulated, isStreaming: true });
          },
          onError: (code: MaarErrorCode) => {
            commit({ isStreaming: false, error: friendlyErrorMessage(code) });
          },
          onDone: async () => {
            const finalMessage: ChatMessage = {
              ...assistantMessage,
              content: accumulated,
              isStreaming: false,
              stopped: controller.signal.aborted && !accumulated,
            };
            commit({ isStreaming: false, stopped: finalMessage.stopped });
            if (conversationId) await saveMessage(conversationId, finalMessage);
            setIsGenerating(false);
            abortRef.current = null;
            refreshList();
          },
        },
        controller.signal,
      );

      void reasoningStatus; // status is surfaced live via commit(); kept for clarity
    },
    [activeId, messages, refreshList],
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
    editAndResend,
    regenerate,
    stopGenerating,
    refreshList,
  };
}
