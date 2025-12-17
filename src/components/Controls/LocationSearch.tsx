import React, { useState, useMemo, useRef, useEffect } from 'react';
import { Search, MapPin, X } from 'lucide-react';
import { Place } from '../../types';

interface LocationSearchProps {
  places: Place[];
  selectedPlace: Place | null;
  onSelectPlace: (place: Place | null) => void;
  placeholder?: string;
}

export const LocationSearch: React.FC<LocationSearchProps> = ({
  places,
  selectedPlace,
  onSelectPlace,
  placeholder = 'Search for a location...',
}) => {
  const [query, setQuery] = useState('');
  const [isOpen, setIsOpen] = useState(false);
  const [highlightedIndex, setHighlightedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Filter places based on query
  const filteredPlaces = useMemo(() => {
    if (!query.trim()) {
      return places.slice(0, 10); // Show first 10 when no query
    }

    const lowerQuery = query.toLowerCase();
    return places
      .filter(
        (place) =>
          place.name.toLowerCase().includes(lowerQuery) ||
          place.nameKo.includes(query) ||
          place.description.toLowerCase().includes(lowerQuery)
      )
      .slice(0, 20); // Limit to 20 results for performance
  }, [query, places]);

  // Handle input change
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setQuery(e.target.value);
    setIsOpen(true);
    setHighlightedIndex(0);
    if (e.target.value === '') {
      onSelectPlace(null);
    }
  };

  // Handle place selection
  const handleSelectPlace = (place: Place) => {
    setQuery(place.name);
    onSelectPlace(place);
    setIsOpen(false);
    setHighlightedIndex(0);
  };

  // Handle clear
  const handleClear = () => {
    setQuery('');
    onSelectPlace(null);
    setIsOpen(false);
    inputRef.current?.focus();
  };

  // Handle keyboard navigation
  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (!isOpen || filteredPlaces.length === 0) return;

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setHighlightedIndex((prev) =>
          prev < filteredPlaces.length - 1 ? prev + 1 : prev
        );
        break;
      case 'ArrowUp':
        e.preventDefault();
        setHighlightedIndex((prev) => (prev > 0 ? prev - 1 : 0));
        break;
      case 'Enter':
        e.preventDefault();
        if (filteredPlaces[highlightedIndex]) {
          handleSelectPlace(filteredPlaces[highlightedIndex]);
        }
        break;
      case 'Escape':
        setIsOpen(false);
        break;
    }
  };

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node) &&
        inputRef.current &&
        !inputRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Scroll highlighted item into view
  useEffect(() => {
    if (isOpen && dropdownRef.current) {
      const highlightedElement = dropdownRef.current.children[highlightedIndex] as HTMLElement;
      if (highlightedElement) {
        highlightedElement.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
      }
    }
  }, [highlightedIndex, isOpen]);

  return (
    <div className="relative w-full">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={handleInputChange}
          onKeyDown={handleKeyDown}
          onFocus={() => setIsOpen(true)}
          placeholder={placeholder}
          className="w-full pl-10 pr-10 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition"
        />
        {query && (
          <button
            onClick={handleClear}
            className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
          >
            <X className="w-5 h-5" />
          </button>
        )}
      </div>

      {/* Dropdown */}
      {isOpen && filteredPlaces.length > 0 && (
        <div
          ref={dropdownRef}
          className="absolute z-50 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg max-h-80 overflow-y-auto"
        >
          {filteredPlaces.map((place, index) => (
            <button
              key={place.id}
              onClick={() => handleSelectPlace(place)}
              className={`w-full text-left px-4 py-3 hover:bg-indigo-50 transition-colors ${
                index === highlightedIndex ? 'bg-indigo-50' : ''
              } ${index !== filteredPlaces.length - 1 ? 'border-b border-gray-100' : ''}`}
            >
              <div className="flex items-start gap-3">
                <MapPin className="w-5 h-5 text-indigo-500 mt-0.5 flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-gray-900 truncate">{place.name}</p>
                  <p className="text-sm text-gray-600 truncate">{place.nameKo}</p>
                  <p className="text-xs text-gray-500 mt-1">
                    {place.type} • {place.themes.join(', ')}
                  </p>
                </div>
              </div>
            </button>
          ))}
        </div>
      )}

      {/* Selected place display */}
      {selectedPlace && !isOpen && (
        <div className="mt-2 p-3 bg-indigo-50 border border-indigo-200 rounded-lg">
          <div className="flex items-center gap-2">
            <MapPin className="w-4 h-4 text-indigo-600" />
            <div>
              <p className="text-sm font-medium text-indigo-900">{selectedPlace.name}</p>
              <p className="text-xs text-indigo-700">{selectedPlace.nameKo}</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

