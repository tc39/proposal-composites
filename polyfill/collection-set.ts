import { _Map, apply } from "./internal/originals.ts";
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

    forEach(callbackfn: (value: T, value2: T, set: this) => void, thisArg?: any): void {
        this.#map.forEach((_, key) => {
            callbackfn.call(thisArg, key, key, this);
        });
    }

    has(value: T): boolean {
        return apply(mapMethods.has, this.#map, [value]);
    }

    get size(): number {
        return this.#map.size;
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

    [Symbol.iterator](): SetIterator<T> {
        return this.#map.keys();
    }

    get [Symbol.toStringTag](): string {
        return "Set";
    }
}
