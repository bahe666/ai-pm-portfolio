"use client";

export function ProjectDeleteButton({ projectTitle }: { projectTitle: string }) {
  return (
    <button
      className="admin-button admin-button--danger"
      type="submit"
      onClick={(event) => {
        if (!window.confirm(`确认删除「${projectTitle}」吗？历史访问事件会保留为已删除项目。`)) {
          event.preventDefault();
        }
      }}
    >
      删除项目
    </button>
  );
}
