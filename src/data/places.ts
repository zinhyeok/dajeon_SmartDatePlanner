/**
 * Example usage of the mock data generator
 * 
 * In production, you can either:
 * 1. Use generateBigData() directly (generates on-the-fly)
 * 2. Pre-generate and export static data (better for performance)
 */

import { generateBigData } from '../utils/mockDataGenerator';
import { Place } from '../types';

// Option 1: Generate data on-the-fly (slower initial load)
// export const places: Place[] = generateBigData();

// Option 2: Pre-generate and cache (recommended for production)
// Run this once and save the output, or use it in a build script
let cachedPlaces: Place[] | null = null;

export function getPlaces(): Place[] {
  if (!cachedPlaces) {
    console.log('Generating 2,000 places...');
    cachedPlaces = generateBigData();
    console.log(`Generated ${cachedPlaces.length} places`);
  }
  return cachedPlaces;
}

// Export for direct use
export const places: Place[] = getPlaces();

