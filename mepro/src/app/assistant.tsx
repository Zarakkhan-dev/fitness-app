/**
 * AI coach.
 *
 * The endpoint contract is verified against the backend: `POST /ai/assistant`
 * reads `message` from the *query string*, and spreads the reply at the top
 * level, so `data.reply` is the answer itself rather than an object to unwrap.
 * `aiApi.ask` owns that quirk; this screen only handles the typed result.
 *
 * The safety fields are surfaced rather than hidden, because screening the
 * advice is the point of the feature. `conversationId` is threaded through each
 * turn so follow-up questions keep their context.
 */

import { useRef, useState } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, View } from 'react-native';

import { Field } from '@/components/field';
import { ErrorState } from '@/components/states';
import { Body, Button, Caption, Card, Pill, Spacer } from '@/components/ui';
import { useTheme } from '@/hooks/use-theme';
import { Spacing } from '@/constants/theme';
import { ApiError } from '@/lib/api';
import { aiApi } from '@/lib/endpoints';
import type { AssistantReply } from '@/lib/types';

interface Turn {
  id: string;
  role: 'user' | 'coach';
  text: string;
  /** Set when the backend flagged the reply for a human response. */
  safetyNote?: string;
  suggestedActions?: string[];
}

const SUGGESTIONS = [
  'How do I start running?',
  'What should I eat after training?',
  'Is stretching helping my back?',
];

export default function AssistantScreen() {
  const theme = useTheme();
  const [turns, setTurns] = useState<Turn[]>([]);
  const [message, setMessage] = useState('');
  const [error, setError] = useState<ApiError | null>(null);
  const [sending, setSending] = useState(false);
  const nextId = useRef(0);
  /** Threaded through every turn so the assistant keeps its context. */
  const conversationId = useRef<string | undefined>(undefined);

  async function send(text: string) {
    const trimmed = text.trim();
    if (!trimmed || sending) return;

    setSending(true);
    setError(null);
    setMessage('');

    const userTurn: Turn = { id: `u${nextId.current++}`, role: 'user', text: trimmed };
    setTurns((current) => [...current, userTurn]);

    try {
      const result = await aiApi.ask(trimmed, conversationId.current);
      conversationId.current = result.conversationId ?? conversationId.current;
      setTurns((current) => [
        ...current,
        {
          id: `a${nextId.current++}`,
          role: 'coach',
          text: readReply(result),
          safetyNote: safetyNote(result),
          suggestedActions: result.suggestedActions?.slice(0, 3),
        },
      ]);
    } catch (caught) {
      setError(caught instanceof ApiError ? caught : new ApiError('The coach is unavailable right now.', 0, 'UNKNOWN'));
    } finally {
      setSending(false);
    }
  }

  const lastCoachTurn = [...turns].reverse().find((turn) => turn.role === 'coach');

  return (
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: theme.background }}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={90}>
      <ScrollView
        contentContainerStyle={{ padding: Spacing.three, gap: Spacing.three }}
        keyboardShouldPersistTaps="handled">
        <View style={{ gap: 2 }}>
          <Body style={{ fontWeight: '700' }}>Coach</Body>
          <Caption>General wellness guidance, not medical advice.</Caption>
        </View>

        {turns.length === 0 ? (
          <Card>
            <Body>Ask about training, food or recovery.</Body>
            <Spacer size={Spacing.three} />
            <View style={{ gap: Spacing.two }}>
              {SUGGESTIONS.map((suggestion) => (
                <Button
                  key={suggestion}
                  label={suggestion}
                  variant="secondary"
                  onPress={() => send(suggestion)}
                  disabled={sending}
                />
              ))}
            </View>
          </Card>
        ) : (
          turns.map((turn) => (
            <View
              key={turn.id}
              style={{
                alignSelf: turn.role === 'user' ? 'flex-end' : 'flex-start',
                maxWidth: '88%',
                backgroundColor: turn.role === 'user' ? theme.brand : theme.surface,
                borderRadius: 14,
                borderWidth: turn.role === 'user' ? 0 : 1,
                borderColor: theme.border,
                padding: Spacing.three - 2,
                gap: Spacing.one,
              }}>
              {turn.safetyNote ? (
                <Pill label={turn.safetyNote} tone="warning" />
              ) : null}
              <Body style={{ color: turn.role === 'user' ? '#FFFFFF' : theme.text }}>{turn.text}</Body>
            </View>
          ))
        )}

        {/* Follow-ups, so a good answer is one tap from the next question. */}
        {lastCoachTurn?.suggestedActions?.length ? (
          <View style={{ gap: Spacing.two }}>
            {lastCoachTurn.suggestedActions.map((action) => (
              <Button
                key={action}
                label={action}
                variant="secondary"
                onPress={() => send(action)}
                disabled={sending}
              />
            ))}
          </View>
        ) : null}

        {sending ? (
          <Caption style={{ alignSelf: 'flex-start' }}>Thinking…</Caption>
        ) : null}

        {error ? <ErrorState error={error} onRetry={() => send(turns[turns.length - 1]?.text ?? '')} /> : null}
      </ScrollView>

      <View
        style={{
          flexDirection: 'row',
          gap: Spacing.two,
          padding: Spacing.three,
          borderTopWidth: 1,
          borderTopColor: theme.border,
          backgroundColor: theme.surface,
        }}>
        <View style={{ flex: 1 }}>
          <Field
            label="Message"
            value={message}
            onChangeText={setMessage}
            placeholder="Ask the coach…"
            onSubmitEditing={() => send(message)}
            returnKeyType="send"
          />
        </View>
        <View style={{ justifyContent: 'flex-end' }}>
          <Button label="Send" onPress={() => send(message)} disabled={sending || message.trim().length === 0} />
        </View>
      </View>
    </KeyboardAvoidingView>
  );
}

/** `data.reply` is the answer string; the fallback only guards a bad payload. */
function readReply(result: AssistantReply): string {
  const text = result?.reply?.trim();
  return text && text.length > 0 ? text : 'The coach had nothing to say about that.';
}

function safetyNote(result: AssistantReply): string | undefined {
  if (result.requiresProfessionalReferral) return 'Check with a professional';
  if (result.safetyFlags?.length) return `Flagged: ${result.safetyFlags.join(', ')}`;
  return undefined;
}
