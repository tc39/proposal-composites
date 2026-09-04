import { imul, strCharCodeAt, Number } from "./originals.ts";

const RANDOM_SEED = randomHash();
const STRING_MARKER = randomHash();
const BIG_INT_MARKER = randomHash();
const NEG_BIG_INT_MARKER = randomHash();

export function randomHash() {
    return (Math.random() * (2 ** 31 - 1)) >>> 0;
}

export interface Hasher {
    update(val: string | number | bigint): void;
    digest(): number;
}

export class MurmurHashStream implements Hasher {
    private hash: number = RANDOM_SEED;
    private length: number = 0;
    private carry: number = 0;
    private carryBytes: number = 0;

    private _mix(k1: number): void {
        k1 = imul(k1, 0xcc9e2d51);
        k1 = (k1 << 15) | (k1 >>> 17);
        k1 = imul(k1, 0x1b873593);
        this.hash ^= k1;
        this.hash = (this.hash << 13) | (this.hash >>> 19);
        this.hash = imul(this.hash, 5) + 0xe6546b64;
    }

    private _writeByte(byte: number): void {
        this.carry |= (byte & 0xff) << (8 * this.carryBytes);
        this.carryBytes++;
        this.length++;

        if (this.carryBytes === 4) {
            this._mix(this.carry >>> 0);
            this.carry = 0;
            this.carryBytes = 0;
        }
    }

    private _writeUint32(word: number): void {
        if (this.carryBytes === 0) {
            this._mix(word >>> 0);
            this.length += 4;
            return;
        }
        if (this.carryBytes === 2) {
            this._mix((this.carry | (word << 16)) >>> 0);
            this.carry = word >>> 16;
            this.length += 4;
            return;
        }
        this._writeByte(word & 0xff);
        this._writeByte((word >>> 8) & 0xff);
        this._writeByte((word >>> 16) & 0xff);
        this._writeByte((word >>> 24) & 0xff);
    }

    update(chunk: string | number | bigint): void {
        switch (typeof chunk) {
            case "string":
                this.update(STRING_MARKER);
                let i = 0;
                if (this.carryBytes === 2 && i < chunk.length) {
                    const code = strCharCodeAt(chunk, i);
                    this._writeByte(code & 0xff);
                    this._writeByte((code >>> 8) & 0xff);
                    i++;
                }
                if (this.carryBytes === 0) {
                    for (; i + 1 < chunk.length; i += 2) {
                        this._mix((strCharCodeAt(chunk, i) | (strCharCodeAt(chunk, i + 1) << 16)) >>> 0);
                        this.length += 4;
                    }
                }
                for (; i < chunk.length; i++) {
                    const code = strCharCodeAt(chunk, i);
                    this._writeByte(code & 0xff);
                    this._writeByte((code >>> 8) & 0xff);
                }
                return;
            case "number":
                this._writeUint32(chunk);
                return;
            case "bigint": {
                let value = chunk;
                if (value < 0n) {
                    value = -value;
                    this.update(NEG_BIG_INT_MARKER);
                } else {
                    this.update(BIG_INT_MARKER);
                }
                while (value > 0n) {
                    this._writeByte(Number(value & 0xffn));
                    value >>= 8n;
                }
                if (chunk === 0n) this._writeByte(0);
                return;
            }
            default:
                throw new TypeError(`Unsupported input type: ${typeof chunk}`);
        }
    }

    digest(): number {
        if (this.carryBytes > 0) {
            let k1 = this.carry >>> 0;
            k1 = imul(k1, 0xcc9e2d51);
            k1 = (k1 << 15) | (k1 >>> 17);
            k1 = imul(k1, 0x1b873593);
            this.hash ^= k1;
        }

        this.hash ^= this.length;
        this.hash ^= this.hash >>> 16;
        this.hash = imul(this.hash, 0x85ebca6b);
        this.hash ^= this.hash >>> 13;
        this.hash = imul(this.hash, 0xc2b2ae35);
        this.hash ^= this.hash >>> 16;

        return this.hash >>> 0;
    }
}
