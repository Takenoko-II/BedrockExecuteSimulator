// もう使わない

import { CommandSourceStack } from "../CommandSourceStack";
import { DualAxisRotationBuilder, TripleAxisRotationBuilder, Vector3Builder } from "../../util/Vector";
import { sentry, TypeModel } from "../../lib/TypeSentry";

/**
 * @deprecated
 */
type LegacyVectorComponentType = "absolute" | "relative" | "local";

/**
 * @deprecated
 */
export interface LegacyVectorComponent {
    readonly type: LegacyVectorComponentType;

    readonly value: number;
}

/**
 * @deprecated
 */
export const LegacyVectorComponentModel: TypeModel<LegacyVectorComponent> = sentry.objectOf({
    type: sentry.unionOf(
        sentry.literalOf("absolute"),
        sentry.literalOf("relative"),
        sentry.literalOf("local")
    ),
    value: sentry.number
});

/**
 * @deprecated
 */
export class LegacyPositionVectorResolver {
    private readonly x: LegacyVectorComponent;
    private readonly y: LegacyVectorComponent;
    private readonly z: LegacyVectorComponent;

    public constructor(x: LegacyVectorComponent, y: LegacyVectorComponent, z: LegacyVectorComponent) {
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
            const objectCoordsSystem = TripleAxisRotationBuilder.from(stack.getRotation()).getObjectCoordsSystem();

            return stack.getPosition()
                .add(objectCoordsSystem.getX().length(this.x.value))
                .add(objectCoordsSystem.getY().length(this.y.value))
                .add(objectCoordsSystem.getZ().length(this.z.value));
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
            throw new TypeError("チルダ表記法とキャレット表記法を混在させることはできません");
        }
    }
}

/**
 * @deprecated
 */
export class LegacyRotationVectorResolver {
    private readonly yaw: LegacyVectorComponent;
    private readonly pitch: LegacyVectorComponent;

    public constructor(yaw: LegacyVectorComponent, pitch: LegacyVectorComponent) {
        this.yaw = yaw;
        this.pitch = pitch;
    }

    public resolve(stack: CommandSourceStack): DualAxisRotationBuilder {
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

/**
 * @deprecated
 */
export class LegacyVectorParseError extends Error {
    public constructor(message: string) {
        super(message);
    }
}

/**
 * @deprecated
 */
export class LegacyVectorReader {
    private static readonly IGNORED: string[] = [' ', '\n'];

    private static readonly NUMBERS: string[] = "0123456789".split('');

    private static readonly SIGNS: [string, string] = ['+', '-'];

    private static readonly DECIMAL_POINT: string = '.';

    private static readonly NUMBER_PARSER: (input: string, type: LegacyVectorComponentType, blockCenterCorrection: boolean) => number = (input, type, blockCenterCorrection) => {
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
            throw new LegacyVectorParseError("数値の解析に失敗しました: '" + input + "'");
        }
    };

    private static readonly TYPE_PREFIXES: {
        readonly prefix: string | string[];

        readonly type: LegacyVectorComponentType;
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
                throw new LegacyVectorParseError("文字数を超えた位置へのアクセスが発生しました");
            }

            const current: string = this.text.charAt(this.location++);
    
            if (LegacyVectorReader.IGNORED.includes(current) && next) return this.next();
    
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

        if (LegacyVectorReader.IGNORED.includes(current)) {
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

    private type(): LegacyVectorComponentType {
        for (const { prefix, type } of LegacyVectorReader.TYPE_PREFIXES) {
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

        throw new LegacyVectorParseError("無効な座標成分表記法です");
    }

    private value(type: LegacyVectorComponentType, blockCenterCorrection: boolean = false): number {
        let string: string = "";

        let dotAlreadyAppeared: boolean = false;

        if (this.next(LegacyVectorReader.SIGNS[0])) {
            string += LegacyVectorReader.SIGNS[0];
        }
        else if (this.next(LegacyVectorReader.SIGNS[1])) {
            string += LegacyVectorReader.SIGNS[1];
        }

        while (!this.isOver()) {
            const current = this.next(false);

            if (LegacyVectorReader.NUMBERS.includes(current)) {
                string += current;
            }
            else if (!dotAlreadyAppeared && current === LegacyVectorReader.DECIMAL_POINT) {
                string += current;
            }
            else {
                this.back();
                break;
            }
        }

        return LegacyVectorReader.NUMBER_PARSER(string, type, blockCenterCorrection);
    }

    private component(blockCenterCorrection: boolean = false): LegacyVectorComponent {
        const type: LegacyVectorComponentType = this.type();
        const value: number = this.value(type, blockCenterCorrection && type === "absolute");

        return {
            type,
            value
        };
    }

    private position(): LegacyPositionVectorResolver {
        const x = this.component(true);
        const y = this.component();
        const z = this.component(true);

        if (x.type === "local" || y.type === "local" || z.type === "local") {
            if (!(x.type === "local" && y.type === "local" && z.type === "local")) {
                throw new LegacyVectorParseError("キャレット表記法と他の表記法を混在させることはできません");
            }
        }

        return new LegacyPositionVectorResolver(x, y, z);
    }

    private rotation(): LegacyRotationVectorResolver {
        const yaw = this.component();
        const pitch = this.component();

        if (yaw.type === "local" || pitch.type === "local") {
            throw new LegacyVectorParseError("回転の入力ではキャレット表記法は使用できません");
        }

        return new LegacyRotationVectorResolver(yaw, pitch);
    }

    public static readPosition(input: string): LegacyPositionVectorResolver {
        const ins = new this();
        ins.text = input;
        const pos = ins.position();

        if (!ins.isOver()) throw new LegacyVectorParseError("座標の解析終了後に無効な文字列を検知しました");

        return pos;
    }

    public static readRotation(input: string): LegacyRotationVectorResolver {
        const ins = new this();
        ins.text = input;
        const rot = ins.rotation();

        if (!ins.isOver()) throw new LegacyVectorParseError("回転の解析終了後に無効な文字列を検知しました");

        return rot;
    }

    public static absOrRelComponent(input: string): LegacyVectorComponent {
        const ins = new this();
        ins.text = input;
        const c = ins.component();

        if (c.type === "local") throw new LegacyVectorParseError("この関数ではキャレット表記法の入力は無効です");
        if (!ins.isOver()) throw new LegacyVectorParseError("成分の解析終了後に無効な文字列を検知しました");

        return c;
    }
}
