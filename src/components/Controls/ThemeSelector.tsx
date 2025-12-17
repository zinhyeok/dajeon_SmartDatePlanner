import React from 'react';
import { Heart, Utensils, Activity } from 'lucide-react';
import { Theme } from '../../types';

interface ThemeSelectorProps {
  selectedTheme: Theme | null;
  onSelectTheme: (theme: Theme | null) => void;
}

const themes: { value: Theme; label: string; icon: React.ReactNode; color: string }[] = [
  {
    value: 'Healing',
    label: 'Healing',
    icon: <Heart className="w-5 h-5" />,
    color: 'bg-green-500',
  },
  {
    value: 'Gourmet',
    label: 'Gourmet',
    icon: <Utensils className="w-5 h-5" />,
    color: 'bg-orange-500',
  },
  {
    value: 'Activity',
    label: 'Activity',
    icon: <Activity className="w-5 h-5" />,
    color: 'bg-blue-500',
  },
];

export const ThemeSelector: React.FC<ThemeSelectorProps> = ({
  selectedTheme,
  onSelectTheme,
}) => {
  return (
    <div className="space-y-2">
      <label className="block text-sm font-medium text-gray-700 mb-2">
        Select Theme (Optional)
      </label>
      <div className="flex flex-col gap-2">
        {themes.map((theme) => {
          const isSelected = selectedTheme === theme.value;
          return (
            <button
              key={theme.value}
              onClick={() => onSelectTheme(isSelected ? null : theme.value)}
              className={`flex items-center gap-3 px-4 py-3 rounded-lg border-2 transition-all ${
                isSelected
                  ? 'border-indigo-500 bg-indigo-50 text-indigo-900'
                  : 'border-gray-200 bg-white text-gray-700 hover:border-indigo-300 hover:bg-indigo-50'
              }`}
            >
              <div
                className={`${theme.color} text-white p-2 rounded-lg ${
                  isSelected ? 'ring-2 ring-indigo-500' : ''
                }`}
              >
                {theme.icon}
              </div>
              <span className="font-medium flex-1 text-left">{theme.label}</span>
              {isSelected && (
                <div className="w-5 h-5 bg-indigo-500 rounded-full flex items-center justify-center">
                  <div className="w-2 h-2 bg-white rounded-full"></div>
                </div>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
};

