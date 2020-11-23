import {ValueSerializer} from "./value-serializer";
import {EnumSerializer} from "./enum-serializer";

export class SwitchSerializer<Structure extends object, Field extends keyof Structure> extends ValueSerializer<Structure> {
    private registeredSerializers: { id: Structure[Field], ser: ValueSerializer<any> }[] = [];

    private finalized: boolean = false;
    private enumSer!: EnumSerializer<Structure[Field]>;

    constructor(private field: Field) {
        super();
    }

    /**
     * Registers a serializer which will be used to serialize the value when the field (defined in the constructor) has
     * the value equal to the value given as id. If there is already another serializer attached to this id it will be
     * overwritten.
     *
     * @param id the id the field has to be to use this serializer
     * @param ser the serializer to use
     */
    register<SpecStruct extends Structure, Id extends SpecStruct[Field], Ser extends ValueSerializer<SpecStruct>>(id: Id, ser: Ser) {
        if (this.finalized)
            throw new Error("SwitchSerializer is already finalized");

        for (const reg of this.registeredSerializers)
            if (reg.id == id) {
                reg.ser = ser;
                return this;
            }


        this.registeredSerializers.push({id: id, ser});

        return this;
    }

    /**
     * This method needs to be called after all registers are done to make this serializer usable. The reason is that
     * this serializer needs an internal {@link EnumSerializer} to work which needs to be created at some point.
     */
    finalize() {
        if (this.finalized)
            return this;

        const regIds = this.registeredSerializers.map(r => r.id);
        this.enumSer = new EnumSerializer<Structure[Field]>(regIds);

        this.finalized = true;

        return this;
    }

    /**
     * If you need to extend the switch serializer after using the finalize you can do so by calling this method first
     * and then registering your new serializer.
     */
    deFinalize(){
        if(!this.finalized)
            return this;

        this.finalized = false;
        this.enumSer = undefined as any;

        return this;
    }

    getSizeForValue(val: Structure): number {
        if (!this.finalized)
            throw new Error("SwitchSerializer is not finalized");

        const idSer = this.enumSer.getSizeForValue(val[this.field]);
        const ser = this.getSerializerOrThrow(val[this.field]);
        return idSer + ser.getSizeForValue(val);
    }

    typeCheck(val: Structure, name: string = 'val'): void {
        if (!this.finalized)
            throw new Error("SwitchSerializer is not finalized");

        const ser = this.getSerializerOrThrow(val[this.field]);
        return ser.typeCheck(val);
    }

    getStaticSize(): number | undefined {
        if (!this.finalized)
            throw new Error("SwitchSerializer is not finalized");

        const enumSer = this.enumSer.getStaticSize();
        if (enumSer == undefined)
            return undefined;

        let size = undefined as number | undefined;
        for (const ser of this.registeredSerializers) {
            const stat = ser.ser.getStaticSize();
            if (stat == undefined)
                return undefined;

            if (size == undefined)
                size = stat;
            else if (size != stat)
                return undefined;

        }

        return enumSer + (size || 0);
    }

    serialize(dv: DataView, offset: number, val: Structure): { offset: number } {
        if (!this.finalized)
            throw new Error("SwitchSerializer is not finalized");

        const ser = this.getSerializerOrThrow(val[this.field]);
        const enumRet = this.enumSer.serialize(dv, offset, val[this.field]);
        return ser.serialize(dv, enumRet.offset, val);
    }

    deserialize(dv: DataView, offset: number): { offset: number; val: Structure } {
        if (!this.finalized)
            throw new Error("SwitchSerializer is not finalized");

        const enumRet = this.enumSer.deserialize(dv, offset);
        const ser = this.getSerializerOrThrow(enumRet.val);
        const serRet = ser.deserialize(dv, enumRet.offset);

        serRet.val[this.field] = enumRet.val;

        return serRet;
    }

    /**
     * Clones this SwitchSerializer, which copies the current state. The deFinalize argument allows you to lift the
     * finalize state like {@link deFinalize} methods allows you to.
     *
     * @param deFinalize
     */
    clone(deFinalize = false) {
        const copy = new SwitchSerializer<Structure, Field>(this.field);
        copy.registeredSerializers = this.registeredSerializers.map(v => ({id: v.id, ser: v.ser}));

        if (!deFinalize) {
            copy.finalized = this.finalized;
            copy.enumSer = this.enumSer;
        } else {
            copy.finalized = false;
            copy.enumSer = undefined as any;
        }

        return copy;
    }

    private getSerializerOrThrow<SpecStruct extends Structure, Id extends SpecStruct[Field], Ser extends ValueSerializer<SpecStruct>>(id: Id): Ser {
        for (const reg of this.registeredSerializers)
            if (reg.id == id)
                return reg.ser as Ser;

        throw new Error("there is no serializer for the identification property " + this.field + " with the value " + id);
    }
}