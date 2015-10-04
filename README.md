# Signals

Thinking of changing values as an array over time. This is not an original idea, libraries like [RxJS](https://github.com/Reactive-Extensions/RxJS) from reactive extensions, and also from languages from the future like [Elm Lange](http://elm-lang.org/).

# Why Another library

 RxJS does way to much, and we should have something that is simpler. Even [bacon js](https://baconjs.github.io/) is still not small. I also wanted something that was more functionally composable.

# What Can it do for me

This library can help create a single directional, lazy, async, and composable system. First, signals is a good way of making sure that data is going one way by trying to be immutable. Second, it allows it to be lazy, it won't calculate the whole graph, from the inputs the output, untill both ends exist. This means that in the end, the process is really close to the [transducer](http://jlongster.com/Transducers.js--A-JavaScript-Library-for-Transformation-of-Data), by implementing in lazy data structure with elm's [foldp](http://package.elm-lang.org/packages/elm-lang/core/1.1.0/Signal). 

It is async, since it is for the most part, a linked list to a value in the future, or potentially in the future. At the moment, the library utilizes [Promise](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Promise). This means that values don't have to be known at the time of the creation, and that values can be added over time. So in the end, this is an extension of the idea of a promise, the idea of a linked list, and combining the two together. 
```javascript
  const currentData = signals.fromFunction ((sink) => fetch('fakeData.com/table').then(sink));
```

The composibility comes from the fact that the filter, map, combining, and folp are functions that take in functions and return a function. You could create a unique function quite easily, and be able to use that same function in multiple areas of the apps.
```javascript 
  const unique = signals.foldp ((last, current) => last === current ? signal.NONE : current, null)
  const uniquePositions = unique( positionSignal);
```
Notice that the function that we created is [functionally composable](https://en.wikipedia.org/wiki/Function_composition_(computer_science)).

