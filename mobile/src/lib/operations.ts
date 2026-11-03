export const operations = {
  SignIn:
    "query SignIn($auth: SignInInput!) {\n  signIn(auth: $auth) {\n    _id\n    firstName\n    lastName\n    emailId\n    token\n    phoneNo { countryCode number } alternateNo { countryCode number } image { key location } defaultAccount\n    organisationId\n  }\n}\n",
  OrgList:
    "query OrgList {\n  accounts {\n    organisationId\n    name\n    isActive\n    isAccepted\n    isAdmin\n  }\n}\n",
  ProjectList:
    "query ProjectList($params: ParamInput!) {\n  projectOverview(params: $params) {\n    _id\n    name\n    description\n    active\n    organisationId\n    location { placeName lat lng }\n    userCount { _id userCount }\n    deviceCount { _id deviceCount }\n    clusterCount { _id clusterCount }\n    nonLoRaWANDeviceCount { _id nonLoRaWANDeviceCount }\n  }\n}\n",
  OrganisationUsers:
    "query OrganisationUsers($params: ParamInput!) {\n  organisationUsers(params: $params) {\n    _id\n    firstName\n    lastName\n    emailId\n    organisationId\n    role { isAdmin }\n    isSuperUser\n  }\n}\n",
  DeviceList:
    "query DeviceList($params: ParamInput!) {\n  projects(params: $params) {\n    _id\n    name\n    clusters {\n      _id\n      name\n      devices {\n        _id\n        name\n        description\n        devEui\n        organisationId\n        projectId\n        clusterId\n        hardwareId\n        networkId\n        hardwareType\n        timestamp\n        deleted\n        position { placeName lat lng }\n        outputs { outputId outputName value label color }\n        attributes { attributeId attributeName value }\n      }\n    }\n  }\n}\n",
  DeviceDetails:
    "query DeviceDetails($params: ParamInput!) {\n  projects(params: $params) {\n    _id\n    name\n    clusters {\n      _id\n      name\n      devices {\n        _id\n        name\n        description\n        devEui\n        organisationId\n        projectId\n        clusterId\n        hardwareId\n        networkId\n        hardwareType\n        timestamp\n        deleted\n        position { placeName lat lng }\n        outputs { outputId outputName value label color }\n        attributes { attributeId attributeName value }\n      }\n    }\n  }\n}\n",
  ModuleList:
    "query ModuleList($params: ParamInput!) {\n  modules(params: $params) {\n    _id\n    label\n    moduleType\n    organisationId\n  }\n}\n",
  SendDownlink:
    "query SendDownlink($action: SendDownlinkInput!) {\n  sendDownlink(action: $action) {\n    timestamp\n    type\n    message\n  }\n}\n",
  HardwareList:
    "query HardwareList($params: ParamInput!) {\n  hardwareList(params: $params) {\n    _id\n    organisationId\n    name\n    description\n    modelNo\n    manufacturerId\n    gpsSupported\n    loRaWANConfiguration {\n      controllers { moduleId code }\n      profiles {\n        _id\n        name\n        description\n        downlinkInterfaces\n      }\n    }\n    type\n    deleted\n  }\n}\n",
  NetworkList:
    "query NetworkList($params: ParamInput!) {\n  networkList(params: $params) {\n    _id\n    name\n    deleted\n    networkInterface\n  }\n}\n",
  ClusterList:
    "query ClusterList($params: ClusterParamInput!) {\n  clusters(params: $params) {\n    _id\n    name\n    deleted\n  }\n}\n",
  SaveDevice:
    "mutation SaveDevice($device: DeviceInput!) {\n  saveDevice(device: $device) {\n    _id\n    name\n    devEui\n    hardwareId\n    timestamp\n    description\n    organisationId\n    projectId\n    clusterId\n    networkId\n    hardwareType\n    deleted\n    position { placeName lat lng }\n    outputs { outputId outputName value label color }\n    attributes { attributeId attributeName value }\n  }\n}\n",
  AutomationAlerts:
    "query AutomationAlerts($alertParamsInput: AlertParamsInput!) { alerts(alertParamsInput: $alertParamsInput) { _id name active deleted } }\n",
  AutomationRuns:
    "query AutomationRuns($automationRunsParams: AutomationRunsInput!) { automationRuns(automationRunsParams: $automationRunsParams) { alertId organisationId metadata { currentPage totalPages totalRecords noOfRecordsPerPage } runs { _id organisationId projectId alertId trigger triggeredAt triggerDeviceId state active currentStep updatedAt finishedAt } } }\n",
  ToggleAlert:
    "mutation ToggleAlert($alertParamsInput: AlertParamsInput!) { toggleAlert(alertParamsInput: $alertParamsInput) { _id active } }\n",
  ManualAutomation:
    "mutation ManualAutomation($alertId: ID!) { manualAutomation(alertId: $alertId) }\n",
  HistoricalDeviceData:
    "query HistoricalDeviceData($HistoricalDeviceDataInput: HistoricalDeviceDataInput!) { HistoricalDeviceData(HistoricalDeviceDataInput: $HistoricalDeviceDataInput) }\n",
} as const;
