import { createSlice } from "@reduxjs/toolkit";

const getInitialUser = () => {
  try {
    const raw = localStorage.getItem("user");
    return raw ? JSON.parse(raw) : null;
  } catch (e) {
    console.error("Failed to parse user from localStorage", e);
    return null;
  }
};

const initialState = {
  user: getInitialUser(),
  accessToken: localStorage.getItem("accessToken") || null,
  isAuthenticated: !!localStorage.getItem("accessToken"),
};

const authSlice = createSlice({
  name: "auth",
  initialState,
  reducers: {
    //reducers are the only functions allowed to change state
    setCredentials: (state, action) => {
      //setCredentials:purpose is to update the state when user logs in
      const { user, accessToken } = action.payload;
      
      state.user = user;
      state.accessToken = accessToken;
      state.isAuthenticated = true;
      localStorage.setItem("accessToken", accessToken);
      if (user) {
        try {
          localStorage.setItem("user", JSON.stringify(user));
        } catch (e) {
          console.error("Failed to save user to localStorage", e);
        }
      }
    },
    updateUser: (state, action) => {
      state.user = { ...(state.user || {}), ...action.payload };
      try {
        localStorage.setItem("user", JSON.stringify(state.user));
      } catch (e) {
        console.error("Failed to update user in localStorage", e);
      }
    },
    logout: (state) => {
      //logout:purpose is to clear the state when user logs out
      state.user = null;
      state.accessToken = null;
      state.isAuthenticated = false;
      localStorage.removeItem("accessToken");
      localStorage.removeItem("user");
    },
  },
});

export const { setCredentials, updateUser, logout } = authSlice.actions;
export default authSlice.reducer;



//how setcredential is going to be used
// import { useDispatch } from "react-redux";
// import { setCredentials } from "../store/slices/authSlice";

// const dispatch = useDispatch();


/*const userData = {
      user: { name: "John Doe", email:         "john@example.com" },
     accessToken: "abc-123-xyz"
    }; */


// dispatch(setCredentials({ user: userData, accessToken: token }));

//({user:userData, accessToken:token}) => becomes action.playlod in slice