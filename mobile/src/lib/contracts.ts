import { z } from "zod";
const text = z.string().nullish();
export const phoneSchema = z
  .object({ countryCode: text, number: text })
  .nullish();
export const userSchema = z.object({
  _id: z.string(),
  firstName: z.string(),
  lastName: z.string(),
  emailId: z.string(),
  organisationId: text,
  defaultAccount: text,
  phoneNo: phoneSchema,
  alternateNo: phoneSchema,
  image: z.object({ key: text, location: text }).nullish(),
});
export const sessionSchema = userSchema.extend({ token: z.string().min(1) });
export type User = z.infer<typeof userSchema>;
export type Session = z.infer<typeof sessionSchema>;
export const organisationSchema = z.object({
  organisationId: z.string(),
  name: z.string(),
  isActive: z.boolean(),
  isAccepted: z.boolean(),
  isAdmin: z.boolean(),
});
export type Organisation = z.infer<typeof organisationSchema>;
export const positionSchema = z
  .object({
    placeName: text,
    lat: z.number().nullish(),
    lng: z.number().nullish(),
  })
  .nullish();
const count = () =>
  z
    .array(
      z
        .object({ _id: text })
        .catchall(z.union([z.string(), z.number(), z.null()])),
    )
    .nullish();
export const projectSchema = z.object({
  _id: z.string(),
  name: z.string(),
  description: text,
  active: z.boolean(),
  organisationId: text,
  location: positionSchema,
  userCount: count(),
  deviceCount: count(),
  clusterCount: count(),
  nonLoRaWANDeviceCount: count(),
});
export type Project = z.infer<typeof projectSchema>;
export const deviceSchema = z.object({
  _id: z.string(),
  name: z.string(),
  devEui: z.string(),
  hardwareId: text,
  timestamp: z.union([z.string(), z.number()]).nullish(),
  description: text,
  organisationId: text,
  projectId: text,
  clusterId: text,
  networkId: text,
  hardwareType: text,
  deleted: z.boolean().optional(),
  position: positionSchema,
  outputs: z
    .array(
      z.object({
        outputId: z.string(),
        outputName: text,
        value: z.unknown(),
        label: text,
        color: text,
      }),
    )
    .optional(),
  attributes: z
    .array(
      z.object({
        attributeId: z.string(),
        attributeName: text,
        value: z.unknown(),
      }),
    )
    .optional(),
});
export type Device = z.infer<typeof deviceSchema>;
export const projectTreeSchema = z.array(
  z.object({
    _id: z.string(),
    name: z.string(),
    clusters: z.array(
      z.object({
        _id: z.string(),
        name: z.string(),
        devices: z.array(deviceSchema),
      }),
    ),
  }),
);
export const moduleSchema = z.object({
  _id: z.string(),
  label: z.string(),
  moduleType: z.string(),
  organisationId: text,
});
export type Module = z.infer<typeof moduleSchema>;
export const downlinkResultSchema = z.object({
  timestamp: z.union([z.string(), z.number()]).nullish(),
  type: text,
  message: text,
});
export type DownlinkResult = z.infer<typeof downlinkResultSchema>;
export const enrollmentChoiceSchema = z.object({
  _id: z.string(),
  name: z.string(),
  deleted: z.boolean().optional(),
  type: z.string().optional(),
  networkInterface: z.array(z.string()).optional(),
});
export type EnrollmentChoice = z.infer<typeof enrollmentChoiceSchema>;
export const deviceAttributeInputSchema = z.object({
  attributeId: z.string().min(1),
  attributeName: z.string().min(1),
  value: z.record(z.string(), z.unknown()),
});
export const deviceEnrollmentSchema = z.object({
  organisationId: z.string().min(1),
  projectId: z.string().min(1),
  clusterId: z.string().trim().min(1, "Choose or enter a cluster ID"),
  hardwareId: z.string().trim().min(1, "Choose or enter a hardware ID"),
  networkId: z.string().trim().min(1, "Choose or enter a network ID"),
  mainOutputId: z.string().trim().min(1, "Choose or enter a main output ID"),
  devEui: z.string().trim().min(1, "DevEUI is required"),
  name: z.string().trim().min(1, "Device name is required"),
  description: z.string().trim().optional(),
  attributes: z.array(deviceAttributeInputSchema),
  position: z
    .object({
      placeName: z.string().trim().optional(),
      lat: z.number().finite().optional(),
      lng: z.number().finite().optional(),
    })
    .optional(),
});
export type DeviceEnrollment = z.infer<typeof deviceEnrollmentSchema>;
export interface Repository {
  listOrganisations(signal?: AbortSignal): Promise<Organisation[]>;
  listProjects(orgId: string, signal?: AbortSignal): Promise<Project[]>;
  listDevices(
    orgId: string,
    projectId: string,
    signal?: AbortSignal,
  ): Promise<Device[]>;
  listDeviceDetails(
    orgId: string,
    projectId: string,
    signal?: AbortSignal,
  ): Promise<Device[]>;
  listModules(orgId: string, signal?: AbortSignal): Promise<Module[]>;
}
