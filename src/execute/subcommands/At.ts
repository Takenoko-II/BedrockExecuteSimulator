import { Entity } from "@minecraft/server";
import { EntitySelector } from "../arguments/selector/EntitySelector";
import { CommandSourceStack } from "../CommandSourceStack";
import { ForkableSubCommand } from "./AbstractSubCommand";

export class At extends ForkableSubCommand {
    public constructor(selector: EntitySelector) {
        super(selector);
    }

    public override fork(stack: CommandSourceStack, entity: Entity): void {
        stack.setDimension(entity.dimension);
        stack.setPosition(entity);
        stack.setRotation(entity.getRotation());
    }

    public getName(): string {
        return "at";
    }
}
