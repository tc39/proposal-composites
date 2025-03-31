import { test } from "node:test";
import assert from "node:assert";
import { Composite } from "./composite.ts";
import { Map } from "./collection-map.ts";

await test("Map", () => {
    const c1 = Composite({ a: 1 });
    const c2 = Composite({ a: 1 });
    const m = new Map<Composite | number, number>([
        [c1, 1],
        [42, 99],
        [c2, 2],
    ]);
    assert.strictEqual(m.size, 2);
    assert.strictEqual(m.get(Composite({ a: 1 })), 2);
    assert.strictEqual(m.get(Composite({ b: 1 })), undefined);
    assert.strictEqual(m.get(c1), 2);
    assert.strictEqual(m.get(c2), 2);
    assert.strictEqual(m.get(42), 99);

    assert.deepStrictEqual([...m], [
        [c2, 2],
        [42, 99],
    ]);
    assert.deepStrictEqual([...m.entries()], [
        [c2, 2],
        [42, 99],
    ]);
    assert.deepStrictEqual([...m.keys()], [c2, 42]);
    assert.deepStrictEqual([...m.values()], [2, 99]);
    assert([...m.keys()][0] === c2, "c2 should have replaced the reference to c1");

    assert(m.has(Composite({ a: 1 })));
    assert(!m.has(Composite({ a: 2 })));
    assert(!m.delete(Composite({ b: 1 })));
    assert(m.delete(Composite({ a: 1 })));
    assert.strictEqual(m.size, 1);
    m.clear();
    assert.strictEqual(m.size, 0);
});
