(function webpackUniversalModuleDefinition(root, factory) {
	if(typeof exports === 'object' && typeof module === 'object')
		module.exports = factory();
	else if(typeof define === 'function' && define.amd)
		define([], factory);
	else if(typeof exports === 'object')
		exports["signals"] = factory();
	else
		root["signals"] = factory();
})(this, function() {
return /******/ (function(modules) { // webpackBootstrap
/******/ 	// The module cache
/******/ 	var installedModules = {};

/******/ 	// The require function
/******/ 	function __webpack_require__(moduleId) {

/******/ 		// Check if module is in cache
/******/ 		if(installedModules[moduleId])
/******/ 			return installedModules[moduleId].exports;

/******/ 		// Create a new module (and put it into the cache)
/******/ 		var module = installedModules[moduleId] = {
/******/ 			exports: {},
/******/ 			id: moduleId,
/******/ 			loaded: false
/******/ 		};

/******/ 		// Execute the module function
/******/ 		modules[moduleId].call(module.exports, module, module.exports, __webpack_require__);

/******/ 		// Flag the module as loaded
/******/ 		module.loaded = true;

/******/ 		// Return the exports of the module
/******/ 		return module.exports;
/******/ 	}


/******/ 	// expose the modules object (__webpack_modules__)
/******/ 	__webpack_require__.m = modules;

/******/ 	// expose the module cache
/******/ 	__webpack_require__.c = installedModules;

/******/ 	// __webpack_public_path__
/******/ 	__webpack_require__.p = "";

/******/ 	// Load entry module and return exports
/******/ 	return __webpack_require__(0);
/******/ })
/************************************************************************/
/******/ ([
/* 0 */
/***/ function(module, exports, __webpack_require__) {

	var __WEBPACK_AMD_DEFINE_FACTORY__, __WEBPACK_AMD_DEFINE_ARRAY__, __WEBPACK_AMD_DEFINE_RESULT__;'use strict';

	(function (global, factory) {
	  if (true) {
	    !(__WEBPACK_AMD_DEFINE_ARRAY__ = [exports], __WEBPACK_AMD_DEFINE_FACTORY__ = (factory), __WEBPACK_AMD_DEFINE_RESULT__ = (typeof __WEBPACK_AMD_DEFINE_FACTORY__ === 'function' ? (__WEBPACK_AMD_DEFINE_FACTORY__.apply(exports, __WEBPACK_AMD_DEFINE_ARRAY__)) : __WEBPACK_AMD_DEFINE_FACTORY__), __WEBPACK_AMD_DEFINE_RESULT__ !== undefined && (module.exports = __WEBPACK_AMD_DEFINE_RESULT__));
	  } else if (typeof exports !== "undefined") {
	    factory(exports);
	  } else {
	    var mod = {
	      exports: {}
	    };
	    factory(mod.exports);
	    global.signal = mod.exports;
	  }
	})(this, function (exports) {
	  Object.defineProperty(exports, "__esModule", {
	    value: true
	  });

	  function _defineProperty(obj, key, value) {
	    if (key in obj) {
	      Object.defineProperty(obj, key, {
	        value: value,
	        enumerable: true,
	        configurable: true,
	        writable: true
	      });
	    } else {
	      obj[key] = value;
	    }

	    return obj;
	  }

	  var NO_VALUE = {
	    value: 'NO_VALUE'
	  };

	  var Future = function Future(withUpdate) {
	    var onResolveds = [];
	    var value = NO_VALUE;

	    this.then = function (onResolved) {
	      return new Future(function resolveThenFuture(thenFutureResolve) {
	        var updateFuture = function getResolvedAndPassOn(newValue) {
	          var updatedValue = onResolved(newValue);

	          if (updatedValue && typeof updatedValue.then === "function") {
	            updatedValue.then(thenFutureResolve);
	          } else {
	            thenFutureResolve(updatedValue);
	          }
	        };

	        if (value !== NO_VALUE) {
	          updateFuture(value);
	        } else {
	          onResolveds.push(updateFuture);
	        }
	      });
	    };

	    withUpdate(function sinkForFuture(newValue) {
	      if (value !== NO_VALUE) {
	        return;
	      }

	      value = newValue;
	      onResolveds.forEach(function (onResolved) {
	        return onResolved(newValue);
	      });
	      onResolveds = [];
	    });
	  };

	  var NEW_SIGNAL = exports.NEW_SIGNAL = {
	    value: 'NEW_SIGNAL'
	  };
	  var NONE = exports.NONE = {
	    value: 'NONE'
	  };
	  var STOP = exports.STOP = {
	    value: 'STOP'
	  };
	  var NO_VALUES = exports.NO_VALUES = [NEW_SIGNAL, NONE, STOP];

	  function CreateResolvedFuture(a) {
	    return new Future(function (resolve) {
	      return resolve(a);
	    });
	  }

	  var noop = function noop() {
	    return null;
	  };

	  var curry_2 = function curry_2(fn) {
	    var _arguments = arguments;
	    return function (a, b) {
	      return _arguments.length >= 2 ? fn(a, b) : function (b) {
	        return fn(a, b);
	      };
	    };
	  };

	  var curry_3 = function curry_3(fn) {
	    return function (a, b, c) {
	      return arguments.length >= 3 ? fn(a, b, c) : arguments.length >= 2 ? function (c) {
	        return fn(a, b, c);
	      } : function (b, c) {
	        return arguments.length >= 2 ? fn(a, b, c) : function (c) {
	          return fn(a, b, c);
	        };
	      };
	    };
	  };

	  function SignalFactory(value, getNext) {
	    return {
	      value: value,
	      getNext: getNext
	    };
	  }

	  var SIGNAL_DEAD = SignalFactory(STOP, noop);

	  function CurrentSignal(tailSignal) {
	    var me = {};
	    me.tailSignal = tailSignal;
	    me.value = NEW_SIGNAL;
	    update(tailSignal);

	    me.getNext = function () {
	      return CreateResolvedFuture(me.tailSignal);
	    };

	    return me;

	    function update(signal) {
	      if (signal.value === STOP || !signal.getNext) {
	        return;
	      }

	      me.tailSignal = signal;
	      var next = signal.getNext();

	      if (next) {
	        next.then(function (nextSignal) {
	          return update(nextSignal);
	        });
	      }
	    }
	  }

	  var fromArray = exports.fromArray = function fromArray(array) {
	    var guarenteedArray = [].concat(array);
	    return fastForwardFunction(function sinkArray(sink) {
	      guarenteedArray.forEach(function (arrayValue) {
	        return sink(arrayValue);
	      });
	      sink(STOP);
	    });
	  };

	  var fastForwardFunction = exports.fastForwardFunction = function fastForwardFunction(sinkNewValue) {
	    var initValue = NEW_SIGNAL;
	    var currentResolve = noop;
	    var newTail = function newTail(value) {
	      var newFuture = new Future(function (resolve) {
	        currentResolve = resolve;
	      });
	      return SignalFactory(value, function () {
	        return newFuture;
	      });
	    };

	    var answer = newTail(initValue);
	    sinkNewValue(function sinkIntoSignal(newValue) {
	      var isSkipValue = newValue === NEW_SIGNAL || newValue === NONE;
	      var isStop = newValue === STOP;
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

	  var fromFunction = exports.fromFunction = function fromFunction(sinkNewValue) {
	    return CurrentSignal(fastForwardFunction(sinkNewValue));
	  };

	  var fromPromises = exports.fromPromises = function fromPromises() {
	    var guarenteedArray = [].concat(array);
	    return fastForwardFunction(function sinkArray(sink) {
	      guarenteedArray.forEach(function (arrayValue) {
	        return arrayValue && typeof arrayValue.then === 'function' ? arrayValue.then(sink) : sink(arrayValue);
	      });
	      sink(STOP);
	    });
	  };

	  var isSignal = exports.isSignal = function isSignal(predicateValue) {
	    var hasValue = predicateValue && predicateValue.hasOwnProperty('value');
	    var hasGetNext = predicateValue ? typeof predicateValue.getNext === 'function' : false;
	    return hasValue && hasGetNext;
	  };

	  var onValue = exports.onValue = curry_2(function (onValue, startingSignal) {
	    var withNext = function withNext(signal) {
	      var values = [].concat(signal.value);
	      var isValue = values.every(function (value) {
	        return NONE !== value && NEW_SIGNAL !== value;
	      });
	      if (signal.value == STOP) {
	        return;
	      }
	      if (isValue) {
	        onValue(signal.value);
	      }
	      var nextFuture = signal.getNext();
	      var nextSignal = undefined;
	      nextFuture.then(function (a) {
	        return nextSignal = a;
	      });
	      if (nextSignal) {
	        return withNext(nextSignal);
	      }
	      nextFuture.then(withNext);
	    };
	    withNext(startingSignal);
	    return function () {
	      onValue = noop;
	      withNext = noop;
	    };
	  });
	  var foldp = exports.foldp = curry_3(function (foldFunction, initialState, signal) {
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
	    return SignalFactory(initialState, function () {
	      return signal.getNext().then(untilNext);
	    });
	  });
	  var map = exports.map = curry_2(function (mapFunction, signal) {
	    return foldp(function (memo, newValue) {
	      return mapFunction(newValue);
	    })(NEW_SIGNAL)(signal);
	  });

	  var flatten = exports.flatten = function flatten(signal) {
	    var withNext = function withNext(nextSignal) {
	      return flatten(isSignal(nextSignal.value) ? join(nextSignal.value, nextSignal) : nextSignal);
	    };

	    var isEnd = !signal || signal.value == STOP;
	    return isEnd ? signal : SignalFactory(signal.value, function () {
	      return signal.getNext().then(withNext);
	    });
	  };

	  var join = exports.join = function join(signalA, signalB) {
	    if (!signalA || signalA.value == STOP) {
	      return signalB;
	    }
	    var nextSignal = function nextSignal(FutureLeft, FutureRight) {
	      var getNextSignal = function getNextSignal(otherFuture) {
	        return function (newSignal) {
	          return !newSignal || newSignal.value === STOP ? otherFuture : SignalFactory(newSignal.value, function () {
	            return nextSignal(newSignal.getNext(), otherFuture);
	          });
	        };
	      };
	      var signalOrEnd = function signalOrEnd(potentialSignal) {
	        return isSignal(potentialSignal) ? potentialSignal : SIGNAL_DEAD;
	      };

	      var race = function race(Futures) {
	        return new Future(function (resolve) {
	          Futures.forEach(function (Future) {
	            return Future.then(function (potentialValue) {
	              return resolve(potentialValue);
	            });
	          });
	        });
	      };
	      return race([FutureLeft.then(getNextSignal(FutureRight)), FutureRight.then(getNextSignal(FutureLeft))]);
	    };
	    return SignalFactory(signalA.value, function () {
	      return nextSignal(signalA.getNext(), signalB.getNext());
	    });
	  };

	  var filter = exports.filter = curry_2(function (filterFunction, signal) {
	    return foldp(function (memo, newValue) {
	      return !filterFunction(newValue) ? NONE : newValue;
	    }, NEW_SIGNAL, signal);
	  });

	  var mergeObject = exports.mergeObject = function mergeObject(objectToMerge) {
	    var keyPairToArraySignals = function keyPairToArraySignals(signal, key) {
	      return map(function (a) {
	        return _defineProperty({}, key, a);
	      })(signal);
	    };
	    var setOfSignals = (Object.keys(objectToMerge) || []).map(function (key) {
	      return keyPairToArraySignals(objectToMerge[key], key);
	    });
	    var joinedSignal = setOfSignals.slice(1).reduce(function (joinedSignal, additionalSignal) {
	      return join(joinedSignal, additionalSignal);
	    }, setOfSignals[0]);
	    var backToObject = foldp(function (lastAnswer, value) {
	      return Object.assign({}, lastAnswer, value);
	    }, {});

	    var filterEmpty = filter(function (a) {
	      return Object.keys(a).length;
	    });

	    return filterEmpty(backToObject(joinedSignal));
	  };

	  var mergeObjectAnd = exports.mergeObjectAnd = function mergeObjectAnd(objectToMerge) {
	    var mergedSignal = mergeObject(objectToMerge);
	    var onlyAllChanged = foldp(function (lastGood, nextPotentialValue) {
	      var allNewValues = (Object.keys(nextPotentialValue) || []).every(function (newKey) {
	        return nextPotentialValue[newKey] !== lastGood[newKey];
	      });
	      if (allNewValues) {
	        return nextPotentialValue;
	      }
	      return NONE;
	    }, {});
	    return onlyAllChanged(mergedSignal);
	  };

	  var getLatest = exports.getLatest = function getLatest(signalA) {
	    return CurrentSignal(signalA);
	  };

	  var mergeObjectLatest = function mergeObjectLatest(a) {
	    return getLatest(mergeObject(a));
	  };

	  var latest = exports.latest = {
	    mergeObject: mergeObjectLatest
	  };
	});

/***/ }
/******/ ])
});
;