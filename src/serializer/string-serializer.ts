import {ValueSerializer} from "./value-serializer";
import {ArrayBufferSerializer} from "./array-buffer-serializer";

export class StringSerializer<Type extends object> extends ValueSerializer<string> {
    private static readonly te = new TextEncoder();
    private static readonly td = new TextDecoder();

    private lastCheckedString: string = '';
    private lastCheckedSerialization = new Uint8Array([0, 0]);

    private readonly abSer = new ArrayBufferSerializer();

    getStaticSize(): number | undefined {
        return undefined;
    }

    getSizeForValue(val: string): number {
        const byteLength = this.getNumberOfBytesString(val);

        if (byteLength > 0xffff)
            throw new Error('can not serialize a buffer with more than 65535 bytes length');

        return byteLength + 2;
    }

    typeCheck(val: string, name: string = 'val'): void {
        if (typeof val != 'string')
            throw new Error(name + ' needs to be an String but was ' + val);

        const size = this.getNumberOfBytesString(val);
        if (size > 0xffff)
            throw new Error(name + ' needs to have a size equal or lower than 65535 bytes but had a size of ' + size);
    }

    serialize(dv: DataView, offset: number, val: string): { offset: number; } {
        const ser = this.serializeString(val);
        return this.abSer.serialize(dv, offset, ser.buffer);
    }

    deserialize(dv: DataView, offset: number): { offset: number; val: string; } {
        const ret = this.abSer.deserialize(dv, offset);
        const val = this.deserializeString(ret.val);

        return {offset: ret.offset, val};
    }

    getByteSizeFromDataInBuffer(dv: DataView, offset: number): number {
        return this.abSer.getByteSizeFromDataInBuffer(dv, offset);
    }

    private deserializeString(ab: ArrayBuffer): string {
        return StringSerializer.td.decode(ab);
    }

    private serializeString(str: string): Uint8Array {
        if (this.lastCheckedString != str) {
            this.lastCheckedString = str;
            this.lastCheckedSerialization = StringSerializer.te.encode(str);
        }

        return this.lastCheckedSerialization;
    }

    private getNumberOfBytesString(str: string): number {
        // TODO don't encode here
        return this.serializeString(str).length;
    }
}

export const STRING_SERIALIZER = new StringSerializer();
