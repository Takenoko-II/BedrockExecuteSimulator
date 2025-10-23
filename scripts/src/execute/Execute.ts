import { CommandSourceStack } from "./CommandSourceStack";
import { Align, Anchored, As, At, Facing, FacingEntity, IfBlock, IfBlocks, IfEntity, IfScoreCompare, IfScoreMatches, In, Positioned, PositionedAs, Rotated, RotatedAs, ScanMode, SubCommand, UnlessBlock, UnlessBlocks, UnlessEntity, UnlessScoreCompare, UnlessScoreMatches } from "./SubCommand";
import { VectorReader } from "./arguments/VectorResolver";
import { AnchorType } from "./arguments/EntityAnchor";
import { AxesReader } from "./arguments/AxesReader";
import { DimensionTypes } from "@minecraft/server";
import { ScoreAccess, ScoreComparator } from "./arguments/ScoreAccess";
import { BlockReader } from "./arguments/BlockReader";
import { EntitySelectorParser } from "./arguments/EntitySelector";
import { sentry } from "../lib/TypeSentry";

interface IPositioned {
    readonly $: (position: string) => Execute;

    readonly as: (selector: string) => Execute;
}

interface IRotated {
    readonly $: (rotation: string) => Execute;

    readonly as: (selector: string) => Execute;
}

interface IFacing {
    readonly $: (position: string) => Execute;

    readonly entity: (selector: string, anchor: AnchorType) => Execute;
}

interface IGuardSubCommand {
    readonly entity: (selector: string) => Execute;

    readonly block: (position: string, blockInfo: string) => Execute;

    readonly blocks: (begin: string, end: string, destination: string, scanMode: ScanMode) => Execute;

    readonly score: (scoreHolder: string, objective: string) => IScoreGuard;
}

interface IScoreGuard {
    readonly $: (comparator: ScoreComparator, scoreHolderOther: string, objectiveOther: string) => Execute;

    readonly matches: (range: string) => Execute;
}

export class Execute {
    private readonly root: CommandSourceStack;

    private readonly subCommands: SubCommand[] = [];

    public constructor();

    public constructor(root: CommandSourceStack);

    public constructor(root: CommandSourceStack = new CommandSourceStack()) {
        this.root = root;
    }

    public as(selector: string): Execute {
        this.subCommands.push(new As(EntitySelectorParser.readSelector(selector)));
        return this;
    }

    public at(selector: string): Execute {
        this.subCommands.push(new At(EntitySelectorParser.readSelector(selector)));
        return this;
    }

    public readonly positioned: IPositioned = {
        $: (position) => {
            this.subCommands.push(new Positioned(VectorReader.readPosition(position)));
            return this;
        },
        as: (selector) => {
            this.subCommands.push(new PositionedAs(EntitySelectorParser.readSelector(selector)));
            return this;
        }
    }

    public readonly rotated: IRotated = {
        $: (rotation) => {
            this.subCommands.push(new Rotated(VectorReader.readRotation(rotation)));
            return this;
        },
        as: (selector) => {
            this.subCommands.push(new RotatedAs(EntitySelectorParser.readSelector(selector)));
            return this;
        }
    }

    public readonly facing: IFacing = {
        $: (position) => {
            this.subCommands.push(new Facing(VectorReader.readPosition(position)));
            return this;
        },
        entity: (selector, anchor) => {
            this.subCommands.push(new FacingEntity(EntitySelectorParser.readSelector(selector), anchor));
            return this;
        }
    }

    public align(axes: string): Execute {
        this.subCommands.push(new Align(AxesReader.readAxes(axes)));
        return this;
    }

    public in(dimensionId: string): Execute {
        const dimensionType = DimensionTypes.get(dimensionId);

        if (dimensionType === undefined) {
            throw new TypeError(`ディメンションID '${dimensionId}' は無効です`);
        }

        this.subCommands.push(new In(dimensionType));
        return this;
    }

    public anchored(anchor: AnchorType): Execute {
        this.subCommands.push(new Anchored(anchor));
        return this;
    }

    public readonly if: IGuardSubCommand = {
        entity: (selector) => {
            this.subCommands.push(new IfEntity(EntitySelectorParser.readSelector(selector)));
            return this;
        },
        block: (position, blockInfo) => {
            this.subCommands.push(new IfBlock(
                VectorReader.readPosition(position),
                BlockReader.readBlock(blockInfo)
            ));
            return this;
        },
        blocks: (begin, end, destination, scanMode) => {
            this.subCommands.push(new IfBlocks(
                VectorReader.readPosition(begin),
                VectorReader.readPosition(end),
                VectorReader.readPosition(destination),
                scanMode
            ));
            return this;
        },
        score: (scoreHolder, objective) => {
            const accessA = new ScoreAccess(ScoreAccess.readScoreHolder(scoreHolder), objective);
            const that = this;

            return {
                $: (comparator, scoreHolderOther, objectiveOther) => {
                    const accessB = new ScoreAccess(ScoreAccess.readScoreHolder(scoreHolderOther), objectiveOther);
                    this.subCommands.push(new IfScoreCompare(accessA, comparator, accessB));
                    return that;
                },
                matches: (range) => {
                    this.subCommands.push(new IfScoreMatches(accessA, range));
                    return that;
                }
            };
        }
    };

    public readonly unless: IGuardSubCommand = {
        entity: (selector) => {
            this.subCommands.push(new UnlessEntity(EntitySelectorParser.readSelector(selector)));
            return this;
        },
        block: (position, blockInfo) => {
            this.subCommands.push(new UnlessBlock(
                VectorReader.readPosition(position),
                BlockReader.readBlock(blockInfo)
            ));
            return this;
        },
        blocks: (begin, end, destination, scanMode) => {
            this.subCommands.push(new UnlessBlocks(
                VectorReader.readPosition(begin),
                VectorReader.readPosition(end),
                VectorReader.readPosition(destination),
                scanMode
            ));
            return this;
        },
        score: (scoreHolder, objective) => {
            const accessA = new ScoreAccess(ScoreAccess.readScoreHolder(scoreHolder), objective);
            const that = this;

            return {
                $: (comparator, scoreHolderOther, objectiveOther) => {
                    const accessB = new ScoreAccess(ScoreAccess.readScoreHolder(scoreHolderOther), objectiveOther);
                    this.subCommands.push(new UnlessScoreCompare(accessA, comparator, accessB));
                    return that;
                },
                matches: (range) => {
                    this.subCommands.push(new UnlessScoreMatches(accessA, range));
                    return that;
                }
            };
        }
    };

    private execute(callbackFn: (stack: CommandSourceStack) => void, stack: CommandSourceStack, index: number): boolean {
        if (index > this.subCommands.length - 1) {
            return true;
        }

        const subCommand: SubCommand = this.subCommands[index];
        const forks: CommandSourceStack[] = subCommand.apply(stack);

        for (const fork of forks) {
            const isFinalSubCommand: boolean = this.execute(callbackFn, fork, index + 1);
            if (isFinalSubCommand) callbackFn(fork);
        }

        return false;
    }

    public run(callbackFn: (stack: CommandSourceStack) => void): void;

    public run(command: string): void;

    public run(value: ((stack: CommandSourceStack) => void) | string): void {
        if (typeof value === "string") {
            this.execute(stack => stack.runCommand(value), this.root, 0);
        }
        else {
            this.execute(value, this.root, 0);
        }
    }

    public buildIterator(): ExecuteForkIterator {
        return new ExecuteForkIterator(this.root.clone(), this.subCommands);
    }
}

export interface Fork {
    readonly stack: CommandSourceStack | undefined;

    readonly subCommand: SubCommand;

    readonly final: boolean;
}

interface InternalIteratorWrapper<T> {
    readonly likelyToBeDone: boolean;

    readonly fork: T;
}

export class ExecuteForkIterator implements Iterator<Fork, Fork, void> {
    private readonly generator: Generator<InternalIteratorWrapper<Fork>, boolean, void>

    public constructor(public readonly root: CommandSourceStack, public readonly subCommands: SubCommand[]) {
        this.generator = this.fork(root);
    }

    public next(): IteratorResult<Fork, Fork> {
        const { value } = this.generator.next();

        if (sentry.boolean.test(value)) {
            throw new Error();
        }

        return {
            done: value.likelyToBeDone,
            value: value.fork
        };
    }

    private *fork(stack: CommandSourceStack, index: number = 0, root: CommandSourceStack = stack): Generator<InternalIteratorWrapper<Fork>, boolean, void> {
        if (index > this.subCommands.length - 1) {
            return true;
        }

        const subCommand: SubCommand = this.subCommands[index];
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
