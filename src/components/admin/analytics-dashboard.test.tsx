import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { EMPTY_DASHBOARD, type PaginatedSessions } from "@/lib/data/analytics";
import { AnalyticsDashboard } from "./analytics-dashboard";

const emptySessions: PaginatedSessions = {
  items: [],
  page: 1,
  pageSize: 12,
  total: 0,
  totalPages: 0
};

describe("AnalyticsDashboard", () => {
  it("renders real data volume and useful empty states", () => {
    render(<AnalyticsDashboard data={EMPTY_DASHBOARD} sessions={emptySessions} />);

    expect(screen.getByRole("heading", { name: "当前真实数据量" })).toBeInTheDocument();
    expect(screen.getByText("项目数据")).toBeInTheDocument();
    expect(screen.getByText("投递链接")).toBeInTheDocument();
    expect(screen.getByText("会话记录")).toBeInTheDocument();
    expect(screen.getByText("事件记录")).toBeInTheDocument();

    expect(
      screen.getByText("暂无项目详情访问。等有访客进入项目、阅读 PRD 或点击 Demo 后，这里会显示真实兴趣排序。")
    ).toBeInTheDocument();
    expect(
      screen.getByText("暂无投递链接访问。创建专属链接并被打开后，这里会显示公司/岗位对比。")
    ).toBeInTheDocument();
    expect(
      screen.getByText("暂无 JD 标签偏好。带标签的投递链接产生访问后，这里会出现真实统计。")
    ).toBeInTheDocument();
    expect(
      screen.getByText("暂无 PRD 阅读事件。访客打开并阅读 PRD 后，这里会显示小节兴趣。")
    ).toBeInTheDocument();
  });
});
