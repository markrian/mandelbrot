import L from './leaflet-shim.js';

export default function ComplexPlaneCRS(tileSize) {
    const transformation = L.transformation(tileSize, 0, -tileSize, 0);
    return L.extend({}, L.CRS.Simple, { transformation });
};
