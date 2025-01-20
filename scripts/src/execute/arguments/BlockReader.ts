import { BlockStates, BlockType, BlockTypes } from "@minecraft/server";

export class BlockParseError extends Error {
    public constructor(message: string) {
        super(message);
    }
}

export interface BlockInfo {
    readonly type: BlockType;

    readonly states?: Record<string, string | number | boolean>;
}

export class BlockReader {
    private static readonly IGNORED: string[] = [' ', '\n'];

    private static readonly STATE_BRACES: [string, string] = ['[', ']'];

    private static readonly EQUAL: string = '=';

    private static readonly COMMA: string = ',';

    private static readonly QUOTE: string = '"';

    private static readonly ID_PATTERN: RegExp = /^(?:[a-zA-Z_](?:[a-zA-Z0-9_]+)?:)?[a-zA-Z_](?:[a-zA-Z0-9_]+)?$/g;

    private static readonly INT_PATTERN: RegExp = /^[+-]?\\d+$/g;

    private static readonly SIGNS: [string, string] = ['+', '-'];

    private static readonly NUMBERS: string[] = ['0', '1', '2', '3', '4', '5', '6', '7', '8', '9'];

    private static readonly BOOLS: [string, string] = ["false", "true"];

    private text: string = "";

    private location: number = 0;

    private constructor() {}

    private isOver(): boolean {
        return this.location >= this.text.length;
    }

    private next(): string;

    private next(next: string): boolean;

    private next(next: boolean): string;

    private next(next: string | boolean = true): string | boolean {
        if (typeof next === "boolean") {
            if (this.isOver()) {
                throw new BlockParseError("文字数を超えた位置へのアクセスが発生しました");
            }

            const current: string = this.text.charAt(this.location++);
    
            if (BlockReader.IGNORED.includes(current) && next) return this.next();
    
            return current;
        }
        else {
            if (this.isOver()) return false;

            this.ignore();

            const str: string = this.text.substring(this.location);

            if (str.startsWith(next)) {
                this.location += next.length;
                this.ignore();
                return true;
            }

            return false;
        }
    }

    private back(): void {
        this.location--;
    }

    private ignore(): void {
        if (this.isOver()) return;

        const current: string = this.text.charAt(this.location++);

        if (BlockReader.IGNORED.includes(current)) {
            this.ignore();
        }
        else {
            this.back();
        }
    }

    private test(...nexts: string[]): boolean {
        const loc = this.location;

        for (const next of nexts) {
            if (!this.next(next)) {
                this.location = loc;
                return false;
            }
        }

        this.location = loc;
        return true;
    }

    private id(): BlockType {
        let string: string = "";

        while (!this.isOver()) {
            const current = this.next(false);

            if (current === BlockReader.STATE_BRACES[0] || BlockReader.IGNORED.includes(current)) {
                this.back();
                break;
            }
            else if (/^[^a-zA-Z0-9_:]$/g.test(current)) {
                throw new BlockParseError("");
            }
            else {
                string += current;
            }
        }

        if (BlockReader.ID_PATTERN.test(string)) {
            const type = BlockTypes.get(string);

            if (type === undefined) {
                throw new BlockParseError("");
            }
            else {
                return type;
            }
        }
        else {
            throw new BlockParseError("");
        }
    }

    private string(): string {
        let string: string = "";

        if (!this.next(BlockReader.QUOTE)) {
            throw new BlockParseError("");
        }


        while (!this.isOver()) {
            const current = this.next(false);

            if (current === BlockReader.QUOTE) {
                this.back();
                break;
            }
            else {
                string += current;
            }
        }

        if (!this.next(BlockReader.QUOTE)) {
            throw new BlockParseError("");
        }

        return string;
    }

    private integer(): number {
        let string: string = "";

        if (this.next(BlockReader.SIGNS[0])) {
            string += BlockReader.SIGNS[0];
        }
        else if (this.next(BlockReader.SIGNS[1])) {
            string += BlockReader.SIGNS[1];
        }

        while (!this.isOver()) {
            const current = this.next(false);

            if (BlockReader.NUMBERS.includes(current)) {
                string += current;
            }
            else {
                this.back();
                break;
            }
        }

        if (BlockReader.INT_PATTERN.test(string)) {
            return Number.parseInt(string);
        }
        else {
            throw new BlockParseError("");
        }
    }

    private boolean(): boolean {
        if (this.next(BlockReader.BOOLS[0])) {
            return false;
        }
        else if (this.next(BlockReader.BOOLS[1])) {
            return true;
        }
        else {
            throw new BlockParseError("");
        }
    }

    private value(): string | number | boolean {
        if (this.test(BlockReader.QUOTE)) {
            return this.string();
        }
        else if (BlockReader.SIGNS.some(sign => this.test(sign)) || BlockReader.NUMBERS.some(number => this.test(number))) {
            return this.integer();
        }
        else if (BlockReader.BOOLS.some(bool => this.test(bool))) {
            return this.boolean();
        }
        else {
            throw new BlockParseError("");
        }
    }

    private states(): Record<string, string | number | boolean> {
        const record: Record<string, string | number | boolean> = {};

        if (!this.next(BlockReader.STATE_BRACES[0])) {
            throw new BlockParseError("");
        }

        while (!this.isOver()) {
            const key = this.string();

            if (!this.next(BlockReader.EQUAL)) {
                throw new BlockParseError("");
            }

            const value = this.value();

            const blockStateType = BlockStates.get(key);

            if (blockStateType === undefined) {
                throw new BlockParseError("");
            }
            else if (!blockStateType.validValues.includes(value)) {
                throw new BlockParseError("");
            }

            record[key] = value;

            if (this.test(BlockReader.STATE_BRACES[1])) {
                break;
            }
            else if (!this.next(BlockReader.COMMA)) {
                throw new BlockParseError("");
            }
        }

        if (!this.next(BlockReader.STATE_BRACES[1])) {
            throw new BlockParseError("");
        }

        return record;
    }

    private index(): BlockInfo {
        const type = this.id();

        if (this.isOver()) {
            return { type };
        }

        const states = this.states();

        if (!this.isOver()) {
            throw new BlockParseError("");
        }

        return { type, states };
    }

    public static readBlock(input: string): BlockInfo {
        const reader = new this();
        reader.text = input;
        return reader.index();
    }
}
