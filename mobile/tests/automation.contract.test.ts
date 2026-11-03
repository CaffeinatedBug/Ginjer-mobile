import { beforeEach, describe, expect, jest, test } from "@jest/globals";
import { request } from "../src/lib/graphql";
import { operations } from "../src/lib/operations";
import { repository } from "../src/lib/repository";

jest.mock("../src/lib/graphql", () => ({ request: jest.fn() }));

const mockedRequest = jest.mocked(request);

describe("automation mutation contracts", () => {
  beforeEach(() => {
    mockedRequest.mockReset();
  });

  test("toggles an automation using its full workspace scope", async () => {
    mockedRequest.mockResolvedValueOnce({
      toggleAlert: { _id: "alert-1", name: null, active: false, deleted: null },
    });

    await expect(
      repository.toggleAutomation("org-1", "project-1", "alert-1"),
    ).resolves.toMatchObject({ _id: "alert-1", active: false });

    expect(mockedRequest).toHaveBeenCalledWith(
      operations.ToggleAlert,
      {
        alertParamsInput: {
          organisationId: "org-1",
          projectId: "project-1",
          alertId: "alert-1",
        },
      },
      expect.anything(),
      { mutation: true },
    );
  });

  test("starts a manual automation without fabricating a run response", async () => {
    mockedRequest.mockResolvedValueOnce({ manualAutomation: true });

    await expect(repository.runAutomation("alert-1")).resolves.toBe(true);
    expect(mockedRequest).toHaveBeenCalledWith(
      operations.ManualAutomation,
      { alertId: "alert-1" },
      expect.anything(),
      { mutation: true },
    );
  });
});
