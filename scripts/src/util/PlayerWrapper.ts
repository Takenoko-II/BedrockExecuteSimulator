import { Container, ContainerSlot, Entity, EntityComponentTypes, EntityEquippableComponent, EquipmentSlot, ItemStack, Player, Vector3 } from "@minecraft/server";
import { TripleAxisRotationBuilder, Vector3Builder } from "./Vector";

export class PlayerWrapper {
    private readonly __player__: Player;

    private constructor(player: Player) {
        this.__player__ = player;
    }

    public getScriptPlayer(): Player {
        if (!this.__player__.isValid) {
            throw new Error("This player is not valid.");
        }

        return this.__player__;
    }

    public giveItem(itemStack: ItemStack): void {
        const container: Container | undefined = this.__player__.getComponent(EntityComponentTypes.Inventory)?.container;

        if (container === undefined) {
            throw new TypeError("Undefined Container");
        }

        const clone: ItemStack = itemStack.clone();

        let remainingAmount: number = itemStack.amount;

        for (let i = 0; i < container.size; i++) {
            const slot: ContainerSlot = container.getSlot(i);

            if (remainingAmount <= 0) break;
    
            if (!slot.hasItem()) continue;

            if (slot.isStackableWith(clone)) {
                let addend = Math.min(slot.amount + remainingAmount, 64) - slot.amount;
                remainingAmount -= addend;
                slot.amount += addend;
            }
        }

        if (remainingAmount > 0) {
            for (let i = 0; i < container.size; i++) {
                const slot: ContainerSlot = container.getSlot(i);

                if (remainingAmount <= 0) break;

                if (slot.hasItem()) continue;

                clone.amount = Math.min(remainingAmount, 64);
                slot.setItem(clone);
                remainingAmount -= 64;
            }
        }

        if (remainingAmount > 0) {
            clone.amount = remainingAmount;
            const entity: Entity = this.__player__.dimension.spawnItem(itemStack, this.__player__.getHeadLocation());
            entity.applyImpulse(Vector3Builder.from(this.__player__.getViewDirection()).scale(0.4));
        }
    }

    public hasItem(predicate: (itemStack: ItemStack) => boolean): boolean {
        const container: Container | undefined = this.__player__.getComponent(EntityComponentTypes.Inventory)?.container;

        if (container === undefined) {
            throw new TypeError("Undefined container");
        }

        for (let i = 0; i < container.size; i++) {
            const slot: ContainerSlot = container.getSlot(i);
            if (!slot.hasItem()) continue;
            if (predicate(slot.getItem() as ItemStack)) return true;
        }

        const equippableComponent: EntityEquippableComponent | undefined = this.__player__.getComponent(EntityComponentTypes.Equippable);

        if (equippableComponent === undefined) {
            throw new TypeError("Undefined equipment");
        }

        for (const slotId of Object.values(EquipmentSlot)) {
            if (slotId === EquipmentSlot.Mainhand) continue;

            const slot = equippableComponent.getEquipmentSlot(slotId);
            if (!slot.hasItem()) continue;
            if (predicate(slot.getItem() as ItemStack)) return true;
        }

        const cursorItem: ItemStack | undefined = this.__player__.getComponent(EntityComponentTypes.CursorInventory)?.item;

        if (cursorItem) {
            if (predicate(cursorItem)) return true;
        }

        return false;
    }

    public getPosition(): Vector3Builder {
        return Vector3Builder.from(this.__player__.location);
    }

    public getRotation(): TripleAxisRotationBuilder {
        return TripleAxisRotationBuilder.from(this.__player__.getRotation());
    }

    public getEyeLocation(): Vector3Builder {
        return Vector3Builder.from(this.__player__.getHeadLocation());
    }

    public getVelocity(): Vector3Builder {
        return Vector3Builder.from(this.__player__.getVelocity());
    }

    public setVelocity(velocity: Vector3): void {
        const vector = Vector3Builder.from(velocity);
        this.__player__.applyKnockback(vector.length(2.5), vector.y)
    }

    private static readonly __wrapperMap__: Map<Player, PlayerWrapper> = new Map();

    public static wrap(player: Player): PlayerWrapper {
        if (this.__wrapperMap__.has(player)) {
            return this.__wrapperMap__.get(player) as PlayerWrapper;
        }
        else {
            const instance = new this(player);
            this.__wrapperMap__.set(player, instance);
            return instance;
        }
    }
}
