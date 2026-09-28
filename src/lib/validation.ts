// Simple validation helpers for API routes

export function validateRequired(value: any, fieldName: string): string | null {
  if (value === undefined || value === null || value === '') {
    return `${fieldName} wajib diisi`;
  }
  return null;
}

export function validateString(value: any, fieldName: string, min = 1, max = 255): string | null {
  if (value === undefined || value === null) return null;
  if (typeof value !== 'string') return `${fieldName} harus berupa teks`;
  if (value.length < min) return `${fieldName} minimal ${min} karakter`;
  if (value.length > max) return `${fieldName} maksimal ${max} karakter`;
  return null;
}

export function validateNumber(value: any, fieldName: string, min?: number, max?: number): string | null {
  if (value === undefined || value === null || value === '') return null;
  const num = Number(value);
  if (isNaN(num)) return `${fieldName} harus berupa angka`;
  if (min !== undefined && num < min) return `${fieldName} minimal ${min}`;
  if (max !== undefined && num > max) return `${fieldName} maksimal ${max}`;
  return null;
}

export function validateInt(value: any, fieldName: string, min?: number, max?: number): string | null {
  if (value === undefined || value === null || value === '') return null;
  const num = parseInt(value, 10);
  if (isNaN(num)) return `${fieldName} harus berupa angka bulat`;
  if (min !== undefined && num < min) return `${fieldName} minimal ${min}`;
  if (max !== undefined && num > max) return `${fieldName} maksimal ${max}`;
  return null;
}

export function validateEmail(value: any, fieldName: string): string | null {
  if (!value) return null;
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(value)) return `${fieldName} tidak valid`;
  return null;
}

export function validateDate(value: any, fieldName: string): string | null {
  if (!value) return null;
  const date = new Date(value);
  if (isNaN(date.getTime())) return `${fieldName} tidak valid`;
  return null;
}

export function validateEnum(value: any, fieldName: string, allowed: string[]): string | null {
  if (!value) return null;
  if (!allowed.includes(value)) return `${fieldName} harus salah satu dari: ${allowed.join(', ')}`;
  return null;
}

export function validateRole(value: any): string | null {
  return validateEnum(value, 'Role', ['SUPERADMIN', 'SPV', 'STAFF', 'VENDOR']);
}

export function validateStatus(value: any, fieldName: string, allowed: string[]): string | null {
  return validateEnum(value, fieldName, allowed);
}

// Collect all validation errors
export function collectErrors(errors: (string | null)[]): string[] {
  return errors.filter((e): e is string => e !== null);
}
