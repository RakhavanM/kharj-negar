from playwright.sync_api import sync_playwright

URL = "http://127.0.0.1:5173/"

with sync_playwright() as p:
    browser = p.chromium.launch(headless=True)
    for scheme in ("light", "dark"):
        page = browser.new_page(viewport={"width": 390, "height": 844}, color_scheme=scheme)
        errors = []
        page.on("pageerror", lambda error: errors.append(str(error)))
        page.goto(URL, wait_until="networkidle")
        assert page.locator(".login-form button[type=submit]").count() == 1
        page.get_by_label("نام کاربری").fill("ramin")
        page.get_by_label("رمز عبور").fill("demo-password")
        page.locator(".login-form button[type=submit]").click()
        page.get_by_role("button", name="تنظیمات").click()
        assert page.get_by_role("menuitem", name="تغییر پسورد").count() == 1
        assert page.get_by_role("menuitem", name="تعریف دسته‌بندی").count() == 1
        page.get_by_role("menuitem", name="تعریف دسته‌بندی").click()
        assert page.get_by_role("dialog", name="تعریف دسته‌بندی").count() == 1
        assert page.locator(".category-manager-row").count() == 8
        page.get_by_label("نام دسته‌بندی").fill("تفریح")
        page.get_by_role("button", name="افزودن").click()
        assert page.locator(".category-manager-row").filter(has_text="تفریح").count() == 1
        assert page.locator("body").evaluate("document.documentElement.scrollWidth <= innerWidth && document.body.scrollWidth <= innerWidth")
        assert not errors, errors
        print(f"{scheme} categories=8 custom=ok overflow=none errors=[]")
        page.close()
    browser.close()
