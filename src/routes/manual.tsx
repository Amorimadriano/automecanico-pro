import { createFileRoute, Link } from "@tanstack/react-router";
import {
  BookOpen,
  LayoutDashboard,
  FileText,
  ClipboardList,
  Users,
  Car,
  Package,
  Store,
  Calendar,
  UserCog,
  Percent,
  ShieldCheck,
  DollarSign,
  TrendingUp,
  Settings,
  Shield,
  ChevronRight,
  ArrowLeft,
  HelpCircle,
  Wrench,
  Mail,
  Smartphone,
  Printer,
  Search,
  Bell,
  QrCode,
} from "lucide-react";

export const Route = createFileRoute("/manual")({
  component: ManualPage,
  head: () => ({
    meta: [{ title: "Manual do Usuário — Oficina ERP" }],
  }),
});

const sections = [
  {
    id: "introducao",
    title: "1. Introdução",
    icon: BookOpen,
    content: [
      {
        heading: "Bem-vindo ao Oficina ERP",
        text: "O Oficina ERP é um sistema completo de gestão para oficinas mecânicas. Com ele, você gerencia ordens de serviço, orçamentos, clientes, veículos, estoque de peças, financeiro, agenda, funcionários, comissões e garantias em um único lugar.",
      },
      {
        heading: "Primeiros Passos",
        text: "Após criar sua conta, acesse o Dashboard para visualizar a visão geral da oficina. Configure sua empresa em 'Configurações' antes de começar a usar os demais módulos.",
      },
      {
        heading: "Suporte",
        text: "Em caso de dúvidas ou problemas, entre em contato pelo email de suporte ou acesse este manual a qualquer momento pelo menu lateral ou pelo link no rodapé.",
      },
    ],
  },
  {
    id: "dashboard",
    title: "2. Dashboard",
    icon: LayoutDashboard,
    content: [
      {
        heading: "Visão Geral",
        text: "O Dashboard apresenta um resumo diário da sua oficina: total de orçamentos pendentes, ordens de serviço em andamento, faturamento do mês, estoque baixo e agendamentos do dia.",
      },
      {
        heading: "Gráficos e Indicadores",
        text: "Utilize os gráficos para acompanhar a evolução do faturamento, serviços mais executados e peças mais vendidas. Os cards de alerta mostram itens que precisam de atenção imediata.",
      },
    ],
  },
  {
    id: "orcamentos",
    title: "3. Orçamentos",
    icon: FileText,
    content: [
      {
        heading: "Criar Orçamento",
        text: "Acesse Orçamentos → Novo Orçamento. Selecione o cliente e veículo, adicione serviços e peças, defina descontos e prazo de validade. O número do orçamento é gerado automaticamente.",
      },
      {
        heading: "Converter em OS",
        text: "Quando o cliente aprovar o orçamento, clique em 'Converter em OS'. Todos os dados do orçamento são transferidos automaticamente para a Ordem de Serviço.",
      },
      {
        heading: "Impressão e Compartilhamento",
        text: "Use o botão de impressão para gerar um PDF do orçamento. Você pode enviar por WhatsApp, email ou imprimir diretamente.",
      },
    ],
  },
  {
    id: "os",
    title: "4. Ordens de Serviço (OS)",
    icon: ClipboardList,
    content: [
      {
        heading: "Abrir OS",
        text: "Acesse OS → Nova OS. Informe o cliente, veículo, quilometragem de entrada, descrição do problema e funcionário responsável. O sistema gera um número sequencial automaticamente.",
      },
      {
        heading: "Status da OS",
        text: "Acompanhe o status: 'Aberta', 'Em Andamento', 'Aguardando Peças', 'Concluída' e 'Cancelada'. Altere o status conforme o progresso do serviço.",
      },
      {
        heading: "Serviços e Peças",
        text: "Adicione serviços executados e peças utilizadas. O sistema calcula o total automaticamente. Para peças do estoque, a quantidade é debitada ao concluir a OS.",
      },
      {
        heading: "Garantia",
        text: "Defina o prazo de garantia para cada serviço ou peça. O sistema alerta quando garantias estiverem próximas do vencimento.",
      },
      {
        heading: "Impressão da OS",
        text: "Imprima a OS completa com dados do cliente, veículo, serviços, peças, valores e QR Code Pix para pagamento (se configurado).",
      },
    ],
  },
  {
    id: "clientes",
    title: "5. Clientes",
    icon: Users,
    content: [
      {
        heading: "Cadastro de Clientes",
        text: "Acesse Clientes → Novo Cliente. Informe nome, documento (CPF/CNPJ), telefone, email e endereço. Clientes cadastrados ficam disponíveis em todos os módulos.",
      },
      {
        heading: "Histórico do Cliente",
        text: "Clique em um cliente para ver todo o histórico de atendimentos: orçamentos, ordens de serviço, veículos e gastos totais na oficina.",
      },
    ],
  },
  {
    id: "veiculos",
    title: "6. Veículos",
    icon: Car,
    content: [
      {
        heading: "Cadastro de Veículos",
        text: "Acesse Veículos → Novo Veículo. Informe placa, marca, modelo, ano, cor e km atual. Vincule o veículo a um cliente existente.",
      },
      {
        heading: "Diagnóstico e Revisões",
        text: "Registre diagnósticos por veículo. O sistema alerta quando a próxima revisão estiver próxima, baseado na quilometragem ou data.",
      },
      {
        heading: "Histórico do Veículo",
        text: "Veja todas as ordens de serviço, orçamentos, peças trocadas e serviços executados no veículo ao longo do tempo.",
      },
    ],
  },
  {
    id: "estoque",
    title: "7. Estoque",
    icon: Package,
    content: [
      {
        heading: "Cadastro de Peças",
        text: "Acesse Estoque → Nova Peça. Cadastre nome, código, descrição, quantidade, estoque mínimo, preço de custo e preço de venda.",
      },
      {
        heading: "Alerta de Estoque Baixo",
        text: "O sistema destaca peças com quantidade abaixo do mínimo configurado. Configure o alerta em 'Configurações' → 'Alerta de Estoque Baixo'.",
      },
      {
        heading: "Movimentação",
        text: "Peças são automaticamente debitadas quando utilizadas em uma OS. Você também pode ajustar manualmente a quantidade quando houver entrada de novas peças.",
      },
    ],
  },
  {
    id: "fornecedores",
    title: "8. Fornecedores",
    icon: Store,
    content: [
      {
        heading: "Cadastro",
        text: "Cadastre fornecedores de peças com nome, CNPJ, telefone, email e dados de contato.",
      },
      {
        heading: "Catálogo",
        text: "Importe ou cadastre o catálogo de peças de cada fornecedor para consulta rápida na hora de montar orçamentos.",
      },
    ],
  },
  {
    id: "agenda",
    title: "9. Agenda",
    icon: Calendar,
    content: [
      {
        heading: "Agendamentos",
        text: "Marque serviços e compromissos na agenda. Vincule cliente, veículo e funcionário. Defina data, hora e duração estimada.",
      },
      {
        heading: "Notificações",
        text: "O sistema exibe alertas para agendamentos do dia. Configure lembretes automáticos para o cliente via WhatsApp ou SMS (quando integrado).",
      },
    ],
  },
  {
    id: "funcionarios",
    title: "10. Funcionários",
    icon: UserCog,
    content: [
      {
        heading: "Cadastro",
        text: "Cadastre os mecânicos e funcionários da oficina com nome, cargo, telefone e percentual de comissão.",
      },
      {
        heading: "Dashboard do Funcionário",
        text: "Cada funcionário tem um dashboard com métricas pessoais: total de OS executadas, faturamento gerado, ranking de serviços.",
      },
    ],
  },
  {
    id: "comissoes",
    title: "11. Comissões",
    icon: Percent,
    content: [
      {
        heading: "Cálculo Automático",
        text: "O sistema calcula comissões automaticamente com base no percentual definido no cadastro do funcionário e no valor dos serviços executados.",
      },
      {
        heading: "Pagamento",
        text: "Visualize comissões pendentes e pagas. Marque como paga quando efetuar o pagamento ao funcionário.",
      },
    ],
  },
  {
    id: "garantias",
    title: "12. Garantias",
    icon: ShieldCheck,
    content: [
      {
        heading: "Controle de Garantias",
        text: "Acompanhe todas as garantias ativas de serviços e peças. O sistema exibe prazo restante e alerta quando estiver próximo do vencimento.",
      },
      {
        heading: "Atendimento de Garantia",
        text: "Quando um cliente retorna com uma garantia, localize rapidamente a OS original e abra um novo atendimento vinculado.",
      },
    ],
  },
  {
    id: "financeiro",
    title: "13. Financeiro",
    icon: DollarSign,
    content: [
      {
        heading: "Contas a Receber",
        text: "Registre receitas de serviços, peças e outras fontes. Vincule a uma OS para controle automático.",
      },
      {
        heading: "Contas a Pagar",
        text: "Cadastre despesas da oficina: aluguel, salários, compra de peças, água, luz, impostos.",
      },
      {
        heading: "Fluxo de Caixa",
        text: "Visualize entradas e saídas por período. Filtre por categoria, forma de pagamento e status (pago/pendente).",
      },
    ],
  },
  {
    id: "relatorio-financeiro",
    title: "14. Relatório Financeiro",
    icon: TrendingUp,
    content: [
      {
        heading: "Relatórios Mensais",
        text: "Gere relatórios detalhados por mês com total de receitas, despesas e saldo. Analise por categoria para identificar onde economizar ou investir.",
      },
      {
        heading: "Gráficos",
        text: "Acompanhe a evolução financeira em gráficos de linha e pizza. Exporte dados para planilhas quando necessário.",
      },
    ],
  },
  {
    id: "configuracoes",
    title: "15. Configurações",
    icon: Settings,
    content: [
      {
        heading: "Dados da Empresa",
        text: "Cadastre razão social, nome fantasia, CNPJ, endereço, telefone e logo da oficina. Estes dados aparecem nos documentos impressos.",
      },
      {
        heading: "Chave Pix",
        text: "Cadastre sua chave Pix para gerar QR Code automaticamente nas impressões de OS. Aceite CPF, CNPJ, email, celular ou chave aleatória.",
      },
      {
        heading: "Alertas",
        text: "Configure alertas de estoque baixo, cupom fiscal automático e outras preferências da oficina.",
      },
    ],
  },
  {
    id: "admin",
    title: "16. Administração",
    icon: Shield,
    content: [
      {
        heading: "Gerenciamento de Usuários",
        text: "Disponível apenas para administradores. Visualize todos os usuários cadastrados, status de assinatura (ativo, trial, bloqueado) e dias restantes.",
      },
      {
        heading: "Controle de Acesso",
        text: "Ative, bloqueie ou renove trial de usuários. Gerencie assinaturas e acesso ao sistema.",
      },
    ],
  },
  {
    id: "dicas",
    title: "17. Dicas e Atalhos",
    icon: HelpCircle,
    content: [
      {
        heading: "PWA — App no Celular",
        text: "Instale o Oficina ERP como app no celular! No navegador Chrome/Safari, clique em 'Adicionar à Tela Inicial'. O sistema funciona offline para consultas básicas.",
      },
      {
        heading: "Impressão Rápida",
        text: "Use Ctrl+P (ou Cmd+P no Mac) em qualquer tela de OS ou Orçamento para imprimir diretamente.",
      },
      {
        heading: "Busca Rápida",
      text: "Use a barra de busca no topo para encontrar clientes, veículos, peças e ordens de serviço rapidamente.",
      },
      {
        heading: "Notificações",
        text: "Permita notificações do navegador para receber alertas de agendamentos e garantias próximas do vencimento.",
      },
      {
        heading: "Backup Automático",
        text: "Todos os dados são armazenados em nuvem com backup automático. Não se preocupe com perda de informações.",
      },
    ],
  },
];

function ManualPage() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Header */}
      <header className="sticky top-0 z-40 bg-card/90 backdrop-blur border-b border-border">
        <div className="max-w-5xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Wrench className="h-5 w-5 text-primary" />
            <span className="font-display text-lg text-primary">Oficina ERP</span>
            <span className="text-muted-foreground text-sm hidden sm:inline">— Manual do Usuário</span>
          </div>
          <Link
            to="/login"
            className="inline-flex items-center gap-1 text-sm text-primary hover:underline"
          >
            <ArrowLeft className="h-4 w-4" />
            Voltar
          </Link>
        </div>
      </header>

      <div className="max-w-5xl mx-auto px-4 py-8 flex gap-8">
        {/* Sidebar Navigation */}
        <aside className="hidden md:block w-64 shrink-0">
          <div className="sticky top-20 bg-card border rounded-xl p-4">
            <h2 className="font-semibold text-sm mb-3 flex items-center gap-2">
              <BookOpen className="h-4 w-4 text-primary" />
              Sumário
            </h2>
            <nav className="space-y-1 max-h-[calc(100vh-12rem)] overflow-y-auto pr-1">
              {sections.map((section) => (
                <a
                  key={section.id}
                  href={`#${section.id}`}
                  className="flex items-center gap-2 px-2 py-1.5 rounded-md text-sm text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
                >
                  <section.icon className="h-3.5 w-3.5 shrink-0" />
                  <span className="truncate">{section.title}</span>
                </a>
              ))}
            </nav>
          </div>
        </aside>

        {/* Content */}
        <main className="flex-1 space-y-10">
          {/* Hero */}
          <div className="text-center space-y-3">
            <div className="inline-flex items-center justify-center h-16 w-16 rounded-xl bg-gradient-primary shadow-glow mb-2">
              <BookOpen className="h-8 w-8 text-primary-foreground" />
            </div>
            <h1 className="text-3xl md:text-4xl font-display text-primary">
              Manual do Usuário
            </h1>
            <p className="text-muted-foreground max-w-xl mx-auto">
              Guia completo para utilizar todos os recursos do Oficina ERP.
              Do cadastro inicial ao controle financeiro avançado.
            </p>
          </div>

          {/* Sections */}
          {sections.map((section) => (
            <section
              key={section.id}
              id={section.id}
              className="bg-card border rounded-xl p-5 md:p-6 scroll-mt-24"
            >
              <div className="flex items-center gap-3 mb-5">
                <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                  <section.icon className="h-5 w-5 text-primary" />
                </div>
                <h2 className="text-xl font-semibold">{section.title}</h2>
              </div>

              <div className="space-y-4">
                {section.content.map((item, idx) => (
                  <div key={idx} className="pl-4 border-l-2 border-primary/20">
                    <h3 className="font-medium text-sm mb-1 flex items-center gap-1.5">
                      <ChevronRight className="h-3.5 w-3.5 text-primary shrink-0" />
                      {item.heading}
                    </h3>
                    <p className="text-sm text-muted-foreground leading-relaxed">
                      {item.text}
                    </p>
                  </div>
                ))}
              </div>
            </section>
          ))}

          {/* Footer */}
          <div className="text-center py-8 border-t">
            <p className="text-sm text-muted-foreground">
              Oficina ERP — Gestão completa para mecânicas. Em caso de dúvidas, entre em contato com o suporte.
            </p>
            <div className="mt-3 flex items-center justify-center gap-4 text-sm text-muted-foreground">
              <span className="inline-flex items-center gap-1">
                <Mail className="h-3.5 w-3.5" />
                suporte@oficinaerp.com.br
              </span>
              <span className="inline-flex items-center gap-1">
                <Smartphone className="h-3.5 w-3.5" />
                (11) 99999-9999
              </span>
            </div>
            <Link
              to="/login"
              className="inline-flex items-center gap-1 text-sm text-primary hover:underline mt-4"
            >
              <ArrowLeft className="h-4 w-4" />
              Voltar para o login
            </Link>
          </div>
        </main>
      </div>
    </div>
  );
}
