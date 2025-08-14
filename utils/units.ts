export const MI_TO_KM = 1.609344;
export const GAL_TO_L = 3.78541;

export const miToKm = (mi: number) => mi * MI_TO_KM;
export const kmToMi = (km: number) => km / MI_TO_KM;
export const galToL = (gal: number) => gal * GAL_TO_L;
export const lToGal = (l: number) => l / GAL_TO_L;
export const mpgToKmPerL = (mpg: number) => mpg * MI_TO_KM / GAL_TO_L;

export function formatDistance(mi: number, unit: 'us' | 'metric') {
  return unit === 'metric' ? `${miToKm(mi).toFixed(1)} km` : `${mi.toFixed(1)} mi`;
}

export function formatVolume(gal: number, unit: 'us' | 'metric') {
  return unit === 'metric' ? `${galToL(gal).toFixed(2)} L` : `${gal.toFixed(2)} gal`;
}

export function formatEfficiency(mpg: number, unit: 'us' | 'metric') {
  return unit === 'metric' ? `${mpgToKmPerL(mpg).toFixed(2)} km/L` : `${mpg.toFixed(2)} MPG`;
}