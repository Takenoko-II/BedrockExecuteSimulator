import { Block, Dimension, Entity, world, World } from "@minecraft/server";
import { DualAxisRotationBuilder, Vector3Builder } from "@utils/Vector";
import { MinecraftDimensionTypes } from "@minecraft/vanilla-data";
import { CommandSourceStack } from "./CommandSourceStack";

export type Origin = Entity | Block | World;

export abstract class CommandSender<T extends Origin> {
    public readonly origin: T;

    protected constructor(origin: T) {
        this.origin = origin;
    }

    public abstract getDimension(): Dimension;

    public abstract getPosition(): Vector3Builder;

    public abstract getRotation(): DualAxisRotationBuilder;

    public abstract writeOut(stack: CommandSourceStack): void;

    public abstract toString(): string;

    private static EntityCommandSender = class extends CommandSender<Entity> {
        public constructor(entity: Entity) {
            super(entity);
        }

        public getDimension(): Dimension {
            return this.origin.dimension;
        }

        public getPosition(): Vector3Builder {
            return Vector3Builder.from(this.origin.location)
        }

        public getRotation(): DualAxisRotationBuilder {
            return DualAxisRotationBuilder.from(this.origin.getRotation())
        }

        public override writeOut(stack: CommandSourceStack): void {
            stack.setDimension(this.getDimension());
            stack.setRotation(this.getRotation());
            stack.setPosition(this.origin);
            stack.setExecutor(this.origin);
        }

        public override toString(): string {
            return this.origin.nameTag.length === 0 ? this.origin.localizationKey : this.origin.nameTag;
        }
    }

    private static BlockCommandSender = class extends CommandSender<Block> {
        public constructor(block: Block) {
            super(block);
        }

        public getDimension(): Dimension {
            return this.origin.dimension;
        }

        public getPosition(): Vector3Builder {
            return Vector3Builder.from(this.origin.location)
        }

        public getRotation(): DualAxisRotationBuilder {
            return DualAxisRotationBuilder.zero();
        }

        public override writeOut(stack: CommandSourceStack): void {
            stack.setDimension(this.getDimension());
            stack.setRotation(this.getRotation());
            stack.setPosition(this.getPosition());
            stack.setExecutor(undefined);
        }

        public override toString(): string {
            return this.origin.localizationKey;
        }
    }

    private static WorldCommandSender = class extends CommandSender<World> {
        public constructor(world: World) {
            super(world);
        }

        public getDimension(): Dimension {
            return this.origin.getDimension(MinecraftDimensionTypes.Overworld);
        }

        public getPosition(): Vector3Builder {
            return Vector3Builder.from(this.origin.getDefaultSpawnLocation());
        }

        public getRotation(): DualAxisRotationBuilder {
            return DualAxisRotationBuilder.zero();
        }

        public override writeOut(stack: CommandSourceStack): void {
            stack.setDimension(this.getDimension());
            stack.setRotation(this.getRotation());
            stack.setPosition(this.getPosition());
            stack.setExecutor(undefined);
        }

        public override toString(): string {
            return "WORLD";
        }
    }

    public static getWorldSender(): CommandSender<World> {
        return new CommandSender.WorldCommandSender(world);
    }

    public static getBlockSender(block: Block): CommandSender<Block> {
        return new CommandSender.BlockCommandSender(block);
    }

    public static getEntitySender(entity: Entity): CommandSender<Entity> {
        return new CommandSender.EntityCommandSender(entity);
    }
}
