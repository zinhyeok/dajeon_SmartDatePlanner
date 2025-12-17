import { Place } from '../types';

// Vector dimensions for preference matching
export const VECTOR_DIMENSIONS = [
  'Meat',
  'Seafood',
  'Noodle',
  'Rice',
  'Bread',
  'Quiet',
  'Active',
  'Indoor',
  'Nature',
  'Luxury',
] as const;

export type VectorDimension = typeof VECTOR_DIMENSIONS[number];
export type UserVector = Record<VectorDimension, number>;

// Legacy type for backward compatibility during transition
export type PreferenceWeights = Record<string, number>;

// Initialize user vector with neutral values (0.5)
export const INITIAL_USER_VECTOR: UserVector = {
  Meat: 0.5,
  Seafood: 0.5,
  Noodle: 0.5,
  Rice: 0.5,
  Bread: 0.5,
  Quiet: 0.5,
  Active: 0.5,
  Indoor: 0.5,
  Nature: 0.5,
  Luxury: 0.5,
};

// Legacy initial preferences for backward compatibility
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

/**
 * Convert a Place to a feature vector based on its characteristics
 */
export function placeToFeatureVector(place: Place): UserVector {
  const vector: UserVector = { ...INITIAL_USER_VECTOR };
  const nameLower = (place.name || '').toLowerCase();
  const descriptionLower = (place.description || '').toLowerCase();
  const combinedText = `${nameLower} ${descriptionLower}`;

  // Food type detection
  if (combinedText.includes('steak') || combinedText.includes('meat') || combinedText.includes('bbq') || combinedText.includes('grill')) {
    vector.Meat = 1.0;
  }
  if (combinedText.includes('seafood') || combinedText.includes('fish') || combinedText.includes('sushi') || combinedText.includes('sashimi')) {
    vector.Seafood = 1.0;
  }
  if (combinedText.includes('noodle') || combinedText.includes('ramen') || combinedText.includes('udon') || combinedText.includes('soba')) {
    vector.Noodle = 1.0;
  }
  if (combinedText.includes('rice') || combinedText.includes('bibimbap') || combinedText.includes('gukbap')) {
    vector.Rice = 1.0;
  }
  if (place.type === 'bakery' || combinedText.includes('bread') || combinedText.includes('bakery') || combinedText.includes('pastry')) {
    vector.Bread = 1.0;
  }

  // Ambiance detection
  if (combinedText.includes('quiet') || combinedText.includes('peaceful') || combinedText.includes('serene') || place.type === 'culture') {
    vector.Quiet = 1.0;
  }
  if (combinedText.includes('active') || combinedText.includes('sport') || combinedText.includes('adventure') || place.type === 'activity') {
    vector.Active = 1.0;
  }

  // Environment detection
  if (place.isIndoor) {
    vector.Indoor = 1.0;
  } else {
    vector.Nature = 1.0;
  }
  if (combinedText.includes('park') || combinedText.includes('garden') || combinedText.includes('nature') || place.type === 'landmark') {
    vector.Nature = 0.8;
  }

  // Luxury detection
  if (combinedText.includes('luxury') || combinedText.includes('premium') || combinedText.includes('fine dining') || combinedText.includes('gourmet')) {
    vector.Luxury = 1.0;
  } else if (combinedText.includes('steak') || combinedText.includes('lounge') || combinedText.includes('dining')) {
    vector.Luxury = 0.8;
  }

  return vector;
}

/**
 * Update user vector based on Like/Dislike action
 */
export function updateUserVector(
  place: Place,
  action: 'LIKE' | 'DISLIKE',
  current: UserVector
): UserVector {
  const placeVector = placeToFeatureVector(place);
  const delta = action === 'LIKE' ? 0.1 : -0.2;
  const next: UserVector = { ...current };

  for (const dim of VECTOR_DIMENSIONS) {
    // Only update dimensions that are relevant to this place (value > 0 in place vector)
    if (placeVector[dim] > 0) {
      const prev = next[dim];
      const updated = prev + delta;
      // Clamp: Like max 1.0, Dislike min 0.0
      next[dim] = Math.max(0.0, Math.min(1.0, parseFloat(updated.toFixed(3))));
    }
  }

  return next;
}

/**
 * Legacy function for backward compatibility
 */
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


