import {ValueSerializer} from "./value-serializer";

interface AppendedSerializer<Structure extends object, Name extends keyof Structure> {
    name: Name;
    serializer: ValueSerializer<Structure[Name]>;
}

export class ObjectSerializer<Structure extends object> extends ValueSerializer<Structure> {
    // TODO improve internal typing (and the any casts)
    private serializationSteps: AppendedSerializer<Structure, any>[] = [];

    get staticSize(): number | undefined {
        let size = 0;

        for (const {serializer} of this.serializationSteps) {
            const staticSize = serializer.staticSize

            if (staticSize == undefined)
                return undefined;

            size += staticSize;
        }

        return size;
    }

    append<Name extends keyof Structure, Serializer extends ValueSerializer<Structure[Name]>>(name: Name, serializer: Serializer) {
        this.serializationSteps.push({name, serializer} as AppendedSerializer<Structure, Name>);
        return this;
    }

    getSizeForValue(val: Structure): number {
        let size = 0;
        for (const {name, serializer} of this.serializationSteps)
            size += serializer.getSizeForValue((val as any)[name]);

        return size;
    }

    typeCheck(val: Structure, name = 'val'): void {
        if (typeof val != 'object')
            throw new Error(name + ' needs to be a object but was ' + val);

        for (const {name: innerName, serializer} of this.serializationSteps)
            serializer.typeCheck((val as any)[innerName], name + '.' + innerName);
    }

    serialize(dv: DataView, offset: number, val: Structure): { offset: number } {
        for (const {name, serializer} of this.serializationSteps) {
            const ret = serializer.serialize(dv, offset, (val as any)[name]);
            offset = ret.offset;
        }

        return {offset};
    }

    deserialize(dv: DataView, offset: number): { offset: number; val: Structure } {
        const val = {} as Structure;
        for (const {name, serializer} of this.serializationSteps) {
            const ret = serializer.deserialize(dv, offset);
            offset = ret.offset;
            (val as any) [name] = ret.val;
        }

        return {offset, val};
    }


}