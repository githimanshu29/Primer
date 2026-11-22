import { useEffect } from "react";
import { NavLink, useNavigate } from "react-router-dom";
import { useDispatch, useSelector } from "react-redux";
import { openCreateCourse } from "../../../store/slices/courseSlice.js";
import { logout, updateUser } from "../../../store/slices/authSlice.js";
import { useUserProfile } from "../../../lib/useUserProfile.js";
import axiosInstance from "../../../lib/axios.js";

const navItems = [
  {
    label: "Dashboard",
    path: "/workspace",
    icon: (
      <svg
        width="18"
        height="18"
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
        strokeWidth="2"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6"
        />
      </svg>
    ),
  },
  {
    label: "Continue Learning",
    path: "/workspace/continue-learning",
    icon: (
      <svg
        width="18"
        height="18"
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
    ),
  },
  {
    label: "My Quizzes",
    path: "/workspace/quizzes",
    icon: (
      <svg
        width="18"
        height="18"
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
        strokeWidth="2"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4"
        />
      </svg>
    ),
  },



  {
    label: "Profile",
    path: "/workspace/profile",
    icon: (
      <svg
        width="18"
        height="18"
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
        strokeWidth="2"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
        />
      </svg>
    ),
  },
];

const Sidebar = ({ isOpen, onClose, isMobile }) => {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { user: authUser } = useSelector((state) => state.auth);
  const { data: profileData } = useUserProfile();

  const user = profileData?.user || authUser;

  useEffect(() => {
    if (profileData?.user) {
      dispatch(updateUser(profileData.user));
    }
  }, [profileData?.user, dispatch]);

  const handleLogout = async () => {
    try {
      await axiosInstance.post("/auth/logout");
    } catch (err) {
      console.error(err);
    } finally {
      dispatch(logout());
      navigate("/login");
    }
  };

  const handleNavClick = () => {
    if (isMobile && onClose) onClose();
  };

  return (
    <>
      {/* mobile overlay backdrop */}
      {isMobile && isOpen && (
        <div
          onClick={onClose}
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0,0,0,0.5)",
            backdropFilter: "blur(2px)",
            zIndex: 49,
          }}
        />
      )}

      <div
        style={{
          width: "240px",
          height: "100vh",
          background: isMobile ? "#0a0f1e" : "rgba(255,255,255,0.02)",
          borderRight: "1px solid rgba(255,255,255,0.06)",
          display: "flex",
          flexDirection: "column",
          padding: "24px 14px",
          position: "fixed",
          left: isMobile ? (isOpen ? "0" : "-260px") : 0,
          top: 0,
          bottom: 0,
          zIndex: 50,
          fontFamily: "'Inter', sans-serif",
          transition: isMobile ? "left 0.3s ease" : "none",
          boxSizing: "border-box",
        }}
      >
        {/* mobile close button */}
        {isMobile && (
          <button
            onClick={onClose}
            style={{
              position: "absolute",
              top: "12px",
              right: "12px",
              background: "rgba(255,255,255,0.05)",
              border: "none",
              color: "#9ca3af",
              width: "32px",
              height: "32px",
              borderRadius: "8px",
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: "18px",
            }}
          >
            ✕
          </button>
        )}

        {/* logo */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "10px",
            padding: "0 6px",
            marginBottom: "28px",
            flexShrink: 0,
          }}
        >
          <div
            style={{
              width: "32px",
              height: "32px",
              background: "linear-gradient(135deg, #7c3aed, #6d28d9)",
              borderRadius: "10px",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              boxShadow: "0 4px 15px rgba(124,58,237,0.4)",
              flexShrink: 0,
            }}
          >
            <svg
              width="17"
              height="17"
              fill="none"
              viewBox="0 0 24 24"
              stroke="white"
              strokeWidth="2"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.746 0 3.332.477 4.5 1.253v13C19.832 18.477 18.246 18 16.5 18c-1.746 0-3.332.477-4.5 1.253"
              />
            </svg>
          </div>
          <span
            style={{
              color: "white",
              fontWeight: "700",
              fontSize: "17px",
              letterSpacing: "-0.3px",
            }}
          >
            Prim<span style={{ color: "#a78bfa" }}>er</span>
          </span>
        </div>

        {/* create course button */}
        <button
          onClick={() => {
            dispatch(openCreateCourse());
            handleNavClick();
          }}
          style={{
            width: "100%",
            padding: "10px 14px",
            borderRadius: "10px",
            background: "linear-gradient(135deg, #7c3aed, #6d28d9)",
            border: "none",
            color: "white",
            fontSize: "13px",
            fontWeight: "600",
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: "8px",
            marginBottom: "20px",
            boxShadow: "0 4px 15px rgba(124,58,237,0.3)",
            transition: "all 0.2s",
            flexShrink: 0,
          }}
          onMouseEnter={(e) =>
          (e.currentTarget.style.background =
            "linear-gradient(135deg, #6d28d9, #5b21b6)")
          }
          onMouseLeave={(e) =>
          (e.currentTarget.style.background =
            "linear-gradient(135deg, #7c3aed, #6d28d9)")
          }
        >
          <svg
            width="15"
            height="15"
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
          Create Course
        </button>

        {/* navigation items */}
        <nav
          style={{
            display: "flex",
            flexDirection: "column",
            gap: "3px",
            flex: 1,
            overflowY: "auto",
          }}
        >
          {navItems.map((item) => (
            <NavLink
              key={item.path}
              to={item.path}
              end={item.path === "/workspace"}
              onClick={handleNavClick}
              style={({ isActive }) => ({
                display: "flex",
                alignItems: "center",
                gap: "10px",
                padding: "9px 12px",
                borderRadius: "10px",
                textDecoration: "none",
                color: isActive ? "white" : "#6b7280",
                background: isActive ? "rgba(124,58,237,0.2)" : "transparent",
                fontSize: "13px",
                fontWeight: isActive ? "600" : "400",
                transition: "all 0.2s",
                borderLeft: isActive
                  ? "2px solid #7c3aed"
                  : "2px solid transparent",
              })}
              onMouseEnter={(e) => {
                if (!e.currentTarget.classList.contains("active")) {
                  e.currentTarget.style.background = "rgba(255,255,255,0.04)";
                  e.currentTarget.style.color = "#d1d5db";
                }
              }}
              onMouseLeave={(e) => {
                if (!e.currentTarget.classList.contains("active")) {
                  e.currentTarget.style.background = "transparent";
                  e.currentTarget.style.color = "#6b7280";
                }
              }}
            >
              {item.icon}
              {item.label}
            </NavLink>
          ))}
        </nav>

        {/* user + logout footer */}
        <div
          style={{
            borderTop: "1px solid rgba(255,255,255,0.06)",
            paddingTop: "16px",
            marginTop: "auto",
            flexShrink: 0,
            display: "flex",
            flexDirection: "column",
            gap: "12px",
          }}
        >
          {/* user info (Clickable to view Profile) */}
          <div
            onClick={() => {
              navigate("/workspace/profile");
              if (isMobile && onClose) onClose();
            }}
            title="View Profile"
            style={{
              display: "flex",
              alignItems: "center",
              gap: "10px",
              padding: "6px 8px",
              borderRadius: "10px",
              cursor: "pointer",
              transition: "background 0.2s ease",
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = "rgba(255,255,255,0.05)";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = "transparent";
            }}
          >
            {user?.avatar ? (
              <img
                src={user.avatar}
                alt={user?.name || "User"}
                style={{
                  width: "34px",
                  height: "34px",
                  borderRadius: "50%",
                  objectFit: "cover",
                  flexShrink: 0,
                  border: "1.5px solid rgba(124,58,237,0.5)",
                }}
              />
            ) : (
              <div
                style={{
                  width: "34px",
                  height: "34px",
                  borderRadius: "50%",
                  background: "linear-gradient(135deg, #7c3aed, #6d28d9)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: "14px",
                  fontWeight: "600",
                  color: "white",
                  flexShrink: 0,
                }}
              >
                {user?.name?.charAt(0).toUpperCase() || "U"}
              </div>
            )}
            <div style={{ overflow: "hidden", flex: 1 }}>
              <p
                style={{
                  color: "white",
                  fontSize: "13px",
                  fontWeight: "600",
                  whiteSpace: "nowrap",
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  margin: 0,
                }}
              >
                {user?.name || "User"}
              </p>
              <p
                style={{
                  color: "#6b7280",
                  fontSize: "11px",
                  whiteSpace: "nowrap",
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  margin: 0,
                }}
              >
                {user?.email || ""}
              </p>
            </div>
          </div>

          {/* logout */}
          <button
            onClick={handleLogout}
            style={{
              width: "100%",
              padding: "8px 12px",
              borderRadius: "10px",
              background: "transparent",
              border: "1px solid rgba(239,68,68,0.2)",
              color: "#f87171",
              fontSize: "12px",
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              gap: "8px",
              transition: "all 0.2s",
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = "rgba(239,68,68,0.1)";
              e.currentTarget.style.borderColor = "rgba(239,68,68,0.4)";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = "transparent";
              e.currentTarget.style.borderColor = "rgba(239,68,68,0.2)";
            }}
          >
            <svg
              width="15"
              height="15"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth="2"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"
              />
            </svg>
            Logout
          </button>

          <p
            style={{
              color: "#374151",
              fontSize: "10px",
              textAlign: "center",
              margin: 0,
            }}
          >
            © 2025 Primer
          </p>
        </div>
      </div>
    </>
  );
};

export default Sidebar;
