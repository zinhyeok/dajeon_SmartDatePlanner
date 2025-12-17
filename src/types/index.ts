export type PlaceType = 'landmark' | 'cafe' | 'restaurant' | 'shopping' | 'activity' | 'bakery' | 'bar' | 'culture';
export type MealType = 'lunch' | 'dinner' | 'cafe' | null;
export type Theme = 'Healing' | 'Activity' | 'Gourmet';
export type Companion = 'partner' | 'friend' | 'family' | 'solo';
export type Transport = 'car' | 'foot';
export type Intensity = 'relaxed' | 'packed';

export interface Place {
  id: string;
  name: string;
  nameKo: string;           // Korean name
  type: PlaceType;
  lat: number;              // Real-world latitude
  lng: number;              // Real-world longitude
  isIndoor: boolean;        // Indoor/outdoor flag
  description: string;
  themes: Theme[];         // Compatible themes
  mealType?: MealType;
  estimatedDuration?: number; // Minutes
}

