# BedrockExecuteSimulator

名前のとおり
<br>開発中

## executeメモ書き
- ### [エンティティアンカーの仕組み](/mds/EntityAnchor.md)
- ### [サブコマンドの分類](/mds/SubCommand.md)

## 実装済みの機能

### 1. `execute`コマンドの再現
`as`, `at`, `run`, `if`, `unless`, `in`, `facing`, `rotated`, `positioned`, `align`, `anchored`,
<br>すべてのサブコマンドの動作はバグ的挙動・BE特有の実行順序を含め再現済み

```ts
import { Execute } from "./execute/Execute";

const execute = new Execute();

// execute as @e[type=armor_stand,scores={a=0}] at @e[type=armor_stand,scores={a=0}] run scoreboard players add @s a 1
execute.as("@e[type=armor_stand,scores={a=0}]").at("@e[type=armor_stand,scores={a=0}]").run("scoreboard players add @s a 1");
```

### 2. コマンド以外の処理の実行
サブコマンド`run`に任意のコールバックを指定可能

```ts
import { Execute } from "./execute/Execute";

const execute = new Execute();

execute.as("@e[type=armor_stand,scores={a=0}]").at("@e[type=armor_stand,scores={a=0}]").run(stack => {
    world.scoreboard.getObjective("a")!.addScore(stack.getExecutor(), 1);
});
```

### 3. 実行文脈のイテレータの取得
実行文脈の遷移をじっくり確認できる

```ts
import { world } from "@minecraft/server";
import { Execute } from "./execute/Execute";
import { Fork } from "./execute/ExecuteForkIterator";

const execute: Execute = new Execute();

execute.as("@e[type=armor_stand,scores={a=0}]").at("@e[type=armor_stand,scores={a=0}]");

// イテレータを取得
const iter = execute.buildIterator();

let result: IteratorResult<Fork, Fork>;
do {
    // 実行文脈のフォークまたはリダイレクト一回単位で取得できる
    result = iter.next();

    // final=trueの場合、その分岐の最後のサブコマンド(run)ということ
    if (result.value.final && result.value.stack) {
        world.scoreboard.getObjective("a")!.addScore(result.value.stack.getExecutor(), 1);
    }
}
while (!result.done);
```

### 4. パーサの使用
エンティティセレクタパーサ, ブロック条件パーサ, 座標入力パーサなどを単体で利用可能

```ts
import { Entity } from "@minecraft/server";
import { EntitySelector, EntitySelectorParser } from "./execute/arguments/EntitySelector";
import { CommandSourceStack } from "./execute/CommandSourceStack";

const selector: EntitySelector = EntitySelectorParser.readSelector("@e[type=player,scores={foo.bar:bazbazbaz=0..3},haspermission={camera=disabled}]");
const entities: Entity[] = selector.getEntities(new CommandSourceStack());
```

### 5. 実行文脈へのアクセス／実行文脈の作成
実行文脈は`CommandSourceStack`クラスで管理されている

```ts
import { world } from "@minecraft/server";
import { Execute } from "./execute/Execute";
import { CommandSender } from "./execute/CommandSender";
import { CommandSourceStack } from "./execute/CommandSourceStack";
import { MinecraftBlockTypes } from "@minecraft/vanilla-data";

world.afterEvents.itemUse.subscribe(event => {
    const sender = CommandSender.getEntitySender(event.source);
    const stack = new CommandSourceStack(sender);
    const execute = new Execute(stack);

    execute.anchored("eyes").positioned.$("^ ^ ^1").run(ctx => {
        const block = ctx.getDimension().getBlock(ctx.getPosition())!;
        block.setType(MinecraftBlockTypes.DiamondBlock);

        console.log(ctx.getExecutor().nameTag, ctx.getRotation());
    });
});
```

## 未実装の機能／TODO
- セレクタ引数 `hasitem` によるフィルタ
- 選択される複数のエンティティの位置が一致していた場合のID順ソート
- 実行文脈の遷移の視覚化機能
- エンティティセレクタ `@initiator` (作るか悩み中)
- `ExecuteForkIterator` がまあクソコード -> TODO リファクタリング中 一通り直したらコマンドのサーバーにでも投げようかな

## 既知のバグ
同一座標に重なったエンティティにプレイヤーが含まれる場合のソート順が正しくない(`getEntities()` の戻り値はつねにプレイヤーが最後に来てしまう？)

## 実装上の留意点

### エンティティセレクタ
- セレクタ引数 `m=` は反転であっても重複できない
- Map(オブジェクト) を値にとるセレクタ引数はすべて重複を許可し、意味の重複するものは最後の入力を使う
- セレクタ引数 `type=` だけ特別扱い

## dev

### 準備

(Bun前提) リポジトリcloneして

```powershell
bun init
bun i @minecraft/vanilla-data

# 必要に応じて
# bun i @minecraft/server
# bun i @minecraft/server-ui
# bun i @minecraft/server-gametest
# bun i @minecraft/debug-utilities
```

### 型チェック／トランスパイル／バンドル

ターミナルで以下を実行
```powershell
# 全部やる
bun run build
```

scriptsフォルダが作成される...はず
<br>tsgoはやくこい

### Minecraftへの導入
- `development_behavior_packs` に入れるのがおすすめ
- `DebugDrawer` 使うからベータAPI必須！！！！！！！
- [`index.ts`](src/index.ts)がエントリポイントになってる
