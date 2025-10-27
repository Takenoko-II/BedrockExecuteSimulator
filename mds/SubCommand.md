# サブコマンドの分類
サブコマンドには主に3種類ある

## リダイレクトサブコマンド
`positioned X`, `facing X`, `rotated X`, `align X`, `anchored X`, `in X` が該当
<br>実行文脈ひとつに対して、情報を更新した新しい実行文脈をひとつ作成して返す
<br>いわゆる分岐は発生しない

## フォークサブコマンド
`as X`, `at X`, `positioned as X`, `rotated as X`, `facing entity X X`が該当
<br>実行文脈ひとつに対して、新しい実行文脈を複数作成して返す
<br>いわゆる分岐が発生する

## ガードサブコマンド
`if`, `unless` が該当