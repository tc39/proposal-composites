import { Map as CompositeMap } from "./collection-map.ts";

/**
 * A replacement for the standard ES Set class with support for composite keys.
 */
export class Set<T> implements globalThis.Set<T> {
    #map: Map<T, 1> = new CompositeMap();

    constructor(values?: readonly T[] | null) {
        if (values) {
            for (const value of values) {
                this.#map.set(value, 1);
            }
        }
    }

    add(value: T): this {
        this.#map.set(value, 1);
        return this;
    }

    clear(): void {
        this.#map.clear();
    }

    delete(value: T): boolean {
        return this.#map.delete(value);
    }

    forEach(callbackfn: (value: T, value2: T, set: this) => void, thisArg?: any): void {
        this.#map.forEach((_, key) => {
            callbackfn.call(thisArg, key, key, this);
        });
    }

    has(value: T): boolean {
        return this.#map.has(value);
    }

    get size(): number {
        return this.#map.size;
    }

    entries(): SetIterator<[T, T]> {
        const iterator = this.#map.keys();
        return {
            [Symbol.iterator]() {
                return this;
            },
            next(): IteratorResult<[T, T]> {
                const result = iterator.next();
                if (result.done) {
                    return { done: true, value: undefined };
                }
                return { done: false, value: [result.value, result.value] };
            },
        };
    }

    keys(): SetIterator<T> {
        return this.#map.keys();
    }

    values(): SetIterator<T> {
        return this.#map.keys();
    }

    [Symbol.iterator](): SetIterator<T> {
        return this.keys();
    }

    get [Symbol.toStringTag](): string {
        return "Set";
    }
}
