import { SWRConfiguration } from "swr";

export const defaultFetcher = async (url: string) => {
  const res = await fetch(url);
  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    const error = new Error(errorData.error || `HTTP error ${res.status}`);
    (error as any).status = res.status;
    throw error;
  }
  return res.json();
};

export const defaultSWRConfig: SWRConfiguration = {
  fetcher: defaultFetcher,
  revalidateOnFocus: false, // Don't spam DB when switching app windows
  revalidateOnReconnect: true,
  dedupingInterval: 4000, // Deduplicate identical requests within 4 seconds
  keepPreviousData: true, // Keep rendering existing UI while fetching next page or tab
};
