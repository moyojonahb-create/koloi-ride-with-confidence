// HERE Flexible Polyline decoder
// Based on HERE's flexible polyline encoding specification

const DECODING_TABLE = [
  62, -1, -1, 52, 53, 54, 55, 56, 57, 58, 59, 60, 61, -1, -1, -1, -1, -1, -1, -1,
  0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21,
  22, 23, 24, 25, -1, -1, -1, -1, 63, -1, 26, 27, 28, 29, 30, 31, 32, 33, 34, 35,
  36, 37, 38, 39, 40, 41, 42, 43, 44, 45, 46, 47, 48, 49, 50, 51
];

function decodeChar(char: string): number {
  const charCode = char.charCodeAt(0);
  return DECODING_TABLE[charCode - 45];
}

function decodeUnsignedValues(encoded: string): number[] {
  const result: number[] = [];
  let shift = 0;
  let value = 0;
  
  for (let i = 0; i < encoded.length; i++) {
    const char = encoded[i];
    const charValue = decodeChar(char);
    
    value |= (charValue & 0x1F) << shift;
    
    if ((charValue & 0x20) === 0) {
      result.push(value);
      value = 0;
      shift = 0;
    } else {
      shift += 5;
    }
  }
  
  return result;
}

function decodeSignedValue(value: number): number {
  if (value & 1) {
    return ~(value >> 1);
  }
  return value >> 1;
}

export function decodeFlexiblePolyline(encoded: string): { lat: number; lng: number }[] {
  if (!encoded || encoded.length === 0) {
    return [];
  }

  // Get precision from header
  const header = decodeUnsignedValues(encoded.substring(0, 2));
  const precision = header[0];
  const thirdDim = (header[1] >> 4) & 0x07;
  const thirdDimPrecision = header[1] & 0x0F;
  
  const multiplier = Math.pow(10, precision);
  const hasThirdDim = thirdDim !== 0;
  
  // Skip header characters
  let headerLength = 2;
  const values = decodeUnsignedValues(encoded.substring(headerLength));
  
  const coordinates: { lat: number; lng: number }[] = [];
  let lat = 0;
  let lng = 0;
  
  const step = hasThirdDim ? 3 : 2;
  
  for (let i = 0; i < values.length; i += step) {
    lat += decodeSignedValue(values[i]);
    lng += decodeSignedValue(values[i + 1]);
    
    coordinates.push({
      lat: lat / multiplier,
      lng: lng / multiplier,
    });
  }
  
  return coordinates;
}

// Convert coordinates to GeoJSON LineString format for Mapbox
export function toGeoJSONLineString(coordinates: { lat: number; lng: number }[]): GeoJSON.Feature<GeoJSON.LineString> {
  return {
    type: 'Feature',
    properties: {},
    geometry: {
      type: 'LineString',
      coordinates: coordinates.map(coord => [coord.lng, coord.lat]),
    },
  };
}
