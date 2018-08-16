var map = L.map('fractal', {
    center: [0, 0],
    zoom: 0
});

L.GridLayer.DebugCoords = L.GridLayer.extend({
    createTile: function (coords, done) {
        var tile = document.createElement('div');
        tile.innerHTML = [coords.x, coords.y, coords.z].join(', ');
        tile.style.outline = '1px solid red';

        setTimeout(function () {
            done(null, tile);	// Syntax is 'done(error, tile)'
        }, 500 + Math.random() * 1500);

        return tile;
    }
});

L.gridLayer.debugCoords = function (opts) {
    return new L.GridLayer.DebugCoords(opts);
};

map.addLayer(L.gridLayer.debugCoords());