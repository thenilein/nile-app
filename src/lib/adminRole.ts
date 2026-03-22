import { supabase } from "./supabase";

export async function fetchUserRole(userId: string): Promise<string | null> {
    const { data, error } = await supabase
        .from("profiles")
        .select("role")
        .eq("id", userId)
        .single();

    if (error) return null;
    return data?.role ?? null;
}

export async function isUserAdmin(userId: string): Promise<boolean> {
    return (await fetchUserRole(userId)) === "admin";
}
