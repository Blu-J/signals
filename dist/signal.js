"use strict";
var FutureValues;
(function (FutureValues) {
    FutureValues[FutureValues["NO_VALUE"] = 0] = "NO_VALUE";
    FutureValues[FutureValues["VALUE"] = 1] = "VALUE";
})(FutureValues || (FutureValues = {}));
;
var SignalActions;
(function (SignalActions) {
    SignalActions[SignalActions['NOOP'] = 0] = 'NOOP';
    SignalActions[SignalActions['STOP'] = 1] = 'STOP';
})(SignalActions || (SignalActions = {}));
;
;
;
;
;
var Maybe = {
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
exports.NO_VALUES = [SignalActions.NOOP, SignalActions.STOP];
function CreateResolvedFuture(a) {
    return new Future(function (resolve) { return resolve(a); });
}
var noop = function () { return null; };
var noopFuture = function () { return Future.of(function () { return null; }); };
function SignalFactory(value, getNext, signalAction) {
    if (Maybe.isDefined(signalAction)) {
        return {
            signalAction: signalAction,
            getNext: getNext,
        };
    }
    return {
        value: value,
        getNext: getNext
    };
}
var SIGNAL_DEAD = {
    signalAction: SignalActions.STOP,
    getNext: function () { return CreateResolvedFuture(SIGNAL_DEAD); },
};
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
exports.fromArray = function (array) {
    var guarenteedArray = [].concat(array);
    return exports.fastForwardFunction(function sinkArray(sink) {
        guarenteedArray.forEach(function (arrayValue) { return sink(arrayValue); });
        sink(null, SignalActions.STOP);
    });
};
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
exports.fromFunction = function (sinkNewValue) {
    return CurrentSignal(exports.fastForwardFunction(sinkNewValue));
};
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
        if (Maybe.isDefined(currentSignal)) {
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
    var futurePromise;
    var getNext = function () {
        if (Maybe.isDefined(futurePromise)) {
            return futurePromise;
        }
        var newFuture = new Future(function (sink) { return exports.onSignalValue(function (newSignal) { return sink(onValue(newSignal)); }, signal); });
        futurePromise = newFuture;
        return newFuture;
    };
    if (Maybe.isDefined(currentValue)) {
        return {
            value: currentValue,
            getNext: getNext,
        };
    }
    return {
        signalAction: SignalActions.NOOP,
        getNext: getNext,
    };
};
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
exports.foldp = function (foldFunction, initialState, signal) {
    var state = initialState;
    var withNext = function (signal) {
        var newState = foldFunction(state, signal.value);
        state = newState;
        return onLazySignalValueSignal(withNext, signal.getNext(), state);
    };
    return onLazySignalValueSignal(withNext, signal);
};
exports.map = function (mapFunction, signal) {
    var withNext = function (signal) {
        var newState = mapFunction(signal.value);
        return onLazySignalValueSignal(withNext, signal.getNext(), newState);
    };
    return onLazySignalValueSignal(withNext, signal);
};
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
            var done = false;
            return new Future(function (resolve) {
                Futures.forEach(function (Future) {
                    if (done) {
                        return;
                    }
                    return Future().then(function (potentialValue) {
                        done = true;
                        resolve(potentialValue);
                    });
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
            var rightHandSide = {
                signalAction: SignalActions.NOOP,
                getNext: function () { return signal.getNext(); },
            };
            return exports.flatten(exports.join(leftHandSide, rightHandSide));
        }
        return onLazySignalValueSignal(withNext, signal.getNext(), signal.value);
    };
    return onLazySignalValueSignal(withNext, signal);
};
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
var mergeObjectLatest = function (a) {
    return exports.getLatest(exports.mergeObject(a));
};
exports.latest = {
    mergeObject: mergeObjectLatest
};
//# sourceMappingURL=signal.js.map