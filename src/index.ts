import {ARRAY_BUFFER_SERIALIZER} from "./serializer/array-buffer-serializer";
import {ObjectSerializer} from "./serializer/object-serializer";
import {UINT32_SERIALIZER} from "./serializer/int-serializer";
import {FLOAT32_SERIALIZER} from "./serializer/float-serializer";
import {STRING_SERIALIZER} from "./serializer/string-serializer";
import {ArraySerializer} from "./serializer/array-serializer";

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
    h: [1, 2, 3, 22]
}

const length = exSer.getSizeForValue(instance);

console.log('length', length);
const data = new ArrayBuffer(length);

serializer(data, 0, instance);
console.log('data', data);

const deValue = deserializer(data, 0);
const val = deValue.val;
console.log('val', val);