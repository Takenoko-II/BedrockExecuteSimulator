import { DebugLine, DebugArrow, DebugSphere, DebugShape, debugDrawer } from "@minecraft/debug-utilities";
import { ExecuteForkIterator, Fork } from "./ExecuteForkIterator";
import { CommandSourceStack } from "./CommandSourceStack";

/**
 * DebugDrawerが不安定らしい
 * 現にディメンションを指定できない
 * 位置同士をつなぐというよりは変化の可視化に重点を置きたいので、同時に表示するコマンドソーススタックは基本1つ
 * フォークする場合は分岐の終点に辿り着いたCSSのみ残しておく
 */

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

class ExecuteVisualizer {
    private done: boolean = false;

    private index: number = 0;

    private readonly forks: Fork[] = [];

    public constructor(private readonly iterator: ExecuteForkIterator) {
        
    }
}
