import {ValueSerializer} from "./serializer/value-serializer";
import {TransformSerializer} from "./serializer/transform-serializer";

export function createTransformSerializer<Origin, Base>(
    fromOriginToBase: (val: Origin) => Base,
    fromBaseToOrigin: (val: Base) => Origin,
    baseSerializer: ValueSerializer<Base>,
    typeCheck?: (val: Origin, name: string) => never | void
): TransformSerializer<Origin, Base> {
    return new class extends TransformSerializer<Origin, Base> {
        constructor() {
            super(baseSerializer);
        }

        fromBaseToOrigin(val: Base): Origin {
            return fromBaseToOrigin(val);
        }

        fromOriginToBase(val: Origin): Base {
            return fromOriginToBase(val);
        }

        originTypeCheck(val: Origin, name: string): void {
            if (typeCheck)
                typeCheck(val, name);
        }

    }
}