import { Entity, system, world } from "@minecraft/server";
import { Execute } from "./execute/Execute";
import { MinecraftDimensionTypes, MinecraftEntityTypes, MinecraftItemTypes } from "./lib/@minecraft/vanilla-data/lib/index";
import { Vector3Builder } from "./util/Vector";
import { Anchored, EntityAnchor } from "./execute/subcommands/Anchored";
import { sentry, TypeModel } from "./lib/TypeSentry";
import { ENTITY_SELECTOR_ARGUMENT_TYPES, ENTITY_SELECTOR_REGISTRIES } from "./execute/arguments/selector/EntitySelectorRegistries";
import { SelectorArgumentTypes } from "./execute/arguments/selector/SelectorArgumentType";

world.afterEvents.itemUse.subscribe(({ source, itemStack: { type: { id } } }) => {
    if (id !== MinecraftItemTypes.Stick) return;


});

/**
 * TODO
 * hasitem=
 * 古い順ソートテスト
 */
await system.waitTicks(1)

const execute = new Execute();

execute.as("@e").run((s) => {
    console.log('"' + s.getExecutor().nameTag + '"')
});

class RegistryKey<T> {
    protected constructor(protected readonly name: string, protected readonly type: TypeModel<T>) {

    }

    public static createRegistryKey<V>(name: string, type: TypeModel<V>): RegistryKey<V> {
        return new RegistryKey(name, type);
    }
}

class Registry<T> {
    protected constructor(protected readonly key: RegistryKey<T>) {

    }

    public getKey(): RegistryKey<T> {
        return this.key;
    }
}
