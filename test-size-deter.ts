import {
    ArraySerializer,
    ObjectSerializer,
    PropertySwitchSerializer,
    STRING_SERIALIZER,
    UINT16_SERIALIZER,
    VectorSerializer
} from "./src";

interface Type {
    field: number[];
    other: {
        yetAnother: [string, string];
    },
    another: (
        { type: 'a', val: number } |
        { type: 'b', stringField: string[] }
        )
}

const fieldSer = new ArraySerializer(UINT16_SERIALIZER);
const otherSer = new ObjectSerializer<{ yetAnother: [string, string]; }>()
    .append('yetAnother', new VectorSerializer(STRING_SERIALIZER, 2));
const anotherSer = new PropertySwitchSerializer<{ type: 'a'; val: number; } | { type: 'b'; stringField: string[]; }, 'type'>('type')
    .register('a', new ObjectSerializer<{ type: 'a', val: number }>().append('val', UINT16_SERIALIZER))
    .register('b', new ObjectSerializer<{ type: 'b', stringField: string[] }>().append('stringField', new ArraySerializer(STRING_SERIALIZER)))
    .finalize()

const ser = new ObjectSerializer<Type>()
    .append('field', fieldSer)
    .append('other', otherSer)
    .append('another', anotherSer);

const val: Type = {
    field: [4, 3, 21],
    other: {
        yetAnother: ['z6', 'u77']
    },
    another: {
        type: 'b',
        stringField: ["First string", "Second string"]
    }
};

const serialized = ser.valueToArrayBuffer(val);
const dv = new DataView(serialized);

const length = ser.getByteSizeFromDataInBuffer(dv, 0);


console.log('length', length, 'actual size', serialized.byteLength);

console.log('field length', anotherSer.getByteSizeFromDataInBuffer(dv, 8 + 9))
console.log('field value', anotherSer.deserialize(dv, 8 + 9));

// console.log('length', STRING_SERIALIZER.getByteSizeFromDataInBuffer(new DataView(serialized), 2 + 6));
