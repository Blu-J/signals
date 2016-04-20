export declare enum FutureValues {
    NO_VALUE = 0,
    VALUE = 1,
}
export declare enum SignalActions {
    'NOOP' = 0,
    'STOP' = 1,
}
export interface SignalValue<A> {
    value: A;
    getNext: () => Future<Signal<A>>;
}
export interface SignalAction<A> {
    signalAction: SignalActions;
    getNext: () => Future<Signal<A>>;
}
export interface CurrentSignalValue<A> extends SignalValue<A> {
    tailSignal: Signal<A>;
}
export interface CurrentSignalAction<A> extends SignalAction<A> {
    tailSignal: Signal<A>;
}
export declare type Maybe<T> = T | void;
export declare type Signal<A> = SignalValue<A> | SignalAction<A>;
export declare const Maybe: {
    isDefined<T>(x: T | void): x is T;
};
/**
 * Determines is value is a signal
 * a -> Booelan
 * @param  {[type]} predicateValue [description]
 * @return {[type]}                [description]
*/
export declare const isSignal: <A>(predicateValue: SignalValue<A> | SignalAction<A> | A) => predicateValue is SignalValue<A> | SignalAction<A>;
export declare class Future<A> {
    onResolveds: ((a: A) => any)[];
    valueType: FutureValues;
    onResolvedPairs: [Function, Function][];
    value: A;
    static of<A>(withUpdate: (sink: (a: A) => void) => void): Future<A>;
    constructor(withUpdate: (sink: (a: A) => void) => void);
    then<B>(onResolved: (a: A) => Future<B> | B): Future<B>;
    withoutThen<B>(onResolved: Function): void;
}
/**
 * Create a signal form an array
 * [a...] -> Signal a
 * @param  {Array a} array [a...] | Value of a
 * @return {Signal a}       Signal a
*/
export declare const fromArray: <A>(array: A[]) => SignalValue<A> | SignalAction<A>;
/**
 * create a signal from a function that can 'sink' values in
 * Note that this could be a memory leak
 * ((a -> ()) -> ()) -> Signal a
 * @param  {Function} sinkNewValue (a -> ()) -> () | A function to drop a new value
 * @return {Signal}              Signal a
*/
export declare const fastForwardFunction: <A>(sinkNewValue: (sink: (a: A, action?: SignalActions | void) => void) => void) => SignalValue<A> | SignalAction<A>;
/**
 * create a signal from a function that can 'sink' values in
 * Note that this could be a memory leak
 * ((a -> ()) -> ()) -> CurrentSignal a
 * @param  {Function} sinkNewValue (a -> ()) -> () | A function to drop a new value
 * @return {Signal}              CurrentSignal a | A current signal of a
*/
export declare const fromFunction: <A>(sinkNewValue: (sink: (a: A, action?: SignalActions | void) => void) => void) => CurrentSignalValue<A> | CurrentSignalAction<A>;
/**
 * Mailbox returns a object for the signal and the address, or the sink to drop the new values into.
 * @return {{signal:Signal, address: Function}} The address and the signal to update
 */
export declare const mailBox: <A>() => {
    signal: CurrentSignalValue<A> | CurrentSignalAction<A>;
    address: (a: A, action?: SignalActions | void) => void;
};
export interface Thenable<A> {
    then<B>(isGood: (a: A) => Thenable<B> | B): Thenable<B>;
}
/**
 * From Promises
 * Future a -> ... -> Signal a
 * @param  {Future} Futures... [description]
 * @return {Signal}             [description]
*/
export declare const fromPromises: <A>(...futures: (Thenable<A> | A)[]) => SignalValue<A> | SignalAction<A>;
export declare const onSignalValue: <A>(onValue: (a: SignalValue<A>) => void, signal: SignalValue<A> | SignalAction<A> | Future<SignalValue<A> | SignalAction<A>>) => () => void;
/**
 * This is a each loop that is expecting side effects
 * Notes that this returns a garbage collection, that combined with a fromFunction, it will hold memory all the way to the source
 * (a -> ()) -> Signal a -> (() -> ())
 * @param  {Function} onValue        a -> () | Where we call on signal
 * @param  {[type]} startingSignal    Signal a
 * @return {Function}                () -> () | Clean up
*/
export declare const onValue: <A>(onValueFn: (a: A) => void, startingSignal: SignalValue<A> | SignalAction<A>) => () => void;
/**
 * [Fold](https://en.wikipedia.org/wiki/Fold_(higher-order_function)) but with a signal, which is potential future
 * (a -> b) -> a -> signal a -> signal b
 * @param  {Function} foldFunction (state -> a -> state) Reduce function
 * @param  {a} initialState a
 * @param  {Signal} signal       Signal a
 * @return {Signal}              Signal state
*/
export declare const foldp: <State, A>(foldFunction: (state: State, a: A) => State, initialState: State, signal: SignalValue<A> | SignalAction<A>) => SignalValue<State> | SignalAction<State>;
/**
 * Map a function across the signal
 * (a -> b) -> Signal a -> Signal b
 * @param  {Function} mapFunction (a -> b) | map domain to codomain
 * @param  {Signal} signal      Signal a | Signal of domain
 * @return {Signal}             Signal b | Signal of codomain
*/
export declare const map: <A, B>(mapFunction: (a: A) => B, signal: SignalValue<A> | SignalAction<A>) => SignalValue<B> | SignalAction<B>;
/**
 * Join two signals into one, dies when both die.
 * Signal a -> Signal b -> Signal (a | b)
 * @param  {Signal} signalA [description]
 * @param  {Signal} signalB [description]
 * @return {Signal}         [description]
 */
export declare const join: <A, B>(signalA: SignalValue<A> | SignalAction<A>, signalB: SignalValue<B> | SignalAction<B>) => SignalValue<A | B> | SignalAction<A | B>;
/**
 * Filter a signal over time
 * (a -> boolean) -> Signal a -> Signal a
 * @param  {Function} filterFunction Truth means to bring it forward
 * @param  {Signal} signal         Source
 * @return {Signal}                Filtered source
*/
export declare const filter: <A>(filterFunction: (a: A) => boolean, signal: SignalValue<A> | SignalAction<A>) => SignalValue<A> | SignalAction<A>;
export declare const flatten: <A>(signal: SignalValue<SignalValue<A> | SignalAction<A> | A> | SignalAction<SignalValue<A> | SignalAction<A> | A>) => SignalValue<A> | SignalAction<A>;
/**
 * { k` = Signal a`, k`` = Signal a``, ..., k^n = a^n} -> Signal { k` = a`, k`` = a``, ..., k^n = a^n}
 * @param  {[type]} objectToMerge [description]
 * @return {[type]}               [description]
*/
export declare const mergeObject: <A>(objectToMerge: {
    [key: string]: SignalValue<A> | SignalAction<A>;
}) => SignalValue<{
    [key: string]: A;
}> | SignalAction<{
    [key: string]: A;
}>;
/**
 * { k` = Signal a`, k`` = Signal a``, ..., k^n = a^n} -> Signal { k` = a`, k`` = a``, ..., k^n = a^n}
 * Uses an and change
 * @param  {Object} objectToMerge [description]
 * @return {Signal}               [description]
 */
export declare const mergeObjectAnd: <A>(objectToMerge: {
    [key: string]: SignalValue<A> | SignalAction<A>;
}) => SignalValue<{
    [k: string]: A;
}> | SignalAction<{
    [k: string]: A;
}>;
export declare const getLatest: <A>(signalA: SignalValue<A> | SignalAction<A>) => CurrentSignalValue<A> | CurrentSignalAction<A>;
export declare const latest: {
    mergeObject: <A>(a: {
        [k: string]: SignalValue<A> | SignalAction<A>;
    }) => SignalValue<{
        [k: string]: A;
    }> | SignalAction<{
        [k: string]: A;
    }>;
};
