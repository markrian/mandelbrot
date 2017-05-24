type Point = [number, number];

let canvas: HTMLCanvasElement;
let ctx: CanvasRenderingContext2D;
let imageData: ImageData;
let maxIterations = 75;
let lastCount = 0;
let centre: Point = [0, 0];
let zoom = 1;

function init() {
    readLocationHash();
    setupHashListener();
    setSlider();
    createCanvasAndContext();
    setupMouseListener();
    setupSliderListener();
    setupZoomInteraction();
    draw();
}

function draw() {
    createImageData();
    drawImageData();
    setLocationHash();
}

function createCanvasAndContext() {
    canvas = document.createElement('canvas');
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
    ctx = <CanvasRenderingContext2D>canvas.getContext('2d');
    document.body.appendChild(canvas);
}

function createImageData() {
    imageData = ctx.createImageData(canvas.width, canvas.height);
    let x, y, count, rgb;
    for (let i = 0; i < imageData.data.length; i += 4) {
        y = Math.round(i / (imageData.width * 4));
        x = (i / 4) % imageData.width;
        const complex = coordsToComplex([x, y], centre, zoom);
        count = mandelbrot(complex, maxIterations);
        if (count === maxIterations) {
            rgb = [0, 0, 0];
        } else {
            rgb = countToRGB(count, maxIterations);
        }
        imageData.data[i] = rgb[0];
        imageData.data[i + 1] = rgb[1];
        imageData.data[i + 2] = rgb[2];
        imageData.data[i + 3] = 255;
    }
}

function setupMouseListener() {
    document.addEventListener('mousemove', function (event) {
        const x = event.pageX;
        const y = event.pageY;
        const complex = coordsToComplex([x, y], centre, zoom);
        const count = mandelbrot(complex, maxIterations);
        log(`Coords: ${formatComplexNumber(complex)}, iterations: ${count}`);
    });
}

const PLUS_SIGN = '+';
const MINUS_SIGN = '\u2212';
function formatComplexNumber(complex: Point, decimals = Math.log(zoom)/Math.log(10) + 2): string {
    let real = Math.abs(complex[0]).toFixed(decimals);
    if (complex[0] < 0) {
        real = MINUS_SIGN + real;
    }

    const plusOrMinus = complex[1] < 0 ? MINUS_SIGN : PLUS_SIGN;
    const imag = Math.abs(complex[1]).toFixed(decimals);
    return `${real} ${plusOrMinus} ${imag}j`;
}

function setupSliderListener() {
    const slider = <HTMLInputElement>$('#iterations');
    slider.addEventListener('change', function () {
        maxIterations = parseInt(slider.value, 10);
        draw();
    });
}

function setupZoomInteraction() {
    document.addEventListener('wheel', function (event) {
        centre = coordsToComplex([event.pageX, event.pageY], centre, zoom);
        zoom = event.deltaY < 0 ? zoom * 2 : zoom / 2;
        draw();
    });
}

function drawImageData() {
    ctx.putImageData(imageData, 0, 0);
}

type Colour = [number, number, number];

function hslToRgb(h: number, s: number, l: number): Colour {
    let r, g, b;

    if (s == 0) {
        r = g = b = l; // achromatic
    } else {
        const hue2rgb = function hue2rgb(p: number, q: number, t:number) {
            if (t < 0) t += 1;
            if (t > 1) t -= 1;
            if (t < 1 / 6) return p + (q - p) * 6 * t;
            if (t < 1 / 2) return q;
            if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6;
            return p;
        }

        const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
        const p = 2 * l - q;
        r = hue2rgb(p, q, h + 1 / 3);
        g = hue2rgb(p, q, h);
        b = hue2rgb(p, q, h - 1 / 3);
    }

    return [Math.round(r * 255), Math.round(g * 255), Math.round(b * 255)];
}

function countToRGB(count: number, max: number) {
    const h = count / max;
    return hslToRgb(h, 0.8, 0.4);
}

function coordsToComplex(coords: Point, centre: Point, zoom: number): Point {
    let r = coords[0];
    let i = coords[1];

    const xRange = 4 / zoom;

    // scaling first
    const scale = canvas.width / xRange;
    r /= scale;
    i /= scale;

    // now translate
    const yRange = canvas.height / scale;
    r = centre[0] + r - xRange / 2;
    i = centre[1] + (yRange / 2) - i;

    return [r, i];
}

function mandelbrot(complex: Point, max: number) {
    let count = 0;
    let zr = 0;
    let zi = 0;
    let zmod = 0;
    let zr_temp;
    let zi_temp;
    while (count < max) {
        zr_temp = zr * zr - zi * zi + complex[0];
        zi_temp = 2 * zr * zi + complex[1];
        zr = zr_temp;
        zi = zi_temp;
        zmod = zr * zr + zi * zi;
        if (zmod > 4) return count
        count += 1;
    }

    return count;
}

function log(string: string) {
    const el = <HTMLElement>$('#log');
    el.textContent = string;
}

function setLocationHash() {
    location.hash = String(centre.concat([zoom, maxIterations]));
}

function readLocationHash() {
    const hash = location.hash.slice(1);
    if (hash === '') {
        return;
    }

    const parts = hash.split(',');
    centre[0] = parseFloat(parts[0]);
    centre[1] = parseFloat(parts[1]);
    zoom = parseFloat(parts[2]);
    maxIterations = parseFloat(parts[3]);
}

function setSlider() {
    const slider = <HTMLInputElement>$('#iterations');
    slider.value = String(maxIterations);
}

function setupHashListener() {
    window.addEventListener('hashchange', function () {
        readLocationHash();
        draw();
    });
}

function $(selector: string): Element {
    const el = document.querySelector(selector);

    if (el === null) {
        throw new Error(`Invalid selector "${selector}"`);
    }

    return el;
}

document.addEventListener('DOMContentLoaded', init);
