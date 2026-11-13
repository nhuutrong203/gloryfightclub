-- Club data from schedule photos, Facebook, and the club website.
-- Local D1 only. The DELETE statements below would erase live CMS edits.
-- seed/sample.sql contains local demo posts, testimonials, and students.

DELETE FROM settings WHERE key IN ('club', 'hero', 'policy');
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
}')),
-- Club rules appear on /quy-dinh and in the trial form. A line beginning with "1. " starts a section.
('policy', json('{
  "fees": "1. Quy định học phí\nHọc viên vui lòng đóng học phí đầy đủ trước khi tham gia tập luyện.\nHọc phí đã đóng không được hoàn trả dưới bất kỳ hình thức nào sau khi đăng ký.\nHọc phí không được chuyển nhượng cho người khác nếu không có sự chấp thuận từ Ban quản lý CLB.\n2. Chính sách bảo lưu\nHọc viên đăng ký các gói 3 tháng, 6 tháng hoặc 12 tháng được hỗ trợ bảo lưu tối đa 01 tháng trong trường hợp gặp vấn đề về sức khỏe, chấn thương hoặc các lý do y tế có xác nhận phù hợp.\nThời gian bảo lưu phải được thông báo trước cho CLB và được Ban quản lý xác nhận.\nSau thời gian bảo lưu, thời hạn thẻ tập sẽ được cộng thêm tương ứng với số ngày được bảo lưu.\nMỗi gói tập chỉ được áp dụng bảo lưu 01 lần trong suốt thời hạn gói.\n3. Quy định khác\nHọc viên có trách nhiệm tuân thủ nội quy, quy tắc an toàn và hướng dẫn của huấn luyện viên trong quá trình tập luyện.\nCLB có quyền từ chối phục vụ đối với các trường hợp vi phạm nội quy hoặc có hành vi ảnh hưởng đến môi trường tập luyện chung.\nTrong trường hợp bất khả kháng (thiên tai, dịch bệnh, sự cố cơ sở vật chất...), CLB sẽ có phương án hỗ trợ phù hợp cho học viên.",
  "fees_en": "1. Tuition fees\nPlease pay your tuition fee in full before you start training.\nFees that have been paid are non-refundable in any form once you have registered.\nFees cannot be transferred to another person without approval from the club management.\n2. Membership freeze\nMembers on 3-, 6- or 12-month packages may freeze their membership for up to 01 month in case of health problems, injury or other medical reasons with appropriate proof.\nThe freeze period must be notified to the club in advance and confirmed by the club management.\nAfter the freeze period, the membership is extended by the same number of days that were frozen.\nEach package can be frozen only 01 time during its validity.\n3. Other rules\nMembers must follow the club rules, safety rules and the coaches'' instructions during training.\nThe club reserves the right to refuse service to anyone who breaks the club rules or behaves in a way that harms the shared training environment.\nIn case of force majeure (natural disasters, epidemics, facility incidents...), the club will offer members suitable support.",
  "safety": "1. Nhận thức về rủi ro khi tham gia tập luyện\nHọc viên hiểu rằng MMA, KUDO, Boxing, Kickboxing, Muay Thai, Jiu-Jitsu và các môn võ đối kháng là những hoạt động thể thao có tính chất vận động cường độ cao.\nTrong quá trình tập luyện có thể phát sinh những rủi ro như: trầy xước, bầm tím, bong gân, căng cơ, chấn thương khớp, gãy xương, chấn thương vùng đầu hoặc các tai nạn thể thao khác.\nHọc viên xác nhận đã được thông tin về những rủi ro có thể xảy ra và tự nguyện tham gia tập luyện trên cơ sở nhận thức đầy đủ về tính chất của môn thể thao.\n2. Trách nhiệm của học viên\nKhai báo trung thực tình trạng sức khỏe, tiền sử chấn thương và các vấn đề y tế có thể ảnh hưởng đến quá trình tập luyện.\nChủ động thông báo cho HLV khi cảm thấy đau, chóng mặt, khó thở, mệt mỏi bất thường hoặc có dấu hiệu không đảm bảo sức khỏe.\nTuân thủ hướng dẫn chuyên môn, nội quy và các quy định an toàn của CLB.\nSử dụng đầy đủ trang thiết bị bảo hộ theo yêu cầu của từng nội dung tập luyện.\nKhông tự ý thực hiện các kỹ thuật nguy hiểm, không cố tình sử dụng lực quá mức hoặc gây chấn thương cho bạn tập.\nKhông tham gia đối kháng khi đang bị chấn thương, có dấu hiệu sức khỏe không đảm bảo hoặc đang chịu ảnh hưởng của rượu bia, chất kích thích.\n3. Quy định an toàn khi đối kháng (Sparring)\nChỉ được tham gia Sparring khi có sự đồng ý và giám sát của HLV.\nHọc viên phải lựa chọn cường độ đối kháng phù hợp với trình độ, thể trạng và kinh nghiệm của cả hai bên.\nTôn trọng bạn tập, kiểm soát lực đánh, lực vật và lực siết.\nKhi đối phương ra hiệu xin dừng (Tap out), phải lập tức thả đòn và dừng kỹ thuật.\nNghiêm cấm cố tình gây thương tích, trả đũa, đánh quá mức hoặc sử dụng kỹ thuật bị HLV cấm.\nHLV có quyền yêu cầu học viên dừng tập hoặc không tham gia Sparring nếu nhận thấy có nguy cơ mất an toàn.\n4. Cam kết và miễn trừ trách nhiệm về tai nạn thể thao\nHọc viên xác nhận đã hiểu rằng chấn thương và tai nạn là những rủi ro có thể phát sinh trong quá trình tham gia các môn thể thao đối kháng, kể cả khi đã tuân thủ các quy định an toàn.\nHọc viên tự chịu trách nhiệm đối với những rủi ro thông thường, khách quan phát sinh từ hoạt động tập luyện mà không xuất phát từ lỗi của CLB hoặc cá nhân có trách nhiệm.\nCLB không chịu trách nhiệm đối với các thiệt hại phát sinh do học viên cố tình vi phạm nội quy, không tuân thủ hướng dẫn an toàn, che giấu tình trạng sức khỏe hoặc tự ý thực hiện các hoạt động ngoài phạm vi cho phép.\nHọc viên có trách nhiệm bảo quản tài sản cá nhân trong thời gian tập luyện. CLB không chịu trách nhiệm đối với mất mát tài sản do nguyên nhân ngoài khả năng kiểm soát hợp lý của CLB.\nViệc cam kết nhận thức rủi ro không loại trừ trách nhiệm của CLB, HLV hoặc các bên liên quan đối với những thiệt hại do lỗi, hành vi vi phạm pháp luật hoặc việc không thực hiện nghĩa vụ bảo đảm an toàn theo quy định.\n5. Xử lý khi xảy ra tai nạn hoặc chấn thương\nHLV có trách nhiệm dừng hoạt động tập luyện khi phát hiện học viên gặp sự cố hoặc có dấu hiệu chấn thương.\nCLB sẽ hỗ trợ sơ cứu ban đầu trong phạm vi khả năng và liên hệ người thân hoặc cấp cứu y tế khi cần thiết.\nĐối với trường hợp nghi ngờ chấn thương nghiêm trọng, đặc biệt là chấn thương đầu, cổ, cột sống hoặc mất ý thức, học viên sẽ được hỗ trợ tiếp cận cơ sở y tế phù hợp.\nHọc viên có trách nhiệm phối hợp cung cấp thông tin và thực hiện hướng dẫn y tế sau tai nạn.\nCác sự cố đáng kể cần được ghi nhận và lập biên bản để phục vụ công tác quản lý, xử lý và phòng ngừa tái diễn.\n6. Quy định riêng đối với học viên dưới 18 tuổi\nPhải có sự đồng ý của cha mẹ hoặc người giám hộ hợp pháp trước khi đăng ký tập luyện.\nCha mẹ hoặc người giám hộ có trách nhiệm cung cấp thông tin sức khỏe cần thiết của học viên.\nViệc tập luyện và đối kháng phải phù hợp với độ tuổi, thể trạng, trình độ và có sự giám sát của HLV.\nKhông tự ý tham gia các hoạt động đối kháng ngoài chương trình được CLB cho phép.\n7. Xác nhận cam kết\nKhi đánh dấu \"Tôi đồng ý\" lúc đăng ký trên website hoặc ký phiếu tại CLB, tôi xác nhận: đã đọc, hiểu và đồng ý tuân thủ các quy định an toàn của GLORY FIGHT CLUB.\nĐã được thông tin về những rủi ro có thể xảy ra trong quá trình tập luyện thể thao đối kháng.\nCam kết cung cấp thông tin sức khỏe trung thực và chủ động bảo vệ an toàn cho bản thân cũng như bạn tập.\nTự nguyện tham gia tập luyện và chịu trách nhiệm đối với những hành vi vi phạm nội quy của mình theo quy định pháp luật.",
  "safety_en": "1. Awareness of training risks\nMembers understand that MMA, KUDO, Boxing, Kickboxing, Muay Thai, Jiu-Jitsu and other combat sports are high-intensity physical activities.\nTraining may involve risks such as scrapes, bruises, sprains, muscle strains, joint injuries, fractures, head injuries or other sports accidents.\nMembers confirm that they have been informed of these possible risks and take part voluntarily, fully aware of the nature of the sport.\n2. Member responsibilities\nDeclare your health condition, injury history and any medical issues that may affect training honestly.\nTell your coach right away if you feel pain, dizziness, shortness of breath, unusual fatigue or any sign that you are not well.\nFollow the coaches'' professional instructions, the club rules and the club''s safety rules.\nWear all the protective gear required for each type of training.\nDo not attempt dangerous techniques on your own, do not deliberately use excessive force and do not injure your training partners.\nDo not spar while injured, while not in good health or while under the influence of alcohol or other substances.\n3. Sparring safety rules\nSparring is only allowed with the coach''s approval and supervision.\nChoose a sparring intensity that suits the level, physical condition and experience of both partners.\nRespect your partner and control the power of your strikes, takedowns and submissions.\nWhen your partner taps out, release the hold and stop the technique immediately.\nDeliberately injuring others, retaliating, striking excessively or using techniques banned by the coach is strictly prohibited.\nThe coach may stop a member from training or sparring if there is a safety risk.\n4. Acknowledgement and waiver for sports accidents\nMembers understand that injuries and accidents are risks that can occur in combat sports, even when all safety rules are followed.\nMembers accept responsibility for ordinary, objective risks of training that are not caused by the fault of the club or any responsible person.\nThe club is not liable for damage caused by a member deliberately breaking the club rules, ignoring safety instructions, hiding their health condition or doing activities outside what is allowed.\nMembers are responsible for their personal belongings during training. The club is not liable for lost property due to causes beyond its reasonable control.\nThis risk acknowledgement does not exclude the liability of the club, coaches or other parties for damage caused by their fault, by violations of the law or by failure to meet their safety obligations as required.\n5. In case of an accident or injury\nThe coach must stop the training activity when a member has an incident or shows signs of injury.\nThe club will provide first aid within its capacity and contact relatives or emergency services when needed.\nFor suspected serious injuries, especially to the head, neck or spine, or loss of consciousness, the member will be helped to reach suitable medical care.\nMembers must cooperate by providing information and following medical advice after an accident.\nSignificant incidents are recorded in a written report for management, follow-up and prevention.\n6. Members under 18\nConsent from a parent or legal guardian is required before registering for training.\nThe parent or guardian is responsible for providing the necessary health information about the member.\nTraining and sparring must suit the member''s age, physical condition and level, under the coach''s supervision.\nMembers must not take part in sparring outside the program approved by the club.\n7. Confirmation\nBy ticking \"I agree\" when signing up on the website, or by signing the form at the club, I confirm that I have read, understood and agree to follow the safety rules of GLORY FIGHT CLUB.\nI have been informed of the risks that may occur in combat sports training.\nI will provide honest health information and actively protect my own safety and that of my training partners.\nI take part voluntarily and am responsible for any breach of the club rules on my part, in accordance with the law.",
  "updated": "2026-11-06"
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

-- Location 1 schedule from the club's timetable. Coach assignments are pending.
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

-- Adult IBJJF belts and a simplified Kudo list pending confirmation in the CMS.
DELETE FROM belts;
INSERT INTO belts (discipline_id, name, name_en, color, rank) VALUES
(4, 'Đai trắng', 'White belt', '#F5F5F5', 1),
(4, 'Đai xanh dương', 'Blue belt', '#1E4FD8', 2),
(4, 'Đai tím', 'Purple belt', '#6B2FB3', 3),
(4, 'Đai nâu', 'Brown belt', '#6B3E1F', 4),
(4, 'Đai đen', 'Black belt', '#0A0A0A', 5),
(2, 'Đai trắng', 'White belt', '#F5F5F5', 1),
(2, 'Đai tím', 'Purple belt', '#6B2FB3', 2),
(2, 'Đai xanh dương', 'Blue belt', '#1E4FD8', 3),
(2, 'Đai vàng', 'Yellow belt', '#F2C200', 4),
(2, 'Đai xanh lá', 'Green belt', '#1E8F3A', 5),
(2, 'Đai nâu', 'Brown belt', '#6B3E1F', 6),
(2, 'Đai đen', 'Black belt', '#0A0A0A', 7);

DELETE FROM achievements;
INSERT INTO achievements (title, title_en, event_name, event_date, coach_id, sort) VALUES
('HCV Kudo quốc gia', 'Gold medal — Kudo', 'Giải Kudo quốc gia 2024', NULL, 1, 1),
('HCV Open Jiujitsu', 'Gold medal — Open Jiujitsu', 'Open Jiujitsu Cần Thơ', NULL, 2, 2),
('HCB Jujitsu', 'Silver medal — Jujitsu', 'Giải các CLB Jujitsu quốc gia', NULL, 2, 3),
('HCB, HCĐ', 'Silver & bronze medals', 'Đại hội TDTT ĐBSCL', NULL, 2, 4);

-- Membership plans from the club poster. Sunday open mat from 18:00 to 21:00 is free.
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
-- Plan audience (migration 0005).
UPDATE fee_plans SET audience = 'Người muốn tập nghiêm túc, tập nhiều môn mỗi tuần hoặc chuẩn bị thi đấu.', audience_en = 'Serious trainees who want several disciplines a week or are preparing to compete.' WHERE id = 1;
UPDATE fee_plans SET audience = 'Người đi làm muốn kết hợp 2 môn (vd. đứng đòn + vật) với lịch tập linh hoạt.', audience_en = 'Working adults who want to combine 2 disciplines (e.g. striking + grappling) on a flexible schedule.' WHERE id = 2;
UPDATE fee_plans SET audience = 'Bé 6–15 tuổi cần rèn thể lực, sự tự tin và tính kỷ luật trong môi trường an toàn.', audience_en = 'Kids aged 6–15 building fitness, confidence and discipline in a safe setting.' WHERE id = 3;
UPDATE fee_plans SET audience = 'Học sinh – sinh viên mới bắt đầu, muốn tập đều một môn với chi phí vừa túi tiền.', audience_en = 'Students who are starting out and want to train one discipline regularly on a budget.' WHERE id = 4;
