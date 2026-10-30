import pathlib,json,urllib.request
root=pathlib.Path('.')
env=dict(line.split('=',1) for line in (root/'.env.local').read_text().splitlines() if '=' in line)
ops=json.loads((root/'docs/api/Ginjer.sanitized.postman_collection.json').read_text())['item']
queries={x['name']:x['request']['body']['graphql']['query'] for x in ops}
token=None
results=[]
def call(name,variables):
 global token
 headers={'Content-Type':'application/json'}
 if token: headers['authorization']=token
 r=urllib.request.urlopen(urllib.request.Request('https://devapi.ginjer.io/graphql',data=json.dumps({'query':queries[name],'variables':variables}).encode(),headers=headers),timeout=30)
 j=json.load(r)
 if j.get('errors'): results.append({'operation':name,'passed':False,'codes':[x.get('extensions',{}).get('code','UNCLASSIFIED') for x in j['errors']]});return None
 results.append({'operation':name,'passed':True,'http':r.status})
 return j['data']
try:
 queries['Sign In']=queries['Sign In'].replace('defaultAccount','phoneNo { countryCode number } alternateNo { countryCode number } image { key location } defaultAccount')
 d=call('Sign In',{'auth':{'emailId':env['GINJER_TEST_EMAIL'],'password':env['GINJER_TEST_PASSWORD'],'application':'Ginjer','forever':True}})
 if d:
  u=d['signIn'];token=u['token'];org=u.get('defaultAccount') or u.get('organisationId');a=call('Org List',{});p=call('Project List',{'params':{'organisationId':org}})
  for account in (a or {}).get('accounts',[]):
   if not account.get('isActive') or not account.get('isAccepted'): continue
   org=account['organisationId'];p=call('Project List',{'params':{'organisationId':org}})
   call('Module List',{'params':{'organisationId':org}})
   for project in (p or {}).get('projectOverview',[]):
    pid=project['_id'];v={'params':{'organisationId':org,'projectId':pid}}
    for name in ['Device List','Device Details']:
     d=call(name,v)
     if d:
      devices=[x for p in d['projects'] for c in p['clusters'] for x in c['devices']]
      results[-1]['deviceCount']=len(devices)
      results[-1]['fieldTypes']={k:type(v).__name__ for x in devices[:1] for k,v in x.items()}
except Exception as e: results.append({'failure':type(e).__name__})
(root/'docs/api-captures/live-read-smoke.json').write_text(json.dumps(results,indent=2));print(json.dumps(results))
