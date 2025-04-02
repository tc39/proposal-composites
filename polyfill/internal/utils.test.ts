import { test } from "node:test";
import assert from "node:assert";
import { sameValueZero } from "./utils.ts";

await test("sameValueZero", () => {
    assert(sameValueZero(0, 0));
    assert(sameValueZero(0, -0));
    assert(sameValueZero(-0, 0));
    assert(sameValueZero(-0, -0));
    assert(sameValueZero("abc", "abc"));
    assert(sameValueZero(Function, Function));
    assert(sameValueZero(globalThis, globalThis));
    assert(!sameValueZero(0, 1));
    assert(!sameValueZero(0, {}));
    assert(!sameValueZero(0, () => {}));
});
