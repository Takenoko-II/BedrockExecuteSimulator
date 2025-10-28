# Bedrock Edition のエンティティアンカーの仕組み
超端的な説明

## 実行座標は単なる `Vector3` ではない
実行文脈は実行座標情報を保持するが、これは単なる `Vector3` ではなく、 `Entity | Vector3` の動的型である

## サブコマンドの作用

### 座標としてセレクタ値を受け取るサブコマンド
`at XX`, `positioned as XX` が該当
<br>実行座標に入ったオブジェクトを `Entity` に置き換えてフォークする

### 座標として非セレクタ値を受け取るサブコマンド
`positioned XX` のみが該当
<br>実行座標に入ったオブジェクトを `Vector3` に置き換えてリダイレクトする

### サブコマンド `anchored`
実行座標に `Entity` が入っていなかった場合は何もしない
<br>`Entity` が入っていた場合:

#### **eyes**
実行座標に入っている `Entity` から目の位置を `Vector3` として取り出し、新しい実行座標としてリダイレクトする

#### **feet**
実行座標に入っている `Entity` の位置を `Vector3` として取り出し、新しい実行座標としてリダイレクトする

## 上記による幾つかのコマンドの説明

### 1. anchored eyes -> positioned
```
execute at @s anchored eyes positioned ~ ~ ~ run ...
```

1. `at @s` によって実行座標が `Entity` になる
2. `anchored eyes` によって実行座標が `Entity` の目の位置の `Vector3` に置換される
3. `positioned ~ ~ ~` は `Vector3` を `Vector3` に変えようとするので、何も起こらない

最終的な実行座標は目の位置

### 2. positioned -> anchored eyes
```
execute at @s positioned ~ ~ ~ anchored eyes
```

1. `at @s` によって実行座標が `Entity` になる
2. `positioned ~ ~ ~` によって `Entity` が `Vector3` に変換される
3. `anchored eyes` は実行座標が既に `Vector3` なので何もしない

最終的な実行座標は足先の位置

### 3. anchored eyes -> anchored feet
```
execute at @s anchored eyes anchored feet
```

1. `at @s` によって実行座標が `Entity` になる
2. `anchored eyes` によって実行座標が `Entity` の目の位置の `Vector3` に置換される
3. `anchored feet` は実行座標が既に `Vector3` なので何もしない

最終的な実行座標は目の位置

### 4. anchored feet -> anchored eyes
```
execute at @s anchored feet anchored eyes
```

1. `at @s` によって実行座標が `Entity` になる
3. `anchored feet` によって実行座標が `Entity` の位置の `Vector3` に置換される
2. `anchored eyes` は実行座標が既に `Vector3` なので何もしない

最終的な実行座標は足先の位置

## つまり、

- 実行文脈が保持する実行座標は、 `Entity | Vector3` の動的型である
- `anchored` は実行座標の型を `Entity` → `Vector3` へと変換するサブコマンド
- `anchored eyes` は型変換時にエンティティの目の位置を変換結果の `Vector3` として使う
- `anchored feet` は型変換時にエンティティの足の位置を変換結果の `Vector3` として使う
