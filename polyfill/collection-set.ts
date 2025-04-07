import {
    _Map,
    mapSize,
    apply,
    min as toNumber,
    isNaN,
    abs,
    floor,
    NEGATIVE_INFINITY,
    POSITIVE_INFINITY,
    iterator,
} from "./internal/originals.ts";
import { mapPrototypeMethods as mapMethods } from "./collection-map.ts";

/**
 * A replacement for the standard ES Set class with support for composite keys.
 */
export class Set<T> implements globalThis.Set<T> {
    #map = new _Map<T, 1>();

    constructor(values?: readonly T[] | null) {
        if (values) {
            for (const value of values) {
                this.add(value);
            }
        }
    }

    #requireInternalSlot() {}

    add(value: T): this {
        apply(mapMethods.set, this.#map, [value, 1]);
        return this;
    }

    clear(): void {
        apply(mapMethods.clear, this.#map, []);
    }

    delete(value: T): boolean {
        return apply(mapMethods.delete, this.#map, [value]);
    }

    forEach(callbackfn: (value: T, value2: T, set: globalThis.Set<T>) => void, thisArg?: any): void {
        this.#map.forEach((_, key) => {
            callbackfn.call(thisArg, key, key, this);
        });
    }

    #has(value: T): boolean {
        return apply(mapMethods.has, this.#map, [value]);
    }

    has(value: T): boolean {
        return this.#has(value);
    }

    #size(): number {
        return apply(mapSize, this.#map, []);
    }

    get size(): number {
        return this.#size();
    }

    *entries(): SetIterator<[T, T]> {
        for (const k of this.#map.keys()) {
            yield [k, k];
        }
    }

    keys(): SetIterator<T> {
        return this.#map.keys();
    }

    values(): SetIterator<T> {
        return this.#map.keys();
    }

    union<U>(other: ReadonlySetLike<U>): globalThis.Set<T | U> {
        this.#requireInternalSlot();
        const otherSet = getSetRecord(other);
        const result = new Set<T | U>();
        for (const value of this) {
            apply(mapMethods.set, result.#map, [value, 1]);
        }
        for (const value of otherSet.keys()) {
            apply(mapMethods.set, result.#map, [value, 1]);
        }
        return result;
    }

    intersection<U>(other: ReadonlySetLike<U>): globalThis.Set<T & U> {
        this.#requireInternalSlot();
        const otherSet = getSetRecord(other);
        const result = new Set<T & U>();

        if (this.#size() <= otherSet.size) {
            for (const value of this) {
                if (otherSet.has(value)) {
                    apply(mapMethods.set, result.#map, [value, 1]);
                }
            }
        } else {
            for (const value of otherSet.keys()) {
                if (this.#has(value as any)) {
                    apply(mapMethods.set, result.#map, [value, 1]);
                }
            }
        }

        return result;
    }

    difference<U>(other: ReadonlySetLike<U>): globalThis.Set<T> {
        this.#requireInternalSlot();
        const otherSet = getSetRecord(other);
        const result = new Set<T>();
        for (const value of this) {
            apply(mapMethods.set, result.#map, [value, 1]);
        }

        if (result.#size() <= otherSet.size) {
            for (const value of result) {
                if (otherSet.has(value)) {
                    apply(mapMethods.delete, result.#map, [value]);
                }
            }
        } else {
            for (const value of otherSet.keys()) {
                apply(mapMethods.delete, result.#map, [value]);
            }
        }

        return result;
    }

    symmetricDifference<U>(other: ReadonlySetLike<U>): globalThis.Set<T | U> {
        this.#requireInternalSlot();
        const otherSet = getSetRecord(other);
        const result = new Set<T | U>();
        for (const value of this) {
            if (!otherSet.has(value)) {
                apply(mapMethods.set, result.#map, [value, 1]);
            }
        }
        for (const value of otherSet.keys()) {
            if (!this.#has(value as any)) {
                apply(mapMethods.set, result.#map, [value, 1]);
            }
        }
        return result;
    }

    isSubsetOf(other: ReadonlySetLike<unknown>): boolean {
        this.#requireInternalSlot();
        const otherSet = getSetRecord(other);
        if (this.#size() > otherSet.size) return false;
        for (const value of this) {
            if (!otherSet.has(value)) {
                return false;
            }
        }
        return true;
    }

    isSupersetOf(other: ReadonlySetLike<unknown>): boolean {
        this.#requireInternalSlot();
        const otherSet = getSetRecord(other);
        if (this.#size() < otherSet.size) return false;
        for (const value of otherSet.keys()) {
            if (!this.#has(value as any)) {
                return false;
            }
        }
        return true;
    }

    isDisjointFrom(other: ReadonlySetLike<unknown>): boolean {
        this.#requireInternalSlot();
        const otherSet = getSetRecord(other);

        if (this.#size() <= otherSet.size) {
            for (const value of this) {
                if (otherSet.has(value)) {
                    return false;
                }
            }
        } else {
            for (const value of otherSet.keys()) {
                if (this.#has(value as any)) {
                    return false;
                }
            }
        }

        return true;
    }

    [Symbol.iterator](): SetIterator<T> {
        return this.#map.keys();
    }

    get [Symbol.toStringTag](): string {
        return "Set";
    }
}

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
