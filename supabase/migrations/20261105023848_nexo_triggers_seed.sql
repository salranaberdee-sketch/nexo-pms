CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, name, email, role)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'name', split_part(NEW.email,'@',1)),
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'role', 'viewer')
  );
  RETURN NEW;
END;
$$;

CREATE OR REPLACE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at = NOW(); RETURN NEW; END;
$$;

CREATE TRIGGER set_products_updated_at BEFORE UPDATE ON public.products FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER set_briefs_updated_at BEFORE UPDATE ON public.product_briefs FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER set_contents_updated_at BEFORE UPDATE ON public.contents FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER set_ads_updated_at BEFORE UPDATE ON public.ads FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER set_sales_updated_at BEFORE UPDATE ON public.sales FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

INSERT INTO public.products (product_id, name, business_type, product_type, brand, owner, start_date, status, notes) VALUES
  ('MED-PSY-001','คอร์สจิตวิทยาในโรงเรียน','การศึกษา','หลักสูตร','medFTU','ผู้จัดการหลักสูตร','2026-11-01','เตรียมเปิดตัว','ตัวอย่างสมมติ'),
  ('REB-KET-001','ผลิตภัณฑ์สนับสนุนการฟื้นฟูผู้ใช้เคตามีน','สุขภาพ','สินค้า','DEBORN / REBORN','ผู้จัดการผลิตภัณฑ์','2026-11-01','กำลังพัฒนา','ยังไม่ใช่ยารักษาการติดเคตามีน'),
  ('CLN-CIR-001','บริการขลิบไร้เลือด','คลินิก','บริการ','คลินิกหมอหมาด','ผู้จัดการคลินิก','2026-11-01','เปิดขาย','ชื่อการตลาดต้องสื่อสารอย่างถูกต้อง'),
  ('REB-REH-001','ศูนย์บำบัดรีบอร์น','ศูนย์ฟื้นฟู','บริการ','REBORN','ผู้จัดการศูนย์','2026-11-01','เปิดขาย','โปรแกรมประเมินและฟื้นฟูตามความเหมาะสมรายบุคคล');

INSERT INTO public.sales (product_id, period_start, period_end, sales_target_amount, sales_target_count, actual_sales, actual_received, status) VALUES
  ('MED-PSY-001','2026-11-01','2026-11-30',300000,300,20000,20000,'ยังไม่เริ่ม'),
  ('REB-KET-001','2026-11-01','2026-11-30',0,0,0,0,'ยังไม่เปิดขาย'),
  ('CLN-CIR-001','2026-11-01','2026-11-30',500000,100,5000,5000,'ยังไม่เริ่ม'),
  ('REB-REH-001','2026-11-01','2026-11-30',900000,15,30000,10000,'ยังไม่เริ่ม');

INSERT INTO public.ads (product_id, month, budget_approved, campaign_name, channel, content_ref, managed_by, start_date, end_date, budget_allocated, budget_spent, reach, clicks, leads, sales_amount, result_notes, next_action) VALUES
  ('MED-PSY-001','2026-11',30000,'เปิดรับสมัครคอร์ส','Facebook','โปสเตอร์เปิดรับสมัคร','ทีม ADS','2026-11-04','2026-11-18',18000,6000,20000,500,40,0,'กำลังทดสอบ','ทดสอบ Hook เพิ่ม'),
  ('CLN-CIR-001','2026-11',20000,'ให้ความรู้บริการขลิบ','Facebook','คำแนะนำก่อนขลิบ','ทีม ADS','2026-11-04','2026-11-30',20000,4500,15000,320,25,0,'กำลังทดสอบ','ตรวจข้อความโฆษณา'),
  ('REB-REH-001','2026-11',40000,'ให้ความรู้และปรึกษาศูนย์','Facebook','แนะนำศูนย์','ทีม ADS','2026-11-04','2026-11-30',40000,10000,35000,700,32,0,'กำลังทดสอบ','ประเมินคุณภาพ Lead');
