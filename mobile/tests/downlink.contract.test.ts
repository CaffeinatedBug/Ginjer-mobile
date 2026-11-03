import { beforeEach, describe, expect, jest, test } from "@jest/globals";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { request } from "../src/lib/graphql";
import { ApiError } from "../src/lib/errors";
import { DOWNLINK_API_URL } from "../src/lib/config";
import { operations } from "../src/lib/operations";
import {
  hasUnresolvedDownlink,
  reconcileDownlink,
  sendDownlink,
} from "../src/features/downlink/api";

jest.mock("@react-native-async-storage/async-storage", () =>
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  require("@react-native-async-storage/async-storage/jest/async-storage-mock"),
);
jest.mock("../src/lib/graphql", () => ({ request: jest.fn() }));

const mockedRequest = jest.mocked(request);
const action = {
  organisationId: "org",
  deviceId: "device",
  downlinkInterfaceId: "interface",
  value: { value: "ON" },
};

describe("downlink contract and reconciliation", () => {
  beforeEach(async () => {
    mockedRequest.mockReset();
    await AsyncStorage.clear();
  });

  test("rejects incomplete local input before dispatch or lock", async () => {
    await expect(
      sendDownlink({ ...action, deviceId: "" }),
    ).rejects.toMatchObject({ kind: "validation" });
    expect(mockedRequest).not.toHaveBeenCalled();
    expect(
      await hasUnresolvedDownlink(action.organisationId, action.deviceId),
    ).toBe(false);
  });

  test("dispatches a scalar controller value through the production downlink endpoint", async () => {
    mockedRequest.mockResolvedValueOnce({
      sendDownlink: { timestamp: null, type: "Downlink", message: "accepted" },
    });
    await sendDownlink(action);
    expect(mockedRequest).toHaveBeenCalledWith(
      operations.SendDownlink,
      { action: { ...action, value: "ON" } },
      expect.anything(),
      { mutation: true, url: DOWNLINK_API_URL },
    );
  });

  test("server validation does not create an uncertain lock", async () => {
    mockedRequest.mockRejectedValueOnce(new ApiError("Rejected", "validation"));
    await expect(sendDownlink(action)).rejects.toMatchObject({
      kind: "validation",
    });
    expect(
      await hasUnresolvedDownlink(action.organisationId, action.deviceId),
    ).toBe(false);
  });

  test("a structured server rejection does not create an uncertain lock", async () => {
    mockedRequest.mockRejectedValueOnce(
      new ApiError("Server rejected", "server"),
    );
    await expect(sendDownlink(action)).rejects.toMatchObject({
      kind: "server",
    });
    expect(
      await hasUnresolvedDownlink(action.organisationId, action.deviceId),
    ).toBe(false);
  });

  test("ambiguous delivery stays locked until explicit reconciliation", async () => {
    mockedRequest.mockRejectedValueOnce(new ApiError("Timed out", "network"));
    await expect(sendDownlink(action)).rejects.toMatchObject({
      kind: "uncertain",
    });
    expect(
      await hasUnresolvedDownlink(action.organisationId, action.deviceId),
    ).toBe(true);
    await expect(sendDownlink(action)).rejects.toMatchObject({
      kind: "uncertain",
    });
    expect(mockedRequest).toHaveBeenCalledTimes(1);
    await reconcileDownlink(action.organisationId, action.deviceId);
    expect(
      await hasUnresolvedDownlink(action.organisationId, action.deviceId),
    ).toBe(false);
  });
});
