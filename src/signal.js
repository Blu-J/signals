/* @flow */
type curry3<A,B,C,D> = (func:(a:A,b:B,c:C) => D) => (((a:A) => (b:B) => (c:C) => D) | ((a:A) => (b:B,c:C) => D) | (a:A,b:B,c:C) => D);
type curry2<A,B,C> = (func:(a:A,b:B) => C) => (((a:A) => (b:B) => C) | (a:A,b:B) => C);
type Signal<A> =
{
  value:(A | Symbol);
  getNext: () => Future<any>;
};

const NO_VALUE = Symbol("NO_VALUE");
const Future = function<A>(withUpdate:(sink:(a:A)=>any)=>any){
  let onResolveds = [];
  let value = NO_VALUE;
  this.then = function(onResolved){
    return new Future (function resolveThenFuture(thenFutureResolve){
      const updateFuture = function getResolvedAndPassOn(newValue){
        const updatedValue = onResolved(newValue);
        if(updatedValue && typeof updatedValue.then === "function" ){
          updatedValue.then(thenFutureResolve)
        }
        else{
          thenFutureResolve(updatedValue);
        }
      };
      if(value !== NO_VALUE){
        updateFuture(value);
      }
      else{
        onResolveds.push(updateFuture);
      }
    });
  };
  withUpdate (function sinkForFuture(newValue){
    if(value !== NO_VALUE){
      return;
    }
    value = newValue;
    onResolveds.forEach((onResolved) => onResolved(newValue));
    onResolveds = [];
  });

};

export const NEW_SIGNAL = Symbol ('NEW_SIGNAL');
export const NONE = Symbol ('NONE');
export const STOP = Symbol ('STOP');
export const NO_VALUES: Array<Symbol> = [NEW_SIGNAL, NONE, STOP];
function CreateResolvedFuture<A>(a:A):Future<A> {
  return new Future((resolve) => resolve(a));
}
const noop: Function = ()=>null;
const curry_2: curry2 = function(fn){
  return (a,b) =>
   arguments.length >= 2 ? fn(a,b) :
     (b) => fn(a,b);
};
const curry_3: curry3 = function (fn) {
  return function(a,b,c){
    return arguments.length >= 3 ? fn(a,b,c) :
      arguments.length >= 2 ? (c) => fn(a,b,c) :
      function(b,c) {
        return arguments.length >= 2 ? fn (a,b,c) :
        (c) => fn(a,b,c)
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
function SignalFactory<A>(value: A, getNext: () => Future<Signal<A>>):Signal<A>{
  return {
    value,
    getNext
  };
}

const SIGNAL_DEAD: Signal = SignalFactory (STOP, noop);
function CurrentSignal<A>(tailSignal: Signal<A>):Signal<A> {
  const me = {};
  me.tailSignal = tailSignal;
  me.value = NEW_SIGNAL;
  update(tailSignal);
  me.getNext = () => CreateResolvedFuture (me.tailSignal);
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
export const fromArray = function<A> (array : Array<A>): Signal<A> {
  const guarenteedArray = [].concat(array);
  return fastForwardFunction(function sinkArray(sink) {
    guarenteedArray.forEach((arrayValue) => sink(arrayValue));
    sink(STOP);
  });
};

/**
 * create a signal from a function that can 'sink' values in
 * Note that this could be a memory leak
 * ((a -> ()) -> ()) -> Signal a
 * @param  {Function} sinkNewValue (a -> ()) -> () | A function to drop a new value
 * @return {Signal}              Signal a
*/
export const fastForwardFunction = function <A>(sinkNewValue: (sink:(a:A) => any) => any) : Signal<A>{
  const initValue = NEW_SIGNAL;
  let currentResolve:Function = noop;
  const newTail = function (value) {
    const newFuture = new Future (function(resolve: (newSignal:Signal)=> void) {
      currentResolve = resolve;
    });
    return SignalFactory (value, () => newFuture);
  };

  const answer = newTail (initValue);
  sinkNewValue (function sinkIntoSignal(newValue) {
    const isSkipValue = newValue === NEW_SIGNAL || newValue === NONE;
    const isStop = newValue === STOP;
    if (isStop){

      return currentResolve(SIGNAL_DEAD);
    }
    if (isSkipValue) {
      return;
    }
    return currentResolve (newTail (newValue));
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
export const fromFunction = function <A>(sinkNewValue: (sink:(a:A)=>any) => any) : Signal<A>{
  return CurrentSignal(fastForwardFunction(sinkNewValue));
};




/**
 * From Promises
 * Future a -> ... -> Signal a
 * @param  {Future} Futures... [description]
 * @return {Signal}             [description]
*/
export const fromPromises = function<A>(...Futures : Array<Future<A>>): Signal<A> {
  const guarenteedArray = [].concat(array);
  return fastForwardFunction(function sinkArray(sink) {
    guarenteedArray.forEach((arrayValue) => arrayValue && typeof arrayValue.then === 'function' ? arrayValue.then(sink) : sink(arrayValue));
    sink(STOP);
  });
};

/**
 * Determines is value is a signal
 * a -> Booelan
 * @param  {[type]} predicateValue [description]
 * @return {[type]}                [description]
*/
export function isSignal (predicateValue: Signal | any): boolean {
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
export const onValue = curry_2(function(onValue, startingSignal) {
  let withNext = function withNext (signal) {
    const values = [].concat(signal.value);
    const isValue =  values.every(function(value){
      return NONE !== value && NEW_SIGNAL !== value;
    });
    if (signal.value == STOP){
      return;
    }
    if (isValue){
      onValue (signal.value);
    }
    const nextFuture = signal.getNext();
    let nextSignal;
    nextFuture.then((a) => nextSignal = a);
    if (nextSignal){
      return withNext(nextSignal);
    }
    nextFuture.then (withNext);
  };
  withNext(startingSignal);
  return function () {
    onValue = noop;
    withNext = noop;
  };
});

/**
 * [Fold](https://en.wikipedia.org/wiki/Fold_(higher-order_function)) but with a signal, which is potential future
 * (a -> b) -> a -> signal a -> signal b
 * @param  {Function} foldFunction (state -> a -> state) Reduce function
 * @param  {a} initialState a
 * @param  {Signal} signal       Signal a
 * @return {Signal}              Signal state
*/
export const foldp = curry_3(function <A,B>(foldFunction: (b:B,a:A)=>B , initialState: B, signal: Signal<A>): Signal<B>{
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
  return SignalFactory (initialState, () => signal.getNext().then(untilNext));
});

/**
 * Map a function across the signal
 * (a -> b) -> Signal a -> Signal b
 * @param  {Function} mapFunction (a -> b) | map domain to codomain
 * @param  {Signal} signal      Signal a | Signal of domain
 * @return {Signal}             Signal b | Signal of codomain
*/
export const map = curry_2(function<A,B>(mapFunction:(a:A)=>B, signal:Signal<A>):Signal<B> {
  return foldp ((memo, newValue) => mapFunction (newValue))(NEW_SIGNAL)(signal);
});


/**
 * Flatten a signal of signals into a single signal
 * Signal (Signal a | a) -> Signal a
 * @param  {[type]} signal [description]
 * @return {[type]}        [description]
*/

export function flatten<A> (signal: Signal<(Signal<A> | A)>):Signal<A>{
  const withNext = (nextSignal) =>
    flatten ( isSignal (nextSignal.value) ?
              join (nextSignal.value, nextSignal) :
              nextSignal);

  const isEnd = !signal || signal.value == STOP;
  return isEnd ?
    signal :
    SignalFactory (signal.value, () =>
      signal.getNext().then(withNext));
}

/**
 * Join two signals into one, dies when both die.
 * Signal a -> Signal b -> Signal (a | b)
 * @param  {Signal} signalA [description]
 * @param  {Signal} signalB [description]
 * @return {Signal}         [description]
 */
export function join <A>(signalA:Signal<A>, signalB:Signal<A>): Signal<A>{
  if (!signalA || signalA.value == STOP){
    return signalB;
  }
  const nextSignal: (left: Future<Signal<A>>,right:Future<Signal<A>>) => Future<Signal<A>> = function (FutureLeft, FutureRight):Future {
    const getNextSignal = (otherFuture) => (newSignal) =>
      !newSignal || newSignal.value === STOP ?
        otherFuture :
        SignalFactory (newSignal.value, () =>
          nextSignal (newSignal.getNext(), otherFuture));
    const signalOrEnd:(a:any) => Signal = (potentialSignal) =>
      isSignal(potentialSignal) ? potentialSignal : SIGNAL_DEAD;

    const race = function(Futures):Future {
      return new Future(function(resolve){
        Futures.forEach((Future) => Future.then((potentialValue)=>resolve(potentialValue)))
      });
    };
    return race([
      FutureLeft.then (getNextSignal (FutureRight)),
      FutureRight.then (getNextSignal (FutureLeft))
    ]);
  };
  return SignalFactory (signalA.value, () =>
    nextSignal (signalA.getNext(), signalB.getNext()));
}

/**
 * Filter a signal over time
 * (a -> boolean) -> Signal a -> Signal a
 * @param  {Function} filterFunction Truth means to bring it forward
 * @param  {Signal} signal         Source
 * @return {Signal}                Filtered source
*/
export var filter = curry_2(function<A,B>(filterFunction:(a:A)=>boolean, signal:Signal<A>):Signal<A> {
  return foldp ((memo, newValue) => (!filterFunction (newValue) ? NONE : newValue), NEW_SIGNAL, signal);
});

/**
 * { k` = Signal a`, k`` = Signal a``, ..., k^n = a^n} -> Signal { k` = a`, k`` = a``, ..., k^n = a^n}
 * @param  {[type]} objectToMerge [description]
 * @return {[type]}               [description]
*/
export function mergeObject <A>(objectToMerge: {[key:string]:Signal<A>}):Signal<A> {
  const keyPairToArraySignals = (signal:Signal, key:string) =>
    map (function (a) {
      return {[key]: a};
    })(signal)
  const setOfSignals: Array<Signal> = (Object.keys(objectToMerge) || [])
  .map((key)=>
    keyPairToArraySignals(objectToMerge[key],key));
  const joinedSignal = (setOfSignals.slice(1)).reduce((joinedSignal,additionalSignal) =>
    join(joinedSignal, additionalSignal),
    setOfSignals[0]);
  const backToObject = foldp ((lastAnswer,value) =>
      Object.assign({},lastAnswer, value),
    {});

  const filterEmpty = filter ((a) => Object.keys(a).length);

  return filterEmpty (backToObject (joinedSignal));
}


export const getLatest = (signalA:Signal):Signal => CurrentSignal (signalA) ;

/**
 * These are functions that will return a signal that follows the tails, ensuring that the latest is always there.
*/
const mergeObjectLatest = function<A>(a:{[key:string]:Signal<A>}):Signal<A>{
  return getLatest(mergeObject(a));
};
export const latest ={
  mergeObject:  mergeObjectLatest,
};
