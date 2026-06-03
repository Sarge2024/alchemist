import os
import json
from mcp.server.fastmcp import FastMCP

# Inicializa o servidor MCP
mcp = FastMCP("LoungeIntelligenceCore")

# CONSTANTES DE CAMINHO (Simulando o armazenamento conectado à Vercel)
LOGS_DIR = "./storage/logs"
PERFIS_DIR = "./storage/profiles"
ACERVO_INDEX = "./storage/acervo/indice_acervo.json"

# ==========================================
# RECURSOS (Resources) - O que os Agentes LEEM
# ==========================================

@mcp.resource("usuario://{user_id}/perfil")
async def obter_perfil_usuario(user_id: str) -> str:
    """Retorna o perfil de onboarding e status de gamificação do usuário."""
    file_path = os.path.join(PERFIS_DIR, f"{user_id}.json")
    if not os.path.exists(file_path):
        return json.dumps({"erro": "Usuário não encontrado", "user_id": user_id})
    with open(file_path, "r", encoding="utf-8") as f:
        return f.read()

@mcp.resource("lounge://logs/hoje")
async def obter_logs_diarios() -> str:
    """Retorna todas as interações capturadas no chat do Lounge no dia atual."""
    # Em produção, este método pode baixar o arquivo diretamente do Vercel Blob
    log_path = os.path.join(LOGS_DIR, "chat_diario.json")
    if not os.path.exists(log_path):
        return json.dumps([])
    with open(log_path, "r", encoding="utf-8") as f:
        return f.read()

# ==========================================
# FERRAMENTAS (Tools) - O que os Agentes EXECUTAM
# ==========================================

@mcp.tool()
async def buscar_no_acervo(termo_chave: str, user_id: str) -> str:
    """Busca conteúdos relevantes no acervo filtrados pelo interesse/dificuldade do usuário."""
    # 1. Lê o perfil do usuário para entender o contexto/dificuldade
    perfil_str = await obter_perfil_usuario(user_id)
    perfil = json.loads(perfil_str)
    
    # 2. Carrega o índice do acervo
    with open(ACERVO_INDEX, "r", encoding="utf-8") as f:
        acervo = json.load(f)
    
    # 3. Lógica de busca simples (pode ser evoluída para busca semântica/RAG posteriormente)
    resultados = [
        item for item in acervo.get("itens", []) 
        if termo_chave.lower() in item.get("tags", []) or termo_chave.lower() in item.get("titulo", "").lower()
    ]
    
    return json.dumps({"contexto_usuario": perfil.get("dificuldades"), "links_encontrados": resultados})

@mcp.tool()
async def atualizar_gamificacao_lote(dados_atualizacao: str) -> str:
    """Apenas executada na madrugada. Consolida os novos pontos de XP recebidos."""
    # dados_atualizacao: string JSON contendo {"user_id": X, "xp_ganho": Y, "motivo": Z}
    payload = json.loads(dados_atualizacao)
    user_id = payload["user_id"]
    
    file_path = os.path.join(PERFIS_DIR, f"{user_id}.json")
    if os.path.exists(file_path):
        with open(file_path, "r+", encoding="utf-8") as f:
            user_data = json.load(f)
            user_data["gamificacao"]["xp"] += payload["xp_ganho"]
            # Lógica para subir de nível se necessário...
            f.seek(0)
            json.dump(user_data, f, indent=4)
            f.truncate()
        return f"Sucesso: {payload['xp_ganho']} XP adicionados ao usuário {user_id}."
    return "Erro: Usuário inválido."

if __name__ == "__main__":
    mcp.run()
