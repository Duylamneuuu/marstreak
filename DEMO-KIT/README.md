# Demo Kit cho Windows

Để xem giao diện, mở `docs/demo/DEMO.html` từ thư mục đã giải nén. Trang này hiển thị bốn mốc tiến độ và một tin nhắn riêng bằng dữ liệu mẫu. Tên tệp `START-LAB.cmd` và `STOP-LAB.cmd` dùng chung cho mọi bản cài thử. [Thư viện ảnh](../docs/demo/README.md)

## Khởi động và dừng bot thử

1. Tải source, tạo server và app Discord riêng, rồi điền `.env` với token và ID của bản cài đó. Chuẩn bị Node.js 24 và chạy `npm ci`, `npm test` trong thư mục chứa `package.json`. [Hướng dẫn từng bước](../docs/SETUP.md)
2. Mở trình khởi động của bản cài vừa cấu hình. Bot dùng server ID trong `.env`. [START-LAB.cmd](START-LAB.cmd)
3. Chọn `/checkin` của ứng dụng thử. Làm một việc trên thẻ và mở lại bảng để xem tiến độ.
4. Dùng tệp dừng để dừng tiến trình do trình khởi động mở. Với tiến trình chạy từ terminal, dùng Ctrl+C tại terminal đó. Với dịch vụ, dừng bằng trình quản lý dịch vụ. [STOP-LAB.cmd](STOP-LAB.cmd)

Nếu máy đã chạy một bản MarStreak khác, trình khởi động có thể báo đã có tiến trình vì nó kiểm tra trên toàn máy Windows. Với app, server và SQLite riêng, có thể dùng `npm.cmd start` trong thư mục bản cài mới. Kiểm tra trước rằng app đó chỉ có một tiến trình sử dụng cùng token và tệp SQLite.

Nếu bot chưa online, xem thông báo launcher và log riêng trong `data/demo-kit/`. Khi thiếu lệnh, kiểm tra guild, ứng dụng và quyền **Use Application Commands**. Khi thiếu ảnh, kiểm tra `assets/` và Sharp. Khi tiến độ chưa tăng, đối chiếu ngày, kênh và app trên thẻ. [Cấu hình nhiệm vụ](../docs/FEATURES.md) · [Sao lưu và khôi phục](../docs/VPS.md#5-sao-lưu-khôi-phục-và-nâng-cấp)
