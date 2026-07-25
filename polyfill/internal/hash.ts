import { isComposite } from "../composite.ts";
import { apply, weakMapGet, weakMapSet, Float64Array, Uint32Array } from "./originals.ts";
import { assert } from "./utils.ts";
import { randomHash, type Hasher } from "./murmur.ts";
import { maybeGetCompositeHash } from "./composite-class.ts";

const TRUE = randomHash();
const FALSE = randomHash();
const NULL = randomHash();
const UNDEFINED = randomHash();
const SYMBOLS = randomHash();
export const KEY = randomHash();
const OBJECTS = randomHash();

const numberBuffer = new Float64Array(1);
const numberBytes = new Uint32Array(numberBuffer.buffer);

const hashCache = new WeakMap<symbol | object, number>();
const symbolsInWeakMap = (() => {
    try {
        hashCache.set(Symbol(), 0);
        return true;
    } catch {
        return false;
    }
})();

export function updateHasher(hasher: Hasher, input: unknown): void {
    if (input === null) {
        hasher.update(NULL);
        return;
    }
    switch (typeof input) {
        case "undefined":
            hasher.update(UNDEFINED);
            return;
        case "boolean":
            hasher.update(input ? TRUE : FALSE);
            return;
        case "number":
            if ((input | 0) === input) {
                hasher.update(input);
            } else {
                numberBuffer[0] = input;
                hasher.update(numberBytes[0]);
                hasher.update(numberBytes[1]);
            }
            return;
        case "bigint":
        case "string":
            hasher.update(input);
            return;
        case "symbol":
            symbolUpdateHasher(hasher, input);
            return;
        case "object":
        case "function":
            hasher.update(cachedHash(input));
            return;
        default:
            throw new TypeError(`Unsupported input type: ${typeof input}`);
    }
}

function symbolUpdateHasher(hasher: Hasher, input: symbol): void {
    const regA = Symbol.keyFor(input);
    if (regA !== undefined) {
        hasher.update(SYMBOLS);
        hasher.update(regA);
        return;
    }
    if (!symbolsInWeakMap) {
        hasher.update(SYMBOLS);
        return;
    } else {
        hasher.update(cachedHash(input));
    }
}

let nextObjectId = 1;
function cachedHash(input: object | symbol): number {
    let maybeCompHash = typeof input === "object" ? maybeGetCompositeHash(input) : undefined;
    if (maybeCompHash !== undefined) {
        DEV: assert(isComposite(input));
        return maybeCompHash;
    }
    let hash = apply(weakMapGet, hashCache, [input]);
    if (hash === undefined) {
        hash = nextObjectId ^ OBJECTS;
        nextObjectId++;
        apply(weakMapSet, hashCache, [input, hash]);
        return hash;
    }
    return hash;
}
