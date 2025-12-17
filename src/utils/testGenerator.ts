/**
 * Test script to verify the data generator
 * Run with: npx ts-node src/utils/testGenerator.ts
 */

import { generateBigData, verifyData } from './mockDataGenerator';

console.log('🚀 Generating 2,000 places...\n');

const startTime = Date.now();
const places = generateBigData();
const endTime = Date.now();

console.log(`✅ Generated ${places.length} places in ${endTime - startTime}ms\n`);

// Verify data
const stats = verifyData(places);

console.log('📊 Data Statistics:');
console.log('─'.repeat(40));
console.log(`Total Places: ${stats.total}`);
console.log(`Restaurants: ${stats.restaurants} (~${Math.round((stats.restaurants / stats.total) * 100)}%)`);
console.log(`Activities: ${stats.activities} (~${Math.round((stats.activities / stats.total) * 100)}%)`);
console.log('\n📍 Distribution by Hub:');
console.log('─'.repeat(40));
Object.entries(stats.byHub)
  .sort(([, a], [, b]) => (b as number) - (a as number))
  .forEach(([hub, count]) => {
    console.log(`${hub.padEnd(30)} ${count.toString().padStart(4)} places`);
  });

// Sample places
console.log('\n🎯 Sample Places:');
console.log('─'.repeat(40));
places.slice(0, 5).forEach((place, index) => {
  console.log(`\n${index + 1}. ${place.name} (${place.nameKo})`);
  console.log(`   Type: ${place.type} | Indoor: ${place.isIndoor}`);
  console.log(`   Location: (${place.lat.toFixed(4)}, ${place.lng.toFixed(4)})`);
  console.log(`   Themes: ${place.themes.join(', ')}`);
  if (place.mealType) {
    console.log(`   Meal Type: ${place.mealType}`);
  }
});

// Verify requirements
console.log('\n✅ Requirements Check:');
console.log('─'.repeat(40));
console.log(`Total places: ${stats.total >= 2000 ? '✅' : '❌'} ${stats.total}/2000`);
console.log(`Restaurants: ${stats.restaurants >= 900 ? '✅' : '❌'} ${stats.restaurants}/~1000`);
console.log(`Activities: ${stats.activities >= 900 ? '✅' : '❌'} ${stats.activities}/~1000`);

console.log('\n✨ Data generation complete!');

