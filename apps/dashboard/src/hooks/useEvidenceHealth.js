import useSWR from 'swr';

const fetcher = (url) => fetch(url).then((res) => res.json());

export function useEvidenceHealth() {
    const { data, error, isLoading } = useSWR('/api/health/evidence', fetcher, {
        refreshInterval: 5000,
        revalidateOnFocus: true
    });

    return {
        health: data,
        isLoading,
        isError: error
    };
}
