import { is } from "./originals.ts";

export function assert(v: unknown): asserts v {
    if (!v) {
        const err = new Error("Assertion failed");
        if (Error.captureStackTrace) {
            Error.captureStackTrace(err, assert);
        }
        throw err;
    }
}

export function sameValueZero(a: unknown, b: unknown): boolean {
    return is(a === 0 ? 0 : a, b === 0 ? 0 : b);
}
