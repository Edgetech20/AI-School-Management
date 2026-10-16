export type Student = {
  id: number;
  name: string;
  class_name: string;
  roll_number: string;
  parent_phone: string;
  parent_email: string;
  face_samples?: number;
  has_face?: boolean;
};

export type AttendanceLog = {
  id: number;
  student_id: number;
  date: string;
  check_in_time: string | null;
  check_out_time: string | null;
  status: string;
  last_match_confidence: number | null;
};

export type RuleConfig = {
  id: number;
  school_start_time: string;
  late_threshold_time: string;
  minimum_hours: number;
};

export type NotificationLog = {
  id: number;
  student_id: number | null;
  message: string;
  type: string;
  sent_at: string;
};

export type RecognitionReviewRead = {
  id: number;
  student_id: number;
  event_type: string;
  device_id: string;
  confidence: number;
  margin: number;
  status: string;
  face_image_path: string | null;
  image_data: string | null;
  expires_at: string;
  created_at: string;
};

export type AdminUser = {
  id: number;
  username: string;
  role: "admin" | "teacher";
  class_name: string | null;
  is_active: boolean;
};

export type ClassItem = {
  id: number;
  name: string;
};

export type NotificationSettings = {
  smtp_enabled: boolean;
  sms_enabled: boolean;
  hybrid_learning_enabled: boolean;
  smtp_host: string;
  smtp_port: number;
  smtp_username: string;
  smtp_password: string;
  smtp_encryption: "none" | "tls" | "ssl";
  smtp_from_email: string;
  smtp_from_name: string;
  sms_provider: "console" | "webhook";
  sms_webhook_url: string;
  parent_notifications_enabled: boolean;
};

export type RecognitionAccuracyMetrics = {
  accuracy_percent: number;
  total_samples: number;
  total_students: number;
  adaptive_samples_count: number;
};
