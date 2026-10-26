/**
 * Response types.
 *
 * Every shape here was read off a live response from the running API rather
 * than assumed, because the naming is not what you would guess: calories are
 * `estimatedCalories`, the yoga level is `level` (not `difficulty`), the fibre
 * field is `fiberG`, and the token lifetime is `accessTokenExpiresIn`.
 *
 * Only fields the app actually reads are modelled. Optional fields are ones
 * the server populates conditionally (an avatar that was never set, a session
 * that has not started), so they must not be dereferenced without a guard.
 */

/* ------------------------------------------------------------------ common */

/** Every successful response is wrapped in this envelope. */
export interface Envelope<T> {
  success: true;
  data: T;
  message?: string;
}

/**
 * One validation problem from the server. A `field` is present when the message
 * belongs to a specific input, which is how form errors get placed.
 */
export interface ApiErrorDetail {
  field?: string;
  message: string;
  code?: string;
  /** Sent with rate-limit responses. */
  retryAfterSeconds?: number;
}

/** The envelope as it arrives, including the error-only fields. */
export interface ApiEnvelope<T> {
  success: boolean;
  data?: T;
  message?: string;
  code?: string;
  errors?: ApiErrorDetail[];
}

/**
 * Two pagination shapes are in use, so `meta` is optional and the flat
 * pagination fields are optional too. Read `items`; treat the rest as optional.
 */
export interface Paged<T> {
  items: T[];
  meta?: { page?: number; limit?: number; total?: number; totalPages?: number };
  page?: number;
  limit?: number;
  total?: number;
  totalPages?: number;
  hasNextPage?: boolean;
  hasPrevPage?: boolean;
}

export interface Id {
  _id: string;
}

/* -------------------------------------------------------------------- auth */

/** Login and register both return this. */
export interface AuthResult {
  user: User;
  tokens: Tokens;
}

export interface Tokens {
  accessToken: string;
  refreshToken: string;
  /** Seconds until the access token expires, not an absolute timestamp. */
  accessTokenExpiresIn: number;
  tokenType: string;
}

export interface User extends Id {
  name: string;
  email: string;
  avatarUrl?: string | null;
  age?: number | null;
  gender?: string | null;
  heightCm?: number | null;
  weightKg?: number | null;
  targetWeightKg?: number | null;
  bmi?: number | null;
  bmiCategory?: string | null;
  activityLevel?: string | null;
  fitnessLevel?: string | null;
  dietPreference?: string | null;
  allergies?: string[];
  dislikedFoods?: string[];
  /** Goal enum values selected during onboarding, e.g. `['weight_loss']`. */
  goals?: string[];
  /** Weekday numbers 0 (Sunday) to 6 (Saturday), not day names. */
  preferredDays?: number[];
  /** One or more places the user trains, e.g. `['gym', 'home']`. */
  preferredWorkoutLocation?: string[];
  preferredWorkoutMinutes?: number | null;
  dailyCalorieTarget?: number | null;
  dailyWaterTargetMl?: number | null;
  streak: number;
  longestStreak?: number;
  achievementPoints?: number;
  totalWorkouts?: number;
  totalYogaSessions?: number;
  totalWorkoutMinutes?: number;
  mealCount?: number;
  onboardingCompleted?: boolean;
  onboardingStep?: string | null;
  role?: string;
  createdAt?: string;
  updatedAt?: string;
}

/* --------------------------------------------------------------- dashboard */

export interface Streak {
  current: number;
  longest: number;
  activeToday: boolean;
  lastActiveDay?: string | null;
  milestones?: StreakMilestone[];
}

export interface StreakMilestone {
  days: number;
  label: string;
  reached: boolean;
}

/** One day of history. Shared by the dashboard week, progress series and daily. */
export interface ProgressDay {
  day: string;
  date?: string;
  weightKg?: number | null;
  bmi?: number | null;
  caloriesConsumed?: number;
  caloriesBurned?: number;
  calorieTarget?: number;
  waterMl?: number;
  waterTargetMl?: number;
  workoutMinutes?: number;
  workoutCount?: number;
  yogaCount?: number;
  foodLogs?: number;
}

export interface MacroRing {
  target: number;
  consumed: number;
  burned: number;
  remaining: number;
  percent: number;
}

export interface Dashboard {
  greeting: string;
  userName: string;
  /** `YYYY-MM-DD`. */
  date: string;
  streak: Streak;
  today: {
    calories: MacroRing;
    nutrition?: {
      target?: number;
      consumed?: number;
      proteinG?: number;
      carbsG?: number;
      fatG?: number;
    };
    water: { targetMl: number; totalMl: number; percent: number; remainingMl: number };
    workout: { targetMinutes: number; minutes: number; sessions: number; caloriesBurned: number; percent: number };
    bmi?: number | null;
  };
  week: ProgressDay[];
  goals: Goal[];
  achievementSummary: AchievementSummary;
  notifications: { unreadCount: number };
  activeSession?: WorkoutSession | null;
  recommendation?: Recommendation | null;
  recommendationProvider?: string;
  disclaimer?: string;
  generatedAt?: string;
}

/** Returned by the AI recommendation endpoints and embedded in the dashboard. */
export interface Recommendation {
  type: string;
  title: string;
  reason: string;
  recommendation: string;
}

/* ---------------------------------------------------------------- workouts */

export interface Workout extends Id {
  slug: string;
  title: string;
  description: string;
  category: string;
  difficulty: string;
  durationMinutes: number;
  estimatedCalories: number;
  location?: string;
  equipment?: string[];
  equipmentNotes?: string;
  muscleGroups?: string[];
  benefits?: string[];
  contraindications?: string[];
  avoidIf?: string[];
  warmup?: string[];
  cooldown?: string[];
  imageUrl?: string;
  videoUrl?: string;
  popularity?: number;
  isActive?: boolean;
  /** Present on the detail route only. */
  exercises?: Exercise[];
}

export interface Exercise {
  name: string;
  order: number;
  sets?: number;
  reps?: string;
  durationSeconds?: number;
  holdSeconds?: number;
  restSeconds?: number;
  caloriesPerMinute?: number;
  equipment?: string;
  description?: string;
  instructions?: string[];
  tips?: string[];
  commonMistakes?: string[];
  muscleGroups?: string[];
  imageUrl?: string;
  videoUrl?: string;
}

export interface CompletedExercise {
  exerciseOrder: number;
  name: string;
  durationSeconds?: number;
  caloriesBurned?: number;
  completedAt?: string;
}

export interface WorkoutSession extends Id {
  /** Exactly one of workoutId / yogaId is set. */
  workoutId?: string | null;
  yogaId?: string | null;
  /** The session stores its own `title`, not a joined workout title. */
  title?: string;
  day?: string;
  startedAt?: string;
  completedAt?: string | null;
  durationMinutes?: number;
  caloriesBurned?: number;
  status?: 'in_progress' | 'completed' | 'abandoned';
  difficulty?: string;
  category?: string;
  exercisesCompleted?: number;
  exercisesTotal?: number;
  perceivedEffort?: number;
  notes?: string;
  completedExercises?: CompletedExercise[];
}

/** `POST /workouts/:id/start` returns the session alongside its workout. */
export interface WorkoutStartResult {
  session: WorkoutSession;
  workout: Workout;
  /** True when an in-progress session for this workout was reused. */
  resumed: boolean;
}

/** The day totals rolled up by the backend after a completed session. */
export interface DayTotals {
  workoutMinutes: number;
  workoutCount: number;
  yogaCount: number;
}

/** `POST /workouts/:id/complete` wraps the session with its side effects. */
export interface WorkoutCompleteResult {
  session: WorkoutSession;
  caloriesBurned: number;
  progressUpdated: boolean;
  newAchievements: unknown[];
  dayTotals: DayTotals;
}

/* -------------------------------------------------------------------- yoga */

export interface YogaRoutine extends Id {
  slug: string;
  title: string;
  description: string;
  category: string;
  /** The yoga level field is `level`; `difficulty` also appears on some rows. */
  level?: string;
  difficulty?: string;
  durationMinutes: number;
  focusAreas?: string[];
  benefits?: string[];
  contraindications?: string[];
  precautions?: string[];
  bestTimeOfDay?: string;
  imageUrl?: string;
  videoUrl?: string;
  popularity?: number;
  isActive?: boolean;
  /** Present on the detail route only. */
  asanas?: Asana[];
}

export interface Asana {
  name: string;
  sanskritName?: string;
  order: number;
  holdSeconds?: number;
  side?: string;
  description?: string;
  instructions?: string[];
  benefits?: string[];
  precautions?: string[];
  modifications?: string[];
  imageUrl?: string;
  videoUrl?: string;
}

/* --------------------------------------------------------------- nutrition */

export interface MealTotals {
  mealType: string;
  calories: number;
  items: FoodLog[];
}

export interface NutritionToday {
  day: string;
  target: number;
  consumed: number;
  burned: number;
  remaining: number;
  proteinG: number;
  carbsG: number;
  fatG: number;
  fiberG: number;
  byMeal: MealTotals[];
  mealsLogged: number;
  targetMet: boolean;
  disclaimer?: string;
}

export interface Serving {
  name: string;
  grams: number;
  isDefault?: boolean;
}

export interface Food extends Id {
  slug: string;
  name: string;
  localName?: string;
  category: string;
  /** Per 100 g, as stored. Multiply by `grams / 100` for the logged amount. */
  calories: number;
  proteinG: number;
  carbsG: number;
  fatG: number;
  fiberG: number;
  sugarG?: number;
  sodiumMg?: number;
  servings?: Serving[];
  defaultServingGrams?: number;
  healthScore?: number;
  dietTags?: string[];
  dietaryFlags?: string[];
  allergens?: string[];
  origin?: string;
  imageUrl?: string;
  isCommon?: boolean;
  isActive?: boolean;
}

export interface Macros {
  calories: number;
  proteinG: number;
  carbsG: number;
  fatG: number;
  fiberG?: number;
  sugarG?: number;
  sodiumMg?: number;
}

export interface FoodLog extends Id {
  day: string;
  eatenAt?: string;
  mealType: string;
  foodId?: string | null;
  /** `custom` when the user typed the macros instead of picking a Food row. */
  source?: 'catalogue' | 'custom';
  foodName: string;
  foodLocalName?: string;
  foodCategory?: string;
  grams: number;
  servings?: number;
  servingName?: string;
  notes?: string;
  /** Totals for the logged `grams`, not per 100 g. */
  nutrition: Macros;
}

export interface WaterEntry {
  _id?: string;
  amountMl: number;
  day?: string;
  loggedAt?: string;
}

export interface HydrationToday {
  day: string;
  totalMl: number;
  targetMl: number;
  percent: number;
  glasses: number;
  remainingMl: number;
  nextReminderInMinutes?: number;
  entries?: WaterEntry[];
}

/** `POST /hydration/log` returns the new totals, not the whole day summary. */
export interface WaterLogResult {
  log: WaterEntry & { _id: string };
  totalMl: number;
  targetMl: number;
  percent: number;
}

export interface WaterLogRemoval {
  deleted: boolean;
  day: string;
}

/* ---------------------------------------------------------------- progress */

/** `POST /users/weight` also updates the profile, and returns both weights. */
export interface WeightLogResult {
  day: string;
  weightKg: number;
  bmi: number | null;
  profileWeightKg: number;
  disclaimer?: string;
}

export interface CategoryCount {
  category: string;
  count: number;
  minutes: number;
}

export interface Progress {
  range: { days: number; from: string; to: string };
  series: ProgressDay[];
  streak: Streak;
  weightHistory: { day: string; weightKg: number | null; bmi: number | null }[];
  workoutStats: {
    totalSessions: number;
    totalMinutes: number;
    totalCalories: number;
    averageDurationMinutes?: number;
    byCategory: CategoryCount[];
    byDifficulty?: { difficulty: string; count: number }[];
  };
}

/* ------------------------------------------------------------------- goals */

export interface GoalMilestone {
  target: number;
  label?: string;
  reached?: boolean;
  reachedAt?: string | null;
}

export interface Goal extends Id {
  title: string;
  description?: string;
  goalType: string;
  targetValue: number;
  currentValue: number;
  baselineValue?: number;
  unit: string;
  progressPercent: number;
  status: string;
  source?: string;
  startDate?: string;
  targetDate?: string;
  completedAt?: string | null;
  lastSyncedAt?: string;
  milestones?: GoalMilestone[];
  createdAt?: string;
  updatedAt?: string;
}

/* ------------------------------------------------------------ achievements */

export interface Achievement {
  key: string;
  title: string;
  description: string;
  icon?: string;
  tier: string;
  points: number;
  category?: string;
  threshold?: number;
  progress?: number;
  progressPercent?: number;
  earned: boolean;
  earnedAt?: string | null;
}

export interface AchievementSummary {
  totalPoints: number;
  earnedCount: number;
  totalCount: number;
  recent: Achievement[];
}

export interface AchievementList {
  earned: Achievement[];
  locked: Achievement[];
  totalPoints: number;
}

/* ---------------------------------------------------------------------- ai */

/**
 * `POST /ai/assistant` spreads the reply at the top level, so `data.reply` is the
 * answer string and every other field is a sibling rather than nested under it.
 */
export interface AssistantReply {
  reply: string;
  intent: string;
  confidence: number;
  provider: 'transformers' | 'rules';
  usedFallback: boolean;
  safetyFlags: string[];
  /** When true the client is expected to steer the user to a professional. */
  requiresProfessionalReferral: boolean;
  suggestedActions: string[];
  sources: string[];
  providerUnavailable?: boolean;
  conversationId?: string;
}

/* ------------------------------------------------------------- community */

/** `POST /community/:id/like` toggles, and reports the resulting state. */
export interface LikeResult {
  liked: boolean;
  likeCount: number;
}

/* ----------------------------------------------------------- notifications */

export interface AppNotification extends Id {
  title: string;
  body: string;
  type: string;
  icon?: string;
  actionLabel?: string;
  actionUrl?: string;
  data?: Record<string, unknown>;
  read: boolean;
  readAt?: string | null;
  pushStatus?: string;
  pushError?: string | null;
  pushSentAt?: string | null;
  scheduledFor?: string | null;
  sentAt?: string | null;
  createdAt?: string;
}

/* --------------------------------------------------------------- community */

export interface CommunityPost extends Id {
  content: string;
  userId: string;
  authorName: string;
  authorAvatarUrl?: string | null;
  category?: string;
  postType?: string;
  relatedWorkoutId?: string | null;
  imageUrls?: string[];
  commentCount: number;
  likeCount?: number;
  likesCount?: number;
  likedByMe?: boolean;
  reportCount?: number;
  isHidden?: boolean;
  createdAt?: string;
}

/* ------------------------------------------------- web additions (parity) */

/** A comment on a community post, as embedded by the server. */
export interface Comment extends Id {
  userId: string;
  userName: string;
  content: string;
  createdAt?: string;
}

export interface CommentList {
  comments: Comment[];
  total: number;
}

/** `GET /goals/stats`. */
export interface GoalStats {
  total: number;
  active: number;
  completed: number;
  completionRate: number;
  points: number;
}

/** `GET /achievements/stats`. */
export interface AchievementStats {
  byCategory: Record<string, { earned: number; total: number }>;
}

/** `GET /achievements/evaluate` re-awards and reports what is new. */
export interface EvaluateResult {
  earned: Achievement[];
  count: number;
}

/** Weekly and monthly rollups share one shape. */
export interface RangeSummary {
  range: { from: string; to: string; days: number };
  totals: {
    workouts: number;
    yogaSessions: number;
    workoutMinutes: number;
    caloriesBurned: number;
    caloriesConsumed: number;
    waterMl: number;
    foodLogs: number;
    activeDays: number;
  };
  averages: {
    caloriesConsumed: number;
    waterMl: number;
    workoutMinutes: number;
    workoutsPerDay: number;
  };
  weightChangeKg: number | null;
  bestDay: { day: string; workoutMinutes: number } | null;
  consistencyPercent: number;
}

export interface HydrationDay {
  day: string;
  totalMl: number;
  targetMl: number;
  percent: number;
}

export interface NutritionHistoryPoint {
  day: string;
  calories: number;
  proteinG: number;
  carbsG: number;
  fatG: number;
  meals: number;
}

/** `GET /progress/summary` bundles four series for one card-heavy screen. */
export interface ProgressSummary {
  streak: Streak;
  achievements: AchievementSummary;
  nutritionHistory: NutritionHistoryPoint[];
  hydrationHistory: HydrationDay[];
}

/** `GET /workouts/stats`. */
export interface WorkoutStats {
  totalSessions: number;
  totalMinutes: number;
  totalCalories: number;
  byCategory: CategoryCount[];
  byDifficulty: { difficulty: string; count: number }[];
  averageDurationMinutes: number;
}

/** One generated meal in a plan. */
export interface MealPlanItem {
  foodId: string;
  foodName: string;
  servings: number;
  servingName: string;
  grams: number;
  calories: number;
  proteinG: number;
  carbsG: number;
  fatG: number;
}

export interface MealPlan {
  day: string;
  title?: string;
  notes?: string;
  meals: {
    mealType: string;
    calories: number;
    items: MealPlanItem[];
  }[];
}

/** `GET /nutrition/history` and the daily series of `GET /nutrition/meals`. */
export interface NutritionDay {
  day: string;
  calories: number;
  proteinG: number;
  carbsG: number;
  fatG: number;
  meals: number;
}

/** `GET|POST /users/bmi`. Always carries a screening disclaimer. */
export interface BmiResult {
  bmi: number;
  category: string;
  weightKg: number;
  heightCm: number;
  disclaimer?: string;
}

export interface OnboardingState {
  onboardingCompleted: boolean;
  onboardingStep: string;
  nextStep: string | null;
  requiredFieldsMissing: string[];
  progressPercent: number;
}

export interface NotificationSettings {
  workoutReminders: boolean;
  waterReminders: boolean;
  mealReminders: boolean;
  motivation: boolean;
  achievements: boolean;
  aiRecommendations: boolean;
  quietHoursStart?: string;
  quietHoursEnd?: string;
  reminderTimes?: string[];
}

/** `DELETE /users/account` reports how much was removed. */
export interface AccountSummary {
  workoutSessions: number;
  foodLogs: number;
  waterLogs: number;
  goals: number;
  achievements: number;
  notifications: number;
  posts: number;
}

export interface RecommendationBundle {
  primary: Recommendation;
  workout: Recommendation;
  nutrition: Recommendation;
  hydration: Recommendation;
  yoga: Recommendation;
  provider: 'transformers' | 'rules';
  generatedAt: string;
  expiresAt: string;
  cached: boolean;
  disclaimer: string;
  streak: number;
  userName: string;
}

export interface RecommendationHistoryItem extends Id {
  type: string;
  title: string;
  reason: string;
  recommendation: string;
  nextAction?: string;
  provider?: string;
  day?: string;
  dismissed?: boolean;
  actedUpon?: boolean;
  userRating?: number | null;
  createdAt?: string;
}

export interface AssistantMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
  intent?: string;
  confidence?: number | null;
  provider?: string;
  usedFallback?: boolean;
  safetyFlags?: string[];
  sources?: string[];
  suggestedActions?: string[];
}

export interface AssistantConversation extends Id {
  title?: string;
  messageCount?: number;
  lastMessageAt?: string;
  createdAt?: string;
  updatedAt?: string;
  messages?: AssistantMessage[];
}

export interface AiStatus {
  ready: boolean;
}

export interface ConversationListResult {
  conversations?: AssistantConversation[];
}

/** Notification list responses carry the unread badge alongside the page. */
export type NotificationPage = Paged<AppNotification> & { unreadCount: number };
