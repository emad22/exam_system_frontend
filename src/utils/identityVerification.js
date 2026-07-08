export const shouldBlockLocalFaceMismatch = ({ bypassEnabled, distance }) => {
  if (bypassEnabled) return false;
  return distance != null && distance >= 0.6;
};
