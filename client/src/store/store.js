import { configureStore } from "@reduxjs/toolkit";
import authReducer from "./slices/authSlice.js";
import courseReducer from "./slices/courseSlice.js";
import aiReducer from "./slices/aiSlice.js";

const store = configureStore({
  reducer: {
    auth: authReducer,
    course: courseReducer,
    ai: aiReducer,
  },
});

export default store;