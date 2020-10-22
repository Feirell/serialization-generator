import {ID_DV, ID_OFFSET, ValueSerializer} from "./value-serializer";
import {fnc} from "../fnc-template";

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
    }

    getSizeForValue(val: number): number {
        return this.byteSize;
    }

    getRangeCheckStrippedBody(ID_LOCAL_VAL: string): string {
        const min = '' + this.min;
        const max = '' + this.max;

        const TYPE_IDENTIFIER = this.typeIdentifier;

        return fnc`
        if(!Number.isInteger(${ID_LOCAL_VAL}))
           throw new Error('${ID_LOCAL_VAL} needs to be a integer to be serialized as ${TYPE_IDENTIFIER} but was ' + ${ID_LOCAL_VAL});
              
        if(${ID_LOCAL_VAL} < ${min})
          throw new Error('${ID_LOCAL_VAL} needs to be greater or equal to ${min} to be serialized as ${TYPE_IDENTIFIER} but was ' + ${ID_LOCAL_VAL});
          
        if(${ID_LOCAL_VAL} > ${max})
          throw new Error('${ID_LOCAL_VAL} needs to be less or equal to ${max} to be serialized as ${TYPE_IDENTIFIER} but was ' + ${ID_LOCAL_VAL});
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

export const UINT8_SERIALIZER = new IntSerializer(1, true);
export const UINT16_SERIALIZER = new IntSerializer(2, true);
export const UINT32_SERIALIZER = new IntSerializer(4, true);

export const INT8_SERIALIZER = new IntSerializer(1, false);
export const INT16_SERIALIZER = new IntSerializer(2, false);
export const INT32_SERIALIZER = new IntSerializer(4, false);