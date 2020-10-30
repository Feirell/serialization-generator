import {ValueSerializer} from "./serializer/value-serializer";
import {TransformSerializer} from "./serializer/transform-serializer";

/**
 * This function create a {@link TransformSerializer} with the provided mapper.
 * Please have a look at the respective methods and their documentation there.
 *
 * @param fromOriginToBase A function which works the same as {@link TransformSerializer.fromOriginToBase}.
 * @param fromBaseToOrigin A function which works the same as {@link TransformSerializer.fromBaseToOrigin}.
 * @param baseSerializer A serializer which can serialize the Base type.
 * @param typeCheck A function which works the same as {@link TransformSerializer.originTypeCheck}.
 */
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