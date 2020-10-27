# serialization-generator

The main target of this package is to make the creation of serializers to transform JavaScript Values into binary and back
as easy as possible and to keep the creation readable.

To archive this goal this package provides multiple simple serializers which you can combine to create more complex
versions which fit your needed data structures.

<!-- USEFILE: src/simple-example.ts; str => str.replace('./index', 'serialization-generator') -->

The provided functions are fully typesafe.

## Usage

The easiest way to use this package is by declaring your data structure by a TypeScript interface and then create the
`ObjectSerializer` as was done in the example above. After this configuration you can export the serializer as reuse it
in your code base. Other serializers can use this custom serializer as subserializers.

Please have a look in the API documentation.

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

Sadly the array serializer is really slow and should only be used if you really need to. All other serializers are quite
fast, but I would highly recommend that you stick to `ObjectSerialzer`, `VectorSerializer` and the number serializer and
that you either write a custom serializer by extending the `ValueSerializer` or just prepend a function which converts
your data in another structure which does not include strings, other arraybuffers or arrays.

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