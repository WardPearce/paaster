import { error } from "@sveltejs/kit";

export function maxLength(value?: any, max: number = 64): any {
  if (value && value.length > max) {
    throw error(400, `Value should be less then ${max} characters`);
  }

  return value;
}