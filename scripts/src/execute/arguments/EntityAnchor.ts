import { Entity, Vector3 } from "@minecraft/server";
import { Vector3Builder } from "../../util/Vector";

export type AnchorType = "eyes" | "feet";

export class EntityAnchor {
    private source: Entity | Vector3;

    private type: AnchorType = "feet";

    public constructor() {}

    public getType(): AnchorType {
        return this.type;
    }

    private getEyeHeight(): number {
        if (this.source instanceof Entity) {
            if (this.source.isValid) return this.source.getHeadLocation().y - this.source.location.y;
            else throw new Error();
        }
        else {
            return 0;
        }
    }

    public getOffset(): Vector3Builder {
        return new Vector3Builder(0, this.getEyeHeight(), 0);
    }

    public getPositionSource(): Entity | Vector3 {
        return this.source ?? Vector3Builder.zero();
    }

    public write(type: AnchorType): void;

    public write(source: Entity | Vector3): void;

    public write(entityAnchor: EntityAnchor): void;

    public write(value: EntityAnchor | Entity | Vector3 | AnchorType): void {
        if (value instanceof EntityAnchor) {
            this.type = value.type;
            this.source = value.source;
        }
        else if (value === "eyes" || value === "feet") {
            this.type = value;
        }
        else {
            this.source = value;
        }
    }
}
