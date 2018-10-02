export default getLeaflet();

function getLeaflet() {
    if ('L' in window) {
        return window.L;
    }

    throw new Error("Leaflet hasn't been loaded!");
}
