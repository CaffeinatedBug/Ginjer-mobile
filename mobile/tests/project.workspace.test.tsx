import React from "react";
import { afterEach, describe, expect, jest, test } from "@jest/globals";
import {
  cleanup,
  fireEvent,
  render,
  screen,
} from "@testing-library/react-native";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { ProjectWorkspaceScreen } from "../src/features/projects/ProjectWorkspaceScreen";
import { useWorkspace } from "../src/lib/workspace";

jest.mock("@react-native-async-storage/async-storage", () => ({
  __esModule: true,
  default: {
    getItem: jest.fn(() => Promise.resolve(null)),
    setItem: jest.fn(() => Promise.resolve()),
    removeItem: jest.fn(() => Promise.resolve()),
  },
}));

jest.mock("../src/lib/repository", () => ({
  repository: {
    listProjects: jest.fn(() =>
      Promise.resolve([
        {
          _id: "p1",
          name: "Water project",
          description: "Real project metadata",
          active: true,
          organisationId: "o1",
          userCount: [],
          deviceCount: [],
          clusterCount: [],
          nonLoRaWANDeviceCount: [],
          location: null,
        },
      ]),
    ),
    listAutomation: jest.fn(() =>
      Promise.resolve({
        alerts: [{ _id: "a1", name: "Pump On", active: true, deleted: false }],
        runs: [
          {
            _id: "r1",
            organisationId: "o1",
            projectId: "p1",
            alertId: "a1",
            trigger: "SCHEDULE_TICK",
            triggeredAt: "2026-10-30T10:00:00Z",
            triggerDeviceId: null,
            state: "SUCCEEDED",
            active: true,
            currentStep: 1,
            updatedAt: "2026-10-30T10:01:00Z",
            finishedAt: "2026-10-30T10:01:00Z",
          },
        ],
      }),
    ),
  },
}));

describe("project workspace", () => {
  afterEach(async () => {
    await cleanup();
  });
  test("opens an automation card and exposes real run details", async () => {
    useWorkspace.setState({
      orgId: "o1",
      projectId: "p1",
      orgName: "Org",
      projectName: "Water project",
    });
    const client = new QueryClient({
      defaultOptions: {
        queries: { retry: false, staleTime: Infinity, gcTime: 0 },
      },
    });
    client.setQueryData(
      ["projects", "o1"],
      [
        {
          _id: "p1",
          name: "Water project",
          description: "Real project metadata",
          active: true,
          organisationId: "o1",
          userCount: [],
          deviceCount: [],
          clusterCount: [],
          nonLoRaWANDeviceCount: [],
          location: null,
        },
      ],
    );
    client.setQueryData(["automation", "o1", "p1"], {
      alerts: [{ _id: "a1", name: "Pump On", active: true, deleted: false }],
      runs: [
        {
          _id: "r1",
          organisationId: "o1",
          projectId: "p1",
          alertId: "a1",
          trigger: "SCHEDULE_TICK",
          triggeredAt: "2026-10-30T10:00:00Z",
          triggerDeviceId: null,
          state: "SUCCEEDED",
          active: true,
          currentStep: 1,
          updatedAt: "2026-10-30T10:01:00Z",
          finishedAt: "2026-10-30T10:01:00Z",
        },
      ],
    });
    await render(
      <SafeAreaProvider
        initialMetrics={{
          frame: { x: 0, y: 0, width: 360, height: 800 },
          insets: { top: 0, left: 0, right: 0, bottom: 0 },
        }}
      >
        <QueryClientProvider client={client}>
          <ProjectWorkspaceScreen
            onBack={jest.fn()}
            onDevices={jest.fn()}
            onLocations={jest.fn()}
            onNotifications={jest.fn()}
          />
        </QueryClientProvider>
      </SafeAreaProvider>,
    );
    fireEvent.press(screen.getByText("Automate"));
    expect(await screen.findByText("Pump On")).toBeTruthy();
    fireEvent.press(screen.getByLabelText("Open Pump On runs"));
    expect(await screen.findByText("Automation Runs")).toBeTruthy();
    fireEvent.press(screen.getByLabelText(/SCHEDULE_TICK/));
    expect(await screen.findByText("Current step: 1")).toBeTruthy();
    client.clear();
  });
});
