import { DebugLine, DebugArrow, DebugText, debugDrawer } from "@minecraft/debug-utilities";
import { ExecuteForkIterator, Fork } from "./ExecuteForkIterator";
import { CommandSourceStack } from "./CommandSourceStack";

class ExecuteVisualizer {
    private done: boolean = false;

    private index: number = 0;

    private readonly forks: Fork[] = [];

    public constructor(private readonly iterator: ExecuteForkIterator) {

    }

    private getPreviousStack(): CommandSourceStack | undefined {
        return this.index === 0
            ? this.iterator.root
            : this.forks[this.index - 1].stack === undefined
                ? (i)
                : this.forks[this.index - 1].stack
    }

    public next() {
        if (this.done) return;

        const { done, value } = this.iterator.next();

        if (value.stack === undefined) {
            this.stop(this.getPreviousStack());
        }

        if (this.forks.length === 0) {
            this.start(value.stack);
        }
        else if (value.final) {
            this.complete(value.stack);
        }
        else {
            const previous = this.getPreviousStack();
            const current = value.stack;

            if (previous === undefined) {
                this.start(current);
            }

            this.connect()
        }

        this.forks.push(value);
        this.index++;

        if (done) {
            this.done = true;
        }
    }

    private start(stack: CommandSourceStack | undefined) {

    }

    private connect(previous: CommandSourceStack | undefined, current: CommandSourceStack | undefined) {

    }

    private complete(stack: CommandSourceStack | undefined) {

    }
}
