import React, { useState } from 'react';
import { MapPin, X, Lock } from 'lucide-react';
import { Place } from '../../types';
import { LocationSearch } from './LocationSearch';

interface AnchorsControlsProps {
  places: Place[];
  lockedPlaces: Place[];
  onAddLocked: (place: Place) => void;
  onRemoveLocked: (placeId: string) => void;
}

export const AnchorsControls: React.FC<AnchorsControlsProps> = ({
  places,
  lockedPlaces,
  onAddLocked,
  onRemoveLocked,
}) => {
  const [searchPlace, setSearchPlace] = useState<Place | null>(null);

  const handleAddPlace = (place: Place) => {
    if (!lockedPlaces.find((p) => p.id === place.id)) {
      onAddLocked(place);
      setSearchPlace(null);
    }
  };

  return (
    <div className="space-y-3">
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Anchor Places
        </label>
        <p className="text-xs text-gray-500 mb-2">
          Lock specific places to include in your course
        </p>
        <LocationSearch
          places={places}
          selectedPlace={searchPlace}
          onSelectPlace={(place) => {
            setSearchPlace(place);
            if (place) {
              handleAddPlace(place);
            }
          }}
          placeholder="Search and add places..."
        />
      </div>

      {lockedPlaces.length > 0 && (
        <div className="space-y-2">
          {lockedPlaces.map((place) => (
            <div
              key={place.id}
              className="flex items-center gap-2 p-2 bg-indigo-50 border border-indigo-200 rounded-lg"
            >
              <Lock className="w-4 h-4 text-indigo-600 flex-shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-indigo-900 truncate">
                  {place.name}
                </p>
                <p className="text-xs text-indigo-700 truncate">{place.nameKo}</p>
              </div>
              <button
                onClick={() => onRemoveLocked(place.id)}
                className="p-1 text-indigo-600 hover:text-indigo-800 hover:bg-indigo-100 rounded transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

