# Bàn giao MarStreak · DC1

Bản 26/11/2026. Phần sản phẩm đã có bản Lab để nghiệm thu. Người vận hành cấu hình Discord Application và server họ có quyền quản lý.

## Trong buổi trình

1. Mở [demo và ảnh 0/3 đến 3/3](demo/README.md). Nếu có bot đang chạy, cho người xem điểm danh, chọn một việc theo thẻ rồi bấm **Xem tiến độ mới**.
2. Cho xem một DM khi hoàn thành và thẻ chuỗi ngày. Trong Lab, hai nick từng đạt 3/3 độc lập. Hai lệnh trùng tên như `/coinflip` của Wheat và Zodiac được chấm theo đúng app.
3. Chốt duyệt Lab, nhiệm vụ và luật cho đợt đầu, hình ảnh, người vận hành và nơi chạy. Voice 120 giây và giờ làm mới 00:00 giờ Việt Nam là thông số Lab. Poll, gửi tin trong chủ đề và Reaction chỉ định có thể bật khi team có hoạt động phù hợp.

## Tình trạng kiểm thử

| Hạng mục | Tình trạng |
| --- | --- |
| Điểm danh, giữ chuỗi, ba quest | Thử thật trong Lab, gồm giữ tiến độ sau restart và hai nick độc lập. |
| Voice, Reaction, Community và lệnh bot ngoài | Đã ghi nhận từ sự kiện Discord thật. Bộ mở rộng Lab có Voice, Reaction và chín lệnh. Community có thể bật lại. |
| Poll | Lab thử trên SQLite riêng. Bấm **Vote** lên 1/3, đổi phiếu giữ 1/3. |
| Giọng và giao diện | Thẻ riêng 0/3 đến 3/3 và DM đã thử trên Discord Web. Ảnh trên iOS/Android, VPS thực tế, tải đồng thời và độ ổn định dài ngày cần xác nhận ở môi trường nhận bàn giao. |
| Regression | Bộ test trong repo bao phủ các hành vi trên, backup/restore, sai nguồn và chống ghi nhận trùng. |

## Lộ trình đọc cho người vận hành hoặc AI

| Muốn hiểu | Đọc |
| --- | --- |
| Luồng người dùng | [README](../README.md), [thẻ điểm danh](../src/checkin-reply.js), [thẻ nhiệm vụ và DM](../src/quest-reply.js) |
| Cách chọn và chấm quest | [Bảng tính năng](FEATURES.md), [bộ chọn quest](../src/quest-pool.js), [quest Discord](../src/native-quests.js), [Poll](../src/poll-quest.js), [lệnh bot ngoài](../src/integrations/lab-command-quests.js) |
| Dữ liệu và giờ làm mới | [SQLite](../src/checkins.js), [đếm Voice](../src/voice-quests.js), [kiểm thử](../test/) |
| Cài đặt và vận hành | [Cài VPS](VPS.md), [unit systemd](../deploy/marstreak.service), [mẫu cấu hình](../.env.example) |

Quest lệnh bot ngoài tính lượt gọi đúng có xác nhận công khai. Nếu Lead yêu cầu Wheat **trải đúng một lá**, cần nguồn xác nhận số lá. Các hạng mục xem Rank, Wordle, tự tạo Poll, XP, xu và role cần quyết định riêng trước khi triển khai.

Lead có thể xem demo và phân công. Người vận hành dùng quyền và thông tin được cấp, kiểm tra một lượt trên server thử trước khi chạy cho thành viên.

## Cập nhật sau khi sửa ngày 26/11

Hai bản source đạt 39/39 test. Thành viên giữ streak khi thiếu quest và có thể nhận bộ ba sau đó bằng `/quests`. Bot xếp thứ tự gửi DM theo từng người, gợi ý kênh Reaction cả thành viên và bot cùng thấy, kiểm tra sự hiện diện của bot nguồn khi khởi động và chỉ giao Poll còn mở tới kỳ reset. Bảng quest có chữ lớn hơn. DM có số tiến độ và tên việc vừa xong. Đã kiểm tra ảnh thu nhỏ 320 px và khởi động bản sửa qua Gateway Lab bằng SQLite QA riêng. Chưa chạy lại toàn bộ 0/3 đến 3/3 trên hai tài khoản sau bản sửa. Quyền dùng từng lệnh theo role, việc đóng Poll thủ công sớm và kiểm thử VPS vẫn cần Ops xác nhận.
