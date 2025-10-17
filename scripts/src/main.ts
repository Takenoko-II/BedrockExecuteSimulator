import { world } from "@minecraft/server";
import { Execute } from "./execute/Execute";

world.afterEvents.itemUse.subscribe(({ source, itemStack: { type: { id } } }) => {
    const execute: Execute = new Execute();

    execute.as("@e[type=armor_stand,scores={a=0}]").at("@e[type=armor_stand,scores={a=0}]").run(s => {
        world.scoreboard.getObjective("a")!!.addScore(s.getExecutor(), 1);
    });
});

/** TODO
 * hasitem=
 * execute()をGeneratorかそれに似た仕様にしたい
 * 同一座標のCSSの古い順ソート
 */
