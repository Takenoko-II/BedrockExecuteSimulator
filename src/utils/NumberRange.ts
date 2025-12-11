export interface IRange<T> {
    getMin(): T | undefined;

    getMax(): T | undefined;

    within(value: T): boolean;

    clamp(value: T): T;
}

export class Range implements IRange<number> {
    protected readonly min: number;

    protected readonly max: number;

    protected constructor(value1: number, value2: number) {
        if (Number.isNaN(value1) || Number.isNaN(value2)) {
            throw new TypeError("NaNは範囲の端の値として使用できません");
        }

        this.min = Math.min(value1, value2);
        this.max = Math.max(value1, value2);
    }

    public getMin(): number | undefined {
        return Number.isFinite(this.min) ? this.min : undefined;
    }

    public getMax(): number | undefined {
        return Number.isFinite(this.max) ? this.max : undefined;
    }

    public within(value: number): boolean {
        return this.min <= value && value <= this.max;
    }

    public clamp(value: number): number {
        return Math.max(this.min, Math.min(this.max, value));
    }

    public static minOnly(min: number): Range {
        return new Range(min, Infinity);
    }

    public static maxOnly(max: number): Range {
        return new Range(-Infinity, max);
    }

    public static exactValue(value: number): Range {
        return new Range(value, value);
    }

    public static minMax(value1: number, value2: number): Range {
        return new Range(value1, value2);
    }

    public static parse(input: string, allowSign: boolean, intOnly: boolean): Range {
        const numberPattern = intOnly ? "\\d+" : "(?:\\d+\.?\\d*|\\.\\d+)";
        const pattern: string = (allowSign) ? "[+-]?" + numberPattern : numberPattern;

        if (new RegExp("^" + pattern + "$").test(input)) {
            return this.exactValue(Number.parseFloat(input));
        }
        else if (new RegExp("^" + pattern + "\\.\\.$").test(input)) {
            return this.minOnly(Number.parseFloat(input.slice(0, input.length - 2)));
        }
        else if (new RegExp("^\\.\\." + pattern + "$").test(input)) {
            return this.maxOnly(Number.parseFloat(input.slice(2)));
        }
        else if (new RegExp("^" + pattern + "\\.\\." + pattern + "$").test(input)) {
            const [min, max] = input.split(/\.\./g).map(s => Number.parseFloat(s)) as [number, number];
            return this.minMax(min, max);
        }
        else throw new TypeError("無効な文字列です");
    }
}

export class FiniteRange extends Range {
    protected constructor(range: Range)  {
        const min = range.getMin();
        const max = range.getMax();

        if (min === undefined || max === undefined) {
            throw new TypeError("Finiteな値ではありません");
        }

        super(min, max);
    }

    public override getMin(): number {
        return super.getMin()!;
    }

    public override getMax(): number {
        return super.getMax()!;
    }

    public static override minOnly(min: number): FiniteRange {
        return new FiniteRange(new Range(min, Number.MAX_VALUE));
    }

    public static override maxOnly(max: number): FiniteRange {
        return new FiniteRange(new Range(Number.MIN_VALUE, max));
    }

    public static override minMax(value1: number, value2: number): FiniteRange {
        return new FiniteRange(super.minMax(value1, value2));
    }

    public static override exactValue(value: number): FiniteRange {
        return new FiniteRange(super.exactValue(value));
    }

    public static override parse(input: string, allowSign: boolean, intOnly: boolean): FiniteRange {
        return new FiniteRange(super.parse(input, allowSign, intOnly));
    }
}

export class IntRange extends FiniteRange {
    protected constructor(range: FiniteRange) {
        if (!(Number.isSafeInteger(range.getMin()) && Number.isSafeInteger(range.getMax()))) {
            throw new TypeError("コンストラクタに渡された値が有効な範囲の整数ではありません");
        }

        super(range);
    }

    public override within(value: number): boolean {
        if (!Number.isSafeInteger(value)) {
            throw new TypeError("関数に渡された値が有効な範囲の整数ではありません");
        }

        return super.within(value);
    }

    public override clamp(value: number): number {
        if (value > this.max) {
            return this.max;
        }
        else if (value < this.min) {
            return this.min;
        }
        else return Math.round(value);
    }

    public toBigInt(): BigIntRange {
        return BigIntRange.minMax(BigInt(this.getMin()), BigInt(this.getMax()));
    }

    public ints(): Set<number> {
        return new Set(Array(this.max - this.min).fill(undefined).map((_, i) => i + this.min));
    }

    public static override minOnly(min: number): IntRange {
        return new IntRange(super.minMax(min, Number.MAX_SAFE_INTEGER));
    }

    public static override maxOnly(max: number): IntRange {
        return new IntRange(super.minMax(Number.MIN_SAFE_INTEGER, max));
    }

    public static override minMax(value1: number, value2: number): IntRange {
        return new IntRange(super.minMax(value1, value2));
    }

    public static override exactValue(value: number): IntRange {
        return new IntRange(super.exactValue(value));
    }

    public static override parse(input: string, allowSign: boolean): IntRange {
        return new IntRange(super.parse(input, allowSign, true));
    }

    public static readonly UINT32_MAX_RANGE: IntRange = IntRange.minMax(0, 2 ** 32 - 1);

    public static readonly INT32_MAX_RANGE: IntRange = IntRange.minMax(-(2 ** 31), 2 ** 31 - 1);
}

export class BigIntRange implements IRange<bigint> {
    protected readonly min: bigint;

    protected readonly max: bigint;

    protected constructor(value1: bigint, value2: bigint) {
        if (value1 < value2) {
            this.min = value1;
            this.max = value2;
        }
        else if (value1 > value2) {
            this.min = value2;
            this.max = value1;
        }
        else {
            this.min = value1;
            this.max = this.min;
        }
    }

    public getMin(): bigint {
        return this.min;
    }

    public getMax(): bigint {
        return this.max;
    }

    public within(value: bigint): boolean {
        return this.min <= value && value <= this.max;
    }

    public clamp(value: bigint): bigint {
        if (value < this.min) {
            return this.min;
        }
        else if (value > this.max) {
            return this.max;
        }
        else {
            return value;
        }
    }

    public toPrecisionLost(): IntRange {
        return IntRange.minMax(Number(this.getMin()), Number(this.getMax()));
    }

    public ints(): Set<bigint> {
        return new Set(Array(Number(this.max) - Number(this.min)).fill(undefined).map((_, i) => BigInt(i) + this.min));
    }

    public static exactValue(value: bigint): BigIntRange {
        return new BigIntRange(value, value);
    }

    public static minMax(value1: bigint, value2: bigint): BigIntRange {
        return new BigIntRange(value1, value2);
    }

    public static parse(input: string, allowSign: boolean): BigIntRange {
        const numberPattern = "\\d+";
        const pattern: string = (allowSign) ? "[+-]?" + numberPattern : numberPattern;

        if (new RegExp("^" + pattern + "$").test(input)) {
            return this.exactValue(BigInt(input));
        }
        else if (new RegExp("^" + pattern + "\\.\\." + pattern + "$").test(input)) {
            const [min, max] = input.split(/\.\./g).map(s => BigInt(s)) as [bigint, bigint];
            return this.minMax(min, max);
        }
        else throw new TypeError("無効な文字列です");
    }

    public static readonly UINT64_MAX_RANGE: BigIntRange = BigIntRange.minMax(0n, 2n ** 64n -1n);

    public static readonly INT64_MAX_RANGE: BigIntRange = BigIntRange.minMax(-(2n ** 63n), 2n ** 63n -1n);
}
