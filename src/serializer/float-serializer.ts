import {ValueSerializer} from "./value-serializer";

class FloatSerializer extends ValueSerializer<number> {
    private readonly typeIdentifier: string;

    private readonly dvSerializer;
    private readonly dvDeserializer;

    constructor(
        private readonly byteSize: 4 | 8
    ) {
        super();

        if (![4, 8].includes(byteSize))
            throw new Error('byteSize needs to be 4 or 8 but was ' + byteSize);

        this.typeIdentifier = 'Float' + (byteSize * 8).toString();

        this.dvSerializer = DataView.prototype['set' + this.typeIdentifier];
        this.dvDeserializer = DataView.prototype['get' + this.typeIdentifier];
    }

    getStaticSize(): number | undefined {
        return this.byteSize;
    }

    getSizeForValue(val: number): number {
        return this.byteSize;
    }

    typeCheck(val: number, name: string = 'val') {
        if (!Number.isFinite(val))
            throw new Error(name + ' needs to be a integer to be serialized as ' + this.typeIdentifier + ' but was ' + val);
    }

    serialize(dv: DataView, offset: number, val: number): { offset: number } {
        this.dvSerializer.call(dv, offset, val);
        offset += this.byteSize;
        return {offset};
    }

    deserialize(dv: DataView, offset: number): { offset: number; val: number } {
        const val = this.dvDeserializer.call(dv, offset);
        offset += this.byteSize;
        return {offset, val};
    }
}

export const FLOAT32_SERIALIZER = new FloatSerializer(4);
export const FLOAT64_SERIALIZER = new FloatSerializer(8);