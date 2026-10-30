import { beforeEach, describe, expect, jest, test } from "@jest/globals";
import { deviceEnrollmentSchema, deviceSchema } from "../src/lib/contracts";
import { request } from "../src/lib/graphql";
import { operations } from "../src/lib/operations";
import { saveDevice } from "../src/features/devices/api";

jest.mock("../src/lib/graphql", () => ({ request: jest.fn() }));

const enrolledDevice = {
  organisationId: "org-1",
  projectId: "project-1",
  clusterId: "cluster-1",
  hardwareId: "hardware-1",
  networkId: "network-1",
  mainOutputId: "output-1",
  devEui: "ABCDEF1234567890",
  name: "Pump sensor",
  description: "",
  attributes: [],
};

describe("device enrollment contract", () => {
  beforeEach(() => {
    jest.mocked(request).mockReset();
  });

  test("requires all controller identity fields before any mutation", () => {
    expect(() =>
      deviceEnrollmentSchema.parse({ ...enrolledDevice, networkId: "" }),
    ).toThrow();
    expect(() =>
      deviceEnrollmentSchema.parse({
        ...enrolledDevice,
        attributes: [{ attributeId: "a", attributeName: "mode", value: 1 }],
      }),
    ).toThrow();
  });

  test("uses the real saveDevice operation as a non-retryable mutation", async () => {
    jest.mocked(request).mockResolvedValueOnce({
      saveDevice: deviceSchema.parse({
        _id: "device-1",
        name: enrolledDevice.name,
        devEui: enrolledDevice.devEui,
      }),
    });

    await expect(saveDevice(enrolledDevice)).resolves.toMatchObject({
      _id: "device-1",
    });
    expect(request).toHaveBeenCalledWith(
      operations.SaveDevice,
      {
        device: expect.objectContaining({
          organisationId: "org-1",
          devEui: "ABCDEF1234567890",
        }),
      },
      expect.anything(),
      { mutation: true },
    );
  });
});
