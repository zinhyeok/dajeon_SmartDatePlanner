# Daejeon Smart Date Course Planner

A React-based web application that recommends optimal date courses in Daejeon, Korea, using real-world location data from OpenStreetMap and interactive maps.

## ✨ Features

- **900+ Real Locations**: Real places from OpenStreetMap (OSM) in Daejeon
- **Interactive Map**: OpenStreetMap integration with marker clustering for performance
- **Smart Routing**: Haversine-based distance optimization
- **Theme-Based Filtering**: Healing, Activity, and Gourmet themes
- **Rainy Day Mode**: Indoor/outdoor filtering
- **Visual Timeline**: Beautiful timeline with clickable places
- **Real-World Coordinates**: Accurate lat/lng for all locations

## 🚀 Quick Start

### Installation

```bash
# Install dependencies
npm install

# Fetch real data from OpenStreetMap (optional - falls back to generated data)
npm run fetch-data
```

### Run Development Server

```bash
npm run dev
```

The app will automatically open at `http://localhost:3000`

## 📖 How to Use

1. **Select Start Location:**
   - Use the search box to find your starting point
   - Or use the default (Daejeon City Hall)

2. **Choose Options (Optional):**
   - Select a theme (Healing, Gourmet, or Activity)
   - Toggle Rainy Day Mode if needed

3. **Generate Course:**
   - Click "Generate Course" button
   - The system will create an optimal route:
     - Start → Activity → Lunch → Activity → Cafe → Dinner

4. **Explore:**
   - Click on timeline items to jump to locations on the map
   - View route on the map with colored markers
   - Check course statistics (distance, duration)

## 🎨 Course Sequence Colors

- **Green**: Start location
- **Blue**: Activities
- **Orange**: Lunch
- **Brown**: Cafe
- **Red**: Dinner
- **Purple**: End location

## 📁 Project Structure

```
src/
├── components/
│   ├── Map/
│   │   └── DateCourseMap.tsx      # Map component with clustering
│   └── Controls/
│       ├── LocationSearch.tsx     # Autocomplete search
│       ├── ThemeSelector.tsx      # Theme selection
│       ├── RainyToggle.tsx        # Weather mode toggle
│       └── CourseTimeline.tsx     # Timeline display
├── data/
│   └── realPlaces.json            # Real OSM data (generated)
├── utils/
│   ├── haversine.ts              # Optimized distance calculations
│   ├── courseGenerator.ts        # Course generation logic
│   └── mockDataGenerator.ts      # Fallback data generator
├── types/
│   └── index.ts                  # TypeScript interfaces
└── App.tsx                       # Main application
```

## 🔧 Data Management

### Using Real OSM Data (Recommended)

The app automatically uses real data if available:

```bash
# Fetch fresh real data from OpenStreetMap
npm run fetch-data
```

This fetches real places within 5km of Daejeon City Hall including:
- Restaurants, Cafes, Bakeries
- Parks, Museums, Attractions
- Shopping areas

**Data Quality**: The script filters out suspicious entries (typos, generic names) automatically.

### Fallback to Generated Data

If `src/data/realPlaces.json` doesn't exist, the app will use procedurally generated data for demonstration purposes.

## 🛠️ Development

```bash
# Development server
npm run dev

# Build for production
npm run build

# Preview production build
npm run preview

# Type check
npm run lint
```

## 📦 Dependencies

- `react` & `react-dom`: UI framework
- `react-leaflet`: React wrapper for Leaflet maps
- `leaflet`: Core mapping library
- `@changey/react-leaflet-markercluster`: Marker clustering for performance
- `lucide-react`: Icon library
- `tailwindcss`: Utility-first CSS framework
- `axios`: HTTP client for data fetching

## 🎯 Performance Optimizations

1. **Marker Clustering**: Groups nearby markers for smooth rendering of 900+ locations
2. **Filter-First Approach**: Distance calculations only run on filtered subsets
3. **Memoization**: React hooks optimize re-renders
4. **Chunked Loading**: Large datasets load incrementally

## 📚 Documentation

- **[DEVELOPMENT.md](./DEVELOPMENT.md)**: Detailed implementation and development guide
- **[DESIGN.md](./DESIGN.md)**: Architecture and design documentation

## 🐛 Troubleshooting

**Map not loading?**
- Check browser console for errors
- Ensure internet connection (needs OpenStreetMap tiles)

**No results found?**
- Try different theme options
- Disable Rainy Day Mode
- Select a different start location

**Performance issues?**
- Marker clustering should handle 900+ locations smoothly
- Try zooming in to reduce visible markers

## 📄 License

MIT
