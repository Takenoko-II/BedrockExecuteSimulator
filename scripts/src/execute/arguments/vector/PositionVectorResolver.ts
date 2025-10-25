import { TripleAxisRotationBuilder, Vector3Builder } from "../../../util/Vector";
import { CommandSourceStack } from "../../CommandSourceStack";
import { AbstractVectorResolver, VectorComponent, VectorComponentType } from "./AbstractVectorResolver";

export class PositionVectorResolver extends AbstractVectorResolver<Vector3Builder> {
    public constructor(private readonly x: VectorComponent, private readonly y: VectorComponent, private readonly z: VectorComponent) {
        super();
    }

    private isLocal(): boolean {
        return this.x.type === VectorComponentType.LOCAL && this.y.type === VectorComponentType.LOCAL && this.z.type === VectorComponentType.LOCAL;
    }

    private isAbsoluteRelative(): boolean {
        return this.x.type !== VectorComponentType.LOCAL && this.y.type !== VectorComponentType.LOCAL && this.z.type !== VectorComponentType.LOCAL;
    }

    public resolve(stack: CommandSourceStack): Vector3Builder {
        if (this.isLocal()) {
            const objectCoordsSystem = TripleAxisRotationBuilder.from(stack.getRotation()).getObjectCoordsSystem();
    
            return stack.getPosition()
                .add(objectCoordsSystem.getX().length(this.x.value))
                .add(objectCoordsSystem.getY().length(this.y.value))
                .add(objectCoordsSystem.getZ().length(this.z.value));
        }
        else if (this.isAbsoluteRelative()) {
            const v = stack.getPosition();
    
            if (this.x.type === VectorComponentType.RELATIVE) {
                v.x += this.x.value;
            }
            else {
                v.x = this.x.value;
            }

            if (this.y.type === VectorComponentType.RELATIVE) {
                v.y += this.y.value;
            }
            else {
                v.y = this.y.value;
            }
    
            if (this.z.type === VectorComponentType.RELATIVE) {
                v.z += this.z.value;
            }
            else {
                v.z = this.z.value;
            }
    
            return v;
        }
        else {
            throw new TypeError("チルダ表記法とキャレット表記法を混在させることはできません");
        }
    }
}