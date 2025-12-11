/**
 * 文字列解析を行うクラスが継承する抽象クラス
 */
export abstract class AbstractParser<T, E extends Error> {
    protected readonly text: string;

    private cursor: number = 0;

    protected constructor(text: string) {
        this.text = text;
    }

    protected isOver(): boolean {
        return this.cursor >= this.text.length;
    }

    protected isOnlyWhitespaceRemaining(): boolean {
        return this.isOver() || [...this.text.slice(this.cursor)].every(s => this.getWhitespace().has(s));
    }

    private peekChar(): string {
        if (this.isOver()) {
            throw this.exception("peek() の実行に失敗しました: isOver");
        }

        return this.text.charAt(this.cursor);
    }

    private peekFar(offset: number): string | undefined {
        if (this.cursor + offset >= this.text.length) {
            return undefined;
        }

        return this.text.charAt(this.cursor + offset);
    }

    private nextChar(): void {
        if (this.isOver()) {
            throw this.exception("next() の実行に失敗しました: isOver");
        }

        this.cursor++;
    }

    protected peek(ignore: boolean): string {
        if (ignore) this.ignore();
        return this.peekChar();
    }

    protected abstract getErrorConstructor(): new (message: string, cause?: Error) => E;

    protected abstract getWhitespace(): Set<string>;

    protected abstract getQuotes(): Set<string>;

    protected getInvalidSymbolsInUnquotedString(): Set<string> {
        return new Set([
            '.', ',', ':', ';', '\\', '@',
            '(', ')', '{', '}', '[', ']',
            '!', '?', '\'', '"', '#', '$',
            '=', '+', '-', '*', '/', '%',
            '&', '|', '~', '^', '<', '>'
        ]);
    }

    protected abstract getTrue(): string;

    protected abstract getFalse(): string;

    protected ignore(): void {
        if (this.isOver()) return;

        let current: string = this.peekChar();
        while (this.getWhitespace().has(current)) {
            this.nextChar();
            if (this.isOver()) {
                break;
            }
            current = this.peekChar();
        }
    }

    protected test(ignore: boolean, ...candidates: string[]): string | undefined {
        if (ignore) this.ignore();
        if (this.isOver()) return undefined;
        for (const string of candidates.sort((a, b) => b.length - a.length)) {
            if (this.text.substring(this.cursor).startsWith(string)) {
                return string;
            }
        }

        return undefined;
    }

    protected next(ignore: boolean): void;

    protected next(ignore: boolean, ...candidates: string[]): string | undefined;

    protected next(ignore: boolean, ...candidates: string[]): string | undefined | void {
        if (candidates.length === 0) {
            if (ignore) this.ignore();
            this.nextChar();
        }
        else {
            this.ignore();
            if (this.isOver()) return undefined;
            for (const string of candidates.sort((a, b) => b.length - a.length)) {
                if (this.text.substring(this.cursor).startsWith(string)) {
                    this.cursor += string.length;
                    return string;
                }
            }

            return undefined;
        }
    }

    protected expect(ignore: boolean, ...candidates: string[]):string {
        const s: string | undefined = this.next(ignore, ...candidates);

        if (s === undefined) {
            throw this.exception("expect() の実行に失敗しました: " + candidates);
        }

        return s;
    }

    protected number(ignore: boolean): { readonly value: number; readonly isWrittenAsInt: boolean } {
        const SIGNS: Set<string> = new Set(['+', '-']);
        const INTEGERS: Set<string> = new Set(['0', '1', '2', '3', '4', '5', '6', '7', '8', '9']);
        const DECIMAL_POINT = '.';

        let sb = "";

        let intAppeared: boolean = false;
        let pointAppeared: boolean = false;

        if (this.isOver()) {
            throw this.exception("number() の実行に失敗しました: isOver");
        }

        const initial = this.peek(ignore);
        this.next(ignore);

        if (SIGNS.has(initial)) {
            sb += initial;
        }
        else if (INTEGERS.has(initial)) {
            sb += initial;
            intAppeared = true;
        }

        while (!this.isOver()) {
            let current: string = this.peek(false);

            if (INTEGERS.has(current)) {
                sb += current;
                intAppeared = true;
            }
            else if (current === DECIMAL_POINT && intAppeared && !pointAppeared && this.peekFar(1) !== DECIMAL_POINT) {
                sb += current;
                pointAppeared = true;
            }
            else {
                break;
            }

            this.next(false);
        }

        try {
            return {
                value: Number(sb),
                isWrittenAsInt: !pointAppeared
            };
        }
        catch (e) {
            if (e instanceof Error) {
                throw this.exception("小数の解析に失敗しました: '" + sb + "'", e);
            }
            else {
                throw e;
            }
        }
    }

    protected int(ignore: boolean): number {
        const result = this.number(ignore);
        if (!result.isWrittenAsInt) {
            throw this.exception("整数の入力を検出できませんでした");
        }
        else return result.value;
    }

    protected float(ignore: boolean): number {
        return this.number(ignore).value;
    }

    protected unquotedString(ignore: boolean, ...stoppers: string[]): string {
        const str = this.string(ignore, ...stoppers);
        if (str.isQuoted) {
            throw this.exception("文字列がクォートで囲まれています");
        }
        else {
            return str.value;
        }
    }

    protected quotedString(ignore: boolean): string {
        const str = this.string(ignore);
        if (str.isQuoted) {
            return str.value;
        }
        else {
            throw this.exception("文字列がクォートで囲まれていません");
        }
    }

    protected string(ignore: boolean, ...stoppers: string[]): { readonly value: string; readonly isQuoted: boolean } {
        let sb: string = "";
        let current: string = this.peek(ignore);
        this.next(ignore);

        let isQuoted: boolean;

        if (this.getQuotes().has(current)) {
            const ESCAPE: string = '\\';

            const quote: string = current;
            let previous: string = current;
            current = this.peek(false);
            this.next(false);

            while (previous == ESCAPE || current != quote) {
                if (previous == ESCAPE && current == quote) {
                    sb = sb.substring(sb.length -1, sb.length);
                }

                sb += current;

                previous = current;
                current = this.peek(false);
                this.next(false);
            }
            
            isQuoted = true;
        }
        else {
            const SYMBOLS: Set<string> = this.getInvalidSymbolsInUnquotedString();

            while (!this.getWhitespace().has(current) && !stoppers.includes(current)) {
                if (SYMBOLS.has(current)) {
                    throw this.exception("クオーテーションで囲まれていない文字列において利用できない文字( "+ current +" )を検出しました");
                }

                sb += current;
                if (this.isOver()) {
                    return {
                        isQuoted: false,
                        value: sb
                    };
                }
                current = this.peek(false);
                this.next(false);
            }

            // どうしようこいつ
            this.cursor--;

            isQuoted = false;
        }

        return {
            value: sb,
            isQuoted
        };
    }

    protected bool(): boolean {
        if (this.next(true, this.getTrue()) != null) return true;
        else if (this.next(true, this.getFalse()) != null) return false;
        else throw this.exception("真偽値の解析に失敗しました");
    }

    protected exception(message: string): E;

    protected exception(message: string, cause: Error): E;

    protected exception(message: string, cause?: Error): E {
        const a = this.text.substring(Math.max(0, this.cursor - 8), Math.max(0, this.cursor));
        const b = this.cursor >= this.text.length ? "" : this.text.charAt(this.cursor);
        const c = this.text.substring(Math.min(this.cursor + 1, this.text.length), Math.min(this.cursor + 8, this.text.length));

        const string = `${message}; 位置: ${a} >> ${b} << ${c}`;

        return new (this.getErrorConstructor())(string, cause);
    }

    protected finish(): void {
        this.ignore();

        if (!this.isOver()) {
            throw this.exception("解析終了後に無効な文字列を検出しました: " + this.text.substring(this.cursor));
        }
    }

    protected abstract parse(): T;
}
