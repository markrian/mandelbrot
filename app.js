"use strict";
var canvas;
var ctx;
var imageData;
var maxIterations = 75;
var lastCount = 0;
var centre = [0, 0];
var zoom = 1;
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
    ctx = canvas.getContext('2d');
    document.body.appendChild(canvas);
}
function createImageData() {
    imageData = ctx.createImageData(canvas.width, canvas.height);
    var x, y, count, rgb;
    for (var i = 0; i < imageData.data.length; i += 4) {
        y = Math.round(i / (imageData.width * 4));
        x = (i / 4) % imageData.width;
        var complex = coordsToComplex([x, y], centre, zoom);
        count = mandelbrot(complex, maxIterations);
        if (count === maxIterations) {
            rgb = [0, 0, 0];
        }
        else {
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
        var x = event.pageX;
        var y = event.pageY;
        var complex = coordsToComplex([x, y], centre, zoom);
        var count = mandelbrot(complex, maxIterations);
        log("Coords: " + formatComplexNumber(complex) + ", iterations: " + count);
    });
}
var PLUS_SIGN = '+';
var MINUS_SIGN = '\u2212';
function formatComplexNumber(complex, decimals) {
    if (decimals === void 0) { decimals = Math.log(zoom) / Math.log(10) + 2; }
    var real = Math.abs(complex[0]).toFixed(decimals);
    if (complex[0] < 0) {
        real = MINUS_SIGN + real;
    }
    var plusOrMinus = complex[1] < 0 ? MINUS_SIGN : PLUS_SIGN;
    var imag = Math.abs(complex[1]).toFixed(decimals);
    return real + " " + plusOrMinus + " " + imag + "j";
}
function setupSliderListener() {
    var slider = $('#iterations');
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
function hslToRgb(h, s, l) {
    var r, g, b;
    if (s == 0) {
        r = g = b = l; // achromatic
    }
    else {
        var hue2rgb = function hue2rgb(p, q, t) {
            if (t < 0)
                t += 1;
            if (t > 1)
                t -= 1;
            if (t < 1 / 6)
                return p + (q - p) * 6 * t;
            if (t < 1 / 2)
                return q;
            if (t < 2 / 3)
                return p + (q - p) * (2 / 3 - t) * 6;
            return p;
        };
        var q = l < 0.5 ? l * (1 + s) : l + s - l * s;
        var p = 2 * l - q;
        r = hue2rgb(p, q, h + 1 / 3);
        g = hue2rgb(p, q, h);
        b = hue2rgb(p, q, h - 1 / 3);
    }
    return [Math.round(r * 255), Math.round(g * 255), Math.round(b * 255)];
}
function countToRGB(count, max) {
    var h = count / max;
    return hslToRgb(h, 0.8, 0.4);
}
function coordsToComplex(coords, centre, zoom) {
    var r = coords[0];
    var i = coords[1];
    var xRange = 4 / zoom;
    // scaling first
    var scale = canvas.width / xRange;
    r /= scale;
    i /= scale;
    // now translate
    var yRange = canvas.height / scale;
    r = centre[0] + r - xRange / 2;
    i = centre[1] + (yRange / 2) - i;
    return [r, i];
}
function mandelbrot(complex, max) {
    var count = 0;
    var zr = 0;
    var zi = 0;
    var zmod = 0;
    while (count < max) {
        _a = [
            zr * zr - zi * zi + complex[0],
            2 * zr * zi + complex[1],
        ], zr = _a[0], zi = _a[1];
        zmod = zr * zr + zi * zi;
        if (zmod > 4)
            return count;
        count += 1;
    }
    return count;
    var _a;
}
function log(string) {
    var el = $('#log');
    el.textContent = string;
}
function setLocationHash() {
    location.hash = String(centre.concat([zoom, maxIterations]));
}
function readLocationHash() {
    var hash = location.hash.slice(1);
    if (hash === '') {
        return;
    }
    var parts = hash.split(',');
    centre[0] = parseFloat(parts[0]);
    centre[1] = parseFloat(parts[1]);
    zoom = parseFloat(parts[2]);
    maxIterations = parseFloat(parts[3]);
}
function setSlider() {
    var slider = $('#iterations');
    slider.value = String(maxIterations);
}
function setupHashListener() {
    window.addEventListener('hashchange', function () {
        readLocationHash();
        draw();
    });
}
function $(selector) {
    var el = document.querySelector(selector);
    if (el === null) {
        throw new Error("Invalid selector \"" + selector + "\"");
    }
    return el;
}
document.addEventListener('DOMContentLoaded', init);
