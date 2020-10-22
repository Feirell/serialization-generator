import {ValueSerializer} from "./value-serializer";
import {fncPrefixAndArr} from "../fnc-template";

interface AppendedSerializer<Structure extends object, Name extends keyof Structure> {
    name: Name;
    serializer: ValueSerializer<Structure[Name]>;
}

export class ObjectSerializer<Structure extends object> extends ValueSerializer<Structure> {
    // TODO improve internal typing (any the other casts)
    private serializationSteps: AppendedSerializer<Structure, any>[] = [];

    constructor() {
        super();
    }

    getSizeForValue(val: Structure): number {
        return this.serializationSteps.reduce((p, c) =>
            p + c.serializer.getSizeForValue((val as any)[c.name]), 0);
    }

    append<Name extends keyof Structure, Serializer extends ValueSerializer<Structure[Name]>>(name: Name, serializer: Serializer) {
        this.serializationSteps.push({name, serializer} as AppendedSerializer<Structure, Name>);
        return this;
    }

    getRangeCheckStrippedBody(ID_LOCAL_VAL: string): string {
        const mappedSerializer = this.serializationSteps
            .map(({name, serializer}) => serializer.getRangeCheckStrippedBody(ID_LOCAL_VAL + '.' + name));

        return fncPrefixAndArr('', ...mappedSerializer);
    }

    getSerializerStrippedBody(ID_LOCAL_VAL: string): string {
        const mappedSerializer = this.serializationSteps
            .map(({name, serializer}) => '\n{' + serializer.getSerializerStrippedBody(ID_LOCAL_VAL + '.' + name) + '}\n');

        return fncPrefixAndArr('', ...mappedSerializer);
    }

    getDeserializerStrippedBody(ID_LOCAL_VAL: string): string {
        const mappedSerializer = this.serializationSteps
            .map(({name, serializer}) => '\n{' + serializer.getDeserializerStrippedBody(ID_LOCAL_VAL + '.' + name) + '}\n');

        return fncPrefixAndArr(ID_LOCAL_VAL + ' = {};\n', ...mappedSerializer);
    }
}