import { ImmutableRegistries, Registries, RegistryKey } from "../../util/Registry";
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

export abstract class AbstractVectorResolver {}

export class PositionVectorResolver extends AbstractVectorResolver {
    public constructor(private readonly x: VectorComponent, private readonly y: VectorComponent, private readonly z: VectorComponent) {
        super();
    }
}

export class VectorParser extends AbstractParser<AbstractVectorResolver, VectorParseError> {
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
            const number = this.number(ignore);
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

    private component(blockCenterCorrection: boolean): VectorComponent {
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

    private position(): PositionVectorResolver {
        // ~00, 000, ~~0 のようなものはパース方法的に勝手に弾かれる
        const x = this.component(true);
        const y = this.component(false);
        const z = this.component(true);

        return new PositionVectorResolver(x, y, z);
    }

    protected override parse(): AbstractVectorResolver {
        throw this.exception("他のメソッドを使用してください");
    }
}
