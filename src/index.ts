import { EntitySwingSource, world } from "@minecraft/server";
import { Execute } from "./execute/Execute";
import { MinecraftItemTypes } from "@minecraft/vanilla-data";
import { Fork } from "./execute/ExecuteForkIterator";

world.afterEvents.itemUse.subscribe(({ itemStack: { type: { id } } }) => {
    if (id !== MinecraftItemTypes.Stick) return;

    const execute = new Execute();

    const iter = execute.as("@e[type=armor_stand,scores={a=0}]").at("@s").if.block("~~-1~", "grass_block").buildIterator({
        run(stack) {
            stack
        }
    });

    let r: IteratorResult<Fork, Fork>;
    do {
        r = iter.next();
        if (r.value.final) {
            r.value.stack.getExecutor().applyImpulse({ x:0,y:1,z:0 })
        }

        console.log(r.value.subCommand, r.value.final);
    }
    while(!r.done);
});
