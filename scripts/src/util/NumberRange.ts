export class Range {
    protected readonly min: number;

    protected readonly max: number;

    protected constructor(value1: number, value2: number) {
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

    public static minMax(min: number, max: number): Range {
        if (max < min) {
            throw new TypeError("max < min");
        }

        return new Range(min, max);
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
            const [min, max] = input.split(/\.\./g).map(s => Number.parseFloat(s));
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

    public static override minMax(min: number, max: number): FiniteRange {
        return new FiniteRange(super.minMax(min, max));
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
            throw new TypeError("整数ではありません");
        }

        super(range);
    }

    public override within(value: number): boolean {
        if (!Number.isSafeInteger(value)) {
            throw new TypeError();
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

    public static override minOnly(min: number): IntRange {
        return new IntRange(super.minMax(min, Number.MAX_SAFE_INTEGER));
    }

    public static override maxOnly(max: number): IntRange {
        return new IntRange(super.minMax(Number.MIN_SAFE_INTEGER, max));
    }

    public static override minMax(min: number, max: number): IntRange {
        return new IntRange(super.minMax(min, max));
    }

    public static override exactValue(value: number): IntRange {
        return new IntRange(super.exactValue(value));
    }

    public static override parse(input: string, allowSign: boolean): IntRange {
        return super.parse(input, allowSign, true);
    }

    public static readonly UINT32_MAX_RANGE: IntRange = IntRange.minMax(0, 2 ** 32 -1);

    public static readonly INT32_MAX_RANGE: IntRange = IntRange.minMax(-(2 ** 31), 2 ** 31 -1);
}
