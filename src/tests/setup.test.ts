import { describe, expect, it } from "vitest";

import "./setup.ts";

describe("test environment", () => {
  it("includes jest-dom matchers from setup", () => {
    document.body.innerHTML = "";
    expect(document.body).toBeEmptyDOMElement();
  });
});
