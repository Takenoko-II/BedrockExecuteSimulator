import { sentry } from "../../lib/TypeSentry";
import { DualAxisRotationBuilder, TripleAxisRotationBuilder, Vector3Builder } from "../../util/Vector";
import { CommandSourceStack } from "../CommandSourceStack";
import { AbstractParser } from "./AbstractParser";

export class VectorParseError extends Error {}

export enum VectorComponentType {
    ABSOLUTE = "ABSOLUTE",
    RELATIVE = "RELATIVE",
    LOCAL = "LOCAL"
}

export interface VectorComponent {
    readonly type: VectorComponentType;

    readonly value: number;
}

export abstract class AbstractVectorResolver<T> {
    public abstract resolve(stack: CommandSourceStack): T;
}

export class PositionVectorResolver extends AbstractVectorResolver<Vector3Builder> {
    public constructor(private readonly x: VectorComponent, private readonly y: VectorComponent, private readonly z: VectorComponent) {
        super();
    }

    private isLocal(): boolean {
        return this.x.type === VectorComponentType.LOCAL && this.y.type === VectorComponentType.LOCAL && this.z.type === VectorComponentType.LOCAL;
    }

    private isAbsoluteRelative(): boolean {
        return this.x.type !== VectorComponentType.LOCAL && this.y.type !== VectorComponentType.LOCAL && this.z.type !== VectorComponentType.LOCAL;
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
    
            if (this.x.type === VectorComponentType.RELATIVE) {
                v.x += this.x.value;
            }
            else {
                v.x = this.x.value;
            }

            if (this.y.type === VectorComponentType.RELATIVE) {
                v.y += this.y.value;
            }
            else {
                v.y = this.y.value;
            }
    
            if (this.z.type === VectorComponentType.RELATIVE) {
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

export class RotationVectorResolver extends AbstractVectorResolver<DualAxisRotationBuilder> {
    public constructor(private readonly yaw: VectorComponent, private readonly pitch: VectorComponent) {
        super();
    }

    private isInvalid(): boolean {
        return this.yaw.type === VectorComponentType.LOCAL || this.pitch.type === VectorComponentType.LOCAL;
    }

    public override resolve(stack: CommandSourceStack): DualAxisRotationBuilder {
        const v = stack.getRotation();

        if (this.isInvalid()) {
            throw new TypeError("チルダ表記法とキャレット表記法を混在させることはできません");
        }

        if (this.yaw.type === VectorComponentType.RELATIVE) {
            v.yaw += this.yaw.value;
        }
        else {
            v.yaw = this.yaw.value;
        }

        if (this.pitch.type === VectorComponentType.RELATIVE) {
            v.pitch += this.pitch.value;
        }
        else {
            v.pitch = this.pitch.value;
        }

        return v;
    }
}

export abstract class VectorParser<T> extends AbstractParser<AbstractVectorResolver<T>, VectorParseError> {
    protected override getTrue(): string {
        return "true";
    }

    protected override getFalse(): string {
        return "false";
    }

    protected override getQuotes(): Set<string> {
        return new Set(['"']);
    }

    protected override getWhitespace(): Set<string> {
        return new Set([' ']);
    }

    protected override getErrorConstructor(): (message: string, cause?: Error) => VectorParseError {
        return (message, cause) => new VectorParseError(message, cause);
    }

    private type(): VectorComponentType {
        if (this.next(true, '~')) {
            return VectorComponentType.RELATIVE;
        }
        else if (this.next(true, '^')) {
            return VectorComponentType.LOCAL;
        }
        else if (this.test(true, '-', '0', '1', '2', '3', '4', '5', '6', '7', '8', '9')) {
            return VectorComponentType.ABSOLUTE;
        }
        else {
            throw this.exception("無効な成分記法です");
        }
    }

    private value(ignore: boolean, blockCenterCorrection: boolean): number {
        if (ignore) this.ignore();

        if (this.test(false, '-', '0', '1', '2', '3', '4', '5', '6', '7', '8', '9')) {
            const number = this.number(false);
            if (number.isWrittenAsInt && blockCenterCorrection) {
                return number.value + 0.5
            }
            else {
                return number.value;
            }
        }
        else {
            // 暗黙の0に中心補正は作用しない
            return 0;
        }
    }

    protected component(blockCenterCorrection: boolean): VectorComponent {
        const type = this.type();

        switch (type) {
            case VectorComponentType.ABSOLUTE: {
                return {
                    type,
                    value: this.value(true, blockCenterCorrection)
                };
            }
            case VectorComponentType.RELATIVE: {
                return {
                    type,
                    value: this.value(false, false)
                };
            }
            case VectorComponentType.LOCAL: {
                return {
                    type,
                    value: this.value(false, false)
                };
            }
        }
    }

    private static readonly Vector3Parser = class Vector3Parser extends VectorParser<Vector3Builder> {
        public override parse(): PositionVectorResolver {
            const x = this.component(true);
            const y = this.component(false);
            const z = this.component(true);

            this.finish();

            return new PositionVectorResolver(x, y, z);
        }
    }

    private static readonly Vector2Parser = class Vector2Parser extends VectorParser<DualAxisRotationBuilder> {
        public override parse(): RotationVectorResolver {
            const yaw = this.component(false);
            const pitch = this.component(false);

            this.finish();

            return new RotationVectorResolver(yaw, pitch);
        }
    }

    public static readPositionVector(position: string): PositionVectorResolver {
        return new VectorParser.Vector3Parser(position).parse();
    }

    public static readRotationVector(rotation: string): RotationVectorResolver {
        return new VectorParser.Vector2Parser(rotation).parse();
    }
}

export const VectorComponentModel = sentry.objectOf({
    type: sentry.enumLikeOf(VectorComponentType),
    value: sentry.number.nonNaN()
});
