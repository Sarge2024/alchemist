# Walkthrough de Implementação - Ambiente Antigravity

Este guia detalha o setup técnico para a transição para a v2.1.0.

## Fase 0: Setup do Ambiente (Infraestrutura)
1.  **Firebase Local Emulator Suite:** Configurar para testar Firestore, Auth e Functions localmente.
2.  **TypeScript Aliases:** Configurar `vite.config.ts` para suportar `@domain`, `@infra`, `@ui`.
3.  **Tailwind v4:** Instalar o `@tailwindcss/vite` e configurar as variáveis de tema no CSS principal.

## Fase 1: Governança e Membros
1.  **Custom Claims:** Implementar script para atribuir `role` (visitante, colaborador, editor, admin).
2.  **Firestore Rules:** Bloquear escrita em campos de 'nível' por usuários comuns.
3.  **CRUD de Membros:** Interface de gestão no Admin Dashboard para alteração de níveis.

## Fase 2: Social e Mural de Atas
1.  **Coleção de Conversas:** Implementar persistência de chat em tempo real.
2.  **Integração Gemini:** Criar o `AtaGeneratorService` que consome as mensagens das últimas 24h.
3.  **UI do Mural:** Grid de Atas com filtros por data e sistema de votação.

## Fase 3: Moderação e Conteúdo
1.  **Fila de Moderação:** Interface para aprovação linear de comentários.
2.  **Storage:** Migrar upload de arquivos locais para o Firebase Storage.
