export default function Job(message) {
    let _resolve, _reject;
    const promise = new Promise((resolve, reject) => {
        _resolve = resolve;
        _reject = reject;
    });

    const id = Job.id++;
    return {
        id,
        promise,
        resolve: _resolve,
        reject: _reject,
        message: Object.assign({}, { id }, message),
        posted: false,
    };
}
Job.id = 0;
