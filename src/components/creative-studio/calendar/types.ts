import type { Database } from "@/integrations/supabase/types";

export type CalendarPostRow = Database["public"]["Tables"]["calendar_posts"]["Row"];
export type CreativeRow = Database["public"]["Tables"]["creatives"]["Row"];

export type CalendarPostWithCreative = CalendarPostRow & {
  creatives?: Pick<CreativeRow, "id" | "concept_headline" | "caption" | "hashtags" | "image_url"> | null;
};
