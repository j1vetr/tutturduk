import { useQuery } from "@tanstack/react-query";

const API_KEY = "512d6eddddmshcb0be5e6a4e5669p17ee09jsn1b2105916f81";
const API_HOST = "free-api-live-football-data.p.rapidapi.com";

export interface LiveMatch {
  fixture: {
    id: number;
    date: string;
    timestamp: number;
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
  const response = await fetch(`https://${API_HOST}/football-current-live`, {
    method: "GET",
    headers: {
      "x-rapidapi-key": API_KEY,
      "x-rapidapi-host": API_HOST,
    },
  });

  if (!response.ok) {
    throw new Error("API Hatası: " + response.statusText);
  }

  const data = await response.json();

  if (data.message && typeof data.message === 'string' && data.message.includes("not subscribed")) {
    throw new Error("API Abonelik Hatası: Lütfen RapidAPI üzerinden aboneliği başlatın.");
  }

  // Handle different response structures if necessary
  return data.response || [];
};

export function useLiveMatches() {
  return useQuery({
    queryKey: ["liveMatches"],
    queryFn: fetchLiveMatches,
    refetchInterval: 30000, // 30 seconds poll
    retry: false
  });
}

export interface UpcomingMatch {
  id: number;
  leagueId: number;
  time: string;
  home: {
    id: number;
    name: string;
    score: number;
  };
  away: {
    id: number;
    name: string;
    score: number;
  };
  status: {
    utcTime: string;
    started: boolean;
    finished: boolean;
    cancelled: boolean;
    scoreStr?: string;
  };
}

export const fetchUpcomingMatches = async (date: string): Promise<UpcomingMatch[]> => {
  // date format: YYYYMMDD
  const response = await fetch(`https://${API_HOST}/football-get-matches-by-date?date=${date}`, {
    method: "GET",
    headers: {
      "x-rapidapi-key": API_KEY,
      "x-rapidapi-host": API_HOST,
    },
  });

  if (!response.ok) {
    throw new Error("API Hatası: " + response.statusText);
  }

  const data = await response.json();

  if (data.message && typeof data.message === 'string' && data.message.includes("not subscribed")) {
    throw new Error("API Abonelik Hatası: Lütfen RapidAPI üzerinden aboneliği başlatın.");
  }

  // Ensure response is an array
  if (!Array.isArray(data.response)) {
    console.error("API response is not an array:", data);
    return [];
  }

  return data.response;
};

export function useUpcomingMatches(date: string) {
  return useQuery({
    queryKey: ["upcomingMatches", date],
    queryFn: () => fetchUpcomingMatches(date),
    refetchInterval: 60000, // 1 minute poll
    retry: false
  });
}
