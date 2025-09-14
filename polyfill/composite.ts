import { assert } from "./internal/utils.ts";
import { ownKeys, apply, freeze, sort, NaN, getOwnPropertyDescriptor } from "./internal/originals.ts";
import { __Composite__, objectIsComposite, setHash } from "./internal/composite-class.ts";
import { MurmurHashStream } from "./internal/murmur.ts";
import { KEY, updateHasher } from "./internal/hash.ts";
import { SafeMap, SafeWeakRef } from "./internal/safe.ts";

export type Composite = __Composite__;

const composites = new SafeMap<number, Array<SafeWeakRef<Composite>>>();
const fr = new FinalizationRegistry((hash: number) => {
    let bucket = composites.safeGet(hash);
    if (bucket) {
        let write = 0;
        for (let read = 0; read < bucket.length; read++) {
            const ref = bucket[read];
            if (ref.safeDeref() !== void 0) {
                if (write !== read) {
                    bucket[write] = ref;
                }
                write++;
            }
        }
        if (write === 0) {
            composites.safeDelete(hash);
        } else if (write < bucket.length) {
            bucket.length = write;
        }
    }
});
const register = fr.register.bind(fr);

function isStringArray(a: unknown[]): a is string[] {
    for (let i = 0; i < a.length; i++) {
        if (typeof a[i] !== "string") return false;
    }
    return true;
}

type Entry = { readonly k: string; readonly v: unknown };

function byKey(a: Entry, b: Entry): number {
    return a.k < b.k ? -1 : a.k > b.k ? 1 : 0;
}

export function Composite(arg: object): Composite {
    if (new.target) {
        throw new TypeError("Composite should not be constructed with 'new'");
    }
    if (typeof arg !== "object" || arg === null) {
        throw new TypeError("Composite should be constructed with an object");
    }

    const argKeys = ownKeys(arg);
    const entries: Entry[] = [];
    for (let i = 0; i < argKeys.length; i++) {
        const k = argKeys[i];
        const desc = getOwnPropertyDescriptor(arg, k);
        if (desc === undefined || !desc.enumerable) continue;
        if (typeof k !== "string") {
            throw new TypeError("symbol keys not allowed");
        }
        let v = (arg as any)[k];
        if (typeof v === "number") {
            // Normalize -0 and NaN
            if (v === 0) v = 0;
            if (v !== v) v = NaN;
        }
        entries[entries.length] = { k, v };
    }

    apply(sort, entries, [byKey]);

    const c = new __Composite__();
    const hasher = new MurmurHashStream();
    for (let i = 0; i < entries.length; i++) {
        const k = entries[i].k;
        const v = entries[i].v;
        hasher.update(KEY);
        hasher.update(k);
        updateHasher(hasher, v);
        (c as any)[k] = v;
    }

    let hash = hasher.digest();
    let cs = composites.safeGet(hash);
    if (!cs) {
        cs = [new SafeWeakRef(c)];
        composites.safeSet(hash, cs);
    } else {
        let emptyIndex = -1;
        let compKeys;
        for (let i = 0; i < cs.length; i++) {
            let ref = cs[i]?.safeDeref();
            if (ref !== void 0) {
                compKeys ??= ownKeys(c);
                DEV: assert(isStringArray(compKeys));
                if (compositesStructurallyEqual(ref, c, compKeys)) {
                    return ref;
                }
            } else if (emptyIndex === -1) {
                emptyIndex = i;
            }
        }
        if (emptyIndex === -1) {
            cs[cs.length] = new SafeWeakRef(c);
        } else {
            cs[emptyIndex] = new SafeWeakRef(c);
        }
    }

    register(c, hash);
    setHash(c, hash);
    freeze(c);
    return c;
}

export function isComposite(arg: unknown): arg is Composite {
    return typeof arg === "object" && arg !== null && objectIsComposite(arg);
}
Composite.isComposite = isComposite;

function compositesStructurallyEqual(a: Composite, b: Composite, bKeys: readonly string[]): boolean {
    const aKeys = ownKeys(a);
    if (aKeys.length !== bKeys.length) {
        return false;
    }
    for (let i = 0; i < aKeys.length; i++) {
        if (aKeys[i] !== bKeys[i]) {
            return false;
        }
    }
    for (let i = 0; i < aKeys.length; i++) {
        const k = aKeys[i];
        const aV = (a as any)[k];
        const bV = (b as any)[k];
        if (aV !== bV) {
            // Extra checks in case both values were NaN:
            if (aV === aV || bV === bV) {
                return false;
            }
        }
    }

    return true;
}
