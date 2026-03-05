// Placeholder hook for location gate functionality
export const useRiderLocationGate = (map: google.maps.Map | null, options?: { streetZoom?: number; followRider?: boolean }) => {
  return {
    detectedCity: null,
    detectedAddress: null,
    isConfirmOpen: false,
    canRequest: false,
    confirmLocation: () => {},
    changeLocation: () => {},
  };
};
