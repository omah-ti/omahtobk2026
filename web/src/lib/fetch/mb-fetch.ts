/* eslint-disable @typescript-eslint/no-explicit-any */
import { SOAL_URL, MINAT_BAKAT_URL, PUBLIC_MINAT_BAKAT_URL, PUBLIC_SOAL_URL } from "@/lib/types/url";

export const getMbUrl = (isPublic?: boolean) => {
    return isPublic ? PUBLIC_MINAT_BAKAT_URL : MINAT_BAKAT_URL;
};

export const getSoalUrl = (isPublic?: boolean) => {
  return isPublic ? PUBLIC_SOAL_URL : SOAL_URL;
};

export const getMbSoal = async (accessToken?: string, isPublic?: boolean) => {
    try {
        const soalUrl = getSoalUrl(isPublic);
                const headers: Record<string, string> = {
                    "Content-Type": "application/json",
                }
                if (accessToken) {
                    headers.Cookie = `access_token=${accessToken}`
                }

                const res = await fetch(`${soalUrl}/minat-bakat`, {
            method: "GET",
                        headers,
            cache: "force-cache",
            next: {revalidate: 3600},
            credentials: "include",
        });
        if (!res.ok) {
            throw new Error("Failed to fetch soal");
        }
        
        return res.json();
    } catch (error) {
        console.error('Error fetching MB soal:', error);
        throw new Error("Failed to fetch soal");
    }
}

export const submitMbAnswers = async (answers: any, isPublic?: boolean, accessToken?: string) => {
    try {
        const mbUrl = getMbUrl(isPublic);
                const headers: Record<string, string> = {
                    "Content-Type": "application/json",
                }
                if (accessToken) {
                    headers.Cookie = `access_token=${accessToken}`
                }

                const res = await fetch(`${mbUrl}/process`, {
            method: "POST",
                        headers,
            credentials: "include",
            body: JSON.stringify(answers),
        });
        if (!res.ok) {
            throw new Error("Failed to submit answers");
        }
        
        return res.json();
    } catch (error) {
        console.error('Error submitting MB answers:', error);
        throw new Error("Failed to submit answers");
    }
}

export const getMbAttempt = async (accessToken?: string, isPublic?: boolean) => {
    try {
        const mbUrl = getMbUrl(isPublic);
                const headers: Record<string, string> = {
                    "Content-Type": "application/json",
                }
                if (accessToken) {
                    headers.Cookie = `access_token=${accessToken}`
                }

                const res = await fetch(`${mbUrl}/attempt`, {
            method: "GET",
                        headers,
            credentials: "include",
            cache: "force-cache",
            next: {revalidate: 3600}
        });
        if (res.ok) {
            const responseJSON = await res.json();
            return responseJSON;
        }
        return null;
    } catch (error) {
        console.error('Error fetching MB attempt:', error);
        return null;
    }
}