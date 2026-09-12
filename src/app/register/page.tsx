"use client";

import { FormEvent, useState } from "react";
import Link from "next/link";
import { createClient } from "../../lib/client";

export default function RegisterPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const supabase = createClient();
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const handleRegister = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    setMessage("");
    setError("");

    if (!email.trim()) {
      setError("请输入邮箱地址。");
      return;
    }

    if (password.length < 6) {
      setError("密码至少需要 6 位。");
      return;
    }

    if (password !== confirmPassword) {
      setError("两次输入的密码不一致。");
      return;
    }

    setLoading(true);

    try {
      const supabase = createClient();

      const { data, error } = await supabase.auth.signUp({
        email: email.trim(),
        password,
      });

      if (error) {
        setError(error.message);
        return;
      }

      if (data.user && !data.session) {
        setMessage(
          "注册成功！请检查你的邮箱，并点击确认链接后再登录。"
        );
      } else {
        setMessage("注册成功！正在进入作品页……");

        window.location.href = "/works";
      }
    } catch {
      setError("注册失败，请检查网络连接后重试。");
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="min-h-screen bg-[#f7f5f0] px-6 py-12 text-[#292723]">
      <div className="mx-auto flex min-h-[calc(100vh-6rem)] max-w-xl flex-col">
        {/* Logo */}
        <div className="flex items-center justify-center gap-4">
          <div className="flex h-14 w-14 items-center justify-center rounded-full bg-[#292723] text-2xl text-[#f7f5f0]">
            伏
          </div>

          <div className="text-2xl font-semibold tracking-[0.12em]">
            伏笔管理器
          </div>
        </div>

        {/* Header */}
        <section className="mt-20 text-center">
          <h1 className="font-serif text-5xl leading-tight tracking-[0.08em]">
            创建你的账号
          </h1>

          <p className="mt-8 text-lg leading-9 text-[#81776b]">
            把埋下的每一个秘密，
            <br />
            都记得在故事里收回来。
          </p>
        </section>

        {/* Form */}
        <section className="mt-14 rounded-[32px] border border-[#ded9cf] bg-[#fffefa] p-8 shadow-[0_20px_60px_rgba(50,45,38,0.06)] sm:p-11">
          <form onSubmit={handleRegister} className="space-y-7">
            {/* Email */}
            <div>
              <label
                htmlFor="email"
                className="mb-3 block text-base font-semibold"
              >
                邮箱
              </label>

              <input
                id="email"
                type="email"
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="your@email.com"
                disabled={loading}
                className="h-16 w-full rounded-2xl border border-[#d8d1c7] bg-[#fffefa] px-5 text-base outline-none transition focus:border-[#6f655b] focus:ring-2 focus:ring-[#6f655b]/10 disabled:opacity-60"
              />
            </div>

            {/* Password */}
            <div>
              <label
                htmlFor="password"
                className="mb-3 block text-base font-semibold"
              >
                密码
              </label>

              <input
                id="password"
                type="password"
                autoComplete="new-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="至少 6 位密码"
                disabled={loading}
                className="h-16 w-full rounded-2xl border border-[#d8d1c7] bg-[#fffefa] px-5 text-base outline-none transition focus:border-[#6f655b] focus:ring-2 focus:ring-[#6f655b]/10 disabled:opacity-60"
              />
            </div>

            {/* Confirm password */}
            <div>
              <label
                htmlFor="confirmPassword"
                className="mb-3 block text-base font-semibold"
              >
                确认密码
              </label>

              <input
                id="confirmPassword"
                type="password"
                autoComplete="new-password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="再次输入密码"
                disabled={loading}
                className="h-16 w-full rounded-2xl border border-[#d8d1c7] bg-[#fffefa] px-5 text-base outline-none transition focus:border-[#6f655b] focus:ring-2 focus:ring-[#6f655b]/10 disabled:opacity-60"
              />
            </div>

            {/* Error */}
            {error && (
              <div className="rounded-2xl bg-[#f1ebe5] px-5 py-4 text-sm leading-7 text-[#81584d]">
                {error}
              </div>
            )}

            {/* Success */}
            {message && (
              <div className="rounded-2xl bg-[#edf0e9] px-5 py-4 text-sm leading-7 text-[#52604c]">
                {message}
              </div>
            )}

            {/* Submit */}
            <button
              type="submit"
              disabled={loading}
              className="h-16 w-full rounded-full bg-[#292723] text-lg font-semibold text-white transition hover:bg-[#403b35] disabled:cursor-not-allowed disabled:opacity-60"
            >
              {loading ? "正在创建账号……" : "创建账号"}
            </button>
          </form>

          {/* Login */}
          <div className="mt-8 text-center text-[#81776b]">
            已有账号？{" "}
            <Link
              href="/login"
              className="font-semibold text-[#292723] underline underline-offset-4"
            >
              登录
            </Link>
          </div>
        </section>

        {/* Back */}
        <div className="mt-8 text-center">
          <Link
            href="/"
            className="text-[#81776b] transition hover:text-[#292723]"
          >
            ← 返回首页
          </Link>
        </div>
      </div>
    </main>
  );
}