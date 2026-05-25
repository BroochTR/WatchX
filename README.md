# WatchX

WatchX là nền tảng quản lý camera IP tập trung, được xây dựng cho môi trường triển khai cục bộ hoặc mạng nội bộ. Dự án được phát triển trong khuôn khổ nghiên cứu học thuật về thiết kế và hiện thực một hệ thống NVR trên nền web, kết hợp quản lý nhiều camera, xem trực tiếp độ trễ thấp, ghi hình sự kiện và phát hiện người có hỗ trợ AI.

Hệ thống được thiết kế cho các môi trường mà nhiều người dùng cần giám sát và quản lý nhiều camera IP thông qua một giao diện web thống nhất. WatchX tách riêng lớp API, bộ máy xử lý video và cơ sở dữ liệu để các tác vụ streaming, ghi hình, phân tích chuyển động và suy luận AI có thể vận hành ổn định mà không làm giảm trải nghiệm quản trị.

## Mục tiêu dự án

- Tập trung việc quản lý nhiều camera IP từ các vị trí mạng khác nhau.
- Cung cấp giao diện web hiện đại cho xem trực tiếp, xem lại sự kiện và quản trị hệ thống.
- Hỗ trợ ghi hình theo chuyển động và phát hiện đối tượng bằng AI.
- Nâng cao tính tiện dụng và độ an toàn cho mô hình nhiều người dùng trên máy chủ nội bộ.
- Cung cấp mô hình triển khai bằng Docker để dễ tái lập và bảo trì.

## Tính năng chính

- Quản lý tập trung nhiều camera IP.
- Xem trực tiếp độ trễ thấp bằng WebSocket và WebCodecs.
- Chế độ dự phòng JPEG cho trình duyệt hoặc môi trường không hỗ trợ secure context.
- Phát hiện chuyển động, tạo sự kiện, xem timeline và quản lý ghi hình.
- Phát hiện người và các đối tượng được hỗ trợ bằng AI dựa trên YOLOv8.
- Hỗ trợ privacy mask và vùng loại trừ chuyển động.
- Xác thực người dùng bằng JWT, cookie HttpOnly và băm mật khẩu Argon2.
- Xác thực hai lớp với TOTP, trusted devices và recovery codes.
- Phân quyền theo vai trò cho admin và client.
- Hỗ trợ API token cho các tích hợp bên thứ ba có kiểm soát.
- Triển khai bằng Docker với frontend, backend, engine và database tách biệt.

## Kiến trúc hệ thống

WatchX được tổ chức thành bốn thành phần chính:

- Frontend: ứng dụng SPA viết bằng React + Vite + TailwindCSS cho quản trị và giám sát.
- Backend: dịch vụ FastAPI phụ trách xác thực, phân quyền, cấu hình và REST API.
- Engine: dịch vụ xử lý video chuyên trách viết bằng Python, sử dụng PyAV, FFmpeg, OpenCV và ONNX Runtime.
- Database: PostgreSQL lưu camera, người dùng, sự kiện, nhóm camera và cấu hình hệ thống.

Việc tách lớp này giúp hệ thống cô lập các tác vụ video nặng khỏi web và API, từ đó cải thiện độ phản hồi và khả năng bảo trì.

## Công nghệ sử dụng

- Frontend: React, Vite, TailwindCSS
- Backend: FastAPI, SQLAlchemy, Pydantic
- Video Engine: PyAV, FFmpeg, OpenCV, ONNX Runtime
- Database: PostgreSQL
- Deployment: Docker, Docker Compose

## Trường hợp sử dụng tiêu biểu

- Giám sát nhiều camera từ một giao diện điều khiển tập trung.
- Xem lại các sự kiện phát sinh do chuyển động và video đã ghi trên một timeline thống nhất.
- Quản lý quyền truy cập người dùng trong văn phòng, phòng lab, cơ sở đào tạo hoặc tổ chức quy mô nhỏ.
- Kết nối camera ở xa khi hạ tầng mạng đã cung cấp khả năng truy cập thông qua VPN hoặc private overlay network.

## Cấu trúc repository

```text
backend/   API FastAPI, xác thực, RBAC và logic lưu trữ
engine/    Streaming camera, phát hiện chuyển động, ghi hình và suy luận AI
frontend/  Giao diện web xây dựng bằng React
```

## Khởi động nhanh

### Yêu cầu

- Docker
- Docker Compose

### Chạy dự án

```bash
docker compose up -d --build
```

### Dịch vụ mặc định

- Frontend: http://localhost:8080
- Backend API: http://localhost:5005

## Điểm nhấn bảo mật

- Xác thực bằng JWT kết hợp cookie HttpOnly.
- Băm mật khẩu bằng Argon2.
- Xác thực hai lớp với TOTP.
- Hỗ trợ trusted devices và recovery codes.
- Phân quyền theo vai trò.
- Che giấu dữ liệu nhạy cảm trong log.
- Kiểm tra dữ liệu đầu vào cho camera và cấu hình hệ thống.

## Bối cảnh nghiên cứu

Repository này được xây dựng từ đề tài:

"Nghiên cứu và xây dựng hệ thống quản lý camera IP tập trung tích hợp phát hiện người dựa trên xử lý ảnh và trí tuệ nhân tạo."

Phần hiện thực tập trung vào việc kết hợp các yêu cầu triển khai thực tế như thu nhận nhiều luồng camera, lưu trữ sự kiện, xem video trên trình duyệt và bảo mật hệ thống với quy trình giám sát có hỗ trợ AI.

