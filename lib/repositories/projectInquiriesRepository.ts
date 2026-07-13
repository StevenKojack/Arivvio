import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/database.types";

export type ProjectInquiryInput = {
  email: string;
  fullName: string;
  interestTypes: string[];
  message: string;
  organization?: string;
  preferredContactMethod?: string;
  sourcePage: string;
};

export async function createProjectInquiry(
  supabase: SupabaseClient<Database>,
  input: ProjectInquiryInput,
) {
  const { error } = await supabase.from("project_inquiries").insert({
    email: input.email,
    full_name: input.fullName,
    interest_types: input.interestTypes,
    message: input.message,
    organization: input.organization || null,
    preferred_contact_method: input.preferredContactMethod || null,
    source_page: input.sourcePage,
    status: "new",
  });

  if (error) {
    throw error;
  }
}
