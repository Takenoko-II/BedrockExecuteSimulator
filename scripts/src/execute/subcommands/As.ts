import { Entity } from "@minecraft/server";
import { EntitySelector } from "../arguments/selector/EntitySelector";
import { CommandSourceStack } from "../CommandSourceStack";
import { ForkableSubCommand } from "./AbstractSubCommand";

export class As extends ForkableSubCommand {
    public constructor(selector: EntitySelector) {
        super(selector);
    }

    public override fork(stack: CommandSourceStack, entity: Entity): void {
        stack.setExecutor(entity);
    }

    public toString(): string {
        return "as";
    }
}
