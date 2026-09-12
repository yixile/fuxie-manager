"use client";

import { FormEvent, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "../../lib/client";

export default function LoginPage() {
  const router = useRouter();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleLogin = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    setError("");
    setLoading(true);

    const supabase = createClient();

    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      setError(error.message);
      setLoading(false);
      return;
    }

    router.replace("/works");
    router.refresh();
  };

  return (
    <main className="min-h-screen bg-[#f5f0e8] px-6 py-12 text-[#2d2722]">
      <div className="mx-auto flex min-h-[80vh] max-w-md items-center">
        <div className="w-full rounded-3xl border border-[#d8cec1] bg-[#faf7f1] p-8 shadow-sm">
          <div className="mb-10 text-center">
            <p className="text-xs tracking-[0.3em] text-[#8b7462]">
              WRITER&apos;S STUDIO
            </p>

            <h1 className="mt-4 text-3xl font-semibold">
              登录伏笔管理器
            </h1>

            <p className="mt-3 text-sm leading-6 text-[#75685d]">
              回到你的故事，继续整理那些还没有被收回的秘密。
            </p>
          </div>

          <form onSubmit={handleLogin} className="space-y-5">
            <div>
              <label className="mb-2 block text-sm font-medium">
                邮箱
              </label>

              <input
                type="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                placeholder="your@email.com"
                required
                className="w-full rounded-xl border border-[#cfc2b4] bg-white px-4 py-3 outline-none transition focus:border-[#806653]"
              />
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium">
                密码
              </label>

              <input
                type="password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                placeholder="请输入密码"
                required
                className="w-full rounded-xl border border-[#cfc2b4] bg-white px-4 py-3 outline-none transition focus:border-[#806653]"
              />
            </div>

            {error && (
              <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-xl bg-[#3d3028] px-4 py-3 font-medium text-white transition hover:bg-[#2f251f] disabled:cursor-not-allowed disabled:opacity-60"
            >
              {loading ? "正在登录……" : "登录"}
            </button>
          </form>

          <div className="mt-8 text-center text-sm text-[#75685d]">
            还没有账号？

            <Link
              href="/register"
              className="ml-1 font-medium text-[#6f3f35] hover:underline"
            >
              创建账号
            </Link>
          </div>
        </div>
      </div>
    </main>
  );
}