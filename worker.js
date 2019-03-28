function receiveJob(event) {
    const { coords, tileSize, iterations } = event.data;
    const imageData = new ImageData(tileSize.x, tileSize.y);

    for (let i = 0; i < imageData.data.length; i += 4) {
        const x = (i / 4) % imageData.width;
        const y = Math.floor(i / (imageData.width * 4));

        // Canvas pixel coordinates are inverted vertically compared to
        // the traditional complex plane. Therefore the first pixel to be drawn
        // if the top-left one, [0, 0], which corresponds to the minimum real
        // value and the *maximum* imaginary value.
        const complex = {
            real: coords.realMin + (x / imageData.width) * (coords.realMax - coords.realMin),
            imag: coords.imagMax - (y / imageData.height) * (coords.imagMax - coords.imagMin),
        };
        const count = mandelbrot(complex, iterations);
        if (count === iterations) {
            rgb = [0, 0, 0];
        } else {
            rgb = countToRGB(count);
        }

        imageData.data[i] = rgb[0];
        imageData.data[i + 1] = rgb[1];
        imageData.data[i + 2] = rgb[2];
        imageData.data[i + 3] = 255;
    }

    event.data.imageData = imageData;
    postMessage(event.data);
}

function countToRGB(count) {
    return [
        triangle(count * 2, 255),
        triangle(count * 3, 255),
        triangle(count * 5, 255),
    ];
}

function triangle(n, max) {
    let upwards = true;
    while (n > max) {
        upwards = !upwards;
        n -= max;
    }
    return upwards ? n : max - n;
}

function mandelbrot(complex, max) {
    if (inCardioid(complex) || inBulb(complex)) {
        return max;
    }

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

// https://en.wikipedia.org/wiki/Mandelbrot_set#Cardioid_/_bulb_checking
function inCardioid({ real: zr, imag: zi }) {
  const zr_ = zr - .25;
  const q = zr_ * zr_ + zi * zi;
  const lhs = q * (q + zr_);
  const rhs = .25 * zi * zi;
  return lhs <= rhs;
}

function inBulb({ real: zr, imag: zi }) {
  return (zr + 1) * (zr + 1) + zi * zi <= 1 / 16;
}

onmessage = receiveJob;
