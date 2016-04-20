
export enum FutureValues {
  NO_VALUE,
  VALUE,
}
export enum SignalActions {
  'NOOP',
  'STOP',
}
export interface SignalValue<A> {
  value: A,
  getNext: () => Future<Signal<A>>,
}
export interface SignalAction<A> {
  signalAction: SignalActions,
  getNext: () => Future<Signal<A>>,
}
export interface CurrentSignalValue<A> extends SignalValue<A> {
  tailSignal: Signal<A>,
}
export interface CurrentSignalAction<A> extends SignalAction<A> {
  tailSignal: Signal<A>,
}
export type Maybe<T> = T | void;
export type Signal<A> =SignalValue<A> | SignalAction<A>;
export const Maybe = {
  isDefined<T>(x: Maybe<T>):x is T{
    return x !== undefined && x !== null;
  }
};

const SignalActionValues = Object.keys(SignalActions).map(key => (<any>SignalActions)[key]);

const isSignalAction = (a: SignalActions | any ): a is SignalActions => {
  if(SignalActionValues.indexOf(a) !== -1){
    return true;
  }
  return false;
};

const isSignalValue = <A>(signal: Signal<A>): signal is SignalValue<A> => {
  if(signal.hasOwnProperty('value')){
    return true;
  }
  return false;
};
const isSignalAnSignalAction = <A>(signal: Signal<A>): signal is SignalAction<A> => {
  if(signal.hasOwnProperty('signalAction')){
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
export const isSignal = <A>(predicateValue: Signal<A> | A):predicateValue is Signal<A> => {
  if(!(predicateValue instanceof Object)){
    return false;
  }
  if(!(predicateValue ? typeof (<any>predicateValue).getNext === 'function' : false)){
    return false;
  }
  if (predicateValue.hasOwnProperty('value')){
    return true;
  }
  else if(isSignalAction((<any>predicateValue).signalAction)){
    return true;
  }
  return false;
}


export class Future <A> {
  onResolveds: ((a:A) => any)[];
  valueType: FutureValues;
  onResolvedPairs: [Function, Function][];
  value: A;
  static of<A>(withUpdate: (sink: (a:A) => void) => void):Future<A>{
    return new Future(withUpdate);
  }
  constructor(withUpdate: (sink: (a:A) => void) => void) {
    this.valueType = FutureValues.NO_VALUE;
    this.onResolveds = [];
    this.onResolvedPairs = [];
    const sinkForFuture = (newValue:A) => {
      if (this.valueType !== FutureValues.NO_VALUE) {
        return;
      }
      this.value = newValue;
      this.valueType = FutureValues.VALUE;
      this.onResolveds.forEach(onResolved => onResolved(newValue));
      this.onResolveds = [];
      this.onResolvedPairs = [];
    };
    withUpdate(sinkForFuture);
  }
  then<B>(onResolved: (a:A) => Future<B> | B ): Future<B>{
    const resolveThenFuture = (thenFutureResolve: (b:B) => void) => {
      const updateFuture = (newValue: A) => {
        const updatedValue = onResolved(newValue);
        if (updatedValue instanceof Future) {
          updatedValue.then(thenFutureResolve);
        } else {
          thenFutureResolve(updatedValue);
        }
      };
      if (this.valueType === FutureValues.VALUE) {
        updateFuture(this.value);
      } else {
        this.onResolvedPairs.push([onResolved,updateFuture])
        this.onResolveds.push(updateFuture);
      }
    };
    return new Future(resolveThenFuture);
  }
  withoutThen<B>(onResolved: Function): void{
    const foundPairs = this.onResolvedPairs.filter(([left]) => left === onResolved);
    foundPairs.forEach((foundPair) => {
      const onResolvedFn = foundPair[1];
      this.onResolvedPairs = this.onResolvedPairs.filter(otherPair => otherPair !== foundPair);
      this.onResolveds = this.onResolveds.filter((thisOnResolved) => thisOnResolved !== onResolvedFn);
    })
  }
}
function CreateResolvedFuture<A>(a:A): Future<A> {
  return new Future<A>(resolve => resolve(a));
}
const noop = ():void => null;
const noopFuture = ():Future<void> => Future.of<void>(() => null);
type Curry_2<A,B,C> = ((a:A) => (b:B) => C)
  | ((a:A, b:B) => C);

function onceThunk<A>(fn: () => A):(() => A){
  let cache: Maybe<A>;
  return () => {
    if(Maybe.isDefined(cache)){
      return cache;
    }
    const newCache = fn();
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
function SignalFactory<A>(value:A, getNext:(() => Future<Signal<A>>), signalAction?: Maybe<SignalActions>):Signal<A> {
  const cachedSignalFactory = onceThunk(getNext);
  if(Maybe.isDefined(signalAction)){
    return {
      signalAction: signalAction,
      getNext: cachedSignalFactory,
    };
  }
  return {
    value,
    getNext:cachedSignalFactory,
  };
}

type CurrentSignal<A> = CurrentSignalValue<A> | CurrentSignalAction<A>
const SIGNAL_DEAD:Signal<any> = SignalFactory(null, () => CreateResolvedFuture(SIGNAL_DEAD), SignalActions.STOP);
function CurrentSignal<A>(tailSignal: Signal<A>):CurrentSignal<A> {
  const me:CurrentSignalAction<A> = {
    tailSignal: tailSignal,
    signalAction: SignalActions.NOOP,
    getNext: () => CreateResolvedFuture(me.tailSignal)
  };
  update(tailSignal);
  return me;

  function update(signal: Signal<A>) {
    if ((signal as SignalAction<A>).signalAction === SignalActions.STOP) {
      return;
    }
    me.tailSignal = signal;
    const next = signal.getNext();
    next.then(nextSignal => update(nextSignal));
  }
}

/**
 * Create a signal form an array
 * [a...] -> Signal a
 * @param  {Array a} array [a...] | Value of a
 * @return {Signal a}       Signal a
*/
export const fromArray = function<A> (array: A[]):Signal<A> {
  const guarenteedArray = [].concat(array);
  return fastForwardFunction(function sinkArray(sink:(a:A, action?:Maybe<SignalActions>) => void) {
    guarenteedArray.forEach(arrayValue => sink(arrayValue));
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
export const fastForwardFunction = function <A> (sinkNewValue:(sink: (a:A, action?:Maybe<SignalActions>) => void) => void):Signal<A> {
  const initValue = SignalActions.NOOP;
  let currentResolve:(input: Signal<A>) => void = noop;
  const newTail = function (value: A, action?:SignalActions) {
    const newFuture = new Future(function (resolve: (input: Signal<A>) => void) {
      currentResolve = resolve;
    });
    return SignalFactory(value, () => newFuture, action);
  };

  const answer = newTail(null, initValue);
  sinkNewValue(function sinkIntoSignal(newValue, action) {
    const isSkipValue = action === SignalActions.NOOP;
    const isStop = action === SignalActions.STOP;
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
export const fromFunction = function <A>(sinkNewValue:(sink:(a:A, action?: Maybe<SignalActions>) => void) => void): CurrentSignal<A> {
  return CurrentSignal(fastForwardFunction(sinkNewValue));
};

/**
 * Mailbox returns a object for the signal and the address, or the sink to drop the new values into.
 * @return {{signal:Signal, address: Function}} The address and the signal to update
 */
export const mailbox = <A> () => {
  let address:(a:A, action?: Maybe<SignalActions>)=> void;
  const signal = fromFunction<A>(sink => address = sink);
  return {
    signal: signal,
    address: address,
  };
};


export interface Thenable <A> {
  then<B>(isGood: (a:A) => Thenable<B> | B): Thenable<B>;
}
/**
 * From Promises
 * Future a -> ... -> Signal a
 * @param  {Future} Futures... [description]
 * @return {Signal}             [description]
*/
export const fromPromises = function<A>(...futures: (Thenable<A> | A)[]):Signal<A> {
  const guarenteedArray: (Thenable<A> | A)[] = [].concat(futures);
  return fastForwardFunction<A>(function sinkArray(sink) {
    guarenteedArray.forEach(arrayValue => arrayValue && typeof (arrayValue as Thenable<A>).then === 'function' ? (arrayValue as Thenable<A>).then(sink) : sink(<A>arrayValue));
    sink(null, SignalActions.STOP);
  });
};

export const onSignalValue = <A>(onValue: (a:SignalValue<A>) => void, signal: Signal<A> | Future<Signal<A>>): (() => void) => {
  let currentSignal: Maybe<Signal<any>>;
  const clear = () => {
    if(Maybe.isDefined(currentSignal)){
      currentSignal.getNext().withoutThen(withNext);
    }
  };
  const withNext = (signal: Signal<A>) => {
    if (isSignalValue(signal)){
      onValue(signal);
      clear();
      return;
    }
    if(isSignalAnSignalAction(signal) && signal.signalAction === SignalActions.STOP){
      clear();
      return;
    }
    currentSignal = signal;
    signal.getNext().then(withNext);
  };
  if (signal instanceof Future) {
    signal.then(withNext);
  }
  else{
    withNext(signal);
  }
  return clear;
};

const onLazySignalValueSignal = <A, B>(onValue: (a:SignalValue<A>) => Signal<B>, signal: (Signal<A> | Future<Signal<A>>), currentValue?: Maybe<B>): Signal<B> => {
  const getNext = onceThunk(
    () => new Future<Signal<B>>(
      sink => onSignalValue<A>(
        (newSignal)=> sink(
          onValue(newSignal)),
          signal))
  );
  if(Maybe.isDefined(currentValue)){
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
export const onValue = <A>(onValueFn:(a:A) => void, startingSignal: Signal<A>): (() => void) => {
  let currentClear: () => void = noop;
  const withNext = (signal: SignalValue<A>):void => {
    onValueFn(signal.value);
    currentClear = onSignalValue<A>(withNext, signal.getNext());
  };
  currentClear = onSignalValue(withNext, startingSignal);
  return () => {
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
export const foldp = <State, A>(foldFunction:(state:State, a:A) => State, initialState: State, signal:Signal<A>):Signal<State> => {
  let state:State = initialState;
  const withNext = (signal:SignalValue<A>): Signal<State> => {
    const newState = foldFunction(state, signal.value);
    state = newState;
    return onLazySignalValueSignal<A, State>(withNext, signal.getNext(), state);
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
export const map = <A,B>(mapFunction:(a:A) => B, signal:Signal<A>):Signal<B> => {
  const withNext = (signal:SignalValue<A>): Signal<B> => {
    const newState = mapFunction(signal.value);
    return onLazySignalValueSignal<A, B>(withNext, signal.getNext(), newState);
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
export const join = <A,B>(signalA: Signal<A>, signalB: Signal<B>): Signal<A|B> => {
  if(isSignalAnSignalAction(signalA) && signalA.signalAction === SignalActions.STOP){
    return signalB;
  }
  const nextSignal = (FutureLeft:Future<Signal<A | B>>, FutureRight:Future<Signal<A | B>>):Future<Signal<A | B>> => {
    const getNextSignal = (otherFuture:Future<Signal<A | B>>, newSignal: Signal<A | B>): Future<Signal<A | B>> => {
      if(isSignalAnSignalAction(newSignal) && newSignal.signalAction === SignalActions.STOP){
        return otherFuture;
      }
      if(isSignalValue(newSignal)){
        return CreateResolvedFuture(SignalFactory(
          newSignal.value,
          () => nextSignal(newSignal.getNext(), otherFuture)
        ));
      }
      return CreateResolvedFuture(SignalFactory(
        null,
        () => nextSignal(newSignal.getNext(), otherFuture),
        (<SignalAction<A | B>>newSignal).signalAction || SignalActions.NOOP
      ));
    }
    const signalOrEnd = (potentialSignal:Signal<A | B> | any):Signal<A | B> => isSignal(potentialSignal) ? potentialSignal : SIGNAL_DEAD;

    const raceFns = function (Futures: (() => Future<Signal<A | B>>)[]): Future<Signal<A | B>> {
      return new Future<Signal<A | B>>(function (resolve) {
        Futures.some((Future) => {
          const future = Future();
          future.then(potentialValue => {
            resolve(potentialValue);
          });
          return future.valueType === FutureValues.VALUE;
        });
      });
    };
    return raceFns([
      () => FutureLeft.then((newSignal) => getNextSignal(FutureRight, newSignal)),
      () => FutureRight.then((newSignal) => getNextSignal(FutureLeft, newSignal))
    ]);
  };
  if (isSignalValue(signalA)){
    return SignalFactory(signalA.value, () => nextSignal(signalA.getNext(), signalB.getNext()));
  }
  return SignalFactory(null, () => nextSignal(signalA.getNext(), signalB.getNext()), SignalActions.NOOP);
};

/**
 * Filter a signal over time
 * (a -> boolean) -> Signal a -> Signal a
 * @param  {Function} filterFunction Truth means to bring it forward
 * @param  {Signal} signal         Source
 * @return {Signal}                Filtered source
*/
export const filter = <A>(filterFunction: (a:A) => boolean, signal: Signal<A>): Signal<A> =>{
  const withNext = (signal:SignalValue<A>): Signal<A> => {
    const isFilteredIn = filterFunction(signal.value);
    if(isFilteredIn){
      return onLazySignalValueSignal<A, A>(withNext, signal.getNext(), signal.value);
    }
    return onLazySignalValueSignal<A, A>(withNext, signal.getNext());
  };
  return onLazySignalValueSignal(withNext, signal);
};

export const flatten = <A>(signal: Signal<Signal<A> | A>): Signal<A> => {
  const withNext = (signal:SignalValue<A>): Signal<A> => {
    if(isSignal<A>(signal.value)){
      const leftHandSide = <any>signal.value;
      const rightHandSide = SignalFactory(null, () => signal.getNext(), SignalActions.NOOP);
      return flatten(<Signal<A>>join(<Signal<A>>leftHandSide, rightHandSide));
    }
    return onLazySignalValueSignal<A, A>(withNext, signal.getNext(), signal.value);
  };
  return onLazySignalValueSignal(withNext, signal);
};

/**
 * { k` = Signal a`, k`` = Signal a``, ..., k^n = a^n} -> Signal { k` = a`, k`` = a``, ..., k^n = a^n}
 * @param  {[type]} objectToMerge [description]
 * @return {[type]}               [description]
*/
export const mergeObject = <A>(objectToMerge: {[key: string]: Signal<A>}): Signal<{[key:string]: A}> => {
  const keyPairToArraySignals = (signal:Signal<A>, key:string): Signal<[string, A]> => map((a: A):[string, A] => {
    return [key, a];
  }, signal);
  const setOfSignals = (Object.keys(objectToMerge) || []).map((key) => keyPairToArraySignals(objectToMerge[key], key));
  const joinedSignal = setOfSignals.slice(1).reduce((joinedSignal, additionalSignal) => join(joinedSignal, additionalSignal), setOfSignals[0]);
  const backToObject = (signal:Signal<[string, A]>) => foldp((lastAnswer:{[key:string]: A}, value:[string, A]) => {
    const newAnswer = Object.keys(lastAnswer).reduce((answer, key) => {
      (<any>answer)[key] = (<any>lastAnswer)[key];
      return answer;
    }, {});
    (<any>newAnswer)[value[0]] = (<any>value)[1];
    return newAnswer;
  }, {}, signal);

  const filterEmpty = filter(a => Object.keys(a).length > 0, backToObject(joinedSignal));

  return <Signal<any>>filterEmpty;
};

/**
 * { k` = Signal a`, k`` = Signal a``, ..., k^n = a^n} -> Signal { k` = a`, k`` = a``, ..., k^n = a^n}
 * Uses an and change
 * @param  {Object} objectToMerge [description]
 * @return {Signal}               [description]
 */
export const mergeObjectAnd = <A>(objectToMerge:{[key:string]: Signal<A>}): Signal<{[k:string]:A}> => {
  const mergedSignal = mergeObject(objectToMerge);
  const previousAndNext = foldp(
    (pair:[{[k:string]:A},{[k:string]:A}], next:{[k:string]:A}) => {
      const last:{[k:string]:A} = pair[1];
      return [last, next];
    },
    [{}, {}],
    mergedSignal
  );
  const filteredPreviousAndNext = filter(
    ([previous, next]) => {
      if(Object.keys(next).length !== Object.keys(objectToMerge).length){
        return false;
      }
      if((Object.keys(next) || []).every((newKey) => (<any>next)[newKey] !== (<any>previous)[newKey])){
        return false;
      }
      return true;
    },
    previousAndNext
  );
  return map(
    ([previous, next]:[{[k:string]:A},{[k:string]:A}]) => next,
    filteredPreviousAndNext
  );
};

export const getLatest = <A>(signalA:Signal<A>):CurrentSignal<A> => CurrentSignal(signalA);

/**
 * These are functions that will return a signal that follows the tails, ensuring that the latest is always there.
*/
const mergeObjectLatest = <A>(a:{[k:string]:Signal<A>}):Signal<{[k:string]:A}> => {
  return getLatest(mergeObject(a));
};
export const latest = {
  mergeObject: mergeObjectLatest
};
