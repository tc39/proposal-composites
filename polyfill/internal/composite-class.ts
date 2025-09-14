class ReturnReturn {
    constructor(v: object) {
        return v;
    }
}

export class __Composite__ extends ReturnReturn {
    #hash = 0;
    constructor() {
        super({ __proto__: null });
    }
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

export const { getCompositeHash, maybeGetCompositeHash, objectIsComposite, setHash } = __Composite__;
