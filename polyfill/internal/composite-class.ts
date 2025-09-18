import { setPrototypeOf } from "./originals.ts";

export class __Composite__ {
    #hash = 0;
    static maybeGetCompositeHash(c: object): number | undefined {
        if (#hash in c) return c.#hash;
        return undefined;
    }
    static getCompositeHash(c: __Composite__) {
        return c.#hash;
    }
    static objectIsComposite(c: object): c is __Composite__ {
        return #hash in c;
    }
    static setHash(c: __Composite__, hash: number): void {
        c.#hash = hash;
    }
}

// Ensure setting properties during construction doesn't trigger Object.prototype setters.
setPrototypeOf(__Composite__.prototype, null);

export const { getCompositeHash, maybeGetCompositeHash, objectIsComposite, setHash } = __Composite__;
