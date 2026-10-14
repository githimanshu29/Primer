import { useState, useEffect, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { useSelector, useDispatch } from "react-redux";
import {
  setDefaultProvider,
  setProviderModel,
} from "../../store/slices/aiSlice.js";
import { GROQ_MODELS_META, GEMINI_MODELS_META } from "../../lib/models.js";
import {
  getUserProfileApi,
  updateUserProfileApi,
  updateApiKeysApi,
  testApiKeyApi,
  uploadAvatarApi,
  getPreviewCoursesApi,
  deleteCourseApi,
} from "../../lib/api.js";
import SkeletonCard from "./_components/SkeletonCard.jsx";

const AVATAR_OPTIONS = [
  "https://api.dicebear.com/7.x/bottts/svg?seed=learnova1",
  "https://api.dicebear.com/7.x/bottts/svg?seed=learnova2",
  "https://api.dicebear.com/7.x/bottts/svg?seed=learnova3",
  "https://api.dicebear.com/7.x/bottts/svg?seed=learnova4",
  "https://api.dicebear.com/7.x/bottts/svg?seed=learnova5",
];

const Profile = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const dispatch = useDispatch();

  // ── Redux AI Provider & Model State ────────────────────────────────────
  const { defaultProvider, defaultModel, geminiModel, groqModel } = useSelector(
    (state) => state.ai
  );

  // ── States ─────────────────────────────────────────────────────────────
  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [profileForm, setProfileForm] = useState({ name: "", gender: "other", avatar: "" });
  
  // API Keys Form
  const [groqKeyInput, setGroqKeyInput] = useState("");
  const [geminiKeyInput, setGeminiKeyInput] = useState("");
  const [showGroqKey, setShowGroqKey] = useState(false);
  const [showGeminiKey, setShowGeminiKey] = useState(false);

  // Key Test Feedback States
  const [testingGroq, setTestingGroq] = useState(false);
  const [testingGemini, setTestingGemini] = useState(false);
  const [groqTestResult, setGroqTestResult] = useState(null); // { success, message }
  const [geminiTestResult, setGeminiTestResult] = useState(null);

  // Global banner notification
  const [feedbackMsg, setFeedbackMsg] = useState(null);

  // Avatar Upload States
  const fileInputRef = useRef(null);
  const [isUploadingAvatar, setIsUploadingAvatar] = useState(false);
  const [deletingCourseId, setDeletingCourseId] = useState(null);

  // ── Upload Avatar to Cloudinary ────────────────────────────────────────
  const handleFileSelect = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      showToast("Please select an image file (JPG, PNG, WebP, etc.)", "error");
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      showToast("Image size must be less than 5MB", "error");
      return;
    }

    const reader = new FileReader();
    reader.onload = async () => {
      setIsUploadingAvatar(true);
      try {
        const res = await uploadAvatarApi(reader.result);
        showToast("Avatar successfully uploaded to Cloudinary!");
        queryClient.invalidateQueries({ queryKey: ["userProfile"] });
        setProfileForm((prev) => ({ ...prev, avatar: res.data.avatar }));
      } catch (err) {
        showToast(
          err.response?.data?.message || err.message || "Failed to upload avatar to Cloudinary",
          "error"
        );
      } finally {
        setIsUploadingAvatar(false);
        if (fileInputRef.current) fileInputRef.current.value = "";
      }
    };
    reader.readAsDataURL(file);
  };

  // ── Fetch Profile ──────────────────────────────────────────────────────
  const { data, isLoading, refetch } = useQuery({
    queryKey: ["userProfile"],
    queryFn: async () => {
      const res = await getUserProfileApi();
      return res.data;
    },
    staleTime: 0,
    refetchOnMount: "always",
  });

  useEffect(() => {
    if (data?.user) {
      setProfileForm({
        name: data.user.name || "",
        gender: data.user.gender || "other",
        avatar: data.user.avatar || "",
      });
    }
  }, [data]);

  const showToast = (message, type = "success") => {
    setFeedbackMsg({ message, type });
    setTimeout(() => setFeedbackMsg(null), 4000);
  };

  // ── Save Profile Mutation ──────────────────────────────────────────────
  const profileMutation = useMutation({
    mutationFn: updateUserProfileApi,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["userProfile"] });
      setIsEditingProfile(false);
      showToast("Profile details updated successfully!");
    },
    onError: (err) => {
      showToast(err.response?.data?.message || "Failed to update profile", "error");
    },
  });

  // ── Save API Keys Mutation (Only saves API keys to database) ───────────
  const keysMutation = useMutation({
    mutationFn: updateApiKeysApi,
    onSuccess: (res, variables) => {
      queryClient.invalidateQueries({ queryKey: ["userProfile"] });
      if (variables.groqKey !== undefined) setGroqKeyInput("");
      if (variables.geminiKey !== undefined) setGeminiKeyInput("");
      showToast(
        variables.groqKey === "" || variables.geminiKey === ""
          ? "API key removed successfully!"
          : "API key saved to your account successfully!"
      );
    },
    onError: (err) => {
      showToast(err.response?.data?.message || "Failed to save API key", "error");
    },
  });

  const handleSaveProfile = (e) => {
    e.preventDefault();
    if (!profileForm.name.trim()) return;
    profileMutation.mutate(profileForm);
  };

  const handleQuickSetDefault = (provider) => {
    dispatch(setDefaultProvider(provider));
    showToast(
      `${provider === "gemini" ? "Google Gemini" : "Groq Cloud"} is now your default AI provider across the app!`
    );
  };

  const handleRemoveKey = (provider) => {
    const payload = {};
    if (provider === "groq") payload.groqKey = "";
    if (provider === "gemini") payload.geminiKey = "";
    keysMutation.mutate(payload);
  };

  // ── Test API Key Handler (Uses active model from Redux) ─────────────────
  const handleTestKey = async (provider) => {
    const isGroq = provider === "groq";
    if (isGroq) {
      setTestingGroq(true);
      setGroqTestResult(null);
    } else {
      setTestingGemini(true);
      setGeminiTestResult(null);
    }

    try {
      const keyToTest = isGroq ? groqKeyInput.trim() : geminiKeyInput.trim();
      const modelToTest = isGroq ? groqModel : geminiModel;

      const res = await testApiKeyApi({
        provider,
        apiKey: keyToTest || undefined,
        model: modelToTest,
      });

      const result = { success: true, message: res.data.message || `Connected to ${modelToTest} successfully!` };
      if (isGroq) setGroqTestResult(result);
      else setGeminiTestResult(result);
    } catch (err) {
      const errMsg = err.response?.data?.message || err.message || "Connection failed";
      const result = { success: false, message: errMsg };
      if (isGroq) setGroqTestResult(result);
      else setGeminiTestResult(result);
    } finally {
      if (isGroq) setTestingGroq(false);
      else setTestingGemini(false);
    }
  };

  const user = data?.user || {};
  const isAdmin = Boolean(user.isAdmin || user.role === "admin");
  const stats = data?.stats || {
    coursesGenerated: 0,
    quizzesPassed: 0,
    coursesEnrolled: 0,
    completedCourses: 0,
    quizzesAttempted: 0,
    averageQuizScore: 0,
  };
  const apiKeys = data?.apiKeys || {};

  // ── Admin: Fetch preview courses for administrative management ─────────
  const { data: previewCoursesData, isLoading: isPreviewLoading } = useQuery({
    queryKey: ["previewCourses"],
    queryFn: async () => {
      const res = await getPreviewCoursesApi();
      return res.data.courses;
    },
    enabled: isAdmin,
    staleTime: 0,
    refetchOnMount: "always",
  });

  const previewCoursesList = (previewCoursesData || []).filter(
    (c) => c.previewCourse === true || c.previewCourse === "true"
  );

  const handleDeletePreviewCourse = async (course) => {
    const courseId = course.cid || course._id;
    if (
      !window.confirm(
        `Are you sure you want to permanently delete the preview course "${course.name}"?`
      )
    ) {
      return;
    }
    setDeletingCourseId(courseId);
    try {
      await deleteCourseApi(courseId);
      showToast(`Preview course "${course.name}" deleted successfully`);
      queryClient.setQueryData(["previewCourses"], (prev) =>
        (prev || []).filter((c) => (c.cid || c._id) !== courseId)
      );
      queryClient.invalidateQueries({ queryKey: ["previewCourses"] });
      queryClient.invalidateQueries({ queryKey: ["userProfile"] });
    } catch (err) {
      showToast(
        err.response?.data?.message || "Failed to delete preview course",
        "error"
      );
    } finally {
      setDeletingCourseId(null);
    }
  };

  if (isLoading) {
    return (
      <div style={{ maxWidth: "1200px", margin: "0 auto", padding: "20px" }}>
        <div style={{ height: "180px", borderRadius: "16px", background: "rgba(255,255,255,0.03)", marginBottom: "24px" }} />
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(240px, 1fr))", gap: "16px" }}>
          {[...Array(4)].map((_, i) => (
            <SkeletonCard key={i} />
          ))}
        </div>
      </div>
    );
  }

  const memberSince = user.createdAt
    ? new Date(user.createdAt).toLocaleDateString("en-US", {
        year: "numeric",
        month: "long",
        day: "numeric",
      })
    : "Recently joined";

  return (
    <div style={{ fontFamily: "'Inter', sans-serif", maxWidth: "1200px", margin: "0 auto", paddingBottom: "60px" }}>
      {/* ── Toast Notification ── */}
      {feedbackMsg && (
        <div
          style={{
            position: "fixed",
            top: "24px",
            right: "24px",
            zIndex: 9999,
            padding: "12px 20px",
            borderRadius: "12px",
            background: feedbackMsg.type === "error" ? "#dc2626" : "linear-gradient(135deg, #7c3aed, #6d28d9)",
            color: "white",
            fontSize: "14px",
            fontWeight: "600",
            boxShadow: "0 10px 25px rgba(0,0,0,0.5)",
            display: "flex",
            alignItems: "center",
            gap: "8px",
            animation: "fadeIn 0.2s ease-in-out",
          }}
        >
          <span>{feedbackMsg.type === "error" ? "⚠️" : "✨"}</span>
          <span>{feedbackMsg.message}</span>
        </div>
      )}

      {/* ── 1. User Identity Hero Card ── */}
      <div
        style={{
          background: "linear-gradient(135deg, rgba(124,58,237,0.18) 0%, rgba(15,23,42,0.8) 100%)",
          border: "1px solid rgba(124,58,237,0.3)",
          borderRadius: "20px",
          padding: "28px 32px",
          marginBottom: "28px",
          position: "relative",
          overflow: "hidden",
          boxShadow: "0 12px 36px rgba(0,0,0,0.35)",
        }}
      >
        <div
          style={{
            display: "flex",
            flexWrap: "wrap",
            alignItems: "center",
            justifyContent: "space-between",
            gap: "20px",
          }}
        >
          {/* Left Avatar & Info */}
          <div style={{ display: "flex", alignItems: "center", gap: "20px" }}>
            {/* Hidden Cloudinary File Input */}
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handleFileSelect}
              style={{ display: "none" }}
            />

            <div
              style={{
                position: "relative",
                width: "76px",
                height: "76px",
                flexShrink: 0,
              }}
            >
              <div
                style={{
                  width: "100%",
                  height: "100%",
                  borderRadius: "20px",
                  background: "linear-gradient(135deg, #7c3aed, #6d28d9)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: "28px",
                  fontWeight: "700",
                  color: "white",
                  boxShadow: "0 8px 24px rgba(124,58,237,0.45)",
                  border: "2px solid rgba(255,255,255,0.15)",
                  overflow: "hidden",
                }}
              >
                {user.avatar && user.avatar.startsWith("http") ? (
                  <img
                    src={user.avatar}
                    alt={user.name}
                    style={{ width: "100%", height: "100%", objectFit: "cover" }}
                  />
                ) : (
                  user.name?.charAt(0).toUpperCase() || "U"
                )}
              </div>

              {/* Uploading overlay indicator */}
              {isUploadingAvatar && (
                <div
                  style={{
                    position: "absolute",
                    inset: 0,
                    borderRadius: "20px",
                    background: "rgba(0,0,0,0.8)",
                    backdropFilter: "blur(2px)",
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: "4px",
                    zIndex: 10,
                  }}
                >
                  <div
                    style={{
                      width: "18px",
                      height: "18px",
                      border: "2px solid rgba(255,255,255,0.3)",
                      borderTop: "2px solid #a78bfa",
                      borderRadius: "50%",
                      animation: "spin 0.8s linear infinite",
                    }}
                  />
                  <span style={{ color: "white", fontSize: "9px", fontWeight: "600" }}>Uploading</span>
                </div>
              )}

              {/* Camera Upload Badge Button */}
              {!isUploadingAvatar && (
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  title="Upload profile photo with Cloudinary"
                  style={{
                    position: "absolute",
                    bottom: "-4px",
                    right: "-4px",
                    width: "28px",
                    height: "28px",
                    borderRadius: "50%",
                    background: "linear-gradient(135deg, #7c3aed, #6d28d9)",
                    border: "2px solid #0f172a",
                    color: "white",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    cursor: "pointer",
                    boxShadow: "0 2px 8px rgba(0,0,0,0.4)",
                    transition: "transform 0.2s",
                  }}
                  onMouseEnter={(e) => (e.currentTarget.style.transform = "scale(1.15)")}
                  onMouseLeave={(e) => (e.currentTarget.style.transform = "scale(1)")}
                >
                  <svg width="13" height="13" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                    <path strokeLinecap="round" strokeLinejoin="round" d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                </button>
              )}
            </div>

            <div>
              <div style={{ display: "flex", alignItems: "center", gap: "10px", flexWrap: "wrap" }}>
                <h1 style={{ color: "white", fontSize: "24px", fontWeight: "700", margin: 0, letterSpacing: "-0.5px" }}>
                  {user.name}
                </h1>
                <span
                  style={{
                    fontSize: "11px",
                    padding: "3px 10px",
                    borderRadius: "20px",
                    background: isAdmin
                      ? "linear-gradient(135deg, rgba(234,179,8,0.25), rgba(245,158,11,0.25))"
                      : "rgba(124,58,237,0.25)",
                    color: isAdmin ? "#fde047" : "#c4b5fd",
                    border: isAdmin
                      ? "1px solid rgba(234,179,8,0.4)"
                      : "1px solid rgba(124,58,237,0.4)",
                    fontWeight: "700",
                    display: "inline-flex",
                    alignItems: "center",
                    gap: "4px",
                  }}
                >
                  {isAdmin ? "👑 Platform Administrator" : "Pro Creator & Learner"}
                </span>
              </div>
              <p style={{ color: "#9ca3af", fontSize: "14px", margin: "4px 0 0 0" }}>
                {user.email}
              </p>
              <p style={{ color: "#6b7280", fontSize: "12px", margin: "4px 0 0 0" }}>
                Member since {memberSince}
              </p>
            </div>
          </div>

          {/* Right Action: Edit Profile */}
          <button
            onClick={() => setIsEditingProfile(!isEditingProfile)}
            style={{
              padding: "9px 18px",
              borderRadius: "10px",
              background: isEditingProfile ? "rgba(255,255,255,0.1)" : "linear-gradient(135deg, #7c3aed, #6d28d9)",
              border: "1px solid rgba(255,255,255,0.12)",
              color: "white",
              fontSize: "13px",
              fontWeight: "600",
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              gap: "7px",
              boxShadow: "0 4px 14px rgba(124,58,237,0.3)",
              transition: "all 0.2s",
            }}
          >
            <svg width="15" height="15" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
              <path strokeLinecap="round" strokeLinejoin="round" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
            </svg>
            {isEditingProfile ? "Close Editor" : "Edit Profile"}
          </button>
        </div>

        {/* Inline Profile Editor */}
        {isEditingProfile && (
          <form
            onSubmit={handleSaveProfile}
            style={{
              marginTop: "24px",
              paddingTop: "20px",
              borderTop: "1px solid rgba(255,255,255,0.08)",
              display: "flex",
              flexDirection: "column",
              gap: "16px",
            }}
          >
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: "16px" }}>
              <div>
                <label style={{ display: "block", color: "#9ca3af", fontSize: "12px", marginBottom: "6px", fontWeight: "600" }}>
                  Full Name
                </label>
                <input
                  type="text"
                  value={profileForm.name}
                  onChange={(e) => setProfileForm({ ...profileForm, name: e.target.value })}
                  style={{
                    width: "100%",
                    padding: "10px 14px",
                    borderRadius: "10px",
                    background: "rgba(255,255,255,0.05)",
                    border: "1px solid rgba(255,255,255,0.1)",
                    color: "white",
                    fontSize: "13px",
                    outline: "none",
                    boxSizing: "border-box",
                  }}
                  required
                />
              </div>

              <div>
                <label style={{ display: "block", color: "#9ca3af", fontSize: "12px", marginBottom: "6px", fontWeight: "600" }}>
                  Gender
                </label>
                <select
                  value={profileForm.gender}
                  onChange={(e) => setProfileForm({ ...profileForm, gender: e.target.value })}
                  style={{
                    width: "100%",
                    padding: "10px 14px",
                    borderRadius: "10px",
                    background: "#1e1b4b",
                    border: "1px solid rgba(255,255,255,0.1)",
                    color: "white",
                    fontSize: "13px",
                    outline: "none",
                    boxSizing: "border-box",
                  }}
                >
                  <option value="male">Male</option>
                  <option value="female">Female</option>
                  <option value="other">Other</option>
                </select>
              </div>

              <div>
                <label style={{ display: "block", color: "#9ca3af", fontSize: "12px", marginBottom: "6px", fontWeight: "600" }}>
                  Avatar Preset
                </label>
                <div style={{ display: "flex", gap: "8px" }}>
                  {AVATAR_OPTIONS.map((avatarUrl, idx) => (
                    <button
                      type="button"
                      key={idx}
                      onClick={() => setProfileForm({ ...profileForm, avatar: avatarUrl })}
                      style={{
                        width: "38px",
                        height: "38px",
                        borderRadius: "10px",
                        padding: "2px",
                        background: profileForm.avatar === avatarUrl ? "rgba(124,58,237,0.5)" : "rgba(255,255,255,0.05)",
                        border: profileForm.avatar === avatarUrl ? "2px solid #a78bfa" : "1px solid rgba(255,255,255,0.1)",
                        cursor: "pointer",
                      }}
                    >
                      <img src={avatarUrl} alt="preset" style={{ width: "100%", height: "100%", borderRadius: "8px" }} />
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label style={{ display: "block", color: "#9ca3af", fontSize: "12px", marginBottom: "6px", fontWeight: "600" }}>
                  Or Upload Custom Photo (Cloudinary)
                </label>
                <div style={{ display: "flex", alignItems: "center", gap: "12px", flexWrap: "wrap" }}>
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={isUploadingAvatar}
                    style={{
                      padding: "9px 16px",
                      borderRadius: "10px",
                      background: "rgba(124,58,237,0.18)",
                      border: "1px solid rgba(124,58,237,0.4)",
                      color: "#c4b5fd",
                      fontSize: "13px",
                      fontWeight: "600",
                      cursor: "pointer",
                      display: "flex",
                      alignItems: "center",
                      gap: "6px",
                      transition: "all 0.2s",
                    }}
                  >
                    <span>📷</span> {isUploadingAvatar ? "Uploading to Cloudinary..." : "Choose Image File"}
                  </button>

                  <span
                    style={{
                      fontSize: "12px",
                      color: data?.isCloudinaryConfigured ? "#4ade80" : "#fbbf24",
                      display: "flex",
                      alignItems: "center",
                      gap: "5px",
                    }}
                  >
                    {data?.isCloudinaryConfigured
                      ? "✓ Cloudinary Active"
                      : "⚠️ Cloudinary credentials required in server/.env"}
                  </span>
                </div>
              </div>
            </div>

            <div style={{ display: "flex", justifyContent: "flex-end", gap: "10px", marginTop: "8px" }}>
              <button
                type="button"
                onClick={() => setIsEditingProfile(false)}
                style={{
                  padding: "8px 16px",
                  borderRadius: "8px",
                  background: "transparent",
                  border: "1px solid rgba(255,255,255,0.1)",
                  color: "#9ca3af",
                  fontSize: "13px",
                  cursor: "pointer",
                }}
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={profileMutation.isPending}
                style={{
                  padding: "8px 20px",
                  borderRadius: "8px",
                  background: "linear-gradient(135deg, #7c3aed, #6d28d9)",
                  border: "none",
                  color: "white",
                  fontSize: "13px",
                  fontWeight: "600",
                  cursor: "pointer",
                }}
              >
                {profileMutation.isPending ? "Saving..." : "Save Changes"}
              </button>
            </div>
          </form>
        )}
      </div>

      {/* ── 2. Learning & Creation Analytics (Stats Grid) ── */}
      <div style={{ marginBottom: "36px" }}>
        <h2 style={{ color: "white", fontSize: "18px", fontWeight: "700", marginBottom: "16px" }}>
          Platform Stats & Milestones
        </h2>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))",
            gap: "16px",
          }}
        >
          {/* Card 1: Courses Generated */}
          <div
            onClick={() => navigate("/workspace")}
            style={{
              background: "rgba(255,255,255,0.03)",
              border: "1px solid rgba(255,255,255,0.08)",
              borderRadius: "16px",
              padding: "20px",
              cursor: "pointer",
              transition: "all 0.2s",
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.borderColor = "rgba(124,58,237,0.4)";
              e.currentTarget.style.transform = "translateY(-2px)";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.borderColor = "rgba(255,255,255,0.08)";
              e.currentTarget.style.transform = "translateY(0)";
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "12px" }}>
              <span style={{ color: "#9ca3af", fontSize: "13px", fontWeight: "600" }}>Courses Generated</span>
              <div style={{ width: "36px", height: "36px", borderRadius: "10px", background: "rgba(124,58,237,0.15)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "18px" }}>
                🚀
              </div>
            </div>
            <div style={{ fontSize: "28px", fontWeight: "800", color: "white", marginBottom: "4px" }}>
              {stats.coursesGenerated}
            </div>
            <div style={{ color: "#a78bfa", fontSize: "12px", display: "flex", alignItems: "center", gap: "4px" }}>
              View all in Dashboard →
            </div>
          </div>

          {/* Card 2: Quizzes Passed */}
          <div
            onClick={() => navigate("/workspace/quizzes")}
            style={{
              background: "rgba(255,255,255,0.03)",
              border: "1px solid rgba(255,255,255,0.08)",
              borderRadius: "16px",
              padding: "20px",
              cursor: "pointer",
              transition: "all 0.2s",
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.borderColor = "rgba(34,197,94,0.4)";
              e.currentTarget.style.transform = "translateY(-2px)";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.borderColor = "rgba(255,255,255,0.08)";
              e.currentTarget.style.transform = "translateY(0)";
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "12px" }}>
              <span style={{ color: "#9ca3af", fontSize: "13px", fontWeight: "600" }}>Quizzes Passed</span>
              <div style={{ width: "36px", height: "36px", borderRadius: "10px", background: "rgba(34,197,94,0.15)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "18px" }}>
                🏆
              </div>
            </div>
            <div style={{ fontSize: "28px", fontWeight: "800", color: "#4ade80", marginBottom: "4px" }}>
              {stats.quizzesPassed}
            </div>
            <div style={{ color: "#9ca3af", fontSize: "12px" }}>
              {stats.quizzesAttempted} quizzes attempted total →
            </div>
          </div>

          {/* Card 3: Enrolled Courses */}
          <div
            onClick={() => navigate("/workspace/continue-learning")}
            style={{
              background: "rgba(255,255,255,0.03)",
              border: "1px solid rgba(255,255,255,0.08)",
              borderRadius: "16px",
              padding: "20px",
              cursor: "pointer",
              transition: "all 0.2s",
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.borderColor = "rgba(59,130,246,0.4)";
              e.currentTarget.style.transform = "translateY(-2px)";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.borderColor = "rgba(255,255,255,0.08)";
              e.currentTarget.style.transform = "translateY(0)";
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "12px" }}>
              <span style={{ color: "#9ca3af", fontSize: "13px", fontWeight: "600" }}>Enrolled Courses</span>
              <div style={{ width: "36px", height: "36px", borderRadius: "10px", background: "rgba(59,130,246,0.15)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "18px" }}>
                📚
              </div>
            </div>
            <div style={{ fontSize: "28px", fontWeight: "800", color: "#60a5fa", marginBottom: "4px" }}>
              {stats.coursesEnrolled}
            </div>
            <div style={{ color: "#9ca3af", fontSize: "12px" }}>
              {stats.completedCourses} completed (100% progress) →
            </div>
          </div>

          {/* Card 4: Average Quiz Score */}
          <div
            style={{
              background: "rgba(255,255,255,0.03)",
              border: "1px solid rgba(255,255,255,0.08)",
              borderRadius: "16px",
              padding: "20px",
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "12px" }}>
              <span style={{ color: "#9ca3af", fontSize: "13px", fontWeight: "600" }}>Avg. Quiz Score</span>
              <div style={{ width: "36px", height: "36px", borderRadius: "10px", background: "rgba(251,191,36,0.15)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "18px" }}>
                🎯
              </div>
            </div>
            <div style={{ fontSize: "28px", fontWeight: "800", color: "#fbbf24", marginBottom: "4px" }}>
              {stats.averageQuizScore}%
            </div>
            <div style={{ width: "100%", height: "4px", background: "rgba(255,255,255,0.08)", borderRadius: "2px", overflow: "hidden", marginTop: "6px" }}>
              <div
                style={{
                  height: "100%",
                  width: `${stats.averageQuizScore}%`,
                  background: "linear-gradient(90deg, #fbbf24, #f59e0b)",
                  borderRadius: "2px",
                }}
              />
            </div>
          </div>
        </div>
      </div>

      {/* ── 3. Bring Your Own Key (BYOK) & AI Model Configuration ── */}
      <div style={{ marginBottom: "36px" }}>
        <div style={{ marginBottom: "18px" }}>
          <h2 style={{ color: "white", fontSize: "20px", fontWeight: "700", margin: "0 0 6px 0" }}>
            🤖 AI API Keys & Model Management
          </h2>
          <p style={{ color: "#9ca3af", fontSize: "13px", margin: 0, lineHeight: "1.5" }}>
            Provide your own API keys for unrestricted personal AI generations. If left empty, Learnova uses the system's pooled credentials automatically.
          </p>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(360px, 1fr))", gap: "24px" }}>
          {/* ── Groq Provider Card ── */}
          {(() => {
            const isGroqDefault = defaultProvider === "groq";
            return (
              <div
                style={{
                  background: isGroqDefault
                    ? "linear-gradient(135deg, rgba(249,115,22,0.12) 0%, rgba(15,23,42,0.95) 100%)"
                    : "rgba(255,255,255,0.025)",
                  border: isGroqDefault
                    ? "2px solid #f97316"
                    : "1px solid rgba(255,255,255,0.08)",
                  borderRadius: "18px",
                  padding: "24px",
                  display: "flex",
                  flexDirection: "column",
                  gap: "16px",
                  position: "relative",
                  boxShadow: isGroqDefault
                    ? "0 0 32px rgba(249,115,22,0.25), 0 8px 30px rgba(0,0,0,0.4)"
                    : "none",
                  transition: "all 0.3s cubic-bezier(0.16, 1, 0.3, 1)",
                }}
              >
                {/* Default Provider Ribbon Badge */}
                {isGroqDefault && (
                  <div
                    style={{
                      position: "absolute",
                      top: "-12px",
                      right: "20px",
                      background: "linear-gradient(135deg, #f97316, #ea580c)",
                      color: "white",
                      fontSize: "11px",
                      fontWeight: "800",
                      letterSpacing: "0.5px",
                      padding: "4px 14px",
                      borderRadius: "20px",
                      display: "flex",
                      alignItems: "center",
                      gap: "5px",
                      boxShadow: "0 4px 14px rgba(249,115,22,0.5)",
                      zIndex: 2,
                    }}
                  >
                    <span>★</span> DEFAULT AI PROVIDER
                  </div>
                )}

                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                    <div style={{ width: "34px", height: "34px", borderRadius: "10px", background: "linear-gradient(135deg, #f97316, #ea580c)", display: "flex", alignItems: "center", justifyContent: "center", color: "white", fontWeight: "800", fontSize: "15px" }}>
                      G
                    </div>
                    <div>
                      <h3 style={{ color: "white", fontSize: "16px", fontWeight: "700", margin: 0, display: "flex", alignItems: "center", gap: "6px" }}>
                        Groq Cloud
                        {isGroqDefault && (
                          <span style={{ fontSize: "11px", color: "#fdba74", fontWeight: "600" }}>• Active Default</span>
                        )}
                      </h3>
                      <span style={{ color: "#9ca3af", fontSize: "11px" }}>High-speed LPU inference</span>
                    </div>
                  </div>

                  <span
                    style={{
                      fontSize: "11px",
                      padding: "3px 10px",
                      borderRadius: "20px",
                      background: apiKeys.hasGroqKey ? "rgba(34,197,94,0.12)" : "rgba(255,255,255,0.05)",
                      color: apiKeys.hasGroqKey ? "#4ade80" : "#9ca3af",
                      border: `1px solid ${apiKeys.hasGroqKey ? "rgba(34,197,94,0.25)" : "rgba(255,255,255,0.1)"}`,
                      fontWeight: "600",
                    }}
                  >
                    {apiKeys.hasGroqKey ? `Key Active (${apiKeys.maskedGroqKey})` : "System Key Active"}
                  </span>
                </div>

                {/* Default Provider Status Banner / Action Button */}
                {isGroqDefault ? (
                  <div
                    style={{
                      padding: "9px 14px",
                      borderRadius: "10px",
                      background: "rgba(249,115,22,0.16)",
                      border: "1px solid rgba(249,115,22,0.4)",
                      color: "#fdba74",
                      fontSize: "12px",
                      fontWeight: "600",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                    }}
                  >
                    <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                      <span>✓</span>
                      <span>Default across entire app</span>
                    </div>
                    <span style={{ fontSize: "11px", opacity: 0.9, background: "rgba(0,0,0,0.3)", padding: "2px 8px", borderRadius: "6px", fontWeight: "700" }}>
                      {groqModel}
                    </span>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => handleQuickSetDefault("groq")}
                    style={{
                      padding: "9px 14px",
                      borderRadius: "10px",
                      background: "rgba(249,115,22,0.08)",
                      border: "1px dashed rgba(249,115,22,0.45)",
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
                    onMouseEnter={(e) => {
                      e.currentTarget.style.background = "rgba(249,115,22,0.22)";
                      e.currentTarget.style.borderStyle = "solid";
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.background = "rgba(249,115,22,0.08)";
                      e.currentTarget.style.borderStyle = "dashed";
                    }}
                  >
                    ★ Set Groq as Default Provider
                  </button>
                )}

                {/* Input & Key Save */}
                <div>
                  <label style={{ display: "block", color: "#d1d5db", fontSize: "12px", marginBottom: "6px", fontWeight: "600" }}>
                    {apiKeys.hasGroqKey ? "Update Groq API Key" : "Enter Groq API Key"}
                  </label>
                  <div style={{ position: "relative" }}>
                    <input
                      type={showGroqKey ? "text" : "password"}
                      placeholder={apiKeys.hasGroqKey ? "Paste new key to replace..." : "gsk_..."}
                      value={groqKeyInput}
                      onChange={(e) => setGroqKeyInput(e.target.value)}
                      style={{
                        width: "100%",
                        padding: "10px 40px 10px 12px",
                        borderRadius: "10px",
                        background: "rgba(0,0,0,0.2)",
                        border: "1px solid rgba(255,255,255,0.1)",
                        color: "white",
                        fontSize: "13px",
                        outline: "none",
                        boxSizing: "border-box",
                      }}
                    />
                    <button
                      type="button"
                      onClick={() => setShowGroqKey(!showGroqKey)}
                      style={{
                        position: "absolute",
                        right: "10px",
                        top: "50%",
                        transform: "translateY(-50%)",
                        background: "none",
                        border: "none",
                        color: "#9ca3af",
                        cursor: "pointer",
                        fontSize: "14px",
                      }}
                    >
                      {showGroqKey ? "🙈" : "👁"}
                    </button>
                  </div>

                  {groqKeyInput.trim() && (
                    <div style={{ marginTop: "8px", display: "flex", justifyContent: "flex-end" }}>
                      <button
                        type="button"
                        onClick={() => keysMutation.mutate({ groqKey: groqKeyInput.trim() })}
                        disabled={keysMutation.isPending}
                        style={{
                          padding: "7px 16px",
                          borderRadius: "8px",
                          background: "linear-gradient(135deg, #f97316, #ea580c)",
                          border: "none",
                          color: "white",
                          fontSize: "12px",
                          fontWeight: "600",
                          cursor: "pointer",
                          boxShadow: "0 2px 10px rgba(249,115,22,0.3)",
                        }}
                      >
                        {keysMutation.isPending ? "Saving..." : "💾 Save Groq Key"}
                      </button>
                    </div>
                  )}
                </div>

                {/* Test result message */}
                {groqTestResult && (
                  <div
                    style={{
                      padding: "8px 12px",
                      borderRadius: "8px",
                      background: groqTestResult.success ? "rgba(34,197,94,0.1)" : "rgba(239,68,68,0.1)",
                      border: `1px solid ${groqTestResult.success ? "rgba(34,197,94,0.25)" : "rgba(239,68,68,0.25)"}`,
                      color: groqTestResult.success ? "#4ade80" : "#f87171",
                      fontSize: "12px",
                      lineHeight: "1.4",
                    }}
                  >
                    {groqTestResult.success ? "✅ " : "❌ "}
                    {groqTestResult.message}
                  </div>
                )}

                {/* Action buttons */}
                <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
                  <button
                    type="button"
                    onClick={() => handleTestKey("groq")}
                    disabled={testingGroq || (!groqKeyInput && !apiKeys.hasGroqKey)}
                    style={{
                      flex: 1,
                      padding: "8px 12px",
                      borderRadius: "8px",
                      background: "rgba(249,115,22,0.12)",
                      border: "1px solid rgba(249,115,22,0.3)",
                      color: "#fb923c",
                      fontSize: "12px",
                      fontWeight: "600",
                      cursor: "pointer",
                      transition: "all 0.2s",
                    }}
                  >
                    {testingGroq ? "Testing..." : `⚡ Test Key (${groqModel})`}
                  </button>

                  {apiKeys.hasGroqKey && (
                    <button
                      type="button"
                      onClick={() => handleRemoveKey("groq")}
                      style={{
                        padding: "8px 12px",
                        borderRadius: "8px",
                        background: "rgba(239,68,68,0.1)",
                        border: "1px solid rgba(239,68,68,0.2)",
                        color: "#f87171",
                        fontSize: "12px",
                        cursor: "pointer",
                      }}
                    >
                      Remove Key
                    </button>
                  )}
                </div>

                {/* Available Groq Models (Interactive Selection) */}
                <div>
                  <span style={{ color: "#9ca3af", fontSize: "11px", fontWeight: "600", textTransform: "uppercase" }}>
                    Available Groq Models (Click to Select)
                  </span>
                  <div style={{ display: "flex", flexWrap: "wrap", gap: "6px", marginTop: "8px" }}>
                    {GROQ_MODELS_META.map((m) => {
                      const isSelected = m.id === groqModel;
                      return (
                        <button
                          key={m.id}
                          type="button"
                          onClick={() => dispatch(setProviderModel({ provider: "groq", model: m.id }))}
                          title={`Select ${m.name}`}
                          style={{
                            fontSize: "11px",
                            padding: "5px 10px",
                            borderRadius: "8px",
                            background: isSelected ? "rgba(249,115,22,0.25)" : "rgba(255,255,255,0.03)",
                            border: isSelected ? "1px solid #f97316" : "1px solid rgba(255,255,255,0.08)",
                            color: isSelected ? "#fdba74" : "#e5e7eb",
                            fontWeight: isSelected ? "700" : "500",
                            cursor: "pointer",
                            display: "inline-flex",
                            alignItems: "center",
                            gap: "5px",
                            transition: "all 0.15s ease",
                          }}
                        >
                          {isSelected && <span>✓</span>}
                          <span>{m.id}</span>
                          <span style={{ color: isSelected ? "#f97316" : "#fb923c", fontSize: "9px" }}>({m.badge})</span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                <a
                  href="https://console.groq.com/keys"
                  target="_blank"
                  rel="noreferrer"
                  style={{ color: "#fb923c", fontSize: "12px", textDecoration: "none" }}
                >
                  Get a free Groq API key →
                </a>
              </div>
            );
          })()}

          {/* ── Google Gemini Provider Card ── */}
          {(() => {
            const isGeminiDefault = defaultProvider === "gemini";
            return (
              <div
                style={{
                  background: isGeminiDefault
                    ? "linear-gradient(135deg, rgba(139,92,246,0.14) 0%, rgba(15,23,42,0.95) 100%)"
                    : "rgba(255,255,255,0.025)",
                  border: isGeminiDefault
                    ? "2px solid #8b5cf6"
                    : "1px solid rgba(255,255,255,0.08)",
                  borderRadius: "18px",
                  padding: "24px",
                  display: "flex",
                  flexDirection: "column",
                  gap: "16px",
                  position: "relative",
                  boxShadow: isGeminiDefault
                    ? "0 0 32px rgba(139,92,246,0.28), 0 8px 30px rgba(0,0,0,0.4)"
                    : "none",
                  transition: "all 0.3s cubic-bezier(0.16, 1, 0.3, 1)",
                }}
              >
                {/* Default Provider Ribbon Badge */}
                {isGeminiDefault && (
                  <div
                    style={{
                      position: "absolute",
                      top: "-12px",
                      right: "20px",
                      background: "linear-gradient(135deg, #7c3aed, #6d28d9)",
                      color: "white",
                      fontSize: "11px",
                      fontWeight: "800",
                      letterSpacing: "0.5px",
                      padding: "4px 14px",
                      borderRadius: "20px",
                      display: "flex",
                      alignItems: "center",
                      gap: "5px",
                      boxShadow: "0 4px 14px rgba(124,58,237,0.5)",
                      zIndex: 2,
                    }}
                  >
                    <span>★</span> DEFAULT AI PROVIDER
                  </div>
                )}

                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                    <div style={{ width: "34px", height: "34px", borderRadius: "10px", background: "linear-gradient(135deg, #3b82f6, #8b5cf6)", display: "flex", alignItems: "center", justifyContent: "center", color: "white", fontWeight: "800", fontSize: "15px" }}>
                      ✦
                    </div>
                    <div>
                      <h3 style={{ color: "white", fontSize: "16px", fontWeight: "700", margin: 0, display: "flex", alignItems: "center", gap: "6px" }}>
                        Google Gemini
                        {isGeminiDefault && (
                          <span style={{ fontSize: "11px", color: "#c4b5fd", fontWeight: "600" }}>• Active Default</span>
                        )}
                      </h3>
                      <span style={{ color: "#9ca3af", fontSize: "11px" }}>Multimodal AI & Flash speed</span>
                    </div>
                  </div>

                  <span
                    style={{
                      fontSize: "11px",
                      padding: "3px 10px",
                      borderRadius: "20px",
                      background: apiKeys.hasGeminiKey ? "rgba(34,197,94,0.12)" : "rgba(255,255,255,0.05)",
                      color: apiKeys.hasGeminiKey ? "#4ade80" : "#9ca3af",
                      border: `1px solid ${apiKeys.hasGeminiKey ? "rgba(34,197,94,0.25)" : "rgba(255,255,255,0.1)"}`,
                      fontWeight: "600",
                    }}
                  >
                    {apiKeys.hasGeminiKey ? `Key Active (${apiKeys.maskedGeminiKey})` : "System Key Active"}
                  </span>
                </div>

                {/* Default Provider Status Banner / Action Button */}
                {isGeminiDefault ? (
                  <div
                    style={{
                      padding: "9px 14px",
                      borderRadius: "10px",
                      background: "rgba(139,92,246,0.18)",
                      border: "1px solid rgba(139,92,246,0.4)",
                      color: "#c4b5fd",
                      fontSize: "12px",
                      fontWeight: "600",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                    }}
                  >
                    <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                      <span>✓</span>
                      <span>Default across entire app</span>
                    </div>
                    <span style={{ fontSize: "11px", opacity: 0.9, background: "rgba(0,0,0,0.3)", padding: "2px 8px", borderRadius: "6px", fontWeight: "700" }}>
                      {geminiModel}
                    </span>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => handleQuickSetDefault("gemini")}
                    style={{
                      padding: "9px 14px",
                      borderRadius: "10px",
                      background: "rgba(139,92,246,0.08)",
                      border: "1px dashed rgba(139,92,246,0.45)",
                      color: "#c4b5fd",
                      fontSize: "12px",
                      fontWeight: "600",
                      cursor: "pointer",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      gap: "6px",
                      transition: "all 0.2s",
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.background = "rgba(139,92,246,0.22)";
                      e.currentTarget.style.borderStyle = "solid";
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.background = "rgba(139,92,246,0.08)";
                      e.currentTarget.style.borderStyle = "dashed";
                    }}
                  >
                    ★ Set Gemini as Default Provider
                  </button>
                )}

                {/* Input & Key Save */}
                <div>
                  <label style={{ display: "block", color: "#d1d5db", fontSize: "12px", marginBottom: "6px", fontWeight: "600" }}>
                    {apiKeys.hasGeminiKey ? "Update Gemini API Key" : "Enter Gemini API Key"}
                  </label>
                  <div style={{ position: "relative" }}>
                    <input
                      type={showGeminiKey ? "text" : "password"}
                      placeholder={apiKeys.hasGeminiKey ? "Paste new key to replace..." : "AIzaSy..."}
                      value={geminiKeyInput}
                      onChange={(e) => setGeminiKeyInput(e.target.value)}
                      style={{
                        width: "100%",
                        padding: "10px 40px 10px 12px",
                        borderRadius: "10px",
                        background: "rgba(0,0,0,0.2)",
                        border: "1px solid rgba(255,255,255,0.1)",
                        color: "white",
                        fontSize: "13px",
                        outline: "none",
                        boxSizing: "border-box",
                      }}
                    />
                    <button
                      type="button"
                      onClick={() => setShowGeminiKey(!showGeminiKey)}
                      style={{
                        position: "absolute",
                        right: "10px",
                        top: "50%",
                        transform: "translateY(-50%)",
                        background: "none",
                        border: "none",
                        color: "#9ca3af",
                        cursor: "pointer",
                        fontSize: "14px",
                      }}
                    >
                      {showGeminiKey ? "🙈" : "👁"}
                    </button>
                  </div>

                  {geminiKeyInput.trim() && (
                    <div style={{ marginTop: "8px", display: "flex", justifyContent: "flex-end" }}>
                      <button
                        type="button"
                        onClick={() => keysMutation.mutate({ geminiKey: geminiKeyInput.trim() })}
                        disabled={keysMutation.isPending}
                        style={{
                          padding: "7px 16px",
                          borderRadius: "8px",
                          background: "linear-gradient(135deg, #7c3aed, #6d28d9)",
                          border: "none",
                          color: "white",
                          fontSize: "12px",
                          fontWeight: "600",
                          cursor: "pointer",
                          boxShadow: "0 2px 10px rgba(124,58,237,0.3)",
                        }}
                      >
                        {keysMutation.isPending ? "Saving..." : "💾 Save Gemini Key"}
                      </button>
                    </div>
                  )}
                </div>

                {/* Test result message */}
                {geminiTestResult && (
                  <div
                    style={{
                      padding: "8px 12px",
                      borderRadius: "8px",
                      background: geminiTestResult.success ? "rgba(34,197,94,0.1)" : "rgba(239,68,68,0.1)",
                      border: `1px solid ${geminiTestResult.success ? "rgba(34,197,94,0.25)" : "rgba(239,68,68,0.25)"}`,
                      color: geminiTestResult.success ? "#4ade80" : "#f87171",
                      fontSize: "12px",
                      lineHeight: "1.4",
                    }}
                  >
                    {geminiTestResult.success ? "✅ " : "❌ "}
                    {geminiTestResult.message}
                  </div>
                )}

                {/* Action buttons */}
                <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
                  <button
                    type="button"
                    onClick={() => handleTestKey("gemini")}
                    disabled={testingGemini || (!geminiKeyInput && !apiKeys.hasGeminiKey)}
                    style={{
                      flex: 1,
                      padding: "8px 12px",
                      borderRadius: "8px",
                      background: "rgba(59,130,246,0.12)",
                      border: "1px solid rgba(59,130,246,0.3)",
                      color: "#60a5fa",
                      fontSize: "12px",
                      fontWeight: "600",
                      cursor: "pointer",
                      transition: "all 0.2s",
                    }}
                  >
                    {testingGemini ? "Testing..." : `⚡ Test Key (${geminiModel})`}
                  </button>

                  {apiKeys.hasGeminiKey && (
                    <button
                      type="button"
                      onClick={() => handleRemoveKey("gemini")}
                      style={{
                        padding: "8px 12px",
                        borderRadius: "8px",
                        background: "rgba(239,68,68,0.1)",
                        border: "1px solid rgba(239,68,68,0.2)",
                        color: "#f87171",
                        fontSize: "12px",
                        cursor: "pointer",
                      }}
                    >
                      Remove Key
                    </button>
                  )}
                </div>

                {/* Available Gemini Models (Interactive Selection) */}
                <div>
                  <span style={{ color: "#9ca3af", fontSize: "11px", fontWeight: "600", textTransform: "uppercase" }}>
                    Available Gemini Flash Models (Click to Select)
                  </span>
                  <div style={{ display: "flex", flexWrap: "wrap", gap: "6px", marginTop: "8px" }}>
                    {GEMINI_MODELS_META.map((m) => {
                      const isSelected = m.id === geminiModel;
                      return (
                        <button
                          key={m.id}
                          type="button"
                          onClick={() => dispatch(setProviderModel({ provider: "gemini", model: m.id }))}
                          title={`Select ${m.name}`}
                          style={{
                            fontSize: "11px",
                            padding: "5px 10px",
                            borderRadius: "8px",
                            background: isSelected ? "rgba(139,92,246,0.25)" : "rgba(255,255,255,0.03)",
                            border: isSelected ? "1px solid #8b5cf6" : "1px solid rgba(255,255,255,0.08)",
                            color: isSelected ? "#c4b5fd" : "#e5e7eb",
                            fontWeight: isSelected ? "700" : "500",
                            cursor: "pointer",
                            display: "inline-flex",
                            alignItems: "center",
                            gap: "5px",
                            transition: "all 0.15s ease",
                          }}
                        >
                          {isSelected && <span>✓</span>}
                          <span>{m.id}</span>
                          <span style={{ color: isSelected ? "#c4b5fd" : "#60a5fa", fontSize: "9px" }}>({m.badge})</span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                <a
                  href="https://aistudio.google.com/app/apikey"
                  target="_blank"
                  rel="noreferrer"
                  style={{ color: "#60a5fa", fontSize: "12px", textDecoration: "none" }}
                >
                  Get a free Gemini API key →
                </a>
              </div>
            );
          })()}
        </div>
      </div>

      {/* ── 4. Administrator: Preview Courses Management (Admin Only) ── */}
      {isAdmin && (
        <div
          style={{
            marginTop: "36px",
            background: "linear-gradient(135deg, rgba(239,68,68,0.06) 0%, rgba(15,23,42,0.95) 100%)",
            border: "1px solid rgba(239,68,68,0.3)",
            borderRadius: "20px",
            padding: "28px",
            boxShadow: "0 10px 30px rgba(0,0,0,0.35)",
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              flexWrap: "wrap",
              gap: "12px",
              marginBottom: "20px",
            }}
          >
            <div>
              <div
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "6px",
                  padding: "4px 12px",
                  borderRadius: "20px",
                  background: "rgba(239,68,68,0.15)",
                  border: "1px solid rgba(239,68,68,0.3)",
                  color: "#f87171",
                  fontSize: "11px",
                  fontWeight: "700",
                  marginBottom: "8px",
                }}
              >
                <span>🛡️</span> ADMIN CONSOLE
              </div>
              <h2
                style={{
                  color: "white",
                  fontSize: "20px",
                  fontWeight: "700",
                  margin: "0 0 4px 0",
                }}
              >
                Preview Courses Management
              </h2>
              <p style={{ color: "#9ca3af", fontSize: "13px", margin: 0 }}>
                As a platform administrator, you can manage and permanently delete global preview courses. Normal users cannot delete preview courses.
              </p>
            </div>
            <span
              style={{
                fontSize: "12px",
                color: "#fca5a5",
                background: "rgba(239,68,68,0.1)",
                padding: "6px 14px",
                borderRadius: "10px",
                border: "1px solid rgba(239,68,68,0.2)",
              }}
            >
              {previewCoursesList?.length || 0} Total Preview Courses
            </span>
          </div>

          {isPreviewLoading ? (
            <div style={{ color: "#9ca3af", fontSize: "13px", padding: "20px", textAlign: "center" }}>
              Loading preview courses...
            </div>
          ) : !previewCoursesList || previewCoursesList.length === 0 ? (
            <div
              style={{
                padding: "30px",
                borderRadius: "12px",
                background: "rgba(255,255,255,0.02)",
                border: "1px dashed rgba(255,255,255,0.1)",
                textAlign: "center",
                color: "#9ca3af",
                fontSize: "13px",
              }}
            >
              No preview courses found on the platform.
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
              {previewCoursesList.map((course) => {
                const courseId = course.cid || course._id;
                const isDeleting = deletingCourseId === courseId;
                return (
                  <div
                    key={courseId}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      gap: "16px",
                      padding: "16px 20px",
                      borderRadius: "14px",
                      background: "rgba(255,255,255,0.025)",
                      border: "1px solid rgba(255,255,255,0.06)",
                      flexWrap: "wrap",
                      transition: "all 0.2s",
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.background = "rgba(255,255,255,0.04)";
                      e.currentTarget.style.borderColor = "rgba(239,68,68,0.3)";
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.background = "rgba(255,255,255,0.025)";
                      e.currentTarget.style.borderColor = "rgba(255,255,255,0.06)";
                    }}
                  >
                    <div style={{ display: "flex", alignItems: "center", gap: "14px", minWidth: 0, flex: 1 }}>
                      <div
                        style={{
                          width: "42px",
                          height: "42px",
                          borderRadius: "10px",
                          background: "linear-gradient(135deg, rgba(124,58,237,0.2), rgba(239,68,68,0.2))",
                          border: "1px solid rgba(255,255,255,0.1)",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          fontSize: "20px",
                          flexShrink: 0,
                        }}
                      >
                        {course.courseOutput?.category === "Tech & Coding" ? "💻" : "📚"}
                      </div>
                      <div style={{ minWidth: 0 }}>
                        <div style={{ display: "flex", alignItems: "center", gap: "8px", flexWrap: "wrap" }}>
                          <h4
                            style={{
                              color: "white",
                              fontSize: "14px",
                              fontWeight: "600",
                              margin: 0,
                              overflow: "hidden",
                              textOverflow: "ellipsis",
                              whiteSpace: "nowrap",
                            }}
                          >
                            {course.name}
                          </h4>
                          <span
                            style={{
                              fontSize: "10px",
                              fontWeight: "700",
                              padding: "2px 8px",
                              borderRadius: "12px",
                              background: "rgba(99,102,241,0.2)",
                              color: "#a5b4fc",
                              border: "1px solid rgba(99,102,241,0.3)",
                              textTransform: "uppercase",
                            }}
                          >
                            {course.level || "Beginner"}
                          </span>
                        </div>
                        <p
                          style={{
                            color: "#9ca3af",
                            fontSize: "12px",
                            margin: "4px 0 0 0",
                            overflow: "hidden",
                            textOverflow: "ellipsis",
                            whiteSpace: "nowrap",
                          }}
                        >
                          {course.courseOutput?.summary || course.description || "Interactive preview course"} • {course.courseOutput?.chapters?.length || 0} Chapters
                        </p>
                      </div>
                    </div>

                    <div style={{ display: "flex", alignItems: "center", gap: "10px", flexShrink: 0 }}>
                      <button
                        type="button"
                        onClick={() => navigate(`/workspace/view-course/${courseId}`)}
                        style={{
                          padding: "7px 14px",
                          borderRadius: "8px",
                          background: "rgba(255,255,255,0.06)",
                          border: "1px solid rgba(255,255,255,0.1)",
                          color: "white",
                          fontSize: "12px",
                          fontWeight: "600",
                          cursor: "pointer",
                          transition: "all 0.2s",
                        }}
                        onMouseEnter={(e) => (e.currentTarget.style.background = "rgba(255,255,255,0.12)")}
                        onMouseLeave={(e) => (e.currentTarget.style.background = "rgba(255,255,255,0.06)")}
                      >
                        👁️ Explore
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDeletePreviewCourse(course)}
                        disabled={isDeleting}
                        style={{
                          padding: "7px 14px",
                          borderRadius: "8px",
                          background: "rgba(239,68,68,0.15)",
                          border: "1px solid rgba(239,68,68,0.3)",
                          color: "#f87171",
                          fontSize: "12px",
                          fontWeight: "600",
                          cursor: isDeleting ? "not-allowed" : "pointer",
                          display: "flex",
                          alignItems: "center",
                          gap: "6px",
                          transition: "all 0.2s",
                        }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.background = "rgba(239,68,68,0.25)";
                          e.currentTarget.style.borderColor = "rgba(239,68,68,0.5)";
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.background = "rgba(239,68,68,0.15)";
                          e.currentTarget.style.borderColor = "rgba(239,68,68,0.3)";
                        }}
                      >
                        <span>🗑️</span>
                        {isDeleting ? "Deleting..." : "Delete Preview Course"}
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default Profile;
