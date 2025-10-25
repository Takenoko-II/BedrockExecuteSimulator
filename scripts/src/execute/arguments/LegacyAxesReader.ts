export type LegacyAxis = 'x' | 'y' | 'z';

export class LegacyAxesParseError extends Error {
    public constructor(message: string) {
        super(message);
    }
}

export class LegacyAxesReader {
    private constructor() {}

    public static readAxes(input: string): ReadonlySet<LegacyAxis> {
        if (input.length > 3) {
            throw new LegacyAxesParseError("軸指定文字列の長さは3を超えることができません");
        }
        else {
            const chars = input.split('');
            const set = new Set(chars);

            if (chars.length !== set.size) {
                throw new LegacyAxesParseError("文字を重複させることはできません");
            }
            else if (!chars.every(c => "xyz".includes(c))) {
                throw new LegacyAxesParseError("x, y, z以外は軸として無効な文字です");
            }
            else {
                return set as Set<LegacyAxis>;
            }
        }
    }
}
