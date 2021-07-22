import {
    ObjectPartialSerializer,
    ObjectSerializer,
    SerializerType,
    STRING_SERIALIZER,
    UINT16_SERIALIZER,
    VectorSerializer
} from "../src";

interface ExampleStructure {
    fieldA: number;
    fieldB: [string, string];
    fieldC: string;
}

const STRING_VECTOR_2_SERIALIZER = new VectorSerializer(STRING_SERIALIZER, 2);

const EXAMPLE_FULL_SERIALIZER = new ObjectSerializer<ExampleStructure>()
    .append('fieldA', UINT16_SERIALIZER)
    .append('fieldB', STRING_VECTOR_2_SERIALIZER)
    .append('fieldC', STRING_SERIALIZER);

const EXAMPLE_PARTIAL_SERIALIZER = new ObjectPartialSerializer(EXAMPLE_FULL_SERIALIZER, 'fieldB');

// This type is the same as the ExampleStructure but the fieldB is replaced with the type ArrayBuffer
// You could have written the following instead:
// type ExamplePartialStructure = InsteadArrayBuffer<ExampleStructure, 'fieldB'>;
type ExamplePartialStructure = SerializerType<typeof EXAMPLE_PARTIAL_SERIALIZER>;









// Example szenario:

// This could be a NodesJS-Worker who serialized a generated value which he send to the main thread
const fullSerialized = EXAMPLE_FULL_SERIALIZER.valueToArrayBuffer({
    fieldA: 12,
    fieldB: ['Test', 'test'],
    fieldC: 'test'
});

// Transferring fullSerialized to another Worker ...

// This could be a the HTTP-Server Worker of the NodeJS instance
// This one needs to read fieldA and fieldC but keeps fieldB as it is because it does not need to read it but to send
// the value to the client

const partialDeserialized = EXAMPLE_PARTIAL_SERIALIZER.arrayBufferToValue(fullSerialized);

const reWrapped = {
    type: 'client-message',

    // is an ArrayBuffer
    value: partialDeserialized.fieldB
}

// You would then use another ObjectPartialSerializer to pack this value to send it to the client
// which would use another ObjectSerializer to fully unpack the values and receive the original value of fieldB.

// const toClient = CLIENT_PARTIAL_SERIALIZER.valueToArrayBuffer(reWrapped);
// Sending ...
// const fullValue = CLIENT_SERIALIZER.arrayBufferToValue(toClient);
// fullValue.value[0] == 'Test'





// Another szenario:

// You have serialized the value by some other means already, for example loaded it from a file took the serialized value
// from a cache or are sending part of the object to multiple clients, for which you need to copy this part of the object.

// Then you can attach this value directly like so:

// Creating the pre-serialized portion of the object:
const preSerValue = STRING_VECTOR_2_SERIALIZER.valueToArrayBuffer(['a', 'b']);

const partialValue: ExamplePartialStructure = {
    fieldA: 22,
    fieldB: preSerValue,
    fieldC: 'nice'
};

// Can be used anyway
EXAMPLE_PARTIAL_SERIALIZER.typeCheck(partialValue);

// This would be the server:
const partialSer = EXAMPLE_PARTIAL_SERIALIZER.valueToArrayBuffer(partialValue);

// And each client could unpack the full object and read fielB fully again
const fullDes = EXAMPLE_FULL_SERIALIZER.arrayBufferToValue(partialSer);
