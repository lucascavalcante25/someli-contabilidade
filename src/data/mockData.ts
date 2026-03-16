export interface Cliente {
  id: number;
  cnpj: string;
  razaoSocial: string;
  nomeFantasia: string;
  proprietario: string;
  telefone: string;
  email: string;
  honorario: number;
  diaVencimento: number;
  tipoPagamento: 'pessoa_fisica' | 'pessoa_juridica' | 'terceiros';
  status: 'em_dia' | 'pendente' | 'atrasado';
}

export interface Usuario {
  id: number;
  nome: string;
  cpf: string;
  email: string;
  perfil: 'ADMIN' | 'CONTADOR' | 'OPERADOR';
}

export interface Despesa {
  id: number;
  descricao: string;
  valorMensal: number;
  tipo: 'fixa' | 'parcelada' | 'eventual';
  diaPagamento: number;
  dataInicio: string;
  parcelas?: number;
  parcelaAtual?: number;
  ativo: boolean;
}

export interface PagamentoMensal {
  clienteId: number;
  mes: number;
  ano: number;
  pago: boolean;
}

export interface DespesaMensal {
  despesaId: number;
  mes: number;
  ano: number;
  paga: boolean;
}

export const mockClientes: Cliente[] = [
  { id: 1, cnpj: '12.345.678/0001-90', razaoSocial: 'Tech Solutions Ltda', nomeFantasia: 'TechSol', proprietario: 'Carlos Silva', telefone: '(11) 99999-0001', email: 'carlos@techsol.com', honorario: 1500, diaVencimento: 10, tipoPagamento: 'pessoa_juridica', status: 'em_dia' },
  { id: 2, cnpj: '23.456.789/0001-01', razaoSocial: 'Comércio Rápido ME', nomeFantasia: 'Rápido', proprietario: 'Ana Souza', telefone: '(11) 99999-0002', email: 'ana@rapido.com', honorario: 800, diaVencimento: 15, tipoPagamento: 'pessoa_juridica', status: 'pendente' },
  { id: 3, cnpj: '34.567.890/0001-12', razaoSocial: 'Alimentos Naturais SA', nomeFantasia: 'NatFood', proprietario: 'Roberto Lima', telefone: '(11) 99999-0003', email: 'roberto@natfood.com', honorario: 2200, diaVencimento: 5, tipoPagamento: 'pessoa_juridica', status: 'em_dia' },
  { id: 4, cnpj: '45.678.901/0001-23', razaoSocial: 'Construções Modernas Ltda', nomeFantasia: 'ModCon', proprietario: 'Fernanda Costa', telefone: '(11) 99999-0004', email: 'fernanda@modcon.com', honorario: 1800, diaVencimento: 20, tipoPagamento: 'pessoa_juridica', status: 'atrasado' },
  { id: 5, cnpj: '56.789.012/0001-34', razaoSocial: 'Serviços Digitais ME', nomeFantasia: 'DigiServ', proprietario: 'Paulo Mendes', telefone: '(11) 99999-0005', email: 'paulo@digiserv.com', honorario: 950, diaVencimento: 10, tipoPagamento: 'pessoa_juridica', status: 'em_dia' },
  { id: 6, cnpj: '67.890.123/0001-45', razaoSocial: 'Transportes Veloz Ltda', nomeFantasia: 'Veloz', proprietario: 'Maria Oliveira', telefone: '(11) 99999-0006', email: 'maria@veloz.com', honorario: 1200, diaVencimento: 8, tipoPagamento: 'pessoa_juridica', status: 'em_dia' },
  { id: 7, cnpj: '78.901.234/0001-56', razaoSocial: 'Farmácia Popular ME', nomeFantasia: 'FarPop', proprietario: 'João Santos', telefone: '(11) 99999-0007', email: 'joao@farpop.com', honorario: 700, diaVencimento: 12, tipoPagamento: 'pessoa_fisica', status: 'pendente' },
  { id: 8, cnpj: '89.012.345/0001-67', razaoSocial: 'Educação Online SA', nomeFantasia: 'EduOn', proprietario: 'Lucia Ferreira', telefone: '(11) 99999-0008', email: 'lucia@eduon.com', honorario: 3000, diaVencimento: 1, tipoPagamento: 'pessoa_juridica', status: 'em_dia' },
  { id: 9, cnpj: '90.123.456/0001-78', razaoSocial: 'Consultoria Prime Ltda', nomeFantasia: 'Prime', proprietario: 'Ricardo Alves', telefone: '(11) 99999-0009', email: 'ricardo@prime.com', honorario: 1600, diaVencimento: 25, tipoPagamento: 'terceiros', status: 'em_dia' },
  { id: 10, cnpj: '01.234.567/0001-89', razaoSocial: 'Indústria Verde ME', nomeFantasia: 'IndVerde', proprietario: 'Patrícia Rocha', telefone: '(11) 99999-0010', email: 'patricia@indverde.com', honorario: 1100, diaVencimento: 18, tipoPagamento: 'pessoa_juridica', status: 'em_dia' },
];

export const mockUsuarios: Usuario[] = [
  { id: 1, nome: 'Administrador SOMELI', cpf: '111.222.333-44', email: 'admin@someli.com', perfil: 'ADMIN' },
  { id: 2, nome: 'Maria Contadora', cpf: '222.333.444-55', email: 'maria@someli.com', perfil: 'CONTADOR' },
  { id: 3, nome: 'José Operador', cpf: '333.444.555-66', email: 'jose@someli.com', perfil: 'OPERADOR' },
];

export const mockDespesas: Despesa[] = [
  { id: 1, descricao: 'Aluguel do escritório', valorMensal: 3500, tipo: 'fixa', diaPagamento: 5, dataInicio: '2024-01-01', ativo: true },
  { id: 2, descricao: 'Software contábil', valorMensal: 890, tipo: 'fixa', diaPagamento: 10, dataInicio: '2024-01-01', ativo: true },
  { id: 3, descricao: 'Internet + Telefone', valorMensal: 350, tipo: 'fixa', diaPagamento: 15, dataInicio: '2024-01-01', ativo: true },
  { id: 4, descricao: 'Material de escritório', valorMensal: 200, tipo: 'eventual', diaPagamento: 20, dataInicio: '2024-03-01', ativo: true },
  { id: 5, descricao: 'Equipamento novo', valorMensal: 450, tipo: 'parcelada', diaPagamento: 12, dataInicio: '2024-06-01', parcelas: 12, parcelaAtual: 4, ativo: true },
  { id: 6, descricao: 'Energia elétrica', valorMensal: 280, tipo: 'fixa', diaPagamento: 8, dataInicio: '2024-01-01', ativo: true },
];

export const mockPagamentos: PagamentoMensal[] = mockClientes.flatMap(c =>
  Array.from({ length: 12 }, (_, i) => ({
    clienteId: c.id,
    mes: i + 1,
    ano: 2025,
    pago: c.status === 'em_dia' ? (i + 1 <= 2) : (i + 1 <= 1),
  }))
);

export const mockDespesasMensais: DespesaMensal[] = mockDespesas.flatMap(d =>
  Array.from({ length: 12 }, (_, i) => ({
    despesaId: d.id,
    mes: i + 1,
    ano: 2025,
    paga: i + 1 <= 2,
  }))
);

export const receitaMensal = [
  { mes: 'Jan', receita: 14850, despesa: 5670 },
  { mes: 'Fev', receita: 14850, despesa: 5470 },
  { mes: 'Mar', receita: 13950, despesa: 5870 },
  { mes: 'Abr', receita: 14200, despesa: 5320 },
  { mes: 'Mai', receita: 14850, despesa: 5670 },
  { mes: 'Jun', receita: 15100, despesa: 5920 },
  { mes: 'Jul', receita: 14500, despesa: 5470 },
  { mes: 'Ago', receita: 14850, despesa: 5670 },
  { mes: 'Set', receita: 15200, despesa: 5570 },
  { mes: 'Out', receita: 14850, despesa: 5670 },
  { mes: 'Nov', receita: 14600, despesa: 5420 },
  { mes: 'Dez', receita: 15500, despesa: 6200 },
];

export function formatCurrency(value: number): string {
  return value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', minimumFractionDigits: 2 });
}

export function getGreeting(): string {
  const h = new Date().getHours();
  if (h < 12) return 'Bom dia';
  if (h < 18) return 'Boa tarde';
  return 'Boa noite';
}

export const meses = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
