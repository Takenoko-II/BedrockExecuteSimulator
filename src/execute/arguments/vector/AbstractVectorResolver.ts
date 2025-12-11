import { sentry, TypeModel } from "@typesentry";
import { CommandSourceStack } from "../../CommandSourceStack";

export enum VectorComponentType {
    ABSOLUTE = "ABSOLUTE",
    RELATIVE = "RELATIVE",
    LOCAL = "LOCAL"
}

export interface VectorComponent {
    readonly type: VectorComponentType;

    readonly value: number;
}

export abstract class AbstractVectorResolver<T> {
    public abstract resolve(stack: CommandSourceStack): T;
}

export const VectorComponentModel: TypeModel<VectorComponent> = sentry.structOf({
    type: sentry.enumLikeOf(VectorComponentType),
    value: sentry.number.nonNaN()
});
