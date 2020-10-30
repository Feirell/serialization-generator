import {
    ARRAY_BUFFER_SERIALIZER,
    ArraySerializer,
    EnumSerializer,
    FLOAT32_SERIALIZER,
    INT8_SERIALIZER,
    ObjectSerializer,
    STRING_SERIALIZER,
    UINT16_SERIALIZER,
    UINT32_SERIALIZER,
    VectorSerializer
} from "../src";

import {measure, speed} from "performance-test-runner";
import {runAndReport} from "performance-test-runner/lib/suite-console-printer";

type Enum = 'ENUM_VAL_A' | 'ENUM_VAL_B' | 'ENUM_VAL_C';

interface ExampleType {
    a: number;
    b: number;
    c: {
        d: number;
        e: number;
        f: ArrayBuffer;
    };

    g: string;
    h: number[];
    i: [number, number, number, number, number, number, number, number, number, number];
    j: Enum;
}

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

    g: "Test string €€",
    h: [0, 1, 2, 3, 4, 5, 6, 7, 8, 9],
    i: [0, 1, 2, 3, 4, 5, 6, 7, 8, 9],
    j: "ENUM_VAL_B"
}

/*
forged together:

                ops/sec  MoE samples relative
serialization
  serialize   5,321,436 1.12      89     1.15
  deserialize 4,624,741 1.30      90     1.00
serialization + Array
  serialize     286,356 1.17      89     1.00
  deserialize   448,172 0.63      88     1.57
serialization + AB
  serialize     345,649 0.59      93     1.00
  deserialize   793,628 0.97      84     2.30
serialization + String
  serialize     215,804 2.49      93     1.31
  deserialize   164,114 3.05      79     1.00
serialization + AB + String + Array
  serialize     100,676 0.74      95     1.00
  deserialize   111,592 0.61      90     1.11

with the general form

                  ops/sec  MoE samples relative
serialization
  serialize   2,762,253 1.49      91     1.20
  deserialize 2,301,058 1.48      92     1.00


with the correct specific identifiers for the functions in the Float32 / Uint32 classes

                ops/sec  MoE samples relative
serialization
  serialize   4,055,612 1.45      88     1.38
  deserialize 2,937,750 1.71      91     1.00

With vector

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

let global: any;

measure('serialization', () => {
    const exSer = new ObjectSerializer<ExampleType>()
        .append("a", UINT32_SERIALIZER)
        .append("b", FLOAT32_SERIALIZER)
        .append("c", new ObjectSerializer<ExampleType["c"]>()
                .append("d", INT8_SERIALIZER)
                .append("e", UINT16_SERIALIZER)
            // .append("f", ARRAY_BUFFER_SERIALIZER)
        )
    // .append("g", STRING_SERIALIZER)
    // .append("h", new ArraySerializer(UINT32_SERIALIZER))
    // .append("i", new VectorSerializer(UINT32_SERIALIZER, 10))
    // .append("j", new EnumSerializer<Enum>(['ENUM_VAL_A', 'ENUM_VAL_B', 'ENUM_VAL_C']))


    const length = exSer.getSizeForValue(instance);

    // console.log('length', length);
    const data = new ArrayBuffer(length);
    const view = new DataView(data);

    speed('serialize', {view, exSer, instance}, () => {
        global.exSer.serialize(global.view, 0, global.instance, false);
    })

    speed('deserialize', {view, exSer}, () => {
        global.exSer.deserialize(global.view, 0);
    })
})


measure('serialization + Array', () => {
    const exSer = new ObjectSerializer<ExampleType>()
        .append("a", UINT32_SERIALIZER)
        .append("b", FLOAT32_SERIALIZER)
        .append("c", new ObjectSerializer<ExampleType["c"]>()
                .append("d", INT8_SERIALIZER)
                .append("e", UINT16_SERIALIZER)
            // .append("f", ARRAY_BUFFER_SERIALIZER)
        )
        // .append("g", STRING_SERIALIZER)
        .append("h", new ArraySerializer(UINT32_SERIALIZER))
    // .append("i", new VectorSerializer(UINT32_SERIALIZER, 10))
    // .append("j", new EnumSerializer<Enum>(['ENUM_VAL_A', 'ENUM_VAL_B', 'ENUM_VAL_C']))


    const length = exSer.getSizeForValue(instance);

    // console.log('length', length);
    const data = new ArrayBuffer(length);
    const view = new DataView(data);

    speed('serialize', {view, exSer, instance}, () => {
        global.exSer.serialize(global.view, 0, global.instance, false);
    })

    speed('deserialize', {view, exSer}, () => {
        global.exSer.deserialize(global.view, 0);
    })
})

measure('serialization + Vector', () => {
    const exSer = new ObjectSerializer<ExampleType>()
        .append("a", UINT32_SERIALIZER)
        .append("b", FLOAT32_SERIALIZER)
        .append("c", new ObjectSerializer<ExampleType["c"]>()
                .append("d", INT8_SERIALIZER)
                .append("e", UINT16_SERIALIZER)
            // .append("f", ARRAY_BUFFER_SERIALIZER)
        )
        // .append("g", STRING_SERIALIZER)
        // .append("h", new ArraySerializer(UINT32_SERIALIZER))
        .append("i", new VectorSerializer(UINT32_SERIALIZER, 10))
    // .append("j", new EnumSerializer<Enum>(['ENUM_VAL_A', 'ENUM_VAL_B', 'ENUM_VAL_C']))


    const length = exSer.getSizeForValue(instance);

    // console.log('length', length);
    const data = new ArrayBuffer(length);
    const view = new DataView(data);

    speed('serialize', {view, exSer, instance}, () => {
        global.exSer.serialize(global.view, 0, global.instance, false);
    })

    speed('deserialize', {view, exSer}, () => {
        global.exSer.deserialize(global.view, 0);
    })
})

measure('serialization + AB', () => {
    const exSer = new ObjectSerializer<ExampleType>()
        .append("a", UINT32_SERIALIZER)
        .append("b", FLOAT32_SERIALIZER)
        .append("c", new ObjectSerializer<ExampleType["c"]>()
            .append("d", UINT32_SERIALIZER)
            .append("e", FLOAT32_SERIALIZER)
            .append("f", ARRAY_BUFFER_SERIALIZER)
        )
    // .append("g", STRING_SERIALIZER)
    // .append("h", new ArraySerializer(UINT32_SERIALIZER))
    // .append("i", new VectorSerializer(UINT32_SERIALIZER, 10))
    // .append("j", new EnumSerializer<Enum>(['ENUM_VAL_A', 'ENUM_VAL_B', 'ENUM_VAL_C']))


    const length = exSer.getSizeForValue(instance);

    // console.log('length', length);
    const data = new ArrayBuffer(length);
    const view = new DataView(data);

    speed('serialize', {view, exSer, instance}, () => {
        global.exSer.serialize(global.view, 0, global.instance, false);
    })

    speed('deserialize', {view, exSer}, () => {
        global.exSer.deserialize(global.view, 0);
    })
})

measure('serialization + String', () => {
    const exSer = new ObjectSerializer<ExampleType>()
        .append("a", UINT32_SERIALIZER)
        .append("b", FLOAT32_SERIALIZER)
        .append("c", new ObjectSerializer<ExampleType["c"]>()
                .append("d", INT8_SERIALIZER)
                .append("e", UINT16_SERIALIZER)
            // .append("f", ARRAY_BUFFER_SERIALIZER)
        )
        .append("g", STRING_SERIALIZER)
    // .append("h", new ArraySerializer(UINT32_SERIALIZER))
    // .append("i", new VectorSerializer(UINT32_SERIALIZER, 10))
    // .append("j", new EnumSerializer<Enum>(['ENUM_VAL_A', 'ENUM_VAL_B', 'ENUM_VAL_C']))


    const length = exSer.getSizeForValue(instance);

    // console.log('length', length);
    const data = new ArrayBuffer(length);
    const view = new DataView(data);

    speed('serialize', {view, exSer, instance}, () => {
        global.exSer.serialize(global.view, 0, global.instance, false);
    })

    speed('deserialize', {view, exSer}, () => {
        global.exSer.deserialize(global.view, 0);
    })
})

measure('serialization + Enum', () => {
    const exSer = new ObjectSerializer<ExampleType>()
        .append("a", UINT32_SERIALIZER)
        .append("b", FLOAT32_SERIALIZER)
        .append("c", new ObjectSerializer<ExampleType["c"]>()
                .append("d", INT8_SERIALIZER)
                .append("e", UINT16_SERIALIZER)
            // .append("f", ARRAY_BUFFER_SERIALIZER)
        )
        // .append("g", STRING_SERIALIZER)
        // .append("h", new ArraySerializer(UINT32_SERIALIZER))
        // .append("i", new VectorSerializer(UINT32_SERIALIZER, 10))
        .append("j", new EnumSerializer<Enum>(['ENUM_VAL_A', 'ENUM_VAL_B', 'ENUM_VAL_C']))


    const length = exSer.getSizeForValue(instance);

    // console.log('length', length);
    const data = new ArrayBuffer(length);
    const view = new DataView(data);

    speed('serialize', {view, exSer, instance}, () => {
        global.exSer.serialize(global.view, 0, global.instance, false);
    })

    speed('deserialize', {view, exSer}, () => {
        global.exSer.deserialize(global.view, 0);
    })
})

measure('serialization + Array + Vector + AB + String + Enum', () => {
    const exSer = new ObjectSerializer<ExampleType>()
        .append("a", UINT32_SERIALIZER)
        .append("b", FLOAT32_SERIALIZER)
        .append("c", new ObjectSerializer<ExampleType["c"]>()
            .append("d", UINT32_SERIALIZER)
            .append("e", FLOAT32_SERIALIZER)
            .append("f", ARRAY_BUFFER_SERIALIZER)
        )
        .append("g", STRING_SERIALIZER)
        .append("h", new ArraySerializer(UINT32_SERIALIZER))
        .append("i", new VectorSerializer(UINT32_SERIALIZER, 10))
        .append("j", new EnumSerializer<Enum>(['ENUM_VAL_A', 'ENUM_VAL_B', 'ENUM_VAL_C']))


    const length = exSer.getSizeForValue(instance);

    // console.log('length', length);
    const data = new ArrayBuffer(length);
    const view = new DataView(data);

    speed('serialize', {view, exSer, instance}, () => {
        global.exSer.serialize(global.view, 0, global.instance, false);
    })

    speed('deserialize', {view, exSer}, () => {
        global.exSer.deserialize(global.view, 0);
    })
})

runAndReport();
