import type { Composite } from "./composite.ts";
import { isNaN, NaN, apply, ownKeys, keyFor, _WeakMap, weakMapGet, weakMapSet, sort } from "./originals.ts";
import { assert } from "./utils.ts";

const seed = randomHash();
const TRUE = randomHash();
const FALSE = randomHash();
const NULL = randomHash();
const UNDEFINED = randomHash();
const SYMBOLS = randomHash();
const KEY = randomHash();

const hashCache = new WeakMap<symbol | object, number | typeof lazyCompositeHash>();
const symbolsInWeakMap = (() => {
    try {
        hashCache.set(Symbol(), 0);
        return true;
    } catch {
        return false;
    }
})();

const lazyCompositeHash = Symbol("lazy");
export function prepareLazyHash(input: Composite): void {
    assert(apply(weakMapGet, hashCache, [input]) === undefined);
    apply(weakMapSet, hashCache, [input, lazyCompositeHash]);
}

export function maybeHashComposite(input: Composite): number | undefined {
    let hash: number | typeof lazyCompositeHash = apply(weakMapGet, hashCache, [input]);
    if (hash !== lazyCompositeHash) {
        assert(typeof hash === "number");
        return hash;
    }
    return undefined;
}

/** A basic (non-cryptographic) hashing function for Composites */
export function hashComposite(input: Composite): number {
    let hash = maybeHashComposite(input);
    if (hash !== undefined) {
        return hash;
    }
    hash = 0;
    const keys = apply(ownKeys, null, [input]);
    let uniqueSymbols: symbol[] | undefined;
    for (let i = 0; i < keys.length; i++) {
        const key = keys[i];
        if (typeof key === "string") {
            hash ^= stringHash(key) ^ KEY;
            hash ^= hashValue(input[key as keyof typeof input]);
            continue;
        }
        assert(typeof key === "symbol");
        const regKey = keyFor(key);
        if (regKey !== undefined) {
            hash ^= symbolHash(key) ^ KEY;
            hash ^= hashValue(input[key as keyof typeof input]);
            continue;
        }
        if (uniqueSymbols === undefined) {
            uniqueSymbols = [];
        }
        uniqueSymbols.push(key);
    }
    if (uniqueSymbols !== undefined) {
        apply(sort, uniqueSymbols, [secretSymbolSort]);
        for (let i = 0; i < uniqueSymbols.length; i++) {
            const key = uniqueSymbols[i];
            hash ^= symbolHash(key) ^ KEY;
            hash ^= hashValue(input[key as keyof typeof input]);
        }
    }
    assert(apply(weakMapGet, hashCache, [input]) === lazyCompositeHash);
    apply(weakMapSet, hashCache, [input, hash]);
    return hash;
}

const secretSymbolOrder = new WeakMap<symbol, number>();
let nextOrder = 0;
function getSymbolOrder(input: symbol): number {
    let order = secretSymbolOrder.get(input);
    if (order === undefined) {
        order = nextOrder++;
        secretSymbolOrder.set(input, order);
    }
    return order;
}
function secretSymbolSort(a: symbol, b: symbol): number {
    return getSymbolOrder(a) - getSymbolOrder(b);
}

function hashValue(input: unknown): number {
    if (input === null) {
        return NULL;
    }
    switch (typeof input) {
        case "undefined":
            return UNDEFINED;
        case "boolean":
            return input ? TRUE : FALSE;
        case "number":
            return numberHash(input);
        case "bigint":
            return numberHash(Number(input));
        case "string":
            return stringHash(input);
        case "symbol":
            return symbolHash(input);
        case "object":
            return cachedHash(input);
        case "function":
            return cachedHash(input);
        default:
            throw new TypeError(`Unsupported input type: ${typeof input}`);
    }
}

const floatArray = new Float64Array(1);
const intArray = new Uint32Array(floatArray.buffer);
function numberHash(input: number): number {
    floatArray[0] = input === 0 ? 0 : isNaN(input) ? NaN : input;
    const hash = intArray[0] ^ intArray[1];
    return hash >>> 0;
}

function stringHash(input: string): number {
    let hash = seed;
    for (let i = 0; i < input.length; i++) {
        hash = (hash * 33) ^ input.charCodeAt(i);
    }
    return hash >>> 0;
}

function symbolHash(input: symbol): number {
    const regA = Symbol.keyFor(input);
    if (regA !== undefined) {
        return stringHash(regA) ^ SYMBOLS;
    }
    if (!symbolsInWeakMap) {
        return SYMBOLS;
    }
    return cachedHash(input);
}

function cachedHash(input: object | symbol): number {
    let hash = apply(weakMapGet, hashCache, [input]);
    if (hash === undefined) {
        hash = randomHash();
        apply(weakMapSet, hashCache, [input, hash]);
        return hash;
    }
    if (hash === lazyCompositeHash) {
        return hashComposite(input as Composite);
    }
    return hash;
}

function randomHash() {
    return (Math.random() * Number.MAX_SAFE_INTEGER) >>> 0;
}
