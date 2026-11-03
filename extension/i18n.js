// Bangermeter — UI strings: English keys, Japanese table, static-page translator.
// Loaded before content.js, popup.js and welcome.js (same isolated world).
//
// English stays in the code as the key: t("Show the math"). A string with no
// Japanese entry renders in English, so a label X adds next week still shows
// up, just untranslated, and a reworded English line never shows stale
// Japanese. Values go in as {named} placeholders, never concatenated, because
// Japanese word order differs.
//
// The Japanese is sysCat's (@sysCat64), from sysCat64/bangermeter-ja at
// f989ddc, used under this repository's MIT license (their fork keeps it).
// JA holds Japanese a native speaker wrote or reviewed and is the only table
// t() reads. JA_DRAFT holds Japanese nobody has reviewed yet; it is never
// served and moves into JA after review. Code names stay as written inside
// Japanese: param.rs, file paths, ×0.75, head names.

var BANGERMETER_I18N = (function () {
  "use strict";

  var JA = {
    // Badge, panel and draft meter. sysCat's exact entries.
    "3+ hashtags": "ハッシュタグ3つ以上",
    "3+ hashtags — the old algorithm flags hashtag piles": "ハッシュタグ3つ以上 — 旧アルゴリズムはハッシュタグの羅列にフラグを立てる",
    "About these scores": "このスコアについて",
    "Any post whose weighted sum goes net-negative is rescaled below every positive post, no matter what else it earned.": "重み付き合計が正味でマイナスになった投稿は、ほかにどんな反応を得ていても、プラスの投稿すべての下に再スケールされます。",
    "Asks a question": "質問している",
    "Asks a question — invites replies, the algorithm's favorite signal": "質問になっている — リプライを呼ぶ、アルゴリズムが最も好むシグナル",
    "Author diversity decay": "投稿者の多様性による減衰",
    "Bangermeter score breakdown": "Bangermeter スコアの内訳",
    "Bangermeter — click for breakdown, click again to close": "Bangermeter — クリックで内訳を表示、もう一度クリックで閉じる",
    "Bare link (little text)": "リンクだけ（文章が少ない）",
    "Block author": "投稿者をブロック",
    "Bookmarks have no head at all — they are not a scored action in 2026.": "ブックマークには対応する項目がそもそもなく、2026年時点ではスコア対象の行動ではありません。",
    "Can't score this one — the view count isn't visible, so there's nothing to compute rates from.": "この投稿はスコアを出せません — 表示回数が見えないため、率を計算する材料がありません。",
    "Click dwell": "クリック後の滞在",
    "Close breakdown": "内訳を閉じる",
    "Community Note attached — future engagement suppressed ~50% (three causal studies)": "コミュニティノートあり — 今後の反応が約50%抑えられる（3件の因果研究）",
    "Community-noted ×0.5": "コミュニティノート付き ×0.5",
    "Content appeal": "内容の魅力度",
    "Content score (prospective)": "内容スコア（投稿前の見込み）",
    "Dwell (binary)": "滞在（有無）",
    "Dwell time": "滞在時間",
    "Earned engagement": "獲得した反応",
    "Engagement only counts if the post reached the reader through their Home Timeline. Opening a link someone sent has no ranking impact — so passing your own post round a group chat does nothing for reach.": "反応が数えられるのは、投稿が読者のホームタイムライン経由で届いた場合だけです。誰かから送られたリンクを開いてもランキングには影響しません。自分の投稿をグループチャットに回しても、リーチは伸びません。",
    "Engagement score (how the weights value actual engagement)": "反応スコア（実際の反応を重みでどう評価するか）",
    "Engagement score — low view sample, smoothed toward median": "反応スコア — 表示回数が少ないため、中央値に寄せて補正しています",
    "Engagement-bait phrasing": "反応誘導の言い回し",
    "External link": "外部リンク",
    "Follow author": "投稿者をフォロー",
    "Grok's “banger” pipeline only ever looks at original posts — replies and protected accounts are filtered out before it runs.": "Grokのバンガー判定は、元の投稿だけを対象にします。リプライと非公開アカウントは、判定の前に除外されます。",
    "Has a picture — small boost to likes": "画像あり — いいねがわずかに増える",
    "Has image": "画像あり",
    "Has video": "動画あり",
    "Likes": "いいね",
    "MOSTLY CAPS — reads as shouting, invites negative feedback": "英字の大半が大文字 — 叫んでいるように読め、否定的な反応を招く",
    "Mass block/report campaigns don't straightforwardly bury a post. Predictions are per-viewer and personalized, so brigading mostly shifts what gets recommended to people like the brigaders.": "ブロックや報告を大量に集めても、投稿がそのまま埋もれるわけではありません。予測は閲覧者ごとに個別化されるため、組織的な攻撃が変えるのは、主に攻撃する側と似た人へのおすすめです。",
    "Meaty text — gives people a conversation to click into": "読みごたえのある文章 — 会話の中に入りたくなる",
    "Mostly ALL-CAPS": "英字の大半が大文字",
    "Mostly just a link — low-context link posts do worse": "ほぼリンクだけ — 文脈の少ないリンク投稿は不利",
    "Mute author": "投稿者をミュート",
    "New-user OON ×0.00001": "新規ユーザー向けフォロー外 ×0.00001",
    "No special signals — scored as a typical post.": "特別なシグナルなし — 標準的な投稿として評価",
    "Not dwelled": "素通り（滞在なし）",
    "Not interested": "興味なし",
    "Open link": "リンクを開く",
    "Out-of-network / reply / repost ×0.75": "フォロー外／リプライ／リポスト ×0.75",
    "Out-of-network view assumed — scored at 75%": "フォロー外として表示される想定 — 75%で評価",
    "Out-of-network, this reply never reaches For You at all — replies from unfollowed accounts are hard-filtered, not down-weighted.": "フォロー外の場合、このリプライはおすすめにそもそも届きません。フォローしていないアカウントからのリプライは、減点ではなく、機械的に除外されます。",
    "Photo expand": "写真の拡大",
    "Post click": "投稿のクリック",
    "Post unexplored": "未接触の投稿（新規性）",
    "Profile click": "プロフィールのクリック",
    "Profile visit time": "プロフィール滞在時間",
    "Quoted video quality view": "引用元動画の有効視聴",
    "Quoted-post click": "引用元投稿のクリック",
    "Quotes": "引用",
    "Replies": "リプライ",
    "Replies are filtered out of X's Grok “banger” pipeline before it runs — it only ever evaluates original posts.": "リプライは、XのGrokのバンガー判定が動く前に除外されます。判定の対象は元の投稿だけです。",
    "Reply scoring": "リプライの評価",
    "Reply ×0.75": "リプライ ×0.75",
    "Report": "報告",
    "Reposts": "リポスト",
    "Save this draft's score as a variant (up to three). Rewrite, then compare the saved scores side by side. Variants live in memory only and vanish with the page.": "この下書きのスコアを案として保存します（最大3つ）。書き直してから、保存したスコアを並べて比べられます。案はメモリ上だけに置かれ、ページを閉じると消えます。",
    "Share via DM": "DMでシェア",
    "Share via copy link": "リンクをコピーしてシェア",
    "Shares": "シェア",
    "Show the math": "計算式を見る",
    "Starts a thread — keeps readers on the post longer": "スレッドの始まり — 読者が投稿に長く留まる",
    "This draft is a reply. In-network replies take the same ×0.75 rescoring factor as out-of-network posts (oon_applies, xai-value-model/scoring.rs) — already reflected in the score. Replies are also excluded from the mutual-follow reply boost and from Grok's banger pipeline.": "この下書きはリプライです。フォロー内のリプライも、フォロー外の投稿と同じ×0.75の再スコアリング係数を受けます（oon_applies、xai-value-model/scoring.rs）。この係数はすでにスコアに反映されています。リプライは、相互フォローのリプライ加点と、Grokのバンガー判定からも除外されます。",
    "This is a reply — replies take the same 75% discount as out-of-network posts": "これはリプライ — リプライはフォロー外の投稿と同じ75%に割り引かれる",
    "This is a repost — reposts take the same 75% discount as out-of-network posts": "これはリポスト — リポストはフォロー外の投稿と同じ75%に割り引かれる",
    "Thread starter": "スレッドの始まり",
    "Topic-request OON ×0.5": "トピック指定のフォロー外 ×0.5",
    "User video continuation": "ユーザーの動画継続視聴",
    "Verified author boost": "認証済みアカウントの加点",
    "Verified author: 2023-era code boosted verified posts ×4 in-network / ×2 out-of-network. No such multiplier appears anywhere in the Aug 2026 release. Not applied to this score — enable “2023 verified boost” in the popup to simulate that era.": "認証済みアカウント: 2023年当時のコードでは、認証済みの投稿がフォロー内で×4、フォロー外で×2に加点されていました。2026年8月版には、こうした倍率はどこにも見当たりません。このスコアには適用していません。当時を再現するには、ポップアップで「2023年の認証加点」をオンにしてください。",
    "Video continuation": "動画の継続視聴",
    "Video open": "動画を開く",
    "Video quality view": "動画の有効視聴",
    "What X's published weights actually say": "Xが公開した重みが実際に語ること",
    "What the algorithm would predict from the content alone. 50 = a typical post.": "内容だけからアルゴリズムが予測する値。50 = 標準的な投稿。",
    "Where this reply SORTS inside the thread is not something anyone outside X can score — that ranker is not open-sourced.": "このリプライがスレッド内でどの順に並ぶかは、X以外の誰にも採点できません。その並べ替えのしくみは公開されていないためです。",
    "pasted text": "貼り付けあり",
    "“Like if…” bait — invites “show less” clicks and penalties": "「〜ならいいね」系の誘導 — 「表示を減らす」クリックとペナルティを招く",

    // sysCat's patterns, as templates. Their wording, with {named} placeholders
    // where they captured a value.
    "Bangermeter draft score {score} out of 100": "Bangermeter 下書きスコア {score} / 100",
    "“{snippet}”\nClick to remove this saved variant.": "“{snippet}”\nクリックでこの保存した案を削除",
    "Contains a link — opening it pays {openLink}, small but not zero": "リンクあり — 開かれると{openLink}加点（小さいがゼロではない）",
    "Verified author — ×{factor} boost per 2023 code (absent from the 2026 release)": "認証済みアカウント — 2023年のコードでは×{factor}の加点（2026年版には存在しない）",
    "Verified author ×{factor} (2023 code, absent from the 2026 release)": "認証済みアカウント ×{factor}（2023年のコード、2026年版には存在しない）",
    "How the algorithm values what this post actually earned, from {views} views. 50 = the median rate measured across {n} real timeline posts.": "この投稿が実際に獲得した反応をアルゴリズムがどう評価するか（表示 {views} 回）。50 = 実際のタイムライン投稿 {n} 件で測った中央値の率。",
    "{n} reply": "リプライ {n} 件",
    "{n} replies": "リプライ {n} 件",
    "{n} repost": "リポスト {n} 件",
    "{n} reposts": "リポスト {n} 件",
    "{n} like": "いいね {n} 件",
    "{n} likes": "いいね {n} 件",
    "{n} bookmark": "ブックマーク {n} 件",
    "{n} bookmarks": "ブックマーク {n} 件",
    "each worth {likes} likes": "1件あたり いいね {likes} 件分",
    "each worth {likes} likes (mutual-follow boost on)": "1件あたり いいね {likes} 件分（相互フォロー加点オン）",
    "the baseline unit": "基準単位",
    "not a scored action — X publishes no bookmark weight": "スコア対象の行動ではない — Xはブックマークの重みを公開していない",
    "Weight {w} vs {like} for a like (param.rs, {date} sync). A ratio of coefficients on same-denominator rates — meaningful inside this score, and only here. X warns that weight ratios are NOT count equivalences in general; see the fine print below.": "重み {w}（いいねは {like}）（param.rs、{date} 同期）。分母が同じ率にかかる係数の比で、このスコアの中でだけ意味を持ちます。Xは、重みの比は一般には件数の換算ではないと警告しています。下の注記を参照してください。",
    "Weight {w} (param.rs, {date} sync)": "重み {w}（param.rs、{date} 同期）",
    "{label}  ·  w {w} × P {p}": "{label}  ·  w {w} × P {p}",
    "{label}  ·  w {w} × {p} s predicted": "{label}  ·  w {w} × {p} 秒（予測）",
    "Freshness: ×{factor} at {age} old — posts fade over ~6 hours, never below ×0.60": "鮮度: ×{factor}（投稿から {age}）— 投稿は約6時間かけて薄れ、×0.60を下回りません",
    "{n} min": "{n}分",
    "{n} h": "{n}時間",
    "Posting cadence: post #{n} from this author in the loaded stretch of feed — production attenuates it ×{mult} (author diversity)": "投稿頻度: 読み込み済みのフィードで、この投稿者の{n}本目 — 本番では×{mult}に減衰します（投稿者の多様性）",
    "Only {views} views — rates are smoothed toward the median (empirical Bayes, K={k}), so small samples can't spike or tank the score.": "表示回数は {views} 回だけ — 率は中央値に寄せて補正されます（経験ベイズ、K={k}）。サンプルが少なくても、スコアが跳ね上がったり急落したりしません。",
    "No mutual-follow boost here: the +{boost} reply boost needs an ORIGINAL post — replies are ineligible.": "ここには相互フォロー加点がありません。+{boost} のリプライ加点は「元の投稿」にしか適用されず、リプライは対象外です。",
    "Replying to an account over {k}K followers? A Grok model scores the reply {min}–{max}; a {min} applies the {label} label (duration unpublished).": "フォロワーが {k}K を超えるアカウントへのリプライでは、Grokのモデルがリプライを {min}〜{max} で採点します。{min} だと {label} ラベルが付きます（期間は非公開）。",
    "You pasted into this reply. X's reply-quality scorer is shown an is_pasted flag when scoring replies to accounts over {k}K followers (grox/core/lm/thread.py). What the withheld rubric does with it is unpublished — this chip is informational, and the score above does not move on it.": "このリプライには貼り付けがありました。Xのリプライ品質スコアラーは、フォロワーが {k}K を超えるアカウントへのリプライを採点するとき、is_pasted フラグを受け取ります（grox/core/lm/thread.py）。非公開の採点基準がそれをどう扱うかは公表されていません。このチップは参考表示で、上のスコアはこれでは動きません。",

    // "What X's published weights actually say"
    "Copying a post's link carries {w}, the heaviest positive coefficient X publishes. It is also one of the rarest things a reader does — which is part of why the number is that large.": "投稿のリンクをコピーすると {w}。Xが公開している正の係数で最大です。読者が取る行動の中でも特にまれな部類で、それが数字の大きい理由の一つでもあります。",
    "Sharing to DMs carries {dm}, the same coefficient as a reply. The share menu itself carries {share}. Musk called DM-forwarding “one of the strongest signals”; the 2026 file finally puts a number on it.": "DMでシェアすると {dm} で、リプライと同じ係数です。シェアメニュー自体は {share}。マスク氏はDMでの転送を「最も強いシグナルの一つ」と呼びましたが、2026年のファイルでようやく数字が示されました。",
    "A reply from someone you mutually follow is worth {mutual}, not {reply} — but only on original posts, never on replies or reposts.": "相互フォローの相手からのリプライは、{reply} ではなく {mutual} の価値になります。ただし対象は元の投稿だけで、リプライやリポストには適用されません。",
    "Gaining a follower off a post pays {w}.": "投稿をきっかけにフォローが増えると {w} が加点されます。",
    "Opening a link pays {w}. Small, but the “links get zero credit” story is now provably wrong.": "リンクを開くと {w} が加点されます。小さな値ですが、「リンクは評価ゼロ」という通説が誤りだったことは、これで証明されました。",
    "Profile clicks pay NOTHING ({w}). The 2023 table paid 12.0 for a profile-click-and-engage — that head has been zeroed out.": "プロフィールのクリックは何も加点されません（{w}）。2023年の表では、プロフィールをクリックして反応すると 12.0 でしたが、この項目はゼロになりました。",
    "Scrolling straight past costs {w}. Tiny per impression, but it happens on most of them.": "そのまま素通りすると {w} が減点されます。表示1回あたりでは小さいものの、ほとんどの表示で起こります。",
    "Muting ({mute}) hurts nearly twice as much as blocking ({block}). Reporting costs {report}.": "ミュート（{mute}）は、ブロック（{block}）の約2倍響きます。報告は {report} の減点です。",
    "Posting again while your last post is still in the same feed slate costs the newer one: an author's 2nd post in the slate runs ×{second}, the 3rd ×{third}, decaying to a ×{floor} floor (author diversity — decay {decay}, floor {floor}, shipped on by default).": "直前の投稿が同じフィードの表示枠に残っているうちにもう一度投稿すると、新しいほうが不利になります。表示枠内の同じ投稿者の2本目は ×{second}、3本目は ×{third} で、×{floor} の下限まで減衰します（投稿者の多様性 — 減衰 {decay}、下限 {floor}、初期設定でオン）。",
    "A Report's baseline probability is over 1,000× lower than a Like's. That is WHY its coefficient is {w}, and why dividing it by the like weight gives a number that means nothing.": "報告の基準確率は、いいねの 1,000 分の1以下です。だから係数が {w} と大きく、いいねの重みで割っても意味のある数字にならないのです。",
    "Holding a reader for {seconds} seconds pays a flat {dwell}, on top of the {perSecond}/second dwell-time term. X turned this head on in August 2026 — it paid nothing before. Ten seconds is a bar, not a slope: nine seconds earns none of it.": "読者を {seconds} 秒引き留めると、一律で {dwell} が加点されます。これは滞在時間の項（1秒あたり {perSecond}）に上乗せされます。Xは2026年8月にこの項目を有効にしました。それ以前は加点されませんでした。10秒は段差であって傾斜ではなく、9秒では加点されません。",
    "Video-quality-view now pays {vqv}. It was 0.05 until August 2026, so finishing a clip no longer earns anything directly — though video still clears the {seconds}-second dwell bar easily.": "動画の有効視聴は、現在 {vqv} です。2026年8月までは0.05だったため、クリップを最後まで見ても直接の加点はなくなりました。ただし動画は、{seconds}秒の滞在の基準を今でも簡単に満たします。",
    "If you have {cap} followers or fewer, at most one original post per request can be lifted to about slot {slot} of the feed — but only while it is under {hours}h old and still under {impressions} Home impressions. Among the posts that qualify, early likes per impression pick a shortlist of two and the model's score picks the winner. One post per request, not per author.": "フォロワーが {cap} 人以下なら、1回のリクエストにつき元の投稿を最大1件だけ、フィードの {slot} 番目あたりまで引き上げてもらえることがあります。ただし、投稿から {hours} 時間以内で、ホームでの表示がまだ {impressions} 回未満の間だけです。条件を満たす投稿のうち、表示あたりの早期のいいねで2件に絞られ、モデルのスコアが高いほうが選ばれます。対象は1リクエストにつき1件で、投稿者ごとではありません。",
    "X sends the ranker seven facts about your content: video, longest video length, photo, media count, weighted text length, NEWLINE COUNT, and whether there's a link — though no published model code reads them yet. A link counts as {urlLen} characters no matter how long it is, and an image's own t.co doesn't count as a link at all.": "Xはランキングモデルに、投稿内容に関する7つの事実を送っています。動画の有無、最長の動画の長さ、写真の有無、メディアの数、重み付きの文字数、改行の数、リンクの有無です。ただし、公開されているモデルのコードは、まだこれらを読んでいません。リンクは実際の長さに関係なく {urlLen} 文字として数えられ、画像自体のt.coはリンクとして数えられません。",
    // sysCat translated these two as one passage; weightsMeaningNote is the first half.
    "Weights multiply a PREDICTED PROBABILITY, not a count. X's own code comment calls the ratio reading — 'one report cancels 468 likes' — incorrect, and says a Report's baseline probability is over 1000x lower than a Like's, which is why its coefficient is large.": "重みが掛かるのは「予測された確率」であって、件数ではありません。Xのコードのコメントは、「報告1件がいいね 468 件を打ち消す」という比の読み方は誤りだとし、報告の基準確率はいいねの 1000x 以下だからこそ係数が大きいのだと述べています。",
    "These are values per event, not per post: a heavy weight on a rare action still moves fewer posts than a light weight on a common one. Only likes, replies and reposts above come from this post's real counts — the rest need Phoenix's own predictions, so they inform what you read here without entering the score above.": "これらは投稿ごとではなく、行動1回あたりの値です。まれな行動にかかる大きな重みは、ありふれた行動にかかる小さな重みより、動かす投稿が少ないままです。上のうち、この投稿の実際の件数に基づくのはいいね・リプライ・リポストだけです。残りはPhoenixの予測が必要なため、ここで読める内容の参考にはなっても、上のスコアには入りません。",

    // Popup and welcome page. sysCat's exact entries, then their patterns as templates.
    "(no text)": "（本文なし）",
    "+ compare": "+ 比較",
    ", or": "」「",
    ", so you always know which is which.": "」のどれかを表示するので、どれがどれか、いつでもわかります。",
    "2023 verified boost (×4/×2, historical)": "2023年の認証加点（×4/×2、過去の仕様）",
    "50 is a typical post.": "50は標準的な投稿です。",
    "A live meter scores your draft as you write, and names what's helping and what isn't — asks a question, substantive text, bare link, hashtag pile, engagement bait.": "書いている間、下書きをリアルタイムで採点し、何がプラスで何がマイナスかを示します。質問になっている、しっかりした文章量、リンクだけ、ハッシュタグの羅列、反応誘導など。",
    "Active weight set": "使用中の重みセット",
    "Apply the ×0.75 out-of-network multiplier as if the viewer does not follow the author": "閲覧者が投稿者をフォローしていないものとして、フォロー外の×0.75を適用します",
    "Assume mutual follow (reply 5.0 → 20.0)": "相互フォローと仮定（リプライ 5.0 → 20.0）",
    "Assume out-of-network view (×0.75)": "フォロー外として見たと仮定（×0.75）",
    "Auto (match X)": "自動（Xに合わせる）",
    "Bangermeter": "Bangermeter",
    "Bangermeter icon any time.": "Bangermeterのアイコンをクリックしてください。",
    "Bangermeter is installed.": "Bangermeterをインストールしました。",
    "Bangermeter — Quick Start": "Bangermeter — クイックスタート",
    "Clear": "クリア",
    "Click a badge": "バッジをクリック",
    "Dark": "ダーク",
    "Delete the local score history. This cannot be undone.": "保存したスコア履歴を削除します。元に戻せません。",
    "Every number is cited to the line of X's published code it came from.": "すべての数字に、出どころとなったXの公開コードの行が示されています。",
    "Every post picks up a badge with two numbers, 0–100.": "すべての投稿に、0〜100の2つの数字が入ったバッジが付きます。",
    "Hide this": "閉じる",
    "Hide this tip": "このヒントを閉じる",
    "Hit": "",
    "How it works": "しくみ",
    "Import report JSON…": "レポートJSONを読み込む…",
    "It's a comparison against a median post, not a grade — and not a prediction of reach.": "中央値の投稿との比較であって、成績でも、リーチの予測でもありません。",
    "Keep local score history": "スコア履歴をこのブラウザに保存",
    "Light": "ライト",
    "Live meter in compose box": "投稿作成欄にリアルタイムメーターを表示",
    "Logged when you open a breakdown panel. Local to this browser only.": "内訳パネルを開いたときに記録されます。このブラウザ内だけに保存されます。",
    "Looks like": "表示例",
    "New here? How to use it →": "はじめての方へ：使い方 →",
    "No visibility-impacting labels in this report period. Clean month.": "このレポート期間に、可視性に影響するラベルはありません。問題のない月でした。",
    "Off by default. When on, the score is logged each time you open a breakdown panel, so you can compare formats over time. Stored only in this browser (chrome.storage.local, capped at 200 entries) — never synced, never sent anywhere.": "初期設定ではオフです。オンにすると、内訳パネルを開くたびにスコアを記録し、投稿の型ごとの違いを時間をかけて比べられます。このブラウザ内（chrome.storage.local、最大200件）だけに保存され、同期も外部送信もされません。",
    "One thing worth knowing": "知っておきたいこと",
    "Only likes, replies and reposts come from real counts — the rest is inferred from the post. The popup labels all 29 ranking heads as": "実際の件数に基づくのは、いいね・リプライ・リポストだけです。残りは投稿から推測しています。ポップアップでは、29のランキング項目それぞれに「",
    "Open x.com →": "x.comを開く →",
    "Panel and draft-meter theme. Auto follows X's own theme (default / dim / lights out).": "パネルと下書きメーターのテーマです。「自動」はXのテーマ（ライト／ダークブルー／ブラック）に合わせます。",
    "Panel theme": "パネルのテーマ",
    "Recent scores": "最近のスコア",
    "Remove": "削除",
    "Score as if the viewer mutually follows the author. X pays 20.0 instead of 5.0 for a reply in that case (BidirectionalFollowReplyWeightBoost = 15.0) — but only on original posts, never on replies or reposts.": "閲覧者と投稿者が相互フォローしているものとして採点します。その場合、リプライの重みは5.0ではなく20.0になります（BidirectionalFollowReplyWeightBoost = 15.0）。ただし対象は元の投稿だけで、リプライやリポストには適用されません。",
    "Score badges on timeline tweets": "タイムラインの投稿にスコアバッジを表示",
    "Scores posts with X's published For You ranking weights and the real scorer arithmetic (xai-org/x-algorithm, Aug 13 2026).": "Xが公開したおすすめ（For You）のランキング重みと、実際のスコア計算式で投稿を採点します（xai-org/x-algorithm、2026年8月13日時点）。",
    "Scroll x.com": "x.comをスクロール",
    "Settings": "設定",
    "Settings, the full weight table and your score history live behind the toolbar icon — click the": "設定、重みの全表、スコア履歴は、ツールバーのアイコンから開けます。いつでも",
    "Simulate the 2023-era verified boost (×4 in-network / ×2 out-of-network, archived commit ec83d01dca). No such multiplier exists in the Aug 2026 release — off by default because it floors every verified author near the top of the scale.": "2023年当時の認証アカウント加点（フォロー内×4／フォロー外×2、アーカイブ済みコミット ec83d01dca）を再現します。2026年8月版にはこの倍率は存在しません。認証済みアカウントがすべて上限付近に張り付いてしまうため、初期設定ではオフです。",
    "Source on GitHub": "GitHubのソース",
    "Start typing a post": "投稿を書き始める",
    "That file is over 2 MB — an Under the Hood report is a few KB. Not imported.": "このファイルは2 MBを超えています。Under the Hoodのレポートは数KBです。読み込みませんでした。",
    "The research": "調査資料",
    "The weights are X's. The probabilities are estimates.": "重みはXのものですが、確率は推定です。",
    "Three things and you're using it.": "3つのことだけで、すぐ使えます。",
    "Under the Hood": "Under the Hood（可視性レポート）",
    "You get the breakdown in plain English: which signals fired, what each reply and repost is actually worth, and what age cost it.": "内訳がやさしい言葉で表示されます。どのシグナルが働いたか、リプライやリポスト1件が実際にどれだけの価値か、投稿の古さでどれだけ減ったか。",
    "estimated": "推定",
    "from counts": "実際の件数から",
    "measured": "実測",
    "on any section opens the full weight × probability table.": "を各セクションで開くと、重み×確率の表がすべて表示されます。",
    "period unknown": "期間不明",
    "to save up to three variants and pick the best one before you send it. Replies are scored as replies.": "を押すと、最大3つの案を保存して、送信前にいちばん良いものを選べます。リプライはリプライとして採点されます。",
    "viewer-specific": "閲覧者ごとに異なる",
    "zeroed by X": "Xがゼロにした",
    "— what the content alone would be predicted to earn": "— 内容だけから予測される値",
    "— what the post actually earned, per view": "— 投稿が実際に獲得した値（表示1回あたり）",
    "“Show the math”": "「計算式を見る」",
    "reply": "リプライ",
    "{label} (not in the public allowlist)": "{label}（公開許可リストにない）",
    "{n} posts": "{n} 件の投稿",
    "{n} day": "{n}日",
    "{n} days": "{n}日",
    "Your imported report ({period}, {posts} posts). These are X's OWN labels on your account — not estimates.": "読み込んだレポート（{period}、{posts} 件の投稿）。これはあなたのアカウントにXが実際に付けたラベルで、推定ではありません。",
    "Your imported report ({period}). These are X's OWN labels on your account — not estimates.": "読み込んだレポート（{period}）。これはあなたのアカウントにXが実際に付けたラベルで、推定ではありません。",
    "That file does not look like an Under the Hood report (expected the JSON downloaded from {path}). Nothing was imported.": "このファイルはUnder the Hoodのレポートではないようです（{path} からダウンロードしたJSONが必要です）。何も読み込みませんでした。"
  };

  var JA_DRAFT = {
    // Panel — new or reworded since sysCat's fork.
    // The length rule counts a CJK character as 2 (weights.js textWeighting), so
    // the Japanese label states the mark a Japanese writer meets.
    "Substantive text (≥100 chars)": "しっかりした文章量（全角50文字以上）",
    "Has video — opening it pays {videoOpen}; a full watch earns nothing extra (vqv is 0)": "動画あり — 開かれると{videoOpen}加点。最後まで見られても追加の加点はない（vqv は 0）",
    "Has video — opening it pays {videoOpen}; a watch over {seconds} seconds pays {vqv}": "動画あり — 開かれると{videoOpen}加点。{seconds}秒を超えて見られると{vqv}加点",
    "Post video": "動画の投稿",
    // 表示制限中 is X's own Japanese for the notice (key b3296688, scoring.js).
    "Visibility limited by X — X's published code usually removes it from For You for everyone but the author": "Xによる表示制限中 — Xが公開したコードでは、投稿者以外の全員の「おすすめ」から通常除外されます",
    "One exception: a post labeled FOSNR_ABUSE_INSULTS is removed only out-of-network, so the author's followers can still get it. Where the post still appears, as here, X shows this notice. That rendering is not in X's published code.": "例外が1つあります。FOSNR_ABUSE_INSULTS のラベルが付いた投稿はフォロー外でだけ除外されるため、投稿者のフォロワーには届くことがあります。ここのように投稿が表示されている場合、Xはこの通知を出します。その表示の仕組みは、Xが公開したコードには含まれていません。",
    "Quotes a post X limited — X's published code usually removes posts like this from For You": "Xが制限した投稿を引用している — Xが公開したコードでは、このような投稿は通常「おすすめ」から除外されます",

    // "Show the math" fine print — sysCat left these untranslated.
    "Score = Σ(weight × P) over the Phoenix heads, then offset_score (xai-value-model/scoring.rs), × rescorers, normalized so a median post = 50 (√ curve, capped at 100). Raw: {raw}": "スコア = Phoenix の各項目の Σ(重み × P)、続いて offset_score（xai-value-model/scoring.rs）、× 補正係数。中央値の投稿が 50 になるよう正規化しています（√ カーブ、上限 100）。Raw: {raw}",
    "NET NEGATIVE: X rescales any post whose weighted sum goes below zero into [0, {ceiling}), which puts it under every positive-scoring post in the feed.": "合計がマイナス: Xは重み付き合計がゼロを下回った投稿を [0, {ceiling}) の範囲に縮めるため、フィード内でスコアがプラスのどの投稿よりも下に置かれます。",
    "Engagement rates = count ÷ views, smoothed toward the median with K={k} pseudo-views (empirical Bayes), then run through the same weighted-sum formula. Raw: {raw}": "反応率 = 件数 ÷ 表示回数。K={k} の疑似表示回数で中央値に寄せて補正し（経験ベイズ）、同じ重み付き合計の式に通しています。Raw: {raw}",
    "Scored from the three heads a browser can see: likes ({like}), replies ({reply}), reposts ({repost}). The other {others} heads — shares (2.0 / 5.0 / 20.0), follows (4.0), clicks, dwell time and the negatives (−0.02 to −234.0) — need Phoenix's predictions, not counts.": "ブラウザから見える3つの項目で採点しています: いいね（{like}）、リプライ（{reply}）、リポスト（{repost}）。残りの {others} 項目 — シェア（2.0 / 5.0 / 20.0）、フォロー（4.0）、クリック、滞在時間、マイナスの項目（−0.02〜−234.0）— には、件数ではなく Phoenix の予測が必要です。",

    // Popup — new or reworded since sysCat's fork.
    "Language": "言語",
    "Language for the badge, panel, draft meter and this popup. Auto follows X's own display language.": "バッジ、パネル、下書きメーター、このポップアップの言語です。「自動」では、Xの表示言語に合わせます。",
    "In the pilot? Download your visibility report from {path} and import it here. Parsed locally, stored only in this browser. At X's published defaults the report is monthly per-label totals — it can say how many posts carried a label, not which ones.": "パイロットに参加中の方へ: {path} から可視性レポートをダウンロードして、ここに読み込めます。解析はこの端末内だけで行われ、このブラウザにのみ保存されます。Xが公開している初期設定では、レポートは月ごとのラベル別の合計で、ラベルが付いた投稿の数はわかりますが、どの投稿かはわかりません。",
    "{n}m": "{n}分",
    "{n}h": "{n}時間",
    "{n}d": "{n}日",
    "Every value below is transcribed from {snapshot}. Replies rise to {mutual} on an original post from a mutual follow.": "以下の値はすべて {snapshot} から書き写したものです。相互フォローの相手の元の投稿へのリプライは {mutual} になります。",
    "Score = Σ(weight × P(action)) per xai-value-model/scoring.rs.": "スコア = Σ(重み × P(行動))。xai-value-model/scoring.rs に基づきます。",
    "Bangermeter estimates the probabilities; only likes, replies and reposts come from real counts. Relative score, not predicted reach.": "確率はBangermeterの推定で、実際の件数から取るのはいいね・リプライ・リポストだけです。相対的なスコアであり、届く範囲の予測ではありません。"
  };

  // Text shown as written in every language. Mostly the long prose that stays
  // English on purpose (the weights.js note/why text, the "About these scores"
  // history, the Community Note citations), which X rewrites most weeks; also
  // each language's own name in the language switch. Only
  // store-assets/i18n-coverage.js reads this list, to keep these off its
  // missing report. The prose patterns are sysCat's tier C.
  var KEEP_ENGLISH = [
    /^English$/, /^日本語$/,
    /^[CE]\d*$/,  // the welcome page's sample badge: C71, E48
    /^Weights: /, /kept in sync with/, /live production configuration/,
    /as current rather than historical/, /weighted sum modeled here/, /dwell-regret/,
    /switch that chose between them/, /not predicted reach/, /existed in the same code/,
    /when X deleted them/, /^Community Note effect sourced from/, /^diversity_multiplier\(/
  ];

  var lang = "en";

  function setLanguage(l) { lang = l === "ja" ? "ja" : "en"; }
  function getLanguage() { return lang; }

  // One pass with a function replacer: substituted text is never rescanned,
  // and "$&" or "$1" in a value stays literal.
  function fill(s, params) {
    if (!params) return s;
    return s.replace(/\{(\w+)\}/g, function (whole, name) {
      return Object.prototype.hasOwnProperty.call(params, name) ? String(params[name]) : whole;
    });
  }

  function t(english, params) {
    var s = english;
    if (lang === "ja" && Object.prototype.hasOwnProperty.call(JA, english)) s = JA[english];
    return fill(s, params);
  }

  function placeholdersOf(s) {
    var seen = {};
    (String(s).match(/\{(\w+)\}/g) || []).forEach(function (p) { seen[p.slice(1, -1)] = true; });
    return Object.keys(seen).sort();
  }

  function isJa(tag) { return typeof tag === "string" && /^ja(-|$)/i.test(tag); }

  // override: the popup setting. Auto follows X's <html lang>; the browser
  // language decides only when that attribute is missing or empty.
  function resolveLanguage(override, htmlLang, navLang) {
    if (override === "en" || override === "ja") return override;
    if (htmlLang) return isJa(htmlLang) ? "ja" : "en";
    return isJa(navLang) ? "ja" : "en";
  }

  var ATTRS = ["title", "aria-label", "placeholder"];

  function lookup(text) {
    var key = text.replace(/\s+/g, " ").trim();
    if (!key || !Object.prototype.hasOwnProperty.call(JA, key)) return null;
    return JA[key];
  }

  // Translates a static page in place: every text node and the title,
  // aria-label and placeholder attributes under root. Whitespace around a
  // text node survives, so inline markup keeps its spacing.
  function translateStatic(root) {
    if (lang !== "ja" || !root) return;
    var walker = root.ownerDocument.createTreeWalker(root, 1 | 4); // elements + text
    var node = walker.currentNode;
    while (node) {
      if (node.nodeType === 3) {
        var parent = node.parentNode && node.parentNode.nodeName;
        if (parent !== "SCRIPT" && parent !== "STYLE") {
          var ja = lookup(node.nodeValue);
          if (ja !== null) {
            var m = node.nodeValue.match(/^(\s*)[\s\S]*?(\s*)$/);
            node.nodeValue = m[1] + ja + m[2];
          }
        }
      } else if (node.nodeType === 1) {
        ATTRS.forEach(function (a) {
          if (!node.hasAttribute(a)) return;
          var ja = lookup(node.getAttribute(a));
          if (ja !== null) node.setAttribute(a, ja);
        });
      }
      node = walker.nextNode();
    }
  }

  // For the popup and welcome page, which are not on x.com. The stored
  // override wins; Auto uses the X language content.js last recorded, then the
  // browser's UI language (the welcome page opens at install, before any X
  // visit). Without chrome.storage (the fixture server, the preview harness) a
  // ?lang=ja or ?lang=en query is the override. The callback renders the
  // page's dynamic parts; the static markup is translated after it.
  function resolvePageLanguage(callback) {
    function done(l) {
      setLanguage(l);
      document.documentElement.lang = lang;
      callback(lang);
      translateStatic(document.body);
      // <title> lives in <head>, outside the body walk.
      var title = lang === "ja" ? lookup(document.title) : null;
      if (title !== null) document.title = title;
    }
    var hasStorage = typeof chrome !== "undefined" && chrome.storage && chrome.storage.sync;
    if (!hasStorage) {
      var q = /[?&]lang=(en|ja)\b/.exec(location.search);
      done(q ? q[1] : "en");
      return;
    }
    chrome.storage.sync.get({ uiLanguage: "auto" }, function (s) {
      if (s.uiLanguage === "en" || s.uiLanguage === "ja") { done(s.uiLanguage); return; }
      chrome.storage.local.get({ lastXLanguage: null }, function (l) {
        if (l.lastXLanguage) { done(l.lastXLanguage); return; }
        var ui = chrome.i18n && chrome.i18n.getUILanguage ? chrome.i18n.getUILanguage() : "";
        done(resolveLanguage("auto", null, ui));
      });
    });
  }

  return {
    t: t, setLanguage: setLanguage, getLanguage: getLanguage,
    resolveLanguage: resolveLanguage, resolvePageLanguage: resolvePageLanguage,
    translateStatic: translateStatic,
    placeholdersOf: placeholdersOf,
    JA: JA, JA_DRAFT: JA_DRAFT, KEEP_ENGLISH: KEEP_ENGLISH
  };
})();
