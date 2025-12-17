import React from 'react';
import { Clock, Zap } from 'lucide-react';
import { Intensity } from '../../types';

interface ConstraintsControlsProps {
  duration: number; // hours
  intensity: Intensity;
  onDurationChange: (hours: number) => void;
  onIntensityChange: (intensity: Intensity) => void;
}

export const ConstraintsControls: React.FC<ConstraintsControlsProps> = ({
  duration,
  intensity,
  onDurationChange,
  onIntensityChange,
}) => {
  return (
    <div className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          <div className="flex items-center gap-2">
            <Clock className="w-4 h-4" />
            Duration
          </div>
        </label>
        <div className="space-y-2">
          <input
            type="range"
            min={2}
            max={10}
            step={0.5}
            value={duration}
            onChange={(e) => onDurationChange(Number(e.target.value))}
            className="w-full accent-indigo-600"
          />
          <div className="flex justify-between text-xs text-gray-600">
            <span>2h</span>
            <span className="font-semibold text-indigo-700">{duration}h</span>
            <span>10h</span>
          </div>
          <p className="text-xs text-gray-500">
            {duration < 4 && 'Short course - lunch may be skipped'}
            {duration >= 4 && duration < 6 && 'Medium course - includes lunch'}
            {duration >= 6 && duration < 7 && 'Full day - includes lunch & dinner'}
            {duration >= 7 && 'Extended day - includes all meals & evening activity'}
          </p>
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          <div className="flex items-center gap-2">
            <Zap className="w-4 h-4" />
            Intensity
          </div>
        </label>
        <div className="space-y-2">
          <label className="flex items-center gap-3 p-3 border-2 rounded-lg cursor-pointer transition-all hover:border-indigo-300">
            <input
              type="radio"
              name="intensity"
              value="relaxed"
              checked={intensity === 'relaxed'}
              onChange={() => onIntensityChange('relaxed')}
              className="text-indigo-600 focus:ring-indigo-500"
            />
            <div className="flex-1">
              <p className="text-sm font-medium text-gray-900">Relaxed</p>
              <p className="text-xs text-gray-500">
                Fewer stops, longer stays (90+ min per place)
              </p>
            </div>
          </label>
          <label className="flex items-center gap-3 p-3 border-2 rounded-lg cursor-pointer transition-all hover:border-indigo-300">
            <input
              type="radio"
              name="intensity"
              value="packed"
              checked={intensity === 'packed'}
              onChange={() => onIntensityChange('packed')}
              className="text-indigo-600 focus:ring-indigo-500"
            />
            <div className="flex-1">
              <p className="text-sm font-medium text-gray-900">Packed</p>
              <p className="text-xs text-gray-500">
                More stops, shorter stays (60 min per place)
              </p>
            </div>
          </label>
        </div>
      </div>
    </div>
  );
};

