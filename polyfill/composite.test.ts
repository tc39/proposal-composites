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
    assert.strictEqual(Object.getPrototypeOf(Composite({})), null);
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
            name: "TypeError",
            message: "symbol keys not allowed",
        },
    );
});
await test("only own enumerable properties are used", () => {
    const arg: Record<string, number> = { shown: 1 };
    Object.defineProperty(arg, "hidden", { value: 2, enumerable: false });
    const c = Composite(arg);
    assert.deepStrictEqual(Reflect.ownKeys(c), ["shown"]);
    assert.strictEqual((c as any).hidden, undefined);
});
await test("inherited properties are ignored", () => {
    const c = Composite({ own: 2, __proto__: { inherited: 1 } });
    assert.deepStrictEqual(Reflect.ownKeys(c), ["own"]);
    assert(!("inherited" in c));
});
await test("non-enumerable symbol keys are ignored", () => {
    const arg = {};
    Object.defineProperty(arg, Symbol(), { value: 1, enumerable: false });
    const c = Composite(arg);
    assert.deepStrictEqual(Reflect.ownKeys(c), []);
});
await test("enumerable symbol keys throw", () => {
    assert.throws(() => Composite({ [Symbol()]: 1 }), {
        name: "TypeError",
        message: "symbol keys not allowed",
    });
});
await test("getters are invoked eagerly, exactly once", () => {
    let calls = 0;
    const c = Composite({
        get x() {
            calls++;
            return 42;
        },
    });
    assert.strictEqual(calls, 1);
    assert.strictEqual((c as any).x, 42);
});
await test("values are read in the argument's own-key order, not sorted order", () => {
    const order: string[] = [];
    // Own-key order here is ["b", "a"]; sorted order would be ["a", "b"].
    Composite({
        get b() {
            order.push("b");
            return 1;
        },
        get a() {
            order.push("a");
            return 2;
        },
    });
    assert.deepStrictEqual(order, ["b", "a"]);
});
await test("Identity constructor", () => {
    const c = Composite({});
    const c2 = Composite(c);
    assert(c === c2, "composite in, same composite out");
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
await test("integer-index keys sort numerically, not lexicographically", () => {
    const c = Composite({
        [10]: 0,
        [2]: 0,
    });
    const keys = Reflect.ownKeys(c);
    assert.deepStrictEqual(keys, ["2", "10"]);
});
await test("interning composites", () => {
    const c1 = Composite({ a: 1 });
    const c2 = Composite({ a: 1 });
    assert(c1 === c2, "c1 and c2 should be the same object");
    const c3 = Composite({ a: 2 });
    assert(c1 !== c3, "c1 and c3 should not be equal");
});
await test("interning deep", () => {
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
    assert(c5 !== c7, "Deeply nested composites c5 and c7 should not be equal due to differing additional properties");
});
await test("interning composites decimal numbers", () => {
    const c1 = Composite({ a: 2.0 });
    const c2 = Composite({ a: 2.5 });
    assert(c1 !== c2, "c1 and c2 should not be the same object");
    assert(c1 !== c2, "c1 and c2 should not be equal");
    const c3 = Composite({ a: 2.5 });
    assert(c2 === c3, "c2 and c3 should be the same object");
    assert(c2 === c3, "c2 and c3 should be equal");
});
await test("interning composites interesting decimal numbers", () => {
    const c1 = Composite({ a: 1 + Number.EPSILON });
    const c2 = Composite({ a: 1 + 2 * Number.EPSILON });
    assert(c1 !== c2, "c1 and c2 should not be the same object");
    assert(c1 !== c2, "c1 and c2 should not be equal");
    const c3 = Composite({ a: 1 + 2 * Number.EPSILON });
    assert(c2 === c3, "c2 and c3 should be the same object");
    assert(c2 === c3, "c2 and c3 should be equal");
});
await test("interning composites NaN", () => {
    const c1 = Composite({ a: NaN });
    const c2 = Composite({ a: NaN });
    assert(c1 === c2, "NaN values should intern to the same object");
    const c3 = Composite({ a: 1 });
    assert(c1 !== c3, "NaN and a number should not be equal");
});
await test("NaN payloads are canonicalized and cannot leak through interning", () => {
    // Build NaNs with distinct bit patterns via a typed array.
    // If a composite stored the original bit pattern rather than
    // a canonical NaN, that pattern would be an observable side channel.
    const bytes = new Uint8Array(8);
    const f64 = new Float64Array(bytes.buffer);
    const makeNaN = (low: number, hi = 0x7f) => {
        bytes.fill(0);
        bytes[6] = 0xf8;
        bytes[7] = hi;
        bytes[0] = low;
        return f64[0];
    };
    const bytesOf = (n: number) => new Uint8Array(new Float64Array([n]).buffer).join(",");

    const nanA = makeNaN(0x01);
    const nanB = makeNaN(0x02);
    const nanNeg = makeNaN(0x00, 0xff); // sign bit set
    // Precondition: all NaN, with distinct observable bit patterns.
    assert(Number.isNaN(nanA) && Number.isNaN(nanB) && Number.isNaN(nanNeg));
    assert.notStrictEqual(bytesOf(nanA), bytesOf(nanB));
    assert.notStrictEqual(bytesOf(nanA), bytesOf(NaN));

    // Every NaN payload interns to the same composite.
    const cA = Composite({ a: nanA });
    assert(cA === Composite({ a: nanB }), "differing NaN payloads must intern equal");
    assert(cA === Composite({ a: nanNeg }), "NaN sign/payload must not affect interning");
    assert(cA === Composite({ a: NaN }), "canonical NaN interns with the rest");

    // The stored value is the canonical NaN — the original payload does not leak.
    assert.strictEqual(bytesOf((cA as any).a), bytesOf(NaN));
});
await test("interning composites with polluted Object.prototype", () => {
    (Object.prototype as any)["pollution"] = true;
    try {
        const c1 = Composite({ pollution: true });
        const c2 = Composite({ other: true });
        assert(c1 !== c2, "c1 and c2 should not be equal");
    } finally {
        delete (Object.prototype as any)["pollution"];
    }
});

await test("interning composites with different key order", () => {
    const c1 = Composite({ a: true, b: true });
    const c2 = Composite({ b: true, a: true });
    assert(c1 === c2, "c1 and c2 should be equal");
});

await test("interning is independent of the argument's own-key order", () => {
    // A plain object literal always reports integer-index keys in ascending
    // numeric order, so a Proxy is needed to present the same keys in an
    // arbitrary order and prove the composite canonicalizes them.
    const makeProxy = (keys: string[]) =>
        new Proxy({ a: 3, [2]: 2, [10]: 1 } as Record<string, number>, {
            ownKeys: () => keys,
        });
    const c1 = Composite(makeProxy(["10", "2", "a"]));
    const c2 = Composite(makeProxy(["a", "2", "10"]));
    assert(c1 === c2, "should intern regardless of the order keys are presented");
    assert.deepStrictEqual(Reflect.ownKeys(c1), ["2", "10", "a"]);

    const c3 = Composite(makeProxy(["2", "a", "10"]));
    assert(c1 === c3, "presentation order must not affect interning");
    const c4 = Composite({ a: 3, [2]: 2, [10]: 9 });
    assert(c1 !== c4, "differing integer-key values should not intern");
});

await test("equal composites are the same object", () => {
    const c1 = Composite({ a: true, b: true });
    const c2 = Composite({ a: true, b: true });
    assert(c1 === c2, "should be same object");
});
