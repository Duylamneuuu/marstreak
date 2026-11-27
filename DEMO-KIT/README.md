# Demo Kit cho Windows

Để xem giao diện, mở `docs/demo/DEMO.html` từ thư mục đã giải nén. Trang này hiển thị bốn mốc tiến độ và một tin nhắn riêng bằng dữ liệu mẫu. [Thư viện ảnh](../docs/demo/README.md)

## Khởi động và dừng bot thử

1. Cài Node.js 24, chạy `npm ci`, `npm test` và điền `.env` từ thư mục chứa `package.json`. [Cài đặt và các ô cần điền](../README.md#chạy-thử-trong-server-discord-riêng)
2. Mở [START-LAB.cmd](START-LAB.cmd) trên máy đã cấu hình. Nếu đã có tiến trình, kiểm tra bằng `/quests` trong đúng server. Launcher chỉ kiểm tra được tiến trình trên máy Windows hiện tại.
3. Chọn `/checkin` của ứng dụng thử. Làm một việc trên thẻ và mở lại bảng để xem tiến độ.
4. Mở [STOP-LAB.cmd](STOP-LAB.cmd) để dừng đúng tiến trình do launcher mở. Với tiến trình chạy từ terminal, dùng Ctrl+C tại terminal đó. Với dịch vụ, dừng bằng trình quản lý dịch vụ.

Nếu bot chưa online, xem thông báo launcher và log riêng trong `data/demo-kit/`. Khi thiếu lệnh, kiểm tra guild, ứng dụng và quyền **Use Application Commands**. Khi thiếu ảnh, kiểm tra `assets/` và Sharp. Khi tiến độ chưa tăng, đối chiếu ngày, kênh và app trên thẻ. [Cấu hình nhiệm vụ](../docs/FEATURES.md) · [Sao lưu và khôi phục](../docs/VPS.md#5-sao-lưu-khôi-phục-và-nâng-cấp)
