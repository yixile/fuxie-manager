"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import {
  ChevronDown,
  ChevronUp,
  Plus,
  Search,
  Users,
  BookOpen,
  Sparkles,
  X,
} from "lucide-react";
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

type Character = {
  id: string;
  name: string;
  alias: string;
  role: string;
};

type CharacterChapter = {
  character_id: string;
  chapter_id: string;
  novel_id: string;
  user_id: string;
  relation: string;
  notes: string;
};

type Foreshadowing = {
  id: string;
  title: string;
  type: string;
  status: string;
  planted_chapter_id: string | null;
  reappear_chapter_id: string | null;
  reveal_chapter_id: string | null;
  actual_reveal_chapter_id: string | null;
};

const selectFields =
  "id, novel_id, user_id, chapter_number, title, summary, notes, word_count, created_at, updated_at";

const characterFields = "id, name, alias, role";

const foreshadowingFields =
  "id, title, type, status, planted_chapter_id, reappear_chapter_id, reveal_chapter_id, actual_reveal_chapter_id";

const relationOptions = [
  "出现",
  "首次登场",
  "重要登场",
  "冲突",
  "对话",
  "行动",
  "揭露秘密",
  "情感变化",
  "离场",
  "其他",
];

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
  const [characters, setCharacters] = useState<Character[]>([]);
  const [characterLinks, setCharacterLinks] = useState<CharacterChapter[]>([]);
  const [foreshadowings, setForeshadowings] = useState<Foreshadowing[]>([]);

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
  const [expandedChapter, setExpandedChapter] = useState<string | null>(null);

  const [showCharacterEditor, setShowCharacterEditor] = useState(false);
  const [characterEditorChapter, setCharacterEditorChapter] =
    useState<Chapter | null>(null);
  const [selectedCharacters, setSelectedCharacters] = useState<string[]>([]);
  const [characterRelations, setCharacterRelations] = useState<
    Record<string, string>
  >({});
  const [characterNotes, setCharacterNotes] = useState<Record<string, string>>(
    {},
  );
  const [savingCharacters, setSavingCharacters] = useState(false);

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

  const loadAllData = useCallback(
    async (userId: string) => {
      if (!novelId) return;

      setLoadingChapters(true);
      setSaveError("");

      const supabase = createClient();

      const [
        chaptersResult,
        charactersResult,
        characterLinksResult,
        foreshadowingsResult,
      ] = await Promise.all([
        supabase
          .from("chapters")
          .select(selectFields)
          .eq("novel_id", novelId)
          .eq("user_id", userId)
          .order("chapter_number", { ascending: true }),

        supabase
          .from("characters")
          .select(characterFields)
          .eq("novel_id", novelId)
          .eq("user_id", userId)
          .order("name", { ascending: true }),

        supabase
          .from("character_chapters")
          .select(
            "character_id, chapter_id, novel_id, user_id, relation, notes",
          )
          .eq("novel_id", novelId)
          .eq("user_id", userId),

        supabase
          .from("foreshadowings")
          .select(foreshadowingFields)
          .eq("novel_id", novelId)
          .eq("user_id", userId)
          .order("created_at", { ascending: false }),
      ]);

      if (chaptersResult.error) {
        setSaveError(chaptersResult.error.message);
        setLoadingChapters(false);
        return;
      }

      setChapters((chaptersResult.data ?? []) as Chapter[]);

      if (charactersResult.error) {
        setError(`人物读取失败：${charactersResult.error.message}`);
      } else {
        setCharacters((charactersResult.data ?? []) as Character[]);
      }

      if (characterLinksResult.error) {
        setError(`人物章节关联读取失败：${characterLinksResult.error.message}`);
      } else {
        setCharacterLinks(
          (characterLinksResult.data ?? []) as CharacterChapter[],
        );
      }

      if (foreshadowingsResult.error) {
        setError(`伏笔读取失败：${foreshadowingsResult.error.message}`);
      } else {
        setForeshadowings(
          (foreshadowingsResult.data ?? []) as Foreshadowing[],
        );
      }

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
      await loadAllData(user.id);

      if (!cancelled) {
        setLoading(false);
      }
    }

    void loadData();

    return () => {
      cancelled = true;
    };
  }, [novelId, router, loadAllData]);

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
        if (updateError.code === "23505") {
          setSaveError(`第 ${number} 章已经存在，请换一个章节编号。`);
        } else {
          setSaveError(updateError.message);
        }
        setSaving(false);
        return;
      }

      setChapters((current) =>
        current
          .map((item) => (item.id === editingId ? (data as Chapter) : item))
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

    setCharacterLinks((current) =>
      current.filter((item) => item.chapter_id !== chapter.id),
    );
  };

  const toggleChapter = (chapterId: string) => {
    setExpandedChapter((current) =>
      current === chapterId ? null : chapterId,
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
    () =>
      chapters.reduce(
        (sum, chapter) => sum + (chapter.word_count || 0),
        0,
      ),
    [chapters],
  );

  const getChapterCharacters = useCallback(
    (chapterId: string) => {
      const links = characterLinks.filter(
        (link) => link.chapter_id === chapterId,
      );

      return links
        .map((link) => {
          const character = characters.find(
            (item) => item.id === link.character_id,
          );
          return character ? { character, link } : null;
        })
        .filter(
          (
            item,
          ): item is { character: Character; link: CharacterChapter } =>
            Boolean(item),
        );
    },
    [characterLinks, characters],
  );

  const getChapterForeshadowings = useCallback(
    (chapterId: string) => {
      return foreshadowings.filter(
        (item) =>
          item.planted_chapter_id === chapterId ||
          item.reappear_chapter_id === chapterId ||
          item.reveal_chapter_id === chapterId ||
          item.actual_reveal_chapter_id === chapterId,
      );
    },
    [foreshadowings],
  );

  const getForeshadowEvents = (item: Foreshadowing, chapterId: string) => {
    const events: string[] = [];

    if (item.planted_chapter_id === chapterId) events.push("埋下");
    if (item.reappear_chapter_id === chapterId) events.push("再现");
    if (item.reveal_chapter_id === chapterId) events.push("计划回收");
    if (item.actual_reveal_chapter_id === chapterId) events.push("实际回收");

    return events;
  };

  const openCharacterEditor = (chapter: Chapter) => {
    const links = characterLinks.filter(
      (item) => item.chapter_id === chapter.id,
    );

    const selected = links.map((item) => item.character_id);
    const relations: Record<string, string> = {};
    const notesMap: Record<string, string> = {};

    links.forEach((item) => {
      relations[item.character_id] = item.relation || "出现";
      notesMap[item.character_id] = item.notes || "";
    });

    setCharacterEditorChapter(chapter);
    setSelectedCharacters(selected);
    setCharacterRelations(relations);
    setCharacterNotes(notesMap);
    setShowCharacterEditor(true);
  };

  const closeCharacterEditor = () => {
    if (savingCharacters) return;
    setShowCharacterEditor(false);
    setCharacterEditorChapter(null);
    setSelectedCharacters([]);
    setCharacterRelations({});
    setCharacterNotes({});
  };

  const toggleCharacterSelection = (characterId: string) => {
    setSelectedCharacters((current) =>
      current.includes(characterId)
        ? current.filter((id) => id !== characterId)
        : [...current, characterId],
    );
  };

  const handleSaveCharacters = async () => {
    if (!characterEditorChapter || !novelId) return;

    setSavingCharacters(true);
    setSaveError("");

    const supabase = createClient();

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      router.replace("/login");
      return;
    }

    const { error: deleteError } = await supabase
      .from("character_chapters")
      .delete()
      .eq("chapter_id", characterEditorChapter.id)
      .eq("novel_id", novelId)
      .eq("user_id", user.id);

    if (deleteError) {
      setSaveError(deleteError.message);
      setSavingCharacters(false);
      return;
    }

    if (selectedCharacters.length > 0) {
      const rows = selectedCharacters.map((characterId) => ({
        character_id: characterId,
        chapter_id: characterEditorChapter.id,
        novel_id: novelId,
        user_id: user.id,
        relation: characterRelations[characterId] || "出现",
        notes: (characterNotes[characterId] || "").trim(),
      }));

      const { error: insertError } = await supabase
        .from("character_chapters")
        .insert(rows);

      if (insertError) {
        setSaveError(insertError.message);
        setSavingCharacters(false);
        return;
      }
    }

    const { data: refreshedLinks, error: refreshError } = await supabase
      .from("character_chapters")
      .select(
        "character_id, chapter_id, novel_id, user_id, relation, notes",
      )
      .eq("novel_id", novelId)
      .eq("user_id", user.id);

    if (refreshError) {
      setSaveError(refreshError.message);
    } else {
      setCharacterLinks((refreshedLinks ?? []) as CharacterChapter[]);
      closeCharacterEditor();
    }

    setSavingCharacters(false);
  };

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

              <p className="mt-4 text-[#756b63]">{novel.title}</p>
            </div>

            <button
              onClick={openCreate}
              className="inline-flex items-center justify-center gap-2 rounded-2xl bg-[#332b26] px-6 py-3 text-sm font-medium text-[#f8f2e9] shadow-sm transition hover:bg-[#241f1c]"
            >
              <Plus size={17} />
              新建章节
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
              <p className="mt-2 text-sm text-[#8a7f76]">
                每一章都可以继续连接人物与伏笔。
              </p>
            </div>

            <div className="relative w-full sm:w-80">
              <Search
                size={17}
                className="absolute left-4 top-1/2 -translate-y-1/2 text-[#9a8e85]"
              />
              <input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="搜索章节编号、标题、简介……"
                className="w-full rounded-2xl border border-[#d6cbbf] bg-[#fbf8f2] py-3 pl-11 pr-4 text-sm outline-none transition focus:border-[#92786b] focus:ring-2 focus:ring-[#92786b]/10"
              />
            </div>
          </div>

          {loadingChapters ? (
            <div className="rounded-3xl border border-[#ded4c8] bg-[#fbf8f2] p-10 text-center text-sm text-[#887d74]">
              正在读取章节……
            </div>
          ) : chapters.length === 0 ? (
            <div className="rounded-3xl border border-dashed border-[#cfc3b6] bg-[#faf6ee] p-12 text-center">
              <BookOpen className="mx-auto text-[#9a8c7e]" size={38} />
              <h3 className="mt-5 text-xl font-semibold text-[#302923]">
                还没有章节
              </h3>
              <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-[#82776e]">
                从第一章开始建立你的故事时间轴。之后人物和伏笔都可以与章节对应起来。
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
              <Search className="mx-auto text-[#9a8c7e]" size={34} />
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
              {filteredChapters.map((chapter) => {
                const expanded = expandedChapter === chapter.id;
                const chapterCharacters = getChapterCharacters(chapter.id);
                const chapterForeshadowings = getChapterForeshadowings(
                  chapter.id,
                );

                return (
                  <article
                    key={chapter.id}
                    className="overflow-hidden rounded-3xl border border-[#ded4c8] bg-[#fbf8f2] shadow-[0_8px_30px_rgba(70,50,35,0.04)] transition hover:border-[#cfc1b3]"
                  >
                    <div className="p-6">
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

                        <div className="flex shrink-0 flex-wrap items-center gap-3">
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

                          <button
                            onClick={() => toggleChapter(chapter.id)}
                            className="inline-flex items-center gap-1.5 rounded-xl border border-[#d8cbbf] bg-[#f8f3eb] px-3 py-2 text-xs font-medium text-[#665c54] transition hover:border-[#a99484] hover:text-[#6f2f2f]"
                          >
                            {expanded ? (
                              <ChevronUp size={15} />
                            ) : (
                              <ChevronDown size={15} />
                            )}
                            {expanded ? "收起详情" : "展开详情"}
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
                            {new Date(chapter.updated_at).toLocaleString(
                              "zh-CN",
                            )}
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
                    </div>

                    {expanded && (
                      <div className="border-t border-[#e4dbd1] bg-[#f8f3eb]/70 px-6 py-6">
                        <div className="grid gap-6 lg:grid-cols-2">
                          <section className="rounded-2xl border border-[#e1d7cc] bg-[#fbf8f2] p-5">
                            <div className="flex items-start justify-between gap-4">
                              <div className="flex items-center gap-2">
                                <Users size={18} className="text-[#7b4b43]" />
                                <div>
                                  <h4 className="font-semibold text-[#302923]">
                                    本章人物
                                  </h4>
                                  <p className="mt-1 text-xs text-[#8a7f76]">
                                    记录人物在这一章具体做了什么
                                  </p>
                                </div>
                              </div>

                              <button
                                onClick={() => openCharacterEditor(chapter)}
                                className="rounded-xl border border-[#d8cbbf] px-3 py-2 text-xs text-[#6f2f2f] transition hover:bg-[#f4ebe2]"
                              >
                                管理人物
                              </button>
                            </div>

                            {chapterCharacters.length === 0 ? (
                              <div className="mt-5 rounded-2xl border border-dashed border-[#d9cec2] p-5 text-center text-sm text-[#8a7f76]">
                                本章暂未关联人物
                              </div>
                            ) : (
                              <div className="mt-5 space-y-3">
                                {chapterCharacters.map(({ character, link }) => (
                                  <div
                                    key={character.id}
                                    className="rounded-2xl border border-[#e3d9cf] bg-white/50 p-4"
                                  >
                                    <div className="flex items-start justify-between gap-3">
                                      <div>
                                        <p className="font-medium text-[#302923]">
                                          {character.name}
                                        </p>
                                        {(character.alias ||
                                          character.role) && (
                                          <p className="mt-1 text-xs text-[#8a7f76]">
                                            {character.alias
                                              ? `「${character.alias}」`
                                              : ""}
                                            {character.alias &&
                                            character.role
                                              ? " · "
                                              : ""}
                                            {character.role}
                                          </p>
                                        )}
                                      </div>

                                      <span className="rounded-full bg-[#eee6dc] px-2.5 py-1 text-xs text-[#6d6259]">
                                        {link.relation}
                                      </span>
                                    </div>

                                    {link.notes && (
                                      <p className="mt-3 whitespace-pre-wrap text-sm leading-6 text-[#625850]">
                                        {link.notes}
                                      </p>
                                    )}
                                  </div>
                                ))}
                              </div>
                            )}
                          </section>

                          <section className="rounded-2xl border border-[#e1d7cc] bg-[#fbf8f2] p-5">
                            <div className="flex items-center gap-2">
                              <Sparkles
                                size={18}
                                className="text-[#7b4b43]"
                              />
                              <div>
                                <h4 className="font-semibold text-[#302923]">
                                  本章伏笔
                                </h4>
                                <p className="mt-1 text-xs text-[#8a7f76]">
                                  从伏笔的章节节点自动识别
                                </p>
                              </div>
                            </div>

                            {chapterForeshadowings.length === 0 ? (
                              <div className="mt-5 rounded-2xl border border-dashed border-[#d9cec2] p-5 text-center text-sm text-[#8a7f76]">
                                本章暂未关联伏笔
                              </div>
                            ) : (
                              <div className="mt-5 space-y-3">
                                {chapterForeshadowings.map((item) => {
                                  const events = getForeshadowEvents(
                                    item,
                                    chapter.id,
                                  );

                                  return (
                                    <button
                                      key={item.id}
                                      onClick={() =>
                                        router.push(
                                          `/works/novel/${novelId}#foreshadowing-${item.id}`,
                                        )
                                      }
                                      className="w-full rounded-2xl border border-[#e3d9cf] bg-white/50 p-4 text-left transition hover:border-[#bda99a] hover:bg-[#faf6ef]"
                                    >
                                      <div className="flex items-start justify-between gap-3">
                                        <div>
                                          <p className="font-medium text-[#302923]">
                                            {item.title}
                                          </p>
                                          <p className="mt-1 text-xs text-[#8a7f76]">
                                            {item.type}
                                          </p>
                                        </div>

                                        <span className="rounded-full bg-[#eee6dc] px-2.5 py-1 text-xs text-[#6d6259]">
                                          {item.status}
                                        </span>
                                      </div>

                                      <div className="mt-3 flex flex-wrap gap-2">
                                        {events.map((event) => (
                                          <span
                                            key={event}
                                            className="rounded-full border border-[#d8cbbf] px-2.5 py-1 text-xs text-[#765f53]"
                                          >
                                            {event}
                                          </span>
                                        ))}
                                      </div>
                                    </button>
                                  );
                                })}
                              </div>
                            )}
                          </section>
                        </div>
                      </div>
                    )}
                  </article>
                );
              })}
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
                    onChange={(event) =>
                      setChapterNumber(event.target.value)
                    }
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

      {showCharacterEditor && characterEditorChapter && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-[#241f1c]/45 px-4 py-6">
          <div className="max-h-[92vh] w-full max-w-3xl overflow-y-auto rounded-3xl border border-[#d8cec2] bg-[#fbf8f2] p-6 shadow-2xl md:p-8">
            <div className="mb-7 flex items-start justify-between gap-4">
              <div>
                <p className="text-xs tracking-[0.25em] text-[#9a8c7e]">
                  CHARACTER LINKS
                </p>
                <h2 className="mt-2 text-2xl font-semibold text-[#302923]">
                  管理本章人物
                </h2>
                <p className="mt-2 text-sm text-[#7d726a]">
                  第 {characterEditorChapter.chapter_number} 章 ·{" "}
                  {characterEditorChapter.title}
                </p>
              </div>

              <button
                onClick={closeCharacterEditor}
                disabled={savingCharacters}
                className="rounded-xl p-2 text-[#8b8077] transition hover:bg-[#f0e8df] hover:text-[#302923]"
                aria-label="关闭"
              >
                <X size={20} />
              </button>
            </div>

            {characters.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-[#d9cec2] bg-[#faf6ee] p-8 text-center">
                <Users className="mx-auto text-[#9a8c7e]" size={34} />
                <p className="mt-4 text-sm text-[#756b63]">
                  还没有人物，请先去人物管理创建人物。
                </p>
                <button
                  onClick={() =>
                    router.push(`/works/novel/${novelId}/characters`)
                  }
                  className="mt-5 rounded-2xl bg-[#332b26] px-5 py-3 text-sm font-medium text-[#f8f2e9]"
                >
                  前往人物管理
                </button>
              </div>
            ) : (
              <>
                <div className="space-y-3">
                  {characters.map((character) => {
                    const selected = selectedCharacters.includes(character.id);

                    return (
                      <div
                        key={character.id}
                        className={`rounded-2xl border p-4 transition ${
                          selected
                            ? "border-[#bda99a] bg-[#f7efe7]"
                            : "border-[#e1d7cc] bg-white/50"
                        }`}
                      >
                        <label className="flex cursor-pointer items-start gap-3">
                          <input
                            type="checkbox"
                            checked={selected}
                            onChange={() =>
                              toggleCharacterSelection(character.id)
                            }
                            className="mt-1 h-4 w-4 accent-[#6f2f2f]"
                          />

                          <div className="min-w-0 flex-1">
                            <p className="font-medium text-[#302923]">
                              {character.name}
                            </p>
                            {(character.alias || character.role) && (
                              <p className="mt-1 text-xs text-[#8a7f76]">
                                {character.alias
                                  ? `「${character.alias}」`
                                  : ""}
                                {character.alias && character.role
                                  ? " · "
                                  : ""}
                                {character.role}
                              </p>
                            )}
                          </div>
                        </label>

                        {selected && (
                          <div className="mt-4 grid gap-3 border-t border-[#e4d9cf] pt-4 md:grid-cols-[180px_1fr]">
                            <div>
                              <label className="mb-2 block text-xs text-[#81766d]">
                                本章关系
                              </label>
                              <select
                                value={
                                  characterRelations[character.id] || "出现"
                                }
                                onChange={(event) =>
                                  setCharacterRelations((current) => ({
                                    ...current,
                                    [character.id]: event.target.value,
                                  }))
                                }
                                className="w-full rounded-xl border border-[#d6cbbf] bg-white/70 px-3 py-2.5 text-sm outline-none focus:border-[#92786b]"
                              >
                                {relationOptions.map((option) => (
                                  <option key={option} value={option}>
                                    {option}
                                  </option>
                                ))}
                              </select>
                            </div>

                            <div>
                              <label className="mb-2 block text-xs text-[#81766d]">
                                本章人物备注
                              </label>
                              <input
                                value={characterNotes[character.id] || ""}
                                onChange={(event) =>
                                  setCharacterNotes((current) => ({
                                    ...current,
                                    [character.id]: event.target.value,
                                  }))
                                }
                                placeholder="例如：第一次说出真相、与主角发生冲突……"
                                className="w-full rounded-xl border border-[#d6cbbf] bg-white/70 px-3 py-2.5 text-sm outline-none focus:border-[#92786b]"
                              />
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>

                <p className="mt-4 rounded-2xl bg-[#f3ede5] px-4 py-3 text-xs leading-5 text-[#7e736b]">
                  每一个章节都是独立记录：第一章可以是“首次登场”，第二章可以是“冲突”，第三章可以是“揭露秘密”，互不影响。
                </p>

                {saveError && (
                  <div className="mt-4 rounded-2xl border border-[#d7b8b1] bg-[#f8e9e5] px-4 py-3 text-sm text-[#7b3932]">
                    {saveError}
                  </div>
                )}

                <div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
                  <button
                    onClick={closeCharacterEditor}
                    disabled={savingCharacters}
                    className="rounded-2xl border border-[#d4c8bb] px-6 py-3 text-sm text-[#665c54] transition hover:bg-[#f3ede5] disabled:opacity-50"
                  >
                    取消
                  </button>

                  <button
                    onClick={handleSaveCharacters}
                    disabled={savingCharacters}
                    className="rounded-2xl bg-[#332b26] px-7 py-3 text-sm font-medium text-[#f8f2e9] transition hover:bg-[#241f1c] disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {savingCharacters ? "正在保存……" : "保存人物关联"}
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </main>
  );
}
