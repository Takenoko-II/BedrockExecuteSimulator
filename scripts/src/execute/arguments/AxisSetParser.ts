import { Vector3 } from "@minecraft/server";
import { AbstractParser } from "./AbstractParser";

export class AxisSet {
    public constructor(private readonly set: ReadonlySet<string>) {}

    public apply(vector3: Vector3, callbackFn: (component: number) => number): void {
        if (this.set.has('x')) vector3.x = callbackFn(vector3.x);
        if (this.set.has('y')) vector3.y = callbackFn(vector3.y);
        if (this.set.has('z')) vector3.z = callbackFn(vector3.z);
    }

    public floor(vector3: Vector3): void {
        this.apply(vector3, Math.floor);
    }
}

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
}
