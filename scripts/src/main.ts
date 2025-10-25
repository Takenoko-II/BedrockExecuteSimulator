import { world } from "@minecraft/server";
import { Execute, Fork } from "./execute/Execute";
import { CommandSourceStack, EntityAnchor } from "./execute/CommandSourceStack";
import { CommandSender } from "./execute/CommandSender";
import { EntitySelectorParser } from "./execute/arguments/EntitySelector";

world.afterEvents.itemUse.subscribe(({ source, itemStack: { type: { id } } }) => {
    if (id !== "minecraft:armor_stand") return;

    /*new Execute().as("@e[type=armor_stand]").run(stack => {
        world.scoreboard.getObjective("a")!.setScore(stack.getExecutor(), 0);
    });

    const execute: Execute = new Execute();

    execute.as("@e[type=armor_stand,scores={a=0}]").at("@e[type=armor_stand,scores={a=0}]");

    const iter = execute.buildIterator();

    let result: IteratorResult<Fork, Fork>;
    do {
        result = iter.next();
        if (result.value.final && result.value.stack) {
            world.scoreboard.getObjective("a")!.addScore(result.value.stack.getExecutor(), 1);
        }
    }
    while (!result.done);*/

    const execute = new Execute(new CommandSourceStack(CommandSender.getEntitySender(source)));

    console.log(JSON.stringify(EntitySelectorParser.readSelector("@e[type=armor_stand,name=!\"a\",scores={a=!1}]")));

    execute.positioned.$("0.0 0.0 0.0").positioned.$("^^^-2").positioned.$("~~ 0.0").positioned.$("^^^1").facing.$("0.0 0.0 0.0")
    .facing.$("^^^-1").positioned.as("@s").positioned.$("^^^1").run("particle minecraft:basic_flame_particle ^ ^ ^1");
});

/**
 * TODO
 * MapLike引数内の余計なキーを弾き忘れてる
 * 古い順ソートテスト
 * Reader系をAbstractParserに置換
 * EntitySelector.pair()のキー読み取りがクォートを許可してしまう(Abstparsr.str()がわるい)
 */
