import { assert, EMPTY, sameValueZero } from "./internal/utils.ts";
import {
    ownKeys,
    apply,
    freeze,
    setPrototypeOf,
    objectPrototype,
    sort,
} from "./internal/originals.ts";
import { __Composite__, objectIsComposite, maybeGetCompositeHash, setHash } from "./internal/composite-class.ts";
import { MurmurHashStream } from "./internal/murmur.ts";
import { KEY, updateHasher } from "./internal/hash.ts";
import { SafeMap, SafeWeakRef } from "./internal/safe.ts";

export type Composite = __Composite__;

const composites = new SafeMap<number, Array<SafeWeakRef<Composite>>>()
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

function isStringArray(a: unknown[]): a is string[] {
    for (let i = 0; i < a.length; i++) {
        if (typeof a !== "string") return false;
    }
    return true;
}

export function Composite(arg: object): Composite {
    if (new.target) {
        throw new TypeError("Composite should not be constructed with 'new'");
    }
    if (typeof arg !== "object" || arg === null) {
        throw new TypeError("Composite should be constructed with an object");
    }

    const hasher = new MurmurHashStream();
    const argKeys = ownKeys(arg);
    apply(sort, argKeys, EMPTY);
    const c = new __Composite__();
    for (let i = 0; i < argKeys.length; i++) {
        let k = argKeys[i];
        let v = (arg as any)[k];
        if (typeof k === "string") {
            hasher.update(KEY);
            hasher.update(k);
            updateHasher(hasher, v);
            (c as any)[k] = v;
        } else {
            throw new Error("symbol keys not allowed");
        }
    }

    DEV: assert(isStringArray(argKeys));

    let hash = hasher.digest();
    let cs = composites.safeGet(hash);
    if (!cs) {
        cs = [new SafeWeakRef(c)];
        composites.safeSet(hash, cs);
    } else {
        var emptyI = -1;
        for (let i = 0; i < cs.length; i++) {
            let ref = cs[i]?.safeDeref();
            if (ref !== void 0) {
                if (compositesStructurallyEqual(ref, c, argKeys)) {
                    return ref;
                }
            } else if (emptyI === -1) {
                emptyI = i;
            }
        }
        if (emptyI === -1) {
            cs[cs.length] = new SafeWeakRef(c);
        } else {
            cs[emptyI] = new SafeWeakRef(c);
        }
    }

    fr.register(c, hash);
    setHash(c, hash);
    setPrototypeOf(c, objectPrototype);
    freeze(c);
    return c;
}

export function isComposite(arg: unknown): arg is Composite {
    return typeof arg === "object" && arg !== null && objectIsComposite(arg);
}
Composite.isComposite = isComposite;

function compositeEqual(a: unknown, b: unknown): boolean {
    if (a === b) return true;

    if (!isComposite(a) || !isComposite(b)) {
        return sameValueZero(a, b);
    }
    DEV: assert(isComposite(a));
    DEV: assert(isComposite(b));
    DEV: assert(a !== b);
    return false;
}

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
        if (!compositeEqual(aV, bV)) {
            return false;
        }
    }

    return true;
}
