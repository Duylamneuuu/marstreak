# Tính năng và cấu hình

Mỗi ngày, MarStreak rút ba loại nhiệm vụ khác nhau từ `LAB_QUEST_POOL` mà thành viên đủ quyền làm. Gọi lại hoặc khởi động lại giữ bộ đã giao. Khi có dưới ba loại khả dụng, lượt điểm danh vẫn được lưu. Mở lại `/quests` trong cùng ngày khi đủ điều kiện. Ngày điểm danh tính theo lúc Discord nhận lệnh. Nếu thông tin nhiệm vụ chỉ sẵn sàng sau reset, dùng `/checkin` để nhận việc của ngày mới.

## Trạng thái tính năng

Trạng thái dưới đây áp dụng cho bản cài từ [`.env.example`](../.env.example). Người vận hành đối chiếu cấu hình trên máy đích để biết phiên bản đang giao việc gì.

| Tính năng | Mặc định | Mở hoặc đổi khi cần |
| --- | --- | --- |
| Điểm danh, chuỗi ngày và bảng quest | Hoạt động sau khi cài bot. | Thành viên dùng `/checkin`, `/quests`, **Xem tiến độ mới** và **Cách làm nhiệm vụ**. |
| Voice, Reaction và Community | Nằm trong bộ ba mẫu. Reaction thu nhận emoji mới trên tin bot thấy. Community dùng một thread công khai được chỉ định. | Cấu hình phòng Voice và thread. Có thể giới hạn Reaction vào một tin và emoji cụ thể hoặc tạm ngừng giao Community. [Cấu hình](#cấu-hình-voice-reaction-community-và-poll) |
| DM hoàn thành | Tắt. Bot lưu tiến độ và thành viên tự mở lại bảng để xem. | `QUEST_COMPLETION_DM=true` gửi một tin riêng tại 3/3 cho người hoàn thành. Khởi động lại để áp dụng. |
| Poll Discord | Có mã, nằm ngoài danh sách mẫu. | Cần bài Poll còn nhận phiếu, link và giờ đóng. Thêm `poll` sau khi thử quyền ở kênh đích. [Cấu hình](#cấu-hình-voice-reaction-community-và-poll) |
| Wheat, Zodiac, Dyno và AsterieBot | Có 9 quest đã cấu hình được, nằm ngoài danh sách mẫu. | Cài đúng app, thử lệnh có phản hồi công khai, điền ID kênh và thêm từng mã đã xác minh vào danh sách giao. [Danh sách lệnh](#nhiệm-vụ-từ-bot-khác) |
| `/rank` của Mar Wuỷ | Có mã dự phòng, chưa đăng ký vào danh sách quest. | Cần thẻ hạng công khai và cách xác minh thẻ thuộc người gọi. Hiện chưa có cấu hình để bật Rank. [Kết quả khảo sát](QA-2026-11-26.md#xem-hạng-với-mar-wuỷ) · [Mã nguồn](../src/integrations/marwuy-rank.js) |

## Quyền và dữ liệu dùng để tính quest

Trong **Developer Portal → Bot → Privileged Gateway Intents**, để **Message Content**, **Server Members** và **Presence** tắt cho phạm vi hiện tại. MarStreak dùng sự kiện tiêu chuẩn của Discord. Voice lấy trạng thái kết nối, Reaction lấy metadata của lượt thả emoji, Community lấy người gửi và thread, Poll lấy sự kiện bỏ phiếu. Quest bot ngoài đối chiếu metadata từ phản hồi công khai ban đầu để biết đúng app, người gọi, tên lệnh và kênh. [Mã khởi động](../src/bot.js) · [Cách chấm lệnh ngoài](../src/integrations/slash-command-quest.js) · [Tài liệu Gateway của Discord](https://docs.discord.com/developers/events/gateway#message-content-intent)

Phản hồi chỉ người dùng thấy hoặc qua DM của bot nguồn nằm ngoài phạm vi chấm. Với phản hồi công khai, tín hiệu hiện có xác nhận **lượt gọi lệnh**, kể cả khi tin đang tải. Tín hiệu này không xác nhận số lá Tarot, tham số xúc xắc hay kết quả trả về. Khi thêm quest cần kiểm tra nội dung hoặc kết quả, xác minh nguồn dữ liệu và quyền cần thiết trước khi đổi tiêu chí. [Trường interaction trên tin nhắn Discord](https://docs.discord.com/developers/resources/message#message-object)

## Cấu hình cơ bản

Điền thông tin trong `.env` trên máy vận hành hoặc tệp cấu hình VPS. Để sao chép ID trong Discord, bật **Developer Mode**, rồi dùng **Copy Server ID**, **Copy Channel ID** hoặc **Copy Message ID**.

| Biến | Cách điền |
| --- | --- |
| `DISCORD_TOKEN`, `DISCORD_APPLICATION_ID` | Token và Application ID của cùng một bot Discord. |
| `DISCORD_GUILD_ID` | ID server đã cài app. |
| `LAB_QUEST_POOL` | Mã quest cách nhau bằng dấu phẩy. Mẫu dùng `voice,reaction,community` để demo trên một server riêng. |
| `LAB_VOICE_CHANNEL_IDS`, `LAB_VOICE_SECONDS` | ID các phòng Voice cách nhau bằng dấu phẩy và số giây bắt buộc. Mẫu để 120 giây. |
| `CHECKIN_RESET_TIME`, `CHECKIN_DB_PATH` | Giờ làm mới theo giờ Việt Nam và vị trí SQLite. Mẫu để `00:00` và `data/checkins.sqlite`. |
| `QUEST_COMPLETION_DM` | Mặc định `false`. Đặt `true` để gửi một tin riêng cho thành viên ngay khi hoàn thành cả ba nhiệm vụ trong ngày. Khởi động lại bot sau khi đổi. |

Bot cần thấy kênh được cấu hình. Thời lượng Voice tính theo các khoảng kết nối quan sát được trong phòng hợp lệ. Thành viên cần vào được phòng Voice, mở được tin hoặc gửi được tin trong thread tương ứng. Cấp quyền theo kênh, không cần Administrator. [Discord Permissions](https://docs.discord.com/developers/topics/permissions)

## Cấu hình Voice, Reaction, Community và Poll

| Tính năng | Bật | Tạm dừng hoặc đổi đích |
| --- | --- | --- |
| **Poll gốc Discord** | Tạo Poll đang mở trong kênh chữ. Điền link tin vào `LAB_POLL_MESSAGE_URL`, hạn vào `LAB_POLL_CLOSES_AT`, thêm `poll` vào danh sách. Thành viên và bot cần mở được tin. | Bỏ `poll` khỏi danh sách giao. Giữ link và hạn cho lượt đã giao. Nếu đóng hoặc xóa bài sớm, dừng giao ngay. |
| **Gửi tin trong chủ đề** | Thêm `community`, đặt `LAB_COMMUNITY_THREAD_ID` là ID thread công khai, đang mở. | Bỏ `community` khỏi danh sách giao. Giữ ID thread tới hết ngày để người đã nhận làm tiếp. |
| **Thả emoji vào tin chỉ định** | Đặt `LAB_REACTION_MODE=target`, điền `LAB_REACTION_CHANNEL_ID`, `LAB_REACTION_MESSAGE_ID`, `LAB_REACTION_EMOJI` (emoji Unicode hoặc ID emoji). | Đặt `LAB_REACTION_MODE=any` để tính lượt thả emoji mới vào mọi tin bot thấy. |

Sửa cấu hình rồi khởi động lại. Bot kiểm tra đích của những việc đang giao. Một việc đã bỏ khỏi danh sách vẫn được chấm cho người đã nhận nếu đích cũ còn hợp lệ. Với Poll, giờ đóng ghi theo dạng `2026-12-01T00:00:00+07:00`, bằng hoặc sớm hơn giờ đóng thật. Thành viên chọn một đáp án rồi bấm **Vote**. Đổi phiếu vẫn tính một lần. Bot dùng `GuildMessagePolls`, không lưu đáp án và không cần Message Content Intent. Discord có thể ẩn chi tiết của bài Poll do thành viên tạo, vì vậy Ops đối chiếu link và thời hạn bằng giao diện. [Tạo và vote Poll](https://support.discord.com/hc/en-us/articles/22163184112407-Polls-FAQ) · [Sự kiện Gateway](https://docs.discord.com/developers/events/gateway-events#message-poll-vote-add)

Giữ ít nhất ba quest đủ điều kiện. Khi đổi đích hoặc luật, chọn sau giờ làm mới để người đã nhận vẫn làm đúng việc được giao. Để Poll có mặt trong mỗi bộ ba, dùng `voice,reaction,poll` với SQLite thử riêng.

## Nhiệm vụ từ bot khác

Cài ứng dụng nguồn vào server thử được phép quản lý. Thử lệnh cho phản hồi công khai trong kênh và điền ID kênh tương ứng. MarStreak đối chiếu thông tin người gọi, app, lệnh, kênh và tin gốc do Discord cung cấp. Một phản hồi công khai ban đầu, kể cả trạng thái đang tải, xác nhận lượt gọi lệnh. Bot không đọc nội dung kết quả hoặc xác định số lá Tarot. Các app dưới đây đã được thử trong Lab. Cần thử lại quyền và phản hồi tại server mới. Không cần Message Content Intent.

| Biến kênh | Bot và lệnh | Mã trong `LAB_QUEST_POOL` |
| --- | --- | --- |
| `LAB_WHEAT_TAROT_CHANNEL_ID` | Wheat `/tarot` | `wheat-tarot` |
| `LAB_WHEAT_COINFLIP_CHANNEL_ID` | Wheat `/coinflip` | `wheat-coinflip` |
| `LAB_ZODIAC_LIKES_CHANNEL_ID` | Zodiac `/likes` | `zodiac-likes` |
| `LAB_ZODIAC_QUEST_CHANNEL_ID` | Zodiac `/compatibility`, `/crystal`, `/coinflip` | `zodiac-compatibility`, `zodiac-crystal`, `zodiac-coinflip` |
| `LAB_DYNO_ROLL_CHANNEL_ID` | Dyno `/roll` | `dyno-roll` |
| `LAB_ASTERIE_QUEST_CHANNEL_ID` | AsterieBot `/astrology`, `/astromeme` | `asterie-astrology`, `asterie-astromeme` |

Bộ 11 loại từng dùng ở Lab yêu cầu cấu hình đủ kênh cho các ứng dụng sau.

```dotenv
LAB_QUEST_POOL=voice,reaction,wheat-tarot,wheat-coinflip,zodiac-likes,zodiac-compatibility,zodiac-crystal,zodiac-coinflip,dyno-roll,asterie-astrology,asterie-astromeme
```

Khi có nhiều bot cùng lệnh như `/coinflip`, chọn đúng tên app ở bên phải trong menu Discord. Nếu muốn thử nhóm cố định, dùng đúng ba mã và một file SQLite riêng.

Khi bật Poll, chọn bài còn mở tới ít nhất kỳ làm mới tiếp theo. Giữ bài đang mở đến hạn. Khi bật quest bot ngoài, kiểm tra lệnh bằng role thành viên thường. MarStreak kiểm tra bot nguồn khi khởi động và quyền nhìn thấy kênh khi giao việc. Sau khi mời lại ứng dụng nguồn hoặc khôi phục quyền kênh, thử lệnh bằng tài khoản thành viên và kiểm tra lần giao nhiệm vụ mới.

## Dữ liệu SQLite

| Bảng | Dữ liệu của một thành viên trong một server |
| --- | --- |
| `checkins` | Mỗi ngày có tối đa một dòng. Bot tính chuỗi từ các ngày điểm danh liên tiếp. |
| `daily_quests` | Mỗi loại nhiệm vụ được giao có một dòng cho ngày đó. `assigned_at` ghi lúc giao, `completed_at` ghi lúc xong và `voice_ms` lưu thời lượng Voice đã tính cho nhiệm vụ. |

Để tạm ngừng một việc, bỏ mã khỏi `LAB_QUEST_POOL` và giữ cấu hình đích đến hết ngày để thành viên làm nốt. Giữ lịch sử trong hai bảng. Khi viết một loại nhiệm vụ mới, đăng ký mã riêng cùng cách kiểm tra quyền, lời hướng dẫn và sự kiện chứng minh hoàn thành. Thử cả đúng người, sai người và sự kiện lặp trong Lab trước khi thêm mã vào danh sách giao. [Cấu trúc dữ liệu](../src/checkins.js) · [Cách đăng ký lệnh bot ngoài](../src/integrations/lab-command-quests.js) · [Test chấm nhiệm vụ](../test/slash-command-quests.test.js)
