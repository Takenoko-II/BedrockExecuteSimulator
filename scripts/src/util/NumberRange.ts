export class NumberRange {
    private readonly min: number;

    private readonly max: number;

    private constructor(value1: number, value2: number) {
        this.min = Math.min(value1, value2);
        this.max = Math.max(value1, value2);
    }

    public within(value: number): boolean {
        return this.min <= value && value <= this.max;
    }

    public clamp(value: number): number {
        return Math.max(this.min, Math.min(this.max, value));
    }

    public getMin(): number | undefined {
        if (Number.isFinite(this.min)) {
            return this.min;
        }
        else return undefined;
    }

    public getMax(): number | undefined {
        if (Number.isFinite(this.max)) {
            return this.max;
        }
        else return undefined;
    }

    public static minOnly(min: number): NumberRange {
        return new this(min, Infinity);
    }

    public static maxOnly(max: number): NumberRange {
        return new this(-Infinity, max);
    }

    public static exactValue(value: number): NumberRange {
        return new this(value, value);
    }

    public static minMax(min: number, max: number): NumberRange {
        if (max < min) {
            throw new TypeError("max < min");
        }

        return new this(min, max);
    }

    public static parse(input: string, allowSign: boolean, isInt: boolean): NumberRange {
        const numberPattern = isInt ? "\\d+" : "(?:\\d+\.?\\d*|\\.\\d+)";
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
