import axios from 'axios';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Daejeon City Hall coordinates
const DAEJEON_CENTER_LAT = 36.3504;
const DAEJEON_CENTER_LNG = 127.3845;
const RADIUS_METERS = 8000; // 8km radius for broader coverage

// Overpass API endpoint
const OVERPASS_API = 'https://overpass-api.de/api/interpreter';

/**
 * Generate Overpass QL query to fetch places within radius of Daejeon City Hall
 */
function generateOverpassQuery() {
  const tagFilters = [
    // Food & Dessert
    { key: 'amenity', value: 'restaurant' },
    { key: 'amenity', value: 'cafe' },
    { key: 'amenity', value: 'fast_food' },
    { key: 'amenity', value: 'ice_cream' },
    { key: 'amenity', value: 'food_court' },
    // Nightlife
    { key: 'amenity', value: 'bar' },
    { key: 'amenity', value: 'pub' },
    { key: 'amenity', value: 'biergarten' },
    { key: 'amenity', value: 'wine_bar' },
    { key: 'amenity', value: 'izakaya' },
    // Shopping
    { key: 'shop', value: 'department_store' },
    { key: 'shop', value: 'mall' },
    { key: 'shop', value: 'clothes' },
    { key: 'shop', value: 'gift' },
    { key: 'shop', value: 'books' },
    { key: 'shop', value: 'bakery' },
    // Culture & Art
    { key: 'tourism', value: 'museum' },
    { key: 'tourism', value: 'gallery' },
    { key: 'tourism', value: 'artwork' },
    { key: 'amenity', value: 'arts_centre' },
    { key: 'amenity', value: 'library' },
    { key: 'amenity', value: 'theatre' },
    // Entertainment
    { key: 'amenity', value: 'cinema' },
    { key: 'leisure', value: 'bowling_alley' },
    { key: 'leisure', value: 'water_park' },
    { key: 'leisure', value: 'sports_centre' },
    { key: 'tourism', value: 'zoo' },
    { key: 'tourism', value: 'aquarium' },
    { key: 'tourism', value: 'theme_park' },
    // Nature & Views
    { key: 'leisure', value: 'park' },
    { key: 'leisure', value: 'garden' },
    { key: 'tourism', value: 'viewpoint' },
    { key: 'tourism', value: 'picnic_site' },
    { key: 'natural', value: 'water' },
  ];

  const targetArea = `around:${RADIUS_METERS},${DAEJEON_CENTER_LAT},${DAEJEON_CENTER_LNG}`;
  const blocks = tagFilters
    .map(
      ({ key, value }) => `
      node["${key}"="${value}"](${targetArea});
      way["${key}"="${value}"](${targetArea});
      relation["${key}"="${value}"](${targetArea});`
    )
    .join('\n');

  return `
    [out:json][timeout:90];
    (
      ${blocks}
    );
    out center;
  `;
}

/**
 * Map OSM amenity/shop/tourism tags to our PlaceType
 */
function mapOSMTagToPlaceType(element) {
  const tags = element.tags || {};

  const nightlife = ['bar', 'pub', 'biergarten', 'wine_bar', 'izakaya'];
  const food = ['restaurant', 'fast_food', 'food_court'];
  const cafeish = ['cafe', 'ice_cream', 'bakery'];
  const shopping = ['department_store', 'mall', 'clothes', 'gift', 'books', 'bakery'];
  const culture = ['museum', 'gallery', 'artwork', 'arts_centre', 'library', 'theatre'];
  const entertainment = ['cinema', 'bowling_alley', 'water_park', 'sports_centre', 'zoo', 'aquarium', 'theme_park'];
  const nature = ['park', 'garden', 'viewpoint', 'picnic_site'];

  if (nightlife.includes(tags.amenity)) {
    return 'bar';
  }
  if (food.includes(tags.amenity)) {
    return 'restaurant';
  }
  if (cafeish.includes(tags.amenity) || cafeish.includes(tags.shop)) {
    return 'cafe';
  }
  if (shopping.includes(tags.shop)) {
    return 'shopping';
  }
  if (culture.includes(tags.tourism) || culture.includes(tags.amenity)) {
    return 'culture';
  }
  if (entertainment.includes(tags.amenity) || entertainment.includes(tags.leisure) || entertainment.includes(tags.tourism)) {
    return 'activity';
  }
  if (nature.includes(tags.leisure) || nature.includes(tags.tourism) || tags.natural === 'water') {
    return 'landmark';
  }

  // Default fallback
  return 'activity';
}

/**
 * Determine meal type based on place type
 */
function determineMealType(placeType) {
  if (placeType === 'restaurant') {
    // Can be lunch or dinner - randomly assign
    return Math.random() < 0.5 ? 'lunch' : 'dinner';
  }
  if (placeType === 'cafe') {
    return 'cafe';
  }
  if (placeType === 'bar') {
    return 'dinner';
  }
  return null;
}

/**
 * Generate themes based on place type
 */
function generateThemes(placeType, tags) {
  const themes = new Set();

  // Base by type
  if (placeType === 'restaurant' || placeType === 'cafe') {
    themes.add('Gourmet');
    if (Math.random() < 0.35) themes.add('Healing');
  } else if (placeType === 'bar') {
    themes.add('Nightlife');
    themes.add('Gourmet');
  } else if (placeType === 'shopping') {
    themes.add('Indoor');
    themes.add('Shopping');
  } else if (placeType === 'culture') {
    themes.add('Intellectual');
    themes.add('Quiet');
  } else if (placeType === 'landmark') {
    themes.add('Nature');
    themes.add('Healing');
  } else {
    themes.add('Activity');
  }

  // Tag-based injections
  if (tags.amenity === 'pub' || tags.amenity === 'bar') {
    themes.add('Nightlife');
    themes.add('Gourmet');
  }
  if (['books', 'gallery'].includes(tags.shop) || ['museum', 'gallery'].includes(tags.tourism) || tags.amenity === 'museum') {
    themes.add('Quiet');
    themes.add('Intellectual');
  }
  if (tags.leisure === 'bowling_alley' || tags.tourism === 'theme_park') {
    themes.add('Active');
    themes.add('Fun');
  }
  if (['department_store', 'mall'].includes(tags.shop)) {
    themes.add('Indoor');
    themes.add('Shopping');
  }
  if (['park', 'garden'].includes(tags.leisure) || ['viewpoint'].includes(tags.tourism)) {
    themes.add('Nature');
    themes.add('Healing');
  }

  if (themes.size === 0) {
    themes.add('Activity');
  }

  return Array.from(themes);
}

/**
 * Generate description based on place type and name
 */
function generateDescription(placeType, name) {
  const descriptions = {
    restaurant: ['A popular dining spot', 'Great food and atmosphere', 'Local favorite restaurant'],
    cafe: ['Cozy coffee shop', 'Perfect for a relaxing break', 'Charming cafe atmosphere'],
    bar: ['Great for a relaxed evening', 'Perfect for a night out', 'Casual nightlife spot'],
    shopping: ['Shopping destination', 'Great for browsing', 'Indoor date-friendly mall'],
    culture: ['Artistic and cultural vibe', 'Inspiring cultural space', 'Perfect for a quiet date'],
    activity: ['Fun activity spot', 'Great for an active date', 'Memorable experience'],
    landmark: ['Notable location', 'Must-see view', 'Scenic spot for a stroll'],
  };

  const options = descriptions[placeType] || ['A place to visit'];
  return `${options[Math.floor(Math.random() * options.length)]} in Daejeon. ${name} offers a memorable experience.`;
}

/**
 * Extract coordinates from OSM element (handles node, way, relation)
 */
function extractCoordinates(element) {
  if (element.type === 'node') {
    return { lat: element.lat, lng: element.lon };
  }
  
  // For ways and relations, use center if available
  if (element.center) {
    return { lat: element.center.lat, lng: element.center.lon };
  }
  
  // Fallback: use geometry if available
  if (element.geometry && element.geometry.length > 0) {
    const coords = element.geometry[0];
    return { lat: coords.lat, lng: coords.lon };
  }
  
  return null;
}

/**
 * Check if name looks suspicious or has obvious typos
 */
function isNameSuspicious(name) {
  if (!name || name.length < 2) return true;
  
  // Common typos to filter out
  const suspiciousPatterns = [
    /^Restaurant\s+Japonese$/i,  // "Japonese" instead of "Japanese"
    /^Restaurant\s+Chines$/i,    // "Chines" instead of "Chinese"
    /^Restaurant\s+Italain$/i,   // "Italain" instead of "Italian"
    /^[A-Z][a-z]+\s+Restaurant\s+[A-Z][a-z]+$/i, // Generic "X Restaurant Y" patterns that look fake
  ];
  
  // Check for suspicious patterns
  for (const pattern of suspiciousPatterns) {
    if (pattern.test(name)) {
      return true;
    }
  }
  
  // Check for names that are just "Restaurant" or "Cafe" without actual name
  if (/^(Restaurant|Cafe|Shop|Store)$/i.test(name.trim())) {
    return true;
  }
  
  return false;
}

/**
 * Transform OSM element to our Place interface
 */
function transformOSMToPlace(element, index) {
  const tags = element.tags || {};
  
  // Skip if no name
  const name = tags.name || tags['name:en'] || tags['name:ko'];
  if (!name) {
    return null;
  }
  
  // Filter out suspicious names
  if (isNameSuspicious(name)) {
    return null;
  }
  
  // Get Korean name (prefer name:ko, fallback to name if it looks Korean)
  const nameKo = tags['name:ko'] || (name.match(/[가-힣]/) ? name : name);
  
  const coords = extractCoordinates(element);
  if (!coords) {
    return null;
  }
  
  const placeType = mapOSMTagToPlaceType(element);
  const mealType = determineMealType(placeType);
  const themes = generateThemes(placeType, tags);
  
  return {
    id: `osm-${element.type}-${element.id || index}`,
    name: name,
    nameKo: nameKo,
    type: placeType,
    lat: coords.lat,
    lng: coords.lng,
    isIndoor: Math.random() < 0.7, // Keep indoor bias for variety
    description: generateDescription(placeType, name),
    themes: themes,
    mealType: mealType,
    estimatedDuration: placeType === 'restaurant' 
      ? 60 + Math.floor(Math.random() * 60) 
      : 30 + Math.floor(Math.random() * 90)
  };
}

/**
 * Main function to fetch and transform OSM data
 */
async function fetchRealData() {
  console.log('🚀 Starting OSM data fetch for Daejeon...');
  console.log(`📍 Center: ${DAEJEON_CENTER_LAT}, ${DAEJEON_CENTER_LNG}`);
  console.log(`📏 Radius: ${RADIUS_METERS / 1000}km`);
  
  try {
    const query = generateOverpassQuery();
    console.log('📡 Sending request to Overpass API...');
    
    const response = await axios.post(OVERPASS_API, query, {
      headers: {
        'Content-Type': 'text/plain',
      },
      timeout: 120000, // 2 minutes timeout
    });
    
    const elements = response.data.elements || [];
    console.log(`✅ Received ${elements.length} elements from OSM`);
    
    // Transform elements to Place objects
    const places = [];
    const seenNames = new Set();
    
    for (const element of elements) {
      const place = transformOSMToPlace(element, places.length);
      
      if (place && !seenNames.has(place.name)) {
        places.push(place);
        seenNames.add(place.name);
      }
    }
    
    console.log(`✨ Transformed ${places.length} places`);
    console.log(`📊 Breakdown:`);
    
    const breakdown = places.reduce((acc, p) => {
      acc[p.type] = (acc[p.type] || 0) + 1;
      return acc;
    }, {});
    
    Object.entries(breakdown).forEach(([type, count]) => {
      console.log(`   ${type}: ${count}`);
    });
    
    // Save to file
    const outputPath = path.join(__dirname, '../src/data/realPlaces.json');
    const outputDir = path.dirname(outputPath);
    
    // Ensure directory exists
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }
    
    fs.writeFileSync(outputPath, JSON.stringify(places, null, 2), 'utf-8');
    console.log(`💾 Saved to ${outputPath}`);
    console.log(`🎉 Done! Found ${places.length} real places in Daejeon.`);
    
    return places;
  } catch (error) {
    console.error('❌ Error fetching OSM data:', error.message);
    if (error.response) {
      console.error('Response status:', error.response.status);
      console.error('Response data:', error.response.data);
    }
    throw error;
  }
}

// Run if called directly
const isMainModule = import.meta.url === `file://${process.argv[1]}` || 
                     import.meta.url.endsWith(process.argv[1].replace(/\\/g, '/'));

if (import.meta.url.startsWith('file:') || process.argv[1].includes('fetchRealData.js')) {
  fetchRealData()
    .then(() => {
      console.log('✅ Script completed successfully');
      process.exit(0);
    })
    .catch((error) => {
      console.error('❌ Script failed:', error);
      process.exit(1);
    });
}

export { fetchRealData };

