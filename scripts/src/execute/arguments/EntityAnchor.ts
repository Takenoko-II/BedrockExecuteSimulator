import { Vector3Builder } from "../../util/Vector";
import { CommandSourceStack } from "../CommandSourceStack";

export type AnchorType = "eyes" | "feet";

export class EntityAnchor {
    private readonly stack: CommandSourceStack;

    private type: AnchorType = "feet";

    public constructor(stack: CommandSourceStack) {
        this.stack = stack;
    }

    public getType(): AnchorType {
        return this.type;
    }

    public setType(type: AnchorType): void {
        this.type = type;
    }

    public getOffsetBedrock(): Vector3Builder {
        if (this.type === "eyes") {
            if (this.stack.getPositionDataType() === "EntityUUID") {
                return new Vector3Builder(0, this.stack.getEyeHeight(), 0);
            }
            else {
                return Vector3Builder.zero();
            }
        }
        else {
            return Vector3Builder.zero();
        }
    }

    public getOffsetJava(): Vector3Builder {
        if (this.type === "eyes") {
            if (this.stack.hasExecutor()) {
                const entity = this.stack.getExecutor();
                return Vector3Builder.from(entity.getHeadLocation()).subtract(entity.location);
            }
            else return Vector3Builder.zero();
        }
        else {
            return Vector3Builder.zero();
        }
    }
}
