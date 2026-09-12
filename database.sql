-- ==============================================================================
-- ระบบบริหารจัดการแข่งขันกีฬากลุ่มโรงเรียนสว่างสูงกระสัง ประจำปี 2569
-- MySQL 8.x / MariaDB Database Schema & Seed Data
-- ==============================================================================

SET NAMES utf8mb4;
SET FOREIGN_KEY_CHECKS = 0;

-- 1. COMPETITIONS TABLE
DROP TABLE IF EXISTS `competitions`;
CREATE TABLE `competitions` (
  `id` VARCHAR(50) NOT NULL,
  `year` INT(11) NOT NULL,
  `academic_year` VARCHAR(50) DEFAULT '2569',
  `competition_name` VARCHAR(255) NOT NULL,
  `start_date` DATE NOT NULL,
  `end_date` DATE NOT NULL,
  `venue` VARCHAR(255) NOT NULL,
  `host_org` VARCHAR(255) NOT NULL,
  `status` ENUM('UPCOMING','ACTIVE','COMPLETED','ARCHIVED') DEFAULT 'ACTIVE',
  `header_bg_image` TEXT DEFAULT NULL,
  `google_drive_folder_id` VARCHAR(255) DEFAULT NULL,
  `google_slide_template_id` VARCHAR(255) DEFAULT NULL,
  `google_slide_template_student_id` VARCHAR(255) DEFAULT NULL,
  `google_slide_template_coach_id` VARCHAR(255) DEFAULT NULL,
  `google_apps_script_url` TEXT DEFAULT NULL,
  `president_name` VARCHAR(150) DEFAULT NULL,
  `director_name` VARCHAR(150) DEFAULT NULL,
  `cert_prefix` VARCHAR(50) DEFAULT 'สพป.บร.3/2569-',
  `medal_criteria` ENUM('GOLD_FIRST', 'TOTAL_FIRST') DEFAULT 'GOLD_FIRST',
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 2. SETTINGS TABLE
DROP TABLE IF EXISTS `settings`;
CREATE TABLE `settings` (
  `id` VARCHAR(50) NOT NULL,
  `setting_key` VARCHAR(100) NOT NULL UNIQUE,
  `setting_value` TEXT NOT NULL,
  `description` VARCHAR(255) DEFAULT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 3. SCHOOLS TABLE (12 โรงเรียนกลุ่มสว่างสูงกระสัง)
DROP TABLE IF EXISTS `schools`;
CREATE TABLE `schools` (
  `id` VARCHAR(50) NOT NULL,
  `competition_id` VARCHAR(50) NOT NULL,
  `school_code` VARCHAR(50) NOT NULL,
  `smis_code` VARCHAR(20) NOT NULL,
  `school_name` VARCHAR(255) NOT NULL,
  `short_name` VARCHAR(100) NOT NULL,
  `address` TEXT DEFAULT NULL,
  `phone` VARCHAR(50) DEFAULT NULL,
  `logo` VARCHAR(255) DEFAULT NULL,
  `director_name` VARCHAR(255) DEFAULT NULL,
  `status` ENUM('ACTIVE','INACTIVE') DEFAULT 'ACTIVE',
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_school_comp` (`competition_id`),
  KEY `idx_school_smis` (`smis_code`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 4. USERS TABLE (Username = SMIS 8 หลัก, default password = 123456)
DROP TABLE IF EXISTS `users`;
CREATE TABLE `users` (
  `id` VARCHAR(50) NOT NULL,
  `school_id` VARCHAR(50) DEFAULT NULL,
  `username` VARCHAR(100) NOT NULL UNIQUE,
  `password` VARCHAR(255) NOT NULL,
  `full_name` VARCHAR(255) NOT NULL,
  `email` VARCHAR(100) NOT NULL,
  `phone` VARCHAR(50) DEFAULT NULL,
  `role` ENUM('SUPER_ADMIN','ADMIN','SCHOOL','REFEREE') NOT NULL,
  `status` ENUM('ACTIVE','INACTIVE') DEFAULT 'ACTIVE',
  `must_change_password` TINYINT(1) DEFAULT 1,
  `last_login` DATETIME DEFAULT NULL,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_user_school` (`school_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 5. SPORTS TABLE
DROP TABLE IF EXISTS `sports`;
CREATE TABLE `sports` (
  `id` VARCHAR(50) NOT NULL,
  `sport_name` VARCHAR(100) NOT NULL,
  `sport_icon` VARCHAR(50) DEFAULT 'Trophy',
  `description` TEXT DEFAULT NULL,
  `category` ENUM('BALL_SPORTS','RACQUET_SPORTS','ATHLETICS','TRADITIONAL_SPORTS','OTHER') DEFAULT 'BALL_SPORTS',
  `status` ENUM('ACTIVE','INACTIVE') DEFAULT 'ACTIVE',
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 6. EVENTS TABLE
DROP TABLE IF EXISTS `events`;
CREATE TABLE `events` (
  `id` VARCHAR(50) NOT NULL,
  `competition_id` VARCHAR(50) NOT NULL,
  `sport_id` VARCHAR(50) NOT NULL,
  `event_code` VARCHAR(50) NOT NULL,
  `event_name` VARCHAR(255) NOT NULL,
  `gender` ENUM('MALE','FEMALE','MIXED') NOT NULL,
  `age_group` VARCHAR(50) NOT NULL,
  `grade` VARCHAR(50) NOT NULL,
  `competition_type` ENUM('INDIVIDUAL','TEAM','DOUBLE') NOT NULL,
  `award_type` VARCHAR(100) DEFAULT 'เหรียญทอง/เงิน/ทองแดง + เกียรติบัตร',
  `max_players` INT(11) DEFAULT 1,
  `min_players` INT(11) DEFAULT 1,
  `status` ENUM('OPEN','CLOSED','IN_PROGRESS','COMPLETED') DEFAULT 'OPEN',
  PRIMARY KEY (`id`),
  KEY `idx_event_sport` (`sport_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 7. STUDENTS TABLE
DROP TABLE IF EXISTS `students`;
CREATE TABLE `students` (
  `id` VARCHAR(50) NOT NULL,
  `competition_id` VARCHAR(50) NOT NULL,
  `school_id` VARCHAR(50) NOT NULL,
  `student_code` VARCHAR(50) DEFAULT NULL,
  `prefix` VARCHAR(20) NOT NULL,
  `first_name` VARCHAR(100) NOT NULL,
  `last_name` VARCHAR(100) NOT NULL,
  `gender` ENUM('MALE','FEMALE') NOT NULL,
  `birth_date` DATE NOT NULL,
  `grade` VARCHAR(50) NOT NULL,
  `class_room` VARCHAR(20) DEFAULT NULL,
  `photo_url` VARCHAR(255) DEFAULT NULL,
  `status` ENUM('ACTIVE','INACTIVE') DEFAULT 'ACTIVE',
  PRIMARY KEY (`id`),
  KEY `idx_student_school` (`school_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 8. COACHES TABLE
DROP TABLE IF EXISTS `coaches`;
CREATE TABLE `coaches` (
  `id` VARCHAR(50) NOT NULL,
  `competition_id` VARCHAR(50) NOT NULL,
  `school_id` VARCHAR(50) NOT NULL,
  `prefix` VARCHAR(20) NOT NULL,
  `first_name` VARCHAR(100) NOT NULL,
  `last_name` VARCHAR(100) NOT NULL,
  `position` VARCHAR(100) NOT NULL,
  `phone` VARCHAR(50) DEFAULT NULL,
  `status` ENUM('ACTIVE','INACTIVE') DEFAULT 'ACTIVE',
  PRIMARY KEY (`id`),
  KEY `idx_coach_school` (`school_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 9. REGISTRATIONS TABLE
DROP TABLE IF EXISTS `registrations`;
CREATE TABLE `registrations` (
  `id` VARCHAR(50) NOT NULL,
  `competition_id` VARCHAR(50) NOT NULL,
  `event_id` VARCHAR(50) NOT NULL,
  `school_id` VARCHAR(50) NOT NULL,
  `coach_id` VARCHAR(50) DEFAULT NULL,
  `secondary_coach_id` VARCHAR(50) DEFAULT NULL,
  `registration_status` ENUM('PENDING','APPROVED','REJECTED') DEFAULT 'APPROVED',
  `submitted_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `approved_at` TIMESTAMP NULL DEFAULT NULL,
  `approved_by` VARCHAR(100) DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `idx_reg_event` (`event_id`),
  KEY `idx_reg_school` (`school_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 10. REGISTRATION_STUDENTS TABLE
DROP TABLE IF EXISTS `registration_students`;
CREATE TABLE `registration_students` (
  `id` VARCHAR(50) NOT NULL,
  `registration_id` VARCHAR(50) NOT NULL,
  `student_id` VARCHAR(50) NOT NULL,
  `jersey_number` INT(11) DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `idx_rs_reg` (`registration_id`),
  KEY `idx_rs_student` (`student_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 11. RESULTS TABLE
DROP TABLE IF EXISTS `results`;
CREATE TABLE `results` (
  `id` VARCHAR(50) NOT NULL,
  `competition_id` VARCHAR(50) NOT NULL,
  `event_id` VARCHAR(50) NOT NULL,
  `school_id` VARCHAR(50) NOT NULL,
  `rank` INT(11) NOT NULL,
  `award` VARCHAR(100) NOT NULL,
  `medal` ENUM('GOLD','SILVER','BRONZE','NONE') DEFAULT 'NONE',
  `score` VARCHAR(100) DEFAULT NULL,
  `note` TEXT DEFAULT NULL,
  `recorded_by` VARCHAR(100) NOT NULL,
  `recorded_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `status` ENUM('UNOFFICIAL','OFFICIAL','DISQUALIFIED') DEFAULT 'OFFICIAL',
  PRIMARY KEY (`id`),
  KEY `idx_result_event` (`event_id`),
  KEY `idx_result_school` (`school_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 12. CERTIFICATES TABLE
DROP TABLE IF EXISTS `certificates`;
CREATE TABLE `certificates` (
  `id` VARCHAR(50) NOT NULL,
  `competition_id` VARCHAR(50) NOT NULL,
  `certificate_no` VARCHAR(100) NOT NULL UNIQUE,
  `recipient_type` ENUM('STUDENT','COACH','SCHOOL','REFEREE') NOT NULL,
  `recipient_id` VARCHAR(50) NOT NULL,
  `recipient_name` VARCHAR(255) NOT NULL,
  `school_id` VARCHAR(50) NOT NULL,
  `school_name` VARCHAR(255) NOT NULL,
  `event_id` VARCHAR(50) NOT NULL,
  `event_name` VARCHAR(255) NOT NULL,
  `sport_name` VARCHAR(100) NOT NULL,
  `result_id` VARCHAR(50) NOT NULL,
  `award` VARCHAR(100) NOT NULL,
  `medal` ENUM('GOLD','SILVER','BRONZE','NONE') DEFAULT 'NONE',
  `issue_date` DATE NOT NULL,
  `template_type` VARCHAR(50) DEFAULT 'STANDARD_GOLD',
  `drive_file_id` VARCHAR(255) DEFAULT NULL,
  `drive_url` VARCHAR(255) DEFAULT NULL,
  `qr_token` VARCHAR(255) NOT NULL UNIQUE,
  `status` ENUM('GENERATED','DOWNLOADED','REVOKED') DEFAULT 'GENERATED',
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_cert_qr` (`qr_token`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 13. ACTIVITY_LOGS TABLE
DROP TABLE IF EXISTS `activity_logs`;
CREATE TABLE `activity_logs` (
  `id` VARCHAR(50) NOT NULL,
  `competition_id` VARCHAR(50) NOT NULL,
  `user_id` VARCHAR(50) NOT NULL,
  `username` VARCHAR(100) NOT NULL,
  `action` VARCHAR(100) NOT NULL,
  `module` VARCHAR(50) NOT NULL,
  `details` TEXT DEFAULT NULL,
  `ip_address` VARCHAR(50) DEFAULT NULL,
  `user_agent` TEXT DEFAULT NULL,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_log_user` (`user_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 14. MATCH_REPORTS TABLE
DROP TABLE IF EXISTS `match_reports`;
CREATE TABLE `match_reports` (
  `id` VARCHAR(50) NOT NULL,
  `competition_id` VARCHAR(50) NOT NULL DEFAULT 'comp-2026',
  `sport_id` VARCHAR(50) NOT NULL,
  `sport_name` VARCHAR(100) NOT NULL,
  `event_name` VARCHAR(255) NOT NULL,
  `team_1_school_id` VARCHAR(50) NOT NULL,
  `team_1_school_name` VARCHAR(255) NOT NULL,
  `team_1_score` INT NOT NULL DEFAULT 0,
  `team_2_school_id` VARCHAR(50) NOT NULL,
  `team_2_school_name` VARCHAR(255) NOT NULL,
  `team_2_score` INT NOT NULL DEFAULT 0,
  `winner_school_id` VARCHAR(50) DEFAULT NULL,
  `match_date` DATE NOT NULL,
  `match_time` VARCHAR(20) DEFAULT NULL,
  `round_name` VARCHAR(100) DEFAULT 'รอบแรก',
  `summary_text` TEXT NOT NULL,
  `reporter_name` VARCHAR(150) NOT NULL,
  `status` ENUM('LIVE','COMPLETED') DEFAULT 'COMPLETED',
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_mr_sport` (`sport_id`),
  KEY `idx_mr_date` (`match_date`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ==============================================================================
-- INITIAL SEED DATA
-- ==============================================================================

INSERT INTO `competitions` (`id`, `year`, `academic_year`, `competition_name`, `start_date`, `end_date`, `venue`, `host_org`, `status`, `google_slide_template_id`, `google_slide_template_student_id`, `google_slide_template_coach_id`, `cert_prefix`) VALUES
('comp-2026', 2569, '2569', 'การแข่งขันกีฬากลุ่มโรงเรียนสว่างสูงกระสัง ประจำปีการศึกษา 2569', '2026-11-15', '2026-11-20', 'สนามกีฬาโรงเรียนบ้านหนองหว้า อ.กระสัง จ.บุรีรัมย์', 'กลุ่มโรงเรียนสว่างสูงกระสัง สพป.บุรีรัมย์ เขต 3 (สพป.บร.3)', 'ACTIVE', '1sL1dE_T3mpL4t3_Student_2569', '1sL1dE_T3mpL4t3_Student_2569', '1sL1dE_T3mpL4t3_Coach_2569', 'สพป.บร.3/2569-');

-- 12 โรงเรียนกลุ่มสว่างสูงกระสัง
INSERT INTO `schools` (`id`, `competition_id`, `school_code`, `smis_code`, `school_name`, `short_name`, `address`, `phone`, `logo`, `director_name`, `status`) VALUES
('sch-1', 'comp-2026', '31030064', '31030064', 'โรงเรียนบ้านหนองหว้า', 'รร.บ้านหนองหว้า', 'ต.หนองเต็ง อ.กระสัง จ.บุรีรัมย์', '044-689101', 'https://images.unsplash.com/photo-1546410531-bb4caa6b424d?w=150', 'นายวิชัย สุขเกษม', 'ACTIVE'),
('sch-2', 'comp-2026', '31030059', '31030059', 'โรงเรียนบ้านโคกสว่าง', 'รร.บ้านโคกสว่าง', 'ต.สูงเนิน อ.กระสัง จ.บุรีรัมย์', '044-689102', 'https://images.unsplash.com/photo-1580582932707-520aed937b7b?w=150', 'นางสมศรี ใจดี', 'ACTIVE'),
('sch-3', 'comp-2026', '31030066', '31030066', 'โรงเรียนบ้านโคกสูงคูขาด', 'รร.บ้านโคกสูงคูขาด', 'ต.หนองเต็ง อ.กระสัง จ.บุรีรัมย์', '044-689103', 'https://images.unsplash.com/photo-1592066575517-58df903152f2?w=150', 'นายประเสริฐ รัตนวงศ์', 'ACTIVE'),
('sch-4', 'comp-2026', '31030081', '31030081', 'โรงเรียนบ้านบุกระสัง', 'รร.บ้านบุกระสัง', 'ต.กระสัง อ.กระสัง จ.บุรีรัมย์', '044-689104', 'https://images.unsplash.com/photo-1577896851231-70ef18881754?w=150', 'นายสมคิด ยิ่งเจริญ', 'ACTIVE'),
('sch-5', 'comp-2026', '31030060', '31030060', 'โรงเรียนบ้านโคกลอย', 'รร.บ้านโคกลอย', 'ต.สูงเนิน อ.กระสัง จ.บุรีรัมย์', '044-689105', 'https://images.unsplash.com/photo-1509062522246-3755977927d7?w=150', 'นางกัญญาภัทร ศรีสว่าง', 'ACTIVE'),
('sch-6', 'comp-2026', '31030083', '31030083', 'โรงเรียนบ้านสระสะแก', 'รร.บ้านสระสะแก', 'ต.กระสัง อ.กระสัง จ.บุรีรัมย์', '044-689106', 'https://images.unsplash.com/photo-1524178232363-1fb2b075b655?w=150', 'นายสุรชัย มั่นคง', 'ACTIVE'),
('sch-7', 'comp-2026', '31030082', '31030082', 'โรงเรียนบ้านหนองมัน', 'รร.บ้านหนองมัน', 'ต.กระสัง อ.กระสัง จ.บุรีรัมย์', '044-689107', 'https://images.unsplash.com/photo-1546410531-bb4caa6b424d?w=150', 'นายณรงค์ เกียรติชัย', 'ACTIVE'),
('sch-8', 'comp-2026', '31030061', '31030061', 'โรงเรียนบ้านตะกรุมทอง', 'รร.บ้านตะกรุมทอง', 'ต.สูงเนิน อ.กระสัง จ.บุรีรัมย์', '044-689108', 'https://images.unsplash.com/photo-1580582932707-520aed937b7b?w=150', 'นางพรทิพย์ สุวรรณโชติ', 'ACTIVE'),
('sch-9', 'comp-2026', '31030062', '31030062', 'โรงเรียนบ้านโนนพะไล', 'รร.บ้านโนนพะไล', 'ต.หนองเต็ง อ.กระสัง จ.บุรีรัมย์', '044-689109', 'https://images.unsplash.com/photo-1592066575517-58df903152f2?w=150', 'นายบุญเลิศ เจริญผล', 'ACTIVE'),
('sch-10', 'comp-2026', '31030065', '31030065', 'โรงเรียนบ้านสระตะเคียน', 'รร.บ้านสระตะเคียน', 'ต.หนองเต็ง อ.กระสัง จ.บุรีรัมย์', '044-689110', 'https://images.unsplash.com/photo-1577896851231-70ef18881754?w=150', 'นางสาวมาลี ดวงจันทร์', 'ACTIVE'),
('sch-11', 'comp-2026', '31030067', '31030067', 'โรงเรียนมิตรภาพโนนสมบูรณ์', 'รร.มิตรภาพโนนสมบูรณ์', 'ต.สูงเนิน อ.กระสัง จ.บุรีรัมย์', '044-689111', 'https://images.unsplash.com/photo-1509062522246-3755977927d7?w=150', 'นายสมพร เพชรดี', 'ACTIVE'),
('sch-12', 'comp-2026', '31030063', '31030063', 'โรงเรียนบ้านสะเดาหวาน', 'รร.บ้านสะเดาหวาน', 'ต.กระสัง อ.กระสัง จ.บุรีรัมย์', '044-689112', 'https://images.unsplash.com/photo-1524178232363-1fb2b075b655?w=150', 'นายประสิทธิ์ ชูใจ', 'ACTIVE');

-- บัญชีผู้ใช้งานระบบ (รหัสผ่านเริ่มต้น 123456 สำหรับโรงเรียน, admin1234 สำหรับแอดมิน, judge1234 สำหรับผู้รายงานผล)
INSERT INTO `users` (`id`, `school_id`, `username`, `password`, `full_name`, `email`, `phone`, `role`, `status`, `must_change_password`) VALUES
('usr-sa', NULL, 'superadmin', '$2y$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'ผู้อำนวยการกลุ่มโรงเรียนสว่างสูงกระสัง', 'superadmin@sawangsung.ac.th', '081-9998888', 'SUPER_ADMIN', 'ACTIVE', 0),
('usr-admin', NULL, 'admin', '$2y$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'คณะกรรมการฝ่ายจัดการแข่งขัน', 'admin@sawangsung.ac.th', '081-7776666', 'ADMIN', 'ACTIVE', 0),
('usr-reporter', NULL, 'reporter', '$2y$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'เจ้าหน้าที่รายงานผลการแข่งขันประจำวัน', 'reporter@sawangsung.ac.th', '089-9991111', 'REFEREE', 'ACTIVE', 0),
('usr-ref1', NULL, 'referee1', '$2y$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'อาจารย์สมศักดิ์ ตัดสินเที่ยงตรง (กรรมการเป่าฟุตบอล)', 'referee1@sawangsung.ac.th', '089-1112222', 'REFEREE', 'ACTIVE', 0),
('usr-sch-1', 'sch-1', '31030064', '$2y$10$tZ2yYpL/jYyJmUq5uVvXQeK1e0U2/t0.1q5X7W5.Xq9V9e7T5.Z0a', 'ผู้ประสานงาน รร.บ้านหนองหว้า', 'nongwa@sawangsung.ac.th', '044-689101', 'SCHOOL', 'ACTIVE', 1),
('usr-sch-2', 'sch-2', '31030059', '$2y$10$tZ2yYpL/jYyJmUq5uVvXQeK1e0U2/t0.1q5X7W5.Xq9V9e7T5.Z0a', 'ผู้ประสานงาน รร.บ้านโคกสว่าง', 'khoksawang@sawangsung.ac.th', '044-689102', 'SCHOOL', 'ACTIVE', 1),
('usr-sch-3', 'sch-3', '31030066', '$2y$10$tZ2yYpL/jYyJmUq5uVvXQeK1e0U2/t0.1q5X7W5.Xq9V9e7T5.Z0a', 'ผู้ประสานงาน รร.บ้านโคกสูงคูขาด', 'khoksung@sawangsung.ac.th', '044-689103', 'SCHOOL', 'ACTIVE', 1),
('usr-sch-4', 'sch-4', '31030081', '$2y$10$tZ2yYpL/jYyJmUq5uVvXQeK1e0U2/t0.1q5X7W5.Xq9V9e7T5.Z0a', 'ผู้ประสานงาน รร.บ้านบุกระสัง', 'bukrasang@sawangsung.ac.th', '044-689104', 'SCHOOL', 'ACTIVE', 1),
('usr-sch-5', 'sch-5', '31030060', '$2y$10$tZ2yYpL/jYyJmUq5uVvXQeK1e0U2/t0.1q5X7W5.Xq9V9e7T5.Z0a', 'ผู้ประสานงาน รร.บ้านโคกลอย', 'khokloy@sawangsung.ac.th', '044-689105', 'SCHOOL', 'ACTIVE', 1),
('usr-sch-6', 'sch-6', '31030083', '$2y$10$tZ2yYpL/jYyJmUq5uVvXQeK1e0U2/t0.1q5X7W5.Xq9V9e7T5.Z0a', 'ผู้ประสานงาน รร.บ้านสระสะแก', 'srasakae@sawangsung.ac.th', '044-689106', 'SCHOOL', 'ACTIVE', 1),
('usr-sch-7', 'sch-7', '31030082', '$2y$10$tZ2yYpL/jYyJmUq5uVvXQeK1e0U2/t0.1q5X7W5.Xq9V9e7T5.Z0a', 'ผู้ประสานงาน รร.บ้านหนองมัน', 'nongman@sawangsung.ac.th', '044-689107', 'SCHOOL', 'ACTIVE', 1),
('usr-sch-8', 'sch-8', '31030061', '$2y$10$tZ2yYpL/jYyJmUq5uVvXQeK1e0U2/t0.1q5X7W5.Xq9V9e7T5.Z0a', 'ผู้ประสานงาน รร.บ้านตะกรุมทอง', 'takrumthong@sawangsung.ac.th', '044-689108', 'SCHOOL', 'ACTIVE', 1),
('usr-sch-9', 'sch-9', '31030062', '$2y$10$tZ2yYpL/jYyJmUq5uVvXQeK1e0U2/t0.1q5X7W5.Xq9V9e7T5.Z0a', 'ผู้ประสานงาน รร.บ้านโนนพะไล', 'nonphalai@sawangsung.ac.th', '044-689109', 'SCHOOL', 'ACTIVE', 1),
('usr-sch-10', 'sch-10', '31030065', '$2y$10$tZ2yYpL/jYyJmUq5uVvXQeK1e0U2/t0.1q5X7W5.Xq9V9e7T5.Z0a', 'ผู้ประสานงาน รร.บ้านสระตะเคียน', 'sratakian@sawangsung.ac.th', '044-689110', 'SCHOOL', 'ACTIVE', 1),
('usr-sch-11', 'sch-11', '31030067', '$2y$10$tZ2yYpL/jYyJmUq5uVvXQeK1e0U2/t0.1q5X7W5.Xq9V9e7T5.Z0a', 'ผู้ประสานงาน รร.มิตรภาพโนนสมบูรณ์', 'mitraphap@sawangsung.ac.th', '044-689111', 'SCHOOL', 'ACTIVE', 1),
('usr-sch-12', 'sch-12', '31030063', '$2y$10$tZ2yYpL/jYyJmUq5uVvXQeK1e0U2/t0.1q5X7W5.Xq9V9e7T5.Z0a', 'ผู้ประสานงาน รร.บ้านสะเดาหวาน', 'sadaowan@sawangsung.ac.th', '044-689112', 'SCHOOL', 'ACTIVE', 1);

-- กีฬา (Sports)
INSERT INTO `sports` (`id`, `sport_name`, `sport_icon`, `description`, `category`, `status`) VALUES
('sp-football', 'ฟุตบอล 7 คน', 'Goal', 'แข่งขันฟุตบอล 7 คน สนามหญ้ามาตรฐาน', 'BALL_SPORTS', 'ACTIVE'),
('sp-futsal', 'ฟุตซอล', 'Activity', 'แข่งขันฟุตซอลสนามคอนกรีตมาตรฐาน', 'BALL_SPORTS', 'ACTIVE'),
('sp-volleyball', 'วอลเลย์บอล', 'CircleDot', 'แข่งขันวอลเลย์บอล 6 คน', 'BALL_SPORTS', 'ACTIVE'),
('sp-sepaktakraw', 'เซปักตะกร้อ', 'Disc', 'แข่งขันเซปักตะกร้อทีมเดี่ยว 3 คน', 'BALL_SPORTS', 'ACTIVE'),
('sp-running', 'กรีฑาและวิ่ง', 'Flame', 'การแข่งขันวิ่ง 50ม. 100ม. 4x100ม.', 'ATHLETICS', 'ACTIVE'),
('sp-petanque', 'เปตอง', 'Crosshair', 'แข่งขันเปตองทีมชาย ทีมหญิง และทีมผสม', 'TRADITIONAL_SPORTS', 'ACTIVE');

-- รายการแข่งขัน (Events)
INSERT INTO `events` (`id`, `competition_id`, `sport_id`, `event_code`, `event_name`, `gender`, `age_group`, `grade`, `competition_type`, `award_type`, `max_players`, `min_players`, `status`) VALUES
('ev-1', 'comp-2026', 'sp-football', 'FB-M-PRI', 'ฟุตบอล 7 คน[ทีมชาย][ระดับชั้นประถมศึกษา]', 'MALE', 'ระดับชั้นประถมศึกษา', 'ระดับชั้นประถมศึกษา', 'TEAM', 'เหรียญทอง/เงิน/ทองแดง + เกียรติบัตร', 12, 7, 'OPEN'),
('ev-2', 'comp-2026', 'sp-futsal', 'FS-M-PRI', 'ฟุตซอล[ทีมชาย][ระดับชั้นประถมศึกษา]', 'MALE', 'ระดับชั้นประถมศึกษา', 'ระดับชั้นประถมศึกษา', 'TEAM', 'เหรียญทอง/เงิน/ทองแดง + เกียรติบัตร', 10, 5, 'OPEN'),
('ev-3', 'comp-2026', 'sp-volleyball', 'VB-F-PRI', 'วอลเลย์บอล[ทีมหญิง][ระดับชั้นประถมศึกษา]', 'FEMALE', 'ระดับชั้นประถมศึกษา', 'ระดับชั้นประถมศึกษา', 'TEAM', 'เหรียญทอง/เงิน/ทองแดง + เกียรติบัตร', 12, 6, 'OPEN'),
('ev-4', 'comp-2026', 'sp-sepaktakraw', 'ST-M-PRI', 'เซปักตะกร้อ[ทีมชาย][ระดับชั้นประถมศึกษา]', 'MALE', 'ระดับชั้นประถมศึกษา', 'ระดับชั้นประถมศึกษา', 'TEAM', 'เหรียญทอง/เงิน/ทองแดง + เกียรติบัตร', 5, 3, 'OPEN'),
('ev-5', 'comp-2026', 'sp-petanque', 'PT-MIX-PRI', 'เปตอง[ทีมผสม][ระดับชั้นประถมศึกษา]', 'MIXED', 'ระดับชั้นประถมศึกษา', 'ระดับชั้นประถมศึกษา', 'TEAM', 'เหรียญทอง/เงิน/ทองแดง + เกียรติบัตร', 3, 3, 'OPEN'),

-- ระดับชั้นอนุบาล (5 รายการ)
('ev-ath-k-01', 'comp-2026', 'sp-running', 'ATH-M-50M-K', 'วิ่ง 50 เมตร[ทีมชาย][ระดับชั้นอนุบาล]', 'MALE', 'ระดับชั้นอนุบาล', 'ระดับชั้นอนุบาล', 'INDIVIDUAL', 'เหรียญทอง/เงิน/ทองแดง + เกียรติบัตร', 1, 1, 'OPEN'),
('ev-ath-k-02', 'comp-2026', 'sp-running', 'ATH-F-50M-K', 'วิ่ง 50 เมตร[ทีมหญิง][ระดับชั้นอนุบาล]', 'FEMALE', 'ระดับชั้นอนุบาล', 'ระดับชั้นอนุบาล', 'INDIVIDUAL', 'เหรียญทอง/เงิน/ทองแดง + เกียรติบัตร', 1, 1, 'OPEN'),
('ev-ath-k-03', 'comp-2026', 'sp-running', 'ATH-M-60M-K', 'วิ่ง 60 เมตร[ทีมชาย][ระดับชั้นอนุบาล]', 'MALE', 'ระดับชั้นอนุบาล', 'ระดับชั้นอนุบาล', 'INDIVIDUAL', 'เหรียญทอง/เงิน/ทองแดง + เกียรติบัตร', 1, 1, 'OPEN'),
('ev-ath-k-04', 'comp-2026', 'sp-running', 'ATH-F-60M-K', 'วิ่ง 60 เมตร[ทีมหญิง][ระดับชั้นอนุบาล]', 'FEMALE', 'ระดับชั้นอนุบาล', 'ระดับชั้นอนุบาล', 'INDIVIDUAL', 'เหรียญทอง/เงิน/ทองแดง + เกียรติบัตร', 1, 1, 'OPEN'),
('ev-ath-k-05', 'comp-2026', 'sp-running', 'ATH-MIX-4X50M-K', 'วิ่งผลัด 4 x 50 เมตร[ทีมผสม][ระดับชั้นอนุบาล]', 'MIXED', 'ระดับชั้นอนุบาล', 'ระดับชั้นอนุบาล', 'TEAM', 'เหรียญทอง/เงิน/ทองแดง + เกียรติบัตร', 6, 4, 'OPEN'),

-- ระดับชั้นประถมศึกษา (10 รายการ)
('ev-ath-p-01', 'comp-2026', 'sp-running', 'ATH-M-80M-P', 'วิ่ง 80 เมตร[ทีมชาย][ระดับชั้นประถมศึกษา]', 'MALE', 'ระดับชั้นประถมศึกษา', 'ระดับชั้นประถมศึกษา', 'INDIVIDUAL', 'เหรียญทอง/เงิน/ทองแดง + เกียรติบัตร', 1, 1, 'OPEN'),
('ev-ath-p-02', 'comp-2026', 'sp-running', 'ATH-F-80M-P', 'วิ่ง 80 เมตร[ทีมหญิง][ระดับชั้นประถมศึกษา]', 'FEMALE', 'ระดับชั้นประถมศึกษา', 'ระดับชั้นประถมศึกษา', 'INDIVIDUAL', 'เหรียญทอง/เงิน/ทองแดง + เกียรติบัตร', 1, 1, 'OPEN'),
('ev-ath-p-03', 'comp-2026', 'sp-running', 'ATH-M-100M-P', 'วิ่ง 100 เมตร[ทีมชาย][ระดับชั้นประถมศึกษา]', 'MALE', 'ระดับชั้นประถมศึกษา', 'ระดับชั้นประถมศึกษา', 'INDIVIDUAL', 'เหรียญทอง/เงิน/ทองแดง + เกียรติบัตร', 1, 1, 'OPEN'),
('ev-ath-p-04', 'comp-2026', 'sp-running', 'ATH-F-100M-P', 'วิ่ง 100 เมตร[ทีมหญิง][ระดับชั้นประถมศึกษา]', 'FEMALE', 'ระดับชั้นประถมศึกษา', 'ระดับชั้นประถมศึกษา', 'INDIVIDUAL', 'เหรียญทอง/เงิน/ทองแดง + เกียรติบัตร', 1, 1, 'OPEN'),
('ev-ath-p-05', 'comp-2026', 'sp-running', 'ATH-M-200M-P', 'วิ่ง 200 เมตร[ทีมชาย][ระดับชั้นประถมศึกษา]', 'MALE', 'ระดับชั้นประถมศึกษา', 'ระดับชั้นประถมศึกษา', 'INDIVIDUAL', 'เหรียญทอง/เงิน/ทองแดง + เกียรติบัตร', 1, 1, 'OPEN'),
('ev-ath-p-06', 'comp-2026', 'sp-running', 'ATH-F-200M-P', 'วิ่ง 200 เมตร[ทีมหญิง][ระดับชั้นประถมศึกษา]', 'FEMALE', 'ระดับชั้นประถมศึกษา', 'ระดับชั้นประถมศึกษา', 'INDIVIDUAL', 'เหรียญทอง/เงิน/ทองแดง + เกียรติบัตร', 1, 1, 'OPEN'),
('ev-ath-p-07', 'comp-2026', 'sp-running', 'ATH-M-400M-P', 'วิ่ง 400 เมตร[ทีมชาย][ระดับชั้นประถมศึกษา]', 'MALE', 'ระดับชั้นประถมศึกษา', 'ระดับชั้นประถมศึกษา', 'INDIVIDUAL', 'เหรียญทอง/เงิน/ทองแดง + เกียรติบัตร', 1, 1, 'OPEN'),
('ev-ath-p-08', 'comp-2026', 'sp-running', 'ATH-F-400M-P', 'วิ่ง 400 เมตร[ทีมหญิง][ระดับชั้นประถมศึกษา]', 'FEMALE', 'ระดับชั้นประถมศึกษา', 'ระดับชั้นประถมศึกษา', 'INDIVIDUAL', 'เหรียญทอง/เงิน/ทองแดง + เกียรติบัตร', 1, 1, 'OPEN'),
('ev-ath-p-09', 'comp-2026', 'sp-running', 'ATH-M-4X100M-P', 'วิ่งผลัด 4 x 100 เมตร[ทีมชาย][ระดับชั้นประถมศึกษา]', 'MALE', 'ระดับชั้นประถมศึกษา', 'ระดับชั้นประถมศึกษา', 'TEAM', 'เหรียญทอง/เงิน/ทองแดง + เกียรติบัตร', 6, 4, 'OPEN'),
('ev-ath-p-10', 'comp-2026', 'sp-running', 'ATH-F-4X100M-P', 'วิ่งผลัด 4 x 100 เมตร[ทีมหญิง][ระดับชั้นประถมศึกษา]', 'FEMALE', 'ระดับชั้นประถมศึกษา', 'ระดับชั้นประถมศึกษา', 'TEAM', 'เหรียญทอง/เงิน/ทองแดง + เกียรติบัตร', 6, 4, 'OPEN'),

-- ระดับชั้นมัธยมศึกษาตอนต้น (8 รายการ)
('ev-ath-s-01', 'comp-2026', 'sp-running', 'ATH-M-100M-S', 'วิ่ง 100 เมตร[ทีมชาย][ระดับชั้นมัธยมศึกษาตอนต้น]', 'MALE', 'ระดับชั้นมัธยมศึกษาตอนต้น', 'ระดับชั้นมัธยมศึกษาตอนต้น', 'INDIVIDUAL', 'เหรียญทอง/เงิน/ทองแดง + เกียรติบัตร', 1, 1, 'OPEN'),
('ev-ath-s-02', 'comp-2026', 'sp-running', 'ATH-F-100M-S', 'วิ่ง 100 เมตร[ทีมหญิง][ระดับชั้นมัธยมศึกษาตอนต้น]', 'FEMALE', 'ระดับชั้นมัธยมศึกษาตอนต้น', 'ระดับชั้นมัธยมศึกษาตอนต้น', 'INDIVIDUAL', 'เหรียญทอง/เงิน/ทองแดง + เกียรติบัตร', 1, 1, 'OPEN'),
('ev-ath-s-03', 'comp-2026', 'sp-running', 'ATH-M-200M-S', 'วิ่ง 200 เมตร[ทีมชาย][ระดับชั้นมัธยมศึกษาตอนต้น]', 'MALE', 'ระดับชั้นมัธยมศึกษาตอนต้น', 'ระดับชั้นมัธยมศึกษาตอนต้น', 'INDIVIDUAL', 'เหรียญทอง/เงิน/ทองแดง + เกียรติบัตร', 1, 1, 'OPEN'),
('ev-ath-s-04', 'comp-2026', 'sp-running', 'ATH-F-200M-S', 'วิ่ง 200 เมตร[ทีมหญิง][ระดับชั้นมัธยมศึกษาตอนต้น]', 'FEMALE', 'ระดับชั้นมัธยมศึกษาตอนต้น', 'ระดับชั้นมัธยมศึกษาตอนต้น', 'INDIVIDUAL', 'เหรียญทอง/เงิน/ทองแดง + เกียรติบัตร', 1, 1, 'OPEN'),
('ev-ath-s-05', 'comp-2026', 'sp-running', 'ATH-M-400M-S', 'วิ่ง 400 เมตร[ทีมชาย][ระดับชั้นมัธยมศึกษาตอนต้น]', 'MALE', 'ระดับชั้นมัธยมศึกษาตอนต้น', 'ระดับชั้นมัธยมศึกษาตอนต้น', 'INDIVIDUAL', 'เหรียญทอง/เงิน/ทองแดง + เกียรติบัตร', 1, 1, 'OPEN'),
('ev-ath-s-06', 'comp-2026', 'sp-running', 'ATH-F-400M-S', 'วิ่ง 400 เมตร[ทีมหญิง][ระดับชั้นมัธยมศึกษาตอนต้น]', 'FEMALE', 'ระดับชั้นมัธยมศึกษาตอนต้น', 'ระดับชั้นมัธยมศึกษาตอนต้น', 'INDIVIDUAL', 'เหรียญทอง/เงิน/ทองแดง + เกียรติบัตร', 1, 1, 'OPEN'),
('ev-ath-s-07', 'comp-2026', 'sp-running', 'ATH-M-4X100M-S', 'วิ่งผลัด 4 x 100 เมตร[ทีมชาย][ระดับชั้นมัธยมศึกษาตอนต้น]', 'MALE', 'ระดับชั้นมัธยมศึกษาตอนต้น', 'ระดับชั้นมัธยมศึกษาตอนต้น', 'TEAM', 'เหรียญทอง/เงิน/ทองแดง + เกียรติบัตร', 6, 4, 'OPEN'),
('ev-ath-s-08', 'comp-2026', 'sp-running', 'ATH-F-4X100M-S', 'วิ่งผลัด 4 x 100 เมตร[ทีมหญิง][ระดับชั้นมัธยมศึกษาตอนต้น]', 'FEMALE', 'ระดับชั้นมัธยมศึกษาตอนต้น', 'ระดับชั้นมัธยมศึกษาตอนต้น', 'TEAM', 'เหรียญทอง/เงิน/ทองแดง + เกียรติบัตร', 6, 4, 'OPEN');

-- ครูผู้ฝึกสอน (Coaches - ครบ 12 โรงเรียน)
INSERT INTO `coaches` (`id`, `competition_id`, `school_id`, `prefix`, `first_name`, `last_name`, `position`, `phone`, `status`) VALUES
('coa-1', 'comp-2026', 'sch-1', 'นาย', 'วิชัย', 'ชำนาญกีฬา', 'ครูผู้ฝึกสอนฟุตบอล/กรีฑา', '081-9988771', 'ACTIVE'),
('coa-2', 'comp-2026', 'sch-1', 'นางสาว', 'อรทัย', 'ใจสว่าง', 'ผู้ช่วยผู้ฝึกสอนวอลเลย์บอล', '082-1144772', 'ACTIVE'),
('coa-3', 'comp-2026', 'sch-2', 'นาย', 'สมพงษ์', 'เกียรติภูมิ', 'ครูผู้ฝึกสอนกีฬา', '083-4455663', 'ACTIVE'),
('coa-4', 'comp-2026', 'sch-3', 'นาย', 'ประยุทธ', 'พลังไทย', 'ครูชำนาญการ พลศึกษา', '084-7788994', 'ACTIVE'),
('coa-5', 'comp-2026', 'sch-4', 'นาย', 'สุรศักดิ์', 'มงคลทรัพย์', 'ครูผู้ฝึกสอนฟุตบอล', '085-1239875', 'ACTIVE'),
('coa-6', 'comp-2026', 'sch-5', 'นาย', 'เอกชัย', 'บุญรักษา', 'ครูผู้ฝึกสอนเปตอง', '083-5566778', 'ACTIVE'),
('coa-7', 'comp-2026', 'sch-6', 'นาง', 'วราภรณ์', 'มั่นคง', 'ครูผู้ฝึกสอนวอลเลย์บอล', '086-6677889', 'ACTIVE'),
('coa-8', 'comp-2026', 'sch-7', 'นาง', 'พิมลวรรณ', 'สุวรรณโชติ', 'ครูผู้ฝึกสอนกรีฑา', '089-7788990', 'ACTIVE'),
('coa-9', 'comp-2026', 'sch-8', 'นาย', 'มนัส', 'ปัญญารัตน์', 'ครูผู้ฝึกสอนเซปักตะกร้อ', '081-8899001', 'ACTIVE'),
('coa-10', 'comp-2026', 'sch-9', 'นาย', 'สุทธิพงษ์', 'เจริญทรัพย์', 'ครูผู้ฝึกสอนกีฬา', '085-9900112', 'ACTIVE'),
('coa-11', 'comp-2026', 'sch-10', 'นาย', 'ชำนาญ', 'กลิ่นแก้ว', 'ครูผู้ฝึกสอนฟุตซอล', '088-0011223', 'ACTIVE'),
('coa-12', 'comp-2026', 'sch-11', 'นางสาว', 'พัชราภรณ์', 'พิมพ์ดี', 'ครูผู้ฝึกสอนเปตอง', '084-1122335', 'ACTIVE'),
('coa-13', 'comp-2026', 'sch-12', 'นาย', 'อนุชิต', 'พรมเทศ', 'ครูผู้ฝึกสอนกรีฑา', '087-2233446', 'ACTIVE');

-- นักเรียน / นักกีฬา (Students - ครบ 12 โรงเรียน)
INSERT INTO `students` (`id`, `competition_id`, `school_id`, `student_code`, `prefix`, `first_name`, `last_name`, `gender`, `birth_date`, `grade`, `class_room`, `status`) VALUES
('stu-1', 'comp-2026', 'sch-1', 'STD-690101', 'เด็กชาย', 'ธีรดนย์', 'สายสืบวงษ์', 'MALE', '2014-05-12', 'ป.5', '1', 'ACTIVE'),
('stu-2', 'comp-2026', 'sch-1', 'STD-690102', 'เด็กชาย', 'กิตติภูมิ', 'สุขสำราญ', 'MALE', '2014-07-21', 'ป.5', '1', 'ACTIVE'),
('stu-3', 'comp-2026', 'sch-1', 'STD-690103', 'เด็กชาย', 'ชยพล', 'คงเจริญ', 'MALE', '2014-02-14', 'ป.5', '2', 'ACTIVE'),
('stu-4', 'comp-2026', 'sch-1', 'STD-690104', 'เด็กหญิง', 'ณัฐณิชา', 'ปรีชาชาญ', 'FEMALE', '2013-11-09', 'ป.6', '1', 'ACTIVE'),
('stu-5', 'comp-2026', 'sch-1', 'STD-690105', 'เด็กหญิง', 'พิมพ์มาดา', 'ศิริรัตน์', 'FEMALE', '2013-09-18', 'ป.6', '1', 'ACTIVE'),
('stu-6', 'comp-2026', 'sch-2', 'STD-690201', 'เด็กชาย', 'ภานุวัฒน์', 'จันทร์เกษม', 'MALE', '2014-04-03', 'ป.5', '1', 'ACTIVE'),
('stu-7', 'comp-2026', 'sch-2', 'STD-690202', 'เด็กชาย', 'อภิสิทธิ์', 'บุญมี', 'MALE', '2014-08-19', 'ป.5', '2', 'ACTIVE'),
('stu-8', 'comp-2026', 'sch-2', 'STD-690203', 'เด็กหญิง', 'กานต์พิชชา', 'วงค์แก้ว', 'FEMALE', '2013-12-05', 'ป.6', '1', 'ACTIVE'),
('stu-9', 'comp-2026', 'sch-3', 'STD-690301', 'เด็กชาย', 'ธนภูมิ', 'แสงสุริยา', 'MALE', '2013-10-10', 'ป.6', '1', 'ACTIVE'),
('stu-10', 'comp-2026', 'sch-3', 'STD-690302', 'เด็กหญิง', 'สุดารัตน์', 'มีทรัพย์', 'FEMALE', '2013-08-25', 'ป.6', '1', 'ACTIVE'),
('stu-11', 'comp-2026', 'sch-4', 'STD-690401', 'เด็กชาย', 'วรภพ', 'ศิริผล', 'MALE', '2013-06-30', 'ป.6', '1', 'ACTIVE'),
('stu-12', 'comp-2026', 'sch-4', 'STD-690402', 'เด็กหญิง', 'ชลธิชา', 'ยิ่งเจริญ', 'FEMALE', '2014-01-15', 'ป.5', '1', 'ACTIVE'),
('stu-13', 'comp-2026', 'sch-5', 'STD-690501', 'เด็กชาย', 'พงศกร', 'รัตนมณี', 'MALE', '2013-11-20', 'ป.6', '1', 'ACTIVE'),
('stu-14', 'comp-2026', 'sch-5', 'STD-690502', 'เด็กหญิง', 'อนันตญา', 'ศรีสว่าง', 'FEMALE', '2014-03-08', 'ป.5', '1', 'ACTIVE'),
('stu-15', 'comp-2026', 'sch-6', 'STD-690601', 'เด็กชาย', 'ธนกฤต', 'มั่นคงดี', 'MALE', '2013-08-12', 'ป.6', '1', 'ACTIVE'),
('stu-16', 'comp-2026', 'sch-6', 'STD-690602', 'เด็กหญิง', 'สุพรรษา', 'ประเสริฐยิ่ง', 'FEMALE', '2014-06-25', 'ป.5', '1', 'ACTIVE'),
('stu-17', 'comp-2026', 'sch-7', 'STD-690701', 'เด็กชาย', 'อนุชา', 'ชัยชนะ', 'MALE', '2013-09-03', 'ป.6', '1', 'ACTIVE'),
('stu-18', 'comp-2026', 'sch-8', 'STD-690801', 'เด็กชาย', 'กฤษณะ', 'สุวรรณโชติ', 'MALE', '2013-10-18', 'ป.6', '1', 'ACTIVE'),
('stu-19', 'comp-2026', 'sch-9', 'STD-690901', 'เด็กชาย', 'วีรภัทร', 'เจริญผล', 'MALE', '2014-02-28', 'ป.5', '1', 'ACTIVE'),
('stu-20', 'comp-2026', 'sch-10', 'STD-691001', 'เด็กหญิง', 'ดวงใจ', 'แก้วสว่าง', 'FEMALE', '2013-07-14', 'ป.6', '1', 'ACTIVE'),
('stu-21', 'comp-2026', 'sch-11', 'STD-691101', 'เด็กชาย', 'ณัฐวุฒิ', 'สมบูรณ์ทรัพย์', 'MALE', '2013-12-12', 'ป.6', '1', 'ACTIVE'),
('stu-22', 'comp-2026', 'sch-12', 'STD-691201', 'เด็กชาย', 'อภิรักษ์', 'ชูใจ', 'MALE', '2013-05-05', 'ป.6', '1', 'ACTIVE');

-- การลงทะเบียนแข่งขัน (Registrations)
INSERT INTO `registrations` (`id`, `competition_id`, `event_id`, `school_id`, `coach_id`, `status`, `approved_by`, `approved_at`) VALUES
('reg-1', 'comp-2026', 'ev-1', 'sch-1', 'coa-1', 'APPROVED', 'admin', '2026-08-11 09:00:00'),
('reg-2', 'comp-2026', 'ev-1', 'sch-2', 'coa-3', 'APPROVED', 'admin', '2026-08-11 09:00:00'),
('reg-3', 'comp-2026', 'ev-1', 'sch-3', 'coa-4', 'APPROVED', 'admin', '2026-08-11 09:00:00'),
('reg-4', 'comp-2026', 'ev-3', 'sch-1', 'coa-2', 'APPROVED', 'admin', '2026-08-11 09:00:00'),
('reg-5', 'comp-2026', 'ev-3', 'sch-2', 'coa-3', 'APPROVED', 'admin', '2026-08-11 09:00:00'),
('reg-6', 'comp-2026', 'ev-5', 'sch-3', 'coa-4', 'APPROVED', 'admin', '2026-08-11 09:00:00'),
('reg-7', 'comp-2026', 'ev-5', 'sch-1', 'coa-1', 'APPROVED', 'admin', '2026-08-11 09:00:00'),
('reg-8', 'comp-2026', 'ev-6', 'sch-5', 'coa-6', 'APPROVED', 'admin', '2026-08-11 09:00:00'),
('reg-9', 'comp-2026', 'ev-4', 'sch-8', 'coa-9', 'APPROVED', 'admin', '2026-08-11 09:00:00'),
('reg-10', 'comp-2026', 'ev-2', 'sch-4', 'coa-5', 'APPROVED', 'admin', '2026-08-11 09:00:00');

-- นักกีฬาในการลงทะเบียน (Registration Students)
INSERT INTO `registration_students` (`id`, `registration_id`, `student_id`, `jersey_number`) VALUES
('rs-1', 'reg-1', 'stu-1', 10),
('rs-2', 'reg-1', 'stu-2', 7),
('rs-3', 'reg-1', 'stu-3', 9),
('rs-4', 'reg-2', 'stu-6', 10),
('rs-5', 'reg-2', 'stu-7', 8),
('rs-6', 'reg-4', 'stu-4', 4),
('rs-7', 'reg-4', 'stu-5', 5),
('rs-8', 'reg-5', 'stu-8', 6),
('rs-9', 'reg-6', 'stu-9', 1),
('rs-10', 'reg-7', 'stu-1', 2);

-- ผลการแข่งขัน (Results - เหรียญรางวัล)
INSERT INTO `results` (`id`, `competition_id`, `event_id`, `school_id`, `rank_position`, `award`, `medal`, `score`, `note`, `recorded_by`, `status`) VALUES
('res-1', 'comp-2026', 'ev-1', 'sch-1', 1, 'ชนะเลิศ', 'GOLD', '3 - 1', 'แข่งขันรอบชิงชนะเลิศ ชนะ 3 ประตูต่อ 1', 'อาจารย์พิชัย ยุติธรรม (JUDGE)', 'OFFICIAL'),
('res-2', 'comp-2026', 'ev-1', 'sch-2', 2, 'รองชนะเลิศอันดับ 1', 'SILVER', '1 - 3', 'รอบชิงชนะเลิศ', 'อาจารย์พิชัย ยุติธรรม (JUDGE)', 'OFFICIAL'),
('res-3', 'comp-2026', 'ev-1', 'sch-3', 3, 'รองชนะเลิศอันดับ 2', 'BRONZE', '2 - 0', 'รอบชิงอันดับ 3 ชนะ 2 ประตูต่อ 0', 'อาจารย์พิชัย ยุติธรรม (JUDGE)', 'OFFICIAL'),
('res-4', 'comp-2026', 'ev-3', 'sch-2', 1, 'ชนะเลิศ', 'GOLD', '2 - 0 เซต (25-21, 25-19)', 'รอบชิงชนะเลิศ', 'อาจารย์พิชัย ยุติธรรม (JUDGE)', 'OFFICIAL'),
('res-5', 'comp-2026', 'ev-3', 'sch-1', 2, 'รองชนะเลิศอันดับ 1', 'SILVER', '0 - 2 เซต', 'รอบชิงชนะเลิศ', 'อาจารย์พิชัย ยุติธรรม (JUDGE)', 'OFFICIAL'),
('res-6', 'comp-2026', 'ev-5', 'sch-3', 1, 'ชนะเลิศ', 'GOLD', '12.45 วินาที', 'สถิติใหม่กลุ่มโรงเรียน', 'อาจารย์พิชัย ยุติธรรม (JUDGE)', 'OFFICIAL'),
('res-7', 'comp-2026', 'ev-5', 'sch-1', 2, 'รองชนะเลิศอันดับ 1', 'SILVER', '12.80 วินาที', 'รอบชิงชนะเลิศ', 'อาจารย์พิชัย ยุติธรรม (JUDGE)', 'OFFICIAL'),
('res-8', 'comp-2026', 'ev-6', 'sch-5', 1, 'ชนะเลิศ', 'GOLD', '13 - 8 คะแนน', 'รอบชิงชนะเลิศเปตอง', 'อาจารย์สมศักดิ์ ตัดสินเที่ยงตรง (JUDGE)', 'OFFICIAL'),
('res-9', 'comp-2026', 'ev-4', 'sch-8', 1, 'ชนะเลิศ', 'GOLD', '2 - 0 เซต', 'รอบชิงชนะเลิศเซปักตะกร้อ', 'อาจารย์สมศักดิ์ ตัดสินเที่ยงตรง (JUDGE)', 'OFFICIAL');

-- รายงานผลการแข่งขันรายคู่ (Match Reports)
INSERT INTO `match_reports` (`id`, `competition_id`, `sport_id`, `sport_name`, `event_name`, `team_1_school_id`, `team_1_school_name`, `team_1_score`, `team_2_school_id`, `team_2_school_name`, `team_2_score`, `winner_school_id`, `match_date`, `match_time`, `round_name`, `summary_text`, `reporter_name`, `status`) VALUES
('match-1', 'comp-2026', 'sp-football', 'ฟุตบอล 7 คน', 'ฟุตบอล 7 คน[ระดับชั้นประถมศึกษา]', 'sch-2', 'โรงเรียนบ้านโคกสว่าง', 3, 'sch-1', 'โรงเรียนบ้านหนองหว้า', 0, 'sch-2', '2026-11-16', '09:00', 'รอบแรก (สาย A)', 'โรงเรียนบ้านโคกสว่าง ชนะ โรงเรียนบ้านหนองหว้า 3 ต่อ 0', 'อาจารย์พิชัย ยุติธรรม', 'COMPLETED'),
('match-2', 'comp-2026', 'sp-volleyball', 'วอลเลย์บอล', 'วอลเลย์บอล[ระดับชั้นประถมศึกษา]', 'sch-3', 'โรงเรียนบ้านโคกสูงคูขาด', 2, 'sch-4', 'โรงเรียนบ้านบุกระสัง', 1, 'sch-3', '2026-11-16', '10:30', 'รอบรองชนะเลิศ', 'โรงเรียนบ้านโคกสูงคูขาด ชนะ โรงเรียนบ้านบุกระสัง 2 ต่อ 1 (เซต)', 'เกรียงไกร ข้อมูลสด', 'COMPLETED'),
('match-3', 'comp-2026', 'sp-sepaktakraw', 'เซปักตะกร้อ', 'เซปักตะกร้อ[ระดับชั้นประถมศึกษา]', 'sch-1', 'โรงเรียนบ้านหนองหว้า', 2, 'sch-6', 'โรงเรียนบ้านสระสะแก', 0, 'sch-1', '2026-11-16', '13:00', 'รอบชิงชนะเลิศ', 'โรงเรียนบ้านหนองหว้า ชนะ โรงเรียนบ้านสระสะแก 2 ต่อ 0 (เซต)', 'อาจารย์พิชัย ยุติธรรม', 'COMPLETED'),
('match-4', 'comp-2026', 'sp-petanque', 'เปตอง', 'เปตอง[ระดับชั้นประถมศึกษา]', 'sch-5', 'โรงเรียนบ้านโคกลอย', 13, 'sch-8', 'โรงเรียนบ้านตะกรุมทอง', 8, 'sch-5', '2026-11-16', '14:30', 'รอบชิงชนะเลิศ', 'โรงเรียนบ้านโคกลอย ชนะ โรงเรียนบ้านตะกรุมทอง 13 ต่อ 8 (คะแนน)', 'เกรียงไกร ข้อมูลสด', 'COMPLETED');

-- เกียรติบัตร (Certificates)
INSERT INTO `certificates` (`id`, `competition_id`, `certificate_no`, `recipient_type`, `recipient_id`, `recipient_name`, `school_id`, `school_name`, `event_id`, `event_name`, `sport_name`, `result_id`, `award`, `medal`, `issue_date`, `template_type`, `qr_token`, `status`) VALUES
('cert-1', 'comp-2026', 'สพป.บร.3/2569-00001', 'STUDENT', 'stu-1', 'เด็กชายธีรดนย์ สายสืบวงษ์', 'sch-1', 'โรงเรียนบ้านหนองหว้า', 'ev-1', 'ฟุตบอล 7 คน[ระดับชั้นประถมศึกษา]', 'ฟุตบอล 7 คน', 'res-1', 'รางวัลชนะเลิศ (เหรียญทอง 🥇)', 'GOLD', '2026-11-20', 'STUDENT', 'TOKEN_SSK69_CERT_00001_8F3A29B', 'GENERATED'),
('cert-2', 'comp-2026', 'สพป.บร.3/2569-00002', 'STUDENT', 'stu-2', 'เด็กชายกิตติภูมิ สุขสำราญ', 'sch-1', 'โรงเรียนบ้านหนองหว้า', 'ev-1', 'ฟุตบอล 7 คน[ระดับชั้นประถมศึกษา]', 'ฟุตบอล 7 คน', 'res-1', 'รางวัลชนะเลิศ (เหรียญทอง 🥇)', 'GOLD', '2026-11-20', 'STUDENT', 'TOKEN_SSK69_CERT_00002_9C4B18D', 'GENERATED'),
('cert-3', 'comp-2026', 'สพป.บร.3/2569-00003', 'COACH', 'coa-1', 'นายวิชัย ชำนาญกีฬา', 'sch-1', 'โรงเรียนบ้านหนองหว้า', 'ev-1', 'ฟุตบอล 7 คน[ระดับชั้นประถมศึกษา]', 'ฟุตบอล 7 คน', 'res-1', 'ครูผู้ฝึกสอนนักกีฬา รางวัลชนะเลิศ (เหรียญทอง 🥇)', 'GOLD', '2026-11-20', 'COACH', 'TOKEN_SSK69_CERT_00003_3D8E52A', 'GENERATED');

SET FOREIGN_KEY_CHECKS = 1;
