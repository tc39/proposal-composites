import { apply, mapSet, mapGet, mapHas, mapDelete, mapClear, freeze } from "./internal/originals.ts";
import { HashMap } from "./internal/hashmap.ts";
import { Composite, compositeEqual, isComposite } from "./composite.ts";
import { hashComposite } from "./internal/hash.ts";

type CompMap = HashMap<Composite, Composite>;
const CompMap = HashMap<Composite, Composite>;
const mapCompositeKeyLookups = new WeakMap<Map<any, any>, CompMap>();
const missing = Symbol("missing");

function resolveKey(map: Map<any, any>, key: unknown, create: boolean): unknown {
    if (!isComposite(key)) {
        return key;
    }
    let compMap = mapCompositeKeyLookups.get(map);
    if (!compMap) {
        if (!create) return missing;
        compMap = new CompMap(hashComposite, compositeEqual);
        mapCompositeKeyLookups.set(map, compMap);
    }

    let keyToUse = compMap.get(key);
    if (!keyToUse) {
        if (!create) return missing;
        keyToUse = key;
        compMap.set(key, key);
    }
    return keyToUse;
}

export function mapPrototypeSet(this: Map<any, any>, key: Composite, value: Composite): globalThis.Map<any, any> {
    const keyToUse = resolveKey(this, key, /* create */ true);
    apply(mapSet, this, [keyToUse, value]);
    return this;
}

export function mapPrototypeDelete(this: Map<any, any>, key: Composite): boolean {
    if (!isComposite(key)) {
        return apply(mapDelete, this, [key]);
    }
    const compMap = mapCompositeKeyLookups.get(this);
    if (!compMap) {
        return false;
    }
    const existingKey = compMap.get(key);
    if (!existingKey) {
        return false;
    }
    compMap.delete(key);
    apply(mapDelete, this, [existingKey]);
    return true;
}

export function mapPrototypeHas(this: Map<any, any>, key: Composite): boolean {
    const keyToUse = resolveKey(this, key, /* create */ false);
    return apply(mapHas, this, [keyToUse]);
}

export function mapPrototypeGet(this: Map<any, any>, key: Composite): any {
    const keyToUse = resolveKey(this, key, /* create */ false);
    return apply(mapGet, this, [keyToUse]);
}

export function mapPrototypeClear(this: Map<any, any>): void {
    apply(mapClear, this, []);
    const compMap = mapCompositeKeyLookups.get(this);
    if (compMap) {
        compMap.clear();
    }
}

export const mapPrototypeMethods = freeze({
    set: mapPrototypeSet,
    delete: mapPrototypeDelete,
    has: mapPrototypeHas,
    get: mapPrototypeGet,
    clear: mapPrototypeClear,
});
