import { Map, mapSet, mapGet, apply, splice, mapDelete, mapClear, freeze } from "./originals.ts";

const missing = Symbol("missing");

function replaced(): never {
    throw new Error("implementation replaced");
}

class SafeMap<K, V> extends Map<K, V> {
    declare get: never;
    safeGet(k: K): V | undefined {
        replaced();
    }
    declare set: never;
    safeSet(k: K, v: V) {
        replaced();
    }
    declare delete: never;
    safeDelete(k: K) {
        replaced();
    }
    declare clear: never;
    safeClear() {
        replaced();
    }
}
SafeMap.prototype.safeGet = mapGet;
SafeMap.prototype.safeSet = mapSet;
SafeMap.prototype.safeDelete = mapDelete;
SafeMap.prototype.safeClear = mapClear;

export class HashStore<K> {
    #hasher: (key: K) => number;
    #equals: (a: K, b: K) => boolean;
    #map = new SafeMap<number, Array<K>>();
    constructor(hasher: (key: K) => number, equals: (a: K, b: K) => boolean) {
        this.#hasher = hasher;
        this.#equals = equals;
    }
    clear(): void {
        this.#map.safeClear();
    }
    #get(key: K): K | typeof missing {
        const hash = this.#hasher(key);
        const bucket = this.#map.safeGet(hash);
        if (bucket === undefined) {
            return missing;
        }
        var eq;
        for (let i = 0; i < bucket.length; i++) {
            eq ??= this.#equals;
            const b = bucket[i];
            if (eq(b, key)) {
                return b;
            }
        }
        return missing;
    }
    has(key: K): boolean {
        return this.#get(key) !== missing;
    }
    get(key: K): K | undefined {
        const value = this.#get(key);
        if (value === missing) {
            return undefined;
        }
        return value;
    }
    set(key: K): void {
        const hash = this.#hasher(key);
        let bucket = this.#map.safeGet(hash);
        if (bucket === undefined) {
            bucket = [];
            this.#map.safeSet(hash, bucket);
        }
        for (let i = 0; i < bucket.length; i++) {
            const k = bucket[i];
            if (this.#equals(k, key)) {
                bucket[i] = key;
                return;
            }
        }
        bucket[bucket.length] = key;
    }
    delete(key: K): boolean {
        const hash = this.#hasher(key);
        const bucket = this.#map.safeGet(hash);
        if (bucket === undefined) {
            return false;
        }
        for (let i = 0; i < bucket.length; i++) {
            const k = bucket[i];
            if (this.#equals(k, key)) {
                if (bucket.length === 1) {
                    this.#map.safeDelete(hash);
                } else {
                    apply(splice, bucket, [i, 1]);
                }
                return true;
            }
        }
        return false;
    }
}
freeze(HashStore.prototype);
freeze(HashStore);
