import { beforeEach, describe, expect, jest, test } from "@jest/globals";
import AsyncStorage from "@react-native-async-storage/async-storage";
import * as SecureStore from "expo-secure-store";
import { sessionSchema } from "../src/lib/contracts";
import {
  establishSession,
  logout,
  sessionVersion,
  useSession,
} from "../src/lib/session";
import { queryClient } from "../src/lib/query";
import { selectWorkspace, useWorkspace } from "../src/lib/workspace";

jest.mock("@react-native-async-storage/async-storage", () =>
  // Jest's module factory requires a runtime import of the package's storage mock.
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  require("@react-native-async-storage/async-storage/jest/async-storage-mock"),
);
jest.mock("expo-secure-store", () => ({
  getItemAsync: jest.fn(),
  setItemAsync: jest.fn(),
  deleteItemAsync: jest.fn(),
}));
jest.mock("../src/lib/query", () => ({
  queryClient: { cancelQueries: jest.fn(), clear: jest.fn() },
}));
jest.mock("../src/lib/graphql", () => ({ configureAuth: jest.fn() }));
jest.mock("../src/features/notifications/store", () => ({
  resetEventMemory: jest.fn(),
}));

const session = sessionSchema.parse({
  _id: "test-id",
  firstName: "Test",
  lastName: "User",
  emailId: "test@example.invalid",
  token: "test-token",
});

describe("secure session lifecycle", () => {
  beforeEach(async () => {
    jest.mocked(SecureStore.setItemAsync).mockReset();
    jest.mocked(SecureStore.deleteItemAsync).mockReset();
    jest.mocked(queryClient.cancelQueries).mockReset();
    jest.mocked(queryClient.cancelQueries).mockResolvedValue(undefined);
    jest.mocked(queryClient.clear).mockReset();
    await AsyncStorage.clear();
    useSession.setState({ session: null, ready: true, message: "" });
  });

  test("persists to SecureStore and invalidates stale sign-in generations", async () => {
    const oldVersion = sessionVersion();
    await establishSession(session, oldVersion);
    expect(SecureStore.setItemAsync).toHaveBeenCalledWith(
      "ginjer.session",
      JSON.stringify(session),
    );
    expect(useSession.getState().session?.token).toBe("test-token");
    await expect(establishSession(session, oldVersion)).rejects.toThrow(
      "Session changed",
    );
  });

  test("clears session and ordinary cache while preserving uncertain downlink lock", async () => {
    await establishSession(session);
    await AsyncStorage.setItem("ginjer.events.test", "cached");
    await AsyncStorage.setItem("ginjer.downlink.dev.test", "unresolved");
    await logout();
    expect(useSession.getState().session).toBeNull();
    expect(SecureStore.deleteItemAsync).toHaveBeenCalledWith("ginjer.session");
    expect(queryClient.clear).toHaveBeenCalledTimes(1);
    expect(await AsyncStorage.getItem("ginjer.events.test")).toBeNull();
    expect(await AsyncStorage.getItem("ginjer.downlink.dev.test")).toBe(
      "unresolved",
    );
  });

  test("finishes logout cleanup before a new sign-in writes its session", async () => {
    await establishSession(session);
    let releaseCleanup: (() => void) | undefined;
    jest.mocked(queryClient.cancelQueries).mockImplementation(
      () =>
        new Promise<void>((resolve) => {
          releaseCleanup = resolve;
        }),
    );
    const clearing = logout();
    const newVersion = sessionVersion();
    const signingIn = establishSession(session, newVersion);
    while (!releaseCleanup) await Promise.resolve();
    releaseCleanup();
    await Promise.all([clearing, signingIn]);
    expect(useSession.getState().session?.token).toBe("test-token");
    expect(
      jest.mocked(SecureStore.deleteItemAsync).mock.invocationCallOrder[0],
    ).toBeLessThan(
      jest.mocked(SecureStore.setItemAsync).mock.invocationCallOrder.at(-1) ??
        0,
    );
  });

  test("rapid workspace selection keeps only the newest organisation and project", async () => {
    await establishSession(session);
    const first = selectWorkspace("org-one", "project-one");
    const second = selectWorkspace("org-two", "project-two");
    await Promise.all([first, second]);
    expect(useWorkspace.getState()).toMatchObject({
      orgId: "org-two",
      projectId: "project-two",
    });
    const saved = await AsyncStorage.getItem("ginjer.workspace.test-id");
    expect(saved && JSON.parse(saved)).toMatchObject({
      orgId: "org-two",
      projectId: "project-two",
    });
  });
});
