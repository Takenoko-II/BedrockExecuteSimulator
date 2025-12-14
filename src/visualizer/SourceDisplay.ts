import { DebugLine, DebugArrow, DebugSphere, DebugShape, debugDrawer } from "@minecraft/debug-utilities";
import { CommandSourceStack } from "../execute/CommandSourceStack";

export enum SourceTypeFlag {
    EXECUTOR = "executor",
    POSITION = "position",
    ROTATION = "rotation"
}

export interface SourceDisplayOptions {
    readonly flags: ReadonlySet<SourceTypeFlag>;
}

export class SourceDisplay {
    private readonly shapes: Set<DebugShape> = new Set();

    public constructor(private readonly stack: CommandSourceStack, private readonly options: SourceDisplayOptions) {}

    public show() {
        if (this.shapes.size > 0) {
            return;
        }

        const location = this.stack.getDimensionLocation();

        if (this.options.flags.has(SourceTypeFlag.EXECUTOR)) {
            const exec = this.stack.getExecutorOrUndefined();
            if (exec) {
                const line = new DebugLine(location, exec.location);
                line.color = { red: 1, green: 0, blue: 0 };
                this.shapes.add(line);
            }
        }

        const sphere = new DebugSphere(location);
        sphere.scale = 0.25;
        this.shapes.add(sphere);

        const arrow = new DebugArrow(location, this.stack.getRotation().getDirection3d().add(location));
        sphere.scale = 0.25;
        this.shapes.add(arrow);

        this.shapes.forEach(shape => {
            debugDrawer.addShape(shape);
        });
    }

    public hide() {
        this.shapes.forEach(s => {
            s.remove();
        });
        this.shapes.clear();
    }
}
