import {ID_DV, ID_OFFSET, ValueSerializer} from "./value-serializer";
import {fnc} from "../fnc-template";

export class ArrayBufferSerializer extends ValueSerializer<ArrayBuffer> {
    constructor() {
        super();
    }

    getSizeForValue(val: ArrayBuffer): number {
        if (val.byteLength > 0xffff)
            throw new Error('can not serialize a buffer with more than 65535 bytes length');

        return val.byteLength + 2;
    }

    getDeserializerStrippedBody(ID_LOCAL_VAL: string): string {
        return fnc`
        const length = ${ID_DV}.getUint16(${ID_OFFSET});
        ${ID_OFFSET} += 2;
        
        ${ID_LOCAL_VAL} = new ArrayBuffer(length);
        
        const target = new Uint8Array(${ID_LOCAL_VAL});
        const source = new Uint8Array(${ID_DV}.buffer);
        
        target.set(source.subarray(${ID_OFFSET}, ${ID_OFFSET} + length), 0);
        ${ID_OFFSET} += length;
        `;
    }

    getRangeCheckStrippedBody(ID_LOCAL_VAL: string): string {
        return fnc`
        if(!(${ID_LOCAL_VAL} instanceof ArrayBuffer))
            throw new Error('${ID_LOCAL_VAL} needs to be an ArrayBuffer but was ' + ${ID_LOCAL_VAL});
            
        if(${ID_LOCAL_VAL}.byteLength > 0xffff)
            throw new Error('${ID_LOCAL_VAL} is too large array buffer can not exceed 65535 bytes of length to be serialized');
        `;
    }

    getSerializerStrippedBody(ID_LOCAL_VAL: string): string {
        return fnc`
        const target = new Uint8Array(${ID_DV}.buffer);
        const source = new Uint8Array(${ID_LOCAL_VAL});
        
        const length = ${ID_LOCAL_VAL}.byteLength;
        
        ${ID_DV}.setUint16(${ID_OFFSET}, length);
        ${ID_OFFSET} += 2;
        debugger;
        target.set(source, ${ID_OFFSET});
        ${ID_OFFSET} += length;
        `;
    }
}

export const ARRAY_BUFFER_SERIALIZER = new ArrayBufferSerializer();