import { Place } from '../types';

export type PreferenceWeights = Record<string, number>;

export const INITIAL_PREFERENCES: PreferenceWeights = {
  Meat: 1.0,
  Seafood: 1.0,
  Quiet: 1.0,
  Active: 1.0,
  Indoor: 1.0,
  Outdoor: 1.0,
  Gourmet: 1.0,
  Nightlife: 1.0,
  Shopping: 1.0,
  Culture: 1.0,
  Cafe: 1.0,
};

export function extractTagsFromPlace(place: Place): string[] {
  const tags = new Set<string>();
  (place.themes || []).forEach((t) => tags.add(t));
  if (place.type) {
    tags.add(place.type.charAt(0).toUpperCase() + place.type.slice(1));
  }
  if (place.mealType) {
    tags.add(place.mealType.charAt(0).toUpperCase() + place.mealType.slice(1));
  }
  tags.add(place.isIndoor ? 'Indoor' : 'Outdoor');
  return Array.from(tags);
}

export function updatePreference(
  place: Place,
  action: 'LIKE' | 'DISLIKE',
  current: PreferenceWeights
): PreferenceWeights {
  const delta = action === 'LIKE' ? 0.1 : -0.2;
  const tags = extractTagsFromPlace(place);
  const next: PreferenceWeights = { ...current };

  for (const tag of tags) {
    const key = tag;
    const prev = next[key] ?? 1.0;
    next[key] = Math.max(0.1, parseFloat((prev + delta).toFixed(3)));
  }

  return next;
}


