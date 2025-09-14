import { test } from "node:test";
import assert from "node:assert";
import { HashStore } from "./hashmap.ts";

await test("HashStore", () => {
    const h = new HashStore<string>(
        (key) => key.length,
        (a, b) => a === b,
    );
    h.set("a");
    h.set("b");
    h.set("aa");
    assert.strictEqual(h.get("a"), "a");
    assert.strictEqual(h.get("b"), "b");
    assert.strictEqual(h.get("aa"), "aa");
    assert.strictEqual(h.get("aaa"), undefined);
    assert.strictEqual(h.has("a"), true);
    assert.strictEqual(h.has("b"), true);
    assert.strictEqual(h.has("aa"), true);
    assert.strictEqual(h.has("aaa"), false);
    h.delete("a");
    assert.strictEqual(h.get("a"), undefined);
    assert.strictEqual(h.has("a"), false);
    assert.strictEqual(h.get("b"), "b");
    h.clear();
    assert.strictEqual(h.get("b"), undefined);
});
