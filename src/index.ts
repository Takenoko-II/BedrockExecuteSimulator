import { world } from "@minecraft/server";
import { Execute } from "./execute/Execute";
import { MinecraftItemTypes } from "@minecraft/vanilla-data";
import { Fork } from "./execute/ForkIterator";

world.afterEvents.itemUse.subscribe(({ itemStack: { type: { id } } }) => {
    if (id !== MinecraftItemTypes.Stick) return;

    const execute = new Execute();

    const iter = execute.as("@e[type=armor_stand,scores={a=0}]").at("@s").if.block("~~-1~", "grass_block").buildIterator({
        run(stack) {
            stack.getExecutor().applyImpulse({ x:0,y:1,z:0 });
        }
    });

    let r: IteratorResult<Fork, Fork>;
    do {
        r = iter.next();
    }
    while(!r.done);

    new Execute().as("@e[hasitem={item=apple,location=slot.inventory,slot=1,quantity=1..5}]").run("say apple 1 ~ 5")
});
