// もう使わない

export class MapParseError extends Error {
    public constructor(message: string) {
        super(message);
    }
}

/**
 * @deprecated
 */
export class MapReader {
    private static readonly IGNORED: string[] = [' ', '\n'];

    private static readonly MAP_BRACES: [string, string] = ['{', '}'];

    private static readonly EQUAL: string = '=';

    private static readonly COMMA: string = ',';

    private static readonly NOT: string = '!';

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
                throw new MapParseError("文字数を超えた位置へのアクセスが発生しました");
            }
    
            const current: string = this.text.charAt(this.location++);
        
            if (MapReader.IGNORED.includes(current) && next) return this.next();
        
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

        if (MapReader.IGNORED.includes(current)) {
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

    private object(): Record<string, { readonly not: boolean; readonly value: string; }> {
        if (!this.next(MapReader.MAP_BRACES[0])) {
            throw new MapParseError("Mapの先頭は中括弧が期待されています");
        }

        const record: Record<string, { readonly not: boolean; readonly value: string; }> = {};

        while (!this.isOver()) {
            if (this.test(MapReader.MAP_BRACES[1])) {
                break;
            }
            else if (this.next(MapReader.COMMA)) {
                continue;
            }
            else {
                const key: string = this.key();
                
                if (!this.next(MapReader.EQUAL)) {
                    throw new MapParseError("Mapのキーと値はイコールで区切られる必要があります");
                }

                const [not, value] = this.value();

                record[key] = {
                    not, value
                };
            }
        }

        if (!this.next(MapReader.MAP_BRACES[1])) {
            throw new MapParseError("中括弧が閉じられていません");
        }

        return record;
    }

    private key(): string {
        let val: string = "";

        while (!this.isOver()) {
            const currentChar = this.next(false);

            if (/^[a-zA-Z0-9_\-:\.]$/g.test(currentChar)) {
                val += currentChar;
            }
            else if (MapReader.IGNORED.includes(currentChar) || currentChar === MapReader.EQUAL) {
                this.back();
                break;
            }
            else {
                throw new MapParseError("Mapのキーに使用できない文字です: '" + currentChar + "'");
            }
        }

        return val;
    }

    private value(): [boolean, string] {
        let val: string = "";

        let not = false;

        if (!this.isOver() && this.next(MapReader.NOT)) {
            not = true;
        }

        while (!this.isOver()) {
            const currentChar = this.next(false);

            if (/^[a-zA-Z0-9_\-:\.]$/g.test(currentChar)) {
                val += currentChar;
            }
            else if (MapReader.IGNORED.includes(currentChar) || currentChar === MapReader.COMMA || currentChar === MapReader.MAP_BRACES[1]) {
                this.back();
                break;
            }
            else {
                throw new MapParseError("Mapの値に使用できない文字です: '" + currentChar + "'");
            }
        }

        return [not, val];
    }

    private index(): Record<string, { readonly not: boolean; readonly value: string; }> {
        const r = this.object();
        if (!this.isOver()) throw new MapParseError("Mapの解析終了後に無効な文字列を検知しました");
        return r;
    }

    public static readStringMap(input: string): Record<string, { readonly not: boolean; readonly value: string; }> {
        const reader = new this();
        reader.text = input;
        return reader.index();
    }
}
