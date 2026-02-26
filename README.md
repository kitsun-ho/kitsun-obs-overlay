# kitsun-obs-overlay

## OBS 聊天室合併 Overlay

啟動開發伺服器：

- `pnpm install`
- `pnpm dev`

在 OBS 新增「瀏覽器」來源，URL 指到：

- Twitch + YouTube（擇一或同時）
	- `http://localhost:3000/overlay/chat?twitch=YOUR_TWITCH_CHANNEL&youtubeChannelId=YOUR_YOUTUBE_CHANNEL_ID`

也可以指定 YouTube 直播 ID（Live ID）：

- `http://localhost:3000/overlay/chat?youtubeLiveId=YOUR_LIVE_ID`

可用參數（query string）：

- `twitch`: Twitch 頻道（可逗號多個）
- `youtubeChannelId`: YouTube Channel ID（可逗號多個；會自動抓「正在直播」那場）
- `youtubeLiveId`: YouTube Live ID（可逗號多個）
- `max`: 最大顯示訊息數（預設 60）
- `showPlatform`: `1`/`0` 是否顯示平台標籤（預設顯示）
- `compact`: `1`/`0` 更緊湊樣式
- `theme`: `dark`/`light`

備註：YouTube 部分使用 `youtube-chat`（非官方 API 抓取），若 YouTube 端改動可能會失效。

小提醒：

- **OBS 最推薦用 query string URL**（因為它是可複製/可重現的設定）。
- localStorage 模式只會存在「同一個瀏覽器/同一個 OBS Browser Source」內；你在 Chrome 存的設定，不一定會出現在 OBS 的內建瀏覽器裡。

## OBS 直播框架（Frame Overlay）

這個頁面只會畫「框線/標題」，背景透明，用來疊在你的 Webcam / Chat 上方。

- `http://localhost:3000/overlay/frame`

常用參數：

- `title`, `subtitle`, `right`: 頂部文字
- `accent`, `accent2`: 主色/副色（可用 `%23a970ff` 這種 URL encode）
- `outer`: `1`/`0` 外框
- `header`: `1`/`0` 頂欄
- `footer`: `1`/`0` 底欄（`leftFooter`/`centerFooter`/`rightFooter`）
- `chat`: `1`/`0` 左側聊天框
- `cam`: `1`/`0` 右側鏡頭框
- `animate`: `1`/`0` 霓虹呼吸動畫（預設開）
- `chatX` `chatY` `chatW` `chatH`: 聊天框位置/尺寸（例如 `520px`）
- `camX` `camY` `camW` `camH`: 鏡頭框位置/尺寸

建議做法：OBS 裡 Webcam 來源放在框的下面；Frame Overlay 用 Browser Source 放最上層。
