import {
    ARRAY_BUFFER_SERIALIZER,
    ArraySerializer,
    FLOAT32_SERIALIZER,
    ObjectSerializer,
    STRING_SERIALIZER,
    UINT32_SERIALIZER,
    UINT8_SERIALIZER,
    VectorSerializer
} from './index';

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
    i: [number, number, number, number];
}

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
    .append("i", new VectorSerializer<number, 4>(UINT8_SERIALIZER, 4))

console.log('staticSize', exSer.staticSize);

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
    h: [1, 2, 3, 22],
    i: [8, 7, 7, 2]
}

const length = exSer.getSizeForValue(instance);

console.log('length', length);
const data = new ArrayBuffer(length);
const view = new DataView(data);
exSer.serialize(view, 0, instance);
console.log('data', data);

const deValue = exSer.deserialize(view, 0);
const val = deValue.val;
console.log('val', val);


// import './measure-performance';