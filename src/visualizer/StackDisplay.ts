import { DebugLine, DebugArrow, DebugSphere, DebugShape, debugDrawer } from "@minecraft/debug-utilities";
import { CommandSourceStack } from "../execute/CommandSourceStack";

export class StackDisplay {
    private readonly shapes: Set<DebugShape> = new Set();

    public constructor(private readonly stack: CommandSourceStack) {}

    public add() {
        if (this.shapes.size > 0) {
            return;
        }

        const loc = this.stack.getLocation();

        const sphere = new DebugSphere(loc);
        sphere.scale = 0.25;
        this.shapes.add(sphere);

        const arrow = new DebugArrow(loc, this.stack.getRotation().getDirection3d().add(loc));
        sphere.scale = 0.25;
        this.shapes.add(arrow);

        const exec = this.stack.getUndefinedableExecutor();
        if (exec) {
            const line = new DebugLine(loc, exec.location);
            line.color = { red: 1, green: 0, blue: 0 };
            this.shapes.add(line);
        }

        this.shapes.forEach(shape => {
            debugDrawer.addShape(shape);
        });
    }

    public remove() {
        this.shapes.forEach(s => {
            s.remove();
        });
        this.shapes.clear();
    }
}
