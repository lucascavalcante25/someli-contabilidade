import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import ResponsavelLegalContato from './ResponsavelLegalContato';

describe('ResponsavelLegalContato', () => {
  it('nome, telefone e atalho do WhatsApp em nova aba', () => {
    render(<ResponsavelLegalContato nome="José Alighielde" telefone="85988887777" />);
    expect(screen.getByText('José Alighielde')).toBeTruthy();
    expect(screen.getByText('(85) 98888-7777')).toBeTruthy();
    const link = screen.getByRole('link', { name: 'Conversar com José Alighielde no WhatsApp' });
    expect(link.getAttribute('href')).toBe('https://wa.me/5585988887777');
    expect(link.getAttribute('target')).toBe('_blank');
    expect(link.getAttribute('rel')).toContain('noopener');
  });

  it('sem telefone válido não mostra o atalho', () => {
    render(<ResponsavelLegalContato nome="Fulano" telefone="" />);
    expect(screen.queryByRole('link')).toBeNull();
  });

  it('sem nada mostra traço', () => {
    render(<ResponsavelLegalContato nome="" telefone="" />);
    expect(screen.getByText('—')).toBeTruthy();
  });
});
