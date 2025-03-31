import { test } from "node:test";
import assert from "node:assert";
import { Composite } from "./composite.ts";
import {
    arrayPrototypeIncludes,
    arrayPrototypeIndexOf,
    arrayPrototypeLastIndexOf,
    arrayPrototypeMethods,
} from "./collection-array.ts";

await test("exports the replacements", () => {
    assert.deepStrictEqual(arrayPrototypeMethods, {
        includes: arrayPrototypeIncludes,
        indexOf: arrayPrototypeIndexOf,
        lastIndexOf: arrayPrototypeLastIndexOf,
    });
});

function makeArray(...args: unknown[]): unknown[] {
    Object.setPrototypeOf(args, {
        __proto__: Array.prototype,
        ...arrayPrototypeMethods,
    });
    return args;
}

await test("includes", () => {
    const arr = makeArray(2, NaN, Composite({ a: 1 }));
    assert(arr.includes(2));
    assert(!arr.includes(4));
    assert(arr.includes(NaN));
    assert(arr.includes(Composite({ a: 1 })));
    assert(!arr.includes(Composite({ b: 1 })));
});

await test("indexOf", () => {
    const arr = makeArray(2, NaN, Composite({ a: 1 }), 2, Composite({ a: 1 }));
    assert.strictEqual(arr.indexOf(2), 0);
    assert.strictEqual(arr.indexOf(4), -1);
    assert.strictEqual(arr.indexOf(NaN), -1);
    assert.strictEqual(arr.indexOf(Composite({ a: 1 })), 2);
    assert.strictEqual(arr.indexOf(Composite({ b: 1 })), -1);
});

await test("lastIndexOf", () => {
    const arr = makeArray(2, NaN, Composite({ a: 1 }), 2, Composite({ a: 1 }));
    assert.strictEqual(arr.lastIndexOf(2), 3);
    assert.strictEqual(arr.lastIndexOf(4), -1);
    assert.strictEqual(arr.lastIndexOf(NaN), -1);
    assert.strictEqual(arr.lastIndexOf(Composite({ a: 1 })), 4);
    assert.strictEqual(arr.lastIndexOf(Composite({ b: 1 })), -1);
});
