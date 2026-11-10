import { afterEach, describe, expect, it, vi } from 'vitest';
import { copiarTexto } from './copiarTexto';

describe('copiarTexto', () => {
  afterEach(() => vi.restoreAllMocks());

  it('usa a área de transferência do navegador quando ela está liberada', async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    Object.assign(navigator, { clipboard: { writeText } });
    await expect(copiarTexto('54247625000181')).resolves.toBe(true);
    expect(writeText).toHaveBeenCalledWith('54247625000181');
  });

  it('se o navegador bloquear, copia pelo jeito antigo (execCommand)', async () => {
    Object.assign(navigator, { clipboard: { writeText: vi.fn().mockRejectedValue(new Error('NotAllowedError')) } });
    const exec = vi.fn().mockReturnValue(true);
    Object.assign(document, { execCommand: exec });
    await expect(copiarTexto('54247625000181')).resolves.toBe(true);
    expect(exec).toHaveBeenCalledWith('copy');
    expect(document.querySelector('textarea')).toBeNull();
  });

  it('se nenhum dos dois funcionar, avisa que não copiou', async () => {
    Object.assign(navigator, { clipboard: undefined });
    Object.assign(document, { execCommand: vi.fn().mockReturnValue(false) });
    await expect(copiarTexto('x')).resolves.toBe(false);
  });
});
