import { Dimension, DimensionTypes, Entity, EntityQueryOptions, Player, world } from "@minecraft/server";
import { MinecraftEntityTypes } from "../../../lib/@minecraft/vanilla-data/lib/index";
import { IntRange } from "../../../util/NumberRange";
import { CommandSourceStack } from "../../CommandSourceStack";
import { SelectorSortOrder, SelectorType } from "./SelectorType";
import { SelectorArguments } from "./SelectorArguments";
import { HasItem, HasPermission, SelectorArgumentTypes } from "./SelectorArgumentType";
import { ENTITY_SELECTOR_REGISTRIES, ENTITY_SELECTOR_TYPES } from "./EntitySelectorRegistries";
import { PositionVectorResolver } from "../vector/PositionVectorResolver";
import { Vector3Builder } from "../../../util/Vector";

export class EntitySelector {
    public readonly isSingle: boolean;

    private readonly entityQueryOptionsBase: EntityQueryOptions;

    private readonly positionVectorResolver: PositionVectorResolver;

    public constructor(public readonly selectorType: SelectorType, public readonly selectorArguments: SelectorArguments) {
        this.entityQueryOptionsBase = selectorArguments.getQueryOptionsBase();
        this.positionVectorResolver = selectorArguments.getPositionVectorResolver();

        const c = selectorArguments.getAsDirectValue("c");
        if (selectorType.traits.limit === 1) {
            this.isSingle = c === undefined || c === 1 || c === -1;
        }
        else {
            this.isSingle = c === 1 || c === -1;
        }
    }

    private hasPermission(entities: Entity[]): Entity[] {
        if (this.selectorArguments.hasAnyOf("haspermission")) {
            // haspermission=が指定された時点でプレイヤーのみに絞られる
            const permissions = this.selectorArguments.getAsDirectValue("haspermission")!;

            return entities.filter(entity => {
                if (entity instanceof Player) {
                    for (const __name__ of Object.keys(permissions)) {
                        const name = __name__ as keyof HasPermission;
                        const values = permissions[name as keyof HasPermission]!;

                        const isEnabled = entity.inputPermissions.isPermissionCategoryEnabled(SelectorArgumentTypes.getInputPermissionCategory(name));

                        for (const { value } of values) {
                            if (isEnabled && value === "disabled") {
                                return false;
                            }
                            else if (!isEnabled && value === "enabled") {
                                return false;
                            }
                        }
                    }

                    return true;
                }
                else return false;
            });
        }
        else return entities;
    }

    private hasItem(entities: Entity[]): Entity[] {
        if (this.selectorArguments.hasAnyOf("hasitem")) {
            const hasItem = this.selectorArguments.getAsDirectValue("hasitem")!;
            const conditions: HasItem[] = Array.isArray(hasItem) ? hasItem : [hasItem];

            for (const condition of conditions) {
                // なんとquantityは上書き
                const effectiveItem: string = condition.item[condition.item.length - 1].value;
                const effectiveLocation: string | undefined = condition.location ? condition.location[condition.location.length - 1].value : undefined;
                const effectiveSlot: number | undefined = condition.slot ? condition.slot[condition.slot.length - 1].value : undefined;
                const effectiveQuantity: number | IntRange | undefined = condition.quantity ? condition.quantity[condition.quantity.length - 1].value : undefined;
                const effectiveData: number | undefined = condition.data ? condition.data[condition.data.length - 1].value : undefined;

                // TODO: hasitem=の実装
                /*for (const entity of entities) {
                    // Q. コンポーネントを持たないエンティティはquantity=0を通るのか?
                    entity.hasComponent(EntityComponentTypes.Inventory);
                }*/
            }

            return entities;
        }
        else return entities;
    }

    public getEntities(stack: CommandSourceStack): Entity[] {
        const entityQueryOptions: EntityQueryOptions = { ...this.entityQueryOptionsBase };

        const basePos = this.positionVectorResolver.resolve(stack);
        entityQueryOptions.location = basePos;

        let dimensions: Dimension[];
        // ディメンション制約チェック
        if (this.selectorArguments.hasAnyOf("dx", "dy", "dz", "r", "rm")) {
            dimensions = [stack.getDimension()];
        }
        else {
            dimensions = DimensionTypes.getAll().map(({ typeId }) => world.getDimension(typeId));
        }

        let entities: Entity[];
        if (this.selectorType.aliveOnly) {
            entities = dimensions.flatMap(dimension => dimension.getEntities(entityQueryOptions));
        }
        else {
            entities = dimensions.flatMap(dimension => dimension.getEntities({ ...entityQueryOptions, excludeTypes: [MinecraftEntityTypes.Player] }));

            if (!(entityQueryOptions.excludeTypes?.includes(MinecraftEntityTypes.Player) || entityQueryOptions.excludeTypes?.includes("player"))) {
                entities.push(...dimensions.flatMap(dimension => dimension.getPlayers(entityQueryOptions)));
            }
        }

        if (this.selectorType.traits.typeSpecific) {
            if (this.selectorType.traits.typeSpecific.overridable) {
                entities = entities.filter(entity => entity.typeId === this.selectorType.traits.typeSpecific?.type);
            }
            else if ((entityQueryOptions.type === undefined && entityQueryOptions.excludeTypes === undefined)) {
                entities = entities.filter(entity => entity.typeId === this.selectorType.traits.typeSpecific?.type);
            }
        }

        entities = this.hasPermission(entities);
        entities = this.hasItem(entities);

        switch (this.selectorType.sortOrder) {
            case SelectorSortOrder.NEAREST: {
                entities.sort((a, b) => {
                    return basePos.getDistanceTo(a.location) - basePos.getDistanceTo(b.location);
                });
                break;
            }
            case SelectorSortOrder.RANDOM: {
                entities.sort(() => {
                    return Math.random() - Math.random();
                });
                break;
            }
        }

        if (this.selectorArguments.hasAnyOf("c")) {
            const c = this.selectorArguments.getAsDirectValue("c")!;

            if (c < 0) {
                entities.reverse();
            }

            entities.splice(Math.abs(c));
        }
        else if (this.selectorType.traits.limit !== undefined) {
            entities.splice(this.selectorType.traits.limit);
        }

        if (this.selectorType.traits.processor) {
            entities = this.selectorType.traits.processor(stack, entities);
        }

        return entities;
    }

    public toString(): string {
        for (const { name, value } of ENTITY_SELECTOR_REGISTRIES.get(ENTITY_SELECTOR_TYPES).lookup.entries()) {
            if (value === this.selectorType) {
                return name + this.selectorArguments;
            }
        }

        throw new Error("NEVER HAPPENS");
    }
}
