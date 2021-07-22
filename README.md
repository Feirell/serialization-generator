# serialization-generator

> **Please have a look at the `This package vs FlatBuffers / protobuf` section below before making yourself familiar with this library.**

The main target of this package is to make the creation of serializers to transform JavaScript Values into binary and
back as easy as possible and to keep the creation readable.

To archive this goal this package provides multiple simple serializers which you can combine to create more complex
versions which fit your needed data structures.

<!-- USEFILE: examples\simple-example.ts; str => str.replace('../src', 'serialization-generator') -->
``` ts
import {
    ArraySerializer,
    EnumSerializer,
    ObjectSerializer,
    VectorSerializer,
    PropertySwitchSerializer,

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
    k: 'Static-Property';
}

// you can define the object serializer either directly at construction

const EXAMPLE_SUBTYPE_SERIALIZER = new ObjectSerializer<ExampleSubType>({
    d: INT8_SERIALIZER,
    e: UINT16_SERIALIZER,
    f: ARRAY_BUFFER_SERIALIZER
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
    .appendStatic("k", "Static-Property");

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
    j: "ENUM_VAL_B",
    k: "Static-Property"
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

If want to implement a mapping serializer which, for example, maps an enum to a number and back you could do so in four
ways.
`EnumSerializer` is a specific class to map a static number of values to their indexes and back, primarily Enums.

<!-- USEFILE: examples\transform-values.ts; str => str.replace('../src', 'serialization-generator') -->
``` ts
import {
    createTransformSerializer,
    TransformSerializer,
    ValueSerializer,
    EnumSerializer,
    UINT8_SERIALIZER
} from "serialization-generator";

type OriginType = 'ENUM_A' | 'ENUM_B' | 'ENUM_C' | 'ENUM_D';
type BaseType = 0 | 1 | 2 | 3;

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

const isOriginType = (val: any): val is OriginType =>
    val != "ENUM_A" &&
    val != "ENUM_B" &&
    val != "ENUM_C" &&
    val != "ENUM_D";

// When the number of values of type Origin are static
// and finite you can use the EnumSerializer

const possibleValues: OriginType[] = ['ENUM_A', 'ENUM_B', 'ENUM_C', 'ENUM_D'];
const instance = new EnumSerializer(possibleValues);

// If this is not the case then you have four other options

// First Option: Custom Class

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

// Second Option: using the TransformSerializer Class

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

// Third Option: creating the TransformSerializer via function

const ORIGIN_TYPE_SERIALIZER_VIA_FNC = createTransformSerializer(
    fromOriginToBase,
    fromBaseToOrigin,
    UINT8_SERIALIZER as ValueSerializer<BaseType>,
    (val, name) => {
        if (!isOriginType(val))
            throw new Error(name + " needs to be of type OriginType");
    }
);

// Fourth Option: transform the type to serializable beforehand

```
*You can find this in `examples\transform-values.ts`*

## Joined structures

If you have a object structure which is composed of multiple separate structures and they are identified by a property
then you can use the `SwitchSerializer`.

<!-- USEFILE: examples\property-switch-serializer.ts; str => str.replace('../src', 'serialization-generator') -->
``` ts
import {
    ObjectSerializer,
    PropertySwitchSerializer,

    INT32_SERIALIZER,
    STRING_SERIALIZER
} from "serialization-generator";

interface JoinedTypeA {
    type: 'a';
    l: number;
}

interface JoinedTypeB {
    type: 'b';
    m: string;
}

// if you have a joined type which has a property which distinguishes between different
// type then you can use the PropertySwitchSerializer to serialize / deserialize the value
type JoinedType = JoinedTypeA | JoinedTypeB;

// To use the Property Switch Serializer you need to construct the serializer for the different sub
// types Those serializers SHOULD NOT contain a serializer for the property which is used
// to distinguish them since this property will be handled by the switch serializer
const JOINED_TYPE_A = new ObjectSerializer<JoinedTypeA>({l: INT32_SERIALIZER});
const JOINED_TYPE_B = new ObjectSerializer<JoinedTypeB>({m: STRING_SERIALIZER});

// When you have a serializer for all subtypes you can combine them to a PropertySwitchSerializer.
// You need to call the finalize after all register calls are done to be able to use this
// serializer.
const JOINED_TYPE_SERIALIZER = new PropertySwitchSerializer<JoinedType, 'type'>('type')
    .register("a", JOINED_TYPE_A)
    .register("b", JOINED_TYPE_B)
    .finalize();
```
*You can find this in `examples\property-switch-serializer.ts`*

## Partial De- / Serialization

There are several use cases where you would like to provide a value already serialized and incorporate it into a greater
structure or where you would like not to deserialize a part of an object.

Example use cases:

- You have a `NodeJS-Task-Worker` <-> `NodeJS-HTTP-Worker` <-> `Browser-Client` setup and the `NodeJS-Task-Worker`
  creates a value ultimately meant to be used by the `Browser-Client`. In the first step the task worker will send this
  value wrapped in some message object to the HTTP worker, which will re-wrap this value and send it to the browser.
  Without a partial serializer you would fully deserialize this value in the HTTP worker and then re-serialize it to
  send it to the browser.

- Another szenario is that you would like to send the same value to multiple clients, then you could serialize it once
  and only have the changing wrapper be serialized for each client.

- Or you could have the value already serialized and taken from a cache or it could be loaded from a file.

The `ObjectPartialSerializer` is not identical to having an object with an `ArrayBuffer` field. The reason being that
this array buffer would not be deserialized when deserializing the object, so it is not transparent in the deserializing
step.

The `ArrayBuffer` created by serializing an object with the `ObjectPartialSerializer` is identical to the `ArrayBuffer`
created by the corresponding `ObjectSerializer`, at least if the data is identical.

This means that you can use the `ObjectSerializer` for type T and `ObjectPartialSerializer` for type T interchangeably.

Have a look at those two examples:

<!-- USEFILE: examples\partial-serializer.ts; str => str.replace('../src', 'serialization-generator') -->
``` ts
import {
    ObjectPartialSerializer,
    ObjectSerializer,
    SerializerType,
    STRING_SERIALIZER,
    UINT16_SERIALIZER,
    VectorSerializer
} from "serialization-generator";

interface ExampleStructure {
    fieldA: number;
    fieldB: [string, string];
    fieldC: string;
}

const STRING_VECTOR_2_SERIALIZER = new VectorSerializer(STRING_SERIALIZER, 2);

const EXAMPLE_FULL_SERIALIZER = new ObjectSerializer<ExampleStructure>()
    .append('fieldA', UINT16_SERIALIZER)
    .append('fieldB', STRING_VECTOR_2_SERIALIZER)
    .append('fieldC', STRING_SERIALIZER);

const EXAMPLE_PARTIAL_SERIALIZER = new ObjectPartialSerializer(EXAMPLE_FULL_SERIALIZER, 'fieldB');

// This type is the same as the ExampleStructure but the fieldB is replaced with the type ArrayBuffer
// You could have written the following instead:
// type ExamplePartialStructure = InsteadArrayBuffer<ExampleStructure, 'fieldB'>;
type ExamplePartialStructure = SerializerType<typeof EXAMPLE_PARTIAL_SERIALIZER>;









// Example szenario:

// This could be a NodesJS-Worker who serialized a generated value which he send to the main thread
const fullSerialized = EXAMPLE_FULL_SERIALIZER.valueToArrayBuffer({
    fieldA: 12,
    fieldB: ['Test', 'test'],
    fieldC: 'test'
});

// Transferring fullSerialized to another Worker ...

// This could be a the HTTP-Server Worker of the NodeJS instance
// This one needs to read fieldA and fieldC but keeps fieldB as it is because it does not need to read it but to send
// the value to the client

const partialDeserialized = EXAMPLE_PARTIAL_SERIALIZER.arrayBufferToValue(fullSerialized);

const reWrapped = {
    type: 'client-message',

    // is an ArrayBuffer
    value: partialDeserialized.fieldB
}

// You would then use another ObjectPartialSerializer to pack this value to send it to the client
// which would use another ObjectSerializer to fully unpack the values and receive the original value of fieldB.

// const toClient = CLIENT_PARTIAL_SERIALIZER.valueToArrayBuffer(reWrapped);
// Sending ...
// const fullValue = CLIENT_SERIALIZER.arrayBufferToValue(toClient);
// fullValue.value[0] == 'Test'





// Another szenario:

// You have serialized the value by some other means already, for example loaded it from a file took the serialized value
// from a cache or are sending part of the object to multiple clients, for which you need to copy this part of the object.

// Then you can attach this value directly like so:

// Creating the pre-serialized portion of the object:
const preSerValue = STRING_VECTOR_2_SERIALIZER.valueToArrayBuffer(['a', 'b']);

const partialValue: ExamplePartialStructure = {
    fieldA: 22,
    fieldB: preSerValue,
    fieldC: 'nice'
};

// Can be used anyway
EXAMPLE_PARTIAL_SERIALIZER.typeCheck(partialValue);

// This would be the server:
const partialSer = EXAMPLE_PARTIAL_SERIALIZER.valueToArrayBuffer(partialValue);

// And each client could unpack the full object and read fielB fully again
const fullDes = EXAMPLE_FULL_SERIALIZER.arrayBufferToValue(partialSer);

```
*You can find this in `examples\partial-serializer.ts`*

## Performance remarks

This package tries to make the serialization as fast as possible and still keep a readable API.

There will be no typecheck done on serialization, if you can not trust the datastructure you can do one manually by
calling
`typeCheck` of the serializer.

The provided default serializers have different runtime behavior which can heavily influence your choice for the
datastructure.

The performance report below is the result of the serialization from a similar datasctructure like the one shown above.
`serialization` includes the `ObjectSerializer` and the number serializer but nothing else, all other are added
separately.

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
to stick to the other serializers. The most efficient option is to only use `ObjectSerializer` and the number
serializer.

## In comparison to other means of serialization

This package is rather basic and is only meant to serialize structures which remain mostly static.

### This package vs JSON

#### Pro `serialization-generator`

- Maps to a lot less bytes
- Has type check
- The structure does not need to be send / saved each time

#### Pro `JSON`

- Doesn't need to be prepared
- The structure doesn't need to be predefined
- The receiver doesn't need to know the structure and construct a deserializer

### This package vs FlatBuffers / protobuf

[FlatBuffers](https://google.github.io/flatbuffers) and [protobuf](https://protobufjs.github.io/protobuf.js/) are two
solutions which are well tested and have a huge userbase. I had not found those before implementing this library. They
might be better suited for your usecase!

Disclaimer: I have never used one of them, my pros and cons are only first impressions.

#### Pro `serialization-generator`

- Only meant to transport JavaScript Values, might be more suitable
- This library is only meant to be used by JavaScript or TypeScript, might be more tailored for that usecase

#### Pro `FlatBuffers / protobuf`

- They are better tested
- They have an extensive documentations / many answered questions
- They might be better optimized
- Somewhat standard
- Can be used with other languages beside JavaScript
- You can access data from FlatBuffers without deserialization

### Structured clone

This is internally used by the JavaScript engine to transfer JavaScript values from one realm to another (WebWorkers,
IndexDB, History API). Sadly this API is not yet exposed directly but might be in the future.

NodeJS exposed this functionality from the V8, have look here: https://nodejs.org/api/v8.html#v8_serialization_api

Either way those values can not be read by JavaScript in the browser, which makes it not suitable for my usecase.
Hopefully this functionality will come to the browser at some point, you can read more about it here:

Definition: https://html.spec.whatwg.org/multipage/structured-data.html#structuredserializeforstorage

ECMAScript proposal: https://github.com/dslomov/ecmascript-structured-clone (found
here: https://github.com/tc39/proposals/blob/master/stage-0-proposals.md)

Discussion about specification: https://github.com/whatwg/html/issues/793

## Runtime requirements

This package heavily relies on `ArrayBuffer` and `DataView`. This package will not work if they are not present. 
