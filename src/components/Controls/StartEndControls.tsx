import React, { useState } from 'react';
import { MapPin, Clock, ChevronDown, ChevronUp } from 'lucide-react';
import { Place } from '../../types';
import { LocationSearch } from './LocationSearch';

interface StartEndControlsProps {
  places: Place[];
  startLocation: Place | null;
  startTime: Date;
  endLocation: Place | null;
  endTime: Date | null;
  onStartLocationChange: (place: Place | null) => void;
  onStartTimeChange: (time: Date) => void;
  onEndLocationChange: (place: Place | null) => void;
  onEndTimeChange: (time: Date | null) => void;
}

export const StartEndControls: React.FC<StartEndControlsProps> = ({
  places,
  startLocation,
  startTime,
  endLocation,
  endTime,
  onStartLocationChange,
  onStartTimeChange,
  onEndLocationChange,
  onEndTimeChange,
}) => {
  const [showEndSection, setShowEndSection] = useState(false);

  const formatDateTime = (date: Date): string => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    return `${year}-${month}-${day}T${hours}:${minutes}`;
  };

  const handleDateTimeChange = (value: string, isEnd: boolean = false) => {
    const date = new Date(value);
    if (isEnd) {
      onEndTimeChange(date);
    } else {
      onStartTimeChange(date);
    }
  };

  return (
    <div className="space-y-4">
      {/* Start Section */}
      <div className="p-4 bg-gradient-to-br from-indigo-50 to-indigo-100 border border-indigo-200 rounded-lg">
        <div className="flex items-center gap-2 mb-3">
          <MapPin className="w-5 h-5 text-indigo-600" />
          <h3 className="text-sm font-semibold text-gray-900">Start</h3>
        </div>

        <div className="space-y-3">
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">
              Location
            </label>
            <LocationSearch
              places={places}
              selectedPlace={startLocation}
              onSelectPlace={onStartLocationChange}
              placeholder="Search start location..."
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">
              <div className="flex items-center gap-1">
                <Clock className="w-4 h-4" />
                Start Time
              </div>
            </label>
            <input
              type="datetime-local"
              value={formatDateTime(startTime)}
              onChange={(e) => handleDateTimeChange(e.target.value, false)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
            />
          </div>
        </div>
      </div>

      {/* End Section - Collapsible */}
      <div className="border border-gray-200 rounded-lg overflow-hidden">
        <button
          onClick={() => setShowEndSection(!showEndSection)}
          className="w-full flex items-center justify-between p-4 bg-gray-50 hover:bg-gray-100 transition-colors"
        >
          <div className="flex items-center gap-2">
            <MapPin className="w-5 h-5 text-gray-600" />
            <h3 className="text-sm font-semibold text-gray-900">
              Destination / End Time {endLocation || endTime ? '(Set)' : '(Optional)'}
            </h3>
          </div>
          {showEndSection ? (
            <ChevronUp className="w-5 h-5 text-gray-600" />
          ) : (
            <ChevronDown className="w-5 h-5 text-gray-600" />
          )}
        </button>

        {showEndSection && (
          <div className="p-4 bg-white space-y-3 border-t border-gray-200">
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">
                End Location (Optional)
              </label>
              <LocationSearch
                places={places}
                selectedPlace={endLocation}
                onSelectPlace={onEndLocationChange}
                placeholder="Search end location..."
              />
              {endLocation && (
                <button
                  onClick={() => onEndLocationChange(null)}
                  className="mt-1 text-xs text-red-600 hover:text-red-800"
                >
                  Clear end location
                </button>
              )}
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">
                <div className="flex items-center gap-1">
                  <Clock className="w-4 h-4" />
                  End Time (Optional)
                </div>
              </label>
              <input
                type="datetime-local"
                value={endTime ? formatDateTime(endTime) : ''}
                onChange={(e) =>
                  handleDateTimeChange(e.target.value, true)
                }
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
              />
              {endTime && (
                <button
                  onClick={() => onEndTimeChange(null)}
                  className="mt-1 text-xs text-red-600 hover:text-red-800"
                >
                  Clear end time
                </button>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

