import L from './leaflet-shim.js';

const Hash = L.Handler.extend({
    addHooks() {
        L.DomEvent.on(window, 'hashchange', this._onHashChange, this);
        this._map.on('zoomend moveend iterationschange viewreset', this._updateHash, this);
        this._map.whenReady(() => this._onHashChange({ newURL: window.location.href }));
    },

    removeHooks() {
        L.DomEvent.off(window, 'hashchange', this._onHashChange, this);
        this._map.off('zoomend moveend iterationschange viewreset', this._updateHash, this);
    },

    _updateHash() {
        window.requestAnimationFrame(() => this._doUpdateHash());
    },

    _doUpdateHash() {
        const center = this._map.getCenter();
        const parts = [
            center.lng,
            center.lat,
            this._map.getZoom(),
            this._map.getIterations(),
        ];

        this._ignoreNextHashChange = true;
        window.location = this._partsToHash(parts);
    },

    _hashToParts(hash) {
        hash = hash.slice(1);
        const parts = hash.split(',')
            .map(Number)
            .filter(Number.isFinite);
        if (parts.length === 4) {
            return parts;
        }
    },

    _partsToHash(parts) {
        return '#' + parts.join(',');
    },

    _onHashChange(event) {
        if (this._ignoreNextHashChange) {
            this._ignoreNextHashChange = false;
            return;
        }

        const hashIndex = event.newURL.indexOf('#');
        if (hashIndex === -1) {
            return;
        }

        const hash = event.newURL.slice(hashIndex);
        const parts = this._hashToParts(hash);
        if (parts === undefined) {
            console.warn('Invalid hash. Expected something like: #0,0,1,64');
            return;
        }

        this._setupMap(...parts);
    },

    _setupMap(real, imag, zoom, iterations) {
        this._map.setIterations(iterations);
        this._map.setView([imag, real], zoom);
    }
});

L.Map.addInitHook('addHandler', 'mandelbrotHash', Hash);
