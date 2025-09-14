import { weakMapGet, weakMapSet, WeakMap } from "./originals.ts";
import { HashStore } from "./hashmap.ts";
import { Composite, compositeEqual, isComposite } from "../composite.ts";
import { hashComposite } from "./hash.ts";

type CompMap = HashStore<Composite>;
const CompMap = HashStore<Composite>;
type Maps = Map<any, any>;
type Sets = Set<any>;

function replaced(): never {
    throw new Error("function replaced");
}

class SafeWeakMap<K extends object, V> extends WeakMap<K, V> {
    declare get: never;
    safeGet(k: K): V | undefined {
        replaced();
    }
    declare set: never;
    safeSet(k: K, v: unknown) {
        replaced();
    }
}
SafeWeakMap.prototype.safeGet = weakMapGet;
SafeWeakMap.prototype.safeSet = weakMapSet;

const compositeKeyLookups = new SafeWeakMap<Maps | Sets, CompMap>();

export const missing = Symbol("missing");

export function resolveKey(collection: Maps | Sets, key: unknown, create: boolean): unknown {
    if (!isComposite(key)) {
        return key;
    }
    let compMap = compositeKeyLookups.safeGet(collection);
    if (!compMap) {
        if (!create) return missing;
        compMap = new CompMap(hashComposite, compositeEqual);
        compositeKeyLookups.safeSet(collection, compMap);
    }

    let keyToUse = compMap.get(key);
    if (!keyToUse) {
        if (!create) return missing;
        keyToUse = key;
        compMap.set(key);
    }
    return keyToUse;
}

export function clearCompMap(map: Maps | Sets) {
    compositeKeyLookups.safeGet(map)?.clear();
}

export function deleteKey(collection: Maps | Sets, key: Composite): Composite | undefined {
    const compMap = compositeKeyLookups.safeGet(collection);
    if (!compMap) {
        return undefined;
    }
    const existingKey = compMap.get(key);
    if (!existingKey) {
        return undefined;
    }
    compMap.delete(key);
    return existingKey;
}
