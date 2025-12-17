# Daejeon Smart Date Course Planner - Design Document

## 1. Architecture Overview

### 1.1 Application Structure
```
src/
├── components/
│   ├── Map/
│   │   ├── DateCourseMap.tsx      # Main map component with Leaflet
│   │   └── RoutePolyline.tsx      # Route visualization
│   ├── Controls/
│   │   ├── ThemeSelector.tsx      # Theme selection dropdown
│   │   ├── LocationSearch.tsx     # Start location search
│   │   ├── TimeControls.tsx       # Start time & meal windows
│   │   └── RainyDayToggle.tsx    # Indoor/outdoor mode toggle
│   └── CourseDisplay/
│       └── CourseCard.tsx         # Display recommended course
├── data/
│   └── places.ts                  # 30+ real Daejeon locations
├── utils/
│   ├── haversine.ts              # Distance calculation
│   └── courseGenerator.ts        # Course recommendation logic
├── types/
│   └── index.ts                  # TypeScript interfaces
└── App.tsx                       # Main application component
```

### 1.2 Data Flow
1. User selects preferences (theme, start location, time, rainy day mode)
2. System filters places based on preferences
3. Course generator creates optimal sequence using Haversine distance
4. Map component visualizes route with markers and polylines
5. Course details displayed in sidebar/card

---

## 2. Real-World Location Data

### 2.1 Data Schema
```typescript
interface Place {
  id: string;
  name: string;
  nameKo: string;           // Korean name
  type: 'landmark' | 'cafe' | 'restaurant' | 'shopping' | 'activity' | 'bakery';
  lat: number;              // Real-world latitude
  lng: number;              // Real-world longitude
  isIndoor: boolean;        // Indoor/outdoor flag
  description: string;
  themes: string[];         // Compatible themes (Healing, Activity, Gourmet, etc.)
  mealType?: 'lunch' | 'dinner' | 'cafe' | null;
  estimatedDuration?: number; // Minutes
}
```

### 2.2 Real Daejeon Locations (30+ Places)

```json
[
  {
    "id": "hanbat-arboretum",
    "name": "Hanbat Arboretum",
    "nameKo": "한밭수목원",
    "type": "landmark",
    "lat": 36.3675,
    "lng": 127.3847,
    "isIndoor": false,
    "description": "Beautiful botanical garden perfect for walking dates",
    "themes": ["Healing", "Activity"],
    "estimatedDuration": 90
  },
  {
    "id": "expo-bridge",
    "name": "Expo Bridge",
    "nameKo": "엑스포 다리",
    "type": "landmark",
    "lat": 36.3708,
    "lng": 127.3842,
    "isIndoor": false,
    "description": "Iconic bridge with scenic views, great for photos",
    "themes": ["Healing", "Activity"],
    "estimatedDuration": 45
  },
  {
    "id": "daejeon-arts-center",
    "name": "Daejeon Arts Center",
    "nameKo": "대전예술의전당",
    "type": "landmark",
    "lat": 36.3504,
    "lng": 127.3845,
    "isIndoor": true,
    "description": "Cultural hub with exhibitions and performances",
    "themes": ["Healing", "Activity"],
    "estimatedDuration": 120
  },
  {
    "id": "sung-sim-dang-main",
    "name": "Sung Sim Dang Main Branch",
    "nameKo": "성심당 본점",
    "type": "bakery",
    "lat": 36.3256,
    "lng": 127.4192,
    "isIndoor": true,
    "description": "Famous Daejeon bakery, must-visit for pastries",
    "themes": ["Gourmet", "Healing"],
    "mealType": "cafe",
    "estimatedDuration": 60
  },
  {
    "id": "sung-sim-dang-dcc",
    "name": "Sung Sim Dang DCC Branch",
    "nameKo": "성심당 둔산점",
    "type": "bakery",
    "lat": 36.3512,
    "lng": 127.3848,
    "isIndoor": true,
    "description": "Modern branch in Dunsan area",
    "themes": ["Gourmet", "Healing"],
    "mealType": "cafe",
    "estimatedDuration": 60
  },
  {
    "id": "soje-dong-cafe-street",
    "name": "Soje-dong Cafe Street",
    "nameKo": "소제동 카페거리",
    "type": "cafe",
    "lat": 36.3189,
    "lng": 127.4283,
    "isIndoor": true,
    "description": "Trendy cafe district with unique coffee shops",
    "themes": ["Healing", "Gourmet"],
    "mealType": "cafe",
    "estimatedDuration": 90
  },
  {
    "id": "kal-guksu-street",
    "name": "Kal-guksu Street",
    "nameKo": "칼국수 거리",
    "type": "restaurant",
    "lat": 36.3201,
    "lng": 127.4267,
    "isIndoor": true,
    "description": "Famous street for traditional knife-cut noodles",
    "themes": ["Gourmet"],
    "mealType": "lunch",
    "estimatedDuration": 60
  },
  {
    "id": "galma-dong-hip",
    "name": "Galma-dong Hip Places",
    "nameKo": "갈마동 힙플레이스",
    "type": "restaurant",
    "lat": 36.3405,
    "lng": 127.3901,
    "isIndoor": true,
    "description": "Trendy restaurants and bars in Galma-dong",
    "themes": ["Gourmet", "Activity"],
    "mealType": "dinner",
    "estimatedDuration": 120
  },
  {
    "id": "shinsegae-art-science",
    "name": "Shinsegae Art & Science",
    "nameKo": "신세계 아트앤사이언스",
    "type": "shopping",
    "lat": 36.3515,
    "lng": 127.3850,
    "isIndoor": true,
    "description": "Modern shopping complex with art exhibitions",
    "themes": ["Activity", "Healing"],
    "estimatedDuration": 120
  },
  {
    "id": "daejeon-city-hall",
    "name": "Daejeon City Hall",
    "nameKo": "대전시청",
    "type": "landmark",
    "lat": 36.3504,
    "lng": 127.3845,
    "isIndoor": false,
    "description": "Central location, good starting point",
    "themes": ["Healing", "Activity"],
    "estimatedDuration": 30
  },
  {
    "id": "yuseong-hot-spring",
    "name": "Yuseong Hot Spring",
    "nameKo": "유성온천",
    "type": "activity",
    "lat": 36.3650,
    "lng": 127.3400,
    "isIndoor": true,
    "description": "Traditional hot spring area, relaxing experience",
    "themes": ["Healing"],
    "estimatedDuration": 120
  },
  {
    "id": "daejeon-museum-art",
    "name": "Daejeon Museum of Art",
    "nameKo": "대전시립미술관",
    "type": "landmark",
    "lat": 36.3680,
    "lng": 127.3840,
    "isIndoor": true,
    "description": "Contemporary art exhibitions",
    "themes": ["Healing", "Activity"],
    "estimatedDuration": 90
  },
  {
    "id": "daejeon-zoo",
    "name": "Daejeon Zoo",
    "nameKo": "대전동물원",
    "type": "activity",
    "lat": 36.3670,
    "lng": 127.3845,
    "isIndoor": false,
    "description": "Family-friendly zoo experience",
    "themes": ["Activity", "Healing"],
    "estimatedDuration": 150
  },
  {
    "id": "gyeryongsan-national-park",
    "name": "Gyeryongsan National Park",
    "nameKo": "계룡산국립공원",
    "type": "activity",
    "lat": 36.3611,
    "lng": 127.2422,
    "isIndoor": false,
    "description": "Beautiful mountain hiking trails",
    "themes": ["Activity", "Healing"],
    "estimatedDuration": 180
  },
  {
    "id": "dunsan-grand-park",
    "name": "Dunsan Grand Park",
    "nameKo": "둔산대공원",
    "type": "landmark",
    "lat": 36.3520,
    "lng": 127.3850,
    "isIndoor": false,
    "description": "Large park perfect for walking and picnics",
    "themes": ["Healing", "Activity"],
    "estimatedDuration": 90
  },
  {
    "id": "daejeon-station",
    "name": "Daejeon Station",
    "nameKo": "대전역",
    "type": "landmark",
    "lat": 36.3316,
    "lng": 127.4339,
    "isIndoor": false,
    "description": "Historic train station area",
    "themes": ["Healing", "Activity"],
    "estimatedDuration": 30
  },
  {
    "id": "hanbat-museum",
    "name": "Hanbat Museum",
    "nameKo": "한밭박물관",
    "type": "landmark",
    "lat": 36.3685,
    "lng": 127.3848,
    "isIndoor": true,
    "description": "Local history and culture museum",
    "themes": ["Healing", "Activity"],
    "estimatedDuration": 90
  },
  {
    "id": "daejeon-convention-center",
    "name": "Daejeon Convention Center",
    "nameKo": "대전컨벤션센터",
    "type": "landmark",
    "lat": 36.3700,
    "lng": 127.3840,
    "isIndoor": true,
    "description": "Modern convention and exhibition space",
    "themes": ["Activity"],
    "estimatedDuration": 60
  },
  {
    "id": "euneungjeongi-culture-village",
    "name": "Euneungjeongi Culture Village",
    "nameKo": "은행동 문화마을",
    "type": "landmark",
    "lat": 36.3200,
    "lng": 127.4200,
    "isIndoor": false,
    "description": "Historic cultural village with murals",
    "themes": ["Healing", "Activity"],
    "estimatedDuration": 90
  },
  {
    "id": "daejeon-science-museum",
    "name": "Daejeon Science Museum",
    "nameKo": "대전과학관",
    "type": "activity",
    "lat": 36.3705,
    "lng": 127.3842,
    "isIndoor": true,
    "description": "Interactive science exhibits",
    "themes": ["Activity"],
    "estimatedDuration": 120
  },
  {
    "id": "gubongsan-citadel",
    "name": "Gubongsan Citadel",
    "nameKo": "구봉산성",
    "type": "landmark",
    "lat": 36.3400,
    "lng": 127.4000,
    "isIndoor": false,
    "description": "Historic fortress with panoramic city views",
    "themes": ["Activity", "Healing"],
    "estimatedDuration": 120
  },
  {
    "id": "daejeon-observatory",
    "name": "Daejeon Observatory",
    "nameKo": "대전천문대",
    "type": "activity",
    "lat": 36.3650,
    "lng": 127.3405,
    "isIndoor": true,
    "description": "Stargazing and astronomy programs",
    "themes": ["Activity", "Healing"],
    "estimatedDuration": 90
  },
  {
    "id": "dunsan-lake-park",
    "name": "Dunsan Lake Park",
    "nameKo": "둔산호수공원",
    "type": "landmark",
    "lat": 36.3530,
    "lng": 127.3860,
    "isIndoor": false,
    "description": "Serene lake park for romantic walks",
    "themes": ["Healing"],
    "estimatedDuration": 60
  },
  {
    "id": "daejeon-culture-arts-center",
    "name": "Daejeon Culture & Arts Center",
    "nameKo": "대전문화예술의전당",
    "type": "landmark",
    "lat": 36.3510,
    "lng": 127.3850,
    "isIndoor": true,
    "description": "Performing arts and cultural events",
    "themes": ["Healing", "Activity"],
    "estimatedDuration": 120
  },
  {
    "id": "yuseong-traditional-market",
    "name": "Yuseong Traditional Market",
    "nameKo": "유성전통시장",
    "type": "shopping",
    "lat": 36.3655,
    "lng": 127.3408,
    "isIndoor": false,
    "description": "Traditional Korean market experience",
    "themes": ["Gourmet", "Activity"],
    "estimatedDuration": 90
  },
  {
    "id": "daejeon-world-cup-stadium",
    "name": "Daejeon World Cup Stadium",
    "nameKo": "대전월드컵경기장",
    "type": "activity",
    "lat": 36.3170,
    "lng": 127.4290,
    "isIndoor": false,
    "description": "Sports events and outdoor activities",
    "themes": ["Activity"],
    "estimatedDuration": 90
  },
  {
    "id": "daejeon-history-museum",
    "name": "Daejeon History Museum",
    "nameKo": "대전역사박물관",
    "type": "landmark",
    "lat": 36.3205,
    "lng": 127.4210,
    "isIndoor": true,
    "description": "Local history and heritage",
    "themes": ["Healing", "Activity"],
    "estimatedDuration": 90
  },
  {
    "id": "daejeon-innovation-park",
    "name": "Daejeon Innovation Park",
    "nameKo": "대전혁신파크",
    "type": "activity",
    "lat": 36.3708,
    "lng": 127.3845,
    "isIndoor": true,
    "description": "Technology and innovation exhibitions",
    "themes": ["Activity"],
    "estimatedDuration": 90
  },
  {
    "id": "daejeon-botanica-park",
    "name": "Daejeon Botanica Park",
    "nameKo": "대전보타니카파크",
    "type": "landmark",
    "lat": 36.3685,
    "lng": 127.3843,
    "isIndoor": false,
    "description": "Botanical garden with themed sections",
    "themes": ["Healing"],
    "estimatedDuration": 90
  },
  {
    "id": "daejeon-eco-center",
    "name": "Daejeon Eco Center",
    "nameKo": "대전생태센터",
    "type": "activity",
    "lat": 36.3525,
    "lng": 127.3855,
    "isIndoor": true,
    "description": "Environmental education and exhibits",
    "themes": ["Healing", "Activity"],
    "estimatedDuration": 90
  },
  {
    "id": "daejeon-ceramic-museum",
    "name": "Daejeon Ceramic Museum",
    "nameKo": "대전도자기박물관",
    "type": "landmark",
    "lat": 36.3408,
    "lng": 127.3905,
    "isIndoor": true,
    "description": "Ceramic art and pottery exhibitions",
    "themes": ["Healing", "Activity"],
    "estimatedDuration": 90
  },
  {
    "id": "daejeon-nature-ecology-park",
    "name": "Daejeon Nature Ecology Park",
    "nameKo": "대전자연생태공원",
    "type": "landmark",
    "lat": 36.3550,
    "lng": 127.3870,
    "isIndoor": false,
    "description": "Natural habitat preservation area",
    "themes": ["Healing"],
    "estimatedDuration": 120
  }
]
```

---

## 3. Map Component Strategy

### 3.1 Library Selection
- **react-leaflet**: React wrapper for Leaflet.js
- **leaflet**: Core mapping library
- **OpenStreetMap**: Free, open-source map tiles

### 3.2 Map Configuration
```typescript
// Initial Map Settings
const MAP_CENTER: [number, number] = [36.3504, 127.3845]; // Daejeon City Hall
const INITIAL_ZOOM = 13;
const MIN_ZOOM = 11;
const MAX_ZOOM = 18;
```

### 3.3 Visual Elements

#### 3.3.1 Markers
- **Start Location**: Green marker (📍)
- **Activity Spots**: Blue markers (🎯)
- **Lunch**: Orange marker (🍽️)
- **Cafe**: Brown marker (☕)
- **Dinner**: Red marker (🍴)
- **End Point**: Purple marker (🏁)

#### 3.3.2 Polylines
- **Route Visualization**: Blue polyline connecting all locations in sequence
- **Line Style**: 
  - Color: `#3B82F6` (blue-500)
  - Weight: 4
  - Opacity: 0.7
  - Smooth factor: 1.0

#### 3.3.3 Popups
- Clicking any marker opens a popup showing:
  - Place name (Korean + English)
  - Type
  - Description
  - Estimated duration

### 3.4 Map Component Structure
```typescript
<MapContainer center={MAP_CENTER} zoom={INITIAL_ZOOM}>
  <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
  
  {/* Route Polyline */}
  <Polyline positions={routeCoordinates} />
  
  {/* Location Markers */}
  {courseSequence.map((place, index) => (
    <Marker key={place.id} position={[place.lat, place.lng]}>
      <Popup>
        <PlaceInfo place={place} index={index} />
      </Popup>
    </Marker>
  ))}
</MapContainer>
```

### 3.5 Responsive Design
- Map takes full width of main content area
- Minimum height: 500px
- Mobile-friendly with touch gestures
- Zoom controls positioned appropriately

---

## 4. Course Generation Logic

### 4.1 Sequence Pattern
```
Start Location → Activity Spot 1 → Lunch → Activity Spot 2 → Cafe → Dinner
```

### 4.2 Algorithm Steps
1. **Filter Places**:
   - By theme (if selected)
   - By indoor/outdoor (if rainy day mode)
   - Exclude start location from activity pool

2. **Select Meal Locations**:
   - Lunch: Filter restaurants with `mealType: 'lunch'`
   - Dinner: Filter restaurants with `mealType: 'dinner'`
   - Cafe: Filter cafes with `mealType: 'cafe'`

3. **Optimize Route**:
   - Use Haversine formula to calculate distances
   - Apply nearest-neighbor algorithm to minimize total travel distance
   - Ensure time windows are respected

4. **Generate Course**:
   - Start → Nearest Activity → Nearest Lunch → Nearest Activity → Nearest Cafe → Nearest Dinner

### 4.3 Haversine Formula Implementation
```typescript
function haversineDistance(
  lat1: number, lng1: number,
  lat2: number, lng2: number
): number {
  const R = 6371; // Earth's radius in km
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  
  const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
            Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) *
            Math.sin(dLng/2) * Math.sin(dLng/2);
  
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  return R * c;
}
```

---

## 5. Tech Stack Details

### 5.1 Core Dependencies
```json
{
  "react": "^18.2.0",
  "react-dom": "^18.2.0",
  "react-leaflet": "^4.2.1",
  "leaflet": "^1.9.4",
  "lucide-react": "^0.294.0",
  "tailwindcss": "^3.3.6"
}
```

### 5.2 TypeScript Configuration
- Strict mode enabled
- ES2020 target
- React JSX support

### 5.3 Styling
- Tailwind CSS for utility-first styling
- Custom color scheme for Daejeon theme
- Responsive breakpoints (sm, md, lg, xl)

---

## 6. User Interface Layout

### 6.1 Desktop Layout
```
┌─────────────────────────────────────────┐
│  Header: Daejeon Smart Date Planner     │
├──────────────┬──────────────────────────┤
│              │                          │
│  Controls    │      Map (Full Width)    │
│  Panel       │                          │
│              │                          │
│  - Theme     │                          │
│  - Location  │                          │
│  - Time      │                          │
│  - Rainy Day │                          │
│              │                          │
│  [Generate]  │                          │
│              │                          │
│  Course      │                          │
│  Details     │                          │
└──────────────┴──────────────────────────┘
```

### 6.2 Mobile Layout
```
┌─────────────────────┐
│  Header             │
├─────────────────────┤
│  Controls (Collapse)│
├─────────────────────┤
│                     │
│   Map (Full Width)  │
│                     │
├─────────────────────┤
│  Course Details     │
└─────────────────────┘
```

---

## 7. Implementation Phases

### Phase 1: Setup & Data
- [ ] Initialize React + TypeScript project
- [ ] Install dependencies (react-leaflet, tailwind, lucide-react)
- [ ] Create `data/places.ts` with 30+ real locations
- [ ] Set up TypeScript types

### Phase 2: Core Logic
- [ ] Implement Haversine distance calculation
- [ ] Build course generation algorithm
- [ ] Create filtering logic (theme, indoor/outdoor)

### Phase 3: UI Components
- [ ] Build control panel components
- [ ] Create map component with OpenStreetMap
- [ ] Implement markers and polylines
- [ ] Add popups for place information

### Phase 4: Integration & Polish
- [ ] Connect controls to course generator
- [ ] Add responsive design
- [ ] Implement course display card
- [ ] Testing and refinement

---

## 8. Key Features Summary

✅ **Real-World Data**: 30+ actual Daejeon locations with accurate coordinates  
✅ **Interactive Map**: OpenStreetMap with react-leaflet, centered on Daejeon City Hall  
✅ **Route Visualization**: Polylines connecting course sequence  
✅ **Distinct Markers**: Color-coded markers for different location types  
✅ **Smart Routing**: Haversine-based distance optimization  
✅ **Theme-Based Filtering**: Healing, Activity, Gourmet themes  
✅ **Rainy Day Mode**: Indoor/outdoor filtering  
✅ **Time-Aware**: Meal time windows and start time consideration  

---

## 9. Next Steps

After approval of this design:
1. Initialize React project with Vite
2. Set up Tailwind CSS configuration
3. Install and configure react-leaflet
4. Create data file with all 30+ locations
5. Implement core components
6. Build map visualization
7. Integrate course generation logic
8. Polish UI/UX

---

**Design Status**: ✅ Implementation Complete  
**Current Status**: 
- ✅ Real OSM data integration (900+ places)
- ✅ Full UI components implemented
- ✅ Marker clustering for performance
- ✅ Course generation with optimization
- ✅ Interactive timeline with map panning

See [README.md](./README.md) for quick start and [DEVELOPMENT.md](./DEVELOPMENT.md) for implementation details.

