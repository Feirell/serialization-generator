# serialization-generator

The main target of this package is to make the creation of serializers to transform JavaScript Values into binary and back
as easy as possible and to keep the creation readable.

To archive this goal this package provides multiple simple serializers which you can combine to create more complex
versions which fit your needed data structures.

<!-- USEFILE: examples\simple-example.ts; str => str.replace('../src', 'serialization-generator') -->
``` ts
import {
    ArraySerializer,
    EnumSerializer,
    ObjectSerializer,
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
    UINT32_SERIALIZER
} from 'serialization-generator';

const capitalizeFirstLetter = (m: string) => m.replace(/^(.)/, (_, m) => m.upperCase());

interface ExampleSubType {
    d: number;
    e: number;
    f: ArrayBuffer;
}

type Enum = 'ENUM_VAL_A' | 'ENUM_VAL_B' | 'ENUM_VAL_C';

interface ExampleType {
    a: number;
    b: number;
    c: ExampleSubType;
    g: string;
    h: number[];
    i: [number, number, number, number];
    j: Enum;
}

// you can define the object serializer either directly at construction

const EXAMPLE_SUBTYPE_SERIALIZER = new ObjectSerializer<ExampleSubType>({
    d: INT8_SERIALIZER,
    e: UINT16_SERIALIZER,
    f: ARRAY_BUFFER_SERIALIZER
}, {
    // you can configure the instance creation for deserialization and the getter and setter
    instanceCreator: () => Object.create(null),

    // the default getter and setter use direct property access you can change that by defining setter and getter
    propertyGetter: (instance, key) => (instance as any)['get' + capitalizeFirstLetter(key)]()
});

// or after with the append method

const exSer = new ObjectSerializer<ExampleType>()
    .append("a", UINT32_SERIALIZER)
    .append("b", FLOAT32_SERIALIZER)
    .append("c", EXAMPLE_SUBTYPE_SERIALIZER)
    .append("g", STRING_SERIALIZER)
    .append("h", new ArraySerializer(UINT32_SERIALIZER))
    .append("i", new VectorSerializer(UINT8_SERIALIZER, 4))
    .append("j", new EnumSerializer<Enum>(['ENUM_VAL_A', 'ENUM_VAL_B', 'ENUM_VAL_C']))

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
    i: [8, 7, 7, 2],
    j: "ENUM_VAL_B"
}

// check whether the provided values are serializable by the configured serializer
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

If want to implement a mapping serializer which, for example, maps an enum to a number and back you could do so in four ways.
`EnumSerializer` is a specific class to map a static number of values to their indexes and back, primarily Enums.

<!-- USEFILE: examples\transform-values.ts; str => str.replace('../src', 'serialization-generator') -->
``` ts
import {
    createTransformSerializer,
    TransformSerializer,
    ValueSerializer,
    UINT8_SERIALIZER, EnumSerializer
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
// When the number of values in of type Origin are static and finite you can use EnumSerializer
//

const instance = new EnumSerializer(['ENUM_A' , 'ENUM_B' , 'ENUM_C' , 'ENUM_D'] as OriginType[]);

// If this is not the case you have four other options

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

This package tries to make the serialization as fast as possible and still keep a readable API.

There will be no typecheck done on serialization, if you can not trust the datastructure you can do one manually by calling
`typeCheck` of the serializer.

The provided default serializers have different runtime behavior which can heavily influence your choice for the datastructure.

The performance report below is the result of the serialization from a similar datasctructure like the one shown above.
`serialization` includes the `ObjectSerializer` and the number serializer but nothing else,
all other are added separately.

The string serializer uses an internal cache on serialize, which results in a skewed result.

```
                ops/sec  MoE samples relative
serialization
  serialize   2,620,854 1.81      88     1.20
  deserialize 2,178,406 1.64      89     1.00
serialization + Array
  serialize   1,287,073 2.51      85     1.29
  deserialize 1,000,358 5.47      79     1.00
serialization + Vector
  serialize   1,100,311 2.72      86     1.23
  deserialize   895,438 2.93      86     1.00
serialization + AB
  serialize   1,269,839 3.07      86     3.04
  deserialize   417,772 2.08      86     1.00
serialization + String
  serialize   1,184,358 1.74      89     6.11
  deserialize   193,857 2.73      86     1.00
serialization + Enum
  serialize   1,697,583 0.76      93     1.29
  deserialize 1,312,046 1.49      84     1.00
serialization + Array + Vector + AB + String + Enum
  serialize     440,456 0.66      95     3.30
  deserialize   133,296 1.04      89     1.00
```

As this performance measurement show array buffer and string serialization are quite slow, I would recommend therefore
to stick to the other serializers. The most efficient option is to only use `ObjectSerializer` and the number serializer.  

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