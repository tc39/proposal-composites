# proposal Composites

## The _issue_

Right now `Map` and `Set` always use [SameValueZero](https://tc39.es/ecma262/multipage/abstract-operations.html#sec-samevaluezero) for their internal equality predicate answering "Is this value in this collection?".

```js
new Set([42, 42]).size; // 1
new Set([{}, {}]).size; // 2;

const m = new Map();

m.set("hello", "world");
m.set({}, "object");

m.get("hello"); // "world";
m.has({}); // false
```

As shown above, this means that when it comes to objects, all objects are only equal to themselves. There is no capability to override this behavior and allow two different objects to be treated equal within the collection.

```js
const position1 = Object.freeze({ x: 0, y: 0 });
const position2 = Object.freeze({ x: 0, y: 0 });

const positions = new Set([position1, position2]);
positions.size; // 2
```

Whereas in Python:

```py
position1 = (0, 0)
position2 = (0, 0)

positions = set()
positions.add(position1)
positions.add(position2)

print(len(positions)) # 1
```

or Clojure:

```clj
(def position1 '(0 0))
(def position2 '(0 0))
(count (set [position1 position2])) ; 1
```

### Current workaround

One way to work around this limitation in JavaScript is to construct a string representation of the value.

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
Composite({}) === Composite({}); // false
```

It does not modify the argument.

```js
const template = { x: 1 };
Composite(template) === template; // false
```

The argument must be an object.

```js
Composite(null); // throws TypeError
```

They are not a 'type'.

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

The keys are sorted. IntegerIndex strings first, numerically. Then remaining strings lexicographically. [Symbols?](#symbols-keys).

```js
const c = Composite({ z: true, x: true, y: true, 10: true, 1: true });
Object.keys(c); // ["0", "10", "x", "y", "z"]
```

### What are the equality semantics?

Two composites are equal if their properties form the same set of key-value pairs.

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
eq(C({ a: 1 }), C({ a: 1 , b: 2 })); // false

eq(C({
    z: 0
    c: C({})
  }),
  C({
    z: -0,
    c: C({})
  })); // true

eq(C({ obj: {} }), C({ obj: {} }); // false
eq(C({ obj: globalThis }), C({ obj: globalThis }); // true
```

Composite equality would be used by:

- `Composite.equal`
- `Map`
- `Set`
- `Array.prototype.includes`
- `Array.prototype.indexOf`
- `Array.prototype.lastIndexOf`

And future proposals such as https://github.com/tc39/proposal-iterator-unique could also use it.

```js
someIterator.uniqueBy((obj) => Composite({ name: obj.name, company: obj.company }));
// or if the iterator already contains composites:
someIterator.uniqueBy();
```

While a composites's `[[proto]]` will be the `Object.prototype` from the realm that `Composite` comes from this does not impact equality. Composites from two different realms can be considered equal.

## FAQ

### How to check if something is a composite?

`Composite.isComposite(arg)` only returns true for composites. A proxy with a composite as its target is not considered a composite.

### Performance expectations

Creation of Composites should be similar to regular objects. The values do not need to be validated, or hashed eagerly. The main creation overhead compared to regular objects is that the key order is sorted. Composites would also need one extra flag stored to mark that they are composites, and potentially an additional hash value, so there is potential that they would consume more memory than a regular object. Storing data in composites avoids the need to flatten them into strings when wanting a map key, which may offset the additional memory consumption.

Comparison of two composites would be linear time. Comparing two composites that contain the same components is the worst case as we only know they are equal once everything has been compared. When two composites are not equal the equality finishes earlier as soon as the first difference is found. As composite keys are sorted this helps the linear scan of two composites to bail out early on a key difference. It would be expected that composites store a hash value so that comparisons are more likely to find differences immediately and reduce collisions in Maps.

### Are composites deeply immutable?

Not necessarily. Composites are generic container, so can contain any values. They are only deeply immutable if everything they contain are deeply immutable.

### What about _Tuples_, or _ordinal_ rather than _nominal_ keys

The simplest thing we could do here (beyond nothing) is provide a convenience API for ordinal composites.

```js
Composite.of("a", "b", "c");
// Convenience (maybe more efficient) API for:
Composite({ 0: "a", 1: "b", 2: "c", length: 3 });
```

Or more advanced would be that these ordinal composites come with a prototype to allow list-list methods.

```js
const c = Composite.of("a", "b", "c");
Object.getPrototypeOf(c) === Object.prototype; // false, some other prototype
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

### What about WeakMaps and WeakSets?

Composites are act like regular objects in a `WeakMap` or `WeakSet`.

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
- A follow-on proposal could add a configurable `Weak{Map,Set}` with opt-in config for supporting composite keys

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

By replacing all the existing places in the language that currently use `SameValueZero`

### Symbols keys?

The current [polyfill](./polyfill/) supports `Symbol()` keys if we want them.

Registered (`Symbol.for`) symbols are sorted by their key. Other symbols are not sorted, they retain the order from the object used to create the composite. The symbol ordering is ignored when it comes to equality.

As unique symbols (non-registered) are not observably orderable we may want to reject them as a property key of a composite. Instead symbol protocols, e.g. `Symbol.iterator` could be provided from a [custom prototype](#custom-prototypes).

### Custom prototypes?

Allowing composites to have a custom prototype make composites even more useful as a general data structure, reducing the need for apps to copy their data into composites and instead use composites as the data.

```js
const customProto = {
    *[Symbol.iterator]() {
        for (let i = this.start; i < this.end; i++) {
            yield i;
        }
    },
};
const c = Composite({ start: 0, end: 10 }, customProto);
Object.getPrototypeOf(c) === customProto; // true
```

Like regular composites, the prototype would be ignored when it comes to equality. Having unique equality can be opt-in by using a property to reflect the 'type'.

### Why not a new protocol?

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
#[1];
// Syntax for:
Composite.of(1);
```

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
- Records can only contain primitives (deeply immutable)

This proposal:

- Composites work as `Map` keys
- Composites are compared using `Composite.equal`
- Composites are objects
- Composites can contain any value (shallowly immutable)
