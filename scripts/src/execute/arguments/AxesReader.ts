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
            throw new AxesParseError("");
        }
        else {
            const chars = input.split('');
            const set = new Set(chars);

            if (chars.length !== set.size) {
                throw new AxesParseError("");
            }
            else if (chars.every(c => "xyz".includes(c))) {
                throw new AxesParseError("");
            }
            else {
                return set as Set<Axis>;
            }
        }
    }
}
