export type Axis = 'x' | 'y' | 'z';

export class AxesParseError extends Error {
    public constructor(message: string) {
        super(message);
    }
}

export class AxesReader {
    private constructor() {}

    public static readAxes(input: string): Set<Axis> {
        if (input.length > 3) {
            throw new AxesParseError("軸指定文字列の長さは3を超えることができません");
        }
        else {
            const chars = input.split('');
            const set = new Set(chars);

            if (chars.length !== set.size) {
                throw new AxesParseError("文字を重複させることはできません");
            }
            else if (chars.every(c => "xyz".includes(c))) {
                throw new AxesParseError("x, y, z以外は軸として無効な文字です");
            }
            else {
                return set as Set<Axis>;
            }
        }
    }
}
