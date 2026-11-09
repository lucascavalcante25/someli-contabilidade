/** 12345678000190 → 12.345.678/0001-90 (aceita parcial, enquanto digita). */
export function maskCnpj(value: string): string {
  const nums = value.replace(/\D/g, '').slice(0, 14);
  return nums
    .replace(/(\d{2})(\d)/, '$1.$2')
    .replace(/(\d{3})(\d)/, '$1.$2')
    .replace(/(\d{3})(\d)/, '$1/$2')
    .replace(/(\d{4})(\d{1,2})$/, '$1-$2');
}
