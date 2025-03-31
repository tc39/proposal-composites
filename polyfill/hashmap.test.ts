import { test } from "node:test";
import assert from "node:assert";
import { HashMap } from "./hashmap.ts";

await test("HashMap", () => {
    const h = new HashMap<string, number>(
        (key) => key.length,
        (a, b) => a === b,
    );
    h.set("a", 1);
    h.set("b", 2);
    h.set("aa", 3);
    assert.strictEqual(h.get("a"), 1);
    assert.strictEqual(h.get("b"), 2);
    assert.strictEqual(h.get("aa"), 3);
    assert.strictEqual(h.get("aaa"), undefined);
    assert.strictEqual(h.has("a"), true);
    assert.strictEqual(h.has("b"), true);
    assert.strictEqual(h.has("aa"), true);
    assert.strictEqual(h.has("aaa"), false);
    h.delete("a");
    assert.strictEqual(h.get("a"), undefined);
    assert.strictEqual(h.has("a"), false);
    assert.strictEqual(h.get("b"), 2);
    h.clear();
    assert.strictEqual(h.get("b"), undefined);
});
