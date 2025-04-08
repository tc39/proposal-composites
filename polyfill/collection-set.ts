import {
    apply,
    min as toNumber,
    isNaN,
    abs,
    floor,
    NEGATIVE_INFINITY,
    POSITIVE_INFINITY,
    iterator,
    setAdd,
    setClear,
    setHas,
    setSize,
    setDelete,
    _Set,
    freeze,
} from "./internal/originals.ts";
import { isComposite } from "./composite.ts";
import { resolveKey, missing, clearCompMap, deleteKey } from "./internal/key-lookup.ts";

function requireInternalSlot(that: unknown): void {
    apply(setSize, that, []);
}

function setPrototypeAdd<T>(this: Set<T>, value: T): Set<T> {
    requireInternalSlot(this);
    const valueToUse = resolveKey(this, value, /* create */ true);
    apply(setAdd, this, [valueToUse]);
    return this;
}

function setPrototypeClear(this: Set<any>): void {
    requireInternalSlot(this);
    apply(setClear, this, []);
    clearCompMap(this);
}

function setPrototypeDelete<T>(this: Set<T>, value: T): boolean {
    requireInternalSlot(this);
    if (!isComposite(value)) {
        return apply(setDelete, this, [value]);
    }
    const existingKey = deleteKey(this, value);
    if (!existingKey) {
        return false;
    }
    apply(setDelete, this, [existingKey]);
    return true;
}

function setPrototypeForEach(
    this: Set<any>,
    callbackfn: (value: any, value2: any, set: Set<any>) => void,
    thisArg?: any,
): void {
    requireInternalSlot(this);
    const it = this.keys();
    let v = apply(it.next, it, []);
    while (!v.done) {
        const key = v.value;
        callbackfn.call(thisArg, key, key, this);
        v = apply(it.next, it, []);
    }
}

function setPrototypeHas(this: Set<any>, value: any): boolean {
    requireInternalSlot(this);
    const valueToUse = resolveKey(this, value, /* create */ false);
    if (valueToUse === missing) {
        return false;
    }
    return apply(setHas, this, [valueToUse]);
}

function setPrototypeUnion(this: Set<any>, other: ReadonlySetLike<any>): Set<any> {
    requireInternalSlot(this);
    const otherSet = getSetRecord(other);
    const result = new _Set<any>();
    for (const value of this) {
        apply(setPrototypeAdd, result, [value]);
    }
    for (const value of otherSet.keys()) {
        apply(setPrototypeAdd, result, [value]);
    }
    return result;
}

function setPrototypeIntersection<T, U>(this: Set<T>, other: ReadonlySetLike<U>): Set<T & U> {
    requireInternalSlot(this);
    const otherSet = getSetRecord(other);
    const result = new _Set<any>();
    if (apply(setSize, this, []) <= otherSet.size) {
        for (const value of this) {
            if (otherSet.has(value)) {
                apply(setPrototypeAdd, result, [value]);
            }
        }
    } else {
        for (const value of otherSet.keys()) {
            if (this.has(value)) {
                apply(setPrototypeAdd, result, [value]);
            }
        }
    }
    return result;
}

function setPrototypeDifference<T, U>(this: Set<T>, other: ReadonlySetLike<U>): Set<T> {
    requireInternalSlot(this);
    const otherSet = getSetRecord(other);
    const result = new _Set<any>();
    for (const value of this) {
        apply(setPrototypeAdd, result, [value]);
    }
    if (result.size <= otherSet.size) {
        for (const value of result) {
            if (otherSet.has(value)) {
                apply(setPrototypeDelete, result, [value]);
            }
        }
    } else {
        for (const value of otherSet.keys()) {
            apply(setPrototypeDelete, result, [value]);
        }
    }
    return result;
}

function setPrototypeSymmetricDifference<T, U>(this: Set<T>, other: ReadonlySetLike<U>): Set<T | U> {
    requireInternalSlot(this);
    const otherSet = getSetRecord(other);
    const result = new _Set<any>();
    for (const value of this) {
        if (!otherSet.has(value)) {
            apply(setPrototypeAdd, result, [value]);
        }
    }
    for (const value of otherSet.keys()) {
        if (!this.has(value)) {
            apply(setPrototypeAdd, result, [value]);
        }
    }
    return result;
}

function setPrototypeIsSubsetOf<T, U>(this: Set<T>, other: ReadonlySetLike<U>): boolean {
    requireInternalSlot(this);
    const otherSet = getSetRecord(other);
    if (apply(setSize, this, []) > otherSet.size) return false;
    for (const value of this) {
        if (!otherSet.has(value)) {
            return false;
        }
    }
    return true;
}

function setPrototypeIsSupersetOf<T, U>(this: Set<T>, other: ReadonlySetLike<U>): boolean {
    requireInternalSlot(this);
    const otherSet = getSetRecord(other);
    if (apply(setSize, this, []) < otherSet.size) return false;
    for (const value of otherSet.keys()) {
        if (!this.has(value)) {
            return false;
        }
    }
    return true;
}

function setPrototypeIsDisjointFrom<T, U>(this: Set<T>, other: ReadonlySetLike<U>): boolean {
    requireInternalSlot(this);
    const otherSet = getSetRecord(other);

    if (apply(setSize, this, []) <= otherSet.size) {
        for (const value of this) {
            if (otherSet.has(value)) {
                return false;
            }
        }
    } else {
        for (const value of otherSet.keys()) {
            if (this.has(value)) {
                return false;
            }
        }
    }

    return true;
}

export const setPrototypeMethods = freeze({
    add: setPrototypeAdd,
    clear: setPrototypeClear,
    delete: setPrototypeDelete,
    forEach: setPrototypeForEach,
    has: setPrototypeHas,
    union: setPrototypeUnion,
    intersection: setPrototypeIntersection,
    difference: setPrototypeDifference,
    symmetricDifference: setPrototypeSymmetricDifference,
    isSubsetOf: setPrototypeIsSubsetOf,
    isSupersetOf: setPrototypeIsSupersetOf,
    isDisjointFrom: setPrototypeIsDisjointFrom,
});

function getSetRecord(other: ReadonlySetLike<unknown>) {
    const size = toNumber(other.size);
    if (isNaN(size)) {
        throw new TypeError("invalid size");
    }
    const intSize = toIntegerOrInfinity(size);
    if (intSize < 0) {
        throw new RangeError("invalid size");
    }
    const has = other.has;
    if (typeof has !== "function") {
        throw new TypeError("invalid has");
    }
    const keys = other.keys;
    if (typeof keys !== "function") {
        throw new TypeError("invalid keys");
    }
    return {
        obj: other,
        size: intSize,
        has(v: any): boolean {
            return Boolean(apply(has, other, [v]));
        },
        keys(): Iterable<any> {
            const it = apply(keys, other, []);
            if (it === null || typeof it !== "object") {
                throw new TypeError("invalid keys");
            }
            const next = it.next;
            return {
                [iterator as typeof Symbol.iterator]() {
                    return {
                        __proto__: null,
                        next() {
                            return apply(next, it, []);
                        },
                    };
                },
            };
        },
    };
}

function toIntegerOrInfinity(arg: unknown): number {
    const n = toNumber(arg as number);
    if (isNaN(n) || n === 0) {
        return 0;
    }
    if (n === POSITIVE_INFINITY) {
        return POSITIVE_INFINITY;
    }
    if (n === NEGATIVE_INFINITY) {
        return NEGATIVE_INFINITY;
    }
    let i = floor(abs(n));
    if (n < 0) {
        i = -i;
    }
    return i;
}
