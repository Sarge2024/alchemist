# PRD - Alquimia do Prato v2.1.0 (Antigravity Edition)

## 1. Visão Geral
O projeto evolui de um portal de receitas para um ecossistema social e cultural. O foco agora é a retenção através de comunidade, autoridade técnica e inteligência artificial.

## 2. Objetivos Principais
* **Engajamento:** Criar um ambiente de interação constante entre colaboradores.
* **Autoridade:** Estabelecer um acervo de cultura gastronômica (e-books e artigos).
* **Inteligência:** Automatizar a síntese de conhecimento através de Atas Diárias via IA.
* **Governança:** Implementar um sistema de moderação e níveis de acesso (RBAC).

## 3. Funcionalidades Detalhadas
### 3.1. Mural de Atas Diárias
* **Processamento:** Cloud Function agendada (23:59).
* **Lógica:** O Gemini analisa as conversas do dia, identifica tópicos, clima do grupo e materiais sugeridos.
* **Interação:** Votação de relevância em tópicos específicos.

### 3.2. Interações Sociais (Linear)
* **Likes:** Em receitas, comentários e artigos.
* **Comentários:** Fluxo linear (cronológico) para evitar dispersão.
* **Votação:** Sistema de upvote para validar a importância de tópicos na Ata.

### 3.3. Acervo Cultural
* **E-books:** Biblioteca de PDFs gratuitos.
* **Artigos:** Conteúdo rico em MD/HTML sobre técnicas e história da gastronomia.

## 4. Arquitetura Técnica
* **Stack:** React 19, Tailwind v4, Express, Firebase (Firestore, Auth, Storage).
* **Padrão:** Clean Code (Comentários em PT-BR) e Domain-Driven Design (DDD).
