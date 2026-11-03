import React from "react";
import { afterEach, describe, expect, jest, test } from "@jest/globals";
import { cleanup, render, screen } from "@testing-library/react-native";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { OrganisationSheet } from "../src/features/organisations/OrganisationSheet";
import { useWorkspace } from "../src/lib/workspace";

jest.mock("@react-native-async-storage/async-storage", () => ({
  __esModule: true,
  default: {
    getItem: jest.fn(() => Promise.resolve(null)),
    setItem: jest.fn(() => Promise.resolve()),
  },
}));
jest.mock("../src/lib/repository", () => ({
  repository: {
    listOrganisations: jest.fn(() =>
      Promise.resolve([
        {
          organisationId: "o1",
          name: "Existing",
          isActive: true,
          isAccepted: true,
          isAdmin: false,
        },
        {
          organisationId: "o2",
          name: "Recently added",
          isActive: true,
          isAccepted: true,
          isAdmin: false,
        },
      ]),
    ),
  },
}));

describe("organisation picker refresh", () => {
  afterEach(async () => {
    await cleanup();
  });

  test("renders a newly returned accepted organisation and exposes refresh", async () => {
    useWorkspace.setState({
      orgId: "o1",
      projectId: "",
      orgName: "Existing",
      projectName: "",
    });
    const client = new QueryClient({
      defaultOptions: { queries: { retry: false, gcTime: 0 } },
    });
    await render(
      <SafeAreaProvider
        initialMetrics={{
          frame: { x: 0, y: 0, width: 360, height: 800 },
          insets: { top: 0, left: 0, right: 0, bottom: 0 },
        }}
      >
        <QueryClientProvider client={client}>
          <OrganisationSheet onClose={jest.fn()} />
        </QueryClientProvider>
      </SafeAreaProvider>,
    );
    expect(await screen.findByText("Recently added")).toBeTruthy();
    expect(screen.getByLabelText("Refresh organizations")).toBeTruthy();
    client.clear();
  });
});
