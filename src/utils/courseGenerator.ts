import { Place, Companion, Transport, Intensity } from '../types';
import { haversineDistance } from './haversine';
import { PreferenceWeights, UserVector, VECTOR_DIMENSIONS, placeToFeatureVector } from './UserPreferenceModel';

export interface MealWindows {
  lunch?: { startMinutes: number; endMinutes: number };
  dinner?: { startMinutes: number; endMinutes: number };
}

export interface CourseGenerationOptions {
  startLocation: Place;
  userPreferences: PreferenceWeights | UserVector; // Support both legacy and new vector model
  weather: { temp: number; isRainy: boolean };
  startTime: Date; // Required: The course starts at this time
  endLocation?: Place | null; // Optional: The course MUST finish here
  endTime?: Date | null; // Optional: The course MUST finish by this time
  mustVisitPlaces?: Place[]; // List of Anchor points that must be visited
  lockedSteps?: Record<number, Place>; // index in sequence (excluding start at 0)
  mealWindows?: MealWindows;
  companion?: Companion; // Defaults to 'solo'
  transport?: Transport; // Defaults to 'foot'
  intensity?: Intensity; // Defaults to 'relaxed'
  duration?: number; // Total hours, e.g., 4 to 8, defaults to 6
}

export interface CourseStep {
  place: Place;
  startTime: Date;
  endTime: Date;
  travelTime?: number; // minutes to reach this place
}

export interface GeneratedCourse {
  sequence: Place[];
  steps: CourseStep[]; // Detailed timeline with times
  totalDistance: number; // km
  estimatedDuration: number; // minutes
}

type StepType = 'activity' | 'cafe' | 'restaurant' | 'bar' | 'culture' | 'shopping' | 'landmark' | 'bakery';

interface StepDefinition {
  label: string;
  preferredTypes: StepType[];
  fallbackTypes?: StepType[];
  mealType?: 'lunch' | 'dinner' | 'cafe';
  window?: { startMinutes: number; endMinutes: number }; // minutes since midnight
}

interface ScoreContext {
  userVector: UserVector;
  isRainy: boolean;
  temperature: number;
  distanceKm?: number;
  selectedPlaces?: Place[]; // For diversity penalty calculation
  companion?: Companion;
  transport?: Transport;
}

// Legacy interface for backward compatibility
interface LegacyScoreContext {
  preferences: PreferenceWeights;
  isRainy: boolean;
  temperature: number;
  distanceKm?: number;
  tags: string[];
}

export const DEFAULT_LUNCH_WINDOW = { startMinutes: 11 * 60 + 30, endMinutes: 13 * 60 + 30 }; // 11:30~13:30
export const DEFAULT_DINNER_WINDOW = { startMinutes: 17 * 60, endMinutes: 19 * 60 + 30 }; // 17:00~19:30

const KEYWORD_BONUS = ['steak', 'pasta', 'sushi', 'dining', 'lounge', 'bakery'];
const CHAIN_PENALTY = ['bhc', 'bbq', 'lotteria', 'mcdonald', 'burger king', 'gukbap'];

function minutesSinceMidnight(date: Date) {
  return date.getHours() * 60 + date.getMinutes();
}

function addMinutes(date: Date, minutes: number) {
  return new Date(date.getTime() + minutes * 60000);
}

function tagsForPlace(place: Place): string[] {
  const tags = new Set<string>();
  (place.themes || []).forEach((t) => tags.add(t));
  if (place.type) tags.add(place.type.charAt(0).toUpperCase() + place.type.slice(1));
  if (place.mealType) tags.add(place.mealType.charAt(0).toUpperCase() + place.mealType.slice(1));
  tags.add(place.isIndoor ? 'Indoor' : 'Outdoor');
  return Array.from(tags);
}

function isIndoor(place: Place) {
  if (place.isIndoor !== undefined) return place.isIndoor;
  return ['restaurant', 'cafe', 'shopping', 'culture', 'bar', 'bakery'].includes(place.type);
}

function calculateWeatherScore(context: ScoreContext, outdoor: boolean) {
  let score = 0;
  const { isRainy, temperature } = context;

  if (isRainy) {
    score += outdoor ? -200 : 30;
  }

  if (temperature > 30 || temperature < 0) {
    score += outdoor ? -50 : 0;
  }

  return score;
}

/**
 * Calculate cosine similarity between two vectors
 * Formula: (A · B) / (||A|| * ||B||)
 */
function cosineSimilarity(vecA: UserVector, vecB: UserVector): number {
  let dotProduct = 0;
  let normA = 0;
  let normB = 0;

  for (const dim of VECTOR_DIMENSIONS) {
    const a = vecA[dim] || 0;
    const b = vecB[dim] || 0;
    dotProduct += a * b;
    normA += a * a;
    normB += b * b;
  }

  const denominator = Math.sqrt(normA) * Math.sqrt(normB);
  if (denominator === 0) return 0;

  return dotProduct / denominator;
}

/**
 * Calculate diversity penalty using diminishing marginal utility
 * Penalty = 0.6^count where count is how many times this place type has appeared
 */
function calculateDiversityPenalty(place: Place, selectedPlaces: Place[]): number {
  if (!selectedPlaces || selectedPlaces.length === 0) return 1.0;

  // Count how many times this place type has been selected
  const typeCount = selectedPlaces.filter((p) => p.type === place.type).length;
  
  // Apply diminishing marginal utility: 0.6^count
  // First occurrence: 1.0 (no penalty)
  // Second occurrence: 0.6
  // Third occurrence: 0.36
  // etc.
  return Math.pow(0.6, typeCount);
}

/**
 * Calculate weather penalty (hard/soft constraints)
 */
function calculateWeatherPenalty(isRainy: boolean, temperature: number, isOutdoor: boolean): number {
  let penalty = 0;

  if (isRainy) {
    penalty += isOutdoor ? -200 : 30; // Heavy penalty for outdoor in rain
  }

  if (temperature > 30 || temperature < 0) {
    penalty += isOutdoor ? -50 : 0; // Penalty for extreme temperatures outdoors
  }

  return penalty;
}

/**
 * Calculate distance penalty based on transport mode
 */
function calculateDistancePenalty(distanceKm: number, transport: Transport): number {
  if (distanceKm === undefined) return 0;

  if (transport === 'foot') {
    // Stricter penalty for walking: max 1.5km between stops
    if (distanceKm > 1.5) {
      return -200; // Heavy penalty for distances > 1.5km
    } else {
      return -Math.max(0, (Math.exp(distanceKm / 5) - 1) * 30);
    }
  } else {
    // Car: less strict distance penalty
    return -Math.max(0, (Math.exp(distanceKm / 10) - 1) * 20);
  }
}

/**
 * Calculate companion-based bonus/penalty
 */
function calculateCompanionBonus(place: Place, companion: Companion): number {
  const nameLower = (place.name || '').toLowerCase();
  const placeType = place.type;
  let bonus = 0;

  if (companion === 'partner') {
    // Boost: atmosphere, dining, bars, cafes
    if (placeType === 'restaurant' || placeType === 'cafe' || placeType === 'bar') {
      bonus += 30;
    }
    if (nameLower.includes('romantic') || nameLower.includes('date') || nameLower.includes('couple')) {
      bonus += 40;
    }
    // Penalize: loud, family-oriented
    if (nameLower.includes('family') || nameLower.includes('kids') || nameLower.includes('playground')) {
      bonus -= 50;
    }
  } else if (companion === 'family') {
    // Boost: family-friendly, indoor, safe
    if (place.isIndoor) {
      bonus += 20;
    }
    if (placeType === 'activity' || placeType === 'landmark' || placeType === 'shopping') {
      bonus += 25;
    }
    // Penalize: bars, loud places, adult-only
    if (placeType === 'bar') {
      bonus -= 100;
    }
    if (nameLower.includes('bar') || nameLower.includes('pub') || nameLower.includes('club')) {
      bonus -= 80;
    }
  } else if (companion === 'friend') {
    // Boost: social places, cafes, activities
    if (placeType === 'cafe' || placeType === 'activity' || placeType === 'shopping') {
      bonus += 20;
    }
  } else if (companion === 'solo') {
    // Boost: quiet, introspective places
    if (placeType === 'cafe' || placeType === 'culture' || placeType === 'landmark') {
      bonus += 15;
    }
  }

  return bonus;
}

/**
 * Calculate keyword-based bonus/penalty
 */
function calculateKeywordScore(place: Place): number {
  const nameLower = (place.name || '').toLowerCase();
  let score = 0;

  if (KEYWORD_BONUS.some((kw) => nameLower.includes(kw))) {
    score += 20;
  }
  if (CHAIN_PENALTY.some((kw) => nameLower.includes(kw))) {
    score -= 100;
  }

  return score;
}

/**
 * Calculate place score using vector-based cosine similarity + diversity penalty
 * This is the new core scoring function
 */
export function calculatePlaceScore(
  place: Place,
  context: ScoreContext
): number {
  // Step A: Feature Vectorization
  const placeVector = placeToFeatureVector(place);

  // Step B: Cosine Similarity (The Core Score)
  // Result is 0.0 ~ 1.0, scale to 0-100 for consistency
  const similarityScore = cosineSimilarity(context.userVector, placeVector);
  let baseScore = similarityScore * 100;

  // Step C: Marginal Utility (Diversity Penalty)
  const diversityMultiplier = calculateDiversityPenalty(place, context.selectedPlaces || []);
  baseScore *= diversityMultiplier;

  // Step D: Weather Constraint (Keep existing)
  const outdoor = !isIndoor(place);
  const weatherPenalty = calculateWeatherPenalty(context.isRainy, context.temperature, outdoor);
  baseScore += weatherPenalty;

  // Additional factors
  baseScore += calculateKeywordScore(place);
  baseScore += calculateDistancePenalty(context.distanceKm || 0, context.transport || 'foot');
  
  if (context.companion) {
    baseScore += calculateCompanionBonus(place, context.companion);
  }

  return baseScore;
}

// Legacy function for backward compatibility
function preferenceMultiplier(tags: string[], prefs: PreferenceWeights) {
  if (tags.length === 0) return 1;
  const weights = tags.map((t) => prefs[t] ?? 1);
  const avg = weights.reduce((a, b) => a + b, 0) / weights.length;
  // Emphasize learned preferences more strongly
  const amplified = Math.pow(avg, 1.4);
  return Math.max(0.2, amplified);
}

/**
 * Legacy calculatePlaceScore for backward compatibility
 */
function calculatePlaceScoreLegacy(
  place: Place,
  context: LegacyScoreContext,
  companionContext?: CompanionContext
): number {
  let score = 100;
  const outdoor = !isIndoor(place);

  const nameLower = (place.name || '').toLowerCase();
  if (KEYWORD_BONUS.some((kw) => nameLower.includes(kw))) {
    score += 20;
  }
  if (CHAIN_PENALTY.some((kw) => nameLower.includes(kw))) {
    score -= 100;
  }

  score += calculateWeatherScore(context, outdoor);

  // Distance penalty - stricter for foot transport
  if (context.distanceKm !== undefined) {
    if (companionContext?.transport === 'foot') {
      // Stricter penalty for walking: max 1.5km between stops
      if (context.distanceKm > 1.5) {
        score -= 200; // Heavy penalty for distances > 1.5km
      } else {
        const penalty = Math.max(0, (Math.exp(context.distanceKm / 5) - 1) * 30);
        score -= penalty;
      }
    } else {
      // Car: less strict distance penalty
      const penalty = Math.max(0, (Math.exp(context.distanceKm / 10) - 1) * 20);
      score -= penalty;
    }
  }

  // Companion-based scoring
  if (companionContext?.companion) {
    const companion = companionContext.companion;
    const placeType = place.type;
    const placeName = nameLower;

    if (companion === 'partner') {
      // Boost: atmosphere, dining, bars, cafes
      if (placeType === 'restaurant' || placeType === 'cafe' || placeType === 'bar') {
        score += 30;
      }
      if (placeName.includes('romantic') || placeName.includes('date') || placeName.includes('couple')) {
        score += 40;
      }
      // Penalize: loud, family-oriented
      if (placeName.includes('family') || placeName.includes('kids') || placeName.includes('playground')) {
        score -= 50;
      }
    } else if (companion === 'family') {
      // Boost: family-friendly, indoor, safe
      if (place.isIndoor) {
        score += 20;
      }
      if (placeType === 'activity' || placeType === 'landmark' || placeType === 'shopping') {
        score += 25;
      }
      // Penalize: bars, loud places, adult-only
      if (placeType === 'bar') {
        score -= 100;
      }
      if (placeName.includes('bar') || placeName.includes('pub') || placeName.includes('club')) {
        score -= 80;
      }
    } else if (companion === 'friend') {
      // Boost: social places, cafes, activities
      if (placeType === 'cafe' || placeType === 'activity' || placeType === 'shopping') {
        score += 20;
      }
    } else if (companion === 'solo') {
      // Boost: quiet, introspective places
      if (placeType === 'cafe' || placeType === 'culture' || placeType === 'landmark') {
        score += 15;
      }
    }
  }

  const prefMult = preferenceMultiplier(context.tags, context.preferences);
  score *= prefMult;

  return score;
}

// Helper function to check if preferences is UserVector or legacy PreferenceWeights
function isUserVector(prefs: PreferenceWeights | UserVector): prefs is UserVector {
  return VECTOR_DIMENSIONS.every((dim) => dim in prefs);
}

// Convert legacy PreferenceWeights to UserVector
function convertToUserVector(prefs: PreferenceWeights | UserVector): UserVector {
  if (isUserVector(prefs)) {
    return prefs;
  }
  // Convert legacy preferences to vector (simple mapping)
  const vector: UserVector = { ...INITIAL_USER_VECTOR };
  // Map legacy tags to vector dimensions where possible
  if (prefs.Meat !== undefined) vector.Meat = Math.min(1.0, prefs.Meat);
  if (prefs.Seafood !== undefined) vector.Seafood = Math.min(1.0, prefs.Seafood);
  if (prefs.Quiet !== undefined) vector.Quiet = Math.min(1.0, prefs.Quiet);
  if (prefs.Active !== undefined) vector.Active = Math.min(1.0, prefs.Active);
  if (prefs.Indoor !== undefined) vector.Indoor = Math.min(1.0, prefs.Indoor);
  if (prefs.Outdoor !== undefined) vector.Nature = Math.min(1.0, prefs.Outdoor);
  if (prefs.Gourmet !== undefined) vector.Luxury = Math.min(1.0, prefs.Gourmet);
  return vector;
}

function travelMinutes(distanceKm: number, transport: Transport = 'foot'): number {
  if (transport === 'car') {
    // Car: ~3 minutes per km (faster), but add parking time
    const drivingTime = distanceKm * 3;
    const parkingTime = 10; // Fixed parking time per stop
    return Math.min(60, drivingTime) + parkingTime;
  } else {
    // Foot: ~12 minutes per km walking, with stricter distance limit
    return Math.min(90, distanceKm * 12);
  }
}

function validateWindow(
  step: StepDefinition,
  arriveAt: Date
): { ok: true; startAt: Date } | { ok: false } {
  if (!step.window) return { ok: true, startAt: arriveAt };
  const arriveMinutes = minutesSinceMidnight(arriveAt);
  if (arriveMinutes > step.window.endMinutes) return { ok: false };

  const startMinutes = Math.max(arriveMinutes, step.window.startMinutes);
  const startAt = new Date(arriveAt);
  startAt.setHours(Math.floor(startMinutes / 60), startMinutes % 60, 0, 0);
  return { ok: true, startAt };
}

function isValidForStep(place: Place, step: StepDefinition) {
  if (step.mealType === 'lunch' || step.mealType === 'dinner') {
    // Hard filter: restaurants only
    if (place.type !== 'restaurant') return false;
  }
  if (step.mealType === 'cafe' && place.type !== 'cafe' && place.type !== 'bakery') {
    return false;
  }
  return true;
}

function pickCandidate(
  allPlaces: Place[],
  stepIndex: number,
  step: StepDefinition,
  context: {
    visited: Set<string>;
    userVector: UserVector;
    isRainy: boolean;
    temperature: number;
    currentTime: Date;
    currentPlace: Place;
    lockedSteps?: Record<number, Place>;
    transport?: Transport;
    companion?: Companion;
    selectedPlaces?: Place[]; // For diversity penalty
  }
): { place: Place; distanceKm: number; startAt: Date; endAt: Date } | null {
  const locked = context.lockedSteps?.[stepIndex + 1]; // +1 because sequence includes start at 0
  if (locked && !context.visited.has(locked.id) && isValidForStep(locked, step)) {
    const distanceKm = haversineDistance(
      context.currentPlace.lat,
      context.currentPlace.lng,
      locked.lat,
      locked.lng
    );
    const arriveAt = addMinutes(context.currentTime, travelMinutes(distanceKm, context.transport));
    const windowCheck = validateWindow(step, arriveAt);
    if (windowCheck.ok) {
      const endAt = addMinutes(windowCheck.startAt, locked.estimatedDuration || 60);
      return { place: locked, distanceKm, startAt: windowCheck.startAt, endAt };
    }
  }

  const candidates = allPlaces.filter(
    (p) =>
      !context.visited.has(p.id) &&
      (step.preferredTypes.includes(p.type as StepType) ||
        (step.fallbackTypes || []).includes(p.type as StepType)) &&
      isValidForStep(p, step) &&
      (!step.mealType || !p.mealType || p.mealType === step.mealType)
  );

  if (candidates.length === 0) return null;

  let best: { place: Place; distanceKm: number; startAt: Date; endAt: Date; score: number } | null = null;

  for (const place of candidates) {
    const distanceKm = haversineDistance(
      context.currentPlace.lat,
      context.currentPlace.lng,
      place.lat,
      place.lng
    );

    // Filter out places too far for foot transport
    if (context.transport === 'foot' && distanceKm > 1.5) {
      continue;
    }

    const arriveAt = addMinutes(context.currentTime, travelMinutes(distanceKm, context.transport));
    const windowCheck = validateWindow(step, arriveAt);
    if (!windowCheck.ok) continue;

    const endAt = addMinutes(windowCheck.startAt, place.estimatedDuration || 60);
    
    // Use new vector-based scoring with diversity penalty
    const score = calculatePlaceScore(
      place,
      {
        userVector: context.userVector,
        isRainy: context.isRainy,
        temperature: context.temperature,
        distanceKm,
        selectedPlaces: context.selectedPlaces || [],
        companion: context.companion,
        transport: context.transport,
      }
    );

    if (!best || score > best.score) {
      best = { place, distanceKm, startAt: windowCheck.startAt, endAt, score };
    }
  }

  return best;
}

function buildSteps(
  mealWindows?: MealWindows,
  duration?: number,
  intensity?: Intensity
): StepDefinition[] {
  const lunchWindow = mealWindows?.lunch ?? DEFAULT_LUNCH_WINDOW;
  const dinnerWindow = mealWindows?.dinner ?? DEFAULT_DINNER_WINDOW;
  const totalHours = duration ?? 6;
  const isRelaxed = intensity === 'relaxed';

  const steps: StepDefinition[] = [];

  // Always start with warm-up
  steps.push({
    label: 'Warm-up',
    preferredTypes: ['activity', 'cafe', 'culture', 'shopping'],
  });

  // Add lunch if duration >= 4 hours
  if (totalHours >= 4) {
    steps.push({
      label: 'Lunch',
      preferredTypes: ['restaurant'],
      mealType: 'lunch',
      window: lunchWindow,
    });
  }

  // Afternoon activities - adjust based on intensity
  if (isRelaxed) {
    // Relaxed: fewer but longer stops
    steps.push({
      label: 'Afternoon',
      preferredTypes: ['activity', 'culture', 'landmark', 'shopping'],
      fallbackTypes: ['cafe'],
    });
  } else {
    // Packed: more stops
    steps.push({
      label: 'Afternoon Activity',
      preferredTypes: ['activity', 'culture', 'landmark'],
      fallbackTypes: ['shopping', 'cafe'],
    });
    if (totalHours >= 6) {
      steps.push({
        label: 'Afternoon Shopping',
        preferredTypes: ['shopping', 'culture'],
        fallbackTypes: ['cafe'],
      });
    }
  }

  // Cafe break - only if duration >= 5 hours
  if (totalHours >= 5) {
    steps.push({
      label: 'Cafe Break',
      preferredTypes: ['cafe', 'bakery'],
      mealType: 'cafe',
    });
  }

  // Add dinner if duration >= 6 hours
  if (totalHours >= 6) {
    steps.push({
      label: 'Dinner',
      preferredTypes: ['restaurant'],
      mealType: 'dinner',
      window: dinnerWindow,
    });
  }

  // Add evening activity if duration >= 7 hours
  if (totalHours >= 7) {
    steps.push({
      label: 'Evening',
      preferredTypes: ['activity', 'culture', 'landmark'],
      fallbackTypes: ['cafe'],
    });
  }

  return steps;
}

/**
 * Find the nearest place from a given location
 */
function findNearestPlace(
  from: Place,
  candidates: Place[],
  visited: Set<string>,
  transport: Transport
): { place: Place; distanceKm: number } | null {
  let nearest: { place: Place; distanceKm: number } | null = null;

  for (const place of candidates) {
    if (visited.has(place.id)) continue;

    const distanceKm = haversineDistance(from.lat, from.lng, place.lat, place.lng);

    // Filter by transport constraints
    if (transport === 'foot' && distanceKm > 1.5) continue;

    if (!nearest || distanceKm < nearest.distanceKm) {
      nearest = { place, distanceKm };
    }
  }

  return nearest;
}

/**
 * Find a place suitable for the current time (meal type matching)
 * Uses vector-based scoring with diversity penalty
 */
function findPlaceForTime(
  currentTime: Date,
  from: Place,
  allPlaces: Place[],
  visited: Set<string>,
  mealWindows: MealWindows | undefined,
  transport: Transport,
  baseDuration: number,
  maxEndTime: Date | null,
  hasHadLunch: boolean,
  hasHadDinner: boolean,
  userVector: UserVector,
  selectedPlaces: Place[],
  companion?: Companion,
  isRainy?: boolean,
  temperature?: number
): { place: Place; distanceKm: number; startAt: Date; endAt: Date; isMeal: boolean } | null {
  const currentMinutes = minutesSinceMidnight(currentTime);
  const lunchWindow = mealWindows?.lunch ?? DEFAULT_LUNCH_WINDOW;
  const dinnerWindow = mealWindows?.dinner ?? DEFAULT_DINNER_WINDOW;

  // Determine what type of place we need based on time
  let preferredTypes: StepType[] = ['activity', 'cafe', 'culture', 'shopping'];
  let mealType: 'lunch' | 'dinner' | 'cafe' | undefined = undefined;
  let window: { startMinutes: number; endMinutes: number } | undefined = undefined;
  let isMeal = false;

  // Only schedule lunch if we haven't had it yet and we're in the lunch window
  if (
    !hasHadLunch &&
    currentMinutes >= lunchWindow.startMinutes &&
    currentMinutes <= lunchWindow.endMinutes
  ) {
    preferredTypes = ['restaurant'];
    mealType = 'lunch';
    window = lunchWindow;
    isMeal = true;
  } 
  // Only schedule dinner if we haven't had it yet and we're in the dinner window
  else if (
    !hasHadDinner &&
    currentMinutes >= dinnerWindow.startMinutes &&
    currentMinutes <= dinnerWindow.endMinutes
  ) {
    preferredTypes = ['restaurant'];
    mealType = 'dinner';
    window = dinnerWindow;
    isMeal = true;
  } 
  // Afternoon - prefer cafe break (explicitly exclude restaurants)
  else if (currentMinutes > lunchWindow.endMinutes && currentMinutes < dinnerWindow.startMinutes) {
    preferredTypes = ['cafe', 'bakery'];
    mealType = 'cafe';
  }
  // Default: activity/cafe/culture/shopping - explicitly exclude restaurants
  // (restaurants should only be scheduled during meal windows when flags allow)

  const candidates = allPlaces.filter(
    (p) =>
      !visited.has(p.id) &&
      // Strict filtering: restaurants only allowed during meal windows
      (isMeal 
        ? (preferredTypes.includes(p.type as StepType) && (!mealType || !p.mealType || p.mealType === mealType))
        : (preferredTypes.includes(p.type as StepType) && p.type !== 'restaurant') // Explicitly exclude restaurants for non-meal steps
      )
  );

  if (candidates.length === 0) return null;

  // Score all candidates and pick the best one (not just nearest)
  let best: { place: Place; distanceKm: number; startAt: Date; endAt: Date; score: number } | null = null;

  for (const place of candidates) {
    const distanceKm = haversineDistance(from.lat, from.lng, place.lat, place.lng);

    // Filter by transport constraints
    if (transport === 'foot' && distanceKm > 1.5) continue;

    const travelTime = travelMinutes(distanceKm, transport);
    const arriveAt = addMinutes(currentTime, travelTime);

    // Validate time window if meal time
    let startAt = arriveAt;
    if (window) {
      const arriveMinutes = minutesSinceMidnight(arriveAt);
      if (arriveMinutes > window.endMinutes) continue; // Too late
      const startMinutes = Math.max(arriveMinutes, window.startMinutes);
      startAt = new Date(arriveAt);
      startAt.setHours(Math.floor(startMinutes / 60), startMinutes % 60, 0, 0);
    }

    const endAt = addMinutes(startAt, place.estimatedDuration || baseDuration);

    // Hard constraint: Check if this place would exceed duration limit
    if (maxEndTime && endAt > maxEndTime) continue;

    // Calculate score using vector-based model
    const score = calculatePlaceScore(
      place,
      {
        userVector,
        isRainy: isRainy ?? false,
        temperature: temperature ?? 20,
        distanceKm,
        selectedPlaces,
        companion,
        transport,
      }
    );

    if (!best || score > best.score) {
      best = { place, distanceKm, startAt, endAt, score };
    }
  }

  if (!best) return null;

  return {
    place: best.place,
    distanceKm: best.distanceKm,
    startAt: best.startAt,
    endAt: best.endAt,
    isMeal,
  };
}

export function generateCourse(
  allPlaces: Place[],
  options: CourseGenerationOptions
): GeneratedCourse | null {
  const {
    startLocation,
    userPreferences,
    weather,
    startTime,
    endLocation,
    endTime,
    mustVisitPlaces = [],
    lockedSteps,
    mealWindows,
    companion = 'solo',
    transport = 'foot',
    intensity = 'relaxed',
    duration = 6,
  } = options;

  if (!startLocation) return null;

  // Convert userPreferences to UserVector (supports both legacy and new format)
  const userVector = convertToUserVector(userPreferences);

  const sequence: Place[] = [startLocation];
  const courseSteps: CourseStep[] = [
    {
      place: startLocation,
      startTime: new Date(startTime),
      endTime: new Date(startTime),
      travelTime: 0,
    },
  ];
  const visited = new Set<string>([startLocation.id]);
  const selectedPlaces: Place[] = [startLocation]; // Track selected places for diversity penalty
  let totalDistance = 0;
  let currentPlace = startLocation;
  let currentTime = new Date(startTime);
  
  // Track meal states to prevent duplicate scheduling
  let hasHadLunch = false;
  let hasHadDinner = false;

  const baseDuration = intensity === 'relaxed' ? 90 : 60;
  
  // Hard constraint: Duration must be respected
  // Calculate the maximum end time based on duration (hard constraint)
  const durationEndTime = addMinutes(startTime, duration * 60);
  
  // Use the earlier of endTime (if provided) or duration-based end time
  // This ensures duration is always a hard constraint
  const maxEndTime = endTime 
    ? new Date(Math.min(endTime.getTime(), durationEndTime.getTime()))
    : durationEndTime;
  
  const targetEndLocation = endLocation;

  // Step 1: Route through must-visit places (anchors)
  const anchorsToVisit = [...mustVisitPlaces];
  if (targetEndLocation && !anchorsToVisit.find((p) => p.id === targetEndLocation.id)) {
    // Add end location as final anchor if not already in must-visit
    anchorsToVisit.push(targetEndLocation);
  }

  // Pathfinding: Start → Nearest Anchor → ... → Last Anchor → End
  for (const anchor of anchorsToVisit) {
    if (visited.has(anchor.id)) continue;

    // Check time constraint
    if (maxEndTime && currentTime >= maxEndTime) {
      // Time exceeded, try to add end location if not already added
      if (targetEndLocation && !visited.has(targetEndLocation.id)) {
        const distanceToEnd = haversineDistance(
          currentPlace.lat,
          currentPlace.lng,
          targetEndLocation.lat,
          targetEndLocation.lng
        );
        const travelTime = travelMinutes(distanceToEnd, transport);
        const arriveAt = addMinutes(currentTime, travelTime);

        if (!maxEndTime || arriveAt <= maxEndTime) {
          sequence.push(targetEndLocation);
          courseSteps.push({
            place: targetEndLocation,
            startTime: arriveAt,
            endTime: arriveAt,
            travelTime,
          });
          totalDistance += distanceToEnd;
          visited.add(targetEndLocation.id);
        }
      }
      break;
    }

    // Find path to anchor, filling gaps with suitable places
    while (currentPlace.id !== anchor.id) {
      // Check if we can reach anchor directly
      const distanceToAnchor = haversineDistance(
        currentPlace.lat,
        currentPlace.lng,
        anchor.lat,
        anchor.lng
      );

      if (transport === 'foot' && distanceToAnchor > 1.5) {
        // Too far, need intermediate stop
        const intermediate = findPlaceForTime(
          currentTime,
          currentPlace,
          allPlaces,
          visited,
          mealWindows,
          transport,
          baseDuration,
          maxEndTime,
          hasHadLunch,
          hasHadDinner,
          userVector,
          selectedPlaces,
          companion,
          weather.isRainy,
          weather.temp
        );

        if (!intermediate) {
          // Can't find intermediate, try direct to anchor anyway
          const travelTime = travelMinutes(distanceToAnchor, transport);
          const arriveAt = addMinutes(currentTime, travelTime);
          const endAt = addMinutes(arriveAt, anchor.estimatedDuration || baseDuration);

          if (maxEndTime && endAt > maxEndTime) break;

          sequence.push(anchor);
          courseSteps.push({
            place: anchor,
            startTime: arriveAt,
            endTime: endAt,
            travelTime,
          });
          totalDistance += distanceToAnchor;
          visited.add(anchor.id);
          currentPlace = anchor;
          currentTime = endAt;
          
          // Update meal flags if anchor is a restaurant during meal window
          const currentMinutes = minutesSinceMidnight(arriveAt);
          const lunchWindow = mealWindows?.lunch ?? DEFAULT_LUNCH_WINDOW;
          const dinnerWindow = mealWindows?.dinner ?? DEFAULT_DINNER_WINDOW;
          if (anchor.type === 'restaurant') {
            if (!hasHadLunch && currentMinutes >= lunchWindow.startMinutes && currentMinutes <= lunchWindow.endMinutes) {
              hasHadLunch = true;
            } else if (!hasHadDinner && currentMinutes >= dinnerWindow.startMinutes && currentMinutes <= dinnerWindow.endMinutes) {
              hasHadDinner = true;
            }
          }
          
          break;
        }

        // Add intermediate place
        sequence.push(intermediate.place);
        selectedPlaces.push(intermediate.place); // Track for diversity
        courseSteps.push({
          place: intermediate.place,
          startTime: intermediate.startAt,
          endTime: intermediate.endAt,
          travelTime: travelMinutes(intermediate.distanceKm, transport),
        });
        totalDistance += intermediate.distanceKm;
        visited.add(intermediate.place.id);
        currentPlace = intermediate.place;
        currentTime = intermediate.endAt;
        
        // Update meal flags if this was a meal
        if (intermediate.isMeal) {
          if (intermediate.place.mealType === 'lunch') {
            hasHadLunch = true;
          } else if (intermediate.place.mealType === 'dinner') {
            hasHadDinner = true;
          }
        }

        // Check time constraint
        if (maxEndTime && currentTime >= maxEndTime) break;
      } else {
        // Can reach anchor directly
        const travelTime = travelMinutes(distanceToAnchor, transport);
        const arriveAt = addMinutes(currentTime, travelTime);
        const endAt = addMinutes(arriveAt, anchor.estimatedDuration || baseDuration);

        if (maxEndTime && endAt > maxEndTime) break;

        sequence.push(anchor);
        selectedPlaces.push(anchor); // Track for diversity
        courseSteps.push({
          place: anchor,
          startTime: arriveAt,
          endTime: endAt,
          travelTime,
        });
        totalDistance += distanceToAnchor;
        visited.add(anchor.id);
        currentPlace = anchor;
        currentTime = endAt;
        
        // Update meal flags if anchor is a restaurant during meal window
        const currentMinutes = minutesSinceMidnight(arriveAt);
        const lunchWindow = mealWindows?.lunch ?? DEFAULT_LUNCH_WINDOW;
        const dinnerWindow = mealWindows?.dinner ?? DEFAULT_DINNER_WINDOW;
        if (anchor.type === 'restaurant') {
          if (!hasHadLunch && currentMinutes >= lunchWindow.startMinutes && currentMinutes <= lunchWindow.endMinutes) {
            hasHadLunch = true;
          } else if (!hasHadDinner && currentMinutes >= dinnerWindow.startMinutes && currentMinutes <= dinnerWindow.endMinutes) {
            hasHadDinner = true;
          }
        }
        
        break;
      }
    }
  }

  // Step 2: Fill remaining time with suitable places
  // Use maxEndTime which already includes duration constraint
  const targetEndTime = maxEndTime;

  while (currentTime < targetEndTime) {
    const remainingMinutes = (targetEndTime.getTime() - currentTime.getTime()) / 60000;
    if (remainingMinutes < 30) break; // Less than 30 minutes left

    const nextPlace = findPlaceForTime(
      currentTime,
      currentPlace,
      allPlaces,
      visited,
      mealWindows,
      transport,
      baseDuration,
      maxEndTime,
      hasHadLunch,
      hasHadDinner,
      userVector,
      selectedPlaces,
      companion,
      weather.isRainy,
      weather.temp
    );

    if (!nextPlace) break;

    // Check if adding this place would exceed time limit
    if (maxEndTime && nextPlace.endAt > maxEndTime) {
      // Try to add end location if specified
      if (targetEndLocation && !visited.has(targetEndLocation.id)) {
        const distanceToEnd = haversineDistance(
          currentPlace.lat,
          currentPlace.lng,
          targetEndLocation.lat,
          targetEndLocation.lng
        );
        const travelTime = travelMinutes(distanceToEnd, transport);
        const arriveAt = addMinutes(currentTime, travelTime);

        if (arriveAt <= maxEndTime) {
          sequence.push(targetEndLocation);
          courseSteps.push({
            place: targetEndLocation,
            startTime: arriveAt,
            endTime: arriveAt,
            travelTime,
          });
          totalDistance += distanceToEnd;
          visited.add(targetEndLocation.id);
        }
      }
      break;
    }

    sequence.push(nextPlace.place);
    selectedPlaces.push(nextPlace.place); // Track for diversity
    courseSteps.push({
      place: nextPlace.place,
      startTime: nextPlace.startAt,
      endTime: nextPlace.endAt,
      travelTime: travelMinutes(nextPlace.distanceKm, transport),
    });
    totalDistance += nextPlace.distanceKm;
    visited.add(nextPlace.place.id);
    currentPlace = nextPlace.place;
    currentTime = nextPlace.endAt;
    
    // Update meal flags if this was a meal
    if (nextPlace.isMeal) {
      if (nextPlace.place.mealType === 'lunch') {
        hasHadLunch = true;
      } else if (nextPlace.place.mealType === 'dinner') {
        hasHadDinner = true;
      }
    }
  }

  // Ensure end location is last if specified
  // Hard constraint: Only add if it doesn't exceed duration
  if (targetEndLocation && !visited.has(targetEndLocation.id)) {
    const distanceToEnd = haversineDistance(
      currentPlace.lat,
      currentPlace.lng,
      targetEndLocation.lat,
      targetEndLocation.lng
    );
    const travelTime = travelMinutes(distanceToEnd, transport);
    const arriveAt = addMinutes(currentTime, travelTime);

    // Hard constraint: Check duration limit
    if (!maxEndTime || arriveAt <= maxEndTime) {
      sequence.push(targetEndLocation);
      courseSteps.push({
        place: targetEndLocation,
        startTime: arriveAt,
        endTime: arriveAt,
        travelTime,
      });
      totalDistance += distanceToEnd;
    }
  }

  const finalTime = courseSteps.length > 0 ? courseSteps[courseSteps.length - 1].endTime : currentTime;
  const estimatedDuration = Math.round(
    (finalTime.getTime() - new Date(startTime).getTime()) / 60000
  );

  return {
    sequence,
    steps: courseSteps,
    totalDistance: Math.round(totalDistance * 10) / 10,
    estimatedDuration,
  };
}

