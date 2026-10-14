import { useNavigate } from "react-router-dom";

const CourseCard = ({
  course,
  onDelete,
  onEnroll,
  onGenerateContent,
  onContinueBuilding,
  isAdmin = false,
}) => {
  const navigate = useNavigate();
  const isReady = course.status === "READY";
  const isBuilding = course.status === "BUILDING";
  const isPreview = Boolean(course.previewCourse);
  const courseIdentifier = course.cid || course._id;

  return (
    <div
      className="course-card-uniform"
      style={{
        background: isPreview
          ? "linear-gradient(160deg, rgba(251,146,60,0.12), rgba(15,23,42,0.95))"
          : "rgba(255,255,255,0.03)",
        border: isPreview
          ? "1px solid rgba(251,146,60,0.35)"
          : "1px solid rgba(255,255,255,0.08)",
        borderRadius: "16px",
        padding: "20px",
        display: "flex",
        flexDirection: "column",
        gap: "12px",
        transition: "all 0.3s cubic-bezier(.25,.8,.25,1)",
        height: "100%",
        minHeight: "280px",
        position: "relative",
        overflow: "hidden",
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.borderColor = isPreview
          ? "rgba(251,146,60,0.55)"
          : "rgba(124,58,237,0.35)";
        e.currentTarget.style.transform = "translateY(-3px)";
        e.currentTarget.style.boxShadow = isPreview
          ? "0 12px 32px rgba(251,146,60,0.18)"
          : "0 12px 32px rgba(124,58,237,0.12)";
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.borderColor = isPreview
          ? "rgba(251,146,60,0.35)"
          : "rgba(255,255,255,0.08)";
        e.currentTarget.style.transform = "translateY(0)";
        e.currentTarget.style.boxShadow = "none";
      }}
    >
      {/* top row — badge + icon */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
        }}
      >
        <span
          style={{
            padding: "4px 10px",
            borderRadius: "20px",
            fontSize: "11px",
            fontWeight: "600",
            background: isPreview
              ? "rgba(251,146,60,0.15)"
              : isReady
                ? "rgba(34,197,94,0.1)"
                : isBuilding
                  ? "rgba(124,58,237,0.1)"
                  : "rgba(234,179,8,0.1)",
            color: isPreview
              ? "#fdba74"
              : isReady
                ? "#4ade80"
                : isBuilding
                  ? "#a78bfa"
                  : "#facc15",
            border: `1px solid ${
              isPreview
                ? "rgba(251,146,60,0.35)"
                : isReady
                  ? "rgba(34,197,94,0.2)"
                  : isBuilding
                    ? "rgba(124,58,237,0.2)"
                    : "rgba(234,179,8,0.2)"
            }`,
            letterSpacing: "0.5px",
          }}
        >
          {isPreview
            ? "PREVIEW"
            : isReady
              ? "READY"
              : isBuilding
                ? "BUILDING"
                : "SETUP REQUIRED"}
        </span>

        <div
          style={{
            width: "36px",
            height: "36px",
            borderRadius: "50%",
            background: isPreview
              ? "linear-gradient(135deg, #fb923c, #f97316)"
              : "linear-gradient(135deg, #7c3aed, #6d28d9)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: "16px",
          }}
        >
          {isPreview ? "👁" : "🤖"}
        </div>
      </div>

      {/* title — fixed 2 lines */}
      <h3
        style={{
          color: "white",
          fontSize: "15px",
          fontWeight: "600",
          lineHeight: "1.4",
          minHeight: "42px",
          display: "-webkit-box",
          WebkitLineClamp: 2,
          WebkitBoxOrient: "vertical",
          overflow: "hidden",
        }}
      >
        {course.name}
      </h3>

      {/* description — exactly 2 lines */}
      <p
        style={{
          color: "#6b7280",
          fontSize: "12px",
          lineHeight: "1.5",
          display: "-webkit-box",
          WebkitLineClamp: 2,
          WebkitBoxOrient: "vertical",
          overflow: "hidden",
          minHeight: "36px",
        }}
      >
        {course.description}
      </p>

      {isPreview && (
        <div
          style={{
            padding: "8px 10px",
            borderRadius: "10px",
            background: "rgba(251,146,60,0.12)",
            border: "1px solid rgba(251,146,60,0.25)",
            color: "#fbbf24",
            fontSize: "11px",
            lineHeight: "1.4",
          }}
        >
          API credit gone? Use this course for preview.
        </div>
      )}

      {/* chapters count + progress for building courses */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: "6px",
          color: "#6b7280",
        }}
      >
        <svg
          width="14"
          height="14"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth="2"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.746 0 3.332.477 4.5 1.253v13C19.832 18.477 18.246 18 16.5 18c-1.746 0-3.332.477-4.5 1.253"
          />
        </svg>
        <span style={{ fontSize: "12px" }}>
          {isBuilding
            ? `${course.chaptersBuilt || 0}/${course.noOfChapters} Chapters built`
            : `${course.noOfChapters} Chapters`}
        </span>
      </div>

      {/* progress bar for building courses */}
      {isBuilding && (
        <div
          style={{
            width: "100%",
            height: "3px",
            background: "rgba(255,255,255,0.08)",
            borderRadius: "2px",
            overflow: "hidden",
          }}
        >
          <div
            style={{
              height: "100%",
              width: `${((course.chaptersBuilt || 0) / course.noOfChapters) * 100}%`,
              background: "linear-gradient(90deg, #7c3aed, #a78bfa)",
              borderRadius: "2px",
              transition: "width 0.5s ease",
            }}
          />
        </div>
      )}

      {/* spacer to push buttons to bottom */}
      <div style={{ flex: 1 }} />

      {/* action buttons — always pinned at bottom */}
      <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
        {isPreview ? (
          <>
            {/* ── 1. PREVIEW COURSE: Explore Course (No enroll allowed) ── */}
            <button
              onClick={() => navigate(`/workspace/view-course/${courseIdentifier}`)}
              style={{
                width: "100%",
                padding: "10px",
                borderRadius: "10px",
                background: "linear-gradient(135deg, #f59e0b, #d97706)",
                border: "none",
                color: "white",
                fontSize: "13px",
                fontWeight: "600",
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: "6px",
                boxShadow: "0 4px 14px rgba(245,158,11,0.3)",
                transition: "all 0.2s",
              }}
              onMouseEnter={(e) => (e.currentTarget.style.opacity = "0.9")}
              onMouseLeave={(e) => (e.currentTarget.style.opacity = "1")}
            >
              👁 Explore Course
            </button>

            {/* Continue building preview course: ADMIN ONLY */}
            {isAdmin && (
              <button
                onClick={() => onContinueBuilding(courseIdentifier)}
                style={{
                  width: "100%",
                  padding: "9px",
                  borderRadius: "10px",
                  background: "rgba(251,146,60,0.14)",
                  border: "1px solid rgba(251,146,60,0.35)",
                  color: "#fdba74",
                  fontSize: "12px",
                  fontWeight: "600",
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: "6px",
                  transition: "all 0.2s",
                }}
                onMouseEnter={(e) =>
                  (e.currentTarget.style.background = "rgba(251,146,60,0.24)")
                }
                onMouseLeave={(e) =>
                  (e.currentTarget.style.background = "rgba(251,146,60,0.14)")
                }
              >
                ⚡ Continue Building (Admin)
              </button>
            )}

            {/* Delete preview course: ADMIN ONLY */}
            {isAdmin && (
              <button
                onClick={() => onDelete(courseIdentifier, true)}
                style={{
                  width: "100%",
                  padding: "8px",
                  background: "rgba(239,68,68,0.06)",
                  border: "1px solid rgba(239,68,68,0.25)",
                  borderRadius: "8px",
                  color: "#f87171",
                  fontSize: "12px",
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: "6px",
                  transition: "all 0.2s",
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = "rgba(239,68,68,0.14)";
                  e.currentTarget.style.borderColor = "rgba(248,113,113,0.5)";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = "rgba(239,68,68,0.06)";
                  e.currentTarget.style.borderColor = "rgba(239,68,68,0.25)";
                }}
              >
                <svg
                  width="13"
                  height="13"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth="2"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                  />
                </svg>
                Delete Preview Course (Admin)
              </button>
            )}
          </>
        ) : (
          <>
            {/* ── 2. MY COURSES: Regular enroll & building buttons ── */}
            {isReady ? (
              <button
                onClick={() => onEnroll(courseIdentifier)}
                style={{
                  width: "100%",
                  padding: "10px",
                  borderRadius: "10px",
                  background: "linear-gradient(135deg, #7c3aed, #6d28d9)",
                  border: "none",
                  color: "white",
                  fontSize: "13px",
                  fontWeight: "600",
                  cursor: "pointer",
                  transition: "all 0.2s",
                }}
                onMouseEnter={(e) => (e.currentTarget.style.opacity = "0.85")}
                onMouseLeave={(e) => (e.currentTarget.style.opacity = "1")}
              >
                ⊕ Enroll
              </button>
            ) : isBuilding ? (
              <>
                {(course.chaptersBuilt || 0) > 0 && (
                  <button
                    onClick={() => onEnroll(courseIdentifier)}
                    style={{
                      width: "100%",
                      padding: "10px",
                      borderRadius: "10px",
                      background: "linear-gradient(135deg, #7c3aed, #6d28d9)",
                      border: "none",
                      color: "white",
                      fontSize: "13px",
                      fontWeight: "600",
                      cursor: "pointer",
                      transition: "all 0.2s",
                    }}
                    onMouseEnter={(e) => (e.currentTarget.style.opacity = "0.85")}
                    onMouseLeave={(e) => (e.currentTarget.style.opacity = "1")}
                  >
                    ⊕ Enroll & Study So Far
                  </button>
                )}
                <button
                  onClick={() => onContinueBuilding(courseIdentifier)}
                  style={{
                    width: "100%",
                    padding: "10px",
                    borderRadius: "10px",
                    background: "rgba(124,58,237,0.15)",
                    border: "1px solid rgba(124,58,237,0.4)",
                    color: "#a78bfa",
                    fontSize: "13px",
                    fontWeight: "600",
                    cursor: "pointer",
                    transition: "all 0.2s",
                  }}
                  onMouseEnter={(e) =>
                    (e.currentTarget.style.background = "rgba(124,58,237,0.25)")
                  }
                  onMouseLeave={(e) =>
                    (e.currentTarget.style.background = "rgba(124,58,237,0.15)")
                  }
                >
                  ⚡ Continue Building
                </button>
              </>
            ) : (
              <button
                onClick={() => onGenerateContent(courseIdentifier)}
                style={{
                  width: "100%",
                  padding: "10px",
                  borderRadius: "10px",
                  background: "rgba(124,58,237,0.15)",
                  border: "1px solid rgba(124,58,237,0.3)",
                  color: "#a78bfa",
                  fontSize: "13px",
                  fontWeight: "600",
                  cursor: "pointer",
                  transition: "all 0.2s",
                }}
                onMouseEnter={(e) =>
                  (e.currentTarget.style.background = "rgba(124,58,237,0.25)")
                }
                onMouseLeave={(e) =>
                  (e.currentTarget.style.background = "rgba(124,58,237,0.15)")
                }
              >
                ⚙ Generate Content
              </button>
            )}

            {/* Always available to delete your own course in My Courses */}
            <button
              onClick={() => onDelete(courseIdentifier, false)}
              style={{
                width: "100%",
                padding: "8px",
                background: "transparent",
                border: "none",
                borderRadius: "0",
                color: "#6b7280",
                fontSize: "12px",
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: "6px",
                transition: "all 0.2s",
              }}
              onMouseEnter={(e) => (e.currentTarget.style.color = "#f87171")}
              onMouseLeave={(e) => (e.currentTarget.style.color = "#6b7280")}
            >
              <svg
                width="13"
                height="13"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth="2"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                />
              </svg>
              Delete Course
            </button>
          </>
        )}
      </div>
    </div>
  );
};

export default CourseCard;
