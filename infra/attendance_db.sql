
--
-- Table structure for table `admin_users`
--

CREATE TABLE `admin_users` (
  `id` int NOT NULL,
  `username` varchar(80) COLLATE utf8mb4_general_ci NOT NULL,
  `password_hash` varchar(255) COLLATE utf8mb4_general_ci NOT NULL,
  `role` varchar(20) COLLATE utf8mb4_general_ci NOT NULL,
  `is_active` tinyint(1) NOT NULL,
  `created_at` datetime NOT NULL,
  `class_name` varchar(60) COLLATE utf8mb4_general_ci DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `admin_users`
--

INSERT INTO `admin_users` (`id`, `username`, `password_hash`, `role`, `is_active`, `created_at`, `class_name`) VALUES
(1, 'admin', '$pbkdf2-sha256$29000$XEvJWct5D8EYI2TM2VvLGQ$sHGEix4p.95V0O3WPVkO/5karqL2naLvG3Ra5nEtMfM', 'admin', 1, '2026-03-19 17:38:05', NULL),
(2, 'teacher', '$pbkdf2-sha256$29000$y7kXQkjpPScE4Nw7hxCC8A$z3lGwZQytDZrrb69fDepT5iRRuDiTcqTbTW0oBpU2x0', 'teacher', 1, '2026-03-20 17:27:14', '10-A');

-- --------------------------------------------------------

--
-- Table structure for table `alembic_version`
--

CREATE TABLE `alembic_version` (
  `version_num` varchar(32) COLLATE utf8mb4_general_ci NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `alembic_version`
--

INSERT INTO `alembic_version` (`version_num`) VALUES
('6370aaedce28');

-- --------------------------------------------------------

--
-- Table structure for table `attendance_logs`
--

CREATE TABLE `attendance_logs` (
  `id` int NOT NULL,
  `student_id` int NOT NULL,
  `date` date NOT NULL,
  `check_in_time` datetime DEFAULT NULL,
  `check_out_time` datetime DEFAULT NULL,
  `status` varchar(20) COLLATE utf8mb4_general_ci NOT NULL,
  `last_match_confidence` float DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Table structure for table `audit_logs`
--

CREATE TABLE `audit_logs` (
  `id` int NOT NULL,
  `actor_username` varchar(80) COLLATE utf8mb4_general_ci NOT NULL,
  `actor_role` varchar(20) COLLATE utf8mb4_general_ci NOT NULL,
  `action` varchar(80) COLLATE utf8mb4_general_ci NOT NULL,
  `resource_type` varchar(40) COLLATE utf8mb4_general_ci NOT NULL,
  `resource_id` varchar(80) COLLATE utf8mb4_general_ci NOT NULL,
  `details` text COLLATE utf8mb4_general_ci NOT NULL,
  `created_at` datetime NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Table structure for table `camera_devices`
--

CREATE TABLE `camera_devices` (
  `id` int NOT NULL,
  `device_id` varchar(80) COLLATE utf8mb4_general_ci NOT NULL,
  `name` varchar(120) COLLATE utf8mb4_general_ci NOT NULL,
  `location` varchar(120) COLLATE utf8mb4_general_ci NOT NULL,
  `is_active` tinyint(1) NOT NULL,
  `created_at` datetime NOT NULL,
  `ip_address` varchar(64) COLLATE utf8mb4_general_ci DEFAULT NULL,
  `port` int DEFAULT NULL,
  `stream_url` varchar(255) COLLATE utf8mb4_general_ci DEFAULT NULL,
  `stream_username` varchar(120) COLLATE utf8mb4_general_ci DEFAULT NULL,
  `stream_password` varchar(255) COLLATE utf8mb4_general_ci DEFAULT NULL,
  `usage_tag` varchar(20) COLLATE utf8mb4_general_ci NOT NULL DEFAULT 'both'
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `camera_devices`
--

--
-- Table structure for table `classes`
--

CREATE TABLE `classes` (
  `id` int NOT NULL,
  `name` varchar(60) COLLATE utf8mb4_general_ci NOT NULL,
  `created_at` datetime NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `classes`
--

--
-- Table structure for table `face_encodings`
--

CREATE TABLE `face_encodings` (
  `id` int NOT NULL,
  `student_id` int NOT NULL,
  `encoding` text COLLATE utf8mb4_general_ci NOT NULL,
  `source` varchar(20) COLLATE utf8mb4_general_ci NOT NULL DEFAULT 'core',
  `quality_score` float DEFAULT NULL,
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `face_encodings`
--
--
-- Table structure for table `notifications`
--

CREATE TABLE `notifications` (
  `id` int NOT NULL,
  `student_id` int DEFAULT NULL,
  `message` text COLLATE utf8mb4_general_ci NOT NULL,
  `type` varchar(20) COLLATE utf8mb4_general_ci NOT NULL,
  `sent_at` datetime NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `notifications`
--

--
-- Table structure for table `recognition_events`
--

CREATE TABLE `recognition_events` (
  `id` int NOT NULL,
  `timestamp` datetime NOT NULL,
  `event_type` varchar(20) COLLATE utf8mb4_general_ci NOT NULL,
  `device_id` varchar(80) COLLATE utf8mb4_general_ci NOT NULL,
  `student_id` int DEFAULT NULL,
  `confidence` float DEFAULT NULL,
  `outcome` varchar(20) COLLATE utf8mb4_general_ci NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `recognition_events`
--

--
-- Table structure for table `recognition_jobs`
--

CREATE TABLE `recognition_jobs` (
  `id` int NOT NULL,
  `event_type` varchar(20) COLLATE utf8mb4_general_ci NOT NULL,
  `device_id` varchar(80) COLLATE utf8mb4_general_ci NOT NULL,
  `frame_blob` blob NOT NULL,
  `status` varchar(20) COLLATE utf8mb4_general_ci NOT NULL,
  `retry_count` int NOT NULL,
  `max_retries` int NOT NULL,
  `last_error` text COLLATE utf8mb4_general_ci NOT NULL,
  `created_at` datetime NOT NULL,
  `updated_at` datetime NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Table structure for table `recognition_reviews`
--

CREATE TABLE `recognition_reviews` (
  `id` int NOT NULL,
  `student_id` int NOT NULL,
  `event_type` varchar(20) COLLATE utf8mb4_general_ci NOT NULL,
  `device_id` varchar(80) COLLATE utf8mb4_general_ci NOT NULL,
  `confidence` float NOT NULL,
  `margin` float NOT NULL,
  `embedding` text COLLATE utf8mb4_general_ci NOT NULL,
  `face_image_path` varchar(255) COLLATE utf8mb4_general_ci DEFAULT NULL,
  `status` varchar(20) COLLATE utf8mb4_general_ci NOT NULL,
  `review_note` text COLLATE utf8mb4_general_ci NOT NULL,
  `reviewed_by` varchar(80) COLLATE utf8mb4_general_ci DEFAULT NULL,
  `reviewed_at` datetime DEFAULT NULL,
  `expires_at` datetime NOT NULL,
  `created_at` datetime NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `recognition_reviews`
--
--
-- Table structure for table `rules`
--

CREATE TABLE `rules` (
  `id` int NOT NULL,
  `school_start_time` varchar(5) COLLATE utf8mb4_general_ci NOT NULL,
  `late_threshold_time` varchar(5) COLLATE utf8mb4_general_ci NOT NULL,
  `minimum_hours` float NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `rules`
--
--
-- Table structure for table `students`
--

CREATE TABLE `students` (
  `id` int NOT NULL,
  `name` varchar(120) COLLATE utf8mb4_general_ci NOT NULL,
  `class` varchar(60) COLLATE utf8mb4_general_ci NOT NULL,
  `roll_number` varchar(40) COLLATE utf8mb4_general_ci NOT NULL,
  `parent_phone` varchar(30) COLLATE utf8mb4_general_ci NOT NULL,
  `parent_email` varchar(255) COLLATE utf8mb4_general_ci NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `students`
--
--
-- Table structure for table `system_settings`
--

CREATE TABLE `system_settings` (
  `id` int NOT NULL,
  `smtp_enabled` tinyint(1) NOT NULL,
  `sms_enabled` tinyint(1) NOT NULL,
  `smtp_host` varchar(191) COLLATE utf8mb4_general_ci DEFAULT NULL,
  `smtp_port` int NOT NULL,
  `smtp_username` varchar(191) COLLATE utf8mb4_general_ci DEFAULT NULL,
  `smtp_password` varchar(255) COLLATE utf8mb4_general_ci DEFAULT NULL,
  `smtp_encryption` varchar(20) COLLATE utf8mb4_general_ci NOT NULL,
  `smtp_from_email` varchar(191) COLLATE utf8mb4_general_ci DEFAULT NULL,
  `smtp_from_name` varchar(191) COLLATE utf8mb4_general_ci DEFAULT NULL,
  `sms_provider` varchar(20) COLLATE utf8mb4_general_ci NOT NULL,
  `sms_webhook_url` varchar(255) COLLATE utf8mb4_general_ci DEFAULT NULL,
  `parent_notifications_enabled` tinyint(1) NOT NULL,
  `updated_at` datetime NOT NULL,
  `hybrid_learning_enabled` tinyint(1) NOT NULL DEFAULT '0'
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `system_settings`
--

INSERT INTO `system_settings` (`id`, `smtp_enabled`, `sms_enabled`, `smtp_host`, `smtp_port`, `smtp_username`, `smtp_password`, `smtp_encryption`, `smtp_from_email`, `smtp_from_name`, `sms_provider`, `sms_webhook_url`, `parent_notifications_enabled`, `updated_at`, `hybrid_learning_enabled`) VALUES
(1, 1, 0, 'smtp.gmail.com', 465, 'websitesolution91@gmail.com', 'ngcwizgpuytllwoe', 'ssl', 'websitesolution91@gmail.com', 'School Attendance', 'console', '', 1, '2026-03-24 11:18:05', 1);

--
-- Indexes for dumped tables
--

--
-- Indexes for table `admin_users`
--
ALTER TABLE `admin_users`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `ix_admin_users_username` (`username`),
  ADD KEY `ix_admin_users_id` (`id`),
  ADD KEY `ix_admin_users_class_name` (`class_name`);

--
-- Indexes for table `alembic_version`
--
ALTER TABLE `alembic_version`
  ADD PRIMARY KEY (`version_num`);

--
-- Indexes for table `attendance_logs`
--
ALTER TABLE `attendance_logs`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `uq_student_date` (`student_id`,`date`),
  ADD KEY `ix_attendance_logs_student_id` (`student_id`),
  ADD KEY `ix_attendance_logs_id` (`id`),
  ADD KEY `ix_attendance_logs_date` (`date`);

--
-- Indexes for table `audit_logs`
--
ALTER TABLE `audit_logs`
  ADD PRIMARY KEY (`id`),
  ADD KEY `ix_audit_logs_actor_role` (`actor_role`),
  ADD KEY `ix_audit_logs_id` (`id`),
  ADD KEY `ix_audit_logs_action` (`action`),
  ADD KEY `ix_audit_logs_actor_username` (`actor_username`),
  ADD KEY `ix_audit_logs_resource_type` (`resource_type`),
  ADD KEY `ix_audit_logs_resource_id` (`resource_id`);

--
-- Indexes for table `camera_devices`
--
ALTER TABLE `camera_devices`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `ix_camera_devices_device_id` (`device_id`),
  ADD KEY `ix_camera_devices_id` (`id`),
  ADD KEY `ix_camera_devices_location` (`location`),
  ADD KEY `ix_camera_devices_usage_tag` (`usage_tag`);

--
-- Indexes for table `classes`
--
ALTER TABLE `classes`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `ix_classes_name` (`name`),
  ADD KEY `ix_classes_id` (`id`);

--
-- Indexes for table `face_encodings`
--
ALTER TABLE `face_encodings`
  ADD PRIMARY KEY (`id`),
  ADD KEY `student_id` (`student_id`),
  ADD KEY `ix_face_encodings_id` (`id`),
  ADD KEY `ix_face_encodings_source` (`source`);

--
-- Indexes for table `notifications`
--
ALTER TABLE `notifications`
  ADD PRIMARY KEY (`id`),
  ADD KEY `ix_notifications_student_id` (`student_id`),
  ADD KEY `ix_notifications_id` (`id`);

--
-- Indexes for table `recognition_events`
--
ALTER TABLE `recognition_events`
  ADD PRIMARY KEY (`id`),
  ADD KEY `ix_recognition_events_outcome` (`outcome`),
  ADD KEY `ix_recognition_events_id` (`id`),
  ADD KEY `ix_recognition_events_device_id` (`device_id`),
  ADD KEY `ix_recognition_events_timestamp` (`timestamp`),
  ADD KEY `ix_recognition_events_student_id` (`student_id`),
  ADD KEY `ix_recognition_events_event_type` (`event_type`);

--
-- Indexes for table `recognition_jobs`
--
ALTER TABLE `recognition_jobs`
  ADD PRIMARY KEY (`id`),
  ADD KEY `ix_recognition_jobs_id` (`id`),
  ADD KEY `ix_recognition_jobs_event_type` (`event_type`),
  ADD KEY `ix_recognition_jobs_device_id` (`device_id`),
  ADD KEY `ix_recognition_jobs_status` (`status`);

--
-- Indexes for table `recognition_reviews`
--
ALTER TABLE `recognition_reviews`
  ADD PRIMARY KEY (`id`),
  ADD KEY `ix_recognition_reviews_id` (`id`),
  ADD KEY `ix_recognition_reviews_student_id` (`student_id`),
  ADD KEY `ix_recognition_reviews_status` (`status`),
  ADD KEY `ix_recognition_reviews_expires_at` (`expires_at`),
  ADD KEY `ix_recognition_reviews_event_type` (`event_type`),
  ADD KEY `ix_recognition_reviews_device_id` (`device_id`);

--
-- Indexes for table `rules`
--
ALTER TABLE `rules`
  ADD PRIMARY KEY (`id`);

--
-- Indexes for table `students`
--
ALTER TABLE `students`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `roll_number` (`roll_number`),
  ADD KEY `ix_students_name` (`name`),
  ADD KEY `ix_students_class` (`class`),
  ADD KEY `ix_students_id` (`id`);

--
-- Indexes for table `system_settings`
--
ALTER TABLE `system_settings`
  ADD PRIMARY KEY (`id`);

--
-- AUTO_INCREMENT for dumped tables
--

--
-- AUTO_INCREMENT for table `admin_users`
--
ALTER TABLE `admin_users`
  MODIFY `id` int NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=3;

--
-- AUTO_INCREMENT for table `attendance_logs`
--
ALTER TABLE `attendance_logs`
  MODIFY `id` int NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `audit_logs`
--
ALTER TABLE `audit_logs`
  MODIFY `id` int NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=28;

--
-- AUTO_INCREMENT for table `camera_devices`
--
ALTER TABLE `camera_devices`
  MODIFY `id` int NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=2;

--
-- AUTO_INCREMENT for table `classes`
--
ALTER TABLE `classes`
  MODIFY `id` int NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=2;

--
-- AUTO_INCREMENT for table `face_encodings`
--
ALTER TABLE `face_encodings`
  MODIFY `id` int NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=6;

--
-- AUTO_INCREMENT for table `notifications`
--
ALTER TABLE `notifications`
  MODIFY `id` int NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=2;

--
-- AUTO_INCREMENT for table `recognition_events`
--
ALTER TABLE `recognition_events`
  MODIFY `id` int NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=2096;

--
-- AUTO_INCREMENT for table `recognition_jobs`
--
ALTER TABLE `recognition_jobs`
  MODIFY `id` int NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `recognition_reviews`
--
ALTER TABLE `recognition_reviews`
  MODIFY `id` int NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=2;

--
-- AUTO_INCREMENT for table `students`
--
ALTER TABLE `students`
  MODIFY `id` int NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=4;

--
-- Constraints for dumped tables
--

--
-- Constraints for table `attendance_logs`
--
ALTER TABLE `attendance_logs`
  ADD CONSTRAINT `attendance_logs_ibfk_1` FOREIGN KEY (`student_id`) REFERENCES `students` (`id`) ON DELETE CASCADE;

--
-- Constraints for table `face_encodings`
--
ALTER TABLE `face_encodings`
  ADD CONSTRAINT `face_encodings_ibfk_1` FOREIGN KEY (`student_id`) REFERENCES `students` (`id`) ON DELETE CASCADE;

--
-- Constraints for table `notifications`
--
ALTER TABLE `notifications`
  ADD CONSTRAINT `notifications_ibfk_1` FOREIGN KEY (`student_id`) REFERENCES `students` (`id`) ON DELETE SET NULL;

--
-- Constraints for table `recognition_events`
--
ALTER TABLE `recognition_events`
  ADD CONSTRAINT `recognition_events_ibfk_1` FOREIGN KEY (`student_id`) REFERENCES `students` (`id`) ON DELETE SET NULL;

--
-- Constraints for table `recognition_reviews`
--
ALTER TABLE `recognition_reviews`
  ADD CONSTRAINT `recognition_reviews_ibfk_1` FOREIGN KEY (`student_id`) REFERENCES `students` (`id`) ON DELETE CASCADE;
COMMIT;
