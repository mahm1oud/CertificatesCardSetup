import { format, parseISO } from "date-fns";

export function formatDate(date: Date | string | null | undefined): string {
  if (!date) return "N/A";
  
  try {
    const parsedDate = typeof date === "string" ? parseISO(date) : date;
    return format(parsedDate, "MMMM d, yyyy");
  } catch (error) {
    console.error("Date formatting error:", error);
    return "Invalid Date";
  }
}

export function generateCertificateCode(length = 12): string {
  const characters = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
  let result = "";
  
  for (let i = 0; i < length; i++) {
    result += characters.charAt(Math.floor(Math.random() * characters.length));
  }
  
  return result;
}
