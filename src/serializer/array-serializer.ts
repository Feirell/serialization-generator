import {SerializerType, ValueSerializer} from "./value-serializer";

// TODO Remove this new generic type as soon as https://github.com/microsoft/TypeScript/issues/44900 is resolved

/**
 *
 */
export class ArraySerializer<Serializer extends ValueSerializer<any>, Type extends SerializerType<Serializer> = SerializerType<Serializer>> extends ValueSerializer<Type[]> {
    constructor(private readonly serializer: Serializer) {
        super();
    }

    getStaticSize(): number | undefined {
        return undefined;
    }

    getSizeForValue(val: Type[]): number {
        const staticSize = this.serializer.getStaticSize();

        if (staticSize !== undefined)
            return 2 + staticSize * val.length;

        let size = 0;
        for (let i = 0; i < val.length; i++)
            size += this.serializer.getSizeForValue(val[i]);

        return size + 2;
    }

    typeCheck(val: Type[], name: string = 'val'): void {
        if (!Array.isArray(val))
            throw new Error(val + ' needs to be an array but was ' + val);

        for (let i = 0; i < val.length; i++)
            this.serializer.typeCheck(val[i], name + '[' + i + ']');
    }

    serialize(dv: DataView, offset: number, val: Type[]): { offset: number } {
        const length = val.length;

        if (length > 0xffff)
            throw new Error('The array is bigger than the maximum number of elements allowed');

        dv.setUint16(offset, length);
        offset += 2;

        const ser = this.serializer;
        for (let i = 0; i < length; i++) {
            const ret = ser.serialize(dv, offset, val[i]);
            offset = ret.offset;
        }

        return {offset};
    }

    deserialize(dv: DataView, offset: number): { offset: number; val: Type[] } {
        const length = dv.getUint16(offset);
        offset += 2;

        const val = new Array(length);
        for (let i = 0; i < length; i++) {
            const ret = this.serializer.deserialize(dv, offset);
            val[i] = ret.val;
            offset = ret.offset;
        }

        return {offset, val};
    }

    getByteSizeFromDataInBuffer(dv: DataView, offset: number): number {
        const length = dv.getUint16(offset);

        const staticSize = this.serializer.getStaticSize();
        if (staticSize !== undefined)
            return 2 + staticSize * length;

        const initialOffset = offset;

        offset += 2;

        for (let i = 0; i < length; i++) {
            offset += this.serializer.getByteSizeFromDataInBuffer(dv, offset);
        }

        return offset - initialOffset;
    }
}
