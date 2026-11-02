import { describe, expect, it } from 'vitest';
import { linkGmail, linkWhatsApp, linkWhatsAppEscolherConversa, mensagemPedido, numeroWhatsApp } from './pedidoDocumento';

const pedido = {
  cliente: 'ABC Tecnologia Ltda',
  titulo: 'Extrato de setembro',
  link: 'https://someli.test/enviar/abc',
};

describe('numeroWhatsApp', () => {
  it.each([
    ['(81) 98888-1001', '5581988881001'],
    ['81 3333-4444', '558133334444'],
    ['+55 81 98888-1001', '5581988881001'],
    ['5581988881001', '5581988881001'],
  ])('normaliza %s', (entrada, esperado) => {
    expect(numeroWhatsApp(entrada)).toBe(esperado);
  });

  it.each(['', '123', '98888-1001', undefined, null])('recusa número sem DDD ou inválido: %s', (entrada) => {
    expect(numeroWhatsApp(entrada)).toBeNull();
  });
});

describe('mensagem do pedido', () => {
  it('traz cliente, documento, link e validade', () => {
    const texto = mensagemPedido(pedido);
    expect(texto).toContain('ABC Tecnologia Ltda');
    expect(texto).toContain('Extrato de setembro');
    expect(texto).toContain(pedido.link);
    expect(texto).toContain('7 dias');
  });
});

describe('links de envio', () => {
  it('WhatsApp do cliente usa número e texto codificado', () => {
    const url = linkWhatsApp('(81) 98888-1001', pedido);
    expect(url).toMatch(/^https:\/\/wa\.me\/5581988881001\?text=/);
    expect(decodeURIComponent(url!.split('text=')[1])).toBe(mensagemPedido(pedido));
  });

  it('sem telefone válido não gera link', () => {
    expect(linkWhatsApp('123', pedido)).toBeNull();
  });

  it('escolher conversa permite selecionar o grupo', () => {
    expect(linkWhatsAppEscolherConversa(pedido)).toMatch(/^https:\/\/wa\.me\/\?text=/);
  });

  it('abre a tela de escrever do Gmail com destinatário, assunto e corpo', () => {
    const url = new URL(linkGmail('financeiro@abc.test', pedido)!);
    expect(url.origin + url.pathname).toBe('https://mail.google.com/mail/');
    expect(url.searchParams.get('view')).toBe('cm');
    expect(url.searchParams.get('fs')).toBe('1');
    expect(url.searchParams.get('to')).toBe('financeiro@abc.test');
    expect(url.searchParams.get('su')).toBe('Someli: Extrato de setembro');
    expect(url.searchParams.get('body')).toBe(mensagemPedido(pedido));
  });

  it('sem e-mail válido não gera link', () => {
    expect(linkGmail('', pedido)).toBeNull();
    expect(linkGmail('sem-arroba', pedido)).toBeNull();
  });
});
