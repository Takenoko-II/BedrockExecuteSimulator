import { EntitySelector } from "../arguments/selector/EntitySelector";
import { CommandSourceStack } from "../CommandSourceStack";
import { ForkableSubCommand } from "./AbstractSubCommand";

export class As extends ForkableSubCommand {
    public constructor(selector: EntitySelector) {
        super(selector);
    }

    public override fork(stack: CommandSourceStack): CommandSourceStack[] {
        return this.selector.getEntities(stack).map(entity => {
            return stack.clone(css => css.setExecutor(entity));
        });
    }

    public toString(): string {
        return "as";
    }
}
