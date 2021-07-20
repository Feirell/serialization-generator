import {ValueSerializer} from "./value-serializer";

export class ArrayBufferSerializer extends ValueSerializer<ArrayBuffer> {
    getStaticSize(): number | undefined {
        return undefined;
    }

    getSizeForValue(val: ArrayBuffer): number {
        if (val.byteLength > 0xffff)
            throw new Error('can not serialize a buffer with more than 65535 bytes length');

        return val.byteLength + 2;
    }

    typeCheck(val: ArrayBuffer, name: string | undefined): void {
        if (!(val instanceof ArrayBuffer))
            throw new Error(name + ' needs to be an ArrayBuffer but was ' + val);

        if (val.byteLength > 0xffff)
            throw new Error(name + ' is too large array buffer can not exceed 65535 bytes of length to be serialized');
    }

    serialize(dv: DataView, offset: number, val: ArrayBuffer): { offset: number } {
        const target = new Uint8Array(dv.buffer);
        const source = new Uint8Array(val);

        const length = val.byteLength;

        dv.setUint16(offset, length);
        offset += 2;

        target.set(source, offset);
        offset += length;

        return {offset};
    }

    deserialize(dv: DataView, offset: number): { offset: number; val: ArrayBuffer } {
        const length = dv.getUint16(offset);
        offset += 2;

        const val = new ArrayBuffer(length);

        const target = new Uint8Array(val);
        const source = new Uint8Array(dv.buffer);

        target.set(source.subarray(offset, offset + length), 0);
        offset += length;

        return {offset, val};
    }

    getByteSizeFromDataInBuffer(dv: DataView, offset: number): number {
        return 2 + dv.getUint16(offset);
    }
}

export const ARRAY_BUFFER_SERIALIZER = new ArrayBufferSerializer();
