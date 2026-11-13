-- Demo data for local use only. Never load it into production.
-- Entries marked "(mẫu)" are examples to replace through the CMS.

DELETE FROM faqs;
INSERT INTO faqs (question, question_en, answer, answer_en, sort) VALUES
('Chưa từng tập võ có theo được không? (mẫu)', 'Can I join with no experience? (sample)',
 'Được. Các lớp nhận người mới bắt đầu, HLV hướng dẫn từ kỹ thuật cơ bản.', 'Yes. Classes welcome beginners and coaches start from the basics.', 1),
('Có buổi tập thử không? (mẫu)', 'Is there a free trial? (sample)',
 'Có. Đăng ký học thử trên web hoặc nhắn Zalo, CLB sẽ gọi lại xếp lịch.', 'Yes. Book a trial on the website or message us on Zalo and we will call you back.', 2),
('Cần mang theo gì khi đi tập? (mẫu)', 'What should I bring? (sample)',
 'Quần áo thể thao thoải mái, nước uống, khăn. Đồ bảo hộ có thể mượn ở CLB.', 'Comfortable sportswear, water and a towel. Protective gear can be borrowed at the gym.', 3);

DELETE FROM testimonials;
INSERT INTO testimonials (author_name, author_role, author_role_en, content, content_en, sort) VALUES
('Học viên A (mẫu)', 'Học viên MMA', 'MMA student', 'Nội dung cảm nhận mẫu — thầy thay bằng cảm nhận thật trong CMS.', 'Sample testimonial — replace with a real one in the CMS.', 1),
('Phụ huynh B (mẫu)', 'Phụ huynh học viên Kudo Kids', 'Parent of a Kudo Kids student', 'Nội dung cảm nhận mẫu — thầy thay bằng cảm nhận thật trong CMS.', 'Sample testimonial — replace with a real one in the CMS.', 2);

DELETE FROM post_images;
DELETE FROM posts;
INSERT INTO posts (id, slug, title, title_en, content, content_en, published_at) VALUES
(1, 'buoi-tap-mma-mau', 'Buổi tập MMA tối (mẫu)', 'Evening MMA session (sample)',
 'Bài đăng mẫu dạng nhật ký lớp học. Thầy đăng ảnh và vài dòng mô tả buổi tập ngay trên điện thoại.',
 'Sample class-diary post. Coaches post photos and a few lines straight from their phone.',
 (unixepoch() - 86400) * 1000),
(2, 'open-mat-chu-nhat-mau', 'Open mat Chủ nhật (mẫu)', 'Sunday open mat (sample)',
 'Bài đăng mẫu thứ hai.', 'Second sample post.',
 (unixepoch() - 3 * 86400) * 1000);

DELETE FROM payments;
DELETE FROM student_classes;
DELETE FROM students;
INSERT INTO students (id, code, full_name, phone, birth_year, parent_name, parent_phone, location_id, fee_plan_id, joined_at, status) VALUES
(1, 'GF0001', 'Nguyễn Văn A (mẫu)', '0900000001', 1998, NULL, NULL, 1, 1, '2026-08-01', 'active'),
(2, 'GF0002', 'Trần Thị B (mẫu)', '0900000002', 2005, NULL, NULL, 1, 4, '2026-09-15', 'active'),
(3, 'GF0003', 'Lê Minh C (mẫu)', NULL, 2015, 'Lê Văn D', '0900000003', 2, 3, '2026-10-05', 'active');
INSERT INTO student_classes (student_id, class_id)
SELECT s.id, c.id FROM students s JOIN classes c ON c.location_id = s.location_id
WHERE (s.id = 1 AND c.name = 'MMA' AND c.days = '246' AND c.start_time = '18:30')
   OR (s.id = 2 AND c.name = 'Kudo' AND c.days = '357' AND c.start_time = '20:00');
INSERT INTO payments (student_id, fee_plan_id, month, amount, paid_at, method) VALUES
(1, 1, '2026-10', 1500000, '2026-10-02', 'cash'),
(1, 1, '2026-11', 1500000, '2026-11-01', 'transfer'),
(2, 4, '2026-10', 800000, '2026-10-03', 'transfer');

DELETE FROM trial_registrations;
INSERT INTO trial_registrations (full_name, phone, age, discipline_id, location_id, preferred_time, status) VALUES
('Khách mẫu 1', '0900000010', 25, 1, 1, 'Tối T2-T4-T6', 'new'),
('Khách mẫu 2', '0900000011', 9, 2, 2, 'Cuối tuần', 'contacted');

DELETE FROM sessions;
DELETE FROM users;
-- Local demo accounts use glory2026. Use scripts/create-user.mjs for real accounts.
INSERT INTO users (username, password_hash, full_name, role, permissions, coach_id) VALUES
('admin', 'pbkdf2$100000$EZmGHvaH3JLyA/ix8D84Fw==$+d9G+IMEQ0kwiJpI7CX9XNOSui73COSFkTxS7Io5hpw=', 'Lê Thành Trung (demo)', 'owner', '[]', 1),
('hlv', 'pbkdf2$100000$/qX8E2vuA80gBSCJ0h4L6w==$80yxSzbQ6bxL0SKGE5uvh7vVQYE8WRGMZi+j1IFA9HY=', 'Nguyễn Tiến Đăng Phong (demo)', 'coach', '["students.view","students.edit","posts"]', 2);
