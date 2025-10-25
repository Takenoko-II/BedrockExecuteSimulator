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

    public redirect(stack: CommandSourceStack): CommandSourceStack {
        return stack.clone(css => css.setRotation(this.rotVecResolver.resolve(css)));
    }

    public toString(): string {
        return "rotated";
    }
}

export class RotatedAs extends ForkableSubCommand {
    public constructor(selector: EntitySelector) {
        super(selector);
    }

    public fork(stack: CommandSourceStack): CommandSourceStack[] {
        return this.selector.getEntities(stack).map(entity => {
            return stack.clone(css => css.setRotation(entity));
        });
    }

    public toString(): string {
        return "rotated as";
    }
}