import mongoose from "mongoose";
import Course from "../../models/Course.js";
import Enrollment from "../../models/Enrollment.js";
import Quiz from "../../models/Quiz.js";
import redis from "../../lib/redis.js";

export const deleteCourse = async (req, res) => {
  try {
    const { courseId } = req.params;

    if (!courseId) {
      return res.status(400).json({
        success: false,
        message: "Course ID is required",
      });
    }

    const query = {
      $or: [
        { cid: courseId },
        ...(mongoose.isValidObjectId(courseId) ? [{ _id: courseId }] : []),
      ],
    };

    const course = await Course.findOne(query);
    if (!course) {
      return res.status(404).json({
        success: false,
        message: "Course not found",
      });
    }

    const adminEmail = (process.env.ADMIN_EMAIL || "himanshu@gmail.com").toLowerCase().trim();
    const isAdmin =
      req.user.role === "admin" ||
      (req.user.email && req.user.email.toLowerCase().trim() === adminEmail);

    // If this is a preview course, ONLY an admin can delete it
    if (course.previewCourse && !isAdmin) {
      return res.status(403).json({
        success: false,
        message: "Only administrators can delete preview courses",
      });
    }

    // For regular courses, check ownership or admin
    if (
      !course.previewCourse &&
      course.createdBy.toString() !== req.user._id.toString() &&
      !isAdmin
    ) {
      return res.status(403).json({
        success: false,
        message: "Unauthorized. You can only delete your own courses.",
      });
    }

    // Delete all enrollments for this course
    await Enrollment.deleteMany({
      $or: [
        { cid: course.cid },
        ...(mongoose.isValidObjectId(courseId) ? [{ cid: courseId }] : []),
      ],
    });

    // Delete all quizzes associated with this course
    await Quiz.deleteMany({
      $or: [
        { courseId: course.cid },
        ...(mongoose.isValidObjectId(courseId) ? [{ courseId: courseId }] : []),
      ],
    });

    // Delete the course itself
    await Course.findByIdAndDelete(course._id);

    try {
      const cacheKeys = await redis.keys("cache:/api/courses*");
      if (cacheKeys.length > 0) await redis.del(...cacheKeys);
    } catch (cacheErr) {
      console.error("deleteCourse cache clear error:", cacheErr.message);
    }

    res.status(200).json({
      success: true,
      message: "Course deleted successfully",
    });
  } catch (error) {
    console.error("deleteCourse error:", error.message);
    res.status(500).json({
      success: false,
      message: "Failed to delete course",
      error: error.message,
    });
  }
};
