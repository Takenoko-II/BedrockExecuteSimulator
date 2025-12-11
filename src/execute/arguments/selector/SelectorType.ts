import { Entity } from "@minecraft/server";
import { CommandSourceStack } from "../../CommandSourceStack";
import { MinecraftEntityTypes } from "@minecraft/vanilla-data";
import { sentry, TypeModel } from "@/libs/TypeSentry";

export interface SelectorType {
    readonly aliveOnly: boolean;

    readonly sortOrder: SelectorSortOrder;

    readonly traits: SelectorTraits;
}

export interface TypeSpecific {
    readonly type: MinecraftEntityTypes;

    readonly overridable: boolean;
}

export interface SelectorTraits {
    readonly typeSpecific?: TypeSpecific;

    readonly limit?: number;

    processor?(stack: CommandSourceStack, entities: Entity[]): Entity[];
}

export enum SelectorSortOrder {
    NEAREST = "NEAREST",
    RANDOM = "RANDOM"
}

export const TypeSpecificModel: TypeModel<TypeSpecific> = sentry.structOf({
    type: sentry.enumLikeOf(MinecraftEntityTypes),
    overridable: sentry.boolean
});

export const SelectorTraitsModel: TypeModel<SelectorTraits> = sentry.structOf({
    typeSpecific: sentry.optionalOf(TypeSpecificModel),
    limit: sentry.optionalOf(sentry.number),

})

export const SelectorTypeModel: TypeModel<SelectorType> = sentry.structOf({
    aliveOnly: sentry.boolean,
    sortOrder: sentry.enumLikeOf(SelectorSortOrder),
    traits: SelectorTraitsModel
});
