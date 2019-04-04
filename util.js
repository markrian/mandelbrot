export function importCSS(href) {
    return new Promise((resolve, reject) => {
        const link = document.createElement('link');
        link.onload = resolve;
        link.onerror = reject;
        link.rel = 'stylesheet';
        link.href = href;
        const head = document.head;
        head.insertBefore(link, head.firstChild);
    });
}

export function fadeOut(element) {
    element.addEventListener('transitionend', () => {
        element.classList.add('hide');
    });

    element.classList.add('transparent');
}
