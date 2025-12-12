import { MinecraftEntityTypes } from "@minecraft/vanilla-data";
import { sentry } from "@typesentry";
import { Identifier, Registries, registryRegistrar } from "@/utils/NeoRegistry";
import { VectorComponentModel } from "../vector/AbstractVectorResolver";
import { SelectorArgumentDuplicationRule, SelectorArgumentTypeModel, SelectorArgumentTypes } from "./SelectorArgumentType";
import { SelectorSortOrder, SelectorTypeModel } from "./SelectorType";

export function id(value: string): Identifier {
    return new Identifier("bedrock_execute_simulator", value);
}

export const ENTITY_SELECTOR_REGISTRIES = new Registries({
    "bedrock_execute_simulator:entity_selector_types": registryRegistrar(SelectorTypeModel, registry => {
        registry.register(id("@s"), {
            aliveOnly: false,
            sortOrder: SelectorSortOrder.NEAREST,
            traits: {
                processor(stack, entities) {
                    if (!stack.hasExecutor()) return [];
                    return entities.includes(stack.getExecutor()) ? [stack.getExecutor()] : [];
                },
                limit: 1
            }
        });
        registry.register(id("@p"), {
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
        registry.register(id("@r"), {
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
        registry.register(id("@a"), {
            aliveOnly: false,
            sortOrder: SelectorSortOrder.NEAREST,
            traits: {
                typeSpecific: {
                    type: MinecraftEntityTypes.Player,
                    overridable: false
                }
            }
        });
        registry.register(id("@e"), {
            aliveOnly: true,
            sortOrder: SelectorSortOrder.NEAREST,
            traits: {}
        });
        registry.register(id("@n"), {
            aliveOnly: true,
            sortOrder: SelectorSortOrder.NEAREST,
            traits: {
                limit: 1
            }
        });
    }),
    "bedrock_execute_simulator:entity_selector_argument_types": registryRegistrar(SelectorArgumentTypeModel, registry => {
        registry.register(id("c"), {
            invertible: false,
            duplicatable: SelectorArgumentDuplicationRule.NEVER,
            type: sentry.number.int()
        });
        registry.register(id("dx"), {
            invertible: false,
            duplicatable: SelectorArgumentDuplicationRule.NEVER,
            type: sentry.number
        });
        registry.register(id("dy"), {
            invertible: false,
            duplicatable: SelectorArgumentDuplicationRule.NEVER,
            type: sentry.number
        });
        registry.register(id("dz"), {
            invertible: false,
            duplicatable: SelectorArgumentDuplicationRule.NEVER,
            type: sentry.number
        });
        registry.register(id("family"), {
            invertible: true,
            duplicatable: SelectorArgumentDuplicationRule.ALWAYS,
            type: sentry.string
        });
        registry.register(id("has_property"), {
            invertible: false,
            duplicatable: SelectorArgumentDuplicationRule.NEVER,
            type: SelectorArgumentTypes.HasPropertyModel
        });
        registry.register(id("hasitem"), {
            invertible: false,
            duplicatable: SelectorArgumentDuplicationRule.NEVER,
            type: sentry.unionOf(
                sentry.arrayOf(SelectorArgumentTypes.HasItemModel),
                SelectorArgumentTypes.HasItemModel
            )
        });
        registry.register(id("haspermission"), {
            invertible: false,
            duplicatable: SelectorArgumentDuplicationRule.NEVER,
            type: SelectorArgumentTypes.HasPermissionModel
        });
        registry.register(id("l"), {
            invertible: false,
            duplicatable: SelectorArgumentDuplicationRule.NEVER,
            type: sentry.number.int()
        });
        registry.register(id("lm"), {
            invertible: false,
            duplicatable: SelectorArgumentDuplicationRule.NEVER,
            type: sentry.number.int()
        });
        registry.register(id("m"), {
            invertible: true,
            duplicatable: SelectorArgumentDuplicationRule.NEVER,
            type: SelectorArgumentTypes.GameModeLikeModel
        });
        registry.register(id("name"), {
            invertible: true,
            duplicatable: SelectorArgumentDuplicationRule.INVERTED_ONLY,
            type: sentry.string
        });
        registry.register(id("r"), {
            invertible: false,
            duplicatable: SelectorArgumentDuplicationRule.NEVER,
            type: sentry.number
        });
        registry.register(id("rm"), {
            invertible: false,
            duplicatable: SelectorArgumentDuplicationRule.NEVER,
            type: sentry.number
        });
        registry.register(id("rx"), {
            invertible: false,
            duplicatable: SelectorArgumentDuplicationRule.NEVER,
            type: sentry.number
        });
        registry.register(id("rxm"), {
            invertible: false,
            duplicatable: SelectorArgumentDuplicationRule.NEVER,
            type: sentry.number
        });
        registry.register(id("ry"), {
            invertible: false,
            duplicatable: SelectorArgumentDuplicationRule.NEVER,
            type: sentry.number
        });
        registry.register(id("rym"), {
            invertible: false,
            duplicatable: SelectorArgumentDuplicationRule.NEVER,
            type: sentry.number
        });
        registry.register(id("scores"), {
            invertible: false,
            duplicatable: SelectorArgumentDuplicationRule.NEVER,
            type: SelectorArgumentTypes.ScoresModel
        });
        registry.register(id("tag"), {
            invertible: true,
            duplicatable: SelectorArgumentDuplicationRule.ALWAYS,
            type: sentry.string
        });
        registry.register(id("type"), {
            invertible: true,
            duplicatable: SelectorArgumentDuplicationRule.INVERTED_ONLY,
            type: sentry.string
        });
        registry.register(id("x"), {
            invertible: false,
            duplicatable: SelectorArgumentDuplicationRule.NEVER,
            type: sentry.unionOf(VectorComponentModel, sentry.number)
        });
        registry.register(id("y"), {
            invertible: false,
            duplicatable: SelectorArgumentDuplicationRule.NEVER,
            type: sentry.unionOf(VectorComponentModel, sentry.number)
        });
        registry.register(id("z"), {
            invertible: false,
            duplicatable: SelectorArgumentDuplicationRule.NEVER,
            type: sentry.unionOf(VectorComponentModel, sentry.number)
        });
    })
});
