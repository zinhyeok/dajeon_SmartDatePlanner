import React from 'react';
import { Cloud, CloudRain, Sun } from 'lucide-react';

interface RainyToggleProps {
  isRainy: boolean;
  onToggle: (isRainy: boolean) => void;
}

export const RainyToggle: React.FC<RainyToggleProps> = ({ isRainy, onToggle }) => {
  return (
    <div className="space-y-2">
      <label className="block text-sm font-medium text-gray-700 mb-2">
        Weather Mode
      </label>
      <button
        onClick={() => onToggle(!isRainy)}
        className={`w-full flex items-center justify-between px-4 py-3 rounded-lg border-2 transition-all ${
          isRainy
            ? 'border-indigo-500 bg-indigo-50'
            : 'border-gray-200 bg-white hover:border-indigo-300'
        }`}
      >
        <div className="flex items-center gap-3">
          {isRainy ? (
            <CloudRain className="w-5 h-5 text-indigo-600" />
          ) : (
            <Sun className="w-5 h-5 text-yellow-500" />
          )}
          <div className="text-left">
            <p className="font-medium text-gray-900">
              {isRainy ? 'Rainy Day Mode' : 'Sunny Day Mode'}
            </p>
            <p className="text-xs text-gray-500">
              {isRainy
                ? 'Prioritize indoor-friendly picks'
                : 'Balanced indoor/outdoor options'}
            </p>
          </div>
        </div>
        <div
          className={`relative w-12 h-6 rounded-full transition-colors ${
            isRainy ? 'bg-indigo-500' : 'bg-gray-300'
          }`}
        >
          <div
            className={`absolute top-1 left-1 w-4 h-4 bg-white rounded-full transition-transform ${
              isRainy ? 'transform translate-x-6' : ''
            }`}
          />
        </div>
      </button>
    </div>
  );
};

