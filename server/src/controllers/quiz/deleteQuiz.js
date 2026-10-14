import Quiz from "../../models/Quiz.js";

export const deleteQuiz = async (req, res) => {
  try {
    const { quizId } = req.params;

    if (!quizId) {
      return res.status(400).json({
        success: false,
        message: "Quiz ID is required",
      });
    }

    const quiz = await Quiz.findById(quizId);
    if (!quiz) {
      return res.status(404).json({
        success: false,
        message: "Quiz attempt not found",
      });
    }

    const adminEmail = (process.env.ADMIN_EMAIL || "himanshu@gmail.com").toLowerCase().trim();
    const isAdmin =
      req.user.role === "admin" ||
      (req.user.email && req.user.email.toLowerCase().trim() === adminEmail);

    if (quiz.userId.toString() !== req.user._id.toString() && !isAdmin) {
      return res.status(403).json({
        success: false,
        message: "Unauthorized. You can only delete your own quiz attempts.",
      });
    }

    await Quiz.findByIdAndDelete(quizId);

    res.status(200).json({
      success: true,
      message: "Quiz attempt deleted successfully",
      quizId,
    });
  } catch (error) {
    console.error("deleteQuiz error:", error.message);
    res.status(500).json({
      success: false,
      message: "Failed to delete quiz attempt",
      error: error.message,
    });
  }
};
