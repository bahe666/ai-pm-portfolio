import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { fixtureProjects } from "@/lib/fixtures";
import { ProjectCard } from "./project-card";

describe("ProjectCard", () => {
  it("renders a scan-friendly project experience row and links", () => {
    const project = fixtureProjects[0];

    render(<ProjectCard index={0} project={project} />);

    expect(screen.getByText("01")).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: project.title })).toBeInTheDocument();
    expect(screen.getByText(project.summary)).toBeInTheDocument();
    expect(screen.getByText("我的角色")).toBeInTheDocument();
    expect(screen.getByText("AI 使用方式")).toBeInTheDocument();
    expect(screen.getByText("关键判断")).toBeInTheDocument();
    expect(screen.getByText("项目思考")).toBeInTheDocument();
    expect(screen.getByText(project.contribution)).toBeInTheDocument();
    expect(screen.getByText(project.aiUsage)).toBeInTheDocument();
    expect(screen.getByText(project.decisions)).toBeInTheDocument();
    expect(screen.getByText(project.reflection)).toBeInTheDocument();

    expect(screen.getByRole("link", { name: "阅读详情" })).toHaveAttribute(
      "href",
      `/projects/${project.slug}`
    );
    expect(screen.getByRole("link", { name: "查看 Demo" })).toHaveAttribute("href", project.demoUrl);
    expect(screen.getByRole("link", { name: "查看 Demo" })).toHaveAttribute("target", "_blank");
    expect(screen.getByRole("link", { name: "查看 Demo" })).toHaveAttribute("rel", "noreferrer");
  });
});
