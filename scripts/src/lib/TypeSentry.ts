/**
 * `T`型の型構造を表現する抽象クラス
 */
export abstract class TypeModel<T> {
    public constructor() {}

    /**
     * オブジェクトが`T`型であるかを判定します。
     * <br>必要に応じて追加のチェックも行う場合があります。
     * @param x 検査するオブジェクト
     */
    public abstract test(x: unknown): x is T;

    /**
     * オブジェクトが`T`型であればそのまま返し、そうでなければ例外を投げます。
     * <br>必要に応じて追加のチェックも行う場合があります。
     * @param x 検査するオブジェクト
     * @throws `TypeSentryError`
     */
    public cast(x: unknown): T {
        if (this.test(x)) {
            return x;
        }
        else {
            throw new TypeSentryError(`値のキャストに失敗しました: '${x}'の型は期待された型(${this.toString()})に一致しません`);
        }
    }

    /**
     * このインスタンスの文字列表現を返します。
     */
    public abstract toString(): string;
}

abstract class PrimitiveModel<T extends boolean | number | bigint | string | symbol | null | undefined> extends TypeModel<T> {
    protected constructor() {
        super();
    }
}

class BooleanModel extends PrimitiveModel<boolean> {
    public override test(x: unknown): x is boolean {
        return typeof x === "boolean";
    }

    public override toString(): string {
        return "boolean";
    }

    public static readonly INSTANCE: BooleanModel = new this();
}

class NumberModel extends PrimitiveModel<number> {
    public override test(x: unknown): x is number {
        return typeof x === "number";
    }

    /**
     * 値が`NaN`でないことを実行時の検査において追加で要求するインスタンスを新しく生成します。
     * @returns ランタイム条件付きインスタンス
     */
    public nonNaN(): NumberModel {
        const that = this;

        return new (class extends NumberModel {
            public override test(x: unknown): x is number {
                return that.test(x) && !Number.isNaN(x);
            }
        })();
    }

    /**
     * 値が整数であることを実行時の検査において追加で要求するインスタンスを新しく生成します。
     * @returns ランタイム条件付きインスタンス
     */
    public int(): NumberModel {
        const that = this;

        return new (class extends NumberModel {
            public override test(x: unknown): x is number {
                return that.test(x) && Number.isInteger(x);
            }
        })();
    }

    public override toString(): string {
        return "number";
    }

    public static readonly INSTANCE: NumberModel = new this();
}

/**
 * @deprecated
 */
class IntModel extends NumberModel {
    public override test(x: unknown): x is number {
        return super.test(x) && Number.isInteger(x);
    }

    /**
     * 値が`NaN`でないことを実行時の検査において追加で要求するインスタンスを新しく生成します。
     * @returns ランタイム条件付きインスタンス
     */
    public override nonNaN(): IntModel {
        const that = this;

        return new (class extends IntModel {
            public override test(x: unknown): x is number {
                return that.test(x) && !Number.isNaN(x);
            }
        })();
    }

    public override toString(): string {
        return "number(int)"
    }

    public static override readonly INSTANCE: IntModel = new this();
}

class BigIntModel extends PrimitiveModel<bigint> {
    public override test(x: unknown): x is bigint {
        return typeof x === "bigint";
    }

    public override toString(): string {
        return "bigint"
    }

    public static readonly INSTANCE: BigIntModel = new this();
}

interface LengthRange {
    readonly min?: number;

    readonly max?: number;
}

class StringModel extends PrimitiveModel<string> {
    public override test(x: unknown): x is string {
        return typeof x === "string";
    }

    /**
     * 文字列長が指定の範囲内であることを実行時の検査において追加で要求するインスタンスを新しく生成します。
     * @returns ランタイム条件付きインスタンス
     * @throws `TypeSentryError`
     */
    public withLength(range: LengthRange): StringModel {
        const min = range.min === undefined ? 0 : range.min;
        const max = range.max === undefined ? Infinity : range.max;

        if (min > max || min < 0) {
            throw new TypeSentryError(`無効な範囲です: ${min}～${max}`);
        }

        const that = this;

        return new (class extends StringModel {
            public override test(x: unknown): x is string {
                return that.test(x) && (min <= x.length && x.length <= max);
            }
        })();
    }

    /**
     * 文字列の形式が指定の正規表現を含むものであることを実行時の検査において追加で要求するインスタンスを新しく生成します。
     * @returns ランタイム条件付きインスタンス
     */
    public withPattern(pattern: RegExp): StringModel {
        const that = this;

        return new (class extends StringModel {
            public override test(x: unknown): x is string {
                return that.test(x) && new RegExp(pattern).test(x);
            }
        })();
    }

    public override toString(): string {
        return "string";
    }

    public static readonly INSTANCE: StringModel = new this();
}

class NullModel extends PrimitiveModel<null> {
    public override test(x: unknown): x is null {
        return x === null;
    }

    public override toString(): string {
        return "null";
    }

    public static readonly INSTANCE: NullModel = new this();
}

class UndefinedModel extends PrimitiveModel<undefined> {
    public override test(x: unknown): x is undefined {
        return x === undefined;
    }

    public override toString(): string {
        return "undefined";
    }

    public static readonly INSTANCE: UndefinedModel = new this();
}

class AnyModel extends TypeModel<any> {
    private constructor() {
        super();
    }

    public test(_: unknown): _ is any {
        return true;
    }

    public override toString(): string {
        return "any";
    }

    public static readonly INSTANCE: AnyModel = new this();
}

class NeverModel extends TypeModel<never> {
    public test(_: unknown): _ is never {
        return false;
    }

    public override toString(): string {
        return "never";
    }

    public static readonly INSTANCE: NeverModel = new this();
}

class UnknownModel extends TypeModel<unknown> {
    public override test(_: unknown): _ is unknown {
        return true;
    }

    public override toString(): string {
        return "unknown";
    }

    public static readonly INSTANCE: UnknownModel = new this();
}

class VoidModel extends TypeModel<void> {
    public test(x: unknown): x is void {
        return x === undefined;
    }

    public override toString(): string {
        return "void";
    }

    public static readonly INSTANCE: VoidModel = new this();
}

type ExtractTypeInObjectValue<T> = {
    [K in keyof T]: T[K] extends TypeModel<infer U> ? U : never;
};

class ObjectModel<T> extends TypeModel<T> {
    private readonly object: T;

    protected constructor(object: T) {
        super();
        this.object = object;
    }

    public test(x: unknown): x is T {
        if (typeof x !== "object") return false;
        if (x === null) return false;

        for (const [key, type] of Object.entries(this.object as Record<string | number | symbol, TypeModel<unknown>>)) {
            const value: unknown = (x as Record<string | number | symbol, unknown>)[key];
            if (!type.test(value)) return false;
        }

        return true;
    }

    /**
     * オブジェクトが過不足のない数のキーを持つ連想配列であることを実行時の検査において追加で要求するインスタンスを新しく生成します。
     * @returns ランタイム条件付きインスタンス
     */
    public exact(): ObjectModel<T> {
        const that = this;

        return new (class extends ObjectModel<T> {
            public override test(x: unknown): x is T {
                if (that.test(x)) {
                    return Object.keys(x as object).length === Object.keys(this.object as object).length;
                }
                else return false;
            }
        })(this.object);
    }

    public override toString(): string {
        let string = "{";

        let first = true;
        for (const [key, model] of Object.entries(this.object as Record<string | number | symbol, TypeModel<unknown>>)) {
            if (!first) {
                string += "; ";
            }

            let k: string = key;

            if (key.includes(":")) {
                k = "\"" + k + "\"";
            }
            else if (key.includes("\"")) {
                k = k.replace(/"/g, "\\\"");
            }

            string += k;
            string += ": ";
            string += model.toString();

            first = false;
        }

        string += "}";

        return string;
    }

    public static newInstance<U extends Record<string | number | symbol, TypeModel<unknown>>>(object: U): ObjectModel<ExtractTypeInObjectValue<U>> {
        return new this(object as ExtractTypeInObjectValue<U>);
    }
}

class ArrayModel<T> extends TypeModel<T[]> {
    private readonly type: TypeModel<T>;

    public constructor(type: TypeModel<T>) {
        super();
        this.type = type;
    }

    public test(x: unknown): x is T[] {
        return Array.isArray(x)
            && x.every(e => this.type.test(e));
    }

    /**
     * 配列長が指定の範囲内であることを実行時の検査において追加で要求するインスタンスを新しく生成します。
     * @returns ランタイム条件付きインスタンス
     * @throws `TypeSentryError`
     */
    public withLength(range: LengthRange): ArrayModel<T> {
        const min = range.min === undefined ? 0 : range.min;
        const max = range.max === undefined ? Infinity : range.max;

        if (min > max || min < 0) {
            throw new TypeSentryError(`無効な範囲です: ${min}～${max}`);
        }

        const that = this;

        return new (class extends ArrayModel<T> {
            public override test(x: unknown): x is T[] {
                return that.test(x) && (min <= x.length && x.length <= max);
            }
        })(this.type);
    }

    /**
     * 配列の要素の型を表現する`TypeModel`を返します。
     * @returns (配列要素)型の`TypeModel`インスタンス
     */
    public getModelOfElement(): TypeModel<T> {
        return this.type;
    }

    public override toString(): string {
        return this.type.toString() + "[]";
    }
}

class FunctionModel extends TypeModel<Function> {
    private constructor() {
        super();
    }

    public test(x: unknown): x is Function {
        return typeof x === "function";
    }

    public override toString(): string {
        return "function";
    }

    public static readonly INSTANCE: FunctionModel = new this();
}

class SymbolModel extends TypeModel<symbol> {
    private constructor() {
        super();
    }

    public test(x: unknown): x is symbol {
        return typeof x === "symbol";
    }

    public override toString(): string {
        return "symbol";
    }

    public static readonly INSTANCE: SymbolModel = new this();
}

type ExtractTypes<U extends TypeModel<unknown>[]> = U[number] extends TypeModel<infer V> ? V : never;

class UnionModel<T> extends TypeModel<T> {
    private readonly types: TypeModel<T>[];

    private constructor(...types: TypeModel<unknown>[]) {
        super();
        this.types = types as TypeModel<T>[];
    }

    public override test(x: unknown): x is T {
        return this.types.some(type => type.test(x));
    }

    public override toString(): string {
        return this.types.map(type => type.toString()).join(" | ");
    }

    public static newInstance<U extends TypeModel<unknown>[]>(...types: U): UnionModel<ExtractTypes<U>> {
        return new this(...types);
    }
}

type UnionToIntersection<U> = (U extends unknown ? (k: U) => void : never) extends ((k: infer I) => void) ? I : never;

type ExtractIntersectTypes<T extends TypeModel<unknown>[]> = UnionToIntersection<(T extends TypeModel<infer U>[] ? U[] : never)[number]>;

class IntersectionModel<T> extends TypeModel<T> {
    private readonly types: TypeModel<T>[];

    private constructor(...types: TypeModel<unknown>[]) {
        super();
        this.types = types as TypeModel<T>[];
    }

    public override test(x: unknown): x is T {
        return this.types.some(type => type.test(x));
    }

    public override toString(): string {
        return this.types.map(type => type.toString()).join(" & ");
    }

    public static newInstance<U extends TypeModel<unknown>[]>(...types: U): IntersectionModel<ExtractIntersectTypes<U>> {
        return new this(...types);
    }
}

class OptionalModel<T> extends TypeModel<T | undefined> {
    private readonly type: TypeModel<T>;

    private constructor(type: TypeModel<T>) {
        super();
        this.type = type;
    }

    public override test(x: unknown): x is (T | undefined) {
        return this.type.test(x)
            || sentry.undefined.test(x);
    }

    /**
     * `optional`を解除し、もとの型の`TypeModel`を返します。
     * @returns `optional`を解除した型を表現する`TypeModel`インスタンス
     */
    public unwrap(): TypeModel<T> {
        return this.type;
    }

    public override toString(): string {
        return this.type.toString() + " | undefined";
    }

    public static newInstance<U>(type: TypeModel<U>): OptionalModel<U> {
        return new this(type);
    }
}

class NullableModel<T> extends TypeModel<T | null> {
    private readonly type: TypeModel<T>;

    private constructor(type: TypeModel<T>) {
        super();
        this.type = type;
    }

    public override test(x: unknown): x is (T | null) {
        return this.type.test(x)
            || sentry.null.test(x);
    }

    /**
     * `nullable`を解除し、もとの型の`TypeModel`を返します。
     * @returns `nullable`を解除した型を表現する`TypeModel`インスタンス
     */
    public unwrap(): TypeModel<T> {
        return this.type;
    }

    public override toString(): string {
        return this.type.toString() + " | null";
    }

    public static newInstance<U>(type: TypeModel<U>): NullableModel<U> {
        return new this(type);
    }
}

class MapModel<K, V> extends TypeModel<Map<K, V>> {
    private readonly keyType: TypeModel<K>;

    private readonly valueType: TypeModel<V>;

    public constructor(keyType: TypeModel<K>, valueType: TypeModel<V>) {
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

    /**
     * `Map`のキーの型を表現する`TypeModel`を返します。
     * @returns (キー)型の`TypeModel`インスタンス
     */
    public getModelOfKey(): TypeModel<K> {
        return this.keyType;
    }

    /**
     * `Map`のキーの型を表現する`TypeModel`を返します。
     * @returns (値)型の`TypeModel`インスタンス
     */
    public getModelOfValue(): TypeModel<V> {
        return this.valueType;
    }

    public override toString(): string {
        return "Map<" + this.keyType.toString() + ", " + this.valueType.toString() + ">";
    }
}

class SetModel<T> extends TypeModel<Set<T>> {
    private readonly valueType: TypeModel<T>;

    public constructor(valueType: TypeModel<T>) {
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

    /**
     * `Set`の要素の型を表現する`TypeModel`を返します。
     * @returns (要素)型の`TypeModel`インスタンス
     */
    public getModelOfElement(): TypeModel<T> {
        return this.valueType;
    }

    public override toString(): string {
        return "Set<" + this.valueType.toString() + ">"
    }
}

class ClassModel<T> extends TypeModel<T> {
    private constructor(private readonly constructorObject: Function) {
        super();
    }

    public test(x: unknown): x is T {
        return x instanceof this.constructorObject;
    }

    public static newInstance<U extends Function>(constructor: U): ClassModel<U["prototype"]> {
        return new this(constructor);
    }

    public override toString(): string {
        return this.constructorObject.name;
    }
}

type TypeModelArrayToTuple<T extends TypeModel<unknown>[]> = { [K in keyof T]: T[K] extends TypeModel<infer U> ? U : never }

class TupleModel<T extends TypeModel<unknown>[]> extends TypeModel<TypeModelArrayToTuple<T>> {
    private readonly tuple: T;

    private constructor(tuple: T) {
        super();
        this.tuple = tuple;
    }

    public override test(x: unknown): x is TypeModelArrayToTuple<T> {
        if (!Array.isArray(x)) return false;
        else if (x.length !== this.tuple.length) return false;
        
        for (const [index, model] of this.tuple.entries()) {
            if (!model.test(x[index])) return false;
        }

        return true;
    }

    public override toString(): string {
        let string = "[";

        let first = true;
        for (const model of this.tuple.values()) {
            if (!first) {
                string += ", ";
            }

            string += model.toString();

            first = false;
        }

        string += "]";

        return string;
    }

    public static newInstance<T extends TypeModel<unknown>[]>(...elements: T): TupleModel<T> {
        return new this(elements);
    }
}

class LiteralModel<T extends boolean | number | bigint | string | symbol> extends PrimitiveModel<T> {
    private readonly value: T;

    public constructor(value: T) {
        super();
        this.value = value;
    }

    public override test(x: unknown): x is T {
        return x === this.value;
    }

    /**
     * リテラルオブジェクトをそのまま返します。
     * @returns リテラル値
     */
    public getLiteralValue(): T {
        return this.value;
    }

    public override toString(): string {
        switch (typeof this.value) {
            case "boolean": return this.value.toString();
            case "number": return this.value.toString();
            case "bigint": return this.value.toString() + "n";
            case "string": return "\"" + this.value.replace(/"/g, "\\\"") + "\"";
            case "symbol": return "symbol(" + (this.value.description === undefined ? "" : "\"" + this.value.description + "\"") + ")";
        }
    }

    public static newInstance<U extends boolean | number | bigint | string | symbol>(string: U): LiteralModel<U> {
        return new this(string);
    }
}

/**
 * `TypeSentry`が投げるエラー
 */
class TypeSentryError extends TypeError {
    public constructor(message: string) {
        super(message);
    }
}

const SYMBOL_FOR_PRIVATE_CONSTRUCTOR = Symbol();

/**
 * `TypeModel`のインスタンスを提供するクラス
 */
export class TypeSentry {
    /**
     * `TypeSentry`のコンストラクタ関数
     * @param _ 外部からのインスタンス化を封じるための`symbol`オブジェクト
     */
    protected constructor(_: typeof SYMBOL_FOR_PRIVATE_CONSTRUCTOR) {}

    /**
     * 第一級オブジェクト `boolean`
     */
    public readonly boolean: BooleanModel = BooleanModel.INSTANCE;

    /**
     * 第一級オブジェクト `number`
     */
    public readonly number: NumberModel = NumberModel.INSTANCE;

    /**
     * 第一級オブジェクト `bigint`
     */
    public readonly bigint: BigIntModel = BigIntModel.INSTANCE;

    /**
     * 第一級オブジェクト `string`
     */
    public readonly string: StringModel = StringModel.INSTANCE;

    /**
     * 第一級オブジェクト `function`
     */
    public readonly function: FunctionModel = FunctionModel.INSTANCE;

    /**
     * 第一級オブジェクト `null`
     */
    public readonly null: NullModel = NullModel.INSTANCE;

    /**
     * 第一級オブジェクト `undefined`
     */
    public readonly undefined: UndefinedModel = UndefinedModel.INSTANCE;

    /**
     * `undefined`のエイリアス `void`
     */
    public readonly void: VoidModel = VoidModel.INSTANCE;

    /**
     * `symbol`
     */
    public readonly symbol: SymbolModel = SymbolModel.INSTANCE;

    /**
     * 全てのスーパークラス `any`
     */
    public readonly any: AnyModel = AnyModel.INSTANCE;

    /**
     * 全てのサブクラス `never`
     */
    public readonly never: NeverModel = NeverModel.INSTANCE;

    /**
     * `unknown`
     */
    public readonly unknown: UnknownModel = UnknownModel.INSTANCE;

    /**
     * `number`のランタイムチェック付きインスタンス
     * @deprecated `NumberModel`のインスタンスメソッドに置き換えられました
     * @see NumberModel#int()
     */
    public readonly int: IntModel = IntModel.INSTANCE;

    /**
     * 第一級オブジェクト `object`
     * @param object `{キー1: TypeModel, キー2: TypeModel, ...}`の形式で与えられる連想配列
     * @returns 連想配列型を表現する`TypeModel`
     */
    public objectOf<U extends Record<string | number | symbol, TypeModel<unknown>>>(object: U): ObjectModel<ExtractTypeInObjectValue<U>> {
        return ObjectModel.newInstance(object);
    }

    /**
     * 第一級オブジェクト `array`
     * @param type 配列の要素の型を表現する`TypeModel`
     * @returns 配列型を表現する`TypeModel`
     */
    public arrayOf<U>(type: TypeModel<U>): ArrayModel<U> {
        return new ArrayModel(type);
    }

    /**
     * 固定長配列 `tuple`
     * @param elements `tuple`の各要素の型を表現する`TypeModel`
     * @returns `tuple`型を表現する`TypeModel`
     */
    public tupleOf<U extends TypeModel<unknown>[]>(...elements: U): TupleModel<U> {
        return TupleModel.newInstance(...elements);
    }

    /**
     * クラス `Map`
     * @param keyType `Map`のキーの型を表現する`TypeModel`
     * @param valueType `Map`の値の型を表現する`TypeModel`
     * @returns `Map`型を表現する`TypeModel`
     */
    public mapOf<K, V>(keyType: TypeModel<K>, valueType: TypeModel<V>): MapModel<K, V> {
        return new MapModel(keyType, valueType);
    }

    /**
     * クラス `Set`
     * @param valueType `Set`の値の型を表現する`TypeModel`
     * @returns `Set`型を表現する`TypeModel`
     */
    public setOf<T>(valueType: TypeModel<T>): SetModel<T> {
        return new SetModel(valueType);
    }

    /**
     * 合併型
     * @param types 合併型の各要素の型を表現する`TypeModel`
     * @returns 合併型を表現する`TypeModel`
     */
    public unionOf<U extends TypeModel<unknown>[]>(...types: U): UnionModel<ExtractTypes<U>> {
        return UnionModel.newInstance(...types);
    }

    /**
     * 交差型
     * @param types 交差型の各要素の型を表現する`TypeModel`
     * @returns 交差型を表現する`TypeModel`
     */
    public intersectionOf<U extends TypeModel<unknown>[]>(...types: U): IntersectionModel<ExtractIntersectTypes<U>> {
        return IntersectionModel.newInstance(...types);
    }

    /**
     * `undefined`との合併型のエイリアス `optional`型 
     * @param types `optional`型でラップする型の`TypeModel`
     * @returns `optional`型を表現する`TypeModel`
     */
    public optionalOf<U>(type: TypeModel<U>): OptionalModel<U> {
        return OptionalModel.newInstance(type);
    }

    /**
     * `null`との合併型のエイリアス `nullable`型 
     * @param types `nulleable`型でラップする型の`TypeModel`
     * @returns `nullable`型を表現する`TypeModel`
     */
    public nullableOf<U>(type: TypeModel<U>): NullableModel<U> {
        return NullableModel.newInstance(type);
    }

    /**
     * 任意のクラスを表現する型
     * @param constructor クラス(コンストラクタ)オブジェクト
     * @returns 任意のクラス型の`TypeModel`
     */
    public classOf<U extends Function>(constructor: U): ClassModel<U["prototype"]> {
        return ClassModel.newInstance(constructor);
    }

    /**
     * 任意のリテラルを表現する型
     * @param literal リテラル値
     * @returns 任意のリテラル型の`TypeModel`
     */
    public literalOf<U extends boolean | number | bigint | string | symbol>(literal: U) {
        return LiteralModel.newInstance(literal);
    }
}

/**
 * `TypeSentry`のインスタンス
 */
export const sentry: TypeSentry = (class extends TypeSentry {
    public static readonly INSTANCE: TypeSentry = new this(SYMBOL_FOR_PRIVATE_CONSTRUCTOR);
}).INSTANCE;
