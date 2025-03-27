export class Serializer {
    private __indentationSpaceCount__: number = 4;

    private __linebreakable__: boolean = true;

    private readonly hiddenPrototypes: Set<object> = new Set();

    public get indentationSpaceCount(): number {
        return this.__indentationSpaceCount__;
    }

    public set indentationSpaceCount(value: number) {
        if (Number.isNaN(value) || value < 0 || value > 20) {
            throw new TypeError("Indentation space count must not be NaN, must be integer, and must be within range(0, 20)");
        }

        this.__indentationSpaceCount__ = value;
    }

    public get linebreakable(): boolean {
        return this.__linebreakable__;
    }

    public set linebreakable(value: boolean) {
        this.__linebreakable__ = value;
    }

    public hidePrototypeOf(clazz: Function) {
        if (clazz.prototype === undefined) {
            throw new TypeError("It does not have prototype");
        }

        if (!this.hiddenPrototypes.has(clazz.prototype)) {
            this.hiddenPrototypes.add(clazz.prototype);
        }
    }

    public unhidePrototypeOf(clazz: Function) {
        if (clazz.prototype === undefined) {
            throw new TypeError("It does not have prototype");
        }

        if (this.hiddenPrototypes.has(clazz.prototype)) {
            this.hiddenPrototypes.delete(clazz);
        }
    }

    public serialize(value: any): string {
        return this.any(value, 1);
    }

    protected getPropertiesOf(object: object): string[] {
        return Object.getOwnPropertyNames(object);
    }

    protected getPrototypeOf(object: object): object | null {
        const prototype: object = Object.getPrototypeOf(object);

        if (this.hiddenPrototypes.has(prototype)) {
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
        return '"' + string + '"';
    }

    protected symbol(symbol: symbol): string {
        return (symbol.description === undefined || symbol.description.length === 0)
            ? "symbol()"
            : "symbol(" + this.string(symbol.description) + ")";
    }

    protected null(): string {
        return "null";
    }

    protected undefined(): string {
        return "undefined";
    }

    protected indentation(count: number): string {
        return " ".repeat(this.__indentationSpaceCount__).repeat(count);
    }

    protected linebreak(): string {
        return this.__linebreakable__ ? "\n" : "";
    }

    protected prototype(object: object, indentation: number): string {
        const prototype: object | null = this.getPrototypeOf(object);

        let string = "";

        if (prototype === null) {
            return string;
        }

        let forceAsObject: boolean = false;

        if (Array.isArray(object)) {
            forceAsObject = true;

            if (object.length > 0) {
                string += this.COMMA;
            }
        }
        else if (this.getPropertiesOf(object).length > 0) {
            string += this.COMMA;
        }

        string += this.linebreak()
            + this.indentation(indentation)
            + "[[Prototype]]"
            + this.COLON
            + this.WHITESPACE
            + this.object(prototype, indentation + 1, forceAsObject);

        return string;
    }

    protected function(__function__: Function): string {
        const code: string = __function__.toString();

        if (code.startsWith("function")) {
            return "function " + __function__.name + "() {...}";
        }
        else if (code.startsWith("async")) {
            return "async function " + __function__.name + "() {...}";
        }
        else if (code.startsWith("class")) {
            return "class " + __function__.name + " {...}";
        }
        else {
            return __function__.name + "() {...}";
        }
    }

    protected object(object: object, indentation: number, forceAsObject: boolean = false): string {
        if (Array.isArray(object) && !forceAsObject) {
            return this.array(object, indentation);
        }
        else if (object === null) {
            return this.null();
        }

        let str: string = this.OBJECT_BRACE[0];

        const keys: string[] = this.getPropertiesOf(object);

        for (let i = 0; i < keys.length; i++) {
            const key: string = keys[i];
            const value: string = this.any(Reflect.get(object, key), indentation + 1);

            str += this.linebreak()
                + this.indentation(indentation)
                + this.string(key)
                + this.COLON
                + this.WHITESPACE
                + value;

            if (i < keys.length - 1) {
                str += this.COMMA;
            }
        }

        const prototype = this.prototype(object, indentation);

        str += prototype;

        if (keys.length > 0 || prototype.length > 0) {
            str += this.linebreak()
                + this.indentation(indentation - 1);
        }

        str += this.OBJECT_BRACE[1];

        return str;
    }

    protected array(array: any[], indentation: number): string {
        let str: string = this.ARRAY_BRACE[0];

        for (let i = 0; i < array.length; i++) {
            const value: string = this.any(array[i], indentation + 1);

            str += this.linebreak()
                + this.indentation(indentation)
                + value;

            if (i < array.length - 1) {
                str += this.COMMA;
            }
        }

        const prototype = this.prototype(array, indentation);

        str += prototype;

        if (array.length > 0 || prototype.length > 0) {
            str += this.linebreak()
                + this.indentation(indentation - 1);
        }

        str += this.ARRAY_BRACE[1];

        return str;
    }

    protected map(map: Map<unknown, unknown>, indentation: number): string {
        const obj: object = {};
        
        map.forEach((v, k) => {
            Reflect.set(obj, (typeof k === "string") ? k : this.any(k, indentation), v);
        });

        return "Map <"
            + this.object(obj, indentation)
            + ">";
    }

    protected set(set: Set<unknown>, indentation: number): string {
        const arr: unknown[] = [];

        set.forEach(value => {
            arr.push((typeof value === "string") ? value : this.any(value, indentation));
        });

        return "Set <"
            + this.array(arr, indentation)
            + ">";
    }

    protected any(any: any, indentation: number): string {
        if (any === null) {
            return this.null();
        }
        else if (any instanceof Map) {
            return this.map(any, indentation);
        }
        else if (any instanceof Set) {
            return this.set(any, indentation);
        }

        switch (typeof any) {
            case "boolean":
                return this.boolean(any);
            case "number":
                return this.number(any);
            case "bigint":
                return this.bigint(any);
            case "string":
                return this.string(any);
            case "symbol":
                return this.symbol(any);
            case "undefined":
                return this.undefined();
            case "function":
                return this.function(any);
            case "object":
                return this.object(any, indentation);
            default:
                throw new TypeError("Unknown Type Value.");
        }
    }

    private readonly OBJECT_BRACE: [string, string] = ["{", "}"];

    private readonly ARRAY_BRACE: [string, string] = ["[", "]"];

    private readonly COMMA: string = ",";

    private readonly COLON: string = ":";

    private readonly WHITESPACE: string = " ";
}
