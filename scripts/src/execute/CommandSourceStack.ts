import { CommandResult, Dimension, DimensionType, DimensionTypes, Entity, Vector2, Vector3, world } from "@minecraft/server";
import { TripleAxisRotationBuilder, Vector3Builder } from "../util/Vector";
import { CommandSender, Origin } from "./CommandSender";
import { AnchorType, EntityAnchor } from "./arguments/EntityAnchor";
import { sentry } from "../lib/TypeSentry";

export interface Position {
    source: Entity | Vector3;
}

function isPosition(value: unknown): value is Position {
    return sentry.objectOf({
        positionSource: sentry.unionOf(
            sentry.objectOf({
                x: sentry.number.nonNaN(),
                y: sentry.number.nonNaN(),
                z: sentry.number.nonNaN()
            }),
            sentry.classOf(Entity)
        )
    }).test(value);
}

export class CommandSourceStack {
    private readonly sender: CommandSender<Origin>;

    private executor: Entity | undefined = undefined;

    private dimension: Dimension = world.getDimension("overworld");

    private readonly position: Vector3Builder = Vector3Builder.zero();

    private readonly rotation: TripleAxisRotationBuilder = TripleAxisRotationBuilder.zero();

    private readonly entityAnchor: EntityAnchor = new EntityAnchor();

    public constructor(sender: CommandSender<Origin> = CommandSender.of(world)) {
        this.sender = sender;
        this.write(DimensionTypes.get(this.sender.getDimension().id) as DimensionType);
        this.write(this.sender.getRotation());

        if (this.sender.origin instanceof Entity) {
            this.write(this.sender.origin);
            this.write({
                source: this.sender.origin
            });
        }
        else {
            this.write({
                source: this.sender.getPosition()
            });
        }
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

    public hasExecutor(): boolean {
        return this.executor !== undefined;
    }

    public getPosition(): Vector3Builder {
        return this.position.clone();
    }

    public getRotation(): TripleAxisRotationBuilder {
        return this.rotation.clone();
    }

    public getDimension(): Dimension {
        return this.dimension;
    }

    public getEntityAnchor(): EntityAnchor {
        return this.entityAnchor;
    }

    public clone(): CommandSourceStack;

    public clone(modifier: (newStack: CommandSourceStack) => void): CommandSourceStack;

    public clone(modifier?: (newStack: CommandSourceStack) => void): CommandSourceStack {
        const stack = new CommandSourceStack();
        stack.executor = this.executor;
        stack.entityAnchor.write(this.entityAnchor);
        stack.write(this.rotation);
        stack.write(DimensionTypes.get(this.dimension.id) as DimensionType);

        if (modifier !== undefined) {
            modifier(stack);
        }

        return stack;
    }

    public write(entity: Entity): void;

    public write(position: Position): void;

    public write(rotation: Vector2): void;

    public write(dimension: DimensionType): void;

    public write(entityAnchorType: AnchorType): void;

    public write(value: Entity | Position | Vector2 | DimensionType | AnchorType): void {
        if (value instanceof Entity) {
            this.executor = value;
        }
        else if (isPosition(value)) {
            this.entityAnchor.write(value.source);

            if (value.source instanceof Entity) {
                this.position.x = value.source.location.x;
                this.position.y = value.source.location.y;
                this.position.z = value.source.location.z;
            }
            else {
                this.position.x = value.source.x;
                this.position.y = value.source.y;
                this.position.z = value.source.z;
            }
        }
        else if (TripleAxisRotationBuilder.isValidVector2(value)) {
            const builder = TripleAxisRotationBuilder.from(value);
            this.rotation.yaw = builder.yaw;
            this.rotation.pitch = builder.pitch;
        }
        else if (value instanceof DimensionType) {
            this.dimension = world.getDimension(value.typeId);
        }
        else if (value === "eyes" || value === "feet") {
            this.entityAnchor.write(value);
            this.entityAnchor.write(this.position);
        }
    }

    public runCommand(command: string): CommandResult {
        const commandString: string = `execute in ${this.dimension.id.replace("minecraft:", "")} positioned ${this.position.format("$x $y $z", 4)} rotated ${this.rotation.format("$yaw $pitch", 4)} run ${command}`;

        return this.hasExecutor()
            ? this.getExecutor().runCommand(commandString)
            : this.getDimension().runCommand(commandString);
    }
}
