import { assert, sameValueZero } from "./utils.ts";
import {
    ownKeys,
    apply,
    defineProperty,
    preventExtensions,
    weakSetAdd,
    _WeakSet,
    weakSetHas,
    setAdd,
    setHas,
    _Set,
} from "./originals.ts";
import { maybeHashComposite, prepareLazyHash } from "./hash.ts";

const composites = new _WeakSet(); // [[isComposite]] internal slot

/** Nominal type to track Composite values */
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
    const argKeys = ownKeys(arg);
    const c = {};
    apply(weakSetAdd, composites, [c]);
    for (let i = 0; i < argKeys.length; i++) {
        defineProperty(c, argKeys[i], {
            configurable: false,
            enumerable: true,
            writable: false,
            value: (arg as any)[argKeys[i]],
        });
    }
    preventExtensions(c);
    prepareLazyHash(c as Composite);
    return c as Composite;
}

export function isComposite(arg: unknown): arg is Composite {
    return apply(weakSetHas, composites, [arg]);
}
Composite.isComposite = isComposite;

export function compositeEqual(a: unknown, b: unknown): boolean {
    if (a === b) return true;
    if (!isComposite(a) || !isComposite(b)) {
        return sameValueZero(a, b);
    }

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
