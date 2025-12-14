import { Entity } from "@minecraft/server";
import { Vector3Builder } from "@utils/Vector";
import { CommandSourceStack } from "../CommandSourceStack";
import { RedirectableSubCommand } from "./AbstractSubCommand";

export type EntityAnchorType = "eyes" | "feet";

export abstract class EntityAnchor {
    private static readonly VALUES: Map<EntityAnchorType, EntityAnchor> = new Map();

    protected constructor(public readonly type: EntityAnchorType) {
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
    private readonly entityAnchor: EntityAnchor;

    public constructor(entityAnchorType: EntityAnchorType) {
        super();
        this.entityAnchor = EntityAnchor.get(entityAnchorType);
    }

    public redirect(stack: CommandSourceStack): void {
        stack.applyAnchor(this.entityAnchor);
    }

    public getEntityAnchor(): EntityAnchor {
        return this.entityAnchor;
    }

    public getName(): string {
        return "anchored";
    }
}
