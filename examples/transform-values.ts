import {
    createTransformSerializer,
    TransformSerializer,
    ValueSerializer,
    UINT8_SERIALIZER
} from "../src";

type OriginType = 'ENUM_A' | 'ENUM_B' | 'ENUM_C' | 'ENUM_D'
type BaseType = 0 | 1 | 2 | 3

const fromOriginToBase = (val: OriginType): BaseType => {
    switch (val) {
        case "ENUM_A": return 0;
        case "ENUM_B": return 1;
        case "ENUM_C": return 2;
        case "ENUM_D": return 3;
        default: throw new Error("this OriginType is invalid " + val);
    }
}

const fromBaseToOrigin = (val: BaseType): OriginType => {
    switch (val) {
        case 0: return "ENUM_A";
        case 1: return "ENUM_B";
        case 2: return "ENUM_C";
        case 3: return "ENUM_D";
        default: throw new Error("this BaseType is invalid " + val);
    }
}

const isOriginType = (val: any): val is  OriginType =>
    val != "ENUM_A" &&
    val != "ENUM_B" &&
    val != "ENUM_C" &&
    val != "ENUM_D";

//
// First Option: Custom Class
//

class OriginTypeSerializerCustom extends ValueSerializer<OriginType> {
    getStaticSize(): number | undefined {
        return UINT8_SERIALIZER.getStaticSize();
    }

    getSizeForValue(val: OriginType): number {
        return UINT8_SERIALIZER.getSizeForValue(fromOriginToBase(val));
    }

    serialize(dv: DataView, offset: number, val: OriginType): { offset: number } {
        return UINT8_SERIALIZER.serialize(dv, offset, fromOriginToBase(val));
    }

    deserialize(dv: DataView, offset: number): { offset: number; val: OriginType } {
        const ret = UINT8_SERIALIZER.deserialize(dv, offset);
        return {
            offset: ret.offset,
            val: fromBaseToOrigin(ret.val as BaseType)
        }
    }

    typeCheck(val: OriginType, name: string = 'val'): void {
        if (!isOriginType(val))
            throw new Error(name + " needs to be of type OriginType");

        UINT8_SERIALIZER.typeCheck(fromOriginToBase(val), name);
    }

}

//
// Second Option: using the TransformSerializer Class
//

class OriginTypeSerializerTransformSerializer extends TransformSerializer<OriginType, BaseType> {
    fromBaseToOrigin(val: BaseType): OriginType {
        return fromBaseToOrigin(val);
    }

    fromOriginToBase(val: OriginType): BaseType {
        return fromOriginToBase(val);
    }

    originTypeCheck(val: OriginType, name: string): void {
        if (!isOriginType(val))
            throw new Error(name + " needs to be of type OriginType");
    }
}

//
// Third Option: creating the TransformSerializer via function
//

const ORIGIN_TYPE_SERIALIZER_VIA_FNC = createTransformSerializer(
    fromOriginToBase,
    fromBaseToOrigin,
    UINT8_SERIALIZER as ValueSerializer<BaseType>,
    (val, name) => {
        if (!isOriginType(val))
            throw new Error(name + " needs to be of type OriginType");
    }
);

//
// Fourth Option: transform the type to serializable beforehand
//
