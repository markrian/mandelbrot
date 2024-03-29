import L from './leaflet-shim.js';
import ComplexPlaneCRS from './crs.js';
import MandelbrotLayer from './mandelbrot-layer.js';
import { fadeOut, importCSS, devicePixelRatio } from './util.js';
import './mandelbrot-iterations-control.js';
import './mandelbrot-hash-handler.js';

importCSS('leaflet.css').then(() => {
    fadeOut(document.querySelector('.spinner'));

    const tileSize = 128;
    const map = L.map('fractal', {
        center: [0, 0],
        zoom: 0,
        zoomSnap: 0,
        crs: ComplexPlaneCRS(tileSize / devicePixelRatio),
        iterationsControl: true,
    });

    map.addLayer(new MandelbrotLayer({ tileSize }));
    map.mandelbrotHash.enable();
    window.map = map;
});
