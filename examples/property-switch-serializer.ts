import {
    ObjectSerializer,
    PropertySwitchSerializer,

    INT32_SERIALIZER,
    STRING_SERIALIZER
} from "../src";

interface JoinedTypeA {
    type: 'a';
    l: number;
}

interface JoinedTypeB {
    type: 'b';
    m: string;
}

// if you have a joined type which has a property which distinguishes between different
// type then you can use the PropertySwitchSerializer to serialize / deserialize the value
type JoinedType = JoinedTypeA | JoinedTypeB;

// To use the Property Switch Serializer you need to construct the serializer for the different sub
// types Those serializers SHOULD NOT contain a serializer for the property which is used
// to distinguish them since this property will be handled by the switch serializer
const JOINED_TYPE_A = new ObjectSerializer<JoinedTypeA>({l: INT32_SERIALIZER});
const JOINED_TYPE_B = new ObjectSerializer<JoinedTypeB>({m: STRING_SERIALIZER});

// When you have a serializer for all subtypes you can combine them to a PropertySwitchSerializer.
// You need to call the finalize after all register calls are done to be able to use this
// serializer.
const JOINED_TYPE_SERIALIZER = new PropertySwitchSerializer<JoinedType, 'type'>('type')
    .register("a", JOINED_TYPE_A)
    .register("b", JOINED_TYPE_B)
    .finalize();