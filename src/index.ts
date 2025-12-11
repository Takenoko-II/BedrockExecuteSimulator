import { world } from "@minecraft/server";
import { Execute } from "./execute/Execute";
import { MinecraftItemTypes } from "@minecraft/vanilla-data";

world.afterEvents.itemUse.subscribe(({ itemStack: { type: { id } } }) => {
    if (id !== MinecraftItemTypes.Stick) return;

    const execute = new Execute();
    execute.as("@e[type=armor_stand,scores={a=0}]").at("@e[type=armor_stand,scores={a=0}]").run(s => {
        s.runCommand("scoreboard players add @s a 1");
        world.sendMessage(s.getExecutor().nameTag)
    })
});

/**
 * TODO
 * hasitem=
 */
