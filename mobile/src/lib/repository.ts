import { z } from "zod";
import { request } from "./graphql";
import { operations } from "./operations";
import {
  organisationSchema,
  projectSchema,
  projectTreeSchema,
  projectUserSchema,
  moduleSchema,
  sessionSchema,
  automationAlertSchema,
  automationRunSchema,
  type Repository,
} from "./contracts";
export const signIn = (emailId: string, password: string) =>
  request(
    operations.SignIn,
    { auth: { emailId, password, application: "Ginjer", forever: true } },
    z.object({ signIn: sessionSchema }),
    { authenticated: false },
  ).then((r) => r.signIn);
const devices = async (
  detailed: boolean,
  organisationId: string,
  projectId: string,
  signal?: AbortSignal,
) => {
  const data = await request(
    detailed ? operations.DeviceDetails : operations.DeviceList,
    { params: { organisationId, projectId } },
    z.object({ projects: projectTreeSchema }),
    { signal },
  );
  return data.projects
    .filter((p) => p._id === projectId)
    .flatMap((p) =>
      p.clusters.flatMap((c) =>
        c.devices
          .filter((d) => !d.deleted)
          .map((d) => ({ ...d, projectId: p._id, clusterId: c._id })),
      ),
    );
};
export const repository: Repository = {
  listOrganisations: (signal) =>
    request(
      operations.OrgList,
      {},
      z.object({ accounts: z.array(organisationSchema) }),
      { signal },
    ).then((r) => r.accounts),
  listProjects: (organisationId, signal) =>
    request(
      operations.ProjectList,
      { params: { organisationId } },
      z.object({ projectOverview: z.array(projectSchema) }),
      { signal },
    ).then((r) => r.projectOverview),
  listUsers: (organisationId, signal) =>
    request(
      operations.OrganisationUsers,
      { params: { organisationId } },
      z.object({ organisationUsers: z.array(projectUserSchema) }),
      { signal },
    ).then((r) => r.organisationUsers),
  listDevices: (organisationId, projectId, signal) =>
    devices(false, organisationId, projectId, signal),
  listDeviceDetails: (organisationId, projectId, signal) =>
    devices(true, organisationId, projectId, signal),
  listModules: (organisationId, signal) =>
    request(
      operations.ModuleList,
      { params: { organisationId } },
      z.object({ modules: z.array(moduleSchema) }),
      { signal },
    ).then((r) => r.modules),
  listAutomation: (organisationId, projectId, signal) =>
    request(
      operations.AutomationAlerts,
      { alertParamsInput: { organisationId, projectId } },
      z.object({ alerts: z.array(automationAlertSchema) }),
      { signal },
    ).then(async ({ alerts }) => {
      const responses = await Promise.all(
        alerts.map((alert) =>
          request(
            operations.AutomationRuns,
            {
              automationRunsParams: {
                alertId: alert._id,
                pageInfo: { pageNo: 1, noOfRecordsPerPage: 50 },
              },
            },
            z.object({
              automationRuns: z.object({
                alertId: z.string(),
                organisationId: z.string(),
                metadata: z.unknown().nullable().optional(),
                runs: z.array(automationRunSchema),
              }),
            }),
            { signal },
          ),
        ),
      );
      return { alerts, runs: responses.flatMap((r) => r.automationRuns.runs) };
    }),
  toggleAutomation: (organisationId, projectId, alertId) =>
    request(
      operations.ToggleAlert,
      { alertParamsInput: { organisationId, projectId, alertId } },
      z.object({ toggleAlert: automationAlertSchema }),
      { mutation: true },
    ).then((result) => result.toggleAlert),
  runAutomation: (alertId) =>
    request(
      operations.ManualAutomation,
      { alertId },
      z.object({ manualAutomation: z.boolean() }),
      { mutation: true },
    ).then((result) => result.manualAutomation),
  getHistoricalData: (organisationId, deviceId, outputIds, signal) =>
    request(
      operations.HistoricalDeviceData,
      {
        HistoricalDeviceDataInput: {
          outputIds,
          deviceId,
          organisationId,
          fromDate: new Date(
            Date.now() - 7 * 24 * 60 * 60 * 1000,
          ).toISOString(),
          toDate: new Date().toISOString(),
        },
      },
      z.object({ HistoricalDeviceData: z.unknown() }),
      { signal },
    ).then((r) => r.HistoricalDeviceData),
};
