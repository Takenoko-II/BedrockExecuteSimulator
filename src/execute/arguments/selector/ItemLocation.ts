import { sentry, TypeModel } from "@typesentry";
import { Entity, ItemStack } from "@minecraft/server";
import { IntRange } from "@/utils/NumberRange";

export interface ItemLocation {
    readonly slotRange: IntRange;

    getItem(entity: Entity, index: number): ItemStack | undefined;

    getItems(entity: Entity): ItemStack[];
}

export const ItemLocationModel: TypeModel<ItemLocation> = sentry.structOf({
    slotRange: sentry.classOf(IntRange),
    getItem: sentry.functionOf(
        [
            sentry.classOf(Entity),
            sentry.number.nonNaN().int()
        ],
        sentry.undefindableOf(
            sentry.classOf(ItemStack)
        )
    ),
    getItems: sentry.functionOf(
        [
            sentry.classOf(Entity)
        ],
        sentry.arrayOf(
            sentry.classOf(ItemStack)
        )
    )
});
