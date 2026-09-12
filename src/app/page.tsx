export default function Home() {
  return (
    <main className="min-h-screen bg-[#F7F4EE] text-[#2C2926]">
      {/* 顶部导航 */}
      <header className="mx-auto flex w-full max-w-6xl items-center justify-between px-6 py-7 md:px-10">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-full bg-[#2C2926] text-sm font-medium text-[#F7F4EE]">
            伏
          </div>

          <span className="text-lg font-semibold tracking-[0.12em]">
            伏笔管理器
          </span>
        </div>

        <a
          href="/login"
          className="rounded-full border border-[#D8D2C8] px-5 py-2.5 text-sm transition hover:bg-white"
        >
          登录
        </a>
      </header>

      {/* Hero */}
      <section className="mx-auto flex min-h-[calc(100vh-88px)] w-full max-w-6xl items-center px-6 pb-20 pt-10 md:px-10 md:pt-0">
        <div className="grid w-full gap-16 md:grid-cols-[1.05fr_0.95fr] md:items-center">
          
          {/* 左侧文字 */}
          <div>
            <p className="mb-7 text-sm tracking-[0.28em] text-[#8B8175]">
              FOR WRITERS · STORY · MEMORY
            </p>

            <h1 className="max-w-2xl font-serif text-5xl leading-[1.15] tracking-tight md:text-7xl">
              把埋下的每一个秘密，
              <br />
              都记得在故事里收回来。
            </h1>

            <p className="mt-8 max-w-xl text-base leading-8 text-[#716A62] md:text-lg">
              记录伏笔，追踪线索，连接人物与章节。
              <br />
              让你的故事写得再长，也不会忘记自己曾经埋下什么。
            </p>

            <div className="mt-10 flex flex-wrap gap-4">
              <a
                href="/register"
                className="rounded-full bg-[#2C2926] px-7 py-3.5 text-sm font-medium text-white transition hover:bg-[#46413C]"
              >
                开始记录
              </a>

              <a
                href="/login"
                className="rounded-full border border-[#CFC8BE] bg-transparent px-7 py-3.5 text-sm font-medium transition hover:bg-white"
              >
                登录
              </a>
            </div>

            <div className="mt-12 flex gap-8 text-sm text-[#8B8175]">
              <span>记录伏笔</span>
              <span>连接人物</span>
              <span>管理章节</span>
            </div>
          </div>

          {/* 右侧示意卡片 */}
          <div className="relative hidden md:block">
            <div className="relative mx-auto max-w-md rotate-[1.5deg] rounded-[28px] border border-[#DED8CF] bg-[#FFFDF9] p-7 shadow-[0_25px_70px_rgba(70,60,50,0.08)]">
              
              <div className="flex items-center justify-between border-b border-[#E8E2D9] pb-5">
                <div>
                  <p className="text-xs tracking-[0.2em] text-[#9A9186]">
                    CURRENT STORY
                  </p>
                  <h2 className="mt-2 font-serif text-2xl">
                    《我们都没有说出口》
                  </h2>
                </div>

                <span className="rounded-full bg-[#F0EAE1] px-3 py-1 text-xs text-[#746B61]">
                  写作中
                </span>
              </div>

              <div className="space-y-4 py-6">
                <div className="rounded-2xl border border-[#E6E0D7] bg-[#FBF9F5] p-5">
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-[#9A9186]">
                      关键伏笔
                    </span>

                    <span className="text-xs text-[#8B4A42]">
                      回收中
                    </span>
                  </div>

                  <h3 className="mt-3 font-serif text-xl">
                    雨伞上的名字
                  </h3>

                  <p className="mt-2 text-sm leading-6 text-[#777067]">
                    第 3 章埋下 · 计划第 27 章回收
                  </p>

                  <div className="mt-4 flex gap-2">
                    <span className="rounded-full bg-[#EEE8DE] px-2.5 py-1 text-xs">
                      #身份
                    </span>
                    <span className="rounded-full bg-[#EEE8DE] px-2.5 py-1 text-xs">
                      #雨伞
                    </span>
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-3">
                  <div className="rounded-2xl bg-[#F3EFE8] p-4">
                    <p className="text-xs text-[#9A9186]">伏笔</p>
                    <p className="mt-2 text-2xl font-semibold">23</p>
                  </div>

                  <div className="rounded-2xl bg-[#F3EFE8] p-4">
                    <p className="text-xs text-[#9A9186]">人物</p>
                    <p className="mt-2 text-2xl font-semibold">14</p>
                  </div>

                  <div className="rounded-2xl bg-[#F3EFE8] p-4">
                    <p className="text-xs text-[#9A9186]">章节</p>
                    <p className="mt-2 text-2xl font-semibold">32</p>
                  </div>
                </div>
              </div>

              <div className="border-t border-[#E8E2D9] pt-5">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-[#8B8175]">
                    ⚠ 3 个伏笔需要注意
                  </span>

                  <span className="text-xs text-[#9A9186]">
                    查看 →
                  </span>
                </div>
              </div>
            </div>

            {/* 后面的纸张 */}
            <div className="absolute -bottom-5 -left-5 -z-10 h-full w-full rotate-[-3deg] rounded-[28px] border border-[#E5DED4] bg-[#EFEAE2]" />
          </div>
        </div>
      </section>
    </main>
  );
}