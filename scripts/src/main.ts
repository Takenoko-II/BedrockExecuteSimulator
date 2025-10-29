import { system, world } from "@minecraft/server";
import { Execute } from "./execute/Execute";
import { MinecraftItemTypes } from "./lib/@minecraft/vanilla-data/lib/index";

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
    console.log(s.getExecutor().id)
});
