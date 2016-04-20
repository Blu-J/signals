"use strict";
(function (FutureValues) {
    FutureValues[FutureValues["NO_VALUE"] = 0] = "NO_VALUE";
    FutureValues[FutureValues["VALUE"] = 1] = "VALUE";
})(exports.FutureValues || (exports.FutureValues = {}));
var FutureValues = exports.FutureValues;
(function (SignalActions) {
    SignalActions[SignalActions['NOOP'] = 0] = 'NOOP';
    SignalActions[SignalActions['STOP'] = 1] = 'STOP';
})(exports.SignalActions || (exports.SignalActions = {}));
var SignalActions = exports.SignalActions;
exports.Maybe = {
    isDefined: function (x) {
        return x !== undefined && x !== null;
    }
};
var SignalActionValues = Object.keys(SignalActions).map(function (key) { return SignalActions[key]; });
var isSignalAction = function (a) {
    if (SignalActionValues.indexOf(a) !== -1) {
        return true;
    }
    return false;
};
var isSignalValue = function (signal) {
    if (signal.hasOwnProperty('value')) {
        return true;
    }
    return false;
};
var isSignalAnSignalAction = function (signal) {
    if (signal.hasOwnProperty('signalAction')) {
        return true;
    }
    return false;
};
/**
 * Determines is value is a signal
 * a -> Booelan
 * @param  {[type]} predicateValue [description]
 * @return {[type]}                [description]
*/
exports.isSignal = function (predicateValue) {
    if (!(predicateValue instanceof Object)) {
        return false;
    }
    if (!(predicateValue ? typeof predicateValue.getNext === 'function' : false)) {
        return false;
    }
    if (predicateValue.hasOwnProperty('value')) {
        return true;
    }
    else if (isSignalAction(predicateValue.signalAction)) {
        return true;
    }
    return false;
};
var Future = (function () {
    function Future(withUpdate) {
        var _this = this;
        this.valueType = FutureValues.NO_VALUE;
        this.onResolveds = [];
        this.onResolvedPairs = [];
        var sinkForFuture = function (newValue) {
            if (_this.valueType !== FutureValues.NO_VALUE) {
                return;
            }
            _this.value = newValue;
            _this.valueType = FutureValues.VALUE;
            _this.onResolveds.forEach(function (onResolved) { return onResolved(newValue); });
            _this.onResolveds = [];
            _this.onResolvedPairs = [];
        };
        withUpdate(sinkForFuture);
    }
    Future.of = function (withUpdate) {
        return new Future(withUpdate);
    };
    Future.prototype.then = function (onResolved) {
        var _this = this;
        var resolveThenFuture = function (thenFutureResolve) {
            var updateFuture = function (newValue) {
                var updatedValue = onResolved(newValue);
                if (updatedValue instanceof Future) {
                    updatedValue.then(thenFutureResolve);
                }
                else {
                    thenFutureResolve(updatedValue);
                }
            };
            if (_this.valueType === FutureValues.VALUE) {
                updateFuture(_this.value);
            }
            else {
                _this.onResolvedPairs.push([onResolved, updateFuture]);
                _this.onResolveds.push(updateFuture);
            }
        };
        return new Future(resolveThenFuture);
    };
    Future.prototype.withoutThen = function (onResolved) {
        var _this = this;
        var foundPairs = this.onResolvedPairs.filter(function (_a) {
            var left = _a[0];
            return left === onResolved;
        });
        foundPairs.forEach(function (foundPair) {
            var onResolvedFn = foundPair[1];
            _this.onResolvedPairs = _this.onResolvedPairs.filter(function (otherPair) { return otherPair !== foundPair; });
            _this.onResolveds = _this.onResolveds.filter(function (thisOnResolved) { return thisOnResolved !== onResolvedFn; });
        });
    };
    return Future;
}());
exports.Future = Future;
function CreateResolvedFuture(a) {
    return new Future(function (resolve) { return resolve(a); });
}
var noop = function () { return null; };
var noopFuture = function () { return Future.of(function () { return null; }); };
function onceThunk(fn) {
    var cache;
    return function () {
        if (exports.Maybe.isDefined(cache)) {
            return cache;
        }
        var newCache = fn();
        cache = newCache;
        return newCache;
    };
}
/**
 * Signal is a value over time, this is just a link to next moment in time. And is lazy
 * a -> (() -> Future Signal a) -> Signal a
 * @param  {Any} @value   [description]
 * @param  {Function} @getNext [description]
 * @return {Signal}          [description]
*/
function SignalFactory(value, getNext, signalAction) {
    var cachedSignalFactory = onceThunk(getNext);
    if (exports.Maybe.isDefined(signalAction)) {
        return {
            signalAction: signalAction,
            getNext: cachedSignalFactory,
        };
    }
    return {
        value: value,
        getNext: cachedSignalFactory,
    };
}
var SIGNAL_DEAD = SignalFactory(null, function () { return CreateResolvedFuture(SIGNAL_DEAD); }, SignalActions.STOP);
function CurrentSignal(tailSignal) {
    var me = {
        tailSignal: tailSignal,
        signalAction: SignalActions.NOOP,
        getNext: function () { return CreateResolvedFuture(me.tailSignal); }
    };
    update(tailSignal);
    return me;
    function update(signal) {
        if (signal.signalAction === SignalActions.STOP) {
            return;
        }
        me.tailSignal = signal;
        var next = signal.getNext();
        next.then(function (nextSignal) { return update(nextSignal); });
    }
}
/**
 * Create a signal form an array
 * [a...] -> Signal a
 * @param  {Array a} array [a...] | Value of a
 * @return {Signal a}       Signal a
*/
exports.fromArray = function (array) {
    var guarenteedArray = [].concat(array);
    return exports.fastForwardFunction(function sinkArray(sink) {
        guarenteedArray.forEach(function (arrayValue) { return sink(arrayValue); });
        sink(null, SignalActions.STOP);
    });
};
/**
 * create a signal from a function that can 'sink' values in
 * Note that this could be a memory leak
 * ((a -> ()) -> ()) -> Signal a
 * @param  {Function} sinkNewValue (a -> ()) -> () | A function to drop a new value
 * @return {Signal}              Signal a
*/
exports.fastForwardFunction = function (sinkNewValue) {
    var initValue = SignalActions.NOOP;
    var currentResolve = noop;
    var newTail = function (value, action) {
        var newFuture = new Future(function (resolve) {
            currentResolve = resolve;
        });
        return SignalFactory(value, function () { return newFuture; }, action);
    };
    var answer = newTail(null, initValue);
    sinkNewValue(function sinkIntoSignal(newValue, action) {
        var isSkipValue = action === SignalActions.NOOP;
        var isStop = action === SignalActions.STOP;
        if (isStop) {
            return currentResolve(SIGNAL_DEAD);
        }
        if (isSkipValue) {
            return;
        }
        return currentResolve(newTail(newValue));
    });
    return answer;
};
/**
 * create a signal from a function that can 'sink' values in
 * Note that this could be a memory leak
 * ((a -> ()) -> ()) -> CurrentSignal a
 * @param  {Function} sinkNewValue (a -> ()) -> () | A function to drop a new value
 * @return {Signal}              CurrentSignal a | A current signal of a
*/
exports.fromFunction = function (sinkNewValue) {
    return CurrentSignal(exports.fastForwardFunction(sinkNewValue));
};
/**
 * Mailbox returns a object for the signal and the address, or the sink to drop the new values into.
 * @return {{signal:Signal, address: Function}} The address and the signal to update
 */
exports.mailBox = function () {
    var address;
    var signal = exports.fromFunction(function (sink) { return address = sink; });
    return {
        signal: signal,
        address: address,
    };
};
/**
 * From Promises
 * Future a -> ... -> Signal a
 * @param  {Future} Futures... [description]
 * @return {Signal}             [description]
*/
exports.fromPromises = function () {
    var futures = [];
    for (var _i = 0; _i < arguments.length; _i++) {
        futures[_i - 0] = arguments[_i];
    }
    var guarenteedArray = [].concat(futures);
    return exports.fastForwardFunction(function sinkArray(sink) {
        guarenteedArray.forEach(function (arrayValue) { return arrayValue && typeof arrayValue.then === 'function' ? arrayValue.then(sink) : sink(arrayValue); });
        sink(null, SignalActions.STOP);
    });
};
exports.onSignalValue = function (onValue, signal) {
    var currentSignal;
    var clear = function () {
        if (exports.Maybe.isDefined(currentSignal)) {
            currentSignal.getNext().withoutThen(withNext);
        }
    };
    var withNext = function (signal) {
        if (isSignalValue(signal)) {
            onValue(signal);
            clear();
            return;
        }
        if (isSignalAnSignalAction(signal) && signal.signalAction === SignalActions.STOP) {
            clear();
            return;
        }
        currentSignal = signal;
        signal.getNext().then(withNext);
    };
    if (signal instanceof Future) {
        signal.then(withNext);
    }
    else {
        withNext(signal);
    }
    return clear;
};
var onLazySignalValueSignal = function (onValue, signal, currentValue) {
    var getNext = onceThunk(function () { return new Future(function (sink) { return exports.onSignalValue(function (newSignal) { return sink(onValue(newSignal)); }, signal); }); });
    if (exports.Maybe.isDefined(currentValue)) {
        return SignalFactory(currentValue, getNext);
    }
    return SignalFactory(null, getNext, SignalActions.NOOP);
};
/**
 * This is a each loop that is expecting side effects
 * Notes that this returns a garbage collection, that combined with a fromFunction, it will hold memory all the way to the source
 * (a -> ()) -> Signal a -> (() -> ())
 * @param  {Function} onValue        a -> () | Where we call on signal
 * @param  {[type]} startingSignal    Signal a
 * @return {Function}                () -> () | Clean up
*/
exports.onValue = function (onValueFn, startingSignal) {
    var currentClear = noop;
    var withNext = function (signal) {
        onValueFn(signal.value);
        currentClear = exports.onSignalValue(withNext, signal.getNext());
    };
    currentClear = exports.onSignalValue(withNext, startingSignal);
    return function () {
        currentClear();
    };
};
/**
 * [Fold](https://en.wikipedia.org/wiki/Fold_(higher-order_function)) but with a signal, which is potential future
 * (a -> b) -> a -> signal a -> signal b
 * @param  {Function} foldFunction (state -> a -> state) Reduce function
 * @param  {a} initialState a
 * @param  {Signal} signal       Signal a
 * @return {Signal}              Signal state
*/
exports.foldp = function (foldFunction, initialState, signal) {
    var state = initialState;
    var withNext = function (signal) {
        var newState = foldFunction(state, signal.value);
        state = newState;
        return onLazySignalValueSignal(withNext, signal.getNext(), state);
    };
    return onLazySignalValueSignal(withNext, signal);
};
/**
 * Map a function across the signal
 * (a -> b) -> Signal a -> Signal b
 * @param  {Function} mapFunction (a -> b) | map domain to codomain
 * @param  {Signal} signal      Signal a | Signal of domain
 * @return {Signal}             Signal b | Signal of codomain
*/
exports.map = function (mapFunction, signal) {
    var withNext = function (signal) {
        var newState = mapFunction(signal.value);
        return onLazySignalValueSignal(withNext, signal.getNext(), newState);
    };
    return onLazySignalValueSignal(withNext, signal);
};
/**
 * Join two signals into one, dies when both die.
 * Signal a -> Signal b -> Signal (a | b)
 * @param  {Signal} signalA [description]
 * @param  {Signal} signalB [description]
 * @return {Signal}         [description]
 */
exports.join = function (signalA, signalB) {
    if (isSignalAnSignalAction(signalA) && signalA.signalAction === SignalActions.STOP) {
        return signalB;
    }
    var nextSignal = function (FutureLeft, FutureRight) {
        var getNextSignal = function (otherFuture, newSignal) {
            if (isSignalAnSignalAction(newSignal) && newSignal.signalAction === SignalActions.STOP) {
                return otherFuture;
            }
            if (isSignalValue(newSignal)) {
                return CreateResolvedFuture(SignalFactory(newSignal.value, function () { return nextSignal(newSignal.getNext(), otherFuture); }));
            }
            return CreateResolvedFuture(SignalFactory(null, function () { return nextSignal(newSignal.getNext(), otherFuture); }, newSignal.signalAction || SignalActions.NOOP));
        };
        var signalOrEnd = function (potentialSignal) { return exports.isSignal(potentialSignal) ? potentialSignal : SIGNAL_DEAD; };
        var raceFns = function (Futures) {
            return new Future(function (resolve) {
                Futures.some(function (Future) {
                    var future = Future();
                    future.then(function (potentialValue) {
                        resolve(potentialValue);
                    });
                    return future.valueType === FutureValues.VALUE;
                });
            });
        };
        return raceFns([
            function () { return FutureLeft.then(function (newSignal) { return getNextSignal(FutureRight, newSignal); }); },
            function () { return FutureRight.then(function (newSignal) { return getNextSignal(FutureLeft, newSignal); }); }
        ]);
    };
    if (isSignalValue(signalA)) {
        return SignalFactory(signalA.value, function () { return nextSignal(signalA.getNext(), signalB.getNext()); });
    }
    return SignalFactory(null, function () { return nextSignal(signalA.getNext(), signalB.getNext()); }, SignalActions.NOOP);
};
/**
 * Filter a signal over time
 * (a -> boolean) -> Signal a -> Signal a
 * @param  {Function} filterFunction Truth means to bring it forward
 * @param  {Signal} signal         Source
 * @return {Signal}                Filtered source
*/
exports.filter = function (filterFunction, signal) {
    var withNext = function (signal) {
        var isFilteredIn = filterFunction(signal.value);
        if (isFilteredIn) {
            return onLazySignalValueSignal(withNext, signal.getNext(), signal.value);
        }
        return onLazySignalValueSignal(withNext, signal.getNext());
    };
    return onLazySignalValueSignal(withNext, signal);
};
exports.flatten = function (signal) {
    var withNext = function (signal) {
        if (exports.isSignal(signal.value)) {
            var leftHandSide = signal.value;
            var rightHandSide = SignalFactory(null, function () { return signal.getNext(); }, SignalActions.NOOP);
            return exports.flatten(exports.join(leftHandSide, rightHandSide));
        }
        return onLazySignalValueSignal(withNext, signal.getNext(), signal.value);
    };
    return onLazySignalValueSignal(withNext, signal);
};
/**
 * { k` = Signal a`, k`` = Signal a``, ..., k^n = a^n} -> Signal { k` = a`, k`` = a``, ..., k^n = a^n}
 * @param  {[type]} objectToMerge [description]
 * @return {[type]}               [description]
*/
exports.mergeObject = function (objectToMerge) {
    var keyPairToArraySignals = function (signal, key) { return exports.map(function (a) {
        return [key, a];
    }, signal); };
    var setOfSignals = (Object.keys(objectToMerge) || []).map(function (key) { return keyPairToArraySignals(objectToMerge[key], key); });
    var joinedSignal = setOfSignals.slice(1).reduce(function (joinedSignal, additionalSignal) { return exports.join(joinedSignal, additionalSignal); }, setOfSignals[0]);
    var backToObject = function (signal) { return exports.foldp(function (lastAnswer, value) {
        var newAnswer = Object.keys(lastAnswer).reduce(function (answer, key) {
            answer[key] = lastAnswer[key];
            return answer;
        }, {});
        newAnswer[value[0]] = value[1];
        return newAnswer;
    }, {}, signal); };
    var filterEmpty = function (signal) { return exports.filter(function (a) { return Object.keys(a).length > 0; }, signal); };
    return filterEmpty(backToObject(joinedSignal));
};
/**
 * { k` = Signal a`, k`` = Signal a``, ..., k^n = a^n} -> Signal { k` = a`, k`` = a``, ..., k^n = a^n}
 * Uses an and change
 * @param  {Object} objectToMerge [description]
 * @return {Signal}               [description]
 */
exports.mergeObjectAnd = function (objectToMerge) {
    var mergedSignal = exports.mergeObject(objectToMerge);
    var previousAndNext = exports.foldp(function (pair, next) {
        var last = pair[1];
        return [last, next];
    }, [{}, {}], mergedSignal);
    var filteredPreviousAndNext = exports.filter(function (_a) {
        var previous = _a[0], next = _a[1];
        if (Object.keys(next).length !== Object.keys(objectToMerge).length) {
            return false;
        }
        if ((Object.keys(next) || []).every(function (newKey) { return next[newKey] !== previous[newKey]; })) {
            return false;
        }
        return true;
    }, previousAndNext);
    return exports.map(function (_a) {
        var previous = _a[0], next = _a[1];
        return next;
    }, filteredPreviousAndNext);
};
exports.getLatest = function (signalA) { return CurrentSignal(signalA); };
/**
 * These are functions that will return a signal that follows the tails, ensuring that the latest is always there.
*/
var mergeObjectLatest = function (a) {
    return exports.getLatest(exports.mergeObject(a));
};
exports.latest = {
    mergeObject: mergeObjectLatest
};
//# sourceMappingURL=signal.js.map