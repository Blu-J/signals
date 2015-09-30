/* @flow */
export var NEW_SIGNAL: SignalMessages = Symbol ('NEW_SIGNAL');
export var NONE: SignalMessages = Symbol ('NONE');
export var STOP: SignalMessages = Symbol ('STOP');
export var NO_VALUES: SignalMessages = [NEW_SIGNAL, NONE, STOP];
var noop = () => null;
type SignalMessages = any;
type SignalType<A: any> = {value: A | SignalMessages , getNext: () => Promise<Signal<A>>};
/**
 * Signal is a value over time, this is just a link to next moment in time. And is lazy
 * a -> (() -> Promise Signal a) -> Signal a
 * @param  {Any} @value   [description]
 * @param  {Function} @getNext [description]
 * @return {Signal}          [description]
*/
function Signal<A:any>(value: A, getNext: () => Promise<Signal<A>>): SignalType<A>  {
  return {
    value,
    getNext
  };
}

const SIGNAL_DEAD: Signal = Signal (STOP, _.noop);
function CurrentSignal (tailSignal) {
  const me = {};
  me.tailSignal = tailSignal;
  me.value = NEW_SIGNAL;
  update(tailSignal);
  me.getNext = () => Promise.resolve (me.tailSignal);
  return me;


  function update (signal) {
    if(signal.value === STOP || !signal.getNext){
      return;
    }
    me.tailSignal = signal;
    const next = signal.getNext();
    if (next){
      next.then ((nextSignal) => update (nextSignal));
    }
  }
}




/**
 * Create a signal form an array
 * [a...] -> Signal a
 * @param  {Array a} array [a...] | Value of a
 * @return {Signal a}       Signal a
*/
export const fromArray = function (array) {
  return _([NEW_SIGNAL].concat(array))
  .reverse()
  .reduce (function (head, arrayValue) {
    const newPromise = new Promise((resolve) => resolve (head));
    return Signal (arrayValue, () => newPromise);
  }, SIGNAL_DEAD)
  .valueOf();
};

/**
 * create a signal from a function that can 'sink' values in
 * Note that this could be a memory leak
 * ((a -> ()) -> ()) -> Signal a
 * @param  {Function} sinkNewValue (a -> ()) -> () | A function to drop a new value
 * @return {Signal}              Signal a
*/
export const fastForwardFunction = function (sinkNewValue){
  const initValue = NEW_SIGNAL;
  let currentResolve = _.noop;
  const newTail = function (value) {
    const newPromise = new Promise (function(resolve) {
      currentResolve = resolve;
    });
    return Signal (value, () => newPromise);
  };

  const answer = newTail (initValue);
  sinkNewValue ((newValue) => currentResolve (newTail (newValue)));
  return answer;
};

/**
 * create a signal from a function that can 'sink' values in
 * Note that this could be a memory leak
 * ((a -> ()) -> ()) -> CurrentSignal a
 * @param  {Function} sinkNewValue (a -> ()) -> () | A function to drop a new value
 * @return {Signal}              CurrentSignal a | A current signal of a
*/
export const fromFunction = function (sinkNewValue){
  return CurrentSignal(fastForwardFunction(sinkNewValue));
};




/**
 * From Promises
 * Promise a -> ... -> Signal a
 * @param  {Promise} promises... [description]
 * @return {Signal}             [description]
*/
export const fromPromises = function(...promises) {
  let sink = null;
  const answer = fromFunction ((newSink) => sink = newSink);
  _.each(promises,(promise) => promise.then (sink));
  return answer;
};

/**
 * Determines is value is a signal
 * a -> Booelan
 * @param  {[type]} predicateValue [description]
 * @return {[type]}                [description]
*/
export function isSignal (predicateValue) {
  const hasValue = predicateValue && predicateValue.hasOwnProperty('value');
  const hasGetNext = predicateValue ? typeof predicateValue.getNext === 'function' : false;
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
export const onValue = _.curry (function (onValue, startingSignal) {
  let withNext = function (signal) {
    const values = [].concat(signal.value);
    const isValue =  _.every (values, function(value){
      return !_.find([NONE, NEW_SIGNAL], value);
    });
    if (signal.value == STOP){
      return;
    }
    if (isValue){
      onValue (signal.value);
    }
    signal.getNext().then (withNext);
  };
  withNext(startingSignal);
  return function () {
    onValue = _.noop;
    withNext = _.noop;
  };
});

/**
 * [Fold](https://en.wikipedia.org/wiki/Fold_(higher-order_function)) but with a signal, which is potential future
 * (a -> b) -> a -> signal a -> signal b
 * @param  {Function} foldFunction (state -> a -> state) Reduce function
 * @param  {a} initialState a
 * @param  {Signal} signal       Signal a
 * @return {Sginal}              Signal state
*/
export const foldp = _.curry (function (foldFunction, initialState, signal){
  //TODO
  const untilNext = function (nextSignal){
    const isSkipValue = nextSignal.value === NEW_SIGNAL || nextSignal.value === NONE;
    const isStop = nextSignal.value === STOP;
    if (isStop){
      return nextSignal;
    }
    if (isSkipValue) {
      return nextSignal.getNext().then(untilNext);
    }
    const nextValue = foldFunction (initialState, nextSignal.value);
    const shouldSkip = nextValue === NONE;
    const shouldStop = nextValue === STOP;
    return shouldSkip ?
      nextSignal.getNext().then(untilNext) :
      shouldStop ?
      SIGNAL_DEAD :
      foldp (foldFunction, nextValue, nextSignal);
  };
  return Signal (initialState, () => signal.getNext().then(untilNext));
});

/**
 * Map a function across the signal
 * (a -> b) -> Signal a -> Signal b
 * @param  {Function} mapFunction (a -> b) | map domain to codomain
 * @param  {Signal} signal      Signal a | Signal of domain
 * @return {Signal}             Signal b | Signal of codomain
*/
export const map = _.curry ((mapFunction, signal) =>
  foldp ((memo, newValue) => mapFunction (newValue), null, signal));


/**
 * Flatten a signal of signals into a single signal
 * Signal (Signal a | a) -> Signal a
 * @param  {[type]} signal [description]
 * @return {[type]}        [description]
*/
export function flatten (signal){
  const withNext = (nextSignal) =>
    flatten ( isSignal (nextSignal.value) ?
              join (nextSignal.value, nextSignal) :
              nextSignal);

  const isEnd = !signal || signal.value == STOP;
  return isEnd ?
    signal :
    Signal (signal.value, () =>
      signal.getNext().then(withNext));
}

/**
 * Join two signals into one, dies when both die.
 * Signal a -> Signal b -> Signal (a | b)
 * @param  {Signal} signalA [description]
 * @param  {Signal} signalB [description]
 * @return {Signal}         [description]
 */
export function join (signalA, signalB){
  if (!signalA || signalA.value == STOP){
    return signalB;
  }
  const nextSignal = function (promiseLeft, promiseRight) {
    const getNextSignal = (otherPromise) => (newSignal) =>
      !newSignal || newSignal.value === STOP ?
        otherPromise :
        Signal (newSignal.value, () =>
          nextSignal (newSignal.getNext(), otherPromise));

    return Promise.race ([
      promiseLeft.then (getNextSignal (promiseRight)),
      promiseRight.then (getNextSignal (promiseLeft))
    ]);
  };
  return Signal (signalA.value, () =>
    nextSignal (signalA.getNext(), signalB.getNext()));
}

/**
 * Filter a signal over time
 * (a -> boolean) -> Signal a -> Signal a
 * @param  {Function} filterFunction Truth means to bring it forward
 * @param  {Signal} signal         Source
 * @return {Signal}                Filtered source
*/
export var filter = _.curry((filterFunction, signal) =>
  foldp ((memo, newValue) => (!filterFunction (newValue) ? NONE : newValue), null, signal));


/**
 * Broadcast any time any Signal updates
 * (Signal a) -> ... -> Signal (List a)
 * @param  {Signal[]} other.. Other Streams
 * @return {Signal}                 Signal of [streamValues...]
*/
export function mergeOr (...otherSignals) {
  const allValues = _.map(otherSignals, _.property('value'));
  return Signal (allValues, function(){
    const newPromises = _.map(otherSignals, (oldSignal) =>
      oldSignal.getNext().then (function (newSignal) {
        const nextSignals = _.map (otherSignals, (otherSignal) =>
          otherSignal !== oldSignal ?
            otherSignal :
            newSignal);
        return mergeOr (...nextSignals);
      }));
    return Promise.race (newPromises);
  });
}

/**
 * Emit only when all signals have updated
 * Signal a -> ... -> Signal (List a)
 * @param  {Signal []} other.. [description]
 * @return {Signal}                 [description]
*/
export function mergeAnd (...otherSignals) {
  const allValues = _.map (otherSignals, _.property ('value'));
  const otherGetNexts = _.map (otherSignals, _.property ('getNext'));
  const allNew = _.every( allValues, (value) => value === NEW_SIGNAL);
  const maybeNewAllValues =  allNew ?
    NEW_SIGNAL :
    allValues;

  return Signal (allValues, function(){
    const otherNexts = _.map (otherGetNexts, (getNext) => getNext());
    return Promise.all (otherNexts)
      .then ((allNextValues) =>
        mergeAnd (...allNextValues));
  });
}
/**
 * { k` = Signal a`, k`` = Signal a``, ..., k^n = a^n} -> Signal { k` = a`, k`` = a``, ..., k^n = a^n}
 * @param  {[type]} objectToMerge [description]
 * @return {[type]}               [description]
*/
export function mergeObject (objectToMerge) {
  const setOfSignals = _.map (objectToMerge, (signal, key) =>
    map (function (a) {
      let answer = {};
      answer[key] = a;
      return answer;
    }, signal));
  const joinedSignal = _.reduce( _.rest(setOfSignals), (joinedSignal,additionalSignal) =>
    join(joinedSignal, additionalSignal),
    _.first(setOfSignals));
  const backToObject = foldp ((lastAnswer,value) =>
      _.extend ({},lastAnswer, value),
    {});

  const filterEmpty = filter ((a) => !_.isEmpty(a));

  return filterEmpty (backToObject (joinedSignal));
}


export const getLatest = (signalA) => CurrentSignal (signalA);

/**
 * These are functions that will return a signal that follows the tails, ensuring that the latest is always there.
*/
export const latest ={
  mergeObject:  _.compose (getLatest, mergeObject),
  mergeAnd:  _.compose (getLatest, mergeAnd),
  mergeOr:  _.compose (getLatest, mergeOr),
};
