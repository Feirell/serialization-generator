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

    /**
     * TypeScript only property to prevent to assignment of non fitting classes.
     *
     * @ignore
     * @hidden
     * @internal
     */
    declare public readonly TYPE_PINPOINT: Type;

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
     * This function will check whether the provided value is fully serializable by this serializer. Which includes a
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

    /**
     * Shortcut which creates an appropriately sized ArrayBuffer for the value and serializes the value.
     *
     * @param val the value to serialize
     */
    valueToArrayBuffer(val: Type): ArrayBuffer {
        const ab = new ArrayBuffer(this.getSizeForValue(val));
        const dv = new DataView(ab);
        this.serialize(dv, 0, val);
        return ab;
    }

    /**
     * Shortcut which deserializes the value and assumes the whole ArrayBuffer for this action.
     *
     * @param arrayBuffer the ArrayBuffer which contains the value
     */
    arrayBufferToValue(arrayBuffer: ArrayBuffer): Type {
        return this.deserialize(new DataView(arrayBuffer), 0).val;
    }

    /**
     * This method retrieves the number of bytes this serializer will consume from the given buffer and offset.
     * This is handy if you want to split the deserialization or want to skip sections of the deserialization.
     *
     * If the `getStaticSize` value is given than this method will return this value, if not then it will use the given
     * buffer to calculate the length without deserializing it.
     *
     * Be aware that this operation might be called recursively and not as fast as expected since the full byte size
     * of a structure is not written in the data.
     */
    getByteSizeFromDataInBuffer(dv: DataView, offset: number) {
        const staticSize = this.getStaticSize();
        if (staticSize !== undefined)
            return staticSize;
        else
            throw new Error('This serializer does not implement this method.');
    }
}

export type SerializerType<V> = V extends ValueSerializer<any> ? V['TYPE_PINPOINT'] : never;
