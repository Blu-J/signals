(function(f){if(typeof exports==="object"&&typeof module!=="undefined"){module.exports=f()}else if(typeof define==="function"&&define.amd){define([],f)}else{var g;if(typeof window!=="undefined"){g=window}else if(typeof global!=="undefined"){g=global}else if(typeof self!=="undefined"){g=self}else{g=this}g.signal = f()}})(function(){var define,module,exports;return (function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);var f=new Error("Cannot find module '"+o+"'");throw f.code="MODULE_NOT_FOUND",f}var l=n[o]={exports:{}};t[o][0].call(l.exports,function(e){var n=t[o][1][e];return s(n?n:e)},l,l.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({1:[function(require,module,exports){
module.exports = { "default": require("core-js/library/fn/object/assign"), __esModule: true };
},{"core-js/library/fn/object/assign":4}],2:[function(require,module,exports){
module.exports = { "default": require("core-js/library/fn/object/keys"), __esModule: true };
},{"core-js/library/fn/object/keys":5}],3:[function(require,module,exports){
module.exports = { "default": require("core-js/library/fn/symbol"), __esModule: true };
},{"core-js/library/fn/symbol":6}],4:[function(require,module,exports){
require('../../modules/es6.object.assign');
module.exports = require('../../modules/$.core').Object.assign;
},{"../../modules/$.core":10,"../../modules/es6.object.assign":34}],5:[function(require,module,exports){
require('../../modules/es6.object.keys');
module.exports = require('../../modules/$.core').Object.keys;
},{"../../modules/$.core":10,"../../modules/es6.object.keys":35}],6:[function(require,module,exports){
require('../../modules/es6.symbol');
module.exports = require('../../modules/$.core').Symbol;
},{"../../modules/$.core":10,"../../modules/es6.symbol":36}],7:[function(require,module,exports){
var isObject = require('./$.is-object');
module.exports = function(it){
  if(!isObject(it))throw TypeError(it + ' is not an object!');
  return it;
};
},{"./$.is-object":20}],8:[function(require,module,exports){
// 19.1.2.1 Object.assign(target, source, ...)
var toObject = require('./$.to-object')
  , IObject  = require('./$.iobject')
  , enumKeys = require('./$.enum-keys')
  , has      = require('./$.has');

// should work with symbols and should have deterministic property order (V8 bug)
module.exports = require('./$.fails')(function(){
  var a = Object.assign
    , A = {}
    , B = {}
    , S = Symbol()
    , K = 'abcdefghijklmnopqrst';
  A[S] = 7;
  K.split('').forEach(function(k){ B[k] = k; });
  return a({}, A)[S] != 7 || Object.keys(a({}, B)).join('') != K;
}) ? function assign(target, source){   // eslint-disable-line no-unused-vars
  var T = toObject(target)
    , l = arguments.length
    , i = 1;
  while(l > i){
    var S      = IObject(arguments[i++])
      , keys   = enumKeys(S)
      , length = keys.length
      , j      = 0
      , key;
    while(length > j)if(has(S, key = keys[j++]))T[key] = S[key];
  }
  return T;
} : Object.assign;
},{"./$.enum-keys":13,"./$.fails":14,"./$.has":17,"./$.iobject":19,"./$.to-object":31}],9:[function(require,module,exports){
var toString = {}.toString;

module.exports = function(it){
  return toString.call(it).slice(8, -1);
};
},{}],10:[function(require,module,exports){
var core = module.exports = {version: '1.2.0'};
if(typeof __e == 'number')__e = core; // eslint-disable-line no-undef
},{}],11:[function(require,module,exports){
var global    = require('./$.global')
  , core      = require('./$.core')
  , PROTOTYPE = 'prototype';
var ctx = function(fn, that){
  return function(){
    return fn.apply(that, arguments);
  };
};
var $def = function(type, name, source){
  var key, own, out, exp
    , isGlobal = type & $def.G
    , isProto  = type & $def.P
    , target   = isGlobal ? global : type & $def.S
        ? global[name] : (global[name] || {})[PROTOTYPE]
    , exports  = isGlobal ? core : core[name] || (core[name] = {});
  if(isGlobal)source = name;
  for(key in source){
    // contains in native
    own = !(type & $def.F) && target && key in target;
    if(own && key in exports)continue;
    // export native or passed
    out = own ? target[key] : source[key];
    // prevent global pollution for namespaces
    if(isGlobal && typeof target[key] != 'function')exp = source[key];
    // bind timers to global for call from export context
    else if(type & $def.B && own)exp = ctx(out, global);
    // wrap global constructors for prevent change them in library
    else if(type & $def.W && target[key] == out)!function(C){
      exp = function(param){
        return this instanceof C ? new C(param) : C(param);
      };
      exp[PROTOTYPE] = C[PROTOTYPE];
    }(out);
    else exp = isProto && typeof out == 'function' ? ctx(Function.call, out) : out;
    // export
    exports[key] = exp;
    if(isProto)(exports[PROTOTYPE] || (exports[PROTOTYPE] = {}))[key] = out;
  }
};
// type bitmap
$def.F = 1;  // forced
$def.G = 2;  // global
$def.S = 4;  // static
$def.P = 8;  // proto
$def.B = 16; // bind
$def.W = 32; // wrap
module.exports = $def;
},{"./$.core":10,"./$.global":16}],12:[function(require,module,exports){
// 7.2.1 RequireObjectCoercible(argument)
module.exports = function(it){
  if(it == undefined)throw TypeError("Can't call method on  " + it);
  return it;
};
},{}],13:[function(require,module,exports){
// all enumerable object keys, includes symbols
var $ = require('./$');
module.exports = function(it){
  var keys       = $.getKeys(it)
    , getSymbols = $.getSymbols;
  if(getSymbols){
    var symbols = getSymbols(it)
      , isEnum  = $.isEnum
      , i       = 0
      , key;
    while(symbols.length > i)if(isEnum.call(it, key = symbols[i++]))keys.push(key);
  }
  return keys;
};
},{"./$":21}],14:[function(require,module,exports){
module.exports = function(exec){
  try {
    return !!exec();
  } catch(e){
    return true;
  }
};
},{}],15:[function(require,module,exports){
// fallback for IE11 buggy Object.getOwnPropertyNames with iframe and window
var toString  = {}.toString
  , toIObject = require('./$.to-iobject')
  , getNames  = require('./$').getNames;

var windowNames = typeof window == 'object' && Object.getOwnPropertyNames
  ? Object.getOwnPropertyNames(window) : [];

var getWindowNames = function(it){
  try {
    return getNames(it);
  } catch(e){
    return windowNames.slice();
  }
};

module.exports.get = function getOwnPropertyNames(it){
  if(windowNames && toString.call(it) == '[object Window]')return getWindowNames(it);
  return getNames(toIObject(it));
};
},{"./$":21,"./$.to-iobject":30}],16:[function(require,module,exports){
// https://github.com/zloirock/core-js/issues/86#issuecomment-115759028
var UNDEFINED = 'undefined';
var global = module.exports = typeof window != UNDEFINED && window.Math == Math
  ? window : typeof self != UNDEFINED && self.Math == Math ? self : Function('return this')();
if(typeof __g == 'number')__g = global; // eslint-disable-line no-undef
},{}],17:[function(require,module,exports){
var hasOwnProperty = {}.hasOwnProperty;
module.exports = function(it, key){
  return hasOwnProperty.call(it, key);
};
},{}],18:[function(require,module,exports){
var $          = require('./$')
  , createDesc = require('./$.property-desc');
module.exports = require('./$.support-desc') ? function(object, key, value){
  return $.setDesc(object, key, createDesc(1, value));
} : function(object, key, value){
  object[key] = value;
  return object;
};
},{"./$":21,"./$.property-desc":25,"./$.support-desc":28}],19:[function(require,module,exports){
// indexed object, fallback for non-array-like ES3 strings
var cof = require('./$.cof');
module.exports = 0 in Object('z') ? Object : function(it){
  return cof(it) == 'String' ? it.split('') : Object(it);
};
},{"./$.cof":9}],20:[function(require,module,exports){
module.exports = function(it){
  return typeof it === 'object' ? it !== null : typeof it === 'function';
};
},{}],21:[function(require,module,exports){
var $Object = Object;
module.exports = {
  create:     $Object.create,
  getProto:   $Object.getPrototypeOf,
  isEnum:     {}.propertyIsEnumerable,
  getDesc:    $Object.getOwnPropertyDescriptor,
  setDesc:    $Object.defineProperty,
  setDescs:   $Object.defineProperties,
  getKeys:    $Object.keys,
  getNames:   $Object.getOwnPropertyNames,
  getSymbols: $Object.getOwnPropertySymbols,
  each:       [].forEach
};
},{}],22:[function(require,module,exports){
var $         = require('./$')
  , toIObject = require('./$.to-iobject');
module.exports = function(object, el){
  var O      = toIObject(object)
    , keys   = $.getKeys(O)
    , length = keys.length
    , index  = 0
    , key;
  while(length > index)if(O[key = keys[index++]] === el)return key;
};
},{"./$":21,"./$.to-iobject":30}],23:[function(require,module,exports){
module.exports = true;
},{}],24:[function(require,module,exports){
// most Object methods by ES6 should accept primitives
module.exports = function(KEY, exec){
  var $def = require('./$.def')
    , fn   = (require('./$.core').Object || {})[KEY] || Object[KEY]
    , exp  = {};
  exp[KEY] = exec(fn);
  $def($def.S + $def.F * require('./$.fails')(function(){ fn(1); }), 'Object', exp);
};
},{"./$.core":10,"./$.def":11,"./$.fails":14}],25:[function(require,module,exports){
module.exports = function(bitmap, value){
  return {
    enumerable  : !(bitmap & 1),
    configurable: !(bitmap & 2),
    writable    : !(bitmap & 4),
    value       : value
  };
};
},{}],26:[function(require,module,exports){
module.exports = require('./$.hide');
},{"./$.hide":18}],27:[function(require,module,exports){
var global = require('./$.global')
  , SHARED = '__core-js_shared__'
  , store  = global[SHARED] || (global[SHARED] = {});
module.exports = function(key){
  return store[key] || (store[key] = {});
};
},{"./$.global":16}],28:[function(require,module,exports){
// Thank's IE8 for his funny defineProperty
module.exports = !require('./$.fails')(function(){
  return Object.defineProperty({}, 'a', {get: function(){ return 7; }}).a != 7;
});
},{"./$.fails":14}],29:[function(require,module,exports){
var has  = require('./$.has')
  , hide = require('./$.hide')
  , TAG  = require('./$.wks')('toStringTag');

module.exports = function(it, tag, stat){
  if(it && !has(it = stat ? it : it.prototype, TAG))hide(it, TAG, tag);
};
},{"./$.has":17,"./$.hide":18,"./$.wks":33}],30:[function(require,module,exports){
// to indexed object, toObject with fallback for non-array-like ES3 strings
var IObject = require('./$.iobject')
  , defined = require('./$.defined');
module.exports = function(it){
  return IObject(defined(it));
};
},{"./$.defined":12,"./$.iobject":19}],31:[function(require,module,exports){
// 7.1.13 ToObject(argument)
var defined = require('./$.defined');
module.exports = function(it){
  return Object(defined(it));
};
},{"./$.defined":12}],32:[function(require,module,exports){
var id = 0
  , px = Math.random();
module.exports = function(key){
  return 'Symbol('.concat(key === undefined ? '' : key, ')_', (++id + px).toString(36));
};
},{}],33:[function(require,module,exports){
var store  = require('./$.shared')('wks')
  , Symbol = require('./$.global').Symbol;
module.exports = function(name){
  return store[name] || (store[name] =
    Symbol && Symbol[name] || (Symbol || require('./$.uid'))('Symbol.' + name));
};
},{"./$.global":16,"./$.shared":27,"./$.uid":32}],34:[function(require,module,exports){
// 19.1.3.1 Object.assign(target, source)
var $def = require('./$.def');

$def($def.S + $def.F, 'Object', {assign: require('./$.assign')});
},{"./$.assign":8,"./$.def":11}],35:[function(require,module,exports){
// 19.1.2.14 Object.keys(O)
var toObject = require('./$.to-object');

require('./$.object-sap')('keys', function($keys){
  return function keys(it){
    return $keys(toObject(it));
  };
});
},{"./$.object-sap":24,"./$.to-object":31}],36:[function(require,module,exports){
'use strict';
// ECMAScript 6 symbols shim
var $              = require('./$')
  , global         = require('./$.global')
  , has            = require('./$.has')
  , SUPPORT_DESC   = require('./$.support-desc')
  , $def           = require('./$.def')
  , $redef         = require('./$.redef')
  , $fails         = require('./$.fails')
  , shared         = require('./$.shared')
  , setTag         = require('./$.tag')
  , uid            = require('./$.uid')
  , wks            = require('./$.wks')
  , keyOf          = require('./$.keyof')
  , $names         = require('./$.get-names')
  , enumKeys       = require('./$.enum-keys')
  , isObject       = require('./$.is-object')
  , anObject       = require('./$.an-object')
  , toIObject      = require('./$.to-iobject')
  , createDesc     = require('./$.property-desc')
  , getDesc        = $.getDesc
  , setDesc        = $.setDesc
  , _create        = $.create
  , getNames       = $names.get
  , $Symbol        = global.Symbol
  , setter         = false
  , HIDDEN         = wks('_hidden')
  , isEnum         = $.isEnum
  , SymbolRegistry = shared('symbol-registry')
  , AllSymbols     = shared('symbols')
  , useNative      = typeof $Symbol == 'function'
  , ObjectProto    = Object.prototype;

// fallback for old Android, https://code.google.com/p/v8/issues/detail?id=687
var setSymbolDesc = SUPPORT_DESC && $fails(function(){
  return _create(setDesc({}, 'a', {
    get: function(){ return setDesc(this, 'a', {value: 7}).a; }
  })).a != 7;
}) ? function(it, key, D){
  var protoDesc = getDesc(ObjectProto, key);
  if(protoDesc)delete ObjectProto[key];
  setDesc(it, key, D);
  if(protoDesc && it !== ObjectProto)setDesc(ObjectProto, key, protoDesc);
} : setDesc;

var wrap = function(tag){
  var sym = AllSymbols[tag] = _create($Symbol.prototype);
  sym._k = tag;
  SUPPORT_DESC && setter && setSymbolDesc(ObjectProto, tag, {
    configurable: true,
    set: function(value){
      if(has(this, HIDDEN) && has(this[HIDDEN], tag))this[HIDDEN][tag] = false;
      setSymbolDesc(this, tag, createDesc(1, value));
    }
  });
  return sym;
};

var $defineProperty = function defineProperty(it, key, D){
  if(D && has(AllSymbols, key)){
    if(!D.enumerable){
      if(!has(it, HIDDEN))setDesc(it, HIDDEN, createDesc(1, {}));
      it[HIDDEN][key] = true;
    } else {
      if(has(it, HIDDEN) && it[HIDDEN][key])it[HIDDEN][key] = false;
      D = _create(D, {enumerable: createDesc(0, false)});
    } return setSymbolDesc(it, key, D);
  } return setDesc(it, key, D);
};
var $defineProperties = function defineProperties(it, P){
  anObject(it);
  var keys = enumKeys(P = toIObject(P))
    , i    = 0
    , l = keys.length
    , key;
  while(l > i)$defineProperty(it, key = keys[i++], P[key]);
  return it;
};
var $create = function create(it, P){
  return P === undefined ? _create(it) : $defineProperties(_create(it), P);
};
var $propertyIsEnumerable = function propertyIsEnumerable(key){
  var E = isEnum.call(this, key);
  return E || !has(this, key) || !has(AllSymbols, key) || has(this, HIDDEN) && this[HIDDEN][key]
    ? E : true;
};
var $getOwnPropertyDescriptor = function getOwnPropertyDescriptor(it, key){
  var D = getDesc(it = toIObject(it), key);
  if(D && has(AllSymbols, key) && !(has(it, HIDDEN) && it[HIDDEN][key]))D.enumerable = true;
  return D;
};
var $getOwnPropertyNames = function getOwnPropertyNames(it){
  var names  = getNames(toIObject(it))
    , result = []
    , i      = 0
    , key;
  while(names.length > i)if(!has(AllSymbols, key = names[i++]) && key != HIDDEN)result.push(key);
  return result;
};
var $getOwnPropertySymbols = function getOwnPropertySymbols(it){
  var names  = getNames(toIObject(it))
    , result = []
    , i      = 0
    , key;
  while(names.length > i)if(has(AllSymbols, key = names[i++]))result.push(AllSymbols[key]);
  return result;
};

// 19.4.1.1 Symbol([description])
if(!useNative){
  $Symbol = function Symbol(){
    if(this instanceof $Symbol)throw TypeError('Symbol is not a constructor');
    return wrap(uid(arguments[0]));
  };
  $redef($Symbol.prototype, 'toString', function toString(){
    return this._k;
  });

  $.create     = $create;
  $.isEnum     = $propertyIsEnumerable;
  $.getDesc    = $getOwnPropertyDescriptor;
  $.setDesc    = $defineProperty;
  $.setDescs   = $defineProperties;
  $.getNames   = $names.get = $getOwnPropertyNames;
  $.getSymbols = $getOwnPropertySymbols;

  if(SUPPORT_DESC && !require('./$.library')){
    $redef(ObjectProto, 'propertyIsEnumerable', $propertyIsEnumerable, true);
  }
}

// MS Edge converts symbol values to JSON as {}
if(!useNative || $fails(function(){
  return JSON.stringify([$Symbol()]) != '[null]';
}))$redef($Symbol.prototype, 'toJSON', function toJSON(){
  if(useNative && isObject(this))return this;
});

var symbolStatics = {
  // 19.4.2.1 Symbol.for(key)
  'for': function(key){
    return has(SymbolRegistry, key += '')
      ? SymbolRegistry[key]
      : SymbolRegistry[key] = $Symbol(key);
  },
  // 19.4.2.5 Symbol.keyFor(sym)
  keyFor: function keyFor(key){
    return keyOf(SymbolRegistry, key);
  },
  useSetter: function(){ setter = true; },
  useSimple: function(){ setter = false; }
};
// 19.4.2.2 Symbol.hasInstance
// 19.4.2.3 Symbol.isConcatSpreadable
// 19.4.2.4 Symbol.iterator
// 19.4.2.6 Symbol.match
// 19.4.2.8 Symbol.replace
// 19.4.2.9 Symbol.search
// 19.4.2.10 Symbol.species
// 19.4.2.11 Symbol.split
// 19.4.2.12 Symbol.toPrimitive
// 19.4.2.13 Symbol.toStringTag
// 19.4.2.14 Symbol.unscopables
$.each.call((
    'hasInstance,isConcatSpreadable,iterator,match,replace,search,' +
    'species,split,toPrimitive,toStringTag,unscopables'
  ).split(','), function(it){
    var sym = wks(it);
    symbolStatics[it] = useNative ? sym : wrap(sym);
  }
);

setter = true;

$def($def.G + $def.W, {Symbol: $Symbol});

$def($def.S, 'Symbol', symbolStatics);

$def($def.S + $def.F * !useNative, 'Object', {
  // 19.1.2.2 Object.create(O [, Properties])
  create: $create,
  // 19.1.2.4 Object.defineProperty(O, P, Attributes)
  defineProperty: $defineProperty,
  // 19.1.2.3 Object.defineProperties(O, Properties)
  defineProperties: $defineProperties,
  // 19.1.2.6 Object.getOwnPropertyDescriptor(O, P)
  getOwnPropertyDescriptor: $getOwnPropertyDescriptor,
  // 19.1.2.7 Object.getOwnPropertyNames(O)
  getOwnPropertyNames: $getOwnPropertyNames,
  // 19.1.2.8 Object.getOwnPropertySymbols(O)
  getOwnPropertySymbols: $getOwnPropertySymbols
});

// 19.4.3.5 Symbol.prototype[@@toStringTag]
setTag($Symbol, 'Symbol');
// 20.2.1.9 Math[@@toStringTag]
setTag(Math, 'Math', true);
// 24.3.3 JSON[@@toStringTag]
setTag(global.JSON, 'JSON', true);
},{"./$":21,"./$.an-object":7,"./$.def":11,"./$.enum-keys":13,"./$.fails":14,"./$.get-names":15,"./$.global":16,"./$.has":17,"./$.is-object":20,"./$.keyof":22,"./$.library":23,"./$.property-desc":25,"./$.redef":26,"./$.shared":27,"./$.support-desc":28,"./$.tag":29,"./$.to-iobject":30,"./$.uid":32,"./$.wks":33}],37:[function(require,module,exports){
"use strict";

var _Symbol = require("babel-runtime/core-js/symbol")["default"];

var _Object$keys = require("babel-runtime/core-js/object/keys")["default"];

var _Object$assign = require("babel-runtime/core-js/object/assign")["default"];

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.isSignal = isSignal;
exports.flatten = flatten;
exports.join = join;
exports.mergeObject = mergeObject;

var NO_VALUE = _Symbol("NO_VALUE");
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

var NEW_SIGNAL = _Symbol('NEW_SIGNAL');
exports.NEW_SIGNAL = NEW_SIGNAL;
var NONE = _Symbol('NONE');
exports.NONE = NONE;
var STOP = _Symbol('STOP');
exports.STOP = STOP;
var NO_VALUES = [NEW_SIGNAL, NONE, STOP];
exports.NO_VALUES = NO_VALUES;
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
/**
 * Signal is a value over time, this is just a link to next moment in time. And is lazy
 * a -> (() -> Future Signal a) -> Signal a
 * @param  {Any} @value   [description]
 * @param  {Function} @getNext [description]
 * @return {Signal}          [description]
*/
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

/**
 * Create a signal form an array
 * [a...] -> Signal a
 * @param  {Array a} array [a...] | Value of a
 * @return {Signal a}       Signal a
*/
var fromArray = function fromArray(array) {
  return [NEW_SIGNAL].concat(array).reverse().reduce(function (head, arrayValue) {
    var resolveWithHead = function resolveWithHead(resolve) {
      resolve(head);
    };
    var newFuture = new Future(resolveWithHead);
    return SignalFactory(arrayValue, function () {
      return newFuture;
    });
  }, SIGNAL_DEAD);
};

exports.fromArray = fromArray;
/**
 * create a signal from a function that can 'sink' values in
 * Note that this could be a memory leak
 * ((a -> ()) -> ()) -> Signal a
 * @param  {Function} sinkNewValue (a -> ()) -> () | A function to drop a new value
 * @return {Signal}              Signal a
*/
var fastForwardFunction = function fastForwardFunction(sinkNewValue) {
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
  sinkNewValue(function (newValue) {
    return currentResolve(newTail(newValue));
  });
  return answer;
};

exports.fastForwardFunction = fastForwardFunction;
/**
 * create a signal from a function that can 'sink' values in
 * Note that this could be a memory leak
 * ((a -> ()) -> ()) -> CurrentSignal a
 * @param  {Function} sinkNewValue (a -> ()) -> () | A function to drop a new value
 * @return {Signal}              CurrentSignal a | A current signal of a
*/
var fromFunction = function fromFunction(sinkNewValue) {
  return CurrentSignal(fastForwardFunction(sinkNewValue));
};

exports.fromFunction = fromFunction;
/**
 * From Promises
 * Future a -> ... -> Signal a
 * @param  {Future} Futures... [description]
 * @return {Signal}             [description]
*/
var fromPromises = function fromPromises() {
  var sink = undefined;
  var assignSink = function assignSink(newSink) {
    return sink = newSink;
  };
  var answer = fromFunction(assignSink);

  for (var _len = arguments.length, Futures = Array(_len), _key = 0; _key < _len; _key++) {
    Futures[_key] = arguments[_key];
  }

  Futures.forEach(function (Future) {
    return Future.then(sink);
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
  var hasValue = predicateValue && predicateValue.hasOwnProperty('value');
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
var onValue = curry_2(function (onValue, startingSignal) {
  var withNext = function withNext(_x) {
    var _again = true;

    _function: while (_again) {
      var signal = _x;
      values = isValue = nextFuture = nextSignal = undefined;
      _again = false;

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
        _x = nextSignal;
        _again = true;
        continue _function;
      }
      nextFuture.then(withNext);
    }
  };
  withNext(startingSignal);
  return function () {
    onValue = noop;
    withNext = noop;
  };
});

exports.onValue = onValue;
/**
 * [Fold](https://en.wikipedia.org/wiki/Fold_(higher-order_function)) but with a signal, which is potential future
 * (a -> b) -> a -> signal a -> signal b
 * @param  {Function} foldFunction (state -> a -> state) Reduce function
 * @param  {a} initialState a
 * @param  {Signal} signal       Signal a
 * @return {Signal}              Signal state
*/
var foldp = curry_3(function (foldFunction, initialState, signal) {
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
  return SignalFactory(initialState, function () {
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
var map = curry_2(function (mapFunction, signal) {
  return foldp(function (memo, newValue) {
    return mapFunction(newValue);
  })(NEW_SIGNAL)(signal);
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
  return isEnd ? signal : SignalFactory(signal.value, function () {
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
}

/**
 * Filter a signal over time
 * (a -> boolean) -> Signal a -> Signal a
 * @param  {Function} filterFunction Truth means to bring it forward
 * @param  {Signal} signal         Source
 * @return {Signal}                Filtered source
*/
var filter = curry_2(function (filterFunction, signal) {
  return foldp(function (memo, newValue) {
    return !filterFunction(newValue) ? NONE : newValue;
  }, NEW_SIGNAL, signal);
});

exports.filter = filter;
/**
 * { k` = Signal a`, k`` = Signal a``, ..., k^n = a^n} -> Signal { k` = a`, k`` = a``, ..., k^n = a^n}
 * @param  {[type]} objectToMerge [description]
 * @return {[type]}               [description]
*/

function mergeObject(objectToMerge) {
  var keyPairToArraySignals = function keyPairToArraySignals(signal, key) {
    return map(function (a) {
      var answer = {};
      answer[key] = a;
      return answer;
    })(signal);
  };
  var setOfSignals = (_Object$keys(objectToMerge) || []).map(function (key) {
    return keyPairToArraySignals(objectToMerge[key], key);
  });
  var joinedSignal = setOfSignals.slice(1).reduce(function (joinedSignal, additionalSignal) {
    return join(joinedSignal, additionalSignal);
  }, setOfSignals[0]);
  var backToObject = foldp(function (lastAnswer, value) {
    return _Object$assign({}, lastAnswer, value);
  }, {});

  var filterEmpty = filter(function (a) {
    return _Object$keys(a).length;
  });

  return filterEmpty(backToObject(joinedSignal));
}

var getLatest = function getLatest(signalA) {
  return CurrentSignal(signalA);
};

exports.getLatest = getLatest;
/**
 * These are functions that will return a signal that follows the tails, ensuring that the latest is always there.
*/
var mergeObjectLatest = function mergeObjectLatest(a) {
  return getLatest(mergeObject(a));
};
var latest = {
  mergeObject: mergeObjectLatest
};
exports.latest = latest;

},{"babel-runtime/core-js/object/assign":1,"babel-runtime/core-js/object/keys":2,"babel-runtime/core-js/symbol":3}]},{},[37])(37)
});