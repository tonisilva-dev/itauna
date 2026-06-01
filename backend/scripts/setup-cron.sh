#!/bin/bash

SCRIPTS_PATH="/var/www/itauna-backend/scripts"
CRON_JOB="0 3 * * * cd $SCRIPTS_PATH && /usr/bin/node sync-rateios.js >> $SCRIPTS_PATH/sync-rateios.log 2>&1"

echo "📋 Criando cron job..."
echo ""

# Remove entrada anterior se existir
(crontab -l 2>/dev/null || echo "") | grep -v "sync-rateios" > /tmp/crontab.tmp || echo "" > /tmp/crontab.tmp

# Adiciona nova entrada
echo "$CRON_JOB" >> /tmp/crontab.tmp

# Instala novo crontab
crontab /tmp/crontab.tmp

echo "✓ Cron job instalado!"
echo ""
echo "Agendamento:"
crontab -l | grep -E "3 .* sync-rateios" || echo "Erro ao verificar crontab"
echo ""
echo "Detalhes:"
echo "  Horário: 03:00 UTC (diariamente)"
echo "  Script: $SCRIPTS_PATH/sync-rateios.js"
echo "  Logs: $SCRIPTS_PATH/sync-rateios.log"
