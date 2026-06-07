#!/bin/bash

# Script de recuperação do servidor Alchemist.
# Libera as portas 4005 (Express) e 24680 (Vite HMR) se estiverem travadas na memória,
# e então reinicia o servidor de desenvolvimento.

echo "=== [Recuperação de Portas do Alchemist] ==="

PORTAS=(4005 24680)

for PORTA in "${PORTAS[@]}"; do
  echo "Verificando a porta $PORTA..."
  
  # Tenta encontrar o PID usando lsof
  PID=$(lsof -t -i:$PORTA 2>/dev/null)
  
  # Se lsof falhar ou não retornar nada, tenta usar fuser
  if [ -z "$PID" ]; then
    PID=$(fuser $PORTA/tcp 2>/dev/null | awk '{print $1}')
  fi
  
  if [ ! -z "$PID" ]; then
    echo "-> Processo(s) detectado(s) na porta $PORTA: $PID"
    for P in $PID; do
      echo "   Forçando encerramento do processo $P..."
      kill -9 $P 2>/dev/null
    done
    echo "-> Porta $PORTA liberada com sucesso."
  else
    echo "-> Porta $PORTA já está livre."
  fi
done

echo ""
echo "=== [Iniciando o Servidor de Desenvolvimento] ==="
npm run dev
