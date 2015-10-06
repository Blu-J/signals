# Signals

Thinking of changing values as an array over time. This allows mutliple signals to be joined, then mapped and filtered as if they where a array. This is not an original idea, libraries like [RxJS](https://github.com/Reactive-Extensions/RxJS) from reactive extensions, [baconjs](https://github.com/baconjs/bacon.js/), and also from languages from the future like [Elm Lange](http://elm-lang.org/).


## What Can it do for me

This library can help create a single directional, lazy, async, and composable system. First, signals is a good way of making sure that data is going one way by trying to be immutable. Second, it allows it to be lazy, it won't calculate the whole graph, from the inputs the output, untill both ends exist. This means that in the end, the process is really close to the [transducer](http://jlongster.com/Transducers.js--A-JavaScript-Library-for-Transformation-of-Data), by implementing in lazy data structure with elm's [foldp](http://package.elm-lang.org/packages/elm-lang/core/1.1.0/Signal). 

It is async, since it is for the most part, a linked list to a value in the future, or potentially in the future. At the moment, the library utilizes [Promise](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Promise). This means that values don't have to be known at the time of the creation, and that values can be added over time. So in the end, this is an extension of the idea of a promise, the idea of a linked list, and combining the two together. 

The composibility comes from the fact that the filter, map, combining, and folp are functions that take in functions and return a function. You could create a unique function quite easily, and be able to use that same function in multiple areas of the apps.
```javascript 
  const unique = signal.foldp ((last, current) => last === current ? signal.NONE : current, null)
  const uniquePositions = unique( positionSignal);
```
Notice that the function that we created is [functionally composable](https://en.wikipedia.org/wiki/Function_composition_(computer_science)).

## Ways to use

### Map and filter

Let us convert a signal of kepress into a signal of numbers.

```javascript
const keypressEventToKeyCode = signal.map ((e) =>  e.keyCode || e.charCode);
const onlyNumberKeypress = signal.filter ((keyCode) => keyCode >= 48 && keyCode <= 57);
const keyCodeToNumber = signal.map((keyCode)=> keyCode - 48);

const keypressEventsToNumbers = keyCodeToNumber(onlyNumberKeypress(keypressEventToKeyCode(keypressEventSignals)));

```



### Wrapping Events from outside Example

1. Wrap Event

```javascript
function watchEvent (element:element,event:string){
let destroyWatch = noop;
const clickSignal = signal.fromFunction(function(sink){
 element.addEventListener(event, sink);
 destroyWatch = () => element.removeEventListener(event,sink);
});
return [clickSignal,destroyWatch];
}
```

1. Wrap angular watch

```javascript
someAngularModule.controller(function($scope){
 const changingXValues = signal.fromFunction(function(sink){
  $scope.$watch('x',sink);
 });
});

```

## Benefits over others

The short answer is there is no real reason to use this library over others. 

### Why Over RxJS

This library is just what you need, and everything else that you need probably is not a good idea. One bad idea are subjects, which are stateful, which are [bad by Eric Meijer](https://social.msdn.microsoft.com/Forums/en-US/bbf87eea-6a17-4920-96d7-2131e397a234/why-does-emeijer-not-like-subjects?forum=rx). And there are multiple ways of doing things, this is also because reactive extensions is for more than one platform. This leads to inconsistancies. So in the end, it is simplicity over complexity here.

There is an idea that a stream is live or not, which has a optimization benefit, but also has a complexity that may not be useful. 

By having a smaller library, means that there is more consistancy in use. 

Errors are propagated as a subchannel in the events, when in reality probably should be wrapped by and Either functor or something similar. By not dealing with the error subchannel, and only having one channel, there is more simplicity. 


### Why Over Bacon-js

For the most part, the same as RxJS. 

### Why Over Elm-Lang

The fact that elm lang doesn't have a library for javascript consumption. What is added is the curried functions (map, reduce, foldp). Flatten is added. The merge object is a nice addition. 

