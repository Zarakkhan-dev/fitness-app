/**
 * Typed endpoint wrappers for every group in the MEPro API.
 *
 * Two rules hold throughout:
 *
 * 1. Envelopes are unwrapped here so no screen ever touches `data`.
 * 2. Shapes are taken from the server's controllers and validators, not from
 *    guesswork. Where the API nests tokens or splits a collection across
 *    `earned`/`locked`, the wrapper does the unwrapping instead of pushing it
 *    onto the caller.
 */

import { aiRequest, api } from '@/lib/api';
import type {
  AchievementList,
  AchievementStats,
  AchievementSummary,
  AccountSummary,
  AiStatus,
  AssistantConversation,
  AssistantReply,
  AuthResult,
  BmiResult,
  CommentList,
  CommunityPost,
  Dashboard,
  EvaluateResult,
  Food,
  FoodLog,
  Goal,
  GoalStats,
  HydrationDay,
  HydrationToday,
  LikeResult,
  MealPlan,
  NotificationPage,
  NotificationSettings,
  NutritionDay,
  NutritionToday,
  OnboardingState,
  Paged,
  Progress,
  ProgressDay,
  ProgressSummary,
  RangeSummary,
  RecommendationBundle,
  RecommendationHistoryItem,
  Streak,
  User,
  WaterLogRemoval,
  WaterLogResult,
  WeightLogResult,
  Workout,
  WorkoutCompleteResult,
  WorkoutSession,
  WorkoutStartResult,
  WorkoutStats,
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

  async bmi(query: { weightKg?: number; heightCm?: number } = {}): Promise<BmiResult> {
    return api.get<BmiResult>('/users/bmi', query);
  },

  async computeBmi(body: { weightKg?: number; heightCm?: number } = {}): Promise<BmiResult> {
    return api.post<BmiResult>('/users/bmi', body);
  },

  async setAvatar(avatarUrl: string | null): Promise<User> {
    return api.patch<User>('/users/avatar', { avatarUrl });
  },

  /** Writes a weight, syncs weight-sourced goals and refreshes the profile. */
  async logWeight(weightKg: number, date?: string): Promise<WeightLogResult> {
    return api.post<WeightLogResult>('/users/weight', { weightKg, date });
  },

  async onboarding(): Promise<OnboardingState> {
    return api.get<OnboardingState>('/users/onboarding');
  },

  async completeOnboarding(patch: Partial<User>): Promise<User> {
    return api.post<User>('/users/onboarding', patch);
  },

  async notificationSettings(): Promise<NotificationSettings> {
    return api.get<NotificationSettings>('/users/notification-settings');
  },

  async updateNotificationSettings(patch: Partial<NotificationSettings>): Promise<NotificationSettings> {
    return api.patch<NotificationSettings>('/users/notification-settings', patch);
  },

  async exportAccount(): Promise<Record<string, unknown>> {
    return api.get<Record<string, unknown>>('/users/account');
  },

  async deleteAccount(): Promise<{ deleted: boolean; removedData: AccountSummary }> {
    return api.delete<{ deleted: boolean; removedData: AccountSummary }>('/users/account');
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

  async session(id: string): Promise<WorkoutSession> {
    return api.get<WorkoutSession>(`/workouts/sessions/${id}`);
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

  async stats(): Promise<WorkoutStats> {
    return api.get<WorkoutStats>('/workouts/stats');
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

  /**
   * Records a finished routine. The server falls back to the routine's own
   * length when `durationMinutes` is omitted, so a read-through "done" button
   * still produces a sensible session.
   */
  async complete(
    yogaId: string,
    payload: { durationMinutes?: number; perceivedEffort?: number; notes?: string } = {},
  ): Promise<WorkoutCompleteResult> {
    return api.post<WorkoutCompleteResult>(`/yoga/${yogaId}/complete`, payload);
  },
};

/* ---------------------------------------------------------------- nutrition */

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

  async categories(): Promise<{ category: string; count: number }[]> {
    return api.get<{ category: string; count: number }[]>('/nutrition/foods/categories');
  },

  async logFood(payload: {
    foodId: string;
    grams?: number;
    mealType: string;
    eatenAt?: string;
    servings?: number;
    servingName?: string;
    notes?: string;
  }): Promise<FoodLog> {
    return api.post<FoodLog>('/nutrition/food-logs', payload);
  },

  /**
   * Logs a hand-entered food (no catalogue id). The macro values are the totals
   * for the amount being logged, so nothing is scaled per 100 g.
   */
  async logCustomFood(payload: {
    foodName: string;
    mealType: string;
    quantity?: number;
    unit?: string;
    calories: number;
    proteinG?: number;
    carbsG?: number;
    fatG?: number;
    fiberG?: number;
    sugarG?: number;
    sodiumMg?: number;
    eatenAt?: string;
    notes?: string;
  }): Promise<FoodLog> {
    return api.post<FoodLog>('/nutrition/food-logs/custom', payload);
  },

  async updateFoodLog(id: string, patch: Record<string, unknown>): Promise<FoodLog> {
    return api.patch<FoodLog>(`/nutrition/food-logs/${id}`, patch);
  },

  async deleteFoodLog(id: string): Promise<{ deleted: boolean; day?: string }> {
    return api.delete<{ deleted: boolean; day?: string }>(`/nutrition/food-logs/${id}`);
  },

  async foodLogs(query: Query = {}): Promise<Paged<FoodLog>> {
    return api.get<Paged<FoodLog>>('/nutrition/food-logs', query);
  },

  async history(query: Query = {}): Promise<NutritionDay[]> {
    return api.get<NutritionDay[]>('/nutrition/history', query);
  },

  async meals(day?: string): Promise<NutritionToday> {
    return api.get<NutritionToday>('/nutrition/meals', { day });
  },

  async todayMeals(): Promise<NutritionToday> {
    return api.get<NutritionToday>('/nutrition/meals/today');
  },

  async generateMealPlan(day?: string, regenerate = false): Promise<MealPlan> {
    return api.post<MealPlan>('/nutrition/meals/generate', undefined, {
      query: { day, regenerate: regenerate ? 'true' : 'false' },
    });
  },
};

/* -------------------------------------------------------------- hydration */

export const hydrationApi = {
  async today(): Promise<HydrationToday> {
    return api.get<HydrationToday>('/hydration/today');
  },

  async history(days = 7): Promise<HydrationDay[]> {
    return api.get<HydrationDay[]>('/hydration/history', { days });
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
  async daily(day?: string): Promise<ProgressDay | null> {
    return api.get<ProgressDay | null>('/progress/daily', { day });
  },

  async weekly(weeks = 8): Promise<RangeSummary[]> {
    return api.get<RangeSummary[]>('/progress/weekly', { weeks });
  },

  async monthly(months = 6): Promise<RangeSummary[]> {
    return api.get<RangeSummary[]>('/progress/monthly', { months });
  },

  async streak(): Promise<Streak> {
    return api.get<Streak>('/progress/streak');
  },

  async summary(): Promise<ProgressSummary> {
    return api.get<ProgressSummary>('/progress/summary');
  },

  async sync(): Promise<{ streak: Streak; newAchievements: unknown[] }> {
    return api.post<{ streak: Streak; newAchievements: unknown[] }>('/progress/sync', {});
  },
};

/* ------------------------------------------------------------------- goals */

export const goalApi = {
  async list(query: Query = {}): Promise<Paged<Goal>> {
    return api.get<Paged<Goal>>('/goals', query);
  },

  async detail(id: string): Promise<Goal> {
    return api.get<Goal>(`/goals/${id}`);
  },

  async create(payload: {
    title: string;
    goalType: string;
    targetValue: number;
    unit: string;
    targetDate?: string;
    description?: string;
    source?: string;
    currentValue?: number;
  }): Promise<Goal> {
    return api.post<Goal>('/goals', payload);
  },

  async update(id: string, patch: Record<string, unknown>): Promise<Goal> {
    return api.patch<Goal>(`/goals/${id}`, patch);
  },

  /** Set an absolute value or an increment; the server recomputes progress. */
  async setProgress(id: string, payload: { currentValue?: number; increment?: number }): Promise<Goal> {
    return api.post<Goal>(`/goals/${id}/progress`, payload);
  },

  async remove(id: string): Promise<void> {
    await api.delete<null>(`/goals/${id}`);
  },

  async stats(): Promise<GoalStats> {
    return api.get<GoalStats>('/goals/stats');
  },

  /** Refreshes every auto-sourced goal (weight, workout count, ...). */
  async sync(): Promise<Goal[]> {
    return api.post<Goal[]>('/goals/sync', {});
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

  async stats(): Promise<AchievementStats> {
    return api.get<AchievementStats>('/achievements/stats');
  },

  /** Idempotent: re-evaluates the catalogue and reports anything new. */
  async evaluate(): Promise<EvaluateResult> {
    return api.post<EvaluateResult>('/achievements/evaluate', {});
  },
};

/* ---------------------------------------------------------------------- ai */

export const aiApi = {
  async recommendations(force = false): Promise<RecommendationBundle> {
    return api.get<RecommendationBundle>('/ai/recommendations', { force });
  },

  async recommendationHistory(): Promise<RecommendationHistoryItem[]> {
    return api.get<RecommendationHistoryItem[]>('/ai/recommendations/history');
  },

  async sendFeedback(
    id: string,
    payload: { dismissed?: boolean; actedUpon?: boolean; rating?: number },
  ): Promise<{ updated: boolean }> {
    return api.post<{ updated: boolean }>(`/ai/recommendations/${id}/feedback`, payload);
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

  async conversations(): Promise<AssistantConversation[]> {
    const data = await api.get<AssistantConversation[] | { conversations: AssistantConversation[] }>(
      '/ai/assistant/conversations',
    );
    return Array.isArray(data) ? data : (data.conversations ?? []);
  },

  async conversation(id: string): Promise<AssistantConversation> {
    return api.get<AssistantConversation>(`/ai/assistant/conversations/${id}`);
  },

  async deleteConversation(id: string): Promise<{ deleted: boolean }> {
    return api.delete<{ deleted: boolean }>(`/ai/assistant/conversations/${id}`);
  },

  async suggestedQuestions(): Promise<string[]> {
    const data = await api.get<string[] | { questions: string[] }>('/ai/suggested-questions');
    return Array.isArray(data) ? data : (data.questions ?? []);
  },

  async status(): Promise<AiStatus> {
    return api.get<AiStatus>('/ai/status');
  },
};

/* ---------------------------------------------------------- notifications */

export const notificationApi = {
  /** This route reports the unread count alongside the items. */
  async list(query: Query = {}): Promise<NotificationPage> {
    return api.get<NotificationPage>('/notifications', query);
  },

  async unreadCount(): Promise<{ unreadCount: number }> {
    return api.get<{ unreadCount: number }>('/notifications/unread-count');
  },

  async markRead(id: string): Promise<unknown> {
    return api.patch<unknown>(`/notifications/${id}/read`, {});
  },

  async markAllRead(): Promise<unknown> {
    return api.patch<unknown>('/notifications/read-all', {});
  },

  async remove(id: string): Promise<{ removed: boolean }> {
    return api.delete<{ removed: boolean }>(`/notifications/${id}`);
  },

  async clearAll(): Promise<{ removed: number }> {
    return api.delete<{ removed: number }>('/notifications');
  },
};

/* --------------------------------------------------------------- community */

export const communityApi = {
  async list(query: Query = {}): Promise<Paged<CommunityPost>> {
    return api.get<Paged<CommunityPost>>('/community', query);
  },

  async mine(query: Query = {}): Promise<Paged<CommunityPost>> {
    return api.get<Paged<CommunityPost>>('/community/mine', query);
  },

  async detail(id: string): Promise<CommunityPost> {
    return api.get<CommunityPost>(`/community/${id}`);
  },

  async create(payload: {
    content: string;
    postType?: string;
    category?: string;
    relatedWorkoutId?: string;
    imageUrls?: string[];
  }): Promise<CommunityPost> {
    return api.post<CommunityPost>('/community', payload);
  },

  async remove(id: string): Promise<void> {
    await api.delete<unknown>(`/community/${id}`);
  },

  async comments(id: string): Promise<CommentList> {
    return api.get<CommentList>(`/community/${id}/comments`);
  },

  async addComment(id: string, content: string): Promise<unknown> {
    return api.post<unknown>(`/community/${id}/comments`, { content });
  },

  /**
   * The server has a single toggle endpoint rather than separate like/unlike
   * verbs, so callers pass the desired state implicitly and the response
   * reports what actually happened.
   */
  async toggleLike(id: string): Promise<LikeResult> {
    return api.post<LikeResult>(`/community/${id}/like`, {});
  },

  async report(id: string, reason: string): Promise<{ reported: boolean }> {
    return api.post<{ reported: boolean }>(`/community/${id}/report`, { reason });
  },
};
