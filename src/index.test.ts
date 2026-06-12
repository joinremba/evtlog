import { expect, test } from "bun:test";
import { catalog } from "./index";

test("catalog", () => {
  expect(catalog()).toBe("catalog");
});
