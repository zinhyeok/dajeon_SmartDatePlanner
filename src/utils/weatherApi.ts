import axios from 'axios';

const API_KEY = 'YOUR_OPENWEATHER_KEY';
const BASE_URL = 'https://api.openweathermap.org/data/2.5/weather';

export interface WeatherSnapshot {
  temp: number;
  isRainy: boolean;
}

export async function fetchCurrentWeather(lat: number, lng: number): Promise<WeatherSnapshot> {
  const params = {
    lat,
    lon: lng,
    appid: API_KEY,
    units: 'metric',
  };

  const res = await axios.get(BASE_URL, { params });
  const data = res.data;
  const temp = typeof data?.main?.temp === 'number' ? data.main.temp : 20;
  const weatherCodes = (data?.weather || []).map((w: any) => String(w?.main || '')).join(' ').toLowerCase();
  const isRainy = weatherCodes.includes('rain') || weatherCodes.includes('snow') || weatherCodes.includes('drizzle');

  return { temp, isRainy };
}


