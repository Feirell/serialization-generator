interface SerializerFunction<Type> {
    (dv: ArrayBuffer | DataView, offset: number, val: Type, rangeCheck?: boolean): { offset: number }
}

interface DeserializerFunction<Type> {
    (dv: ArrayBuffer | DataView, offset: number): { offset: number, val: Type }
}

/**
 * This is the general class used to identify a serializer by. It does not contain any additional functionality but
 * might do so in the future. It does contain the TYPE_PINPOINT field which is only used by TypeScript to raise an error
 * when non matching instances are applied, since the generic is not used for those checks.
 */
export abstract class ValueSerializer<Type> {
    public readonly TYPE_PINPOINT: Type = undefined as unknown as Type;

    /**
     * This attribute is used to identify if the number of bytes used by this serializer to serialize the value is
     * dependent on the value which is serialized or if it is the same for all values.
     *
     * This value is undefined if it is dependent on the value which is serialized or is a number of bytes needed to
     * serialize any value.
     */
    abstract getStaticSize(): number | undefined;

    /**
     * Gets the number of bytes needed to to serialize the given value. This value will be the same as staticSize if it
     * is static.
     *
     * @param val the value to serialize
     */
    abstract getSizeForValue(val: Type): number;

    /**
     * This function will check weather the provided value is fully serializable by this serializer. Which includes a
     * range and a type check.
     *
     * @param val the value to check
     * @param name the name this value has in a greater scope, is used to generate more readable error messages
     */
    abstract typeCheck(val: Type, name?: string): never | void;

    /**
     * Serializes the given value using the provided DataView in respect to the provided offset in bytes. It returns an
     * object with the new offset (offset + getSizeForValue(val)).
     *
     * @param dv DataView which will be used to write the values to the underlying buffer.
     * @param offset Offset in bytes to write the values in respect to.
     * @param val The Value to serialize.
     */
    abstract serialize(dv: DataView, offset: number, val: Type): { offset: number };

    /**
     * Deserializes the given data into the data representation which was originally given. It returns an object with
     * the offset (the next unread byte) and the value which was created from the DataView.
     *
     * @param dv The DataView to read the data from.
     * @param offset The initial offset to start reading from
     */
    abstract deserialize(dv: DataView, offset: number): { offset: number, val: Type };

}