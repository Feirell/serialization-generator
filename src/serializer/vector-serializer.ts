import {SerializerType, ValueSerializer} from "./value-serializer";

type FixedLengthArray<Type, Count extends number> =
    Count extends 1 ? [Type] :
        Count extends 2 ? [Type, Type] :
            Count extends 3 ? [Type, Type, Type] :
                Count extends 4 ? [Type, Type, Type, Type] :
                    Count extends 5 ? [Type, Type, Type, Type, Type] :
                        Count extends 6 ? [Type, Type, Type, Type, Type, Type] :
                            Count extends 7 ? [Type, Type, Type, Type, Type, Type, Type] :
                                Count extends 8 ? [Type, Type, Type, Type, Type, Type, Type, Type] :
                                    Count extends 9 ? [Type, Type, Type, Type, Type, Type, Type, Type, Type] :
                                        Count extends 10 ? [Type, Type, Type, Type, Type, Type, Type, Type, Type, Type] :
                                            never;

// TODO Remove this new generic type as soon as https://github.com/microsoft/TypeScript/issues/44900 is resolved

/**
 *
 */
export class VectorSerializer<Serializer extends ValueSerializer<any>, Type extends SerializerType<Serializer>, Length extends 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10> extends ValueSerializer<FixedLengthArray<Type, Length>> {
    constructor(private readonly serializer: Serializer, private readonly length: Length) {
        super();
    }

    getStaticSize(): number | undefined {
        const ser = this.serializer.getStaticSize();
        return ser == undefined ? undefined : ser * this.length;
    }

    getSizeForValue(val: FixedLengthArray<Type, Length>): number {
        let size = 0;
        for (let i = 0; i < this.length; i++)
            size += this.serializer.getSizeForValue((val as any)[i]);

        return size;
    }

    getByteSizeFromDataInBuffer(dv: DataView, offset: number): number {
        const staticSize = this.getStaticSize();
        if (staticSize !== undefined)
            return staticSize;

        const initialOffset = offset;

        for (let i = 0; i < this.length; i++)
            offset += this.serializer.getByteSizeFromDataInBuffer(dv, offset);

        return offset - initialOffset;
    }

    typeCheck(val: FixedLengthArray<Type, Length>, name: string = 'val'): void {
        if (!Array.isArray(val))
            throw new Error(val + ' needs to be an array but was ' + val);

        if (val.length != this.length)
            throw new Error(val + '.length needs to be equal to the defined length ' + this.length + ' but was ' + val.length);

        for (let i = 0; i < val.length; i++)
            this.serializer.typeCheck((val as any)[i], name + '[' + i + ']');
    }

    serialize(dv: DataView, offset: number, val: FixedLengthArray<Type, Length>): { offset: number } {
        const length = this.length;

        const ser = this.serializer;
        for (let i = 0; i < length; i++) {
            const ret = ser.serialize(dv, offset, (val as any)[i]);
            offset = ret.offset;
        }

        return {offset};
    }

    deserialize(dv: DataView, offset: number): { offset: number; val: FixedLengthArray<Type, Length> } {
        const length = this.length;

        const val = new Array(length) as any as FixedLengthArray<Type, Length>;
        for (let i = 0; i < length; i++) {
            const ret = this.serializer.deserialize(dv, offset);
            (val as any)[i] = ret.val;
            offset = ret.offset;
        }

        return {offset, val};
    }
}
