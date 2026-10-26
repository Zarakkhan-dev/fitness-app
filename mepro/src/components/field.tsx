/**
 * Labelled text input with inline validation messaging.
 *
 * One component for every form field so keyboard type, autofill hints and the
 * error placement stay consistent, and so accessibility labels are not repeated
 * per screen.
 */

import { useState } from 'react';
import { StyleSheet, TextInput, View, type TextInputProps } from 'react-native';

import { Caption, Label } from '@/components/ui';
import { Radius, Spacing, Type, useTheme } from '@/hooks/use-theme';

export function Field({
  label,
  error,
  hint,
  style,
  ...inputProps
}: TextInputProps & { label: string; error?: string; hint?: string }) {
  const theme = useTheme();
  const [focused, setFocused] = useState(false);

  const borderColor = error ? theme.danger : focused ? theme.brand : theme.border;

  return (
    <View style={{ gap: Spacing.one }}>
      <Label>{label}</Label>
      <TextInput
        {...inputProps}
        onFocus={(event) => {
          setFocused(true);
          inputProps.onFocus?.(event);
        }}
        onBlur={(event) => {
          setFocused(false);
          inputProps.onBlur?.(event);
        }}
        accessibilityLabel={label}
        placeholderTextColor={theme.textMuted}
        style={[
          {
            backgroundColor: theme.surfaceAlt,
            borderWidth: 1,
            borderColor,
            borderRadius: Radius.md,
            paddingHorizontal: Spacing.three - 2,
            paddingVertical: Spacing.three - 2,
            color: theme.text,
            minHeight: 48,
          },
          Type.body,
          style,
        ]}
      />
      {error ? (
        <Caption style={{ color: theme.danger }}>{error}</Caption>
      ) : hint ? (
        <Caption>{hint}</Caption>
      ) : null}
    </View>
  );
}

/** Numeric input that keeps a plain string in state while editing. */
export function NumberField({
  label,
  value,
  onChangeText,
  suffix,
  error,
  ...rest
}: Omit<TextInputProps, 'value' | 'onChangeText'> & {
  label: string;
  value: string;
  onChangeText: (next: string) => void;
  suffix?: string;
  error?: string;
}) {
  const theme = useTheme();
  return (
    <View style={{ gap: Spacing.one }}>
      <Label>{label}</Label>
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          backgroundColor: theme.surfaceAlt,
          borderWidth: 1,
          borderColor: error ? theme.danger : theme.border,
          borderRadius: Radius.md,
          paddingHorizontal: Spacing.three - 2,
        }}>
        <TextInput
          {...rest}
          value={value}
          onChangeText={onChangeText}
          accessibilityLabel={label}
          placeholderTextColor={theme.textMuted}
          keyboardType="decimal-pad"
          style={[styles.input, Type.body, { color: theme.text }]}
        />
        {suffix ? <Caption>{suffix}</Caption> : null}
      </View>
      {error ? <Caption style={{ color: theme.danger }}>{error}</Caption> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  input: {
    flex: 1,
    paddingVertical: Spacing.three - 2,
    minHeight: 48,
  },
});
