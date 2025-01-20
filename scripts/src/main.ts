import { ScoreboardObjective, world } from "@minecraft/server";
import { Execute } from "./execute/Execute";
import { MinecraftItemTypes } from "./lib/@minecraft/vanilla-data/lib/index";

const objective = world.scoreboard.getObjective("a") as ScoreboardObjective;

world.afterEvents.itemUse.subscribe(event => {
    if (event.itemStack.type.id !== MinecraftItemTypes.Stick) return;

    new Execute()
        .at("@p")
        .as("@e[scores={a=0},type=armor_stand]")
        .at("@e[scores={a=0},type=armor_stand]")
        .run(stack => {
            objective.addScore(stack.getExecutor(), 1);
        });

    world.sendMessage("\n".repeat(10));

    new Execute()
        .at("@p")
        .as("@e[scores={a=1..}]")
        .run(stack => {
            const executor = stack.getExecutor();
            world.sendMessage(`[${executor.nameTag}] score 'a' = ${objective.getScore(executor)}`);
        });
});

/** TODO
 * 実行順のより厳密なテスト
 * haspermission=
 * hasitem=
 * どうせまだあるであろうパーサーのバグ修正(BlockReaderとか)
 * execute()をGeneratorかそれに似た仕様にしたい
 * 同一座標のCSSの古い順ソート
 */
