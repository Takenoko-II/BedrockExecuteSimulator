import { CommandResult, Dimension, Entity, Vector2, Vector3, world } from "@minecraft/server";
import { DualAxisRotationBuilder, Vector3Builder } from "../util/Vector";
import { CommandSender, Origin } from "./CommandSender";
import { MinecraftDimensionTypes } from "../lib/@minecraft/vanilla-data/lib/index";

export type EntityAnchor = "eyes" | "feet";

export class CommandContextEmptyError extends Error {}

export class CommandSourceStack {
    private readonly sender: CommandSender<Origin>;

    private executor: Entity | undefined = undefined;

    private dimension: Dimension = world.getDimension(MinecraftDimensionTypes.Overworld);

    private position: Vector3Builder | Entity = Vector3Builder.zero();

    private rotation: DualAxisRotationBuilder = DualAxisRotationBuilder.zero();

    public constructor(sender: CommandSender<Origin> = CommandSender.getWorldSender()) {
        this.sender = sender;
        sender.writeOut(this);
    }

    public getSender(): CommandSender<Origin> {
        return this.sender;
    }

    public getExecutor(): Entity {
        if (this.executor === undefined) {
            throw new CommandContextEmptyError("実行者が存在しません");
        }

        return this.executor;
    }

    public getNullableExecutor(): Entity | undefined {
        return this.executor;
    }

    public hasExecutor(): boolean {
        return this.executor !== undefined;
    }

    public getPosition(): Vector3Builder {
        return this.position instanceof Entity ? Vector3Builder.from(this.position.location) : this.position.clone();
    }

    public getRawPosition(): Vector3Builder | Entity {
        return this.position;
    }

    public getRotation(): DualAxisRotationBuilder {
        return this.rotation.clone();
    }

    public getDimension(): Dimension {
        return this.dimension;
    }

    public clone(): CommandSourceStack;

    public clone(modifier: (newStack: CommandSourceStack) => void): CommandSourceStack;

    public clone(modifier?: (newStack: CommandSourceStack) => void): CommandSourceStack {
        const stack = new CommandSourceStack(this.sender);

        stack.executor = this.executor;
        stack.position = this.position;
        stack.rotation = this.rotation;
        stack.dimension = this.dimension;

        if (modifier !== undefined) {
            modifier(stack);
        }

        return stack;
    }

    public applyAnchor(entityAnchor: EntityAnchor): void {
        if (!(this.position instanceof Entity)) {
            return;
        }

        if (entityAnchor === "eyes") {
            this.position = Vector3Builder.from(this.position.getHeadLocation());
        }
        else {
            this.position = Vector3Builder.from(this.position.location);
        }
    }

    public setExecutor(executor: Entity | undefined): void {
        this.executor = executor;
    }

    public setPosition(source: Entity | Vector3): void {
        if (source instanceof Entity) {
            this.position = source;
        }
        else {
            this.position = Vector3Builder.from(source);
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
        if (command.trim().startsWith("execute")) {
            throw new Error("CommandSourceStack#runCommand(string) は実行文脈を完全に変換できないゆえの挙動を秘匿するために、 execute コマンドの実行を禁止しています");
        }

        if (this.position instanceof Entity) {
            this.position.addTag("XXX");

            const commandString = `execute in ${this.dimension.id.replace("minecraft:", "")} rotated ${this.rotation.format("$yaw $pitch", 4)} positioned as @n[tag=XXX] run ${command.trim()}`;
            const result = this.hasExecutor()
                ? this.getExecutor().runCommand(commandString)
                : this.getDimension().runCommand(commandString);

            this.position.removeTag("XXX");

            return result;
        }
        else {
            const commandString: string = `execute in ${this.dimension.id.replace("minecraft:", "")} rotated ${this.rotation.format("$yaw $pitch", 4)} positioned ${this.position.format("$x $y $z", 4)} run ${command.trim()}`;
        
            return this.hasExecutor()
                ? this.getExecutor().runCommand(commandString)
                : this.getDimension().runCommand(commandString);
        }
    }

    public toString() {
        return `CommandSourceStack { sender=${this.sender.origin.toString()}, executor=${(this.executor?.nameTag ?? this.executor?.typeId) ?? "null"}, position=${this.position}, rotation=${this.rotation}, dimension=${this.dimension.id} }`
    }
}
