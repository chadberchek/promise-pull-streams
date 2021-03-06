'use strict';

const {DONE} = require('../lib/base');
const {promisify} = require('util');
const Deferred = require('../lib/deferred');

function createPendingPromiseArray(count) {
    const a = new Array(count);
    for (let i = 0; i < count; i++) {
        a[i] = new Deferred();
    }
    return a;
}

function deferredStub(spy) {
    const deferrals = [];
    spy.and.callFake(() => {
        const d = new Deferred();
        deferrals.push(d);
        return d.promise;
    });
    return deferrals;
};

const promiseHandlersCalled = promisify(setImmediate);

async function expectNotFulfilled(promise) {
    let fulfilled = false;
    let fulfilledValue;
    promise.then(x => {
        fulfilled = true;
        fulfilledValue = x;
    });
    await promiseHandlersCalled();
    if (fulfilled) fail(`Expected promise not to be fulfilled but fulfilled ${String(fulfilledValue)}`);
}

async function rejected(promise) {
    try {
        const v = await promise;
        fail(`Expected promise to reject but fulfilled ${String(v)}`);
    } catch (reason) {
        return reason;
    }
}

class PromiseFactoryStub {
    constructor(numberOfPromisesToReturn) {
        this._deferreds = createPendingPromiseArray(numberOfPromisesToReturn);
        this.timesCalled = 0;
        this.pendingPromises = 0;
        this.promiseFactory = () => this._promiseFactory();
    }

    _promiseFactory() {
        const decrementPending = () => this.pendingPromises--;

        let promise;
        if (this.timesCalled >= this._deferreds.length) {
            promise = Promise.reject(DONE);
        } else {
            promise = this._deferreds[this.timesCalled].promise;
            this.pendingPromises++;
            promise.then(decrementPending, decrementPending);
        }

        this.timesCalled++;
        return promise;        
    }

    resolve(promiseIndex, value) {
        this._deferreds[promiseIndex].resolve(value);
    }

    reject(promiseIndex, reason) {
        this._deferreds[promiseIndex].reject(reason);
    }

    resolveAll() {
        this._deferreds.forEach((p, i) => p.resolve(i));
    }

    rejectAll() {
        this._deferreds.forEach((p, i) => p.reject(i));
    }

    async expectTimesCalled(expectedNumberOfCalls) {
        await promiseHandlersCalled();
        expect(this.timesCalled).toBe(expectedNumberOfCalls);
    }

    async expectPendingPromises(expectedNumberOfPendingPromises) {
        await promiseHandlersCalled();
        expect(this.pendingPromises).toBe(expectedNumberOfPendingPromises);
    }
}

module.exports = {
    createPendingPromiseArray,
    deferredStub,
    rejected,
    PromiseFactoryStub,
    expectNotFulfilled,
    promiseHandlersCalled,
};
