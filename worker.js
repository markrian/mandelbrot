function receiveJob(event) {
    const { coords, tileSize, iterations } = event.data;
    const imageData = new ImageData(tileSize.x, tileSize.y);

    for (let i = 0; i < imageData.data.length; i += 4) {
        const x = (i / 4) % imageData.width;
        const y = Math.floor(i / (imageData.width * 4));
        const complex = {
            real: coords.realMin + (x / imageData.width) * (coords.realMax - coords.realMin),
            imag: coords.imagMin + (y / imageData.height) * (coords.imagMax - coords.imagMin),
        };
        const count = mandelbrot(complex, iterations);
        if (count === iterations) {
            rgb = [0, 0, 0];
        } else {
            rgb = countToRGB(count, iterations);
        }

        imageData.data[i] = rgb[0];
        imageData.data[i + 1] = rgb[1];
        imageData.data[i + 2] = rgb[2];
        imageData.data[i + 3] = 255;
    }

    event.data.imageData = imageData;
    postMessage(event.data);
}

function countToRGB(count, max) {
    const h = count / max;
    return hslToRgb(h, 0.8, 0.4);
}

function hslToRgb(h, s, l) {
    let r, g, b;

    if (s === 0) {
        r = g = b = l; // achromatic
    } else {
        const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
        const p = 2 * l - q;
        r = hue2rgb(p, q, h + 1 / 3);
        g = hue2rgb(p, q, h);
        b = hue2rgb(p, q, h - 1 / 3);
    }

    return [Math.round(r * 255), Math.round(g * 255), Math.round(b * 255)];
}

function hue2rgb(p, q, t) {
    if (t < 0) t += 1;
    if (t > 1) t -= 1;
    if (t < 1 / 6) return p + (q - p) * 6 * t;
    if (t < 1 / 2) return q;
    if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6;
    return p;
}

function mandelbrot(complex, max) {
    let count = 0;
    let zr = 0;
    let zi = 0;
    let zmod = 0;
    while (count < max) {
        [zr, zi] = [
            zr * zr - zi * zi + complex.real,
            2 * zr * zi + complex.imag,
        ];
        zmod = zr * zr + zi * zi;
        if (zmod > 4) return count
        count += 1;
    }

    return count;
}

onmessage = receiveJob;