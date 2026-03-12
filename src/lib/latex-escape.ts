export const sanitizeForDB = (text: string) => {
  if (!text) return "";
  return text.replace(/\\/g, "\\\\");
};

export const sanitizeFromDB = (text: string) => {
  if (!text) return "";
  return text.replace(/\\\\/g, "\\");
};
