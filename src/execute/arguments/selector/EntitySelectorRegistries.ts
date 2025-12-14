import { MinecraftEntityTypes } from "@minecraft/vanilla-data";
import { sentry } from "@typesentry";
import { Identifier, Registries, registryRegistrar } from "@/utils/NeoRegistry";
import { VectorComponentModel } from "../vector/AbstractVectorResolver";
import { SelectorArgumentDuplicationRule, SelectorArgumentTypeModel, SelectorArgumentTypes } from "./SelectorArgumentType";
import { SelectorSortOrder, SelectorTypeModel } from "./SelectorType";
import { ItemLocationModel } from "./ItemLocation";
import { Entity, EntityComponentReturnType, EntityComponentTypes, EquipmentSlot, ItemStack, Player } from "@minecraft/server";
import { IntRange } from "@/utils/NumberRange";

export function id(value: string): Identifier {
    return new Identifier("bedrock_execute_simulator", value);
}

function tryAccessComponent<T extends EntityComponentTypes>(entity: Entity, type: T): EntityComponentReturnType<T> | undefined {
    if (!entity.isValid || !entity.hasComponent(type)) return;
    return entity.getComponent(type)!;
}

class NotImplementedError extends Error {}

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
    }),
    "bedrock_execute_simulator:item_location_types": registryRegistrar(ItemLocationModel, registry => {
        registry.register(id("slot.weapon.mainhand"), {
            slotRange: IntRange.exactValue(0),
            getItem(entity) {
                return tryAccessComponent(entity, EntityComponentTypes.Equippable)?.getEquipment(EquipmentSlot.Mainhand);
            },
            getItems(entity) {
                const item = this.getItem(entity, 0);
                return item === undefined ? [] : [item];
            }
        });
        registry.register(id("slot.weapon.offhand"), {
            slotRange: IntRange.exactValue(0),
            getItem(entity) {
                return tryAccessComponent(entity, EntityComponentTypes.Equippable)?.getEquipment(EquipmentSlot.Offhand);
            },
            getItems(entity) {
                const item = this.getItem(entity, 0);
                return item === undefined ? [] : [item];
            }
        });
        registry.register(id("slot.armor.head"), {
            slotRange: IntRange.exactValue(0),
            getItem(entity) {
                return tryAccessComponent(entity, EntityComponentTypes.Equippable)?.getEquipment(EquipmentSlot.Head);
            },
            getItems(entity) {
                const item = this.getItem(entity, 0);
                return item === undefined ? [] : [item];
            }
        });
        registry.register(id("slot.armor.chest"), {
            slotRange: IntRange.exactValue(0),
            getItem(entity) {
                return tryAccessComponent(entity, EntityComponentTypes.Equippable)?.getEquipment(EquipmentSlot.Chest);
            },
            getItems(entity) {
                const item = this.getItem(entity, 0);
                return item === undefined ? [] : [item];
            }
        });
        registry.register(id("slot.armor.legs"), {
            slotRange: IntRange.exactValue(0),
            getItem(entity) {
                return tryAccessComponent(entity, EntityComponentTypes.Equippable)?.getEquipment(EquipmentSlot.Legs);
            },
            getItems(entity) {
                const item = this.getItem(entity, 0);
                return item === undefined ? [] : [item];
            }
        });
        registry.register(id("slot.armor.feet"), {
            slotRange: IntRange.exactValue(0),
            getItem(entity) {
                return tryAccessComponent(entity, EntityComponentTypes.Equippable)?.getEquipment(EquipmentSlot.Feet);
            },
            getItems(entity) {
                const item = this.getItem(entity, 0);
                return item === undefined ? [] : [item];
            }
        });
        registry.register(id("slot.armor"), {
            slotRange: IntRange.exactValue(0),
            getItem(entity) {
                return tryAccessComponent(entity, EntityComponentTypes.Equippable)?.getEquipment(EquipmentSlot.Body);
            },
            getItems(entity) {
                const item = this.getItem(entity, 0);
                return item === undefined ? [] : [item];
            }
        });
        registry.register(id("slot.saddle"), {
            slotRange: IntRange.exactValue(0),
            getItem(entity) {
                // inventory 0 = saddle slot
                if (!tryAccessComponent(entity, EntityComponentTypes.IsSaddled)) return;
                return tryAccessComponent(entity, EntityComponentTypes.Inventory)?.container.getItem(0);
            },
            getItems(entity) {
                const item = this.getItem(entity, 0);
                return item === undefined ? [] : [item];
            }
        });
        registry.register(id("slot.chest"), {
            slotRange: IntRange.minOnly(0),
            getItem(entity, index) {
                // inventory 1 ~ 16 = chest slot
                if (!tryAccessComponent(entity, EntityComponentTypes.IsChested)) return;
                return tryAccessComponent(entity, EntityComponentTypes.Inventory)?.container.getItem(index + 1);
            },
            getItems(entity) {
                if (!tryAccessComponent(entity, EntityComponentTypes.IsChested)) return [];
                const container = tryAccessComponent(entity, EntityComponentTypes.Inventory)?.container;
                if (container === undefined) return [];

                const items: ItemStack[] = [];
                for (let i = 1; i < container.size; i++) {
                    const item = container.getItem(i);
                    if (item === undefined) continue;
                    items.push(item);
                }
                return items;
            }
        });
        registry.register(id("slot.inventory"), {
            slotRange: IntRange.minOnly(0),
            getItem(entity, index) {
                return tryAccessComponent(entity, EntityComponentTypes.Inventory)?.container.getItem(index);
            },
            getItems(entity) {
                const container = tryAccessComponent(entity, EntityComponentTypes.Inventory)?.container;
                if (container === undefined) return [];

                const items: ItemStack[] = [];
                for (let i = 0; i < container.size; i++) {
                    const item = container.getItem(i);
                    if (item === undefined) continue;
                    items.push(item);
                }
                return items;
            }
        });
        registry.register(id("slot.hotbar"), {
            slotRange: IntRange.minMax(0, 8),
            getItem(entity, index) {
                if (!(entity instanceof Player)) return;
                return tryAccessComponent(entity, EntityComponentTypes.Inventory)?.container.getItem(index);
            },
            getItems(entity) {
                const container = tryAccessComponent(entity, EntityComponentTypes.Inventory)?.container;
                if (container === undefined) return [];

                const items: ItemStack[] = [];
                for (let i = 0; i <= 8; i++) {
                    const item = container.getItem(i);
                    if (item === undefined) continue;
                    items.push(item);
                }
                return items;
            }
        });
        registry.register(id("slot.equippable"), {
            slotRange: IntRange.minOnly(0),
            getItem() {
                throw new NotImplementedError("slot.equippable って何?????????????");
            },
            getItems() {
                throw new NotImplementedError("slot.equippable って何?????????????");
            }
        });
        registry.register(id("slot.enderchest"), {
            slotRange: IntRange.minMax(0, 26),
            getItem(entity) {
                if (!(entity instanceof Player)) return undefined;
                throw new NotImplementedError("slot.enderchest は ScriptAPI からじゃコマンド使わないと取得できないんだ、ごめんよ");
            },
            getItems(entity) {
                if (!(entity instanceof Player)) return [];
                throw new NotImplementedError("slot.enderchest は ScriptAPI からじゃコマンド使わないと取得できないんだ、ごめんよ");
            }
        })
    })
});
