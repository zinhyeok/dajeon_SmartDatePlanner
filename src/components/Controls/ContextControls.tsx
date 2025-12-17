import React from 'react';
import { Heart, Users, Home, User, Car, Footprints } from 'lucide-react';
import { Companion, Transport } from '../../types';

interface ContextControlsProps {
  companion: Companion;
  transport: Transport;
  onCompanionChange: (companion: Companion) => void;
  onTransportChange: (transport: Transport) => void;
}

const companionOptions: { value: Companion; label: string; icon: React.ReactNode }[] = [
  { value: 'partner', label: 'Partner', icon: <Heart className="w-4 h-4" /> },
  { value: 'friend', label: 'Friend', icon: <Users className="w-4 h-4" /> },
  { value: 'family', label: 'Family', icon: <Home className="w-4 h-4" /> },
  { value: 'solo', label: 'Solo', icon: <User className="w-4 h-4" /> },
];

export const ContextControls: React.FC<ContextControlsProps> = ({
  companion,
  transport,
  onCompanionChange,
  onTransportChange,
}) => {
  return (
    <div className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Companion
        </label>
        <div className="grid grid-cols-2 gap-2">
          {companionOptions.map((option) => (
            <button
              key={option.value}
              onClick={() => onCompanionChange(option.value)}
              className={`flex items-center justify-center gap-2 px-3 py-2 rounded-lg border-2 transition-all ${
                companion === option.value
                  ? 'border-indigo-500 bg-indigo-50 text-indigo-700'
                  : 'border-gray-200 bg-white text-gray-700 hover:border-indigo-300'
              }`}
            >
              {option.icon}
              <span className="text-sm font-medium">{option.label}</span>
            </button>
          ))}
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Transport
        </label>
        <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg border border-gray-200">
          <div className="flex items-center gap-3">
            {transport === 'car' ? (
              <Car className="w-5 h-5 text-indigo-600" />
            ) : (
              <Footprints className="w-5 h-5 text-indigo-600" />
            )}
            <div>
              <p className="text-sm font-medium text-gray-900">
                {transport === 'car' ? 'Car' : 'Walking'}
              </p>
              <p className="text-xs text-gray-500">
                {transport === 'car'
                  ? 'Faster travel, parking time added'
                  : 'Max 1.5km between stops'}
              </p>
            </div>
          </div>
          <button
            onClick={() => onTransportChange(transport === 'car' ? 'foot' : 'car')}
            className={`relative w-12 h-6 rounded-full transition-colors ${
              transport === 'car' ? 'bg-indigo-500' : 'bg-gray-300'
            }`}
          >
            <span
              className={`absolute top-1 left-1 w-4 h-4 bg-white rounded-full transition-transform ${
                transport === 'car' ? 'transform translate-x-6' : ''
              }`}
            />
          </button>
        </div>
      </div>
    </div>
  );
};

