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

## Thêm một nhiệm vụ từ bot khác

Lấy `wheat-coinflip` làm mẫu. Trong Lab, kiểm tra tài khoản thành viên chọn được đúng app và lệnh, và Discord trả lời công khai. Đối chiếu gói `MESSAGE_CREATE` của bot quan sát để có App ID, ID tài khoản bot, tên lệnh và người gọi. Nếu App ID và ID bot khác nhau, khai báo cả hai như ví dụ Dyno.

1. Thêm mã quest, tên hiển thị và nhãn ngắn nếu cần. Trong [danh sách lệnh bot ngoài](../src/integrations/lab-command-quests.js), đăng ký lệnh với `createSlashCommandQuest` và khai báo nhóm kênh trong `commandQuestChannels`. Dùng `option` để nêu thao tác bắt buộc sau khi chọn lệnh, nếu có.
2. Thêm biến kênh vào [mẫu cấu hình](../.env.example) và điền giá trị thật trong Lab. Ví dụ đã có `LAB_WHEAT_COINFLIP_CHANNEL_ID`, mã `wheat-coinflip`, lệnh `coinflip` và app Wheat. Bộ xác minh dùng thông tin định danh do Discord cung cấp, kể cả phản hồi công khai đang tải.
3. Thêm ca đúng người, sai app dù trùng tên lệnh, sai kênh, phản hồi riêng, lệnh gọi trước khi nhận việc và sự kiện lặp trong [test xác minh lệnh](../test/slash-command-quests.test.js). Sau khi chạy test, chọn ít nhất ba mã cho `LAB_QUEST_POOL` của Lab rồi thử đúng lệnh trên Discord.

Dyno đang chạy qua bộ xác minh chung. [Bộ đọc nội dung Dyno cũ](../src/integrations/dyno-roll.js) chỉ để tham khảo.

## Bảng thao tác thử lại

| Thử trong Lab | Kết quả mong đợi |
| --- | --- |
| Nhận ba việc bằng `/checkin`, làm từng việc qua Discord. Mở `/quests` sau mỗi lượt. Thử với hai tài khoản. | Mỗi tài khoản đi từ 0/3 tới 3/3 độc lập. Hai app có cùng tên lệnh chỉ cộng đúng việc. |
| Dừng bot, chạy lại cùng SQLite, gọi lại `/checkin` và `/quests`. | Bộ ba giữ nguyên thứ tự, dấu tick và streak. Điểm danh cùng ngày chỉ lưu một lượt. |
| Một tài khoản nhận quest X. Bỏ X khỏi `LAB_QUEST_POOL`, giữ ID kênh/tin cũ và khởi động lại. Sau đó thử tài khoản đã nhận và tài khoản điểm danh mới. | Tài khoản đã nhận vẫn làm được X nếu đích còn hoạt động. Tài khoản mới nhận bộ ba từ danh sách mới. |
| Bật Reaction chỉ định. Thả emoji đúng, thử tin khác, sau đó gỡ quyền xem tin của bot trong môi trường thử. | Chỉ đúng tin và emoji được chấm. Tài khoản mới sẽ không nhận quest ở nơi bot mất quyền. |
| Vào phòng Voice chưa đủ thời gian rồi rời hoặc chuyển phòng. | Tiến độ dừng ở thời lượng hợp lệ. Nếu SQLite lỗi đúng lúc rời, bot bỏ khoảng chưa lưu để tránh cộng thời gian sau khi rời. |

Kiểm thử lỗi SQLite và sự kiện gửi bù bằng `npm test`. Với sự kiện có thời gian gốc, bot kiểm ngày và thời điểm nhận quest theo thời gian đó. Reaction và Poll gửi bù chỉ tính nếu đã có nhiệm vụ trước khi mất kết nối và cả hai mốc nằm trong cùng ngày. Nếu Discord tạo phiên mới, các sự kiện bị lỡ có thể không được gửi lại. [Hướng dẫn Gateway](https://docs.discord.com/developers/events/gateway#resuming)
