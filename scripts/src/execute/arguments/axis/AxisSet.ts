import { Vector3 } from "@minecraft/server";

export class AxisSet {
    public constructor(private readonly chars: ReadonlySet<string>) {}

    public apply(vector3: Vector3, callbackFn: (component: number) => number): void {
        if (this.chars.has('x')) vector3.x = callbackFn(vector3.x);
        if (this.chars.has('y')) vector3.y = callbackFn(vector3.y);
        if (this.chars.has('z')) vector3.z = callbackFn(vector3.z);
    }

    public floor(vector3: Vector3): void {
        this.apply(vector3, Math.floor);
    }
}
