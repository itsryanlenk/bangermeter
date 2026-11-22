// Bangermeter — English source strings, translations, and static-page rendering.
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
    // The comma between the first two of those labels; same glue as ", or".
    ",": "」「",
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

  // Simplified Chinese UI and explanatory copy. Technical identifiers remain as written.
  var ZH_CN = {
    "(no text)": "（无文字）",
    "+ compare": "＋对比",
    ", or": "或",
    ", so you always know which is which.": "，方便你区分数据来源。",
    "2023 verified boost (×4/×2, historical)": "模拟 2023 年认证加权（×4／×2）",
    "3+ hashtags": "3 个及以上话题标签",
    "3+ hashtags — the old algorithm flags hashtag piles": "3 个及以上话题标签，旧算法会标记堆砌标签的内容",
    "50 is a typical post.": "典型帖子的分数为 50。",
    "A Report's baseline probability is over 1,000× lower than a Like's. That is WHY its coefficient is {w}, and why dividing it by the like weight gives a number that means nothing.": "举报的基准概率不到点赞的千分之一，因此其系数为 {w}。直接除以点赞权重无法得出有意义的结论。",
    "A live meter scores your draft as you write, and names what's helping and what isn't — asks a question, substantive text, bare link, hashtag pile, engagement bait.": "输入时会实时显示草稿评分和影响因素，包括提问、有实质内容的长文、几乎只有链接、堆砌标签和诱导互动。",
    "A reply from someone you mutually follow is worth {mutual}, not {reply} — but only on original posts, never on replies or reposts.": "对于原创帖，互关用户的回复权重从 {reply} 提高到 {mutual}。回复和转发不享受这一加权。",
    "About these scores": "关于评分",
    "Active weight set": "当前权重",
    "Any post whose weighted sum goes net-negative is rescaled below every positive post, no matter what else it earned.": "加权总和为负的帖子会被缩放到所有正分帖子之后，即使获得了其他互动也一样。",
    "Apply the ×0.75 out-of-network multiplier as if the viewer does not follow the author": "假设浏览者未关注作者，应用 ×0.75 系数",
    "Asks a question": "提问",
    "Asks a question — invites replies, the algorithm's favorite signal": "提问能带来回复，这是算法很看重的信号",
    "Assume mutual follow (reply 5.0 → 20.0)": "假设浏览者和作者互关（回复权重 5.0 → 20.0）",
    "Assume out-of-network view (×0.75)": "假设浏览者未关注作者（×0.75）",
    "Author diversity decay": "作者多样性衰减",
    "Auto (match X)": "自动（跟随 X）",
    "Bangermeter draft score {score} out of 100": "Bangermeter 草稿评分 {score} 分，满分 100 分",
    "Bangermeter icon any time.": "Bangermeter 图标。",
    "Bangermeter is installed.": "Bangermeter 已安装。",
    "Bangermeter score breakdown": "Bangermeter 评分详情",
    "Bangermeter — Quick Start": "Bangermeter 快速入门",
    "Bangermeter — click for breakdown, click again to close": "Bangermeter：点击展开评分详情，再点一次关闭",
    "Bare link (little text)": "几乎只有链接",
    "Block author": "屏蔽作者",
    "Bookmarks have no head at all — they are not a scored action in 2026.": "2026 年的评分公式没有为收藏设置评分项。",
    "Can't score this one — the view count isn't visible, so there's nothing to compute rates from.": "当前看不到浏览量，无法计算互动率和互动分。",
    "Clear": "清空",
    "Click a badge": "点击评分徽标",
    "Click dwell": "点击后停留",
    "Close breakdown": "关闭评分详情",
    "Community Note attached — future engagement suppressed ~50% (three causal studies)": "带有社区注释，后续互动可能减少约 50%（依据三项因果研究）",
    "Community-noted ×0.5": "带有社区注释 ×0.5",
    "Contains a link — opening it pays {openLink}, small but not zero": "含有链接，打开链接的权重为 {openLink}，贡献较小",
    "Content appeal": "内容吸引力",
    "Content score (prospective)": "内容分（预估）",
    "Copying a post's link carries {w}, the heaviest positive coefficient X publishes. It is also one of the rarest things a reader does — which is part of why the number is that large.": "复制帖子链接的权重为 {w}，是 X 公布的最高正权重。复制链接很少发生，这也是它权重较高的原因之一。",
    "Dark": "深色",
    "Delete the local score history. This cannot be undone.": "清空本地评分记录后无法恢复。",
    "Dwell (binary)": "是否达到停留阈值",
    "Dwell time": "停留时长",
    "Earned engagement": "实际互动",
    "Engagement only counts if the post reached the reader through their Home Timeline. Opening a link someone sent has no ranking impact — so passing your own post round a group chat does nothing for reach.": "只有读者通过首页时间线看到帖子时，互动才计入这个排序信号。读者通过别人发来的链接打开帖子，不影响推荐排序，因此把自己的帖子发到群聊中不会增加这部分触达。",
    "Engagement score (how the weights value actual engagement)": "互动分（按权重评估实际互动）",
    "Engagement score — low view sample, smoothed toward median": "互动分：浏览量较少，已向中位数平滑",
    "Engagement-bait phrasing": "诱导互动",
    "Every number is cited to the line of X's published code it came from.": "每个数字均标明其在 X 公开源码中的出处。",
    "Every post picks up a badge with two numbers, 0–100.": "每条帖子都有一个评分徽标，最多显示两个 0–100 的分数。",
    "External link": "外部链接",
    "Follow author": "关注作者",
    "Freshness: ×{factor} at {age} old — posts fade over ~6 hours, never below ×0.60": "时效性：发布 {age} 后系数为 ×{factor}。影响约持续 6 小时，最低为 ×0.60",
    "Gaining a follower off a post pays {w}.": "通过帖子获得关注的权重为 {w}。",
    "Grok's “banger” pipeline only ever looks at original posts — replies and protected accounts are filtered out before it runs.": "Grok 的热门帖评估只看原创帖，回复和受保护账号的帖子会在评估前筛除。",
    "Has a picture — small boost to likes": "配图预计会略微提高点赞率",
    "Has image": "含图片",
    "Has video": "含视频",
    "Hide this": "隐藏",
    "Hide this tip": "隐藏此提示",
    "Hit": "点击",
    "Holding a reader for {seconds} seconds pays a flat {dwell}, on top of the {perSecond}/second dwell-time term. X turned this head on in August 2026 — it paid nothing before. Ten seconds is a bar, not a slope: nine seconds earns none of it.": "读者停留达到 {seconds} 秒时，在每秒 {perSecond} 的停留项之外，还会计入固定权重 {dwell}。X 在 2026 年 8 月启用了这一项。10 秒是门槛，9 秒不会计入这项固定权重。",
    "How it works": "工作原理",
    "How the algorithm values what this post actually earned, from {views} views. 50 = the median rate measured across {n} real timeline posts.": "算法根据 {views} 次浏览产生的实际互动计算此分数。50 分对应从 {n} 条真实时间线帖子测得的中位互动率。",
    "If you have {cap} followers or fewer, at most one original post per request can be lifted to about slot {slot} of the feed — but only while it is under {hours}h old and still under {impressions} Home impressions. Among the posts that qualify, early likes per impression pick a shortlist of two and the model's score picks the winner. One post per request, not per author.": "如果你的关注者不超过 {cap} 人，每次信息流请求最多可将一条原创帖提升到约第 {slot} 位。帖子须发布不足 {hours} 小时，首页曝光也须少于 {impressions} 次。算法按早期曝光的点赞率选出两条候选，再根据模型分数决定入选帖。名额按每次请求计算。",
    "Import report JSON…": "导入 JSON 报告…",
    "It's a comparison against a median post, not a grade — and not a prediction of reach.": "分数表示相对于中位数帖子的表现，无法用来判断等级或预测触达。",
    "Keep local score history": "保留本地评分记录",
    "Light": "浅色",
    "Likes": "点赞",
    "Live meter in compose box": "在发帖框中实时评分",
    "Logged when you open a breakdown panel. Local to this browser only.": "打开评分详情时记录，仅保存在当前浏览器。",
    "Looks like": "示例",
    "MOSTLY CAPS — reads as shouting, invites negative feedback": "英文大部分为大写，读起来像在喊叫，容易招致负反馈",
    "Mass block/report campaigns don't straightforwardly bury a post. Predictions are per-viewer and personalized, so brigading mostly shifts what gets recommended to people like the brigaders.": "大量屏蔽或举报不会直接压低一条帖子的排序。预测结果因浏览者而异，集中行动主要影响与参与者相似的人看到的推荐。",
    "Meaty text — gives people a conversation to click into": "内容有实质信息，读者更可能点开并参与讨论",
    "Mostly ALL-CAPS": "英文大部分为大写",
    "Mostly just a link — low-context link posts do worse": "几乎只有链接，上下文不足会削弱帖子表现",
    "Mute author": "静音作者",
    "Muting ({mute}) hurts nearly twice as much as blocking ({block}). Reporting costs {report}.": "静音的权重（{mute}）约为屏蔽（{block}）的两倍。举报的权重为 {report}。",
    "New here? How to use it →": "第一次用？查看快速入门 →",
    "New-user OON ×0.00001": "向新用户推荐未关注作者的帖子 ×0.00001",
    "No mutual-follow boost here: the +{boost} reply boost needs an ORIGINAL post — replies are ineligible.": "此处没有互关加权：回复权重增加 {boost} 的条件是被回复的是原创帖。",
    "No special signals — scored as a typical post.": "未检测到特殊信号，按典型帖子评分。",
    "No visibility-impacting labels in this report period. Clean month.": "本期报告没有影响可见性的标签。",
    "Not dwelled": "划过未停留",
    "Not interested": "不感兴趣",
    "Off by default. When on, the score is logged each time you open a breakdown panel, so you can compare formats over time. Stored only in this browser (chrome.storage.local, capped at 200 entries) — never synced, never sent anywhere.": "默认关闭。开启后，每次打开评分详情都会保存分数，便于日后对比不同写法。记录只保存在当前浏览器（chrome.storage.local，最多 200 条），不会同步或发送。",
    "One thing worth knowing": "如何理解这些分数",
    "Only likes, replies and reposts come from real counts — the rest is inferred from the post. The popup labels all 29 ranking heads as": "点赞、回复和转发使用实际计数，其余项根据帖子推断。弹窗将 29 个评分项标为",
    "Only {views} views — rates are smoothed toward the median (empirical Bayes, K={k}), so small samples can't spike or tank the score.": "只有 {views} 次浏览，已通过经验贝叶斯方法将互动率向中位数平滑（K={k}），以减小小样本对评分的影响。",
    "Open link": "打开链接",
    "Open x.com →": "打开 x.com →",
    "Opening a link pays {w}. Small, but the “links get zero credit” story is now provably wrong.": "打开链接的权重为 {w}。这项权重虽小，但确实存在。",
    "Out-of-network / reply / repost ×0.75": "未关注的浏览者／回复／转发 ×0.75",
    "Out-of-network view assumed — scored at 75%": "已假设浏览者未关注作者，按 75% 计算",
    "Out-of-network, this reply never reaches For You at all — replies from unfollowed accounts are hard-filtered, not down-weighted.": "这条回复不会进入未关注作者的浏览者的「为你推荐」候选列表，因为此类回复会被直接筛除。",
    "Panel and draft-meter theme. Auto follows X's own theme (default / dim / lights out).": "设置评分面板和草稿评分的主题。「自动」跟随 X 的默认、暗淡或熄灯模式。",
    "Panel theme": "面板主题",
    "Photo expand": "放大图片",
    "Post click": "点击帖子",
    "Post unexplored": "尚未看过的帖子",
    "Posting again while your last post is still in the same feed slate costs the newer one: an author's 2nd post in the slate runs ×{second}, the 3rd ×{third}, decaying to a ×{floor} floor (author diversity — decay {decay}, floor {floor}, shipped on by default).": "同一批信息流里，作者的新帖会按次序衰减。第 2 条为 ×{second}，第 3 条为 ×{third}，最低为 ×{floor}。作者多样性规则默认开启，衰减率为 {decay}，下限为 {floor}。",
    "Posting cadence: post #{n} from this author in the loaded stretch of feed — production attenuates it ×{mult} (author diversity)": "发帖频率：这是当前已加载信息流中该作者的第 {n} 条帖子。线上算法的作者多样性系数为 ×{mult}",
    "Profile click": "点击个人资料",
    "Profile clicks pay NOTHING ({w}). The 2023 table paid 12.0 for a profile-click-and-engage — that head has been zeroed out.": "点击个人资料的权重为 {w}。2023 年对点击资料后互动的权重曾为 12.0，现已归零。",
    "Profile visit time": "个人资料访问时长",
    "Quoted video quality view": "引用帖视频的有效观看",
    "Quoted-post click": "点击被引用的帖子",
    "Quotes": "引用",
    "Recent scores": "近期评分",
    "Remove": "移除",
    "Replies": "回复",
    "Replies are filtered out of X's Grok “banger” pipeline before it runs — it only ever evaluates original posts.": "Grok 的热门帖评估只处理原创帖，回复会在评估前筛除。",
    "Reply scoring": "回复评分",
    "Reply ×0.75": "回复 ×0.75",
    "Replying to an account over {k}K followers? A Grok model scores the reply {min}–{max}; a {min} applies the {label} label (duration unpublished).": "回复关注者超过 {k} 千人的账号？Grok 模型为该回复打 {min}–{max} 分。分数为 {min} 时会加上 {label} 标签，持续时间未公开。",
    "Report": "举报",
    "Reposts": "转发",
    "Save this draft's score as a variant (up to three). Rewrite, then compare the saved scores side by side. Variants live in memory only and vanish with the page.": "保存当前草稿的评分，最多保留三个版本。改写后可并排比较，版本只保存在内存中，离开页面后即消失。",
    "Score as if the viewer mutually follows the author. X pays 20.0 instead of 5.0 for a reply in that case (BidirectionalFollowReplyWeightBoost = 15.0) — but only on original posts, never on replies or reposts.": "假设浏览者和作者互关。原创帖的回复权重由 5.0 增至 20.0（BidirectionalFollowReplyWeightBoost = 15.0），回复和转发不适用。",
    "Score badges on timeline tweets": "在时间线帖子上显示评分徽标",
    "Scores posts with X's published For You ranking weights and the real scorer arithmetic (xai-org/x-algorithm, Aug 13 2026).": "使用 X 公布的「为你推荐」权重和评分公式给帖子打分（xai-org/x-algorithm，2026 年 8 月 13 日）。",
    "Scroll x.com": "浏览 x.com",
    "Scrolling straight past costs {w}. Tiny per impression, but it happens on most of them.": "直接划过的权重为 {w}。每次曝光的影响较小，但大多数曝光都会发生这种情况。",
    "Settings": "设置",
    "Settings, the full weight table and your score history live behind the toolbar icon — click the": "设置、完整权重表和评分记录都在工具栏弹窗里。随时点击",
    "Share via DM": "通过私信分享",
    "Share via copy link": "复制链接分享",
    "Shares": "分享",
    "Sharing to DMs carries {dm}, the same coefficient as a reply. The share menu itself carries {share}. Musk called DM-forwarding “one of the strongest signals”; the 2026 file finally puts a number on it.": "私信分享的权重为 {dm}，与回复相同。分享菜单操作本身的权重为 {share}。马斯克曾称私信转发是极强的信号之一，X 在 2026 年公布了具体权重。",
    "Show the math": "查看计算过程",
    "Simulate the 2023-era verified boost (×4 in-network / ×2 out-of-network, archived commit ec83d01dca). No such multiplier exists in the Aug 2026 release — off by default because it floors every verified author near the top of the scale.": "模拟 2023 年的认证加权，浏览者已关注作者时 ×4，未关注时 ×2（归档提交 ec83d01dca）。2026 年 8 月的公开版本没有该系数。此项默认关闭，因为它会使认证作者的评分接近量表上限。",
    "Source on GitHub": "GitHub 源码",
    "Start typing a post": "开始写帖",
    "Starts a thread — keeps readers on the post longer": "帖子串首帖有助于延长读者停留",
    "That file does not look like an Under the Hood report (expected the JSON downloaded from {path}). Nothing was imported.": "此文件不像有效的可见性报告。请选择从 {path} 下载的 JSON 文件。",
    "That file is over 2 MB — an Under the Hood report is a few KB. Not imported.": "文件超过 2 MB，未导入。可见性报告通常只有几 KB。",
    "The research": "研究依据",
    "The weights are X's. The probabilities are estimates.": "权重来自 X，概率由 Bangermeter 估算。",
    "These are values per event, not per post: a heavy weight on a rare action still moves fewer posts than a light weight on a common one. Only likes, replies and reposts above come from this post's real counts — the rest need Phoenix's own predictions, so they inform what you read here without entering the score above.": "这些是单次行为的权重。罕见行为即使权重较高，影响的帖子也可能少于权重较低的常见行为。互动分只使用本帖的实际点赞、回复和转发数。其余项需要 Phoenix 的预测，因此只在这里提供参考。",
    "This draft is a reply. In-network replies take the same ×0.75 rescoring factor as out-of-network posts (oon_applies, xai-value-model/scoring.rs) — already reflected in the score. Replies are also excluded from the mutual-follow reply boost and from Grok's banger pipeline.": "这是回复草稿。即使浏览者关注作者，回复也会使用与未关注作者的帖子相同的 ×0.75 系数（oon_applies，xai-value-model/scoring.rs），已反映在分数中。回复也不享受互关回复加权，不参与 Grok 的热门帖评估。",
    "This is a reply — replies take the same 75% discount as out-of-network posts": "这是回复，已按与未关注作者的帖子相同的 75% 计算",
    "This is a repost — reposts take the same 75% discount as out-of-network posts": "这是转发，已按与未关注作者的帖子相同的 75% 计算",
    "Thread starter": "帖子串首帖",
    "Three things and you're using it.": "三步上手。",
    "Topic-request OON ×0.5": "按话题请求的未关注作者帖子 ×0.5",
    "Under the Hood": "可见性报告",
    "User video continuation": "用户继续观看视频的时长",
    "Verified author boost": "认证作者加权",
    "Verified author ×{factor} (2023 code, absent from the 2026 release)": "认证作者 ×{factor}（2023 年源码，2026 年版本未采用）",
    "Verified author — ×{factor} boost per 2023 code (absent from the 2026 release)": "认证作者加权 ×{factor}（依据 2023 年源码，2026 年版本未采用）",
    "Verified author: 2023-era code boosted verified posts ×4 in-network / ×2 out-of-network. No such multiplier appears anywhere in the Aug 2026 release. Not applied to this score — enable “2023 verified boost” in the popup to simulate that era.": "2023 年源码中，认证作者的帖子面向关注者时 ×4，面向未关注者时 ×2。2026 年 8 月的公开版本没有这个系数，本次评分也未使用。可在弹窗中开启「模拟 2023 年认证加权」来查看当时的效果。",
    "Video continuation": "视频继续观看时长",
    "Video open": "打开视频",
    "Video quality view": "有效观看视频",
    "Video-quality-view now pays {vqv}. It was 0.05 until August 2026, so finishing a clip no longer earns anything directly — though video still clears the {seconds}-second dwell bar easily.": "有效观看视频的权重现为 {vqv}，2026 年 8 月前为 0.05。看完视频本身不再直接加分，但视频仍容易达到 {seconds} 秒的停留门槛。",
    "Weight {w} (param.rs, {date} sync)": "权重 {w}（param.rs，{date} 同步）",
    "Weight {w} vs {like} for a like (param.rs, {date} sync). A ratio of coefficients on same-denominator rates — meaningful inside this score, and only here. X warns that weight ratios are NOT count equivalences in general; see the fine print below.": "此项权重为 {w}，点赞为 {like}（param.rs，{date} 同步）。这里比较的是相同分母下的互动率系数。X 提醒，权重比例通常不能换算成实际次数，详见下方说明。",
    "Weights multiply a PREDICTED PROBABILITY, not a count. X's own code comment calls the ratio reading — 'one report cancels 468 likes' — incorrect, and says a Report's baseline probability is over 1000x lower than a Like's, which is why its coefficient is large.": "权重乘的是预测概率。X 的源码注释指出，「一次举报抵消 468 个点赞」是错误的读法。举报的基准概率不到点赞的千分之一，因此系数较大。",
    "What X's published weights actually say": "X 公布的权重如何解读",
    "What the algorithm would predict from the content alone. 50 = a typical post.": "根据内容本身预估算法评分，50 分对应典型帖子。",
    "Where this reply SORTS inside the thread is not something anyone outside X can score — that ranker is not open-sourced.": "X 尚未公开回复在帖子串内的排序逻辑，因此外部工具无法为它预测位置。",
    "X sends the ranker seven facts about your content: video, longest video length, photo, media count, weighted text length, NEWLINE COUNT, and whether there's a link — though no published model code reads them yet. A link counts as {urlLen} characters no matter how long it is, and an image's own t.co doesn't count as a link at all.": "X 向排序器发送七项内容信息：是否有视频、最长视频时长、是否有图片、媒体数量、加权文字长度、换行数量和是否有链接。公开的模型源码尚未使用这些字段。链接一律按 {urlLen} 个字符计算，图片附件自带的 t.co 地址不计作链接。",
    "You get the breakdown in plain English: which signals fired, what each reply and repost is actually worth, and what age cost it.": "详情会用易懂的语言说明触发了哪些信号、回复和转发的权重，以及帖子发布时间对评分的影响。",
    "You pasted into this reply. X's reply-quality scorer is shown an is_pasted flag when scoring replies to accounts over {k}K followers (grox/core/lm/thread.py). What the withheld rubric does with it is unpublished — this chip is informational, and the score above does not move on it.": "这条回复含有粘贴内容。回复关注者超过 {k} 千人的账号时，X 的回复质量模型会收到 is_pasted 标记（grox/core/lm/thread.py）。X 未公开模型如何使用它，此处仅作提示，分数不受影响。",
    "Your imported report ({period}). These are X's OWN labels on your account — not estimates.": "已导入报告（{period}）。标签由 X 直接添加到你的账号。",
    "Your imported report ({period}, {posts} posts). These are X's OWN labels on your account — not estimates.": "已导入报告（{period}，共 {posts} 条帖子）。标签由 X 直接添加到你的账号。",
    "each worth {likes} likes": "每次权重相当于 {likes} 次点赞",
    "each worth {likes} likes (mutual-follow boost on)": "每次权重相当于 {likes} 次点赞（已开启互关加权）",
    "estimated": "估算",
    "from counts": "来自实际计数",
    "measured": "实测",
    "not a scored action — X publishes no bookmark weight": "X 未公布收藏权重，收藏不计分",
    "on any section opens the full weight × probability table.": "可展开完整的「权重 × 概率」表。",
    "pasted text": "含粘贴内容",
    "period unknown": "日期范围未知",
    "reply": "回复",
    "the baseline unit": "比较基准",
    "to save up to three variants and pick the best one before you send it. Replies are scored as replies.": "，最多保存三个版本。发帖前可比较哪一版得分更高，回复草稿会按回复评分。",
    "viewer-specific": "因浏览者而异",
    "zeroed by X": "权重已由 X 归零",
    "{label}  ·  w {w} × P {p}": "{label} · 权重 {w} × 概率 {p}",
    "{label}  ·  w {w} × {p} s predicted": "{label} · 权重 {w} × 预估 {p} 秒",
    "{label} (not in the public allowlist)": "{label}（未列入公开允许列表）",
    "{n} bookmark": "{n} 次收藏",
    "{n} bookmarks": "{n} 次收藏",
    "{n} day": "{n} 天",
    "{n} days": "{n} 天",
    "{n} h": "{n} 小时",
    "{n} like": "{n} 个赞",
    "{n} likes": "{n} 个赞",
    "{n} min": "{n} 分钟",
    "{n} posts": "{n} 条帖子",
    "{n} replies": "{n} 条回复",
    "{n} reply": "{n} 条回复",
    "{n} repost": "{n} 次转发",
    "{n} reposts": "{n} 次转发",
    "— what the content alone would be predicted to earn": "：根据内容预测的互动表现",
    "— what the post actually earned, per view": "：按每次浏览计算的实际互动表现",
    "“Like if…” bait — invites “show less” clicks and penalties": "「如果……就点赞」属于互动诱导，可能导致读者选择「减少显示」并带来负面影响",
    "“Show the math”": "「查看计算过程」",
    "“{snippet}”\nClick to remove this saved variant.": "「{snippet}」\n点击移除此草稿版本。",
    "Bangermeter estimates the probabilities; only likes, replies and reposts come from real counts. Relative score, not predicted reach.": "Bangermeter 负责估算概率，只有点赞、回复和转发使用实际计数。评分衡量相对表现，无法预测触达。",
    "Engagement rates = count ÷ views, smoothed toward the median with K={k} pseudo-views (empirical Bayes), then run through the same weighted-sum formula. Raw: {raw}": "互动率 = 互动次数 ÷ 浏览量。使用 K={k} 次虚拟浏览向中位数平滑（经验贝叶斯），再代入同一加权求和公式。原始分：{raw}",
    "Every value below is transcribed from {snapshot}. Replies rise to {mutual} on an original post from a mutual follow.": "下表的数值来源于权重快照。互关用户对原创帖的回复权重可提高到 {mutual}。{snapshot}",
    "Has video — opening it pays {videoOpen}; a full watch earns nothing extra (vqv is 0)": "含视频，打开权重为 {videoOpen}，看完不会额外加分（vqv 为 0）",
    "Has video — opening it pays {videoOpen}; a watch over {seconds} seconds pays {vqv}": "含视频，打开权重为 {videoOpen}，观看超过 {seconds} 秒的有效观看权重为 {vqv}",
    "In the pilot? Download your visibility report from {path} and import it here. Parsed locally, stored only in this browser. At X's published defaults the report is monthly per-label totals — it can say how many posts carried a label, not which ones.": "如果你在试点范围内，可从 {path} 下载可见性报告并导入。报告仅在当前浏览器中解析和保存。按 X 的公开默认设置，报告按月汇总每个标签的帖子数，无法查到具体帖子。",
    "Language": "界面语言",
    "Language for the badge, panel, draft meter and this popup. Auto follows X's own display language.": "设置徽标、评分面板、草稿评分和弹窗的语言。「自动」跟随 X 的显示语言。",
    "NET NEGATIVE: X rescales any post whose weighted sum goes below zero into [0, {ceiling}), which puts it under every positive-scoring post in the feed.": "加权总和为负：X 将小于零的加权总和缩放到 [0, {ceiling})，使该帖排在信息流中所有正分帖子之后。",
    "One exception: a post labeled FOSNR_ABUSE_INSULTS is removed only out-of-network, so the author's followers can still get it. Where the post still appears, as here, X shows this notice. That rendering is not in X's published code.": "一个例外是带 FOSNR_ABUSE_INSULTS 标签的帖子。它仅对未关注作者的浏览者筛除，作者的关注者仍可能看到。帖子仍显示时，X 会展示这条提示。提示如何呈现并未写在 X 的公开源码中。",
    "Post video": "发布视频",
    "Quotes a post X limited — X's published code usually removes posts like this from For You": "引用了被 X 限制可见性的帖子，按公开源码通常会从「为你推荐」中筛除",
    "Score = Σ(weight × P(action)) per xai-value-model/scoring.rs.": "评分 = Σ（权重 × 行为概率），依据 xai-value-model/scoring.rs。",
    "Score = Σ(weight × P) over the Phoenix heads, then offset_score (xai-value-model/scoring.rs), × rescorers, normalized so a median post = 50 (√ curve, capped at 100). Raw: {raw}": "先计算 Phoenix 各项的 Σ（权重 × 概率），再应用 offset_score（xai-value-model/scoring.rs）和重评分系数，最后按平方根曲线归一化，使中位数帖子为 50 分，上限为 100 分。原始分：{raw}",
    "Scored from the three heads a browser can see: likes ({like}), replies ({reply}), reposts ({repost}). The other {others} heads — shares (2.0 / 5.0 / 20.0), follows (4.0), clicks, dwell time and the negatives (−0.02 to −234.0) — need Phoenix's predictions, not counts.": "评分使用浏览器可读取的三项计数：点赞（{like}）、回复（{reply}）和转发（{repost}）。其余 {others} 项，包括分享（2.0／5.0／20.0）、关注（4.0）、点击、停留和负反馈（−0.02 至 −234.0），依赖 Phoenix 的概率预测。",
    "Substantive text (≥100 chars)": "内容充实（加权长度至少 100 个字符）",
    "Visibility limited by X — X's published code usually removes it from For You for everyone but the author": "X 已限制可见性。按公开源码，这条帖子通常只会出现在作者自己的「为你推荐」中",
    "{n}d": "{n} 天前",
    "{n}h": "{n} 小时前",
    "{n}m": "{n} 分钟前",
    "English": "英语",
    "日本語": "日语",
    "Rises to 20.0 (+15.0) on an ORIGINAL post from an author you mutually follow — see bidirectionalFollowReplyBoost. Down from 13.5 in the 2023 table. This boost IS the 'mutuals' change X's Head of Product announced on July 13, 2026 — xai-org's own docs/BIDIRECTIONAL_BOOST_CHANGE.md links that announcement to exactly this parameter (A/B tested at 0/5/10/15/20 from July 10, launched at 20.0 on July 13, reduced to 15.0 on July 24 2026). Press framed it as boosting mutuals' replies inside threads; the published implementation boosts original posts from mutuals in For You, and no thread ranker is in the repo.": "对于与你互关的作者的原创帖，回复权重升至 20.0（增加 15.0），见 bidirectionalFollowReplyBoost。2023 年表中的基础回复权重为 13.5。X 产品负责人在 2026 年 7 月 13 日公布的互关调整就是这项加权，docs/BIDIRECTIONAL_BOOST_CHANGE.md 将公告与此参数对应。7 月 10 日起测试了 0／5／10／15／20，7 月 13 日以 20.0 上线，7 月 24 日降至 15.0。媒体称其会提升帖子串内互关用户的回复，但公开实现提升的是「为你推荐」中互关作者的原创帖，仓库未包含帖子串排序器。",
    "Same weight as a reply. Quote counts are not exposed in the timeline DOM, so this is scored from the estimator only.": "权重与回复相同。时间线页面未提供引用计数，因此该项只使用估算值。",
    "Musk (Sep 2024) called forwarding posts to friends 'one of the strongest signals'. The 2026 file puts a number on it: 5.0, the same coefficient as a reply and a quarter of a copy-link share. Not observable from the timeline, so this head is scored from a baseline estimate.": "马斯克在 2024 年 9 月称，向朋友转发帖子是最强的信号之一。2026 年源码公布的权重为 5.0，与回复相同，为复制链接分享权重的四分之一。时间线无法观测此行为，因此使用基准估算。",
    "The heaviest positive coefficient X publishes, at 20.0. Copy-link shares are also among the rarest things a reader does, and X's own comment says the weights already fold in how rare each action is — so this number is large partly BECAUSE the action is rare, and dividing it by the like weight would cancel exactly that. Bangermeter cannot observe copy-link shares at all; this head is scored from a baseline estimate.": "权重为 20.0，是 X 公开的最高正系数。复制链接也是最罕见的行为之一。X 的注释说明，权重已经考虑了行为的稀有程度。直接除以点赞权重会忽略这一点。扩展无法观测复制链接，因此使用基准估算。",
    "Cut from 0.4 to 0.3 in the Sept 28, 2026 sync (published Sept 29). The same push turned on click DWELL at 0.4: the click itself now carries less, and a reader who clicks in and stays now carries something where before it carried nothing. (0.4 against 0.3 does not make staying 'worth more' than clicking — click dwell multiplies a smaller probability.)": "2026 年 9 月 28 日同步（29 日发布）时，点击从 0.4 降至 0.3，同期启用了权重为 0.4 的点击后停留。点击后还须停留，概率小于单纯点击，因此不能直接比较两个权重。",
    "Links ARE rewarded, contradicting the long-standing 'links are punished' folklore — though at 0.2 the reward is small, and low-context link posts still lose more on likes/replies/dwell than they gain here.": "打开链接的权重为 0.2。上下文较少的链接帖在点赞、回复和停留项上的损失仍可能大于打开链接带来的收益。",
    "Cut from 0.07 to 0.02 in the Oct 12, 2026 param.rs sync, published Oct 13. August 25, 2026 had raised it from 0.05 to 0.07, the only positive head X had moved up since first publishing the table; this sync is the first cut. vm-ranker/params.rs still compiles 0.07. The For You value model still pays this head and not vqv (zeroed Aug 25). A separate carousel weight, video_carousel_video_open, is 1.0 and is not this head.": "2026 年 8 月 25 日由 0.05 升至 0.07，是权重表首次公布后唯一上调的正向项。10 月 12 日 param.rs 同步（13 日发布）首次下调，降至 0.02，vm-ranker/params.rs 仍为 0.07。「为你推荐」仍对打开视频计分，有效观看（vqv）自 8 月 25 日起为零。轮播的 video_carousel_video_open 是另一个权重，值为 1.0。",
    "In-network only by default. Since the Oct 5, 2026 sync (published Oct 6, e62790c) a switch, post_unexplored_include_out_of_network, can extend it out of network; it defaults to false. It was hard-wired in-network from Sept 24, 2026, and before that was the PostUnexploredWeightInNetworkOnly switch (default true). Viewer-specific novelty — excluded from the content score. Cut from 0.02 to 0.015 in the Oct 6, 2026 param.rs sync, published Oct 7; vm-ranker/params.rs still compiles 0.02.": "默认仅适用于已关注作者。自 2026 年 10 月 5 日同步（6 日发布，e62790c）起，可用默认关闭的 post_unexplored_include_out_of_network 扩展至未关注作者。9 月 24 日起曾固定限于已关注作者，再早由默认开启的 PostUnexploredWeightInNetworkOnly 控制。此项取决于浏览者，不计入内容分。10 月 6 日同步（7 日发布）将 param.rs 里的 0.02 降至 0.015，vm-ranker/params.rs 仍为 0.02。",
    "ZEROED. Renamed from react_with_video on Oct 30, 2026 (7fef3ba), keeping the same Phoenix action slot (44 in recsys.proto), the same scoring term and 0.0 in both param.rs and vm-ranker/params.rs. It first appeared, as react_with_video, in the Oct 12, 2026 sync, published Oct 13. It is in positive_sum (xai-value-model/weights.rs), so turning it on would move the negative-offset scale. Which action the new name counts is not in the published code, and Bangermeter cannot see it either way.": "权重为零。2026 年 10 月 30 日（7fef3ba）由 react_with_video 改名，仍为 recsys.proto 的行为编号 44，公式和两份参数文件中的 0.0 不变。最初出现在 10 月 12 日同步（13 日发布）。它属于 positive_sum（xai-value-model/weights.rs），启用后会影响负分偏移缩放。公开代码未说明新名称对应的行为，扩展也无法观测。",
    "CONTINUOUS head: multiplies predicted dwell in seconds, not a probability. At a few seconds of dwell this is one of the largest terms for an ordinary post.": "连续项，乘以预测的停留秒数。普通帖子获得几秒停留后，这一项就可能是贡献最大的项之一。",
    "TURNED ON August 25, 2026, at 0.05. Through v0.10.0 this head shipped at 0.0 and this tool said binary dwell paid nothing — that is no longer true. X now pays a flat amount for the reader dwelling at all, on TOP of the continuous dwell-time term (cont_dwell_time, 0.006/second since the Oct 12, 2026 param.rs sync, published Oct 13, from 0.004). Stopping the scroll is the cheapest thing a post can win.": "2026 年 8 月 25 日启用，权重为 0.05。v0.10.0 时仍为 0.0。达到停留门槛会在连续停留项之外获得固定权重。连续项 cont_dwell_time 自 10 月 12 日同步（13 日发布）起从每秒 0.004 提高到 0.006。让读者停止滑动是最容易争取的行为。",
    "TURNED ON in the Sept 28, 2026 sync (published Sept 29), from 0.0 to 0.4 — the coefficient a click carried before that push. Because it needs a click AND a stay, its probability is always below a click's, so comparing the two coefficients says nothing about which is worth more. Despite the cont_ prefix it is NOT paid per second: X's published model config trains this head as 'click-dwell-binary' with a 10.0 threshold, and binary heads skip the seconds rescale at inference, so the 0.4 multiplies a PROBABILITY — the chance a reader clicks into the post and stays past that mark. (The serving-side mapping from model output to this field is not in the repo; the training config is the published evidence.) Like cont_dwell_time it is kept out of positive_sum, so it does not move the negative-offset scale. Bangermeter cannot see a click or what follows it, so this head is scored from a baseline estimate.": "2026 年 9 月 28 日同步（29 日发布）时由 0.0 升至 0.4，此前 0.4 是点击本身的系数。该项既需点击又需停留，概率低于单独点击。训练配置将它标为 click-dwell-binary，阈值为 10.0，推理时二元项跳过秒数重缩放。0.4 乘的是点开后达到停留门槛的概率。服务端字段映射尚未公开，训练配置是现有依据。和 cont_dwell_time 一样，它不进入 positive_sum，不改变负分偏移缩放。扩展使用基准估算。",
    "ZEROED. Published only in vm-ranker/params.rs, first in the Oct 6, 2026 push. scoring.rs multiplies P(video open) by predicted home-video continuation seconds. Outside positive_sum, like the other continuous heads, so at 0.0 it moves nothing.": "权重为零。只在 vm-ranker/params.rs 公布，首次出现在 2026 年 10 月 6 日推送。scoring.rs 将打开视频的概率乘以预测的首页视频续看秒数。此项不进入 positive_sum。",
    "ZEROED. Published only in vm-ranker/params.rs, first in the Oct 6, 2026 push. scoring.rs multiplies P(video open) by the viewer's average continuation seconds across the slate (set_user_video_continuation). Outside positive_sum.": "权重为零。只在 vm-ranker/params.rs 公布，首次出现在 2026 年 10 月 6 日推送。scoring.rs 将打开视频的概率乘以浏览者在当批候选中的平均续看秒数（set_user_video_continuation）。此项不进入 positive_sum。",
    "ZEROED. The 2023 table paid 12.0 for a profile-click-and-engage. It is now worth nothing.": "权重已归零。2023 年点击个人资料后互动曾有 12.0 的权重。",
    "ZEROED. Published only in vm-ranker/params.rs, first in the Oct 6, 2026 push. scoring.rs multiplies P(profile click) by predicted home profile-visit seconds. Like cont_dwell_time it is outside positive_sum, so at 0.0 it does not move the negative-offset scale.": "权重为零。只在 vm-ranker/params.rs 公布，首次出现在 2026 年 10 月 6 日推送。scoring.rs 将点击个人资料的概率乘以预测的首页个人资料访问秒数。和 cont_dwell_time 一样，此项不进入 positive_sum，不改变负分偏移缩放。",
    "ZEROED August 25, 2026 — it shipped at 0.05 through v0.10.0. The duration gate is still live and this tool still evaluates it: the clip must run STRICTLY LONGER than MinVideoDurationMs = 10,000, so a 10.000s clip and every GIF fail it (xai-value-model/proto.rs). The second gate — a VIEWER with 10,000 or more followers getting no vqv weight — no longer reaches the served ranking: since Sept 24, 2026 the final score comes from vm-ranker, which checks duration only, and the follower gate survives only in home-mixer's local fallback score (candidates_util.rs). Either way the gate now guards a term worth nothing. Kept because the machinery is intact and X can re-enable it by moving one number.": "自 2026 年 8 月 25 日起权重为零，v0.10.0 及更早为 0.05。扩展仍检查视频是否严格大于 10,000 毫秒，恰好 10 秒和 GIF 均不达标（xai-value-model/proto.rs）。自 9 月 24 日起最终分数来自只检查时长的 vm-ranker，浏览者关注者达到 10,000 人时的排除规则仅留在 home-mixer 的本地备用评分中（candidates_util.rs）。当前权重为零，保留判断以便日后恢复权重。",
    "ZEROED.": "权重为零。",
    "Deepened again in the Oct 13, 2026 param.rs sync, published Oct 14, from −47.52 to −52.272 — another exact 10% (47.52 × 1.1). The Sept 28 sync, published Sept 29, had been the first move, −43.2 to −47.52. vm-ranker/params.rs still compiles −47.52. Block, mute, report and not-dwelled are unchanged.": "2026 年 10 月 13 日的 param.rs 同步（14 日发布）中由 −47.52 降至 −52.272，负向幅度增加 10%。9 月 28 日同步（29 日发布）前为 −43.2，vm-ranker/params.rs 仍为 −47.52。屏蔽、静音、举报和划过未停留未变。",
    "The long-circulated 'block = -120' figure was a fan-site fabrication. The real number is -31.2 — and it is the mildest of the four hard negatives.": "流传的 −120 来自粉丝网站。实际权重为 −31.2，在四项强负反馈中惩罚最轻。",
    "Nearly 2× a block. Muting is the harsher signal, which is the reverse of what most people assume.": "静音的惩罚约为屏蔽的两倍。",
    "Scrolling straight past is now a scored penalty. Tiny per impression, but it applies to the majority of impressions, so in aggregate it is the largest negative an ordinary post carries.": "直接划过会扣分。单次影响虽小，但大多数曝光都会发生，因此累计起来往往是普通帖子最大的负项。",
    "Questions raise expected reply rate. Reply is 5.0 — ten times a like — and quote matches it at 5.0.": "提问预计提高回复率。回复与引用的权重均为 5.0。",
    "Longer posts hold attention, and attention is now paid three ways: continuously (0.006/second since the Oct 12 2026 param.rs sync (published Oct 13), from 0.004), as a penalty for scrolling past (−0.02), and since Aug 25 2026 as a flat 0.05 for clearing a TEN-SECOND dwell mark. That mark is a threshold, not a slope, so length helps it more than it helps mean dwell time — which is why this modifier moves the binary head harder than the continuous one. Length is counted the way X counts it for the 280 limit (textWeighting): a CJK character or an emoji counts 2 and a link counts 23, so about 50 Japanese characters reach the mark.": "较长的帖子有助于留住读者。算法按每秒 0.006 奖励持续停留（2026 年 10 月 12 日 param.rs 同步、13 日发布，此前为 0.004），直接划过的权重为 −0.02，达到 10 秒另有固定权重 0.05（自 8 月 25 日起）。长度更有助于达到停留门槛，因此这一修正对二元项影响较大。长度遵循 X 的 280 字加权计数，中日韩字符或表情按 2 计，链接按 23 计，约 50 个中日韩字符达到此长度标准。",
    "Threads drive post clicks (0.3) and give people something to quote (5.0). Since X's Sept 28 2026 sync it also pays 0.4 when a reader clicks in AND stays past the click-dwell mark — which a thread, read on its own page, is built to earn.": "帖子串有助于带来点击（0.3）和引用（5.0）。自 2026 年 9 月 28 日同步起，读者点开且停留达标也会计入 0.4 的权重。",
    "Images raise like rates mildly and enable the photo-expand head (0.05).": "配图预计略微提高点赞率，并启用放大图片项（0.05）。",
    "Enables video_open. X raised it from 0.05 to 0.07 on Aug 25 2026, then cut it to 0.02 in the Oct 12 2026 param.rs sync (published Oct 13). It also enables video-quality-view — but X zeroed that head on Aug 25, so clearing its duration gate (STRICTLY over 10 seconds) is now worth nothing. Video did not stop being paid for holding attention, though: the binary dwell head turned on in the same August push at a ten-second mark, which video reaches far more easily than text, so the credit moved rather than vanished. That shift in routing is published; the size of the dwell nudge here is our estimate. The '10× video boost' remains folklore. The carousel's own video-open weight (1.0, param.rs only) is a different head and is not scored here.": "启用 video_open。X 在 2026 年 8 月 25 日将权重从 0.05 提到 0.07，10 月 12 日同步（13 日发布）降至 0.02。有效观看项自 8 月 25 日归零，严格长于 10 秒也不会直接加分。同一天启用了 10 秒的二元停留项，视频比文字更容易达标。评分路径来自公开源码，本扩展估算停留概率的提升幅度。「视频加成 10 倍」缺乏依据。轮播视频打开权重 1.0 是另一项，不纳入本评分。",
    "The 2026 release pays 0.2 for opening a link — links are NOT structurally unrewarded, which retires the old 'link penalty by head omission' reading. 0.2 is small, but it is positive.": "2026 年版本中，打开链接的权重为 0.2。",
    "A link with no context earns less on every attention head than the 0.2 open-link weight pays back. The '−30–50% link penalty' figure remains unsourced; this is a mild directional estimate. 'Little text' means under 50 in X's own length count (textWeighting), where a CJK character counts 2 and the link itself 23.": "缺少上下文的链接在注意力相关项上的预估损失超过打开链接的 0.2 权重。「链接扣分 30–50%」没有源码支持，此处是幅度较小的方向性估算。文字较少指按 textWeighting 计不足 50，中日韩字符按 2 计，链接按 23 计。",
    "Earlybird's HAS_MULTIPLE_HASHTAGS_OR_TRENDS penalty exists in code; magnitude never published. Mild directional.": "Earlybird 源码存在 HAS_MULTIPLE_HASHTAGS_OR_TRENDS 惩罚，幅度未公开。此处是幅度较小的方向性估算。",
    "'Like if / RT if / follow me' phrasing — plus Hinglish ('karo agar', '1 likho agar', 'sach batao') and Devanagari ('…तो लाइक करें', 'कमेंट बॉक्स में जरूर', 'सच सच बताओ') — invites the not-interested (−52.272 since X's Oct 13 2026 param.rs sync, published Oct 14, from −47.52, itself from −43.2) and mute (−58.8) heads, and a net-negative post is rescaled below every positive post. Detection covers imperative calls to action ONLY; the rhetorical-question genre ('Kya …?', 'X ya Y?') is deliberately not claimed, because no pattern separates it from a sincere question. Note the Devanagari patterns are not transliterations: Hindi puts the call to action last, so 'like karo agar X' is an English calque that barely occurs, and every Devanagari pattern anchors on तो / जरूर / मुझे instead. That anchor is load-bearing — on X the bare verb phrase is usually an argument ('पहले पढ़ो, फिर कमेंट करो'), not a solicitation. Validated against real Hindi posts: zero false positives, and deliberately conservative recall.": "「如果……就点赞／转发」「关注我」等内容，以及印英混用和天城文的同类措辞，可能引发不感兴趣（−52.272，2026 年 10 月 13 日同步、14 日发布，此前为 −47.52、再早为 −43.2）或静音（−58.8）。净负分的帖子排在所有正分帖子后。检测只针对命令式互动号召，难以与真诚提问区分的反问未纳入。天城文规则锚定 तो／जरूर／मुझे，因为缺少这些词的短语在 X 上往往只是争论中的表达。用真实印地语帖子验证时未发现误报，检测范围有意保持保守。",
    "Shouting correlates with 'show less' feedback.": "像在喊叫的写法与「减少显示」反馈有关。",
    "X's own descriptions say five FOSNR labels come with 'a label explaining that the post has limited visibility', shown to all users (underTheHoodLabels.strato). The on-screen words 'Visibility limited' are not in source. For You checks in-network posts and reposted originals at the TimelineHome safety level, and out-of-network posts, plus every candidate's ancestors and quoted post, at TimelineHomeRecommendations. FOSNR_HATEFUL_CONDUCT, FOSNR_VIOLENT_SPEECH, FOSNR_ABUSE and FOSNR_CIVIC_INTEGRITY are dropped at both levels for every viewer except the author. FOSNR_ABUSE_INSULTS is dropped at the out-of-network level only. vf_filter.rs removes every Drop verdict, so these posts are gone from For You, not ranked lower. A post that quotes one, or whose parent or thread root is one, is removed with it. Two published paths skip all of this: a post whose visibility check fails gets no verdict and is kept, and posts from PushToHomeSource pass through no VF filter. The chronological Following feed checks every post at TimelineHome, so it removes the same four labels. The ranked Following feed runs the For You checks. No For You level emits a FOSNR notice or a FOSNR limited-engagement verdict. Only TimelineHomeHydration does, which no published For You code calls: since Oct 6, 2026 (e62790c) a soft-intervention notice for a follower of the author of a FOSNR_ABUSE_INSULTS post, and since Oct 8 (35650fb) an appealable notice for the author on all five labels, which carries a FOSNR limited-engagement verdict for the author. Every one of these rules also requires the client's FOSNR rules switch, which is on by default. Where and how X renders the notice is not in the published code. Bangermeter's score assumes the post can reach For You. Apart from those two paths, a post carrying this notice reaches only its author in For You, plus, when the label is FOSNR_ABUSE_INSULTS, the author's followers. A FOSNR_ABUSE_INSULTS post that an account the viewer follows reposts is checked at TimelineHome, which keeps it, so the published For You code lets that repost through to anyone following the account that reposts it. That path is contested: X's TimelineHomeHydration level, which X compares against its production tweet hydration (getTweetFields) and which no published For You code calls, drops FOSNR_ABUSE_INSULTS for every non-follower of the author (fosnr_abuse_insults_non_follower, on by default) and, since Oct 6, 2026, gives the author's followers a soft-intervention notice instead, and a repost takes its original's verdict when the original is withheld (post_evaluator/retweet.rs merge_source, moved there Oct 27, 2026 in 2f25214; before Oct 15, 2026, merge_verdict). Whether such a repost reaches a non-follower is not settled by the published code.": "X 的 underTheHoodLabels.strato 描述了五个向所有浏览者显示可见性说明的 FOSNR 标签，公开源码未给出「可见性受限」的屏幕文案。「为你推荐」用 TimelineHome 检查已关注作者的帖子和转发的原帖，用 TimelineHomeRecommendations 检查未关注作者的帖子、候选帖的上级帖以及引用的帖子。FOSNR_HATEFUL_CONDUCT、FOSNR_VIOLENT_SPEECH、FOSNR_ABUSE 和 FOSNR_CIVIC_INTEGRITY 在两个级别均对作者以外的浏览者返回 Drop。FOSNR_ABUSE_INSULTS 只在面向未关注作者的级别丢弃。vf_filter.rs 移除 Drop 结果，引用它或以它为父帖或串首帖的帖子也会被移除。检查失败没有判定时保留帖子，PushToHomeSource 也绕过该筛选。按时间排序的「正在关注」移除同样四类标签，算法排序的「正在关注」沿用「为你推荐」的检查。\nFOSNR 提示或限制互动判定由 TimelineHomeHydration 发出，公开推荐代码未调用该级别。自 2026 年 10 月 6 日（e62790c）起，它为关注 FOSNR_ABUSE_INSULTS 帖子作者的人发出轻量提示。自 10 月 8 日（35650fb）起，五类标签均向作者发出可申诉提示及限制互动判定。规则受默认开启的客户端开关控制。扩展评分假设帖子能进入推荐。除绕过路径外，带提示的帖子一般只向作者显示，FOSNR_ABUSE_INSULTS 也可能向作者的关注者显示。公开推荐代码可能允许受关注账号转发这类原帖，但 TimelineHomeHydration 对未关注原作者的浏览者会丢弃原帖，转发可能继承原判定（post_evaluator/retweet.rs）。因此公开代码无法确定这类转发最终能否触达未关注原作者的人。",
    "X's own descriptions say five FOSNR labels come with a notice that the post has limited visibility (underTheHoodLabels.strato). That the notice shown here is one of them is an inference: where and how X renders it is not in the published code. For You checks each candidate's quoted post at the TimelineHomeRecommendations safety level, where all five are dropped. When the quoted post is dropped, should_drop_ancillary flags the quoting post and AncillaryVFFilter removes it, whether or not it has a label of its own. That can happen while the quoted post would be shown on its own: a FOSNR_ABUSE_INSULTS post from an account the viewer follows, unless that post is also a candidate in the same request. The drops exempt the quoted post's author, who can still be shown the quoting post. At least five paths skip the removal: the quote lookup fails, so there is no quoted post to check; the quoted post's check fails with an RPC error (a post missing from a successful response counts as dropped); the quoting post's own check errors, so it is never flagged; the quoted post is also checked in-network in the same request and keeps that verdict, where FOSNR_ABUSE_INSULTS is not dropped; or the post arrives from PushToHomeSource, which passes through no VF filter. The ranked Following feed takes its posts from the same Phoenix pipeline as For You, so it removes them too. The chronological Following feed checks quoted posts at TimelineHome, so it removes a post quoting one with any of the four labels other than FOSNR_ABUSE_INSULTS.": "X 的 underTheHoodLabels.strato 描述了五种带可见性受限提示的标签。此处提示的对应关系是推断，呈现方式未公开。「为你推荐」用 TimelineHomeRecommendations 检查被引用帖，五类标签均返回 Drop。被引用的帖子被丢弃时，should_drop_ancillary 标记引用它的帖子，AncillaryVFFilter 随后移除引用帖，无论它自身有无标签。已关注作者的 FOSNR_ABUSE_INSULTS 原帖单独出现时仍有可能保留。\n至少五种路径可能跳过移除：引用查询失败、被引用帖的检查出现 RPC 错误（成功响应中缺失该帖仍视为丢弃）、引用帖自身检查出错、同请求有已关注作者的保留判定、帖子来自 PushToHomeSource。算法排序的「正在关注」沿用相同流程，按时间排序的「正在关注」只移除引用了其他四类标签帖子的引用帖。",
    "OONRetweetReplyFilter removes replies (and reposts) from unfollowed accounts from For You candidates entirely — an out-of-network reply is not down-weighted, it is gone. Replies with a missing parent are dropped too. Since the Oct 2, 2026 sync (published Oct 3, b412112) a switch, enable_phoenix_oon_replies, can let out-of-network replies that Phoenix retrieval found through, optionally only those replying directly to the thread root. It defaults to false, so at published defaults the filter still removes them all.": "OONRetweetReplyFilter 将未关注作者的回复和转发移出「为你推荐」候选，缺少父帖的回复也会被筛除。自 2026 年 10 月 2 日同步（3 日发布，b412112）起，enable_phoenix_oon_replies 可放行 Phoenix 召回的非关注回复，并可进一步限于对串首帖的直接回复。默认关闭。",
    "Replies are routed to the Grok reply-ranking scorer (GROK_4_MINI_CRITICAL, 0-3) when the DIRECT PARENT author or the THREAD-ROOT author has strictly more than 250,000 followers, as of Nov 3, 2026 (unchanged since Sept 24). Treat that as a dated reading: X has raised the gate eleven times since publishing it — 15,000 (Aug 13), 30,000 (Aug 14), 40,000 (Aug 17), 60,000 (Aug 18), 80,000 (Aug 21), 100,000 (Aug 24), 120,000 (Aug 25), 150,000 (Sept 8), 180,000 (Sept 16), 200,000 (Sept 17), 225,000 (Sept 23), 250,000 (Sept 24). Version 0.10.2 said eight raises; there had been nine — our trace had missed the 180,000 step on Sept 16. Versions through v0.10.0 said 100,000. That figure was CORRECT when it shipped — the gate stood at exactly 100,000 from Aug 24 — and it went stale within a day, the same way the weights did. (A 0.10.2 draft of this note claimed the 100,000 had been mis-sourced from the model's prompt string. That self-correction was itself wrong and was caught in review: the prompt does carry 100,000, and it still does, so anyone re-deriving this number TODAY would land on the wrong one — but that is a live trap, not what happened here.) A score of 0 applies the RiskyHighVizReply safety label — unless the replier is a high-page-rank or grey-badge account, which X exempts (high page rank here means a cred score of at least 66 when X has one for the account, since the Oct 7, 2026 sync (published Oct 8, 35650fb); the cutoff was 60 from Oct 1 and 62 from Oct 3, and version 0.10.4 did not mention it); the duration of that application is not published (a separate enforcement rule applies the same label for 30 days on a different trigger, llm_slop_post). Self-replies are exempt — the filter skips a reply whose author is the parent author or the root author. The scoring rubric itself is withheld by X 'to reduce gameability', so no tool can honestly claim to reproduce it, this one included. Below the gate a reply goes to a lighter Gemma scorer instead, which switches to a reply-spam-tuned model above 125,000 thread followers (150,000 until Sept 26) — so that model covers the 125,001-250,000 band. One exception since Sept 22: a reply that QUOTES a post skips Gemma and is scored by the full Grok scorer, whatever the follower counts.": "截至 2026 年 11 月 3 日，若直接父帖或串首帖的作者拥有严格超过 250,000 名关注者，Grok 模型（GROK_4_MINI_CRITICAL）会给回复打 0–3 分。门槛在 9 月 24 日达到此值，是 8 月公开以来的第 11 次上调。曾依次为 15,000、30,000、40,000、60,000、80,000、100,000、120,000、150,000、180,000、200,000 和 225,000。v0.10.2 曾少记一次上调，v0.10.0 写的 100,000 在发布时有效，随后过期。模型提示仍含 100,000，不能从该数字推导线上门槛。\n0 分会触发 RiskyHighVizReply 标签，高可信度和灰标账号除外。可信度门槛自 10 月 7 日同步（8 日发布，35650fb）升至 66，10 月 1 日起曾为 60、10 月 3 日起为 62。标签持续时间未公开，另一条 llm_slop_post 规则可因不同触发条件应用相同标签 30 天。作者回复自己的父帖或串首帖时跳过筛选。X 未公开评分标准。\n低于门槛时使用较轻的 Gemma 模型，串作者关注者超过 125,000（9 月 26 日前为 150,000）时使用对垃圾回复调优的版本。2026 年 9 月 22 日起，带引用的回复无论关注者数量均走完整 Grok 模型。",
    "The service that ORDERS replies under a post is not in the open-source release — the repo's own README scopes it to the For You feed. What the repo DOES ship is the 0-3 reply-ranking score generator (grox/flows/reply_spam/), not the ordering logic that consumes it. Any claim about a reply's position inside a thread is unpublished territory and this tool says so rather than guessing.": "帖子下回复的排序服务未开源，仓库 README 的范围是「为你推荐」。X 公开了 0–3 分的回复评分生成器（grox/flows/reply_spam/），但没有公开使用该分数决定帖子串内位置的逻辑。",
    "There is NO bookmark WEIGHT in the 2026 Phoenix roster — no coefficient multiplies a predicted bookmark, so a bookmark cannot be converted into score the way a like or a reply can. That is the precise claim, and the precision matters: bookmarks are NOT absent from the system. A post's bookmark_count is hydrated from engagement counts and sent to Phoenix with every candidate (home-mixer/models/candidate.rs, alongside content_features) — but no published model code reads it: the published feature prep takes five counts, likes, replies, reposts, quotes and views. What the published model does take in is the VIEWER's own bookmarking, as one action in their engagement history; and ClientTweetBookmark is in the POSITIVE_ENGAGEMENTS list in viewer_history.rs used to build the set of authors a viewer has engaged with. So bookmarking shapes what the bookmarker is shown; a post's bookmark count has no published path into its own score. (Version 0.10.2 called bookmark_count a model input. Sent to the model is as far as the published code goes.) Through v0.10.0 this tool said bookmarks survived only inside the dwell-regret gate — X deleted that gate on Sept 18, 2026, and the statement was too narrow even before then. Musk's 'de facto silent like' remark (Jan 2023) never became a shipped weight, and the '10×/20×' claims are folklore.": "2026 年 Phoenix 行为清单没有收藏权重，收藏无法像点赞或回复一样换算成得分。候选帖的 bookmark_count 随 content_features 发送给 Phoenix（home-mixer/models/candidate.rs），公开特征代码却只读点赞、回复、转发、引用和浏览量。浏览者的收藏历史会送入模型，viewer_history.rs 还将 ClientTweetBookmark 纳入计算已互动作者的 POSITIVE_ENGAGEMENTS。收藏会影响收藏者看到的推荐，帖子收藏数自身没有公开的自评分路径。0.10.2 曾称它是模型输入，目前只证实会发送给模型。旧版曾将收藏限于 dwell-regret，X 在 2026 年 9 月 18 日删除了这道门槛。马斯克在 2023 年 1 月称收藏是「隐形点赞」，但无对应公开权重，「10 倍／20 倍」的说法也无依据。",
    "November 2, 2026 — xai-org/x-algorithm home-mixer/params/param.rs (upstream last-sync stamp 2026-11-02T16:00:39Z). param.rs and vm-ranker/params.rs no longer agree. This table follows param.rs, the cron snapshot of production defaults. vm-ranker/params.rs, the served scorer's compiled defaults, still has the September 29 numbers for five heads (favorite 0.5, video_open 0.07, post_unexplored 0.02, cont_dwell_time 0.004, not_interested −47.52). param.rs moved post_unexplored 0.02→0.015 in the Oct 6 sync (published Oct 7); video_open 0.07→0.02, cont_dwell_time 0.004→0.006 and favorite 0.5→0.6 in the Oct 12 sync (published Oct 13); favorite 0.6→0.66 and not_interested −47.52→−52.272 in the Oct 13 sync (published Oct 14). Four heads were added, all at 0: video_continuation, user_video_continuation and profile_visit_secs in vm-ranker only (published Oct 6), and react_with_video in both files (Oct 12 sync, published Oct 13), renamed post_video on Oct 30 (7fef3ba) with its 0.0 and its scoring slot unchanged. Two video-carousel weights also appeared in param.rs (Oct 14 sync, published Oct 15); they are not ranking heads and the carousel is off by default. Why param.rs: vm-ranker's config_sync.rs polls the same live rust_home_mixer.yml that param.rs mirrors, and both use the same rust_home_mixer_* keys. How the scorer resolves a key missing from that config is in a feature-switch library X has not published. The ranking values were last changed in the Oct 13, 2026 sync (published Oct 14). Later pushes only added video-carousel weights, a third in the Oct 28 sync (published Oct 29, 606b254) and a fourth on Oct 30 (7fef3ba), both at 0, and renamed react_with_video; every value is unchanged through the Nov 2 sync, published Nov 3 (b220448). Earlier, the September 29, 2026 sync (stamp 2026-09-29T17:02:52Z) changed click 0.4→0.3, cont_click_dwell_time 0.0→0.4, not_interested −43.2→−47.52, with both files agreeing on all 25. X deleted a 26th head, cont_active_secs_5m_residual_norm, weighted 0.0, in the Sept 23 sync, and three changed on Aug 25 — vqv 0.05→0.0, binary dwell 0.0→0.05, video_open 0.05→0.07": "2026 年 11 月 2 日的 xai-org/x-algorithm home-mixer/params/param.rs（同步时间 2026-11-02T16:00:39Z）。param.rs 是定时同步的线上配置快照，本表采用其数值。vm-ranker/params.rs 的编译默认值在五项上仍保留 9 月 29 日数值：favorite 0.5、video_open 0.07、post_unexplored 0.02、cont_dwell_time 0.004、not_interested −47.52。param.rs 在 10 月 6 日同步（7 日发布）将 post_unexplored 从 0.02 调至 0.015，10 月 12 日同步（13 日发布）将 video_open 从 0.07 调至 0.02、cont_dwell_time 从 0.004 调至 0.006、favorite 从 0.5 调至 0.6，10 月 13 日同步（14 日发布）将 favorite 从 0.6 调至 0.66、not_interested 从 −47.52 调至 −52.272。\n新增的四项权重均为零。video_continuation、user_video_continuation、profile_visit_secs 只在 vm-ranker 文件中出现（10 月 6 日发布）。react_with_video 在 10 月 12 日同步、13 日发布时进入两份文件，10 月 30 日（7fef3ba）改名为 post_video，权重和评分位置不变。param.rs 在 10 月 14 日同步（15 日发布）新增两个视频轮播权重。轮播默认关闭，其权重不属于排序评分项。\nvm-ranker 的 config_sync.rs 和 param.rs 使用同一 rust_home_mixer.yml 及 rust_home_mixer_* 键。缺少键时的处理尚未公开。排序权重最后一次变更是 10 月 13 日同步，后来只新增了两项零权重的轮播参数（10 月 28 日同步、29 日发布，606b254，以及 10 月 30 日的 7fef3ba），并重命名 react_with_video。数值截至 11 月 2 日同步（3 日发布，b220448）未变。\n更早的 9 月 29 日同步（2026-09-29T17:02:52Z）将 click 从 0.4 调至 0.3、cont_click_dwell_time 从 0.0 调至 0.4、not_interested 从 −43.2 调至 −47.52，两份文件当时 25 项数值一致。9 月 23 日移除了原第 26 项 cont_active_secs_5m_residual_norm（权重 0.0）。8 月 25 日有三项变更：vqv 从 0.05 调至 0.0，二元停留从 0.0 调至 0.05，video_open 从 0.05 调至 0.07。",
    "replier follower count": "回复者的关注者数量",
    "replies posted in the last 24 hours": "过去 24 小时发出的回复数",
    "legitimate blocks received in the last 24 hours": "过去 24 小时遭到的有效屏蔽数",
    "risky-safety-label flag": "风险安全标签标记",
    "pasted-text flag (is_pasted)": "粘贴文字标记（is_pasted）",
    "missing-client-events flag": "缺少客户端事件标记",
    "account country and language": "账号所在国家和语言",
    "up to 10 posts of thread context": "最多 10 条帖子串上下文",
    "estimate": "估算",
    "2026-published": "2026 年公开源码",
    " (xai-org/x-algorithm at {commit}, {date}: {sources})": "（xai-org/x-algorithm，提交 {commit}，截至 {date}，出处 {sources}）",
    "Community Note effect sourced from: X's own A/B test (25–34% fewer like/repost decisions), Chuai et al. Nature Communications (−61% subsequent reposts), Slaughter et al. PNAS (−46% reposts / −44% likes post-attach).": "社区注释的影响依据三项研究。X 的 A/B 测试中，点赞或转发意愿减少 25–34%。Chuai 等人在 Nature Communications 发表的研究中，后续转发减少 61%。Slaughter 等人在 PNAS 发表的研究中，附加注释后，转发减少 46%，点赞减少 44%。",
    "bidirectional_boost_eligible requires in_reply_to_tweet_id to be none (bidirectional_boost_eligible, xai-value-model/inputs.rs).": "bidirectional_boost_eligible 要求 in_reply_to_tweet_id 为空（xai-value-model/inputs.rs）。",
    "Signals it is shown: {signals}. ({source})": "模型收到的信号包括：{signals}。（{source}）",
    "grox/flows/upa/task_filter.py — TaskInitialBangerFilter rejects any post with ancestors.": "grox/flows/upa/task_filter.py 中的 TaskInitialBangerFilter 会排除存在上级帖子的帖子。",
    "Earlybird age-decay sigmoid: base 0.6, halflife 360 min, slope 0.003": "Earlybird 时间衰减曲线：下限 0.6，半衰期 360 分钟，斜率 0.003",
    "diversity_multiplier(k={rank}) = (1 − floor) × decay^k + floor, with decay 0.5 and floor 0.25 (xai-value-model/scoring.rs; flag-gated behind EnableAuthorDiversity, which ships true — when enabled it applies to every candidate). Only currently rendered posts are counted, so the true rank can be higher. Not applied to the score above — it is slate-relative and viewer-specific.": "作者多样性系数 diversity_multiplier(k={rank}) = (1 − floor) × decay^k + floor，衰减率 decay 为 0.5，下限 floor 为 0.25。EnableAuthorDiversity 默认开启，对每条候选帖均生效（xai-value-model/scoring.rs）。这里只统计已渲染的帖子，因此实际序号可能更大。此系数取决于候选批次和浏览者，上方分数未应用它。",
    "Weights: {snapshot}. X states these are kept in sync with the live production configuration by cron, which makes them the first ranking weights ever published as current rather than historical.": "权重来源：{snapshot}。X 表示定时任务会将数值与线上配置同步，这是 X 首次公布当前线上排序权重。",
    "The weighted sum modeled here is now the only scoring mode X publishes. Two alternatives (dwell-regret, with far deeper negatives) existed in the same code until September 18, 2026, when X deleted them along with the switch that chose between them. Relative score, not predicted reach.": "本扩展采用的加权求和是 X 目前唯一公开的评分模式。旧版还包含两种负反馈惩罚更重的方案（dwell-regret），X 于 2026 年 9 月 18 日一并移除这两种方案及切换开关。分数衡量相对表现，无法预测触达。"
  };

  // Text shown as written in every language. Mostly the long prose that stays
  // English on purpose (the weights.js note/why text, the "About these scores"
  // history, the Community Note citations), which X rewrites most weeks; also
  // each language's own name in the language switch. Only
  // store-assets/i18n-coverage.js reads this list, to keep these off its
  // missing report. The prose patterns are sysCat's tier C.
  var KEEP_ENGLISH = [
    /^English$/, /^日本語$/, /^简体中文$/,
    /^[CE]\d*$/,  // the welcome page's sample badge: C71, E48
    /^Weights: /, /kept in sync with/, /live production configuration/,
    /as current rather than historical/, /weighted sum modeled here/, /dwell-regret/,
    /switch that chose between them/, /not predicted reach/, /existed in the same code/,
    /when X deleted them/, /^Community Note effect sourced from/, /^diversity_multiplier\(/
  ];

  var tables = { ja: JA, "zh-CN": ZH_CN };
  var lang = "en";

  function isExplicitLanguage(value) {
    return value === "en" || Object.prototype.hasOwnProperty.call(tables, value);
  }

  function setLanguage(l) { lang = isExplicitLanguage(l) ? l : "en"; }
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
    var table = tables[lang];
    if (table && Object.prototype.hasOwnProperty.call(table, english)) s = table[english];
    return fill(s, params);
  }

  function placeholdersOf(s) {
    var seen = {};
    (String(s).match(/\{(\w+)\}/g) || []).forEach(function (p) { seen[p.slice(1, -1)] = true; });
    return Object.keys(seen).sort();
  }

  function fromLanguageTag(tag) {
    if (/^ja(-|$)/i.test(tag || "")) return "ja";
    if (/^zh(?:$|-(?:Hans|CN|SG)(?:-|$))/i.test(tag || "")) return "zh-CN";
    return "en";
  }

  // override: the popup setting. Auto follows X's <html lang>; the browser
  // language decides only when that attribute is missing or empty.
  function resolveLanguage(override, htmlLang, navLang) {
    return isExplicitLanguage(override) ? override : fromLanguageTag(htmlLang || navLang);
  }

  var ATTRS = ["title", "aria-label", "placeholder"];

  // CJK symbols and punctuation, kana, ideographs, full-width forms.
  var CJK_EDGE = /[\u3000-\u30ff\u3400-\u9fff\uff00-\uffef]/;

  // A static page's text node carries the whitespace of the line wrap around
  // it. Beside Latin text that whitespace is a word gap and stays; beside
  // Japanese it is a stray space (「 実測」, + 比較 を押すと), so a side whose
  // translated edge is CJK or full-width drops it.
  function placeTranslation(original, translated) {
    var m = original.match(/^(\s*)[\s\S]*?(\s*)$/);
    var lead = translated && CJK_EDGE.test(translated.charAt(0)) ? "" : m[1];
    var trail = translated && CJK_EDGE.test(translated.charAt(translated.length - 1)) ? "" : m[2];
    return lead + translated + trail;
  }

  function lookup(text) {
    var table = tables[lang];
    var key = text.replace(/\s+/g, " ").trim();
    if (!table || !key || !Object.prototype.hasOwnProperty.call(table, key)) return null;
    return table[key];
  }

  // Translates a static page in place: every text node and the title,
  // aria-label and placeholder attributes under root. Whitespace around a
  // text node survives, so inline markup keeps its spacing.
  function translateStatic(root) {
    if (!tables[lang] || !root) return;
    var walker = root.ownerDocument.createTreeWalker(root, 1 | 4); // elements + text
    var node = walker.currentNode;
    while (node) {
      if (node.nodeType === 3) {
        var parent = node.parentNode && node.parentNode.nodeName;
        if (parent !== "SCRIPT" && parent !== "STYLE") {
          var translated = lookup(node.nodeValue);
          if (translated !== null) node.nodeValue = placeTranslation(node.nodeValue, translated);
        }
      } else if (node.nodeType === 1) {
        ATTRS.forEach(function (a) {
          if (!node.hasAttribute(a)) return;
          var translated = lookup(node.getAttribute(a));
          if (translated !== null) node.setAttribute(a, translated);
        });
      }
      node = walker.nextNode();
    }
  }

  // For the popup and welcome page, which are not on x.com. The stored
  // override wins; Auto uses the X language content.js last recorded, then the
  // browser's UI language (the welcome page opens at install, before any X
  // visit). Without chrome.storage (the fixture server, the preview harness) a
  // ?lang=zh-CN, ?lang=ja or ?lang=en query is the override. The callback renders the
  // page's dynamic parts; the static markup is translated after it.
  function resolvePageLanguage(callback) {
    function done(l) {
      setLanguage(l);
      document.documentElement.lang = lang;
      callback(lang);
      translateStatic(document.body);
      // <title> lives in <head>, outside the body walk.
      var title = lookup(document.title);
      if (title !== null) document.title = title;
    }
    var defaultLanguage = BANGERMETER_DEFAULT_SETTINGS.uiLanguage;
    var hasStorage = typeof chrome !== "undefined" && chrome.storage && chrome.storage.sync;
    if (!hasStorage) {
      var q = /[?&]lang=(en|ja|zh-CN)(?:&|$)/.exec(location.search);
      done(q ? q[1] : resolveLanguage(defaultLanguage, null, ""));
      return;
    }
    chrome.storage.sync.get({ uiLanguage: defaultLanguage }, function (s) {
      if (isExplicitLanguage(s.uiLanguage)) { done(s.uiLanguage); return; }
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
    placeholdersOf: placeholdersOf, placeTranslation: placeTranslation,
    JA: JA, JA_DRAFT: JA_DRAFT, ZH_CN: ZH_CN, KEEP_ENGLISH: KEEP_ENGLISH
  };
})();
