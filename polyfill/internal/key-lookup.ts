import { apply, weakMapGet, weakMapSet } from "./originals.ts";
import { HashMap } from "./hashmap.ts";
import { Composite, compositeEqual, isComposite } from "../composite.ts";
import { hashComposite } from "./hash.ts";

type CompMap = HashMap<Composite, Composite>;
const CompMap = HashMap<Composite, Composite>;
type Maps = Map<any, any>;
type Sets = Set<any>;
const compositeKeyLookups = new WeakMap<Maps | Sets, CompMap>();

export const missing = Symbol("missing");

export function resolveKey(collection: Maps | Sets, key: unknown, create: boolean): unknown {
    if (!isComposite(key)) {
        return key;
    }
    let compMap = apply(weakMapGet, compositeKeyLookups, [collection]);
    if (!compMap) {
        if (!create) return missing;
        compMap = new CompMap(hashComposite, compositeEqual);
        apply(weakMapSet, compositeKeyLookups, [collection, compMap]);
    }

    let keyToUse = compMap.get(key);
    if (!keyToUse) {
        if (!create) return missing;
        keyToUse = key;
        compMap.set(key, key);
    }
    return keyToUse;
}

export function clearCompMap(map: Maps | Sets) {
    apply(weakMapGet, compositeKeyLookups, [map])?.clear();
}

export function deleteKey(collection: Maps | Sets, key: Composite): Composite | undefined {
    const compMap = apply(weakMapGet, compositeKeyLookups, [collection]);
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
