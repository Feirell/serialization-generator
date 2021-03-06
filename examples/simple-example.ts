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
} from '../src';

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