import asyncio
from playwright.async_api import async_playwright

async def test_chinese_menu():
    async with async_playwright() as p:
        browser = await p.chromium.launch(headless=True)
        context = await browser.new_context(locale='zh-CN')
        page = await context.new_page()
        
        # Navigate to the page
        print("Navigating to http://127.0.0.1:5000/")
        await page.goto('http://127.0.0.1:5000/', wait_until='networkidle')
        await asyncio.sleep(3)
        
        # Find and click the CN button
        lang_btn = await page.query_selector('#lang-toggle')
        if lang_btn:
            btn_text = await lang_btn.text_content()
            print(f"Lang button text: '{btn_text}'")
            if btn_text and btn_text.strip() == 'CN':
                print("Clicking CN button to switch to Chinese...")
                await lang_btn.click()
                await asyncio.sleep(2)
        else:
            print("ERROR: Lang toggle button not found!")
            # Try to find it by class
            btns = await page.query_selector_all('.lang-toggle-btn')
            print(f"Found {len(btns)} buttons with class lang-toggle-btn")
            for b in btns:
                text = await b.text_content()
                print(f"  Button text: '{text}'")
        
        # Open the menu by clicking the menu button
        menu_btn = await page.query_selector('.menu-btn')
        if menu_btn:
            print("Clicking menu button...")
            await menu_btn.click()
            await asyncio.sleep(1)
        else:
            print("WARNING: Menu button not found")
        
        # Check menu items
        menu_links = await page.query_selector_all('.main-menu__link')
        print(f"\nFound {len(menu_links)} menu links:")
        for link in menu_links:
            text = await link.text_content()
            style = await link.get_attribute('style')
            print(f"  - '{text.strip()}' (style: {style})")
        
        # Check if they are Chinese
        chinese_keywords = ['\u65e5\u5fd7', '\u76ee\u51fb', '\u7f51\u7edc', '\u89c6\u9891', '\u4e8b\u4ef6', '\u5e2e\u52a9', '\u4e09\u661f', '\u4e0b\u8f7d']
        all_text = ' '.join([await link.text_content() for link in menu_links])
        found_chinese = [kw for kw in chinese_keywords if kw in all_text]
        print(f"\nFound Chinese keywords: {found_chinese}")
        
        # Take screenshot
        await page.screenshot(path='test_screenshots/menu_chinese_test.png', full_page=True)
        print("Screenshot saved to test_screenshots/menu_chinese_test.png")
        
        await browser.close()
        
        if len(found_chinese) >= 3:
            print("\nSUCCESS: Menu is showing Chinese text!")
            return True
        else:
            print("\nFAILED: Menu is still showing English")
            return False

result = asyncio.run(test_chinese_menu())
print(f"\nTest result: {result}")
