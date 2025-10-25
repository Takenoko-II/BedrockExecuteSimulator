import { Dimension } from "@minecraft/server";
import { RedirectableSubCommand } from "./AbstractSubCommand";
import { CommandSourceStack } from "../CommandSourceStack";

export class In extends RedirectableSubCommand {
    private readonly dimension: Dimension;

    public constructor(dimension: Dimension) {
        super();
        this.dimension = dimension;
    }

    public redirect(stack: CommandSourceStack): CommandSourceStack {
        return stack.clone(css => css.setDimension(this.dimension));
    }

    public toString(): string {
        return "in";
    }
}
