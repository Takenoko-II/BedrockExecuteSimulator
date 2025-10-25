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

    public redirect(stack: CommandSourceStack): CommandSourceStack {
        return stack.clone(css => css.setPosition(this.posVecResolver.resolve(css)));
    }

    public toString(): string {
        return "positioned";
    }
}

export class PositionedAs extends ForkableSubCommand {
    public constructor(selector: EntitySelector) {
        super(selector);
    }

    public fork(stack: CommandSourceStack): CommandSourceStack[] {
        return this.selector.getEntities(stack).map(entity => {
            return stack.clone(css => css.setPosition(entity));
        });
    }

    public toString(): string {
        return "positioned as";
    }
}
