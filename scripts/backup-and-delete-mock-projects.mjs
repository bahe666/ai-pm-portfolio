import { mkdir, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { createClient } from "@supabase/supabase-js";

const MOCK_PROJECT_IDS = [
  "11111111-1111-4111-8111-111111111111",
  "22222222-2222-4222-8222-222222222222"
];

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!url || !serviceRoleKey) {
  console.error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY");
  process.exit(1);
}

const supabase = createClient(url, serviceRoleKey, {
  auth: { persistSession: false }
});

const { data, error } = await supabase.from("projects").select("*").in("id", MOCK_PROJECT_IDS);
if (error) throw error;

const backupDir = resolve(".superpowers/backups");
await mkdir(backupDir, { recursive: true });
const exportedAt = new Date().toISOString().replaceAll(":", "-");
const backupPath = resolve(backupDir, `mock-projects-before-delete-${exportedAt}.json`);
await writeFile(backupPath, JSON.stringify({ exportedAt, projects: data ?? [] }, null, 2));

const { error: deleteError } = await supabase.from("projects").delete().in("id", MOCK_PROJECT_IDS);
if (deleteError) throw deleteError;

console.log(`Backed up ${data?.length ?? 0} mock projects to ${backupPath}`);
console.log("Deleted known mock projects from Supabase.");
