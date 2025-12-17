import { Place, PlaceType, MealType, Theme } from '../types';

// Cache for real places data
let cachedRealPlaces: Place[] | null = null;
let realPlacesAttempted = false;

/**
 * Try to load real places from JSON file (synchronous attempt)
 * Returns null if file doesn't exist or can't be loaded
 */
function tryLoadRealPlaces(): Place[] | null {
  if (realPlacesAttempted) {
    return cachedRealPlaces;
  }
  
  realPlacesAttempted = true;
  
  try {
    // In browser/Vite environment, try to import JSON
    // This will work if the file exists and Vite bundles it
    // We'll use dynamic import pattern that Vite can resolve
    return null; // Fallback to generated for now
  } catch (error) {
    // Silently fail and use generated data
    return null;
  }
}

/**
 * Set real places data (called after async load if available)
 */
export function setRealPlacesData(places: Place[] | null) {
  cachedRealPlaces = places;
  realPlacesAttempted = true;
}

/**
 * Hub definitions with real-world coordinates in Daejeon
 */
interface Hub {
  name: string;
  centerLat: number;
  centerLng: number;
  radius: number; // km - how far to scatter points
  count: number;
  restaurantRatio: number; // 0-1, percentage that are restaurants
  indoorRatio: number; // 0-1, percentage that are indoor
  themeDistribution: { [key in Theme]?: number }; // Weight for each theme
}

const HUBS: Hub[] = [
  {
    name: 'Dunsan-dong',
    centerLat: 36.3512,
    centerLng: 127.3848,
    radius: 0.8, // Tight cluster
    count: 400,
    restaurantRatio: 0.6, // 60% restaurants (240), 40% activities (160)
    indoorRatio: 0.7,
    themeDistribution: { Gourmet: 0.5, Activity: 0.3, Healing: 0.2 }
  },
  {
    name: 'Bongmyeong-dong (Yuseong)',
    centerLat: 36.3650,
    centerLng: 127.3400,
    radius: 1.0,
    count: 300,
    restaurantRatio: 0.55,
    indoorRatio: 0.65,
    themeDistribution: { Healing: 0.4, Gourmet: 0.35, Activity: 0.25 }
  },
  {
    name: 'Soje-dong & Daeheung-dong',
    centerLat: 36.3189,
    centerLng: 127.4283,
    radius: 0.9,
    count: 300,
    restaurantRatio: 0.5, // More cafes here
    indoorRatio: 0.8,
    themeDistribution: { Healing: 0.5, Gourmet: 0.4, Activity: 0.1 }
  },
  {
    name: 'Techno Valley & KAIST',
    centerLat: 36.3708,
    centerLng: 127.3845,
    radius: 1.2,
    count: 200,
    restaurantRatio: 0.45,
    indoorRatio: 0.75,
    themeDistribution: { Activity: 0.5, Healing: 0.3, Gourmet: 0.2 }
  },
  {
    name: 'Outskirts (Jangtaesan, O-World)',
    centerLat: 36.3400,
    centerLng: 127.4000,
    radius: 3.0, // Wide scatter
    count: 100,
    restaurantRatio: 0.4,
    indoorRatio: 0.5,
    themeDistribution: { Activity: 0.6, Healing: 0.3, Gourmet: 0.1 }
  }
];

/**
 * Naming arrays for realistic place names
 */
const PREFIXES = [
  'Grand', 'Tasty', 'Daejeon', 'Hanbat', 'Yuseong', 'Dunsan', 'Soje',
  'Modern', 'Classic', 'Premium', 'Royal', 'Elite', 'Cozy', 'Chic',
  'Mood', 'Style', 'Trend', 'Vibe', 'Zen', 'Luxury', 'Art', 'Culture'
];

const RESTAURANT_CATEGORIES = [
  'BBQ', 'Pasta', 'Pizza', 'Sushi', 'Ramen', 'Kal-guksu', 'Bibimbap',
  'Korean', 'Italian', 'Japanese', 'Chinese', 'Western', 'Fusion',
  'Steak', 'Seafood', 'Chicken', 'Burgers', 'Dessert', 'Buffet'
];

const CAFE_CATEGORIES = [
  'Cafe', 'Coffee', 'Roastery', 'Brunch', 'Dessert Cafe', 'Book Cafe',
  'Gallery Cafe', 'Roof Top', 'Terrace', 'Study Cafe', 'Pet Cafe'
];

const ACTIVITY_CATEGORIES = [
  'Gallery', 'Museum', 'Park', 'Zoo', 'Observatory', 'Theater',
  'Cinema', 'Arcade', 'Escape Room', 'Karaoke', 'Bowling',
  'Exhibition', 'Concert Hall', 'Library', 'Aquarium', 'Botanical Garden'
];

const LANDMARK_CATEGORIES = [
  'Bridge', 'Tower', 'Plaza', 'Square', 'Monument', 'Temple',
  'Shrine', 'Fortress', 'Palace', 'Village', 'Street', 'Market'
];

const KOREAN_PREFIXES = [
  '그랜드', '대전', '한밭', '유성', '둔산', '소제', '모던', '클래식',
  '프리미엄', '로얄', '엘리트', '코지', '시크', '무드', '스타일', '트렌드'
];

const KOREAN_RESTAURANT_SUFFIXES = [
  '식당', '레스토랑', '찻집', '분식', '횟집', '고기집', '치킨집'
];

const KOREAN_CAFE_SUFFIXES = [
  '카페', '커피숍', '브런치', '디저트카페', '북카페', '갤러리카페'
];

const KOREAN_ACTIVITY_SUFFIXES = [
  '갤러리', '박물관', '공원', '동물원', '천문대', '극장', '영화관'
];

/**
 * Generate a random number between min and max
 */
function random(min: number, max: number): number {
  return Math.random() * (max - min) + min;
}

/**
 * Generate a random integer between min and max (inclusive)
 */
function randomInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

/**
 * Pick a random element from an array
 */
function pickRandom<T>(array: T[]): T {
  return array[randomInt(0, array.length - 1)];
}

/**
 * Pick multiple random elements from an array
 */
function pickRandomMultiple<T>(array: T[], count: number): T[] {
  const shuffled = [...array].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, Math.min(count, array.length));
}

/**
 * Generate a random coordinate within a radius of a center point
 */
function generateCoordinate(centerLat: number, centerLng: number, radiusKm: number): [number, number] {
  // Convert radius from km to degrees (approximate)
  const radiusLat = radiusKm / 111; // 1 degree latitude ≈ 111 km
  const radiusLng = radiusKm / (111 * Math.cos(centerLat * Math.PI / 180));
  
  // Generate random angle and distance
  const angle = Math.random() * 2 * Math.PI;
  const distance = Math.random() * radiusKm;
  
  const lat = centerLat + (distance / 111) * Math.cos(angle);
  const lng = centerLng + (distance / (111 * Math.cos(centerLat * Math.PI / 180))) * Math.sin(angle);
  
  return [lat, lng];
}

/**
 * Generate themes based on distribution weights
 */
function generateThemes(distribution: { [key in Theme]?: number }): Theme[] {
  const themes: Theme[] = [];
  const allThemes: Theme[] = ['Healing', 'Activity', 'Gourmet'];
  
  // Always include at least one theme
  const primaryTheme = pickRandom(allThemes);
  themes.push(primaryTheme);
  
  // 30% chance to add a second theme
  if (Math.random() < 0.3) {
    const remainingThemes = allThemes.filter(t => t !== primaryTheme);
    themes.push(pickRandom(remainingThemes));
  }
  
  return themes;
}

/**
 * Generate a restaurant name
 */
function generateRestaurantName(hubName: string, index: number): { name: string; nameKo: string } {
  const prefix = pickRandom(PREFIXES);
  const category = pickRandom(RESTAURANT_CATEGORIES);
  const koreanPrefix = pickRandom(KOREAN_PREFIXES);
  const koreanSuffix = pickRandom(KOREAN_RESTAURANT_SUFFIXES);
  
  // Sometimes add hub name
  const includeHub = Math.random() < 0.3;
  const hubPart = includeHub ? ` ${hubName}` : '';
  
  return {
    name: `${prefix} ${category}${hubPart}`,
    nameKo: `${koreanPrefix}${category}${koreanSuffix}${includeHub ? ` ${hubName}` : ''}`
  };
}

/**
 * Generate a cafe name
 */
function generateCafeName(hubName: string, index: number): { name: string; nameKo: string } {
  const prefix = pickRandom(PREFIXES);
  const category = pickRandom(CAFE_CATEGORIES);
  const koreanPrefix = pickRandom(KOREAN_PREFIXES);
  const koreanSuffix = pickRandom(KOREAN_CAFE_SUFFIXES);
  
  const includeHub = Math.random() < 0.4;
  const hubPart = includeHub ? ` ${hubName}` : '';
  
  return {
    name: `${prefix} ${category}${hubPart}`,
    nameKo: `${koreanPrefix}${category}${koreanSuffix}${includeHub ? ` ${hubName}` : ''}`
  };
}

/**
 * Generate an activity/landmark name
 */
function generateActivityName(hubName: string, index: number, type: 'activity' | 'landmark'): { name: string; nameKo: string } {
  const prefix = pickRandom(PREFIXES);
  const categories = type === 'landmark' ? LANDMARK_CATEGORIES : ACTIVITY_CATEGORIES;
  const category = pickRandom(categories);
  const koreanPrefix = pickRandom(KOREAN_PREFIXES);
  const koreanSuffix = type === 'landmark' 
    ? ['다리', '탑', '광장', '기념비', '사원', '성', '마을']
    : KOREAN_ACTIVITY_SUFFIXES;
  
  const includeHub = Math.random() < 0.2;
  const hubPart = includeHub ? ` ${hubName}` : '';
  
  return {
    name: `${prefix} ${category}${hubPart}`,
    nameKo: `${koreanPrefix}${category}${pickRandom(koreanSuffix)}${includeHub ? ` ${hubName}` : ''}`
  };
}

/**
 * Generate description based on type and theme
 */
function generateDescription(type: PlaceType, themes: Theme[], name: string): string {
  const themeDescriptions: { [key in Theme]: string[] } = {
    Healing: ['relaxing', 'peaceful', 'serene', 'calming', 'tranquil', 'soothing'],
    Activity: ['exciting', 'energetic', 'fun', 'adventurous', 'dynamic', 'vibrant'],
    Gourmet: ['delicious', 'tasty', 'flavorful', 'gourmet', 'culinary', 'savory']
  };
  
  const typeDescriptions: { [key in PlaceType]: string[] } = {
    restaurant: ['restaurant', 'dining spot', 'eatery', 'food place'],
    cafe: ['cafe', 'coffee shop', 'cozy spot', 'hangout'],
    bakery: ['bakery', 'pastry shop', 'baked goods', 'sweet treats'],
    activity: ['activity center', 'entertainment venue', 'experience', 'attraction'],
    landmark: ['landmark', 'notable place', 'iconic location', 'must-see'],
    shopping: ['shopping area', 'retail space', 'mall', 'market']
  };
  
  const themeWords = themes.map(t => pickRandom(themeDescriptions[t])).join(', ');
  const typeWord = pickRandom(typeDescriptions[type]);
  
  return `A ${themeWords} ${typeWord} perfect for dates. ${name} offers a memorable experience.`;
}

/**
 * Generate places for a single hub
 */
function generateHubPlaces(hub: Hub, startIndex: number): Place[] {
  const places: Place[] = [];
  const restaurantCount = Math.floor(hub.count * hub.restaurantRatio);
  const activityCount = hub.count - restaurantCount;
  
  // Generate restaurants
  for (let i = 0; i < restaurantCount; i++) {
    const [lat, lng] = generateCoordinate(hub.centerLat, hub.centerLng, hub.radius);
    const isIndoor = Math.random() < hub.indoorRatio;
    const themes = generateThemes(hub.themeDistribution);
    
    // Determine if it's a restaurant or cafe/bakery
    const restaurantType = Math.random() < 0.7 ? 'restaurant' : (Math.random() < 0.5 ? 'cafe' : 'bakery');
    const type: PlaceType = restaurantType;
    
    // Determine meal type for restaurants
    let mealType: MealType = null;
    if (type === 'restaurant') {
      const rand = Math.random();
      if (rand < 0.4) mealType = 'lunch';
      else if (rand < 0.8) mealType = 'dinner';
    } else if (type === 'cafe' || type === 'bakery') {
      mealType = 'cafe';
    }
    
    const names = type === 'cafe' || type === 'bakery'
      ? generateCafeName(hub.name, i)
      : generateRestaurantName(hub.name, i);
    
    const id = `${hub.name.toLowerCase().replace(/\s+/g, '-')}-${type}-${startIndex + i}`;
    
    places.push({
      id,
      name: names.name,
      nameKo: names.nameKo,
      type,
      lat,
      lng,
      isIndoor,
      description: generateDescription(type, themes, names.name),
      themes,
      mealType,
      estimatedDuration: type === 'restaurant' ? randomInt(60, 120) : randomInt(30, 90)
    });
  }
  
  // Generate activities/landmarks
  for (let i = 0; i < activityCount; i++) {
    const [lat, lng] = generateCoordinate(hub.centerLat, hub.centerLng, hub.radius);
    const isIndoor = Math.random() < hub.indoorRatio;
    const themes = generateThemes(hub.themeDistribution);
    
    // Mix of activities and landmarks
    const isLandmark = Math.random() < 0.3;
    const type: PlaceType = isLandmark ? 'landmark' : 'activity';
    
    const names = generateActivityName(hub.name, i, type);
    const id = `${hub.name.toLowerCase().replace(/\s+/g, '-')}-${type}-${startIndex + restaurantCount + i}`;
    
    places.push({
      id,
      name: names.name,
      nameKo: names.nameKo,
      type,
      lat,
      lng,
      isIndoor,
      description: generateDescription(type, themes, names.name),
      themes,
      estimatedDuration: randomInt(60, 180)
    });
  }
  
  return places;
}

/**
 * Main function to get places data
 * Tries to load real OSM data first, falls back to generated data
 */
export function generateBigData(): Place[] {
  // Try to load real places first
  const realPlaces = tryLoadRealPlaces();
  if (realPlaces && realPlaces.length >= 1000) {
    // Use real data if we have at least 1000 places
    // Ensure we have exactly 2,000 places
    if (realPlaces.length >= 2000) {
      return realPlaces.slice(0, 2000);
    } else {
      // If we have less than 2000, supplement with generated data
      const generatedPlaces = generateFakeData();
      const needed = 2000 - realPlaces.length;
      return [...realPlaces, ...generatedPlaces.slice(0, needed)];
    }
  }
  
  // Fallback to generated data
  console.log('ℹ️  Using generated (fake) data');
  return generateFakeData();
}

/**
 * Generate fake procedural data (fallback when real data unavailable)
 */
function generateFakeData(): Place[] {
  const allPlaces: Place[] = [];
  let currentIndex = 0;
  
  for (const hub of HUBS) {
    const hubPlaces = generateHubPlaces(hub, currentIndex);
    allPlaces.push(...hubPlaces);
    currentIndex += hubPlaces.length;
  }
  
  // Ensure we have exactly 2,000 places (adjust if needed)
  const totalCount = allPlaces.length;
  if (totalCount < 2000) {
    // Generate additional places in the largest hub (Dunsan-dong)
    const largestHub = HUBS[0];
    const remaining = 2000 - totalCount;
    const additionalPlaces = generateHubPlaces(
      { ...largestHub, count: remaining },
      currentIndex
    );
    allPlaces.push(...additionalPlaces);
  } else if (totalCount > 2000) {
    // Trim to exactly 2000
    return allPlaces.slice(0, 2000);
  }
  
  return allPlaces;
}

/**
 * Verify the generated data meets requirements
 */
export function verifyData(places: Place[]): {
  total: number;
  restaurants: number;
  activities: number;
  byHub: { [key: string]: number };
} {
  const restaurants = places.filter(p => 
    p.type === 'restaurant' || p.type === 'cafe' || p.type === 'bakery'
  ).length;
  const activities = places.filter(p => 
    p.type === 'activity' || p.type === 'landmark' || p.type === 'shopping'
  ).length;
  
  const byHub: { [key: string]: number } = {};
  places.forEach(p => {
    const hub = p.id.split('-')[0];
    byHub[hub] = (byHub[hub] || 0) + 1;
  });
  
  return {
    total: places.length,
    restaurants,
    activities,
    byHub
  };
}

