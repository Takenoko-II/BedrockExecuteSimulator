import { CommandResult, Dimension, Entity, Vector2, Vector3, world } from "@minecraft/server";
import { DualAxisRotationBuilder, Vector3Builder } from "../util/Vector";
import { CommandSender, Origin } from "./CommandSender";
import { MinecraftDimensionTypes } from "../lib/@minecraft/vanilla-data/lib/index";

export type EntityAnchor = "eyes" | "feet";

export class CommandSourceStack {
    private readonly sender: CommandSender<Origin>;

    private executor: Entity | undefined = undefined;

    private dimension: Dimension = world.getDimension(MinecraftDimensionTypes.Overworld);

    private readonly position: Vector3Builder = Vector3Builder.zero();

    private readonly rotation: DualAxisRotationBuilder = DualAxisRotationBuilder.zero();

    private positionSource: Entity | undefined = undefined;

    public constructor(sender: CommandSender<Origin> = CommandSender.getWorldSender()) {
        this.sender = sender;
        sender.writeOut(this);
    }

    public getSender(): CommandSender<Origin> {
        return this.sender;
    }

    public getExecutor(): Entity {
        if (this.executor === undefined) {
            throw new Error("実行者が存在しません");
        }

        return this.executor;
    }

    public getExecutorOrNull(): Entity | undefined {
        return this.executor;
    }

    public hasExecutor(): boolean {
        return this.executor !== undefined;
    }

    public getPosition(): Vector3Builder {
        return this.position.clone();
    }

    public getRotation(): DualAxisRotationBuilder {
        return this.rotation.clone();
    }

    public getDimension(): Dimension {
        return this.dimension;
    }

    public getPositionSource(): Entity | undefined {
        return this.positionSource;
    }

    public clone(): CommandSourceStack;

    public clone(modifier: (newStack: CommandSourceStack) => void): CommandSourceStack;

    public clone(modifier?: (newStack: CommandSourceStack) => void): CommandSourceStack {
        const stack = new CommandSourceStack();

        stack.executor = this.executor;
        stack.position.x = this.position.x;
        stack.position.y = this.position.y;
        stack.position.z = this.position.z;
        stack.rotation.yaw = this.rotation.yaw;
        stack.rotation.pitch = this.rotation.pitch;
        stack.dimension = this.dimension;
        stack.positionSource = this.positionSource;

        if (modifier !== undefined) {
            modifier(stack);
        }

        return stack;
    }

    public applyAnchor(entityAnchor: EntityAnchor): void {
        if (entityAnchor === "eyes" && this.positionSource) {
            this.position.y += this.positionSource.getHeadLocation().y - this.positionSource.location.y;
        }

        this.positionSource = undefined;
    }

    public setExecutor(executor: Entity | undefined): void {
        this.executor = executor;
    }

    public setPosition(source: Entity | Vector3): void {
        if (source instanceof Entity) {
            this.position.x = source.location.x;
            this.position.y = source.location.y;
            this.position.z = source.location.z;
            this.positionSource = source;
        }
        else {
            this.position.x = source.x;
            this.position.y = source.y;
            this.position.z = source.z;
            this.positionSource = undefined;
        }
    }

    public setRotation(source: Entity | Vector2): void {
        if (source instanceof Entity) {
            const rotation = source.getRotation();
            this.rotation.yaw = rotation.y;
            this.rotation.pitch = rotation.x;
        }
        else {
            this.rotation.yaw = source.y;
            this.rotation.pitch = source.x;
        }
    }

    public setDimension(dimension: Dimension): void {
        this.dimension = dimension;
    }

    public runCommand(command: string): CommandResult {
        const commandString: string = `execute in ${this.dimension.id.replace("minecraft:", "")} positioned ${this.position.format("$x $y $z", 4)} rotated ${this.rotation.format("$yaw $pitch", 4)} run ${command}`;

        return this.hasExecutor()
            ? this.getExecutor().runCommand(commandString)
            : this.getDimension().runCommand(commandString);
    }

    public toString() {
        return `CommandSourceStack { sender=${this.sender.origin.toString()}, executor=${(this.executor?.nameTag ?? this.executor?.typeId) ?? "null"}, position={ xyz=${this.position}, source=${this.positionSource} }, rotation=${this.rotation}, dimension=${this.dimension.id} }`
    }
}
