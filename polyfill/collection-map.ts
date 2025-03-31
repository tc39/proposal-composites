import {
    _Map,
    apply,
    mapSet,
    mapGet,
    mapHas,
    mapClear,
    mapDelete,
    mapKeys,
    mapValues,
    mapEntries,
    mapForEach,
} from "./originals.ts";
import { HashMap } from "./hashmap.ts";
import { Composite, compositeEqual, isComposite } from "./composite.ts";
import { hashComposite } from "./hash.ts";

class CompHolder {
    #c: Composite;
    constructor(c: Composite) {
        this.#c = c;
    }
    get c() {
        return this.#c;
    }
    set c(c: Composite) {
        this.#c = c;
    }
    static is(u: unknown): u is CompHolder {
        return u !== null && typeof u === "object" && #c in u;
    }
    static unwrap(u: unknown): unknown {
        if (CompHolder.is(u)) {
            return u.#c;
        }
        return u;
    }
}

const missing = Symbol("missing");

/**
 * A replacement for the standard ES Map class with support for composite keys.
 */
export class Map<K, V> implements globalThis.Map<K, V> {
    #map = new _Map<K | CompHolder, V>();
    #compMap = new HashMap<Composite, CompHolder>(hashComposite, compositeEqual);

    constructor(entries?: readonly (readonly [K, V])[] | null) {
        if (entries) {
            for (const { 0: key, 1: value } of entries) {
                this.set(key, value);
            }
        }
    }

    #normalizeKey(key: unknown): unknown {
        if (isComposite(key)) {
            return this.#compMap.get(key) ?? missing;
        }
        return key;
    }

    clear(): void {
        apply(mapClear, this.#map, []);
    }

    delete(key: K): boolean {
        const deleted = apply(mapDelete, this.#map, [this.#normalizeKey(key)]);
        if (deleted && isComposite(key)) {
            this.#compMap.delete(key);
        }
        return deleted;
    }

    get(key: K): V | undefined {
        return apply(mapGet, this.#map, [this.#normalizeKey(key)]);
    }

    has(key: any): boolean {
        return apply(mapHas, this.#map, [this.#normalizeKey(key)]);
    }

    set(key: K, value: V): this {
        if (!isComposite(key)) {
            apply(mapSet, this.#map, [key, value]);
            return this;
        }
        let indexHolder = this.#compMap.get(key);
        if (indexHolder !== undefined) {
            indexHolder.c = key;
        } else {
            indexHolder = new CompHolder(key);
            this.#compMap.set(key, indexHolder);
        }
        apply(mapSet, this.#map, [indexHolder, value]);
        return this;
    }

    get size(): number {
        return this.#map.size;
    }

    forEach(callbackfn: (value: V, key: K, map: this) => void, thisArg?: any): void {
        apply(mapForEach, this.#map, [
            (value, key) => {
                callbackfn.call(thisArg, value, CompHolder.unwrap(key) as K, this);
            },
        ]);
    }

    entries(): MapIterator<[K, V]> {
        const iterator = apply(mapEntries, this.#map, []);
        return {
            [Symbol.iterator]() {
                return this;
            },
            next(): IteratorResult<[K, V]> {
                const result = iterator.next();
                if (result.done) {
                    return { done: true, value: undefined };
                }
                return { done: false, value: [CompHolder.unwrap(result.value[0]) as K, result.value[1] as V] };
            },
        };
    }

    keys(): MapIterator<K> {
        const iterator = apply(mapKeys, this.#map, []);
        return {
            [Symbol.iterator]() {
                return this;
            },
            next(): IteratorResult<K> {
                const result = iterator.next();
                if (result.done) {
                    return { done: true, value: undefined };
                }
                return { done: false, value: CompHolder.unwrap(result.value) as K };
            },
        };
    }

    values(): MapIterator<V> {
        return apply(mapValues, this.#map, []);
    }

    [Symbol.iterator](): MapIterator<[K, V]> {
        return this.entries();
    }

    get [Symbol.toStringTag]() {
        return "Map";
    }
}
