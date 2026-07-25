import { Map, mapSet, mapGet, mapDelete, mapClear, WeakRef, weakDeref, freeze } from "./originals.ts";

function replaced(): never {
    throw new Error("implementation replaced");
}

export class SafeMap<K, V> extends Map<K, V> {
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
freeze(SafeMap.prototype);

export class SafeWeakRef<T extends object> extends WeakRef<T> {
    declare deref: never;
    safeDeref(): T | undefined {
        replaced();
    }
}
SafeWeakRef.prototype.safeDeref = weakDeref;
freeze(SafeWeakRef.prototype);
