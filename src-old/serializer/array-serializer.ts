import {ID_DV, ID_OFFSET, ValueSerializer} from "./value-serializer";
import {fnc} from "../fnc-template";

export class ArraySerializer<Type> extends ValueSerializer<Type[]> {
    constructor(private readonly serializer: ValueSerializer<Type>) {
        super();
    }

    getSizeForValue(val: Type[]): number {
        return val.reduce((p, c) =>
            p + this.serializer.getSizeForValue(c), 0) + 2;
    }

    getRangeCheckStrippedBody(ID_LOCAL_VAL: string): string {
        const ID_ARRAY_ITEM = ID_LOCAL_VAL + '[i]';
        const rc = this.serializer.getRangeCheckStrippedBody(ID_ARRAY_ITEM);

        return fnc`
        for(let i = 0; i < ${ID_LOCAL_VAL}.length; i++){ 
            ${rc}
        }
        `;
    }

    getSerializerStrippedBody(ID_LOCAL_VAL: string): string {
        const ID_ARRAY_ITEM = ID_LOCAL_VAL + '[i]';
        const rc = this.serializer.getSerializerStrippedBody(ID_ARRAY_ITEM);

        return fnc`
        
        const length = ${ID_LOCAL_VAL}.length;
        
        ${ID_DV}.setUint16(${ID_OFFSET}, length);
        ${ID_OFFSET} += 2;
        
        for(let i = 0; i < length; i++){
            ${rc}
        }
        `;
    }

    getDeserializerStrippedBody(ID_LOCAL_VAL: string): string {
        const ID_ARRAY_ITEM = ID_LOCAL_VAL + '[i]';
        const rc = this.serializer.getDeserializerStrippedBody(ID_ARRAY_ITEM);

        return fnc`
        const length = ${ID_DV}.getUint16(${ID_OFFSET});
        ${ID_OFFSET} += 2;
        
        ${ID_LOCAL_VAL} = new Array(length);
        for(let i = 0; i < length; i++){ 
            ${rc}
        }
        `;
    }
}