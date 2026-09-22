import { test, expect } from '@playwright/test'
test('studio month calendar selects shifts and saves a full-day rest in Vietnam time', async ({ page }) => {
  const today = new Intl.DateTimeFormat('en-CA',{timeZone:'Asia/Ho_Chi_Minh',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date())
  const booking = {id:'b1',code:'BM-TEST',status:'CONFIRMED',startAt:today+'T07:00:00+07:00',endAt:today+'T12:00:00+07:00',updatedAt:today+'T07:00:00+07:00',contact:{name:'Khách thử'},assignment:{photographerName:'Minh An'},package:{name:'Cá nhân'},total:{amount:'1500000'},paid:{amount:'500000'},remaining:{amount:'1000000'}}
  let blocks = [], submitted
  await page.route('**/api/v1/**', async route => {
    const p = new URL(route.request().url()).pathname
    if (p.endsWith('/blocked-schedules') && route.request().method()==='POST') { submitted = route.request().postDataJSON(); blocks=[{id:'rest',...submitted}] }
    if (p.endsWith('/blocked-schedules/rest') && route.request().method()==='DELETE') blocks=[]
    const data = p.endsWith('/auth/me') ? {user:{id:'a',role:'ADMIN',name:'Admin',emailVerified:true},csrfToken:'test'} : p.endsWith('/bookings') ? [booking] : p.endsWith('/blocked-schedules') ? blocks : p.endsWith('/booking-settings') ? {maxConcurrentBookings:2} : p.endsWith('/integrations/status') ? {services:[],outbox:[]} : p.endsWith('/catalog') ? {packages:[],addons:[],portfolio:[]} : []
    await route.fulfill({json:{data}})
  })
  await page.goto('/admin')
  await page.getByRole('button',{name:'Lịch studio',exact:true}).click()
  await expect(page.locator('.sc-shift h4')).toHaveText('Minh An')
  await page.locator('.studio-calendar').screenshot({path:'test-results/studio-calendar-desktop.png'})
  await page.getByRole('button',{name:'Tháng sau',exact:true}).click()
  await page.getByRole('button',{name:'+ Thêm khoảng studio nghỉ',exact:true}).click()
  await page.getByRole('button',{name:'Cả ngày',exact:true}).click()
  await page.getByLabel('Lý do nghỉ',{exact:true}).fill('Bảo trì')
  await page.getByRole('button',{name:'Lưu khoảng nghỉ',exact:true}).click()
  await expect(page.locator('.sc-rest-item')).toContainText('Bảo trì')
  expect(new Date(submitted.endAt)-new Date(submitted.startAt)).toBe(86400000)
  expect(submitted.startAt).toContain('T17:00:00.000Z')
  await page.getByRole('button',{name:'Mở lại lịch',exact:true}).click()
  await expect(page.locator('.sc-rest-item')).toHaveCount(0)
  await page.getByRole('button',{name:'Hôm nay',exact:true}).click()
  await page.setViewportSize({width:375,height:900})
  await page.locator('.studio-calendar').scrollIntoViewIfNeeded()
  await page.screenshot({path:'test-results/studio-calendar-mobile.png',fullPage:true})
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true)
})
