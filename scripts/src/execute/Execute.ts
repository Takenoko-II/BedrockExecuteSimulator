import { CommandSourceStack } from "./CommandSourceStack";
import { Align, Anchored, As, At, Facing, FacingEntity, IfBlock, IfBlocks, IfEntity, IfScoreCompare, IfScoreMatches, In, Positioned, PositionedAs, Rotated, RotatedAs, ScanMode, SubCommand, UnlessBlock, UnlessBlocks, UnlessEntity, UnlessScoreCompare, UnlessScoreMatches } from "./SubCommand";
import { VectorReader } from "./arguments/VectorResolver";
import { EntitySelectorReader } from "./arguments/EntitySelectorReader";
import { AnchorType } from "./arguments/EntityAnchor";
import { AxesReader } from "./arguments/AxesReader";
import { DimensionTypes, Entity } from "@minecraft/server";
import { ScoreAccess, ScoreComparator } from "./arguments/ScoreAccess";
import { BlockReader } from "./arguments/BlockReader";
import { Serializer } from "../util/Serializable";

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

    private toCommandSourceStacks(stack: CommandSourceStack): CommandSourceStack[] {
        const queue: CommandSourceStack[] = [];

        for (const subCommand of this.subCommands) {
            const forks = subCommand.through(stack);

            if (forks.length === 0) {
                continue;
            }
            else if (forks.length === 1) {
                queue.push(forks[0]);
            }
            else {
                for (const fork of forks) {
                    queue.push(...this.toCommandSourceStacks(fork));
                }
            }
        }

        return queue;
    }

    private build(stack: CommandSourceStack, index: number): CommandSourceStack[] {
        if (index > this.subCommands.length - 1) {
            return [stack];
        }

        const result: CommandSourceStack[] = [];
        const subCommand: SubCommand = this.subCommands[index];
        const forks: CommandSourceStack[] = subCommand.through(stack);

        for (const fork of forks) {
            result.push(...this.build(fork, index + 1));
        }

        return result;
    }

    public run(callbackFn: (stack: CommandSourceStack) => void): void {
        const stacks = this.build(this.root, 0);
        stacks.forEach(stack => callbackFn(stack));
    }
}

// execute as @a at @s run playsound random.click @s ~ ~ ~

// 1. サブコマンド毎に区切る
// "as @a", "at @s", "run playsound random.click @s ~ ~ ~"

// 2. 一つ目のサブコマンドを実行
// @a -> [Steve, Alex]
// -> Steve
// as Steve at Steve run playsound Steve
// CSS は 道を通っていくやつ
// SubCommand は CSS と 道 をつくるやつ

// 思ったより動的なのかもしれない。
// selectorを解析するのはノード解析(next())中。

// EntityQueryOptionsは暫定、c=の表現やxyz=,dxyz=の表現に乏しい
// EntityQueryOptionsに変換するクラス作ればいいか
// 既存のは変えなくていいや
// やっぱ@aと@eの違いとかあるし変える方針で
