import { world } from "@minecraft/server";
import { Execute } from "./execute/Execute";
import { Vector3Builder } from "./util/Vector";

world.afterEvents.itemUse.subscribe(event => {
    const execute = new Execute();

    let i = 0;

    execute.positioned.$("0 0 0").as("@e[type=armor_stand,scores={a=1,bee=2,cpp=!5..25}]").at("@s").run(css => {
        i++;
        css.getExecutor().applyImpulse(Vector3Builder.up());
        css.getDimension().spawnParticle("minecraft:basic_flame_particle", css.getPosition());
        console.log(css.getExecutor().nameTag, i);
    });
});

/** TODO
 * 実行順のより厳密なテスト
 * haspermission=
 * hasitem=
 * どうせまだあるであろうパーサーのバグ修正(BlockReaderとか)
 * build()をrun()と統合してGeneratorにする
 * 同一座標のCSSの古い順ソート
 */
