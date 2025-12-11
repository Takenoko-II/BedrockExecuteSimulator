import { sentry } from "@typesentry";
import { CommandSourceStack } from "./CommandSourceStack";
import { SubCommand } from "./subcommands/AbstractSubCommand";

export interface ForkIteratorBuildOptions {
    run?(stack: CommandSourceStack, subCommand: SubCommand): void;
}

export interface Fork {
    readonly stack: CommandSourceStack | undefined;

    readonly subCommand: SubCommand;

    readonly final: boolean;
}

interface IteratorDoneDetector<T> {
    readonly likelyToBeDone: boolean;

    readonly fork: T;
}

export type ExecuteForkIteratorResult = IteratorResult<Fork, Fork>;

export class ExecuteForkIterator implements Iterator<Fork, Fork, void> {
    private readonly generator: Generator<IteratorDoneDetector<Fork>, boolean, void>

    public constructor(public readonly root: CommandSourceStack, public readonly subCommands: SubCommand[], private readonly options: ForkIteratorBuildOptions) {
        this.generator = this.fork(root);
    }

    public next(): ExecuteForkIteratorResult {
        const { value } = this.generator.next();

        if (sentry.boolean.test(value)) {
            throw new Error("シーケンスの最後の値は既に消費されています");
        }

        if (value.fork.final && value.fork.stack && this.options.run) {
            this.options.run(value.fork.stack, value.fork.subCommand);
        }

        return {
            done: value.likelyToBeDone,
            value: value.fork
        };
    }

    private *fork(stack: CommandSourceStack, index: number = 0, root: CommandSourceStack = stack): Generator<IteratorDoneDetector<Fork>, boolean, void> {
        if (index > this.subCommands.length - 1) {
            return true;
        }

        const subCommand: SubCommand = this.subCommands[index]!;
        const forks: CommandSourceStack[] = subCommand.apply(stack);

        let i = -1;
        for (const fork of forks) {
            i++;
            const isFinalSubCommand: boolean = yield* this.fork(fork, index + 1, root);
            yield {
                fork: {
                    stack: fork,
                    final: isFinalSubCommand,
                    subCommand
                },
                likelyToBeDone: i === forks.length - 1 && stack === root
            }
        }

        if (forks.length === 0) {
            yield {
                fork: {
                    stack: undefined,
                    final: true,
                    subCommand
                },
                likelyToBeDone: true
            }
        }

        return false;
    }

    public [Symbol.iterator](): ExecuteForkIterator {
        return this;
    }
}
