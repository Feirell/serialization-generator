import {ValueSerializer} from "./value-serializer";

export class ArraySerializer<Type> extends ValueSerializer<Type[]> {
    constructor(private readonly serializer: ValueSerializer<Type>) {
        super();
    }

    get staticSize(): number | undefined {
        return undefined;
    }

    getSizeForValue(val: Type[]): number {
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
}