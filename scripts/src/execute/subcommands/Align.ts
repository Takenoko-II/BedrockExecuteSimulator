import { AxisSet } from "../arguments/axis/AxisSet";
import { CommandSourceStack } from "../CommandSourceStack";
import { RedirectableSubCommand } from "./AbstractSubCommand";

export class Align extends RedirectableSubCommand {
    private readonly axisSet: AxisSet;

    public constructor(axisSet: AxisSet) {
        super();
        this.axisSet = axisSet;
    }

    public redirect(stack: CommandSourceStack): void {
        const pos = stack.getPosition();
        this.axisSet.floor(pos);
        stack.setPosition(pos);
    }

    public getAxisSet(): AxisSet {
        return this.axisSet;
    }

    public toString(): string {
        return "align";
    }
}
