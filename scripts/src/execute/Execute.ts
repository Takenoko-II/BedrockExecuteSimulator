import { CommandSourceStack } from "./CommandSourceStack";
import { Align, Anchored, As, At, Facing, FacingEntity, IfBlock, IfBlocks, IfEntity, IfScoreCompare, IfScoreMatches, In, Positioned, PositionedAs, Rotated, RotatedAs, ScanMode, SubCommand, UnlessBlock, UnlessBlocks, UnlessEntity, UnlessScoreCompare, UnlessScoreMatches } from "./SubCommand";
import { VectorReader } from "./arguments/VectorResolver";
import { EntitySelectorReader } from "./arguments/EntitySelectorReader";
import { AnchorType } from "./arguments/EntityAnchor";
import { AxesReader } from "./arguments/AxesReader";
import { DimensionTypes } from "@minecraft/server";
import { ScoreAccess, ScoreComparator } from "./arguments/ScoreAccess";
import { BlockReader } from "./arguments/BlockReader";

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

    public constructor(root: CommandSourceStack = new CommandSourceStack()) {
        this.root = root;
    }

    public as(selector: string): Execute {
        this.subCommands.push(new As(EntitySelectorReader.readSelector(selector)));
        return this;
    }

    public at(selector: string): Execute {
        this.subCommands.push(new At(EntitySelectorReader.readSelector(selector)));
        return this;
    }

    public readonly positioned: IPositioned = {
        $: (position) => {
            this.subCommands.push(new Positioned(VectorReader.readPosition(position)));
            return this;
        },
        as: (selector) => {
            this.subCommands.push(new PositionedAs(EntitySelectorReader.readSelector(selector)));
            return this;
        }
    }

    public readonly rotated: IRotated = {
        $: (rotation) => {
            this.subCommands.push(new Rotated(VectorReader.readRotation(rotation)));
            return this;
        },
        as: (selector) => {
            this.subCommands.push(new RotatedAs(EntitySelectorReader.readSelector(selector)));
            return this;
        }
    }

    public readonly facing: IFacing = {
        $: (position) => {
            this.subCommands.push(new Facing(VectorReader.readPosition(position)));
            return this;
        },
        entity: (selector, anchor) => {
            this.subCommands.push(new FacingEntity(EntitySelectorReader.readSelector(selector), anchor));
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
            this.subCommands.push(new IfEntity(EntitySelectorReader.readSelector(selector)));
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
            this.subCommands.push(new UnlessEntity(EntitySelectorReader.readSelector(selector)));
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

    private execute(stack: CommandSourceStack, index: number, callbackFn: (stack: CommandSourceStack) => void, isEnd: boolean): boolean {
        if (index > this.subCommands.length - 1) {
            return true;
        }

        const subCommand: SubCommand = this.subCommands[index];
        const forks: CommandSourceStack[] = subCommand.through(stack);

        for (const fork of forks) {
            const f = this.execute(fork, index + 1, callbackFn, false);
            if (f) callbackFn(fork);
        }

        return false;
    }

    public run(callbackFn: (stack: CommandSourceStack) => void): void;

    public run(command: string): void;

    public run(value: ((stack: CommandSourceStack) => void) | string): void {
        if (typeof value === "string") {
            this.run(stack => {
                stack.runCommand(value);
            });
        }
        else {
            this.execute(this.root, 0, value, false);
        }
    }
}
