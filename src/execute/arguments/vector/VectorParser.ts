import { sentry } from "@typesentry";
import { DualAxisRotationBuilder, Vector3Builder } from "@utils/Vector";
import { AbstractParser } from "../AbstractParser";
import { AbstractVectorResolver, VectorComponent, VectorComponentType } from "./AbstractVectorResolver";
import { PositionVectorResolver } from "./PositionVectorResolver";
import { RotationVectorResolver } from "./RotationVectorResolver";

export class VectorParseError extends Error {}

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
