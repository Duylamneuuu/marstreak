# Hướng dẫn phát triển

Dùng ứng dụng Discord của Lab và SQLite riêng khi thử thay đổi. Xem [cách cài lần đầu](SETUP.md).

| Thay đổi | Sửa ở đâu và kiểm tra thế nào |
| --- | --- |
| Đổi phòng, thời lượng hoặc danh sách giao | Sửa `.env` trên máy chạy. [Bảng biến và mã nhiệm vụ](FEATURES.md). Ví dụ, `LAB_VOICE_SECONDS=120` là hai phút. Khởi động lại và thử bằng quyền thành viên thường. |
| Đổi tên nhiệm vụ, lời điểm danh hoặc lời báo tiến độ | [Tên và nhãn ngắn](../src/quest-names.js), [thẻ điểm danh](../src/checkin-reply.js), [bảng nhiệm vụ, nút Cách làm nhiệm vụ và DM](../src/quest-reply.js). |
| Đổi hướng dẫn thành viên | Sửa `instruction` trong [nhiệm vụ gốc](../src/native-quests.js), [Poll](../src/poll-quest.js) hoặc [mẫu lệnh bot ngoài](../src/integrations/slash-command-quest.js). Cập nhật cùng thông tin trong [hướng dẫn và tin nhắn ghim](MEMBER-GUIDE.md). Giữ hướng dẫn khớp điều kiện chấm. |
| Đổi mascot, nền hoặc màu | Đổi PNG tương ứng trong [assets](../assets/) và chỉnh [bộ dựng ảnh](../src/quest-visual.js). Chạy `npm run preview:quests`, mở ảnh trong `previews/` và thử hiển thị trên Discord. |
| Bot báo thiếu ID hoặc quyền | Xem tên biến trong log. [Đọc cấu hình](../src/config.js) kiểm tra định dạng. [Kiểm tra đích](../src/lab-targets.js) đối chiếu loại kênh, tin đích và quyền trên Discord. |
| Phát hành hoặc quay lại bản trước | Trước khi nâng cấp, ghi SHA đang chạy, sao lưu SQLite và giữ bản cấu hình hiện tại. Chạy `npm test`, thử Lab, rồi áp dụng [quy trình cập nhật và quay lui](VPS.md#5-sao-lưu-khôi-phục-và-nâng-cấp). Bản trước khi sửa ranh giới ngày là [f6dcb35](https://github.com/Duylamneuuu/marstreak/commit/f6dcb354f5733488d31ad7ea417b3a0d9aa468d9). |

## Điểm danh và giao việc

[Handler lệnh](../src/daily-interaction.js) lấy ngày từ `interaction.createdTimestamp` và ghi điểm danh trước khi chờ thông tin kênh hoặc bot nguồn. [Kho SQLite](../src/checkins.js) giữ duy nhất một lượt theo server, thành viên và ngày. Khi giao việc, bot kiểm tra ngày sau khi lấy khóa ghi và đặt `assigned_at` theo thời điểm giao. Lệnh tới trước reset có thể giữ chuỗi ngày cũ dù bot trả lời sau reset. Thành viên dùng `/checkin` cho ngày mới. [Regression ranh giới ngày](../test/daily-interaction.test.js)

Nút **Cách làm nhiệm vụ** trả hướng dẫn riêng, không đọc hoặc ghi SQLite, không giao nhiệm vụ và không tra cứu bot nguồn. Nút **Xem tiến độ mới** tiếp tục dùng luồng `/quests` để lấy trạng thái hiện tại. Khi đổi nội dung trợ giúp, giữ giới hạn độ dài embed và kiểm tra cùng các nút trong [test hiển thị](../test/quest-visual.test.js).

## Thêm nhiệm vụ mới

### Bật lệnh đã hỗ trợ

Nếu lệnh có trong [danh sách bot ngoài](FEATURES.md#nhiệm-vụ-từ-bot-khác), người vận hành có thể bật bằng cấu hình. Ví dụ, để thêm **Wheat `/coinflip`** vào bộ mẫu:

1. Cài đúng app Wheat trong server thử. Dùng quyền thành viên thường để chọn lệnh tại kênh đích và thử phản hồi công khai.
2. Điền ID kênh chữ vào `LAB_WHEAT_COINFLIP_CHANNEL_ID` trong `.env`, rồi thêm `wheat-coinflip`. Với bộ mẫu, dòng cấu hình sẽ là `LAB_QUEST_POOL=voice,reaction,community,wheat-coinflip`.
3. Khởi động lại cùng SQLite. Dùng một tài khoản chưa nhận bộ hôm nay hoặc SQLite thử riêng để xem lượt giao mới. Nếu cần chắc chắn quest mới xuất hiện, cấu hình đúng ba quest khả dụng trong lượt thử riêng đó. Bộ đã giao giữ nguyên trong ngày.

### Đăng ký lệnh bot chưa hỗ trợ

Có thể dùng chung `createSlashCommandQuest` cho nhiều bot nếu tiêu chí chỉ là **thành viên gọi đúng lệnh của đúng app**. Trước khi sửa code, dùng quyền thành viên thường gọi lệnh trong Lab và quan sát bằng tiến trình bot thử với **Message Content Intent tắt**. Kiểm tra sự kiện `MESSAGE_CREATE` của **phản hồi công khai ban đầu** có ID ứng dụng, ID tài khoản bot gửi, tên lệnh, ID người gọi, kênh và ID tin. Tin đang tải vẫn có thể là bằng chứng lượt gọi nếu đủ metadata. Chỉ ghi lại các trường cần đối chiếu trong báo cáo thử. [Bộ xác minh chung](../src/integrations/slash-command-quest.js)

| Quan sát trong Lab | Cách xử lý |
| --- | --- |
| Phản hồi công khai có đủ metadata và tên lệnh khớp | Đăng ký quest bằng bộ xác minh chung. Hai app cùng có `/coinflip` được phân biệt bằng ID ứng dụng và tài khoản bot gửi. |
| Chỉ có phản hồi riêng, DM, bot im lặng hoặc sự kiện thiếu metadata | Giữ ngoài danh sách giao. Tìm tín hiệu khác từ app nguồn nếu muốn triển khai. |
| Quest yêu cầu một tham số hoặc kết quả, như Tarot đúng một lá hay hoàn thành một ván | Cần bằng chứng riêng cho tham số hoặc kết quả, ví dụ API hoặc sự kiện do app nguồn cung cấp. Metadata lượt gọi xác nhận người dùng đã gọi lệnh. |

1. Trong [danh sách lệnh bot ngoài](../src/integrations/lab-command-quests.js), tạo mã quest duy nhất và đăng ký bằng `createSlashCommandQuest`. Khai báo tên app, `appId`, tên lệnh không có dấu `/`, server và kênh cấu hình. Thêm `authorId` nếu ID tài khoản bot gửi khác App ID, như Dyno. Dùng `option` để chỉ thao tác cần làm trước khi gửi lệnh.
2. Thêm mã vào nhóm kênh tương ứng trong `commandQuestChannels`. Nếu cần kênh riêng, thêm nhóm và biến mới vào [`.env.example`](../.env.example). Cập nhật tên hiển thị và nhãn ngắn trong [`quest-names.js`](../src/quest-names.js), rồi thêm cách làm vào [hướng dẫn thành viên](MEMBER-GUIDE.md).
3. Thêm test cho đúng người, sai app dù trùng tên lệnh, sai lệnh, sai kênh, phản hồi riêng, lệnh trước khi nhận quest và sự kiện lặp. Chạy `npm test`, rồi bật mã mới trong `LAB_QUEST_POOL` của Lab và kiểm tra một lượt thật từ `/checkin` đến dấu tick trong `/quests`. Ghi riêng kết quả local và Discord Lab. [Test xác minh lệnh](../test/slash-command-quests.test.js)

Dyno đang dùng bộ xác minh chung. [Bộ đọc nội dung Dyno cũ](../src/integrations/dyno-roll.js) chỉ để tham khảo.

### Thêm hoạt động không qua slash command

Xác định sự kiện chứng minh người dùng đã làm việc đó. Reaction dùng lượt thả emoji mới, Community dùng sự kiện gửi tin trong thread và Poll dùng sự kiện bỏ phiếu. Nếu thêm hoạt động khác, dùng [các quest gốc](../src/native-quests.js) hoặc [Poll](../src/poll-quest.js) làm mẫu cho điều kiện giao, hướng dẫn và xác minh. Nối sự kiện vào [luồng xử lý](../src/bot.js) để dùng chung ngày reset, điều kiện đã nhận quest và chống ghi nhận trùng trong [pool](../src/quest-pool.js).

## Bảng thao tác thử lại

| Thử trong Lab | Kết quả mong đợi |
| --- | --- |
| Nhận ba việc bằng `/checkin`, làm từng việc qua Discord. Mở `/quests` sau mỗi lượt. Thử với hai tài khoản. | Mỗi tài khoản đi từ 0/3 tới 3/3 độc lập. Hai app có cùng tên lệnh chỉ cộng đúng việc. |
| Dừng bot, chạy lại cùng SQLite, gọi lại `/checkin` và `/quests`. | Bộ ba giữ nguyên thứ tự, dấu tick và streak. Điểm danh cùng ngày chỉ lưu một lượt. |
| Một tài khoản nhận quest X. Bỏ X khỏi `LAB_QUEST_POOL`, giữ ID kênh/tin cũ và khởi động lại. Sau đó thử tài khoản đã nhận và tài khoản điểm danh mới. | Tài khoản đã nhận vẫn làm được X nếu đích còn hoạt động. Tài khoản mới nhận bộ ba từ danh sách mới. |
| Bật Reaction chỉ định. Thả emoji đúng, thử tin khác, sau đó gỡ quyền xem tin của bot trong môi trường thử. | Chỉ đúng tin và emoji được chấm. Tài khoản mới sẽ không nhận quest ở nơi bot mất quyền. |
| Vào phòng Voice chưa đủ thời gian rồi rời hoặc chuyển phòng. | Tiến độ dừng ở thời lượng hợp lệ. Nếu SQLite lỗi đúng lúc rời, bot bỏ khoảng chưa lưu để tránh cộng thời gian sau khi rời. |

Kiểm thử lỗi SQLite và sự kiện gửi bù bằng `npm test`. Với sự kiện có thời gian gốc, bot kiểm ngày và thời điểm nhận quest theo thời gian đó. Reaction và Poll gửi bù chỉ tính nếu đã có nhiệm vụ trước khi mất kết nối và cả hai mốc nằm trong cùng ngày. Nếu Discord tạo phiên mới, các sự kiện bị lỡ có thể không được gửi lại. [Hướng dẫn Gateway](https://docs.discord.com/developers/events/gateway#resuming)
