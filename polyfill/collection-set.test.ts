import { test } from "node:test";
import assert from "node:assert";
import { Composite } from "./composite.ts";
import { _Set } from "./internal/originals.ts";
import { setPrototypeMethods } from "./collection-set.ts";

class Set<T> extends _Set<T> {}
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
