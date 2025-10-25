import { Entity } from "@minecraft/server";
import { CommandSourceStack } from "../../CommandSourceStack";
import { MinecraftEntityTypes } from "../../../lib/@minecraft/vanilla-data/lib/index";

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
