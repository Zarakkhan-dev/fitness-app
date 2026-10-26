/**
 * Log today's weight.
 *
 * The screen seeds itself from the most recent logged weight so the common case
 * is a one-field correction, and the unit is fixed to kilograms to match the API.
 */

import { router } from 'expo-router';
import { useEffect, useState } from 'react';

import { NumberField } from '@/components/field';
import { ErrorState } from '@/components/states';
import { Body, Button, Caption, Card, Screen, Spacer } from '@/components/ui';
import { Spacing } from '@/constants/theme';
import { ApiError } from '@/lib/api';
import { progressApi } from '@/lib/endpoints';
import { formatSignedWeight, formatWeight } from '@/lib/format';

const MIN_WEIGHT = 25;
const MAX_WEIGHT = 350;

export default function LogWeightScreen() {
  const [weight, setWeight] = useState('');
  const [error, setError] = useState<ApiError | null>(null);
  const [busy, setBusy] = useState(false);
  const [previous, setPrevious] = useState<number | null>(null);

  // Seed from the latest entry rather than asking the user to remember it.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const progress = await progressApi.overview(7);
        if (cancelled) return;
        const latest = progress.weightHistory.at(-1);
        if (latest?.weightKg) {
          setPrevious(latest.weightKg);
          setWeight(String(latest.weightKg));
        }
      } catch {
        // A missing history is not worth blocking the form for; the user can
        // still type a weight.
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const parsed = Number(weight);
  const valid = Number.isFinite(parsed) && parsed >= MIN_WEIGHT && parsed <= MAX_WEIGHT;
  const delta = valid && previous !== null ? parsed - previous : null;

  async function save() {
    if (!valid) return;
    setBusy(true);
    setError(null);
    try {
      await progressApi.logWeight(Math.round(parsed * 10) / 10);
      router.back();
    } catch (caught) {
      setError(caught instanceof ApiError ? caught : new ApiError('Could not save your weight.', 0, 'UNKNOWN'));
      setBusy(false);
    }
  }

  return (
    <Screen>
      <Body style={{ fontWeight: '700' }}>Log weight</Body>
      <Caption>Measured first thing in the morning is most consistent.</Caption>

      <Spacer size={Spacing.four} />

      {error ? <ErrorState error={error} /> : null}

      <Card>
        <NumberField
          label="Weight"
          value={weight}
          onChangeText={setWeight}
          suffix="kg"
          placeholder="e.g. 78.5"
          error={
            weight.length > 0 && !valid
              ? `Enter between ${MIN_WEIGHT} and ${MAX_WEIGHT} kg`
              : undefined
          }
        />

        {delta !== null && delta !== 0 ? (
          <>
            <Spacer size={Spacing.three} />
            <Caption>
              That is {formatSignedWeight(delta)} from your last entry of {formatWeight(previous)}.
            </Caption>
          </>
        ) : null}
      </Card>

      <Spacer size={Spacing.four} />

      <Button label="Save" onPress={save} disabled={!valid || busy} loading={busy} />
      <Spacer size={Spacing.two} />
      <Button label="Cancel" variant="ghost" onPress={() => router.back()} disabled={busy} />
    </Screen>
  );
}
