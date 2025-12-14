import { Entity } from "@minecraft/server";
import { EntitySelector } from "../arguments/selector/EntitySelector";
import { RotationVectorResolver } from "../arguments/vector/RotationVectorResolver";
import { CommandSourceStack } from "../CommandSourceStack";
import { ForkableSubCommand, RedirectableSubCommand } from "./AbstractSubCommand";

export class Rotated extends RedirectableSubCommand {
    private readonly rotVecResolver: RotationVectorResolver;

    public constructor(rotVecResolver: RotationVectorResolver) {
        super();
        this.rotVecResolver = rotVecResolver;
    }

    public redirect(stack: CommandSourceStack): void {
        stack.setRotation(this.rotVecResolver.resolve(stack));
    }

    public getRotationVectorResolver(): RotationVectorResolver {
        return this.rotVecResolver;
    }

    public getName(): string {
        return "rotated";
    }
}

export class RotatedAs extends ForkableSubCommand {
    public constructor(selector: EntitySelector) {
        super(selector);
    }

    public override fork(stack: CommandSourceStack, entity: Entity): void {
        stack.setRotation(entity);
    }

    public getName(): string {
        return "rotated as";
    }
}
