-- Erstelle einen storage bucket f�r CSV-Dateien
INSERT INTO storage.buckets (id, name, public) 
VALUES ('csv_reports', 'CSV-Berichte', false)
ON CONFLICT (id) DO NOTHING;
