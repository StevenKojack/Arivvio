import type { MarketplaceItem } from "@/app/data/marketplace";

const categoryImages: Partial<Record<MarketplaceItem["type"], string>> = {
  Venue:
    "https://images.unsplash.com/photo-1519167758481-83f550bb49b3?auto=format&fit=crop&w=900&q=80",
  Catering:
    "https://images.unsplash.com/photo-1555244162-803834f70033?auto=format&fit=crop&w=900&q=80",
  "Cake & Desserts":
    "https://images.unsplash.com/photo-1464349095431-e9a21285b5f3?auto=format&fit=crop&w=900&q=80",
  DJ:
    "https://images.unsplash.com/photo-1527529482837-4698179dc6ce?auto=format&fit=crop&w=900&q=80",
  "Live Music":
    "https://images.unsplash.com/photo-1501386761578-eac5c94b800a?auto=format&fit=crop&w=900&q=80",
  Magic:
    "https://images.unsplash.com/photo-1514525253161-7a46d19cd819?auto=format&fit=crop&w=900&q=80",
  "Character Performers":
    "https://images.unsplash.com/photo-1503454537195-1dcabb73ffb9?auto=format&fit=crop&w=900&q=80",
  Balloons:
    "https://images.unsplash.com/photo-1527529482837-4698179dc6ce?auto=format&fit=crop&w=900&q=80",
  "Bounce Houses":
    "https://images.unsplash.com/photo-1503454537195-1dcabb73ffb9?auto=format&fit=crop&w=900&q=80",
  "Photo Booth":
    "https://images.unsplash.com/photo-1516035069371-29a1b244cc32?auto=format&fit=crop&w=900&q=80",
  Rentals:
    "https://images.unsplash.com/photo-1511795409834-ef04bbd61622?auto=format&fit=crop&w=900&q=80",
  Photography:
    "https://images.unsplash.com/photo-1516035069371-29a1b244cc32?auto=format&fit=crop&w=900&q=80",
  Florals:
    "https://images.unsplash.com/photo-1526047932273-341f2a7631f9?auto=format&fit=crop&w=900&q=80",
  "AV Production":
    "https://images.unsplash.com/photo-1492684223066-81342ee5ff30?auto=format&fit=crop&w=900&q=80",
  Registration:
    "https://images.unsplash.com/photo-1517245386807-bb43f82c33c4?auto=format&fit=crop&w=900&q=80",
  Transportation:
    "https://images.unsplash.com/photo-1449965408869-eaa3f722e40d?auto=format&fit=crop&w=900&q=80",
  "Party Bus":
    "https://images.unsplash.com/photo-1544620347-c4fd4a3d5957?auto=format&fit=crop&w=900&q=80",
  Valet:
    "https://images.unsplash.com/photo-1511527844068-006b95d162c2?auto=format&fit=crop&w=900&q=80",
  Security:
    "https://images.unsplash.com/photo-1560250097-0b93528c311a?auto=format&fit=crop&w=900&q=80",
  Staffing:
    "https://images.unsplash.com/photo-1556761175-b413da4baf72?auto=format&fit=crop&w=900&q=80",
  Bartending:
    "https://images.unsplash.com/photo-1470337458703-46ad1756a187?auto=format&fit=crop&w=900&q=80",
  Cleaning:
    "https://images.unsplash.com/photo-1581578731548-c64695cc6952?auto=format&fit=crop&w=900&q=80",
  "Booth Rentals":
    "https://images.unsplash.com/photo-1505373877841-8d25f7d46678?auto=format&fit=crop&w=900&q=80",
  "Portable Restrooms":
    "https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?auto=format&fit=crop&w=900&q=80",
};

/** Fallbacks are service illustrations, never business identity inferred from a name. */
export function getVendorMedia(item: MarketplaceItem) {
  const approved = item.media?.filter(media => media.status === "approved").sort((a,b) => {
    const priority = (m: typeof a) => m.kind === "business_photo" ? (m.vendorAttested ? 0 : 1) : m.kind === "logo" ? 2 : 3;
    return priority(a)-priority(b) || a.order-b.order;
  })[0];
  if (approved) return {src:approved.url, alt:approved.alt, illustrative:approved.kind === "illustration", label:approved.kind === "illustration" ? "Illustrative image" : approved.kind === "logo" ? "Business logo" : "Business photograph", attribution:approved.attribution};
  const variants: Partial<Record<MarketplaceItem["type"], string[]>> = {
    Venue:[categoryImages.Venue!,categoryImages.Rentals!],
    DJ:[categoryImages["Live Music"]!,categoryImages["AV Production"]!],
    "Live Music":[categoryImages["Live Music"]!,categoryImages["AV Production"]!],
    Rentals:[categoryImages.Rentals!,categoryImages.Venue!],
    Photography:[categoryImages.Photography!,categoryImages.Venue!],
  };
  const decorativeOnly = ["Security","Valet","Portable Restrooms","Character Performers","Bounce Houses","Magic","Registration"];
  const options=variants[item.type];
  const src = decorativeOnly.includes(item.type) ? "/marketplace-placeholder.svg" : (options ? options[Math.abs(item.id)%options.length] : categoryImages[item.type]) ?? "/marketplace-placeholder.svg";
  return {src, alt:`Illustrative ${item.type.toLowerCase()} image, not a photograph of ${item.name}`, illustrative:true, label:item.databaseSource === false ? "Demo illustration" : "Service illustration", attribution:null};
}
export function getVendorImage(item: MarketplaceItem) { return getVendorMedia(item).src; }
