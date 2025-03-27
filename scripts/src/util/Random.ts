import { NumberRange } from "@minecraft/common";

export class RandomHandler {
    private constructor() {}

    public static generate(range: NumberRange) {
        let { min, max } = range;
        let digit = 1;

        let i = 0;
        while (i < 20 && (!Number.isInteger(min) || !Number.isInteger(max))) {
            min *= 10;
            max *= 10;
            digit *= 10;
            i++;
        }

        return Math.floor(Math.random() * (max + 1 - min) + min) / digit;
    }

    public static shuffle<T>(list: T[]): T[] {
        const clone = [...list];

        if (list.length <= 1) return clone;

        for (let i = clone.length - 1; i >= 0; i--) {
            const current = clone[i];
            const random = Math.floor(Math.random() * (i + 1));

            clone[i] = clone[random];
            clone[random] = current;
        }

        return clone;
    }

    public static choice<T extends unknown>(value: T[]): T {
        if (value.length === 0) {
            throw new RangeError("要素数は1以上である必要があります");
        }

        return value[this.generate({ min: 0, max: value.length - 1 })];
    }

    public static chance(chance = 0.5): boolean {
        const number = Math.random() + chance;
        if (number >= 1) return true;
        else return false;
    }

    public static sign(): 1 | -1 {
        if (this.chance()) return 1;
        return -1;
    }

    public static uuid(): string {
        const chars = 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.split('');

        for (let i = 0; i < chars.length; i++) {
            switch (chars[i]) {
                case 'x':
                    chars[i] = this.generate({ min: 0, max: 15 }).toString(16);
                    break;
                case 'y':
                    chars[i] = this.generate({ min: 8, max: 11 }).toString(16);
                    break;
            }
        }

        return chars.join('');
    }

    public static choiceByWeight(list: number[]): number {    
        const sum = list.reduce((a, b) => a + b);
        const random = Math.floor(Math.random() * sum) + 1;
    
        let totalWeight = 0;
        for (const [index, weight] of list.entries()) {
            totalWeight += weight;
            if (totalWeight >= random) return index;
        }

        throw new TypeError("NEVER HAPPENS");
    }
}

export class Xorshift32 {
    private x: number = 123456789;
    private y: number = 362436069;
    private z: number = 521288629;
    private w: number;

    public constructor(seed: number) {
        this.w = seed;
    }

    public rand(): number;

    public rand(range: NumberRange): number;

    public rand(range?: NumberRange): number {
        let t = this.x ^ (this.x << 11);

        this.x = this.y;
        this.y = this.z;
        this.z = this.w;
        this.w = (this.w ^ (this.w >>> 19)) ^ (t ^ (t >>> 8));

        if (range !== undefined) {
            let { min, max } = range;
            let digit = 1;

            let i = 0;
            while (i < 20 && (!Number.isInteger(min) || !Number.isInteger(max))) {
                min *= 10;
                max *= 10;
                digit *= 10;
                i++;
            }
    
            return (Math.abs(this.w) % (max + 1 - min) + min) / digit;
        }

        return this.w;
    }

    public uuid(): string {
        const chars = 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.split('');

        for (let i = 0; i < chars.length; i++) {
            switch (chars[i]) {
                case 'x':
                    chars[i] = this.rand({ min: 0, max: 15 }).toString(16);
                    break;
                case 'y':
                    chars[i] = this.rand({ min: 8, max: 11 }).toString(16);
                    break;
            }
        }

        return chars.join('');
    }

    public shuffle<T>(list: T[]): T[] {
        const clone = [...list];

        if (list.length <= 1) return clone;

        for (let i = clone.length - 1; i >= 0; i--) {
            const current = clone[i];
            const random = this.rand({ min: 0, max: i });

            clone[i] = clone[random];
            clone[random] = current;
        }

        return clone;
    }
}
