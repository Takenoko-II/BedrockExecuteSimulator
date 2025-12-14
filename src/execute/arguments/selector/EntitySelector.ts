import { Dimension, DimensionTypes, Entity, EntityQueryOptions, world } from "@minecraft/server";
import { MinecraftEntityTypes } from "@minecraft/vanilla-data";
import { CommandSourceStack } from "../../CommandSourceStack";
import { SelectorSortOrder, SelectorType } from "./SelectorType";
import { SelectorArguments } from "./SelectorArguments";
import { ENTITY_SELECTOR_REGISTRIES } from "./EntitySelectorRegistries";
import { PositionVectorResolver } from "../vector/PositionVectorResolver";
import { EntitySelectorInterpretError } from "./EntitySelectorParser";

export class EntitySelector {
    public readonly isSingle: boolean;

    private readonly entityQueryOptionsBase: EntityQueryOptions;

    private readonly positionVectorResolver: PositionVectorResolver;

    public constructor(public readonly selectorType: SelectorType, public readonly selectorArguments: SelectorArguments) {
        this.entityQueryOptionsBase = selectorArguments.getQueryOptionsBase();
        this.positionVectorResolver = selectorArguments.getPositionVectorResolver();

        const c = selectorArguments.getValueDirectly("c");
        if (selectorType.traits.limit === 1) {
            this.isSingle = c === undefined || c === 1 || c === -1;
        }
        else {
            this.isSingle = c === 1 || c === -1;
        }

        if (selectorType.traits.typeSpecific?.overridable === false && selectorArguments.hasAnyOf("type")) {
            throw new EntitySelectorInterpretError("セレクタ引数 'type' はエンティティ種の強制のないセレクタにのみ適用できます");
        }
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

        entities = this.selectorArguments.filterByHasPermission(entities);
        entities = this.selectorArguments.filterByHasItem(entities);

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

        if (this.selectorType.traits.processor) {
            entities = this.selectorType.traits.processor(stack, entities);
        }

        if (this.selectorArguments.hasAnyOf("c")) {
            const c = this.selectorArguments.getValueDirectly("c")!;

            if (c < 0) {
                entities.reverse();
            }

            entities.splice(Math.abs(c));
        }
        else if (this.selectorType.traits.limit !== undefined) {
            entities.splice(this.selectorType.traits.limit);
        }

        return entities;
    }

    public toString(): string {
        for (const { identifier, value } of ENTITY_SELECTOR_REGISTRIES.get("bedrock_execute_simulator:entity_selector_types").getEntries()) {
            if (value === this.selectorType) {
                return identifier.value + this.selectorArguments;
            }
        }

        throw new Error("NEVER HAPPENS");
    }
}
