import { world } from "@minecraft/server";
import { Execute } from "./execute/Execute";
import { MinecraftItemTypes } from "./lib/@minecraft/vanilla-data/lib/index";
import { ExecuteForkIteratorResult } from "./execute/ExecuteForkIterator";
import { CommandSourceStack } from "./execute/CommandSourceStack";
import { CommandSender } from "./execute/CommandSender";

world.afterEvents.itemUse.subscribe(({ source, itemStack: { type: { id } } }) => {
    if (id !== MinecraftItemTypes.Stick) return;

    new Execute().as("@e[type=armor_stand]").run("scoreboard players set @s a 0")

    const execute = new Execute(new CommandSourceStack(CommandSender.getEntitySender(source)))
        .as("@e[type=armor_stand, scores={a=0}]").at("@e[type=armor_stand, scores={a=0}]").positioned.$("~ ~10 ~").facing.entity("@s", "feet").positioned.$("^ ^ ^5");

    new Execute().as("@a").at("@s").positioned.$("0.0 0.0 0.0").positioned.$("^^^-2").positioned.$("~~ 0.0").positioned.$("^^^1").facing.$("0.0 0.0 0.0")
    .facing.$("^^^-1").positioned.as("@s").run("particle minecraft:basic_flame_particle ^ ^ ^2")

    const iterator = execute.buildIterator();

    let result: ExecuteForkIteratorResult;
    do {
        result = iterator.next();

        result.run(stack => {
            world.scoreboard.getObjective("a")!.addScore(stack.getExecutor(), 1);
            stack.getDimension().spawnParticle("minecraft:basic_flame_particle", stack.getPosition());
        });
    }
    while (!result.done);
});

/**
 * TODO
 * MapLike引数内の余計なキーを弾き忘れてる
 * 古い順ソートテスト
 */
