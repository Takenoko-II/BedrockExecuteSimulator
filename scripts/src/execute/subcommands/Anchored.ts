import { Entity, Vector3 } from "@minecraft/server";
import { Vector3Builder } from "../../util/Vector";
import { CommandSourceStack } from "../CommandSourceStack";
import { RedirectableSubCommand } from "./AbstractSubCommand";

export type EntityAnchorType = "eyes" | "feet";

export abstract class EntityAnchor {
    private static readonly VALUES: Map<EntityAnchorType, EntityAnchor> = new Map();

    protected constructor(protected readonly type: EntityAnchorType) {
        EntityAnchor.VALUES.set(type, this);
    }

    public abstract transform(position: Vector3Builder | Entity): Vector3Builder;

    public static readonly EYES = new class extends EntityAnchor {
        public constructor() {
            super("eyes");
        }

        public override transform(position: Vector3Builder | Entity): Vector3Builder {
            if (!(position instanceof Entity)) return position;

            return Vector3Builder.from(position.getHeadLocation());
        }
    }();

    public static readonly FEET = new class extends EntityAnchor {
        public constructor() {
            super("feet");
        }

        public override transform(position: Vector3Builder | Entity): Vector3Builder {
            if (!(position instanceof Entity)) return position;

            return Vector3Builder.from(position.location);
        }
    }();

    public static get(type: EntityAnchorType): EntityAnchor {
        return EntityAnchor.VALUES.get(type)!;
    }
}

export class Anchored extends RedirectableSubCommand {
    private readonly entityAnchor: EntityAnchorType;

    public constructor(entityanchor: EntityAnchorType) {
        super();
        this.entityAnchor = entityanchor;
    }

    public redirect(stack: CommandSourceStack): void {
        stack.applyAnchor(this.entityAnchor);
    }

    public getEntityAnchorType(): EntityAnchorType {
        return this.entityAnchor;
    }

    public toString(): string {
        return "anchored";
    }
}
