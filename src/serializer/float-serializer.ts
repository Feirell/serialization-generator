import {ID_DV, ID_OFFSET, ValueSerializer} from "./value-serializer";
import {fnc} from "../fnc-template";

class FloatSerializer extends ValueSerializer<number> {
    private readonly typeIdentifier: string;

    constructor(
        private readonly byteSize: 4 | 8
    ) {
        super();

        if (![4, 8].includes(byteSize))
            throw new Error('byteSize needs to be 4 or 8 but was ' + byteSize);

        this.typeIdentifier = 'Float' + (byteSize * 8).toString();
    }

    getSizeForValue(val: number): number {
        return this.byteSize;
    }

    getRangeCheckStrippedBody(ID_LOCAL_VAL: string): string {
        const TYPE_IDENTIFIER = this.typeIdentifier;

        return fnc`
        if(!Number.isFinite(${ID_LOCAL_VAL}))
            throw new Error('${ID_LOCAL_VAL} needs to be a number to be serialized as ${TYPE_IDENTIFIER} but was ' + ${ID_LOCAL_VAL});
        `;
    }

    getSerializerStrippedBody(ID_LOCAL_VAL: string): string {
        const ID_TYPE = this.typeIdentifier;
        const BYTE_SIZE = '' + this.byteSize;

        return fnc`
        ${ID_DV}.set${ID_TYPE}(${ID_OFFSET}, ${ID_LOCAL_VAL});
        ${ID_OFFSET} += ${BYTE_SIZE};
        `;
    }

    getDeserializerStrippedBody(ID_LOCAL_VAL: string): string {
        const ID_TYPE = this.typeIdentifier;
        const BYTE_SIZE = '' + this.byteSize;

        return fnc`
        ${ID_LOCAL_VAL} = ${ID_DV}.get${ID_TYPE}(${ID_OFFSET});
        ${ID_OFFSET} += ${BYTE_SIZE};
        `;
    }
}

export const FLOAT32_SERIALIZER = new FloatSerializer(4);
export const FLOAT64_SERIALIZER = new FloatSerializer(8);