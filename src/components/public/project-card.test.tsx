import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { fixtureProjects } from "@/lib/fixtures";
import { summarizeMarkdown } from "@/lib/markdown";
import { ProjectCard } from "./project-card";

describe("ProjectCard", () => {
  it("renders project evidence and links", () => {
    const project = fixtureProjects[0];

    render(<ProjectCard project={project} />);

    expect(screen.getByRole("img", { name: /原型截图|首页预览/ })).toHaveAttribute("src", project.coverImageUrl);
    expect(screen.getByRole("heading", { name: project.title })).toBeInTheDocument();
    expect(screen.getByText(project.summary)).toBeInTheDocument();
    expect(screen.getByText(project.contribution)).toBeInTheDocument();
    expect(screen.getByText(project.aiUsage)).toBeInTheDocument();
    expect(screen.getByText(project.decisions)).toBeInTheDocument();
    expect(screen.getByText(summarizeMarkdown(project.prdMarkdown, 120))).toBeInTheDocument();

    expect(screen.getByRole("link", { name: "阅读详情" })).toHaveAttribute(
      "href",
      `/projects/${project.slug}`
    );
    expect(screen.getByRole("link", { name: "查看 Demo" })).toHaveAttribute("href", project.demoUrl);
    expect(screen.getByRole("link", { name: "查看 Demo" })).toHaveAttribute("target", "_blank");
    expect(screen.getByRole("link", { name: "查看 Demo" })).toHaveAttribute("rel", "noreferrer");
  });
});
