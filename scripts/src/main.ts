import { world } from "@minecraft/server";
import { Execute } from "./execute/Execute";
import { MinecraftItemTypes } from "./lib/@minecraft/vanilla-data/lib/index";

world.afterEvents.itemUse.subscribe(event => {
    if (event.itemStack.type.id !== MinecraftItemTypes.Stick) return;

    const execute = new Execute();

    execute.as("@e").run("say a");
});

/** TODO
 * hasitem=
 * execute()をGeneratorかそれに似た仕様にしたい
 * 同一座標のCSSの古い順ソート
 */
