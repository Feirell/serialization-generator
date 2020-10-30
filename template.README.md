# serialization-generator

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

## Performance remarks

This package tries to make the serialization as fast as possible and still keep a readable codebase.
With this in mind you should create your own custom serializers and choose the ones you use.

There will be no typecheck done serialization, if you can not trust the datastructure you can do one manually by calling
`typeCheck` of the serializer. But if you need to do the serialization as fast as possible you should not include those
checks in the code running in production.

The provided default serializers have different runtime behavior which can heavily influence your choice for the datastructure.

The performance report below is the result of the serialization from the example provided above.
`serialization` includes the `ObjectSerializer` and the number serializer but nothing else.
All other are added separately.

```
                ops/sec  MoE samples relative
serialization
  serialize   2,223,855 1.28      90     1.11
  deserialize 2,006,597 0.91      85     1.00
serialization + Array
  serialize   1,702,778 0.68      90     1.22
  deserialize 1,397,288 2.43      91     1.00
serialization + Vector
  serialize   1,371,070 0.67      87     1.31
  deserialize 1,045,809 1.48      89     1.00
serialization + AB
  serialize   1,250,732 1.54      90     3.09
  deserialize   404,587 1.12      91     1.00
serialization + String
  serialize   1,010,058 1.00      92     5.44
  deserialize   185,555 1.74      88     1.00
serialization + Enum
  serialize   1,536,543 0.83      88     1.39
  deserialize 1,109,299 1.14      94     1.00
serialization + Array + Vector + AB + String + Enum
  serialize     479,868 1.49      85     3.59
  deserialize   133,637 0.90      88     1.00
 */
```

As this performance measurement show array buffer and string serialization are quite slow, I would recommend therefore
to stick to the other serializers. Even though  

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