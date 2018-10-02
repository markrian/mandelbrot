import L from './leaflet-shim.js';
import MandelbrotLayer from './mandelbrot-layer.js';

const map = L.map('fractal', {
    center: [0, 0],
    zoom: 0,
    crs: L.CRS.Simple,
    iterationsControl: true,
});

map.addLayer(new MandelbrotLayer());
