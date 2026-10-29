import { z } from "zod";
import { request } from "./graphql";
import { operations } from "./operations";
import {
  organisationSchema,
  projectSchema,
  projectTreeSchema,
  moduleSchema,
  sessionSchema,
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
  return data.projects.flatMap((p) =>
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
};
