# Cài MarStreak lần đầu

Hướng dẫn cài từ đầu bằng **source của repo, server Discord thử và ứng dụng mới do người cài quản lý**. Bộ mẫu gồm ba nhiệm vụ **vào Voice, thả emoji và gửi tin trong chủ đề**. Sau khi chạy được bộ mẫu, có thể [bật thêm nhiệm vụ](FEATURES.md) hoặc [chạy trên VPS](VPS.md).

## 1. Chuẩn bị

- Một máy Windows, macOS hoặc Linux có mạng. Cài Node.js 24 và mở terminal mới. Kiểm tra bằng `node --version`. [Tải Node.js](https://nodejs.org/en/download)
- Mở repo và chọn **Code → Download ZIP**, rồi giải nén. Có thể dùng Git để lấy source ở bước 4. [Repo MarStreak](https://github.com/Duylamneuuu/marstreak)
- Một tài khoản Discord. Trong cột server, bấm **+ → Create My Own**, chọn tên bất kỳ rồi tạo server để thử. Chủ server có quyền cài ứng dụng. [Cách tạo server Discord](https://support.discord.com/hc/en-us/articles/204849977-How-do-I-create-a-server)

Máy chạy bot cần được bật và giữ kết nối. Với cách chạy `npm start` ở bước 5, cần giữ terminal mở và tránh cho máy ngủ; cách chạy lâu dài nằm trong [hướng dẫn VPS](VPS.md).

## 2. Tạo ứng dụng và cài vào server vừa chuẩn bị

1. Trong Discord Developer Portal, bấm **New Application** và đặt tên dễ nhận ra khi thử lệnh. Tên **MarStreak** khớp với nội dung hướng dẫn thành viên. [Discord Developer Portal](https://discord.com/developers/applications)
2. Chép **Application ID** từ **General Information**. Trên trang **Bot** của ứng dụng mới, dùng **Reset Token → Copy** để tạo và chép token. Lưu token tại nơi bảo mật để nhập vào `.env` ở bước 4. Tạo lại token trên ứng dụng đang vận hành sẽ làm token cũ mất hiệu lực.
3. Mở **Installation**, chọn **Guild Install** trong **Installation Contexts** và **Discord Provided Link** trong **Install Link**. Ở **Default Install Settings → Guild Install**, thêm hai scope `bot` và `applications.commands` rồi chọn quyền **View Channels**. Lưu thay đổi.
4. Mở liên kết cài đặt vừa tạo. Chọn **Add to Server**, chọn server thử rồi **Authorize**. Ứng dụng sẽ xuất hiện trong server và bắt đầu phản hồi sau bước 5. Nếu bot không thấy kênh, kiểm tra quyền ghi đè của kênh và danh mục.

**Không cần Administrator hay bật Message Content Intent.** Mã hiện tại dùng các intent tiêu chuẩn `Guilds`, `GuildVoiceStates`, `GuildMessages`, `GuildMessageReactions`; có thêm `GuildMessagePolls` khi cấu hình Poll. Không yêu cầu Server Members Intent hoặc Presence Intent. Bot quan sát trạng thái Voice, không vào phòng để nghe hoặc phát âm thanh. [Mã khởi động](../src/bot.js) · [Hướng dẫn cài ứng dụng Discord](https://docs.discord.com/developers/quick-start/getting-started)

## 3. Chuẩn bị nơi làm nhiệm vụ và lấy ID

Mở **User Settings** bằng nút bánh răng cạnh avatar Discord. Trong mục **Developer** hoặc **Advanced**, bật **Developer Mode** để hiện các lệnh chép ID. [Cách sao chép ID](https://support.discord.com/hc/en-us/articles/206346498-Where-can-I-find-my-User-Server-Message-ID)

| Nơi dùng thử | Quyền của bot | Quyền của thành viên |
| --- | --- | --- |
| Kênh chữ để gọi `/checkin` và `/quests` | View Channel | View Channel, Use Application Commands |
| Một phòng Voice thông thường | View Channel | View Channel, Connect |
| Một kênh chữ có ít nhất một tin để thả emoji | View Channel | View Channel, Read Message History, Add Reactions |
| Một thread công khai đang mở trong kênh chữ | View Channel ở kênh chứa thread | View Channel, Send Messages in Threads |

Có thể dùng một kênh chữ cho cả lệnh và Reaction. Gửi một tin mẫu để thả emoji, rồi chọn **⋯ → Create Thread** trên tin để tạo chủ đề **công khai**, đang mở và không khóa. Sử dụng một phòng Voice thông thường. [Cách tạo thread](https://support.discord.com/hc/en-us/articles/4403205878423-Threads-FAQ)

| Chép ID bằng menu chuột phải | Biến tương ứng |
| --- | --- |
| **Copy Server ID** trên biểu tượng server thử | `DISCORD_GUILD_ID` |
| **Copy Channel ID** trên phòng Voice | `LAB_VOICE_CHANNEL_IDS` |
| **Copy Channel ID** trên chính thread dưới kênh chữ | `LAB_COMMUNITY_THREAD_ID` |

ID là chuỗi chữ số. Với biến Community, lấy ID của thread trong danh sách kênh. Bộ mẫu Reaction tự chọn dùng sự kiện thả emoji mới. Quyền cho Reaction chỉ định và Poll nằm trong [bảng tính năng](FEATURES.md).

## 4. Cài source và điền cấu hình

Nếu tải ZIP, mở terminal trong thư mục đã giải nén có `package.json`.

Nếu dùng Git, tải source bằng:

```sh
git clone https://github.com/Duylamneuuu/marstreak.git
cd marstreak
```

Trong thư mục có `package.json`, chạy:

```sh
npm ci
npm test
```

Chỉ tiếp tục khi cài đặt thành công và các bài test đều đạt. Nếu PowerShell chặn `npm.ps1`, dùng `npm.cmd ci`, `npm.cmd test` và `npm.cmd start` tương ứng.

Sao chép [`.env.example`](../.env.example) thành `.env` **cùng cấp với `package.json`**. Đây là thao tác cài lần đầu; khi cập nhật, giữ tệp `.env` đang dùng. Có thể sao chép trong trình quản lý tệp, hoặc dùng một lệnh phù hợp:

```powershell
# Windows PowerShell
Copy-Item .env.example .env
notepad .env
```

```sh
# macOS hoặc Linux
cp .env.example .env
```

Mở `.env`, thay năm giá trị viết hoa trong mẫu dưới bằng token và bốn ID vừa lấy. Giữ nguyên các giá trị còn lại cho lần chạy đầu; các biến bot ngoài và Poll trong tệp mẫu để trống.

```dotenv
DISCORD_TOKEN=TOKEN_CUA_UNG_DUNG
DISCORD_APPLICATION_ID=ID_UNG_DUNG
DISCORD_GUILD_ID=ID_SERVER_THU
CHECKIN_RESET_TIME=00:00
CHECKIN_DB_PATH=data/checkins.sqlite
QUEST_COMPLETION_DM=false
LAB_VOICE_CHANNEL_IDS=ID_PHONG_VOICE
LAB_VOICE_SECONDS=120
LAB_REACTION_MODE=any
LAB_COMMUNITY_THREAD_ID=ID_THREAD_CONG_KHAI
LAB_QUEST_POOL=voice,reaction,community
```

Token và `.env` chỉ lưu ở môi trường vận hành, không đưa lên repo hoặc gửi trong ảnh chụp. SQLite được tạo tự động khi bot chạy. Mẫu dùng giờ làm mới **00:00 Việt Nam**, Voice **120 giây**, và đúng ba loại nhiệm vụ; mỗi ngày vẫn là ba loại này, thứ tự có thể khác. Tên biến `LAB_...` được giữ nguyên khi dùng ở server khác.

## 5. Bật bot và thử như một thành viên

Chạy trong thư mục source:

```sh
npm start
```

Chờ dòng **MarStreak sẵn sàng. Đã kiểm tra ID/quyền và đăng ký /checkin, /quests.** Giữ terminal mở. Bot tự đăng ký hai lệnh vào server có ID trong `.env`.

1. Trong kênh chữ của server vừa cài bot, gõ `/checkin` và chọn lệnh có tên ứng dụng đã đặt ở bước 2. Với tài khoản và database mới, bot gửi thẻ điểm danh **streak 1**, rồi bảng **0/3** ngay bên dưới. Hai phản hồi chỉ người gọi thấy.
2. Sau khi nhận bảng, vào phòng Voice được chỉ ra đủ hai phút, thả một emoji mới vào tin trong kênh bot nhìn thấy, rồi gửi một tin trong thread được dẫn. Làm theo thứ tự bất kỳ. Bộ mẫu không bắt buộc một emoji cụ thể.
3. Bấm **Xem tiến độ mới** hoặc gọi `/quests` để thấy từng nhiệm vụ được đánh dấu đến **3/3**. Bảng đã mở không tự cập nhật. Mặc định bot giữ im lặng khi ghi nhận quest. Để gửi một tin riêng khi đạt **3/3**, đặt `QUEST_COMPLETION_DM=true` rồi khởi động lại bot.
4. Bấm **Cách làm nhiệm vụ** để mở hướng dẫn riêng ngay trong Discord. Nút này chỉ giải thích cách làm; kiểm tra rằng bấm nút không thay đổi điểm danh hoặc tiến độ.

Điểm danh giữ chuỗi ngày. Tiến độ bắt đầu ở 0/3 và tăng khi hoàn thành từng nhiệm vụ. Nếu lúc điểm danh chưa đủ ba việc khả dụng, dùng `/quests` sau khi đủ điều kiện để nhận bộ đầu tiên trong ngày. Nút **Xem tiến độ mới** dùng cùng cơ chế. Cả hai đều yêu cầu đã điểm danh. Lượt thả emoji hoặc gửi tin trước khi nhận bộ không được tính; emoji còn từ hôm trước cần gỡ rồi thả mới sau khi nhận bộ hôm nay. [Hướng dẫn có thể ghim cho thành viên](MEMBER-GUIDE.md)

Chỉ chạy một tiến trình cho mỗi ứng dụng và tệp SQLite. Dừng bằng **Ctrl+C**, chạy lại bằng `npm start`. Trên Windows, có thể dùng [START-LAB và STOP-LAB](../DEMO-KIT/README.md) sau khi đã hoàn tất cấu hình; không mở thêm launcher khi bot còn chạy trong terminal.

## 6. Kiểm tra trước khi chuyển giao

Đây là checklist cần chạy trên môi trường vừa cài, không phải kết quả kiểm thử sẵn của môi trường đó.

| Thao tác | Kết quả mong đợi |
| --- | --- |
| Gọi `/checkin`, rồi gọi lại trong cùng ngày | Một lượt điểm danh; giữ cùng bộ ba và chuỗi. |
| Làm lần lượt ba nhiệm vụ, mở `/quests` sau mỗi việc | Tiến độ tăng tới 3/3, không cần nộp ảnh hoặc xác nhận bằng tay. |
| Làm lại việc đã hoàn thành | Tiến độ giữ nguyên. Nếu đã bật DM khi đạt 3/3, bot gửi một tin ở lần hoàn thành cuối cùng. |
| Dùng tài khoản thứ hai với role thành viên thường | Tài khoản thứ hai nhận tiến độ riêng; không lấy tiến độ của tài khoản đầu. |
| Dừng, chạy lại cùng `.env` và SQLite, mở `/quests` | Giữ nguyên bộ, thứ tự và tiến độ trong ngày. |
| Sang ngày mới, gọi `/checkin` | Giao bộ của ngày mới; chuỗi tăng nếu đã điểm danh ngày liền trước. |

Các ca quyền, sai đích và thay đổi danh sách nhiệm vụ có trong [bảng thao tác thử lại](MAINTENANCE.md#bảng-thao-tác-thử-lại). Kết quả Lab đã ghi trước đây nằm ở [báo cáo QA](QA-2026-11-27.md).

## 7. Sao lưu, cập nhật và mở rộng

Sau khi đã có dữ liệu, mở terminal thứ hai tại thư mục source và chạy:

```sh
npm run backup
```

Chờ dòng **Backup SQLite hợp lệ** và giữ tệp ở đường dẫn được in. Script dùng API sao lưu SQLite và kiểm tra bản sao, có thể chạy khi bot còn hoạt động. Với đường dẫn mẫu, backup nằm dưới `data/backups/`. Trước khi cập nhật source, sao lưu, ghi phiên bản đang chạy và giữ cấu hình; [quy trình khôi phục, nâng cấp và quay lui](VPS.md#5-sao-lưu-khôi-phục-và-nâng-cấp) nêu các bước tiếp theo.

Để thêm Wheat, Zodiac, Dyno, Asterie hoặc Poll, xem [FEATURES](FEATURES.md): cài bot nguồn nếu cần, điền kênh và thêm mã tương ứng vào `LAB_QUEST_POOL`, rồi khởi động lại. Giữ ít nhất ba loại khả dụng với role thành viên. Khi dừng giao một loại, giữ cấu hình đích cũ đến hết ngày để người đã nhận làm nốt. Đổi đích hoặc luật sau giờ làm mới. Cách sửa lời, ảnh và logic nằm ở [MAINTENANCE](MAINTENANCE.md).

## Nếu chưa chạy được

| Hiện tượng | Cách xử lý trước tiên |
| --- | --- |
| `node` không có hoặc báo lỗi `node:sqlite` | Cài Node.js 24, mở terminal mới và kiểm tra `node --version`. |
| Không tìm thấy `.env` hoặc báo thiếu token | Mở terminal đúng thư mục có `package.json`; kiểm tra tên tệp là `.env`, không phải `.env.txt`. |
| Báo ID không hợp lệ hoặc token không thuộc app | Dùng ID dạng chữ số và token, Application ID của cùng ứng dụng. |
| Báo kiểm tra kênh/quyền, hoặc thread phải mở | Đối chiếu biến được ghi trong lỗi: đúng server, loại kênh và quyền của bot. Mở lại thread nếu đã đóng; kiểm tra quyền ghi đè của danh mục. |
| Bot sẵn sàng nhưng không thấy lệnh | Kiểm tra app đã cài đúng server, scope `applications.commands`, role có Use Application Commands và đang chọn đúng bot trong menu. |
| Điểm danh được nhưng chưa giao đủ ba việc | Kiểm tra role thành viên có đủ quyền ở cả ba đích trong bước 3. Sau khi sửa quyền, dùng `/quests` trong cùng ngày để thử nhận bộ. |
| Làm rồi chưa có dấu tick | Mở lại `/quests` và kiểm tra việc được giao, đích, thời điểm thực hiện. Với Voice, xem thời lượng đã tính. |
| Đạt 3/3 mà chưa nhận DM | Kiểm tra `QUEST_COMPLETION_DM=true` và quyền nhận tin riêng trên Discord. Tiến độ đã ghi vẫn xem được qua `/quests`. |
| Bot offline sau khi đóng máy hoặc terminal | Mở lại một tiến trình bot. Khi cần chạy liên tục, triển khai theo [VPS](VPS.md). |

