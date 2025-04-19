import { FiniteRange, IntRange } from "./NumberRange.js";

export class Xorshift32 {
    private x: number = 123456789;
    private y: number = 362436069;
    private z: number = 521288629;
    private w: number;

    public constructor(seed: number) {
        if (!Number.isInteger(seed)) {
            throw new TypeError();
        }

        this.w = seed;
    }

    private rand(): number {
        let t = this.x ^ (this.x << 11);

        this.x = this.y;
        this.y = this.z;
        this.z = this.w;
        this.w = (this.w ^ (this.w >>> 19)) ^ (t ^ (t >>> 8));

        return this.w - IntRange.INT32_MAX_RANGE.getMin();
    }

    public int(range: IntRange): number {
        const min = range.getMin();
        const max = range.getMax();
        return this.rand() % (max - min) + min;
    }

    public decimal(range: FiniteRange): number {
        const min = range.getMin();
        const max = range.getMax();
        return (this.rand() / IntRange.UINT32_MAX_RANGE.getMax()) * (max - min) + min;
    }

    public uuid(): string {
        const chars = 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.split('');

        for (let i = 0; i < chars.length; i++) {
            switch (chars[i]) {
                case 'x':
                    chars[i] = this.int(IntRange.minMax(0, 15)).toString(16);
                    break;
                case 'y':
                    chars[i] = this.decimal(IntRange.minMax(8, 11)).toString(16);
                    break;
            }
        }

        return chars.join('');
    }

    public chance(chance: number): boolean {
        return this.decimal(FiniteRange.minMax(0, 1)) + chance >= 1;
    }

    public sign(): number {
        return this.chance(0.5) ? 1 : -1;
    }

    public choice<T>(list: T[]): T {
        return list[this.int(IntRange.minMax(0, list.length - 1))];
    }

    public choiceIndexbyWeight(weights: number[]): number {
        const sum = weights.reduce((a, b) => a + b);
        const random = this.int(IntRange.minMax(1, sum));
    
        let totalWeight = 0;
        for (const [index, weight] of weights.entries()) {
            totalWeight += weight;
            if (totalWeight >= random) return index;
        }

        throw new TypeError("NEVER HAPPENS");
    }

    public shuffle<T>(list: T[]): T[] {
        const clone = [...list];

        if (list.length <= 1) return clone;

        for (let i = clone.length - 1; i >= 0; i--) {
            const current = clone[i];
            const random = this.int(IntRange.minMax(0, i));

            clone[i] = clone[random];
            clone[random] = current;
        }

        return clone;
    }

    public static random(): Xorshift32 {
        return new this(Math.floor(Math.random() * (2 ** 32 - 1)));
    }
}
