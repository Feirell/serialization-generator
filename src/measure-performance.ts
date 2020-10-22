import {ARRAY_BUFFER_SERIALIZER} from "./serializer/array-buffer-serializer";
import {ObjectSerializer} from "./serializer/object-serializer";
import {UINT32_SERIALIZER} from "./serializer/int-serializer";
import {FLOAT32_SERIALIZER} from "./serializer/float-serializer";
import {STRING_SERIALIZER} from "./serializer/string-serializer";
import {ArraySerializer} from "./serializer/array-serializer";
import {measure, speed} from "performance-test-runner";
import {runAndReport} from "performance-test-runner/lib/suite-console-printer";


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
}

const ab = new ArrayBuffer(3);
new Uint8Array(ab).set([1, 4, 9]);

const instance: ExampleType = {
    a: 12,
    b: Math.PI,
    c: {
        d: 22,
        e: 443,
        f: ab
    },

    g: "Test string €€",
    h: new Array(500).fill(0xff)
}

/*
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
 */

let global: any;

measure('serialization', () => {
    const exSer = new ObjectSerializer<ExampleType>()
        .append("a", UINT32_SERIALIZER)
        .append("b", FLOAT32_SERIALIZER)
        .append("c", new ObjectSerializer<ExampleType["c"]>()
                .append("d", UINT32_SERIALIZER)
                .append("e", FLOAT32_SERIALIZER)
            // .append("f", ARRAY_BUFFER_SERIALIZER)
        )
    // .append("g", STRING_SERIALIZER)
    // .append("h", new ArraySerializer(UINT32_SERIALIZER))

    const {serializer, deserializer} = exSer
        .generate();

    const length = exSer.getSizeForValue(instance);

    // console.log('length', length);
    const data = new ArrayBuffer(length);

    speed('serialize', {data, serializer, instance}, () => {
        global.serializer(global.data, 0, global.instance, false);
    })

    speed('deserialize', {data, deserializer}, () => {
        global.deserializer(global.data, 0);
    })
})

measure('serialization + Array', () => {
    const exSer = new ObjectSerializer<ExampleType>()
        .append("a", UINT32_SERIALIZER)
        .append("b", FLOAT32_SERIALIZER)
        .append("c", new ObjectSerializer<ExampleType["c"]>()
                .append("d", UINT32_SERIALIZER)
                .append("e", FLOAT32_SERIALIZER)
            // .append("f", ARRAY_BUFFER_SERIALIZER)
        )
        // .append("g", STRING_SERIALIZER)
        .append("h", new ArraySerializer(UINT32_SERIALIZER))

    const {serializer, deserializer} = exSer
        .generate();

    const length = exSer.getSizeForValue(instance);

    // console.log('length', length);
    const data = new ArrayBuffer(length);

    speed('serialize', {data, serializer, instance}, () => {
        global.serializer(global.data, 0, global.instance, false);
    })

    speed('deserialize', {data, deserializer}, () => {
        global.deserializer(global.data, 0);
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

    const {serializer, deserializer} = exSer
        .generate();

    const length = exSer.getSizeForValue(instance);

    // console.log('length', length);
    const data = new ArrayBuffer(length);

    speed('serialize', {data, serializer, instance}, () => {
        global.serializer(global.data, 0, global.instance, false);
    })

    speed('deserialize', {data, deserializer}, () => {
        global.deserializer(global.data, 0);
    })
})

measure('serialization + String', () => {
    const exSer = new ObjectSerializer<ExampleType>()
        .append("a", UINT32_SERIALIZER)
        .append("b", FLOAT32_SERIALIZER)
        .append("c", new ObjectSerializer<ExampleType["c"]>()
                .append("d", UINT32_SERIALIZER)
                .append("e", FLOAT32_SERIALIZER)
            // .append("f", ARRAY_BUFFER_SERIALIZER)
        )
        .append("g", STRING_SERIALIZER)
    // .append("h", new ArraySerializer(UINT32_SERIALIZER))

    const {serializer, deserializer} = exSer
        .generate();

    const length = exSer.getSizeForValue(instance);

    // console.log('length', length);
    const data = new ArrayBuffer(length);

    speed('serialize', {data, serializer, instance}, () => {
        global.serializer(global.data, 0, global.instance, false);
    })

    speed('deserialize', {data, deserializer}, () => {
        global.deserializer(global.data, 0);
    })
})

measure('serialization + AB + String + Array', () => {
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

    const {serializer, deserializer} = exSer
        .generate();

    const length = exSer.getSizeForValue(instance);

    // console.log('length', length);
    const data = new ArrayBuffer(length);

    speed('serialize', {data, serializer, instance}, () => {
        global.serializer(global.data, 0, global.instance, false);
    })

    speed('deserialize', {data, deserializer}, () => {
        global.deserializer(global.data, 0);
    })
})

runAndReport();
