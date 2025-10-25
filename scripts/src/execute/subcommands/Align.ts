import { AxisSet } from "../arguments/axis/AxisSet";
import { CommandSourceStack } from "../CommandSourceStack";
import { RedirectableSubCommand } from "./AbstractSubCommand";

export class Align extends RedirectableSubCommand {
    private readonly axisSet: AxisSet;

    public constructor(axisSet: AxisSet) {
        super();
        this.axisSet = axisSet;
    }

    public redirect(stack: CommandSourceStack): CommandSourceStack {
        return stack.clone(css => {
            const pos = css.getPosition();
            this.axisSet.floor(pos);
            css.setPosition(pos);
        });
    }

    public toString(): string {
        return "align";
    }
}
