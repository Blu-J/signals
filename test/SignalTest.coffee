require "babel/polyfill"

Promise = require 'bluebird'
_ = require 'lodash'


{expect} = require 'chai'
global.Promise = Promise


Signal = require '../src/signal'

describe.only 'With Signal', ->

  beforeEach ->
    Promise.setScheduler (fn) ->
      fn()

  it 'constructor', ->
    test = Signal.fromFunction ->
    expect test
      .not.to.be.undefined

  it 'constructor adds a function sinkValue to function passed in constructor', ->
    sinker = null
    test = Signal.fromFunction (newSinker) -> sinker = newSinker
    expect _.isFunction sinker
      .to.be.true

  it 'contructor sinker function returns a method which will not be called normally', ->
    closed = false
    Signal.fromFunction -> -> closed = true
    expect closed
      .to.be.false

  describe 'with onValue', ->
    it 'should be able to get each value', ->
      newValue = null
      ANSWER = 'test'
      mainSignal = Signal.fromArray [ANSWER]

      Signal.onValue (mainSignalValue) ->
        newValue = mainSignalValue
      , mainSignal

      expect newValue
        .to.equal ANSWER


    describe 'with current signal', ->
      it 'should get the most current value', ->
        newValue = ''
        sinker = null
        ANSWER = 'test'
        mainSignal = Signal.latest.fromFunction (sink) ->
          sinker = sink
        sinker ANSWER
        Signal.onValue (mainSignalValue) ->
          newValue += mainSignalValue
        , mainSignal

        expect newValue
          .to.equal ANSWER

      it 'should get the most current value, ignore older', ->
        newValue = ''
        sinker = null
        wrongAnswer = 'firstWrongAnswer'
        wrongAnswer2 = 'second WrongAnswer'
        ANSWER = 'test'
        mainSignal = Signal.latest.fromFunction (sink) ->
          sinker = sink

        sinker wrongAnswer
        sinker wrongAnswer2
        sinker ANSWER
        Signal.onValue (mainSignalValue) ->
          newValue += mainSignalValue
        , mainSignal

        expect newValue
          .to.equal ANSWER

      it 'should get the most current value, and new values, ignore older', ->
        newValue = ''
        sinker = null
        wrongAnswer = 'firstWrongAnswer'
        wrongAnswer2 = 'second WrongAnswer'
        answerPartOne = 'part1'
        answerPartTwo = 'part2'
        answer = answerPartOne + answerPartTwo
        mainSignal = Signal.latest.fromFunction (sink) ->
          sinker = sink

        sinker wrongAnswer
        sinker wrongAnswer2
        sinker answerPartOne
        Signal.onValue (mainSignalValue) ->
          newValue += mainSignalValue
        , mainSignal


        sinker answerPartTwo

        expect newValue
          .to.equal answer


    it 'should be able to get two signals at a time', ->
      lastValue1 = _.now() + _.random()
      lastValue2 = _.now() + _.random()
      sinker = null
      ANSWER = 'test'
      mainSignal = Signal.fromFunction (sink) ->
        sinker = sink

      onValue1 = Signal.onValue (newValue) ->
        lastValue1 = newValue

      onValue2 = Signal.onValue (newValue) ->
        lastValue2 = newValue

      onValue1 mainSignal
      onValue2 mainSignal

      sinker ANSWER
      expect lastValue1
        .to.equal lastValue2

    it 'should return a function that cleans up', ->
      mySink = null
      signal = Signal.fromFunction (sink) -> mySink = sink
      lastValue = null
      wrongAnswer = 'answer'
      peer = Signal.onValue (a) -> lastValue = a

      cleanUp = peer signal
      cleanUp()
      mySink wrongAnswer
      expect lastValue
        .not.to.equal wrongAnswer




  describe 'constructors', ->
    ###*
     * Signal String a -> (() -> String a)
     * @param  {Signal} signal [description]
     * @return {Function}        [description]
    ###
    latestStrConcat = (signal) ->
      answer = ''
      Signal.onValue (value) ->
        answer += value
      , signal
      -> answer

    describe 'from function', ->
      it 'should returns signal', ->
        expect Signal.isSignal Signal.fromFunction ((resolve) -> )
          .to.be.true

      tupleSignalNSink = ->
        sinker = null
        [
          new Signal.fromFunction (newSinker) -> sinker = newSinker
          sinker
        ]

      it 'should return in order the values sunk', ->


    describe 'from promises', ->
      tupleLazyPromise = ->
        resolver = null
        [
          new Promise (resolve) -> resolver = resolve
          resolver
        ]
      it 'shoud take a promise a + b, with resolve order b a, then value of signal should be b a', ->
        answerPartA = 'a'
        answerPartB = 'b'
        expectedAnswer = answerPartB + answerPartA
        pairA = tupleLazyPromise()
        pairB = tupleLazyPromise()
        answer = latestStrConcat Signal.fromPromises pairA[0], pairB[0]

        pairB[1] answerPartB
        pairA[1] answerPartA

        expect answer()
          .to.equal expectedAnswer

      it 'shoud take a promise a + b, with resolve order a b, then value of signal should be a b', ->
        answerPartA = 'a'
        answerPartB = 'b'
        expectedAnswer = answerPartA +  answerPartB
        pairA = tupleLazyPromise()
        pairB = tupleLazyPromise()
        answer = latestStrConcat Signal.fromPromises pairA[0], pairB[0]

        pairA[1] answerPartA
        pairB[1] answerPartB

        expect answer()
          .to.equal expectedAnswer

      it 'should return a signal', ->
        expect Signal.isSignal Signal.fromPromises()
          .to.be.true


  describe 'with foldp', ->
    it 'should not give a value without onValue', ->
      newValue = null
      sinker = null
      ANSWER = 'test'
      mainSignal = Signal.fromFunction (sink) ->
        sinker = sink
      Signal.foldp (memo, mainSignalValue) ->
        newValue = mainSignalValue
      , null, mainSignal
      sinker ANSWER
      expect newValue
        .to.equal null

    it 'then lazy should work as a fold, for example sum', ->
      sinker = null
      lastValue = null
      mainSignal = Signal.fromFunction (sink) ->
        sinker = sink
      mainSignal
      sum = Signal.foldp (memo, newValue) ->
        memo + newValue
      , 0
      peer = Signal.onValue (currentValue) ->
        lastValue = currentValue
      peer sum mainSignal
      sinker 1
      sinker 2
      sinker 3
      expect lastValue
        .to.equal 6

    it 'then from array should work as a fold, for example sum', ->
      lastValue = null
      mainSignal = Signal.fromArray [1,Signal.NEW_SIGNAL,2,Signal.NONE,3]
      sum = Signal.foldp (memo, newValue) ->
        memo + newValue
      , 0
      peer = Signal.onValue (currentValue) ->
        lastValue = currentValue
      peer sum mainSignal
      expect lastValue
        .to.equal 6

    it 'should work as a filter when we push in NONE', ->
      sinker = null
      lastValue = null
      mainSignal = Signal.fromFunction (sink) ->
        sinker = sink
      mainSignal
      filterEven = Signal.foldp (memo, newValue) ->
        if newValue % 2 != 0
          return Signal.NONE
        memo + newValue
      , 0
      peer = Signal.onValue (newValue) ->
        lastValue = newValue
      peer filterEven mainSignal
      sinker 1
      sinker 2
      sinker 3
      sinker 6
      expect lastValue
        .to.equal 8


    it 'should we send the end, then no more values get updated', ->
      sinker = null
      lastValue = null
      mainSignal = Signal.fromFunction (sink) ->
        sinker = sink
      stopAtThree = Signal.foldp (memo, newValue) ->
        if newValue == 3
          return Signal.STOP
        newValue
      , 0
      peer = Signal.onValue (newValue) ->
        lastValue = newValue
      peer stopAtThree mainSignal
      sinker 1
      sinker 2
      sinker 3
      sinker 4
      expect lastValue
        .to.equal 2

  describe "and with Signal.mergeOr", ->
    it "should update on any signal update", ->
      mySinker = null
      sinkValue = "test"
      lastValue = null
      stream1 = Signal.fromFunction ->
      stream2 = Signal.fromFunction (sinker) -> mySinker = sinker
      mergedStream = Signal.mergeOr stream1, stream2
      peer = Signal.onValue (newValue) ->
        lastValue = newValue
      peer mergedStream
      mySinker sinkValue
      expect lastValue
        .to.deep.equal null

  describe "and with Signal.mergeAnd", ->
    it "should not update if all did not update", ->
      mySinker = null
      sinkValue = "test"
      lastValue = null
      stream1 = Signal.fromFunction ->
      stream2 = Signal.fromFunction (sinker) -> mySinker = sinker
      mergedStream = Signal.mergeAnd stream1, stream2
      peer = Signal.onValue (newValue) ->
        lastValue = newValue
      peer mergedStream
      mySinker sinkValue
      expect lastValue
        .to.deep.equal null

    it "should update if all did update", ->
      mySinker = null
      mySinker2 = null
      sinkValue = "test"
      sinkValue2 = "otherValue"
      lastValue = null
      stream1 = Signal.fromFunction (sinker) -> mySinker = sinker
      stream2 = Signal.fromFunction (sinker) -> mySinker2 = sinker
      mergedStream = Signal.mergeAnd stream1, stream2
      peer = Signal.onValue (newValue) ->
        lastValue = newValue
      peer mergedStream
      mySinker sinkValue
      mySinker2 sinkValue2
      expect lastValue
        .to.deep.equal [sinkValue,sinkValue2]

  describe 'with filter', ->
    it 'should filter values not deeamed correct', ->
      values = []
      sinker = null
      signal = Signal.fromArray [1,2,3,4,5]
      filterEvens = Signal.filter (value) -> value % 2 == 0
      peer = Signal.onValue (newValue) ->
        values.push newValue
      peer filterEvens signal
      expect values
        .to.deep.equal [2,4]

  describe 'with map', ->
    it 'should transform data coming in', ->
      values = []
      sinker = null
      signal = Signal.fromArray [1,2,3,4,5]
      double = Signal.map (value) -> value * 2
      peer = Signal.onValue (newValue) ->
        values.push newValue
      peer double signal
      expect values
        .to.deep.equal [2,4,6,8,10]

  describe 'with flatten mapping', ->
    it 'should be able to join', ->
      expectedAnswer = [1,2,3,4]
      sink1 = null
      sink2 = null
      answer = []
      peep = Signal.onValue (value) -> answer.push value
      peep Signal.join (Signal.fromFunction (sink) -> sink1 = sink),
        (Signal.fromFunction (sink) -> sink2 = sink)
      sink1 1
      sink2 2
      sink2 3
      sink1 4
      expect answer
        .to.deep.equal expectedAnswer


    it 'should be able to join with stops', ->
      expectedAnswer = [1,2,3,4]
      answer = []
      peep = Signal.onValue (value) -> answer.push value
      peep Signal.join (Signal.fromArray [1,2]),
        (Signal.fromArray [3,4])

      expect answer
        .to.deep.equal expectedAnswer
    it 'should be able to create a combinatorics', ->
      firstData = Signal.fromArray ['a','b']
      lastSeen = null
      createSubSignal = (firstPart) ->
        Signal.fromArray _.map ['1','2'], (b) -> [firstPart,b]

      mapProduct = Signal.map createSubSignal
      allProducts = Signal.foldp (total, pair) ->
        total.concat [pair]
      , []
      peer = Signal.onValue (value) ->
        lastSeen = value
      peer allProducts Signal.flatten mapProduct firstData

      expect lastSeen
        .to.deep.equal [['a','1'],['a','2'],['b','1'],['b','2']]

    it.skip 'should be able to big combination', ->
      alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZ".split ''
      firstData = new Signal.fromArray alphabet
      lastSeen = null
      createSubSignal = (firstPart) ->
        Signal.fromArray _.map alphabet, (b) -> firstPart + b

      mapProduct = Signal.map createSubSignal
      peer = Signal.onValue (value) ->
        console.log "A Value: #{value}"
      combinationSet = Signal.compose mapProduct, Signal.flatten
      uberComb = Signal.compose combinationSet
      peer uberComb firstData


  describe 'merge with object', ->
    it 'should be able to merge mapping of signals to a signal of out put', ->
      objectGoingIn = {
        signalA : Signal.fromArray [1,2]
        signalB : Signal.fromArray 'ab'.split ''
      }

      signalReturned = Signal.mergeObject objectGoingIn

      answersReturned = []
      appendAnswers = Signal.onValue (a) ->
        answersReturned.push a

      appendAnswers signalReturned

      expect answersReturned
        .to.deep.equal [{signalA:1}, {signalA: 1, signalB: 'a'}, {signalA:2, signalB : 'a'}, {signalA:2,signalB:'b'}]
