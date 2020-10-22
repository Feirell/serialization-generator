import {ValueSerializer} from "./value-serializer";
import {ArrayBufferSerializer} from "./array-buffer-serializer";
import {fnc} from "../fnc-template";

export class StringSerializer<Type extends object> extends ValueSerializer<string> {
    private static readonly te = new TextEncoder();

    constructor() {
        super();
    }

    getSizeForValue(val: string): number {
        // TODO don't encode here

        const byteLength = StringSerializer.te.encode(val).length;

        if (byteLength > 0xffff)
            throw new Error('can not serialize a buffer with more than 65535 bytes length');

        return byteLength + 2;
    }

    getDeserializerStrippedBody(ID_LOCAL_VAL: string): string {
        const ID_INTERMEDIATE = 'intermediateBuffer';

        const abDes = new ArrayBufferSerializer().getDeserializerStrippedBody(ID_INTERMEDIATE);
        return fnc`
        let ${ID_INTERMEDIATE};
        ${abDes}
        
        const str = new TextDecoder().decode(${ID_INTERMEDIATE});
        ${ID_LOCAL_VAL} = str;
        `;
    }

    getRangeCheckStrippedBody(ID_LOCAL_VAL: string): string {
        return fnc`
        if(typeof ${ID_LOCAL_VAL} == 'string')
            throw new Error('${ID_LOCAL_VAL} needs to be an String but was ' + ${ID_LOCAL_VAL});
        `;

        // TODO removed length check, since it will otherwise be encoded thrice
        // if(${ID_LOCAL_VAL}.byteLength > 0xffff)
        //   throw new Error('${ID_LOCAL_VAL} is too large array buffer can not exceed 65535 bytes of length to be serialized');
    }

    getSerializerStrippedBody(ID_LOCAL_VAL: string): string {
        const ID_INTERMEDIATE = 'intermediateBuffer';

        const abSer = new ArrayBufferSerializer().getSerializerStrippedBody(ID_INTERMEDIATE);
        return fnc`
        const ${ID_INTERMEDIATE} = new TextEncoder().encode(${ID_LOCAL_VAL}).buffer;
        
        ${abSer}
        `;
    }

}

export const STRING_SERIALIZER = new StringSerializer();