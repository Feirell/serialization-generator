import {ValueSerializer} from "./value-serializer";

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

    abstract fromOriginToBase(val: Origin): Base;

    abstract fromBaseToOrigin(val: Base): Origin;

    abstract originTypeCheck(val: Origin, name: string): never | void ;
}