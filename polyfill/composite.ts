import { assert, EMPTY, sameValueZero } from "./internal/utils.ts";
import {
    ownKeys,
    apply,
    freeze,
    setAdd,
    setHas,
    Set,
    setPrototypeOf,
    objectPrototype,
    sort,
} from "./internal/originals.ts";
import { __Composite__, objectIsComposite, maybeGetCompositeHash, setHash } from "./internal/composite-class.ts";

export type Composite = __Composite__;

export function Composite(arg: object): Composite {
    if (new.target) {
        throw new TypeError("Composite should not be constructed with 'new'");
    }
    if (typeof arg !== "object" || arg === null) {
        throw new TypeError("Composite should be constructed with an object");
    }
    const argKeys = ownKeys(arg);
    const c = new __Composite__();
    const stringKeys: string[] = [];
    for (let i = 0; i < argKeys.length; i++) {
        let k = argKeys[i];
        if (typeof k === "string") {
            stringKeys[stringKeys.length] = k;
        } else {
            DEV: assert(typeof k === "symbol");
            (c as any)[k] = (arg as any)[k];
        }
    }
    apply(sort, stringKeys, EMPTY);
    for (let i = 0; i < stringKeys.length; i++) {
        let k = stringKeys[i];
        (c as any)[k] = (arg as any)[k];
    }
    setPrototypeOf(c, objectPrototype);
    freeze(c);
    return c;
}

export function isComposite(arg: unknown): arg is Composite {
    return typeof arg === "object" && arg !== null && objectIsComposite(arg);
}
Composite.isComposite = isComposite;

export function compositeEqual(a: unknown, b: unknown): boolean {
    if (a === b) return true;

    const maybeHashA = typeof a === "object" && a !== null ? maybeGetCompositeHash(a) : undefined;

    const maybeHashB =
        maybeHashA !== undefined && typeof b === "object" && b !== null ? maybeGetCompositeHash(b) : undefined;

    if (maybeHashB === undefined) {
        return sameValueZero(a, b);
    }

    DEV: assert(maybeHashA !== undefined);
    DEV: assert(isComposite(a));
    DEV: assert(isComposite(b));
    if (maybeHashA !== 0 && maybeHashB !== 0 && maybeHashA !== maybeHashB) return false;

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
            // Different ratios of strings and symbols
            return false;
        }
        if (typeof aKey === "symbol") {
            if (symbolKeysB === undefined) {
                symbolKeysB = new Set();
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
        DEV: assert(symbolKeysB !== undefined);
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

    if (maybeHashA === 0 && maybeHashB !== 0) {
        setHash(a, maybeHashB);
    } else if (maybeHashB === 0 && maybeHashA !== 0) {
        setHash(b, maybeHashA);
    }
    return true;
}
Composite.equal = compositeEqual;
