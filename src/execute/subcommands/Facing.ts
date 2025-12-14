import { Entity } from "@minecraft/server";
import { EntitySelector } from "../arguments/selector/EntitySelector";
import { PositionVectorResolver } from "../arguments/vector/PositionVectorResolver";
import { CommandSourceStack } from "../CommandSourceStack";
import { ForkableSubCommand, RedirectableSubCommand } from "./AbstractSubCommand";
import { EntityAnchorType } from "./Anchored";

export class Facing extends RedirectableSubCommand {
    private readonly posVecResolver: PositionVectorResolver;

    public constructor(posVecResolver: PositionVectorResolver) {
        super();
        this.posVecResolver = posVecResolver;
    }

    public redirect(stack: CommandSourceStack): void {
        const dir = stack.getPosition().getDirectionTo(this.posVecResolver.resolve(stack));
        stack.setRotation(dir.getRotation2f());
    }

    public getPositionvectorResolver(): PositionVectorResolver {
        return this.posVecResolver;
    }

    public getName(): string {
        return "facing";
    }
}

export class FacingEntity extends ForkableSubCommand {
    private readonly entityAnchor: EntityAnchorType;

    public constructor(selector: EntitySelector, entityAnchor: EntityAnchorType) {
        super(selector);
        this.entityAnchor = entityAnchor;
    }

    public override fork(stack: CommandSourceStack, entity: Entity): void {
        const to = this.entityAnchor === "eyes" ? entity.getHeadLocation() : entity.location;
        const dir = stack.getPosition().getDirectionTo(to);
        stack.setRotation(dir.getRotation2f());
    }

    public getEntityAnchor(): EntityAnchorType {
        return this.entityAnchor;
    }

    public getName(): string {
        return "facing entity";
    }
}
