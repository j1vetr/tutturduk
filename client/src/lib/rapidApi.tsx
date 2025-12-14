import { useQuery } from "@tanstack/react-query";

const API_KEY = "512d6eddddmshcb0be5e6a4e5669p17ee09jsn1b2105916f81";
const API_HOST = "api-football-v1.p.rapidapi.com";

export interface LiveMatch {
  fixture: {
    id: number;
    status: {
      short: string;
      elapsed: number;
    };
  };
  league: {
    name: string;
    country: string;
    logo: string;
    flag: string;
  };
  teams: {
    home: {
      name: string;
      logo: string;
    };
    away: {
      name: string;
      logo: string;
    };
  };
  goals: {
    home: number;
    away: number;
  };
  events?: {
    time: { elapsed: number };
    team: { name: string };
    player: { name: string };
    type: string;
    detail: string;
  }[];
}

export const fetchLiveMatches = async (): Promise<LiveMatch[]> => {
  const response = await fetch(`https://${API_HOST}/v3/fixtures?live=all`, {
    method: "GET",
    headers: {
      "x-rapidapi-key": API_KEY,
      "x-rapidapi-host": API_HOST,
    },
  });

  if (!response.ok) {
    throw new Error("API Hatası");
  }

  const data = await response.json();

  if (data.message && data.message.includes("not subscribed")) {
    throw new Error("API Abonelik Hatası: Lütfen RapidAPI üzerinden aboneliği başlatın.");
  }

  return data.response;
};

export function useLiveMatches() {
  return useQuery({
    queryKey: ["liveMatches"],
    queryFn: fetchLiveMatches,
    refetchInterval: 30000, // 30 seconds poll
    retry: false
  });
}
