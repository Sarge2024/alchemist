import os
import json
import asyncio
from http.server import BaseHTTPRequestHandler

from mcp import ClientSession, StdioServerParameters
from mcp.client.stdio import stdio_client

# Integração com Gemini (opcional, requer `pip install google-generativeai`)
import google.generativeai as genai

async def handle_chat_message(user_id: str, mensagem: str):
    # Em Vercel, o diretório de execução pode variar. 
    # Usamos um caminho relativo ao script atual para achar o mcp_server.py
    current_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    server_path = os.path.join(current_dir, "mcp_server.py")
    
    server_params = StdioServerParameters(
        command="python",
        args=[server_path]
    )
    
    # Conecta ao servidor MCP que criamos
    async with stdio_client(server_params) as (read, write):
        async with ClientSession(read, write) as session:
            await session.initialize()
            
            # O Agente 3 consome o perfil do usuário para criar o Hook perfeito
            try:
                perfil_result = await session.read_resource(f"usuario://{user_id}/perfil")
                # Extraindo o conteúdo texto do resource
                perfil = perfil_result.contents[0].text if perfil_result.contents else "{}"
            except Exception as e:
                perfil = f"{{\"erro\": \"Falha ao ler recurso: {str(e)}\"}}"
            
            # Prompt do Agente 3 enviado para a LLM
            prompt = f"Usuário diz: {mensagem}. Perfil histórico: {perfil}. Se relevante, invoque a ferramenta de busca no acervo para sugerir um link comercial."
            
            # (Exemplo) A LLM decide se chama ou não a ferramenta 'buscar_no_acervo' exposta pelo MCP
            if os.environ.get("GEMINI_API_KEY"):
                genai.configure(api_key=os.environ.get("GEMINI_API_KEY"))
                
                # Para vincular a tool do MCP à LLM de forma fácil, definimos o Schema ou usamos um wrapper:
                def buscar_no_acervo_wrapper(termo_chave: str):
                    """Busca conteúdos relevantes no acervo filtrados pelo interesse/dificuldade do usuário."""
                    pass # Stub apenas para o Gemini entender a assinatura
                
                model = genai.GenerativeModel(
                    "gemini-3-flash-preview", 
                    tools=[buscar_no_acervo_wrapper]
                )
                
                # Chamada inicial à LLM
                response = model.generate_content(prompt)
                
                # Verifica se a LLM decidiu chamar alguma tool
                function_calls = []
                if response.parts:
                    for part in response.parts:
                        if hasattr(part, "function_call") and part.function_call:
                            # A LLM quer chamar a ferramenta
                            tool_name = part.function_call.name
                            if tool_name == "buscar_no_acervo_wrapper":
                                args = part.function_call.args
                                termo_chave = args.get("termo_chave")
                                
                                # => EXECUTANDO A FERRAMENTA VIA MCP <=
                                result = await session.call_tool(
                                    "buscar_no_acervo", 
                                    arguments={"termo_chave": termo_chave, "user_id": user_id}
                                )
                                function_calls.append({
                                    "tool": "buscar_no_acervo",
                                    "termo_chave": termo_chave,
                                    "resultado_mcp": result.content[0].text if result.content else result.model_dump()
                                })
                
                resposta_texto = response.text if response.text else "Chamada de ferramenta acionada."
            else:
                resposta_texto = "Mock: Integração com Gemini pendente de chave de API."
                function_calls = []
            
            return {
                "status": "success",
                "prompt_gerado": prompt,
                "resposta_llm": resposta_texto,
                "tools_executadas": function_calls
            }

# Handler padrão esperado pela Vercel (Serverless Function)
class handler(BaseHTTPRequestHandler):
    def do_POST(self):
        try:
            content_length = int(self.headers['Content-Length'])
            post_data = self.rfile.read(content_length)
            payload = json.loads(post_data)
            
            user_id = payload.get("user_id", "default_user")
            mensagem = payload.get("mensagem", "")
            
            # Vercel HTTP Handler é síncrono; usamos event loop para chamar a função async
            loop = asyncio.new_event_loop()
            asyncio.set_event_loop(loop)
            resultado = loop.run_until_complete(handle_chat_message(user_id, mensagem))
            loop.close()
            
            self.send_response(200)
            self.send_header('Content-type', 'application/json')
            self.end_headers()
            self.wfile.write(json.dumps(resultado).encode('utf-8'))
        except Exception as e:
            self.send_response(500)
            self.send_header('Content-type', 'application/json')
            self.end_headers()
            self.wfile.write(json.dumps({"error": str(e)}).encode('utf-8'))
