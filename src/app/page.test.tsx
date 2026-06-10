import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import HomePage from "./page";

describe("HomePage", () => {
  it("renders the opening portfolio copy", () => {
    render(<HomePage />);

    expect(screen.getByRole("heading", { name: "AI PM Portfolio" })).toBeInTheDocument();
    expect(screen.getByText(/如果你只有 3 分钟认识我/)).toBeInTheDocument();
  });
});
