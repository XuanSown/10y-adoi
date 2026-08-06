import { ERROR_CODES } from "@/lib/errors/codes";

export function validateDisplayName(name: unknown): string {
  if (typeof name !== "string") {
    throw { code: ERROR_CODES.INVALID_INPUT, message: "Tên không hợp lệ", statusCode: 400 };
  }
  const trimmed = name.trim();
  if (trimmed.length < 2 || trimmed.length > 50) {
    throw { code: ERROR_CODES.INVALID_INPUT, message: "Tên phải từ 2–50 ký tự", statusCode: 400 };
  }
  return trimmed;
}

export function validateCandidateId(id: unknown): string {
  if (typeof id !== "string" || !/^[0-9a-f-]{36}$/i.test(id)) {
    throw { code: ERROR_CODES.INVALID_INPUT, message: "ID thí sinh không hợp lệ", statusCode: 400 };
  }
  return id;
}
