"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import {
  ArrowLeft,
  BookOpen,
  ChevronDown,
  ChevronUp,
  Edit3,
  FileText,
  Link2,
  Plus,
  Search,
  Trash2,
  Users,
  X,
} from "lucide-react";
import { createClient } from "../../../../../lib/client";

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
  novel_id: string;
  user_id: string;
  name: string;
  alias: string;
  role: string;
  description: string;
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
  novel_id: string;
  user_id: string;
  title: string;
  description: string;
  type: string;
  status: string;
  priority: string;
  planted_chapter: string;
  reveal_chapter: string;
  actual_reveal_chapter: string;
  planted_chapter_id: string | null;
  reappear_chapter_id: string | null;
  reveal_chapter_id: string | null;
  actual_reveal_chapter_id: string | null;
  tags: string[];
  notes: string;
};

type ChapterCharacterView = CharacterChapter & {
  character?: Character;
};

type ChapterForeshadowView = {
  foreshadowing: Foreshadowing;
  relation: "埋下" | "再现" | "计划回收" | "实际回收";
};

const supabase = createClient();

const relationOptions = [
  "首次登场",
  "出现",
  "重要剧情",
  "冲突",
  "对话",
  "行动",
  "情感变化",
  "揭露秘密",
  "离场",
  "其他",
];

export default function ChaptersPage() {
  const params = useParams();
  const router = useRouter();

  const novelId = String(params.id);

  const [chapters, setChapters] = useState<Chapter[]>([]);
  const [characters, setCharacters] = useState<Character[]>([]);
  const [characterLinks, setCharacterLinks] = useState<CharacterChapter[]>(
    [],
  );
  const [foreshadowings, setForeshadowings] = useState<Foreshadowing[]>([]);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const [search, setSearch] = useState("");

  const [showModal, setShowModal] = useState(false);
  const [editingChapter, setEditingChapter] = useState<Chapter | null>(null);

  const [chapterNumber, setChapterNumber] = useState("");
  const [title, setTitle] = useState("");
  const [summary, setSummary] = useState("");
  const [notes, setNotes] = useState("");
  const [wordCount, setWordCount] = useState("");

  const [expandedChapter, setExpandedChapter] = useState<string | null>(null);

  const [relationChapterId, setRelationChapterId] = useState<string | null>(
    null,
  );

  const [selectedCharacterIds, setSelectedCharacterIds] = useState<string[]>(
    [],
  );

  const [characterRelations, setCharacterRelations] = useState<
    Record<string, string>
  >({});

  const [characterNotes, setCharacterNotes] = useState<
    Record<string, string>
  >({});

  const loadData = useCallback(async () => {
    setLoading(true);
    setError("");

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      router.push("/login");
      return;
    }

    const [
      chaptersResult,
      charactersResult,
      characterLinksResult,
      foreshadowingsResult,
    ] = await Promise.all([
      supabase
        .from("chapters")
        .select("*")
        .eq("novel_id", novelId)
        .eq("user_id", user.id)
        .order("chapter_number", { ascending: true }),

      supabase
        .from("characters")
        .select("*")
        .eq("novel_id", novelId)
        .eq("user_id", user.id)
        .order("name", { ascending: true }),

      supabase
        .from("character_chapters")
        .select("*")
        .eq("novel_id", novelId)
        .eq("user_id", user.id),

      supabase
        .from("foreshadowings")
        .select("*")
        .eq("novel_id", novelId)
        .eq("user_id", user.id),
    ]);

    if (chaptersResult.error) {
      setError(`章节读取失败：${chaptersResult.error.message}`);
      setLoading(false);
      return;
    }

    if (charactersResult.error) {
      setError(`人物读取失败：${charactersResult.error.message}`);
      setLoading(false);
      return;
    }

    if (characterLinksResult.error) {
      setError(`人物章节关联读取失败：${characterLinksResult.error.message}`);
      setLoading(false);
      return;
    }

    if (foreshadowingsResult.error) {
      setError(`伏笔读取失败：${foreshadowingsResult.error.message}`);
      setLoading(false);
      return;
    }

    setChapters((chaptersResult.data ?? []) as Chapter[]);
    setCharacters((charactersResult.data ?? []) as Character[]);
    setCharacterLinks(
      (characterLinksResult.data ?? []) as CharacterChapter[],
    );
    setForeshadowings(
      (foreshadowingsResult.data ?? []) as Foreshadowing[],
    );

    setLoading(false);
  }, [novelId, router]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const filteredChapters = useMemo(() => {
    const keyword = search.trim().toLowerCase();

    if (!keyword) {
      return chapters;
    }

    return chapters.filter((chapter) => {
      return (
        String(chapter.chapter_number).includes(keyword) ||
        chapter.title.toLowerCase().includes(keyword) ||
        (chapter.summary || "").toLowerCase().includes(keyword) ||
        (chapter.notes || "").toLowerCase().includes(keyword)
      );
    });
  }, [chapters, search]);

  const totalWords = useMemo(() => {
    return chapters.reduce(
      (total, chapter) => total + Number(chapter.word_count || 0),
      0,
    );
  }, [chapters]);

  const averageWords = useMemo(() => {
    if (!chapters.length) return 0;
    return Math.round(totalWords / chapters.length);
  }, [chapters.length, totalWords]);

  const openCreateModal = () => {
    setEditingChapter(null);

    const nextNumber =
      chapters.length > 0
        ? Math.max(...chapters.map((item) => item.chapter_number)) + 1
        : 1;

    setChapterNumber(String(nextNumber));
    setTitle("");
    setSummary("");
    setNotes("");
    setWordCount("");
    setShowModal(true);
    setError("");
  };

  const openEditModal = (chapter: Chapter) => {
    setEditingChapter(chapter);
    setChapterNumber(String(chapter.chapter_number));
    setTitle(chapter.title);
    setSummary(chapter.summary || "");
    setNotes(chapter.notes || "");
    setWordCount(String(chapter.word_count || 0));
    setShowModal(true);
    setError("");
  };

  const closeModal = () => {
    if (saving) return;

    setShowModal(false);
    setEditingChapter(null);
  };

  const saveChapter = async () => {
    if (!title.trim()) {
      setError("请输入章节标题。");
      return;
    }

    const number = Number(chapterNumber);

    if (!Number.isInteger(number) || number <= 0) {
      setError("章节号必须是大于 0 的整数。");
      return;
    }

    const words = Number(wordCount || 0);

    if (!Number.isInteger(words) || words < 0) {
      setError("字数必须是大于等于 0 的整数。");
      return;
    }

    setSaving(true);
    setError("");

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      router.push("/login");
      setSaving(false);
      return;
    }

    const payload = {
      novel_id: novelId,
      user_id: user.id,
      chapter_number: number,
      title: title.trim(),
      summary: summary.trim(),
      notes: notes.trim(),
      word_count: words,
      updated_at: new Date().toISOString(),
    };

    if (editingChapter) {
      const { error: updateError } = await supabase
        .from("chapters")
        .update(payload)
        .eq("id", editingChapter.id)
        .eq("novel_id", novelId)
        .eq("user_id", user.id);

      if (updateError) {
        if (updateError.code === "23505") {
          setError("这个章节号已经存在，请换一个章节号。");
        } else {
          setError(`保存失败：${updateError.message}`);
        }

        setSaving(false);
        return;
      }
    } else {
      const { error: insertError } = await supabase
        .from("chapters")
        .insert(payload);

      if (insertError) {
        if (insertError.code === "23505") {
          setError("这个章节号已经存在，请换一个章节号。");
        } else {
          setError(`保存失败：${insertError.message}`);
        }

        setSaving(false);
        return;
      }
    }

    setSaving(false);
    setShowModal(false);
    setEditingChapter(null);

    await loadData();
  };

  const deleteChapter = async (chapter: Chapter) => {
    const confirmed = window.confirm(
      `确定要删除「第 ${chapter.chapter_number} 章 ${chapter.title}」吗？\n\n删除章节后，与该章节相关的人物出场关联也会一起删除。`,
    );

    if (!confirmed) return;

    setError("");

    const { error: deleteError } = await supabase
      .from("chapters")
      .delete()
      .eq("id", chapter.id)
      .eq("novel_id", novelId)
      .eq("user_id", (await supabase.auth.getUser()).data.user?.id ?? "");

    if (deleteError) {
      setError(`删除失败：${deleteError.message}`);
      return;
    }

    if (expandedChapter === chapter.id) {
      setExpandedChapter(null);
    }

    await loadData();
  };

  const getChapterCharacters = (
    chapterId: string,
  ): ChapterCharacterView[] => {
    return characterLinks
      .filter((link) => link.chapter_id === chapterId)
      .map((link) => ({
        ...link,
        character: characters.find(
          (character) => character.id === link.character_id,
        ),
      }))
      .filter((item) => Boolean(item.character));
  };

  const getChapterForeshadowings = (
    chapterId: string,
  ): ChapterForeshadowView[] => {
    const result: ChapterForeshadowView[] = [];

    foreshadowings.forEach((foreshadowing) => {
      if (foreshadowing.planted_chapter_id === chapterId) {
        result.push({
          foreshadowing,
          relation: "埋下",
        });
      }

      if (foreshadowing.reappear_chapter_id === chapterId) {
        result.push({
          foreshadowing,
          relation: "再现",
        });
      }

      if (foreshadowing.reveal_chapter_id === chapterId) {
        result.push({
          foreshadowing,
          relation: "计划回收",
        });
      }

      if (foreshadowing.actual_reveal_chapter_id === chapterId) {
        result.push({
          foreshadowing,
          relation: "实际回收",
        });
      }
    });

    return result;
  };

  const openCharacterRelationEditor = (chapterId: string) => {
    setExpandedChapter(chapterId);

    const links = characterLinks.filter(
      (link) => link.chapter_id === chapterId,
    );

    setRelationChapterId(chapterId);

    setSelectedCharacterIds(links.map((link) => link.character_id));

    const relations: Record<string, string> = {};
    const notesMap: Record<string, string> = {};

    links.forEach((link) => {
      relations[link.character_id] = link.relation || "出现";
      notesMap[link.character_id] = link.notes || "";
    });

    setCharacterRelations(relations);
    setCharacterNotes(notesMap);
  };

  const closeCharacterRelationEditor = () => {
    setRelationChapterId(null);
    setSelectedCharacterIds([]);
    setCharacterRelations({});
    setCharacterNotes({});
  };

  const toggleCharacter = (characterId: string) => {
    setSelectedCharacterIds((current) => {
      if (current.includes(characterId)) {
        return current.filter((id) => id !== characterId);
      }

      return [...current, characterId];
    });

    setCharacterRelations((current) => ({
      ...current,
      [characterId]: current[characterId] || "出现",
    }));

    setCharacterNotes((current) => ({
      ...current,
      [characterId]: current[characterId] || "",
    }));
  };

  const saveCharacterRelations = async () => {
    if (!relationChapterId) return;

    setSaving(true);
    setError("");

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      router.push("/login");
      setSaving(false);
      return;
    }

    const { error: deleteError } = await supabase
      .from("character_chapters")
      .delete()
      .eq("chapter_id", relationChapterId)
      .eq("novel_id", novelId)
      .eq("user_id", user.id);

    if (deleteError) {
      setError(`清理人物关联失败：${deleteError.message}`);
      setSaving(false);
      return;
    }

    if (selectedCharacterIds.length > 0) {
      const rows = selectedCharacterIds.map((characterId) => ({
        character_id: characterId,
        chapter_id: relationChapterId,
        novel_id: novelId,
        user_id: user.id,
        relation: characterRelations[characterId] || "出现",
        notes: (characterNotes[characterId] || "").trim(),
        updated_at: new Date().toISOString(),
      }));

      const { error: insertError } = await supabase
        .from("character_chapters")
        .insert(rows);

      if (insertError) {
        setError(`保存人物关联失败：${insertError.message}`);
        setSaving(false);
        return;
      }
    }

    setSaving(false);
    closeCharacterRelationEditor();
    await loadData();
  };

  const toggleChapter = (chapterId: string) => {
    setExpandedChapter((current) =>
      current === chapterId ? null : chapterId,
    );
  };

  if (loading) {
    return (
      <main className="min-h-screen bg-[#f6f0e7] text-[#241c18]">
        <div className="mx-auto flex min-h-screen max-w-6xl items-center justify-center px-6">
          <div className="text-center">
            <div className="mx-auto mb-4 h-10 w-10 animate-spin rounded-full border-2 border-[#d9cabc] border-t-[#6f2f2f]" />
            <p className="text-sm text-[#806f65]">正在读取章节……</p>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#f6f0e7] text-[#241c18]">
      <div className="mx-auto max-w-6xl px-5 py-8 sm:px-8 lg:px-10">
        <header className="mb-8">
          <button
            onClick={() => router.push(`/works/novel/${novelId}`)}
            className="mb-5 inline-flex items-center gap-2 text-sm text-[#806f65] transition hover:text-[#6f2f2f]"
          >
            <ArrowLeft size={16} />
            返回作品
          </button>

          <div className="flex flex-col justify-between gap-5 md:flex-row md:items-end">
            <div>
              <div className="mb-3 flex items-center gap-2 text-xs font-medium uppercase tracking-[0.2em] text-[#9b8274]">
                <BookOpen size={14} />
                Chapter List
              </div>

              <h1 className="font-serif text-3xl font-semibold tracking-tight sm:text-4xl">
                故事章节
              </h1>

              <p className="mt-2 max-w-2xl text-sm leading-7 text-[#806f65]">
                管理章节，并记录每一章出现的人物与涉及的伏笔。
              </p>
            </div>

            <button
              onClick={openCreateModal}
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#6f2f2f] px-5 py-3 text-sm font-medium text-white shadow-sm transition hover:bg-[#5b2525]"
            >
              <Plus size={17} />
              新建章节
            </button>
          </div>
        </header>

        {error && (
          <div className="mb-6 rounded-2xl border border-[#d8b7aa] bg-[#f8e9e3] px-5 py-4 text-sm leading-6 text-[#7a3028]">
            {error}
          </div>
        )}

        <section className="mb-8 grid grid-cols-2 gap-3 md:grid-cols-4">
          <div className="rounded-2xl border border-[#e4d8cc] bg-[#fbf8f2] p-5">
            <div className="mb-2 text-xs tracking-wider text-[#9b8274]">
              总章节
            </div>
            <div className="font-serif text-3xl">{chapters.length}</div>
          </div>

          <div className="rounded-2xl border border-[#e4d8cc] bg-[#fbf8f2] p-5">
            <div className="mb-2 text-xs tracking-wider text-[#9b8274]">
              总字数
            </div>
            <div className="font-serif text-3xl">
              {totalWords.toLocaleString()}
            </div>
          </div>

          <div className="rounded-2xl border border-[#e4d8cc] bg-[#fbf8f2] p-5">
            <div className="mb-2 text-xs tracking-wider text-[#9b8274]">
              平均每章
            </div>
            <div className="font-serif text-3xl">
              {averageWords.toLocaleString()}
            </div>
          </div>

          <div className="rounded-2xl border border-[#e4d8cc] bg-[#fbf8f2] p-5">
            <div className="mb-2 text-xs tracking-wider text-[#9b8274]">
              人物关联
            </div>
            <div className="font-serif text-3xl">
              {characterLinks.length}
            </div>
          </div>
        </section>

        <div className="mb-6 flex items-center rounded-2xl border border-[#e4d8cc] bg-[#fbf8f2] px-4">
          <Search size={17} className="shrink-0 text-[#9b8274]" />

          <input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="搜索章节号、标题、简介或备注……"
            className="w-full bg-transparent px-3 py-3.5 text-sm outline-none placeholder:text-[#b19e92]"
          />

          {search && (
            <button
              onClick={() => setSearch("")}
              className="text-[#9b8274] hover:text-[#6f2f2f]"
            >
              <X size={16} />
            </button>
          )}
        </div>

        {filteredChapters.length === 0 && (
          <div className="rounded-3xl border border-dashed border-[#d9cabc] bg-[#fbf8f2] px-6 py-16 text-center">
            <BookOpen
              size={34}
              className="mx-auto mb-4 text-[#b49c8c]"
            />

            <h2 className="font-serif text-xl">
              {chapters.length ? "没有找到匹配章节" : "还没有章节"}
            </h2>

            <p className="mx-auto mt-2 max-w-md text-sm leading-7 text-[#806f65]">
              {chapters.length
                ? "试试换一个搜索关键词。"
                : "从第一章开始建立你的故事时间轴。"}
            </p>

            {!chapters.length && (
              <button
                onClick={openCreateModal}
                className="mt-6 inline-flex items-center gap-2 rounded-xl bg-[#6f2f2f] px-5 py-3 text-sm font-medium text-white"
              >
                <Plus size={16} />
                新建第一章
              </button>
            )}
          </div>
        )}

        <section className="space-y-5">
          {filteredChapters.map((chapter) => {
            const chapterCharacters = getChapterCharacters(chapter.id);
            const chapterForeshadowings = getChapterForeshadowings(
              chapter.id,
            );

            const expanded = expandedChapter === chapter.id;
            const editingRelations = relationChapterId === chapter.id;

            return (
              <article
                key={chapter.id}
                className="overflow-hidden rounded-3xl border border-[#e4d8cc] bg-[#fbf8f2] shadow-[0_8px_30px_rgba(75,54,42,0.04)]"
              >
                <div className="p-5 sm:p-6">
                  <div className="flex gap-4">
                    <div className="hidden shrink-0 text-center sm:block">
                      <div className="text-xs tracking-wider text-[#a28d7e]">
                        CH.
                      </div>

                      <div className="mt-1 font-serif text-3xl text-[#6f2f2f]">
                        {chapter.chapter_number}
                      </div>
                    </div>

                    <div className="min-w-0 flex-1">
                      <div className="mb-1 text-xs text-[#a28d7e] sm:hidden">
                        第 {chapter.chapter_number} 章
                      </div>

                      <h2 className="font-serif text-xl font-semibold">
                        {chapter.title}
                      </h2>

                      {chapter.summary && (
                        <p className="mt-2 line-clamp-2 text-sm leading-7 text-[#806f65]">
                          {chapter.summary}
                        </p>
                      )}

                      <div className="mt-4 flex flex-wrap gap-2">
                        <span className="rounded-full bg-[#f0e7dd] px-3 py-1 text-xs text-[#806f65]">
                          {Number(
                            chapter.word_count || 0,
                          ).toLocaleString()}{" "}
                          字
                        </span>

                        <span className="rounded-full bg-[#f0e7dd] px-3 py-1 text-xs text-[#806f65]">
                          {chapterCharacters.length} 人物
                        </span>

                        <span className="rounded-full bg-[#f0e7dd] px-3 py-1 text-xs text-[#806f65]">
                          {chapterForeshadowings.length} 伏笔事件
                        </span>
                      </div>

                      <div className="mt-5 flex flex-wrap items-center gap-2">
                        <button
                          onClick={() => openEditModal(chapter)}
                          className="inline-flex items-center gap-1.5 rounded-lg border border-[#e4d8cc] px-3 py-2 text-xs text-[#806f65] transition hover:border-[#bda99b] hover:text-[#6f2f2f]"
                        >
                          <Edit3 size={14} />
                          编辑
                        </button>

                        <button
                          onClick={() => deleteChapter(chapter)}
                          className="inline-flex items-center gap-1.5 rounded-lg border border-[#ead8d2] px-3 py-2 text-xs text-[#9b6259] transition hover:border-[#c99c91] hover:bg-[#f8e9e3]"
                        >
                          <Trash2 size={14} />
                          删除
                        </button>

                        <button
                          onClick={() => toggleChapter(chapter.id)}
                          className={`inline-flex items-center gap-2 rounded-lg px-4 py-2 text-xs font-medium transition ${
                            expanded
                              ? "bg-[#6f2f2f] text-white hover:bg-[#5b2525]"
                              : "border border-[#cdbbae] bg-[#f5eee5] text-[#6f2f2f] hover:border-[#a97a6d] hover:bg-[#efe3d7]"
                          }`}
                        >
                          {expanded ? (
                            <>
                              <ChevronUp size={15} />
                              收起详情
                            </>
                          ) : (
                            <>
                              <ChevronDown size={15} />
                              展开详情
                            </>
                          )}
                        </button>
                      </div>
                    </div>
                  </div>
                </div>

                {expanded && (
                  <div className="border-t border-[#e8ddd2] bg-[#f8f3eb] px-5 py-6 sm:px-6">
                    <div className="grid gap-6 lg:grid-cols-2">
                      <section>
                        <div className="mb-4 flex items-center justify-between gap-3">
                          <div>
                            <div className="flex items-center gap-2">
                              <Users
                                size={17}
                                className="text-[#6f2f2f]"
                              />

                              <h3 className="font-serif text-lg font-semibold">
                                本章人物
                              </h3>
                            </div>

                            <p className="mt-1 text-xs text-[#9b8274]">
                              记录人物在本章中的具体作用。
                            </p>
                          </div>

                          <button
                            onClick={() =>
                              openCharacterRelationEditor(chapter.id)
                            }
                            className="inline-flex shrink-0 items-center gap-1.5 rounded-lg bg-[#6f2f2f] px-3 py-2 text-xs font-medium text-white transition hover:bg-[#5b2525]"
                          >
                            <Link2 size={13} />
                            管理人物
                          </button>
                        </div>

                        {chapterCharacters.length === 0 ? (
                          <div className="rounded-2xl border border-dashed border-[#d9cabc] bg-[#fbf8f2] p-7 text-center">
                            <Users
                              size={27}
                              className="mx-auto mb-3 text-[#b49c8c]"
                            />

                            <p className="text-sm text-[#806f65]">
                              本章还没有关联人物
                            </p>

                            <button
                              onClick={() =>
                                openCharacterRelationEditor(chapter.id)
                              }
                              className="mt-3 text-xs text-[#6f2f2f] hover:underline"
                            >
                              添加人物
                            </button>
                          </div>
                        ) : (
                          <div className="space-y-3">
                            {chapterCharacters.map((item) => (
                              <div
                                key={item.character_id}
                                className="rounded-2xl border border-[#e4d8cc] bg-[#fbf8f2] p-4"
                              >
                                <div className="flex items-start justify-between gap-3">
                                  <div>
                                    <div className="font-serif font-semibold">
                                      {item.character?.name}
                                    </div>

                                    {item.character?.alias && (
                                      <div className="mt-0.5 text-xs text-[#9b8274]">
                                        {item.character.alias}
                                      </div>
                                    )}
                                  </div>

                                  <span className="shrink-0 rounded-full bg-[#efe1d7] px-2.5 py-1 text-xs text-[#6f2f2f]">
                                    {item.relation}
                                  </span>
                                </div>

                                {item.notes && (
                                  <p className="mt-3 border-t border-[#eee4da] pt-3 text-xs leading-6 text-[#806f65]">
                                    {item.notes}
                                  </p>
                                )}
                              </div>
                            ))}
                          </div>
                        )}
                      </section>

                      <section>
                        <div className="mb-4">
                          <div className="flex items-center gap-2">
                            <FileText
                              size={17}
                              className="text-[#6f2f2f]"
                            />

                            <h3 className="font-serif text-lg font-semibold">
                              本章伏笔
                            </h3>
                          </div>

                          <p className="mt-1 text-xs text-[#9b8274]">
                            自动读取伏笔在本章发生的阶段。
                          </p>
                        </div>

                        {chapterForeshadowings.length === 0 ? (
                          <div className="rounded-2xl border border-dashed border-[#d9cabc] bg-[#fbf8f2] p-7 text-center">
                            <FileText
                              size={27}
                              className="mx-auto mb-3 text-[#b49c8c]"
                            />

                            <p className="text-sm text-[#806f65]">
                              本章还没有关联伏笔
                            </p>

                            <button
                              onClick={() =>
                                router.push(
                                  `/works/novel/${novelId}#foreshadowings`,
                                )
                              }
                              className="mt-3 text-xs text-[#6f2f2f] hover:underline"
                            >
                              去管理伏笔
                            </button>
                          </div>
                        ) : (
                          <div className="space-y-3">
                            {chapterForeshadowings.map((item, index) => (
                              <button
                                key={`${item.foreshadowing.id}-${item.relation}-${index}`}
                                onClick={() =>
                                  router.push(
                                    `/works/novel/${novelId}#foreshadowings`,
                                  )
                                }
                                className="w-full rounded-2xl border border-[#e4d8cc] bg-[#fbf8f2] p-4 text-left transition hover:border-[#bda99b]"
                              >
                                <div className="flex items-start justify-between gap-3">
                                  <div className="min-w-0">
                                    <div className="font-serif font-semibold">
                                      {item.foreshadowing.title}
                                    </div>

                                    {item.foreshadowing.description && (
                                      <p className="mt-1 line-clamp-2 text-xs leading-6 text-[#806f65]">
                                        {item.foreshadowing.description}
                                      </p>
                                    )}
                                  </div>

                                  <span className="shrink-0 rounded-full bg-[#eee6d8] px-2.5 py-1 text-xs text-[#765c35]">
                                    {item.relation}
                                  </span>
                                </div>

                                <div className="mt-3 flex flex-wrap gap-2">
                                  {item.foreshadowing.type && (
                                    <span className="text-[11px] text-[#9b8274]">
                                      {item.foreshadowing.type}
                                    </span>
                                  )}

                                  {item.foreshadowing.priority && (
                                    <span className="text-[11px] text-[#9b8274]">
                                      · {item.foreshadowing.priority}
                                    </span>
                                  )}

                                  {item.foreshadowing.status && (
                                    <span className="text-[11px] text-[#9b8274]">
                                      · {item.foreshadowing.status}
                                    </span>
                                  )}
                                </div>
                              </button>
                            ))}
                          </div>
                        )}
                      </section>
                    </div>

                    {chapter.notes && (
                      <section className="mt-6 rounded-2xl border border-[#e4d8cc] bg-[#fbf8f2] p-5">
                        <h3 className="mb-2 font-serif font-semibold">
                          章节备注
                        </h3>

                        <p className="whitespace-pre-wrap text-sm leading-7 text-[#806f65]">
                          {chapter.notes}
                        </p>
                      </section>
                    )}
                  </div>
                )}

                {editingRelations && (
                  <div className="border-t border-[#ddcfc2] bg-[#f4ede4] px-5 py-6 sm:px-6">
                    <div className="mb-5 flex items-start justify-between gap-4">
                      <div>
                        <div className="flex items-center gap-2">
                          <Link2
                            size={17}
                            className="text-[#6f2f2f]"
                          />

                          <h3 className="font-serif text-lg font-semibold">
                            管理本章人物
                          </h3>
                        </div>

                        <p className="mt-1 text-xs leading-6 text-[#806f65]">
                          每个人物都可以单独设置本章中的关系和备注。
                        </p>
                      </div>

                      <button
                        onClick={closeCharacterRelationEditor}
                        disabled={saving}
                        className="rounded-lg p-2 text-[#806f65] hover:bg-[#e9ded2]"
                      >
                        <X size={17} />
                      </button>
                    </div>

                    {characters.length === 0 ? (
                      <div className="rounded-2xl border border-dashed border-[#d9cabc] bg-[#fbf8f2] p-7 text-center">
                        <Users
                          size={28}
                          className="mx-auto mb-3 text-[#b49c8c]"
                        />

                        <p className="text-sm text-[#806f65]">
                          还没有人物。
                        </p>

                        <button
                          onClick={() =>
                            router.push(
                              `/works/novel/${novelId}/characters`,
                            )
                          }
                          className="mt-3 text-xs text-[#6f2f2f] hover:underline"
                        >
                          去人物管理创建人物
                        </button>
                      </div>
                    ) : (
                      <>
                        <div className="grid gap-3 md:grid-cols-2">
                          {characters.map((character) => {
                            const selected =
                              selectedCharacterIds.includes(character.id);

                            return (
                              <div
                                key={character.id}
                                className={`rounded-2xl border p-4 transition ${
                                  selected
                                    ? "border-[#a97a6d] bg-[#fbf8f2]"
                                    : "border-[#e4d8cc] bg-[#fbf8f2]"
                                }`}
                              >
                                <label className="flex cursor-pointer items-start gap-3">
                                  <input
                                    type="checkbox"
                                    checked={selected}
                                    onChange={() =>
                                      toggleCharacter(character.id)
                                    }
                                    className="mt-1 h-4 w-4 accent-[#6f2f2f]"
                                  />

                                  <div className="min-w-0 flex-1">
                                    <div className="font-serif font-semibold">
                                      {character.name}
                                    </div>

                                    {character.alias && (
                                      <div className="mt-0.5 text-xs text-[#9b8274]">
                                        {character.alias}
                                      </div>
                                    )}

                                    {character.role && (
                                      <div className="mt-1 text-[11px] text-[#a28d7e]">
                                        {character.role}
                                      </div>
                                    )}
                                  </div>
                                </label>

                                {selected && (
                                  <div className="mt-4 space-y-3 border-t border-[#eee4da] pt-4">
                                    <div>
                                      <label className="mb-1.5 block text-xs text-[#806f65]">
                                        本章关系
                                      </label>

                                      <select
                                        value={
                                          characterRelations[
                                            character.id
                                          ] || "出现"
                                        }
                                        onChange={(event) =>
                                          setCharacterRelations(
                                            (current) => ({
                                              ...current,
                                              [character.id]:
                                                event.target.value,
                                            }),
                                          )
                                        }
                                        className="w-full rounded-xl border border-[#ddd0c4] bg-white px-3 py-2.5 text-sm outline-none focus:border-[#a97a6d]"
                                      >
                                        {relationOptions.map((option) => (
                                          <option
                                            key={option}
                                            value={option}
                                          >
                                            {option}
                                          </option>
                                        ))}
                                      </select>
                                    </div>

                                    <div>
                                      <label className="mb-1.5 block text-xs text-[#806f65]">
                                        本章备注
                                      </label>

                                      <input
                                        value={
                                          characterNotes[character.id] || ""
                                        }
                                        onChange={(event) =>
                                          setCharacterNotes(
                                            (current) => ({
                                              ...current,
                                              [character.id]:
                                                event.target.value,
                                            }),
                                          )
                                        }
                                        placeholder="例如：第一次与主角正式冲突"
                                        className="w-full rounded-xl border border-[#ddd0c4] bg-white px-3 py-2.5 text-sm outline-none placeholder:text-[#b6a69c] focus:border-[#a97a6d]"
                                      />
                                    </div>
                                  </div>
                                )}
                              </div>
                            );
                          })}
                        </div>

                        <div className="mt-5 flex flex-col-reverse justify-end gap-2 sm:flex-row">
                          <button
                            onClick={closeCharacterRelationEditor}
                            disabled={saving}
                            className="rounded-xl border border-[#d9cabc] px-5 py-3 text-sm text-[#806f65] hover:bg-[#fbf8f2]"
                          >
                            取消
                          </button>

                          <button
                            onClick={saveCharacterRelations}
                            disabled={saving}
                            className="rounded-xl bg-[#6f2f2f] px-5 py-3 text-sm font-medium text-white transition hover:bg-[#5b2525] disabled:cursor-not-allowed disabled:opacity-60"
                          >
                            {saving ? "保存中……" : "保存人物关联"}
                          </button>
                        </div>
                      </>
                    )}
                  </div>
                )}
              </article>
            );
          })}
        </section>
      </div>

      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#241c18]/45 px-4 py-6">
          <div className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-3xl border border-[#e4d8cc] bg-[#fbf8f2] shadow-2xl">
            <div className="sticky top-0 flex items-center justify-between border-b border-[#e8ddd2] bg-[#fbf8f2] px-6 py-5">
              <div>
                <div className="text-xs tracking-[0.18em] text-[#9b8274]">
                  CHAPTER
                </div>

                <h2 className="mt-1 font-serif text-xl font-semibold">
                  {editingChapter ? "编辑章节" : "新建章节"}
                </h2>
              </div>

              <button
                onClick={closeModal}
                disabled={saving}
                className="rounded-lg p-2 text-[#806f65] hover:bg-[#f0e7dd]"
              >
                <X size={18} />
              </button>
            </div>

            <div className="space-y-5 p-6">
              {error && (
                <div className="rounded-xl border border-[#d8b7aa] bg-[#f8e9e3] px-4 py-3 text-sm text-[#7a3028]">
                  {error}
                </div>
              )}

              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className="mb-2 block text-sm font-medium">
                    章节号
                  </label>

                  <input
                    type="number"
                    min={1}
                    value={chapterNumber}
                    onChange={(event) =>
                      setChapterNumber(event.target.value)
                    }
                    className="w-full rounded-xl border border-[#ddd0c4] bg-white px-4 py-3 text-sm outline-none focus:border-[#a97a6d]"
                    placeholder="例如 1"
                  />
                </div>

                <div>
                  <label className="mb-2 block text-sm font-medium">
                    字数
                  </label>

                  <input
                    type="number"
                    min={0}
                    value={wordCount}
                    onChange={(event) =>
                      setWordCount(event.target.value)
                    }
                    className="w-full rounded-xl border border-[#ddd0c4] bg-white px-4 py-3 text-sm outline-none focus:border-[#a97a6d]"
                    placeholder="例如 3500"
                  />
                </div>
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium">
                  章节标题
                </label>

                <input
                  value={title}
                  onChange={(event) => setTitle(event.target.value)}
                  className="w-full rounded-xl border border-[#ddd0c4] bg-white px-4 py-3 text-sm outline-none focus:border-[#a97a6d]"
                  placeholder="例如：第一章 雨落之前"
                />
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium">
                  章节简介
                </label>

                <textarea
                  value={summary}
                  onChange={(event) => setSummary(event.target.value)}
                  rows={4}
                  className="w-full resize-none rounded-xl border border-[#ddd0c4] bg-white px-4 py-3 text-sm leading-7 outline-none focus:border-[#a97a6d]"
                  placeholder="简单记录这一章发生了什么……"
                />
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium">
                  章节备注
                </label>

                <textarea
                  value={notes}
                  onChange={(event) => setNotes(event.target.value)}
                  rows={4}
                  className="w-full resize-none rounded-xl border border-[#ddd0c4] bg-white px-4 py-3 text-sm leading-7 outline-none focus:border-[#a97a6d]"
                  placeholder="写作备注、待修改内容、情绪重点等……"
                />
              </div>
            </div>

            <div className="flex flex-col-reverse gap-2 border-t border-[#e8ddd2] bg-[#f8f3eb] px-6 py-4 sm:flex-row sm:justify-end">
              <button
                onClick={closeModal}
                disabled={saving}
                className="rounded-xl border border-[#d9cabc] px-5 py-3 text-sm text-[#806f65] hover:bg-[#fbf8f2]"
              >
                取消
              </button>

              <button
                onClick={saveChapter}
                disabled={saving}
                className="rounded-xl bg-[#6f2f2f] px-5 py-3 text-sm font-medium text-white transition hover:bg-[#5b2525] disabled:cursor-not-allowed disabled:opacity-60"
              >
                {saving
                  ? "保存中……"
                  : editingChapter
                    ? "保存修改"
                    : "创建章节"}
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}