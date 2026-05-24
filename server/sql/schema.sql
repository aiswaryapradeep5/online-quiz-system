-- Online Quiz System schema (MySQL 8+)
DROP DATABASE IF EXISTS quiz_app;
CREATE DATABASE quiz_app CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE quiz_app;

CREATE TABLE users (
  id            INT AUTO_INCREMENT PRIMARY KEY,
  email         VARCHAR(190) NOT NULL UNIQUE,
  password_hash VARCHAR(255) NOT NULL,
  name          VARCHAR(120) NOT NULL,
  role          ENUM('user','admin') NOT NULL DEFAULT 'user',
  created_at    TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB;

CREATE TABLE quizzes (
  id               INT AUTO_INCREMENT PRIMARY KEY,
  title            VARCHAR(200) NOT NULL,
  description      TEXT,
  duration_seconds INT NOT NULL CHECK (duration_seconds BETWEEN 30 AND 86400),
  is_published     TINYINT(1) NOT NULL DEFAULT 0,
  created_by       INT NOT NULL,
  created_at       TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_quiz_user FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE RESTRICT,
  INDEX idx_quiz_pub (is_published)
) ENGINE=InnoDB;

CREATE TABLE questions (
  id        INT AUTO_INCREMENT PRIMARY KEY,
  quiz_id   INT NOT NULL,
  text      TEXT NOT NULL,
  points    INT NOT NULL DEFAULT 1 CHECK (points > 0),
  position  INT NOT NULL DEFAULT 0,
  CONSTRAINT fk_q_quiz FOREIGN KEY (quiz_id) REFERENCES quizzes(id) ON DELETE CASCADE,
  INDEX idx_q_quiz (quiz_id)
) ENGINE=InnoDB;

CREATE TABLE options (
  id          INT AUTO_INCREMENT PRIMARY KEY,
  question_id INT NOT NULL,
  text        VARCHAR(500) NOT NULL,
  is_correct  TINYINT(1) NOT NULL DEFAULT 0,
  CONSTRAINT fk_opt_q FOREIGN KEY (question_id) REFERENCES questions(id) ON DELETE CASCADE,
  INDEX idx_opt_q (question_id)
) ENGINE=InnoDB;

CREATE TABLE attempts (
  id           INT AUTO_INCREMENT PRIMARY KEY,
  user_id      INT NOT NULL,
  quiz_id      INT NOT NULL,
  started_at   DATETIME NOT NULL,
  expires_at   DATETIME NOT NULL,
  submitted_at DATETIME NULL,
  score        INT NULL,
  total_points INT NULL,
  status       ENUM('in_progress','submitted','expired') NOT NULL DEFAULT 'in_progress',
  CONSTRAINT fk_att_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  CONSTRAINT fk_att_quiz FOREIGN KEY (quiz_id) REFERENCES quizzes(id) ON DELETE CASCADE,
  INDEX idx_att_user (user_id),
  INDEX idx_att_quiz (quiz_id)
) ENGINE=InnoDB;

CREATE TABLE attempt_answers (
  id          INT AUTO_INCREMENT PRIMARY KEY,
  attempt_id  INT NOT NULL,
  question_id INT NOT NULL,
  option_id   INT NOT NULL,
  CONSTRAINT fk_aa_att FOREIGN KEY (attempt_id) REFERENCES attempts(id) ON DELETE CASCADE,
  CONSTRAINT fk_aa_q   FOREIGN KEY (question_id) REFERENCES questions(id) ON DELETE CASCADE,
  CONSTRAINT fk_aa_opt FOREIGN KEY (option_id)   REFERENCES options(id)   ON DELETE CASCADE,
  UNIQUE KEY uq_attempt_question (attempt_id, question_id)
) ENGINE=InnoDB;

-- Seed admin: email admin@quiz.local / password Admin@123
-- (bcrypt hash of 'Admin@123', cost 10)
INSERT INTO users (email, password_hash, name, role) VALUES
('admin@quiz.gmail.com',
 '$2a$10$N1qz1XQYwQ6m6Yy3a8m8nO0p8nKQ7VqLb6m5p4p3l2k1j0i9h8g7f',
 'Default Admin', 'admin');

-- Sample quiz
INSERT INTO quizzes (title, description, duration_seconds, is_published, created_by)
VALUES ('General Knowledge', 'A short sample quiz.', 120, 1, 1);

INSERT INTO questions (quiz_id, text, points, position) VALUES
(1, 'What is the capital of France?', 1, 1),
(1, '2 + 2 * 2 = ?', 1, 2);

INSERT INTO options (question_id, text, is_correct) VALUES
(1, 'Paris', 1), (1, 'London', 0), (1, 'Berlin', 0), (1, 'Madrid', 0),
(2, '6', 1), (2, '8', 0), (2, '4', 0), (2, '10', 0);
