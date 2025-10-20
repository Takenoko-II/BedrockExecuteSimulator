import { EntityInitializationCause, GameMode, Player, PlayerPlaceBlockAfterEvent, world, WorldAfterEvents } from "@minecraft/server";
import { Execute } from "./execute/Execute";
import { EntitySelector, EntitySelectorParser } from "./execute/arguments/EntitySelectorParser";
import { DualAxisRotationBuilder, Vector3Builder } from "./util/Vector";
import { CommandSourceStack } from "./execute/CommandSourceStack";
import { CommandSender } from "./execute/CommandSender";
import { RegistryKey } from "./util/Registry";

world.afterEvents.itemUse.subscribe(({ source, itemStack: { type: { id } } }) => {
    const execute: Execute = new Execute();

    execute.as("@e[type=armor_stand,scores={a=0}]").at("@e[type=armor_stand,scores={a=0}]").run(s => {
        world.scoreboard.getObjective("a")!!.addScore(s.getExecutor(), 1);
    });

    const selector = EntitySelectorParser.readSelector("@e[type=!minecraft:player,c=3,y=~100,name=!e,scores={XPBar.Value=1..100}]");
    EntitySelectorParser.readSelector("@a[m=!s]").getEntities(new CommandSourceStack(CommandSender.of(source))).forEach(e => e.applyImpulse({x:0,y:1,z:0}))

    console.log(world.getDimension("overworld").getEntities({ excludeGameModes: [GameMode.Survival] }).length);

    selector.getEntities(new CommandSourceStack(CommandSender.of(source))).forEach(e => {
        world.sendMessage(e.typeId + ":" + (e.nameTag ?? ""));
        e.applyImpulse({ x: 0, y: 1, z: 0 })
    });
});

/** TODO
 * hasitem=
 * execute()をGeneratorかそれに似た仕様にしたい
 * 同一座標のCSSの古い順ソート
 */
