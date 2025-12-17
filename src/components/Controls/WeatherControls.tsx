import React from 'react';
import { ThermometerSun, ThermometerSnowflake } from 'lucide-react';
import { RainyToggle } from './RainyToggle';

interface WeatherControlsProps {
  isRainy: boolean;
  temperature: number;
  useLiveWeather: boolean;
  onChange: (next: { isRainy?: boolean; temperature?: number; useLiveWeather?: boolean }) => void;
}

export const WeatherControls: React.FC<WeatherControlsProps> = ({
  isRainy,
  temperature,
  useLiveWeather,
  onChange,
}) => {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-medium text-gray-700">Live Weather Mode</p>
          <p className="text-xs text-gray-500">Auto-fetch from OpenWeather</p>
        </div>
        <button
          onClick={() => onChange({ useLiveWeather: !useLiveWeather })}
          className={`relative w-12 h-6 rounded-full transition-colors ${
            useLiveWeather ? 'bg-indigo-500' : 'bg-gray-300'
          }`}
        >
          <span
            className={`absolute top-1 left-1 w-4 h-4 bg-white rounded-full transition-transform ${
              useLiveWeather ? 'transform translate-x-6' : ''
            }`}
          />
        </button>
      </div>

      <RainyToggle
        isRainy={isRainy}
        onToggle={(next) => onChange({ isRainy: next })}
      />

      <div className="space-y-2">
        <label className="block text-sm font-medium text-gray-700">
          Temperature (°C)
        </label>
        <div className="flex items-center gap-3">
          <ThermometerSnowflake className="w-4 h-4 text-blue-500" />
          <input
            type="range"
            min={-10}
            max={40}
            value={temperature}
            onChange={(e) => onChange({ temperature: Number(e.target.value) })}
            className="flex-1 accent-indigo-600"
          />
          <ThermometerSun className="w-4 h-4 text-orange-500" />
        </div>
        <div className="text-sm text-gray-600 flex justify-between">
          <span>-10°C</span>
          <span className="font-semibold text-indigo-700">{temperature}°C</span>
          <span>40°C</span>
        </div>
      </div>
    </div>
  );
};


