import { CommandPermissionLevel, CustomCommandParamType, CustomCommandStatus, EntitySwingSource, system, world } from "@minecraft/server";
import { Execute } from "./execute/Execute";
import { MinecraftEffectTypes, MinecraftItemTypes } from "@minecraft/vanilla-data";
import { Fork } from "./execute/ForkIterator";
import { SourceDisplay } from "./visualizer/SourceDisplay";

await system.waitTicks(1);

const execute = new Execute();

    const iter = execute.as("@e[type=armor_stand,scores={a=0}]").at("@s").if.block("~~-1~", "grass_block").buildIterator({
        run(stack) {
            stack.getExecutor().applyImpulse({ x:0,y:1,z:0 });
        }
    });

    const _ = function*() {
        let r: IteratorResult<Fork, Fork>;
        let s: SourceDisplay | undefined = undefined;
        do {
            r = iter.next();
            s?.hide();
            s = new SourceDisplay(r.value.stack);
            s.show();
            yield;
        }
        while(!r.done);
    }();

world.afterEvents.itemUse.subscribe(({ itemStack: { type: { id } } }) => {
    if (id !== MinecraftItemTypes.Stick) return;

    _.next();

    new Execute().as("@e[hasitem={item=apple,location=slot.inventory,slot=1,quantity=1..5}]").run("say apple 1 ~ 5")
});
