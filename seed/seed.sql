-- DỮ LIỆU THẬT của CLB (nguồn: ảnh lịch tập, Facebook, gloryfightclub.vn).
-- An toàn để nạp lên D1 trên cloud: npm run db:seed:remote
-- Dữ liệu demo (tin tức, cảm nhận, học viên…) nằm ở seed/sample.sql — CHỈ dùng ở local.

DELETE FROM settings;
INSERT INTO settings (key, value) VALUES
('club', json('{
  "name": "GLORY FIGHT CLUB",
  "slogan": "NO PAIN – NO GLORY",
  "tagline": "Câu lạc bộ võ thuật tổng hợp — MMA · Kudo · Kickboxing · Jiujitsu · Muay Thai",
  "tagline_en": "Mixed martial arts club — MMA · Kudo · Kickboxing · Jiujitsu · Muay Thai",
  "hotlines": ["0793 182 218", "0382 998 538"],
  "zalo": "0382998538",
  "facebook": "https://www.facebook.com/gloryfightclubvn",
  "instagram": "https://www.instagram.com/glory.fight.club"
}')),
('hero', json('{
  "title": "NO PAIN – NO GLORY",
  "title_en": "NO PAIN – NO GLORY",
  "subtitle": "Tập MMA, Kudo, Muay Thai, BJJ cùng HLV đai đen và võ sĩ đang thi đấu. Hai cơ sở tại TP.HCM.",
  "subtitle_en": "Train MMA, Kudo, Muay Thai and BJJ with black-belt coaches and active fighters. Two gyms in Ho Chi Minh City.",
  "image_key": null
}'));

DELETE FROM locations;
INSERT INTO locations (id, name, name_en, address, map_url, phone, sort) VALUES
(1, 'Cơ sở 1 — An Phú Đông', 'Gym 1 — An Phu Dong',
 '125/9/18 Nguyễn Thị Nhuần, P. An Phú Đông, TP. Hồ Chí Minh',
 'https://www.google.com/maps/search/?api=1&query=125%2F9%2F18%20Nguy%E1%BB%85n%20Th%E1%BB%8B%20Nhu%E1%BA%A7n%2C%20An%20Ph%C3%BA%20%C4%90%C3%B4ng%2C%20H%E1%BB%93%20Ch%C3%AD%20Minh',
 '0793 182 218', 1),
(2, 'Cơ sở 2 — Sport House Gò Vấp', 'Gym 2 — Sport House Go Vap',
 'Trung tâm thể thao Sport House, A1.06 Chung cư Dream Home Residence, 148/21 Đường số 59, P. An Hội Tây (Gò Vấp), TP. Hồ Chí Minh',
 'https://www.google.com/maps/search/?api=1&query=Dream%20Home%20Residence%2C%20148%2F21%20%C4%90%C6%B0%E1%BB%9Dng%20s%E1%BB%91%2059%2C%20G%C3%B2%20V%E1%BA%A5p%2C%20H%E1%BB%93%20Ch%C3%AD%20Minh',
 '0793 182 218', 2);

DELETE FROM disciplines;
INSERT INTO disciplines (id, slug, name, name_en, summary, summary_en, has_belts, sort) VALUES
(1, 'mma', 'MMA', 'MMA',
 'Đối kháng toàn diện: đánh đứng, vật và chiến đấu mặt đất (Boxing, Muay Thái, Judo, Wrestling, BJJ, Karate) — lối đánh đa dạng, thực chiến, giàu chiến thuật.',
 'Complete combat sport: striking, wrestling and ground fighting (Boxing, Muay Thai, Judo, Wrestling, BJJ, Karate) — versatile, practical and tactical.',
 0, 1),
(2, 'kudo', 'Kudo', 'Kudo',
 'Võ tổng hợp giữ tinh thần võ đạo Nhật: đấm, đá, chỏ, gối, vật, khóa, siết. Có hệ thống cấp đai theo Liên đoàn thế giới. Phù hợp tự vệ, đối kháng có bảo hộ an toàn.',
 'Japanese budo-spirited mixed martial art: punches, kicks, elbows, knees, throws, locks and chokes. Official world-federation belt system. Great for self-defence and safe, fully-protected sparring.',
 1, 2),
(3, 'muay-thai-kickboxing', 'Muay Thái – Kickboxing', 'Muay Thai – Kickboxing',
 'Nghệ thuật tám chi: hai tay (đấm), hai chân (đá), hai khuỷu tay (chỏ) và hai đầu gối.',
 'The art of eight limbs: two fists, two shins, two elbows and two knees.',
 0, 3),
(4, 'jiujitsu-grappling', 'Jiujitsu – Grappling', 'Jiujitsu – Grappling',
 'Kỹ năng vật: quật ngã, khóa khớp, siết cổ, địa chiến (ground game) — nền tảng Judo, Wrestling, BJJ trong MMA.',
 'Grappling skills: takedowns, joint locks, chokes and ground fighting — the Judo, Wrestling and BJJ foundation of MMA.',
 1, 4),
(5, 'boxing', 'Boxing', 'Boxing',
 'Quyền Anh: di chuyển, phòng thủ và tổ hợp đòn tay — nền tảng đánh đứng cho mọi môn đối kháng.',
 'Footwork, defence and punching combinations — the striking foundation for every combat sport.',
 0, 5);

DELETE FROM coaches;
INSERT INTO coaches (id, slug, full_name, title, title_en, achievements, achievements_en, discipline_ids, is_featured, sort) VALUES
(1, 'le-thanh-trung', 'Lê Thành Trung', 'Chủ CLB · Head Coach MMA – Kudo – BJJ', 'Founder · Head Coach MMA – Kudo – BJJ',
 'Đai đen Kudo chính thức do Liên đoàn Kudo thế giới cấp
Võ sĩ MMA đang thi đấu
HCV giải Kudo quốc gia 2024
Hơn 5 năm kinh nghiệm huấn luyện',
 'Official Kudo black belt certified by the Kudo International Federation
Active MMA fighter
Gold medal, Kudo National Championship 2024
5+ years of coaching experience',
 '[1,2,4]', 1, 1),
(2, 'nguyen-tien-dang-phong', 'Nguyễn Tiến Đăng Phong', 'HLV Jiujitsu', 'Jiujitsu Coach',
 'HCB giải các CLB Jujitsu quốc gia
HCB, HCĐ Đại hội TDTT ĐBSCL
HCV Open Jiujitsu Cần Thơ',
 'Silver medal, National Jujitsu Club Championship
Silver & bronze medals, Mekong Delta Sports Games
Gold medal, Open Jiujitsu Can Tho',
 '[4]', 1, 2),
(3, 'ninh-van-tinh', 'Ninh Văn Tỉnh', 'HLV Striking – Kudo – Boxing – Kickboxing', 'Striking Coach – Kudo – Boxing – Kickboxing', NULL, NULL, '[2,5,3]', 1, 3),
(4, 'huynh-minh-duc', 'Huỳnh Minh Đức', 'HLV Striking – Kudo – Boxing – Kickboxing', 'Striking Coach – Kudo – Boxing – Kickboxing', NULL, NULL, '[2,5,3]', 0, 4),
(5, 'nguyen-huy-vinh-tam', 'Nguyễn Huy Vĩnh Tâm', 'HLV Striking – Kudo – Boxing – Kickboxing', 'Striking Coach – Kudo – Boxing – Kickboxing', NULL, NULL, '[2,5,3]', 0, 5),
(6, 'nguyen-truong-nhi-thao', 'Nguyễn Trương Nhi Thảo', 'HLV Kudo Kids', 'Kudo Kids Coach', NULL, NULL, '[2]', 0, 6);

-- Lịch cơ sở 1 (theo ảnh "Khung giờ tập luyện"). HLV từng ca chưa rõ → để trống.
DELETE FROM classes;
INSERT INTO classes (name, name_en, discipline_ids, location_id, days, start_time, end_time) VALUES
('MMA', 'MMA', '[1]', 1, '246', '08:30', '09:30'),
('MMA', 'MMA', '[1]', 1, '246', '09:30', '10:30'),
('MMA', 'MMA', '[1]', 1, '246', '10:30', '11:30'),
('Boxing', 'Boxing', '[5]', 1, '357', '08:30', '09:30'),
('Boxing', 'Boxing', '[5]', 1, '357', '09:30', '10:30'),
('Boxing', 'Boxing', '[5]', 1, '357', '10:30', '11:30'),
('Muay Thái / Kickboxing', 'Muay Thai / Kickboxing', '[3]', 1, '246', '17:00', '18:30'),
('MMA', 'MMA', '[1]', 1, '246', '18:30', '20:00'),
('MMA / Muay Thái', 'MMA / Muay Thai', '[1,3]', 1, '357', '18:30', '20:00'),
('Jiujitsu / Grappling', 'Jiujitsu / Grappling', '[4]', 1, '246', '20:00', '21:30'),
('Kudo', 'Kudo', '[2]', 1, '357', '20:00', '21:30'),
('Open mat – Sparring', 'Open mat – Sparring', '[]', 1, '8', '18:00', '21:00');

-- Hệ thống đai: BJJ (chuẩn IBJJF người lớn). Kudo: bản rút gọn — CẦN THẦY XÁC NHẬN lại trong CMS.
DELETE FROM belts;
INSERT INTO belts (discipline_id, name, name_en, color, rank) VALUES
(4, 'Đai trắng', 'White belt', '#F5F5F5', 1),
(4, 'Đai xanh dương', 'Blue belt', '#1E4FD8', 2),
(4, 'Đai tím', 'Purple belt', '#6B2FB3', 3),
(4, 'Đai nâu', 'Brown belt', '#6B3E1F', 4),
(4, 'Đai đen', 'Black belt', '#0A0A0A', 5),
(2, 'Đai trắng', 'White belt', '#F5F5F5', 1),
(2, 'Đai xanh dương', 'Blue belt', '#1E4FD8', 2),
(2, 'Đai vàng', 'Yellow belt', '#F2C200', 3),
(2, 'Đai xanh lá', 'Green belt', '#1E8F3A', 4),
(2, 'Đai nâu', 'Brown belt', '#6B3E1F', 5),
(2, 'Đai đen', 'Black belt', '#0A0A0A', 6);

DELETE FROM achievements;
INSERT INTO achievements (title, title_en, event_name, event_date, coach_id, sort) VALUES
('HCV Kudo quốc gia', 'Gold medal — Kudo', 'Giải Kudo quốc gia 2024', NULL, 1, 1),
('HCV Open Jiujitsu', 'Gold medal — Open Jiujitsu', 'Open Jiujitsu Cần Thơ', NULL, 2, 2),
('HCB Jujitsu', 'Silver medal — Jujitsu', 'Giải các CLB Jujitsu quốc gia', NULL, 2, 3),
('HCB, HCĐ', 'Silver & bronze medals', 'Đại hội TDTT ĐBSCL', NULL, 2, 4);

-- Gói tập (theo ảnh "Các gói tập"). Open mat – Sparring Chủ nhật 18:00–21:00 miễn phí.
DELETE FROM fee_plans;
INSERT INTO fee_plans (id, name, name_en, headline, headline_en, condition, condition_en, price_per_month, features, features_en, badge, is_featured, sort) VALUES
(1, 'Premium', 'Premium', 'Tập tất cả các môn', 'All disciplines',
 'Trừ lớp trẻ em và lớp Fighter', 'Excludes kids and Fighter classes', 1500000,
 'Tập không giới hạn tất cả các môn
Miễn phí Openmat – Sparring
Ưu tiên tham gia sự kiện, thi đấu
Ưu đãi đặc biệt cho hội viên',
 'Unlimited training in every discipline
Free Open mat – Sparring
Priority for events and competitions
Exclusive member perks',
 'BEST CHOICE', 1, 1),
(2, 'Standard', 'Standard', 'Tập 2 môn tự chọn', 'Any 2 disciplines',
 'Trừ lớp trẻ em và lớp Fighter', 'Excludes kids and Fighter classes', 1000000,
 'Chọn 2 môn bất kỳ
Miễn phí Openmat – Sparring
Lịch tập linh hoạt
Phù hợp người bận rộn',
 'Pick any 2 disciplines
Free Open mat – Sparring
Flexible schedule
Great for busy people',
 NULL, 0, 2),
(3, 'Trẻ em', 'Kids', 'Dành cho trẻ em', 'For kids',
 'Từ 6 – 15 tuổi', 'Ages 6 – 15', 700000,
 'Tập các lớp dành riêng cho trẻ em
Phát triển thể chất & kỹ năng
Môi trường an toàn, kỷ luật
Huấn luyện viên chuyên môn',
 'Dedicated kids classes
Builds fitness and skills
Safe, disciplined environment
Specialist coaches',
 NULL, 0, 3),
(4, 'Học sinh – Sinh viên', 'Students', 'Tập 1 môn tự chọn', 'Any 1 discipline',
 'Dành cho học sinh – sinh viên', 'For high-school and university students', 800000,
 'Chọn 1 môn bất kỳ
Miễn phí Openmat – Sparring
Giá ưu đãi dành cho HSSV
Xuất trình thẻ HSSV khi đăng ký',
 'Pick any 1 discipline
Free Open mat – Sparring
Special student price
Student ID required at sign-up',
 NULL, 0, 4);
