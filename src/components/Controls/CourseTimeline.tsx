import React from 'react';
import { Place } from '../../types';
import {
  MapPin,
  Utensils,
  Coffee,
  Activity,
  Landmark,
  ShoppingBag,
  Circle,
} from 'lucide-react';

interface CourseTimelineProps {
  course: Place[];
  startTime?: Date;
  onPlaceClick?: (place: Place) => void;
  onLike?: (place: Place, index: number) => void;
  onDislike?: (place: Place, index: number) => void;
  lockedSteps?: Set<number>;
}

const getPlaceIcon = (place: Place) => {
  if (place.mealType === 'lunch' || place.mealType === 'dinner') {
    return <Utensils className="w-5 h-5" />;
  }
  if (place.mealType === 'cafe') {
    return <Coffee className="w-5 h-5" />;
  }
  if (place.type === 'activity') {
    return <Activity className="w-5 h-5" />;
  }
  if (place.type === 'landmark') {
    return <Landmark className="w-5 h-5" />;
  }
  if (place.type === 'shopping') {
    return <ShoppingBag className="w-5 h-5" />;
  }
  return <MapPin className="w-5 h-5" />;
};

const getPlaceColor = (place: Place, index: number, total: number) => {
  if (index === 0) return 'bg-green-500';
  if (index === total - 1) return 'bg-purple-500';
  if (place.mealType === 'lunch') return 'bg-orange-500';
  if (place.mealType === 'dinner') return 'bg-red-500';
  if (place.mealType === 'cafe') return 'bg-amber-600';
  return 'bg-blue-500';
};

const formatTime = (minutes: number) => {
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  if (hours > 0) {
    return `${hours}h ${mins}m`;
  }
  return `${mins}m`;
};

export const CourseTimeline: React.FC<CourseTimelineProps> = ({
  course,
  startTime,
  onPlaceClick,
  onLike,
  onDislike,
  lockedSteps,
}) => {
  if (course.length === 0) {
    return (
      <div className="p-6 text-center text-gray-500">
        <p>No course generated yet.</p>
        <p className="text-sm mt-2">Select options and click "Generate Course"</p>
      </div>
    );
  }

  let currentTime = startTime
    ? new Date(startTime)
    : new Date(new Date().setHours(10, 0, 0, 0)); // Default 10:00 AM

  return (
    <div className="p-4">
      <h3 className="text-lg font-semibold text-gray-900 mb-4">Your Date Course</h3>
      <div className="relative">
        {/* Timeline line */}
        <div className="absolute left-6 top-0 bottom-0 w-0.5 bg-indigo-200"></div>

        <div className="space-y-6">
          {course.map((place, index) => {
            const color = getPlaceColor(place, index, course.length);
            const icon = getPlaceIcon(place);
            const duration = place.estimatedDuration || 60;
            const timeString = currentTime.toLocaleTimeString('en-US', {
              hour: '2-digit',
              minute: '2-digit',
            });

            // Update time for next place
            currentTime = new Date(
              currentTime.getTime() + duration * 60000
            );

            return (
              <div key={place.id} className="relative flex items-start gap-4">
                {/* Timeline dot */}
                <div
                  className={`relative z-10 ${color} rounded-full p-2 text-white shadow-lg`}
                >
                  {icon}
                </div>

                {/* Content card */}
                <div 
                  className={`flex-1 bg-white border border-gray-200 rounded-lg p-4 shadow-sm hover:shadow-md transition-shadow ${
                    onPlaceClick ? 'cursor-pointer hover:border-indigo-300 hover:bg-indigo-50' : ''
                  }`}
                  onClick={() => onPlaceClick?.(place)}
                >
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex-1">
                      <h4 className="font-semibold text-gray-900">{place.name}</h4>
                      <p className="text-sm text-gray-600">{place.nameKo}</p>
                    </div>
                    <span className="text-xs font-medium text-indigo-600 bg-indigo-50 px-2 py-1 rounded">
                      {timeString}
                    </span>
                  </div>

                  <div className="flex items-center gap-2 text-xs text-gray-500 mb-2">
                    <span className="capitalize">{place.type}</span>
                    {place.mealType && (
                      <>
                        <span>•</span>
                        <span className="capitalize">{place.mealType}</span>
                      </>
                    )}
                    <span>•</span>
                    <span>{formatTime(duration)}</span>
                  </div>

                  <p className="text-xs text-gray-600 line-clamp-2">{place.description}</p>

                  {index > 0 && (onLike || onDislike) && (
                    <div className="mt-3 pt-3 border-t border-gray-100 flex items-center gap-2">
                      <button
                        className="text-xs px-2 py-1 rounded bg-green-50 text-green-700 border border-green-200 hover:bg-green-100 transition-all"
                        onClick={(e) => {
                          e.stopPropagation();
                          onLike?.(place, index);
                        }}
                        title="Like this style - AI will learn and optimize"
                      >
                        👍 Like
                      </button>
                      <button
                        className="text-xs px-2 py-1 rounded bg-red-50 text-red-700 border border-red-200 hover:bg-red-100 transition-all"
                        onClick={(e) => {
                          e.stopPropagation();
                          onDislike?.(place, index);
                        }}
                        title="Reroll this place"
                      >
                        👎 Reroll
                      </button>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

