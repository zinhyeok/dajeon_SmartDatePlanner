import React from 'react';

type MealWindow = { startMinutes: number; endMinutes: number };

export interface MealTimeControlsProps {
  lunchWindow: MealWindow;
  dinnerWindow: MealWindow;
  onChange: (next: { lunch?: MealWindow; dinner?: MealWindow }) => void;
}

function minutesToTimeString(minutes: number) {
  const hrs = Math.floor(minutes / 60)
    .toString()
    .padStart(2, '0');
  const mins = (minutes % 60).toString().padStart(2, '0');
  return `${hrs}:${mins}`;
}

function timeStringToMinutes(value: string) {
  const [h, m] = value.split(':').map((v) => Number(v));
  return h * 60 + m;
}

export const MealTimeControls: React.FC<MealTimeControlsProps> = ({
  lunchWindow,
  dinnerWindow,
  onChange,
}) => {
  const handleChange = (
    type: 'lunch' | 'dinner',
    field: 'startMinutes' | 'endMinutes',
    value: string
  ) => {
    const minutes = timeStringToMinutes(value);
    const next = type === 'lunch' ? { ...lunchWindow } : { ...dinnerWindow };
    next[field] = minutes;
    onChange({ [type]: next });
  };

  return (
    <div className="space-y-4">
      <div>
        <p className="text-sm font-medium text-gray-700">Lunch Time Window</p>
        <p className="text-xs text-gray-500 mb-2">Course will lock a lunch stop within this time</p>
        <div className="flex items-center gap-3">
          <label className="text-xs text-gray-600">Start</label>
          <input
            type="time"
            value={minutesToTimeString(lunchWindow.startMinutes)}
            onChange={(e) => handleChange('lunch', 'startMinutes', e.target.value)}
            className="flex-1 border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
          />
          <label className="text-xs text-gray-600">End</label>
          <input
            type="time"
            value={minutesToTimeString(lunchWindow.endMinutes)}
            onChange={(e) => handleChange('lunch', 'endMinutes', e.target.value)}
            className="flex-1 border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
          />
        </div>
      </div>

      <div>
        <p className="text-sm font-medium text-gray-700">Dinner Time Window</p>
        <p className="text-xs text-gray-500 mb-2">Course will lock a dinner stop within this time</p>
        <div className="flex items-center gap-3">
          <label className="text-xs text-gray-600">Start</label>
          <input
            type="time"
            value={minutesToTimeString(dinnerWindow.startMinutes)}
            onChange={(e) => handleChange('dinner', 'startMinutes', e.target.value)}
            className="flex-1 border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
          />
          <label className="text-xs text-gray-600">End</label>
          <input
            type="time"
            value={minutesToTimeString(dinnerWindow.endMinutes)}
            onChange={(e) => handleChange('dinner', 'endMinutes', e.target.value)}
            className="flex-1 border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
          />
        </div>
      </div>
    </div>
  );
};



