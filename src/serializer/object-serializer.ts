import {ValueSerializer} from "./value-serializer";

interface StaticMember<Structure extends object, Name extends StringKeys<Structure>> {
    name: Name;
    value: Structure[Name];
}

interface AppendedSerializer<Structure extends object, Name extends StringKeys<Structure>> {
    name: Name;
    serializer: ValueSerializer<Structure[Name]>;
}

export interface InstanceCreator<S extends object> {
    (): S
}

const isValidObjectMemberIdentifier = (key: string) => /^[a-zA-Z_]+[a-zA-Z0-9_]*$/.test(key);

export const DEFAULT_INSTANCE_CREATOR = <S extends object>() => ({} as S);

export type MappedSerializer<T extends object> = { [key in StringKeys<T>]?: ValueSerializer<T[key]> };

export interface ObjectSerializerOptions<Structure extends object> {
    instanceCreator?: InstanceCreator<Structure>;
}

/**
 * Can be used to combine multiple object serializers to one.
 *
 * @param os
 */
export const combineObjectSerializer = <K extends object>(...os: ObjectSerializer<K>[]): ObjectSerializer<K> => {
    const ser = new ObjectSerializer<K>();

    for (const oneSer of os)
        for (const step of oneSer.getStaticMembers())
            ser.appendStatic(step.name, step.value);

    for (const oneSer of os)
        for (const step of oneSer.getSerializationSteps())
            ser.append(step.name, step.serializer);

    return ser;
}

const addFieldToPath = (base: string, field: string) => base + (isValidObjectMemberIdentifier(field) ?
        '.' + field :
        '["' + field + '"]'
);

type StringKeys<Type extends object, Keys = keyof Type> = Keys extends string ? Keys : never;

/**
 * The ObjectSerializer is meant to give you a an easy to use way to map an simple object structure to a binary
 * representation by iteratively serializing / deserializing the properties of the object.
 */
export class ObjectSerializer<Structure extends object> extends ValueSerializer<Structure> {
    private staticMembers: StaticMember<Structure, StringKeys<Structure>>[] = [];
    private serializationSteps: AppendedSerializer<Structure, StringKeys<Structure>>[] = [];

    public readonly instanceCreator: InstanceCreator<Structure>;
    private cachedStaticSize: null | undefined | number = null;

    /**
     * You defined the whole structure for serialization in the constructor by defining all property name to serializer
     * mapping via the initialSerializer argument. See the README for an example.
     *
     * The serializerOptions is used to define the instance creator, which should be used to create new object instances
     * of this type. This can be useful if you want to create a instance of a class of attach a prototype manually.
     *
     * In any case, any member will be overwritten by the defined serializers or the static members. The default is just
     * the object literal `{}`.
     *
     * @param initialSerializer
     * @param serializerOptions
     */
    constructor(initialSerializer: MappedSerializer<Structure> = {}, {
        instanceCreator = DEFAULT_INSTANCE_CREATOR
    }: ObjectSerializerOptions<Structure> = {}) {
        super();

        this.instanceCreator = instanceCreator;

        for (const [key, ser] of Object.entries(initialSerializer))
            this.append(key as StringKeys<Structure>, ser as ValueSerializer<any>);
    }

    getStaticSize(): number | undefined {
        if (this.cachedStaticSize !== null)
            return this.cachedStaticSize;

        let size = 0;

        for (const {serializer} of this.serializationSteps) {
            const staticSize = serializer.getStaticSize()

            if (staticSize == undefined) {
                this.cachedStaticSize = undefined;
                return undefined;
            }

            size += staticSize;
        }

        this.cachedStaticSize = size;
        return size;
    }

    /**
     * Appends a serializer for the given name. This serializer needs to be able to serialize the type
     * of the field from the object. There is no check whether the field actually exists or if there is already another
     * serializer registered for this field identifier.
     *
     * All serializer will be called in their appended order.
     *
     * @param name The field name to attach this serializer on.
     * @param serializer The serializer to attach on that field.
     */
    append<Name extends StringKeys<Structure>, Serializer extends ValueSerializer<Structure[Name]>>(name: Name, serializer: Serializer) {
        this.ensureNameIsNotTaken(name);
        this.cachedStaticSize = null;
        this.serializationSteps.push({name, serializer} as AppendedSerializer<Structure, Name>);
        return this;
    }

    /**
     * This method sets a static value which will not be serialized and transferred but added after the serialization
     * is finished. This can be useful when you have an identifier member which is always the same for all instanced of
     * this type.
     *
     * @param name The name of the field for the static value.
     * @param value The value which should be put there.
     */
    appendStatic<Name extends StringKeys<Structure>, Value extends Structure[Name]>(name: Name, value: Value) {
        this.ensureNameIsNotTaken(name);

        this.staticMembers.push({name, value} as StaticMember<Structure, Name>);
        return this;
    }

    /**
     * Removes the serializer which are appended using this field identifier.
     *
     * @param name the name to search for
     */
    remove<Name extends StringKeys<Structure>>(name: Name) {
        for (let i = 0; i < this.serializationSteps.length; i++) {
            if (this.serializationSteps[i].name == name) {
                this.serializationSteps.splice(i, 1);
                this.cachedStaticSize = null;
                return this;
            }
        }

        return this;
    }

    /**
     * Clones this object serializer, which can be handy if you want to create the serializers for two different
     * subtypes of a more general instance.
     *
     * @returns A clone of this object serializer
     */
    clone() {
        const inst = new ObjectSerializer<Structure>();

        inst.staticMembers = this.staticMembers.slice();
        inst.serializationSteps = this.serializationSteps.slice();

        return inst;
    }

    getSizeForValue(val: Structure): number {
        const staticSize = this.getStaticSize();
        if (typeof staticSize == 'number')
            return staticSize;

        let size = 0;
        for (const {name, serializer} of this.serializationSteps)
            size += serializer.getSizeForValue(val[name]);

        return size;
    }

    typeCheck(val: Structure, name = 'val'): void {
        if (typeof val != 'object')
            throw new Error(name + ' needs to be a object but was ' + val);

        for (const {name: memberName, value} of this.staticMembers) {
            if (!(memberName in val))
                throw new Error(addFieldToPath(name, memberName) + ' is missing in ' + name + ' but required as ' +
                    'static member');

            if (!Object.is(val[memberName], value))
                throw new Error('The value of the static member ' + memberName + ' at ' +
                    addFieldToPath(name, memberName) + ' does not match the provided static value ' + value +
                    ' is: ' + val[memberName]);
        }


        for (const {name: innerName, serializer} of this.serializationSteps) {
            if (!(innerName in val))
                throw new Error();

            serializer.typeCheck(val[innerName], addFieldToPath(name, innerName));
        }
    }

    serialize(dv: DataView, offset: number, val: Structure): { offset: number } {
        for (const {name, serializer} of this.serializationSteps) {
            const ret = serializer.serialize(dv, offset, val[name]);
            offset = ret.offset;
        }

        return {offset};
    }

    deserialize(dv: DataView, offset: number): { offset: number; val: Structure } {
        const val = this.instanceCreator();

        for (const {name, value} of this.staticMembers) {
            val[name] = value;
        }

        for (const {name, serializer} of this.serializationSteps) {
            const ret = serializer.deserialize(dv, offset);
            offset = ret.offset;
            val[name] = ret.val;
        }

        return {offset, val};
    }

    getStaticMembers() {
        return this.staticMembers;
    }

    getSerializationSteps() {
        return this.serializationSteps;
    }

    getByteSizeFromDataInBuffer(dv: DataView, offset: number): number {
        const staticSize = this.getStaticSize();

        if (staticSize !== undefined)
            return staticSize;

        const startOffset = offset;

        for (const {serializer} of this.serializationSteps) {
            offset += serializer.getByteSizeFromDataInBuffer(dv, offset);
        }

        return offset - startOffset;
    }

    private ensureNameIsNotTaken<Name extends StringKeys<Structure>>(name: Name) {
        if (this.serializationSteps.some(v => v.name == name))
            throw new Error('Can not register on this name since an serializer is already registered on this name');

        if (this.staticMembers.some(v => v.name == name))
            throw new Error('Can not register on this name since an static value is already registered on this name');
    }
}
