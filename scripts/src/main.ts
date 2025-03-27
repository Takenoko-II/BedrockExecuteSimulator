import { world } from "@minecraft/server";
import { Execute } from "./execute/Execute";

world.afterEvents.itemUse.subscribe(({ source, itemStack: { type: { id } } }) => {
    const execute: Execute = new Execute();

    execute.as("@a").at("@s").anchored("eyes").align("xyz")
        .if.score("@s", "obj").$("=", "@s", "obj2")
        .positioned.$("^ ^ ^1")
        .run(s => {
            s.getPosition().getRotation2d().getLocalAxisProvider().left().getLocalAxisProvider()
        })
});

/** TODO
 * hasitem=
 * execute()をGeneratorかそれに似た仕様にしたい
 * 同一座標のCSSの古い順ソート
 */
