import { Block, Dimension, Entity, World } from "@minecraft/server";
import { TripleAxisRotationBuilder, Vector3Builder } from "../util/Vector";
import { MinecraftDimensionTypes } from "../lib/@minecraft/vanilla-data/lib/index";

export type Origin = Entity | Block | World;

export abstract class CommandSender<T extends Origin> {
    public readonly origin: T;

    protected constructor(origin: T) {
        this.origin = origin;
    }

    public abstract getDimension(): Dimension;

    public abstract getPosition(): Vector3Builder;

    public abstract getRotation(): TripleAxisRotationBuilder;

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

        public getRotation(): TripleAxisRotationBuilder {
            return TripleAxisRotationBuilder.from(this.origin.getRotation())
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

        public getRotation(): TripleAxisRotationBuilder {
            return TripleAxisRotationBuilder.zero();
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

        public getRotation(): TripleAxisRotationBuilder {
            return TripleAxisRotationBuilder.zero();
        }
    }

    public static of(origin: Origin): CommandSender<Origin> {
        if (origin instanceof Entity) {
            return new this.EntityCommandSender(origin);
        }
        else if (origin instanceof Block) {
            return new this.BlockCommandSender(origin);
        }
        else if (origin instanceof World) {
            return new this.WorldCommandSender(origin);
        }
        else {
            throw new TypeError();
        }
    }
}
