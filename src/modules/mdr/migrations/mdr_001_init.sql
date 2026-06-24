-- MDR Builder — M7 (Manufacturing Data Record / Hồ sơ chất lượng bàn giao)
-- Soft references to qaqc_projects(id), sys_users(id).

CREATE TABLE IF NOT EXISTS mdr_dossiers (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id      UUID REFERENCES qaqc_projects(id),
  name            VARCHAR(300) NOT NULL,
  status          VARCHAR(20) NOT NULL DEFAULT 'draft',   -- draft | in_progress | ready | submitted
  completion_pct  NUMERIC(5,2) NOT NULL DEFAULT 0,
  created_by      INT REFERENCES sys_users(id),
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_mdr_dossier_project ON mdr_dossiers(project_id);
CREATE INDEX IF NOT EXISTS idx_mdr_dossier_status  ON mdr_dossiers(status);

CREATE TABLE IF NOT EXISTS mdr_categories (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  dossier_id  UUID NOT NULL REFERENCES mdr_dossiers(id) ON DELETE CASCADE,
  code        VARCHAR(30) NOT NULL,
  name_vi     VARCHAR(200) NOT NULL,
  order_no    INT NOT NULL DEFAULT 0,
  required    BOOLEAN NOT NULL DEFAULT TRUE,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_mdr_cat_dossier ON mdr_categories(dossier_id);

CREATE TABLE IF NOT EXISTS mdr_documents (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  dossier_id    UUID NOT NULL REFERENCES mdr_dossiers(id) ON DELETE CASCADE,
  category_id   UUID NOT NULL REFERENCES mdr_categories(id) ON DELETE CASCADE,
  doc_name      VARCHAR(300) NOT NULL,
  file_link     TEXT,
  source_module VARCHAR(50),                              -- qaqc | mir | ncr | manual ...
  status        VARCHAR(20) NOT NULL DEFAULT 'missing',   -- present | missing
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_mdr_doc_dossier  ON mdr_documents(dossier_id);
CREATE INDEX IF NOT EXISTS idx_mdr_doc_category ON mdr_documents(category_id);
CREATE INDEX IF NOT EXISTS idx_mdr_doc_status   ON mdr_documents(status);

-- Document Transmittal (ILS-QAC-F13)
CREATE TABLE IF NOT EXISTS mdr_transmittals (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  dossier_id       UUID NOT NULL REFERENCES mdr_dossiers(id) ON DELETE CASCADE,
  transmittal_no   VARCHAR(50) NOT NULL,
  client           VARCHAR(200),
  purpose          VARCHAR(300),
  doc_count        INT NOT NULL DEFAULT 0,
  remarks          TEXT,
  issued_by        INT REFERENCES sys_users(id),
  issued_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_mdr_trans_dossier ON mdr_transmittals(dossier_id);

-- Catalogue of 16 standard MDR categories (template; copied into each dossier on creation).
CREATE TABLE IF NOT EXISTS mdr_category_catalog (
  code      VARCHAR(30) PRIMARY KEY,
  name_vi   VARCHAR(200) NOT NULL,
  order_no  INT NOT NULL,
  required  BOOLEAN NOT NULL DEFAULT TRUE
);

INSERT INTO mdr_category_catalog (code, name_vi, order_no, required) VALUES
  ('MATERIAL_CERT', 'Chứng chỉ vật liệu (MTC)',                 1,  TRUE),
  ('CUTTING',       'Cắt phôi',                                 2,  TRUE),
  ('FITUP',         'Lắp ghép (Fit-up)',                        3,  TRUE),
  ('WELDING',       'Hàn (WPS/PQR/WPQ & nhật ký hàn)',          4,  TRUE),
  ('NDT',           'Kiểm tra không phá hủy (NDT)',             5,  TRUE),
  ('DIMENSIONAL',   'Kiểm tra kích thước',                      6,  TRUE),
  ('PAINTING',      'Sơn / Độ dày màng sơn (DFT)',              7,  TRUE),
  ('PRESSURE_TEST', 'Thử áp lực / Thử kín',                     8,  TRUE),
  ('INSULATION',    'Bảo ôn / Cách nhiệt',                      9,  FALSE),
  ('HEAT_TREAT',    'Xử lý nhiệt (PWHT)',                      10,  FALSE),
  ('PACKING',       'Đóng gói',                                11,  TRUE),
  ('ASBUILT',       'Bản vẽ hoàn công (As-built)',             12,  TRUE),
  ('COC',           'Giấy chứng nhận xuất xưởng (CoC)',        13,  TRUE),
  ('NCR_LOG',       'Sổ theo dõi NCR / CAPA',                  14,  FALSE),
  ('CALIBRATION',   'Hồ sơ hiệu chuẩn thiết bị',               15,  FALSE),
  ('FINAL_INSP',    'Biên bản nghiệm thu cuối (FAT)',          16,  TRUE)
ON CONFLICT (code) DO NOTHING;
