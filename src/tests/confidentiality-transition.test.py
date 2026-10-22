# Isolated browser regression: no real accounts or production writes.
import asyncio,json,time
from playwright.async_api import async_playwright
USER='00000000-0000-4000-8000-000000000002'
POLICY='00000000-0000-4000-8000-000000000001'
accepted=False
errors=[]
async def main():
 global accepted
 async with async_playwright() as p:
  browser=await p.chromium.launch(headless=True)
  page=await browser.new_page(viewport={"width":1280,"height":1800})
  page.on('pageerror',lambda e:errors.append(str(e)))
  page.on('console',lambda m:print('ERROR',m.text) if m.type=='error' and not m.text.startswith('Warning:') else None)
  async def route(r):
   global accepted
   url=r.request.url
   result=[]
   if '/auth/v1/' in url: result={'id':USER,'email':'test@example.invalid','factors':[]}
   elif 'confidentiality_policies' in url: result={'id':POLICY,'version':'1.0','title':'Test','body':'Test commitment','body_sha256':'a'*64,'published_at':'2026-10-21T00:00:00Z'}
   elif 'accept_confidentiality_policy' in url: accepted=True;result={}
   elif 'confidentiality_acceptances' in url: result={'id':'00000000-0000-4000-8000-000000000003','user_id':USER,'policy_id':POLICY,'policy_sha256':'a'*64,'accepted_at':'2026-10-22T12:00:00Z','account_email':None,'declaration':'Test','user_agent':None,'authentication_method':[]} if accepted else None
   elif 'user_roles' in url: result={'role':'operation'}
   elif 'profiles' in url: result={'id':USER,'approval_status':'approved','mfa_enabled':False,'role':'operation','full_name':'Test','avatar_style':'initials'}
   elif '/rpc/get_user_role' in url: result='operation'
   await r.fulfill(status=200,content_type='application/json',body=json.dumps(result))
  await page.route('https://agttqqaampznczkyfvkf.supabase.co/**',route)
  await page.goto('http://localhost:8080/auth')
  await page.evaluate('([id,now])=>{localStorage.setItem("last_login_date",new Date().toISOString().split("T")[0]);localStorage.setItem("sb-agttqqaampznczkyfvkf-auth-token",JSON.stringify({access_token:"test-only",refresh_token:"test-only",expires_at:now+3600,expires_in:3600,token_type:"bearer",user:{id,email:"test@example.invalid"}}))}',[USER,int(time.time())])
  await page.goto('http://localhost:8080/')
  await page.wait_for_timeout(2500)
  assert await page.get_by_role('button',name='Aceitar e continuar').is_disabled(), 'Acceptance requires acknowledgment'
  await page.get_by_role('checkbox').check()
  await page.get_by_role('button',name='Aceitar e continuar').click()
  await page.wait_for_timeout(3000)
  assert accepted, 'Acceptance action must execute'
  assert page.url.endswith('/announcements'), 'Accepted operation user must reach the internal page'
  assert not errors, errors
  assert not await page.get_by_text('Oops! Algo deu errado',exact=True).count(), 'Internal page must not crash'
  print('Acceptance transition regression passed (isolated test responses)')
  await browser.close()
asyncio.run(main())
