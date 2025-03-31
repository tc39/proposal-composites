import { test } from "node:test";
import assert from "node:assert";
import { Composite } from "./composite.ts";
import { hashComposite } from "./hash.ts";

await test("unique symbol key order does not impact hash", () => {
    const s1 = Symbol();
    const s2 = Symbol();
    const c1 = Composite({ [s1]: 1, [s2]: 2 });
    const c2 = Composite({ [s2]: 2, [s1]: 1 });
    assert(Composite.equal(c1, c2));
    assert.strictEqual(hashComposite(c1), hashComposite(c2));
});

await test("hash is same value zero", () => {
    const c1 = Composite({ x: 0 });
    const c2 = Composite({ x: -0 });
    assert(Composite.equal(c1, c2));
    assert.strictEqual(hashComposite(c1), hashComposite(c2));
});

await test("non-composite objects have different hash values", () => {
    const c1 = Composite({ a: 1 });
    const c2 = Composite({ a: 2 });
    assert(!Composite.equal(c1, c2));
    assert.notStrictEqual(hashComposite(c1), hashComposite(c2));
});

function flip() {
    return Math.random() < 0.5;
}

function randomString() {
    if (Math.random() < 0.95) {
        return Math.random().toString(36).substring(2, 15);
    } else {
        return flip() ? "hello" : "world";
    }
}

function randomSymbol() {
    return flip() ? Symbol() : Symbol.for(randomString());
}

function randomKey() {
    return flip() ? randomString() : randomSymbol();
}

const preMade: object[] = [new Date(), Object.prototype];

function randomValue(): unknown {
    const types = [
        "number",
        "number",
        "number",
        "bigint",
        "bigint",
        "string",
        "string",
        "string",
        "boolean",
        "boolean",
        "null",
        "undefined",
        "object",
        "function",
    ];
    const type = types[Math.floor(Math.random() * types.length)];
    switch (type) {
        case "number":
            return Math.random() * 1000;
        case "bigint":
            return BigInt(Math.floor(Math.random() * 1000));
        case "string":
            return randomString();
        case "boolean":
            return Math.random() < 0.5;
        case "null":
            return null;
        case "undefined":
            return undefined;
        case "object":
            if (flip()) {
                return preMade[Math.floor(Math.random() * preMade.length)];
            } else {
                const newObject = flip() ? randomComposite() : new Date();
                preMade.push(newObject);
                return newObject;
            }
        case "function":
            return flip() ? () => {} : Function;
        default:
            throw new TypeError(`Unsupported type: ${type}`);
    }
}

function randomComposite(): Composite {
    const template: Record<string | symbol, unknown> = {};
    const numKeys = Math.floor(Math.random() * 10) + 1;
    for (let i = 0; i < numKeys; i++) {
        template[randomKey()] = randomValue();
    }
    return Composite(template);
}

await test("fuzz test for hash collisions", () => {
    const hashes = new Set<number>();
    const total = 100_000;
    let collisions = 0;
    for (let i = 0; i < total; i++) {
        const c = randomComposite();
        const hash = hashComposite(c);
        if (hashes.has(hash)) {
            collisions++;
        } else {
            hashes.add(hash);
        }
    }
    const limit = total * 0.01; // 1% collision rate (just for smoke test)
    assert(collisions < limit, `Collisions exceeded limit: ${collisions} > ${limit}`);
});
