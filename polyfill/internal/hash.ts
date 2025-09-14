import { isComposite, type Composite } from "../composite.ts";
import { isNaN, NaN, apply, ownKeys, keyFor, weakMapGet, weakMapSet, sort, localeCompare } from "./originals.ts";
import { assert } from "./utils.ts";
import { randomHash, MurmurHashStream, type Hasher } from "./murmur.ts";
import { getCompositeHash, maybeGetCompositeHash, setHash } from "./composite-class.ts";

const TRUE = randomHash();
const FALSE = randomHash();
const NULL = randomHash();
const UNDEFINED = randomHash();
const SYMBOLS = randomHash();
const KEY = randomHash();
const OBJECTS = randomHash();

const hashCache = new WeakMap<symbol | object, number>();
const symbolsInWeakMap = (() => {
    try {
        hashCache.set(Symbol(), 0);
        return true;
    } catch {
        return false;
    }
})();

const keySortArgs = [keySort];
export function hashComposite(input: Composite): number {
    const cachedHash = getCompositeHash(input);
    if (cachedHash !== 0) {
        return cachedHash;
    }
    const hasher = new MurmurHashStream();
    const keys = ownKeys(input);
    apply(sort, keys, keySortArgs);
    for (let i = 0; i < keys.length; i++) {
        const key = keys[i];
        if (typeof key === "string") {
            hasher.update(KEY);
            hasher.update(key);
            updateHasher(hasher, input[key as keyof typeof input]);
            continue;
        }
        DEV: assert(typeof key === "symbol");
        if (!symbolsInWeakMap && keyFor(key) === undefined) {
            // Remaining keys can't be hashed in this JS engine
            break;
        }
        hasher.update(KEY);
        symbolUpdateHasher(hasher, key);
        updateHasher(hasher, input[key as keyof typeof input]);
    }
    DEV: assert(getCompositeHash(input) === 0);
    const hash = hasher.digest();
    setHash(input, hash);
    return hash;
}

function updateHasher(hasher: Hasher, input: unknown): void {
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
            // Normalize NaNs and -0
            hasher.update(isNaN(input) ? NaN : input === 0 ? 0 : input);
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
        return maybeCompHash !== 0 ? maybeCompHash : hashComposite(input);
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

/**
 * Strings before symbols.
 * Strings sorted lexicographically.
 * Symbols sorted by {@link symbolSort}
 */
function keySort(a: string | symbol, b: string | symbol): number {
    if (typeof a !== typeof b) {
        return typeof a === "string" ? 1 : -1;
    }
    if (typeof a === "string") {
        return apply(localeCompare, a, [b]);
    }
    DEV: assert(typeof b === "symbol");
    return symbolSort(a, b);
}

/**
 * Registered symbols are sorted by their string key.
 * Registered symbols come before non-registered symbols.
 * Non-registered symbols are not sorted (stable order preserved).
 */
function symbolSort(a: symbol, b: symbol): number {
    const regA = keyFor(a);
    const regB = keyFor(b);
    if (regA !== undefined && regB !== undefined) {
        return apply(localeCompare, regA, [regB]);
    }
    if (regA === undefined && regB === undefined) {
        return symbolsInWeakMap ? secretSymbolSort(a, b) : 0;
    }
    return regA === undefined ? 1 : -1;
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
