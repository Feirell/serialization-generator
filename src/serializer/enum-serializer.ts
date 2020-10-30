import {TransformSerializer} from "./transform-serializer";
import {UINT16_SERIALIZER, UINT32_SERIALIZER, UINT8_SERIALIZER} from "./int-serializer";

const cleanAndRemoveDup = <K>(arr: K[]) => {
    const cop: K[] = [];
    for (const v of arr)
        if (cop.indexOf(v) == -1)
            cop.push(v);

    return cop;
}

/**
 * This class is meant to help you to construct a serializer which maps a static list of values to their indexes and
 * only serialize those. The values provided will be reduced to exclude duplications which are determined by the their
 * identity (==).
 *
 * Despite its name, this class can be used to serialize any number of static collection of items to their indexes.
 *
 * Be aware that this serializer needs to be configured the same way when deserializing otherwise it will not map to the
 * correct value.
 */
export class EnumSerializer<Enum> extends TransformSerializer<Enum, number> {
    private readonly enumStrings!: Enum[];

    constructor(enumStrings: Enum[]) {
        super((() => {
            // using this since the first call needs to be to super()
            // but we need to calculate the values first

            enumStrings = cleanAndRemoveDup(enumStrings);

            const binaryRep = Math.ceil(Math.log2(enumStrings.length));

            let serializer;

            if (binaryRep <= 8)
                serializer = UINT8_SERIALIZER
            else if (binaryRep <= 16)
                serializer = UINT16_SERIALIZER
            else if (binaryRep <= 32)
                serializer = UINT32_SERIALIZER
            else
                throw new Error("this enum has too many entries " + enumStrings.length);

            return serializer;
        })());

        this.enumStrings = enumStrings;
    }

    isPartOfEnum(val: any): val is Enum {
        return this.enumStrings.includes(val as Enum);
    }

    fromBaseToOrigin(val: number): Enum {
        if (val >= this.enumStrings.length)
            throw new Error("" + val + " is not mappable to an enum string");

        return this.enumStrings[val];
    }

    fromOriginToBase(val: Enum): number {
        const eNumVal = this.enumStrings.indexOf(val);

        if (eNumVal == -1)
            throw new Error("" + val + " is not in the enum");

        return eNumVal;
    }

    originTypeCheck(val: Enum, name: string): void {
        if (!this.isPartOfEnum(val))
            throw new Error("" + name + " is not a valid enum value was: " + val);
    }

}