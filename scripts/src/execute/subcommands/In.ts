import { Dimension } from "@minecraft/server";
import { RedirectableSubCommand } from "./AbstractSubCommand";
import { CommandSourceStack } from "../CommandSourceStack";

export class In extends RedirectableSubCommand {
    private readonly dimension: Dimension;

    public constructor(dimension: Dimension) {
        super();
        this.dimension = dimension;
    }

    public redirect(stack: CommandSourceStack): void {
        stack.setDimension(this.dimension);
    }

    public getDimension(): Dimension {
        return this.dimension;
    }

    public toString(): string {
        return "in";
    }
}
