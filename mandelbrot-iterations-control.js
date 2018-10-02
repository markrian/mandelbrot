import L from './leaflet-shim.js';

const Iterations = L.Control.extend({
    options: {
        position: 'bottomright',
        iterationsTitle: 'The current number of iterations',
        decreaseIterationsTitle: 'Decrease the number of iterations',
        increaseIterationsTitle: 'Increase the number of iterations',
        iterationsHeaderTitle: 'The current number of iterations',
        increaseIterationsText: '+',
        decreaseIterationsText: '−',
    },

    onAdd() {
        const name = 'mandelbrot-iterations';
        const container = L.DomUtil.create('div', name + ' leaflet-bar');
        
        this._iterationsHeader = this._createHeader(
            '',
            this.options.iterationsTitle,
            name + '-header',
            container,
        );

        const buttonsContainer = L.DomUtil.create('div', name + '-controls', container)
        this._increaseIterationsButton = this._createButton(
            this.options.increaseIterationsText,
            this.options.increaseIterationsTitle,
            name + '-increase',
            buttonsContainer,
            this._increaseIterations
        );
        this._decreaseIterationsButton = this._createButton(
            this.options.decreaseIterationsText,
            this.options.decreaseIterationsTitle,
            name + '-decrease',
            buttonsContainer,
            this._decreaseIterations
        );

        this._map.on('iterationschange', this._updateIterationsHeader, this);

        return container;
    },

    _createHeader: function (html, title, className, container, fn) {
        var header = L.DomUtil.create('span', className, container);
        header.innerHTML = html;
        header.title = title;
        header.setAttribute('aria-label', title);
        L.DomEvent.disableClickPropagation(header);
        return header;
    },

    _createButton: function (html, title, className, container, fn) {
        var link = L.DomUtil.create('a', className, container);
        link.innerHTML = html;
        link.href = '#';
        link.title = title;

        link.setAttribute('role', 'button');
        link.setAttribute('aria-label', title);

        L.DomEvent.disableClickPropagation(link);
        L.DomEvent.on(link, 'click', L.DomEvent.stop);
        L.DomEvent.on(link, 'click', fn, this);
        L.DomEvent.on(link, 'click', this._refocusOnMap, this);

        return link;
    },

    _increaseIterations() {
        this._map.increaseIterations();
    },

    _decreaseIterations() {
        this._map.decreaseIterations();
    },

    _updateIterationsHeader(e) {
        this._iterationsHeader.textContent = String(e.value);
    }
});

L.Map.mergeOptions({
    iterationsControl: false,
});

L.Map.addInitHook(function () {
    if (this.options.iterationsControl) {
        this._iterationsControl = new Iterations();
        this.addControl(this._iterationsControl);
    }
});
