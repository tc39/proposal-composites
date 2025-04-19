# proposal Composites

Keys for Maps and Sets that represent a structured group of values.

## Status

Stage: 1

Champion(s): [Ashley Claymore](https://github.com/acutmore)

## The _issue_

Right now `Map` and `Set` always use [SameValueZero](https://tc39.es/ecma262/multipage/abstract-operations.html#sec-samevaluezero) for their internal equality predicate answering "Is this value in this collection?".

```js
new Set([42, 42]).size; // 1
const m = new Map();
m.set("hello", "world");
m.get("hello"); // "world";
```

This means that when it comes to objects, all objects are only equal to themselves. There is no capability to override this behavior and allow two different objects to be treated equal within the collection.

```js
const position1 = Object.freeze({ x: 1, y: 4 });
const position2 = Object.freeze({ x: 1, y: 4 });

const positions = new Set([position1, position2]);
positions.size; // 2
```

### Current workaround

One way to work around this limitation in JavaScript is to flatten the value to a string representation.

```js
const positions = new Set([JSON.stringify(position1), JSON.stringify(position2)]);
positions.size; // 1
```

The downsides of this are:

- It can be easy to construct incorrect strings, for example `JSON.stringify` will produce a different string if the object keys are enumerated in a different order or throw if the value does not have a built-in JSON representation.
- The collection now contains strings and not structured objects. To read the values back out they would need to be parsed.

Alternatively two collections can be used, one to track uniqueness and another to track values:

```js
const positions = [];
const positionKeys = new Set();
function add(position) {
    const asString = JSON.stringify(position);
    if (positionKeys.has(asString)) return;
    positions.push(position);
    positionKeys.add(asString);
}
```

The downsides of this are:

- Code needs to ensure the two collections are kept in-sync with each other.
- Extra noise/boilerplate to follow this pattern
- Same risk as above of flattening a value to a string

## The proposal

Introduce built-in 'composite values' with well defined equality.

```js
const pos1 = Composite({ x: 1, y: 4 });
const pos2 = Composite({ x: 1, y: 4 });
Composite.equal(pos1, pos2); // true

const positions = new Set(); // the standard ES Set
positions.add(pos1);
positions.has(pos2); // true
```

### What is a 'composite'

It is an object.

```js
typeof Composite({}); // "object"
```

Each call to `Composite(...)` returns a new object.

```js
Composite({}) !== Composite({}); // true
```

It does not modify the argument.

```js
const template = { x: 1 };
Composite(template) !== template; // true
```

The argument must be an object.

```js
Composite(null); // throws TypeError
```

They are not a class.

```js
Object.getPrototypeOf(Composite({})); // Object.prototype
new Composite({}); // throws TypeError
```

They are frozen.

```js
Object.isFrozen(Composite({})); // true
```

They expose the data they were constructed from.

```js
const c = Composite({ x: 1, y: 2 });
Object.keys(c); // ["x", "y"]
c.x; // 1
c.y; // 2
```

They can contain any value.

```js
const d = new Date();
const c = Composite({ d, zero: -0 });
c.d === d; // true
Object.is(c.zero, -0); // true
```

The key order matches the argument used to construct it ([#1](https://github.com/acutmore/proposal-composites/issues/1)).

```js
const c = Composite({ z: true, x: true, y: true });
Object.keys(c); // ["z", "x", "y"]
```

### What are the equality semantics?

Two composites are equal only if they have the same prototype ([#5](https://github.com/acutmore/proposal-composites/issues/5)) and their properties form the same set of key-value pairs.

The values of each property are considered equal if

- they are considered equal by `SameValueZero`
- or if they are both composites and considered as equal composites (deeply recursive).

As composites are immutable from birth checking their equality never leads to a cycle.

Checking if two composites are equal always terminates and never throws.

The equality of two composites never changes.

The equality of two composites is symmetric.

```js
const eq = Composite.equal;
const C = Composite;

eq(C({}), C({})); // true
eq(C({ a: 1 }), C({ a: 1 })); // true
!eq(C({ a: 1 }), C({ a: 1 , b: 2 })); // true

eq(C({
    z: 0
    c: C({})
  }),
  C({
    z: -0,
    c: C({})
  })); // true

!eq(C({ obj: {} }), C({ obj: {} })); // true
eq(C({ obj: globalThis }), C({ obj: globalThis })); // true
```

Composite equality would be used by:

- `Composite.equal`
- `Map`
- `Set`
- `Array.prototype.includes`
- `Array.prototype.indexOf` \*
- `Array.prototype.lastIndexOf` \*

> \* `indexOf` and `lastIndexOf` remain strict equality (`===`) when the argument is not a composite. When the argument is a composite they use the same equality as `includes` i.e. `Composite.equal`

And future proposals such as https://github.com/tc39/proposal-iterator-unique could also use it.

```js
someIterator.uniqueBy((obj) => Composite({ name: obj.name, company: obj.company }));
// or if the iterator already contains composites:
someIterator.uniqueBy();
```

## Other languages

Python:

```py
position1 = (1, 4)
position2 = (1, 4)

positions = set()
positions.add(position1)
positions.add(position2)

print(len(positions)) # 1
```

Clojure:

```clj
(def position1 '(1 4))
(def position2 '(1 4))
(count (set [position1 position2])) ; 1
```

## FAQ

### How to check if something is a composite?

`Composite.isComposite(arg)` only returns true for composites. A proxy with a composite as its target is not considered a composite.

### Can this be polyfilled?

Yes ["./polyfill"](./polyfill/).

Though like all JS polyfills it can only emulate internal slots with a local WeakMap. So a composite created by one instance of the polyfill would not be considered as being a composite by a separate instance of the polyfill, and would thus also not be equal.

### Should a composite's keys be sorted

Let's discuss in [#1](https://github.com/acutmore/proposal-composites/issues/1).

### Performance expectations

Creation of Composites should be similar to regular objects. The values do not need to be validated, or hashed eagerly. Composites would also need one extra flag stored to mark that they are composites, and potentially an additional hash value, so there is potential that they would consume more memory than a regular object. Storing data in composites avoids the need to flatten them into strings when wanting a map key, which may offset the additional memory consumption.

Comparison of two composites would be linear time. Comparing two composites that contain the same components is the worst case as we only know they are equal once everything has been compared. When two composites are not equal the equality finishes earlier as soon as the first difference is found. If two composites have different keys the equality can stop without needing to recurse into the values. It would be expected that composites store a hash value so that comparisons are more likely to find differences immediately and reduce collisions in Maps.

### Are composites deeply immutable?

Not necessarily. Composites are generic containers, so can contain any values. They are only deeply immutable if everything they contain are deeply immutable.

### Are keys enumerable?

Yes, all keys are

- enumerable: true
- configurable: false
- writable: false

### What about _Tuples_, or _ordinal_ rather than _nominal_ keys

The simplest thing we could do here (beyond nothing) is provide a convenience API for ordinal composites.

```js
Composite.of("a", "b", "c");
// Convenience (maybe more efficient) API for:
Composite({ 0: "a", 1: "b", 2: "c", length: 3 });
```

Or more advanced would be that these ordinal composites come with a prototype to allow list-like methods.

```js
const c = Composite.of("a", "b", "c");
Object.getPrototypeOf(c) !== Object.prototype; // true, some other prototype
Iterator.from(c); // implements Symbol.iterator
c.forEach((v) => console.log(v));
```

One idea is that it would be possible to create composites that are also array exotic objects.

```js
const c = Composite(["a", "b", "c"]);
Composite.isComposite(c); // true
Array.isArray(c); // true
Object.getPrototypeOf(c); // Array.prototype
```

This would have the advantage of being able to re-use the existing `Array.prototype` rather than creating more built-in methods. But overloading the concept of arrays (that can be mutable) with immutable composites may make the language harder to follow.

Let's discuss in [#2](https://github.com/acutmore/proposal-composites/issues/2).

### What about WeakMaps and WeakSets?

Composites act like regular objects in a `WeakMap` or `WeakSet`.

```js
const objs = new WeakSet();
const c1 = Composite({});
const c2 = Composite({});
objs.add(c1);
objs.has(c1); // true
objs.has(c2); // false
```

This is for a variety of reasons:

- Existing code that is putting objects in a `Weak{Map,Set}` is more likely to be expecting object referential keying.
- Composites are not guaranteed to contain lifetime bearing values such as regular objects or unique symbols
- It provides a way to still create a lookup that uses the object's reference as the key
- It's possible to create a custom `Weak{Map,Set}` that has special handling for composites in user-land.
- A follow-on proposal could propose a configurable `Weak{Map,Set}` with opt-in support composite weak-keys.

### Are composites new 'primitives'?

No. A composite is an object. It's `typeof` is `"object"`.

### Can composites be compared with `===` or `Object.is`?

There is no special behavior for composites with regards to `===` and `Object.is`.
Like all objects they are only equal if they are compared to themselves.

While this means that composite equality is not universally triggered across the entire language it makes them significantly easier to implement in existing engines.

There is also performance expectations that `===` is fast, close to `O(1)` when composites have linear equality `O(n)`.

### Why modify existing `Map` and `Set` semantics

Instead of changing the semantics of `Map` there could be a new special `CompositeMap`. The reason the proposal does not do this is that JS developers already can choose between using objects as dictionaries or `Map`. Giving a third option prompts the question "when should I use the old `Map`, and when should I use the new one?", and the answer would be "safest bet is to always use the new `Map`". If code has a composite and it's being put in a `Map` the code is more likely to have wanted composite key lookup so it would become a foot gun to use the wrong map.

It also is less clear how other APIs would provide the opt-in, such as https://github.com/tc39/proposal-iterator-unique.

By replacing all the existing places in the language that currently use `SameValueZero` to take composites into account almost avoids adding a 5th form of equality to the language. It does technically still add a 5th by updating `Array.prototype.indexOf` so that it aligns with `Array.prototype.includes` when the argument is a composite.

### Symbols keys?

Symbols keys are supported.

### Custom prototypes?

Let's discuss in [#4](https://github.com/acutmore/proposal-composites/issues/4).

### Why not a new protocol?

Why limit equality to only these composites values rather than let any object implement a new symbol protocol? The reason is reliability. To be able to participate as a `Map` key the equality must be pure, stable, and reliable, these guarantees would not come from a protocol that can execute arbitrary code. For example an object could have the symbol protocol added to it while it's in the map.

### Syntax?

There could be syntax to make creating composites more ergonomic and cleaner to read.

```js
#{ x: 1 };
// Syntax for:
Composite({ x: 1 });
```

Syntax may also make the creation of composites more efficient, due to the engine being able to create the composite directly instead of needing to create the object argument for `Composite(arg)`.

If there were [ordinal composites](#what-about-tuples-or-ordinal-rather-than-nominal-keys) they could also have syntax:

```js
#[1, 2, 3];
// Syntax for:
Composite.of(1, 2, 3);
```

### Why named properties instead of an ordered key?

On one hand it sounds simpler to start with a proposal where keys are lists instead of dictionaries, it could just be:

```js
const c = Composite(1, 4);
c[0]; // 1
c[1]; // 4
```

We instead encourage the components of the composite to be named to make the code easier to follow and avoid bugs where the indices are mixed up. We can see that this is how JavaScript is most commonly written today - code passes around objects with named properties rather than indexed lists.

### Why implement natively in the language?

Engines will have an advantage when it comes to implementing composites compared to user-land. Engines can access the existing hash value of objects and strings, and they can access the internals of `Map` and `Set`.

### How does this compare to [proposal-richer-keys](https://github.com/tc39/proposal-richer-keys)?

That proposal:

- Work as `Map` keys
- `compositeKey` takes an ordered list, not named properties
- The returned key is opaque with no properties and no prototype
- At least one of the values must be an object
- keys are strictly equal `compositeKey(Object) === compositeKey(Object)` (relies on GC for cleanup)
- Also has `compositeSymbol` to create `symbol` keys

This proposal:

- Work as `Map` keys
- Keys are made of named properties
- The returned key exposes the data and has a prototype
- No restriction on what the values must be
- keys are not `===` equal, they create fresh objects (no reliance on GC)
- All keys are objects, no 'symbol' keys

### How does this compare to [proposal-record-tuple](https://github.com/tc39/proposal-record-tuple)?

That proposal:

- Records work as `Map` keys
- Records can be compared using `===`
- Records are primitives with custom `typeof`
- Records have no prototype (`null`)
- Records cannot have symbol keys
- Records can only contain primitives (deeply immutable)

This proposal:

- Composites work as `Map` keys
- Composites are compared using `Composite.equal`
- Composites are objects
- Composites have a prototype
- Composites can have symbol keys
- Composites can contain any value (shallowly immutable)
