"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  getAllProjects,
  deleteProject,
  renameProject,
  type Project,
} from "@/lib/storage";
import NarrowWarning from "@/components/NarrowWarning";
import GovBanner from "@/components/GovBanner";

export default function DashboardPage() {
  const router = useRouter();
  const [projects, setProjects] = useState<Project[]>([]);
  const [deleteTarget, setDeleteTarget] = useState<Project | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState("");

  const loadProjects = useCallback(() => {
    setProjects(getAllProjects());
  }, []);

  useEffect(() => {
    loadProjects();
  }, [loadProjects]);

  async function handleLogout() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/login");
  }

  function handleNewProject() {
    // Store signal for new project in sessionStorage
    sessionStorage.removeItem("slidecraft:story:chat");
    sessionStorage.removeItem("slidecraft:story:md");
    router.push("/app?tab=story");
  }

  function handleOpenProject(project: Project) {
    sessionStorage.setItem("slidecraft:open:project", JSON.stringify(project));
    router.push("/app?tab=slides");
  }

  function handleDeleteConfirm() {
    if (!deleteTarget) return;
    // Check for EN child projects
    const enProjects = projects.filter(
      (p) => p.parentProjectId === deleteTarget.id
    );
    if (enProjects.length > 0) {
      // Delete children too (already confirmed via dialog)
      enProjects.forEach((p) => deleteProject(p.id));
    }
    deleteProject(deleteTarget.id);
    setDeleteTarget(null);
    loadProjects();
    toast.success("プロジェクトを削除しました");
  }

  function startRename(project: Project) {
    setEditingId(project.id);
    setEditingName(project.name);
  }

  function commitRename(id: string) {
    if (editingName.trim()) {
      renameProject(id, editingName.trim());
      loadProjects();
    }
    setEditingId(null);
  }

  function formatDate(iso: string) {
    const d = new Date(iso);
    return `${String(d.getMonth() + 1).padStart(2, "0")}/${String(d.getDate()).padStart(2, "0")}`;
  }

  const enChildIds = new Set(
    projects.filter((p) => p.parentProjectId).map((p) => p.parentProjectId!)
  );

  return (
    <div className="min-h-screen bg-[#F5F5F5]">
      <NarrowWarning />
      {/* Header */}
      <header className="bg-[#54C3E1] text-white px-6 py-3 flex items-center justify-between shadow">
        <h1 className="text-xl font-bold">🎨 Tom&apos;s SlideCraft</h1>
        <button
          onClick={handleLogout}
          className="text-sm text-white/90 hover:text-white underline"
        >
          ログアウト
        </button>
      </header>

      <main className="max-w-5xl mx-auto px-6 py-8">
        <GovBanner />

        {/* New project button */}
        <div className="mb-6">
          <Button
            onClick={handleNewProject}
            className="bg-[#54C3E1] hover:bg-[#3db1d2] text-white"
          >
            + 新規プレゼンを作成
          </Button>
        </div>

        {/* Project list */}
        <h2 className="text-lg font-semibold text-[#333333] mb-4">
          保存済みプレゼン一覧（更新日の新しい順）
        </h2>

        {projects.length === 0 ? (
          <div className="text-center py-16 text-gray-400">
            <p className="text-4xl mb-4">📂</p>
            <p>保存済みのプレゼンはありません</p>
            <p className="text-sm mt-1">「新規プレゼンを作成」からはじめましょう</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {projects.map((project) => (
              <div
                key={project.id}
                className="bg-white rounded-xl border border-gray-200 shadow-sm p-5 flex flex-col gap-3"
              >
                {/* Name (editable) */}
                {editingId === project.id ? (
                  <input
                    autoFocus
                    value={editingName}
                    onChange={(e) => setEditingName(e.target.value)}
                    onBlur={() => commitRename(project.id)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") commitRename(project.id);
                      if (e.key === "Escape") setEditingId(null);
                    }}
                    className="font-semibold text-[#333333] border-b border-[#54C3E1] focus:outline-none w-full"
                  />
                ) : (
                  <button
                    onClick={() => startRename(project)}
                    className="font-semibold text-[#333333] text-left hover:text-[#54C3E1] truncate"
                    title="クリックでリネーム"
                  >
                    {project.name}
                    {project.parentProjectId && (
                      <span className="ml-2 text-xs text-[#54C3E1] bg-[#e8f7fc] px-1.5 py-0.5 rounded">EN</span>
                    )}
                  </button>
                )}
                <p className="text-xs text-gray-400">
                  更新: {formatDate(project.updatedAt)}
                </p>
                <div className="flex gap-2 mt-auto">
                  <Button
                    size="sm"
                    onClick={() => handleOpenProject(project)}
                    className="flex-1 bg-[#54C3E1] hover:bg-[#3db1d2] text-white text-xs"
                  >
                    開く
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => setDeleteTarget(project)}
                    className="flex-1 text-xs text-red-500 border-red-200 hover:bg-red-50"
                  >
                    削除
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>

      {/* Delete dialog */}
      <Dialog open={!!deleteTarget} onOpenChange={() => setDeleteTarget(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>プロジェクトを削除</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-gray-600">
            「{deleteTarget?.name}」を削除します。この操作は取り消せません。
            {deleteTarget && enChildIds.has(deleteTarget.id) && (
              <span className="block mt-2 text-orange-600">
                ⚠️ この日本語版に対応する英語版プロジェクトも一緒に削除されます。
              </span>
            )}
          </p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteTarget(null)}>
              キャンセル
            </Button>
            <Button
              className="bg-red-500 hover:bg-red-600 text-white"
              onClick={handleDeleteConfirm}
            >
              削除する
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
