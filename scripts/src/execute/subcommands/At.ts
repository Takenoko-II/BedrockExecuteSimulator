import { EntitySelector } from "../arguments/selector/EntitySelector";
import { CommandSourceStack } from "../CommandSourceStack";
import { ForkableSubCommand } from "./AbstractSubCommand";

export class At extends ForkableSubCommand {
    public constructor(selector: EntitySelector) {
        super(selector);
    }

    public override fork(stack: CommandSourceStack): CommandSourceStack[] {
        return this.selector.getEntities(stack).map(entity => {
            return stack.clone(css => {
                css.setDimension(entity.dimension);
                css.setPosition(entity);
                css.setRotation(entity.getRotation());
            });
        });
    }

    public toString(): string {
        return "at";
    }
}
