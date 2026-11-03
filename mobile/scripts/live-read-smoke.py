import pathlib,json,urllib.request,urllib.error
root=pathlib.Path('.')
env=dict(line.split('=',1) for line in (root/'.env.local').read_text().splitlines() if '=' in line)
ops=json.loads((root/'docs/api/Ginjer.sanitized.postman_collection.json').read_text())['item']
queries={x['name']:x['request']['body']['graphql']['query'] for x in ops}
queries['Hardware List']='''query HardwareList($params: ParamInput!) {
  hardwareList(params: $params) { _id name type deleted }
}'''
queries['Network List']='''query NetworkList($params: ParamInput!) {
  networkList(params: $params) { _id name deleted networkInterface }
}'''
queries['Cluster List']='''query ClusterList($params: ClusterParamInput!) {
  clusters(params: $params) { _id name deleted }
}'''
queries['Organisation Users']='''query OrganisationUsers($params: ParamInput!) {
  organisationUsers(params: $params) {
    _id firstName lastName emailId organisationId role { isAdmin } isSuperUser
  }
}'''
token=None
results=[]
def call(name,variables):
 global token
 headers={'Content-Type':'application/json'}
 if token: headers['authorization']=token
 try:
  r=urllib.request.urlopen(urllib.request.Request('https://devapi.ginjer.io/graphql',data=json.dumps({'query':queries[name],'variables':variables}).encode(),headers=headers),timeout=30)
  j=json.load(r)
 except urllib.error.HTTPError as error:
  j=json.load(error)
  results.append({'operation':name,'passed':False,'http':error.code,'codes':[x.get('extensions',{}).get('code','UNCLASSIFIED') for x in j.get('errors',[])]})
  return None
 if j.get('errors'): results.append({'operation':name,'passed':False,'codes':[x.get('extensions',{}).get('code','UNCLASSIFIED') for x in j['errors']]});return None
 results.append({'operation':name,'passed':True,'http':r.status})
 if name=='Org List': results[-1]['activeAcceptedCount']=sum(bool(x.get('isActive') and x.get('isAccepted')) for x in j['data'].get('accounts',[]))
 if name=='Project List': results[-1]['projectCount']=len(j['data'].get('projectOverview',[]))
 if name=='Module List': results[-1]['downlinkInterfaceCount']=sum(x.get('moduleType')=='DOWNLINK_INTERFACE' for x in j['data'].get('modules',[]))
 if name=='Organisation Users': results[-1]['userCount']=len(j['data'].get('organisationUsers',[]))
 if name in ('Hardware List','Network List','Cluster List'): results[-1]['count']=len(next(iter(j['data'].values()),[]))
 return j['data']
def expect_auth_rejection(name,variables,test_token=None):
 headers={'Content-Type':'application/json'}
 if test_token: headers['authorization']=test_token
 request=urllib.request.Request('https://devapi.ginjer.io/graphql',data=json.dumps({'query':queries[name],'variables':variables}).encode(),headers=headers)
 try:
  response=urllib.request.urlopen(request,timeout=30)
  status=response.status
  body=json.load(response)
 except urllib.error.HTTPError as error:
  status=error.code
  body=json.load(error)
 codes=[item.get('extensions',{}).get('code','UNCLASSIFIED') for item in body.get('errors',[])]
 rejected=status in (401,403) or bool(body.get('errors')) or (name=='Sign In' and (body.get('data') or {}).get('signIn') is None)
 error_details=[]
 for item in body.get('errors',[]):
  message=(item.get('message') or '').lower()
  indicators=[word for word in ('invalid','incorrect','password','credential','unauthorised','unauthorized','authentication','account','user','not found') if word in message]
  error_details.append({'messageIndicators':indicators,'extensionKeys':sorted(item.get('extensions',{}).keys()),'path':item.get('path') if item.get('path') in (['signIn'],['accounts']) else 'other'})
 results.append({'operation':name,'case':'bad-password' if name=='Sign In' else 'invalid-token','passed':rejected,'http':status,'codes':codes,'errorDetails':error_details})
try:
 queries['Sign In']=queries['Sign In'].replace('defaultAccount','phoneNo { countryCode number } alternateNo { countryCode number } image { key location } defaultAccount')
 queries['Device List']=queries['Device List'].replace('timestamp','timestamp\n        deleted')
 expect_auth_rejection('Sign In',{'auth':{'emailId':env['GINJER_TEST_EMAIL'],'password':'deliberately-invalid-password','application':'Ginjer','forever':True}})
 d=call('Sign In',{'auth':{'emailId':env['GINJER_TEST_EMAIL'],'password':env['GINJER_TEST_PASSWORD'],'application':'Ginjer','forever':True}})
 if d:
  results[-1]['fieldTypes']={key:type(value).__name__ for key,value in d['signIn'].items()}
  expect_auth_rejection('Org List',{},'invalid-token-for-smoke-test')
  u=d['signIn'];token=u['token'];org=u.get('defaultAccount') or u.get('organisationId');a=call('Org List',{});p=call('Project List',{'params':{'organisationId':org}})
  for account in (a or {}).get('accounts',[]):
   if not account.get('isActive') or not account.get('isAccepted'): continue
   org=account['organisationId'];p=call('Project List',{'params':{'organisationId':org}})
   call('Organisation Users',{'params':{'organisationId':org}})
   call('Module List',{'params':{'organisationId':org}})
   call('Hardware List',{'params':{'organisationId':org}})
   call('Network List',{'params':{'organisationId':org}})
   for project in (p or {}).get('projectOverview',[]):
    pid=project['_id'];v={'params':{'organisationId':org,'projectId':pid}}
    call('Cluster List',{'params':{'organisationId':org,'projectId':pid}})
    for name in ['Device List','Device Details']:
     d=call(name,v)
     if d:
      devices=[x for p in d['projects'] for c in p['clusters'] for x in c['devices']]
      results[-1]['deviceCount']=len(devices)
      results[-1]['fieldTypes']={k:type(v).__name__ for x in devices[:1] for k,v in x.items()}
except Exception as e: results.append({'failure':type(e).__name__})
(root/'docs/api-captures/live-read-smoke.json').write_text(json.dumps(results,indent=2));print(json.dumps(results))
