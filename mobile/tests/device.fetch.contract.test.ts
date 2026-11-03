import { beforeEach, describe, expect, jest, test } from "@jest/globals";
import { request } from "../src/lib/graphql";
import { operations } from "../src/lib/operations";
import { repository } from "../src/lib/repository";

jest.mock("../src/lib/graphql", () => ({ request: jest.fn() }));

const mockedRequest = jest.mocked(request);
const device = {
  _id: "device-1",
  name: "Live relay",
  description: null,
  devEui: "A1B2C3D4",
  organisationId: "org-1",
  projectId: "project-1",
  clusterId: "cluster-1",
  hardwareId: "hardware-1",
  networkId: "network-1",
  hardwareType: "Relay",
  timestamp: "2026-10-30T10:00:00.000Z",
  deleted: false,
  position: { placeName: "Demo lab", lat: 12.9716, lng: 77.5946 },
  outputs: [
    {
      outputId: "relay",
      outputName: "Relay",
      value: 1,
      label: "Pump",
      color: "#6BAA3A",
    },
  ],
  attributes: [{ attributeId: "battery", attributeName: "Battery", value: 95 }],
};

describe("live device list contract", () => {
  beforeEach(() => {
    mockedRequest.mockReset();
  });

  test("requests the complete metadata needed by the live device cards", () => {
    expect(operations.DeviceList).toContain(
      "outputs { outputId outputName value label color }",
    );
    expect(operations.DeviceList).toContain("position { placeName lat lng }");
    expect(operations.DeviceList).toContain(
      "attributes { attributeId attributeName value }",
    );
  });

  test("returns a full device only from the selected project", async () => {
    mockedRequest.mockResolvedValueOnce({
      projects: [
        {
          _id: "other",
          name: "Other",
          clusters: [{ _id: "c", name: "C", devices: [device] }],
        },
        {
          _id: "project-1",
          name: "Online Demo",
          clusters: [{ _id: "cluster-1", name: "Live", devices: [device] }],
        },
      ],
    });

    await expect(repository.listDevices("org-1", "project-1")).resolves.toEqual(
      [
        expect.objectContaining({
          ...device,
          projectId: "project-1",
          clusterId: "cluster-1",
        }),
      ],
    );
  });
});
