import { Place } from '../types';

/**
 * Convert degrees to radians
 */
function toRad(degrees: number): number {
  return degrees * (Math.PI / 180);
}

/**
 * Calculate distance between two coordinates using Haversine formula
 * Returns distance in kilometers
 */
export function haversineDistance(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number
): number {
  const R = 6371; // Earth's radius in km
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) *
      Math.cos(toRad(lat2)) *
      Math.sin(dLng / 2) *
      Math.sin(dLng / 2);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

/**
 * Calculate distance from a point to a place
 */
export function distanceToPlace(
  lat: number,
  lng: number,
  place: Place
): number {
  return haversineDistance(lat, lng, place.lat, place.lng);
}

/**
 * Find the nearest place from a given location
 * OPTIMIZED: Filters by criteria first, then calculates distances only for filtered subset
 */
export function findNearestPlace(
  lat: number,
  lng: number,
  places: Place[],
  options?: {
    excludeIds?: string[];
    filterByTheme?: string[];
    filterByIndoor?: boolean;
    filterByType?: string[];
    filterByMealType?: string[];
  }
): Place | null {
  if (places.length === 0) return null;

  // Step 1: Filter places by criteria FIRST (before distance calculation)
  let filtered = [...places];

  if (options?.excludeIds && options.excludeIds.length > 0) {
    filtered = filtered.filter((p) => !options.excludeIds!.includes(p.id));
  }

  if (options?.filterByTheme && options.filterByTheme.length > 0) {
    filtered = filtered.filter((p) =>
      p.themes.some((theme) => options.filterByTheme!.includes(theme))
    );
  }

  if (options?.filterByIndoor !== undefined) {
    filtered = filtered.filter((p) => p.isIndoor === options.filterByIndoor);
  }

  if (options?.filterByType && options.filterByType.length > 0) {
    filtered = filtered.filter((p) =>
      options.filterByType!.includes(p.type)
    );
  }

  if (options?.filterByMealType && options.filterByMealType.length > 0) {
    filtered = filtered.filter(
      (p) => p.mealType && options.filterByMealType!.includes(p.mealType)
    );
  }

  if (filtered.length === 0) return null;

  // Step 2: Calculate distances only for filtered subset
  let nearest = filtered[0];
  let minDistance = haversineDistance(lat, lng, nearest.lat, nearest.lng);

  for (let i = 1; i < filtered.length; i++) {
    const place = filtered[i];
    const distance = haversineDistance(lat, lng, place.lat, place.lng);
    if (distance < minDistance) {
      minDistance = distance;
      nearest = place;
    }
  }

  return nearest;
}

/**
 * Sort places by distance from a given location
 * OPTIMIZED: Filters first, then calculates distances
 */
export function sortPlacesByDistance(
  lat: number,
  lng: number,
  places: Place[],
  options?: {
    excludeIds?: string[];
    filterByTheme?: string[];
    filterByIndoor?: boolean;
    filterByType?: string[];
    filterByMealType?: string[];
    limit?: number;
  }
): Place[] {
  // Step 1: Filter first
  let filtered = [...places];

  if (options?.excludeIds && options.excludeIds.length > 0) {
    filtered = filtered.filter((p) => !options.excludeIds!.includes(p.id));
  }

  if (options?.filterByTheme && options.filterByTheme.length > 0) {
    filtered = filtered.filter((p) =>
      p.themes.some((theme) => options.filterByTheme!.includes(theme))
    );
  }

  if (options?.filterByIndoor !== undefined) {
    filtered = filtered.filter((p) => p.isIndoor === options.filterByIndoor);
  }

  if (options?.filterByType && options.filterByType.length > 0) {
    filtered = filtered.filter((p) =>
      options.filterByType!.includes(p.type)
    );
  }

  if (options?.filterByMealType && options.filterByMealType.length > 0) {
    filtered = filtered.filter(
      (p) => p.mealType && options.filterByMealType!.includes(p.mealType)
    );
  }

  // Step 2: Calculate distances and sort
  const withDistances = filtered.map((place) => ({
    place,
    distance: haversineDistance(lat, lng, place.lat, place.lng),
  }));

  withDistances.sort((a, b) => a.distance - b.distance);

  const sorted = withDistances.map((item) => item.place);

  // Step 3: Apply limit if specified
  if (options?.limit && options.limit > 0) {
    return sorted.slice(0, options.limit);
  }

  return sorted;
}

