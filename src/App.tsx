import React, { useState, useEffect, useMemo, ErrorInfo, ReactNode, lazy, Suspense } from 'react';
import { Sparkles, Map as MapIcon } from 'lucide-react';
import { LocationSearch } from './components/Controls/LocationSearch';
import { CourseTimeline } from './components/Controls/CourseTimeline';
import { WeatherControls } from './components/Controls/WeatherControls';
import { ContextControls } from './components/Controls/ContextControls';
import { AnchorsControls } from './components/Controls/AnchorsControls';
import { ConstraintsControls } from './components/Controls/ConstraintsControls';
import { StartEndControls } from './components/Controls/StartEndControls';
import { CourseResultPanel } from './components/CourseResultPanel';
import { generateBigData } from './utils/mockDataGenerator';
import {
  generateCourse,
  GeneratedCourse,
  DEFAULT_LUNCH_WINDOW,
  DEFAULT_DINNER_WINDOW,
} from './utils/courseGenerator';
import { INITIAL_PREFERENCES, updatePreference, PreferenceWeights, extractTagsFromPlace } from './utils/UserPreferenceModel';
import { fetchCurrentWeather } from './utils/weatherApi';
import { Place, Theme, Companion, Transport, Intensity } from './types';
import { MealTimeControls } from './components/Controls/MealTimeControls';

// Lazy load the map component to avoid SSR issues with react-leaflet
const DateCourseMap = lazy(() => import('./components/Map/DateCourseMap').then(module => ({ default: module.DateCourseMap })));

// Error Boundary Component
class ErrorBoundary extends React.Component<
  { children: ReactNode },
  { hasError: boolean; error: Error | null }
> {
  constructor(props: { children: ReactNode }) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Error caught by boundary:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="h-screen flex items-center justify-center bg-red-50">
          <div className="text-center p-8">
            <h1 className="text-2xl font-bold text-red-600 mb-4">Something went wrong</h1>
            <p className="text-red-800 mb-4">{this.state.error?.message || 'Unknown error'}</p>
            <button
              onClick={() => window.location.reload()}
              className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700"
            >
              Reload Page
            </button>
            <details className="mt-4 text-left">
              <summary className="cursor-pointer text-red-700">Error Details</summary>
              <pre className="mt-2 p-4 bg-red-100 rounded text-xs overflow-auto max-h-64">
                {this.state.error?.stack}
              </pre>
            </details>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

function App() {
  const [places, setPlaces] = useState<Place[]>([]);
  const [startLocation, setStartLocation] = useState<Place | null>(null);
  const [isRainy, setIsRainy] = useState(false);
  const [temperature, setTemperature] = useState(20);
  const [useLiveWeather, setUseLiveWeather] = useState(false);
  const [preferences, setPreferences] = useState<PreferenceWeights>(INITIAL_PREFERENCES);
  const [lockedSteps, setLockedSteps] = useState<Record<number, Place>>({});
  const [course, setCourse] = useState<GeneratedCourse | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedPlace, setSelectedPlace] = useState<Place | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [recentBoosts, setRecentBoosts] = useState<string[]>([]);
  const [mealWindows, setMealWindows] = useState({
    lunch: DEFAULT_LUNCH_WINDOW,
    dinner: DEFAULT_DINNER_WINDOW,
  });
  const [companion, setCompanion] = useState<Companion>('solo');
  const [transport, setTransport] = useState<Transport>('foot');
  const [intensity, setIntensity] = useState<Intensity>('relaxed');
  const [duration, setDuration] = useState<number>(6);
  const [lockedPlaces, setLockedPlaces] = useState<Place[]>([]);
  const [endLocation, setEndLocation] = useState<Place | null>(null);
  const [endTime, setEndTime] = useState<Date | null>(null);

  const [startTime, setStartTime] = useState<Date>(() => {
    const now = new Date();
    now.setHours(10, 0, 0, 0);
    return now;
  });

  // Live weather fetch
  useEffect(() => {
    const shouldFetch = useLiveWeather && startLocation;
    if (!shouldFetch) return;

    fetchCurrentWeather(startLocation!.lat, startLocation!.lng)
      .then((snapshot) => {
        setTemperature(Math.round(snapshot.temp));
        setIsRainy(snapshot.isRainy);
      })
      .catch(() => {
        // Ignore errors; keep manual settings
      });
  }, [useLiveWeather, startLocation]);

  // Load places on mount
  useEffect(() => {
    const loadPlaces = async () => {
      console.log('Loading places...');
      
      // Try to load real OSM data first
      try {
        const realPlacesModule = await import('./data/realPlaces.json');
        const realPlaces = (realPlacesModule.default || realPlacesModule) as Place[];
        
        if (Array.isArray(realPlaces) && realPlaces.length > 0) {
          // Use ONLY real data - no mixing with fake data
          setPlaces(realPlaces);
          console.log(`✅ Loaded ${realPlaces.length} real places from OSM (no fake data)`);
          return;
        }
      } catch (error) {
        // Real data not available, use generated
        console.log('ℹ️  Real places data not found, using generated data');
      }
      
      // Fallback to generated data
      const generatedPlaces = generateBigData();
      setPlaces(generatedPlaces);
      console.log(`Loaded ${generatedPlaces.length} generated places`);
    };
    
    loadPlaces();
  }, []);

  // Set default start location (Daejeon City Hall if available)
  useEffect(() => {
    if (places.length > 0 && !startLocation) {
      const cityHall = places.find((p) => p.id.includes('city-hall') || p.name.includes('City Hall'));
      if (cityHall) {
        setStartLocation(cityHall);
      } else {
        // Fallback to first place
        setStartLocation(places[0]);
      }
    }
  }, [places, startLocation]);

  // Convert lockedPlaces to lockedSteps format (by sequence index)
  // For now, we'll use a simple approach: locked places will be placed in order
  const convertLockedPlacesToSteps = (): Record<number, Place> => {
    const result: Record<number, Place> = {};
    // This will be handled during generation - we'll try to place locked places in appropriate steps
    return result;
  };

  // Handle course generation
  const handleGenerateCourse = () => {
    if (!startLocation) {
      setError('Please select a start location');
      return;
    }

    setIsGenerating(true);
    setError(null);

    // Small delay to show loading state
    setTimeout(() => {
      try {
        const generated = generateCourse(places, {
          startLocation,
          userPreferences: preferences,
          weather: { temp: temperature, isRainy },
          startTime,
          endLocation: endLocation || undefined,
          endTime: endTime || undefined,
          mustVisitPlaces: lockedPlaces.length > 0 ? lockedPlaces : undefined,
          lockedSteps,
          mealWindows,
          companion,
          transport,
          intensity,
          duration,
        });

        if (generated) {
          setCourse(generated);
        } else {
          setError('Could not generate a course. Try different options.');
        }
      } catch (err) {
        setError('An error occurred while generating the course.');
        console.error(err);
      } finally {
        setIsGenerating(false);
      }
    }, 300);
  };

  // Get course sequence for map
  const courseSequence = useMemo(() => {
    return course?.sequence || [];
  }, [course]);

  return (
    <ErrorBoundary>
      <div className="h-screen flex flex-col bg-gray-50">
      {/* Header */}
      <header className="bg-gradient-to-r from-indigo-600 to-indigo-700 text-white shadow-lg z-10">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center gap-3">
            <Sparkles className="w-8 h-8" />
            <div>
              <h1 className="text-2xl font-bold">Daejeon Smart Date Planner</h1>
              <p className="text-sm text-indigo-200">Plan your perfect date course in Daejeon</p>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <div className="flex-1 flex flex-row overflow-hidden">
        {/* Left Sidebar - Controls */}
        <aside className="w-80 bg-white border-r border-gray-200 flex flex-col overflow-hidden flex-shrink-0">
          <div className="p-4 space-y-4 overflow-y-auto flex-1">
            <div className="space-y-4">
              <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                <MapIcon className="w-5 h-5 text-indigo-600" />
                Course Settings
              </h2>

              {/* Start & End Controls */}
              <StartEndControls
                places={places}
                startLocation={startLocation}
                startTime={startTime}
                endLocation={endLocation}
                endTime={endTime}
                onStartLocationChange={setStartLocation}
                onStartTimeChange={setStartTime}
                onEndLocationChange={setEndLocation}
                onEndTimeChange={setEndTime}
              />

              {/* Section 1: Context */}
              <div className="p-4 bg-slate-50 border border-slate-200 rounded-lg">
                <h3 className="text-sm font-semibold text-gray-900 mb-3">Context</h3>
                <ContextControls
                  companion={companion}
                  transport={transport}
                  onCompanionChange={setCompanion}
                  onTransportChange={setTransport}
                />
              </div>

              {/* Section 2: Anchors (Must Visit Places) */}
              <div className="p-4 bg-slate-50 border border-slate-200 rounded-lg">
                <h3 className="text-sm font-semibold text-gray-900 mb-3">Must Visit Places</h3>
                <AnchorsControls
                  places={places}
                  lockedPlaces={lockedPlaces}
                  onAddLocked={(place) => {
                    if (!lockedPlaces.find((p) => p.id === place.id)) {
                      setLockedPlaces([...lockedPlaces, place]);
                    }
                  }}
                  onRemoveLocked={(placeId) => {
                    setLockedPlaces(lockedPlaces.filter((p) => p.id !== placeId));
                  }}
                />
              </div>

              {/* Section 3: Constraints */}
              <div className="p-4 bg-slate-50 border border-slate-200 rounded-lg">
                <h3 className="text-sm font-semibold text-gray-900 mb-3">Constraints</h3>
                <ConstraintsControls
                  duration={duration}
                  intensity={intensity}
                  onDurationChange={setDuration}
                  onIntensityChange={setIntensity}
                />
              </div>

              {/* Weather Controls */}
              <WeatherControls
                isRainy={isRainy}
                temperature={temperature}
                useLiveWeather={useLiveWeather}
                onChange={(next) => {
                  if (typeof next.useLiveWeather === 'boolean') {
                    setUseLiveWeather(next.useLiveWeather);
                  }
                  if (typeof next.isRainy === 'boolean') {
                    setIsRainy(next.isRainy);
                  }
                  if (typeof next.temperature === 'number') {
                    setTemperature(next.temperature);
                  }
                }}
              />

              {/* Meal Time Windows */}
              <MealTimeControls
                lunchWindow={mealWindows.lunch}
                dinnerWindow={mealWindows.dinner}
                onChange={(next) => {
                  setMealWindows((prev) => ({
                    lunch: next.lunch ?? prev.lunch,
                    dinner: next.dinner ?? prev.dinner,
                  }));
                }}
              />

              {/* AI Status */}
              <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-700">
                <p className="font-semibold text-slate-900 mb-1">AI Learning</p>
                <p>
                  Prefers:{' '}
                  {Object.entries(preferences)
                    .filter(([, w]) => w > 1.05)
                    .sort((a, b) => b[1] - a[1])
                    .slice(0, 2)
                    .map(([k, v]) => `${k} (${v.toFixed(2)}x)`)
                    .join(', ') || 'None yet'}
                </p>
                <p>
                  Avoids:{' '}
                  {Object.entries(preferences)
                    .filter(([, w]) => w < 0.95)
                    .sort((a, b) => a[1] - b[1])
                    .slice(0, 2)
                    .map(([k, v]) => `${k} (${v.toFixed(2)}x)`)
                    .join(', ') || 'None yet'}
                </p>
                {recentBoosts.length > 0 && (
                  <div className="mt-2 flex flex-wrap gap-1">
                    {recentBoosts.map((b) => (
                      <span
                        key={b}
                        className="px-2 py-1 rounded-full bg-amber-100 text-amber-800 border border-amber-200 text-[11px] animate-pulse"
                      >
                        {b} 🔼
                      </span>
                    ))}
                  </div>
                )}
              </div>

              {/* Error Message */}
              {error && (
                <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
                  <p className="text-sm text-red-800">{error}</p>
                </div>
              )}
            </div>
          </div>

          {/* Generate Button - Sticky at bottom */}
          <div className="p-4 border-t border-gray-200 bg-white">
            <button
              onClick={handleGenerateCourse}
              disabled={!startLocation || isGenerating}
              className={`w-full py-3 px-4 rounded-lg font-semibold text-white transition-all ${
                !startLocation || isGenerating
                  ? 'bg-gray-400 cursor-not-allowed'
                  : 'bg-indigo-600 hover:bg-indigo-700 active:scale-95 shadow-lg hover:shadow-xl'
              }`}
            >
              {isGenerating ? (
                <span className="flex items-center justify-center gap-2">
                  <svg
                    className="animate-spin h-5 w-5"
                    xmlns="http://www.w3.org/2000/svg"
                    fill="none"
                    viewBox="0 0 24 24"
                  >
                    <circle
                      className="opacity-25"
                      cx="12"
                      cy="12"
                      r="10"
                      stroke="currentColor"
                      strokeWidth="4"
                    ></circle>
                    <path
                      className="opacity-75"
                      fill="currentColor"
                      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                    ></path>
                  </svg>
                  Generating...
                </span>
              ) : (
                'Generate Course'
              )}
            </button>
          </div>

          {/* Timeline Section - Hidden but kept for Like/Dislike callbacks */}
          <div className="hidden">
            <CourseTimeline
              course={courseSequence}
              startTime={startTime}
              onPlaceClick={setSelectedPlace}
              onLike={(place, idx) => {
                const prevPrefs = preferences;
                const nextPrefs = updatePreference(place, 'LIKE', prevPrefs);
                const boosts = extractTagsFromPlace(place)
                  .map((tag) => {
                    const diff = (nextPrefs[tag] ?? 1) - (prevPrefs[tag] ?? 1);
                    return diff > 0 ? `${tag} +${diff.toFixed(2)}` : null;
                  })
                  .filter(Boolean) as string[];

                const nextLocked = idx > 0 ? { ...lockedSteps, [idx]: place } : { ...lockedSteps };

                setPreferences(nextPrefs);
                setLockedSteps(nextLocked);
                setRecentBoosts(boosts);
                setToastMessage('AI learned your taste! Re-optimizing remaining steps...');
                setIsGenerating(true);

                setTimeout(() => {
                  try {
                    const generated = generateCourse(places, {
                      startLocation: startLocation || places[0],
                      userPreferences: nextPrefs,
                      weather: { temp: temperature, isRainy },
                      startTime,
                      endLocation: endLocation || undefined,
                      endTime: endTime || undefined,
                      mustVisitPlaces: lockedPlaces.length > 0 ? lockedPlaces : undefined,
                      lockedSteps: nextLocked,
                      mealWindows,
                      companion,
                      transport,
                      intensity,
                      duration,
                    });
                    if (generated) {
                      setCourse(generated);
                    } else {
                      setError('Could not re-optimize the course after like.');
                    }
                  } catch (err) {
                    setError('An error occurred while re-optimizing.');
                  } finally {
                    setIsGenerating(false);
                    setTimeout(() => setToastMessage(null), 1500);
                  }
                }, 50);
              }}
              onDislike={(place, idx) => {
                const nextPrefs = updatePreference(place, 'DISLIKE', preferences);
                setPreferences(nextPrefs);
                const nextLocked = { ...lockedSteps };
                delete nextLocked[idx];
                setLockedSteps(nextLocked);

                setIsGenerating(true);
                setTimeout(() => {
                  try {
                    const filtered = places.filter((p) => p.id !== place.id);
                    const generated = generateCourse(filtered, {
                      startLocation: startLocation || filtered[0],
                      userPreferences: nextPrefs,
                      weather: { temp: temperature, isRainy },
                      startTime,
                      endLocation: endLocation || undefined,
                      endTime: endTime || undefined,
                      mustVisitPlaces: lockedPlaces.length > 0 ? lockedPlaces : undefined,
                      lockedSteps: nextLocked,
                      mealWindows,
                      companion,
                      transport,
                      intensity,
                      duration,
                    });
                    if (generated) {
                      setCourse(generated);
                    } else {
                      setError('Could not reroll this step. Try again.');
                    }
                  } catch (err) {
                    setError('An error occurred while rerolling.');
                  } finally {
                    setIsGenerating(false);
                  }
                }, 50);
              }}
              lockedSteps={new Set(Object.keys(lockedSteps).map((k) => Number(k)))}
            />
          </div>
        </aside>

        {/* Middle - Course Result Panel (Conditional) */}
        {course && course.steps && course.steps.length > 0 && (
          <CourseResultPanel steps={course.steps} />
        )}

        {/* Right - Map */}
        <main className="flex-1 relative overflow-hidden">
          <Suspense fallback={
            <div className="w-full h-full flex items-center justify-center bg-gray-100">
              <div className="text-gray-500">Loading map...</div>
            </div>
          }>
            <DateCourseMap
              places={places}
              courseSequence={courseSequence}
              startLocation={startLocation || undefined}
              selectedPlace={selectedPlace || undefined}
            />
          </Suspense>
        </main>
      </div>
      {toastMessage && (
        <div className="fixed bottom-4 right-4 z-50">
          <div className="bg-indigo-600 text-white px-4 py-3 rounded-lg shadow-lg text-sm">
            {toastMessage}
          </div>
        </div>
      )}
      </div>
    </ErrorBoundary>
  );
}

export default App;

