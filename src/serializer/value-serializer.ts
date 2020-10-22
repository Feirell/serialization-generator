import {fnc} from "../fnc-template";

export const ID_DV = fnc`dv`;
export const ID_VAL = fnc`val`;
export const ID_OFFSET = fnc`offset`;
export const ID_RANGE_CHECK = fnc`rangeCheck`;
export const AB_DV_CONV = fnc`
if(!(dv instanceof DataView))
  dv = new DataView(dv);
`;

interface SerializerFunction<Type> {
    (dv: ArrayBuffer | DataView, offset: number, val: Type, rangeCheck?: boolean): { offset: number }
}

interface DeserializerFunction<Type> {
    (dv: ArrayBuffer | DataView, offset: number): { offset: number, val: Type }
}

export abstract class ValueSerializer<Type> {
    public readonly TYPE_PINPOINT: Type = undefined as unknown as Type;

    protected constructor() {
    }

    /**
     * Gets the number of bytes needed to to serialize the value
     * @param val
     */
    abstract getSizeForValue(val: Type): number;

    abstract getRangeCheckStrippedBody(ID_LOCAL_VAL: string): string;

    getSerializer(): SerializerFunction<Type> {
        return Function(fnc`
        function serializer(${ID_DV}, ${ID_OFFSET}, ${ID_VAL}, ${ID_RANGE_CHECK} = false){
          ${AB_DV_CONV}
          
          if(${ID_RANGE_CHECK}){
            ${this.getRangeCheckStrippedBody(ID_VAL)}
          }
          
          ${this.getSerializerStrippedBody(ID_VAL)}
                    
          return {offset: ${ID_OFFSET}};
        }
        
        return serializer;
        `)();
    }

    abstract getSerializerStrippedBody(ID_LOCAL_VAL: string): string;

    getDeserializer(): DeserializerFunction<Type> {
        return Function(fnc`
        function deserializer(${ID_DV}, ${ID_OFFSET}, ${ID_RANGE_CHECK} = false){
          ${AB_DV_CONV}
          
          if(${ID_RANGE_CHECK}){
            ${this.getRangeCheckStrippedBody(ID_VAL)}
          }
          
          let ${ID_VAL};
          ${this.getDeserializerStrippedBody(ID_VAL)}
          
          return {offset: ${ID_OFFSET}, val: ${ID_VAL}};
        }
        
        return deserializer;
        `)();
    }

    abstract getDeserializerStrippedBody(ID_LOCAL_VAL: string): string;

    generate(): { serializer: SerializerFunction<Type>; deserializer: DeserializerFunction<Type> } {
        return {
            serializer: this.getSerializer(),
            deserializer: this.getDeserializer()
        }
    }

}