Promise = require 'bluebird'
_ = require 'lodash'
module.exports = class Signals
  class Symbol
    constructor: (@name) ->
  @NEW_SIGNAL = new Symbol 'NEW_SIGNAL'
  @NONE = new Symbol 'NONE'
  @STOP = new Symbol 'STOP'
  @NO_VALUES = [@NEW_SIGNAL, @NONE, @STOP]
  @guardSignal = (signal) ->
    if !_.isSignal signal
      throw new TypeError "Expecting a signal"
    return signal
  ###*
   * Create a signal form an array
   * [a...] -> Signal a
   * @param  {Array a} array [a...] | Value of a
   * @return {Signal a}       Signal a
  ###
  @fromArray : (array) ->
    _ [@NEW_SIGNAL].concat array
    .reverse()
    .reduce (head, arrayValue) ->
      newPromise = new Promise (resolve) -> resolve head
      new Signal arrayValue, -> newPromise
    , Signals.SIGNAL_DEAD
    .valueOf()

  ###*
   * create a signal from a function that can 'sink' values in
   * Note that this could be a memory leak
   * ((a -> ()) -> ()) -> CurrentSignal a
   * @param  {Function} sinkNewValue (a -> ()) -> () | A function to drop a new value
   * @return {Signal}              CurrentSignal a | A current signal of a
  ###
  @fromFunction: (sinkNewValue) ->
    initValue = Signals.NEW_SIGNAL
    currentResolve = _.noop
    newTail = (value) ->
      newPromise = new Promise (resolve) ->
        currentResolve = resolve
      new Signal value, -> newPromise

    answer = new CurrentSignal newTail initValue
    sinkNewValue (newValue) ->
      currentResolve newTail newValue

    answer

  ###*
   * From Promises
   * Promise a -> ... -> Signal a
   * @param  {Promise} promises... [description]
   * @return {Signal}             [description]
  ###
  @fromPromises : (promises...) ->
    sink = null
    answer = Signals.fromFunction (newSink) -> sink = newSink
    _.each promises, (promise) -> promise.then sink
    return answer

  ###*
   * Determines is value is a signal
   * a -> Booelan
   * @param  {[type]} predicateValue [description]
   * @return {[type]}                [description]
  ###
  @isSignal: (predicateValue) ->
    hasValue = predicateValue.hasOwnProperty 'value'
    hasGetNext = _.isFunction predicateValue?.getNext
    return hasValue && hasGetNext



  class Signal
    ###*
     * Signal is a value over time, this is just a link to next moment in time. And is lazy
     * a -> (() -> Promise Signal a) -> Signal a
     * @param  {Any} @value   [description]
     * @param  {Function} @getNext [description]
     * @return {Signal}          [description]
    ###
    constructor: (@value, @getNext) ->

  @SIGNAL_DEAD = new Signal Signals.STOP, _.noop
  class CurrentSignal
    constructor: (@tailSignal) ->
      @update @tailSignal
      @getNext = =>
        @tailSignal.getNext()

    update: (signal) ->
      @value = signal.value
      @tailSignal = signal
      signal.getNext()?.then (nextSignal) =>
        @update nextSignal


  ###*
   * This is a each loop that is expecting side effeces
   * Notes that this returns a garbage collection, that combined with a fromFunction, it will hold memory all the way to the source
   * (a -> ()) -> Signal a -> (() -> ())
   * @param  {Function} onValue        a -> () | Where we call on signal
   * @param  {[type]} startingSignal    Signal a
   * @return {Function}                () -> () | Clean up
  ###
  @onValue : _.curry (onValue, startingSignal) ->
    withNext = (signal) ->
      values = [].concat signal.value
      isValue =  _.every values, (value) ->
        !_.find [Signals.NONE, Signals.NEW_SIGNAL], value
      if signal.value == Signals.STOP
        return

      if isValue
        onValue signal.value

      signal.getNext()?.then withNext
    withNext startingSignal
    ->
      onValue = _.noop
      withNext = _.noop

  ###*
   * [Fold](https://en.wikipedia.org/wiki/Fold_(higher-order_function)) but with a signal, which is potential future
   * (a -> b) -> a -> signal a -> signal b
   * @param  {Function} foldFunction (state -> a -> state) Reduce function
   * @param  {a} initialState a
   * @param  {Signal} signal       Signal a
   * @return {Sginal}              Signal state
  ###
  @foldp : _.curry (foldFunction, initialState, signal) ->
    untilNext = (nextSignal) ->
      return nextSignal if nextSignal.value == Signals.STOP
      if nextSignal.value == Signals.NEW_SIGNAL || nextSignal.value == Signals.NONE
        return nextSignal.getNext()?.then untilNext
      nextValue = foldFunction initialState, nextSignal.value
      if nextValue == Signals.NONE
        return nextSignal.getNext()?.then untilNext
      if nextValue == Signals.STOP
        return Signals.SIGNAL_DEAD
      return Signals.foldp foldFunction, nextValue, nextSignal
    new Signal initialState, -> signal.getNext()?.then untilNext

  ###*
   * Map a function across the signal
   * (a -> b) -> Signal a -> Signal b
   * @param  {Function} mapFunction (a -> b) | map domain to codomain
   * @param  {Signal} signal      Signal a | Signal of domain
   * @return {Signal}             Signal b | Signal of codomain
  ###
  @map : _.curry (mapFunction, signal) ->
    Signals.foldp (memo, newValue) ->
      mapFunction newValue
    , null
    , signal

  ###*
   * Flatten a signal of signals into a single signal
   * Signal (Signal a | a) -> Signal a
   * @param  {[type]} signal [description]
   * @return {[type]}        [description]
  ###
  @flatten : (signal) ->
    withNext = (nextSignal) ->
      if Signals.isSignal nextSignal.value
        return Signals.flatten Signals.join nextSignal.value, nextSignal

      return Signals.flatten nextSignal

    if signal?.value == Signals.STOP
      return signal
    new Signal signal.value, ->
      signal.getNext()?.then withNext

  @join : (signalA, signalB) ->
    if signalA?.value == Signals.STOP
      return signalB

    nextSignal = (promiseLeft, promiseRight) ->
      getNextSignal =  (otherPromise) -> (newSignal) ->
        if newSignal?.value == Signals.STOP
          return otherPromise
        new Signal newSignal.value, ->
          nextSignal newSignal.getNext(), otherPromise

      Promise.race [
        promiseLeft.then getNextSignal promiseRight
        promiseRight.then getNextSignal promiseLeft
      ]

    new Signal signalA.value, ->
      nextSignal signalA.getNext(), signalB.getNext()

  ###*
   * Filter a signal over time
   * (a -> boolean) -> Signal a -> Signal a
   * @param  {Function} filterFunction Truth means to bring it forward
   * @param  {Signal} signal         Source
   * @return {Signal}                Filtered source
  ###
  @filter : _.curry (filterFunction, signal) ->
    Signals.foldp (memo, newValue) ->
      if !filterFunction newValue
        return Signals.NONE
      return newValue
    , null
    , signal

  ###*
   * Broadcast any time any Signal updates
   * (Signal a) -> ... -> Signal (List a)
   * @param  {Signal[]} otherSignals... Other Streams
   * @return {Signal}                 New Signal of [streamValues...]
  ###
  @mergeOr = (otherSignals...) ->
    allValues = _.map otherSignals, _.property 'value'
    new Signal allValues, ->
      newPromises = _.map otherSignals, (oldSignal) ->
        oldSignal.getNext().then (newSignal) ->
          nextSignals = _.map otherSignals, (otherSignal) ->
            if otherSignal != oldSignal
              return otherSignal
            return newSignal
          Signals.mergeOr nextSignals...
      Promise.race newPromises

  ###*
   * Emit only when all signals have updated
   * Signal a -> ... -> Signal (List a)
   * @param  {Signal []} otherSignals... [description]
   * @return {Signal}                 [description]
  ###
  @mergeAnd = (otherSignals...) ->
    allValues = _.map otherSignals, _.property 'value'
    otherGetNexts = _.map otherSignals, _.property 'getNext'
    allValues =  Signals.NEW_SIGNAL if _.every allValues, (value) ->
      value == Signals.NEW_SIGNAL
    new Signal allValues, ->
      otherNexts = _.map otherGetNexts, (getNext) ->
        getNext()
      Promise.all otherNexts
      .then (allNextValues) ->
        Signals.mergeAnd allNextValues...

  ###*
   * { k` = Signal a`, k`` = Signal a``, ..., k^n = a^n} -> Signal { k` = a`, k`` = a``, ..., k^n = a^n}
   * @param  {[type]} objectToMerge [description]
   * @return {[type]}               [description]
  ###
  @mergeObject = (objectToMerge) ->
    setOfSignals = _.map objectToMerge, (signal, key) ->
      Signals.map (a) ->
        answer = {}
        answer[key] = a
        return answer
      , signal
    joinedSignal = _.reduce _.rest(setOfSignals), (joinedSignal,additionalSignal) ->
      Signals.join joinedSignal, additionalSignal
    , _.first(setOfSignals)
    backToObject = Signals.foldp (lastAnswer,value) ->
      _.extend {}, lastAnswer, value
    , {}

    filterEmpty = Signals.filter (a) -> !_.isEmpty a

    filterEmpty backToObject joinedSignal

  ###*
   * Compose pipelines together
   * (Signal a -> Signal a`) -> (Signal a` -> Signal a``) -> ... -> (Signal a -> Signal a^n)
   * @param  {Function} otherSignals... [description]
   * @return {Function}                 [description]
  ###
  @compose = (pipelines...) ->
    (signal) ->
      _.reduce pipelines,
        (newSignal,pipeline) ->
          pipeline newSignal
        , signal
