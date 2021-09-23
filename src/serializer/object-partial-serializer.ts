import {ValueSerializer} from "./value-serializer";
import {ObjectSerializer} from "./object-serializer";

export interface InstanceCreator<S extends object> {
    (): S
}

const isValidObjectMemberIdentifier = (key: string) => /^[a-zA-Z_]+[a-zA-Z0-9_]*$/.test(key);

export const DEFAULT_INSTANCE_CREATOR = <S extends object>() => ({} as S);

export interface ObjectSerializerOptions<Structure extends object> {
    instanceCreator?: InstanceCreator<Structure>;
}

const addFieldToPath = (base: string, field: string) => base + (isValidObjectMemberIdentifier(field) ?
        '.' + field :
        '["' + field + '"]'
);

type StringKeys<Type extends object, Keys = keyof Type> = Keys extends string ? Keys : never;

// export type OptionalArrayBuffer<Structure extends object> = {
//     [key in keyof Structure]: Structure[key] | ArrayBuffer | (Structure[key] extends object ? OptionalArrayBuffer<Structure[key]> : never);
// }

export type InsteadArrayBuffer<Structure extends object, Keys extends StringKeys<Structure>> = {
    [key in keyof Structure]: key extends Keys ? ArrayBuffer : Structure[key];
}

const isArrayBuffer = (val: any): val is ArrayBuffer => val instanceof ArrayBuffer;

const checkStaticBufferLength = (serializer: ValueSerializer<any>, value: ArrayBuffer, name: string) => {
    const staticSize = serializer.getStaticSize();
    if (staticSize !== undefined && staticSize != value.byteLength)
        throw new Error(
            'The provided optional array buffer is to big for the serializer given for the field ' + name + '. ' +
            'The static size of this field serializer is ' + staticSize + ' and the buffer has a length of ' + value.byteLength);
}

/**
 * The ObjectPartialSerializer is meant to give you a an easy to use way to map an simple object structure to a binary
 * representation by iteratively serializing / deserializing the properties of the object.
 *
 * In contrast to the ObjectSerializer, this serializer will be keeping specific properties as array buffers and accept
 * those fields as array buffers
 */
export class ObjectPartialSerializer<Structure extends object, KeepSerialized extends StringKeys<Structure>> extends ValueSerializer<InsteadArrayBuffer<Structure, KeepSerialized>> {
    // private readonly instanceCreator: InstanceCreator<InsteadArrayBuffer<Structure, KeepSerialized>>;
    private readonly fieldsToKeepSerialized: KeepSerialized[];

    constructor(
        private readonly fullObjectSerializer: ObjectSerializer<Structure>,
        ...fieldsToKeepSerialized: KeepSerialized[]) {
        super();

        this.fieldsToKeepSerialized = fieldsToKeepSerialized.slice(0);
        // this.instanceCreator = instanceCreator;
    }

    getStaticSize(): number | undefined {
        return this.fullObjectSerializer.getStaticSize();
    }

    /**
     * Clones this serializer.
     *
     * @returns A clone of this object serializer
     */
    clone() {
        return new ObjectPartialSerializer(
            this.fullObjectSerializer,
            ...this.fieldsToKeepSerialized
            // ,
            // {
            //     instanceCreator: this.instanceCreator
            // }
        );
    }


    getSizeForValue(val: InsteadArrayBuffer<Structure, KeepSerialized>): number {
        let size = 0;
        const serializers = this.fullObjectSerializer.getSerializationSteps();
        for (const {name, serializer} of serializers) {
            const fieldValue = val[name] as ArrayBuffer | Structure[typeof name];
            if (isArrayBuffer(fieldValue))
                size += fieldValue.byteLength;
            else
                size += serializer.getSizeForValue(fieldValue);
        }

        return size;
    }

    typeCheck(val: InsteadArrayBuffer<Structure, KeepSerialized>, name = 'val'): void {
        if (typeof val != 'object')
            throw new Error(name + ' needs to be a object but was ' + val);

        const staticSerializers = this.fullObjectSerializer.getStaticMembers();
        const serializers = this.fullObjectSerializer.getSerializationSteps();

        for (const {name: memberName, value} of staticSerializers) {
            if (!(memberName in val))
                throw new Error(addFieldToPath(name, memberName) + ' is missing in ' + name + ' but required as ' +
                    'static member');

            const fieldVal = val[memberName];

            if (!isArrayBuffer(fieldVal) && !Object.is(fieldVal, value))
                throw new Error('The value of the static member ' + memberName + ' at ' +
                    addFieldToPath(name, memberName) + ' does not match the provided static value ' + value +
                    ' is: ' + fieldVal);
        }


        for (const {name: innerName, serializer} of serializers) {
            if (!(innerName in val))
                throw new Error("The field " + addFieldToPath(name, innerName) + " defined in the serializationSteps is not present in the object.");

            const fieldVal = val[innerName];

            if (this.isNonSerializeField(innerName)) {
                if (!isArrayBuffer(fieldVal))
                    throw new Error(addFieldToPath(name, innerName) + ' is part of fieldsToKeepSerialized but the given value is not an ArrayBuffer but ' + fieldVal);
                else
                    checkStaticBufferLength(serializer, fieldVal, addFieldToPath(name, innerName));
            } else {
                serializer.typeCheck(fieldVal as any, addFieldToPath(name, innerName));
            }
        }
    }

    serialize(dv: DataView, offset: number, val: InsteadArrayBuffer<Structure, KeepSerialized>): { offset: number } {
        const serializers = this.fullObjectSerializer.getSerializationSteps();

        for (const {name, serializer} of serializers) {
            const element = val[name];

            if (this.fieldsToKeepSerialized.includes(name as KeepSerialized)) {
                if (!isArrayBuffer(element))
                    throw new Error(name + ' needs to be of type ArrayBuffer since it was defined as a fieldToKeepSerialized but ' + element + ' was given');

                // TODO should check the length of the array buffer to ensure that it matches with
                //  the designated space. The check in `typeCheck` is only for static sizes and will only raise an error
                //  when called, so it is not a fix for this specific issue.

                const target = new Uint8Array(dv.buffer);
                const source = new Uint8Array(element);

                target.set(source, offset);
                offset += source.length;
            } else {
                const ret = serializer.serialize(dv, offset, element as any);
                offset = ret.offset;
            }
        }

        return {offset};
    }

    deserialize(dv: DataView, offset: number): { offset: number; val: InsteadArrayBuffer<Structure, KeepSerialized> } {
        const val = this.fullObjectSerializer.instanceCreator() as InsteadArrayBuffer<Structure, KeepSerialized>;

        const staticSerializers = this.fullObjectSerializer.getStaticMembers();
        const serializers = this.fullObjectSerializer.getSerializationSteps();

        for (const {name, value} of staticSerializers) {
            if (!this.isNonSerializeField(name))
                val[name] = value as any;
        }

        for (const {name, serializer} of serializers) {
            if (this.isNonSerializeField(name)) {
                const sizeOfSegment = serializer.getByteSizeFromDataInBuffer(dv, offset);
                const segment = new ArrayBuffer(sizeOfSegment);

                const target = new Uint8Array(segment);

                const source = new Uint8Array(dv.buffer);
                const subSource = source.subarray(offset, offset + sizeOfSegment);

                target.set(subSource);

                offset += sizeOfSegment;
                val[name] = segment as any;
            } else {
                const ret = serializer.deserialize(dv, offset);
                offset = ret.offset;
                val[name] = ret.val as any;
            }
        }

        return {offset, val};
    }

    getByteSizeFromDataInBuffer(dv: DataView, offset: number): number {
        return this.fullObjectSerializer.getByteSizeFromDataInBuffer(dv, offset);
    }

    private isNonSerializeField(val: StringKeys<Structure>): val is KeepSerialized {
        return this.fieldsToKeepSerialized.includes(val as any);
    }
}
