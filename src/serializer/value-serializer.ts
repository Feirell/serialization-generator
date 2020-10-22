interface SerializerFunction<Type> {
    (dv: ArrayBuffer | DataView, offset: number, val: Type, rangeCheck?: boolean): { offset: number }
}

interface DeserializerFunction<Type> {
    (dv: ArrayBuffer | DataView, offset: number): { offset: number, val: Type }
}

export abstract class ValueSerializer<Type> {
    public readonly TYPE_PINPOINT: Type = undefined as unknown as Type;

    abstract get staticSize(): number | undefined;

    /**
     * Gets the number of bytes needed to to serialize the value
     * @param val
     */
    abstract getSizeForValue(val: Type): number;

    abstract typeCheck(val: Type, name?: string): never | void;

    abstract serialize(dv: DataView, offset: number, val: Type): { offset: number };

    abstract deserialize(dv: DataView, offset: number): { offset: number, val: Type };

}