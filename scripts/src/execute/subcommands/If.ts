import { UnloadedChunksError, Vector3 } from "@minecraft/server";
import { MinecraftBlockTypes } from "../../lib/@minecraft/vanilla-data/lib/index";
import { Vector3Builder } from "../../util/Vector";
import { BlockPredicate } from "../arguments/block/BlockPredicate";
import { EntitySelector } from "../arguments/selector/EntitySelector";
import { PositionVectorResolver } from "../arguments/vector/PositionVectorResolver";
import { CommandSourceStack } from "../CommandSourceStack";
import { GuardableSubCommand } from "./AbstractSubCommand";
import { ScoreAccess, ScoreComparator } from "../arguments/score/ScoreAccess";

export type ScanMode = "all" | "masked";

export class IfEntity extends GuardableSubCommand {
    private readonly selector: EntitySelector;

    public constructor(selector: EntitySelector) {
        super();
        this.selector = selector;
    }

    public test(stack: CommandSourceStack): boolean {
        return this.selector.getEntities(stack).length > 0;
    }

    public toString(): string {
        return "if entity";
    }
}

export class IfBlock extends GuardableSubCommand {
    private readonly posVecResolver: PositionVectorResolver;

    private readonly blockPredicate: BlockPredicate;

    public constructor(posVecResolver: PositionVectorResolver, blockPredicate: BlockPredicate) {
        super();
        this.posVecResolver = posVecResolver;
        this.blockPredicate = blockPredicate;
    }

    public test(stack: CommandSourceStack): boolean {
        try {
            const block = stack.getDimension().getBlock(this.posVecResolver.resolve(stack));

            return (block === undefined) ? false : this.blockPredicate.matches(block);
        }
        catch (e) {
            return false;
        }
    }

    public toString(): string {
        return "if block";
    }
}

export class IfBlocks extends GuardableSubCommand {
    private readonly startPosResolver: PositionVectorResolver;

    private readonly endPosResolver: PositionVectorResolver;

    private readonly destPosResolver: PositionVectorResolver;

    private readonly scanMode: ScanMode;

    public constructor(startPosResolver: PositionVectorResolver, endPosResolver: PositionVectorResolver, destPosResolver: PositionVectorResolver, mode: ScanMode) {
        super();
        this.startPosResolver = startPosResolver;
        this.endPosResolver = endPosResolver;
        this.destPosResolver = destPosResolver;
        this.scanMode = mode;
    }

    public test(stack: CommandSourceStack): boolean {
        const start = this.startPosResolver.resolve(stack);
        const end = this.endPosResolver.resolve(stack);
        const destination = this.destPosResolver.resolve(stack);
        const dimension = stack.getDimension();

        try {
            for (let x = start.x; x <= end.x; x++) {
                for (let y = start.y; y <= end.y; y++) {
                    for (let z = start.z; z <= end.z; z++) {
                        const location: Vector3 = { x, y, z };

                        const delta = Vector3Builder.from(location).subtract(start);
                        const dest = destination.clone().add(delta);

                        const block = dimension.getBlock(location);

                        const destBlock = dimension.getBlock(dest);

                        if (block === undefined || destBlock === undefined) {
                            return false;
                        }

                        if (this.scanMode === "masked" && block.permutation.type.id === MinecraftBlockTypes.Air) {
                            continue;
                        }

                        if (block.permutation !== destBlock.permutation) {
                            return false;
                        }
                    }
                }
            }

            return true;
        }
        catch (e) {
            if (e instanceof UnloadedChunksError) {
                return false;
            }
            else {
                throw e;
            }
        }
    }

    public toString(): string {
        return "if blocks";
    }
}

export class IfScoreCompare extends GuardableSubCommand {
    private readonly scoreA: ScoreAccess;

    private readonly comparator: ScoreComparator;

    private readonly scoreB: ScoreAccess;

    public constructor(scoreA: ScoreAccess, comparator: ScoreComparator, scoreB: ScoreAccess) {
        super();
        this.scoreA = scoreA;
        this.comparator = comparator;
        this.scoreB = scoreB;
    }

    public test(stack: CommandSourceStack): boolean {
        return this.scoreA.test(stack, this.comparator, this.scoreB);
    }

    public toString(): string {
        return "if score";
    }
}

export class IfScoreMatches extends GuardableSubCommand {
    private readonly score: ScoreAccess;

    private readonly range: string;

    public constructor(score: ScoreAccess, range: string) {
        super();
        this.score = score;
        this.range = range;
    }

    public test(stack: CommandSourceStack): boolean {
        return this.score.test(stack, "matches", this.range);
    }

    public toString(): string {
        return "if score matches";
    }
}
