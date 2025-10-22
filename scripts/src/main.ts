import { world } from "@minecraft/server";
import { Execute, Fork } from "./execute/Execute";

world.afterEvents.itemUse.subscribe(({ source, itemStack: { type: { id } } }) => {
    new Execute().as("@e[type=armor_stand]").run(stack => {
        world.scoreboard.getObjective("a")!!.setScore(stack.getExecutor(), 0);
    });

    const execute: Execute = new Execute();

    execute.as("@e[type=armor_stand,scores={a=0}]").at("@e[type=armor_stand,scores={a=0}]").run(s => {
        // world.scoreboard.getObjective("a")!!.addScore(s.getExecutor(), 1);
    });

    const iter = execute.buildIterator();

    let i =0;
    let result: IteratorResult<Fork, Fork>;
    do {
        result = iter.next();

        if (result.value.final) world.scoreboard.getObjective("a")!!.addScore(result.value.stack.getExecutor(), 1);
        i++;
        console.log(typeof result.value);

        if (i > 100) {
            throw new Error("OVERFLOW!!!");
        }
    }
    while (!result.done);
});

/** TODO
 * hasitem=の実装
 * BlockReader, AxesReader, VectorReaderをAbstractParserベースに書き換える
 * 同一座標のCSSの古い順ソート
 */
