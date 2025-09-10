import { test } from "node:test";
import assert from "node:assert";
import { Composite } from "./composite.ts";

await test("should throw an error when constructed with 'new'", () => {
    assert.throws(
        () => {
            // @ts-expect-error
            new Composite({});
        },
        {
            message: "Composite should not be constructed with 'new'",
        },
    );
});
await test("should throw an error when constructed with a non-object", () => {
    assert.throws(
        () => {
            // @ts-expect-error
            Composite(null);
        },
        {
            message: "Composite should be constructed with an object",
        },
    );
});
await test("creation", () => {
    assert.strictEqual(typeof Composite({}), "object");
    assert.strictEqual(Object.getPrototypeOf(Composite({})), Object.prototype);
    assert.deepStrictEqual(Reflect.ownKeys(Composite({ a: 1 })), ["a"]);
});
await test(".isComposite", () => {
    assert(Composite.isComposite(Composite({})));
    assert(!Composite.isComposite({}));
});
await test("key order", () => {
    const s1 = Symbol();
    const s2 = Symbol();
    const s3 = Symbol();
    const sA = Symbol.for("a");
    const sB = Symbol.for("b");
    const c = Composite({
        b: 0,
        a: 0,
        [0]: 0,
        [10]: 0,
        [s1]: 0,
        [sB]: 0,
        [s2]: 0,
        [sA]: 0,
        [s3]: 0,
    });
    const keys = Reflect.ownKeys(c);
    assert.deepStrictEqual(keys, ["0", "10", "b", "a", s1, sB, s2, sA, s3]);
});
await test(".equal non-composite equal", () => {
    assert(Composite.equal(-0, 0));
    assert(Composite.equal(Function, Function));
    assert(Composite.equal(globalThis, globalThis));
    assert(Composite.equal("abc", "abc"));
});
await test(".equal non-composite not-equal", () => {
    assert(!Composite.equal(1, 2));
    assert(!Composite.equal({}, {}));
    assert(
        !Composite.equal(
            () => {},
            () => {},
        ),
    );
});
await test(".equal composites", () => {
    const c1 = Composite({ a: 1 });
    const c2 = Composite({ a: 1 });
    assert(c1 !== c2, "c1 and c2 should not be the same object");
    assert(Composite.equal(c1, c2), "c1 and c2 should be equal");
    const c3 = Composite({ a: 2 });
    assert(!Composite.equal(c1, c3), "c1 and c3 should not be equal");
});
await test(".equal composites symbol props equal", () => {
    const s1 = Symbol();
    const s2 = Symbol();
    const c1 = Composite({ [s1]: 1, [s2]: 2 });
    assert(Composite.equal(c1, Composite({ [s1]: 1, [s2]: 2 })));
    assert(Composite.equal(c1, Composite({ [s2]: 2, [s1]: 1 })));
});
await test(".equal composites symbol props not-equal", () => {
    const s1 = Symbol();
    const s2 = Symbol();
    const c1 = Composite({ [s1]: 1 });
    assert(!Composite.equal(c1, Composite({ [s1]: 2 })), "value under symbol is different");
    assert(!Composite.equal(c1, Composite({ [s2]: 1 })), "symbol key is different");
});
await test(".equal deep", () => {
    const C = Composite;
    const c1 = C({ a: C({ b: C({ c: 1 }) }) });
    const c2 = C({ a: C({ b: C({ c: 1 }) }) });
    assert(Composite.equal(c1, c2), "Deeply nested composites c1 and c2 should be equal");

    const c3 = C({ a: C({ b: C({ c: 2 }) }) });
    assert(!Composite.equal(c1, c3), "Deeply nested composites c1 and c3 should not be equal");

    const c4 = C({
        a: C({ b: C({ c: 1, d: 2 }) }),
    });
    assert(!Composite.equal(c1, c4), "Deeply nested composites c1 and c4 should not be equal due to extra property");

    const c5 = C({
        a: C({ b: C({ c: 1 }) }),
        e: 3,
    });
    const c6 = C({
        a: C({ b: C({ c: 1 }) }),
        e: 3,
    });
    assert(Composite.equal(c5, c6), "Deeply nested composites c5 and c6 with additional properties should be equal");

    const c7 = C({
        a: C({ b: C({ c: 1 }) }),
        e: 4,
    });
    assert(
        !Composite.equal(c5, c7),
        "Deeply nested composites c5 and c7 should not be equal due to differing additional properties",
    );
});
await test(".equal composites decimal numbers", () => {
    const c1 = Composite({ a: 2.0 });
    const c2 = Composite({ a: 2.5 });
    assert(c1 !== c2, "c1 and c2 should not be the same object");
    assert(!Composite.equal(c1, c2), "c1 and c2 should not be equal");
    const c3 = Composite({ a: 2.5 });
    assert(c2 !== c3, "c2 and c3 should not be the same object");
    assert(Composite.equal(c2, c3), "c2 and c3 should be equal");
});
await test(".equal composites interesting decimal numbers", () => {
    const c1 = Composite({ a: 1 + Number.EPSILON });
    const c2 = Composite({ a: 1 + 2 * Number.EPSILON });
    assert(c1 !== c2, "c1 and c2 should not be the same object");
    assert(!Composite.equal(c1, c2), "c1 and c2 should not be equal");
    const c3 = Composite({ a: 1 + 2 * Number.EPSILON });
    assert(c2 !== c3, "c2 and c3 should not be the same object");
    assert(Composite.equal(c2, c3), "c2 and c3 should be equal");
});
