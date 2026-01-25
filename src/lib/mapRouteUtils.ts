import mapboxgl from "mapbox-gl";

export function upsertRedRoute(
  map: mapboxgl.Map,
  id: string,
  coordinates: [number, number][] // [lng, lat]
) {
  const sourceId = `${id}-route-source`;
  const layerId = `${id}-route-layer`;

  const geojson = {
    type: "Feature",
    properties: {},
    geometry: {
      type: "LineString",
      coordinates,
    },
  } as const;

  // Remove existing layer/source safely
  if (map.getLayer(layerId)) map.removeLayer(layerId);
  if (map.getSource(sourceId)) map.removeSource(sourceId);

  map.addSource(sourceId, { type: "geojson", data: geojson });

  map.addLayer({
    id: layerId,
    type: "line",
    source: sourceId,
    layout: { "line-join": "round", "line-cap": "round" },
    paint: {
      "line-color": "#FF0000",
      "line-width": 5,
      "line-opacity": 0.9,
    },
  });
}

export function straightLineRoute(
  from: { lng: number; lat: number },
  to: { lng: number; lat: number }
) {
  return [
    [from.lng, from.lat] as [number, number],
    [to.lng, to.lat] as [number, number],
  ];
}
