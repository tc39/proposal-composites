export const { isNaN, NaN } = Number;
export const { apply, ownKeys, defineProperty, preventExtensions } = Reflect;
export const { is, freeze } = Object;
export const { sort, splice, includes, indexOf, lastIndexOf } = Array.prototype;
export const { keyFor } = Symbol;
export const { localeCompare } = String.prototype;
export const _Map = Map;
export const {
    has: mapHas,
    set: mapSet,
    get: mapGet,
    delete: mapDelete,
    clear: mapClear,
    keys: mapKeys,
    values: mapValues,
    entries: mapEntries,
    forEach: mapForEach,
} = Map.prototype;
export const _Set = Set;
export const { has: setHas, add: setAdd } = Set.prototype;
export const _WeakSet = WeakSet;
export const { has: weakSetHas, add: weakSetAdd } = WeakSet.prototype;
export const _WeakMap = WeakMap;
export const { has: weakMapHas, set: weakMapSet, get: weakMapGet } = WeakMap.prototype;
