import { IntRange } from "./NumberRange";

interface SerializerProperties {
    indentationSpaceCount: number;

    linebreakable: boolean;

    interpretCircularReference: boolean;

    readonly hiddenPrototypes: Set<object>;

    readonly alwaysHiddenPrototypes: ReadonlySet<object>;
}

export class SerializationError extends Error {}

export class Serializer {
    private readonly properties: SerializerProperties = {
        indentationSpaceCount: 4,
        linebreakable: true,
        interpretCircularReference: true,
        hiddenPrototypes: new Set(),
        alwaysHiddenPrototypes: new Set([
            Object.prototype,
            Boolean.prototype,
            Number.prototype,
            BigInt.prototype,
            String.prototype,
            Symbol.prototype,
            Function.prototype,
            Array.prototype
        ])
    };

    public get indentationSpaceCount(): number {
        return this.properties.indentationSpaceCount
    }

    public set indentationSpaceCount(value: number) {
        if (!IntRange.minMax(0, 20).within(value)) {
            throw new TypeError("Indentation space count must not be NaN, must be integer, and must be within range(0, 20), but " + value);
        }

        this.properties.indentationSpaceCount = value;
    }

    public get linebreakable(): boolean {
        return this.properties.linebreakable;
    }

    public set linebreakable(value: boolean) {
        this.properties.linebreakable = value;
    }

    public get interpretCircularReference(): boolean {
        return this.properties.interpretCircularReference;
    }

    public set interpretCircularReference(value: boolean) {
        this.properties.interpretCircularReference = value;
    }

    public hidePrototypeOf(clazz: Function) {
        if (clazz.prototype === undefined) {
            throw new TypeError("Passed class object does not have prototype");
        }
        else if (this.properties.alwaysHiddenPrototypes.has(clazz.prototype)) {
            throw new TypeError("Passed class object is always hidden");
        }

        if (!this.properties.hiddenPrototypes.has(clazz.prototype)) {
            this.properties.hiddenPrototypes.add(clazz.prototype);
        }
    }

    public unhidePrototypeOf(clazz: Function) {
        if (clazz.prototype === undefined) {
            throw new TypeError("It does not have prototype");
        }
        else if (this.properties.alwaysHiddenPrototypes.has(clazz.prototype)) {
            throw new TypeError("Passed class object is always hidden");
        }

        if (this.properties.hiddenPrototypes.has(clazz.prototype)) {
            this.properties.hiddenPrototypes.delete(clazz);
        }
    }

    public isHidden(clazz: Function): boolean {
        return this.properties.hiddenPrototypes.has(clazz) || this.properties.alwaysHiddenPrototypes.has(clazz);
    }

    public serialize(value: unknown): string {
        return this.unknown(new Set(), value, 1);
    }

    private newReference(ref: Set<unknown>, obj: unknown): Set<unknown> {
        const cSet: Set<unknown> = new Set(ref);
        cSet.add(obj);
        return cSet;
    }

    private getCircularReference(): string {
        if (this.properties.interpretCircularReference) {
            return Serializer.CIRCULAR_REFERENCE_OBJECT;
        }
        else {
            throw new SerializationError("Circular prototype reference detection");
        }
    }

    protected getPropertiesOf(object: object): string[] {
        return Object.getOwnPropertyNames(object);
    }

    protected getPrototypeOf(object: object): object | null {
        const prototype: object = Object.getPrototypeOf(object);

        if (object === prototype) {
            this.getCircularReference();
        }

        if (this.properties.hiddenPrototypes.has(prototype)) {
            return null;
        }
        else {
            return prototype;
        }
    }

    protected boolean(boolean: boolean): string {
        return String(boolean);
    }

    protected number(number: number): string {
        return String(number);
    }

    protected bigint(bigint: bigint): string {
        return String(bigint);
    }

    protected string(string: string): string {
        return Serializer.QUOTE + string + Serializer.QUOTE;
    }

    protected symbol(symbol: symbol): string {
        return (symbol.description === undefined || symbol.description.length === 0)
            ? Serializer.SYMBOL
                + Serializer.ARGUMENTS_BRACES[0]
                + Serializer.ARGUMENTS_BRACES[1]
            : Serializer.SYMBOL
                + Serializer.ARGUMENTS_BRACES[0]
                + this.string(symbol.description)
                + Serializer.ARGUMENTS_BRACES[1];
    }

    protected null(): string {
        return Serializer.NULL;
    }

    protected undefined(): string {
        return Serializer.UNDEFINED;
    }

    protected indentation(count: number): string {
        return Serializer.WHITESPACE.repeat(this.properties.indentationSpaceCount).repeat(count);
    }

    protected linebreak(): string {
        return this.properties.linebreakable ? Serializer.LINEBREAK : Serializer.EMPTY;
    }

    protected prototype(ref: Set<unknown>, object: object, indentation: number): string {
        const prototype: object | null = this.getPrototypeOf(object);

        let string = Serializer.EMPTY;

        if (prototype === null) {
            return string;
        }

        let forceAsObject: boolean = false;

        if (Array.isArray(object)) {
            forceAsObject = true;

            if (object.length > 0) {
                string += Serializer.COMMA;
            }
        }
        else if (this.getPropertiesOf(object).length > 0) {
            string += Serializer.COMMA;
        }

        string += this.linebreak()
            + this.indentation(indentation)
            + Serializer.PROTOTYPE
            + Serializer.COLON
            + Serializer.WHITESPACE
            + this.object(ref, prototype, indentation + 1, forceAsObject);

        return string;
    }

    protected function(__function__: Function): string {
        const code: string = __function__.toString();

        if (code.startsWith(Serializer.FUNCTION + Serializer.WHITESPACE)) {
            return Serializer.FUNCTION
                + Serializer.WHITESPACE
                + __function__.name
                + Serializer.ARGUMENTS_BRACES[0]
                + Serializer.ARGUMENTS_BRACES[1]
                + Serializer.WHITESPACE
                + Serializer.CODE;
        }
        else if (code.startsWith(Serializer.ASYNC + Serializer.WHITESPACE)) {
            return Serializer.ASYNC
                + Serializer.WHITESPACE
                + Serializer.FUNCTION
                + Serializer.WHITESPACE
                + __function__.name
                + Serializer.ARGUMENTS_BRACES[0]
                + Serializer.ARGUMENTS_BRACES[1]
                + Serializer.WHITESPACE
                + Serializer.CODE;
        }
        else if (code.startsWith(Serializer.CLASS + Serializer.WHITESPACE)) {
            return Serializer.CLASS
                + Serializer.WHITESPACE
                + __function__.name
                + Serializer.WHITESPACE
                + Serializer.CODE;
        }
        else {
            return __function__.name
                + Serializer.ARGUMENTS_BRACES[0]
                + Serializer.ARGUMENTS_BRACES[1]
                + Serializer.WHITESPACE
                + Serializer.CODE;
        }
    }

    protected key(key: string): string {
        if (Serializer.UNQUOTED_KEY_PATTERN().test(key)) {
            return key;
        }
        else {
            return this.string(key);
        }
    }

    protected object(ref: Set<unknown>, object: object, indentation: number, forceAsObject: boolean = false): string {
        if (Array.isArray(object) && !forceAsObject) {
            return this.array(ref, object, indentation);
        }
        else if (object === null) {
            return this.null();
        }

        let str: string = Serializer.OBJECT_BRACES[0];

        const keys: string[] = this.getPropertiesOf(object);

        const toAdd: Set<unknown> = new Set();

        for (let i = 0; i < keys.length; i++) {
            const key: string = keys[i]!;

            const v = Reflect.get(object, key);

            let value: string;

            if (ref.has(v)) {
                value = this.getCircularReference();
            }
            else {
                value = this.unknown(this.newReference(ref, v), v, indentation + 1);
            }

            toAdd.add(v);

            str += this.linebreak()
                + this.indentation(indentation)
                + this.key(key)
                + Serializer.COLON
                + Serializer.WHITESPACE
                + value;

            if (i < keys.length - 1) {
                str += Serializer.COMMA;
            }
        }

        toAdd.forEach(v => ref.add(v));

        const prototype = this.prototype(ref, object, indentation);

        str += prototype;

        if (keys.length > 0 || prototype.length > 0) {
            str += this.linebreak()
                + this.indentation(indentation - 1);
        }

        str += Serializer.OBJECT_BRACES[1];

        return str;
    }

    protected array(ref: Set<unknown>, array: any[], indentation: number): string {
        let str: string = Serializer.ARRAY_BRACES[0];

        const toAdd: Set<unknown> = new Set();

        for (let i = 0; i < array.length; i++) {
            const v = array[i];

            let value: string;
            if (ref.has(v)) {
                value = this.getCircularReference();
            }
            else {
                value = this.unknown(this.newReference(ref, v), v, indentation + 1);
            }

            toAdd.add(v);

            str += this.linebreak()
                + this.indentation(indentation)
                + value;

            if (i < array.length - 1) {
                str += Serializer.COMMA;
            }
        }

        toAdd.forEach(v => ref.add(v));

        const prototype = this.prototype(ref, array, indentation);

        str += prototype;

        if (array.length > 0 || prototype.length > 0) {
            str += this.linebreak()
                + this.indentation(indentation - 1);
        }

        str += Serializer.ARRAY_BRACES[1];

        return str;
    }

    protected map(ref: Set<unknown>, map: Map<unknown, unknown>, indentation: number): string {
        const obj: object = {};

        map.forEach((v, k) => {
            if (ref.has(v)) {
                this.getCircularReference();
            }

            Reflect.set(obj, (typeof k === "string") ? k : this.unknown(ref, k, indentation), v);
        });

        return Serializer.MAP
            + Serializer.CLASS_INSTANCE_BRACES[0]
            + this.object(ref, obj, indentation)
            + Serializer.CLASS_INSTANCE_BRACES[1];
    }

    protected set(ref: Set<unknown>, set: Set<unknown>, indentation: number): string {
        const arr: unknown[] = [];

        set.forEach(value => {
            if (ref.has(value)) {
                this.getCircularReference();
            }

            arr.push((typeof value === "string") ? value : this.unknown(ref, value, indentation));
        });

        return Serializer.SET
            + Serializer.WHITESPACE
            + Serializer.CLASS_INSTANCE_BRACES[0]
            + this.array(ref, arr, indentation)
            + Serializer.CLASS_INSTANCE_BRACES[1];
    }

    protected unknown(ref: Set<unknown>, target: unknown, indentation: number): string {
        if (target === null) {
            return this.null();
        }
        else if (target instanceof Map) {
            return this.map(ref, target, indentation);
        }
        else if (target instanceof Set) {
            return this.set(ref, target, indentation);
        }

        switch (typeof target) {
            case "boolean":
                return this.boolean(target);
            case "number":
                return this.number(target);
            case "bigint":
                return this.bigint(target);
            case "string":
                return this.string(target);
            case "symbol":
                return this.symbol(target);
            case "undefined":
                return this.undefined();
            case "function":
                return this.function(target);
            case "object":
                return this.object(ref, target, indentation);
            default:
                throw new SerializationError("NEVER HAPPENS");
        }
    }

    private static readonly ARGUMENTS_BRACES: [string, string] = ["(", ")"];

    private static readonly OBJECT_BRACES: [string, string] = ["{", "}"];

    private static readonly ARRAY_BRACES: [string, string] = ["[", "]"];

    private static readonly CLASS_INSTANCE_BRACES: [string, string] = ["<", ">"];

    private static readonly COMMA: string = ",";

    private static readonly COLON: string = ":";

    private static readonly WHITESPACE: string = " ";

    private static readonly QUOTE: string = "\"";

    private static readonly LINEBREAK: string = "\n";

    private static readonly EMPTY: string = "";

    private static readonly CODE: string = "{ ... }";

    private static readonly UNQUOTED_KEY_PATTERN: () => RegExp = () => /^[0-9]|[1-9][0-9]*|#?[a-zA-Z][a-zA-Z0-9_]*|[a-zA-Z_][a-zA-Z0-9_]*$/g;

    private static readonly FUNCTION: string = "function";

    private static readonly ASYNC: string = "async";

    private static readonly CLASS: string = "class";

    private static readonly SYMBOL: string = "symbol";

    private static readonly MAP: string = "Map";

    private static readonly SET: string = "Set";

    private static readonly NULL: string = "null";

    private static readonly UNDEFINED: string = "undefined";

    private static readonly PROTOTYPE: string = "[[Prototype]]";

    private static readonly CIRCULAR_REFERENCE_OBJECT: string = "{ <Circular Reference> }";
}
