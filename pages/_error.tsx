import type { NextPageContext } from "next";

interface ErrorPageProps {
  statusCode?: number;
}

export default function ErrorPage({ statusCode = 500 }: ErrorPageProps) {
  return (
    <main
      style={{
        minHeight: "100vh",
        display: "grid",
        placeItems: "center",
        padding: 24,
        fontFamily:
          'ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
      }}
    >
      <div style={{ maxWidth: 420, textAlign: "center" }}>
        <h1 style={{ margin: 0, fontSize: 24, fontWeight: 650 }}>
          {statusCode === 404 ? "Page not found" : "Something went wrong"}
        </h1>
        <p style={{ color: "#71717a", fontSize: 14, lineHeight: 1.6 }}>
          Kira could not render this route. Return to the daily briefing or try
          again.
        </p>
      </div>
    </main>
  );
}

ErrorPage.getInitialProps = ({ res, err }: NextPageContext): ErrorPageProps => {
  const statusCode = res?.statusCode ?? err?.statusCode ?? 404;
  return { statusCode };
};
