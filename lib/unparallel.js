'use strict';

const Deferred = require('./deferred');

function unparallel(upstream) {
    const pendingPromises = [];
    let running = false;

    function maybeStartAnother() {
        if (running || !pendingPromises.length) return;
        const p = upstream();
        running = true;
        p.then(
            value => {
                running = false;
                pendingPromises.shift().resolve(value);
                maybeStartAnother();
            },
            reason => {
                running = false;
                pendingPromises.shift().reject(reason);
                maybeStartAnother();
            }
        );
    }

    return () => {
        const p = new Deferred();
        pendingPromises.push(p);
        maybeStartAnother();
        return p.promise;
    };
}

module.exports = unparallel;
