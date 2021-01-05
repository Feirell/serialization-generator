import {ValueSerializer} from "./value-serializer";

type Serializer<Components> = { [i in keyof Components]: ValueSerializer<Components[i]> }

/**
 * The chain serializer allows you to chain other serializer to combine them to one serializer which can be easier to use.
 *
 * This serializer is quite simple and mostly delegates the calls to the associated serializers.
 */
export class ChainSerializer<Components extends any[]> extends ValueSerializer<Components> {
    private serializer: Serializer<Components>;

    constructor(...k: Serializer<Components>) {
        super();
        this.serializer = k;
    }

    serialize(dv: DataView, offset: number, val: Components): { offset: number } {
        for (let i = 0; i < this.serializer.length; i++) {
            const res = this.serializer[i].serialize(dv, offset, val[i]);
            offset = res.offset;
        }

        return {offset};
    }

    deserialize(dv: DataView, offset: number): { offset: number; val: Components } {
        const resultComponent = new Array(this.serializer.length) as Components;

        for (let i = 0; i < this.serializer.length; i++) {
            const res = this.serializer[i].deserialize(dv, offset);
            offset = res.offset;
            resultComponent[i] = res.val;
        }

        return {offset, val: resultComponent};
    }

    getSizeForValue(val: Components): number {
        let sizeSum = 0;

        for (let i = 0; i < this.serializer.length; i++)
            sizeSum += this.serializer[i].getSizeForValue(val[i]);

        return sizeSum;
    }

    getStaticSize(): number | undefined {
        let sizeSum = 0;

        for (let i = 0; i < this.serializer.length; i++) {
            const size = this.serializer[i].getStaticSize();

            if (size == undefined)
                return undefined;

            sizeSum += size;
        }

        return sizeSum;
    }

    typeCheck(val: Components, name: string = ''): void {
        if (val.length != this.serializer.length)
            throw new Error('the length of the provided components and the provided serializer differs');

        for (let i = 0; i < val.length; i++)
            this.serializer[i].typeCheck(val[i]);
    }
}