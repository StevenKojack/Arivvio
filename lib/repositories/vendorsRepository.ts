import type { PublicTableRow } from "@/lib/supabase/database.types";
import type { PricingType } from "@/lib/types/domain";
import type { ArivvioSupabaseClient } from "./types";

export type VendorBusinessCreateInput = {
  approvalStatus?: "pending" | "approved" | "rejected" | "suspended";
  businessName: string;
  category: string;
  city?: string | null;
  description?: string | null;
  email?: string | null;
  ownerId: string;
  phone?: string | null;
  radius: number;
  websiteUrl?: string | null;
};

export type VendorServiceCreateInput = {
  active?: boolean;
  basePrice?: number | null;
  category: string;
  description?: string | null;
  eventTypesSupported: string[];
  hourlyRate?: number | null;
  minimumHours?: number | null;
  pricingType: PricingType;
  serviceName: string;
  setupFee?: number;
  travelFee?: number;
  vendorId: string;
};

export type VendorPhotoUploadResult = {
  photo: VendorPhotoRow;
  publicUrl: string;
};

export async function createVendorBusiness(
  supabase: ArivvioSupabaseClient,
  input: VendorBusinessCreateInput,
) {
  const { data, error } = await supabase
    .from("vendor_businesses")
    .insert({
      approval_status: input.approvalStatus ?? "approved",
      business_name: input.businessName,
      category: input.category,
      description: input.description ?? null,
      email: input.email ?? null,
      owner_id: input.ownerId,
      phone: input.phone ?? null,
      service_area_city: input.city ?? null,
      service_radius_miles: input.radius,
      website_url: input.websiteUrl ?? null,
    })
    .select("*")
    .single();

  if (error) {
    throw error;
  }

  return data;
}

export async function updateVendorBusiness(
  supabase: ArivvioSupabaseClient,
  input: {
    businessName: string;
    category: string;
    city?: string | null;
    description?: string | null;
    id: string;
    phone?: string | null;
    radius: number;
    websiteUrl?: string | null;
  },
) {
  const { data, error } = await supabase
    .from("vendor_businesses")
    .update({
      business_name: input.businessName,
      category: input.category,
      description: input.description ?? null,
      phone: input.phone ?? null,
      service_area_city: input.city ?? null,
      service_radius_miles: input.radius,
      website_url: input.websiteUrl ?? null,
    })
    .eq("id", input.id)
    .select("*")
    .single();

  if (error) {
    throw error;
  }

  return data;
}

export async function updateVendorVacationMode(
  supabase: ArivvioSupabaseClient,
  input: {
    id: string;
    vacationMode: boolean;
  },
) {
  const { data, error } = await supabase
    .from("vendor_businesses")
    .update({ vacation_mode: input.vacationMode })
    .eq("id", input.id)
    .select("*")
    .single();

  if (error) {
    throw error;
  }

  return data;
}

export async function getVendorBusinessesByOwner(
  supabase: ArivvioSupabaseClient,
  ownerId: string,
) {
  const { data, error } = await supabase
    .from("vendor_businesses")
    .select("*")
    .eq("owner_id", ownerId)
    .order("created_at", { ascending: false });

  if (error) {
    throw error;
  }

  return data ?? [];
}

export async function createVendorService(
  supabase: ArivvioSupabaseClient,
  input: VendorServiceCreateInput,
) {
  const { data, error } = await supabase
    .from("vendor_services")
    .insert({
      active: input.active ?? true,
      base_price: input.basePrice ?? null,
      category: input.category,
      description: input.description ?? null,
      event_types_supported: input.eventTypesSupported,
      hourly_rate: input.hourlyRate ?? null,
      minimum_hours: input.minimumHours ?? null,
      pricing_type: input.pricingType,
      service_name: input.serviceName,
      setup_fee: input.setupFee ?? 0,
      travel_fee: input.travelFee ?? 0,
      vendor_id: input.vendorId,
    })
    .select("*")
    .single();

  if (error) {
    throw error;
  }

  return data;
}

export async function updateVendorService(
  supabase: ArivvioSupabaseClient,
  input: Partial<VendorServiceCreateInput> & {
    id: string;
  },
) {
  const { data, error } = await supabase
    .from("vendor_services")
    .update({
      active: input.active,
      base_price: input.basePrice,
      category: input.category,
      description: input.description,
      event_types_supported: input.eventTypesSupported,
      hourly_rate: input.hourlyRate,
      minimum_hours: input.minimumHours,
      pricing_type: input.pricingType,
      service_name: input.serviceName,
      setup_fee: input.setupFee,
      travel_fee: input.travelFee,
    })
    .eq("id", input.id)
    .select("*")
    .single();

  if (error) {
    throw error;
  }

  return data;
}

export async function deleteVendorService(
  supabase: ArivvioSupabaseClient,
  serviceId: string,
) {
  const { error } = await supabase
    .from("vendor_services")
    .delete()
    .eq("id", serviceId);

  if (error) {
    throw error;
  }
}

export async function getVendorServicesByVendorIds(
  supabase: ArivvioSupabaseClient,
  vendorIds: string[],
) {
  if (!vendorIds.length) {
    return [];
  }

  const { data, error } = await supabase
    .from("vendor_services")
    .select("*")
    .in("vendor_id", vendorIds);

  if (error) {
    throw error;
  }

  return data ?? [];
}

export async function getVendorAvailabilityByVendorIds(
  supabase: ArivvioSupabaseClient,
  vendorIds: string[],
) {
  if (!vendorIds.length) {
    return [];
  }

  const { data, error } = await supabase
    .from("vendor_availability")
    .select("*")
    .in("vendor_id", vendorIds);

  if (error) {
    throw error;
  }

  return data ?? [];
}

export async function createAvailabilityWindow(
  supabase: ArivvioSupabaseClient,
  input: {
    date: string;
    endTime: string;
    startTime: string;
    status: "available" | "blocked" | "tentative";
    vendorId: string;
  },
) {
  const { data, error } = await supabase
    .from("vendor_availability")
    .insert({
      date: input.date,
      end_time: input.endTime,
      start_time: input.startTime,
      status: input.status,
      vendor_id: input.vendorId,
    })
    .select("*")
    .single();

  if (error) {
    throw error;
  }

  return data;
}

export async function deleteAvailabilityWindow(
  supabase: ArivvioSupabaseClient,
  availabilityId: string,
) {
  const { error } = await supabase
    .from("vendor_availability")
    .delete()
    .eq("id", availabilityId);

  if (error) {
    throw error;
  }
}

export async function getVendorPhotosByVendorIds(
  supabase: ArivvioSupabaseClient,
  vendorIds: string[],
) {
  if (!vendorIds.length) {
    return [];
  }

  const { data, error } = await supabase
    .from("vendor_photos")
    .select("*")
    .in("vendor_id", vendorIds)
    .order("sort_order", { ascending: true });

  if (error) {
    throw error;
  }

  return data ?? [];
}

export async function uploadVendorPhoto(
  supabase: ArivvioSupabaseClient,
  input: {
    file: File;
    sortOrder: number;
    vendorId: string;
  },
): Promise<VendorPhotoUploadResult> {
  const extension = input.file.name.split(".").pop()?.toLowerCase() ?? "jpg";
  const storagePath = `${input.vendorId}/${crypto.randomUUID()}.${extension}`;
  const { error: uploadError } = await supabase.storage
    .from("vendor-photos")
    .upload(storagePath, input.file, {
      cacheControl: "3600",
      upsert: false,
    });

  if (uploadError) {
    throw uploadError;
  }

  const { data: publicUrlData } = supabase.storage
    .from("vendor-photos")
    .getPublicUrl(storagePath);
  const publicUrl = publicUrlData.publicUrl;
  const { data, error } = await supabase
    .from("vendor_photos")
    .insert({
      image_url: publicUrl,
      sort_order: input.sortOrder,
      storage_path: storagePath,
      vendor_id: input.vendorId,
    })
    .select("*")
    .single();

  if (error) {
    await supabase.storage.from("vendor-photos").remove([storagePath]);
    throw error;
  }

  return { photo: data, publicUrl };
}

export async function deleteVendorPhoto(
  supabase: ArivvioSupabaseClient,
  photo: VendorPhotoRow,
) {
  if (photo.storage_path) {
    const { error: storageError } = await supabase.storage
      .from("vendor-photos")
      .remove([photo.storage_path]);

    if (storageError) {
      throw storageError;
    }
  }

  const { error } = await supabase
    .from("vendor_photos")
    .delete()
    .eq("id", photo.id);

  if (error) {
    throw error;
  }
}

export type VendorBusinessRow = PublicTableRow<"vendor_businesses">;
export type VendorServiceRow = PublicTableRow<"vendor_services">;
export type VendorAvailabilityRow = PublicTableRow<"vendor_availability">;
export type VendorPhotoRow = PublicTableRow<"vendor_photos">;
