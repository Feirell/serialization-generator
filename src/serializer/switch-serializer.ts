import {ValueSerializer} from "./value-serializer";
import {UINT16_SERIALIZER, UINT32_SERIALIZER, UINT8_SERIALIZER} from "./int-serializer";

interface Register<K> {
    tester: (val: any) => val is K;
    serializer: ValueSerializer<K>
}

/**
 * The SwitchSerializer is meant to give you an easy to use way of serializing
 * [Union Types](https://www.typescriptlang.org/docs/handbook/unions-and-intersections.html#union-types).
 * You can use this serializer by defining
 * [Type Guards](https://www.typescriptlang.org/docs/handbook/advanced-types.html#user-defined-type-guards) and assign
 * serializers to them with the register method.
 *
 * The first fitting serializer, the first serializer whose type guard returns true, will be used to delegate the
 * serialisation and deserialization to. This class will then prepend the data by the index of the used serializer to
 * identify the correct one on deserialization.
 */
export class SwitchSerializer<Type, Remaining extends Type = Type> extends ValueSerializer<Type> {
    private registeredSerializer: Register<any>[] = [];
    private isFinalized = false;

    private pickedIndexSerializer: undefined | ValueSerializer<number> = undefined;

    deserialize(dv: DataView, offset: number): { offset: number; val: Type } {
        if (!this.isFinalized)
            throw new Error('The SwitchSerializer is not finalized');

        const nrRes = this.pickedIndexSerializer!.deserialize(dv, offset);
        offset = nrRes.offset;

        const nr = nrRes.val;
        if (!(nr in this.registeredSerializer))
            throw new Error('the nr serialized in the data for the index of the used serializer is not in a valid range of the used in this deserializer');

        const picked = this.registeredSerializer[nr].serializer;

        return picked.deserialize(dv, offset);
    }

    getSizeForValue(val: Type): number {
        if (!this.isFinalized)
            throw new Error('the SwitchSerializer is not finalized');

        const nr = this.pickOrThrow(val);
        const serializer = this.registeredSerializer[nr].serializer;

        return this.pickedIndexSerializer!.getSizeForValue(nr) + serializer.getSizeForValue(val);
    }

    getStaticSize(): number | undefined {
        if (!this.isFinalized)
            throw new Error('the SwitchSerializer is not finalized');

        let size: undefined | number = undefined;

        for (const {serializer} of this.registeredSerializer) {
            const staticSize = serializer.getStaticSize();
            if (staticSize == undefined)
                return undefined;

            if (size === undefined)
                size = staticSize;
            else if (size != staticSize)
                return undefined;
        }

        return this.pickedIndexSerializer!.getStaticSize()! + (size || 0);
    }

    serialize(dv: DataView, offset: number, val: Type): { offset: number } {
        if (!this.isFinalized)
            throw new Error('The SwitchSerializer is not finalized');

        const nr = this.pickOrThrow(val);

        offset = this.pickedIndexSerializer!.serialize(dv, offset, nr).offset;

        const serializer = this.registeredSerializer[nr].serializer;
        return serializer.serialize(dv, offset, val);
    }

    typeCheck(val: Type, name: string | undefined): void {
        const nr = this.pickOrThrow(val);
        this.registeredSerializer[nr].serializer.typeCheck(val, name);
    }

    /**
     * This function allows you to register serializers for the specific sub types of the union. On serialization the
     * first fitting serializer will be used. That means that the first serializer with a true returning tester will be
     * used.
     *
     * You need to keep the order of registers the same to prevent any issue with the deserialization, since this class
     * only prepends the index of the used serializer.
     *
     * You should add the most strict type guards first and then gradually add the more general ones, since the type
     * guards will be tested in the order in which they were added via the register method, so a broad one would be like
     * a catch all.
     *
     * @param tester The function which distinguishes between values the provided serializer can serialize and which not.
     * @param serializer The attached Serializer.
     */
    register<Selected extends Remaining,
        Narrowed extends (Remaining extends Selected ? Remaining : never) = Remaining extends Selected ? Remaining : never>(
        tester: (val: Remaining) => val is Selected,
        serializer: ValueSerializer<Narrowed>
    ) {
        // Type identifier are unpacked Extract and Exclude, see lib.es5.d.ts:
        // type Exclude<T, U> = T extends U ? never : T;
        // type Extract<T, U> = T extends U ? T : never;
        // They were extracted to improve type hinting in the IDE

        if (this.isFinalized)
            throw new Error('the SwitchSerializer is already finalized');

        this.registeredSerializer.push({tester, serializer});
        return this as unknown as SwitchSerializer<Type, Remaining extends Narrowed ? never : Remaining>;
    }

    /**
     * This method needs to be called after all registers are done to make this serializer usable. The reason is that
     * this serializer needs an internal IntSerializer to work which needs to be created at some point and be fitting to
     * the number of registered serializers to be able to identify all of the indexes.
     */
    finalize() {
        const nrOfSerializer = this.registeredSerializer.length;

        if (nrOfSerializer <= 2 ** 8)
            this.pickedIndexSerializer = UINT8_SERIALIZER;

        else if (nrOfSerializer <= 2 ** 16)
            this.pickedIndexSerializer = UINT16_SERIALIZER;

        else if (nrOfSerializer <= 2 ** 32)
            this.pickedIndexSerializer = UINT32_SERIALIZER;

        else
            throw new Error('the number of serializer is greater the 2^32');

        this.isFinalized = true;

        return this;
    }

    private pickOrThrow(val: Type): number {
        for (let i = 0; i < this.registeredSerializer.length; i++)
            if (this.registeredSerializer[i].tester(val))
                return i;

        throw new Error('could not find a suitable serializer for type ' + val);
    }
}