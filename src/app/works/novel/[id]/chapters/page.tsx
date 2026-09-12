"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { createClient } from "../../../../../lib/client";

type Novel = {
  id: string;
  title: string;
};

type Chapter = {
  id: string;
  novel_id: string;
  user_id: string;
  chapter_number: number;
  title: string;
  summary: string;
  notes: string;
  word_count: number;
  created_at: string;
  updated_at: string;
};

const selectFields =
  "id, novel_id, user_id, chapter_number, title, summary, notes, word_count, created_at, updated_at";

function parsePositiveInteger(value: string) {
  const number = Number.parseInt(value.trim(), 10);
  return Number.isFinite(number) && number > 0 ? number : 0;
}

export default function ChaptersPage() {
  const router = useRouter();
  const params = useParams<{ id: string }>();
  const novelId = params?.id;

  const [novel, setNovel] = useState<Novel | null>(null);
  const [chapters, setChapters] = useState<Chapter[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingChapters, setLoadingChapters] = useState(true);
  const [error, setError] = useState("");
  const [saveError, setSaveError] = useState("");

  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const [chapterNumber, setChapterNumber] = useState("");
  const [title, setTitle] = useState("");
  const [summary, setSummary] = useState("");
  const [notes, setNotes] = useState("");
  const [wordCount, setWordCount] = useState("");

  const [search, setSearch] = useState("");

  const resetForm = useCallback(() => {
    setEditingId(null);
    setChapterNumber("");
    setTitle("");
    setSummary("");
    setNotes("");
    setWordCount("");
    setSaveError("");
  }, []);

  const closeModal = useCallback(() => {
    setShowModal(false);
    resetForm();
  }, [resetForm]);

  const loadChapters = useCallback(
    async (userId: string) => {
      if (!novelId) return;

      setLoadingChapters(true);
      setSaveError("");

      const supabase = createClient();

      const { data, error: chapterError } = await supabase
        .from("chapters")
        .select(selectFields)
        .eq("novel_id", novelId)
        .eq("user_id", userId)
        .order("chapter_number", { ascending: true });

      if (chapterError) {
        setSaveError(chapterError.message);
        setLoadingChapters(false);
        return;
      }

      setChapters((data ?? []) as Chapter[]);
      setLoadingChapters(false);
    },
    [novelId],
  );

  useEffect(() => {
    if (!novelId) return;

    let cancelled = false;

    async function loadData() {
      setLoading(true);
      setError("");

      const supabase = createClient();

      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (cancelled) return;

      if (!user) {
        router.replace("/login");
        return;
      }

      const { data: novelData, error: novelError } = await supabase
        .from("novels")
        .select("id, title")
        .eq("id", novelId)
        .eq("user_id", user.id)
        .single();

      if (cancelled) return;

      if (novelError) {
        setError(novelError.message);
        setLoading(false);
        return;
      }

      setNovel(novelData as Novel);
      await loadChapters(user.id);

      if (!cancelled) {
        setLoading(false);
      }
    }

    void loadData();

    return () => {
      cancelled = true;
    };
  }, [novelId, router, loadChapters]);

  const openCreate = () => {
    resetForm();

    const nextNumber =
      chapters.length > 0
        ? Math.max(...chapters.map((chapter) => chapter.chapter_number)) + 1
        : 1;

    setChapterNumber(String(nextNumber));
    setShowModal(true);
  };

  const openEdit = (chapter: Chapter) => {
    setEditingId(chapter.id);
    setChapterNumber(String(chapter.chapter_number));
    setTitle(chapter.title);
    setSummary(chapter.summary || "");
    setNotes(chapter.notes || "");
    setWordCount(
      chapter.word_count > 0 ? String(chapter.word_count) : "",
    );
    setSaveError("");
    setShowModal(true);
  };

  const handleSave = async () => {
    const number = parsePositiveInteger(chapterNumber);

    if (!number) {
      setSaveError("章节编号必须是大于 0 的整数。");
      return;
    }

    if (!title.trim()) {
      setSaveError("请先填写章节标题。");
      return;
    }

    const parsedWordCount =
      wordCount.trim() === ""
        ? 0
        : Number.parseInt(wordCount.trim(), 10);

    if (
      wordCount.trim() !== "" &&
      (!Number.isFinite(parsedWordCount) || parsedWordCount < 0)
    ) {
      setSaveError("字数必须是大于等于 0 的整数。");
      return;
    }

    setSaving(true);
    setSaveError("");

    const supabase = createClient();

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      router.replace("/login");
      return;
    }

    const payload = {
      novel_id: novelId,
      user_id: user.id,
      chapter_number: number,
      title: title.trim(),
      summary: summary.trim(),
      notes: notes.trim(),
      word_count: parsedWordCount,
      updated_at: new Date().toISOString(),
    };

    if (editingId) {
      const { data, error: updateError } = await supabase
        .from("chapters")
        .update({
          chapter_number: payload.chapter_number,
          title: payload.title,
          summary: payload.summary,
          notes: payload.notes,
          word_count: payload.word_count,
          updated_at: payload.updated_at,
        })
        .eq("id", editingId)
        .eq("novel_id", novelId)
        .eq("user_id", user.id)
        .select(selectFields)
        .single();

      if (updateError) {
        setSaveError(updateError.message);
        setSaving(false);
        return;
      }

      setChapters((current) =>
        current
          .map((item) =>
            item.id === editingId ? (data as Chapter) : item,
          )
          .sort((a, b) => a.chapter_number - b.chapter_number),
      );
    } else {
      const { data, error: insertError } = await supabase
        .from("chapters")
        .insert(payload)
        .select(selectFields)
        .single();

      if (insertError) {
        if (insertError.code === "23505") {
          setSaveError(`第 ${number} 章已经存在，请换一个章节编号。`);
        } else {
          setSaveError(insertError.message);
        }
        setSaving(false);
        return;
      }

      setChapters((current) =>
        [...current, data as Chapter].sort(
          (a, b) => a.chapter_number - b.chapter_number,
        ),
      );
    }

    closeModal();
    setSaving(false);
  };

  const handleDelete = async (chapter: Chapter) => {
    const confirmed = window.confirm(
      `确定要删除「第 ${chapter.chapter_number} 章 ${chapter.title}」吗？删除后无法恢复。`,
    );

    if (!confirmed) return;

    const supabase = createClient();

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      router.replace("/login");
      return;
    }

    const { error: deleteError } = await supabase
      .from("chapters")
      .delete()
      .eq("id", chapter.id)
      .eq("novel_id", novelId)
      .eq("user_id", user.id);

    if (deleteError) {
      setSaveError(deleteError.message);
      return;
    }

    setChapters((current) =>
      current.filter((item) => item.id !== chapter.id),
    );
  };

  const filteredChapters = useMemo(() => {
    const keyword = search.trim().toLowerCase();

    if (!keyword) return chapters;

    return chapters.filter((chapter) => {
      return (
        chapter.title.toLowerCase().includes(keyword) ||
        chapter.summary.toLowerCase().includes(keyword) ||
        chapter.notes.toLowerCase().includes(keyword) ||
        String(chapter.chapter_number).includes(keyword)
      );
    });
  }, [chapters, search]);

  const totalWords = useMemo(
    () => chapters.reduce((sum, chapter) => sum + (chapter.word_count || 0), 0),
    [chapters],
  );

  if (loading) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[#f5f0e8] text-[#332b26]">
        正在打开章节管理……
      </main>
    );
  }

  if (error || !novel) {
    return (
      <main className="min-h-screen bg-[#f5f0e8] px-6 py-16 text-[#332b26]">
        <div className="mx-auto max-w-3xl">
          <button
            onClick={() => router.push(`/works/novel/${novelId}`)}
            className="mb-8 text-sm text-[#6b625b] transition hover:text-[#241f1c]"
          >
            ← 返回作品
          </button>

          <div className="rounded-3xl border border-[#d8cec2] bg-[#fbf8f2] p-8">
            <h1 className="text-2xl font-semibold text-[#241f1c]">
              无法打开章节管理
            </h1>
            <p className="mt-3 text-sm text-[#766c64]">
              {error || "没有找到这部作品。"}
            </p>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#f5f0e8] text-[#332b26]">
      <div className="mx-auto max-w-6xl px-5 py-8 md:px-8 md:py-12">
        <div className="mb-10">
          <button
            onClick={() => router.push(`/works/novel/${novelId}`)}
            className="mb-7 text-sm text-[#756b63] transition hover:text-[#241f1c]"
          >
            ← 返回作品
          </button>

          <div className="flex flex-col gap-6 md:flex-row md:items-end md:justify-between">
            <div>
              <p className="mb-3 text-xs tracking-[0.28em] text-[#9a8c7e]">
                CHAPTERS
              </p>

              <h1 className="text-4xl font-semibold tracking-tight text-[#241f1c] md:text-5xl">
                章节管理
              </h1>

              <p className="mt-4 text-[#756b63]">
                {novel.title}
              </p>
            </div>

            <button
              onClick={openCreate}
              className="rounded-2xl bg-[#332b26] px-6 py-3 text-sm font-medium text-[#f8f2e9] shadow-sm transition hover:bg-[#241f1c]"
            >
              + 新建章节
            </button>
          </div>
        </div>

        <div className="mb-8 grid gap-4 sm:grid-cols-3">
          <div className="rounded-3xl border border-[#ded4c8] bg-[#fbf8f2] p-6">
            <p className="text-sm text-[#887d74]">章节总数</p>
            <p className="mt-2 text-3xl font-semibold text-[#302923]">
              {chapters.length}
            </p>
          </div>

          <div className="rounded-3xl border border-[#ded4c8] bg-[#fbf8f2] p-6">
            <p className="text-sm text-[#887d74]">总字数</p>
            <p className="mt-2 text-3xl font-semibold text-[#302923]">
              {totalWords.toLocaleString("zh-CN")}
            </p>
          </div>

          <div className="rounded-3xl border border-[#ded4c8] bg-[#fbf8f2] p-6">
            <p className="text-sm text-[#887d74]">当前章节</p>
            <p className="mt-2 text-3xl font-semibold text-[#302923]">
              {chapters.length
                ? `第 ${chapters[chapters.length - 1].chapter_number} 章`
                : "—"}
            </p>
          </div>
        </div>

        {saveError && (
          <div className="mb-6 rounded-2xl border border-[#d7b8b1] bg-[#f8e9e5] px-5 py-4 text-sm text-[#7b3932]">
            {saveError}
          </div>
        )}

        <section>
          <div className="mb-5 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="text-xs tracking-[0.25em] text-[#9a8c7e]">
                CHAPTER LIST
              </p>
              <h2 className="mt-2 text-2xl font-semibold text-[#302923]">
                故事章节
              </h2>
            </div>

            <div className="w-full sm:w-80">
              <input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="搜索章节编号、标题、简介……"
                className="w-full rounded-2xl border border-[#d6cbbf] bg-[#fbf8f2] px-4 py-3 text-sm outline-none transition focus:border-[#92786b] focus:ring-2 focus:ring-[#92786b]/10"
              />
            </div>
          </div>

          {loadingChapters ? (
            <div className="rounded-3xl border border-[#ded4c8] bg-[#fbf8f2] p-10 text-center text-sm text-[#887d74]">
              正在读取章节……
            </div>
          ) : chapters.length === 0 ? (
            <div className="rounded-3xl border border-dashed border-[#cfc3b6] bg-[#faf6ee] p-12 text-center">
              <div className="text-4xl">☷</div>

              <h3 className="mt-5 text-xl font-semibold text-[#302923]">
                还没有章节
              </h3>

              <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-[#82776e]">
                从第一章开始建立你的故事时间轴。之后伏笔、人物和剧情都可以逐渐与章节对应起来。
              </p>

              <button
                onClick={openCreate}
                className="mt-6 rounded-2xl bg-[#332b26] px-6 py-3 text-sm font-medium text-[#f8f2e9]"
              >
                创建第一章
              </button>
            </div>
          ) : filteredChapters.length === 0 ? (
            <div className="rounded-3xl border border-dashed border-[#cfc3b6] bg-[#faf6ee] p-12 text-center">
              <div className="text-4xl">⌕</div>
              <h3 className="mt-5 text-xl font-semibold text-[#302923]">
                没有找到匹配章节
              </h3>
              <button
                onClick={() => setSearch("")}
                className="mt-6 rounded-2xl border border-[#cfc3b6] px-6 py-3 text-sm text-[#665c54] transition hover:bg-[#f0e9df]"
              >
                清除搜索
              </button>
            </div>
          ) : (
            <div className="space-y-4">
              {filteredChapters.map((chapter) => (
                <article
                  key={chapter.id}
                  className="rounded-3xl border border-[#ded4c8] bg-[#fbf8f2] p-6 shadow-[0_8px_30px_rgba(70,50,35,0.04)] transition hover:border-[#cfc1b3]"
                >
                  <div className="flex flex-col gap-5 md:flex-row md:items-start md:justify-between">
                    <div className="flex gap-5">
                      <div className="flex h-12 min-w-12 items-center justify-center rounded-2xl bg-[#eee6dc] px-3 text-sm font-semibold text-[#6d6259]">
                        {chapter.chapter_number}
                      </div>

                      <div>
                        <p className="text-xs tracking-[0.16em] text-[#9a8c7e]">
                          CHAPTER {chapter.chapter_number}
                        </p>

                        <h3 className="mt-1 text-xl font-semibold text-[#302923]">
                          {chapter.title}
                        </h3>

                        {chapter.summary && (
                          <p className="mt-3 whitespace-pre-wrap text-sm leading-7 text-[#756b63]">
                            {chapter.summary}
                          </p>
                        )}
                      </div>
                    </div>

                    <div className="flex shrink-0 items-center gap-4">
                      <button
                        onClick={() => openEdit(chapter)}
                        className="text-xs text-[#7b4b43] hover:underline"
                      >
                        编辑
                      </button>

                      <button
                        onClick={() => handleDelete(chapter)}
                        className="text-xs text-[#9a8e85] transition hover:text-[#8a3f38]"
                      >
                        删除
                      </button>
                    </div>
                  </div>

                  <div className="mt-5 grid gap-3 border-t border-[#e6ded4] pt-5 sm:grid-cols-2">
                    <div>
                      <p className="text-xs text-[#9a8e85]">章节字数</p>
                      <p className="mt-1 text-sm text-[#514840]">
                        {chapter.word_count > 0
                          ? `${chapter.word_count.toLocaleString("zh-CN")} 字`
                          : "未填写"}
                      </p>
                    </div>

                    <div>
                      <p className="text-xs text-[#9a8e85]">最后更新</p>
                      <p className="mt-1 text-sm text-[#514840]">
                        {new Date(chapter.updated_at).toLocaleString("zh-CN")}
                      </p>
                    </div>
                  </div>

                  {chapter.notes && (
                    <div className="mt-5 rounded-2xl bg-[#f4eee6] p-4">
                      <p className="text-xs text-[#9a8e85]">作者备注</p>
                      <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-[#625850]">
                        {chapter.notes}
                      </p>
                    </div>
                  )}
                </article>
              ))}
            </div>
          )}
        </section>
      </div>

      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#241f1c]/40 px-4 py-6">
          <div className="max-h-[92vh] w-full max-w-2xl overflow-y-auto rounded-3xl border border-[#d8cec2] bg-[#fbf8f2] p-6 shadow-2xl md:p-8">
            <div className="mb-7 flex items-start justify-between gap-4">
              <div>
                <p className="text-xs tracking-[0.25em] text-[#9a8c7e]">
                  {editingId ? "EDIT CHAPTER" : "NEW CHAPTER"}
                </p>

                <h2 className="mt-2 text-2xl font-semibold text-[#302923]">
                  {editingId ? "编辑章节" : "新建章节"}
                </h2>
              </div>

              <button
                onClick={closeModal}
                className="text-2xl text-[#8b8077] transition hover:text-[#302923]"
                aria-label="关闭"
              >
                ×
              </button>
            </div>

            <div className="space-y-5">
              <div className="grid gap-4 sm:grid-cols-[160px_1fr]">
                <div>
                  <label className="mb-2 block text-sm font-medium text-[#514840]">
                    章节编号 *
                  </label>

                  <input
                    type="number"
                    min="1"
                    step="1"
                    value={chapterNumber}
                    onChange={(event) => setChapterNumber(event.target.value)}
                    placeholder="1"
                    className="w-full rounded-2xl border border-[#d6cbbf] bg-white/60 px-4 py-3 text-sm outline-none transition focus:border-[#92786b] focus:ring-2 focus:ring-[#92786b]/10"
                  />
                </div>

                <div>
                  <label className="mb-2 block text-sm font-medium text-[#514840]">
                    章节标题 *
                  </label>

                  <input
                    value={title}
                    onChange={(event) => setTitle(event.target.value)}
                    placeholder="例如：雨夜来客"
                    className="w-full rounded-2xl border border-[#d6cbbf] bg-white/60 px-4 py-3 text-sm outline-none transition focus:border-[#92786b] focus:ring-2 focus:ring-[#92786b]/10"
                  />
                </div>
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium text-[#514840]">
                  章节简介
                </label>

                <textarea
                  value={summary}
                  onChange={(event) => setSummary(event.target.value)}
                  placeholder="记录这一章发生了什么、推进了哪些剧情。"
                  rows={5}
                  className="w-full resize-none rounded-2xl border border-[#d6cbbf] bg-white/60 px-4 py-3 text-sm leading-6 outline-none transition focus:border-[#92786b] focus:ring-2 focus:ring-[#92786b]/10"
                />
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium text-[#514840]">
                  章节字数
                </label>

                <input
                  type="number"
                  min="0"
                  step="1"
                  value={wordCount}
                  onChange={(event) => setWordCount(event.target.value)}
                  placeholder="例如：3200"
                  className="w-full rounded-2xl border border-[#d6cbbf] bg-white/60 px-4 py-3 text-sm outline-none transition focus:border-[#92786b] focus:ring-2 focus:ring-[#92786b]/10"
                />
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium text-[#514840]">
                  作者备注
                </label>

                <textarea
                  value={notes}
                  onChange={(event) => setNotes(event.target.value)}
                  placeholder="只有作者自己需要知道的信息。"
                  rows={4}
                  className="w-full resize-none rounded-2xl border border-[#d6cbbf] bg-white/60 px-4 py-3 text-sm leading-6 outline-none transition focus:border-[#92786b] focus:ring-2 focus:ring-[#92786b]/10"
                />
              </div>

              {saveError && (
                <div className="rounded-2xl border border-[#d7b8b1] bg-[#f8e9e5] px-4 py-3 text-sm text-[#7b3932]">
                  {saveError}
                </div>
              )}

              <div className="flex flex-col-reverse gap-3 pt-2 sm:flex-row sm:justify-end">
                <button
                  onClick={closeModal}
                  className="rounded-2xl border border-[#d4c8bb] px-6 py-3 text-sm text-[#665c54] transition hover:bg-[#f3ede5]"
                >
                  取消
                </button>

                <button
                  onClick={handleSave}
                  disabled={saving}
                  className="rounded-2xl bg-[#332b26] px-7 py-3 text-sm font-medium text-[#f8f2e9] transition hover:bg-[#241f1c] disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {saving
                    ? "正在保存……"
                    : editingId
                      ? "保存修改"
                      : "保存章节"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
