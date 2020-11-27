// TODO Finish, this erializer is meant to extract common values from the structure and encode that as a common value
// and the differing in and following array

class GroupBySerializer<Structure extends object, Field extends keyof Structure> extends ValueSerializer<Structure[]> {
    private setFullCommon = false;

    private common: ValueSerializer<Pick<Structure, Field>> = new ObjectSerializer();
    private fields: Field[];

    private lastDone: Structure[] = [];
    private lastSets: { distinguishVal: any[], associatedStructures: Structure[] }[] = []

    constructor(private restSerializer: ValueSerializer<Omit<Structure, Field>>, ...fields: Field[]) {
        super();
        this.fields = fields;
    }

    deserialize(dv: DataView, offset: number): { offset: number; val: Structure[] } {

        const nrOfSets = UINT16_SERIALIZER.deserialize(dv,offset);

        return undefined;
    }

    getSizeForValue(val: Structure[]): number {
        return 0;
    }

    getStaticSize(): number | undefined {
        return undefined;
    }

    serialize(dv: DataView, offset: number, val: Structure[]): { offset: number } {
        const sets = this.generateSets(val);

        offset = UINT16_SERIALIZER.serialize(dv, offset, sets.length).offset;

        for (const set of sets) {
            let combined = {} as Pick<Structure, Field>;

            for (let i = 0; i < set.distinguishVal.length; i++)
                combined[this.fields[i]] = set.distinguishVal[i];

            offset = this.common.serialize(dv, offset, combined).offset;

            const asStrc = set.associatedStructures;
            offset = UINT16_SERIALIZER.serialize(dv, offset, asStrc.length).offset;

            for (const struc of asStrc) {
                offset = this.restSerializer.serialize(dv, offset, struc).offset;
            }
        }

        return {offset};
    }

    typeCheck(val: Structure[], name: string = 'val'): void {
    }

    registerCommon(ser: ValueSerializer<Pick<Structure, Field>>) {
        this.common = ser;
        this.setFullCommon = true;
    }

    register(field: Field, ser: ValueSerializer<Structure[Field]>) {
        if (this.setFullCommon)
            return false;

        (this.common as any).append(field, ser);

    }

    private generateSets(val: Structure[]) {
        if (this.lastDone == val)
            return this.lastSets;

        const sets: { distinguishVal: any[], associatedStructures: Structure[] }[] = [];

        const fields = this.fields;

        structuresLoop: for (const struc of val) {
            for (const set of sets) {
                const dv = set.distinguishVal;
                for (let i = 0; i < fields.length; i++) {
                    if (dv[0] == struc[fields[i]]) {
                        set.associatedStructures.push(struc);

                        continue structuresLoop;
                    }
                }
            }


            const dv = [];

            for (let i = 0; i < fields.length; i++) {
                dv[0] = struc[fields[i]]
            }

            sets.push({distinguishVal: dv, associatedStructures: [struc]});
        }

        this.lastDone = val;
        this.lastSets = sets;

        return sets;
    }


}