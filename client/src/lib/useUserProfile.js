import { useQuery } from "@tanstack/react-query";
import { getUserProfileApi } from "./api.js";

export const useUserProfile = () => {
  const hasToken =
    typeof window !== "undefined" && Boolean(localStorage.getItem("accessToken"));

  return useQuery({
    queryKey: ["userProfile"],
    queryFn: async () => {
      const res = await getUserProfileApi();
      return res.data;
    },
    enabled: hasToken,
    staleTime: 2 * 60 * 1000,
    refetchOnMount: true,
  });
};
