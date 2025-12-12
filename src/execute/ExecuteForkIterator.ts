import { CommandSourceStack } from "./CommandSourceStack";
import { SubCommand } from "./subcommands/AbstractSubCommand";

export interface ForkIteratorBuildOptions {
    run?(stack: CommandSourceStack, subCommand: SubCommand): void;
}

export interface Fork {
    readonly stack: CommandSourceStack;

    readonly subCommand: SubCommand;

    readonly final: boolean;
}

export class ExecuteForkIterator implements Iterator<Fork, Fork, void> {
    private readonly generator: Generator<Fork, Fork, void>

    public constructor(public readonly root: CommandSourceStack, public readonly subCommands: SubCommand[], private readonly options: ForkIteratorBuildOptions) {
        this.generator = this.fork(root);
    }

    public next(): IteratorResult<Fork, Fork> {
        return this.generator.next();
    }

    private *fork(stack: CommandSourceStack, index: number = 0): Generator<Fork, Fork, void> {
        if (index > this.subCommands.length - 1) {
            const subCommand = this.subCommands[index - 1]!;

            if (this.options.run) this.options.run(stack, subCommand);

            return {
                final: true,
                subCommand,
                stack
            };
        }

        const subCommand: SubCommand = this.subCommands[index]!;
        const forks: CommandSourceStack[] = subCommand.apply(stack);

        for (const fork of forks) {
            yield yield* this.fork(fork, index + 1);
        }

        return {
            final: false,
            subCommand,
            stack
        };
    }

    public [Symbol.iterator](): ExecuteForkIterator {
        return this;
    }
}
