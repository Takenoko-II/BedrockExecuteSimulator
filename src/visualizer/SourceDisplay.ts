import { DebugLine, DebugArrow, DebugSphere, DebugShape, debugDrawer, DebugText } from "@minecraft/debug-utilities";
import { CommandSourceStack } from "../execute/CommandSourceStack";

export class SourceDisplay {
    private readonly shapes: Set<DebugShape> = new Set();

    public constructor(private readonly stack: CommandSourceStack) {}

    public show() {
        if (this.shapes.size > 0) {
            return;
        }

        const location = this.stack.getDimensionLocation();

        const executor = this.stack.getExecutorOrUndefined();
        if (executor) {
            const line = new DebugLine(executor.location, location);
            line.color.red = 1;
            this.shapes.add(line);
        }
        const executorName = executor === undefined
            ? "NULL"
            : executor.nameTag.length === 0
                ? executor.typeId
                : `${executor.nameTag} (${executor.typeId})`;

        const sphere = new DebugSphere(location);
        sphere.scale = 0.5;
        this.shapes.add(sphere);

        const arrow = new DebugArrow(location, this.stack.getRotation().getDirection3d().add(location));
        this.shapes.add(arrow);

        const text = new DebugText(location, [
            `EXECUTOR: ${executorName}`,
            `POSITION: ${this.stack.getPosition().toString()}`,
            `ROTATION: ${this.stack.getRotation().toString()}`,
            `DIMENSION: ${this.stack.getDimension().id}`
        ].join('\n'));
        text.scale = 0.25;
        this.shapes.add(text);

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
