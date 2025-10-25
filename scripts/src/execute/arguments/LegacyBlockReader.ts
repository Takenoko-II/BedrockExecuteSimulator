// もう使わない

import { BlockStates, BlockType, BlockTypes } from "@minecraft/server";

export class LegacyBlockParseError extends Error {
    public constructor(message: string) {
        super(message);
    }
}

export interface LegacyBlockInfo {
    readonly type: BlockType;

    readonly states?: Record<string, string | number | boolean>;
}

export class LegacyBlockReader {
    private static readonly IGNORED: string[] = [' ', '\n'];

    private static readonly STATE_BRACES: [string, string] = ['[', ']'];

    private static readonly EQUAL: string = '=';

    private static readonly COMMA: string = ',';

    private static readonly QUOTE: string = '"';

    private static readonly ID_PATTERN: () => RegExp = () => /^(?:[a-zA-Z_](?:[a-zA-Z0-9_]+)?:)?[a-zA-Z_](?:[a-zA-Z0-9_]+)?$/g;

    private static readonly INT_PATTERN: () => RegExp = () => /^[+-]?\d+$/g;

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
                throw new LegacyBlockParseError("文字数を超えた位置へのアクセスが発生しました");
            }

            const current: string = this.text.charAt(this.location++);
    
            if (LegacyBlockReader.IGNORED.includes(current) && next) return this.next();
    
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

        if (LegacyBlockReader.IGNORED.includes(current)) {
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

            if (current === LegacyBlockReader.STATE_BRACES[0] || LegacyBlockReader.IGNORED.includes(current)) {
                this.back();
                break;
            }
            else if (/^[^a-zA-Z0-9_:]$/g.test(current)) {
                throw new LegacyBlockParseError("ブロックIDに含むことのできない文字です: '" + current + "'");
            }
            else {
                string += current;
            }
        }

        if (LegacyBlockReader.ID_PATTERN().test(string)) {
            const type = BlockTypes.get(string);

            if (type === undefined) {
                throw new LegacyBlockParseError("不明なブロックIDです: '" + string + "'");
            }
            else {
                return type;
            }
        }
        else {
            throw new LegacyBlockParseError("ブロックIDとして無効な文字列です: '" + string + "'");
        }
    }

    private string(): string {
        let string: string = "";

        if (!this.next(LegacyBlockReader.QUOTE)) {
            throw new LegacyBlockParseError("ブロックステートでは文字列は'\"'で開始される必要があります");
        }


        while (!this.isOver()) {
            const current = this.next(false);

            if (current === LegacyBlockReader.QUOTE) {
                this.back();
                break;
            }
            else {
                string += current;
            }
        }

        if (!this.next(LegacyBlockReader.QUOTE)) {
            throw new LegacyBlockParseError("ブロックステートでは文字列は'\"'で終了される必要があります");
        }

        return string;
    }

    private integer(): number {
        let string: string = "";

        if (this.next(LegacyBlockReader.SIGNS[0])) {
            string += LegacyBlockReader.SIGNS[0];
        }
        else if (this.next(LegacyBlockReader.SIGNS[1])) {
            string += LegacyBlockReader.SIGNS[1];
        }

        while (!this.isOver()) {
            const current = this.next(false);

            if (LegacyBlockReader.NUMBERS.includes(current)) {
                string += current;
            }
            else {
                this.back();
                break;
            }
        }

        if (LegacyBlockReader.INT_PATTERN().test(string)) {
            return Number.parseInt(string);
        }
        else {
            throw new LegacyBlockParseError("整数として無効な文字列です: '" + string + "'");
        }
    }

    private boolean(): boolean {
        if (this.next(LegacyBlockReader.BOOLS[0])) {
            return false;
        }
        else if (this.next(LegacyBlockReader.BOOLS[1])) {
            return true;
        }
        else {
            throw new LegacyBlockParseError("真偽値が見つかりませんでした");
        }
    }

    private value(): string | number | boolean {
        if (this.test(LegacyBlockReader.QUOTE)) {
            return this.string();
        }
        else if (LegacyBlockReader.SIGNS.some(sign => this.test(sign)) || LegacyBlockReader.NUMBERS.some(number => this.test(number))) {
            return this.integer();
        }
        else if (LegacyBlockReader.BOOLS.some(bool => this.test(bool))) {
            return this.boolean();
        }
        else {
            throw new LegacyBlockParseError("ブロックステートに渡される値は文字列、整数、真偽値のいずれかである必要があります");
        }
    }

    private states(): Record<string, string | number | boolean> {
        const record: Record<string, string | number | boolean> = {};

        if (!this.next(LegacyBlockReader.STATE_BRACES[0])) {
            throw new LegacyBlockParseError("ブロックステートは'['で開始される必要があります");
        }

        if (this.next(LegacyBlockReader.STATE_BRACES[1])) {
            return record;
        }

        while (!this.isOver()) {
            const key = this.string();

            if (!this.next(LegacyBlockReader.EQUAL)) {
                throw new LegacyBlockParseError("イコールが見つかりませんでした");
            }

            const value = this.value();

            const blockStateType = BlockStates.get(key);

            if (blockStateType === undefined) {
                throw new LegacyBlockParseError("不明なブロックステートです: '" + key + "'");
            }
            else if (!blockStateType.validValues.includes(value)) {
                throw new LegacyBlockParseError("ブロックステート '" + key + "' には無効な値です: '" + value + "'");
            }

            record[key] = value;

            if (this.test(LegacyBlockReader.STATE_BRACES[1])) {
                break;
            }
            else if (!this.next(LegacyBlockReader.COMMA)) {
                throw new LegacyBlockParseError("ブロックステートの区切りにはカンマが必要です");
            }
        }

        if (!this.next(LegacyBlockReader.STATE_BRACES[1])) {
            throw new LegacyBlockParseError("ブロックステートは']'で終了される必要があります");
        }

        return record;
    }

    private index(): LegacyBlockInfo {
        const type = this.id();

        if (this.isOver()) {
            return { type };
        }

        const states = this.states();

        if (!this.isOver()) {
            throw new LegacyBlockParseError("ブロックステートの解析後に無効な文字列を検出しました: '" + this.text.slice(this.location) + "'");
        }

        return { type, states };
    }

    public static readBlock(input: string): LegacyBlockInfo {
        const reader = new this();
        reader.text = input;
        return reader.index();
    }
}
