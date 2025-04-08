import { test } from "node:test";
import assert from "node:assert";
import { Composite } from "./composite.ts";
import { Set as OGSet } from "./internal/originals.ts";
import { setPrototypeMethods } from "./collection-set.ts";

class Set<T> extends OGSet<T> {}
for (const [key, method] of Object.entries(setPrototypeMethods)) {
    (Set.prototype as any)[key] = method;
}

await test("Set", () => {
    const c1 = Composite({ a: 1 });
    const c2 = Composite({ a: 1 });
    const s = new Set<Composite | number>([c1, 42, c2]);
    assert.strictEqual(s.size, 2);
    assert(s.has(Composite({ a: 1 })));
    assert(s.has(c1));
    assert(s.has(c2));
    assert(!s.has(Composite({ b: 1 })));
    assert(s.has(42));

    assert.deepStrictEqual([...s], [c2, 42]);
    assert.deepStrictEqual(
        [...s.entries()],
        [
            [c2, c2],
            [42, 42],
        ],
    );
    assert.deepStrictEqual([...s.keys()], [c2, 42]);
    assert.deepStrictEqual([...s.values()], [c2, 42]);
    assert([...s.keys()][0] === c1, "c1 should not be replaced by c2");

    assert(!s.delete(Composite({ b: 1 })));
    assert(s.delete(Composite({ a: 1 })));
    assert.strictEqual(s.size, 1);
    s.clear();
    assert.strictEqual(s.size, 0);
});

await test("Set union", () => {
    const s1 = new Set([Composite({ a: 1 }), Composite({ b: 1 })]);

    const s2 = new Set([Composite({ b: 1 }), Composite({ c: 1 })]);

    const union = [...s1.union(s2)];
    assert.deepStrictEqual(union, [Composite({ a: 1 }), Composite({ b: 1 }), Composite({ c: 1 })]);
});

await test("Set intersection", () => {
    const s1 = new Set([Composite({ a: 1 }), Composite({ b: 1 })]);

    const s2 = new Set([Composite({ b: 1 }), Composite({ c: 1 })]);

    const intersection = [...s1.intersection(s2)];
    assert.deepStrictEqual(intersection, [Composite({ b: 1 })]);
});

await test("Set difference", () => {
    const s1 = new Set([Composite({ a: 1 }), Composite({ b: 1 })]);

    const s2 = new Set([Composite({ b: 1 }), Composite({ c: 1 })]);

    const difference = [...s1.difference(s2)];
    assert.deepStrictEqual(difference, [Composite({ a: 1 })]);
});

await test("Set symmetricDifference", () => {
    const s1 = new Set([Composite({ a: 1 }), Composite({ b: 1 })]);

    const s2 = new Set([Composite({ b: 1 }), Composite({ c: 1 })]);

    const symmetricDifference = [...s1.symmetricDifference(s2)];
    assert.deepStrictEqual(symmetricDifference, [Composite({ a: 1 }), Composite({ c: 1 })]);
});

await test("Set isSubsetOf", () => {
    const s1 = new Set([Composite({ a: 1 }), Composite({ b: 1 })]);

    const s2 = new Set([Composite({ a: 1 }), Composite({ b: 1 }), Composite({ c: 1 })]);

    assert(s1.isSubsetOf(s2));
    assert(!s2.isSubsetOf(s1));
});

await test("Set isSupersetOf", () => {
    const s1 = new Set([Composite({ a: 1 }), Composite({ b: 1 })]);

    const s2 = new Set([Composite({ a: 1 }), Composite({ b: 1 }), Composite({ c: 1 })]);

    assert(!s1.isSupersetOf(s2));
    assert(s2.isSupersetOf(s1));
});

await test("Set isDisjointFrom", () => {
    const s1 = new Set([Composite({ a: 1 }), Composite({ b: 1 })]);

    const s2 = new Set([Composite({ c: 1 })]);

    const s3 = new Set([Composite({ b: 1 })]);

    assert(s1.isDisjointFrom(s2));
    assert(!s1.isDisjointFrom(s3));
});
