import { world } from "@minecraft/server";
import { Execute } from "./execute/Execute";
import { CommandSourceStack, EntityAnchor } from "./execute/CommandSourceStack";
import { CommandSender } from "./execute/CommandSender";
import { BlockPredicateParser } from "./execute/arguments//block/BlockPredicateParser";
import { Vector3Builder } from "./util/Vector";
import { AxisSetParser } from "./execute/arguments/axis/AxisSetParser";
import { Fork } from "./execute/ExecuteForkIterator";

world.afterEvents.itemUse.subscribe(({ source, itemStack: { type: { id } } }) => {
    if (id !== "minecraft:armor_stand") return;

    new Execute().as("@e[type=armor_stand]").run(stack => {
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
    while (!result.done);

    new Execute().as("  @e[type=armor_stand]  ").at("@s").if.block("  ~~-0.1  ~ ", "wool  [\"color\"   =\"green\"]   ").align("xz").run(s => {
        s.getDimension().spawnParticle("minecraft:mobflame_single", s.getPosition());
    })

    const v = Vector3Builder.zero();

    AxisSetParser.readAxisSet("   zy ").apply(v, c => {
        return 1;
    });

    console.log(v);
});

/**
 * TODO
 * MapLike引数内の余計なキーを弾き忘れてる
 * 古い順ソートテスト
 */
