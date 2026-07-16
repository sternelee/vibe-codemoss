// @vitest-environment jsdom
import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { CodexProviderList } from "./CodexProviderList";

vi.mock("react-i18next", () => ({
  useTranslation: () => ({
    t: (key: string) => key,
  }),
}));

describe("CodexProviderList", () => {
  it("renders header actions next to the add button", () => {
    render(
      <CodexProviderList
        providers={[]}
        loading={false}
        headerActions={
          <button type="button">settings.vendor.pluginModels</button>
        }
        onAdd={vi.fn()}
        onEdit={vi.fn()}
        onDelete={vi.fn()}
      />,
    );

    expect(
      screen.getByRole("button", { name: "settings.vendor.pluginModels" }),
    ).toBeTruthy();
    expect(
      screen.getByRole("button", { name: /settings\.vendor\.add/ }),
    ).toBeTruthy();
  });
});
