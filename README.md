# DVR-YOLOv8-Detection

## Mô Tả

`dvr-yolov8-detection` được thiết kế để phát hiện theo thời gian thực các con người, động vật hoặc vật thể bằng cách sử dụng mô hình YOLOv8 và OpenCV. Trái ngược với tên gọi của nó, chúng tôi hiện hỗ trợ các mô hình lên đến [**YOLOv11**](https://github.com/ultralytics/ultralytics?tab=readme-ov-file)!

Chương trình hỗ trợ các luồng video theo thời gian thực qua RTMP hoặc webcam USB, bao gồm tăng tốc GPU CUDA để nâng cao hiệu suất, và cung cấp các tùy chọn để lưu phát hiện, kích hoạt cảnh báo và ghi nhật ký các sự kiện.

Bản xem trước video có thể được chạy cả trong cửa sổ GUI và headless trên máy chủ web cục bộ bằng cách sử dụng cài đặt máy chủ Flask đi kèm.

## Tính Năng

- **Hệ thống phát hiện và cảnh báo con người/động vật/vật thể theo thời gian thực**
- **(Mới!)** Giờ đây chạy trên mô hình [YOLOv11](https://github.com/ultralytics/ultralytics?tab=readme-ov-file) mới nhất theo mặc định
- 🐳 Một Dockerfile cho các bản cài đặt Dockerized cũng được bao gồm.
- Chạy trên **Python + YOLOv8-11 + OpenCV2**
- Cả hai phiên bản GUI và máy chủ web headless (`Flask`), 2-in-1
  - Máy chủ web có ví dụ: carousel hình ảnh dễ sử dụng để xem các bức hình tĩnh được chụp, v.v.
- **Hỗ trợ tăng tốc GPU CUDA**, chế độ chỉ CPU cũng được hỗ trợ
- **Các luồng RTMP** hoặc **webcam USB** có thể được sử dụng cho các nguồn video thời gian thực
  - _Bao gồm một ví dụ loopback và cấu hình NGINX cho việc sử dụng RTMP (tức là OBS Studio)_
- Thiết lập các vùng riêng biệt có ngưỡng độ tin cậy tối thiểu bằng công cụ muting đi kèm
- Đặt tên cho các khu vực của bạn và nhận cảnh báo với tên khu vực (tức là trên Telegram)
- Các cảnh báo theo thời gian thực bổ sung khi phát hiện cũng được hỗ trợ thông qua [**Telegram**](https://telegram.org)
- Các phát hiện có thể được lưu tự động dưới dạng hình ảnh với nhật ký phát hiện
- Gửi dữ liệu phát hiện đến bất kỳ vị trí SSH/SFTP từ xa nào
- Công cụ riêng biệt được bao gồm cho **phát hiện tệp video ngoại tuyến** để xử lý hậu kỳ loại DVR nhanh hơn thời gian thực (xem: `utils/`)

## Tổng Quan

Dự án này sử dụng Python với YOLOv8 và OpenCV2 để thực hiện phát hiện vật thể trên các luồng video theo thời gian thực hoặc các lô tệp video. Nó xử lý từng khung hình video từng cái một, phát hiện con người theo mặc định (các vật thể được hỗ trợ bởi YOLOv8 khác có thể được thêm vào khi cần thiết). Chương trình có thể ghi nhật ký các phát hiện vào một tệp nhật ký riêng biệt, lưu các khung hình phát hiện với các vật thể được làm nổi bật, và gửi cảnh báo âm thanh qua `pyttsx3`.

Các tùy chọn cấu hình có sẵn trong tệp `config.ini`.

**Lưu ý:** Sử dụng OpenCV hỗ trợ CUDA được khuyến khích để hoạt động nhanh hơn. CUDA-enabled OpenCV2 cần phải được biên dịch theo cách thủ công và cài đặt riêng biệt, vì quá trình biên dịch phụ thuộc cao vào cài đặt phần cứng của bạn. Tham khảo phần "Khắc phục sự cố" để được hướng dẫn và một tập lệnh bản dựng mẫu cho OpenCV với CUDA.

Phát hiện theo thời gian thực cũng hỗ trợ các tính năng CUDA bổ sung như khử nhiễu video dựa trên CUDA (lưu ý: tính năng này yêu cầu CUDA và thường chỉ có sẵn khi OpenCV được biên dịch từ nguồn).

### Các Tính Năng Có Thể Cấu Hình thông qua `config.ini`:

- Nguồn video (webcam USB hoặc luồng RTMP)
- Ngưỡng độ tin cậy cho các phát hiện
- Bật hoặc tắt đổi kích thước các khung hình video
- Khử nhiễu video dựa trên CUDA (thử nghiệm)
- Ghi nhật ký chi tiết phát hiện vào một tệp nhật ký riêng biệt
- Lưu các khung hình với các vật thể được phát hiện dưới dạng tệp hình ảnh
- Lựa chọn biến thể mô hình (ví dụ: YOLOv8n, YOLOv8s, YOLOv8m)
- _... và các tùy chọn tùy chỉnh bổ sung khác_

---

🐳 Để thiết lập Docker, hãy xem **[DOCKER_SETUP.md](./DOCKER_SETUP.md)** để biết hướng dẫn.

---

# Thiết Lập

## Yêu Cầu

- **Python 3.6+** (Python 3.10.x được khuyến cáo)
  - **Các mô-đun Python:**
  - Xem [requirements.txt](./requirements.txt)
- **FFmpeg**
- **Python 3.10.x**
- Nếu bạn muốn sử dụng tăng tốc GPU CUDA, bạn sẽ cần:
  - Một GPU Nvidia hỗ trợ CUDA
  - Cài đặt **CUDA 11.8 hoặc cao hơn** để bật xử lý GPU
- Sử dụng **Miniconda** hoặc **Mamba** để quản lý môi trường

## Cài Đặt (Môi Trường Conda/Mamba)

1. **Sao chép kho lưu trữ:**

   ```bash
   git clone https://github.com/FlyingFathead/dvr-yolov8-detection.git
   cd dvr-yolov8-detection
   ```

1.2 **(Cài đặt Miniconda hoặc Anaconda nếu chưa cài đặt):**

- **Tải xuống và cài đặt Miniconda (được khuyến cáo):**
  - Cho Linux/macOS:

    ```bash
    wget https://repo.anaconda.com/miniconda/Miniconda3-latest-Linux-x86_64.sh
    bash Miniconda3-latest-Linux-x86_64.sh
    ```

  - Đối với Windows, tải tệp cài đặt từ [đây](https://docs.conda.io/en/latest/miniconda.html) và làm theo hướng dẫn cài đặt.

2. **Thiết lập môi trường Conda/Mamba:**

   ```bash
   ./setup_mamba_env.sh
   ```

   _Tập lệnh này tạo một môi trường Conda/Mamba với các phụ thuộc cần thiết._

3. **Chạy tập lệnh phát hiện:**

   ```bash
   ./run_detection.sh
   ```

## Cài Đặt (Các Bước Thủ Công)

1. **Sao chép kho lưu trữ:**

   ```bash
   git clone https://github.com/FlyingFathead/dvr-yolov8-detection.git
   cd dvr-yolov8-detection
   ```

2. **Cài đặt các gói Python cần thiết:**

   ```bash
   pip install -r requirements.txt
   ```

   _Điều này đảm bảo rằng tất cả các phụ thuộc được quản lý thông qua tệp `requirements.txt`._

3. **Cài đặt OpenCV:**
   - Để có phiên bản đầy đủ với hỗ trợ GUI (**được khuyến cáo**):

     ```bash
     pip install opencv-python
     ```

   - **Đối với OpenCV hỗ trợ CUDA**, bạn cần phải xây dựng nó từ nguồn. Tham khảo [tài liệu OpenCV](https://docs.opencv.org/master/d6/d15/tutorial_building_tegra_cuda.html) hoặc kiểm tra [tập lệnh bản dựng](utils/install_and_compile_opencv_with_cuda.sh) để được hướng dẫn.

4. **Cài đặt FFmpeg:**
   - Trên Ubuntu:

     ```bash
     sudo apt-get install ffmpeg
     ```

   - Trên Windows và macOS, hãy làm theo hướng dẫn trên [trang tải xuống FFmpeg](https://ffmpeg.org/download.html).

## Phát Hiện Theo Thời Gian Thực

Dự án này hỗ trợ phát hiện vật thể theo thời gian thực từ các luồng RTMP hoặc webcam USB bằng cách sử dụng YOLOv8. Tập lệnh `run_detection.sh` được cung cấp đảm bảo tập lệnh phát hiện chạy liên tục, tự động khởi động lại nếu nó thoát.

**(Mới trong v0.155)**: Phát hiện theo thời gian thực hiện được đi kèm với một máy chủ web mini chạy trên Flask cho phép bạn chạy khung phát hiện trong trình duyệt của mình theo mặc định khi `headless` và `enable_webserver` được đặt thành `true`. Điều này sẽ làm cho triển khai headless rất dễ dàng. Lưu ý rằng nó nghe ở `0.0.0.0:5000` theo mặc định, mà bạn có thể muốn thay đổi (tức là thành `127.0.0.1:5000`) vì lý do bảo mật.

### Cách Sử Dụng

#### **1. Cho Các Luồng RTMP:**

- **Thiết lập máy chủ RTMP của bạn:**
  - Sử dụng cấu hình NGINX mẫu (`example-nginx.conf`) để thiết lập máy chủ loopback RTMP.
  - Đảm bảo rằng ứng dụng phát trực tuyến của bạn (ví dụ: OBS Studio) được đặt để phát trực tuyến tới `rtmp://127.0.0.1:1935/live`.

- **Chạy tập lệnh phát hiện:**

  ```bash
  ./run_detection.sh
  ```

#### **2. Cho Webcam USB:**

- **Chạy tập lệnh phát hiện với tùy chọn `--use_webcam`:**

  ```bash
  python3 yolov8_live_rtmp_stream_detection.py --use_webcam true
  ```

- **Chỉ định chỉ số webcam (nếu cần):**

  ```bash
  python3 yolov8_live_rtmp_stream_detection.py --use_webcam true --webcam_index <number>
  ```

  - Thay thế `<number>` bằng số chỉ mục của webcam của bạn.
  - Sử dụng công cụ `utils/get_webcams.py` để tìm các webcam có sẵn và số chỉ mục của chúng.

- **Ngoài ra, cấu hình qua `config.ini`:**
  - Đặt `use_webcam` thành `true`.
  - Đặt `webcam_index` thành chỉ số webcam mong muốn của bạn.

### Cấu Hình

#### Chạy Headless / Như Một Máy Chủ Web

Do Docker là một tùy chọn cài đặt phổ biến, bạn có thể chạy chương trình headless và với một máy chủ web mini dựa trên `Flask` được bao gồm. So với phiên bản GUI thông thường, có khả năng là sẽ có một sự sụt giảm nhỏ về tốc độ khung hình và độ trễ trong đầu ra, nhưng ngoài ra, chức năng không quá khác biệt so với biến thể GUI.

Trong các bản cài đặt Docker headless, hãy chắc chắn rằng cả `headless` và `enable_webserver` đều được đặt thành `true`.

#### Chỉnh Sửa Cấu Hình Chương Trình

Bạn có thể cấu hình các tham số của chương trình bằng cách chỉnh sửa tệp `config.ini`. Điều này cho phép bạn đặt các tham số chương trình như nguồn đầu vào, địa chỉ luồng đầu vào, thư mục đầu ra, ngưỡng độ tin cậy, biến thể mô hình, URL luồng, v.v.

### (Cho Các Nguồn RTMP) Cấu Hình NGINX Mẫu

Một cấu hình NGINX mẫu được cung cấp trong `example-nginx.conf`. Cấu hình này thiết lập một máy chủ RTMP nghe ở `127.0.0.1:1935` và cho phép các ứng dụng khách cục bộ xuất bản và phát các luồng.

### (Cho Các Nguồn RTMP) Tập Lệnh Loopback RTMP

Để phát trực tuyến và xử lý video theo thời gian thực, hãy sử dụng tập lệnh `ffmpeg_video_stream_loopback.sh`. Đảm bảo rằng ứng dụng phát trực tuyến của bạn (ví dụ: OBS Studio) được đặt để phát trực tuyến tới `rtmp://127.0.0.1:1935/live`.

### (Cho Các Nguồn RTMP) Người Dùng Windows / Loopback Không Phụ Thuộc Nền Tảng cho RTMP

Sử dụng tập lệnh `utils/loopback_test_unit_ffmpeg-python.py` để thiết lập loopback cho luồng RTMP của bạn.

1. **Cài đặt `ffmpeg-python`:**

   ```bash
   pip install -U ffmpeg-python
   ```

2. **Chạy tập lệnh loopback:**

   ```bash
   python3 utils/loopback_test_unit_ffmpeg-python.py
   ```

3. **Chạy tập lệnh phát hiện:**

   ```bash
   python3 yolov8_live_rtmp_stream_detection.py
   ```

4. **Cấu hình ứng dụng phát trực tuyến của bạn để phát trực tuyến tới:**

   ```
   rtmp://127.0.0.1:1935/live
   ```

**Lưu ý:** Sử dụng NGINX làm phương pháp loopback được khuyến cáo cao để đảm bảo ổn định.

## Thiết Lập Các Vùng/Khu Vực Mface Riêng Biệt (Ngưỡng Độ Tin Cậy Tối Thiểu)

**Các khu vực phát hiện mface**: điều này rất hữu ích khi các phát hiện cần phải vượt quá một ngưỡng nhất định để được lưu và đăng ký với các cảnh báo riêng biệt. Bạn có thể sử dụng phương pháp này để tăng ngưỡng trên các khu vực phát hiện của hình ảnh đầu vào để tránh các lỗi dương tính giả.

Việc tạo mface có thể được thực hiện với một tiện ích vẽ hình chữ nhật GUI dưới `./utils/region_masker.py`, ví dụ:

```bash
 python ./utils/region_masker.py
```

Điều này sẽ chạy một tiện ích mface khu vực cho phép bạn đặt các khu vực đặc biệt với giao diện GUI (chưa có chế độ headless!) và lưu nó vào một tệp (`./data/ignore_zones.json` theo mặc định; xem `config.ini` về cách sử dụng tính năng)

## Tiện Ích Phát Hiện Lô Ngoại Tuyến

Sử dụng `utils/batch_humdet_yolo8_opencv2.py` để chạy phát hiện lô YOLOv8 trên các thư mục tệp video, phù hợp để sử dụng ngoại tuyến nhanh hơn.

## Khắc Phục Sự Cố

### Vấn Đề Loopback RTMP

- Nếu vì bất kỳ lý do nào loopback dường như không hoạt động, bạn có thể tạo một luồng thử nghiệm với ví dụ: `utils/test_stream_generator.py`. Khi chạy, tập lệnh tạo các khung hình video tổng hợp và phát trực tuyến chúng đến máy chủ RTMP của bạn bằng cách sử dụng FFmpeg làm quy trình con, cho phép bạn thử xem loopback của bạn có hoạt động không.
- Chạy `test_stream_generator.py` và giữ nó chạy ở chế độ nền, sau đó hãy cố gắng sử dụng VLC để kết nối với luồng của bạn (`VLC: Media -> Open Network Stream -> rtmp://127.0.0.1:1935/live/stream`). Nếu điều này hoạt động, tập lệnh phát hiện chính cũng sẽ hoạt động.

### CUDA Không Được Tìm Thấy

- Đảm bảo rằng bạn đã cài đặt tất cả các mô-đun cần thiết với CUDA được bật.
- Bạn có thể cần phải biên dịch OpenCV từ nguồn để bật hỗ trợ CUDA.
- Tham khảo ví dụ: [tập lệnh xây dựng OpenCV w/ CUDA cho Ubuntu 22.04LTS](examples/install_and_compile_opencv_with_cuda.sh) hoặc [tập lệnh xây dựng 24.04LTS](examples/compile-opencv-with-cuda-ubuntu-24-04-lts.sh) để được hướng dẫn ở một mức độ nào đó.
- Xác minh hỗ trợ CUDA bằng cách kiểm tra xem chương trình có phát hiện GPU của bạn khi khởi động hay không.

### Cài Đặt CUDA

- Xem: [Hướng Dẫn Thiết Lập CUDA](CUDA_SETUP.md)

### Chạy Mà Không Có GPU Có Khả Năng CUDA

- Chương trình có thể chạy ở chế độ chỉ CPU, mặc dù hiệu suất có thể chậm hơn.
- Để cải thiện hiệu suất:
  - Sử dụng kích thước mô hình nhỏ hơn trong `config.ini`.
  - Điều chỉnh các tùy chọn tỷ lệ khác và tốc độ khung hình.
  - Giảm độ phân giải và tốc độ khung hình từ nguồn video.

## CẦN LÀM

- Đang xử lý: Các watchdog(s) riêng biệt để giám sát ổn định luồng
  - tự động khởi động lại nếu cần
- Triển khai xử lý lỗi nhiều hơn cho các trường hợp cạnh
- Tái cấu trúc mã để cải thiện tính mô-đun
- Thêm tập lệnh thiết lập để triển khai dễ dàng hơn
- Triển khai cài đặt ngưỡng cho cảnh báo (ví dụ: số lượng phát hiện trong khung thời gian)
- Thêm hook để gửi phát hiện đến máy chủ web hoặc API

## Nhật Ký Thay Đổi

- **0.18.1**
  - Docker / CI: siết chặt xử lý phiên bản NumPy trong bản dựng Docker để tránh hỏng phụ thuộc
  - Bản dựng GitHub Actions Docker hiện đã hoàn thành thành công sau các trường hợp hỏng không gian bản dựng / phụ thuộc trước đó
  - Thiết lập cơ sở CI bản dựng Docker đã biết là tốt hiện tại cho dự án
- **0.18**
  - Các lớp phủ ROI giao diện người dùng web hiện được kết xuất phía máy khách dưới dạng SVG thay vì được vẽ vào các khung xem trước
  - Cải thiện hiệu suất xem trước web lớn khi bật các lớp phủ khu vực
  - Các khu vực được mface và các khu vực được đặt tên hiện được lấy qua `/api/region_overlay_data`
  - Các lớp phủ ROI không còn được ghi vào luồng xem trước web MJPEG
  - Các lớp phủ ROI không được ghi vào các hình ảnh phát hiện được lưu hoặc các bức hình toàn bộ khung
  - Cải thiện khả năng đọc nhãn ROI trong giao diện người dùng web với nền văn bản đen và đường viền mạnh hơn
- **0.17**
  - Thêm nút hiển thị/ẩn vào giao diện người dùng máy chủ web để hiển thị hoặc ẩn các khu vực với tên của chúng hoặc các khu vực được mface với độ tin cậy tối thiểu của chúng
- **0.16.4**
  - Thêm công cụ khử nhiễu tọa độ khu vực vào tiện ích mface khu vực để ngăn chặn các khu vực ngoài ranh giới được xử lý hoặc truyền bá
- **0.163**
  - ROI chồng lấp hiện có thể được cấu hình trong `config.ini` để có các loại thuộc tính khác nhau khi được xử lý:
  ```
  ; Cách xử lý các khu vực mface chồng lấp khi phát hiện cắt ngang nhiều khu vực
  ; Tùy chọn:
  ;   first      = hành vi hiện tại (khu vực đầu tiên trong JSON mà không thành công)
  ;   strictest  = yêu cầu max(conf_threshold) trên tất cả các khu vực giao cắt
  ;   lenient    = yêu cầu min(conf_threshold) trên tất cả các khu vực giao cắt (thường là ngu)
  ;   priority   = sử dụng trường "priority" cho mỗi khu vực (cao hơn thắng), quyết định nó bằng cách nghiêm ngặt
  # (mẹo: hành vi chồng ROI di sản = đầu tiên)
  ```
- **0.1626**
  - Tạo một mô-đun watchdog ROI riêng biệt có thể được sử dụng cho các mục đích khác nhau, bao gồm bù độ trễ và cảnh báo lag từ dữ liệu trên luồng, cảnh báo Telegram và tự động khởi động lại khi cần
  - (Xem: `utils/overlay_watchdog.py`)
  - Mô-đun watchdog ROI sử dụng Tesseract/pytesseract (cần cài đặt riêng) để đọc dấu thời gian từ luồng và cảnh báo/khởi động lại trong trường hợp lag hoặc sự khác biệt về thời gian quá mức
  - Bạn có thể sử dụng công cụ tạo khu vực (tại `utils/region_masker.py`) để tạo ROI của riêng bạn cho watchdog OCR
  - Mô-đun tương tự có thể được cải thiện thêm cho các mục đích OCR khác (hãy tiếp tục và fork nó)
- **0.1625**
  - Thêm một tiện ích `watchdog.py` riêng biệt cho các tình huống đóng băng luồng
  - Có thể cấu hình qua `config.ini`, cảnh báo Telegram có sẵn
- **0.1624**
  - Sửa lỗi đường dẫn tương đối bổ sung trong tổng hợp
  - Các đường dẫn cho webUI hiện được xây dựng chính xác
- **0.1623** (Jun 12 2025)
  - Sửa logic dự phòng để lưu thư mục; bây giờ tất cả lưu tệp đều được xác minh; dự phòng hai cấp cho mỗi lưu tệp
  - Máy chủ web cố gắng tìm tệp từ cả vị trí dự định và vị trí dự phòng khi cần
- **0.1622**
  - **Tính năng: Triển khai Tải Lazy cho Hình ảnh Phát hiện Giao diện người dùng Web.**
    - Các mục phát hiện tổng hợp hiện được gán các UUID duy nhất trong quá trình xử lý và tồn tại.
    - Giao diện người dùng web chính (`/`) hiện chỉ gửi các bản tóm tắt phát hiện ban đầu, làm giảm đáng kể kích thước tải trang ban đầu và cải thiện hiệu suất, đặc biệt trên các kết nối chậm.
    - Danh sách tên tệp hình ảnh (`full_frame`, `detection_area`) cho phát hiện tổng hợp cụ thể hiện được lấy _theo yêu cầu_ khi người dùng nhấp nút "Xem Hình ảnh" của nó.
    - Thêm điểm cuối API mới `/api/detection_images/<uuid>` để phục vụ danh sách hình ảnh cho các phát hiện riêng lẻ.
    - Cập nhật JavaScript phía trước để xử lý tìm nạp danh sách hình ảnh qua API mới trước khi hiển thị carousel hình ảnh.
  - **Sửa:** Carousel hình ảnh hiện đúng mặc định để hiển thị hình ảnh `detection_area` trước tiên (nếu có sẵn), chỉ hiển thị `full_frame` ban đầu nếu `detection_area` bị thiếu hoặc khi người dùng nhấp nút "Loại Hoán đổi".
  - **Sửa:** Điều chỉnh CSS (`max-width`, `max-height`, `object-fit`) cho hình ảnh phương thức (`#modal-image`) để đảm bảo cả hình ảnh `detection_area` và hình ảnh `full_frame` lớn hơn được giới hạn đúng trong khung nhìn mà không tràn.
  - **Tiện ích:** Thêm tập lệnh `utils/uuid_inserter.py`. Tiện ích này có thể xử lý tệp `aggregated_detections.json` hiện có (được chỉ định qua dòng lệnh hoặc được tải từ `config.ini`), tạo sao lưu và thêm UUID bị thiếu vào các mục cũ hơn, cho phép chúng tương thích với tải lazy mới
- **v0.1621**
  - **Cập nhật máy chủ web:**
  - Chuyển sang sử dụng `waitress` (`pip install -U waitress` hoặc sử dụng `requirements.txt`)
  - `waitress` = luồng tốt hơn và đa tác vụ với `Flask`
  - Chất lượng xem trước MJPEG trong các bản xem trước webUI hiện có thể cấu hình từ `config.ini`
    => dưới `[webserver]` => `mjpeg_quality`
  - cải tiến webui: các phát hiện hiện được phân loại dưới tiêu đề ngày để cải thiện khả năng đọc
- **v0.1620**
  - Đã tắt telemetry trong các mô-đun Ultralytics theo mặc định
  - Thêm một bản in khi khởi động để hiển thị cài đặt Ultralytics
- **v0.1619**
  - **Xem trước luồng trong WebUI hiện có thể được hoán đổi giữa HLS và MJPEG**
  - (HLS được lấy từ luồng RTMP nguồn; tốc độ khung hình cao hơn mà không cần mã hóa lại)
  - Xem `config.ini` => `preview_method = mjpeg` (hoán đổi thành `hls` cho HLS)
  - Các tùy chọn khác dưới phần `[hls]` trong `config.ini`
- **v0.1618**
  - Mface khu vực được đặt tên ở đây, với các ngưỡng quan trọng
  - Sử dụng `./utils/region_masker.py` được làm mới để thiết lập tên khu vực và ngưỡng quan trọng của chúng
  - Hiện tại, cảnh báo Telegram hỗ trợ thông báo nhấn mạnh cảnh báo trên các ngưỡng quan trọng
- **v0.1617**
  - Máy chủ web: đã thêm duyệt hình ảnh phát hiện điều hướng tốt hơn (đầu tiên/cuối cùng, bỏ qua 10 phía trước/sau)
  - sửa chữa khung nhìn cho carousel hình ảnh
- **v0.1616**
  - **Giờ đây sử dụng YOLOv11 theo mặc định**
  - YOLOv11 là (tính đến thời điểm viết) phiên bản YOLO mới nhất từ ​​[ultralytics](https://github.com/ultralytics/ultralytics?tab=readme-ov-file)
  - Cập nhật các gói `ultralytics` của bạn với ví dụ: `pip install -U ultralytics`
  - Chuyển đổi sang phiên bản bạn thích từ `config.ini`
- **v0.1615**
  - **New feature: Mask detection areas** -- this is highly useful where detections need to be above certain threshold to be saved and registered with separate alerts. You can use the method to i.e. increase thresholds on the input image's detection areas to avoid false positives.
  - The masking can be done with a GUI rectangle painter util under `./utils/region_masker.py`, i.e. like so:

  ```bash
   python ./utils/region_masker.py
  ```

  - Điều này sẽ chạy một tiện ích mface khu vực cho phép bạn đặt các khu vực đặc biệt với giao diện GUI (chưa có chế độ headless!) và lưu nó vào một tệp (`./data/ignore_zones.json` theo mặc định; xem `config.ini` để biết thêm tùy chọn cấu hình)
  - sửa lỗi thông báo khởi động poller trong `utils/detection_audio_poller.py`

- **v0.1614.3**
  - thiết bị CUDA ưa thích hiện có thể được chọn dưới `[hardware]` từ `config.ini`
- **v0.1614**
  - Cập nhật tổng hợp phát hiện phản ứng nhiều hơn cho webui
- **v0.1613**
  - Thậm chí nhiều sửa lỗi cân bằng tải hơn; cải thiện phân tích tổng hợp
- **v0.1612**
  - Xử lý luồng và hàng đợi được cải thiện (đồng bộ hóa từ xa không chặn và các hành động khác, v.v.)
  - Kích thước hàng đợi tối đa có thể được đặt riêng cho các khung hình được lưu và đồng bộ hóa từ xa (xem `config.ini`)
- **v0.1611**
  - Thay đổi xử lý TTS; thông báo kiểm tra khi khởi động
  - (CẦN LÀM) Người dùng Firejail có thể vẫn gặp vấn đề do định tuyến âm thanh bên trong các phiên bản Firejail
- **v0.1610**
  - Các tính năng đồng bộ hóa từ xa được thêm vào, sửa lỗi
  - Các công tắc Firejail & venv khi bật đồng bộ hóa từ xa qua SSH/SCP
- **v0.1609**
  - Đồng bộ hóa từ xa các nhật ký phát hiện & khung hình đến máy chủ SFTP/SSH từ xa với `scp` hệ thống hoặc `paramiko`
  - Có thể được cấu hình và bật/tắt trong `config.ini` dưới các tùy chọn `remote_sync`
- **v0.1608**
  - Đã thêm tính bền vững cho các phát hiện tổng hợp (đặc biệt cho việc sử dụng máy chủ web)
  - Có thể được bật hoặc tắt trong `config.ini` với các tham số sau:
  - `enable_persistent_aggregated_detections = true`
  - `aggregated_detections_file = ./logs/aggregated_detections.json`
  - Hiển thị phiên bản chương trình được thêm vào tệp `version.py` phổ quát
- **v0.1607**
  - **Mới: Nhận cảnh báo phát hiện qua [Telegram](https://core.telegram.org/api)** (tùy chọn)
  - Sử dụng [@BotFather](https://t.me/BotFather) trên Telegram để tạo mã thông báo bot
  - Đặt ID người dùng của bạn (có thể là nhiều người dùng, cách nhau bằng dấu phẩy) và mã thông báo API bot làm các biến môi trường:
    - `DVR_YOLOV8_ALLOWED_TELEGRAM_USERS`
      - người dùng được phép/gửi cảnh báo đến (danh sách cách nhau bằng dấu phẩy)
    - `DVR_YOLOV8_TELEGRAM_BOT_TOKEN`
      - mã thông báo API bot Telegram của bạn để cảnh báo
- **v0.1606**
  - Cải thiện hiệu suất:
    - chuyển sang xử lý dựa trên PyAV để cải thiện độ tin cậy luồng RTMP với tải CPU thấp hơn
  - Cải thiện UI/UX:
    - Cải tiến UI/UX máy chủ web trong duyệt carousel hình ảnh
    - hiển thị khu vực phát hiện theo mặc định, có thể hoán đổi giữa khung toàn bộ/khu vực
    - nhấp vào hình ảnh bây giờ sẽ hiển thị phiên bản gốc của nó
    - bắt lỗi/ngoại lệ tốt hơn nói chung
    - mở rộng webUI tốt hơn trên các thiết bị khác nhau v.v.
- **v0.1605** Tương thích tổng thể & sửa lỗi
  - Phiên bản beta carousel hình ảnh phát hiện qua webUI
  - Nếu bật tiết kiệm phát hiện, có thể xem hình ảnh từ webUI
- **v0.1604** Kích thước hàng đợi khung hình hiện có thể cấu hình được
  - Giúp các vấn đề hiệu suất I/O khi tiết kiệm phát hiện
  - `config.ini` => `[performance]` => `frame_queue_size`
- **v0.1603** Cấu hình tiết kiệm mới
  - Chọn lưu khu vực phát hiện, toàn bộ khung, hoặc cả hai.
  - _(xem `config.ini` => `save_full_frames` và `save_detection_areas`)_
- **v0.1602** Xếp hàng khi lưu hình ảnh
  - Sẽ giảm độ trễ trên hầu hết các hệ thống, ngay cả với các khung lớn hơn
- **v0.1601** Ghi nhật ký truy cập hoạt động cho các kết nối webUI; cải thiện
  - Truy cập qua webUI được ghi nhật ký theo mặc định để `logs/access.log`
  - Xem `config.ini` để biết thêm tùy chọn
- **v0.160** (Oct-13-2024) Đã thêm ghi nhật ký truy cập WebUI
  - Có thể được bật/tắt và xác định trong `config.ini`
- **v0.159** (Oct-12-2024) Sửa chữa logic tiết kiệm phát hiện
- **v0.158** (Oct-11-2024) **Thậm chí còn nhiều cập nhật webUI hơn**
  - Các phát hiện con người được tổng hợp trong webUI trong một khoảng thời gian làm lạnh
  - (khoảng thời gian làm lạnh mặc định: 30 giây)
- **v0.157** (Oct-11-2024) **cập nhật webUI**
  - Dữ liệu được làm mới tốt hơn qua AJAX
  - Thời gian giữ khóa tối thiểu `web_server.py` => FPS tốt hơn
  - giá trị `webserver_max_fps` để giới hạn tốc độ khung hình trên webUI để cải thiện hiệu suất
- **v0.156** (Oct-11-2024) **Đồ thị phát hiện trong giao diện người dùng web**
  - Đã thêm đồ thị phát hiện dựa trên `matplotlib` vào giao diện người dùng web
  - (có thể lựa chọn giữa 1 giờ/24 giờ/tuần/tháng/năm)
- **v0.155** (Oct-11-2024) **Hiện đi kèm với máy chủ Flask!**
  - Luồng video có thể được giám sát theo thời gian thực bằng giao diện web
  - Thêm máy chủ web mini `Flask` để chăm sóc các luồng
  - `enable_webserver` và `headless` đều được đặt thành `true` theo mặc định
  - Máy chủ nghe ở `0.0.0.0:5000` (xem `config.ini` để biết thêm)
  - Điều này cho phép triển khai nhanh chóng đặc biệt trong cài đặt headless / Docker
- **v0.154** (Oct-10-2024) 🐳 **Thiết Lập Dockerized Hiện Có Sẵn!** 🐳
  - Chế độ headless được thêm vào cho các chế độ không GUI/Docker/chỉ phát hiện
    - bật trong `config.ini` với `headless = true`
    - hoặc chạy chương trình với cờ `--headless`
  - Thêm Docker làm phương pháp cài đặt để dễ dàng hóa quá trình thiết lập
  - hướng dẫn cài đặt bổ sung
- **v0.153**
  - `config.ini` & thay đổi chương trình:
  - Thư mục dự phòng (`fallback_save_dir`)
  - Tùy chọn để tạo các thư mục con dựa trên ngày (tức là `/yolo_detections_path/year/month/day/`)
- **v0.152**
  - Đã thêm tập lệnh trình cài đặt Conda/Mamba để triển khai dễ dàng hơn
- **v0.151**
  - Đã thêm dự phòng cho các thư mục
- **v0.1501**
  - Dự phòng cho các chế độ không phải CUDA nếu CUDA không được hỗ trợ
- **v0.15**
  - Thêm hỗ trợ webcam USB trực tiếp
    - Cấu hình qua `config.ini` hoặc sử dụng cờ `--use_webcam`
    - Thêm `utils/get_webcams.py` để tìm chỉ số webcam
- **v0.1402**
  - Đã thêm ghi nhật ký phát hiện vào một tệp
- **v0.1401**
  - Thêm `configparser`; hiện có thể cấu hình qua `config.ini`
- **v0.140**
  - Cải thiện kiểm tra tùy chọn cấu hình

## Cấp Phép

Dự án này được cấp phép theo **Giấy Phép Công Cộng GNU phiên bản 3.0 (GPLv3)**.

### Tinh Thần và Ý Định

Tôi đã tạo dự án này để hỗ trợ các nỗ lực phi lợi nhuận và giáo dục. Mặc dù giấy phép GPLv3 cho phép sử dụng thương mại, tôi xin kiếp kính yêu cầu rằng nếu bạn có kế hoạch sử dụng dự án này cho các mục đích thương mại, hãy xem xét liên hệ với tôi. Sự hỗ trợ và cộng tác của bạn được đánh giá cao.

### Liên Hệ

Để được tư vấn, đề nghị hoặc hợp tác, vui lòng liên hệ với tôi tại `flyingfathead@protonmail.com` hoặc truy cập [FlyingFathead trên GitHub](https://github.com/FlyingFathead).

## Đóng Góp

Chúng tôi hoan nghênh các đóng góp! Vui lòng mở các vấn đề hoặc gửi các yêu cầu kéo trên GitHub, hoặc liên hệ trực tiếp với tác giả (tôi) tại `flyingfathead@protonmail.com`.

## Ghi Công

Được phát triển bởi [FlyingFathead](https://github.com/FlyingFathead), với những đóng góp mã ghost kỹ thuật số từ ChaosWhisperer.

## Khác

Hãy đánh dấu sao nếu bạn thích nó. \*;-)

