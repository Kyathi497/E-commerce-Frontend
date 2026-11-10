// States and union territories, as order-service knows them (for GST, the
// delivery state decides CGST + SGST or IGST).
export const STATES = [
  "Andaman and Nicobar Islands",
  "Andhra Pradesh",
  "Arunachal Pradesh",
  "Assam",
  "Bihar",
  "Chandigarh",
  "Chhattisgarh",
  "Dadra and Nagar Haveli and Daman and Diu",
  "Delhi",
  "Goa",
  "Gujarat",
  "Haryana",
  "Himachal Pradesh",
  "Jammu and Kashmir",
  "Jharkhand",
  "Karnataka",
  "Kerala",
  "Ladakh",
  "Lakshadweep",
  "Madhya Pradesh",
  "Maharashtra",
  "Manipur",
  "Meghalaya",
  "Mizoram",
  "Nagaland",
  "Odisha",
  "Puducherry",
  "Punjab",
  "Rajasthan",
  "Sikkim",
  "Tamil Nadu",
  "Telangana",
  "Tripura",
  "Uttar Pradesh",
  "Uttarakhand",
  "West Bengal",
];

// A saved address's state as typed earlier, matched to the list (or "").
export function matchState(name: string | null | undefined) {
  const squash = (s: string) => s.toLowerCase().replace(/[^a-z]/g, "");
  return STATES.find((s) => squash(s) === squash(name ?? "")) ?? "";
}

// Cash on delivery limit, as order-service enforces it (COD_MAX_PAISE).
export const COD_MAX_PAISE = 200_000;
