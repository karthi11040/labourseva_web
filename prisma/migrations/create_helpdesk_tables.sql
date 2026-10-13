-- LabourSeva Helpdesk Ticket System Tables
-- Run this script to create the required tables

CREATE TABLE IF NOT EXISTS helpdesk_tickets (
  id INT AUTO_INCREMENT PRIMARY KEY,
  reference_no VARCHAR(24) UNIQUE NOT NULL,
  type VARCHAR(30) NOT NULL DEFAULT 'HELPDESK',
  status VARCHAR(30) NOT NULL DEFAULT 'OPEN',
  priority VARCHAR(20) NOT NULL DEFAULT 'NORMAL',
  category VARCHAR(60) DEFAULT NULL,
  subject VARCHAR(200) NOT NULL,
  description TEXT,
  contact_name VARCHAR(100) DEFAULT NULL,
  contact_phone VARCHAR(20) DEFAULT NULL,
  contact_email VARCHAR(100) DEFAULT NULL,
  user_id INT DEFAULT NULL,
  assigned_employee_id INT DEFAULT NULL,
  linked_application_id INT DEFAULT NULL,
  sla_hours INT DEFAULT 72,
  resolution_note TEXT DEFAULT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_status (status),
  INDEX idx_assigned (assigned_employee_id),
  INDEX idx_user (user_id),
  INDEX idx_priority (priority)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS helpdesk_messages (
  id BIGINT AUTO_INCREMENT PRIMARY KEY,
  ticket_id INT NOT NULL,
  author_type VARCHAR(20) NOT NULL DEFAULT 'CITIZEN',
  author_id INT DEFAULT NULL,
  author_name VARCHAR(100) DEFAULT NULL,
  body TEXT NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_ticket (ticket_id, created_at),
  FOREIGN KEY (ticket_id) REFERENCES helpdesk_tickets(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
