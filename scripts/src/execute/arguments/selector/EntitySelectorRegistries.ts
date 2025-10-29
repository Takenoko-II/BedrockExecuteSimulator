import { Entity } from "@minecraft/server";
import { MinecraftEntityTypes } from "../../../lib/@minecraft/vanilla-data/lib/index";
import { sentry } from "../../../lib/TypeSentry";
import { Registries, RegistryKey } from "../../../util/Registry";
import { CommandSender } from "../../CommandSender";
import { VectorComponentModel } from "../vector/AbstractVectorResolver";
import { SelectorArgumentDuplicationRule, SelectorArgumentType, SelectorArgumentTypes } from "./SelectorArgumentType";
import { SelectorSortOrder, SelectorType } from "./SelectorType";

export const ENTITY_SELECTOR_TYPES = RegistryKey.create<string, SelectorType>();

export const ENTITY_SELECTOR_ARGUMENT_TYPES = RegistryKey.create<string, SelectorArgumentType<unknown>>();

export const ENTITY_SELECTOR_REGISTRIES = new Registries()
    .withRegistrar(ENTITY_SELECTOR_TYPES, register => {
        register("@s", {
            aliveOnly: false,
            sortOrder: SelectorSortOrder.NEAREST,
            traits: {
                processor(stack, entities) {
                    if (!stack.hasExecutor()) return [];
                    return entities.includes(stack.getExecutor()) ? [stack.getExecutor()] : [];
                }
            }
        });
        register("@p", {
            aliveOnly: true,
            sortOrder: SelectorSortOrder.NEAREST,
            traits: {
                typeSpecific: {
                    type: MinecraftEntityTypes.Player,
                    overridable: false
                },
                limit: 1
            }
        });
        register("@r", {
            aliveOnly: true,
            sortOrder: SelectorSortOrder.RANDOM,
            traits: {
                typeSpecific: {
                    type: MinecraftEntityTypes.Player,
                    overridable: true
                },
                limit: 1
            }
        });
        register("@a", {
            aliveOnly: false,
            sortOrder: SelectorSortOrder.NEAREST,
            traits: {
                typeSpecific: {
                    type: MinecraftEntityTypes.Player,
                    overridable: false
                }
            }
        });
        register("@e", {
            aliveOnly: true,
            sortOrder: SelectorSortOrder.NEAREST,
            traits: {}
        });
        register("@n", {
            aliveOnly: true,
            sortOrder: SelectorSortOrder.NEAREST,
            traits: {
                limit: 1
            }
        });
        // initiator はつくってない
    })
    .withRegistrar(ENTITY_SELECTOR_ARGUMENT_TYPES, register => {
        register("c", {
            invertible: false,
            duplicatable: SelectorArgumentDuplicationRule.NEVER,
            type: sentry.number.int()
        });
        register("dx", {
            invertible: false,
            duplicatable: SelectorArgumentDuplicationRule.NEVER,
            type: sentry.number
        });
        register("dy", {
            invertible: false,
            duplicatable: SelectorArgumentDuplicationRule.NEVER,
            type: sentry.number
        });
        register("dz", {
            invertible: false,
            duplicatable: SelectorArgumentDuplicationRule.NEVER,
            type: sentry.number
        });
        register("family", {
            invertible: true,
            duplicatable: SelectorArgumentDuplicationRule.ALWAYS,
            type: sentry.string
        });
        register("has_property", {
            invertible: false,
            duplicatable: SelectorArgumentDuplicationRule.NEVER,
            type: SelectorArgumentTypes.HasPropertyModel
        });
        register("hasitem", {
            invertible: false,
            duplicatable: SelectorArgumentDuplicationRule.NEVER,
            type: sentry.unionOf(
                sentry.arrayOf(SelectorArgumentTypes.HasItemModel),
                SelectorArgumentTypes.HasItemModel
            )
        });
        register("haspermission", {
            invertible: false,
            duplicatable: SelectorArgumentDuplicationRule.NEVER,
            type: SelectorArgumentTypes.HasPermissionModel
        });
        register("l", {
            invertible: false,
            duplicatable: SelectorArgumentDuplicationRule.NEVER,
            type: sentry.number.int()
        });
        register("lm", {
            invertible: false,
            duplicatable: SelectorArgumentDuplicationRule.NEVER,
            type: sentry.number.int()
        });
        register("m", {
            invertible: true,
            duplicatable: SelectorArgumentDuplicationRule.NEVER,
            type: SelectorArgumentTypes.GameModeLikeModel
        });
        register("name", {
            invertible: true,
            duplicatable: SelectorArgumentDuplicationRule.INVERTED_ONLY,
            type: sentry.string
        });
        register("r", {
            invertible: false,
            duplicatable: SelectorArgumentDuplicationRule.NEVER,
            type: sentry.number
        });
        register("rm", {
            invertible: false,
            duplicatable: SelectorArgumentDuplicationRule.NEVER,
            type: sentry.number
        });
        register("rx", {
            invertible: false,
            duplicatable: SelectorArgumentDuplicationRule.NEVER,
            type: sentry.number
        });
        register("rxm", {
            invertible: false,
            duplicatable: SelectorArgumentDuplicationRule.NEVER,
            type: sentry.number
        });
        register("ry", {
            invertible: false,
            duplicatable: SelectorArgumentDuplicationRule.NEVER,
            type: sentry.number
        });
        register("rym", {
            invertible: false,
            duplicatable: SelectorArgumentDuplicationRule.NEVER,
            type: sentry.number
        });
        register("scores", {
            invertible: false,
            duplicatable: SelectorArgumentDuplicationRule.NEVER,
            type: SelectorArgumentTypes.ScoresModel
        });
        register("tag", {
            invertible: true,
            duplicatable: SelectorArgumentDuplicationRule.ALWAYS,
            type: sentry.string
        });
        register("type", {
            invertible: true,
            duplicatable: SelectorArgumentDuplicationRule.INVERTED_ONLY,
            type: sentry.string
        });
        register("x", {
            invertible: false,
            duplicatable: SelectorArgumentDuplicationRule.NEVER,
            type: sentry.unionOf(VectorComponentModel, sentry.number)
        });
        register("y", {
            invertible: false,
            duplicatable: SelectorArgumentDuplicationRule.NEVER,
            type: sentry.unionOf(VectorComponentModel, sentry.number)
        });
        register("z", {
            invertible: false,
            duplicatable: SelectorArgumentDuplicationRule.NEVER,
            type: sentry.unionOf(VectorComponentModel, sentry.number)
        });
    });
