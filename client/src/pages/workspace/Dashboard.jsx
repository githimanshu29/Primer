import { useEffect, useRef, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useNavigate, useLocation } from "react-router-dom";
import {
  getUserCoursesApi,
  getPreviewCoursesApi,
  deleteCourseApi,
  enrollCourseApi,
} from "../../lib/api.js";
import WelcomeBanner from "./_components/WelcomeBanner.jsx";
import CourseCard from "./_components/CourseCard.jsx";
import SkeletonCard from "./_components/SkeletonCard.jsx";
import CreateCourseDialog from "./_components/CreateCourseDialog.jsx";
import { useUserProfile } from "../../lib/useUserProfile.js";

const Dashboard = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const previewRef = useRef(null);
  const queryClient = useQueryClient();
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  const { data: profileData } = useUserProfile();
  const isAdmin = Boolean(profileData?.user?.isAdmin);

  // ── fetch user courses (always fresh) ───────────────────────────────────
  const {
    data: coursesData,
    isLoading: coursesLoading,
    refetch: refetchCourses,
  } = useQuery({
    queryKey: ["userCourses"],
    queryFn: async () => {
      const res = await getUserCoursesApi();
      return res.data.courses;
    },
    staleTime: 0,
    refetchOnMount: "always",
  });

  // ── fetch preview courses (always fresh) ────────────────────────────────
  const { data: previewData, isLoading: previewLoading } = useQuery({
    queryKey: ["previewCourses"],
    queryFn: async () => {
      const res = await getPreviewCoursesApi();
      return res.data.courses;
    },
    staleTime: 0,
    refetchOnMount: "always",
  });

  useEffect(() => {
    if (location?.state?.scrollToPreview && previewRef.current) {
      previewRef.current.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  }, [location]);

  // ── Strictly separate Preview Courses vs My Regular Courses ─────────────
  const previewCourses = (previewData || []).filter(
    (c) => c.previewCourse === true || c.previewCourse === "true",
  );
  const myCourses = (coursesData || []).filter(
    (c) =>
      !c.previewCourse ||
      c.previewCourse === false ||
      c.previewCourse === "false",
  );

  // ── handlers ────────────────────────────────────────────────────────────
  const handleDeleteCourse = async (courseId, isPreview = false) => {
    if (isPreview) {
      // Optimistic delete for Preview Course in UI
      queryClient.setQueryData(["previewCourses"], (prev) =>
        (prev || []).filter(
          (course) => course.cid !== courseId && course._id !== courseId,
        ),
      );
      try {
        await deleteCourseApi(courseId);
        queryClient.invalidateQueries({ queryKey: ["previewCourses"] });
      } catch (err) {
        console.error("Delete preview course error:", err);
        queryClient.invalidateQueries({ queryKey: ["previewCourses"] });
      }
      return;
    }

    queryClient.setQueryData(["userCourses"], (prev) =>
      (prev || []).filter(
        (course) => course.cid !== courseId && course._id !== courseId,
      ),
    );
    try {
      await deleteCourseApi(courseId);
      queryClient.invalidateQueries({ queryKey: ["userCourses"] });
    } catch (err) {
      console.error("Delete course error:", err);
      refetchCourses();
    }
  };

  const handleEnroll = async (courseId) => {
    try {
      await enrollCourseApi(courseId);
      queryClient.invalidateQueries({ queryKey: ["enrolledCourses"] });
      refetchCourses();
    } catch (err) {
      console.error("Enroll error:", err);
    }
  };

  const handleGenerateContent = (courseId) => {
    navigate(`/workspace/edit-course/${courseId}`);
  };

  const handleContinueBuilding = (courseId) => {
    navigate(`/workspace/step-build/${courseId}`);
  };

  return (
    <div style={{ fontFamily: "'Inter', sans-serif" }}>
      {/* welcome banner */}
      <WelcomeBanner />

      {/* ── 1. Preview Courses section (Strictly preview courses only) ── */}
      {(previewLoading || previewCourses.length > 0) && (
        <div ref={previewRef} style={{ marginBottom: "40px" }}>
          <div style={{ marginBottom: "16px" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
              <h2
                style={{ color: "#fbbf24", fontSize: "20px", fontWeight: "700" }}
              >
                Preview Courses
              </h2>
              <span
                style={{
                  fontSize: "11px",
                  padding: "2px 8px",
                  borderRadius: "20px",
                  background: "rgba(251,191,36,0.12)",
                  color: "#fbbf24",
                  border: "1px solid rgba(251,191,36,0.25)",
                  fontWeight: "600",
                }}
              >
                Public Demos
              </span>
            </div>
            <p style={{ color: "#9ca3af", fontSize: "13px", marginTop: "4px" }}>
              API credit exhausted? Explore pre-generated preview courses or manage them below.
            </p>
          </div>

          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))",
              gap: "16px",
            }}
          >
            {previewLoading
              ? [...Array(3)].map((_, i) => <SkeletonCard key={i} />)
              : previewCourses.map((course, i) => (
                  <CourseCard
                    key={`preview-${course.cid || course._id || i}`}
                    course={course}
                    onDelete={handleDeleteCourse}
                    onEnroll={handleEnroll}
                    onGenerateContent={handleGenerateContent}
                    onContinueBuilding={handleContinueBuilding}
                    isAdmin={isAdmin}
                  />
                ))}
          </div>
        </div>
      )}

      {/* ── 2. My Courses section (Strictly non-preview courses) ── */}
      <div>
        {/* section header */}
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            marginBottom: "16px",
          }}
        >
          <div>
            <h2 style={{ color: "white", fontSize: "20px", fontWeight: "700" }}>
              My Courses
            </h2>
            <p style={{ color: "#6b7280", fontSize: "13px", marginTop: "4px" }}>
              Manage and explore your learning materials
            </p>
          </div>

          {/* new course button */}
          <button
            onClick={() => setIsDialogOpen(true)}
            style={{
              padding: "9px 16px",
              borderRadius: "10px",
              background: "linear-gradient(135deg, #7c3aed, #6d28d9)",
              border: "none",
              color: "white",
              fontSize: "13px",
              fontWeight: "600",
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              gap: "6px",
              boxShadow: "0 4px 15px rgba(124,58,237,0.3)",
              transition: "opacity 0.2s",
            }}
            onMouseEnter={(e) => (e.currentTarget.style.opacity = "0.85")}
            onMouseLeave={(e) => (e.currentTarget.style.opacity = "1")}
          >
            <svg
              width="14"
              height="14"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth="2.5"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M12 4v16m8-8H4"
              />
            </svg>
            New Course
          </button>
        </div>

        {/* loading state */}
        {coursesLoading && (
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))",
              gap: "16px",
            }}
          >
            {[...Array(4)].map((_, i) => (
              <SkeletonCard key={i} />
            ))}
          </div>
        )}

        {/* empty state */}
        {!coursesLoading && myCourses.length === 0 && (
          <div
            style={{
              textAlign: "center",
              padding: "60px 20px",
              background: "rgba(255,255,255,0.02)",
              border: "1px dashed rgba(255,255,255,0.08)",
              borderRadius: "16px",
            }}
          >
            <div style={{ fontSize: "48px", marginBottom: "16px" }}>📚</div>
            <h3
              style={{
                color: "white",
                fontSize: "18px",
                fontWeight: "600",
                marginBottom: "8px",
              }}
            >
              No courses yet
            </h3>
            <p
              style={{
                color: "#6b7280",
                fontSize: "14px",
                marginBottom: "20px",
              }}
            >
              Create your first AI-powered course to get started
            </p>
            <button
              onClick={() => setIsDialogOpen(true)}
              style={{
                padding: "10px 24px",
                borderRadius: "10px",
                background: "linear-gradient(135deg, #7c3aed, #6d28d9)",
                border: "none",
                color: "white",
                fontSize: "14px",
                fontWeight: "600",
                cursor: "pointer",
              }}
            >
              + Create Course
            </button>
          </div>
        )}

        {/* courses grid — only non-preview courses */}
        {!coursesLoading && myCourses.length > 0 && (
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))",
              gap: "16px",
            }}
          >
            {myCourses.map((course, i) => (
              <CourseCard
                key={course.cid || course._id || i}
                course={course}
                onDelete={handleDeleteCourse}
                onEnroll={handleEnroll}
                onGenerateContent={handleGenerateContent}
                onContinueBuilding={handleContinueBuilding}
                isAdmin={isAdmin}
              />
            ))}
          </div>
        )}
      </div>

      {/* create course dialog */}
      <CreateCourseDialog
        isOpen={isDialogOpen}
        onClose={() => setIsDialogOpen(false)}
        onSuccess={() => {
          setIsDialogOpen(false);
          refetchCourses();
        }}
      />
    </div>
  );
};

export default Dashboard;
