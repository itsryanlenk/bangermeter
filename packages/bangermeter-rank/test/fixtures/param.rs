// mirrored from config feature-switch defaults; last sync 2026-09-24T16:24:49Z
use xai_feature_switches::param;

param!(FavoriteWeight, f64, "rust_home_mixer_favorite_weight", 0.5);
param!(ReplyWeight, f64, "rust_home_mixer_reply_weight", 5.0);
param!(
    BidirectionalFollowReplyWeightBoost,
    f64,
    "rust_home_mixer_bidirectional_follow_reply_weight_boost",
    15.0
);
param!(
    BidirectionalFollowDwellWeightBoost,
    f64,
    "rust_home_mixer_bidirectional_follow_dwell_weight_boost",
    0.0
);
param!(RetweetWeight, f64, "rust_home_mixer_retweet_weight", 1.0);
param!(
    PhotoExpandWeight,
    f64,
    "rust_home_mixer_photo_expand_weight",
    0.05
);
param!(
    VideoOpenWeight,
    f64,
    "rust_home_mixer_video_open_weight",
    0.07
);
param!(ClickWeight, f64, "rust_home_mixer_click_weight", 0.4);
param!(OpenLinkWeight, f64, "rust_home_mixer_open_link_weight", 0.2);
param!(
    ProfileClickWeight,
    f64,
    "rust_home_mixer_profile_click_weight",
    0.0
);
param!(VqvWeight, f64, "rust_home_mixer_vqv_weight", 0.0);
param!(ShareWeight, f64, "rust_home_mixer_share_weight", 2.0);
param!(
    ShareViaDmWeight,
    f64,
    "rust_home_mixer_share_via_dm_weight",
    5.0
);
param!(
    ShareViaCopyLinkWeight,
    f64,
    "rust_home_mixer_share_via_copy_link_weight",
    20.0
);
param!(DwellWeight, f64, "rust_home_mixer_dwell_weight", 0.05);
param!(QuoteWeight, f64, "rust_home_mixer_quote_weight", 5.0);
param!(
    QuotedClickWeight,
    f64,
    "rust_home_mixer_quoted_click_weight",
    0.05
);
param!(
    QuotedVqvWeight,
    f64,
    "rust_home_mixer_quoted_vqv_weight",
    0.0
);
param!(
    FollowAuthorWeight,
    f64,
    "rust_home_mixer_follow_author_weight",
    4.0
);
param!(
    PostUnexploredWeight,
    f64,
    "rust_home_mixer_post_unexplored_weight",
    0.02
);
param!(
    ContDwellTimeWeight,
    f64,
    "rust_home_mixer_cont_dwell_time_weight",
    0.004
);
param!(
    ContClickDwellTimeWeight,
    f64,
    "rust_home_mixer_cont_click_dwell_time_weight",
    0.0
);
param!(
    NotInterestedWeight,
    f64,
    "rust_home_mixer_not_interested_weight",
    -43.2
);
param!(
    BlockAuthorWeight,
    f64,
    "rust_home_mixer_block_author_weight",
    -31.2
);
param!(
    MuteAuthorWeight,
    f64,
    "rust_home_mixer_mute_author_weight",
    -58.8
);
param!(ReportWeight, f64, "rust_home_mixer_report_weight", -234.0);
param!(
    NotDwelledWeight,
    f64,
    "rust_home_mixer_not_dwelled_weight",
    -0.02
);
param!(
    EnableViewerColdStart,
    bool,
    "rust_home_mixer_enable_viewer_cold_start_boost",
    true
);
param!(
    MinVideoDurationMs,
    i32,
    "rust_home_mixer_min_video_duration_ms",
    10_000
);
param!(
    UseEngagementCounterViewCountForImpressionBoost,
    bool,
    "rust_home_mixer_use_engagement_counter_view_count_for_impression_boost",
    true
);
