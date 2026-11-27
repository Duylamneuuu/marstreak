# Bàn giao MarStreak · 27/11/2026

Chị Cún có thể duyệt bản Lab ngay trên GitHub. Thành viên gõ `/checkin` để giữ chuỗi và nhận ba việc trong ngày. Mở `/quests` để xem còn việc gì và cần làm ở đâu.

## Xem trong 5 phút

1. Mở [bộ ảnh demo](demo/README.md). Thẻ 0/3 là lúc vừa điểm danh. Thẻ 3/3 và tin nhắn riêng cho thấy thành viên sẽ nhận được gì khi làm xong.
2. Đọc [kết quả thử thật trên hai tài khoản](QA-2026-11-27.md). Cả hai đạt 3/3 độc lập và giữ đúng bộ nhiệm vụ sau restart. Người đã nhận Asterie vẫn làm xong sau khi đổi danh sách giao. Bộ test tự động đạt **50/50**.
3. Nếu muốn tự chơi, nhờ người vận hành mở bot Lab. Trong Discord, chọn `/checkin` của **MarWuy DC1 Test**, làm theo một dòng trên thẻ rồi bấm **Xem tiến độ mới**.

## Chị cần quyết định gì?

| Việc cần chốt | Bản đang có để chị xem |
| --- | --- |
| Mở những nhiệm vụ nào đợt đầu? | Voice, thả emoji và các lệnh bot ngoài đã thử trong Lab. Có thể bật gửi tin trong chủ đề hoặc bình chọn khi team có chủ đề hoặc bài bình chọn đang mở. [Danh sách và cách bật](FEATURES.md) |
| Tính thế nào là xong? | Voice đang thử ở mức 2 phút, ngày mới bắt đầu lúc 00:00 giờ Việt Nam. Với Gaming, có thể chọn một lệnh cụ thể như `/roll` của Dyno. MarStreak ghi nhận thành viên đã gọi `/tarot` của Wheat. Số lá thành viên chọn vẫn chưa xác minh được. |
| Có cần Rank ngay khi mở? | Lệnh xem hạng là `/rank` của **Mar Wuỷ**. Lần thử mới nhất app chưa trả thẻ. Rank đang tắt. Nếu bắt buộc ở đợt đầu, cần người quản lý app khôi phục lệnh và thử lại với thành viên. |
| Duyệt hình và chọn người trực bot | Hai mascot lấy từ poster đang dùng làm ảnh tạm. Chị có thể duyệt cho đợt đầu hoặc giao Design thay asset. Cần chỉ định người giữ cấu hình, máy chạy và bản sao lưu. |

## Giao cho người vận hành

- **Chạy lần đầu.** Làm theo [hướng dẫn cài trên server thử](../README.md#chạy-thử-trong-server-discord-riêng). Mẫu mặc định dùng Voice, emoji và một chủ đề đang mở. Có thể thử đủ 3/3 với một app MarStreak.
- **Chạy lâu dài.** Dùng [hướng dẫn VPS, sao lưu và khôi phục](VPS.md). Sau khi chị duyệt danh sách nhiệm vụ, thử lại bằng quyền thành viên ở môi trường đích trước khi mở rộng.
- **Tự chỉnh hoặc giao người sửa code.** Xem chỗ đổi lời bot, hình ảnh, danh sách quest và bảng tự thử. [Hướng dẫn bảo trì](MAINTENANCE.md)
- **Nghiệm thu vận hành.** Ghi số liệu Voice/Game trước khi mở để có mốc so sánh. Trong tuần beta, theo dõi số người điểm danh mỗi ngày. Người phụ trách VPS theo dõi uptime với mục tiêu trên 99%. Đây là các số liệu cần đo khi chạy thật.

Quyền lệnh theo role, trải nghiệm trên điện thoại thật và độ ổn định dài ngày còn cần kiểm tra ở môi trường vận hành. [Tính năng và cách cấu hình](FEATURES.md) · [Cấu trúc SQLite](../src/checkins.js) · [Bộ kiểm thử](../test/)
