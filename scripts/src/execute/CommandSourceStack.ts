import { CommandResult, Dimension, DimensionType, DimensionTypes, Entity, Vector2, Vector3, world } from "@minecraft/server";
import { TripleAxisRotationBuilder, Vector3Builder } from "../util/Vector";
import { CommandSender, Origin } from "./CommandSender";
import { AnchorType, EntityAnchor } from "./arguments/EntityAnchor";
import { RandomHandler, Xorshift32 } from "../util/Random";

export type PositionDataType = "EntityUUID" | "Vector3";

export interface Position {
    position: Vector3;

    dataType: PositionDataType;

    eyeHeight: number;
}

function isPosition(value: unknown): value is Position {
    if (value === undefined || value === null) {
        return false;
    }
    else {
        return Vector3Builder.isValidVector3(value["position"])
            && (value["dataType"] === "EntityUUID" || value["dataType"] === "Vector3");
    }
}

export class CommandSourceStack {
    private readonly sender: CommandSender<Origin>;

    private executor: Entity | undefined = undefined;

    private dimension: Dimension = world.getDimension("overworld");

    private readonly position: Vector3Builder = Vector3Builder.zero();

    private positionDataType: PositionDataType = "Vector3";

    private eyeHeight: number = 0;

    private readonly rotation: TripleAxisRotationBuilder = TripleAxisRotationBuilder.zero();

    private readonly entityAnchor: EntityAnchor = new EntityAnchor(this);

    public constructor(sender: CommandSender<Origin> = CommandSender.of(world)) {
        this.sender = sender;
        this.write(DimensionTypes.get(this.sender.getDimension().id) as DimensionType);
        this.write(this.sender.getRotation());

        if (this.sender.origin instanceof Entity) {
            this.write(this.sender.origin);
            this.write({
                position: this.sender.getPosition(),
                dataType: "EntityUUID",
                eyeHeight: Vector3Builder.from(this.sender.origin.getHeadLocation()).subtract(this.sender.origin.location).y
            });
        }
        else {
            this.write({
                position: this.sender.getPosition(),
                dataType: "Vector3",
                eyeHeight: 0
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

    public getPositionDataType(): PositionDataType {
        return this.positionDataType;
    }

    public getEyeHeight(): number {
        return this.eyeHeight;
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

    public clone(modifier: (newStack: CommandSourceStack) => void): CommandSourceStack {
        const stack = new CommandSourceStack();
        stack.executor = this.executor;
        stack.entityAnchor.setType(this.entityAnchor.getType());
        stack.write({
            position: this.position,
            dataType: this.positionDataType,
            eyeHeight: this.eyeHeight
        });
        stack.write(this.rotation);
        stack.write(DimensionTypes.get(this.dimension.id) as DimensionType);
        modifier(stack);
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
            this.position.x = value.position.x;
            this.position.y = value.position.y;
            this.position.z = value.position.z;
            this.positionDataType = value.dataType;
            this.eyeHeight = value.eyeHeight;
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
            this.entityAnchor.setType(value);
            this.positionDataType = "Vector3";
        }
    }

    public runCommand(command: string): CommandResult {
        const commandString: string = `execute in ${this.dimension.id.replace("minecraft:", "")} positioned ${this.position.format("$x $y $z", 4)} rotated ${this.rotation.format("$yaw $pitch", 4)} run ${command}`;

        return this.hasExecutor()
            ? this.getExecutor().runCommand(commandString)
            : this.getDimension().runCommand(commandString);
    }
}
