import { CommandSourceStack, EntityAnchor } from "../CommandSourceStack";
import { RedirectableSubCommand } from "./AbstractSubCommand";

export class Anchored extends RedirectableSubCommand {
    private readonly entityAnchor: EntityAnchor;

    public constructor(entityanchor: EntityAnchor) {
        super();
        this.entityAnchor = entityanchor;
    }

    public redirect(stack: CommandSourceStack): void {
        stack.applyAnchor(this.entityAnchor);
    }

    public getEntityAnchor(): EntityAnchor {
        return this.entityAnchor;
    }

    public toString(): string {
        return "anchored";
    }
}
