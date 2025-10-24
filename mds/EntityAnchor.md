# Bedrock Edition のエンティティアンカーの仕組み
「位置ソース」による説明

> [!WARINING]
> 「位置ソース」が存在するかどうかは不明であり、あくまで「説明がつく」というだけです
> <br>内部実装がどうなっているかは諸説あります
> <br>「位置ソース」の代わりに「目の高さ」を説明に用いると「目の高さ」取得タイミングが 「`anchored` 実行時」 -> 「`実行座標設定時`」 になります

## 実行文脈は「位置ソース」情報を持つ
実行文脈は実行者や実行座標を保持するように, 実行文脈は「位置ソース」を保持する
<br>型は `Entity | null` である

## サブコマンドの作用
サブコマンドは実行文脈の情報を更新する作用を持つ

### サブコマンド `at X`, `positioned as X`
> これらのサブコマンドは
> - 「実行座標」 = **X** の座標
> - 「位置ソース」 = **X**
> 
> にする

### サブコマンド `positioned X`
> このサブコマンドは
> - 「実行座標」 = **X** の座標
> - 「位置ソース」 = **null**
> 
> にする

### サブコマンド `anchored X`
> このサブコマンドは
> - 「実行座標のY成分」 += (X == eyes ならば **位置ソースの目の高さ**, X == feet ならば **0**)
> - 「位置ソース」 = **null**
> 
> にする

## 上記による幾つかのコマンドの説明

### 1. anchored eyes -> positioned
```
execute at @s anchored eyes positioned ~ ~ ~ run ...
```

1. `at @s` によって位置ソースが `@s` になる
2. `anchored eyes` によって実行座標のY成分に位置ソース `@s` の目の高さが足され、位置ソースが `null` になる
3. `positioned ~ ~ ~` によって**実行座標はそのまま**に、位置ソースが `null` になる(つまり変わらない)

最終的な実行座標は目の位置

### 2. positioned -> anchored eyes
```
execute at @s positioned ~ ~ ~ anchored eyes
```

1. `at @s` によって位置ソースが `@s` になる
2. `positioned ~ ~ ~` によって実行座標はそのままに、位置ソースが `null` に**上書き**される
3. `anchored eyes` によって実行座標のY成分に位置ソース `null` の目の高さ(`=0`)が足され、位置ソースが `null` になる(つまり変わらない)

最終的な実行座標は足先の位置

### 3. anchored eyes -> anchored feet
```
execute at @s anchored eyes anchored feet
```

1. `at @s` によって位置ソースが `@s` になる
2. `anchored eyes` によって実行座標のY成分に位置ソース `@s` の目の高さが足され、位置ソースが `null` になる
3. `anchored feet` によって実行座標Y成分に `0` が足され(つまり変わらない)、位置ソースが `null` になる(つまり変わらない)

最終的な実行座標は目の位置

### 4. anchored feet -> anchored eyes
```
execute at @s anchored feet anchored eyes
```

1. `at @s` によって位置ソースが `@s` になる
3. `anchored feet` によって実行座標Y成分に `0` が足され(つまり変わらない)、位置ソースが `null` になる
2. `anchored eyes` によって実行座標のY成分に位置ソース `null` の目の高さ(`=0`)が足され、位置ソースが `null` になる(つまり変わらない)

最終的な実行座標は足先の位置

## つまり、

- `anchored feet` は「位置ソース」を空にするサブコマンド
- `anchored eyes` は実行座標を「位置ソース」の目の高さだけ上げてから「位置ソース」を空にするサブコマンド
- `positioned`　や `at` 等の実行座標変更系サブコマンドは、引数にセレクタを取る場合のみ位置ソースを変更し、取らない場合空にする
