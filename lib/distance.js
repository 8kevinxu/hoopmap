// Straight-line ("as the crow flies") distance between two lat/lng points, in
// miles. No routing API needed — fine for ranking nearby courts.
const R_MILES = 3958.8;
const toRad = (d) => (d * Math.PI) / 180;

export function haversineMiles(lat1, lng1, lat2, lng2) {
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  return R_MILES * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

export function formatDistance(mi) {
  if (mi == null || isNaN(mi)) return '';
  if (mi < 0.1) return '<0.1 mi';
  return `${mi.toFixed(1)} mi`;
}
