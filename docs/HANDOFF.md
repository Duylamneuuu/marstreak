# Bàn giao MarStreak

## Tổng quan

Thành viên gọi `/checkin` một lần để ghi điểm danh và nhận ba nhiệm vụ. Bot gửi thẻ xác nhận kèm chuỗi ngày, rồi gửi bảng nhiệm vụ ngay sau đó; hai phản hồi chỉ người gọi thấy. Dùng `/quests` hoặc nút **Xem tiến độ mới** để xem lại. Gọi lại cùng ngày hoặc khởi động lại bot vẫn giữ bộ đã giao và tiến độ.

Chuỗi chỉ phụ thuộc các ngày điểm danh liên tiếp. Điểm danh được tính riêng; tiến độ **0/3–3/3** chỉ tính ba nhiệm vụ được giao. Thành viên vẫn giữ chuỗi nếu điểm danh mỗi ngày, dù chưa hoàn thành đủ ba nhiệm vụ.

Khi tiếp quản, đọc [Trạng thái tính năng](FEATURES.md#trạng-thái-tính-năng), sau đó dùng [hướng dẫn cài bot](SETUP.md) và [hướng dẫn thành viên](MEMBER-GUIDE.md). Trạng thái mặc định trong repo đi theo `.env.example`. Đọc cấu hình tại môi trường chạy để xác định quest nào đang được giao.

## Demo

1. Xem bộ thẻ từ 0/3 đến 3/3 và ví dụ tin nhắn riêng. Có thể mở thư viện ảnh trên máy khi chưa vào Lab. [Demo](demo/README.md)
2. Trong Discord Lab, chọn `/checkin` của ứng dụng thử, làm một nhiệm vụ và bấm **Xem tiến độ mới**.
3. Đối chiếu hành vi với kết quả kiểm thử. Hai tài khoản đã đạt 3/3 độc lập và giữ tiến độ qua restart ngày 27/11. Ca lệnh tới sát giờ reset có regression riêng trên SQLite local. [Kết quả và giới hạn](QA-2026-11-27.md)

## Các quyết định cần xác nhận

| Phạm vi | Quyết định |
| --- | --- |
| Nhiệm vụ mở đợt đầu | Chọn hoạt động, bot nguồn và kênh. Community cần thread đang mở. Poll cần bài đang nhận phiếu. [Danh sách và cấu hình](FEATURES.md) |
| Luật điểm danh và Voice | Chốt giờ reset, thời lượng Voice, quy tắc AFK/ở một mình và phần thưởng nếu có. Mẫu Lab dùng 00:00 giờ Việt Nam và 120 giây. |
| Lệnh từ bot ngoài | Xác nhận tiêu chí dùng đúng lệnh và app. Phản hồi công khai đang tải cũng được tính. Riêng Wheat, kết quả này chỉ xác nhận lượt gọi `/tarot`; số lá chưa kiểm chứng. |
| Thông báo | Chọn giữ mặc định im lặng hoặc bật một DM khi đạt 3/3 bằng `QUEST_COMPLETION_DM=true`. Thành viên luôn xem tiến độ qua `/quests` hoặc **Xem tiến độ mới**. |
| Rank | Giữ dự phòng cho đến khi `/rank` của Mar Wuỷ trả thẻ thành công và có thể xác minh thẻ của người gọi. [Kết quả thử Rank](QA-2026-11-26.md) |
| Hình ảnh và vận hành | Duyệt hình tạm hoặc cấp ảnh thay thế. Chỉ định người quản lý máy chạy, cấu hình riêng, sao lưu, lịch lưu dữ liệu và xử lý sự cố. |

## Tiếp quản

| Vai trò | Đầu việc |
| --- | --- |
| Phát triển | Đổi lời bot, ảnh và nhiệm vụ theo yêu cầu đã duyệt. Chạy regression và kiểm tra Lab trước khi phát hành. [Hướng dẫn phát triển](MAINTENANCE.md) |
| Vận hành | Cài trên môi trường được cấp quyền, thử bằng quyền thành viên thường, sao lưu và thử khôi phục SQLite. [Cài lần đầu và checklist](SETUP.md) · [VPS và rollback](VPS.md) |
| Product | Ghi số liệu Voice/Game trước khi mở. Trong tuần beta, theo dõi số người điểm danh mỗi ngày. Phối hợp với vận hành đo mục tiêu uptime trên 99%. |

Khi đổi cách vận hành, làm theo thứ tự sau.

1. Chọn giờ reset, danh sách quest và chế độ DM. Ghi lại mã phiên bản và sao lưu SQLite trước khi đổi. [Cấu hình](FEATURES.md) · [Sao lưu và quay lui](VPS.md#5-sao-lưu-khôi-phục-và-nâng-cấp)
2. Điền cấu hình riêng tại máy chạy. Nếu bật bot ngoài, kiểm tra đúng app và kênh bằng tài khoản thành viên. Nếu ngừng giao quest, giữ cấu hình đích cũ tới hết ngày để người đã nhận làm nốt.
3. Khởi động lại một tiến trình, kiểm tra bot báo sẵn sàng rồi chạy `/checkin` → `/quests` bằng dữ liệu thử. Khi bật DM, xác nhận 1/3 và 2/3 giữ im lặng, 3/3 đến đúng người và thao tác lặp giữ nguyên tiến độ. [Checklist kiểm tra](SETUP.md#6-kiểm-tra-trước-khi-chuyển-giao)

Quyền theo role ở server đích, trải nghiệm trên ứng dụng di động và uptime dài ngày còn chờ kiểm tra trước khi xác nhận vận hành chính thức.
