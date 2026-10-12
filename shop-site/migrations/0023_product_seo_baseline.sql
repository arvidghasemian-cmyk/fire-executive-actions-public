-- SEO baseline copy for the eight original public catalog items.
-- Only fills empty fields; never overwrites operator-entered product data.
-- This intentionally does NOT set brand, model, image_is_sample or seo_ready.

UPDATE products
SET
  description = CASE WHEN LENGTH(TRIM(COALESCE(description,'')))=0 THEN 'این صفحه برای ثبت و مقایسه مشخصات نشت‌یاب گاز شهری است. پیش از خرید، نوع گاز هدف، ولتاژ تغذیه، روش هشدار، خروجی رله، شرایط نصب و اطلاعات واقعی برند و مدل را بررسی کنید.' ELSE description END,
  seo_title = CASE WHEN LENGTH(TRIM(COALESCE(seo_title,'')))=0 THEN 'خرید نشت‌یاب گاز شهری | سروش ایمنی شهر' ELSE seo_title END,
  seo_description = CASE WHEN LENGTH(TRIM(COALESCE(seo_description,'')))=0 THEN 'بررسی و خرید نشت‌یاب گاز شهری با توجه به نوع گاز هدف، تغذیه، خروجی هشدار، شرایط نصب و مشخصات واقعی مدل در سروش ایمنی شهر.' ELSE seo_description END
WHERE slug='city-gas-leak-detector';

UPDATE products
SET
  description = CASE WHEN LENGTH(TRIM(COALESCE(description,'')))=0 THEN 'برای انتخاب کپسول آتش نشانی پودر و گاز، ظرفیت، نوع عامل اطفا، وزن قابل حمل، فشار، شرایط نصب و مشخصات واقعی سازنده را با نوع خطر محل تطبیق دهید.' ELSE description END,
  seo_title = CASE WHEN LENGTH(TRIM(COALESCE(seo_title,'')))=0 THEN 'خرید کپسول آتش نشانی پودر و گاز | سروش ایمنی شهر' ELSE seo_title END,
  seo_description = CASE WHEN LENGTH(TRIM(COALESCE(seo_description,'')))=0 THEN 'خرید کپسول آتش نشانی پودر و گاز با راهنمای بررسی ظرفیت، نوع عامل اطفا، شرایط نصب و مشخصات واقعی برند و مدل.' ELSE seo_description END
WHERE slug='dry-powder-fire-extinguisher';

UPDATE products
SET
  description = CASE WHEN LENGTH(TRIM(COALESCE(description,'')))=0 THEN 'برای انتخاب اسپرینکلر آتش نشانی، نوع نصب، K-factor، دمای عملکرد، نوع پاسخ، سایز اتصال و مشخصات واقعی مدل باید با طراحی و محاسبات شبکه هماهنگ شود.' ELSE description END,
  seo_title = CASE WHEN LENGTH(TRIM(COALESCE(seo_title,'')))=0 THEN 'خرید اسپرینکلر آتش نشانی | سروش ایمنی شهر' ELSE seo_title END,
  seo_description = CASE WHEN LENGTH(TRIM(COALESCE(seo_description,'')))=0 THEN 'خرید اسپرینکلر آتش نشانی با بررسی نوع نصب، K-factor، دمای عملکرد، نوع پاسخ، سایز اتصال و مشخصات فنی مدل.' ELSE seo_description END
WHERE slug='fire-sprinkler';

UPDATE products
SET
  description = CASE WHEN LENGTH(TRIM(COALESCE(description,'')))=0 THEN 'برای انتخاب دتکتور دود اعلام حریق، نوع سیستم، سازگاری با پنل، ولتاژ، شرایط محیطی، روش نصب و مشخصات واقعی برند و مدل باید بررسی شود.' ELSE description END,
  seo_title = CASE WHEN LENGTH(TRIM(COALESCE(seo_title,'')))=0 THEN 'خرید دتکتور دود اعلام حریق | سروش ایمنی شهر' ELSE seo_title END,
  seo_description = CASE WHEN LENGTH(TRIM(COALESCE(seo_description,'')))=0 THEN 'خرید دتکتور دود اعلام حریق با بررسی سازگاری پنل، نوع سیستم، ولتاژ، شرایط نصب و مشخصات واقعی محصول.' ELSE seo_description END
WHERE slug='fire-alarm-smoke-detector';

UPDATE products
SET
  description = CASE WHEN LENGTH(TRIM(COALESCE(description,'')))=0 THEN 'برای انتخاب دتکتور حرارت اعلام حریق، نوع عملکرد حرارتی، محدوده دمایی، شرایط محیط، سازگاری با پنل و مشخصات واقعی سازنده را بررسی کنید.' ELSE description END,
  seo_title = CASE WHEN LENGTH(TRIM(COALESCE(seo_title,'')))=0 THEN 'خرید دتکتور حرارت اعلام حریق | سروش ایمنی شهر' ELSE seo_title END,
  seo_description = CASE WHEN LENGTH(TRIM(COALESCE(seo_description,'')))=0 THEN 'خرید دتکتور حرارت اعلام حریق با بررسی نوع عملکرد، شرایط محیطی، سازگاری با پنل و مشخصات واقعی برند و مدل.' ELSE seo_description END
WHERE slug='fire-alarm-heat-detector';

UPDATE products
SET
  description = CASE WHEN LENGTH(TRIM(COALESCE(description,'')))=0 THEN 'برای انتخاب پنل اعلام حریق، نوع سیستم، تعداد زون یا ظرفیت آدرس‌دهی، ورودی‌ها و خروجی‌ها، تغذیه و سازگاری با تجهیزات میدانی باید بر اساس مشخصات واقعی مدل بررسی شود.' ELSE description END,
  seo_title = CASE WHEN LENGTH(TRIM(COALESCE(seo_title,'')))=0 THEN 'خرید پنل اعلام حریق | سروش ایمنی شهر' ELSE seo_title END,
  seo_description = CASE WHEN LENGTH(TRIM(COALESCE(seo_description,'')))=0 THEN 'خرید پنل اعلام حریق با بررسی نوع سیستم، ظرفیت، ورودی و خروجی، تغذیه و سازگاری تجهیزات بر اساس مشخصات واقعی مدل.' ELSE seo_description END
WHERE slug='fire-alarm-control-panel';

UPDATE products
SET
  description = CASE WHEN LENGTH(TRIM(COALESCE(description,'')))=0 THEN 'برای انتخاب آژیر فلاشر اعلام حریق، ولتاژ، جریان مصرفی، سطح هشدار، روش تحریک، شرایط نصب و سازگاری با سیستم و پنل باید برای مدل واقعی کنترل شود.' ELSE description END,
  seo_title = CASE WHEN LENGTH(TRIM(COALESCE(seo_title,'')))=0 THEN 'خرید آژیر فلاشر اعلام حریق | سروش ایمنی شهر' ELSE seo_title END,
  seo_description = CASE WHEN LENGTH(TRIM(COALESCE(seo_description,'')))=0 THEN 'خرید آژیر فلاشر اعلام حریق با بررسی ولتاژ، جریان، روش تحریک، شرایط نصب و سازگاری با سیستم اعلام حریق.' ELSE seo_description END
WHERE slug='fire-alarm-sounder-beacon';

UPDATE products
SET
  description = CASE WHEN LENGTH(TRIM(COALESCE(description,'')))=0 THEN 'برای انتخاب شستی اعلام حریق، نوع سیستم، روش ریست، ولتاژ، شرایط نصب، درجه حفاظت و سازگاری با پنل باید بر اساس مشخصات واقعی برند و مدل بررسی شود.' ELSE description END,
  seo_title = CASE WHEN LENGTH(TRIM(COALESCE(seo_title,'')))=0 THEN 'خرید شستی اعلام حریق | سروش ایمنی شهر' ELSE seo_title END,
  seo_description = CASE WHEN LENGTH(TRIM(COALESCE(seo_description,'')))=0 THEN 'خرید شستی اعلام حریق با بررسی نوع سیستم، روش ریست، شرایط نصب، سازگاری با پنل و مشخصات واقعی مدل.' ELSE seo_description END
WHERE slug='fire-alarm-manual-call-point';
