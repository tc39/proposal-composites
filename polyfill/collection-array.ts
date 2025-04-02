import { isComposite, compositeEqual, type Composite } from "./composite.ts";
import { hashComposite } from "./internal/hash.ts";
import { apply, includes, indexOf, lastIndexOf, freeze } from "./internal/originals.ts";

export function arrayPrototypeIncludes<T>(this: T[], value: T): boolean {
    if (isComposite(value)) {
        return arrayPrototypeCompositeIndexOf(this, value, /* reverse: */ false) !== -1;
    }

    return apply(includes, this, [value]);
}

function arrayPrototypeCompositeIndexOf<T>(arr: T[], value: Composite, reverse: boolean): number {
    let triggeredHash = false;
    for (let i = reverse ? arr.length - 1 : 0; reverse ? i >= 0 : i < arr.length; i += reverse ? -1 : 1) {
        const item = arr[i];
        if (!triggeredHash && isComposite(item)) {
            triggeredHash = true;
            hashComposite(value);
        }
        if (compositeEqual(item, value)) {
            return i;
        }
    }
    return -1;
}

export function arrayPrototypeIndexOf<T>(this: T[], value: T): number {
    if (isComposite(value)) {
        return arrayPrototypeCompositeIndexOf(this, value, /* reverse:*/ false);
    }
    return apply(indexOf, this, [value]);
}

export function arrayPrototypeLastIndexOf<T>(this: T[], value: T): number {
    if (isComposite(value)) {
        return arrayPrototypeCompositeIndexOf(this, value, /* reverse:*/ true);
    }
    return apply(lastIndexOf, this, [value]);
}

export const arrayPrototypeMethods = freeze({
    includes: arrayPrototypeIncludes,
    indexOf: arrayPrototypeIndexOf,
    lastIndexOf: arrayPrototypeLastIndexOf,
});
