import { CommandSourceStack, EntityAnchor } from "./CommandSourceStack";
import { DimensionTypes, world } from "@minecraft/server";
import { ScoreAccess, ScoreComparator } from "./arguments/score/ScoreAccess";
import { sentry } from "../lib/TypeSentry";
import { BlockPredicateParser } from "./arguments//block/BlockPredicateParser";
import { AxisSetParser } from "./arguments//axis/AxisSetParser";
import { EntitySelectorParser } from "./arguments/selector/EntitySelectorParser";
import { VectorParser } from "./arguments/vector/VectorParser";
import { IfBlock, IfBlocks, IfEntity, IfScoreCompare, IfScoreMatches, ScanMode } from "./subcommands/If";
import { SubCommand } from "./subcommands/AbstractSubCommand";
import { At } from "./subcommands/At";
import { As } from "./subcommands/As";
import { Positioned, PositionedAs } from "./subcommands/Positioned";
import { Rotated, RotatedAs } from "./subcommands/Rotated";
import { Facing, FacingEntity } from "./subcommands/Facing";
import { Align } from "./subcommands/Align";
import { In } from "./subcommands/In";
import { Anchored } from "./subcommands/Anchored";
import { UnlessBlock, UnlessBlocks, UnlessEntity, UnlessScoreCompare, UnlessScoreMatches } from "./subcommands/Unless";
import { ExecuteForkIterator } from "./ExecuteForkIterator";

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

    readonly entity: (selector: string, anchor: EntityAnchor) => Execute;
}

interface IGuardSubCommand {
    readonly entity: (selector: string) => Execute;

    readonly block: (position: string, blockPredicate: string) => Execute;

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
            this.subCommands.push(new Positioned(VectorParser.readPositionVector(position)));
            return this;
        },
        as: (selector) => {
            this.subCommands.push(new PositionedAs(EntitySelectorParser.readSelector(selector)));
            return this;
        }
    }

    public readonly rotated: IRotated = {
        $: (rotation) => {
            this.subCommands.push(new Rotated(VectorParser.readRotationVector(rotation)));
            return this;
        },
        as: (selector) => {
            this.subCommands.push(new RotatedAs(EntitySelectorParser.readSelector(selector)));
            return this;
        }
    }

    public readonly facing: IFacing = {
        $: (position) => {
            this.subCommands.push(new Facing(VectorParser.readPositionVector(position)));
            return this;
        },
        entity: (selector, anchor) => {
            this.subCommands.push(new FacingEntity(EntitySelectorParser.readSelector(selector), anchor));
            return this;
        }
    }

    public align(axisSet: string): Execute {
        this.subCommands.push(new Align(AxisSetParser.readAxisSet(axisSet)));
        return this;
    }

    public in(dimensionId: string): Execute {
        const dimensionType = DimensionTypes.get(dimensionId);

        if (dimensionType === undefined) {
            throw new TypeError(`ディメンションID '${dimensionId}' は無効です`);
        }

        this.subCommands.push(new In(world.getDimension(dimensionId.toLowerCase())));
        return this;
    }

    public anchored(anchor: EntityAnchor): Execute {
        this.subCommands.push(new Anchored(anchor));
        return this;
    }

    public readonly if: IGuardSubCommand = {
        entity: (selector) => {
            this.subCommands.push(new IfEntity(EntitySelectorParser.readSelector(selector)));
            return this;
        },
        block: (position, blockPredicate) => {
            this.subCommands.push(new IfBlock(
                VectorParser.readPositionVector(position),
                BlockPredicateParser.readBlockPredicate(blockPredicate)
            ));
            return this;
        },
        blocks: (begin, end, destination, scanMode) => {
            this.subCommands.push(new IfBlocks(
                VectorParser.readPositionVector(begin),
                VectorParser.readPositionVector(end),
                VectorParser.readPositionVector(destination),
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
        block: (position, blockPredicate) => {
            this.subCommands.push(new UnlessBlock(
                VectorParser.readPositionVector(position),
                BlockPredicateParser.readBlockPredicate(blockPredicate)
            ));
            return this;
        },
        blocks: (begin, end, destination, scanMode) => {
            this.subCommands.push(new UnlessBlocks(
                VectorParser.readPositionVector(begin),
                VectorParser.readPositionVector(end),
                VectorParser.readPositionVector(destination),
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

