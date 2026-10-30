import { z } from "zod";
import {
  deviceEnrollmentSchema,
  deviceSchema,
  enrollmentChoiceSchema,
  type DeviceEnrollment,
} from "../../lib/contracts";
import { request } from "../../lib/graphql";
import { operations } from "../../lib/operations";

const listChoices = z.array(enrollmentChoiceSchema);

export function listHardware(organisationId: string, signal?: AbortSignal) {
  return request(
    operations.HardwareList,
    { params: { organisationId } },
    z.object({ hardwareList: listChoices }),
    { signal },
  ).then((result) => result.hardwareList.filter((item) => !item.deleted));
}

export function listNetworks(organisationId: string, signal?: AbortSignal) {
  return request(
    operations.NetworkList,
    { params: { organisationId } },
    z.object({ networkList: listChoices }),
    { signal },
  ).then((result) => result.networkList.filter((item) => !item.deleted));
}

export function listClusters(
  organisationId: string,
  projectId: string,
  signal?: AbortSignal,
) {
  return request(
    operations.ClusterList,
    { params: { organisationId, projectId } },
    z.object({ clusters: listChoices }),
    { signal },
  ).then((result) => result.clusters.filter((item) => !item.deleted));
}

export function saveDevice(input: DeviceEnrollment) {
  const device = deviceEnrollmentSchema.parse(input);
  return request(
    operations.SaveDevice,
    {
      device: {
        ...device,
        description: device.description || undefined,
        position:
          device.position?.placeName || device.position?.lat !== undefined
            ? device.position
            : undefined,
      },
    },
    z.object({ saveDevice: deviceSchema }),
    { mutation: true },
  ).then((result) => result.saveDevice);
}
