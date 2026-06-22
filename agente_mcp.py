import os
import sys
import json
import subprocess
import asyncio
from mcp.server import Server
import mcp.types as types
from mcp.server.models import InitializationOptions
from openai import AsyncOpenAI

server = Server("antigravity-local-agent")
client = AsyncOpenAI(base_url="http://localhost:1234/v1", api_key="lm-studio")

def rodar_testes_locais():
    """O Test Harness: Executa os testes do seu projeto e captura os resultados."""
    try:
        # Exemplo com pytest, mude para o comando do seu ecossistema
        result = subprocess.run(["pytest", "--json-report"], capture_output=True, text=True, timeout=10)
        return "PASSED", result.stdout
    except Exception as e:
        return "FAILED", str(e)

@server.list_tools()
async def list_tools():
    return [
        types.Tool(
            name="executar_ciclo_agentico",
            description="Executa o loop de desenvolvimento: lê specs, roda o harness de testes e atualiza o código usando a LLM local.",
            inputSchema={
                "type": "object",
                "properties": {
                    "spec_arquivo": {"type": "string", "description": "Caminho do arquivo de especificação técnica (.json ou .md)"},
                    "codigo_arquivo": {"type": "string", "description": "Caminho do arquivo de código a ser analisado/corrigido"}
                },
                "required": ["spec_arquivo", "codigo_arquivo"]
            }
        )
    ]

@server.call_tool()
async def call_tool(name, arguments):
    if name != "executar_ciclo_agentico":
        raise ValueError("Ferramenta inválida")

    # 1. Carrega Spec e Código
    with open(arguments["spec_arquivo"], "r", encoding="utf-8") as f:
        spec_data = f.read()
    with open(arguments["codigo_arquivo"], "r", encoding="utf-8") as f:
        codigo_data = f.read()

    # 2. Roda o Harness (Testes)
    status_testes, logs = rodar_testes_locais()

    # 3. Monta o Prompt Estruturado (Injeção de Memória de Longo Prazo e Estado)
    system_prompt = (
        "Você é uma IA Agêntica integrada à IDE. Você deve agir como um Engenheiro de Software Sênior. "
        "Sua tarefa é fazer o código passar na SPEC fornecida e consertar falhas apontadas pelo TEST HARNESS. "
        "Você DEVE responder estritamente no formato JSON detalhado no protocolo do sistema."
    )

    user_payload = {
        "agent_context": {
            "role": "Autonomous Code Architect",
            "long_term_memory": { "project_stack": ["Python", "FastAPI"] }
        },
        "spec_driven_layer": { "system_specification": spec_data },
        "test_harness_layer": { "harness_status": status_testes, "error_log": logs },
        "current_code_state": codigo_data
    }

    # 4. Chama o LM Studio passando o contexto complexo
    response = await client.chat.completions.create(
        model="current",
        messages=[
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": json.dumps(user_payload)}
        ],
        response_format={"type": "json_object"} # Força o LM Studio a cuspir JSON puro
    )

    return [types.TextContent(type="text", text=response.choices[0].message.content)]

async def main():
    import mcp.server.stdio
    async with mcp.server.stdio.stdio_server() as (r, w):
        await server.run(r, w, server.create_initialization_options())

if __name__ == "__main__":
    asyncio.run(main())