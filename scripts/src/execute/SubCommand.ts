import { CommandSourceStack } from "./CommandSourceStack";
import { PositionVectorResolver, RotationVectorResolver } from "./arguments/VectorResolver";
import { Axis } from "./arguments/AxesReader";
import { EntitySelector } from "./arguments/EntitySelectorReader";
import { Vector3Builder } from "../util/Vector";
import { CommandSender } from "./CommandSender";
import { DimensionType, DimensionTypes, UnloadedChunksError, Vector3 } from "@minecraft/server";
import { AnchorType, EntityAnchor } from "./arguments/EntityAnchor";
import { BlockInfo } from "./arguments/BlockReader";
import { MinecraftBlockTypes } from "../lib/@minecraft/vanilla-data/lib/index";
import { ScoreAccess, ScoreComparator } from "./arguments/ScoreAccess";

export type ScanMode = "all" | "masked";

export abstract class SubCommand {
    public apply(stack: CommandSourceStack): CommandSourceStack[] {
        if (this instanceof RedirectableSubCommand) {
            return [this.redirect(stack)];
        }
        else if (this instanceof ForkableSubCommand) {
            return this.fork(stack);
        }
        else if (this instanceof GuardableSubCommand) {
            return this.test(stack) ? [stack] : [];
        }
        else {
            throw new TypeError("NEVER HAPPENS");
        }
    }

    public abstract toString(): string;
}

export abstract class RedirectableSubCommand extends SubCommand {
    public abstract redirect(stack: CommandSourceStack): CommandSourceStack;
}

export abstract class ForkableSubCommand extends SubCommand {
    protected readonly selector: EntitySelector;

    protected constructor(selector: EntitySelector) {
        super();
        this.selector = selector;
    }

    public abstract fork(stack: CommandSourceStack): CommandSourceStack[];
}

export abstract class GuardableSubCommand extends SubCommand {
    public abstract test(stack: CommandSourceStack): boolean;
}

export class As extends ForkableSubCommand {
    public constructor(selector: EntitySelector) {
        super(selector);
    }

    public override fork(stack: CommandSourceStack): CommandSourceStack[] {
        return this.selector.getEntities(stack).map(entity => {
            return stack.clone(css => css.write(entity));
        });
    }

    public toString(): string {
        return "as";
    }
}

export class At extends ForkableSubCommand {
    public constructor(selector: EntitySelector) {
        super(selector);
    }

    public override fork(stack: CommandSourceStack): CommandSourceStack[] {
        return this.selector.getEntities(stack).map(entity => {
            return stack.clone(css => {
                css.write(DimensionTypes.get(entity.dimension.id) as DimensionType);
                css.write({
                    position: entity.location,
                    dataType: "EntityUUID",
                    eyeHeight: Vector3Builder.from(entity.getHeadLocation()).subtract(entity.location).y
                });
                css.write(entity.getRotation());
            });
        });
    }

    public toString(): string {
        return "at";
    }
}

export class Positioned extends RedirectableSubCommand {
    private readonly posVecResolver: PositionVectorResolver;

    public constructor(posVecResolver: PositionVectorResolver) {
        super();
        this.posVecResolver = posVecResolver;
    }

    public redirect(stack: CommandSourceStack): CommandSourceStack {
        return stack.clone(css => css.write({
            position: this.posVecResolver.resolve(css),
            dataType: "Vector3",
            eyeHeight: 0
        }));
    }

    public toString(): string {
        return "positioned";
    }
}

export class PositionedAs extends ForkableSubCommand {
    public constructor(selector: EntitySelector) {
        super(selector);
    }

    public fork(stack: CommandSourceStack): CommandSourceStack[] {
        return this.selector.getEntities(stack).map(entity => {
            return stack.clone(css => css.write({
                position: entity.location,
                dataType: "EntityUUID",
                eyeHeight: Vector3Builder.from(entity.getHeadLocation()).subtract(entity.location).y
            }));
        });
    }

    public toString(): string {
        return "positioned as";
    }
}

export class Rotated extends RedirectableSubCommand {
    private readonly rotVecResolver: RotationVectorResolver;

    public constructor(rotVecResolver: RotationVectorResolver) {
        super();
        this.rotVecResolver = rotVecResolver;
    }

    public redirect(stack: CommandSourceStack): CommandSourceStack {
        return stack.clone(css => css.write(this.rotVecResolver.resolve(css)));
    }

    public toString(): string {
        return "rotated";
    }
}

export class RotatedAs extends ForkableSubCommand {
    public constructor(selector: EntitySelector) {
        super(selector);
    }

    public fork(stack: CommandSourceStack): CommandSourceStack[] {
        return this.selector.getEntities(stack).map(entity => {
            return stack.clone(css => css.write(entity.getRotation()));
        });
    }

    public toString(): string {
        return "rotated as";
    }
}

export class Facing extends RedirectableSubCommand {
    private readonly posVecResolver: PositionVectorResolver;

    public constructor(posVecResolver: PositionVectorResolver) {
        super();
        this.posVecResolver = posVecResolver;
    }

    public redirect(stack: CommandSourceStack): CommandSourceStack {
        return stack.clone(css => {
            const dir = css.getPosition().getDirectionTo(this.posVecResolver.resolve(stack));
            css.write(dir.getRotation2d());
        });
    }

    public toString(): string {
        return "facing";
    }
}

export class FacingEntity extends ForkableSubCommand {
    private readonly anchorType: AnchorType;

    public constructor(selector: EntitySelector, anchorType: AnchorType) {
        super(selector);
        this.anchorType = anchorType;
    }

    public fork(stack: CommandSourceStack): CommandSourceStack[] {
        return this.selector.getEntities(stack).map(entity => {
            const entityAnchor = new EntityAnchor(new CommandSourceStack(CommandSender.of(entity)));
            entityAnchor.setType(this.anchorType);

            return stack.clone(css => {
                const to = Vector3Builder.from(entity.location).add(entityAnchor.getOffsetBedrock());
                const dir = css.getPosition().getDirectionTo(to);
                css.write(dir.getRotation2d());
            });
        });
    }

    public toString(): string {
        return "facing entity";
    }
}

export class Align extends RedirectableSubCommand {
    private readonly axes: Set<Axis>;

    public constructor(axes: Set<Axis>) {
        super();
        this.axes = axes;
    }

    public redirect(stack: CommandSourceStack): CommandSourceStack {
        return stack.clone(css => {
            const pos = css.getPosition();

            if (this.axes.has('x')) pos.x = Math.floor(pos.x);
            if (this.axes.has('y')) pos.y = Math.floor(pos.y);
            if (this.axes.has('z')) pos.z = Math.floor(pos.z);
        });
    }

    public toString(): string {
        return "align";
    }
}

export class In extends RedirectableSubCommand {
    private readonly dimensionType: DimensionType;

    public constructor(dimensionType: DimensionType) {
        super();
        this.dimensionType = dimensionType;
    }

    public redirect(stack: CommandSourceStack): CommandSourceStack {
        return stack.clone(css => css.write(this.dimensionType));
    }

    public toString(): string {
        return "in";
    }
}

export class Anchored extends RedirectableSubCommand {
    private readonly anchorType: AnchorType;

    public constructor(anchorType: AnchorType) {
        super();
        this.anchorType = anchorType;
    }

    public redirect(stack: CommandSourceStack): CommandSourceStack {
        return stack.clone(css => css.write(this.anchorType));
    }

    public toString(): string {
        return "anchored";
    }
}

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

    private readonly blockInfo: BlockInfo;

    public constructor(posVecResolver: PositionVectorResolver, blockInfo: BlockInfo) {
        super();
        this.posVecResolver = posVecResolver;
        this.blockInfo = blockInfo;
    }

    public test(stack: CommandSourceStack): boolean {
        try {
            const block = stack.getDimension().getBlock(this.posVecResolver.resolve(stack));

            return (block === undefined) ? false : block.permutation.matches(this.blockInfo.type.id, this.blockInfo.states);
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
        /*const blockFilter: BlockFilter = this.scanMode === "masked"
            ? { excludeTypes: [MinecraftBlockTypes.Air] }
            : {};*/

        try {
            /*const iterator = dimension.getBlocks(new BlockVolume(start, end), blockFilter).getBlockLocationIterator();

            let iResult = iterator.next();
            while (!iResult.done) {
                const location = iResult.value;
                iResult = iterator.next();

                const delta = Vector3Builder.from(location).subtract(start);
                const dest = destination.clone().add(delta);

                const block = dimension.getBlock(location);
                const destBlock = dimension.getBlock(dest);

                if (block === undefined || destBlock === undefined) {
                    return false;
                }

                if (block.permutation !== destBlock.permutation) {
                    return false;
                }
            }

            return true;*/

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

export class UnlessEntity extends IfEntity {
    public test(stack: CommandSourceStack): boolean {
        return !super.test(stack);
    }
}

export class UnlessBlock extends IfBlock {
    public test(stack: CommandSourceStack): boolean {
        return !super.test(stack);
    }
}

export class UnlessBlocks extends IfBlocks {
    public test(stack: CommandSourceStack): boolean {
        return !super.test(stack);
    }
}

export class UnlessScoreCompare extends IfScoreCompare {
    public test(stack: CommandSourceStack): boolean {
        return !super.test(stack);
    }
}

export class UnlessScoreMatches extends IfScoreMatches {
    public test(stack: CommandSourceStack): boolean {
        return !super.test(stack);
    }
}
