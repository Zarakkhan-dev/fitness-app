'use client';

/**
 * The two quick-log modals reused across the dashboard, nutrition and progress
 * screens. Each validates the same range the API enforces, so a rejected save
 * never surprises the user.
 */

import { useState } from 'react';

import { ApiError } from '@/lib/api';
import { hydrationApi, nutritionApi, userApi } from '@/lib/endpoints';
import { formatEnumLabel, formatVolume, MEAL_ORDER } from '@/lib/format';
import { useApiQuery } from '@/hooks/use-api-query';
import { useToast } from '@/providers/toast-provider';
import { Button, Field, Modal, Select } from '@/components/ui';
import { InlineNotice } from '@/components/states';
import { DropIcon, ScaleIcon } from '@/components/icons';

const PRESETS = [250, 500, 750];

/**
 * Logs a hand-entered food. The macro inputs are the totals for the amount
 * being logged, so nothing is scaled by 100 g — that is why this is separate
 * from the catalogue search flow.
 */
export function LogFoodModal({
  open,
  onClose,
  mealType,
  onMealChange,
  onSaved,
}: {
  open: boolean;
  onClose: () => void;
  /** Controlled by the page so the header meal picker and the modal agree. */
  mealType: string;
  onMealChange: (meal: string) => void;
  onSaved?: () => void;
}) {
  const toast = useToast();
  const [foodName, setFoodName] = useState('');
  const [quantity, setQuantity] = useState('1');
  const [unit, setUnit] = useState('serving');
  const [calories, setCalories] = useState('0');
  const [proteinG, setProteinG] = useState('0');
  const [carbsG, setCarbsG] = useState('0');
  const [fatG, setFatG] = useState('0');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  const parsedQuantity = Number(quantity);
  const macroValues = [calories, proteinG, carbsG, fatG].map(Number);
  const valid =
    foodName.trim().length > 0 &&
    Number.isFinite(parsedQuantity) &&
    parsedQuantity > 0 &&
    macroValues.every((value) => Number.isFinite(value) && value >= 0);

  function close() {
    setFoodName('');
    setQuantity('1');
    setUnit('serving');
    setCalories('0');
    setProteinG('0');
    setCarbsG('0');
    setFatG('0');
    setError(null);
    setFieldErrors({});
    onClose();
  }

  async function save() {
    if (!valid || busy) return;
    setBusy(true);
    setError(null);
    setFieldErrors({});
    try {
      await nutritionApi.logCustomFood({
        foodName: foodName.trim(),
        mealType,
        quantity: parsedQuantity,
        unit: unit.trim() || 'serving',
        calories: Number(calories),
        proteinG: Number(proteinG),
        carbsG: Number(carbsG),
        fatG: Number(fatG),
      });
      toast.success(`Logged ${foodName.trim()}`);
      onSaved?.();
      close();
    } catch (cause) {
      if (cause instanceof ApiError) {
        setFieldErrors(cause.fieldErrors);
        setError(cause.message);
      } else {
        setError('Could not log food.');
      }
    } finally {
      setBusy(false);
    }
  }

  return (
    <Modal
      open={open}
      onClose={close}
      title="Log food"
      footer={
        <>
          <Button variant="ghost" onClick={close} disabled={busy}>
            Cancel
          </Button>
          <Button onClick={() => void save()} loading={busy} disabled={!valid}>
            Log food
          </Button>
        </>
      }
    >
      <div className="space-y-3">
        {error ? <InlineNotice tone="error" message={error} /> : null}

        <Field
          label="Food name"
          value={foodName}
          onChange={(event) => setFoodName(event.target.value)}
          error={fieldErrors.foodName || fieldErrors.name}
          autoFocus
        />

        <div className="grid grid-cols-2 gap-3">
          <Field
            label="Quantity"
            type="number"
            min="0.1"
            step="0.1"
            value={quantity}
            onChange={(event) => setQuantity(event.target.value)}
            error={fieldErrors.quantity}
          />
          <Field
            label="Unit"
            value={unit}
            onChange={(event) => setUnit(event.target.value)}
            error={fieldErrors.unit}
          />
        </div>

        <Select label="Meal" value={mealType} onChange={(event) => onMealChange(event.target.value)}>
          {MEAL_ORDER.map((meal) => (
            <option key={meal} value={meal}>
              {formatEnumLabel(meal)}
            </option>
          ))}
        </Select>

        <div className="grid grid-cols-2 gap-3">
          <Field
            label="Calories"
            type="number"
            min="0"
            value={calories}
            onChange={(event) => setCalories(event.target.value)}
            error={fieldErrors.calories}
          />
          <Field
            label="Protein (g)"
            type="number"
            min="0"
            step="0.1"
            value={proteinG}
            onChange={(event) => setProteinG(event.target.value)}
            error={fieldErrors.proteinG}
          />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <Field
            label="Carbs (g)"
            type="number"
            min="0"
            step="0.1"
            value={carbsG}
            onChange={(event) => setCarbsG(event.target.value)}
            error={fieldErrors.carbsG}
          />
          <Field
            label="Fat (g)"
            type="number"
            min="0"
            step="0.1"
            value={fatG}
            onChange={(event) => setFatG(event.target.value)}
            error={fieldErrors.fatG}
          />
        </div>

        <p className="text-[11.5px] text-mute">
          These values are the totals for the amount logged above.
        </p>
      </div>
    </Modal>
  );
}

export function LogWaterModal({
  open,
  onClose,
  onSaved,
}: {
  open: boolean;
  onClose: () => void;
  onSaved?: () => void;
}) {
  const toast = useToast();
  const [amount, setAmount] = useState('250');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const parsed = Number(amount);
  const valid = Number.isFinite(parsed) && parsed >= 1 && parsed <= 5000;

  // Reset on close rather than in an effect on open, so every launch starts fresh.
  function close() {
    setAmount('250');
    setError(null);
    onClose();
  }

  async function save() {
    if (!valid || busy) return;
    setBusy(true);
    setError(null);
    try {
      await hydrationApi.add(Math.round(parsed), parsed === 250 ? 'quick_add' : 'custom');
      toast.success('Water logged', `${formatVolume(Math.round(parsed))} added to today.`);
      onSaved?.();
      close();
    } catch (cause) {
      setError(cause instanceof ApiError ? cause.message : 'Could not save that amount.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <Modal
      open={open}
      onClose={close}
      title="Log water"
      footer={
        <>
          <Button variant="ghost" onClick={close} disabled={busy}>
            Cancel
          </Button>
          <Button onClick={() => void save()} loading={busy} disabled={!valid}>
            <DropIcon className="h-4 w-4" />
            Add water
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        {error ? <InlineNotice tone="error" message={error} /> : null}

        <div className="flex flex-wrap gap-2">
          {PRESETS.map((preset) => (
            <button
              key={preset}
              type="button"
              onClick={() => setAmount(String(preset))}
              data-active={String(preset) === amount}
              className="chip"
            >
              {formatVolume(preset)}
            </button>
          ))}
        </div>

        <Field
          label="Amount"
          type="number"
          inputMode="numeric"
          min={1}
          max={5000}
          suffix="ml"
          value={amount}
          onChange={(event) => setAmount(event.target.value)}
          error={amount !== '' && !valid ? 'Enter between 1 and 5000 ml.' : null}
          autoFocus
        />
      </div>
    </Modal>
  );
}

export function LogWeightModal({
  open,
  onClose,
  onSaved,
}: {
  open: boolean;
  onClose: () => void;
  onSaved?: (weight: number) => void;
}) {
  const toast = useToast();
  // `null` means "untouched": the field seeds from the last logged weight.
  const [weight, setWeight] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const previous = useApiQuery(
    () => userApi.profile(),
    [],
    { enabled: open, refetchOnFocus: false },
  );

  const seeded =
    previous.data?.weightKg != null ? String(Math.round(previous.data.weightKg * 10) / 10) : '';
  const displayWeight = weight ?? seeded;

  function close() {
    setWeight(null);
    setError(null);
    onClose();
  }

  const parsed = Number(displayWeight);
  const valid =
    displayWeight !== '' && Number.isFinite(parsed) && parsed >= 25 && parsed <= 350;
  const delta =
    valid && previous.data?.weightKg != null
      ? Math.round((parsed - previous.data.weightKg) * 10) / 10
      : null;

  async function save() {
    if (!valid || busy) return;
    setBusy(true);
    setError(null);
    try {
      const result = await userApi.logWeight(Math.round(parsed * 10) / 10);
      toast.success('Weight logged', result.disclaimer ?? undefined);
      onSaved?.(result.weightKg);
      close();
    } catch (cause) {
      setError(cause instanceof ApiError ? cause.message : 'Could not save that weight.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <Modal
      open={open}
      onClose={close}
      title="Log weight"
      footer={
        <>
          <Button variant="ghost" onClick={close} disabled={busy}>
            Cancel
          </Button>
          <Button onClick={() => void save()} loading={busy} disabled={!valid}>
            <ScaleIcon className="h-4 w-4" />
            Save weight
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        {error ? <InlineNotice tone="error" message={error} /> : null}

        <Field
          label="Today's weight"
          type="number"
          inputMode="decimal"
          step="0.1"
          min={25}
          max={350}
          suffix="kg"
          value={displayWeight}
          onChange={(event) => setWeight(event.target.value)}
          error={displayWeight !== '' && !valid ? 'Enter a weight between 25 and 350 kg.' : null}
          hint={valid && delta !== null && delta !== 0 ? `Change since last logged: ${delta > 0 ? '+' : ''}${delta.toFixed(1)} kg` : undefined}
          autoFocus
        />
      </div>
    </Modal>
  );
}
