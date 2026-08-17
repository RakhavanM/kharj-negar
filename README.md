# خرج‌نگار

وب‌اپلیکیشن فارسی و موبایل‌فرندلی برای مدیریت هزینه‌ها و دارایی‌های مشترک رامین و مانا.

## نسخه‌ها

- **v0.1** — نسخه اولیه با visual language سبز و warm minimal.
- **v0.2** — بازطراحی آزمایشی با design language الهام‌گرفته از Uber.
- **v0.3** — بازطراحی با design language الهام‌گرفته از Wise.
- **v0.4** — اتصال نسخه production به backend امن، PostgreSQL و دامنه اختصاصی.
- **Savings assets** — بخش مستقل ثبت موجودی دارایی‌ها، جدا از domain هزینه‌ها.

نسخه فعلی از فونت **Vazirmatn** استفاده می‌کند و ظاهر Wise-inspired آن را برای تجربه فارسی حفظ می‌کند.

## نسخه‌های قابل مشاهده

- Demo و GitHub Pages: https://rakhavanm.github.io/kharj-negar/
- Production: https://kharjnegar.raminakhavan.ir/

GitHub Pages صرفاً برای مشاهده رابط کاربری و رفتار demo است. داده‌های آن در localStorage همان مرورگر ذخیره می‌شوند و برای اطلاعات مالی واقعی مناسب نیستند.

## امکانات

- ورود جداگانه برای `ramin` و `mana`
- فضای مشترک خانوادگی با دیتابیس مشترک در production
- ثبت، ویرایش و حذف هزینه
- مبلغ بر اساس هزار تومان؛ برای نمونه `500` یعنی `500,000 تومان`
- تاریخ شمسی و محاسبه ماه بر مبنای تقویم جلالی
- فیلد توضیحات اختیاری
- داشبورد ماهانه، تفکیک افراد و دسته‌بندی‌ها
- فیلتر فرد، دسته‌بندی، ماه و جست‌وجوی توضیحات
- responsive برای موبایل
- احراز هویت واقعی و session امن در نسخه production
- API با FastAPI و PostgreSQL
- اجرای backend با systemd و reverse proxy با Nginx
- بخش مستقل «پس‌اندازها» برای ثبت موجودی دارایی‌ها
- پشتیبانی از پول نقد، رمزارز، طلا و سایر دارایی‌ها
- مقدارهای اعشاری مانند `0.5 BTC` و `3.25 گرم`
- مالک دارایی: رامین، مانا یا مشترک

## وضعیت Demo و Production

### GitHub Pages

GitHub Pages نسخه demo است. در این نسخه:

- احراز هویت فقط نمایشی است.
- داده‌های هزینه و پس‌انداز در localStorage همان مرورگر ذخیره می‌شوند.
- برای ورود، نام کاربری `ramin` یا `mana` و هر رمز غیرخالی قابل استفاده است.
- اطلاعات این نسخه به production منتقل نمی‌شود.

### Production

نسخه production روی دامنه اختصاصی اجرا می‌شود و داده‌ها بین دستگاه‌ها مشترک هستند:

```text
https://kharjnegar.raminakhavan.ir
```

در production:

- frontend از build استاتیک سرو می‌شود.
- API پشت مسیر `/api/` قرار دارد.
- backend فقط روی `127.0.0.1:8000` گوش می‌دهد.
- PostgreSQL فقط روی localhost قابل دسترسی است.
- رمزها با Argon2id ذخیره می‌شوند.
- session و CSRF cookie فعال هستند.
- endpointهای مستندات FastAPI در production غیرفعال هستند.
- بخش پس‌انداز در جدول مستقل `savings_assets` ذخیره می‌شود و در summary هزینه‌ها وارد نمی‌شود.

## ساختار backend

```text
backend/
  app/
    auth.py
    bootstrap.py
    config.py
    db.py
    jalali.py
    main.py
    models.py
    rate_limit.py
    routes/
    schemas.py
    security.py
  migrations/
    versions/
deploy/
  kharj-negar-api.service
  kharjnegar.nginx.conf
  backup-kharj-negar.sh
```

## اجرای محلی frontend

```bash
npm install
npm run dev
```

## اجرای تست‌ها

```bash
npm test
npm run build
backend/.venv/bin/pytest backend/tests -q
```

## استقرار

جزئیات مسیرهای VPS، سرویس systemd، Nginx و backup در `deploy/README.md` قرار دارد. secretها و رمزهای production در Git قرار نمی‌گیرند.

## Backup

یک repository خصوصی جدا برای backupهای رمزنگاری‌شده استفاده می‌شود:

```text
RakhavanM/kharj-negar-backups
```

## License

Private personal project — all rights reserved.
