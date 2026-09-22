import { test, expect } from '@playwright/test';

const ADDRESS='123 Main Road, Claremont, Cape Town';
const base=()=>process.env.BASE_URL||'https://eix-property-score-beta.vercel.app';
async function home(page){await page.goto('/');await page.waitForLoadState('domcontentloaded');}
async function minForm(page,wa='+27821234567'){
  await page.locator('input[placeholder="e.g. Thabo Mokoena"]').fill('QA Buyer');
  await page.locator('input[placeholder="you@email.com"]').fill('qa@example.com');
  await page.locator('input[placeholder="+44 7700 900123"]').fill(wa);
  await page.locator('input[placeholder*="Paste a Property24"]').fill(ADDRESS);
  await page.getByText('Choose your property goal').click();
  await page.getByText('Buy to Live',{exact:true}).click();
}

test.describe('EiX Property Score — production launch verification',()=>{
  test.describe('Landing and navigation',()=>{
    const cases=[
      ['home 200',async p=>expect((await p.goto('/'))?.status()).toBe(200)],
      ['title',async p=>{await home(p);await expect(p).toHaveTitle(/EiX|Property/i)}],
      ['logo',async p=>{await home(p);await expect(p.locator('img[alt="EiXPropScore"]').first()).toBeVisible()}],
      ['R149 CTA',async p=>{await home(p);await expect(p.getByText(/Know Before You Buy — R149/i).first()).toBeVisible()}],
      ['international CTA',async p=>{await home(p);await expect(p.getByText(/Buying from overseas/i).first()).toBeVisible()}],
      ['how section',async p=>{await home(p);await expect(p.locator('#how')).toBeVisible()}],
      ['report section',async p=>{await home(p);await expect(p.locator('#report')).toBeVisible()}],
      ['form section',async p=>{await home(p);await expect(p.locator('#form')).toBeVisible()}],
      ['Property24 label',async p=>{await home(p);await expect(p.getByText('Property24',{exact:true}).first()).toBeVisible()}],
      ['Private Property label',async p=>{await home(p);await expect(p.getByText('Private Property',{exact:true}).first()).toBeVisible()}],
      ['agency label',async p=>{await home(p);await expect(p.getByText('Agency listings',{exact:true}).first()).toBeVisible()}],
      ['address label',async p=>{await home(p);await expect(p.getByText('Address search',{exact:true}).first()).toBeVisible()}],
      ['evidence copy',async p=>{await home(p);await expect(p.getByText(/Evidence before opinion/i).first()).toBeVisible()}],
      ['24hr copy',async p=>{await home(p);await expect(p.getByText(/24 hrs/i).first()).toBeVisible()}],
      ['international page 200',async p=>{const r=await p.goto('/international-buyers');expect(r?.status()).toBe(200)}],
      ['international heading',async p=>{await p.goto('/international-buyers');await expect(p.getByText(/International Buyer Intelligence/i).first()).toBeVisible()}],
      ['404 route handled',async p=>{const r=await p.goto('/does-not-exist-qa');expect([200,404]).toContain(r?.status())}],
      ['home no pageerror',async p=>{const e=[];p.on('pageerror',x=>e.push(x.message));await home(p);expect(e).toEqual([])}],
      ['international no pageerror',async p=>{const e=[];p.on('pageerror',x=>e.push(x.message));await p.goto('/international-buyers');await p.waitForLoadState('networkidle');expect(e).toEqual([])}],
    ];
    for(const [n,fn] of cases)test(n,async({page})=>fn(page));
  });

  test.describe('Form validation and positive flows',()=>{
    const cases=[
      ['name field',async p=>{await home(p);await expect(p.locator('input[placeholder="e.g. Thabo Mokoena"]')).toBeVisible()}],
      ['email field',async p=>{await home(p);await expect(p.locator('input[placeholder="you@email.com"]')).toBeVisible()}],
      ['WhatsApp field',async p=>{await home(p);await expect(p.locator('input[placeholder="+44 7700 900123"]')).toBeVisible()}],
      ['property field',async p=>{await home(p);await expect(p.locator('input[placeholder*="Paste a Property24"]').first()).toBeVisible()}],
      ['goal control',async p=>{await home(p);await expect(p.getByText('Choose your property goal')).toBeVisible()}],
      ['Property24 detection',async p=>{await home(p);await p.locator('input[placeholder*="Paste a Property24"]').fill('https://www.property24.com/for-sale/example/123');await expect(p.getByText(/Property24/i).last()).toBeVisible()}],
      ['Private Property detection',async p=>{await home(p);await p.locator('input[placeholder*="Paste a Property24"]').fill('https://www.privateproperty.co.za/for-sale/example');await expect(p.getByText(/Private Property/i).last()).toBeVisible()}],
      ['address detection',async p=>{await home(p);await p.locator('input[placeholder*="Paste a Property24"]').fill(ADDRESS);await expect(p.getByText(/Address/i).last()).toBeVisible()}],
      ['empty form',async p=>{await home(p);await p.getByRole('button',{name:/Analyse My Property/i}).click();await expect(p.getByText(/Full name required/i)).toBeVisible()}],
      ['short name',async p=>{await home(p);await p.locator('input[placeholder="e.g. Thabo Mokoena"]').fill('A');await p.getByRole('button',{name:/Analyse My Property/i}).click();await expect(p.getByText(/Full name required/i)).toBeVisible()}],
      ['invalid email',async p=>{await home(p);await p.locator('input[placeholder="e.g. Thabo Mokoena"]').fill('QA Buyer');await p.locator('input[placeholder="you@email.com"]').fill('bad');await p.getByRole('button',{name:/Analyse My Property/i}).click();await expect(p.getByText(/Valid email required/i)).toBeVisible()}],
      ['invalid WhatsApp',async p=>{await home(p);await p.locator('input[placeholder="e.g. Thabo Mokoena"]').fill('QA Buyer');await p.locator('input[placeholder="you@email.com"]').fill('qa@example.com');await p.locator('input[placeholder="+44 7700 900123"]').fill('abc');await p.getByRole('button',{name:/Analyse My Property/i}).click();await expect(p.getByText(/Valid WhatsApp number required/i)).toBeVisible()}],
      ['missing property',async p=>{await home(p);await p.locator('input[placeholder="e.g. Thabo Mokoena"]').fill('QA Buyer');await p.locator('input[placeholder="you@email.com"]').fill('qa@example.com');await p.locator('input[placeholder="+44 7700 900123"]').fill('+27821234567');await p.getByText('Choose your property goal').click();await p.getByText('Buy to Live',{exact:true}).click();await p.getByRole('button',{name:/Analyse My Property/i}).click();await expect(p.getByText(/Property and goal are required/i)).toBeVisible()}],
      ['missing goal',async p=>{await home(p);await p.locator('input[placeholder="e.g. Thabo Mokoena"]').fill('QA Buyer');await p.locator('input[placeholder="you@email.com"]').fill('qa@example.com');await p.locator('input[placeholder="+44 7700 900123"]').fill('+27821234567');await p.locator('input[placeholder*="Paste a Property24"]').fill(ADDRESS);await p.getByRole('button',{name:/Analyse My Property/i}).click();await expect(p.getByText(/Property and goal are required/i)).toBeVisible()}],
      ['mocked checkout success',async p=>{await home(p);await p.route('**/api/checkout',r=>r.fulfill({status:200,contentType:'application/json',body:JSON.stringify({checkout_url:base()+'/payment-test',amount_zar:149,buyer_type:'south_african'})}));await minForm(p);await p.getByRole('button',{name:/Analyse My Property/i}).click();await p.waitForURL('**/payment-test')}],
      ['checkout error',async p=>{await home(p);await p.route('**/api/checkout',r=>r.fulfill({status:422,contentType:'application/json',body:JSON.stringify({error:'Invalid property input'})}));await minForm(p);await p.getByRole('button',{name:/Analyse My Property/i}).click();await expect(p.getByText(/Invalid property input/i)).toBeVisible()}],
    ];
    for(const [n,fn] of cases)test(n,async({page})=>fn(page));
  });

  test.describe('Buyer pricing matrix',()=>{
    const sa=['+27821234567','27821234567','+27 82 123 4567','+27-82-123-4567','+27 (82) 123 4567','0027821234567','+27831234567','+27721234567','+27611234567','+27821234568'];
    const intl=['+447700900123','+14155550123','+4915112345678','+31201234567','+33123456789','+971501234567','+61412345678','+12025550147','+353871234567','+81312345678'];
    for(const n of sa)test('SA '+n+' => R149',async({page})=>{await home(page);await page.locator('input[placeholder="+44 7700 900123"]').fill(n);await expect(page.getByText(/Analyse This Property — R149/i)).toBeVisible();await expect(page.getByText(/R1,495 equivalent/i)).not.toBeVisible()});
    for(const n of intl)test('International '+n+' => R1495',async({page})=>{await page.goto('/international-buyers');await page.locator('input[placeholder="+44 7700 900123"]').fill(n);await expect(page.getByText(/R1,495 equivalent/i)).toBeVisible()});
    const bad=['','1','1234567','1234567890123456','abcdefgh','+27'];
    for(const n of bad)test('invalid number '+(n||'empty'),async({page})=>{await home(page);await page.locator('input[placeholder="+44 7700 900123"]').fill(n);await page.getByRole('button',{name:/Analyse My Property/i}).click();await expect(page.getByText(/Valid WhatsApp number required/i)).toBeVisible()});
    test('international page +27 switches to R149',async({page})=>{await page.goto('/international-buyers');await page.locator('input[placeholder="+44 7700 900123"]').fill('+27821234567');await expect(page.getByText(/Analyse This Property — R149/i)).toBeVisible();await expect(page.getByText(/R1,495 equivalent/i)).not.toBeVisible()});
    test('international requires country',async({page})=>{await page.goto('/international-buyers');await page.locator('input[placeholder="e.g. Thabo Mokoena"]').fill('QA Buyer');await page.locator('input[placeholder="you@email.com"]').fill('qa@example.com');await page.locator('input[placeholder="+44 7700 900123"]').fill('+447700900123');await page.locator('input[placeholder*="Paste a Property24"]').fill(ADDRESS);await page.getByText('Choose your property goal').click();await page.getByText('Buy to Live',{exact:true}).click();await page.getByRole('button',{name:/Analyse My Property/i}).click();await expect(page.getByText(/Country required/i)).toBeVisible()});
    test('international country control',async({page})=>{await page.goto('/international-buyers');await expect(page.getByText('Buying from')).toBeVisible()});
    test('international purpose control',async({page})=>{await page.goto('/international-buyers');await expect(page.getByText('Primary purpose')).toBeVisible()});
    test('international budget control',async({page})=>{await page.goto('/international-buyers');await expect(page.getByText('Budget')).toBeVisible()});
    test('main page buyer selector',async({page})=>{await home(page);await expect(page.getByText('Who are you buying as?')).toBeVisible()});
    test('main page international option',async({page})=>{await home(page);await p.getByText('South African buyer').click();await expect(page.getByText('International buyer')).toBeVisible()});
  });

  test.describe('API negative and security contract',()=>{
    const cases=[
      ['empty object',{},400],['null',null,400],['array',[],400],['missing fields',{product:'standard_report'},400],
      ['bad email',{name:'QA Buyer',email:'bad',whatsapp:'+27821234567',listing_url:ADDRESS,goal:'Buy to Live',product:'standard_report',buyer_type:'south_african'},400],
      ['bad goal',{name:'QA Buyer',email:'qa@example.com',whatsapp:'+27821234567',listing_url:ADDRESS,goal:'BAD',product:'standard_report',buyer_type:'south_african'},400],
      ['bad product',{name:'QA Buyer',email:'qa@example.com',whatsapp:'+27821234567',listing_url:ADDRESS,goal:'Buy to Live',product:'BAD',buyer_type:'south_african'},400],
      ['bad buyer type',{name:'QA Buyer',email:'qa@example.com',whatsapp:'+447700900123',listing_url:ADDRESS,goal:'Buy to Live',product:'standard_report',buyer_type:'alien'},400],
      ['bad WhatsApp',{name:'QA Buyer',email:'qa@example.com',whatsapp:'abc',listing_url:ADDRESS,goal:'Buy to Live',product:'standard_report',buyer_type:'south_african'},400],
      ['empty property',{name:'QA Buyer',email:'qa@example.com',whatsapp:'+27821234567',listing_url:'',goal:'Buy to Live',product:'standard_report',buyer_type:'south_african'},400],
      ['unsupported property',{name:'QA Buyer',email:'qa@example.com',whatsapp:'+27821234567',listing_url:'https://example.com/not-property',goal:'Buy to Live',product:'standard_report',buyer_type:'south_african'},422],
      ['oversized whatsapp',{name:'QA Buyer',email:'qa@example.com',whatsapp:'+'+'1'.repeat(50),listing_url:ADDRESS,goal:'Buy to Live',product:'standard_report',buyer_type:'south_african'},400],
      ['oversized name',{name:'x'.repeat(121),email:'qa@example.com',whatsapp:'+27821234567',listing_url:ADDRESS,goal:'Buy to Live',product:'standard_report',buyer_type:'south_african'},400],
      ['oversized email',{name:'QA Buyer',email:'x'.repeat(250)+'@x.com',whatsapp:'+27821234567',listing_url:ADDRESS,goal:'Buy to Live',product:'standard_report',buyer_type:'south_african'},400],
      ['pro without submission',{product:'investor_report_pro'},400],
      ['pro unknown submission',{product:'investor_report_pro',submission_id:'00000000-0000-0000-0000-000000000000'},404],
    ];
    for(const [n,b,s] of cases)test('checkout API '+n,async({request})=>expect((await request.post(base()+'/api/checkout',{data:b})).status()).toBe(s));
    test('report status missing identifiers',async({request})=>expect((await request.get(base()+'/api/report/status')).status()).toBe(400));
    test('report status invalid type',async({request})=>expect((await request.get(base()+'/api/report/status?submission_id=00000000-0000-0000-0000-000000000000&report_type=bad')).status()).toBe(400));
    test('report status unknown submission',async({request})=>expect((await request.get(base()+'/api/report/status?submission_id=00000000-0000-0000-0000-000000000000')).status()).toBe(404));
    test('report status unknown payment',async({request})=>expect((await request.get(base()+'/api/report/status?payment_id=00000000-0000-0000-0000-000000000000')).status()).toBe(404));
    test('checkout PUT rejected',async({request})=>expect([400,405]).toContain((await request.put(base()+'/api/checkout',{data:{}})).status()));
    test('malformed JSON handled',async({request})=>expect([400,500]).toContain((await request.post(base()+'/api/checkout',{data:'not-json',headers:{'content-type':'application/json'}})).status()));
    const payloads=['<script>alert(1)</script>','"><img src=x onerror=alert(1)>','<svg onload=alert(1)>','javascript:alert(1)','DROP TABLE customers;',"' OR '1'='1",'process.env.SECRET','../../etc/passwd','<iframe src="javascript:alert(1)">','\\x00'];
    for(const x of payloads)test('XSS/injection payload inert '+x.slice(0,12),async({page})=>{await home(page);const errors=[];page.on('pageerror',e=>errors.push(e.message));const i=page.locator('input[placeholder="e.g. Thabo Mokoena"]');await i.fill(x);await expect(i).toHaveValue(x);expect(errors).toEqual([])});
    test('10k property input safe',async({page})=>{await home(page);const i=page.locator('input[placeholder*="Paste a Property24"]');await i.fill('x'.repeat(10000));await expect(i).toHaveValue('x'.repeat(10000))});
    test('invalid report token does not 5xx',async({page})=>{const r=await page.goto('/report/00000000-0000-0000-0000-000000000000?token=invalid');expect((r?.status()||500)).toBeLessThan(500)});
    test('reload home',async({page})=>{await home(page);await page.reload();await expect(page.locator('body')).toBeVisible()});
    test('back navigation',async({page})=>{await home(page);await page.goto('/international-buyers');await page.goBack();await expect(page.locator('body')).toBeVisible()});
  });

  test.describe('Responsive regression',()=>{
    for(const width of [320,360,375,390,414,430,768,1024,1280,1440])test('no horizontal overflow '+width,async({page})=>{await page.setViewportSize({width,height:900});await home(page);const o=await page.evaluate(()=>document.documentElement.scrollWidth-document.documentElement.clientWidth);expect(o).toBeLessThanOrEqual(2)});
    test('mobile CTA to form',async({page})=>{await page.setViewportSize({width:390,height:844});await home(page);await page.getByText(/Know Before You Buy/i).first().click();await expect(page.locator('#form')).toBeInViewport()});
    test('mobile international CTA',async({page})=>{await page.setViewportSize({width:390,height:844});await home(page);await page.getByText(/Buying from overseas/i).first().click();await page.waitForURL('**/international-buyers');await expect(page.getByText(/International Buyer Intelligence/i).first()).toBeVisible()});
    test('mobile form visible',async({page})=>{await page.setViewportSize({width:390,height:844});await home(page);await page.locator('#form').scrollIntoViewIfNeeded();await expect(page.locator('input[placeholder="e.g. Thabo Mokoena"]')).toBeVisible()});
    test('mobile international form visible',async({page})=>{await page.setViewportSize({width:390,height:844});await page.goto('/international-buyers');await expect(page.locator('input[placeholder="+44 7700 900123"]')).toBeVisible()});
    test('mobile no errors',async({page})=>{const e=[];page.on('pageerror',x=>e.push(x.message));await page.setViewportSize({width:390,height:844});await home(page);expect(e).toEqual([])});
    test('tablet no errors',async({page})=>{const e=[];page.on('pageerror',x=>e.push(x.message));await page.setViewportSize({width:768,height:1024});await home(page);expect(e).toEqual([])});
    test('desktop no errors',async({page})=>{const e=[];page.on('pageerror',x=>e.push(x.message));await page.setViewportSize({width:1440,height:900});await home(page);expect(e).toEqual([])});
  });
});
