"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { createClient } from "../../../../lib/client";

type Novel = {
  id: string;
  title: string;
  description: string;
  created_at: string;
};

type Chapter = {
  id: string;
  chapter_number: number;
  title: string;
};

type Character = {
  id: string;
  name: string;
  alias: string;
  role: string;
  secret: string;
  goal: string;
};

type CharacterForeshadowing = {
  character_id: string;
  foreshadowing_id: string;
  relation: string;
};

type Foreshadowing = {
  id: string;
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
  created_at: string;
};

const types = [
  "剧情伏笔",
  "人物秘密",
  "物品伏笔",
  "世界观伏笔",
  "对白伏笔",
  "情感伏笔",
  "谜团线索",
  "其他",
] as const;

const statuses = ["计划中", "已埋下", "已回收"] as const;
const priorities = ["低", "普通", "高", "重要"] as const;

const selectFields =
  "id, title, description, type, status, priority, planted_chapter, reveal_chapter, actual_reveal_chapter, planted_chapter_id, reappear_chapter_id, reveal_chapter_id, actual_reveal_chapter_id, tags, notes, created_at";

function emptyToString(value: unknown) {
  return typeof value === "string" ? value : "";
}

function parseTags(value: string) {
  return value
    .split(/[，,]/)
    .map((tag) => tag.trim())
    .filter(Boolean);
}

export default function NovelPage() {
  const router = useRouter();
  const params = useParams<{ id: string }>();
  const novelId = params?.id;

  const [novel, setNovel] = useState<Novel | null>(null);
  const [chapters, setChapters] = useState<Chapter[]>([]);
  const [foreshadowings, setForeshadowings] = useState<Foreshadowing[]>([]);
  const [characters, setCharacters] = useState<Character[]>([]);
  const [characterRelations, setCharacterRelations] = useState<CharacterForeshadowing[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingForeshadowings, setLoadingForeshadowings] = useState(true);
  const [error, setError] = useState("");
  const [saveError, setSaveError] = useState("");

  const [showCreate, setShowCreate] = useState(false);
  const [showEdit, setShowEdit] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [type, setType] = useState<string>(types[0]);
  const [status, setStatus] = useState<string>(statuses[0]);
  const [priority, setPriority] = useState<string>(priorities[1]);
  const [plantedChapter, setPlantedChapter] = useState("");
  const [reappearChapter, setReappearChapter] = useState("");
  const [revealChapter, setRevealChapter] = useState("");
  const [actualRevealChapter, setActualRevealChapter] = useState("");
  const [tags, setTags] = useState("");
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);

  const [search, setSearch] = useState("");
  const [filterType, setFilterType] = useState("全部类型");
  const [filterStatus, setFilterStatus] = useState("全部状态");
  const [filterPriority, setFilterPriority] = useState("全部优先级");

  const resetForm = useCallback(() => {
    setEditingId(null);
    setTitle("");
    setDescription("");
    setType(types[0]);
    setStatus(statuses[0]);
    setPriority(priorities[1]);
    setPlantedChapter("");
    setReappearChapter("");
    setRevealChapter("");
    setActualRevealChapter("");
    setTags("");
    setNotes("");
    setSaveError("");
  }, []);

  const closeModal = useCallback(() => {
    setShowCreate(false);
    setShowEdit(false);
    resetForm();
  }, [resetForm]);

  const loadChapters = useCallback(
    async (userId: string) => {
      if (!novelId) return;

      const supabase = createClient();
      const { data, error: queryError } = await supabase
        .from("chapters")
        .select("id, chapter_number, title")
        .eq("novel_id", novelId)
        .eq("user_id", userId)
        .order("chapter_number", { ascending: true });

      if (queryError) {
        setChapters([]);
        setSaveError(`读取章节失败：${queryError.message}`);
        return;
      }

      setChapters((data ?? []) as Chapter[]);
    },
    [novelId],
  );

  const loadCharacters = useCallback(
    async (userId: string) => {
      if (!novelId) return;

      const supabase = createClient();
      const { data, error: queryError } = await supabase
        .from("characters")
        .select("id, name, alias, role, secret, goal")
        .eq("novel_id", novelId)
        .eq("user_id", userId)
        .order("created_at", { ascending: true });

      if (queryError) {
        setCharacters([]);
        setCharacterRelations([]);
        setSaveError(`读取人物失败：${queryError.message}`);
        return;
      }

      setCharacters((data ?? []) as Character[]);

      const { data: relationData, error: relationError } = await supabase
        .from("character_foreshadowings")
        .select("character_id, foreshadowing_id, relation")
        .eq("novel_id", novelId)
        .eq("user_id", userId);

      if (relationError) {
        setCharacterRelations([]);
        setSaveError(`读取人物伏笔关系失败：${relationError.message}`);
        return;
      }

      setCharacterRelations((relationData ?? []) as CharacterForeshadowing[]);
    },
    [novelId],
  );

  const loadForeshadowings = useCallback(
    async (userId: string) => {
      if (!novelId) return;

      setLoadingForeshadowings(true);
      setSaveError("");

      const supabase = createClient();
      const { data, error: queryError } = await supabase
        .from("foreshadowings")
        .select(selectFields)
        .eq("novel_id", novelId)
        .eq("user_id", userId)
        .order("created_at", { ascending: false });

      if (queryError) {
        setSaveError(queryError.message);
        setForeshadowings([]);
      } else {
        setForeshadowings((data ?? []) as Foreshadowing[]);
      }

      setLoadingForeshadowings(false);
    },
    [novelId],
  );

  useEffect(() => {
    let cancelled = false;

    async function loadData() {
      if (!novelId) return;

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
        .select("id, title, description, created_at")
        .eq("id", novelId)
        .eq("user_id", user.id)
        .single();

      if (cancelled) return;

      if (novelError || !novelData) {
        setError(novelError?.message || "没有找到这部作品。");
        setLoading(false);
        return;
      }

      setNovel(novelData as Novel);
      await Promise.all([loadChapters(user.id), loadForeshadowings(user.id), loadCharacters(user.id)]);

      if (!cancelled) setLoading(false);
    }

    void loadData();

    return () => {
      cancelled = true;
    };
  }, [novelId, router, loadChapters, loadForeshadowings, loadCharacters]);

  const openCreate = () => {
    resetForm();
    setShowEdit(false);
    setShowCreate(true);
  };

  const openEdit = (item: Foreshadowing) => {
    setEditingId(item.id);
    setTitle(emptyToString(item.title));
    setDescription(emptyToString(item.description));
    setType(emptyToString(item.type) || types[0]);
    setStatus(emptyToString(item.status) || statuses[0]);
    setPriority(emptyToString(item.priority) || priorities[1]);
    setPlantedChapter(item.planted_chapter_id ?? "");
    setReappearChapter(item.reappear_chapter_id ?? "");
    setRevealChapter(item.reveal_chapter_id ?? "");
    setActualRevealChapter(item.actual_reveal_chapter_id ?? "");
    setTags(Array.isArray(item.tags) ? item.tags.join(", ") : "");
    setNotes(emptyToString(item.notes));
    setSaveError("");
    setShowCreate(false);
    setShowEdit(true);
  };

  const chapterLabelById = (id: string) => {
    const chapter = chapters.find((item) => item.id === id);
    return chapter ? `第${chapter.chapter_number}章 · ${chapter.title}` : "";
  };

  const chapterLabel = (id: string | null, legacyValue: string, emptyLabel = "未关联") => {
    if (id) return chapterLabelById(id) || legacyValue || emptyLabel;
    return legacyValue || emptyLabel;
  };

  const handleCreate = async () => {
    if (!novelId) return;
    if (!title.trim()) {
      setSaveError("请先填写伏笔标题。");
      return;
    }

    setSaving(true);
    setSaveError("");

    try {
      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        router.replace("/login");
        return;
      }

      const { data, error: insertError } = await supabase
        .from("foreshadowings")
        .insert({
          novel_id: novelId,
          user_id: user.id,
          title: title.trim(),
          description: description.trim(),
          type,
          status,
          priority,
          planted_chapter: chapterLabelById(plantedChapter),
          reveal_chapter: chapterLabelById(revealChapter),
          actual_reveal_chapter: chapterLabelById(actualRevealChapter),
          planted_chapter_id: plantedChapter || null,
          reappear_chapter_id: reappearChapter || null,
          reveal_chapter_id: revealChapter || null,
          actual_reveal_chapter_id: actualRevealChapter || null,
          tags: parseTags(tags),
          notes: notes.trim(),
        })
        .select(selectFields)
        .single();

      if (insertError) {
        setSaveError(insertError.message);
        return;
      }

      if (data) {
        setForeshadowings((current) => [data as Foreshadowing, ...current]);
      }
      closeModal();
    } finally {
      setSaving(false);
    }
  };

  const handleUpdate = async () => {
    if (!novelId || !editingId) return;
    if (!title.trim()) {
      setSaveError("请先填写伏笔标题。");
      return;
    }

    setSaving(true);
    setSaveError("");

    try {
      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        router.replace("/login");
        return;
      }

      const { data, error: updateError } = await supabase
        .from("foreshadowings")
        .update({
          title: title.trim(),
          description: description.trim(),
          type,
          status,
          priority,
          planted_chapter: chapterLabelById(plantedChapter),
          reveal_chapter: chapterLabelById(revealChapter),
          actual_reveal_chapter: chapterLabelById(actualRevealChapter),
          planted_chapter_id: plantedChapter || null,
          reappear_chapter_id: reappearChapter || null,
          reveal_chapter_id: revealChapter || null,
          actual_reveal_chapter_id: actualRevealChapter || null,
          tags: parseTags(tags),
          notes: notes.trim(),
        })
        .eq("id", editingId)
        .eq("novel_id", novelId)
        .eq("user_id", user.id)
        .select(selectFields)
        .single();

      if (updateError) {
        setSaveError(updateError.message);
        return;
      }

      if (data) {
        setForeshadowings((current) =>
          current.map((item) =>
            item.id === editingId ? (data as Foreshadowing) : item,
          ),
        );
      }
      closeModal();
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!novelId) return;
    if (!window.confirm("确定要删除这个伏笔吗？删除后无法恢复。")) return;

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
      .from("foreshadowings")
      .delete()
      .eq("id", id)
      .eq("novel_id", novelId)
      .eq("user_id", user.id);

    if (deleteError) {
      setSaveError(deleteError.message);
      return;
    }

    setForeshadowings((current) => current.filter((item) => item.id !== id));
  };

  const filteredForeshadowings = useMemo(() => {
    const keyword = search.trim().toLowerCase();

    return foreshadowings.filter((item) => {
      const matchesSearch =
        !keyword ||
        item.title.toLowerCase().includes(keyword) ||
        item.description.toLowerCase().includes(keyword) ||
        item.notes.toLowerCase().includes(keyword) ||
        (item.tags ?? []).some((tag) => tag.toLowerCase().includes(keyword));

      const matchesType =
        filterType === "全部类型" || item.type === filterType;
      const matchesStatus =
        filterStatus === "全部状态" || item.status === filterStatus;
      const matchesPriority =
        filterPriority === "全部优先级" || item.priority === filterPriority;

      return matchesSearch && matchesType && matchesStatus && matchesPriority;
    });
  }, [foreshadowings, search, filterType, filterStatus, filterPriority]);

  const chapterById = useMemo(() => {
    return new Map(chapters.map((chapter) => [chapter.id, chapter]));
  }, [chapters]);

  const latestChapterNumber = chapters.length
    ? chapters[chapters.length - 1].chapter_number
    : 0;

  const getChapterNumber = (id: string | null) =>
    id ? chapterById.get(id)?.chapter_number ?? null : null;

  const riskItems = useMemo(() => {
    return foreshadowings.flatMap((item) => {
      const risks: { level: "danger" | "warning"; text: string }[] = [];
      const plantedNumber = getChapterNumber(item.planted_chapter_id);
      const revealNumber = getChapterNumber(item.reveal_chapter_id);
      const actualRevealNumber = getChapterNumber(item.actual_reveal_chapter_id);

      if (item.status !== "已回收" && (item.priority === "重要" || item.priority === "高") && !item.reveal_chapter_id) {
        risks.push({ level: "danger", text: "高优先级伏笔还没有设置计划回收章节" });
      }

      if (item.status !== "已回收" && revealNumber !== null && latestChapterNumber >= revealNumber && !item.actual_reveal_chapter_id) {
        risks.push({ level: "danger", text: `计划在第${revealNumber}章回收，但目前已经写到第${latestChapterNumber}章` });
      }

      if (item.planted_chapter_id && !item.reveal_chapter_id && item.status === "已埋下") {
        risks.push({ level: "warning", text: "已经埋下，但还没有设置计划回收章节" });
      }

      if (item.status === "已回收" && !item.actual_reveal_chapter_id) {
        risks.push({ level: "warning", text: "状态显示已回收，但没有填写实际回收章节" });
      }

      if (plantedNumber !== null && actualRevealNumber !== null && actualRevealNumber < plantedNumber) {
        risks.push({ level: "danger", text: "实际回收章节早于埋下章节，请检查时间线" });
      }

      if (revealNumber !== null && actualRevealNumber !== null && actualRevealNumber > revealNumber) {
        risks.push({ level: "warning", text: `实际回收晚于计划回收 ${actualRevealNumber - revealNumber} 章` });
      }

      if (!risks.length) return [];
      return [{ item, risks }];
    });
  }, [foreshadowings, chapterById, latestChapterNumber]);

  const timelineRows = useMemo(() => {
    const rows = chapters.map((chapter) => ({
      chapter,
      events: [] as { item: Foreshadowing; kind: "plant" | "reappear" | "planned" | "actual" }[],
    }));

    const rowByChapterId = new Map(rows.map((row) => [row.chapter.id, row]));

    foreshadowings.forEach((item) => {
      const links: Array<[string | null, "plant" | "reappear" | "planned" | "actual"]> = [
        [item.planted_chapter_id, "plant"],
        [item.reappear_chapter_id, "reappear"],
        [item.reveal_chapter_id, "planned"],
        [item.actual_reveal_chapter_id, "actual"],
      ];

      links.forEach(([chapterId, kind]) => {
        if (!chapterId) return;
        const row = rowByChapterId.get(chapterId);
        if (row) row.events.push({ item, kind });
      });
    });

    return rows.filter((row) => row.events.length > 0);
  }, [chapters, foreshadowings]);

  const timelineEventLabel = (kind: "plant" | "reappear" | "planned" | "actual") => {
    if (kind === "plant") return "埋下";
    if (kind === "reappear") return "再现";
    if (kind === "planned") return "计划回收";
    return "实际回收";
  };

  const relationGraph = useMemo(() => {
    const linked = foreshadowings.filter((item) =>
      [
        item.planted_chapter_id,
        item.reappear_chapter_id,
        item.reveal_chapter_id,
        item.actual_reveal_chapter_id,
      ].some(Boolean),
    );

    const chapterNodes = chapters.filter((chapter) =>
      linked.some((item) =>
        [
          item.planted_chapter_id,
          item.reappear_chapter_id,
          item.reveal_chapter_id,
          item.actual_reveal_chapter_id,
        ].includes(chapter.id),
      ),
    );

    return { linked, chapterNodes };
  }, [chapters, foreshadowings]);

  const graphChapterIndex = useMemo(
    () => new Map(relationGraph.chapterNodes.map((chapter, index) => [chapter.id, index])),
    [relationGraph.chapterNodes],
  );

  const graphForeshadowIndex = useMemo(
    () => new Map(relationGraph.linked.map((item, index) => [item.id, index])),
    [relationGraph.linked],
  );

  const graphEvents = useMemo(() => {
    return relationGraph.linked.flatMap((item) => {
      const links: Array<[string | null, string]> = [
        [item.planted_chapter_id, "埋下"],
        [item.reappear_chapter_id, "再现"],
        [item.reveal_chapter_id, "计划回收"],
        [item.actual_reveal_chapter_id, "实际回收"],
      ];

      return links.flatMap(([chapterId, label]) => {
        if (!chapterId || !graphChapterIndex.has(chapterId)) return [];
        return [{ item, chapterId, label }];
      });
    });
  }, [relationGraph.linked, graphChapterIndex]);

  const characterGraph = useMemo(() => {
    const characterById = new Map(characters.map((character) => [character.id, character]));
    const foreshadowingById = new Map(foreshadowings.map((item) => [item.id, item]));

    const rows = characters.map((character) => {
      const relations = characterRelations
        .filter((item) => item.character_id === character.id)
        .map((item) => ({
          ...item,
          foreshadowing: foreshadowingById.get(item.foreshadowing_id) ?? null,
        }))
        .filter((item) => item.foreshadowing);

      return { character, relations };
    });

    const linkedForeshadowings = new Set(
      characterRelations
        .filter((item) => characterById.has(item.character_id) && foreshadowingById.has(item.foreshadowing_id))
        .map((item) => item.foreshadowing_id),
    );

    return {
      rows,
      linkedForeshadowingCount: linkedForeshadowings.size,
      relationCount: characterRelations.length,
    };
  }, [characters, characterRelations, foreshadowings]);

  const hasFilters =
    search.trim() !== "" ||
    filterType !== "全部类型" ||
    filterStatus !== "全部状态" ||
    filterPriority !== "全部优先级";

  const clearFilters = () => {
    setSearch("");
    setFilterType("全部类型");
    setFilterStatus("全部状态");
    setFilterPriority("全部优先级");
  };

  const scrollToForeshadowings = () => {
    document.getElementById("foreshadowings")?.scrollIntoView({
      behavior: "smooth",
    });
  };

  if (loading) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[#f5f0e8] text-[#332b26]">
        正在打开作品……
      </main>
    );
  }

  if (error || !novel) {
    return (
      <main className="min-h-screen bg-[#f5f0e8] px-6 py-16 text-[#332b26]">
        <div className="mx-auto max-w-3xl">
          <button
            onClick={() => router.push("/works")}
            className="mb-8 text-sm text-[#6b625b] hover:text-[#241f1c]"
          >
            ← 返回我的作品
          </button>
          <div className="rounded-3xl border border-[#d8cec2] bg-[#fbf8f2] p-8">
            <h1 className="text-2xl font-semibold text-[#241f1c]">
              无法打开这部作品
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
            onClick={() => router.push("/works")}
            className="mb-7 text-sm text-[#756b63] transition hover:text-[#241f1c]"
          >
            ← 返回我的作品
          </button>

          <div className="flex flex-col gap-6 md:flex-row md:items-end md:justify-between">
            <div>
              <p className="mb-3 text-xs tracking-[0.28em] text-[#9a8c7e]">
                STORY WORKSPACE
              </p>
              <h1 className="text-4xl font-semibold tracking-tight text-[#241f1c] md:text-5xl">
                {novel.title}
              </h1>
              {novel.description && (
                <p className="mt-4 max-w-2xl leading-7 text-[#756b63]">
                  {novel.description}
                </p>
              )}
            </div>
            <button
              onClick={openCreate}
              className="rounded-2xl bg-[#332b26] px-6 py-3 text-sm font-medium text-[#f8f2e9] shadow-sm transition hover:bg-[#241f1c]"
            >
              + 新建伏笔
            </button>
          </div>
        </div>

        {riskItems.length > 0 && (
          <section className="mb-10 rounded-3xl border border-[#dec7bd] bg-[#fbf1ec] p-6">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <p className="text-xs tracking-[0.25em] text-[#9a6d62]">FORESHADOWING CHECK</p>
                <h2 className="mt-2 text-2xl font-semibold text-[#302923]">伏笔风险检查</h2>
                <p className="mt-2 text-sm text-[#766c64]">根据当前章节进度，提醒你可能忘记回收或时间线异常的伏笔。</p>
              </div>
              <div className="rounded-2xl bg-white/60 px-4 py-3 text-sm text-[#7a3931]">
                {riskItems.length} 个伏笔需要注意
              </div>
            </div>
            <div className="mt-5 space-y-3">
              {riskItems.map(({ item, risks }) => (
                <button
                  key={item.id}
                  onClick={() => openEdit(item)}
                  className="w-full rounded-2xl border border-[#e4d3cb] bg-[#fffaf6] p-4 text-left transition hover:border-[#c8a99e]"
                >
                  <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                    <span className="font-medium text-[#403731]">{item.title}</span>
                    <span className="text-xs text-[#9a8e85]">点击编辑</span>
                  </div>
                  <div className="mt-2 space-y-1">
                    {risks.map((risk, index) => (
                      <p key={`${item.id}-risk-${index}`} className={`text-sm ${risk.level === "danger" ? "text-[#8a3f38]" : "text-[#8a6b4f]"}`}>
                        {risk.level === "danger" ? "●" : "○"} {risk.text}
                      </p>
                    ))}
                  </div>
                </button>
              ))}
            </div>
          </section>
        )}

        <div className="mb-10 grid gap-4 sm:grid-cols-3">
          <div className="rounded-3xl border border-[#ded4c8] bg-[#fbf8f2] p-6">
            <p className="text-sm text-[#887d74]">伏笔总数</p>
            <p className="mt-2 text-3xl font-semibold text-[#302923]">
              {foreshadowings.length}
            </p>
          </div>
          <div className="rounded-3xl border border-[#ded4c8] bg-[#fbf8f2] p-6">
            <p className="text-sm text-[#887d74]">已埋下</p>
            <p className="mt-2 text-3xl font-semibold text-[#302923]">
              {foreshadowings.filter((item) => item.status === "已埋下").length}
            </p>
          </div>
          <div className="rounded-3xl border border-[#ded4c8] bg-[#fbf8f2] p-6">
            <p className="text-sm text-[#887d74]">已回收</p>
            <p className="mt-2 text-3xl font-semibold text-[#302923]">
              {foreshadowings.filter((item) => item.status === "已回收").length}
            </p>
          </div>
        </div>

        <div className="mb-12 grid gap-5 md:grid-cols-2 lg:grid-cols-4">
          <button
            onClick={scrollToForeshadowings}
            className="rounded-3xl border border-[#d9cec2] bg-[#fbf8f2] p-7 text-left transition hover:-translate-y-0.5 hover:border-[#bcae9f]"
          >
            <div className="mb-4 text-2xl">◌</div>
            <h2 className="text-xl font-semibold text-[#302923]">伏笔管理</h2>
            <p className="mt-2 text-sm leading-6 text-[#81766e]">
              记录秘密、线索、物品与人物暗线。
            </p>
          </button>


          <button
            onClick={() => document.getElementById("timeline")?.scrollIntoView({ behavior: "smooth" })}
            className="rounded-3xl border border-[#d9cec2] bg-[#fbf8f2] p-7 text-left transition hover:-translate-y-0.5 hover:border-[#bcae9f]"
          >
            <div className="mb-4 text-2xl">⌁</div>
            <h2 className="text-xl font-semibold text-[#302923]">伏笔时间线</h2>
            <p className="mt-2 text-sm leading-6 text-[#81766e]">
              按章节查看伏笔埋下、再现与回收的位置。
            </p>
          </button>

          <button
            onClick={() => document.getElementById("relation-graph")?.scrollIntoView({ behavior: "smooth" })}
            className="rounded-3xl border border-[#d9cec2] bg-[#fbf8f2] p-7 text-left transition hover:-translate-y-0.5 hover:border-[#bcae9f]"
          >
            <div className="mb-4 text-2xl">⌘</div>
            <h2 className="text-xl font-semibold text-[#302923]">伏笔关系图</h2>
            <p className="mt-2 text-sm leading-6 text-[#81766e]">
              查看伏笔与章节之间的完整关联网络。
            </p>
          </button>

          <button
            onClick={() => router.push(`/works/novel/${novelId}/characters`)}
            className="rounded-3xl border border-[#d9cec2] bg-[#fbf8f2] p-7 text-left transition hover:-translate-y-0.5 hover:border-[#bcae9f]"
          >
            <div className="mb-4 text-2xl">♧</div>
            <h2 className="text-xl font-semibold text-[#302923]">人物管理</h2>
            <p className="mt-2 text-sm leading-6 text-[#81766e]">
              管理角色秘密、关系与人物线。
            </p>
          </button>

          <button
            onClick={() => document.getElementById("story-network")?.scrollIntoView({ behavior: "smooth" })}
            className="rounded-3xl border border-[#d9cec2] bg-[#fbf8f2] p-7 text-left transition hover:-translate-y-0.5 hover:border-[#bcae9f]"
          >
            <div className="mb-4 text-2xl">✣</div>
            <h2 className="text-xl font-semibold text-[#302923]">故事关系网</h2>
            <p className="mt-2 text-sm leading-6 text-[#81766e]">
              看见人物与伏笔之间的秘密、触发与关联。
            </p>
          </button>

          <button
            onClick={() => router.push(`/works/novel/${novelId}/chapters`)}
            className="rounded-3xl border border-[#d9cec2] bg-[#fbf8f2] p-7 text-left transition hover:-translate-y-0.5 hover:border-[#bcae9f]"
          >
            <div className="mb-4 text-2xl">☷</div>
            <h2 className="text-xl font-semibold text-[#302923]">章节管理</h2>
            <p className="mt-2 text-sm leading-6 text-[#81766e]">
              管理章节与伏笔出现的位置。
            </p>
          </button>
        </div>


        <section id="timeline" className="mb-14">
          <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="text-xs tracking-[0.25em] text-[#9a8c7e]">FORESHADOWING TIMELINE</p>
              <h2 className="mt-2 text-2xl font-semibold text-[#302923]">伏笔时间线</h2>
              <p className="mt-2 text-sm leading-6 text-[#81766e]">
                把伏笔放回章节里，看见它从出现到回收的完整轨迹。
              </p>
            </div>
            <div className="text-sm text-[#887d74]">
              共 {chapters.length} 章 · {timelineRows.length} 章有伏笔事件
            </div>
          </div>

          {chapters.length === 0 ? (
            <div className="rounded-3xl border border-dashed border-[#cfc3b6] bg-[#faf6ee] p-10 text-center">
              <div className="text-4xl">⌁</div>
              <h3 className="mt-4 text-lg font-semibold text-[#302923]">还没有章节</h3>
              <p className="mt-2 text-sm leading-6 text-[#82776e]">
                先创建章节，再把伏笔关联到具体章节，时间线就会自动出现。
              </p>
              <button
                onClick={() => router.push(`/works/novel/${novelId}/chapters`)}
                className="mt-5 rounded-2xl bg-[#332b26] px-5 py-3 text-sm font-medium text-[#f8f2e9]"
              >
                去章节管理
              </button>
            </div>
          ) : timelineRows.length === 0 ? (
            <div className="rounded-3xl border border-dashed border-[#cfc3b6] bg-[#faf6ee] p-10 text-center">
              <div className="text-4xl">✦</div>
              <h3 className="mt-4 text-lg font-semibold text-[#302923]">时间线还是空的</h3>
              <p className="mt-2 text-sm leading-6 text-[#82776e]">
                给伏笔设置「埋下章节」「再次出现」或「计划揭露章节」后，它们会自动出现在这里。
              </p>
              <button
                onClick={scrollToForeshadowings}
                className="mt-5 rounded-2xl border border-[#cfc3b6] px-5 py-3 text-sm text-[#665c54] transition hover:bg-[#f0e9df]"
              >
                去管理伏笔
              </button>
            </div>
          ) : (
            <div className="overflow-hidden rounded-3xl border border-[#ded4c8] bg-[#fbf8f2]">
              <div className="overflow-x-auto">
                <div className="min-w-[760px]">
                  <div className="grid grid-cols-[150px_1fr] border-b border-[#e6ded4] bg-[#f4eee6]">
                    <div className="px-5 py-4 text-xs tracking-[0.14em] text-[#8a7f76]">CHAPTER</div>
                    <div className="px-5 py-4 text-xs tracking-[0.14em] text-[#8a7f76]">FORESHADOWING EVENTS</div>
                  </div>

                  {timelineRows.map(({ chapter, events }) => (
                    <div key={chapter.id} className="grid grid-cols-[150px_1fr] border-b border-[#eee7de] last:border-b-0">
                      <div className="border-r border-[#eee7de] px-5 py-5">
                        <p className="text-sm font-semibold text-[#403731]">第{chapter.chapter_number}章</p>
                        <p className="mt-1 max-w-[120px] truncate text-xs text-[#8a7f76]" title={chapter.title}>
                          {chapter.title}
                        </p>
                      </div>
                      <div className="flex flex-wrap items-center gap-2 px-5 py-4">
                        {events.map(({ item, kind }, index) => (
                          <button
                            key={`${item.id}-${kind}-${index}`}
                            onClick={() => openEdit(item)}
                            className="group rounded-2xl border border-[#ddd2c6] bg-white/65 px-3 py-2 text-left transition hover:-translate-y-0.5 hover:border-[#a98e80] hover:shadow-sm"
                          >
                            <div className="flex items-center gap-2">
                              <span className={`h-2 w-2 rounded-full ${kind === "actual" ? "bg-[#65735f]" : kind === "planned" ? "bg-[#a97862]" : kind === "reappear" ? "bg-[#9a8b78]" : "bg-[#6f6258]"}`} />
                              <span className="max-w-[190px] truncate text-sm font-medium text-[#514840]" title={item.title}>
                                {item.title}
                              </span>
                            </div>
                            <p className="mt-1 text-[11px] text-[#8a7f76]">{timelineEventLabel(kind)}</p>
                          </button>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </section>

        <section id="relation-graph" className="mb-14">
          <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="text-xs tracking-[0.25em] text-[#9a8c7e]">FORESHADOWING RELATION MAP</p>
              <h2 className="mt-2 text-2xl font-semibold text-[#302923]">伏笔关系图</h2>
              <p className="mt-2 text-sm leading-6 text-[#81766e]">
                把章节和伏笔连起来，快速看见每条暗线从哪里开始、在哪里出现、最终在哪里回收。
              </p>
            </div>
            <div className="rounded-2xl bg-[#f0e9df] px-4 py-3 text-sm text-[#756b63]">
              {relationGraph.linked.length} 个伏笔 · {relationGraph.chapterNodes.length} 个章节
            </div>
          </div>

          {relationGraph.linked.length === 0 ? (
            <div className="rounded-3xl border border-dashed border-[#cfc3b6] bg-[#faf6ee] p-10 text-center">
              <div className="text-4xl">⌘</div>
              <h3 className="mt-4 text-lg font-semibold text-[#302923]">关系图还是空的</h3>
              <p className="mx-auto mt-2 max-w-lg text-sm leading-6 text-[#82776e]">
                先给伏笔关联「埋下章节」「再次出现」「计划揭露」或「实际揭露」中的任意一个章节，关系图就会自动生成。
              </p>
              <button
                onClick={scrollToForeshadowings}
                className="mt-5 rounded-2xl border border-[#cfc3b6] px-5 py-3 text-sm text-[#665c54] transition hover:bg-[#f0e9df]"
              >
                去管理伏笔
              </button>
            </div>
          ) : (
            <div className="overflow-hidden rounded-3xl border border-[#ded4c8] bg-[#fbf8f2]">
              <div className="border-b border-[#e6ded4] bg-[#f4eee6] px-5 py-4">
                <div className="flex flex-wrap items-center gap-4 text-xs text-[#766c64]">
                  <span className="font-medium text-[#514840]">关系类型：</span>
                  <span>● 埋下</span>
                  <span>● 再现</span>
                  <span>● 计划回收</span>
                  <span>● 实际回收</span>
                </div>
              </div>

              <div className="hidden overflow-x-auto md:block">
                <div
                  className="relative min-w-[760px]"
                  style={{ height: `${Math.max(relationGraph.chapterNodes.length, relationGraph.linked.length) * 92 + 80}px` }}
                >
                  <svg
                    className="pointer-events-none absolute inset-0 h-full w-full"
                    viewBox={`0 0 760 ${Math.max(relationGraph.chapterNodes.length, relationGraph.linked.length) * 92 + 80}`}
                    preserveAspectRatio="none"
                  >
                    {graphEvents.map(({ item, chapterId, label }, index) => {
                      const chapterIndex = graphChapterIndex.get(chapterId) ?? 0;
                      const itemIndex = graphForeshadowIndex.get(item.id) ?? 0;
                      const y1 = 76 + chapterIndex * 92;
                      const y2 = 76 + itemIndex * 92;
                      const bend = 300;
                      const stroke = label === "实际回收"
                        ? "#65735f"
                        : label === "计划回收"
                          ? "#a97862"
                          : label === "再现"
                            ? "#9a8b78"
                            : "#6f6258";
                      return (
                        <path
                          key={`${item.id}-${chapterId}-${label}-${index}`}
                          d={`M 215 ${y1} C ${bend} ${y1}, ${bend} ${y2}, 515 ${y2}`}
                          fill="none"
                          stroke={stroke}
                          strokeWidth="1.6"
                          strokeDasharray={label === "计划回收" ? "5 5" : undefined}
                          opacity="0.7"
                        />
                      );
                    })}
                  </svg>

                  <div className="absolute left-0 top-0 w-[215px]">
                    <div className="px-6 py-5 text-xs tracking-[0.16em] text-[#8a7f76]">CHAPTERS</div>
                    {relationGraph.chapterNodes.map((chapter, index) => (
                      <button
                        key={chapter.id}
                        onClick={() => router.push(`/works/novel/${novelId}/chapters`)}
                        className="absolute left-5 flex h-[58px] w-[175px] -translate-y-1/2 flex-col justify-center rounded-2xl border border-[#d8cec2] bg-white/90 px-4 text-left shadow-sm transition hover:-translate-y-[calc(50%+2px)] hover:border-[#a98e80]"
                        style={{ top: `${76 + index * 92}px` }}
                      >
                        <span className="text-sm font-semibold text-[#403731]">第{chapter.chapter_number}章</span>
                        <span className="mt-1 truncate text-xs text-[#8a7f76]">{chapter.title}</span>
                      </button>
                    ))}
                  </div>

                  <div className="absolute right-0 top-0 w-[245px]">
                    <div className="px-6 py-5 text-xs tracking-[0.16em] text-[#8a7f76]">FORESHADOWINGS</div>
                    {relationGraph.linked.map((item, index) => (
                      <button
                        key={item.id}
                        onClick={() => openEdit(item)}
                        className="absolute right-5 flex h-[58px] w-[215px] -translate-y-1/2 items-center rounded-2xl border border-[#d8cec2] bg-[#fffaf6] px-4 text-left shadow-sm transition hover:-translate-y-[calc(50%+2px)] hover:border-[#a98e80]"
                        style={{ top: `${76 + index * 92}px` }}
                      >
                        <span className="mr-3 h-2.5 w-2.5 shrink-0 rounded-full bg-[#7b4b43]" />
                        <span className="min-w-0">
                          <span className="block truncate text-sm font-medium text-[#403731]">{item.title}</span>
                          <span className="mt-1 block truncate text-xs text-[#8a7f76]">{item.type} · {item.status}</span>
                        </span>
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              <div className="divide-y divide-[#e6ded4] md:hidden">
                {relationGraph.linked.map((item) => {
                  const links = graphEvents.filter((event) => event.item.id === item.id);
                  return (
                    <button
                      key={item.id}
                      onClick={() => openEdit(item)}
                      className="w-full p-5 text-left transition hover:bg-[#f7f1e8]"
                    >
                      <div className="flex items-center gap-3">
                        <span className="h-2.5 w-2.5 shrink-0 rounded-full bg-[#7b4b43]" />
                        <span className="font-medium text-[#403731]">{item.title}</span>
                      </div>
                      <div className="mt-4 space-y-2 pl-5">
                        {links.map((link, index) => {
                          const chapter = chapterById.get(link.chapterId);
                          return (
                            <div key={`${link.chapterId}-${link.label}-${index}`} className="flex items-center gap-2 text-sm">
                              <span className="text-[#b1a399]">└</span>
                              <span className="text-[#756b63]">{chapter ? `第${chapter.chapter_number}章 · ${chapter.title}` : "未知章节"}</span>
                              <span className="ml-auto shrink-0 text-xs text-[#9a8e85]">{link.label}</span>
                            </div>
                          );
                        })}
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </section>

        <section id="story-network" className="mb-14">
          <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="text-xs tracking-[0.25em] text-[#9a8c7e]">CHARACTER × FORESHADOWING</p>
              <h2 className="mt-2 text-2xl font-semibold text-[#302923]">故事关系网</h2>
              <p className="mt-2 max-w-2xl text-sm leading-6 text-[#81766e]">
                把人物放进伏笔网络里。一个人物知道什么、隐瞒什么、触发什么，会直接显示在这里。
              </p>
            </div>
            <div className="rounded-2xl bg-[#f0e9df] px-4 py-3 text-sm text-[#756b63]">
              {characters.length} 个人物 · {characterGraph.linkedForeshadowingCount} 个关联伏笔 · {characterGraph.relationCount} 条关系
            </div>
          </div>

          {characters.length === 0 ? (
            <div className="rounded-3xl border border-dashed border-[#cfc3b6] bg-[#faf6ee] p-10 text-center">
              <div className="text-4xl">♧</div>
              <h3 className="mt-4 text-lg font-semibold text-[#302923]">还没有人物</h3>
              <p className="mx-auto mt-2 max-w-lg text-sm leading-6 text-[#82776e]">
                先创建人物，再把人物与伏笔关联起来，这里就会自动形成故事关系网。
              </p>
              <button
                onClick={() => router.push(`/works/novel/${novelId}/characters`)}
                className="mt-5 rounded-2xl bg-[#332b26] px-5 py-3 text-sm font-medium text-[#f8f2e9]"
              >
                去人物管理
              </button>
            </div>
          ) : (
            <div className="grid gap-4 md:grid-cols-2">
              {characterGraph.rows.map(({ character, relations }) => (
                <div key={character.id} className="rounded-3xl border border-[#ded4c8] bg-[#fbf8f2] p-5">
                  <button
                    onClick={() => router.push(`/works/novel/${novelId}/characters`)}
                    className="flex w-full items-start gap-3 text-left"
                  >
                    <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border border-[#d7cbbf] bg-[#f0e8de] text-[#7b4b43]">
                      ♧
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <h3 className="font-semibold text-[#403731]">{character.name}</h3>
                        {character.alias && <span className="text-xs text-[#958980]">{character.alias}</span>}
                      </div>
                      {character.role && <p className="mt-1 text-xs text-[#8a7f76]">{character.role}</p>}
                    </div>
                  </button>

                  {character.secret && (
                    <div className="mt-4 rounded-2xl border border-[#e2d7cc] bg-white/55 px-4 py-3">
                      <p className="text-[11px] tracking-[0.12em] text-[#9a8c7e]">SECRET</p>
                      <p className="mt-1 text-sm leading-6 text-[#665c54]">{character.secret}</p>
                    </div>
                  )}

                  {relations.length === 0 ? (
                    <div className="mt-4 rounded-2xl border border-dashed border-[#ddd1c5] px-4 py-3 text-sm text-[#978b82]">
                      暂无关联伏笔
                    </div>
                  ) : (
                    <div className="mt-4 space-y-2">
                      <p className="text-xs tracking-[0.12em] text-[#9a8c7e]">LINKED FORESHADOWINGS</p>
                      {relations.map((relation) => (
                        <button
                          key={`${character.id}-${relation.foreshadowing_id}`}
                          onClick={() => relation.foreshadowing && openEdit(relation.foreshadowing as Foreshadowing)}
                          className="flex w-full items-center gap-3 rounded-2xl border border-[#e1d7cc] bg-white/65 px-4 py-3 text-left transition hover:border-[#bda99b] hover:bg-white"
                        >
                          <span className="h-2 w-2 shrink-0 rounded-full bg-[#7b4b43]" />
                          <span className="min-w-0 flex-1 truncate text-sm font-medium text-[#514840]">
                            {relation.foreshadowing?.title}
                          </span>
                          <span className="shrink-0 text-xs text-[#9a8e85]">{relation.relation}</span>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </section>

        <section id="foreshadowings">
          <div className="mb-5 flex items-end justify-between">
            <div>
              <p className="text-xs tracking-[0.25em] text-[#9a8c7e]">
                FORESHADOWINGS
              </p>
              <h2 className="mt-2 text-2xl font-semibold text-[#302923]">
                我的伏笔
              </h2>
            </div>
            <button
              onClick={openCreate}
              className="text-sm text-[#7b4b43] hover:underline"
            >
              新建一个 →
            </button>
          </div>

          {saveError && (
            <div className="mb-5 rounded-2xl border border-[#d7b8b1] bg-[#f8e9e5] px-5 py-4 text-sm text-[#7b3932]">
              {saveError}
            </div>
          )}

          <div className="mb-6 rounded-3xl border border-[#ded4c8] bg-[#fbf8f2] p-5">
            <div className="flex flex-col gap-4 lg:flex-row">
              <div className="relative flex-1">
                <span className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-[#9a8e85]">
                  ⌕
                </span>
                <input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="搜索伏笔标题、描述、标签或作者备注……"
                  className="w-full rounded-2xl border border-[#d6cbbf] bg-white/60 py-3 pl-11 pr-4 text-sm outline-none transition focus:border-[#92786b] focus:ring-2 focus:ring-[#92786b]/10"
                />
              </div>

              <div className="grid grid-cols-1 gap-3 sm:grid-cols-3 lg:w-[480px]">
                <select
                  value={filterType}
                  onChange={(e) => setFilterType(e.target.value)}
                  className="rounded-2xl border border-[#d6cbbf] bg-white/60 px-4 py-3 text-sm text-[#514840] outline-none"
                >
                  <option value="全部类型">全部类型</option>
                  {types.map((item) => (
                    <option key={item} value={item}>
                      {item}
                    </option>
                  ))}
                </select>
                <select
                  value={filterStatus}
                  onChange={(e) => setFilterStatus(e.target.value)}
                  className="rounded-2xl border border-[#d6cbbf] bg-white/60 px-4 py-3 text-sm text-[#514840] outline-none"
                >
                  <option value="全部状态">全部状态</option>
                  {statuses.map((item) => (
                    <option key={item} value={item}>
                      {item}
                    </option>
                  ))}
                </select>
                <select
                  value={filterPriority}
                  onChange={(e) => setFilterPriority(e.target.value)}
                  className="rounded-2xl border border-[#d6cbbf] bg-white/60 px-4 py-3 text-sm text-[#514840] outline-none"
                >
                  <option value="全部优先级">全部优先级</option>
                  {priorities.map((item) => (
                    <option key={item} value={item}>
                      {item}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {hasFilters && (
              <div className="mt-4 flex flex-col gap-3 border-t border-[#e6ded4] pt-4 sm:flex-row sm:items-center sm:justify-between">
                <p className="text-sm text-[#81766e]">
                  找到{" "}
                  <span className="font-medium text-[#514840]">
                    {filteredForeshadowings.length}
                  </span>{" "}
                  个相关伏笔
                </p>
                <button
                  onClick={clearFilters}
                  className="text-left text-sm text-[#7b4b43] hover:underline sm:text-right"
                >
                  清除筛选
                </button>
              </div>
            )}
          </div>

          {loadingForeshadowings ? (
            <div className="rounded-3xl border border-[#ded4c8] bg-[#fbf8f2] p-10 text-center text-sm text-[#887d74]">
              正在读取伏笔……
            </div>
          ) : foreshadowings.length === 0 ? (
            <div className="rounded-3xl border border-dashed border-[#cfc3b6] bg-[#faf6ee] p-12 text-center">
              <div className="text-4xl">✦</div>
              <h3 className="mt-5 text-xl font-semibold text-[#302923]">
                还没有伏笔
              </h3>
              <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-[#82776e]">
                故事里那些现在看似不起眼的细节，可以从这里开始记录。
              </p>
              <button
                onClick={openCreate}
                className="mt-6 rounded-2xl bg-[#332b26] px-6 py-3 text-sm font-medium text-[#f8f2e9]"
              >
                创建第一个伏笔
              </button>
            </div>
          ) : filteredForeshadowings.length === 0 ? (
            <div className="rounded-3xl border border-dashed border-[#cfc3b6] bg-[#faf6ee] p-12 text-center">
              <div className="text-4xl">⌕</div>
              <h3 className="mt-5 text-xl font-semibold text-[#302923]">
                没有找到匹配的伏笔
              </h3>
              <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-[#82776e]">
                换一个关键词，或者调整上面的筛选条件试试看。
              </p>
              <button
                onClick={clearFilters}
                className="mt-6 rounded-2xl border border-[#cfc3b6] px-6 py-3 text-sm text-[#665c54] transition hover:bg-[#f0e9df]"
              >
                清除筛选
              </button>
            </div>
          ) : (
            <div className="grid gap-5 md:grid-cols-2">
              {filteredForeshadowings.map((item) => (
                <article
                  key={item.id}
                  className="rounded-3xl border border-[#ded4c8] bg-[#fbf8f2] p-6 shadow-[0_8px_30px_rgba(70,50,35,0.04)]"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <div className="mb-3 flex flex-wrap gap-2">
                        <span className="rounded-full bg-[#eee6dc] px-3 py-1 text-xs text-[#6d6259]">
                          {item.type}
                        </span>
                        <span
                          className={`rounded-full px-3 py-1 text-xs ${
                            item.priority === "重要" || item.priority === "高"
                              ? "bg-[#f2dfda] text-[#7a3931]"
                              : "bg-[#eee9e2] text-[#71675f]"
                          }`}
                        >
                          {item.priority}
                        </span>
                        <span className="rounded-full bg-[#e8eee6] px-3 py-1 text-xs text-[#52614d]">
                          {item.status}
                        </span>
                      </div>
                      <h3 className="text-xl font-semibold text-[#302923]">
                        {item.title}
                      </h3>
                    </div>

                    <div className="flex shrink-0 items-center gap-3">
                      <button
                        onClick={() => openEdit(item)}
                        className="text-xs text-[#7b4b43] hover:underline"
                      >
                        编辑
                      </button>
                      <button
                        onClick={() => void handleDelete(item.id)}
                        className="text-xs text-[#9a8e85] hover:text-[#8a3f38]"
                      >
                        删除
                      </button>
                    </div>
                  </div>

                  {item.description && (
                    <p className="mt-4 whitespace-pre-wrap text-sm leading-7 text-[#756b63]">
                      {item.description}
                    </p>
                  )}

                  <div className="mt-5 border-t border-[#e6ded4] pt-5">
                    <p className="text-xs tracking-[0.12em] text-[#9a8e85]">FORESHADOWING FLOW</p>
                    <div className="mt-3 flex flex-col gap-2 text-sm sm:flex-row sm:flex-wrap sm:items-center">
                      <span className="rounded-xl bg-[#eee6dc] px-3 py-2 text-[#514840]">
                        {chapterLabel(item.planted_chapter_id, item.planted_chapter, "未关联埋下章节")}
                      </span>
                      <span className="hidden text-[#b1a399] sm:inline">→</span>
                      <span className="rounded-xl bg-[#f1ebe4] px-3 py-2 text-[#514840]">
                        {chapterLabel(item.reappear_chapter_id, "", "未关联再次出现")}
                      </span>
                      <span className="hidden text-[#b1a399] sm:inline">→</span>
                      <span className="rounded-xl bg-[#f1ebe4] px-3 py-2 text-[#514840]">
                        {chapterLabel(item.reveal_chapter_id, item.reveal_chapter, "未关联计划揭露")}
                      </span>
                      <span className="hidden text-[#b1a399] sm:inline">→</span>
                      <span className="rounded-xl bg-[#e8eee6] px-3 py-2 text-[#52614d]">
                        {chapterLabel(item.actual_reveal_chapter_id, item.actual_reveal_chapter, "尚未回收")}
                      </span>
                    </div>
                  </div>

                  <div className="mt-4 grid gap-3 sm:grid-cols-2">
                    <div>
                      <p className="text-xs text-[#9a8e85]">标签</p>
                      <div className="mt-1 flex flex-wrap gap-1">
                        {item.tags?.length ? (
                          item.tags.map((tag, index) => (
                            <span
                              key={`${item.id}-tag-${index}`}
                              className="text-sm text-[#514840]"
                            >
                              #{tag}
                            </span>
                          ))
                        ) : (
                          <span className="text-sm text-[#514840]">无</span>
                        )}
                      </div>
                    </div>
                  </div>

                  {item.notes && (
                    <div className="mt-5 rounded-2xl bg-[#f4eee6] p-4">
                      <p className="text-xs text-[#9a8e85]">作者备注</p>
                      <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-[#625850]">
                        {item.notes}
                      </p>
                    </div>
                  )}
                </article>
              ))}
            </div>
          )}
        </section>
      </div>

      {(showCreate || showEdit) && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-[#241f1c]/40 px-4 py-6"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget && !saving) closeModal();
          }}
        >
          <div className="max-h-[92vh] w-full max-w-2xl overflow-y-auto rounded-3xl border border-[#d8cec2] bg-[#fbf8f2] p-6 shadow-2xl md:p-8">
            <div className="mb-7 flex items-start justify-between gap-4">
              <div>
                <p className="text-xs tracking-[0.25em] text-[#9a8c7e]">
                  {showEdit ? "EDIT FORESHADOWING" : "NEW FORESHADOWING"}
                </p>
                <h2 className="mt-2 text-2xl font-semibold text-[#302923]">
                  {showEdit ? "编辑伏笔" : "新建伏笔"}
                </h2>
              </div>
              <button
                onClick={closeModal}
                disabled={saving}
                aria-label="关闭"
                className="text-2xl text-[#8b8077] hover:text-[#302923] disabled:opacity-40"
              >
                ×
              </button>
            </div>

            <div className="space-y-5">
              <div>
                <label className="mb-2 block text-sm font-medium text-[#514840]">
                  伏笔标题 *
                </label>
                <input
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="例如：男主一直戴着的旧怀表"
                  className="w-full rounded-2xl border border-[#d6cbbf] bg-white/60 px-4 py-3 text-sm outline-none transition focus:border-[#92786b] focus:ring-2 focus:ring-[#92786b]/10"
                />
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium text-[#514840]">
                  伏笔描述
                </label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="记录这个伏笔到底是什么，以及读者目前能看到什么。"
                  rows={4}
                  className="w-full resize-none rounded-2xl border border-[#d6cbbf] bg-white/60 px-4 py-3 text-sm leading-6 outline-none transition focus:border-[#92786b] focus:ring-2 focus:ring-[#92786b]/10"
                />
              </div>

              <div className="grid gap-4 sm:grid-cols-3">
                <FieldSelect label="类型" value={type} onChange={setType} options={types} />
                <FieldSelect
                  label="状态"
                  value={status}
                  onChange={setStatus}
                  options={statuses}
                />
                <FieldSelect
                  label="优先级"
                  value={priority}
                  onChange={setPriority}
                  options={priorities}
                />
              </div>

              <div>
                <div className="mb-3">
                  <p className="text-sm font-medium text-[#514840]">伏笔时间线</p>
                  <p className="mt-1 text-xs leading-5 text-[#8a7f76]">
                    直接从你已经创建的章节中选择，之后章节标题变化也能保持关联。
                  </p>
                </div>
                {chapters.length === 0 ? (
                  <div className="rounded-2xl border border-dashed border-[#cfc3b6] bg-[#f7f1e8] px-4 py-4 text-sm leading-6 text-[#756b63]">
                    还没有章节。请先去「章节管理」创建章节，再回来给伏笔建立关联。
                  </div>
                ) : (
                  <div className="grid gap-4 sm:grid-cols-2">
                    <ChapterSelect
                      label="埋下章节"
                      value={plantedChapter}
                      onChange={setPlantedChapter}
                      chapters={chapters}
                      emptyLabel="暂不关联"
                    />
                    <ChapterSelect
                      label="再次出现"
                      value={reappearChapter}
                      onChange={setReappearChapter}
                      chapters={chapters}
                      emptyLabel="暂不关联"
                    />
                    <ChapterSelect
                      label="计划揭露章节"
                      value={revealChapter}
                      onChange={setRevealChapter}
                      chapters={chapters}
                      emptyLabel="暂不关联"
                    />
                    <ChapterSelect
                      label="实际揭露章节"
                      value={actualRevealChapter}
                      onChange={setActualRevealChapter}
                      chapters={chapters}
                      emptyLabel="暂不关联"
                    />
                  </div>
                )}
              </div>

              <FieldInput
                label="标签"
                value={tags}
                onChange={setTags}
                placeholder="多个标签用逗号分隔，例如：怀表,父亲,秘密"
              />

              <div>
                <label className="mb-2 block text-sm font-medium text-[#514840]">
                  作者备注
                </label>
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="只有作者自己需要知道的信息，可以写真正的答案。"
                  rows={3}
                  className="w-full resize-none rounded-2xl border border-[#d6cbbf] bg-white/60 px-4 py-3 text-sm leading-6 outline-none"
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
                  disabled={saving}
                  className="rounded-2xl border border-[#d4c8bb] px-6 py-3 text-sm text-[#665c54] hover:bg-[#f3ede5] disabled:opacity-40"
                >
                  取消
                </button>
                <button
                  onClick={() => void (showEdit ? handleUpdate() : handleCreate())}
                  disabled={saving}
                  className="rounded-2xl bg-[#332b26] px-7 py-3 text-sm font-medium text-[#f8f2e9] transition hover:bg-[#241f1c] disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {saving ? "正在保存……" : showEdit ? "保存修改" : "保存伏笔"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}

type ChapterSelectProps = {
  label: string;
  value: string;
  onChange: (value: string) => void;
  chapters: Chapter[];
  emptyLabel: string;
};

function ChapterSelect({
  label,
  value,
  onChange,
  chapters,
  emptyLabel,
}: ChapterSelectProps) {
  return (
    <div>
      <label className="mb-2 block text-sm font-medium text-[#514840]">
        {label}
      </label>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full rounded-2xl border border-[#d6cbbf] bg-white/60 px-4 py-3 text-sm text-[#514840] outline-none transition focus:border-[#92786b] focus:ring-2 focus:ring-[#92786b]/10"
      >
        <option value="">{emptyLabel}</option>
        {chapters.map((chapter) => (
          <option key={chapter.id} value={chapter.id}>
            第{chapter.chapter_number}章 · {chapter.title}
          </option>
        ))}
      </select>
    </div>
  );
}

type FieldInputProps = {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
};

function FieldInput({ label, value, onChange, placeholder }: FieldInputProps) {
  return (
    <div>
      <label className="mb-2 block text-sm font-medium text-[#514840]">
        {label}
      </label>
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full rounded-2xl border border-[#d6cbbf] bg-white/60 px-4 py-3 text-sm outline-none transition focus:border-[#92786b] focus:ring-2 focus:ring-[#92786b]/10"
      />
    </div>
  );
}

type FieldSelectProps = {
  label: string;
  value: string;
  onChange: (value: string) => void;
  options: readonly string[];
};

function FieldSelect({ label, value, onChange, options }: FieldSelectProps) {
  return (
    <div>
      <label className="mb-2 block text-sm font-medium text-[#514840]">
        {label}
      </label>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full rounded-2xl border border-[#d6cbbf] bg-white/60 px-4 py-3 text-sm outline-none"
      >
        {options.map((item) => (
          <option key={item} value={item}>
            {item}
          </option>
        ))}
      </select>
    </div>
  );
}
