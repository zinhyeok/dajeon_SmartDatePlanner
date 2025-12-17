# Development Guide

## Overview

This document provides detailed information about the implementation, development workflow, and technical details of the Daejeon Smart Date Course Planner.

## Table of Contents

1. [Implementation Summary](#implementation-summary)
2. [Data Generation](#data-generation)
3. [Real Data Integration](#real-data-integration)
4. [Performance Optimizations](#performance-optimizations)
5. [UI Components](#ui-components)
6. [Technical Highlights](#technical-highlights)

---

## Implementation Summary

### Phase 1-2: Core Functionality
- ✅ Real-world location data structure
- ✅ Haversine distance calculations
- ✅ Course generation algorithm
- ✅ Basic map integration

### Phase 3: Large Scale Data & Optimization

#### Procedural Data Generator (`utils/mockDataGenerator.ts`)

Created `generateBigData()` function that generates exactly **2,000 places** across 5 real-world hubs in Daejeon:

**Hub Distribution:**
- **Dunsan-dong** (400 places): Nightlife/Food hub, tight cluster (0.8km radius)
- **Bongmyeong-dong (Yuseong)** (300 places): Hot spring area (1.0km radius)
- **Soje-dong & Daeheung-dong** (300 places): Cafe/Culture district (0.9km radius)
- **Techno Valley & KAIST** (200 places): Technology hub (1.2km radius)
- **Outskirts** (100 places): Scattered across wider area (3.0km radius)

**Features:**
- Real-world coordinates based on actual Daejeon locations
- Realistic naming using Korean + English prefixes/suffixes
- Proper distribution: ~1,000 restaurants, ~1,000 activities/landmarks
- Theme-based generation (Healing, Activity, Gourmet)
- Indoor/outdoor ratio per hub
- Meal type assignment (lunch, dinner, cafe)
- Estimated duration for each place

#### Marker Clustering Implementation

**Installed and configured `@changey/react-leaflet-markercluster`:**
- Integrated into `DateCourseMap.tsx` component
- Course sequence markers shown individually (not clustered)
- All other markers automatically clustered
- Custom cluster icons with count display
- Performance optimizations: chunked loading, spiderfy on max zoom

### Phase 4: UI Components & Final Integration

#### Completed Components

1. **LocationSearch.tsx**
   - Autocomplete search for 900+ places
   - Real-time filtering by name (English/Korean) and description
   - Keyboard navigation (Arrow keys, Enter, Escape)
   - Click-outside to close
   - Visual feedback with highlighted results

2. **ThemeSelector.tsx**
   - Three theme options: Healing, Gourmet, Activity
   - Icon-based selection (Heart, Utensils, Activity icons)
   - Color-coded buttons
   - Visual selection indicator
   - Optional selection (can be cleared)

3. **RainyToggle.tsx**
   - Toggle switch for indoor/outdoor filtering
   - Visual weather icons (Sun/Rain)
   - Clear description of mode
   - Smooth animations

4. **CourseTimeline.tsx**
   - Vertical timeline with connected dots
   - Color-coded place types
   - Time estimates for each stop
   - Duration calculations
   - Clickable items that pan map to location
   - Responsive card design

5. **App.tsx (Main Integration)**
   - Desktop Layout: Left sidebar (controls + timeline) + Right map
   - State Management for all application state
   - Course Generation integration
   - Error Handling: User-friendly error messages
   - Loading States: Spinner during generation
   - Course Stats: Distance, duration, stop count

---

## Data Generation

### Real Data from OpenStreetMap

The application fetches real places from OpenStreetMap using the Overpass API.

**Script**: `scripts/fetchRealData.js`

**Query Parameters:**
- Search Area: Within 5km radius of Daejeon City Hall (36.3504, 127.3845)
- Target Tags: 
  - `amenity=restaurant`, `amenity=fast_food`
  - `amenity=cafe`, `amenity=bar`
  - `leisure=park`
  - `tourism=museum`, `tourism=attraction`
  - `shop=*` (various shops)
  - `amenity=arts_centre`
- Limit: Up to 2,500 nodes

**Data Transformation:**
- Maps OSM `tags.name` to `name` (skips if missing)
- Maps `tags.amenity`/`tags.shop` to our `PlaceType`
- Generates random `isIndoor` and `description`
- Assigns themes based on place type
- Filters out suspicious entries (typos, generic names)

**Usage:**
```bash
npm run fetch-data
```

This creates `src/data/realPlaces.json` with real Daejeon places.

### Fallback: Procedural Data Generator

If real data is unavailable, `mockDataGenerator.ts` generates procedural data:
- Ensures exactly 2,000 places for consistency
- Uses realistic hub-based distribution
- Maintains proper type ratios

---

## Real Data Integration

### Data Loading Flow

1. **App Start**: `src/App.tsx` tries to load `src/data/realPlaces.json`
2. **If Real Data Exists**: Uses OSM data (currently ~900 places)
3. **If Not Available**: Falls back to generated data

### Data Quality

The fetch script includes quality filters:
- Removes entries with suspicious names (typos, generic patterns)
- Validates coordinates
- Ensures names exist before adding

---

## Performance Optimizations

### 1. Haversine Distance Calculations (`utils/haversine.ts`)

**Filter-First Approach**: Filters places by criteria **BEFORE** calculating distances

```typescript
// ❌ BAD: Calculate all distances, then filter
const allDistances = places.map(p => haversine(lat, lng, p.lat, p.lng));
const filtered = allDistances.filter(/* criteria */);

// ✅ GOOD: Filter first, then calculate
const filtered = places.filter(/* criteria */);
const distances = filtered.map(p => haversine(lat, lng, p.lat, p.lng));
```

This prevents unnecessary calculations on all 900+ places.

### 2. Marker Clustering

- Groups nearby markers into clusters
- Only renders individual markers when zoomed in
- Handles 900+ markers smoothly

### 3. React Optimizations

- `useMemo` hooks to prevent unnecessary re-renders
- Separate course sequence markers from clustered markers
- Lazy loading for map component

### 4. Map Component Optimizations

- Client-side mounting check to avoid SSR issues
- Dynamic imports for map component
- Error boundary for graceful error handling

---

## UI Components

### Visual Design

**Color Palette:**
- Primary: Indigo (600-700) for main actions
- Accents:
  - Green: Start location
  - Blue: Activities
  - Orange: Lunch
  - Brown: Cafe
  - Red: Dinner
  - Purple: End location

**Layout:**
- Header: Gradient indigo with app title
- Sidebar: White background, scrollable controls and timeline
- Map: Full-width, responsive
- Timeline: Connected dots with cards

### Component Features

**LocationSearch:**
- Real-time autocomplete
- Keyboard navigation
- Shows Korean names
- Click outside to close

**ThemeSelector:**
- Icon-based buttons
- Visual selection indicator
- Optional (can be cleared)

**CourseTimeline:**
- Vertical timeline design
- Time estimates
- Click to pan map
- Color-coded by type

---

## Technical Highlights

### Type Safety

Full TypeScript coverage with comprehensive interfaces:

```typescript
interface Place {
  id: string;
  name: string;
  nameKo: string;
  type: PlaceType;
  lat: number;
  lng: number;
  isIndoor: boolean;
  description: string;
  themes: Theme[];
  mealType?: MealType;
  estimatedDuration?: number;
}
```

### Error Handling

- Error boundary catches React errors
- User-friendly error messages
- Graceful fallbacks for missing data

### Accessibility

- Keyboard navigation in search
- Semantic HTML
- Clear visual feedback

---

## File Structure

```
src/
├── App.tsx                          # Main application
├── main.tsx                          # React entry point
├── index.css                         # Global styles + Tailwind
├── components/
│   ├── Map/
│   │   └── DateCourseMap.tsx        # Map with clustering
│   └── Controls/
│       ├── LocationSearch.tsx       # Autocomplete search
│       ├── ThemeSelector.tsx        # Theme selection
│       ├── RainyToggle.tsx          # Weather mode toggle
│       └── CourseTimeline.tsx       # Timeline display
├── utils/
│   ├── mockDataGenerator.ts         # Fallback data generator
│   ├── haversine.ts                 # Distance calculations
│   └── courseGenerator.ts           # Course generation logic
├── types/
│   ├── index.ts                     # TypeScript interfaces
│   └── react-leaflet-markercluster.d.ts  # Type definitions
├── data/
│   ├── realPlaces.json              # Real OSM data (generated)
│   └── realPlaces.ts                # Data loading utilities
└── scripts/
    └── fetchRealData.js             # OSM data fetching script
```

---

## Development Workflow

### Adding New Features

1. Update types in `src/types/index.ts` if needed
2. Implement utility functions in `src/utils/`
3. Create components in `src/components/`
4. Integrate in `src/App.tsx`
5. Test with real and generated data

### Data Updates

```bash
# Fetch fresh real data
npm run fetch-data

# Data is automatically loaded on app start
npm run dev
```

### Building for Production

```bash
# Type check
npm run lint

# Build
npm run build

# Preview
npm run preview
```

---

## Known Issues & Solutions

### Map Context Errors

**Issue**: `useLeafletContext() can only be used in a descendant of <MapContainer>`

**Solution**: 
- Use `@changey/react-leaflet-markercluster` (compatible version)
- Ensure MapContainer is mounted before rendering clusters
- Use client-side only rendering

### Performance with Large Datasets

**Solution**: Marker clustering handles this automatically. If issues persist:
- Increase cluster radius
- Reduce initial marker count
- Use chunked loading (already enabled)

---

## Future Enhancements

- [ ] Mobile-responsive bottom sheet for controls
- [ ] Save/load favorite courses
- [ ] Share course via URL
- [ ] Print course itinerary
- [ ] Integration with real-time weather API
- [ ] User reviews and ratings
- [ ] Photo gallery for places

---

## Summary

The application successfully handles:
- ✅ 900+ real places from OpenStreetMap
- ✅ Marker clustering for performance
- ✅ Optimized distance calculations
- ✅ Full TypeScript type safety
- ✅ Beautiful, responsive UI
- ✅ Real-time data fetching and transformation

**Ready for development and deployment!** 🚀


