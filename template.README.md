# serialization-generator

> **Please have a look at the `This package vs FlatBuffers / protobuf` section below before making yourself familiar with this library.**

The main target of this package is to make the creation of serializers to transform JavaScript Values into binary and back
as easy as possible and to keep the creation readable.

To archive this goal this package provides multiple simple serializers which you can combine to create more complex
versions which fit your needed data structures.

<!-- USEFILE: examples/simple-example.ts; str => str.replace('../src', 'serialization-generator') -->

The provided functions are fully typesafe.

## Usage

The easiest way to use this package is by declaring your data structure by a TypeScript interface and then create the
`ObjectSerializer` as was done in the example above. After this configuration you can export the serializer as reuse it
in your code base. Other serializers can use this custom serializer as subserializers.

Please have a look at the [API documentation](https://feirell.github.io/serialization-generator/).

## Mapping / transforming serializer

If want to implement a mapping serializer which, for example, maps an enum to a number and back you could do so in four ways.
`EnumSerializer` is a specific class to map a static number of values to their indexes and back, primarily Enums.

<!-- USEFILE: examples/transform-values.ts; str => str.replace('../src', 'serialization-generator') -->

## Joined structures

If you have a object structure which is composed of multiple separate structures and they are identified by a property
then you can use the `SwitchSerializer`.
 
<!-- USEFILE: examples/switch-serializer.ts; str => str.replace('../src', 'serialization-generator') -->

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

### This package vs FlatBuffers / protobuf

[FlatBuffers](https://google.github.io/flatbuffers) and [protobuf](https://protobufjs.github.io/protobuf.js/) are two solutions which are well tested and have a huge userbase.
I had not found those before implementing this library. They might be better suited for your usecase!

Disclaimer: I have never used one of them, my pros and cons are only first impressions. 

\+ Only meant to transport JavaScript Values, might be more suitable

\+ This library is only meant to be used by JavaScript or TypeScript, might be more tailored for that usecase



\- They are better tested

\- The other libraries have an extensive documentations / many answered questions

\- Might have an inferior performance, might be better optimized

\- Somewhat standard

\- You can access data from FlatBuffers without deserialization

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