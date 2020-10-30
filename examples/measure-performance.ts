import {
    ARRAY_BUFFER_SERIALIZER,
    ArraySerializer,
    EnumSerializer,
    FLOAT32_SERIALIZER,
    ObjectSerializer,
    STRING_SERIALIZER,
    UINT32_SERIALIZER,
    ValueSerializer,
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
    };

    f: ArrayBuffer;
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
    },

    f: ab,
    g: "Test string €€",
    h: [0, 1, 2, 3, 4, 5, 6, 7, 8, 9],
    i: [0, 1, 2, 3, 4, 5, 6, 7, 8, 9],
    j: "ENUM_VAL_B"
}

let global: any;

const SUB_TYPE_SERIALIZER = new ObjectSerializer<ExampleType["c"]>()
    .append("d", UINT32_SERIALIZER)
    .append("e", FLOAT32_SERIALIZER)

const BASE = new ObjectSerializer<ExampleType>()
    .append("a", UINT32_SERIALIZER)
    .append("b", FLOAT32_SERIALIZER)
    .append("c", SUB_TYPE_SERIALIZER)

const cases: [string, (b: typeof BASE) => typeof BASE][] = [
    ["Array", BASE => BASE.clone()
        .append("h", new ArraySerializer(UINT32_SERIALIZER))
    ],
    ["Vector", BASE => BASE.clone()
        .append("i", new VectorSerializer(UINT32_SERIALIZER, 10))
    ],
    ["AB", BASE => BASE.clone()
        .append("f", ARRAY_BUFFER_SERIALIZER)
    ],
    ["String", BASE => BASE.clone()
        .append("g", STRING_SERIALIZER)
    ],
    ["Enum", BASE => BASE.clone()
        .append("j", new EnumSerializer<Enum>(['ENUM_VAL_A', 'ENUM_VAL_B', 'ENUM_VAL_C']))
    ]
]

function measureSerAndDes(name: string, ser: ValueSerializer<ExampleType>) {
    measure(name, () => {
        const length = ser.getSizeForValue(instance);

        const data = new ArrayBuffer(length);
        const view = new DataView(data);

        speed('serialize', {view, ser, instance}, () => {
            global.ser.serialize(global.view, 0, global.instance, false);
        })

        speed('deserialize', {view, ser}, () => {
            global.ser.deserialize(global.view, 0);
        })
    })
}

measureSerAndDes('serialization', BASE);

let fullName = 'serialization';
let fullSer = BASE;

for (const [name, serMod] of cases) {
    measureSerAndDes('serialization + ' + name, serMod(BASE));

    fullName += " + " + name;
    fullSer = serMod(fullSer);
}

measureSerAndDes(fullName, fullSer);

runAndReport();
