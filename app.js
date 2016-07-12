(function () {
    var canvas;
    var ctx;
    var imageData;
    var maxIterations = 5;
    let dirty = true;
    let lastCount = 0;

    function onLoad() {
        createCanvasAndContext();
        createImageData();
        drawImageData();
        setTimeout(function () {
            location.reload(true);
        }, 250);
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
        var x, y, count;
        for (var i = 0; i < imageData.data.length; i += 4) {
            y = Math.round(i / (imageData.width*4));
            x = (i / 4) % imageData.width;
            var complex = coordsToComplex([x, y]);
            var count = mandelbrot(complex, maxIterations);
            if (count === maxIterations) {
                rgb = [0,0,0];
            } else {
                rgb = countToRGB(count, maxIterations);
            }
            imageData.data[i] = rgb[0];
            imageData.data[i+1] = rgb[1];
            imageData.data[i+2] = rgb[2];
            imageData.data[i+3] = 255;
        }
    }

    function setupMoveListener() {
        document.addEventListener('mousemove', function (event) {
            var x = event.pageX;
            var y = event.pageY;
            var rgb;

            var complex = coordsToComplex([x, y]);
            var count = mandelbrot(complex, maxIterations);
            if (count === maxIterations) {
                rgb = [0,0,0];
            } else {
                rgb = countToRGB(count, maxIterations);
            }

            var i = (x + y*imageData.width)*4;
            imageData.data[i] = rgb[0];
            imageData.data[i+1] = rgb[1];
            imageData.data[i+2] = rgb[2];
            imageData.data[i+3] = 255;

            dirty = true;
            lastCount = (lastCount + 1) % maxIterations;
        });
    }

    function loop() {
        drawImageData();
        requestAnimationFrame(loop);
    }

    function drawImageData() {
        if (dirty) {
            ctx.putImageData(imageData, 0, 0);
            dirty = false;
        }
    }

    function hslToRgb(h, s, l) {
        var r, g, b;

        if(s == 0){
            r = g = b = l; // achromatic
        }else{
            var hue2rgb = function hue2rgb(p, q, t){
                if(t < 0) t += 1;
                if(t > 1) t -= 1;
                if(t < 1/6) return p + (q - p) * 6 * t;
                if(t < 1/2) return q;
                if(t < 2/3) return p + (q - p) * (2/3 - t) * 6;
                return p;
            }

            var q = l < 0.5 ? l * (1 + s) : l + s - l * s;
            var p = 2 * l - q;
            r = hue2rgb(p, q, h + 1/3);
            g = hue2rgb(p, q, h);
            b = hue2rgb(p, q, h - 1/3);
        }

        return [Math.round(r * 255), Math.round(g * 255), Math.round(b * 255)];
    }

    function countToRGB(count, max) {
        var h = count / max;
        return hslToRgb(h, 0.8, 0.4);
    }

    function coordsToComplex(coords) {
        var r = coords[0];
        var i = coords[1];

        // scaling first; width is 4 units
        var scale = canvas.width / 4;
        r /= scale;
        i /= scale;

        // now translate
        var yRange = canvas.height / scale;
        r = r - 2;
        i = (yRange/2) - i;

        return [r, i];
    }

    function mandelbrot(complex, max) {
        var count = 0;
        var zr = 0;
        var zi = 0;
        var zmod = 0;
        while (count < max && zmod < 4) {
            zr = zr*zr - zi*zi + complex[0];
            zi = 2*zr*zi + complex[1];
            zmod = zr*zr + zi*zi;
            count += 1;
        }

        return count;
    }

    document.addEventListener('DOMContentLoaded', onLoad);
})();
