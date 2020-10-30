# serialization-generator

The main target of this package is to make the creation of serializers to transform JavaScript Values into binary and back
as easy as possible and to keep the creation readable.

To archive this goal this package provides multiple simple serializers which you can combine to create more complex
versions which fit your needed data structures.

<!-- USEFILE: examples\simple-example.ts; str => str.replace('../src', 'serialization-generator') -->
``` ts
import {
    ObjectSerializer,
    ArraySerializer,
    VectorSerializer,

    ARRAY_BUFFER_SERIALIZER,
    STRING_SERIALIZER,

    FLOAT32_SERIALIZER,
    FLOAT64_SERIALIZER,

    INT8_SERIALIZER,
    INT16_SERIALIZER,
    INT32_SERIALIZER,

    UINT8_SERIALIZER,
    UINT16_SERIALIZER,
    UINT32_SERIALIZER,
} from 'serialization-generator';

interface ExampleSubType {
    d: number;
    e: number;
    f: ArrayBuffer;
}

interface ExampleType {
    a: number;
    b: number;
    c: ExampleSubType;
    g: string;
    h: number[];
    i: [number, number, number, number];
}

const EXAMPLE_SUBTYPE_SERIALIZER = new ObjectSerializer<ExampleSubType>()
    .append("d", INT8_SERIALIZER)
    .append("e", UINT16_SERIALIZER)
    .append("f", ARRAY_BUFFER_SERIALIZER);

const exSer = new ObjectSerializer<ExampleType>()
    .append("a", UINT32_SERIALIZER)
    .append("b", FLOAT32_SERIALIZER)
    .append("c", EXAMPLE_SUBTYPE_SERIALIZER)
    .append("g", STRING_SERIALIZER)
    .append("h", new ArraySerializer(UINT32_SERIALIZER))
    .append("i", new VectorSerializer(UINT8_SERIALIZER, 4))

const ab = new ArrayBuffer(3);
new Uint8Array(ab).set([1, 4, 9]);

const instance: ExampleType = {
    a: 12,
    b: Math.PI,
    c: {
        d: -22,
        e: 443,
        f: ab
    },
    g: "Example string with UTF-8 chars €",
    h: [1, 2, 3, 22],
    i: [8, 7, 7, 2]
}

// check weather the provided values are serializable by the configured serializer
exSer.typeCheck(instance);

// retrieve the number of bytes needed to serialize this value
const length = exSer.getSizeForValue(instance);
console.log('length', length);

// create the arraybuffer to serialize this value
const data = new ArrayBuffer(length);
const view = new DataView(data);

exSer.serialize(view, 0, instance);
console.log('data', data);

const deValue = exSer.deserialize(view, 0);
const val = deValue.val;
console.log('val', val);
```
*You can find this in `examples\simple-example.ts`*

The provided functions are fully typesafe.

## Usage

The easiest way to use this package is by declaring your data structure by a TypeScript interface and then create the
`ObjectSerializer` as was done in the example above. After this configuration you can export the serializer as reuse it
in your code base. Other serializers can use this custom serializer as subserializers.

Please have a look at the [API documentation](https://feirell.github.io/serialization-generator/).

## Mapping / transforming serializer

If want to implement a mapping serializer which, for example, maps an enum to a number and back you could do so in four ways:

<!-- USEFILE: examples\transform-values.ts; str => str.replace('../src', 'serialization-generator') -->
``` ts
import {
    createTransformSerializer,
    TransformSerializer,
    ValueSerializer,
    UINT8_SERIALIZER
} from "serialization-generator";

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

```
*You can find this in `examples\transform-values.ts`*

## Performance remarks

This package tries to make the serialization as fast as possible and still keep a readable codebase.
With this in mind you should create your own custom serializers and choose the ones you use.

There will be no typecheck done serialization, if you can not trust the datastructure you can do one manually by calling
`typeCheck` of the serializer. But if you need to do the serialization as fast as possible you should not include those
checks in the code running in production.

The provided default serializers have different runtime behavior which can heavily influence your choice for the datastructure.

The performance report below is the result of the serialization from the example provided above.
`serializetion` includes the `ObjectSerializer` and the number serializer but nothing else.
All other are added separately.

```
                ops/sec  MoE samples relative
serialization
  serialize   2,684,042 0.94      93     1.20
  deserialize 2,238,283 1.55      87     1.00
serialization + Array
  serialize      60,061 2.39      86     1.00
  deserialize    67,150 0.70      88     1.12
serialization + Vector
  serialize   1,420,139 0.44      95     1.32
  deserialize 1,073,853 0.91      93     1.00
serialization + AB
  serialize   1,318,086 1.11      90     3.14
  deserialize   419,398 1.16      89     1.00
serialization + String
  serialize   1,196,285 0.67      88     5.93
  deserialize   201,582 0.83      90     1.00
serialization + Array + Vector + AB + String
  serialize      58,956 1.46      93     1.33
  deserialize    44,490 1.25      93     1.00
 */
```

Sadly the array serializer is really slow for smaller vectors and should only be used if the arrays are larger (> 10) or 
if the size is not fixed. All other serializers are quite fast, but I would highly recommend that you stick to
`ObjectSerialzer`, `VectorSerializer` and the number serializer and that you either write a custom serializer by extending
the `ValueSerializer` or just prepend a function which converts your data in another structure which does not include
strings, other arraybuffers or arrays.

## In comparison to other means of serialization

This package is rather basic and is only meant to serialize structures which remain mostly static.

### This package vs JSON

\+ Maps to a lot less bytes

\+ Has type check

\+ The structure does not need to be send / saved each time


\- Needs to be prepared

\- The structure needs to remain the same

\- The receiver needs to know the structure and construct a deserializer

### Structured clone

This is internally used by the JavaScript engine to transfer JavaScript values from one realm to another (WebWorkers, IndexDB, History API).
Sadly this API is not yet exposed directly but might be in the future.  

NodeJS exposed this functionality from the V8, have look here: https://nodejs.org/api/v8.html#v8_serialization_api

Either way those values can not be read by JavaScript in the browser, which makes it not suitable for my usecase.
Hopefully this functionality will come to the browser at some point, you can read more about it here:

Definition: https://html.spec.whatwg.org/multipage/structured-data.html#structuredserializeforstorage 
ECMAScript proposal: https://github.com/dslomov/ecmascript-structured-clone (found here: https://github.com/tc39/proposals/blob/master/stage-0-proposals.md)
Discussion about specification: https://github.com/whatwg/html/issues/793

## Runtime requirements

This package heavily relies on `ArrayBuffer` and `DataView`. This package will not work if they are not present. 