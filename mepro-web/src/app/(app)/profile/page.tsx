'use client';

/**
 * Profile & settings page
 */

import Link from 'next/link';
import { useState } from 'react';
import { authApi, userApi } from '@/lib/endpoints';
import { useApiQuery } from '@/hooks/use-api-query';
import { usePageTitle } from '@/hooks/use-page-title';
import { useToast } from '@/providers/toast-provider';
import { useAuth } from '@/providers/auth-provider';
import { ApiError } from '@/lib/api';
import {
  formatBmi,
  formatCalories,
  formatVolume,
} from '@/lib/format';
import {
  Avatar,
  Button,
  Card,
  Chip,
  Field,
  Modal,
  Pill,
  ProgressBar,
  Select,
} from '@/components/ui';
import { ErrorState, InlineNotice, SkeletonList } from '@/components/states';
import { PageBody, Stagger, StaggerItem } from '@/components/motion';
import {
  ChevronRightIcon,
  ShieldIcon,
} from '@/components/icons';
import type { BmiResult, NotificationSettings, User } from '@/lib/types';

const GENDER_OPTIONS = ['male', 'female', 'other'];
const FITNESS_OPTIONS = ['beginner', 'intermediate', 'advanced'];
const ACTIVITY_OPTIONS = ['sedentary', 'light', 'moderate', 'active', 'very_active'];
const DIET_OPTIONS = ['vegetarian', 'non_vegetarian', 'vegan', 'pescatarian', 'eggetarian'];
const GOAL_OPTIONS = ['weight_loss', 'weight_gain', 'muscle_gain', 'general_fitness', 'flexibility', 'stress_reduction', 'better_lifestyle'];
const LOCATION_OPTIONS = ['home', 'gym', 'outdoor', 'anywhere'];
const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const NOTIF_KEYS = [
  'workoutReminders',
  'waterReminders',
  'mealReminders',
  'motivation',
  'achievements',
  'aiRecommendations',
] as const;

export default function ProfilePage() {
  usePageTitle('Profile');
  const toast = useToast();
  const { user, refreshUser, patchUser, logout } = useAuth();

  const [avatarOpen, setAvatarOpen] = useState(false);
  const [avatarUrl, setAvatarUrl] = useState('');
  const [avatarBusy, setAvatarBusy] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [notifBusy, setNotifBusy] = useState(false);
  const [pwBusy, setPwBusy] = useState(false);
  const [exportBusy, setExportBusy] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleteText, setDeleteText] = useState('');
  const [deleteBusy, setDeleteBusy] = useState(false);

  const [currentPw, setCurrentPw] = useState('');
  const [newPw, setNewPw] = useState('');

  const [notif, setNotif] = useState<NotificationSettings | null>(null);
  const [form, setForm] = useState<Partial<User>>({});

  const {
    data: profile,
    error: profileError,
    isLoading: profileLoading,
    refetch: refetchProfile,
  } = useApiQuery(() => userApi.profile(), [], { refetchOnFocus: true });

  const {
    data: notifSettings,
    error: notifError,
    isLoading: notifLoading,
    refetch: refetchNotif,
  } = useApiQuery(() => userApi.notificationSettings(), [], { refetchOnFocus: true });

  const {
    data: onboarding,
    error: onboardError,
  } = useApiQuery(() => userApi.onboarding(), [], { refetchOnFocus: true });

  const {
    data: bmi,
    error: bmiError,
  } = useApiQuery<BmiResult | null>(
    () => {
      const h = form.heightCm ?? profile?.heightCm ?? user?.heightCm;
      const w = form.weightKg ?? profile?.weightKg ?? user?.weightKg;
      if (h && w) return userApi.bmi({ heightCm: h, weightKg: w });
      return Promise.resolve(null);
    },
    [form.heightCm, form.weightKg, profile?.heightCm, profile?.weightKg, user?.heightCm, user?.weightKg],
    { enabled: true },
  );

  // Seed local form state once per payload using the render-time adjustment
  // pattern (compare against what was already applied), not an effect.
  const [notifSeeded, setNotifSeeded] = useState(false);
  if (notifSettings && !notifSeeded) {
    setNotifSeeded(true);
    setNotif(notifSettings);
  }
  const [formSeeded, setFormSeeded] = useState(false);
  if ((profile || user) && !formSeeded && Object.keys(form).length === 0) {
    setFormSeeded(true);
    setForm({ ...(profile || user) });
  }

  const activeProfile = profile || user;

  const handleAvatarSave = async () => {
    setAvatarBusy(true);
    try {
      const url = avatarUrl.trim() === '' ? null : avatarUrl.trim();
      await userApi.setAvatar(url);
      toast.success('Avatar updated');
      setAvatarOpen(false);
      setAvatarUrl('');
      await refreshUser();
      await refetchProfile();
    } catch (e) {
      const err = e instanceof ApiError ? e : new ApiError('Failed to update avatar', 0);
      toast.error('Failed to update', err.message);
    } finally {
      setAvatarBusy(false);
    }
  };

  const handleSaveProfile = async () => {
    setEditOpen(true); // keep open to show errors; we'll close on success
    try {
      const payload: Partial<User> = { ...form };
      // normalize numbers
      if (payload.age !== undefined && payload.age !== null) payload.age = Number(payload.age);
      if (payload.heightCm !== undefined && payload.heightCm !== null) payload.heightCm = Number(payload.heightCm);
      if (payload.weightKg !== undefined && payload.weightKg !== null) payload.weightKg = Number(payload.weightKg);
      if (payload.targetWeightKg !== undefined && payload.targetWeightKg !== null) payload.targetWeightKg = Number(payload.targetWeightKg);
      if (payload.preferredWorkoutMinutes !== undefined && payload.preferredWorkoutMinutes !== null) payload.preferredWorkoutMinutes = Number(payload.preferredWorkoutMinutes);
      if (payload.mealCount !== undefined && payload.mealCount !== null) payload.mealCount = Number(payload.mealCount);
      // handle arrays
      if (typeof payload.allergies === 'string') {
        payload.allergies = (payload.allergies as unknown as string).split(',').map((s) => s.trim()).filter(Boolean);
      }
      if (typeof payload.dislikedFoods === 'string') {
        payload.dislikedFoods = (payload.dislikedFoods as unknown as string).split(',').map((s) => s.trim()).filter(Boolean);
      }
      const res = await userApi.update(payload);
      toast.success('Profile updated');
      patchUser(res);
      await refetchProfile();
      setEditOpen(false);
    } catch (e) {
      const err = e instanceof ApiError ? e : new ApiError('Failed to update profile', 0);
      toast.error('Failed to update', err.message);
    }
  };

  const handleNotifSave = async () => {
    if (!notif) return;
    setNotifBusy(true);
    try {
      const res = await userApi.updateNotificationSettings(notif);
      toast.success('Notification settings saved');
      setNotif(res);
      await refetchNotif();
    } catch (e) {
      const err = e instanceof ApiError ? e : new ApiError('Failed to save', 0);
      toast.error('Failed to save', err.message);
    } finally {
      setNotifBusy(false);
    }
  };

  const handleChangePw = async () => {
    if (newPw.length < 8 || !/[A-Za-z]/.test(newPw) || !/\d/.test(newPw)) {
      toast.error('Password must be at least 8 chars with letter and number');
      return;
    }
    setPwBusy(true);
    try {
      await authApi.changePassword(currentPw, newPw);
      toast.success('Password changed — other sessions were signed out');
      setCurrentPw('');
      setNewPw('');
    } catch (e) {
      const err = e instanceof ApiError ? e : new ApiError('Failed to change password', 0);
      toast.error('Failed to change', err.message);
    } finally {
      setPwBusy(false);
    }
  };

  const handleExport = async () => {
    setExportBusy(true);
    try {
      const data = await userApi.exportAccount();
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'mepro-account.json';
      a.click();
      URL.revokeObjectURL(url);
      toast.success('Data exported');
    } catch (e) {
      const err = e instanceof ApiError ? e : new ApiError('Failed to export', 0);
      toast.error('Failed to export', err.message);
    } finally {
      setExportBusy(false);
    }
  };

  const handleDelete = async () => {
    if (deleteText !== 'DELETE') return;
    setDeleteBusy(true);
    try {
      await userApi.deleteAccount();
      toast.success('Account deleted');
      setDeleteOpen(false);
      await logout();
    } catch (e) {
      const err = e instanceof ApiError ? e : new ApiError('Failed to delete', 0);
      toast.error('Failed to delete', err.message);
    } finally {
      setDeleteBusy(false);
    }
  };

  const toggleDay = (d: number) => {
    const cur = form.preferredDays || [];
    setForm({ ...form, preferredDays: cur.includes(d) ? cur.filter((x) => x !== d) : [...cur, d].sort((a,b)=>a-b) });
  };

  const toggleGoal = (g: string) => {
    const cur = form.goals || [];
    setForm({ ...form, goals: cur.includes(g) ? cur.filter((x) => x !== g) : [...cur, g] });
  };

  const toggleLoc = (l: string) => {
    const cur = form.preferredWorkoutLocation || [];
    setForm({ ...form, preferredWorkoutLocation: cur.includes(l) ? cur.filter((x) => x !== l) : [...cur, l] });
  };

  if (profileLoading && !profile && !user) {
    return (
      <PageBody>
        <SkeletonList rows={5} />
      </PageBody>
    );
  }

  if (profileError && !profile && !user) {
    return <ErrorState error={profileError} onRetry={refetchProfile} />;
  }

  const showBmiNotice = !(form.heightCm && form.weightKg) && !(activeProfile?.heightCm && activeProfile?.weightKg);
  const bmiVal = bmi?.bmi ?? activeProfile?.bmi;
  const bmiCat = bmi?.category ?? activeProfile?.bmiCategory;

  return (
    <PageBody>
      <Stagger className="space-y-4">
        {/* Header */}
        <StaggerItem>
          <Card className="p-5">
            <div className="flex flex-wrap items-center gap-4">
              <Avatar name={activeProfile?.name} url={activeProfile?.avatarUrl} size={64} />
              <div className="min-w-0 flex-1">
                <h1 className="truncate text-[18px] font-bold text-ink">{activeProfile?.name}</h1>
                <p className="truncate text-[13px] text-sub">{activeProfile?.email}</p>
                <div className="mt-2 flex flex-wrap gap-2">
                  <Pill tone="neutral">{activeProfile?.streak ?? 0} streak</Pill>
                  <Pill tone="neutral">{activeProfile?.achievementPoints ?? 0} points</Pill>
                  <Pill tone="neutral">{activeProfile?.totalWorkouts ?? 0} workouts</Pill>
                  <Pill tone="neutral">{activeProfile?.totalYogaSessions ?? 0} yoga</Pill>
                </div>
              </div>
              <Button variant="secondary" size="sm" onClick={() => { setAvatarUrl(activeProfile?.avatarUrl || ''); setAvatarOpen(true); }}>
                Edit picture
              </Button>
              <Button variant="secondary" size="sm" onClick={() => { setForm({ ...activeProfile }); setEditOpen(true); }}>
                Edit profile
              </Button>
            </div>
          </Card>
        </StaggerItem>

        {/* Body metrics */}
        <StaggerItem>
          <Card className="p-5 space-y-4">
            <h2 className="text-[15px] font-bold text-ink">Body metrics</h2>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <div>
                <p className="text-[12px] text-sub">Height</p>
                <p className="text-[14px] font-semibold text-ink">{activeProfile?.heightCm ? `${activeProfile.heightCm} cm` : '—'}</p>
              </div>
              <div>
                <p className="text-[12px] text-sub">Weight</p>
                <p className="text-[14px] font-semibold text-ink">{activeProfile?.weightKg ? `${activeProfile.weightKg} kg` : '—'}</p>
              </div>
              <div>
                <p className="text-[12px] text-sub">Target weight</p>
                <p className="text-[14px] font-semibold text-ink">{activeProfile?.targetWeightKg ? `${activeProfile.targetWeightKg} kg` : '—'}</p>
              </div>
              <div>
                <p className="text-[12px] text-sub">BMI</p>
                <p className="text-[14px] font-semibold text-ink">{bmiVal ? `${formatBmi(bmiVal)} (${bmiCat || '—'})` : '—'}</p>
              </div>
            </div>
            {showBmiNotice && (
              <InlineNotice tone="info" message="Add height and weight to calculate BMI" />
            )}
            {bmiError && <ErrorState error={bmiError} compact />}
            <p className="text-[11px] text-mute">BMI is a screening estimate, not medical advice.</p>
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <p className="text-[12px] text-sub">Daily calorie target</p>
                <p className="text-[14px] font-semibold text-ink">{activeProfile?.dailyCalorieTarget ? formatCalories(activeProfile.dailyCalorieTarget) : '—'}</p>
              </div>
              <div>
                <p className="text-[12px] text-sub">Daily water target</p>
                <p className="text-[14px] font-semibold text-ink">{activeProfile?.dailyWaterTargetMl ? formatVolume(activeProfile.dailyWaterTargetMl) : '—'}</p>
              </div>
            </div>
          </Card>
        </StaggerItem>

        {/* Onboarding */}
        {onboarding && onboarding.progressPercent < 100 && (
          <StaggerItem>
            <Card className="p-5 space-y-3">
              <div className="flex items-center justify-between">
                <h2 className="text-[15px] font-bold text-ink">Setup progress</h2>
                <Pill tone="brand">{Math.round(onboarding.progressPercent)}%</Pill>
              </div>
              <ProgressBar percent={onboarding.progressPercent} />
              <p className="text-[13px] text-sub">Next: {onboarding.nextStep ? onboarding.nextStep.replace(/_/g, ' ') : 'complete profile'}</p>
              <Button variant="secondary" size="sm" onClick={() => setEditOpen(true)}>
                Finish setup
              </Button>
            </Card>
          </StaggerItem>
        )}
        {onboardError && (
          <StaggerItem>
            <ErrorState error={onboardError} compact />
          </StaggerItem>
        )}

        {/* Preferences */}
        <StaggerItem>
          <Card className="p-5 space-y-4">
            <h2 className="text-[15px] font-bold text-ink">Preferences</h2>
            {notifLoading && <SkeletonList rows={2} />}
            {notifError && !notif && <ErrorState error={notifError} onRetry={refetchNotif} />}
            {notif && (
              <div className="space-y-3">
                {NOTIF_KEYS.map((k) => (
                  <div key={k} className="flex items-center justify-between">
                    <div>
                      <p className="text-[14px] font-semibold text-ink">{k.replace(/([A-Z])/g, ' $1').replace(/^./, (s)=>s.toUpperCase())}</p>
                    </div>
                    <button
                      type="button"
                      role="switch"
                      aria-checked={notif[k]}
                      onClick={() => setNotif({ ...notif, [k]: !notif[k] })}
                      className={`h-6 w-11 rounded-full border border-line p-0.5 transition-colors ${ notif[k] ? 'bg-brand' : 'bg-alt' }`}
                    >
                      <span className={`block h-5 w-5 rounded-full bg-surface transition-transform ${ notif[k] ? 'translate-x-5' : 'translate-x-0' }`} />
                    </button>
                  </div>
                ))}
                <div className="grid gap-3 sm:grid-cols-2">
                  <Field
                    label="Quiet hours start"
                    type="time"
                    value={notif.quietHoursStart || ''}
                    onChange={(e) => setNotif({ ...notif, quietHoursStart: e.target.value })}
                  />
                  <Field
                    label="Quiet hours end"
                    type="time"
                    value={notif.quietHoursEnd || ''}
                    onChange={(e) => setNotif({ ...notif, quietHoursEnd: e.target.value })}
                  />
                </div>
                <Button variant="secondary" size="sm" onClick={handleNotifSave} loading={notifBusy}>
                  Save preferences
                </Button>
              </div>
            )}
          </Card>
        </StaggerItem>

        {/* Explore */}
        <StaggerItem>
          <Card className="p-5 space-y-2">
            <h2 className="text-[15px] font-bold text-ink">Explore</h2>
            {['/goals', '/achievements', '/coach', '/notifications', '/progress', '/train'].map((href) => (
              <Link key={href} href={href} className="flex items-center justify-between rounded-lg border border-line p-3 hover:bg-alt">
                <span className="text-[14px] font-semibold text-ink">{href.slice(1).replace(/^\w/, (c)=>c.toUpperCase())}</span>
                <ChevronRightIcon className="h-4 w-4 text-sub" />
              </Link>
            ))}
          </Card>
        </StaggerItem>

        {/* Security */}
        <StaggerItem>
          <Card className="p-5 space-y-4">
            <h2 className="text-[15px] font-bold text-ink flex items-center gap-2"><ShieldIcon className="h-4 w-4" /> Security</h2>
            <div className="grid gap-3 sm:grid-cols-2">
              <Field
                label="Current password"
                type="password"
                value={currentPw}
                onChange={(e) => setCurrentPw(e.target.value)}
              />
              <Field
                label="New password"
                type="password"
                hint="≥8 chars + letter + number"
                value={newPw}
                onChange={(e) => setNewPw(e.target.value)}
              />
            </div>
            <Button variant="secondary" size="sm" onClick={handleChangePw} loading={pwBusy}>
              Change password
            </Button>
          </Card>
        </StaggerItem>

        {/* Danger zone */}
        <StaggerItem>
          <Card className="border-danger/30 p-5 space-y-3">
            <h2 className="text-[15px] font-bold text-danger">Danger zone</h2>
            <div className="flex flex-wrap gap-2">
              <Button variant="secondary" size="sm" onClick={handleExport} loading={exportBusy}>
                Export data
              </Button>
              <Button variant="danger" size="sm" onClick={() => { setDeleteText(''); setDeleteOpen(true); }}>
                Delete account
              </Button>
              <Button variant="ghost" size="sm" onClick={() => void logout()}>
                Sign out
              </Button>
            </div>
          </Card>
        </StaggerItem>

        <StaggerItem>
          <p className="pb-2 text-center text-[11.5px] text-mute">
            Health figures are estimates, not medical advice.
          </p>
        </StaggerItem>
      </Stagger>

      {/* Avatar modal */}
      <Modal open={avatarOpen} onClose={() => setAvatarOpen(false)} title="Edit picture">
        <div className="space-y-3">
          <Field
            label="Avatar URL"
            type="url"
            value={avatarUrl}
            onChange={(e) => setAvatarUrl(e.target.value)}
            placeholder="https://..."
          />
          <div className="flex justify-end gap-2">
            <Button variant="ghost" onClick={() => setAvatarOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleAvatarSave} loading={avatarBusy}>
              Save
            </Button>
          </div>
        </div>
      </Modal>

      {/* Edit profile modal */}
      <Modal open={editOpen} onClose={() => setEditOpen(false)} title="Edit profile" className="sm:max-w-2xl">
        <div className="max-h-[70vh] space-y-4 overflow-y-auto pr-1">
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="Name" value={form.name || ''} onChange={(e) => setForm({ ...form, name: e.target.value })} />
            <Field label="Age" type="number" value={form.age ?? ''} onChange={(e) => setForm({ ...form, age: e.target.value === '' ? undefined : +e.target.value })} />
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <Select label="Gender" value={form.gender || ''} onChange={(e) => setForm({ ...form, gender: e.target.value || null })}>
              <option value="">Select...</option>
              {GENDER_OPTIONS.map((g) => (
                <option key={g} value={g}>{g}</option>
              ))}
            </Select>
            <Select label="Fitness level" value={form.fitnessLevel || ''} onChange={(e) => setForm({ ...form, fitnessLevel: e.target.value || null })}>
              <option value="">Select...</option>
              {FITNESS_OPTIONS.map((g) => (
                <option key={g} value={g}>{g}</option>
              ))}
            </Select>
          </div>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <Field label="Height (cm)" type="number" value={form.heightCm ?? ''} onChange={(e) => setForm({ ...form, heightCm: e.target.value === '' ? undefined : +e.target.value })} />
            <Field label="Weight (kg)" type="number" value={form.weightKg ?? ''} onChange={(e) => setForm({ ...form, weightKg: e.target.value === '' ? undefined : +e.target.value })} />
            <Field label="Target weight (kg)" type="number" value={form.targetWeightKg ?? ''} onChange={(e) => setForm({ ...form, targetWeightKg: e.target.value === '' ? undefined : +e.target.value })} />
            <Field label="Preferred minutes" type="number" min={5} max={180} value={form.preferredWorkoutMinutes ?? ''} onChange={(e) => setForm({ ...form, preferredWorkoutMinutes: e.target.value === '' ? undefined : +e.target.value })} />
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <Select label="Activity level" value={form.activityLevel || ''} onChange={(e) => setForm({ ...form, activityLevel: e.target.value || null })}>
              <option value="">Select...</option>
              {ACTIVITY_OPTIONS.map((g) => (
                <option key={g} value={g}>{g}</option>
              ))}
            </Select>
            <Select label="Diet preference" value={form.dietPreference || ''} onChange={(e) => setForm({ ...form, dietPreference: e.target.value || null })}>
              <option value="">Select...</option>
              {DIET_OPTIONS.map((g) => (
                <option key={g} value={g}>{g}</option>
              ))}
            </Select>
          </div>
          <Field label="Meal count" type="number" min={2} max={6} value={form.mealCount ?? ''} onChange={(e) => setForm({ ...form, mealCount: e.target.value === '' ? undefined : +e.target.value })} />
          <div>
            <p className="mb-2 text-[13px] font-semibold text-sub">Goals</p>
            <div className="flex flex-wrap gap-2">
              {GOAL_OPTIONS.map((g) => (
                <Chip key={g} active={form.goals?.includes(g)} onClick={() => toggleGoal(g)}>
                  {g.replace(/_/g, ' ')}
                </Chip>
              ))}
            </div>
          </div>
          <div>
            <p className="mb-2 text-[13px] font-semibold text-sub">Preferred days</p>
            <div className="flex flex-wrap gap-2">
              {WEEKDAYS.map((label, idx) => (
                <Chip key={idx} active={form.preferredDays?.includes(idx)} onClick={() => toggleDay(idx)}>
                  {label}
                </Chip>
              ))}
            </div>
          </div>
          <div>
            <p className="mb-2 text-[13px] font-semibold text-sub">Preferred locations</p>
            <div className="flex flex-wrap gap-2">
              {LOCATION_OPTIONS.map((l) => (
                <Chip key={l} active={form.preferredWorkoutLocation?.includes(l)} onClick={() => toggleLoc(l)}>
                  {l}
                </Chip>
              ))}
            </div>
          </div>
          <Field
            label="Allergies (comma separated)"
            value={Array.isArray(form.allergies) ? form.allergies.join(', ') : (form.allergies as unknown as string) || ''}
            onChange={(e) => setForm({ ...form, allergies: e.target.value.split(',').map(x=>x.trim()).filter(Boolean) })}
          />
          <Field
            label="Disliked foods (comma separated)"
            value={Array.isArray(form.dislikedFoods) ? form.dislikedFoods.join(', ') : (form.dislikedFoods as unknown as string) || ''}
            onChange={(e) => setForm({ ...form, dislikedFoods: e.target.value.split(',').map(x=>x.trim()).filter(Boolean) })}
          />
        </div>
        <div className="mt-4 flex justify-end gap-2">
          <Button variant="ghost" onClick={() => setEditOpen(false)}>
            Cancel
          </Button>
          <Button onClick={handleSaveProfile}>
            Save
          </Button>
        </div>
      </Modal>

      {/* Delete modal */}
      <Modal open={deleteOpen} onClose={() => setDeleteOpen(false)} title="Delete account">
        <div className="space-y-3">
          <p className="text-[13px] text-sub">
            This will permanently delete your account and all associated data. Type <strong>DELETE</strong> to confirm.
          </p>
          <Field
            value={deleteText}
            onChange={(e) => setDeleteText(e.target.value)}
            placeholder="DELETE"
          />
          <div className="flex justify-end gap-2">
            <Button variant="ghost" onClick={() => setDeleteOpen(false)}>
              Cancel
            </Button>
            <Button variant="danger" onClick={handleDelete} disabled={deleteText !== 'DELETE'} loading={deleteBusy}>
              Confirm delete
            </Button>
          </div>
        </div>
      </Modal>
    </PageBody>
  );
}
