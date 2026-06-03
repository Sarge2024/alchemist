import os
import json
import asyncio
from mcp import ClientSession, StdioServerParameters
from mcp.client.stdio import stdio_client
import google.generativeai as genai

async def run_fechamento():
    print("Iniciando rotina de fechamento diário (Agentes 1 e 2)...")
    
    # Verifica credenciais
    if not os.environ.get("GEMINI_API_KEY"):
        print("Aviso: GEMINI_API_KEY não configurada no ambiente.")
        return
        
    genai.configure(api_key=os.environ.get("GEMINI_API_KEY"))
    
    # Caminho para o servidor MCP que já criamos
    current_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    server_path = os.path.join(current_dir, "mcp_server.py")
    
    server_params = StdioServerParameters(
        command="python",
        args=[server_path]
    )
    
    # 1. Abre o servidor MCP localmente
    async with stdio_client(server_params) as (read, write):
        async with ClientSession(read, write) as session:
            await session.initialize()
            print("Servidor MCP conectado com sucesso.")
            
            # Lendo logs do dia
            print("Lendo logs do dia...")
            try:
                logs_result = await session.read_resource("lounge://logs/hoje")
                logs_conteudo = logs_result.contents[0].text if logs_result.contents else "[]"
            except Exception as e:
                print(f"Erro ao ler logs: {e}")
                logs_conteudo = "[]"
                
            # 2. Roda o Agente 2 (Ata)
            print("Executando Agente 2 (Geração de Ata)...")
            model = genai.GenerativeModel("gemini-3-flash-preview")
            prompt_ata = f"Com base neste log de interações de hoje: {logs_conteudo}\nCrie uma ata em HTML formatada sobre os principais tópicos discutidos na comunidade gastronômica."
            
            response_ata = model.generate_content(prompt_ata)
            
            # TODO: Salvar ata_html no banco/Vercel Blob
            print("Ata gerada com sucesso.")
            
            # 3. Roda o Agente 1 (Gamificação)
            print("Executando Agente 1 (Cálculo de XP e Gamificação)...")
            # Extração da ferramenta para o Gemini preencher
            def atualizar_gamificacao_lote_wrapper(dados_atualizacao: str):
                pass
                
            model_gamificacao = genai.GenerativeModel(
                "gemini-3-flash-preview",
                tools=[atualizar_gamificacao_lote_wrapper]
            )
            
            prompt_gamificacao = f"""Analise as interações de hoje no Lounge Gastronômico e pontue os usuários baseando-se estritamente na seguinte tabela de XP:

Tabela de Valores (XP Inicial):
- Compartilhar uma receita completa ou herança de família: +50 XP
- Responder uma dúvida culinária de outro usuário de forma útil: +30 XP
- Compartilhar uma dica prática ou técnica de preparo: +20 XP
- Participar ativamente de uma discussão temática sobre ingredientes/cultura: +15 XP
- Interação amigável, acolhimento de novos membros ou elogio sincero: +10 XP

Abaixo está o log de interações de hoje:
{logs_conteudo}

Regras da Automação:
1. Analise cada mensagem e identifique a qual categoria ela melhor se encaixa.
2. Um mesmo usuário pode pontuar múltiplas vezes se tiver várias boas contribuições.
3. Para cada usuário que merecer pontuação, consolide o total de XP ganho no dia.
4. Chame a ferramenta 'atualizar_gamificacao_lote_wrapper' apenas uma vez por usuário, fornecendo um JSON com `user_id`, `xp_ganho` (soma total do dia) e um `motivo` resumido (ex: "Compartilhou receita de bolo e ajudou membro com dica de forno").
"""
            response_gamificacao = model_gamificacao.generate_content(prompt_gamificacao)
            
            # Disparando tool real no MCP se a LLM mandou
            if response_gamificacao.parts:
                for part in response_gamificacao.parts:
                    if hasattr(part, "function_call") and part.function_call:
                        if part.function_call.name == "atualizar_gamificacao_lote_wrapper":
                            args = part.function_call.args
                            dados_atualizacao = args.get("dados_atualizacao")
                            if dados_atualizacao:
                                result = await session.call_tool(
                                    "atualizar_gamificacao_lote",
                                    arguments={"dados_atualizacao": dados_atualizacao}
                                )
                                print(f"Resultado do MCP Gamificação: {result.content[0].text if result.content else 'OK'}")

    print("Fechamento diário concluído.")

if __name__ == "__main__":
    asyncio.run(run_fechamento())
