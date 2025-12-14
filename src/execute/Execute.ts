import { CommandSourceStack } from "./CommandSourceStack";
import { DimensionTypes, world } from "@minecraft/server";
import { ScoreAccess, ScoreComparator } from "./arguments/score/ScoreAccess";
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
import { Anchored, EntityAnchorType } from "./subcommands/Anchored";
import { UnlessBlock, UnlessBlocks, UnlessEntity, UnlessScoreCompare, UnlessScoreMatches } from "./subcommands/Unless";
import { ForkIterator, ForkIteratorBuildOptions } from "./ForkIterator";
import { sentry } from "@/libs/TypeSentry";

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

    readonly entity: (selector: string, anchor: EntityAnchorType) => Execute;
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

    public chainSubCommand(subCommand: SubCommand): Execute {
        this.subCommands.push(subCommand);
        return this;
    }

    public as(selector: string): Execute {
        return this.chainSubCommand(new As(EntitySelectorParser.readSelector(selector)));
    }

    public at(selector: string): Execute {
        return this.chainSubCommand(new At(EntitySelectorParser.readSelector(selector)));
    }

    public readonly positioned: IPositioned = {
        $: (position) => {
            return this.chainSubCommand(new Positioned(VectorParser.readPositionVector(position)));
        },
        as: (selector) => {
            return this.chainSubCommand(new PositionedAs(EntitySelectorParser.readSelector(selector)));
        }
    }

    public readonly rotated: IRotated = {
        $: (rotation) => {
            return this.chainSubCommand(new Rotated(VectorParser.readRotationVector(rotation)));
        },
        as: (selector) => {
            return this.chainSubCommand(new RotatedAs(EntitySelectorParser.readSelector(selector)));
        }
    }

    public readonly facing: IFacing = {
        $: (position) => {
            return this.chainSubCommand(new Facing(VectorParser.readPositionVector(position)));
        },
        entity: (selector, anchor) => {
            return this.chainSubCommand(new FacingEntity(EntitySelectorParser.readSelector(selector), anchor));
        }
    }

    public align(axisSet: string): Execute {
        return this.chainSubCommand(new Align(AxisSetParser.readAxisSet(axisSet)));
    }

    public in(dimensionId: string): Execute {
        const dimensionType = DimensionTypes.get(dimensionId);

        if (dimensionType === undefined) {
            throw new TypeError(`ディメンションID '${dimensionId}' は無効です`);
        }

        return this.chainSubCommand(new In(world.getDimension(dimensionType.typeId)));
    }

    public anchored(anchor: EntityAnchorType): Execute {
        this.chainSubCommand(new Anchored(anchor));
        return this;
    }

    public readonly if: IGuardSubCommand = {
        entity: (selector) => {
            return this.chainSubCommand(new IfEntity(EntitySelectorParser.readSelector(selector)));
        },
        block: (position, blockPredicate) => {
            return this.chainSubCommand(new IfBlock(
                VectorParser.readPositionVector(position),
                BlockPredicateParser.readBlockPredicate(blockPredicate)
            ));
        },
        blocks: (begin, end, destination, scanMode) => {
            return this.chainSubCommand(new IfBlocks(
                VectorParser.readPositionVector(begin),
                VectorParser.readPositionVector(end),
                VectorParser.readPositionVector(destination),
                scanMode
            ));
        },
        score: (scoreHolder, objective) => {
            const accessA = new ScoreAccess(ScoreAccess.readScoreHolder(scoreHolder), objective);

            return {
                $: (comparator, scoreHolderOther, objectiveOther) => {
                    const accessB = new ScoreAccess(ScoreAccess.readScoreHolder(scoreHolderOther), objectiveOther);
                    return this.chainSubCommand(new IfScoreCompare(accessA, comparator, accessB));
                },
                matches: (range) => {
                    return this.chainSubCommand(new IfScoreMatches(accessA, range));
                }
            };
        }
    };

    public readonly unless: IGuardSubCommand = {
        entity: (selector) => {
            return this.chainSubCommand(new UnlessEntity(EntitySelectorParser.readSelector(selector)));
        },
        block: (position, blockPredicate) => {
            return this.chainSubCommand(new UnlessBlock(
                VectorParser.readPositionVector(position),
                BlockPredicateParser.readBlockPredicate(blockPredicate)
            ));
        },
        blocks: (begin, end, destination, scanMode) => {
            return this.chainSubCommand(new UnlessBlocks(
                VectorParser.readPositionVector(begin),
                VectorParser.readPositionVector(end),
                VectorParser.readPositionVector(destination),
                scanMode
            ));
        },
        score: (scoreHolder, objective) => {
            const accessA = new ScoreAccess(ScoreAccess.readScoreHolder(scoreHolder), objective);
            const that = this;

            return {
                $: (comparator, scoreHolderOther, objectiveOther) => {
                    const accessB = new ScoreAccess(ScoreAccess.readScoreHolder(scoreHolderOther), objectiveOther);
                    return this.chainSubCommand(new UnlessScoreCompare(accessA, comparator, accessB));
                },
                matches: (range) => {
                    return this.chainSubCommand(new UnlessScoreMatches(accessA, range));
                }
            };
        }
    };

    private execute(callbackFn: (stack: CommandSourceStack) => void, stack: CommandSourceStack, index: number): void {
        if (index > this.subCommands.length - 1) {
            callbackFn(stack);
            return;
        }

        const subCommand: SubCommand = this.subCommands[index]!;
        const forks: CommandSourceStack[] = subCommand.apply(stack);

        for (const fork of forks) {
            this.execute(callbackFn, fork, index + 1);
        }
    }

    public run(callbackFn: (stack: CommandSourceStack) => void): void;

    public run(command: string): void;

    public run(value: ((stack: CommandSourceStack) => void) | string): void {
        if (sentry.string.test(value)) {
            this.execute(stack => stack.runCommand(value), this.root, 0);
        }
        else {
            this.execute(value, this.root, 0);
        }
    }

    public buildIterator(options?: ForkIteratorBuildOptions): ForkIterator {
        return new ForkIterator(
            this.root.clone(),
            [...this.subCommands],
            options ?? {}
        );
    }
}
