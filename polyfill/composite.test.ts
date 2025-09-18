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
await test("Throws for symbol keys", () => {
    assert.throws(
        () => {
            Composite({ [Symbol()]: true });
        },
        {
            message: "symbol keys not allowed"
        },
    );
});
await test("key order", () => {
    const c = Composite({
        b: 0,
        a: 0,
        [0]: 0,
        [10]: 0,
    });
    const keys = Reflect.ownKeys(c);
    assert.deepStrictEqual(keys, ["0", "10", "a", "b"]);
});
await test(".equal composites", () => {
    const c1 = Composite({ a: 1 });
    const c2 = Composite({ a: 1 });
    assert(c1 === c2, "c1 and c2 should be the same object");
    const c3 = Composite({ a: 2 });
    assert(c1 !== c3, "c1 and c3 should not be equal");
});
await test(".equal deep", () => {
    const C = Composite;
    const c1 = C({ a: C({ b: C({ c: 1 }) }) });
    const c2 = C({ a: C({ b: C({ c: 1 }) }) });
    assert(c1 === c2, "Deeply nested composites c1 and c2 should be equal");

    const c3 = C({ a: C({ b: C({ c: 2 }) }) });
    assert(c1 !== c3, "Deeply nested composites c1 and c3 should not be equal");

    const c4 = C({
        a: C({ b: C({ c: 1, d: 2 }) }),
    });
    assert(c1 !== c4, "Deeply nested composites c1 and c4 should not be equal due to extra property");

    const c5 = C({
        a: C({ b: C({ c: 1 }) }),
        e: 3,
    });
    const c6 = C({
        a: C({ b: C({ c: 1 }) }),
        e: 3,
    });
    assert(c5 === c6, "Deeply nested composites c5 and c6 with additional properties should be equal");

    const c7 = C({
        a: C({ b: C({ c: 1 }) }),
        e: 4,
    });
    assert(
        c5 !== c7,
        "Deeply nested composites c5 and c7 should not be equal due to differing additional properties",
    );
});
await test(".equal composites decimal numbers", () => {
    const c1 = Composite({ a: 2.0 });
    const c2 = Composite({ a: 2.5 });
    assert(c1 !== c2, "c1 and c2 should not be the same object");
    assert(c1 !== c2, "c1 and c2 should not be equal");
    const c3 = Composite({ a: 2.5 });
    assert(c2 === c3, "c2 and c3 should be the same object");
    assert(c2 === c3, "c2 and c3 should be equal");
});
await test(".equal composites interesting decimal numbers", () => {
    const c1 = Composite({ a: 1 + Number.EPSILON });
    const c2 = Composite({ a: 1 + 2 * Number.EPSILON });
    assert(c1 !== c2, "c1 and c2 should not be the same object");
    assert(c1 !== c2, "c1 and c2 should not be equal");
    const c3 = Composite({ a: 1 + 2 * Number.EPSILON });
    assert(c2 === c3, "c2 and c3 should be the same object");
    assert(c2 === c3, "c2 and c3 should be equal");
});
await test(".equal composites with polluted Object.prototype", () => {
    (Object.prototype as any)["pollution"] = true;
    try {
        const c1 = Composite({ pollution: true });
        const c2 = Composite({ other: true });
        assert(c1 !== c2, "c1 and c2 should not be equal");
    } finally {
        delete (Object.prototype as any)["pollution"];
    }
});

await test(".equal composites with different key order", () => {
    const c1 = Composite({ a: true, b: true });
    const c2 = Composite({ b: true, a: true });
    assert(c1 === c2, "c1 and c2 should be equal");
});

await test("equal composites are the same object", () => {
    const c1 = Composite({ a: true, b: true });
    const c2 = Composite({ a: true, b: true });
    assert(c1 === c2, "should be same object");
});
