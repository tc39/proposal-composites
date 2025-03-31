import { assert, sameValueZero } from "./utils.ts";
import {
    create,
    ownKeys,
    apply,
    defineProperty,
    sort,
    preventExtensions,
    weakSetAdd,
    localeCompare,
    keyFor,
    _WeakSet,
    weakSetHas,
    setAdd,
    setHas,
    _Set,
} from "./originals.ts";
import { maybeHashComposite, prepareLazyHash } from "./hash.ts";

const composites = new _WeakSet(); // [[isComposite]] internal slot

declare class __Composite__ {
    #__composite__: never;
}

export type Composite = __Composite__;

export function Composite(arg: object): Composite {
    if (new.target) {
        throw new TypeError("Composite should not be constructed with 'new'");
    }
    if (typeof arg !== "object" || arg === null) {
        throw new TypeError("Composite should be constructed with an object");
    }
    const copy = create(null);
    const argKeys = ownKeys(arg);
    for (let i = 0; i < argKeys.length; i++) {
        const k = argKeys[i];
        copy[k] = arg[k as keyof typeof arg];
    }
    apply(sort, argKeys, [keySort]);
    const c = {};
    apply(weakSetAdd, composites, [c]);
    for (let i = 0; i < argKeys.length; i++) {
        defineProperty(c, argKeys[i], {
            configurable: false,
            enumerable: true,
            writable: false,
            value: copy[argKeys[i]],
        });
    }
    preventExtensions(c);
    prepareLazyHash(c as Composite);
    return c as Composite;
}

function keySort(a: string | symbol, b: string | symbol): number {
    if (typeof a !== typeof b) {
        return typeof a === "string" ? 1 : -1;
    }
    if (typeof a === "string") {
        return apply(localeCompare, a, [b]);
    }
    assert(typeof b === "symbol");
    return symbolSort(a, b);
}

/**
 * Registered symbols are sorted by their string key.
 * Registered symbols come before non-registered symbols.
 * Non-registered symbols are not sorted.
 */
function symbolSort(a: symbol, b: symbol): number {
    const regA = keyFor(a);
    const regB = keyFor(b);
    if (regA !== undefined && regB !== undefined) {
        return apply(localeCompare, regA, [regB]);
    }
    if (regA === undefined && regB === undefined) {
        return 0;
    }
    return regA === undefined ? 1 : -1;
}

export function isComposite(arg: unknown): arg is Composite {
    return apply(weakSetHas, composites, [arg]);
}
Composite.isComposite = isComposite;

export function compositeEqual(a: unknown, b: unknown): boolean {
    if (!isComposite(a) || !isComposite(b)) {
        return sameValueZero(a, b);
    }
    if (a === b) return true;

    const maybeHashA = maybeHashComposite(a);
    if (maybeHashA !== undefined) {
        const maybeHashB = maybeHashComposite(b);
        if (maybeHashB !== undefined && maybeHashA !== maybeHashB) {
            return false;
        }
    }

    const aKeys = ownKeys(a);
    const bKeys = ownKeys(b);
    if (aKeys.length !== bKeys.length) {
        return false;
    }
    let symbolKeysB: Set<symbol> | undefined;
    let firstSymbolIndex: number | undefined;
    for (let i = 0; i < aKeys.length; i++) {
        const aKey = aKeys[i];
        const bKey = bKeys[i];
        if (typeof aKey !== typeof bKey) {
            return false;
        }
        if (typeof aKey === "symbol") {
            if (symbolKeysB === undefined) {
                symbolKeysB = new _Set();
                firstSymbolIndex = i;
            }
            apply(setAdd, symbolKeysB, [bKey]);
            continue;
        }
        if (aKey !== bKey) {
            return false;
        }
    }
    if (firstSymbolIndex !== undefined) {
        assert(symbolKeysB !== undefined);
        for (let i = firstSymbolIndex; i < aKeys.length; i++) {
            if (!apply(setHas, symbolKeysB, [aKeys[i]])) {
                return false;
            }
        }
    }
    for (let i = 0; i < aKeys.length; i++) {
        const k = aKeys[i];
        const aV = (a as any)[k];
        const bV = (b as any)[k];
        if (!compositeEqual(aV, bV)) {
            return false;
        }
    }

    return true;
}
Composite.equal = compositeEqual;
