import { test } from "node:test";
import assert from "node:assert";
import VM from "node:vm";
import * as index from "./index.ts";

await test("index", () => {
    assert.deepStrictEqual(Object.keys(index).sort(), ["Composite", "install"]);
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

        const wm = new WeakMap();
        assert.throws(
            () => wm.set(c1, 1),
            /Invalid value used as weak map key/,
        );

        const ws = new WeakSet();
        assert.throws(
            () => ws.add(c1),
            /Invalid value used in weak set/,
        );

        if (typeof WeakRef === "function") {
            assert.throws(
                () => new WeakRef(c1),
                /Invalid value used in weak ref/,
            );
        }

        if (typeof FinalizationRegistry === "function") {
            const registry = new FinalizationRegistry(() => {});
            assert.throws(
                () => registry.register(c1, "held"),
                /Invalid value used in finalization registry/,
            );
            assert.throws(
                () => registry.register({}, "held", c1),
                /Invalid value used in finalization registry/,
            );
        }
    `,
        ctx,
    );
    ctx;
});
