export interface LocationData {
  latitude: number;
  longitude: number;
  address?: string;
  city?: string;
  district?: string;
}

export async function getCurrentLocation(): Promise<LocationData | null> {
  try {
    const Location = await import('expo-location');
    const { status } = await Location.requestForegroundPermissionsAsync();
    if (status !== 'granted') return null;
    const loc = await Location.getCurrentPositionAsync({ accuracy: (Location.Accuracy as any).Balanced });
    const { latitude, longitude } = loc.coords;
    const geocode = await Location.reverseGeocodeAsync({ latitude, longitude });
    const place = geocode[0];
    const result: LocationData = { latitude, longitude };
    const p = place as any;
    // 시/도
    const region = p?.region;
    // 시/군/구
    const city = p?.city ?? p?.subregion;
    // 동/읍/면
    const district = p?.district ?? p?.subregion;
    // 상세주소 조합: 시/도 + 시군구 + 동
    const parts = [region, city, district].filter((v, i, arr) => v && arr.indexOf(v) === i);
    const combined = parts.join(' ');
    if (combined) result.address = combined;
    if (city) result.city = city;
    if (district) result.district = district;
    return result;
  } catch {
    return null;
  }
}
