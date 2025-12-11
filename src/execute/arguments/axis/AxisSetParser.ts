import { AbstractParser } from "../AbstractParser";
import { AxisSet } from "./AxisSet";

export class AxisSetParseError extends Error {}

export class AxisSetParser extends AbstractParser<AxisSet, AxisSetParseError> {
    protected override getTrue(): string {
        return "true";
    }

    protected override getFalse(): string {
        return "false";
    }

    protected override getQuotes(): Set<string> {
        return new Set(['"', '\'']);
    }

    protected override getWhitespace(): Set<string> {
        return new Set([' ']);
    }

    protected override getErrorConstructor(): (message: string, cause?: Error) => AxisSetParseError {
        return (message, cause) => new AxisSetParseError(message, cause);
    }

    private axis(): string {
        const char = this.peek(false);

        if (!"xyz".includes(char)) {
            throw this.exception("x, y, z以外の文字は無効です");
        }

        this.next(false);

        return char;
    }

    protected override parse(): AxisSet {
        this.ignore();

        const set = new Set<string>();

        let count = 1;
        while (!this.isOver() && !this.isOnlyWhitespaceRemaining()) {
            if (count > 3) {
                throw this.exception("文字は3つまでが有効です");
            }

            const axis = this.axis();

            if (set.has(axis)) {
                throw this.exception("文字が重複しています: " + axis);
            }

            set.add(axis);

            count++;
        }

        if (set.size === 0) {
            throw this.exception("空文字列は無効です");
        }

        this.finish();

        return new AxisSet(set);
    }

    public static readAxisSet(input: string): AxisSet {
        return new AxisSetParser(input).parse();
    }
}
