import {ValueSerializer} from "./value-serializer";

interface AppendedSerializer<Structure extends object, Name extends keyof Structure> {
    name: Name;
    serializer: ValueSerializer<Structure[Name]>;
}

export interface InstanceCreator<S extends object> {
    (): S
}

export interface PropertyGetter<S extends object> {
    (instance: S, key: keyof S): S[typeof key];
}

export interface PropertySetter<S extends object> {
    (instance: S, key: keyof S, val: S[typeof key]): void;
}

export const DEFAULT_INSTANCE_CREATOR = <S extends object>() => ({} as S);
export const DEFAULT_PROPERTY_GETTER: PropertyGetter<any> = (instance, key) => instance[key];
export const DEFAULT_PROPERTY_SETTER: PropertySetter<any> = (instance, key, val) => instance[key] = val;

export type MappedSerializer<T extends object> = { [key in keyof T]?: ValueSerializer<T[key]> };

export interface ObjectSerializerOptions<Structure extends object> {
    instanceCreator?: InstanceCreator<Structure>;
    propertyGetter?: PropertyGetter<Structure>;
    propertySetter?: PropertySetter<Structure>;
}

export class ObjectSerializer<Structure extends object> extends ValueSerializer<Structure> {
    // TODO improve internal typing (and the any casts)
    private serializationSteps: AppendedSerializer<Structure, any>[] = [];

    private readonly instanceCreator: InstanceCreator<Structure>;
    private readonly propertyGetter: PropertyGetter<Structure>;
    private readonly propertySetter: PropertySetter<Structure>;

    constructor(initialSerializer: MappedSerializer<Structure> = {}, {
        instanceCreator = DEFAULT_INSTANCE_CREATOR,
        propertyGetter = DEFAULT_PROPERTY_GETTER,
        propertySetter = DEFAULT_PROPERTY_SETTER
    }: ObjectSerializerOptions<Structure> = {}) {
        super();

        this.instanceCreator = instanceCreator;
        this.propertyGetter = propertyGetter;
        this.propertySetter = propertySetter;

        for (const [key, ser] of Object.entries(initialSerializer))
            this.append(key as keyof Structure, ser as ValueSerializer<any>);
    }

    getStaticSize(): number | undefined {
        let size = 0;

        for (const {serializer} of this.serializationSteps) {
            const staticSize = serializer.getStaticSize()

            if (staticSize == undefined)
                return undefined;

            size += staticSize;
        }

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
    append<Name extends keyof Structure, Serializer extends ValueSerializer<Structure[Name]>>(name: Name, serializer: Serializer) {
        this.serializationSteps.push({name, serializer} as AppendedSerializer<Structure, Name>);
        return this;
    }

    /**
     * Replaces ALL serializers which were attached using the given name with the given serializer.
     *
     * @param name The name which was used to attach the serializers which you want to replace.
     * @param serializer The serializer you want to use as the replacement.
     */
    replaceSerializer<Name extends keyof Structure, Serializer extends ValueSerializer<Structure[Name]>>(name: Name, serializer: Serializer) {
        const serSteps = this.serializationSteps;
        for (let i = 0; i < serSteps.length; i++)
            if (serSteps[i].name == name)
                serSteps[i] = {name, serializer}

        return this;
    }

    /**
     * Removes all serializer which are appended using this field identifier.
     *
     * @param name the name to search for
     */
    remove<Name extends keyof Structure>(name: Name) {
        for (let i = this.serializationSteps.length - 1; i >= 0; i--) {
            if (this.serializationSteps[i].name == name) {
                this.serializationSteps.splice(i, 1);

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
        const inst = new ObjectSerializer<Structure>({}, {
            instanceCreator: this.instanceCreator,
            propertyGetter: this.propertyGetter,
            propertySetter: this.propertySetter
        });

        inst.serializationSteps = this.serializationSteps.slice();
        return inst;
    }

    getSizeForValue(val: Structure): number {
        let size = 0;
        for (const {name, serializer} of this.serializationSteps)
            size += serializer.getSizeForValue(this.propertyGetter(val, name));

        return size;
    }

    typeCheck(val: Structure, name = 'val'): void {
        if (typeof val != 'object')
            throw new Error(name + ' needs to be a object but was ' + val);

        for (const {name: innerName, serializer} of this.serializationSteps)
            serializer.typeCheck(this.propertyGetter(val, innerName), name + '.' + innerName);
    }

    serialize(dv: DataView, offset: number, val: Structure): { offset: number } {
        for (const {name, serializer} of this.serializationSteps) {
            const ret = serializer.serialize(dv, offset, this.propertyGetter(val, name));
            offset = ret.offset;
        }

        return {offset};
    }

    deserialize(dv: DataView, offset: number): { offset: number; val: Structure } {
        const val = this.instanceCreator() as Structure;
        for (const {name, serializer} of this.serializationSteps) {
            const ret = serializer.deserialize(dv, offset);
            offset = ret.offset;
            this.propertySetter(val, name, ret.val);
        }

        return {offset, val};
    }

}