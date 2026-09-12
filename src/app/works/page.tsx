"use client";

import { FormEvent, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "../../lib/client";

type Novel = {
  id: string;
  title: string;
  description: string;
  created_at: string;
};

export default function WorksPage() {
  const router = useRouter();

  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(true);
  const [novels, setNovels] = useState<Novel[]>([]);

  const [showCreate, setShowCreate] = useState(false);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");

  const [creating, setCreating] = useState(false);
  const [error, setError] = useState("");

  const loadNovels = async () => {
    const supabase = createClient();

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      router.replace("/login");
      return;
    }

    setEmail(user.email ?? "");

    const { data, error } = await supabase
      .from("novels")
      .select("id, title, description, created_at")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false });

    if (error) {
      setError(error.message);
      setLoading(false);
      return;
    }

    setNovels(data ?? []);
    setLoading(false);
  };

  useEffect(() => {
    loadNovels();
  }, [router]);

  const handleCreateNovel = async (
    event: FormEvent<HTMLFormElement>,
  ) => {
    event.preventDefault();

    if (!title.trim()) {
      setError("请输入作品名称");
      return;
    }

    setCreating(true);
    setError("");

    const supabase = createClient();

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      router.replace("/login");
      return;
    }

    const { data, error } = await supabase
      .from("novels")
      .insert({
        user_id: user.id,
        title: title.trim(),
        description: description.trim(),
      })
      .select("id, title, description, created_at")
      .single();

    if (error) {
      setError(error.message);
      setCreating(false);
      return;
    }

    setNovels((current) => [data, ...current]);

    setTitle("");
    setDescription("");
    setShowCreate(false);
    setCreating(false);
  };

  const handleLogout = async () => {
    const supabase = createClient();

    await supabase.auth.signOut();

    router.replace("/login");
    router.refresh();
  };

  if (loading) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[#f5f0e8] text-[#3a3028]">
        正在加载……
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#f5f0e8] text-[#2d2722]">
      <header className="border-b border-[#d8cec1] bg-[#f8f4ed]">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-5">
          <div>
            <p className="text-sm tracking-[0.2em] text-[#8b7462]">
              WRITER&apos;S STUDIO
            </p>

            <h1 className="mt-1 text-2xl font-semibold">
              伏笔管理器
            </h1>
          </div>

          <button
            onClick={handleLogout}
            className="rounded-full border border-[#b9aa9b] px-4 py-2 text-sm transition hover:bg-[#ebe3d8]"
          >
            退出登录
          </button>
        </div>
      </header>

      <section className="mx-auto max-w-6xl px-6 py-12">
        <div className="mb-10 flex flex-col justify-between gap-6 md:flex-row md:items-end">
          <div>
            <p className="text-sm text-[#8b7462]">
              我的工作台
            </p>

            <h2 className="mt-2 text-4xl font-semibold tracking-tight">
              欢迎回来
            </h2>

            <p className="mt-3 text-[#6f6258]">
              {email}
            </p>
          </div>

          <button
            onClick={() => setShowCreate(true)}
            className="rounded-xl bg-[#3d3028] px-5 py-3 text-sm font-medium text-white transition hover:bg-[#2f251f]"
          >
            ＋ 创建新作品
          </button>
        </div>

        {error && (
          <div className="mb-6 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {error}
          </div>
        )}

        <div className="mb-10 grid gap-6 md:grid-cols-3">
          <div className="rounded-2xl border border-[#d5c9bb] bg-[#faf7f1] p-7">
            <p className="text-sm text-[#8b7462]">
              伏笔
            </p>

            <p className="mt-4 text-4xl font-semibold">
              0
            </p>

            <p className="mt-2 text-sm text-[#75685d]">
              尚未记录伏笔
            </p>
          </div>

          <div className="rounded-2xl border border-[#d5c9bb] bg-[#faf7f1] p-7">
            <p className="text-sm text-[#8b7462]">
              作品
            </p>

            <p className="mt-4 text-4xl font-semibold">
              {novels.length}
            </p>

            <p className="mt-2 text-sm text-[#75685d]">
              已创建作品
            </p>
          </div>

          <div className="rounded-2xl border border-[#d5c9bb] bg-[#faf7f1] p-7">
            <p className="text-sm text-[#8b7462]">
              状态
            </p>

            <p className="mt-4 text-xl font-medium">
              写作中
            </p>

            <p className="mt-2 text-sm text-[#75685d]">
              故事还在继续
            </p>
          </div>
        </div>

        <div>
          <div className="mb-5">
            <h3 className="text-xl font-semibold">
              我的作品
            </h3>

            <p className="mt-1 text-sm text-[#75685d]">
              你的故事、伏笔和秘密都会从这里开始。
            </p>
          </div>

          {novels.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-[#cbbdaf] bg-[#faf7f1] px-6 py-16 text-center">
              <div className="text-4xl">✦</div>

              <h3 className="mt-5 text-xl font-medium">
                还没有作品
              </h3>

              <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-[#75685d]">
                创建你的第一部作品，然后开始记录那些不能忘记的伏笔。
              </p>

              <button
                onClick={() => setShowCreate(true)}
                className="mt-6 rounded-xl bg-[#3d3028] px-5 py-3 text-sm font-medium text-white"
              >
                创建第一部作品
              </button>
            </div>
          ) : (
            <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">
              {novels.map((novel) => (
                <div
                  key={novel.id}
                  onClick={() =>
                    router.push(`/works/novel/${novel.id}`)
                  }
                  className="cursor-pointer rounded-2xl border border-[#d5c9bb] bg-[#faf7f1] p-6 shadow-sm transition hover:-translate-y-1 hover:shadow-md"
                >
                  <p className="text-xs tracking-[0.15em] text-[#9a8574]">
                    NOVEL
                  </p>

                  <h3 className="mt-4 text-xl font-semibold">
                    {novel.title}
                  </h3>

                  <p className="mt-3 min-h-12 text-sm leading-6 text-[#75685d]">
                    {novel.description || "还没有作品简介"}
                  </p>

                  <div className="mt-6 border-t border-[#e2d9ce] pt-4 text-xs text-[#9a8574]">
                    创建于{" "}
                    {new Date(
                      novel.created_at,
                    ).toLocaleDateString("zh-CN")}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </section>

      {showCreate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 px-6">
          <div className="w-full max-w-lg rounded-3xl border border-[#d5c9bb] bg-[#faf7f1] p-7 shadow-xl">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm text-[#8b7462]">
                  NEW STORY
                </p>

                <h2 className="mt-1 text-2xl font-semibold">
                  创建新作品
                </h2>
              </div>

              <button
                onClick={() => setShowCreate(false)}
                className="text-2xl text-[#75685d]"
              >
                ×
              </button>
            </div>

            <form
              onSubmit={handleCreateNovel}
              className="mt-7 space-y-5"
            >
              <div>
                <label className="mb-2 block text-sm font-medium">
                  作品名称
                </label>

                <input
                  value={title}
                  onChange={(event) =>
                    setTitle(event.target.value)
                  }
                  placeholder="例如：我们都没有说出口"
                  className="w-full rounded-xl border border-[#cfc2b4] bg-white px-4 py-3 outline-none focus:border-[#806653]"
                  autoFocus
                />
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium">
                  作品简介
                </label>

                <textarea
                  value={description}
                  onChange={(event) =>
                    setDescription(event.target.value)
                  }
                  placeholder="简单记录一下这部作品……"
                  rows={4}
                  className="w-full resize-none rounded-xl border border-[#cfc2b4] bg-white px-4 py-3 outline-none focus:border-[#806653]"
                />
              </div>

              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowCreate(false)}
                  className="rounded-xl border border-[#cfc2b4] px-5 py-3 text-sm"
                >
                  取消
                </button>

                <button
                  type="submit"
                  disabled={creating}
                  className="rounded-xl bg-[#3d3028] px-5 py-3 text-sm font-medium text-white disabled:opacity-60"
                >
                  {creating ? "正在保存……" : "创建作品"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </main>
  );
}