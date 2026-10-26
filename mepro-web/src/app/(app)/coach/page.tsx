'use client';

/**
 * AI Coach page
 */

import { useRef, useState } from 'react';
import { aiApi } from '@/lib/endpoints';
import { useApiQuery } from '@/hooks/use-api-query';
import { usePageTitle } from '@/hooks/use-page-title';
import { useToast } from '@/providers/toast-provider';
import { ApiError } from '@/lib/api';
import { formatRelativeDay } from '@/lib/format';
import { Button, Card, Chip, Field, Pill } from '@/components/ui';
import { EmptyState, ErrorState, InlineNotice, SkeletonList } from '@/components/states';
import { FadeIn, PageBody } from '@/components/motion';
import { SendIcon, SparkIcon, TrashIcon } from '@/components/icons';
import type { AssistantMessage, AssistantReply } from '@/lib/types';

type LocalMessage = {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  reply?: AssistantReply;
};

const BUILT_IN_SUGGESTIONS = [
  'What should I eat today?',
  'How can I improve my sleep?',
  'Give me a quick workout idea',
  'How many calories should I eat?',
  'Tips to stay hydrated',
  'Help with my fitness goals',
];

export default function CoachPage() {
  usePageTitle('AI Coach');
  const toast = useToast();

  const [messages, setMessages] = useState<LocalMessage[]>([]);
  const [input, setInput] = useState('');
  const [busy, setBusy] = useState(false);
  const [conversationId, setConversationId] = useState<string | undefined>();
  const [historyOpen, setHistoryOpen] = useState(false);
  // Monotonic id counter — stable across renders, no impure Date.now in render.
  const nextMessageId = useRef(0);

  const {
    data: status,
    error: statusError,
    isLoading: statusLoading,
  } = useApiQuery(() => aiApi.status(), [], { refetchOnFocus: true });

  const {
    data: suggested,
    error: suggestedError,
    isLoading: suggestedLoading,
  } = useApiQuery(() => aiApi.suggestedQuestions(), [], { refetchOnFocus: true });

  const {
    data: conversations,
    error: convsError,
    isLoading: convsLoading,
    refetch: refetchConvs,
    setData: setConversations,
  } = useApiQuery(() => aiApi.conversations(), [], { refetchOnFocus: true });

  const aiReady = status?.ready;
  const suggestedList = suggested && suggested.length > 0 ? suggested : BUILT_IN_SUGGESTIONS;

  const handleSend = async (text: string) => {
    const trimmed = text.trim();
    if (trimmed.length < 2 || busy) return;
    const userMsg: LocalMessage = {
      id: `u-${nextMessageId.current++}`,
      role: 'user',
      content: trimmed,
    };
    setMessages((prev) => [...prev, userMsg]);
    setInput('');
    setBusy(true);
    try {
      const reply = await aiApi.ask(trimmed, conversationId);
      const assistantMsg: LocalMessage = {
        id: `a-${nextMessageId.current++}`,
        role: 'assistant',
        content: reply.reply,
        reply,
      };
      setMessages((prev) => [...prev, assistantMsg]);
      setConversationId(reply.conversationId ?? conversationId);
      await refetchConvs();
    } catch (e) {
      setMessages((prev) => prev.filter((m) => m.id !== userMsg.id));
      const err = e instanceof ApiError ? e : new ApiError('Failed to send message', 0);
      toast.error('Failed to send', err.message);
    } finally {
      setBusy(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await handleSend(input);
  };

  const loadConversation = async (id: string) => {
    try {
      const conv = await aiApi.conversation(id);
      const msgs: LocalMessage[] = (conv.messages ?? []).map((m: AssistantMessage, idx: number) => ({
        id: `${id}-${idx}`,
        role: m.role === 'assistant' ? 'assistant' : 'user',
        content: m.content,
        reply: m.role === 'assistant' ? (m as unknown as AssistantReply) : undefined,
      }));
      setMessages(msgs);
      setConversationId(id);
      setHistoryOpen(false);
    } catch (e) {
      const err = e instanceof ApiError ? e : new ApiError('Failed to load conversation', 0);
      toast.error('Failed to load', err.message);
    }
  };

  const deleteConversation = async (id: string) => {
    try {
      await aiApi.deleteConversation(id);
      toast.success('Conversation deleted');
      setConversations((prev) => (prev ?? []).filter((c) => c._id !== id));
      if (conversationId === id) {
        setMessages([]);
        setConversationId(undefined);
      }
      await refetchConvs();
    } catch (e) {
      const err = e instanceof ApiError ? e : new ApiError('Failed to delete', 0);
      toast.error('Failed to delete', err.message);
    }
  };

  const renderHistoryPanel = () => (
    <Card className="h-full overflow-y-auto p-3">
      <div className="mb-2 flex items-center justify-between">
        <h3 className="text-[14px] font-bold text-ink">History</h3>
        <Button variant="ghost" size="sm" onClick={() => setHistoryOpen(false)}>
          Close
        </Button>
      </div>
      {convsLoading && <SkeletonList rows={3} />}
      {convsError && !conversations && <ErrorState error={convsError} onRetry={refetchConvs} />}
      {!convsLoading && (conversations?.length ?? 0) === 0 && (
        <EmptyState title="No conversations yet" message="Start chatting to see history here" />
      )}
      <div className="space-y-2">
        {(conversations ?? []).map((c) => (
          <button
            key={c._id}
            type="button"
            onClick={() => loadConversation(c._id)}
            className="w-full rounded-lg border border-line bg-surface p-2 text-left hover:bg-alt"
          >
            <div className="flex items-center justify-between">
              <div className="min-w-0 flex-1">
                <p className="truncate text-[13.5px] font-semibold text-ink">{c.title || 'Conversation'}</p>
                <p className="text-[12px] text-sub">
                  {c.messageCount ?? 0} messages • {c.lastMessageAt ? formatRelativeDay(c.lastMessageAt) : ''}
                </p>
              </div>
              <Button
                variant="ghost"
                size="sm"
                icon={<TrashIcon className="h-4 w-4" />}
                onClick={(e) => {
                  e.stopPropagation();
                  void deleteConversation(c._id);
                }}
              />
            </div>
          </button>
        ))}
      </div>
    </Card>
  );

  const lastAssistant = [...messages].reverse().find((m) => m.role === 'assistant' && m.reply);
  const lastReply = lastAssistant?.reply;

  return (
    <PageBody className="h-[calc(100dvh-8rem)]">
      <FadeIn className="flex h-full flex-col gap-4">
        <Card className="p-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h1 className="text-[18px] font-bold text-ink">AI Coach</h1>
              <p className="text-[13px] text-sub">Answers come from your own logged data — informational only</p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              {statusLoading ? (
                <Pill tone="neutral">checking...</Pill>
              ) : statusError ? (
                <Pill tone="neutral">rules engine</Pill>
              ) : (
                <Pill tone={aiReady ? 'success' : 'neutral'}>
                  {aiReady ? 'local model ready' : 'rules engine'}
                </Pill>
              )}
              <Button variant="ghost" size="sm" onClick={() => setHistoryOpen((v) => !v)}>
                History
              </Button>
            </div>
          </div>
        </Card>

        <div className="flex flex-1 gap-4 overflow-hidden">
          <div className="hidden lg:block lg:w-80">{renderHistoryPanel()}</div>
          <Card className="flex flex-1 flex-col overflow-hidden p-0">
            <div className="flex-1 overflow-y-auto p-4">
              {messages.length === 0 ? (
                <div className="flex h-full flex-col items-center justify-center gap-4 text-center">
                  <SparkIcon className="h-12 w-12 text-brand" />
                  <div>
                    <h2 className="text-[16px] font-bold text-ink">Ask me anything</h2>
                    <p className="text-[13px] text-sub">Get personalized advice based on your fitness data</p>
                  </div>
                  <div className="flex max-w-md flex-wrap justify-center gap-2">
                    {(suggestedLoading ? BUILT_IN_SUGGESTIONS : suggestedList).slice(0, 6).map((s) => (
                      <Chip key={s} onClick={() => handleSend(s)}>
                        {s}
                      </Chip>
                    ))}
                  </div>
                  {suggestedError && (
                    <p className="text-[12px] text-mute">Using built-in suggestions</p>
                  )}
                </div>
              ) : (
                <div className="space-y-4">
                  {messages.map((m) => (
                    <div key={m.id} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                      {m.role === 'assistant' ? (
                        <div className="flex max-w-[80%] items-start gap-2">
                          <div className="mt-1 grid h-8 w-8 shrink-0 place-items-center rounded-full bg-brand-soft text-brand">
                            <SparkIcon className="h-4 w-4" />
                          </div>
                          <div className="space-y-2">
                            <Card className="rounded-2xl p-3">
                              <p className="whitespace-pre-wrap text-[14px] leading-relaxed text-ink">{m.content}</p>
                            </Card>
                            {m.reply && (
                              <div className="flex flex-wrap gap-2">
                                <Pill tone="neutral">{m.reply.provider === 'transformers' ? 'local model' : 'rules engine'}</Pill>
                                {m.reply.intent && <Pill tone="neutral">{m.reply.intent}</Pill>}
                              </div>
                            )}
                          </div>
                        </div>
                      ) : (
                        <div className="max-w-[80%] rounded-2xl bg-brand px-4 py-2 text-white">
                          <p className="whitespace-pre-wrap text-[14px] leading-relaxed">{m.content}</p>
                        </div>
                      )}
                    </div>
                  ))}
                  {busy && (
                    <div className="flex justify-start">
                      <div className="flex max-w-[80%] items-start gap-2">
                        <div className="mt-1 grid h-8 w-8 shrink-0 place-items-center rounded-full bg-brand-soft text-brand">
                          <SparkIcon className="h-4 w-4" />
                        </div>
                        <Card className="rounded-2xl p-3">
                          <div className="flex items-center gap-2 text-[14px] text-sub">
                            <span className="inline-block h-2 w-2 animate-pulse rounded-full bg-brand" />
                            <span className="inline-block h-2 w-2 animate-pulse rounded-full bg-brand [animation-delay:150ms]" />
                            <span className="inline-block h-2 w-2 animate-pulse rounded-full bg-brand [animation-delay:300ms]" />
                            <span className="ml-1">Thinking…</span>
                          </div>
                        </Card>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>

            {lastReply && (
              <div className="border-t border-line p-4">
                {lastReply.requiresProfessionalReferral || (lastReply.safetyFlags?.length ?? 0) > 0 ? (
                  <InlineNotice
                    tone="warning"
                    message="This looks like a medical question — please talk to a qualified professional."
                    className="mb-3"
                  />
                ) : null}
                {lastReply.suggestedActions && lastReply.suggestedActions.length > 0 && (
                  <div className="mb-3 flex flex-wrap gap-2">
                    {lastReply.suggestedActions.map((a) => (
                      <Chip key={a} onClick={() => handleSend(a)}>
                        {a}
                      </Chip>
                    ))}
                  </div>
                )}
                {lastReply.sources && lastReply.sources.length > 0 && (
                  <div className="text-[12px] text-mute">
                    Sources: {lastReply.sources.join(', ')}
                  </div>
                )}
              </div>
            )}

            <div className="border-t border-line p-4">
              <form onSubmit={handleSubmit} className="flex gap-2">
                <Field
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  placeholder="Type your message..."
                  className="flex-1"
                />
                <Button type="submit" icon={<SendIcon className="h-4 w-4" />} disabled={input.trim().length < 2 || busy}>
                  Send
                </Button>
              </form>
              <p className="mt-2 text-[11px] text-mute">
                MEPro&apos;s assistant screens medical questions and answers from your own logs. Not medical advice.
              </p>
            </div>
          </Card>
        </div>

        {historyOpen && (
          <div className="fixed inset-0 z-50 bg-black/40 lg:hidden" onClick={() => setHistoryOpen(false)}>
            <div className="absolute inset-x-0 top-0 bottom-0 p-4" onClick={(e) => e.stopPropagation()}>
              {renderHistoryPanel()}
            </div>
          </div>
        )}
      </FadeIn>
    </PageBody>
  );
}
