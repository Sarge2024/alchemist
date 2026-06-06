# Prompt de Orientação Técnica: Implementação e Otimização - Alquimia do Prato

Este documento serve como um **Guia de Implementação Técnica** para desenvolvedores e engenheiros de software responsáveis pela evolução do portal `dishalchemists.com`. O objetivo é transformar as diretrizes estratégicas em requisitos técnicos acionáveis.

---

## 1. Objetivo do Sistema
Implementar melhorias críticas de SEO, estruturação de dados e mecanismos de engajamento (IA e Gamificação) para elevar a autoridade (E-E-A-T) e a visibilidade do portal gastronômico.

---

## 2. Requisitos de SEO Técnico

### 2.1. Implementação de Dados Estruturados (JSON-LD)
**Tarefa:** Criar um gerador dinâmico de Schema.org em formato JSON-LD para as páginas de receita e artigos.

*   **Para Receitas (`Recipe`):**
    *   Mapear campos existentes: `name`, `image`, `description`, `prepTime`, `cookTime`, `recipeYield`.
    *   Adicionar campos obrigatórios: `recipeIngredient` (array), `recipeInstructions` (HowToStep), `author` (Person/Organization).
    *   Opcional: `nutrition` (`NutritionInformation`), `aggregateRating`.
*   **Para Artigos de Cultura/Saúde (`Article`):**
    *   Campos: `headline`, `image`, `datePublished`, `author`, `publisher`.

### 2.2. Reestruturação de URLs (Slugs Amigáveis)
**Tarefa:** Migrar do sistema de IDs numéricos para Slugs baseados no título.
*   **De:** `dishalchemists.com/recipe/V6yCRDE7Oya4DMd53kSr`
*   **Para:** `dishalchemists.com/receita/feijoada-completa-tradicional`
*   **Requisito:** Implementar Redirecionamento 301 (Permanente) das URLs antigas para as novas para preservar o "link juice".

### 2.3. Otimização de Metadados Dinâmicos
**Tarefa:** Implementar lógica para geração automática de Meta Tags.
*   **Title Tag:** `[Nome da Receita] | Alquimia do Prato` (Máx 60 caracteres).
*   **Meta Description:** Extrair os primeiros 155 caracteres da descrição da receita, garantindo que contenha a palavra-chave principal.

---

## 3. Mecanismos de Gamificação e IA

### 3.1. Chat Gastronômico com IA
**Tarefa:** Integrar o assistente de IA com a base de dados técnica do portal.
*   **Contexto:** A IA deve ter acesso ao "Acervo Técnico" para responder dúvidas sobre técnicas (ex: "Como fazer um roux perfeito?").
*   **SEO Loop:** Salvar perguntas frequentes (anonimizadas) para alimentar uma seção automática de "Dúvidas Comuns" (Schema `FAQPage`) em cada receita.

### 3.2. Ambiente Gamificado
**Tarefa:** Implementar sistema de recompensas por interação.
*   **Ações que geram pontos:** 
    *   Publicar receita (50 pts).
    *   Avaliar com foto (20 pts).
    *   Completar um "Desafio da Semana" (100 pts).
*   **Visualização:** Criar componentes de UI para "Badges de Alquimista" (ex: Aprendiz, Mestre dos Molhos, Alquimista Supremo).

---

## 4. Performance e Performance Web (Core Web Vitals)

### 4.1. Otimização de Imagens
*   **Formato:** Converter automaticamente uploads para `WebP`.
*   **Lazy Loading:** Aplicar `loading="lazy"` em todas as imagens fora da dobra inicial.
*   **Sizing:** Definir `width` e `height` explícitos para evitar saltos de layout (CLS).

---

## 5. Checklist de Entrega (Definition of Done)
- [ ] JSON-LD validado no *Rich Results Test* do Google.
- [ ] Redirecionamentos 301 funcionando sem loops.
- [ ] Sitemap.xml atualizado com as novas URLs amigáveis.
- [ ] Score de Performance no Lighthouse acima de 90 (Mobile).
- [ ] Chat de IA respondendo com base no contexto do Acervo.

---

**Nota para o Desenvolvedor:** Priorize a implementação do Schema `Recipe` e as URLs amigáveis, pois estas têm o maior impacto imediato no tráfego orgânico.
