export const calculateTotalDuration = (course) => {
  if (course?.courseJson?.duration) return course.courseJson.duration;
  if (course?.courseJson?.totalDuration) return course.courseJson.totalDuration;
  if (course?.duration) return course.duration;

  const chapters = course?.courseJson?.chapters || [];
  if (chapters.length === 0) {
    const chCount = course?.noOfChapters || 3;
    const estHours = Math.floor((chCount * 30) / 60);
    const estMins = (chCount * 30) % 60;
    return estHours > 0
      ? `${estHours} hr ${estMins > 0 ? `${estMins} min` : ""}`.trim()
      : `${estMins} mins`;
  }

  let totalMinutes = 0;
  let hasValidDuration = false;

  for (const ch of chapters) {
    if (!ch.duration) continue;
    const durStr = ch.duration.toString().toLowerCase();

    // Check for hours e.g. "1.5 hours", "1 hr", "2 hrs"
    const hrMatch = durStr.match(/(\d+(\.\d+)?)\s*(h|hr|hour)/);
    // Check for minutes e.g. "30 mins", "45 min"
    const minMatch = durStr.match(/(\d+)\s*(m|min)/);

    if (hrMatch) {
      totalMinutes += parseFloat(hrMatch[1]) * 60;
      hasValidDuration = true;
    }
    if (minMatch) {
      totalMinutes += parseInt(minMatch[1], 10);
      hasValidDuration = true;
    }
  }

  if (hasValidDuration && totalMinutes > 0) {
    const hours = Math.floor(totalMinutes / 60);
    const mins = Math.round(totalMinutes % 60);
    if (hours > 0 && mins > 0) return `${hours} hr ${mins} min`;
    if (hours > 0) return `${hours} hr${hours > 1 ? "s" : ""}`;
    return `${mins} mins`;
  }

  // Fallback estimation: ~30 mins per chapter
  const estMins = chapters.length * 30;
  const estHours = Math.floor(estMins / 60);
  const remMins = estMins % 60;
  if (estHours > 0 && remMins > 0) return `${estHours} hr ${remMins} min`;
  if (estHours > 0) return `${estHours} hrs`;
  return `${estMins} mins`;
};
