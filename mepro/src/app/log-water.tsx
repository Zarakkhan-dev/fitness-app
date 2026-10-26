/**
 * Log a drink.
 *
 * The screen posts and then navigates back, relying on the nutrition screen's
 * focus refetch to pick up the new total. Duplicating the update here would
 * mean two sources of truth for the day's water.
 */

import { router } from 'expo-router';
import { useState } from 'react';
import { View } from 'react-native';

import { NumberField } from '@/components/field';
import { ErrorState } from '@/components/states';
import { Body, Button, Caption, Card, Chip, Screen, Spacer } from '@/components/ui';
import { Spacing } from '@/constants/theme';
import { ApiError } from '@/lib/api';
import { hydrationApi } from '@/lib/endpoints';
import { formatVolume } from '@/lib/format';

const PRESETS = [250, 500, 750];

export default function LogWaterScreen() {
  const [amount, setAmount] = useState('500');
  const [error, setError] = useState<ApiError | null>(null);
  const [busy, setBusy] = useState(false);

  const parsed = Number(amount);
  const valid = Number.isFinite(parsed) && parsed > 0 && parsed <= 5000;

  async function save() {
    if (!valid) return;
    setBusy(true);
    setError(null);
    try {
      await hydrationApi.add(Math.round(parsed));
      router.back();
    } catch (caught) {
      setError(caught instanceof ApiError ? caught : new ApiError('Could not log that drink.', 0, 'UNKNOWN'));
      setBusy(false);
    }
  }

  return (
    <Screen>
      <Body style={{ fontWeight: '700' }}>Add water</Body>
      <Caption>How much did you drink?</Caption>

      <Spacer size={Spacing.four} />

      {error ? <ErrorState error={error} /> : null}

      <View style={{ flexDirection: 'row', gap: Spacing.two, flexWrap: 'wrap' }}>
        {PRESETS.map((preset) => (
          <Chip
            key={preset}
            label={formatVolume(preset)}
            selected={parsed === preset}
            onPress={() => setAmount(String(preset))}
          />
        ))}
      </View>

      <Spacer size={Spacing.three} />

      <Card>
        <NumberField
          label="Amount"
          value={amount}
          onChangeText={setAmount}
          suffix="ml"
          error={amount.length > 0 && !valid ? 'Enter between 1 and 5000 ml' : undefined}
        />
      </Card>

      <Spacer size={Spacing.four} />

      <Button label="Save" onPress={save} disabled={!valid || busy} loading={busy} />
      <Spacer size={Spacing.two} />
      <Button label="Cancel" variant="ghost" onPress={() => router.back()} disabled={busy} />
    </Screen>
  );
}
