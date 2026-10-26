/**
 * Typed endpoint wrappers.
 *
 * Two rules hold throughout:
 *
 * 1. Envelopes are unwrapped here so no screen ever touches `data`.
 * 2. Shapes are taken from a live response. Where the API nests tokens or
 *    splits a collection across `earned`/`locked`, the wrapper does the
 *    unwrapping instead of pushing it onto the caller.
 */

import { aiRequest, api } from '@/lib/api';
import type {
  AchievementList,
  AchievementSummary,
  AppNotification,
  AssistantReply,
  AuthResult,
  CommunityPost,
  Dashboard,
  Food,
  FoodLog,
  Goal,
  HydrationToday,
  LikeResult,
  NutritionToday,
  Paged,
  Progress,
  ProgressDay,
  Recommendation,
  Streak,
  Tokens,
  User,
  WaterLogRemoval,
  WaterLogResult,
  WeightLogResult,
  Workout,
  WorkoutCompleteResult,
  WorkoutSession,
  WorkoutStartResult,
  YogaRoutine,
} from '@/lib/types';

type Query = Record<string, string | number | boolean | undefined | null>;

/* -------------------------------------------------------------------- auth */

export const authApi = {
  /** Returns the user *and* the token pair; the tokens are not at the top level. */
  async login(email: string, password: string): Promise<AuthResult> {
    return api.post<AuthResult>('/auth/login', { email, password });
  },

  async register(name: string, email: string, password: string): Promise<AuthResult> {
    return api.post<AuthResult>('/auth/register', { name, email, password });
  },

  /** Used by the API client itself, so it must never carry a bearer token. */
  async refresh(refreshToken: string): Promise<Tokens> {
    return api.post<Tokens>('/auth/refresh', { refreshToken }, { auth: false });
  },

  async logout(refreshToken: string): Promise<void> {
    await api.post<null>('/auth/logout', { refreshToken }, { auth: false });
  },

  async me(): Promise<User> {
    return api.get<User>('/auth/me');
  },

  async changePassword(currentPassword: string, newPassword: string): Promise<void> {
    await api.post<null>('/auth/change-password', { currentPassword, newPassword });
  },
};

/* -------------------------------------------------------------------- user */

export const userApi = {
  async profile(): Promise<User> {
    return api.get<User>('/users/profile');
  },

  async update(patch: Partial<User>): Promise<User> {
    return api.patch<User>('/users/profile', patch);
  },
};

/* --------------------------------------------------------------- dashboard */

export const dashboardApi = {
  async get(): Promise<Dashboard> {
    return api.get<Dashboard>('/dashboard');
  },
};

/* ---------------------------------------------------------------- workouts */

export const workoutApi = {
  async list(query: Query = {}): Promise<Paged<Workout>> {
    return api.get<Paged<Workout>>('/workouts', query);
  },

  async detail(id: string): Promise<Workout> {
    return api.get<Workout>(`/workouts/${id}`);
  },

  /** The workout id is in the path, and the body is not used by the server. */
  async startSession(workoutId: string): Promise<WorkoutStartResult> {
    return api.post<WorkoutStartResult>(`/workouts/${workoutId}/start`);
  },

  /** `null` when nothing is in progress, which is a normal state, not an error. */
  async activeSession(): Promise<WorkoutSession | null> {
    return api.get<WorkoutSession | null>('/workouts/session/active');
  },

  /**
   * Completed against the *workout* id, not the session id, and the server
   * requires `durationMinutes` (1..300).
   */
  async completeSession(
    workoutId: string,
    payload: {
      durationMinutes: number;
      perceivedEffort?: number;
      notes?: string;
      completedExercises?: unknown[];
    },
  ): Promise<WorkoutCompleteResult> {
    return api.post<WorkoutCompleteResult>(`/workouts/${workoutId}/complete`, payload);
  },

  /** Abandon is a DELETE against the *session* id. */
  async abandonSession(sessionId: string): Promise<void> {
    await api.delete<null>(`/workouts/sessions/${sessionId}`);
  },

  /** `type` is one of workout | yoga | all. */
  async history(query: Query = {}): Promise<Paged<WorkoutSession>> {
    return api.get<Paged<WorkoutSession>>('/workouts/history', query);
  },
};

/* -------------------------------------------------------------------- yoga */

export const yogaApi = {
  async list(query: Query = {}): Promise<Paged<YogaRoutine>> {
    return api.get<Paged<YogaRoutine>>('/yoga', query);
  },

  async detail(id: string): Promise<YogaRoutine> {
    return api.get<YogaRoutine>(`/yoga/${id}`);
  },
};

/* --------------------------------------------------------------- nutrition */

export const nutritionApi = {
  async today(): Promise<NutritionToday> {
    return api.get<NutritionToday>('/nutrition/today');
  },

  async foods(query: Query = {}): Promise<Paged<Food>> {
    return api.get<Paged<Food>>('/nutrition/foods', query);
  },

  async food(id: string): Promise<Food> {
    return api.get<Food>(`/nutrition/foods/${id}`);
  },

  async logFood(payload: {
    foodId: string;
    grams: number;
    mealType: string;
    eatenAt?: string;
    servings?: number;
    servingName?: string;
    notes?: string;
  }): Promise<FoodLog> {
    return api.post<FoodLog>('/nutrition/food-logs', payload);
  },

  async updateFoodLog(id: string, patch: Record<string, unknown>): Promise<FoodLog> {
    return api.patch<FoodLog>(`/nutrition/food-logs/${id}`, patch);
  },

  async deleteFoodLog(id: string): Promise<void> {
    await api.delete<null>(`/nutrition/food-logs/${id}`);
  },

  async foodLogs(query: Query = {}): Promise<Paged<FoodLog>> {
    return api.get<Paged<FoodLog>>('/nutrition/food-logs', query);
  },
};

/* -------------------------------------------------------------- hydration */

export const hydrationApi = {
  async today(): Promise<HydrationToday> {
    return api.get<HydrationToday>('/hydration/today');
  },

  /** The write path is `/hydration/log`, and it returns the new totals only. */
  async add(amountMl: number, source?: 'quick_add' | 'custom' | 'bottle'): Promise<WaterLogResult> {
    return api.post<WaterLogResult>('/hydration/log', { amountMl, source });
  },

  /** The remove path is `/hydration/log/:id`. */
  async remove(entryId: string): Promise<WaterLogRemoval> {
    return api.delete<WaterLogRemoval>(`/hydration/log/${entryId}`);
  },
};

/* ---------------------------------------------------------------- progress */

export const progressApi = {
  async overview(days = 30): Promise<Progress> {
    return api.get<Progress>('/progress', { days });
  },

  /** A single day, not a collection. */
  async daily(day?: string): Promise<ProgressDay> {
    return api.get<ProgressDay>('/progress/daily', { day });
  },

  /**
   * Weight is written through the user routes, which also syncs the profile, so
   * the argument is `date` rather than `day`.
   */
  async logWeight(weightKg: number, date?: string): Promise<WeightLogResult> {
    return api.post<WeightLogResult>('/users/weight', { weightKg, date });
  },

  async sync(): Promise<{ streak: Streak; newAchievements: unknown[] }> {
    return api.post<{ streak: Streak; newAchievements: unknown[] }>('/progress/sync', {});
  },

  async streak(): Promise<Streak> {
    return api.get<Streak>('/progress/streak');
  },
};

/* ------------------------------------------------------------------- goals */

export const goalApi = {
  async list(query: Query = {}): Promise<Paged<Goal>> {
    return api.get<Paged<Goal>>('/goals', query);
  },

  async create(payload: {
    title: string;
    goalType: string;
    targetValue: number;
    unit: string;
    targetDate?: string;
    description?: string;
  }): Promise<Goal> {
    return api.post<Goal>('/goals', payload);
  },

  async update(id: string, patch: Record<string, unknown>): Promise<Goal> {
    return api.patch<Goal>(`/goals/${id}`, patch);
  },

  async remove(id: string): Promise<void> {
    await api.delete<null>(`/goals/${id}`);
  },
};

/* ----------------------------------------------------------- achievements */

export const achievementApi = {
  /** The list route splits earned from locked rather than returning `items`. */
  async list(): Promise<AchievementList> {
    return api.get<AchievementList>('/achievements');
  },

  async summary(): Promise<AchievementSummary> {
    return api.get<AchievementSummary>('/achievements/summary');
  },
};

/* ---------------------------------------------------------------------- ai */

export const aiApi = {
  /** The interesting recommendation is `primary`. */
  async recommendations(): Promise<Recommendation> {
    const data = await api.get<{ primary: Recommendation }>('/ai/recommendations');
    return data.primary;
  },

  /**
   * The assistant reads `message` from the *query string*, not the body, even
   * though the request is a POST, and the reply is spread at the top level.
   */
  async ask(message: string, conversationId?: string): Promise<AssistantReply> {
    return aiRequest<AssistantReply>('/ai/assistant', undefined, {
      query: { message, conversationId },
    });
  },

  async conversations(): Promise<unknown[]> {
    return api.get<unknown[]>('/ai/assistant/conversations');
  },
};

/* ---------------------------------------------------------- notifications */

export const notificationApi = {
  /** This route reports the unread count alongside the items. */
  async list(query: Query = {}): Promise<Paged<AppNotification> & { unreadCount?: number }> {
    return api.get<Paged<AppNotification> & { unreadCount?: number }>('/notifications', query);
  },

  async markRead(id: string): Promise<void> {
    await api.patch<null>(`/notifications/${id}/read`, {});
  },

  async markAllRead(): Promise<void> {
    await api.patch<null>('/notifications/read-all', {});
  },
};

/* --------------------------------------------------------------- community */

export const communityApi = {
  async list(query: Query = {}): Promise<Paged<CommunityPost>> {
    return api.get<Paged<CommunityPost>>('/community', query);
  },

  /**
   * The server has a single toggle endpoint rather than separate like/unlike
   * verbs, so callers pass the *desired* state and the response reports what
   * actually happened.
   */
  async toggleLike(id: string): Promise<LikeResult> {
    return api.post<LikeResult>(`/community/${id}/like`, {});
  },
};
