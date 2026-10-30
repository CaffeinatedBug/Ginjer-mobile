import { beforeEach, describe, expect, jest, test } from "@jest/globals";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { request } from "../src/lib/graphql";
import {
  hasUnresolvedDownlink,
  sendDownlink,
} from "../src/features/downlink/api";

jest.mock("@react-native-async-storage/async-storage", () =>
  // Jest's module factory requires a runtime import of the package's storage mock.
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  require("@react-native-async-storage/async-storage/jest/async-storage-mock"),
);
jest.mock("../src/lib/graphql", () => ({ request: jest.fn() }));

const mockedRequest = jest.mocked(request);
const action = {
  organisationId: "test-org",
  deviceId: "test-device",
  downlinkInterfaceId: "test-interface",
  value: { value: 1 },
};
const confirmation = {
  sendDownlink: { timestamp: 1, type: "accepted", message: "Accepted" },
};

describe("downlink safety", () => {
  beforeEach(async () => {
    mockedRequest.mockReset();
    await AsyncStorage.clear();
  });

  test("rejects a double tap while one command is pending", async () => {
    let resolveRequest: ((value: typeof confirmation) => void) | undefined;
    mockedRequest.mockImplementation(
      () =>
        new Promise((resolve) => {
          resolveRequest = resolve as (value: typeof confirmation) => void;
        }) as never,
    );
    const first = sendDownlink(action);
    await expect(sendDownlink(action)).rejects.toMatchObject({
      kind: "validation",
    });
    // Allow the storage step to finish before resolving the in-flight network call.
    while (!resolveRequest) await Promise.resolve();
    resolveRequest(confirmation);
    await expect(first).resolves.toEqual(confirmation.sendDownlink);
    expect(mockedRequest).toHaveBeenCalledTimes(1);
    expect(
      await hasUnresolvedDownlink(action.organisationId, action.deviceId),
    ).toBe(false);
  });

  test("retains an uncertain lock after a lost response and never resends", async () => {
    mockedRequest.mockRejectedValue(new Error("timeout"));
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
  });
});
