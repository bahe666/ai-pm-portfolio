import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import LoginPage from "./page";

describe("LoginPage", () => {
  it("renders email code verification after an OTP is sent", async () => {
    render(
      await LoginPage({
        searchParams: Promise.resolve({
          email: "you@example.com",
          message: "code-sent"
        })
      })
    );

    expect(screen.getByRole("status")).toHaveTextContent("验证码已发送");
    expect(screen.getByLabelText("验证码")).toHaveAttribute("name", "token");
    expect(screen.getAllByDisplayValue("you@example.com").at(-1)).toHaveAttribute("name", "email");
    expect(screen.getByRole("button", { name: "验证并进入后台" })).toBeInTheDocument();
  });

  it("still renders code verification when the email request reports a failure", async () => {
    render(
      await LoginPage({
        searchParams: Promise.resolve({
          email: "you@example.com",
          message: "send-failed"
        })
      })
    );

    expect(screen.getByRole("status")).toHaveTextContent("如果你已经收到验证码");
    expect(screen.getByLabelText("验证码")).toHaveAttribute("name", "token");
    expect(screen.getByRole("button", { name: "验证并进入后台" })).toBeInTheDocument();
  });
});
