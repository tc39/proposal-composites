# Composites proposal

Keys for Maps and Sets that represent a structured group of values.

## Status

Stage: [1](https://tc39.es/process-document/)

Champion(s): [Ashley Claymore](https://github.com/acutmore)

Draft Spec: https://tc39.es/proposal-composites

## The issue

Right now `Map` and `Set` always use [SameValueZero](https://tc39.es/ecma262/multipage/abstract-operations.html#sec-samevaluezero) to answer "Is this value in this collection?".

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

- It can be easy to construct incorrect strings. `JSON.stringify` for example:
  - Produces a different string if the object's keys are enumerated in a different order.
  - Omits values that have no JSON representation, such as functions and `undefined`.
  - Throws on a `BigInt` or a circular reference.
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
- Extra noise/boilerplate to follow this pattern.
- Same risk as above of flattening a value to a string.

## The proposal

Introduce built-in 'composite values' with well-defined equality.

> [!IMPORTANT]
> Expect changes. The design below is a starting point to evolve from as discussion continues.

```js
const pos1 = Composite({ x: 1, y: 4 });
const pos2 = Composite({ x: 1, y: 4 });
pos1 === pos2; // true

const positions = new Set(); // the standard ES Set
positions.add(pos1);
positions.has(pos2); // true

const itemAtPosition = new Map(); // the standard ES Map
itemAtPosition.set(pos1, "book");
itemAtPosition.get(Composite({ x: 1, y: 4 })); // "book"
```

> [!NOTE]
> The original proposal was not based on interning and can be viewed at commit [1c8c3f2f](https://github.com/tc39/proposal-composites/tree/1c8c3f2f7b8bf856debdb7237c6f52986a0e86dd).

### What is a 'composite'

It is an object.

```js
typeof Composite({}); // "object"
```

It is a collection of named values.

```js
const c = Composite({
  x: 42,
  y: -1,
  message: "hello"
});

c.x;       // 42
c.y;       // -1
c.message; // "hello"
```

Two composites with the same set of named values will be the same object (commonly known as interning).

```js
const c1 = Composite({ a: 1, b: 2 });
const c2 = Composite({ a: 1, b: 2 });
c1 === c2;         // true
Object.is(c1, c2); // true
```

The argument is not converted into a composite; it only provides the values.

```js
const template = { x: 1 };
Composite(template) !== template; // true
```

The argument must be an object.

```js
Composite(null); // throws TypeError 💥
```

Only the argument's own enumerable properties are used. Inherited and non-enumerable properties are ignored.

```js
const c = Composite({ own: 2, __proto__: { inherited: 1 } });
"inherited" in c; // false
c.own;            // 2
```

An own enumerable symbol key throws, because composites cannot have symbol keys (see [Symbol keys?](#symbol-keys)).

```js
Composite({ [Symbol()]: 1 }); // throws TypeError 💥
```

Any getters are invoked eagerly, exactly once, during creation - the composite stores the value that was returned, not the getter itself.

```js
let calls = 0;
const c = Composite({
  get x() {
    calls++;
    return 42;
  },
});
calls === 1; // true
```

They are not a class.

```js
Object.getPrototypeOf(Composite({})); // null
new Composite({}); // throws TypeError 💥
```

They are frozen.

```js
Object.isFrozen(Composite({})); // true
```

They can contain any value...

```js
const d = new Date();
const f = () => {};
const s = Symbol();
const u = undefined;
const c = Composite({ d, f, s, u });
c.d === d; // true
c.f === f; // true
c.s === s; // true
"u" in c;  // true
c.u;       // undefined
```

...except `-0` which is [normalized to `0`](#why-is--0-normalized-to-0).

```js
const c = Composite({ zero: -0 });
Object.is(c.zero, -0); // false
Object.is(c.zero, 0);  // true
```

### What determines if two inputs will be interned to the same composite?

Given two calls `Composite(a)` and `Composite(b)`. The 2nd call will return the same object as the first if:

- `a` and `b` are both objects
  - otherwise the creation would have failed
- `a` and `b` must have the same number of enumerable string keys
- for every enumerable key in `b`
  - that key must be a string
    - otherwise the creation would have failed
  - that key must also have been in `a` (the order does not matter)
  - the value of that key must be equal to the value of that key in `a` according to [`SameValueZero`](https://tc39.es/ecma262/multipage/abstract-operations.html#sec-samevaluezero)


#### Equal composites:

```js
Composite({}) === Composite({});
Composite({ b:2, a:1 }) === Composite({ a:1, b:2 });
Composite({ v:0 }) === Composite({ v:-0 }); // `-0` is normalized to `0`
Composite({ v:NaN }) === Composite({ v:NaN });

Composite({ c: Composite({}) }) === Composite({ c: Composite({}) });

const someObject = {};
Composite({ v:someObject }) === Composite({ v:someObject });
```

#### Unequal composites:

```js
Composite({ a:1 }) !== Composite({});
Composite({ a:1 }) !== Composite({ a:1, b:undefined });
Composite({ v:{} }) !== Composite({ v:{} });
```

### What equality semantics are guaranteed?

- Because composites are interned, comparing them is just pointer equality, so it always terminates and never throws.
- The equality of two composites never changes.
- Equality is an equivalence relation:
  - _reflexive_: a composite is always equal to itself (`c === c`).
  - _symmetric_: if `c1 === c2` then `c2 === c1`.
  - _transitive_: if `c1 === c2` and `c2 === c3` then `c1 === c3`.

## Other languages

In Python a frozen `dataclass` has value-based equality and is hashable:

```py
from dataclasses import dataclass

@dataclass(frozen=True)
class Position:
    x: int
    y: int

position1 = Position(x=1, y=4)
position2 = Position(x=1, y=4)

positions = set()
positions.add(position1)
positions.add(position2)

print(len(positions)) # 1
```

In Clojure maps have value-based equality that does not depend on key order:

```clj
(def position1 {:x 1 :y 4})
(def position2 {:y 4 :x 1})
(count (set [position1 position2])) ; 1
```

## FAQ

### How to check if something is a composite?

`Composite.isComposite(arg)` only returns true for composites.

A proxy with a composite as its target is not considered a composite.

### Performance expectations

Once created, the cost of comparing two composites is constant time; the runtime only needs to compare their memory addresses.

The cost of creating a composite increases the more keys it contains, and may also be impacted by the current [_load factor_](https://en.wikipedia.org/wiki/Hash_table) on the internal composite interning cache.

There will also be a non-zero cost for the garbage collector (GC) to reclaim space for no longer in-use composites - this cost will depend on the implementation of the GC.

### Are composites deeply immutable?

Not necessarily. Composites are generic containers, so can contain any values. They are only deeply immutable if everything they contain is deeply immutable.

### Are keys enumerable?

Yes, all keys are:

- enumerable: true
- configurable: false
- writable: false

### Are keys sorted?

Yes. A composite's keys are sorted, so the enumeration order of a composite does not depend on the order the keys appeared in the argument.

```js
Object.keys(Composite({ b: 1, a: 2 })); // ["a", "b"]
```

This gives composites a canonical form: `Composite({ a: 1, b: 2 })` and `Composite({ b: 2, a: 1 })` are the same object, with the same key order.

Integer-indexed keys come first, in ascending numeric order, just like regular objects. Followed by the remaining string keys in lexicographically sorted order.

```js
Object.keys(Composite({ x: true, 10: true, 2: true, a: true })); // ["2", "10", "a", "x"]
```

### Why is `-0` normalized to `0`?

It is already the case that `-0` is `===` equal to `0`, and is normalized to `0` when used as a `Set` value or `Map` key. So, by the principle of least surprise, it is normalized to `0` in a composite too, so that the following holds:

```js
const zero = Composite({ v: 0 });
const negZero = Composite({ v: -0 });
zero === negZero;
new Set([zero, negZero]).size === 1;
```

Normalization also keeps the stored value deterministic. `SameValueZero` already treats `0` and `-0` as equal, so `Composite({ v: 0 })` and `Composite({ v: -0 })` intern to the same object either way. Without normalization the value read back from `.v` would depend on which of the two calls happened to create that object first. Normalizing to `0` removes that ordering dependency.

#### `preserveNegativeZero:true`

If an application has a use case for preserving `-0` they can opt-in to this via the `preserveNegativeZero` option:

```js
const realNegZero = Composite({ v: -0 }, { preserveNegativeZero: true });
const zero = Composite({ v: 0 });
Object.is(realNegZero.v, -0); // true
realNegZero === zero; // false - different composite objects
```

Once a composite has been created with this option enabled its values are preserved if passed back into the `Composite` function:

```js
Object.is(Composite(realNegZero).v, -0); // true
```

This means that the following will always hold:

```js
if (Composite.isComposite(v)) {
  assert(Composite(v) === v);
}
```

### Why is `NaN` considered equal?

This falls out of the `SameValueZero`-based interning semantics (`[NaN].includes(NaN) === true`). Composites made from the same key-value pairs return the same object, and objects are equal to themselves.

Saying `Composite({ v: NaN }) !== Composite({ v: NaN })` would either break the rule that objects are always equal to themselves (In fact `NaN` is the only value that is not equal to itself, and existing code relies on this to detect `NaN`). Or it would mean that trying to intern a composite that includes at least one `NaN` would always return a new object, which would not be particularly useful and a likely source of memory leaks.

### What about WeakMaps and WeakSets?

Composites cannot be used in a weak position. They **cannot** be a key in a `WeakMap`, a value in a `WeakSet`, the target of a `WeakRef`, or registered with a `FinalizationRegistry`.

```js
const objs = new WeakSet();
objs.add(Composite({})); // throws TypeError 💥
```

Allowing them to be used in weak positions would likely result in memory leaks.

If you need to track the lifetime of composites that contain regular trackable objects this can be achieved with a userland library that iterates the composite's constituent values and tracks those instead.

### Are composites new 'primitives'?

No. A composite is an object. Its `typeof` is `"object"`.

`===` equality works for composites because objects are already `===` to themselves.

### Symbol keys?

Composites cannot contain symbol keys (Symbols can still be used as values).

The reason composites have string keys is to give a concrete name to the key's constituents (see [nominal keys](#what-about-tuples-or-ordinal-rather-than-nominal-keys)).

Also, composites sort their keys to produce a canonical form (see [Are keys sorted?](#are-keys-sorted)), and there is no stable, information-hiding, way to sort symbols.

- Registered symbols (`Symbol.for("...")`) could be sorted by their registration key, but only supporting registered symbols would not add significant value.
- Unique symbols (`Symbol()`) could only be sorted if they had distinct descriptions, which again does not provide much value - and symbols with no description, or with duplicate descriptions, could not be ordered at all.
    - Sorting unique symbols by the order they were created would be too subtle and reveal currently secret information.
- The most valuable symbols to support would be the well-known symbols such as `Symbol.iterator`. But these do not have a defined sort order either, and are not directly distinguishable from unique symbols.

Given this complexity, the cleanest rule is to not allow any symbol keys. This leaves room for a future proposal to explore supporting the situations where symbol keys could technically be implemented correctly if the need arises.

### Why not a new protocol?

Why limit equality to only these composite values rather than let any object implement a new symbol protocol?

#### Hash values are not exposed

For the protocol to be effective for `Map` and `Set` keys it would need to return a hash value, but the language does not expose a hash value for any existing values - most notably strings.

#### Side-effect free

Both `===` and `Object.is` are expected to be pure functions that do not trigger user code. A protocol-based equality would not work for these.

#### Reliability

To be able to participate as a `Map` key the equality must be pure, stable, and reliable. These guarantees could not be provided by a protocol that runs arbitrary code - for example, an object could have the symbol protocol added to it while it is in the map.

#### Not precluded

The language could still add a symbol based protocol with collections (e.g. `ProtocolMap`, `ProtocolSet`) that supported it. This proposal does not prevent that.

### Why named properties instead of an ordered key?

On one hand it sounds simpler to start with a proposal where keys are lists instead of dictionaries, it could just be:

```js
const c = Composite(1, 4);
c[0]; // 1
c[1]; // 4
```

We instead encourage the constituents of the composite to be named to make the code easier to follow and avoid bugs where the indices are mixed up.

### What about _Tuples_, or _ordinal_ rather than _nominal_ keys?

If code really did want ordinal keys the simplest thing we could do here (beyond nothing) is provide a convenience API for ordinal composites.

```js
Composite.of("a", "b", "c");
// Convenience API for:
Composite({ 0: "a", 1: "b", 2: "c", length: 3 });
```

That said, this may not be particularly useful because the resulting composite:

- `length` would be enumerable
- No `Symbol.iterator`

Additionally due to the cost of creating a composite growing with the number of keys it may not be wise to encourage list-like keys. Code may instead be better off using a linked-list like structure depending on the use case.

### Syntax?

There could be syntax to make creating composites more ergonomic and cleaner to read.

```js
#{ x: 1 };
// Syntax for:
Composite({ x: 1 });
```

Such syntax may open the door to some runtime optimizations.

Syntax would be a separate follow-on proposal - after the Composites API has had time on its own in the ecosystem to see usage.

### Can this be polyfilled?

Yes ["./polyfill"](./polyfill/).

Though, like all JS polyfills, it only has local internal state. So two separate polyfills would not create composites that are equal to each other.

### Do composites work across realms?

Yes. Natively, composites are interned per-agent and are equal across realms (for example across same-origin iframes), in the same way that symbols obtained from `Symbol.for` are shared across realms.

A composite returned from one realm's `Composite` function does not bear any relationship to the realm that created it - its prototype is `null`.

As noted above, separate polyfills each have their own local interning state and so do not produce composites that are equal to each other, so would not be equal across realms unless those realms shared the same polyfill instance.

### Why implement natively in the language?

Being able to create multi-value `Map` and `Set` keys is a common need across many application domains.

Being part of the language means that keys created by different parts of an application will still be equal, without the risk of using two different interning libraries.

Additionally, [experimental implementations](https://github.com/tc39/proposal-composites/issues/27) of the proposal show that there is a significant advantage to implementing composites natively with direct access to engine internals over implementing in pure JS. For example, engines can directly access any existing internal hash values of a string.

### Can composites form a cycle?

A composite is frozen when it is created and can only directly refer to a value that already existed before it was created. So nested composites never create a cycle.

A non-composite object held within a composite may itself refer back to that composite but composite interning stops at non-composite objects so would not lead to a composite cycle.

When traversing a composite, code can use `Composite.isComposite` to ensure it stops recursing when it reaches the _leaves_ of the composite _tree_.

### How does this compare to [proposal-richer-keys](https://github.com/tc39/proposal-richer-keys)?

That proposal:

- `compositeKey` takes an ordered list, not named properties
- The returned key is opaque with no properties
- At least one of the values must be an object
- Key can be used in `WeakMap` (and other weak APIs)

This proposal:

- Keys are made of named properties
- The returned key exposes the data
- No restriction on what the values must be
- Key can not be used in a `WeakMap` (or any weak API)

### How does this compare to [proposal-record-tuple](https://github.com/tc39/proposal-record-tuple)?

That proposal:

- Records are new primitives with a custom `typeof`
- Records can only contain primitives (deeply immutable)
- Had syntax `#{ ... }`

This proposal:

- Composites are objects
- Composites can contain any value (shallowly immutable)
- Does not introduce syntax
