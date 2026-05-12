export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      agendamentos_mecanico: {
        Row: {
          cliente_id: string | null
          created_at: string
          data_hora: string
          descricao: string | null
          duracao_min: number | null
          funcionario_id: string | null
          id: string
          status: string
          titulo: string
          user_id: string
          veiculo_id: string | null
        }
        Insert: {
          cliente_id?: string | null
          created_at?: string
          data_hora: string
          descricao?: string | null
          duracao_min?: number | null
          funcionario_id?: string | null
          id?: string
          status?: string
          titulo: string
          user_id: string
          veiculo_id?: string | null
        }
        Update: {
          cliente_id?: string | null
          created_at?: string
          data_hora?: string
          descricao?: string | null
          duracao_min?: number | null
          funcionario_id?: string | null
          id?: string
          status?: string
          titulo?: string
          user_id?: string
          veiculo_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "agendamentos_cliente_id_fkey"
            columns: ["cliente_id"]
            isOneToOne: false
            referencedRelation: "clientes_mecanico"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "agendamentos_funcionario_id_fkey"
            columns: ["funcionario_id"]
            isOneToOne: false
            referencedRelation: "funcionarios_mecanico"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "agendamentos_veiculo_id_fkey"
            columns: ["veiculo_id"]
            isOneToOne: false
            referencedRelation: "veiculos_mecanico"
            referencedColumns: ["id"]
          },
        ]
      }
      clientes_mecanico: {
        Row: {
          created_at: string
          documento: string | null
          email: string | null
          endereco: string | null
          id: string
          nome: string
          observacoes: string | null
          telefone: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          documento?: string | null
          email?: string | null
          endereco?: string | null
          id?: string
          nome: string
          observacoes?: string | null
          telefone?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          documento?: string | null
          email?: string | null
          endereco?: string | null
          id?: string
          nome?: string
          observacoes?: string | null
          telefone?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      comissoes_mecanico: {
        Row: {
          created_at: string
          data_pagamento: string | null
          funcionario_id: string
          id: string
          os_id: string
          pago: boolean
          percentual: number
          user_id: string
          valor_comissao: number
          valor_total_servicos: number
        }
        Insert: {
          created_at?: string
          data_pagamento?: string | null
          funcionario_id: string
          id?: string
          os_id: string
          pago?: boolean
          percentual: number
          user_id: string
          valor_comissao: number
          valor_total_servicos: number
        }
        Update: {
          created_at?: string
          data_pagamento?: string | null
          funcionario_id?: string
          id?: string
          os_id?: string
          pago?: boolean
          percentual?: number
          user_id?: string
          valor_comissao?: number
          valor_total_servicos?: number
        }
        Relationships: [
          {
            foreignKeyName: "comissoes_funcionario_id_fkey"
            columns: ["funcionario_id"]
            isOneToOne: false
            referencedRelation: "funcionarios_mecanico"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "comissoes_os_id_fkey"
            columns: ["os_id"]
            isOneToOne: false
            referencedRelation: "ordens_servico_mecanico"
            referencedColumns: ["id"]
          }
        ]
      }
      financeiro_mecanico: {
        Row: {
          categoria: string | null
          created_at: string
          data_pagamento: string | null
          data_vencimento: string
          descricao: string
          forma_pagamento: string | null
          id: string
          observacoes: string | null
          os_id: string | null
          pago: boolean
          tipo: string
          user_id: string
          valor: number
        }
        Insert: {
          categoria?: string | null
          created_at?: string
          data_pagamento?: string | null
          data_vencimento: string
          descricao: string
          forma_pagamento?: string | null
          id?: string
          observacoes?: string | null
          os_id?: string | null
          pago?: boolean
          tipo: string
          user_id: string
          valor: number
        }
        Update: {
          categoria?: string | null
          created_at?: string
          data_pagamento?: string | null
          data_vencimento?: string
          descricao?: string
          forma_pagamento?: string | null
          id?: string
          observacoes?: string | null
          os_id?: string | null
          pago?: boolean
          tipo?: string
          user_id?: string
          valor?: number
        }
        Relationships: [
          {
            foreignKeyName: "financeiro_os_id_fkey"
            columns: ["os_id"]
            isOneToOne: false
            referencedRelation: "ordens_servico_mecanico"
            referencedColumns: ["id"]
          },
        ]
      }
      fornecedor_catalogo_mecanico: {
        Row: {
          id: string
          user_id: string
          fornecedor_id: string
          codigo: string
          nome: string
          descricao: string | null
          preco: number | null
          marca: string | null
          categoria: string | null
          ultima_atualizacao: string | null
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          fornecedor_id: string
          codigo: string
          nome: string
          descricao?: string | null
          preco?: number | null
          marca?: string | null
          categoria?: string | null
          ultima_atualizacao?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          fornecedor_id?: string
          codigo?: string
          nome?: string
          descricao?: string | null
          preco?: number | null
          marca?: string | null
          categoria?: string | null
          ultima_atualizacao?: string | null
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "fornecedor_catalogo_fornecedor_id_fkey"
            columns: ["fornecedor_id"]
            isOneToOne: false
            referencedRelation: "fornecedores_mecanico"
            referencedColumns: ["id"]
          },
        ]
      }
      fornecedores_mecanico: {
        Row: {
          id: string
          user_id: string
          nome: string
          cnpj: string | null
          telefone: string | null
          email: string | null
          website: string | null
          api_endpoint: string | null
          api_key: string | null
          ativo: boolean | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          nome: string
          cnpj?: string | null
          telefone?: string | null
          email?: string | null
          website?: string | null
          api_endpoint?: string | null
          api_key?: string | null
          ativo?: boolean | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          nome?: string
          cnpj?: string | null
          telefone?: string | null
          email?: string | null
          website?: string | null
          api_endpoint?: string | null
          api_key?: string | null
          ativo?: boolean | null
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      funcionarios_mecanico: {
        Row: {
          ativo: boolean | null
          cargo: string | null
          comissao_percent: number | null
          created_at: string
          email: string | null
          id: string
          nome: string
          telefone: string | null
          user_id: string
        }
        Insert: {
          ativo?: boolean | null
          cargo?: string | null
          comissao_percent?: number | null
          created_at?: string
          email?: string | null
          id?: string
          nome: string
          telefone?: string | null
          user_id: string
        }
        Update: {
          ativo?: boolean | null
          cargo?: string | null
          comissao_percent?: number | null
          created_at?: string
          email?: string | null
          id?: string
          nome?: string
          telefone?: string | null
          user_id?: string
        }
        Relationships: []
      }
      orcamentos_mecanico: {
        Row: {
          cliente_id: string
          created_at: string
          data_criacao: string
          data_validade: string | null
          desconto: number
          descricao_problema: string | null
          diagnostico: string | null
          funcionario_id: string | null
          id: string
          km_entrada: number | null
          numero: number
          observacoes: string | null
          status: string
          total: number
          total_pecas: number
          total_servicos: number
          updated_at: string
          user_id: string
          veiculo_id: string
        }
        Insert: {
          cliente_id: string
          created_at?: string
          data_criacao?: string
          data_validade?: string | null
          desconto?: number
          descricao_problema?: string | null
          diagnostico?: string | null
          funcionario_id?: string | null
          id?: string
          km_entrada?: number | null
          numero?: number
          observacoes?: string | null
          status?: string
          total?: number
          total_pecas?: number
          total_servicos?: number
          updated_at?: string
          user_id: string
          veiculo_id: string
        }
        Update: {
          cliente_id?: string
          created_at?: string
          data_criacao?: string
          data_validade?: string | null
          desconto?: number
          descricao_problema?: string | null
          diagnostico?: string | null
          funcionario_id?: string | null
          id?: string
          km_entrada?: number | null
          numero?: number
          observacoes?: string | null
          status?: string
          total?: number
          total_pecas?: number
          total_servicos?: number
          updated_at?: string
          user_id?: string
          veiculo_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "orcamentos_cliente_id_fkey"
            columns: ["cliente_id"]
            isOneToOne: false
            referencedRelation: "clientes_mecanico"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "orcamentos_funcionario_id_fkey"
            columns: ["funcionario_id"]
            isOneToOne: false
            referencedRelation: "funcionarios_mecanico"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "orcamentos_veiculo_id_fkey"
            columns: ["veiculo_id"]
            isOneToOne: false
            referencedRelation: "veiculos_mecanico"
            referencedColumns: ["id"]
          },
        ]
      }
      ordens_servico_mecanico: {
        Row: {
          cliente_id: string
          created_at: string
          data_conclusao: string | null
          data_entrada: string
          data_prevista: string | null
          desconto: number
          descricao_problema: string | null
          diagnostico: string | null
          forma_pagamento: string | null
          funcionario_id: string | null
          id: string
          km_entrada: number | null
          numero: number
          observacoes: string | null
          pago: boolean
          status: string
          total: number
          total_pecas: number
          total_servicos: number
          updated_at: string
          user_id: string
          veiculo_id: string
        }
        Insert: {
          cliente_id: string
          created_at?: string
          data_conclusao?: string | null
          data_entrada?: string
          data_prevista?: string | null
          desconto?: number
          descricao_problema?: string | null
          diagnostico?: string | null
          forma_pagamento?: string | null
          funcionario_id?: string | null
          id?: string
          km_entrada?: number | null
          numero?: number
          observacoes?: string | null
          pago?: boolean
          status?: string
          total?: number
          total_pecas?: number
          total_servicos?: number
          updated_at?: string
          user_id: string
          veiculo_id: string
        }
        Update: {
          cliente_id?: string
          created_at?: string
          data_conclusao?: string | null
          data_entrada?: string
          data_prevista?: string | null
          desconto?: number
          descricao_problema?: string | null
          diagnostico?: string | null
          forma_pagamento?: string | null
          funcionario_id?: string | null
          id?: string
          km_entrada?: number | null
          numero?: number
          observacoes?: string | null
          pago?: boolean
          status?: string
          total?: number
          total_pecas?: number
          total_servicos?: number
          updated_at?: string
          user_id?: string
          veiculo_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "ordens_servico_cliente_id_fkey"
            columns: ["cliente_id"]
            isOneToOne: false
            referencedRelation: "clientes_mecanico"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ordens_servico_funcionario_id_fkey"
            columns: ["funcionario_id"]
            isOneToOne: false
            referencedRelation: "funcionarios_mecanico"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ordens_servico_veiculo_id_fkey"
            columns: ["veiculo_id"]
            isOneToOne: false
            referencedRelation: "veiculos_mecanico"
            referencedColumns: ["id"]
          },
        ]
      }
      orcamento_itens_mecanico: {
        Row: {
          created_at: string
          descricao: string
          id: string
          orcamento_id: string
          peca_id: string | null
          preco_unitario: number
          quantidade: number
          subtotal: number
          tipo: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          descricao: string
          id?: string
          orcamento_id: string
          peca_id?: string | null
          preco_unitario?: number
          quantidade?: number
          subtotal?: number
          tipo: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          descricao?: string
          id?: string
          orcamento_id?: string
          peca_id?: string | null
          preco_unitario?: number
          quantidade?: number
          subtotal?: number
          tipo?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "orcamento_itens_orcamento_id_fkey"
            columns: ["orcamento_id"]
            isOneToOne: false
            referencedRelation: "orcamentos_mecanico"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "orcamento_itens_peca_id_fkey"
            columns: ["peca_id"]
            isOneToOne: false
            referencedRelation: "pecas_mecanico"
            referencedColumns: ["id"]
          },
        ]
      }
      os_itens_mecanico: {
        Row: {
          created_at: string
          descricao: string
          garantia_dias: number | null
          garantia_data_vencimento: string | null
          id: string
          os_id: string
          peca_id: string | null
          preco_unitario: number
          quantidade: number
          subtotal: number
          tem_garantia: boolean
          tipo: string
          user_id: string
        }
        Insert: {
          created_at?: string
          descricao: string
          garantia_dias?: number | null
          garantia_data_vencimento?: string | null
          id?: string
          os_id: string
          peca_id?: string | null
          preco_unitario?: number
          quantidade?: number
          subtotal?: number
          tem_garantia?: boolean
          tipo: string
          user_id: string
        }
        Update: {
          created_at?: string
          descricao?: string
          garantia_dias?: number | null
          garantia_data_vencimento?: string | null
          id?: string
          os_id?: string
          peca_id?: string | null
          preco_unitario?: number
          quantidade?: number
          subtotal?: number
          tem_garantia?: boolean
          tipo?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "os_itens_os_id_fkey"
            columns: ["os_id"]
            isOneToOne: false
            referencedRelation: "ordens_servico_mecanico"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "os_itens_peca_id_fkey"
            columns: ["peca_id"]
            isOneToOne: false
            referencedRelation: "pecas_mecanico"
            referencedColumns: ["id"]
          },
        ]
      }
      pecas_mecanico: {
        Row: {
          codigo: string | null
          created_at: string
          descricao: string | null
          estoque_minimo: number
          garantia_padrao_dias: number | null
          id: string
          nome: string
          preco_custo: number | null
          preco_venda: number
          quantidade: number
          unidade: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          codigo?: string | null
          created_at?: string
          descricao?: string | null
          estoque_minimo?: number
          garantia_padrao_dias?: number | null
          id?: string
          nome: string
          preco_custo?: number | null
          preco_venda?: number
          quantidade?: number
          unidade?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          codigo?: string | null
          created_at?: string
          descricao?: string | null
          estoque_minimo?: number
          garantia_padrao_dias?: number | null
          id?: string
          nome?: string
          preco_custo?: number | null
          preco_venda?: number
          quantidade?: number
          unidade?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      veiculos_mecanico: {
        Row: {
          ano: number | null
          cliente_id: string
          cor: string | null
          created_at: string
          data_proxima_revisao: string | null
          id: string
          km_atual: number | null
          km_proxima_revisao: number | null
          marca: string | null
          modelo: string | null
          observacoes: string | null
          placa: string
          updated_at: string
          user_id: string
        }
        Insert: {
          ano?: number | null
          cliente_id: string
          cor?: string | null
          created_at?: string
          data_proxima_revisao?: string | null
          id?: string
          km_atual?: number | null
          km_proxima_revisao?: number | null
          marca?: string | null
          modelo?: string | null
          observacoes?: string | null
          placa: string
          updated_at?: string
          user_id: string
        }
        Update: {
          ano?: number | null
          cliente_id?: string
          cor?: string | null
          created_at?: string
          data_proxima_revisao?: string | null
          id?: string
          km_atual?: number | null
          km_proxima_revisao?: number | null
          marca?: string | null
          modelo?: string | null
          observacoes?: string | null
          placa?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "veiculos_cliente_id_fkey"
            columns: ["cliente_id"]
            isOneToOne: false
            referencedRelation: "clientes_mecanico"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      v_historico_veiculo_mecanico: {
        Row: {
          veiculo_id: string
          placa: string
          marca: string | null
          modelo: string | null
          ano: number | null
          cor: string | null
          km_atual: number | null
          km_proxima_revisao: number | null
          data_proxima_revisao: string | null
          cliente_id: string
          cliente_nome: string | null
          os_id: string | null
          numero: number | null
          data_entrada: string | null
          km_entrada: number | null
          status: string | null
          total: number | null
          itens: Json
        }
        Insert: never
        Update: never
        Relationships: [
          {
            foreignKeyName: "ordens_servico_cliente_id_fkey"
            columns: ["cliente_id"]
            isOneToOne: false
            referencedRelation: "clientes_mecanico"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ordens_servico_veiculo_id_fkey"
            columns: ["veiculo_id"]
            isOneToOne: false
            referencedRelation: "veiculos_mecanico"
            referencedColumns: ["id"]
          },
        ]
      }
      v_garantias_ativas_mecanico: {
        Row: {
          item_id: string
          os_id: string
          os_numero: number
          descricao: string
          tipo: string
          garantia_dias: number | null
          garantia_data_vencimento: string | null
          tem_garantia: boolean
          cliente_id: string
          veiculo_id: string
          user_id: string
          data_entrada: string
          data_conclusao: string | null
        }
        Insert: never
        Update: never
        Relationships: [
          {
            foreignKeyName: "ordens_servico_cliente_id_fkey"
            columns: ["cliente_id"]
            isOneToOne: false
            referencedRelation: "clientes_mecanico"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ordens_servico_veiculo_id_fkey"
            columns: ["veiculo_id"]
            isOneToOne: false
            referencedRelation: "veiculos_mecanico"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Functions: {
      veiculos_revisao_proxima: {
        Args: Record<PropertyKey, never>
        Returns: {
          id: string
          placa: string
          marca: string | null
          modelo: string | null
          ano: number | null
          cor: string | null
          km_atual: number | null
          km_proxima_revisao: number | null
          data_proxima_revisao: string | null
          cliente_nome: string | null
          alerta: string | null
        }[]
      }
      historico_veiculo: {
        Args: {
          p_veiculo_id: string
        }
        Returns: {
          veiculo_id: string
          placa: string
          os_id: string
          numero: number
          data_entrada: string
          km_entrada: number | null
          status: string
          itens: Json
          total: number
        }[]
      }
      dashboard_funcionario_mecanico: {
        Args: {
          p_user_id: string
          p_funcionario_id: string
        }
        Returns: {
          metric: string
          valor: number
        }[]
      }
      dashboard_funcionario_os_por_mes: {
        Args: {
          p_user_id: string
          p_funcionario_id: string
          p_meses?: number
        }
        Returns: {
          mes: string
          ano: number
          total_os: number
          concluidas: number
        }[]
      }
      relatorio_financeiro_mensal: {
        Args: {
          p_user_id: string
          p_ano?: number
        }
        Returns: {
          mes: number
          nome_mes: string
          total_receitas: number
          total_despesas: number
          saldo: number
        }[]
      }
      relatorio_financeiro_categorias: {
        Args: {
          p_user_id: string
          p_ano?: number
          p_mes?: number
        }
        Returns: {
          tipo: string
          categoria: string
          total: number
          quantidade: number
        }[]
      }
      relatorio_estoque_abc: {
        Args: {
          p_user_id: string
        }
        Returns: {
          peca_id: string
          codigo: string | null
          nome: string
          quantidade: number
          preco_venda: number
          valor_total: number
          percentual: number
          percentual_acumulado: number
          classe: string
        }[]
      }
      relatorio_clientes: {
        Args: {
          p_user_id: string
        }
        Returns: {
          cliente_id: string
          nome: string
          total_os: number
          ticket_medio: number
          total_gasto: number
          ultima_visita: string | null
        }[]
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {},
  },
} as const
