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
export declare const fromArray: <A>(array: A[]) => SignalValue<A> | SignalAction<A>;
export declare const fastForwardFunction: <A>(sinkNewValue: (sink: (a: A, action?: SignalActions | void) => void) => void) => SignalValue<A> | SignalAction<A>;
export declare const fromFunction: <A>(sinkNewValue: (sink: (a: A, action?: SignalActions | void) => void) => void) => CurrentSignalValue<A> | CurrentSignalAction<A>;
export declare const mailbox: <A>() => {
    signal: CurrentSignalValue<A> | CurrentSignalAction<A>;
    address: (a: A, action?: SignalActions | void) => void;
};
export interface Thenable<A> {
    then<B>(isGood: (a: A) => Thenable<B> | B): Thenable<B>;
}
export declare const fromPromises: <A>(...futures: (Thenable<A> | A)[]) => SignalValue<A> | SignalAction<A>;
export declare const onSignalValue: <A>(onValue: (a: SignalValue<A>) => void, signal: SignalValue<A> | SignalAction<A> | Future<SignalValue<A> | SignalAction<A>>) => () => void;
export declare const onValue: <A>(onValueFn: (a: A) => void, startingSignal: SignalValue<A> | SignalAction<A>) => () => void;
export declare const foldp: <State, A>(foldFunction: (state: State, a: A) => State, initialState: State, signal: SignalValue<A> | SignalAction<A>) => SignalValue<State> | SignalAction<State>;
export declare const map: <A, B>(mapFunction: (a: A) => B, signal: SignalValue<A> | SignalAction<A>) => SignalValue<B> | SignalAction<B>;
export declare const join: <A, B>(signalA: SignalValue<A> | SignalAction<A>, signalB: SignalValue<B> | SignalAction<B>) => SignalValue<A | B> | SignalAction<A | B>;
export declare const filter: <A>(filterFunction: (a: A) => boolean, signal: SignalValue<A> | SignalAction<A>) => SignalValue<A> | SignalAction<A>;
export declare const flatten: <A>(signal: SignalValue<SignalValue<A> | SignalAction<A> | A> | SignalAction<SignalValue<A> | SignalAction<A> | A>) => SignalValue<A> | SignalAction<A>;
export declare const mergeObject: <A>(objectToMerge: {
    [key: string]: SignalValue<A> | SignalAction<A>;
}) => SignalValue<{
    [key: string]: A;
}> | SignalAction<{
    [key: string]: A;
}>;
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
