export default function StoryLoading() {
  return (
    <div
      className="min-h-screen animate-pulse"
      style={{
        background: "var(--story-bg-top)",
      }}
    >
      <section className="relative">
        <div
          className="absolute left-2 top-2 h-10 w-12 rounded"
          style={{ background: "var(--story-border)" }}
        />

        <div className="mx-auto w-full max-w-[1280px] px-6 md:px-8 lg:px-12">
          <div className="w-full pb-10 pt-20 md:pb-12 md:pt-24">
            <div
              className="mb-8 border-b pb-6"
              style={{ borderColor: "var(--story-border)" }}
            >
              <div
                className="h-12 w-3/4 rounded"
                style={{ background: "var(--story-border)" }}
              />
              <div
                className="mt-3 h-3 w-72 rounded"
                style={{ background: "var(--story-border)" }}
              />
            </div>

            <div
              className="mb-10 h-16 w-full rounded"
              style={{ background: "var(--story-border)" }}
            />

            <div className="space-y-3">
              <div
                className="h-4 w-full rounded"
                style={{ background: "var(--story-border)" }}
              />
              <div
                className="h-4 w-11/12 rounded"
                style={{ background: "var(--story-border)" }}
              />
              <div
                className="h-4 w-10/12 rounded"
                style={{ background: "var(--story-border)" }}
              />
              <div
                className="h-4 w-full rounded"
                style={{ background: "var(--story-border)" }}
              />
              <div
                className="h-4 w-9/12 rounded"
                style={{ background: "var(--story-border)" }}
              />
            </div>
          </div>
        </div>

        <div className="mx-auto w-full max-w-[1280px] px-6 pb-3 md:px-8 lg:px-12">
          <div className="relative min-h-[460px] md:min-h-[700px]">
            <div
              className="absolute left-[8%] top-[40%] h-[38%] w-[36%] rounded border"
              style={{
                background: "var(--page-surface)",
                borderColor: "var(--story-border)",
              }}
            />
            <div
              className="absolute left-[61%] top-[28%] h-[24%] w-[33%] rounded border"
              style={{
                background: "var(--page-surface)",
                borderColor: "var(--story-border)",
              }}
            />
            <div
              className="absolute left-[64%] top-[70%] h-[24%] w-[31%] rounded border"
              style={{
                background: "var(--page-surface)",
                borderColor: "var(--story-border)",
              }}
            />
            <div className="absolute left-[47%] top-[24%] h-4 w-4 rounded-full bg-[var(--page-accent)]" />
          </div>
        </div>

        <div className="mx-auto mt-6 w-full max-w-[1280px] px-6 pb-6 pt-8 md:px-8 lg:px-12">
          <div className="flex items-center gap-6">
            <div
              className="h-4 w-40 rounded"
              style={{ background: "var(--story-border)" }}
            />
            <div
              className="h-3 w-48 rounded"
              style={{ background: "var(--story-border)" }}
            />
          </div>
        </div>

        <div
          className="pointer-events-none fixed inset-x-0 z-40"
          style={{ bottom: "max(env(safe-area-inset-bottom), 0px)" }}
        >
          <div
            style={{
              paddingLeft: "max(env(safe-area-inset-left), 0px)",
              paddingRight: "max(env(safe-area-inset-right), 0px)",
            }}
          >
            <div className="flex items-end justify-between px-3 pb-3 md:px-4 md:pb-4">
              <div
                className="h-11 w-28 rounded"
                style={{ background: "var(--story-border)" }}
              />
              <div
                className="ml-auto h-8 w-36 rounded"
                style={{ background: "var(--story-border)" }}
              />
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
