import { Entity } from "@minecraft/server";
import { EntitySelector } from "../arguments/selector/EntitySelector";
import { PositionVectorResolver } from "../arguments/vector/PositionVectorResolver";
import { CommandSourceStack } from "../CommandSourceStack";
import { ForkableSubCommand, RedirectableSubCommand } from "./AbstractSubCommand";

export class Positioned extends RedirectableSubCommand {
    private readonly posVecResolver: PositionVectorResolver;

    public constructor(posVecResolver: PositionVectorResolver) {
        super();
        this.posVecResolver = posVecResolver;
    }

    public redirect(stack: CommandSourceStack): void {
        stack.setPosition(this.posVecResolver.resolve(stack));
    }

    public getPositionVectorResolver(): PositionVectorResolver {
        return this.posVecResolver;
    }

    public getName(): string {
        return "positioned";
    }
}

export class PositionedAs extends ForkableSubCommand {
    public constructor(selector: EntitySelector) {
        super(selector);
    }

    public override fork(stack: CommandSourceStack, entity: Entity): void {
        stack.setPosition(entity);
    }

    public getName(): string {
        return "positioned as";
    }
}
