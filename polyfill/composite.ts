import { assert } from "./internal/utils.ts";
import { ownKeys, apply, freeze, sort, NaN, getOwnPropertyDescriptor, is } from "./internal/originals.ts";
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

export interface CompositeOptions {
    preserveNegativeZero?: boolean;
}

export function Composite(arg: object, options?: CompositeOptions): Composite {
    if (new.target) {
        throw new TypeError("Composite should not be constructed with 'new'");
    }
    if (typeof arg !== "object" || arg === null) {
        throw new TypeError("Composite should be constructed with an object");
    }
    if (isComposite(arg)) {
        return arg;
    }

    const preserveNegativeZero = Boolean(options?.preserveNegativeZero ?? false);
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
            if (v === 0 && !preserveNegativeZero) v = 0;
            if (v !== v) v = NaN;
        }
        entries[entries.length] = { k, v };
    }

    apply(sort, entries, [byKey]);

    const hasher = new MurmurHashStream();
    for (let i = 0; i < entries.length; i++) {
        const k = entries[i].k;
        const v = entries[i].v;
        hasher.update(KEY);
        hasher.update(k);
        updateHasher(hasher, v);
    }

    let hash = hasher.digest();
    let cs = composites.safeGet(hash);
    let emptyIndex = -1;
    if (cs) {
        for (let i = 0; i < cs.length; i++) {
            let ref = cs[i]?.safeDeref();
            if (ref !== void 0) {
                if (compositeMatchesEntries(ref, entries)) {
                    return ref;
                }
            } else if (emptyIndex === -1) {
                emptyIndex = i;
            }
        }
    }

    const c = new __Composite__();
    for (let i = 0; i < entries.length; i++) {
        (c as any)[entries[i].k] = entries[i].v;
    }

    if (!cs) {
        cs = [new SafeWeakRef(c)];
        composites.safeSet(hash, cs);
    } else if (emptyIndex === -1) {
        cs[cs.length] = new SafeWeakRef(c);
    } else {
        cs[emptyIndex] = new SafeWeakRef(c);
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

function compositeMatchesEntries(a: Composite, entries: readonly Entry[]): boolean {
    const aKeys = ownKeys(a);
    DEV: assert(isStringArray(aKeys));
    if (aKeys.length !== entries.length) {
        return false;
    }
    for (let i = 0; i < entries.length; i++) {
        const entry = entries[i];
        if (!(entry.k in a) || !is((a as any)[entry.k], entry.v)) return false;
    }

    return true;
}
