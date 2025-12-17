import React from 'react';
import { Clock, MapPin, Utensils, Coffee, Activity, Landmark, ShoppingBag, X } from 'lucide-react';
import { Place } from '../types';
import { CourseStep } from '../utils/courseGenerator';

interface CourseResultPanelProps {
  steps: CourseStep[];
  onClose?: () => void;
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

const formatTime = (date: Date): string => {
  return date.toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit',
  });
};

const formatDuration = (minutes: number): string => {
  if (minutes < 60) return `${minutes}m`;
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  return mins > 0 ? `${hours}h ${mins}m` : `${hours}h`;
};

export const CourseResultPanel: React.FC<CourseResultPanelProps> = ({ steps, onClose }) => {
  if (steps.length === 0) {
    return null;
  }

  return (
    <div className="h-full w-80 flex flex-col bg-white border-r border-gray-200 shadow-lg flex-shrink-0">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-gray-200 bg-gradient-to-r from-indigo-600 to-indigo-700 text-white">
        <h2 className="text-lg font-semibold">Course Timeline</h2>
        {onClose && (
          <button
            onClick={onClose}
            className="p-1 hover:bg-indigo-800 rounded transition-colors"
            aria-label="Close panel"
          >
            <X className="w-5 h-5" />
          </button>
        )}
      </div>

      {/* Timeline List */}
      <div className="flex-1 overflow-y-auto p-4">
        <div className="space-y-3">
          {steps.map((step, index) => {
            const duration = step.endTime.getTime() - step.startTime.getTime();
            const durationMinutes = Math.round(duration / 60000);
            const isStart = index === 0;
            const isEnd = index === steps.length - 1;

            return (
              <div
                key={`${step.place.id}-${index}`}
                className={`relative p-4 rounded-lg border-2 transition-all ${
                  isStart
                    ? 'bg-green-50 border-green-200'
                    : isEnd
                    ? 'bg-purple-50 border-purple-200'
                    : step.place.mealType === 'lunch'
                    ? 'bg-orange-50 border-orange-200'
                    : step.place.mealType === 'dinner'
                    ? 'bg-red-50 border-red-200'
                    : step.place.mealType === 'cafe'
                    ? 'bg-amber-50 border-amber-200'
                    : 'bg-blue-50 border-blue-200'
                }`}
              >
                {/* Timeline connector */}
                {index < steps.length - 1 && (
                  <div className="absolute left-6 top-16 bottom-0 w-0.5 bg-gray-300" />
                )}

                {/* Icon and Content */}
                <div className="flex gap-3">
                  {/* Icon */}
                  <div
                    className={`relative z-10 flex-shrink-0 w-12 h-12 rounded-full flex items-center justify-center text-white shadow-lg ${
                      isStart
                        ? 'bg-green-500'
                        : isEnd
                        ? 'bg-purple-500'
                        : step.place.mealType === 'lunch'
                        ? 'bg-orange-500'
                        : step.place.mealType === 'dinner'
                        ? 'bg-red-500'
                        : step.place.mealType === 'cafe'
                        ? 'bg-amber-600'
                        : 'bg-blue-500'
                    }`}
                  >
                    {getPlaceIcon(step.place)}
                  </div>

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    {/* Time Slot */}
                    <div className="flex items-center gap-2 mb-2">
                      <Clock className="w-4 h-4 text-gray-500" />
                      <span className="text-sm font-semibold text-gray-900">
                        {formatTime(step.startTime)} - {formatTime(step.endTime)}
                      </span>
                      <span className="text-xs text-gray-500">
                        ({formatDuration(durationMinutes)})
                      </span>
                    </div>

                    {/* Place Name */}
                    <h3 className="text-base font-bold text-gray-900 mb-1 truncate">
                      {step.place.name}
                    </h3>
                    <p className="text-sm text-gray-600 mb-2 truncate">{step.place.nameKo}</p>

                    {/* Type & Tags */}
                    <div className="flex items-center gap-2 flex-wrap mb-2">
                      <span className="text-xs px-2 py-1 bg-white rounded border border-gray-200 capitalize">
                        {step.place.type}
                      </span>
                      {step.place.mealType && (
                        <span className="text-xs px-2 py-1 bg-white rounded border border-gray-200 capitalize">
                          {step.place.mealType}
                        </span>
                      )}
                    </div>

                    {/* Description */}
                    <p className="text-sm text-gray-700 line-clamp-2 mb-2">
                      {step.place.description}
                    </p>

                    {/* Step Number */}
                    <div className="text-xs text-gray-400">
                      Step {index + 1} of {steps.length}
                      {isStart && ' • Start'}
                      {isEnd && ' • End'}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Footer Summary */}
      {steps.length > 0 && (
        <div className="p-4 border-t border-gray-200 bg-gray-50">
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <span className="text-gray-600">Duration:</span>
              <span className="ml-2 font-semibold text-gray-900">
                {formatDuration(
                  Math.round(
                    (steps[steps.length - 1].endTime.getTime() -
                      steps[0].startTime.getTime()) /
                      60000
                  )
                )}
              </span>
            </div>
            <div>
              <span className="text-gray-600">Stops:</span>
              <span className="ml-2 font-semibold text-gray-900">{steps.length}</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

