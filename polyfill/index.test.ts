import { test } from "node:test";
import assert from "node:assert";
import VM from "node:vm";
import * as index from "./index.ts";

await test("index", () => {
    assert.deepStrictEqual(Object.keys(index).sort(), [
        "Composite",
        "arrayPrototypeMethods",
        "install",
        "mapPrototypeMethods",
        "setPrototypeMethods",
    ]);
});

await test("install", () => {
    // Given:
    const ctx = VM.createContext();
    const globalThat = VM.runInContext("globalThis", ctx);
    globalThat.assert = assert;
    assert.deepStrictEqual(VM.runInContext("typeof Composite", ctx), "undefined", "not already available");

    // When:
    index.install(globalThat);

    // Then:
    assert.deepStrictEqual(VM.runInContext("typeof Composite", ctx), "function");
    VM.runInContext(
        `
        const c1 = Composite({ x: 1 });
        const c2 = Composite({ x: 1 });
        const m = new Map();
        m.set(c1, 42);
        assert.equal(m.get(c1), 42);

        const s = new Set();
        s.add(c1);
        assert(s.has(c2));
    `,
        ctx,
    );
    ctx;
});
