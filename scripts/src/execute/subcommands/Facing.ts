import { EntitySelector } from "../arguments/selector/EntitySelector";
import { PositionVectorResolver } from "../arguments/vector/PositionVectorResolver";
import { CommandSourceStack, EntityAnchor } from "../CommandSourceStack";
import { ForkableSubCommand, RedirectableSubCommand } from "./AbstractSubCommand";

export class Facing extends RedirectableSubCommand {
    private readonly posVecResolver: PositionVectorResolver;

    public constructor(posVecResolver: PositionVectorResolver) {
        super();
        this.posVecResolver = posVecResolver;
    }

    public redirect(stack: CommandSourceStack): CommandSourceStack {
        return stack.clone(css => {
            const dir = css.getPosition().getDirectionTo(this.posVecResolver.resolve(stack));
            css.setRotation(dir.getRotation2d());
        });
    }

    public toString(): string {
        return "facing";
    }
}

export class FacingEntity extends ForkableSubCommand {
    private readonly entityAnchor: EntityAnchor;

    public constructor(selector: EntitySelector, anchorType: EntityAnchor) {
        super(selector);
        this.entityAnchor = anchorType;
    }

    public fork(stack: CommandSourceStack): CommandSourceStack[] {
        return this.selector.getEntities(stack).map(entity => {
            return stack.clone(css => {
                const to = this.entityAnchor === "eyes" ? entity.getHeadLocation() : entity.location;
                const dir = css.getPosition().getDirectionTo(to);
                css.setRotation(dir.getRotation2d());
            });
        });
    }

    public toString(): string {
        return "facing entity";
    }
}
