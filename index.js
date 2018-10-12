import L from './leaflet-shim.js';
import MandelbrotLayer from './mandelbrot-layer.js';
import './mandelbrot-iterations-control.js';
import './mandelbrot-hash-handler.js';

const map = L.map('fractal', {
    center: [0, 0],
    zoom: 0,
    zoomSnap: 0,
    crs: L.CRS.Simple,
    iterationsControl: true,
});

map.addLayer(new MandelbrotLayer());
map.mandelbrotHash.enable();
