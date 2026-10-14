import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { getEnrolledCoursesApi } from "../../lib/api.js";
import EnrolledCourseCard from "./_components/EnrolledCourseCard.jsx";
import SkeletonCard from "./_components/SkeletonCard.jsx";

const ContinueLearning = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  // ── Fetch enrolled courses (always fresh) ───────────────────────────────────
  const {
    data: enrolledData,
    isLoading: enrolledLoading,
    refetch: refetchEnrolled,
  } = useQuery({
    queryKey: ["enrolledCourses"],
    queryFn: async () => {
      const res = await getEnrolledCoursesApi();
      return res.data.courses;
    },
    staleTime: 0,
    refetchOnMount: "always",
  });

  return (
    <div style={{ fontFamily: "'Inter', sans-serif", maxWidth: "1280px", margin: "0 auto" }}>
      {/* ── Page Header Banner ── */}
      <div
        style={{
          background: "linear-gradient(135deg, rgba(124,58,237,0.18) 0%, rgba(15,23,42,0.6) 100%)",
          border: "1px solid rgba(124,58,237,0.3)",
          borderRadius: "20px",
          padding: "32px",
          marginBottom: "32px",
          position: "relative",
          overflow: "hidden",
          boxShadow: "0 10px 30px rgba(0,0,0,0.3)",
        }}
      >
        <div style={{ position: "relative", zIndex: 1 }}>
          <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "8px" }}>
            <span style={{ fontSize: "24px" }}>🎯</span>
            <h1
              style={{
                color: "white",
                fontSize: "26px",
                fontWeight: "700",
                letterSpacing: "-0.5px",
                margin: 0,
              }}
            >
              Continue Learning
            </h1>
            {enrolledData && enrolledData.length > 0 && (
              <span
                style={{
                  fontSize: "12px",
                  padding: "3px 10px",
                  borderRadius: "20px",
                  background: "rgba(124,58,237,0.3)",
                  color: "#c4b5fd",
                  fontWeight: "700",
                  border: "1px solid rgba(124,58,237,0.4)",
                }}
              >
                {enrolledData.length} {enrolledData.length === 1 ? "Course" : "Courses"}
              </span>
            )}
          </div>
          <p style={{ color: "#9ca3af", fontSize: "14px", margin: 0, maxWidth: "600px" }}>
            Pick up right where you left off. Access your study rooms, complete your chapters, and take chapter quizzes to test your mastery.
          </p>
        </div>
      </div>

      {/* ── Loading Skeleton State ── */}
      {enrolledLoading && (
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))",
            gap: "20px",
          }}
        >
          {[...Array(3)].map((_, i) => (
            <SkeletonCard key={i} />
          ))}
        </div>
      )}

      {/* ── Empty State ── */}
      {!enrolledLoading && (!enrolledData || enrolledData.length === 0) && (
        <div
          style={{
            textAlign: "center",
            padding: "80px 24px",
            background: "rgba(255,255,255,0.02)",
            border: "1px dashed rgba(255,255,255,0.08)",
            borderRadius: "20px",
          }}
        >
          <div style={{ fontSize: "52px", marginBottom: "16px" }}>🎓</div>
          <h2
            style={{
              color: "white",
              fontSize: "20px",
              fontWeight: "700",
              marginBottom: "8px",
            }}
          >
            No enrolled courses yet
          </h2>
          <p
            style={{
              color: "#6b7280",
              fontSize: "14px",
              maxWidth: "440px",
              margin: "0 auto 24px auto",
              lineHeight: "1.6",
            }}
          >
            You haven't enrolled in any courses yet. Browse your dashboard or check out the preview courses to start learning!
          </p>
          <button
            onClick={() => navigate("/workspace")}
            style={{
              padding: "11px 24px",
              borderRadius: "12px",
              background: "linear-gradient(135deg, #7c3aed, #6d28d9)",
              border: "none",
              color: "white",
              fontSize: "14px",
              fontWeight: "600",
              cursor: "pointer",
              boxShadow: "0 4px 15px rgba(124,58,237,0.3)",
              transition: "opacity 0.2s",
            }}
            onMouseEnter={(e) => (e.currentTarget.style.opacity = "0.9")}
            onMouseLeave={(e) => (e.currentTarget.style.opacity = "1")}
          >
            Explore Courses on Dashboard
          </button>
        </div>
      )}

      {/* ── Enrolled Courses Grid ── */}
      {!enrolledLoading && enrolledData && enrolledData.length > 0 && (
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))",
            gap: "20px",
          }}
        >
          {enrolledData.map((item, i) => (
            <EnrolledCourseCard
              key={item.enrollment?._id || i}
              item={item}
            />
          ))}
        </div>
      )}
    </div>
  );
};

export default ContinueLearning;
