import { freeze } from "./originals.ts";

export function assert(v: unknown): asserts v {
    if (!v) {
        const err = new Error("Assertion failed");
        if ((Error as any).captureStackTrace) {
            (Error as any).captureStackTrace(err, assert);
        }
        throw err;
    }
}

export const EMPTY = freeze([]);
