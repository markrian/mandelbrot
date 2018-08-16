function receiveJob(event) {
    const { coords, tileSize, iterations } = event.data;

    const imageData = new ImageData(tileSize.x, tileSize.y);
    const rgba = [mod(coords.real * 16), mod(coords.imag * 16), mod((coords.real + coords.imag) * 16), 255];

    for (let i = 0; i < imageData.data.length; i += 4) {
        imageData.data[i] = rgba[0];
        imageData.data[i + 1] = rgba[1];
        imageData.data[i + 2] = rgba[2];
        imageData.data[i + 3] = rgba[3];
    }

    event.data.imageData = imageData;

    postMessage(event.data);
}

function mod(i, n = 256) {
    return (i % n + n) % n;
}

function rand(min, max) {
    return min + Math.floor((max - min + 1) * Math.random());
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