import { Place, Companion, Transport, Intensity } from '../types';
import { haversineDistance } from './haversine';
import { PreferenceWeights } from './UserPreferenceModel';

export interface MealWindows {
  lunch?: { startMinutes: number; endMinutes: number };
  dinner?: { startMinutes: number; endMinutes: number };
}

export interface CourseGenerationOptions {
  startLocation: Place;
  userPreferences: PreferenceWeights;
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

function preferenceMultiplier(tags: string[], prefs: PreferenceWeights) {
  if (tags.length === 0) return 1;
  const weights = tags.map((t) => prefs[t] ?? 1);
  const avg = weights.reduce((a, b) => a + b, 0) / weights.length;
  // Emphasize learned preferences more strongly
  const amplified = Math.pow(avg, 1.4);
  return Math.max(0.2, amplified);
}

interface CompanionContext {
  companion?: Companion;
  transport?: Transport;
}

export function calculatePlaceScore(
  place: Place,
  context: ScoreContext,
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
    preferences: PreferenceWeights;
    isRainy: boolean;
    temperature: number;
    currentTime: Date;
    currentPlace: Place;
    lockedSteps?: Record<number, Place>;
    transport?: Transport;
    companion?: Companion;
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
    const tags = tagsForPlace(place);
    const score = calculatePlaceScore(
      place,
      {
        preferences: context.preferences,
        isRainy: context.isRainy,
        temperature: context.temperature,
        distanceKm,
        tags,
      },
      {
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
  hasHadDinner: boolean
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

  // Find nearest suitable place
  const nearest = findNearestPlace(from, candidates, visited, transport);
  if (!nearest) return null;

  const travelTime = travelMinutes(nearest.distanceKm, transport);
  const arriveAt = addMinutes(currentTime, travelTime);

  // Validate time window if meal time
  let startAt = arriveAt;
  if (window) {
    const arriveMinutes = minutesSinceMidnight(arriveAt);
    if (arriveMinutes > window.endMinutes) return null; // Too late
    const startMinutes = Math.max(arriveMinutes, window.startMinutes);
    startAt = new Date(arriveAt);
    startAt.setHours(Math.floor(startMinutes / 60), startMinutes % 60, 0, 0);
  }

  const endAt = addMinutes(startAt, nearest.place.estimatedDuration || baseDuration);

  // Hard constraint: Check if this place would exceed duration limit
  if (maxEndTime && endAt > maxEndTime) {
    return null; // Would exceed duration
  }

  return {
    place: nearest.place,
    distanceKm: nearest.distanceKm,
    startAt,
    endAt,
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
          hasHadDinner
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
      hasHadDinner
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

