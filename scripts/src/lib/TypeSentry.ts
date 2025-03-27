export abstract class Type<T> {
    public constructor() {}

    public abstract test(x: unknown): x is T;

    public cast(x: unknown): T {
        if (this.test(x)) {
            return x;
        }
        else {
            throw new TypeSentryError("値のキャストに失敗しました: 期待された型に一致しません");
        }
    }
}

abstract class PrimitiveType<T extends boolean | number | bigint | string | null | undefined> extends Type<T> {
    protected constructor() {
        super();
    }

    public override test(x: unknown): x is T {
        return sentry.boolean.test(x)
            || sentry.number.test(x)
            || sentry.bigint.test(x)
            || sentry.string.test(x)
            || sentry.null.test(x)
            || sentry.undefined.test(x);
    }
}

class BooleanType extends PrimitiveType<boolean> {
    public override test(x: unknown): x is boolean {
        return typeof x === "boolean";
    }

    public static readonly INSTANCE: BooleanType = new this();
}

class NumberType extends PrimitiveType<number> {
    public override test(x: unknown): x is number {
        return typeof x === "number";
    }

    public nonNaN(): NumberType {
        return new (class extends NumberType {
            public test(x: unknown): x is number {
                return super.test(x) && !Number.isNaN(x);
            }
        })();
    }

    public static readonly INSTANCE: NumberType = new this();
}

class IntType extends NumberType {
    public test(x: unknown): x is number {
        return super.test(x) && Number.isInteger(x);
    }

    public nonNaN(): IntType {
        return new (class extends IntType {
            public test(x: unknown): x is number {
                return super.test(x) && !Number.isNaN(x);
            }
        })();
    }

    public static readonly INSTANCE: IntType = new this();
}

class BigIntType extends PrimitiveType<bigint> {
    public override test(x: unknown): x is bigint {
        return typeof x === "bigint";
    }

    public static readonly INSTANCE: BigIntType = new this();
}

interface LengthRange {
    readonly min?: number;

    readonly max?: number;
};

class StringType extends PrimitiveType<string> {
    public override test(x: unknown): x is string {
        return typeof x === "string";
    }

    public lengthLimited(range: LengthRange): StringType {
        const min = range.min === undefined ? 0 : range.min;
        const max = range.max === undefined ? Infinity : range.max;

        if (min > max || min < 0) {
            throw TypeError("無効な範囲です");
        }

        return new (class extends StringType {
            public test(x: unknown): x is string {
                return super.test(x) && (min <= x.length && x.length <= max);
            }
        })();
    }

    public static readonly INSTANCE: StringType = new this();
}

class NullType extends PrimitiveType<null> {
    public override test(x: unknown): x is null {
        return x === null;
    }

    public static readonly INSTANCE: NullType = new this();
}

class UndefinedType extends PrimitiveType<undefined> {
    public override test(x: unknown): x is undefined {
        return x === undefined;
    }

    public static readonly INSTANCE: UndefinedType = new this();
}

class AnyType extends Type<any> {
    private constructor() {
        super();
    }

    public test(x: unknown): x is any {
        return true;
    }

    public static readonly INSTANCE: AnyType = new this();
}

class NeverType extends Type<never> {
    public test(x: unknown): x is never {
        return false;
    }

    public static readonly INSTANCE: NeverType = new this();
}

class VoidType extends Type<void> {
    public test(x: unknown): x is void {
        return x === undefined;
    }

    public static readonly INSTANCE: VoidType = new this();
}

type ExtractTypeInObjectValue<T> = {
    [K in keyof T]: T[K] extends Type<infer U> ? U : never;
};

class ObjectType<T> extends Type<T> {
    private readonly object: T;

    protected constructor(object: T) {
        super();
        this.object = object;
    }

    public test(x: unknown): x is T {
        if (typeof x !== "object") return false;
        if (x === null) return false;

        for (const [key, type] of Object.entries(this.object as Record<string | number | symbol, Type<unknown>>)) {

            const value: unknown = (x as Record<string | number | symbol, unknown>)[key];
            if (!type.test(value)) return false;
        }

        return true;
    }

    public exact(): ObjectType<T> {
        return new (class extends ObjectType<T> {
            public test(x: unknown): x is T {
                if (super.test(x)) {
                    return Object.keys(x as object).length === Object.keys(this.object as object).length;
                }
                else return false;
            }
        })(this.object);
    }

    public static newInstance<U extends Record<string | number | symbol, Type<unknown>>>(object: U): ObjectType<ExtractTypeInObjectValue<U>> {
        return new this(object as ExtractTypeInObjectValue<U>);
    }
}

class ArrayType<T> extends Type<T[]> {
    private readonly type: Type<T>;

    public constructor(type: Type<T>) {
        super();
        this.type = type;
    }

    public test(x: unknown): x is T[] {
        return Array.isArray(x)
            && x.every(e => this.type.test(e));
    }

    public lengthLimited(range: LengthRange): ArrayType<T> {
        const min = range.min === undefined ? 0 : range.min;
        const max = range.max === undefined ? Infinity : range.max;

        if (min > max || min < 0) {
            throw TypeError("無効な範囲です");
        }

        return new (class extends ArrayType<T> {
            public test(x: unknown): x is T[] {
                return super.test(x) && (min <= x.length && x.length <= max);
            }
        })(this.type);
    }
}

class FunctionType extends Type<Function> {
    private constructor() {
        super();
    }

    public test(x: unknown): x is Function {
        return typeof x === "function";
    }

    public static readonly INSTANCE: FunctionType = new this();
}

type ExtractTypes<U extends Type<unknown>[]> = U[number] extends Type<infer V> ? V : never;

class UnionType<T> extends Type<T> {
    private readonly types: Type<T>[];

    private constructor(...types: Type<unknown>[]) {
        super();
        this.types = types as Type<T>[];
    }

    public override test(x: unknown): x is T {
        return this.types.some(type => type.test(x));
    }

    public static newInstance<U extends Type<unknown>[]>(...types: U): UnionType<ExtractTypes<U>> {
        return new this(...types);
    }
}

type UnionToIntersection<U> = (U extends unknown ? (k: U) => void : never) extends ((k: infer I) => void) ? I : never;

type ExtractIntersectTypes<T extends Type<unknown>[]> = UnionToIntersection<(T extends Type<infer U>[] ? U[] : never)[number]>;

class IntersectionType<T> extends Type<T> {
    private readonly types: Type<T>[];

    private constructor(...types: Type<unknown>[]) {
        super();
        this.types = types as Type<T>[];
    }

    public override test(x: unknown): x is T {
        return this.types.some(type => type.test(x));
    }

    public static newInstance<U extends Type<unknown>[]>(...types: U): IntersectionType<ExtractIntersectTypes<U>> {
        return new this(...types);
    }
}

class OptionalType<T> extends Type<T | undefined> {
    private readonly type: Type<T>;

    private constructor(type: Type<T>) {
        super();
        this.type = type;
    }

    public override test(x: unknown): x is (T | undefined) {
        return this.type.test(x)
            || sentry.undefined.test(x);
    }

    public static newInstance<U>(type: Type<U>): OptionalType<U> {
        return new this(type);
    }
}

class MapType<K, V> extends Type<Map<K, V>> {
    private readonly keyType: Type<K>;

    private readonly valueType: Type<V>;

    public constructor(keyType: Type<K>, valueType: Type<V>) {
        super();
        this.keyType = keyType;
        this.valueType = valueType;
    }

    public test(x: unknown): x is Map<K, V> {
        if (!(x instanceof Map)) return false;
        for (const [key, value] of x.entries()) {
            if (!this.keyType.test(key)) return false;
            if (!this.valueType.test(value)) return false;
        }

        return true;
    }
}

class SetType<T> extends Type<Set<T>> {
    private readonly valueType: Type<T>;

    public constructor(valueType: Type<T>) {
        super();
        this.valueType = valueType;
    }

    public test(x: unknown): x is Set<T> {
        if (!(x instanceof Set)) return false;
        for (const value of x.values()) {
            if (!this.valueType.test(value)) return false;
        }

        return true;
    }
}

class ClassType<T> extends Type<T> {
    private constructor(private readonly constructorObject: Function) {
        super();
    }

    public test(x: unknown): x is T {
        return x instanceof this.constructorObject;
    }

    public static newInstance<U extends Function>(constructor: U): ClassType<U["prototype"]> {
        return new this(constructor);
    }
}

class TypeSentryError extends TypeError {
    public constructor(message: string) {
        super(message);
    }
}

const INTERNAL_CONSTRUCTOR_KEY = Symbol();

export class TypeSentry {
    protected constructor(key: typeof INTERNAL_CONSTRUCTOR_KEY) {}

    public readonly boolean: BooleanType = BooleanType.INSTANCE;

    public readonly number: NumberType = NumberType.INSTANCE;

    public readonly bigint: BigIntType = BigIntType.INSTANCE;

    public readonly string: StringType = StringType.INSTANCE;

    public readonly null: NullType = NullType.INSTANCE;

    public readonly undefined: UndefinedType = UndefinedType.INSTANCE;

    public readonly any: AnyType = AnyType.INSTANCE;

    public readonly never: NeverType = NeverType.INSTANCE;

    public readonly void: VoidType = VoidType.INSTANCE;

    public readonly function: FunctionType = FunctionType.INSTANCE;

    public readonly int: IntType = IntType.INSTANCE;

    public objectOf<U extends Record<string | number | symbol, Type<unknown>>>(object: U): ObjectType<ExtractTypeInObjectValue<U>> {
        return ObjectType.newInstance(object);
    }

    public arrayOf<U>(type: Type<U>): ArrayType<U> {
        return new ArrayType(type);
    }

    public mapOf<K, V>(keyType: Type<K>, valueType: Type<V>): MapType<K, V> {
        return new MapType(keyType, valueType);
    }

    public setOf<T>(valueType: Type<T>): SetType<T> {
        return new SetType(valueType);
    }

    public unionOf<U extends Type<unknown>[]>(...types: U): UnionType<ExtractTypes<U>> {
        return UnionType.newInstance(...types);
    }

    public intersectionOf<U extends Type<unknown>[]>(...types: U): IntersectionType<ExtractIntersectTypes<U>> {
        return IntersectionType.newInstance(...types);
    }

    public optionalOf<U>(type: Type<U>): OptionalType<U> {
        return OptionalType.newInstance(type);
    }

    public classOf<U extends Function>(constructor: U): ClassType<U["prototype"]> {
        return ClassType.newInstance(constructor);
    }
}

export const sentry: TypeSentry = (class extends TypeSentry {
    public static readonly INSTANCE: TypeSentry = new this(INTERNAL_CONSTRUCTOR_KEY);
}).INSTANCE;
