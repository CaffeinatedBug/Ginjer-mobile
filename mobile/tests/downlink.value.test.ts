import { describe, expect, jest, test } from "@jest/globals";
import { controllerValue } from "../src/features/downlink";

jest.mock("@react-native-async-storage/async-storage", () => ({
  __esModule: true,
  default: {
    getItem: jest.fn(() => Promise.resolve(null)),
    setItem: jest.fn(() => Promise.resolve()),
    removeItem: jest.fn(() => Promise.resolve()),
  },
}));

describe("downlink controller values", () => {
  test("normalizes Busylight colour commands to the case-sensitive controller contract", () => {
    expect(controllerValue("Set Color (Red, Blue, Green, or Off)", "Red")).toBe(
      "Red",
    );
    expect(controllerValue("Set Color", " OFF ")).toBe("Off");
  });

  test("keeps other controller values unchanged apart from whitespace", () => {
    expect(controllerValue("Relay 1", "Off")).toBe("Off");
  });
});
