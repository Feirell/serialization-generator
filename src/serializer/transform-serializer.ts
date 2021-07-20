import {ValueSerializer} from "./value-serializer";

/**
 * This class is meant to help to define serializers which map values from one type to another
 * before serialization. This mapping is meant to be done Origin -> Base -> Binary -> Base -> Origin
 *
 * In this class you just define the mapping from Origin to Base and back and add the serializer for
 * the Base type. This also allows you to chain those serializers.
 *
 * This abstract class reduces the number of methods one needs to implement in comparison
 * to a full custom class. Just the Origin => Base, Base => Origin and the type check need
 * to be implemented.
 */
export abstract class TransformSerializer<Origin, Base> extends ValueSerializer<Origin> {
    constructor(private readonly baseSerializer: ValueSerializer<Base>) {
        super();
    }

    getStaticSize(): number | undefined {
        return this.baseSerializer.getStaticSize();
    }

    getSizeForValue(val: Origin): number {
        const transformedVal = this.fromOriginToBase(val);
        return this.baseSerializer.getSizeForValue(transformedVal);
    }

    typeCheck(val: Origin, name: string = 'val'): void {
        this.originTypeCheck(val, name);
        this.baseSerializer.typeCheck(this.fromOriginToBase(val), name);
    }

    serialize(dv: DataView, offset: number, val: Origin): { offset: number } {
        const transformVal = this.fromOriginToBase(val);
        return this.baseSerializer.serialize(dv, offset, transformVal);
    }

    deserialize(dv: DataView, offset: number): { offset: number; val: Origin } {
        const ret = this.baseSerializer.deserialize(dv, offset);
        return {
            offset: ret.offset,
            val: this.fromBaseToOrigin(ret.val)
        }
    }

    getByteSizeFromDataInBuffer(dv: DataView, offset: number): number {
        return this.baseSerializer.getByteSizeFromDataInBuffer(dv, offset);
    }

    /**
     * This method maps the Origin value to Base. This method should throw an error
     * if the value is not in fact of type origin.
     *
     * @param val the value to map
     */
    abstract fromOriginToBase(val: Origin): Base

    /**
     * This method maps the value back from Base to Origin.
     *
     * @param val the value to map
     */
    abstract fromBaseToOrigin(val: Base): Origin

    /**
     * This method will be called by the {@link typeCheck} method. Before calling the
     * typeCheck of the parent with the mapped Base value.
     *
     * This method should throw an error when the value is not of type Origin. This error
     * should be precise and use the provided name as identifier when addressing the value
     * to increase the error message readability.
     *
     * @param val the value to check
     * @param name the identifier name this value had in the greater scope
     */
    abstract originTypeCheck(val: Origin, name: string): never | void
}
