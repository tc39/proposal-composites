import { _Map, mapSet, mapGet, apply, splice, mapDelete, mapClear, freeze } from "./originals.ts";

const missing = Symbol("missing");

export class HashMap<K, V> {
    #hasher: (key: K) => number;
    #equals: (a: K, b: K) => boolean;
    #map = new _Map<number, Array<[K, V]>>();
    constructor(hasher: (key: K) => number, equals: (a: K, b: K) => boolean) {
        this.#hasher = hasher;
        this.#equals = equals;
    }
    clear(): void {
        apply(mapClear, this.#map, []);
    }
    #get(key: K): V | typeof missing {
        const hash = this.#hasher(key);
        const bucket = apply(mapGet, this.#map, [hash]);
        if (bucket === undefined) {
            return missing;
        }
        for (let i = 0; i < bucket.length; i++) {
            const k = bucket[i][0];
            if (this.#equals(k, key)) {
                return bucket[i][1];
            }
        }
        return missing;
    }
    has(key: K): boolean {
        return this.#get(key) !== missing;
    }
    get(key: K): V | undefined {
        const value = this.#get(key);
        if (value === missing) {
            return undefined;
        }
        return value;
    }
    set(key: K, value: V): void {
        const hash = this.#hasher(key);
        let bucket = apply(mapGet, this.#map, [hash]);
        if (bucket === undefined) {
            bucket = [];
            apply(mapSet, this.#map, [hash, bucket]);
        }
        for (let i = 0; i < bucket.length; i++) {
            const k = bucket[i][0];
            if (this.#equals(k, key)) {
                bucket[i][1] = value;
                return;
            }
        }
        bucket[bucket.length] = [key, value];
    }
    delete(key: K): boolean {
        const hash = this.#hasher(key);
        const bucket = apply(mapGet, this.#map, [hash]);
        if (bucket === undefined) {
            return false;
        }
        for (let i = 0; i < bucket.length; i++) {
            const k = bucket[i][0];
            if (this.#equals(k, key)) {
                if (bucket.length === 1) {
                    apply(mapDelete, this.#map, [hash]);
                } else {
                    apply(splice, bucket, [i, 1]);
                }
                return true;
            }
        }
        return false;
    }
}
freeze(HashMap.prototype);
freeze(HashMap);
