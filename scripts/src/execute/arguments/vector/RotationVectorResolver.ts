import { DualAxisRotationBuilder } from "../../../util/Vector";
import { CommandSourceStack } from "../../CommandSourceStack";
import { AbstractVectorResolver, VectorComponent, VectorComponentType } from "./AbstractVectorResolver";

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