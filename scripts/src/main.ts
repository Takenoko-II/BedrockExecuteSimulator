import { world } from "@minecraft/server";
import { Execute } from "./execute/Execute";
import { MinecraftItemTypes } from "./lib/@minecraft/vanilla-data/lib/index";

world.afterEvents.itemUse.subscribe(event => {
    if (event.itemStack.type.id !== MinecraftItemTypes.Stick) return;

    new Execute()
        .as("@e[c=2]")
        .as("@e[c=2]")
        .as("@e[c=2]")
        .as("@e[c=2]")
        .as("@a")
        .at("@s")
        .if.block("^ ^ ^0.75", "air")
        .run("tp ^ ^ ^0.75");
});

/** TODO
 * hasitem=
 * execute()をGeneratorかそれに似た仕様にしたい
 * 同一座標のCSSの古い順ソート
 */
