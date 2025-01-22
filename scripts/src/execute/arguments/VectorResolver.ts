import { CommandSourceStack } from "../CommandSourceStack";
import { TripleAxisRotationBuilder, Vector3Builder } from "../../util/Vector";

type VectorComponentType = "absolute" | "relative" | "local";

export interface VectorComponent {
    readonly type: VectorComponentType;

    readonly value: number;
}

export class PositionVectorResolver {
    private readonly x: VectorComponent;
    private readonly y: VectorComponent;
    private readonly z: VectorComponent;

    public constructor(x: VectorComponent, y: VectorComponent, z: VectorComponent) {
        this.x = x;
        this.y = y;
        this.z = z;
    }

    private isLocal(): boolean {
        return this.x.type === "local" && this.y.type === "local" && this.z.type === "local";
    }

    private isAbsoluteRelative(): boolean {
        return !(this.x.type === "local" || this.y.type === "local" || this.z.type === "local");
    }

    public resolve(stack: CommandSourceStack): Vector3Builder {
        if (this.isLocal()) {
            const localAxisProvider = stack.getRotation().getLocalAxisProvider();
            
            return stack.getPosition()
                .add(localAxisProvider.getX().length(this.x.value))
                .add(localAxisProvider.getY().length(this.y.value))
                .add(localAxisProvider.getZ().length(this.z.value));
        }
        else if (this.isAbsoluteRelative()) {
            const v = stack.getPosition();
            
            if (this.x.type === "relative") {
                v.x += this.x.value;
            }
            else {
                v.x = this.x.value;
            }
            
            if (this.y.type === "relative") {
                v.y += this.y.value;
            }
            else {
                v.y = this.y.value;
            }

            if (this.z.type === "relative") {
                v.z += this.z.value;
            }
            else {
                v.z = this.z.value;
            }

            return v;
        }
        else {
            throw new TypeError("INVALID SPECIFICATION");
        }
    }
}

export class RotationVectorResolver {
    private readonly yaw: VectorComponent;
    private readonly pitch: VectorComponent;

    public constructor(yaw: VectorComponent, pitch: VectorComponent) {
        this.yaw = yaw;
        this.pitch = pitch;
    }

    public resolve(stack: CommandSourceStack): TripleAxisRotationBuilder {
        const v = stack.getRotation();
            
            if (this.yaw.type === "relative") {
                v.yaw += this.yaw.value;
            }
            else {
                v.yaw = this.yaw.value;
            }
            
            if (this.pitch.type === "relative") {
                v.pitch += this.pitch.value;
            }
            else {
                v.pitch = this.pitch.value;
            }

            return v;
    }
}

export class VectorParseError extends Error {
    public constructor(message: string) {
        super(message);
    }
}

export class VectorReader {
    private static readonly IGNORED: string[] = [' ', '\n'];

    private static readonly NUMBERS: string[] = "0123456789".split('');

    private static readonly SIGNS: [string, string] = ['+', '-'];

    private static readonly DECIMAL_POINT: string = '.';

    private static readonly NUMBER_PARSER: (input: string, type: VectorComponentType, blockCenterCorrection: boolean) => number = (input, type, blockCenterCorrection) => {
        if (/^[+-]?\d+$/g.test(input) && blockCenterCorrection) {
            return Number.parseInt(input) + 0.5;
        }
        else if (/^[+-]?(?:\d+(?:\.\d+)?)$/g.test(input)) {
            return Number.parseFloat(input);
        }
        else if (type !== "absolute" && input === '') {
            return 0;
        }
        else {
            throw new VectorParseError("数値の解析に失敗しました: '" + input + "'");
        }
    };

    private static readonly TYPE_PREFIXES: {
        readonly prefix: string | string[];

        readonly type: VectorComponentType;
    }[] = [
        {
            prefix: '~',
            type: "relative"
        },
        {
            prefix: '^',
            type: "local"
        },
        {
            prefix: this.NUMBERS.concat(this.SIGNS),
            type: "absolute"
        }
    ];

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
                throw new VectorParseError("文字数を超えた位置へのアクセスが発生しました");
            }

            const current: string = this.text.charAt(this.location++);
    
            if (VectorReader.IGNORED.includes(current) && next) return this.next();
    
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

        if (VectorReader.IGNORED.includes(current)) {
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

    private type(): VectorComponentType {
        for (const { prefix, type } of VectorReader.TYPE_PREFIXES) {
            if (typeof prefix === "string") {
                if (this.next(prefix)) return type;
            }
            else {
                for (const c of prefix) {
                    if (this.test(c)) {
                        return type;
                    }
                }
            }
        }

        throw new VectorParseError("");
    }

    private value(type: VectorComponentType, blockCenterCorrection: boolean = false): number {
        let string: string = "";

        let dotAlreadyAppeared: boolean = false;

        if (this.next(VectorReader.SIGNS[0])) {
            string += VectorReader.SIGNS[0];
        }
        else if (this.next(VectorReader.SIGNS[1])) {
            string += VectorReader.SIGNS[1];
        }

        while (!this.isOver()) {
            const current = this.next(false);

            if (VectorReader.NUMBERS.includes(current)) {
                string += current;
            }
            else if (!dotAlreadyAppeared && current === VectorReader.DECIMAL_POINT) {
                string += current;
            }
            else {
                this.back();
                break;
            }
        }

        return VectorReader.NUMBER_PARSER(string, type, blockCenterCorrection);
    }

    private component(blockCenterCorrection: boolean = false): VectorComponent {
        const type: VectorComponentType = this.type();
        const value: number = this.value(type, blockCenterCorrection && type === "absolute");

        return {
            type,
            value
        };
    }

    private position(): PositionVectorResolver {
        const x = this.component(true);
        const y = this.component();
        const z = this.component(true);

        if (x.type === "local" || y.type === "local" || z.type === "local") {
            if (!(x.type === "local" && y.type === "local" && z.type === "local")) {
                throw new VectorParseError("");
            }
        }

        return new PositionVectorResolver(x, y, z);
    }

    private rotation(): RotationVectorResolver {
        const yaw = this.component();
        const pitch = this.component();

        if (yaw.type === "local" || pitch.type === "local") {
            throw new VectorParseError("");
        }

        return new RotationVectorResolver(yaw, pitch);
    }

    public static readPosition(input: string): PositionVectorResolver {
        const ins = new this();
        ins.text = input;
        const pos = ins.position();

        if (!ins.isOver()) throw new VectorParseError("");

        return pos;
    }

    public static readRotation(input: string): RotationVectorResolver {
        const ins = new this();
        ins.text = input;
        const rot = ins.rotation();

        if (!ins.isOver()) throw new VectorParseError("");

        return rot;
    }

    public static absOrRelComponent(input: string): VectorComponent {
        const ins = new this();
        ins.text = input;
        const c = ins.component();

        if (c.type === "local") throw new VectorParseError("");
        if (!ins.isOver()) throw new VectorParseError("");

        return c;
    }
}
