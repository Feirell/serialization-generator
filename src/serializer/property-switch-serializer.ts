import {ValueSerializer} from "./value-serializer";
import {EnumSerializer} from "./enum-serializer";

type OnlyFitting<Structure, Field extends keyof Structure, Id extends Structure[Field]> = ValueSerializer<Extract<Structure, { [key in Field]: Id }>>;

// TODO Use the SwitchSerializer as the backing serializer, aware to exclude the used field value for identification and
// re create it when deserializing

export class PropertySwitchSerializer<Structure extends object, Field extends keyof Structure> extends ValueSerializer<Structure> {
    private registeredSerializers: { id: Structure[Field], ser: ValueSerializer<any> }[] = [];

    private finalized: boolean = false;
    private enumSer!: EnumSerializer<Structure[Field]>;
    private staticSizeCache: null | undefined | number = null;

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
    register<Id extends Structure[Field], Ser extends OnlyFitting<Structure, Field, Id>>(id: Id, ser: Ser) {
        if (this.finalized)
            throw new Error("SwitchSerializer is already finalized");

        for (const reg of this.registeredSerializers)
            if (reg.id == id) {
                reg.ser = ser;
                return this;
            }


        this.registeredSerializers.push({id, ser});

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

    getSizeForValue(val: Structure): number {
        if (!this.finalized)
            throw new Error("SwitchSerializer is not finalized");

        const idSer = this.enumSer.getSizeForValue(val[this.field]);
        const ser = this.getSerializerOrThrow(val[this.field]);
        return idSer + ser.getSizeForValue(val as any);
    }

    typeCheck(val: Structure, name: string = 'val'): void {
        if (!this.finalized)
            throw new Error("SwitchSerializer is not finalized");

        const ser = this.getSerializerOrThrow(val[this.field]);
        return ser.typeCheck(val as any);
    }

    getStaticSize(): number | undefined {
        if (!this.finalized)
            throw new Error("SwitchSerializer is not finalized");

        if (this.staticSizeCache !== null)
            return this.staticSizeCache;

        const enumSer = this.enumSer.getStaticSize();
        if (enumSer == undefined) {
            this.staticSizeCache = undefined;
            return undefined;
        }

        let size = undefined as number | undefined;
        for (const ser of this.registeredSerializers) {
            const stat = ser.ser.getStaticSize();
            if (stat == undefined) {
                this.staticSizeCache = undefined;
                return undefined;
            }

            if (size == undefined)
                size = stat;
            else if (size != stat) {
                this.staticSizeCache = undefined;
                return undefined;
            }

        }

        this.staticSizeCache = enumSer + (size || 0);
        return this.staticSizeCache;
    }

    getByteSizeFromDataInBuffer(dv: DataView, offset: number): number {
        const staticSize = this.getStaticSize();

        if (staticSize !== undefined)
            return staticSize;

        const {val, offset: idOffset} = this.enumSer.deserialize(dv, offset);
        let size = idOffset - offset;

        const valueSerializer = this.getSerializerOrThrow(val);
        size += valueSerializer.getByteSizeFromDataInBuffer(dv, idOffset);

        return size;
    }

    serialize(dv: DataView, offset: number, val: Structure): { offset: number } {
        if (!this.finalized)
            throw new Error("SwitchSerializer is not finalized");

        const ser = this.getSerializerOrThrow(val[this.field]);
        const enumRet = this.enumSer.serialize(dv, offset, val[this.field]);
        return ser.serialize(dv, enumRet.offset, val as any);
    }

    deserialize(dv: DataView, offset: number): { offset: number; val: Structure } {
        if (!this.finalized)
            throw new Error("SwitchSerializer is not finalized");

        const enumRet = this.enumSer.deserialize(dv, offset);
        const ser = this.getSerializerOrThrow(enumRet.val);
        const serRet = ser.deserialize(dv, enumRet.offset);

        serRet.val[this.field] = enumRet.val as any;

        return serRet;
    }

    /**
     * Clones this SwitchSerializer, which copies the current state. The deFinalize argument allows you to lift the
     * finalize state.
     *
     * @param deFinalize
     */
    clone(deFinalize = false) {
        const copy = new PropertySwitchSerializer<Structure, Field>(this.field);
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

    private getSerializerOrThrow<Id extends Structure[Field], Ser extends OnlyFitting<Structure, Field, Id>>(id: Id): Ser {
        for (const reg of this.registeredSerializers)
            if (reg.id == id)
                return reg.ser as Ser;

        throw new Error("there is no serializer for the identification property " + this.field + " with the value " + id);
    }
}
