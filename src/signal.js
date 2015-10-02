/* @flow */
type curry3<A,B,C,D> = (func:(a:A,b:B,c:C) => D, arity?:number) => (((a:A) => (b:B) => (c:C) => D) | ((a:A) => (b:B,c:C) => D) | (a:A,b:B,c:C) => D);
declare class LoDashWrapped<A> {
  map<B>(fn:(a:A) => B): LoDashWrapped<B>;
  valueOf(): A;
  reduce<B>(fn: (b:B,a:A) => B, initial:B): LoDashWrapped<B>;
  reverse(): LoDashWrapped<A>;
}

declare class LoDashObj {
  chain<A>(a:Array<A>): LoDashWrapped<A>;
  compose<A>(_:any) : Function;
  curry:curry3;
  each<A>(values:Array<A>,onEach:(a:A)=>any): void;
  every<A>(values:Array<A>, predicateTest:(a:A) => boolean): boolean;
  extend(...objects:Array<Object>):Object;
  first<A>(values:Array<A>):A;
  find<A>(values:Array<A>, haveFound:(a:A) => boolean): A;
  isEmpty(object:Object):boolean;
  map<A,B>(values:Array<A>, mapFunction: (a:A,index?:number) => B): Array<B>;
  map<A,B>(valueObject:{[key:string]: A}, mapFunction: Function): Array<B>;
  noop():void;
  property(a:string):(obj:any)=>any;
  reduce<A,B>(values: Array<A>,fn: (b:B,a:A) => B, initial:B): Array<B>;
  rest<A>(values:Array<A>):Array<A>;
}
declare var _: LoDashObj;


export const NEW_SIGNAL = Symbol ('NEW_SIGNAL');
export const NONE = Symbol ('NONE');
export const STOP = Symbol ('STOP');
export const NO_VALUES: Array<Symbol> = [NEW_SIGNAL, NONE, STOP];
function CreateResolvedPromise<A>(a:A):Promise<A> {
  return new Promise((resolve) => resolve(a));
}
const noop: Function = _.noop;
/**
 * Signal is a value over time, this is just a link to next moment in time. And is lazy
 * a -> (() -> Promise Signal a) -> Signal a
 * @param  {Any} @value   [description]
 * @param  {Function} @getNext [description]
 * @return {Signal}          [description]
*/
function Signal<A:any>(value: A, getNext: () => Promise<Signal<A>>):Signal{
  return {
    value,
    getNext
  };
}

const SIGNAL_DEAD: Signal = Signal (STOP, noop);
function CurrentSignal<A>(tailSignal: Signal<A>):Signal<A> {
  const me = {};
  me.tailSignal = tailSignal;
  me.value = NEW_SIGNAL;
  update(tailSignal);
  me.getNext = () => CreateResolvedPromise (me.tailSignal);
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
export const fromArray = function<A:any> (array : Array<A>): Signal<A> {
  return _.chain([NEW_SIGNAL].concat(array))
  .reverse()
  .reduce (function (head, arrayValue) {
    const resolveWithHead = function(resolve) {
      resolve(head)
    };
    const newPromise = new Promise(resolveWithHead);
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
export const fastForwardFunction = function <A>(sinkNewValue: (sink:(a:A) => any) => any) : Signal<A>{
  const initValue = NEW_SIGNAL;
  let currentResolve:Function = _.noop;
  const newTail = function (value) {
    const newPromise = new Promise (function(resolve: (newSignal:Signal)=> void) {
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
export const fromFunction = function <A>(sinkNewValue: (sink:(a:A)=>any) => any) : Signal<A>{
  return CurrentSignal(fastForwardFunction(sinkNewValue));
};




/**
 * From Promises
 * Promise a -> ... -> Signal a
 * @param  {Promise} promises... [description]
 * @return {Signal}             [description]
*/
export const fromPromises = function<A>(...promises : Array<Promise<A>>): Signal<A> {
  let sink;
  const assignSink = (newSink) => sink = newSink;
  const answer: Signal<A> = fromFunction(assignSink);
  _.each(promises,(promise: Promise) => promise.then(sink));
  return answer;
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
export const foldp = _.curry(function <A,B>(foldFunction: (b:B,a:A)=>B , initialState: B, signal: Signal<A>): Signal<B>{
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

export function flatten<A> (signal: Signal<(Signal<A> | A)>):Signal<A>{
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
export function join <A,B>(signalA:Signal<A>, signalB:Signal<B>): Signal<A|B>{
  if (!signalA || signalA.value == STOP){
    return signalB;
  }
  const nextSignal: <A>(left: Promise<Signal<A>>,right:Promise<Signal<A>>) => Promise<Signal<A>> = function (promiseLeft, promiseRight):Signal {
    const getNextSignal = (otherPromise) => (newSignal) =>
      !newSignal || newSignal.value === STOP ?
        otherPromise :
        Signal (newSignal.value, () =>
          nextSignal (newSignal.getNext(), otherPromise));
    const race = (promises) =>
      new Promise((resolve) =>
        _.each(promises, (promise) => promise.then(resolve)));
    return race([
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
export function mergeOr <A>(...otherSignals: Array<Signal<A>>):Signal<A> {
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
export function mergeAnd (...otherSignals : Array<Signal>) : Signal {
  const allValues = _.map (otherSignals, _.property ('value'));
  const otherGetNexts:Array<()=>Promise<Signal>> = _.map (otherSignals, _.property ('getNext'));
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
export function mergeObject <A>(objectToMerge: {[key:string]:Signal<A>}):Signal<A> {
  const keyPairToArraySignals = (signal:Signal, key:string) =>
    map (function (a) {
      let answer = {};
      answer[key] = a;
      return answer;
    }, signal)
  const setOfSignals: Array<Signal> = _.map (objectToMerge, keyPairToArraySignals);
  const joinedSignal = _.reduce( _.rest(setOfSignals), (joinedSignal,additionalSignal) =>
    join(joinedSignal, additionalSignal),
    _.first(setOfSignals));
  const backToObject = foldp ((lastAnswer,value) =>
      _.extend ({},lastAnswer, value),
    {});

  const filterEmpty = filter ((a) => !_.isEmpty(a));

  return filterEmpty (backToObject (joinedSignal));
}


export const getLatest = (signalA:Signal):Signal => CurrentSignal (signalA) ;

/**
 * These are functions that will return a signal that follows the tails, ensuring that the latest is always there.
*/
export const latest ={
  mergeObject:  _.compose (getLatest, mergeObject),
  mergeAnd:  _.compose (getLatest, mergeAnd),
  mergeOr:  _.compose (getLatest, mergeOr),
};
