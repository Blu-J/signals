(function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);var f=new Error("Cannot find module '"+o+"'");throw f.code="MODULE_NOT_FOUND",f}var l=n[o]={exports:{}};t[o][0].call(l.exports,function(e){var n=t[o][1][e];return s(n?n:e)},l,l.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({1:[function(require,module,exports){
/*jshint esnext: true */

'use strict';

Object.defineProperty(exports, '__esModule', {
  value: true
});
exports.isSignal = isSignal;
exports.flatten = flatten;
exports.join = join;
exports.mergeOr = mergeOr;
exports.mergeAnd = mergeAnd;
exports.mergeObject = mergeObject;

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { 'default': obj }; }

function _toConsumableArray(arr) { if (Array.isArray(arr)) { for (var i = 0, arr2 = Array(arr.length); i < arr.length; i++) arr2[i] = arr[i]; return arr2; } else { return Array.from(arr); } }

var _lodash = require('lodash');

var _lodash2 = _interopRequireDefault(_lodash);

var NEW_SIGNAL = Symbol('NEW_SIGNAL');
exports.NEW_SIGNAL = NEW_SIGNAL;
var NONE = Symbol('NONE');
exports.NONE = NONE;
var STOP = Symbol('STOP');
exports.STOP = STOP;
var NO_VALUES = [NEW_SIGNAL, NONE, STOP];
exports.NO_VALUES = NO_VALUES;
var noop = function noop() {
  return null;
};

/**
 * Signal is a value over time, this is just a link to next moment in time. And is lazy
 * a -> (() -> Promise Signal a) -> Signal a
 * @param  {Any} @value   [description]
 * @param  {Function} @getNext [description]
 * @return {Signal}          [description]
*/
function Signal(value, getNext) {
  return {
    value: value,
    getNext: getNext
  };
}

var SIGNAL_DEAD = Signal(STOP, _lodash2['default'].noop);
function CurrentSignal(tailSignal) {
  var me = {};
  me.tailSignal = tailSignal;
  update(tailSignal);
  me.getNext = function () {
    return me.tailSignal.getNext();
  };
  return me;

  function update(signal) {
    me.value = signal.value;
    me.tailSignal = signal;
    var next = signal.getNext();
    if (next) {
      next.then(function (nextSignal) {
        return update(nextSignal);
      });
    }
  }
}

var getLatest = function getLatest(signalA) {
  return CurrentSignal(signalA);
};

/**
 * Create a signal form an array
 * [a...] -> Signal a
 * @param  {Array a} array [a...] | Value of a
 * @return {Signal a}       Signal a
*/
var fromArray = function fromArray(array) {
  return (0, _lodash2['default'])([NEW_SIGNAL].concat(array)).reverse().reduce(function (head, arrayValue) {
    var newPromise = new Promise(function (resolve) {
      return resolve(head);
    });
    return Signal(arrayValue, function () {
      return newPromise;
    });
  }, SIGNAL_DEAD).valueOf();
};

exports.fromArray = fromArray;
/**
 * create a signal from a function that can 'sink' values in
 * Note that this could be a memory leak
 * ((a -> ()) -> ()) -> CurrentSignal a
 * @param  {Function} sinkNewValue (a -> ()) -> () | A function to drop a new value
 * @return {Signal}              CurrentSignal a | A current signal of a
*/
var fromFunction = function fromFunction(sinkNewValue) {
  var initValue = NEW_SIGNAL;
  var currentResolve = _lodash2['default'].noop;
  var newTail = function newTail(value) {
    var newPromise = new Promise(function (resolve) {
      currentResolve = resolve;
    });
    return Signal(value, function () {
      return newPromise;
    });
  };

  var answer = newTail(initValue);
  sinkNewValue(function (newValue) {
    return currentResolve(newTail(newValue));
  });
  return answer;
};

exports.fromFunction = fromFunction;
/**
 * These are functions that will return a signal that follows the tails, ensuring that the latest is always there.
*/
var latest = {
  fromFunction: _lodash2['default'].compose(getLatest, fromFunction)
};

exports.latest = latest;
/**
 * From Promises
 * Promise a -> ... -> Signal a
 * @param  {Promise} promises... [description]
 * @return {Signal}             [description]
*/
var fromPromises = function fromPromises() {
  var sink = null;
  var answer = fromFunction(function (newSink) {
    return sink = newSink;
  });

  for (var _len = arguments.length, promises = Array(_len), _key = 0; _key < _len; _key++) {
    promises[_key] = arguments[_key];
  }

  _lodash2['default'].each(promises, function (promise) {
    return promise.then(sink);
  });
  return answer;
};

exports.fromPromises = fromPromises;
/**
 * Determines is value is a signal
 * a -> Booelan
 * @param  {[type]} predicateValue [description]
 * @return {[type]}                [description]
*/

function isSignal(predicateValue) {
  var hasValue = predicateValue.hasOwnProperty('value');
  var hasGetNext = predicateValue ? typeof predicateValue.getNext === 'function' : false;
  return hasValue && hasGetNext;
}

/**
 * This is a each loop that is expecting side effeces
 * Notes that this returns a garbage collection, that combined with a fromFunction, it will hold memory all the way to the source
 * (a -> ()) -> Signal a -> (() -> ())
 * @param  {Function} onValue        a -> () | Where we call on signal
 * @param  {[type]} startingSignal    Signal a
 * @return {Function}                () -> () | Clean up
*/
var onValue = _lodash2['default'].curry(function (onValue, startingSignal) {
  var _withNext = function withNext(signal) {
    var values = [].concat(signal.value);
    var isValue = _lodash2['default'].every(values, function (value) {
      return !_lodash2['default'].find([NONE, NEW_SIGNAL], value);
    });
    console.log("Signal.value", JSON.stringify(signal.value));
    if (signal.value == STOP) {
      return;
    }
    if (isValue) {
      onValue(signal.value);
    }
    signal.getNext().then(_withNext);
  };
  _withNext(startingSignal);
  return function () {
    onValue = _lodash2['default'].noop;
    _withNext = _lodash2['default'].noop;
  };
});

exports.onValue = onValue;
/**
 * [Fold](https://en.wikipedia.org/wiki/Fold_(higher-order_function)) but with a signal, which is potential future
 * (a -> b) -> a -> signal a -> signal b
 * @param  {Function} foldFunction (state -> a -> state) Reduce function
 * @param  {a} initialState a
 * @param  {Signal} signal       Signal a
 * @return {Sginal}              Signal state
*/
var foldp = _lodash2['default'].curry(function (foldFunction, initialState, signal) {
  //TODO
  var untilNext = function untilNext(nextSignal) {
    var isSkipValue = nextSignal.value === NEW_SIGNAL || nextSignal.value === NONE;
    var isStop = nextSignal.value === STOP;
    if (isStop) {
      return nextSignal;
    }
    if (isSkipValue) {
      return nextSignal.getNext().then(untilNext);
    }
    var nextValue = foldFunction(initialState, nextSignal.value);
    var shouldSkip = nextValue === NONE;
    var shouldStop = nextValue === STOP;
    return shouldSkip ? nextSignal.getNext().then(untilNext) : shouldStop ? SIGNAL_DEAD : foldp(foldFunction, nextValue, nextSignal);
  };
  return Signal(initialState, function () {
    return signal.getNext().then(untilNext);
  });
});

exports.foldp = foldp;
/**
 * Map a function across the signal
 * (a -> b) -> Signal a -> Signal b
 * @param  {Function} mapFunction (a -> b) | map domain to codomain
 * @param  {Signal} signal      Signal a | Signal of domain
 * @return {Signal}             Signal b | Signal of codomain
*/
var map = _lodash2['default'].curry(function (mapFunction, signal) {
  return foldp(function (memo, newValue) {
    return mapFunction(newValue);
  }, null, signal);
});

exports.map = map;
/**
 * Flatten a signal of signals into a single signal
 * Signal (Signal a | a) -> Signal a
 * @param  {[type]} signal [description]
 * @return {[type]}        [description]
*/

function flatten(signal) {
  var withNext = function withNext(nextSignal) {
    return flatten(isSignal(nextSignal.value) ? join(nextSignal.value, nextSignal) : nextSignal);
  };

  var isEnd = !signal || signal.value == STOP;
  return isEnd ? signal : Signal(signal.value, function () {
    return signal.getNext().then(withNext);
  });
}

/**
 * Join two signals into one, dies when both die.
 * Signal a -> Signal b -> Signal (a | b)
 * @param  {Signal} signalA [description]
 * @param  {Signal} signalB [description]
 * @return {Signal}         [description]
 */

function join(signalA, signalB) {
  if (!signalA || signalA.value == STOP) {
    return signalB;
  }
  var nextSignal = function nextSignal(promiseLeft, promiseRight) {
    var getNextSignal = function getNextSignal(otherPromise) {
      return function (newSignal) {
        return !newSignal || newSignal.value === STOP ? otherPromise : Signal(newSignal.value, function () {
          return nextSignal(newSignal.getNext(), otherPromise);
        });
      };
    };

    return Promise.race([promiseLeft.then(getNextSignal(promiseRight)), promiseRight.then(getNextSignal(promiseLeft))]);
  };

  return Signal(signalA.value, function () {
    return nextSignal(signalA.getNext(), signalB.getNext());
  });
}

/**
 * Filter a signal over time
 * (a -> boolean) -> Signal a -> Signal a
 * @param  {Function} filterFunction Truth means to bring it forward
 * @param  {Signal} signal         Source
 * @return {Signal}                Filtered source
*/
var filter = _lodash2['default'].curry(function (filterFunction, signal) {
  return foldp(function (memo, newValue) {
    return !filterFunction(newValue) ? NONE : newValue;
  }, null, signal);
});

exports.filter = filter;
/**
 * Broadcast any time any Signal updates
 * (Signal a) -> ... -> Signal (List a)
 * @param  {Signal[]} other.. Other Streams
 * @return {Signal}                 Signal of [streamValues...]
*/

function mergeOr() {
  for (var _len2 = arguments.length, otherSignals = Array(_len2), _key2 = 0; _key2 < _len2; _key2++) {
    otherSignals[_key2] = arguments[_key2];
  }

  var allValues = _lodash2['default'].map(otherSignals, _lodash2['default'].property('value'));
  return Signal(allValues, function () {
    var newPromises = _lodash2['default'].map(otherSignals, function (oldSignal) {
      return oldSignal.getNext().then(function (newSignal) {
        var nextSignals = _lodash2['default'].map(otherSignals, function (otherSignal) {
          return otherSignal !== oldSignal ? otherSignal : newSignal;
        });
        return mergeOr.apply(undefined, _toConsumableArray(nextSignals));
      });
    });
    return Promise.race(newPromises);
  });
}

/**
 * Emit only when all signals have updated
 * Signal a -> ... -> Signal (List a)
 * @param  {Signal []} other.. [description]
 * @return {Signal}                 [description]
*/

function mergeAnd() {
  for (var _len3 = arguments.length, otherSignals = Array(_len3), _key3 = 0; _key3 < _len3; _key3++) {
    otherSignals[_key3] = arguments[_key3];
  }

  var allValues = _lodash2['default'].map(otherSignals, _lodash2['default'].property('value'));
  var otherGetNexts = _lodash2['default'].map(otherSignals, _lodash2['default'].property('getNext'));
  var allNew = _lodash2['default'].every(allValues, function (value) {
    return value === NEW_SIGNAL;
  });
  var maybeNewAllValues = allNew ? NEW_SIGNAL : allValues;

  return Signal(allValues, function () {
    var otherNexts = _lodash2['default'].map(otherGetNexts, function (getNext) {
      return getNext();
    });
    return Promise.all(otherNexts).then(function (allNextValues) {
      return mergeAnd.apply(undefined, _toConsumableArray(allNextValues));
    });
  });
}

/**
 * { k` = Signal a`, k`` = Signal a``, ..., k^n = a^n} -> Signal { k` = a`, k`` = a``, ..., k^n = a^n}
 * @param  {[type]} objectToMerge [description]
 * @return {[type]}               [description]
*/

function mergeObject(objectToMerge) {
  var setOfSignals = _lodash2['default'].map(objectToMerge, function (signal, key) {
    return map(function (a) {
      var answer = {};
      answer[key] = a;
      return answer;
    }, signal);
  });
  var joinedSignal = _lodash2['default'].reduce(_lodash2['default'].rest(setOfSignals), function (joinedSignal, additionalSignal) {
    return join(joinedSignal, additionalSignal);
  }, _lodash2['default'].first(setOfSignals));
  var backToObject = foldp(function (lastAnswer, value) {
    return _lodash2['default'].extend({}, lastAnswer, value);
  }, {});

  var filterEmpty = filter(function (a) {
    return !_lodash2['default'].isEmpty(a);
  });

  return filterEmpty(backToObject(joinedSignal));
}

},{"lodash":"lodash"}]},{},[1]);
