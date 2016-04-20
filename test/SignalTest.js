const _ =  require('lodash');
const Signal = require('../dist/signal.js');
const promisePolyfill = require('promise-polyfill');
const chai =  require('chai');
require('mocha');
global.Promise = promisePolyfill;
const expect = chai.expect;

describe('With Signal', function() {
  it('constructor', function() {
    var test = Signal.fromFunction(function() {});
    return expect(test).not.to.be.undefined;
  });
  it('constructor adds a function sinkValue to function passed in constructor', function() {
    var sinker, test;
    sinker = null;
    Signal.fromFunction(function(newSinker) {
      return sinker = newSinker;
    });
    return expect(_.isFunction(sinker)).to.be["true"];
  });
  it('contructor sinker function returns a method which will not be called normally', function() {
    var closed;
    closed = false;
    Signal.fromFunction(function() {
      return function() {
        return closed = true;
      };
    });
    return expect(closed).to.be["false"];
  });
  describe('with onValue', function() {
    it('should be able to get each value', function() {
      var ANSWER, mainSignal, newValue;
      newValue = null;
      ANSWER = 'test';
      mainSignal = Signal.fromArray([ANSWER]);
      Signal.onValue(function(mainSignalValue) {
        return newValue = mainSignalValue;
      }, mainSignal);
      return expect(newValue).to.equal(ANSWER);
    });
    describe('with current signal', function() {
      it('should get the most current value', function() {
        var ANSWER, mainSignal, newValue, sinker;
        newValue = '';
        ANSWER = 'test';
        sinker = _.noop;
        mainSignal = Signal.fromFunction(function(sink) {
          return sinker = sink;
        });
        sinker(ANSWER);
        Signal.onValue(function(mainSignalValue) {
          return newValue += mainSignalValue;
        }, mainSignal);
        return expect(newValue).to.equal(ANSWER);
      });
      it('should get the most current value, ignore older', function() {
        var ANSWER, mainSignal, newValue, sinker, wrongAnswer, wrongAnswer2;
        newValue = '';
        wrongAnswer = 'firstWrongAnswer';
        wrongAnswer2 = 'second WrongAnswer';
        ANSWER = 'test';
        sinker = _.noop;
        mainSignal = Signal.fromFunction(function(sink) {
          return sinker = sink;
        });
        sinker(wrongAnswer);
        sinker(wrongAnswer2);
        sinker(ANSWER);
        Signal.onValue(function(mainSignalValue) {
          return newValue += mainSignalValue;
        }, mainSignal);
        return expect(newValue).to.equal(ANSWER);
      });
      return it('should get the most current value, and new values, ignore older', function() {
        var answer, answerPartOne, answerPartTwo, mainSignal, newValue, sinker, wrongAnswer, wrongAnswer2;
        newValue = '';
        sinker = _.noop;
        wrongAnswer = 'firstWrongAnswer';
        wrongAnswer2 = 'second WrongAnswer';
        answerPartOne = 'part1';
        answerPartTwo = 'part2';
        answer = answerPartOne + answerPartTwo;
        mainSignal = Signal.fromFunction(function(sink) {
          return sinker = sink;
        });
        sinker(wrongAnswer);
        sinker(wrongAnswer2);
        sinker(answerPartOne);
        Signal.onValue(function(mainSignalValue) {
          return newValue += mainSignalValue;
        }, mainSignal);
        sinker(answerPartTwo);
        return expect(newValue).to.equal(answer);
      });
    });
    it('should be able to get two signals at a time', function() {
      var ANSWER, lastValue1, lastValue2, mainSignal, onValue1, onValue2, sinker;
      lastValue1 = _.now() + _.random();
      lastValue2 = _.now() + _.random();
      sinker = _.noop;
      ANSWER = 'test';
      mainSignal = Signal.fromFunction(function(sink) {
        return sinker = sink;
      });
      onValue1 = (sig) => Signal.onValue(function(newValue) {
        return lastValue1 = newValue;
      }, sig);
      onValue2 = (sig) => Signal.onValue(function(newValue) {
        return lastValue2 = newValue;
      }, sig);
      onValue1(mainSignal);
      onValue2(mainSignal);
      sinker(ANSWER);
      return expect(lastValue1).to.equal(lastValue2);
    });
    it('should return a function that cleans up', function() {
      var cleanUp, lastValue, mySink, peer, signal, wrongAnswer;
      mySink = _.noop;
      signal = Signal.fromFunction(function(sink) {
        return mySink = sink;
      });
      lastValue = null;
      wrongAnswer = 'answer';
      peer = (sig) => Signal.onValue(function(a) {
        return lastValue = a;
      }, sig);
      cleanUp = peer(signal);
      cleanUp();
      mySink(wrongAnswer);
      return expect(lastValue).not.to.equal(wrongAnswer);
    });
  });
  describe('constructors', function() {

    /**
     * Signal String a -> (() -> String a)
     * @param  {Signal} signal [description]
     * @return {Function}        [description]
     */
    var latestStrConcat = function(signal) {
      var answer;
      answer = '';
      Signal.onValue(function(value) {
        return answer += value;
      }, signal);
      return function() {
        return answer;
      };
    };
    describe('from function', function() {
      var tupleSignalNSink;
      it('should returns signal', function() {
        return expect(Signal.isSignal(Signal.fromFunction((function(resolve) {})))).to.be["true"];
      });
      tupleSignalNSink = function() {
        var sinker;
        sinker = null;
        return [
          new Signal.fromFunction(function(newSinker) {
            return sinker = newSinker;
          }), sinker
        ];
      };
      return it('should return in order the values sunk', function() {});
    });
    return describe('from promises', function() {

      if (typeof Promise._setImmediateFn === 'function'){
        return Promise._setImmediateFn(function(fn) {
          return fn();
        });
      }
      var tupleLazyPromise = tupleLazyPromise = function() {
        var resolver = null;
        return [
          new Promise(function(resolve) {
            resolver = resolve;
          }), resolver || _.noop
        ];
      };
      it('shoud take a promise a + b, with resolve order b a, then value of signal should be b a', function() {
        var answerPartA, answerPartB, expectedAnswer;
        answerPartA = 'a';
        answerPartB = 'b';
        expectedAnswer = answerPartB + answerPartA;
        const pairA = tupleLazyPromise();
        const pairB = tupleLazyPromise();
        const answer = latestStrConcat(Signal.fromPromises(pairA[0], pairB[0]));
        pairB[1](answerPartB);
        pairA[1](answerPartA);
        return expect(answer()).to.equal(expectedAnswer);
      });
      it('shoud take a promise a + b, with resolve order a b, then value of signal should be a b', function() {
        var answer, answerPartA, answerPartB, expectedAnswer, pairA, pairB;
        answerPartA = 'a';
        answerPartB = 'b';
        expectedAnswer = answerPartA + answerPartB;
        pairA = tupleLazyPromise();
        pairB = tupleLazyPromise();
        answer = latestStrConcat(Signal.fromPromises(pairA[0], pairB[0]));
        pairA[1](answerPartA);
        pairB[1](answerPartB);
        return expect(answer()).to.equal(expectedAnswer);
      });
      return it('should return a signal', function() {
        return expect(Signal.isSignal(Signal.fromPromises())).to.be["true"];
      });
    });
  });
  describe('with foldp', function() {
    it('should not give a value without onValue', function() {
      var ANSWER, mainSignal, newValue, sinker;
      newValue = null;
      sinker = _.noop;
      ANSWER = 'test';
      mainSignal = Signal.fromFunction(function(sink) {
        return sinker = sink;
      });
      Signal.foldp(function(memo, mainSignalValue) {
        return newValue = mainSignalValue;
      }, null, mainSignal);
      sinker(ANSWER);
      return expect(newValue).to.equal(null);
    });
    it('then lazy should work as a fold, for example sum', function() {
      var lastValue, mainSignal, peer, sinker, sum;
      sinker = _.noop;
      lastValue = null;
      mainSignal = Signal.fromFunction(function(sink) {
        return sinker = sink;
      });
      mainSignal;
      sum = (sig) => Signal.foldp(function(memo, newValue) {
        return memo + newValue;
      }, 0, sig);
      peer = (sig) => Signal.onValue(function(currentValue) {
        return lastValue = currentValue;
      }, sig);
      peer(sum(mainSignal));
      sinker(1);
      sinker(2);
      sinker(3);
      return expect(lastValue).to.equal(6);
    });
    it('then from array should work as a fold, for example sum', function() {
      var lastValue, mainSignal, peer, sum;
      lastValue = null;
      mainSignal = Signal.fromArray([1, 2, 3]);
      sum = (sig) => Signal.foldp(function(memo, newValue) {
        return memo + newValue;
      }, 0, sig);
      peer = (sig) => Signal.onValue(function(currentValue) {
        return lastValue = currentValue;
      }, sig);
      peer(sum(mainSignal));
      return expect(lastValue).to.equal(6);
    });
  });
  describe('with filter', function() {
    it('should filter values not deeamed correct', function() {
      var filterEvens, peer, signal, sinker;
      var values = [];
      sinker = null;
      signal = Signal.fromArray([1, 2, 3, 4, 5]);
      filterEvens = (sig) => Signal.filter(function(value) {
        return value % 2 === 0;
      },sig);
      peer = (sig) =>Signal.onValue(function(newValue) {
        return values.push(newValue);
      },sig);
      peer(filterEvens(signal));
      return expect(values).to.deep.equal([2, 4]);
    });
  });
  describe('with map', function() {
    it('should transform data coming in', function() {
      var double, peer, signal, sinker;
      var values = [];
      sinker = null;
      signal = Signal.fromArray([1, 2, 3, 4, 5]);
      double = (sig) => Signal.map(function(value) {
        return value * 2;
      }, sig);
      peer = (sig) => Signal.onValue(function(newValue) {
        return values.push(newValue);
      }, sig);
      peer(double(signal));
      return expect(values).to.deep.equal([2, 4, 6, 8, 10]);
    });
  });
  describe('with flatten mapping', function() {
    it('should be able to join', function() {
      var expectedAnswer, peep, sink1, sink2;
      expectedAnswer = [1, 2, 3, 4];
      sink1 = _.noop;
      sink2 = _.noop;
      var answer = [];
      peep = (sig) => Signal.onValue(function(value) {
        return answer.push(value);
      }, sig);
      peep(Signal.join(Signal.fromFunction(function(sink) {
        return sink1 = sink;
      }), Signal.fromFunction(function(sink) {
        return sink2 = sink;
      })));
      sink1(1);
      sink2(2);
      sink2(3);
      sink1(4);
      return expect(answer).to.deep.equal(expectedAnswer);
    });
    it('should be able to join with stops', function() {
      var expectedAnswer, peep;
      expectedAnswer = [1, 2, 3, 4];
      var answer = [];
      peep = (sig) => Signal.onValue(function(value) {
        return answer.push(value);
      }, sig);
      peep(Signal.join(Signal.fromArray([1, 2]), Signal.fromArray([3, 4])));
      return expect(answer).to.deep.equal(expectedAnswer);
    });
    it('should be able to create a combinatorics', function() {
      var allProducts, createSubSignal, firstData, lastSeen, mapProduct, peer;
      firstData = Signal.fromArray(['a', 'b']);
      lastSeen = null;
      createSubSignal = function(firstPart) {
        return Signal.fromArray(_.map(['1', '2'], function(b) {
          return [firstPart, b];
        }));
      };
      mapProduct = (sig) => Signal.map(createSubSignal, sig);
      allProducts = (sig) => Signal.foldp(function(total, pair) {
        return total.concat([pair]);
      }, [], sig);
      peer = (sig) => Signal.onValue(function(value) {
        return lastSeen = value;
      }, sig);
      peer(allProducts(Signal.flatten(mapProduct(firstData))));
      return expect(lastSeen).to.deep.equal([['a', '1'], ['a', '2'], ['b', '1'], ['b', '2']]);
    });
  });
  describe('merge with object', function() {
    it('should be able to merge mapping of signals to a signal of out put', function() {
      const objectGoingIn = {
        signalA: Signal.fromArray([1, 2]),
        signalB: Signal.fromArray(['a','b'])
      };
      const signalReturned = Signal.mergeObject(objectGoingIn);
      var answersReturned = [];
      const appendAnswers = (sig) => Signal.onValue(function(a) {
        return answersReturned.push(a);
      }, sig);
      appendAnswers(signalReturned);
      return expect(answersReturned).to.deep.equal([
        {
          signalA: 1
        }, {
          signalA: 2
        }, {
          signalA: 2,
          signalB: 'a'
        }, {
          signalA: 2,
          signalB: 'b'
        }
      ]);
    });
    it('should be able to merge mapping of signals to a signal of out put of latest', function() {
      const objectGoingIn = {
        signalA: Signal.getLatest(Signal.fromArray([1, 2])),
        signalB: Signal.getLatest(Signal.fromArray('ab'.split('') || []))
      };
      const signalReturned = Signal.mergeObject(objectGoingIn);
      var answersReturned = [];
      const appendAnswers = (sig) => Signal.onValue(function(a) {
        return answersReturned.push(a);
      }, sig);
      appendAnswers(signalReturned);
      console.log('answersReturned',answersReturned)
      return expect(answersReturned).to.deep.equal([
        {
          signalA: 2
        }, {
          signalA: 2,
          signalB: 'b'
        }
      ]);
    });
  });
});
