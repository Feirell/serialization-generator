import {ValueSerializer} from "./value-serializer";

const intRange = (unsigned: boolean, bytes: number): [number, number] => {
    let min = NaN;
    let max = NaN;

    if (unsigned) {
        min = 0;
        switch (bytes) {
            case 1:
                max = 0xff
                break;
            case 2:
                max = 0xffff
                break;
            case 4:
                max = 0xffffffff
                break;
        }
    } else { // doing it manually since otherwise it could overflow
        switch (bytes) {
            case 1:
                min = -0x80;
                max = 0x7f;
                break;
            case 2:
                min = -0x8000;
                max = 0x7fff;
                break;
            case 4:
                min = -0x80000000;
                max = 0x7fffffff;
                break;
        }
    }

    return [min, max];
}

class IntSerializer extends ValueSerializer<number> {
    private readonly min: number;
    private readonly max: number;
    private readonly typeIdentifier: string;

    private readonly dvSerializer;
    private readonly dvDeserializer;

    constructor(
        private readonly byteSize: 1 | 2 | 4,
        private readonly unsigned: boolean,
    ) {
        super();

        if (![1, 2, 4].includes(byteSize))
            throw new Error('byteSize needs to be 1, 2 or 4 but was ' + byteSize);

        const [min, max] = intRange(unsigned, byteSize);

        this.min = min;
        this.max = max;

        this.typeIdentifier = (unsigned ? 'Uint' : 'Int') + (byteSize * 8).toString();

        this.dvSerializer = (DataView as any).prototype['set' + this.typeIdentifier];
        this.dvDeserializer = (DataView as any).prototype['get' + this.typeIdentifier];
    }

    getStaticSize(): number | undefined {
        return this.byteSize;
    }

    getSizeForValue(val: number): number {
        return this.byteSize;
    }

    typeCheck(val: number, name: string = 'val') {
        if (!Number.isInteger(val))
            throw new Error(name + ' needs to be a integer to be serialized as ' + this.typeIdentifier + ' but was ' + val);

        if (val < this.min)
            throw new Error(name + ' needs to be greater or equal to ' + this.min + ' to be serialized as ' + this.typeIdentifier + ' but was ' + val);

        if (val > this.max)
            throw new Error(name + ' needs to be less or equal to ${max} to be serialized as ' + this.typeIdentifier + ' but was ' + val);
    }

    serialize(dv: DataView, offset: number, val: number): { offset: number } {
        // (dv as any)['set' + this.typeIdentifier](offset, val);
        this.dvSerializer.call(dv, offset, val);
        offset += this.byteSize;
        return {offset};
    }

    deserialize(dv: DataView, offset: number): { offset: number; val: number } {
        // const val = (dv as any)['get' + this.typeIdentifier](offset);
        const val = this.dvDeserializer.call(dv, offset);
        offset += this.byteSize;
        return {offset, val};
    }
}

export const UINT8_SERIALIZER = new IntSerializer(1, true);
export const UINT16_SERIALIZER = new IntSerializer(2, true);
export const UINT32_SERIALIZER = new IntSerializer(4, true);

export const INT8_SERIALIZER = new IntSerializer(1, false);
export const INT16_SERIALIZER = new IntSerializer(2, false);
export const INT32_SERIALIZER = new IntSerializer(4, false);
