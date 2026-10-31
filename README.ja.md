# Contribrise

**学びの軌跡を、見える形に。**

GitHubの年初からの累積Contributionsを並べ、日々の積み重ねやペースを振り返る小さなローカルアプリです。日本語・英語に対応しています。活動数は学習成果やスキルそのものを測る指標ではありません。

[English](README.md)

## 起動

Python 3.10以降、ログイン済みの[GitHub CLI](https://cli.github.com/)、インターネット接続が必要です。GitHub CLIは`gh auth login`で設定します。追加パッケージ、ビルド、アプリへのトークン入力は不要です。

```sh
python app.py --open
```

Windowsでは`start.cmd`をダブルクリックできます。通常の接続先は`http://127.0.0.1:8783`です。`--port`で変更でき、別のアプリが使用中の場合は空いているポートを選びます。

GitHubユーザー名をカンマ・空白で区切って最大5件入力し、年を選んで表示します。チャートにカーソルを合わせるかタップすると、その日の累積値を確認できます。凡例のアカウントを押すと線を非表示にできます。言語とユーザー名はブラウザに保存され、比較条件はURLにも残ります。

ブラウザを閉じても取得処理は待機します。終了を自分で操作する場合は、ターミナルから`python app.py`で起動し、使い終わったらCtrl+Cを押します。

## データとプライバシー

- 既存のGitHub CLIログインを使い、GitHub GraphQL APIのContribution Calendarから取得します。取得結果はメモリー内に5分間キャッシュします。
- Contributionsには、条件を満たすコミットやその他のGitHub活動が含まれます。非公開活動は、ログイン中のアカウントにGitHubが表示する件数を含み、閲覧権限によって結果が異なる場合があります。
- 接続はこのPC内に限定しています。個人のGitHub認証情報を使う公開Webサービスとしての配信には対応していません。
- ユーザー名と言語はブラウザに保存されます。比較するユーザー名と年はURLにも含まれます。認証情報はGitHub CLIが管理し、Contribriseはブラウザへの送信やファイルへの保存を行いません。
- アクセス解析、外部スクリプト、データベース、活動履歴の保存はありません。

集計条件はGitHubの[Profile contributions reference](https://docs.github.com/en/account-and-profile/reference/profile-contributions-reference)を参照してください。

## 構成

`app.py`がデータを取得し、`index.html`、`style.css`、`app.js`を配信します。チャートは標準のSVGで描画します。`start.cmd`はWindows用の起動ファイルです。

```sh
python -m unittest
```

## ライセンス

[MIT](LICENSE)
